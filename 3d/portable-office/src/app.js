// STOWORK — the deploy stage.
//
// One deploy value t ∈ [0,1] drives everything: the 3D model (caseModel.js),
// the slider, the step readout, the setup clock and the storyboard cards.
//
// Layers, from most to least capable, each one a complete experience:
//   1. WebGL: the live parametric model, drag to turn, scrub/play the deploy.
//   2. JS, no WebGL: the same controls cross-fade between the six rendered
//      stills in renders/ (produced from this same model + studio.js).
//   3. No JS: the stage shows the "Ready to work" still, and the storyboard
//      below it shows all six stages with their timings and captions.
//
// Only one WebGL context is ever created (phones cap the number of live
// contexts, which is what blanked the old multi-canvas page on mobile).
// Classic script, wrapped in an IIFE so nothing collides with caseModel.js.
(function () {
  'use strict';

  const STAGES = [
    { t: 0.00, sec: 0,   label: 'Stowed',        caption: '55 × 35 × 23 cm. Airline carry-on legal.' },
    { t: 0.15, sec: 12,  label: 'Open',          caption: 'Lay it flat, unlatch, and the lid swings back and clear.' },
    { t: 0.45, sec: 40,  label: 'Monitors up',   caption: 'The gas-strut lift raises the screens ~12 cm and tilts them upright.' },
    { t: 0.70, sec: 62,  label: 'Triptych',      caption: 'Two wings fan out ~35° into a curved three-screen array.' },
    { t: 0.85, sec: 78,  label: 'AV boom',       caption: 'Mic tips toward you; the 4K camera lands at eye level.' },
    { t: 1.00, sec: 105, label: 'Ready to work', caption: 'Keyboard forward, trackpad flat, power on. Under two minutes.' }
  ];
  const PLAY_MS_PER_SEC = 72;   // 105 s of real deploy → ~7.5 s on screen
  const HOLD_MS = 380;          // a beat at every stage stop

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const $ = (id) => document.getElementById(id);

  function stageIndex(t) {
    let idx = 0;
    for (let i = 0; i < STAGES.length; i++) if (t >= STAGES[i].t - 0.002) idx = i;
    return idx;
  }
  // Setup clock: piecewise-linear between the stage timings of the deploy table.
  function tToSec(t) {
    for (let i = 1; i < STAGES.length; i++) {
      const a = STAGES[i - 1], b = STAGES[i];
      if (t <= b.t) return a.sec + (b.sec - a.sec) * ((t - a.t) / (b.t - a.t));
    }
    return STAGES[STAGES.length - 1].sec;
  }
  const fmt = (s) => { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  // -------------------------------------------------------------------------
  // Views: each implements setT(t) and is told when the stage is on screen.
  // -------------------------------------------------------------------------

  // Still-image view (no WebGL): cross-fades between two <img> layers.
  function ImageView(stage) {
    const a = $('posterA'), b = $('posterB');
    let front = a, back = b, shown = -1;
    const srcFor = (i) => 'renders/stage-' + i + '.webp';
    // Preload all six so a scrub never waits on the network.
    STAGES.forEach((_, i) => { const im = new Image(); im.src = srcFor(i); });
    return {
      kind: 'image',
      setT(t) {
        const i = stageIndex(t);
        if (i === shown) return;
        shown = i;
        back.src = srcFor(i);
        back.alt = 'STOWORK, stage: ' + STAGES[i].label;
        back.removeAttribute('aria-hidden');
        front.setAttribute('aria-hidden', 'true');
        back.classList.add('is-on');
        front.classList.remove('is-on');
        const tmp = front; front = back; back = tmp;
      },
      setVisible() {}
    };
  }

  // Live WebGL view.
  function GLView(stage, canvas) {
    if (typeof THREE === 'undefined' || typeof createPortableOffice !== 'function' || typeof StoworkStudio === 'undefined') {
      throw new Error('3D scripts missing');
    }
    const S = StoworkStudio;
    const renderer = S.makeRenderer(canvas);
    const scene = new THREE.Scene();
    S.addLights(scene, { shadowSize: coarse ? 1024 : 2048 });
    const model = createPortableOffice();
    scene.add(model.root);
    model.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const camera = new THREE.PerspectiveCamera(35, 1, 1, 4000);

    let t = 0, visible = false, dirty = true, live = false, raf = 0, lost = false;
    let aspect = 1.6;
    // Orbit state: azimuth/polar around the default product-shot angle.
    const view = { az: S.VIEW.az, pol: S.VIEW.pol, vAz: 0, dragging: false, lastX: 0, lastY: 0, touched: false };
    const t0 = performance.now();

    function resize() {
      const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
      // Cap the drawing buffer: a giant buffer (e.g. a full-page capture that
      // stretches the viewport) can exhaust GPU memory and lose the context.
      const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2, 2600 / w, 1800 / h);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      aspect = w / h;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      dirty = true;
      draw(); // re-draw immediately: a resize clears the drawing buffer
    }

    function draw() {
      if (lost) return;
      // A slow idle sway keeps the object reading as 3D until someone grabs it.
      let sway = 0;
      if (!reduced && !view.touched) sway = Math.sin((performance.now() - t0) / 2600) * 0.07;
      S.placeCamera(camera, t, aspect, view.az + sway, view.pol);
      renderer.render(scene, camera);
      dirty = false;
      if (!live) { live = true; stage.classList.add('is-live'); }
    }

    function loop() {
      raf = 0;
      if (!visible || lost) return;
      if (Math.abs(view.vAz) > 0.0002 && !view.dragging) { view.az += view.vAz; view.vAz *= 0.92; dirty = true; }
      const idle = !reduced && !view.touched;
      if (dirty || idle || view.dragging) draw();
      raf = requestAnimationFrame(loop);
    }
    function kick() { if (!raf && visible) raf = requestAnimationFrame(loop); }

    // Drag to turn. touch-action: pan-y on the canvas lets vertical swipes keep
    // scrolling the page on phones; horizontal drags turn the model.
    canvas.addEventListener('pointerdown', (e) => {
      view.dragging = true; view.touched = true; view.vAz = 0;
      view.lastX = e.clientX; view.lastY = e.clientY;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      kick();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!view.dragging) return;
      const dx = e.clientX - view.lastX, dy = e.clientY - view.lastY;
      view.lastX = e.clientX; view.lastY = e.clientY;
      const k = 2.6 / Math.max(canvas.clientWidth, 1);
      view.az -= dx * k; view.vAz = -dx * k;
      if (e.pointerType !== 'touch') view.pol = Math.min(1.42, Math.max(0.95, view.pol - dy * k * 0.6));
      dirty = true;
    });
    const end = () => { view.dragging = false; kick(); };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('dblclick', () => { view.az = S.VIEW.az; view.pol = S.VIEW.pol; view.vAz = 0; dirty = true; kick(); });

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault(); lost = true; stage.classList.remove('is-live');
      if (typeof api.onLost === 'function') api.onLost();
    });

    let rz = 0;
    window.addEventListener('resize', () => { if (!rz) rz = requestAnimationFrame(() => { rz = 0; resize(); }); });
    resize();

    const api = {
      kind: 'gl',
      onLost: null,
      setT(nt) { t = nt; model.setDeploy(t); dirty = true; if (visible) draw(); },
      setVisible(v) { visible = v; if (v) { dirty = true; kick(); } }
    };
    return api;
  }

  // -------------------------------------------------------------------------
  // Controller
  // -------------------------------------------------------------------------
  function boot() {
    const stage = $('stage');
    if (!stage) return;
    const canvas = $('deployCanvas');
    const slider = $('deploySlider');
    const playBtn = $('deployPlay');
    const playLabel = playBtn && playBtn.querySelector('.play__label');
    const stepEl = $('deployStep');
    const labelEl = $('deployStageLabel');
    const clockEl = $('deployClock');
    const captionEl = $('deployCaption');
    const hintEl = $('deployHint');
    const tickWrap = $('deployTicks');
    const cards = Array.from(document.querySelectorAll('.story__card'));

    // Ticks on the scrubber.
    const ticks = STAGES.map((st) => {
      const el = document.createElement('span');
      el.className = 'scrub__tick';
      el.style.left = st.t * 100 + '%';
      el.innerHTML = '<span class="scrub__tick-dot"></span><span class="scrub__tick-label">' + st.label + '</span>';
      if (tickWrap) tickWrap.appendChild(el);
      return el;
    });

    // Pick the richest view this browser can run.
    let view = null;
    try { view = GLView(stage, canvas); }
    catch (err) { view = null; }
    if (!view) {
      if (canvas) canvas.remove();
      stage.classList.add('is-static');
      view = ImageView(stage);
    } else {
      view.onLost = () => {
        if (canvas) canvas.remove();
        stage.classList.add('is-static');
        view = ImageView(stage);
        view.setT(t);
      };
    }

    let t = -1;
    let lastIdx = -1;
    function setT(nt) {
      nt = clamp01(nt);
      t = nt;
      view.setT(t);
      const idx = stageIndex(t);
      if (slider) {
        slider.value = String(Math.round(t * 1000));
        slider.style.setProperty('--p', (t * 100).toFixed(2) + '%');
        slider.setAttribute('aria-valuetext', STAGES[idx].label + ', ' + Math.round(t * 100) + '%');
      }
      if (clockEl) clockEl.textContent = fmt(tToSec(t));
      ticks.forEach((el, i) => { el.classList.toggle('is-past', STAGES[i].t <= t + 0.002); });
      if (idx !== lastIdx) {
        lastIdx = idx;
        const st = STAGES[idx];
        if (labelEl) labelEl.textContent = st.label;
        if (stepEl) stepEl.textContent = idx === 0 ? 'Closed case' : 'Step ' + idx + ' of 5';
        if (captionEl) captionEl.textContent = st.caption;
        ticks.forEach((el, i) => el.classList.toggle('is-active', i === idx));
        cards.forEach((c, i) => { c.classList.toggle('is-active', i === idx); c.setAttribute('aria-pressed', i === idx ? 'true' : 'false'); });
      }
    }

    // ---- playback --------------------------------------------------------
    let anim = null; // { segs, start, raf }
    function setPlaying(on) {
      if (!playBtn) return;
      playBtn.classList.toggle('is-playing', on);
      playBtn.setAttribute('aria-label', on ? 'Pause the deployment' : 'Play the deployment');
      if (playLabel) playLabel.textContent = on ? 'Pause' : (t >= 0.999 ? 'Replay' : 'Play');
    }
    function stop() {
      if (anim) { cancelAnimationFrame(anim.raf); clearTimeout(anim.timer); anim = null; }
      setPlaying(false);
    }
    // A timeline of tween + hold segments from the current t to the end.
    function play() {
      stop();
      let from = t >= 0.999 ? 0 : t;
      const segs = [];
      if (from !== t) segs.push({ a: 0, b: 0, ms: HOLD_MS + 200 });
      for (let i = 0; i < STAGES.length - 1; i++) {
        const s0 = STAGES[i], s1 = STAGES[i + 1];
        if (s1.t <= from + 0.001) continue;
        const a = Math.max(from, s0.t);
        const frac = (s1.t - a) / (s1.t - s0.t);
        segs.push({ a, b: s1.t, ms: (s1.sec - s0.sec) * PLAY_MS_PER_SEC * frac, ease: true });
        if (i < STAGES.length - 2) segs.push({ a: s1.t, b: s1.t, ms: HOLD_MS });
      }
      if (reduced || view.kind === 'image') {
        // Step through the stages instead of interpolating motion.
        const stops = [];
        let i0 = stageIndex(t) + 1;
        if (t >= 0.999) { setT(0); i0 = 1; }
        for (let i = i0; i < STAGES.length; i++) stops.push(i);
        anim = { raf: 0, timer: 0 };
        setPlaying(true);
        const step = () => {
          if (!anim) return;
          const i = stops.shift();
          if (i === undefined) { stop(); return; }
          setT(STAGES[i].t);
          anim.timer = setTimeout(step, 1100);
        };
        anim.timer = setTimeout(step, 700);
        return;
      }
      anim = { segs, i: 0, start: performance.now(), raf: 0, timer: 0 };
      setPlaying(true);
      const frame = (now) => {
        if (!anim) return;
        let seg = anim.segs[anim.i];
        let k = (now - anim.start) / Math.max(seg.ms, 1);
        while (k >= 1) {
          setT(seg.b);
          anim.i++;
          if (anim.i >= anim.segs.length) { stop(); return; }
          anim.start += seg.ms;
          seg = anim.segs[anim.i];
          k = (now - anim.start) / Math.max(seg.ms, 1);
        }
        setT(seg.a + (seg.b - seg.a) * (seg.ease ? easeInOut(k) : k));
        anim.raf = requestAnimationFrame(frame);
      };
      anim.raf = requestAnimationFrame(frame);
    }
    function tweenTo(target) {
      stop();
      if (reduced || view.kind === 'image') { setT(target); return; }
      const a = t, b = target, ms = 500 + 900 * Math.abs(b - a);
      anim = { raf: 0, timer: 0 };
      const start = performance.now();
      const frame = (now) => {
        if (!anim) return;
        const k = Math.min(1, (now - start) / ms);
        setT(a + (b - a) * easeInOut(k));
        if (k < 1) anim.raf = requestAnimationFrame(frame); else anim = null;
      };
      anim.raf = requestAnimationFrame(frame);
    }

    let interacted = false;
    if (playBtn) playBtn.addEventListener('click', () => { interacted = true; if (anim && playBtn.classList.contains('is-playing')) stop(); else play(); });
    if (slider) {
      slider.addEventListener('input', () => {
        interacted = true;
        stop();
        setT(Number(slider.value) / 1000);
        setPlaying(false);
      });
    }
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        interacted = true;
        const i = Number(card.dataset.stage);
        tweenTo(STAGES[i].t);
        setPlaying(false);
      });
    });
    if (canvas) canvas.addEventListener('pointerdown', () => { interacted = true; if (hintEl) hintEl.style.opacity = '0.5'; });

    // Start state. With motion allowed, the stage opens closed and plays
    // itself once when it scrolls into view; otherwise it rests fully deployed.
    const autoplay = !reduced;
    setT(autoplay ? 0 : 1);
    setPlaying(false);

    if (typeof IntersectionObserver === 'function') {
      let played = false;
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          view.setVisible(e.isIntersecting);
          if (autoplay && !played && !interacted && e.intersectionRatio >= 0.45) {
            played = true;
            setTimeout(() => { if (!interacted) play(); }, 350);
          }
        }
      }, { threshold: [0, 0.45] });
      io.observe(stage.querySelector('.stage__frame'));
    } else {
      view.setVisible(true);
    }

    window.__stowork = { setT, play, stop, get t() { return t; }, get view() { return view.kind; } };
  }

  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  } catch (e) {
    // Leave the static page exactly as the no-JS version.
    document.documentElement.className = 'no-js';
  }
})();
