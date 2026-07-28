// STOWORK — landing page 3D app (Page Builder).
// Consumes ./caseModel.js (Model Builder owns it) strictly via the SPEC §4 API.
//
// Robustness contract: if WebGL is unavailable or three fails, every canvas slot
// shows a graceful fallback panel and the marketing/spec content stays readable.
// Nothing here is allowed to throw uncaught and blank the page.

// Classic script: THREE (vendor/three.min.js), THREE.OrbitControls
// (vendor/OrbitControls.js), and createPortableOffice (src/caseModel.js) are all
// globals loaded by <script> tags before this file. No ES module import, so the
// page works from file:// with no server and no build step.
//
// Wrapped in an IIFE so this file's top-level declarations (STAGES, lerp,
// StowScene, boot, …) do NOT leak into the shared global scope that classic
// scripts share. caseModel.js also declares `const STAGES` and `const lerp`;
// two globals with the same name is a SyntaxError ("Identifier 'STAGES' has
// already been declared") that stops this entire file from running — which is
// exactly what blanked the 3D. Keep everything scoped here.
(function () {

// ---------------------------------------------------------------------------
// Shared contract data (verbatim from SPEC §2). Kept local so the deploy UI
// (caption, clock, stage buttons, ticks) works even if the 3D scene fails.
// ---------------------------------------------------------------------------
const STAGES = [
  { t: 0.00, id: 'stowed',   label: 'Stowed',            caption: '55×35×23 cm. Airline carry-on legal.' },
  { t: 0.15, id: 'opened',   label: 'Opened',            caption: 'Lay flat, unlatch, lid swings clear.' },
  { t: 0.45, id: 'monitors', label: 'Monitors Up',       caption: 'Gas-strut lift raises the display to eye level.' },
  { t: 0.70, id: 'triptych', label: 'Triptych Deployed', caption: 'Two wings fan into a curved 3-screen array.' },
  { t: 0.85, id: 'av',       label: 'AV Boom',           caption: 'Broadcast mic + 4K camera rise to your face.' },
  { t: 1.00, id: 'ready',    label: 'Ready to Work',     caption: 'Keyboard forward. Power on. Under two minutes.' }
];

const DEPLOY_BUDGET_S = 110; // SPEC §2 sub-2-minute deploy budget.
const PLAY_DURATION_MS = 6000;

const prefersReduced =
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
// Small math helpers
// ---------------------------------------------------------------------------
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, k) => a + (b - a) * k;
function smoothstep(k) {
  k = clamp01(k);
  return k * k * (3 - 2 * k);
}

// One-time WebGL capability probe.
function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// StowScene — one renderer/scene/model per canvas. Independently sensible.
// ---------------------------------------------------------------------------
class StowScene {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} opts { initialT, autoRotate, minPolar, targetLift }
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = opts;
    this.onScreen = false;
    this.disposed = false;
    this._tween = null;
    this._t = clamp01(opts.initialT ?? 1);

    // Renderer -----------------------------------------------------------
    // NOTE: no 'high-performance' powerPreference — some embedded / low-power
    // WebView contexts (and headless GPUs) refuse a high-perf context and then
    // fail to create ANY renderer. Defaulting + accepting a perf caveat lets a
    // software/integrated context through, which is what we want for a preview.
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      failIfMajorPerformanceCaveat: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Scene --------------------------------------------------------------
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x14181d);

    // Camera (framed after we know fitRadius) -----------------------------
    this.camera = new THREE.PerspectiveCamera(35, 1, 1, 4000);

    // Lights: key + fill + soft ground shadow -----------------------------
    const key = new THREE.DirectionalLight(0xfff2e2, 2.4);
    key.position.set(60, 90, 70);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 10;
    key.shadow.camera.far = 400;
    key.shadow.camera.left = -90;
    key.shadow.camera.right = 90;
    key.shadow.camera.top = 90;
    key.shadow.camera.bottom = -90;
    key.shadow.bias = -0.0005;
    key.shadow.radius = 4;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x8fb4d6, 0.7);
    fill.position.set(-70, 40, -30);
    this.scene.add(fill);

    this.scene.add(new THREE.HemisphereLight(0x24303c, 0x0a0d10, 0.5));

    // Soft ground shadow catcher -----------------------------------------
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1200, 1200),
      new THREE.ShadowMaterial({ opacity: 0.34 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Model (SPEC §4 API) -------------------------------------------------
    this.model = createPortableOffice();
    this.scene.add(this.model.root);
    this.model.setDeploy(this._t);
    this.model.root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    const fitRadius = this.model.fitRadius || 60;
    this.fitRadius = fitRadius;

    // Frame camera --------------------------------------------------------
    const target = new THREE.Vector3(0, opts.targetLift ?? fitRadius * 0.42, 0);
    this.target = target;
    const dist = fitRadius * 2.6;
    this.camera.position.set(
      dist * 0.55,
      target.y + fitRadius * 0.55,
      dist * 0.9
    );

    // Controls ------------------------------------------------------------
    this.controls = new THREE.OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.target.copy(target);
    this.controls.minDistance = fitRadius * 1.15;
    this.controls.maxDistance = fitRadius * 4.2;
    this.controls.maxPolarAngle = opts.minPolar ?? Math.PI * 0.495; // stay above ground
    this.controls.autoRotate = !!opts.autoRotate && !prefersReduced;
    this.controls.autoRotateSpeed = 0.6;
    this.controls.update();

    this._onResize();
  }

  get deploy() {
    return this._t;
  }

  // Immediate set (live scrub).
  setT(t) {
    if (this.disposed) return;
    this._tween = null;
    this._t = clamp01(t);
    this.model.setDeploy(this._t);
  }

  // Animated tween to target t. onUpdate(t) is called each frame.
  tweenTo(t, durationMs, onUpdate) {
    if (this.disposed) return;
    const from = this._t;
    const to = clamp01(t);
    if (prefersReduced || durationMs <= 0) {
      this.setT(to);
      if (onUpdate) onUpdate(to);
      return;
    }
    this._tween = {
      from,
      to,
      start: performance.now(),
      dur: durationMs,
      onUpdate
    };
  }

  _stepTween(now) {
    const tw = this._tween;
    if (!tw) return;
    const k = smoothstep((now - tw.start) / tw.dur);
    const t = lerp(tw.from, tw.to, k);
    this._t = t;
    this.model.setDeploy(t);
    if (tw.onUpdate) tw.onUpdate(t);
    if (k >= 1) this._tween = null;
  }

  _onResize() {
    if (this.disposed) return;
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(now) {
    if (this.disposed || !this.onScreen) return;
    this._stepTween(now);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this._tween = null;
    try {
      this.controls.dispose();
    } catch (e) {}
    try {
      this.model.dispose();
    } catch (e) {}
    try {
      this.renderer.dispose();
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// Global render ticker + visibility management
// ---------------------------------------------------------------------------
const activeScenes = new Set();

let io = null;
if (typeof IntersectionObserver === 'function') {
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const sc = e.target.__stowScene;
        if (sc) sc.onScreen = e.isIntersecting;
      }
    },
    { threshold: 0.01 }
  );
}

function registerScene(scene) {
  activeScenes.add(scene);
  scene.__el = scene.canvas;
  scene.canvas.__stowScene = scene;
  if (io) io.observe(scene.canvas);
  else scene.onScreen = true; // no IO -> always render visible ones
}

let rafId = null;
function tick(now) {
  rafId = requestAnimationFrame(tick);
  for (const s of activeScenes) {
    if (s.onScreen) s.render(now || performance.now());
  }
}

// Resize handling (debounced via rAF).
let resizePending = false;
window.addEventListener('resize', () => {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => {
    resizePending = false;
    for (const s of activeScenes) s._onResize();
  });
});

// ---------------------------------------------------------------------------
// Fallback: mark a viz slot as failed so its CSS fallback panel shows.
// ---------------------------------------------------------------------------
function markLive(slot) {
  if (slot) slot.classList.add('is-live');
}
function markFallback(slot) {
  if (slot) slot.classList.add('is-fallback');
}

// Build a one-line reason string and drop it into every fallback panel. Runs
// always; on panels that end up hidden (3D worked) it's simply never seen.
function injectDiagnostic() {
  const parts = [];
  parts.push('three:' + (typeof THREE !== 'undefined' ? 'r' + THREE.REVISION : 'MISSING'));
  const ctx = (t) => {
    try { return document.createElement('canvas').getContext(t) ? 'y' : 'n'; }
    catch (e) { return 'err'; }
  };
  parts.push('webgl2:' + ctx('webgl2'));
  parts.push('webgl:' + ctx('webgl'));
  let rState = 'skip', rErr = '';
  if (typeof THREE !== 'undefined') {
    try {
      const rr = new THREE.WebGLRenderer({ failIfMajorPerformanceCaveat: false });
      rState = 'ok';
      if (rr.forceContextLoss) rr.forceContextLoss();
      rr.dispose();
    } catch (e) { rState = 'FAIL'; rErr = (e && (e.message || e)) + ''; }
  }
  parts.push('renderer:' + rState + (rErr ? '(' + rErr.slice(0, 90) + ')' : ''));
  const msg = parts.join('  ·  ');
  document.querySelectorAll('.viz__fallback').forEach((el) => {
    if (el.querySelector('.viz__diag')) return;
    const p = document.createElement('p');
    p.className = 'viz__diag';
    p.textContent = msg;
    p.style.cssText =
      'margin-top:10px;font:11px/1.45 ui-monospace,Menlo,monospace;color:#7b8590;' +
      'word-break:break-word;max-width:90%;opacity:.9';
    el.appendChild(p);
  });
  // Also expose for quick copy/paste.
  window.__stoworkDiag = msg;
}

// Safely build a scene on a canvas; returns StowScene | null.
function buildScene(canvasId, opts) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const slot = canvas.closest('.viz') || canvas.parentElement;
  try {
    const scene = new StowScene(canvas, opts);
    registerScene(scene);
    markLive(slot);
    return scene;
  } catch (err) {
    console.warn('[STOWORK] scene init failed for', canvasId, err);
    markFallback(slot);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function boot() {
  const glOk = webglAvailable();

  // Self-diagnosing fallback: write the ACTUAL reason WebGL didn't come up into
  // every fallback panel, so a screenshot of this page alone reveals the cause.
  injectDiagnostic();

  // If no WebGL at all, mark every slot as fallback and wire the non-3D UI.
  if (!glOk) {
    document.querySelectorAll('.viz').forEach(markFallback);
  }

  // --- Hero ---------------------------------------------------------------
  const heroScene = glOk
    ? buildScene('heroCanvas', { initialT: 1, autoRotate: true })
    : null;

  const heroStow = document.getElementById('heroStow');
  const heroReady = document.getElementById('heroReady');
  if (heroScene) {
    if (heroStow)
      heroStow.addEventListener('click', () => {
        setHeroActive(heroStow);
        heroScene.tweenTo(0, 1400);
      });
    if (heroReady)
      heroReady.addEventListener('click', () => {
        setHeroActive(heroReady);
        heroScene.tweenTo(1, 1800);
      });
  } else {
    // No 3D: buttons have nothing to drive; disable them so they aren't dead.
    [heroStow, heroReady].forEach((b) => b && b.setAttribute('disabled', ''));
  }
  function setHeroActive(btn) {
    [heroStow, heroReady].forEach((b) => b && b.classList.remove('is-active'));
    if (btn) btn.classList.add('is-active');
  }

  // --- See it deploy (centerpiece) ---------------------------------------
  const deployScene = glOk
    ? buildScene('deployCanvas', { initialT: 0, autoRotate: false })
    : null;

  wireDeploy(deployScene);

  // --- Three states gallery ----------------------------------------------
  if (glOk) {
    buildScene('galleryStowed', { initialT: 0.0, autoRotate: false });
    buildScene('galleryTriptych', { initialT: 0.7, autoRotate: false });
    buildScene('galleryReady', { initialT: 1.0, autoRotate: false });
  }

  // Debug hook (SPEC §4 allows window.__stowork only).
  window.__stowork = { heroScene, deployScene, STAGES };

  // Start the loop only if there's at least one scene; the ticker is cheap
  // but pointless with zero scenes.
  if (activeScenes.size > 0) rafId = requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------
// Deploy-section UI wiring: scrubber, stage buttons, ticks, caption, clock,
// play button. Works as informational UI even when deployScene is null.
// ---------------------------------------------------------------------------
function wireDeploy(deployScene) {
  const slider = document.getElementById('deploySlider');
  const captionEl = document.getElementById('deployCaption');
  const stageLabelEl = document.getElementById('deployStageLabel');
  const clockEl = document.getElementById('deployClock');
  const pctEl = document.getElementById('deployPct');
  const playBtn = document.getElementById('deployPlay');
  const stageBtnWrap = document.getElementById('deployStages');
  const tickWrap = document.getElementById('deployTicks');

  // Build stage tick marks + buttons from STAGES.
  const stageButtons = [];
  STAGES.forEach((st, i) => {
    if (tickWrap) {
      const tick = document.createElement('span');
      tick.className = 'scrubber__tick';
      tick.style.left = st.t * 100 + '%';
      tick.innerHTML = `<span class="scrubber__tick-dot"></span><span class="scrubber__tick-label">${st.label}</span>`;
      tickWrap.appendChild(tick);
    }
    if (stageBtnWrap) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'stage-btn';
      b.dataset.idx = String(i);
      b.innerHTML = `<span class="stage-btn__num">${i + 1}</span>${st.label}`;
      b.addEventListener('click', () => goToStage(i));
      stageBtnWrap.appendChild(b);
      stageButtons.push(b);
    }
  });

  const fmtClock = (secs) => {
    const s = Math.round(clamp01(secs / DEPLOY_BUDGET_S) * DEPLOY_BUDGET_S);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  // activeStageIndex: last stage whose t <= current t (with a hair of tolerance).
  function activeStageIndex(t) {
    let idx = 0;
    for (let i = 0; i < STAGES.length; i++) {
      if (t >= STAGES[i].t - 0.001) idx = i;
    }
    return idx;
  }

  // Refresh all readouts for a given t. Optionally move the slider thumb.
  function refreshUI(t, { moveSlider = true } = {}) {
    t = clamp01(t);
    const idx = activeStageIndex(t);
    const st = STAGES[idx];
    if (captionEl) captionEl.textContent = st.caption;
    if (stageLabelEl) stageLabelEl.textContent = st.label;
    if (clockEl) clockEl.textContent = fmtClock(t * DEPLOY_BUDGET_S);
    if (pctEl) pctEl.textContent = Math.round(t * 100) + '%';
    if (moveSlider && slider) slider.value = String(Math.round(t * 1000));
    stageButtons.forEach((b, i) => b.classList.toggle('is-active', i === idx));
  }

  // Live scrub from slider.
  if (slider) {
    slider.addEventListener('input', () => {
      const t = Number(slider.value) / 1000;
      if (deployScene) deployScene.setT(t);
      refreshUI(t, { moveSlider: false });
    });
  }

  // Animate to a stage; keep slider + readouts in sync during the tween.
  function goToStage(i) {
    const st = STAGES[i];
    if (deployScene) {
      deployScene.tweenTo(st.t, 1100, (t) => refreshUI(t));
      if (prefersReduced) refreshUI(st.t);
    } else {
      refreshUI(st.t);
    }
  }

  // Play deployment 0 -> 1 over ~6s.
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (deployScene) {
        deployScene.setT(0);
        refreshUI(0);
        deployScene.tweenTo(1, PLAY_DURATION_MS, (t) => refreshUI(t));
        if (prefersReduced) refreshUI(1);
      } else {
        // No 3D: still narrate the sequence by stepping the readouts.
        narrateFallback(refreshUI);
      }
    });
  }

  // Initial state.
  refreshUI(deployScene ? 0 : 0);
}

// When 3D is unavailable, the Play button walks the readouts through the
// stages so the section still communicates the deployment story.
function narrateFallback(refreshUI) {
  let i = 0;
  const step = () => {
    if (i >= STAGES.length) return;
    refreshUI(STAGES[i].t);
    i++;
    if (i < STAGES.length) setTimeout(step, prefersReduced ? 0 : 900);
  };
  step();
}

// ---------------------------------------------------------------------------
// Kick off (guarded so any unexpected error still leaves the page readable).
// ---------------------------------------------------------------------------
try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      try {
        boot();
      } catch (e) {
        console.error('[STOWORK] boot failed', e);
        document.querySelectorAll('.viz').forEach((v) => v.classList.add('is-fallback'));
      }
    });
  } else {
    boot();
  }
} catch (e) {
  console.error('[STOWORK] fatal', e);
  document.querySelectorAll('.viz').forEach((v) => v.classList.add('is-fallback'));
}
})(); // end IIFE — top-level declarations stay scoped, no global collisions
