/* ============================================================
   omegaClass — landing page runtime (app.js)

   Classic script, IIFE-wrapped so its top-level declarations never
   collide with grillModel.js globals. Consumes the global
   createOmegaGrill(). NO import/export/module.

   The page is imagery-led and complete without JS. This file adds:
   ONE live 3D view (the configurator) on a single WebGLRenderer that
   renders on demand and pauses off screen; context-loss / no-WebGL
   fallbacks back to the static poster render; posture tweens and an
   intro lift of the roofs; and transform-only scroll reveals (content
   is never hidden). Reduced motion is honored throughout.

   CONCEPT (v6): ONE wide stainless cabinet that opens into a zoned
   outdoor fire station — prep + sink | brasero-fed parrilla | vertical
   smoker — sheltered by two lift-up roof lids. THREE dials:
   roof (open the roof) + doors (open the smoker) + fire (light the
   fires), plus a minor grate.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- named postures (SPEC §2 — roof/doors/fire keys) ---------- */
  var POSTURES = [
    { id: "closed",  label: "Closed",          roof: 0.0, doors: 0.0, fire: 0.0, caption: "One sealed stainless cabinet on leveling feet — weatherproof and locked. 240×68×205 cm." },
    { id: "station", label: "Open Station",    roof: 1.0, doors: 0.0, fire: 0.0, caption: "Both roofs up — brasero, wide parrilla, sink and counter, and the sealed smoker, all revealed and sheltered." },
    { id: "asado",   label: "Asado",           roof: 1.0, doors: 0.0, fire: 1.0, caption: "Brasero lit, coals raked under the parrilla, flames up — and the smoker running sealed, smoke curling from its flue." },
    { id: "smoker",  label: "Load the Smoker", roof: 1.0, doors: 1.0, fire: 1.0, caption: "Cookbox doors open on three racks, firebox glowing below — a vertical smoker, smoke rising through the food." }
  ];
  function postureById(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }

  /* ---------- small utils ---------- */
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t * t * (3 - 2 * t); } /* smoothstep */

  function webglAvailable() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext &&
        (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }
  function threeRev() {
    try { return (typeof THREE !== "undefined" && THREE.REVISION) ? ("r" + THREE.REVISION) : "THREE missing"; }
    catch (e) { return "THREE missing"; }
  }

  /* ---------- model API adapter --------------------------------
     The v6 zoned-station model exposes setRoof (raise both roof lids),
     setDoors (open the vertical smoker's dual cabinet doors), setFire
     and setGrate. setLid/setPod/setStation alias setRoof for back-compat,
     so `model.setRoof || model.setLid` drives whichever build loads. */
  function driveRoof(model, v)  { try { (model.setRoof || model.setLid || model.setStation).call(model, clamp01(v)); } catch (e) {} }
  function driveDoors(model, v) { try { model.setDoors(clamp01(v)); } catch (e) {} }
  function driveFire(model, v)  { try { model.setFire(clamp01(v)); } catch (e) {} }
  function driveGrate(model, v) { try { model.setGrate(clamp01(v)); } catch (e) {} }

  /* Show the configurator's fallback panel + inject a self-diagnostic line. */
  function showFallback(vizEl, errMsg) {
    if (!vizEl) return;
    vizEl.classList.add("is-fallback");
    var fb = vizEl.querySelector(".viz__fallback");
    if (fb) {
      fb.hidden = false;
      var diag = fb.querySelector(".viz__diag");
      if (diag) {
        diag.textContent = "three " + threeRev() +
          " · webgl " + (webglAvailable() ? "ok" : "absent") +
          " · " + (errMsg ? String(errMsg).slice(0, 120) : "scene init failed");
      }
    }
  }

  /* ---------- premium range fill ---------- */
  function paintRange(input) {
    if (!input) return;
    var min = +input.min || 0, max = +input.max || 100;
    var pct = ((+input.value - min) / (max - min)) * 100;
    input.style.setProperty("--fill", pct + "%");
  }

  /* ---------- generic tween ---------- */
  function makeTween() {
    var raf = null;
    return {
      cancel: function () { if (raf) { cancelAnimationFrame(raf); raf = null; } },
      run: function (from, to, dur, onUpdate, onDone) {
        this.cancel();
        if (REDUCED || dur <= 0) { onUpdate(to, 1); if (onDone) onDone(); return; }
        var start = performance.now();
        function step(now) {
          var t = Math.min(1, (now - start) / dur);
          var k = easeInOut(t);
          var cur = {};
          for (var key in from) cur[key] = lerp(from[key], to[key], k);
          onUpdate(cur, t);
          if (t < 1) { raf = requestAnimationFrame(step); }
          else { raf = null; if (onDone) onDone(); }
        }
        raf = requestAnimationFrame(step);
      }
    };
  }

  /* ---------- scroll reveals (enhancement only) ----------
     Content is visible by default. Here we only nudge elements that start
     BELOW the fold (a small translate, never opacity) and settle them as they
     enter. If this never runs — no JS, a failed load, reduced motion — the
     page is simply static and complete. */
  function initReveals() {
    if (REDUCED || !("IntersectionObserver" in window)) return;
    var vh = window.innerHeight || 800;
    var els = Array.prototype.slice.call(document.querySelectorAll(".reveal"))
      .filter(function (el) { return el.getBoundingClientRect().top > vh * 0.95; });
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("rv-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { el.classList.add("rv-pre"); io.observe(el); });
  }

  /* radial studio-floor gradient as a CanvasTexture */
  function makeGroundTexture() {
    var c = document.createElement("canvas");
    c.width = c.height = 512;
    var ctx = c.getContext("2d");
    var g = ctx.createRadialGradient(256, 200, 20, 256, 256, 300);
    g.addColorStop(0, "#2a2622");
    g.addColorStop(0.35, "#121214");
    g.addColorStop(1, "#060607");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    var tex = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  /* ============================================================
     THE ONE LIVE 3D — build a single renderer/scene/camera bound
     to the configurator's .viz slot. Returns a control object with
     .set(roof,doors,fire,grate) and tracked {roof,doors,fire}, or
     null if WebGL / scene init failed (fallback already shown).
     ============================================================ */
  function buildConfigurator(vizEl) {
    if (!webglAvailable()) { showFallback(vizEl, "WebGL unavailable"); return null; }

    var renderer = null;
    try {
      /* --- the ONE canvas + renderer, living inside the config card --- */
      var canvas = document.createElement("canvas");
      canvas.className = "viz__canvas";
      canvas.setAttribute("aria-hidden", "true");
      vizEl.appendChild(canvas);

      renderer = new THREE.WebGLRenderer({
        canvas: canvas, antialias: true, alpha: false, failIfMajorPerformanceCaveat: false
      });
      renderer.setClearColor(0x0b0b0d, 1);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      renderer.outputEncoding = THREE.sRGBEncoding; /* r128 */
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      /* --- scene --- */
      var scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b0b0d);
      scene.fog = new THREE.Fog(0x0b0b0d, 320, 720);

      var camera = new THREE.PerspectiveCamera(34, 1, 1, 4000);

      /* --- cinematic lighting: dramatic key + cool fill + warm rim --- */
      var key = new THREE.DirectionalLight(0xfff1e0, 2.5);
      key.position.set(120, 200, 160);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.near = 40; key.shadow.camera.far = 700;
      key.shadow.camera.left = -180; key.shadow.camera.right = 180;
      key.shadow.camera.top = 180; key.shadow.camera.bottom = -180;
      key.shadow.bias = -0.0004;
      scene.add(key);

      var fill = new THREE.DirectionalLight(0x8fb2ff, 0.55);
      fill.position.set(-160, 90, 60);
      scene.add(fill);

      var rim = new THREE.DirectionalLight(0xff9a4d, 1.1);
      rim.position.set(-60, 120, -200);
      scene.add(rim);

      scene.add(new THREE.HemisphereLight(0x3a4458, 0x14110e, 0.8));

      /* ember glow light near the fire-core (flickers with `fire`) */
      var emberLight = new THREE.PointLight(0xff5e1e, 0, 260, 2);
      emberLight.position.set(0, 26, 24);
      scene.add(emberLight);

      /* reflective/gradient studio ground */
      var groundMat = new THREE.MeshStandardMaterial({
        map: makeGroundTexture(), color: 0x3a3a40, metalness: 0.0, roughness: 0.92
      });
      var ground = new THREE.Mesh(new THREE.CircleGeometry(900, 64), groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      /* --- the grill (consumed contract) --- */
      var model = createOmegaGrill();
      scene.add(model.root);
      model.root.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

      /* frame camera via fitRadius */
      var r = (typeof model.fitRadius === "number" && model.fitRadius > 0) ? model.fitRadius : 140;
      var fovR = camera.fov * Math.PI / 180;
      var dist = (r / Math.sin(fovR / 2)) * 0.92;
      /* a 3/4 view from front-right, matching the page's renders */
      camera.position.set(dist * 0.42, dist * 0.30, dist * 0.86);

      /* OrbitControls attach to the .viz placeholder (captures pointer) */
      var controls = new THREE.OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.enablePan = false;
      controls.enableZoom = false; /* never hijack the page's wheel scroll */
      controls.minDistance = r * 0.9;
      controls.maxDistance = r * 5;
      controls.minPolarAngle = 0.15 * Math.PI;
      controls.maxPolarAngle = 0.52 * Math.PI;
      controls.target.set(0, 116, 8); /* mid-height of the open station (cm) */
      controls.autoRotate = false;
      controls.autoRotateSpeed = 0.9;
      controls.update();

      /* Fit the open station (~300 cm wide with roof overhang, ~250 cm tall)
         to whatever aspect the stage has, keeping the current orbit direction. */
      function frameCamera() {
        var vf = fovR / 2;
        var hf = Math.atan(Math.tan(vf) * camera.aspect);
        var need = Math.max(150 / Math.tan(vf), 165 / Math.tan(hf)) * 1.26 + 40;
        var dir = camera.position.clone().sub(controls.target).normalize();
        camera.position.copy(controls.target).addScaledVector(dir, need);
        /* fog only swallows the far floor, never the cabinet */
        if (scene.fog) { scene.fog.near = need + 110; scene.fog.far = need + 620; }
        controls.update();
      }

      /* --- sizing to the .viz box --- */
      function resize() {
        var w = Math.max(1, vizEl.clientWidth);
        var h = Math.max(1, vizEl.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        frameCamera();
        if (typeof ctrl !== "undefined" && ctrl && ctrl.invalidate) ctrl.invalidate();
      }
      resize();
      window.addEventListener("resize", resize);
      window.addEventListener("orientationchange", resize);
      if ("ResizeObserver" in window) {
        try { new ResizeObserver(resize).observe(vizEl); } catch (e) {}
      }

      /* --- the control object --- */
      var ctrl = {
        model: model,
        roof: 0, doors: 0, fire: 0,
        set: function (rf, d, f, gr) {
          if (rf != null) { driveRoof(model, rf); ctrl.roof = clamp01(rf); }
          if (d != null)  { driveDoors(model, d); ctrl.doors = clamp01(d); }
          if (f != null)  { driveFire(model, f); ctrl.fire = clamp01(f); }
          if (gr != null) driveGrate(model, gr);
          if (ctrl.invalidate) ctrl.invalidate();
        }
      };

      /* initial pose — Closed, grate default 0.4 */
      ctrl.set(0, 0, 0, 0.4);

      /* --- render on demand ---------------------------------------
         Only draw while the stage is on screen and the tab is visible,
         and only when something changed: a control, an orbit drag/damping,
         a resize, or live fire flicker. Off screen it costs nothing. */
      var dirty = true, onScreen = true, tabVisible = !document.hidden, rafId = null;
      var last = performance.now(), clock = 0, firstFrame = true;
      function invalidate() { dirty = true; kick(); }
      ctrl.invalidate = invalidate;
      controls.addEventListener("change", function () { dirty = true; });
      window.addEventListener("resize", invalidate);

      function frame(now) {
        rafId = null;
        if (!onScreen || !tabVisible) return;
        var dt = Math.min(0.05, (now - last) / 1000);
        last = now; clock += dt;
        var moving = controls.update(); /* true while damping */
        var flicker = !REDUCED && ctrl.fire > 0.01;
        if (flicker) {
          var noise = 0.75 + 0.25 * Math.sin(clock * 11) * Math.sin(clock * 6.3 + 1.7);
          emberLight.intensity = ctrl.fire * 3.2 * noise;
        } else {
          emberLight.intensity = ctrl.fire * 3.2;
        }
        if (dirty || moving || flicker) {
          renderer.render(scene, camera);
          dirty = false;
          if (firstFrame) { firstFrame = false; vizEl.classList.add("is-live"); var st = vizEl.closest(".stage"); if (st) st.classList.add("is-live"); }
        }
        kick();
      }
      function kick() {
        if (rafId == null && onScreen && tabVisible) { last = performance.now(); rafId = requestAnimationFrame(frame); }
      }

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          onScreen = entries[0].isIntersecting;
          if (onScreen) invalidate();
        }, { rootMargin: "120px 0px" }).observe(vizEl);
      }
      document.addEventListener("visibilitychange", function () {
        tabVisible = !document.hidden;
        if (tabVisible) invalidate();
      });
      /* If the GPU drops the context (memory pressure, a full-page capture),
         fall back to the static poster instead of showing a blank stage. */
      canvas.addEventListener("webglcontextlost", function (e) {
        e.preventDefault();
        vizEl.classList.remove("is-live");
      });
      canvas.addEventListener("webglcontextrestored", function () {
        firstFrame = true; invalidate();
      });
      kick();

      return ctrl;
    } catch (err) {
      if (renderer) { try { renderer.dispose(); } catch (e) {} }
      showFallback(vizEl, err && err.message);
      return null;
    }
  }

  /* ============================================================
     CONFIGURATOR UI — Open the roof / Open the smoker / Light the
     fires + grate + the four posture presets (animated tweens).
     ============================================================ */
  function wireConfigurator(ctrl, postures) {
    var sRoof = document.getElementById("scrub-roof");
    var sDoors = document.getElementById("scrub-doors");
    var sFire = document.getElementById("scrub-fire");
    var sGrate = document.getElementById("scrub-grate");
    var oRoof = document.getElementById("out-roof");
    var oDoors = document.getElementById("out-doors");
    var oFire = document.getElementById("out-fire");
    var oGrate = document.getElementById("out-grate");
    var labelEl = document.getElementById("config-posture-label");
    var capEl = document.getElementById("config-caption");
    var presetBtns = Array.prototype.slice.call(document.querySelectorAll(".preset"));
    var tween = makeTween();

    if (!sRoof || !sDoors || !sFire || !sGrate) return;

    function nearestPosture(r, d, f) {
      var best = postures[0], bd = Infinity;
      for (var i = 0; i < postures.length; i++) {
        var q = postures[i];
        var dd = (q.roof - r) * (q.roof - r) + (q.doors - d) * (q.doors - d) + (q.fire - f) * (q.fire - f);
        if (dd < bd) { bd = dd; best = q; }
      }
      return { p: best, d: Math.sqrt(bd) };
    }

    function refreshCaption(r, d, f) {
      var n = nearestPosture(r, d, f);
      if (labelEl) labelEl.textContent = n.p.label;
      if (capEl) capEl.textContent = n.p.caption;
      var matchId = n.d < 0.04 ? n.p.id : null;
      presetBtns.forEach(function (b) {
        b.classList.toggle("is-active", b.getAttribute("data-posture") === matchId);
      });
    }

    function applyRoof(v, updateInput) {
      if (updateInput) sRoof.value = Math.round(v * 100);
      if (oRoof) oRoof.textContent = Math.round(v * 100) + "%";
      paintRange(sRoof);
      if (ctrl) ctrl.set(v, null, null, null);
    }
    function applyDoors(v, updateInput) {
      if (updateInput) sDoors.value = Math.round(v * 100);
      if (oDoors) oDoors.textContent = Math.round(v * 100) + "%";
      paintRange(sDoors);
      if (ctrl) ctrl.set(null, v, null, null);
    }
    function applyFire(v, updateInput) {
      if (updateInput) sFire.value = Math.round(v * 100);
      if (oFire) oFire.textContent = Math.round(v * 100) + "%";
      paintRange(sFire);
      if (ctrl) ctrl.set(null, null, v, null);
    }
    function applyGrate(v) {
      if (oGrate) oGrate.textContent = Math.round(v * 100) + "%";
      paintRange(sGrate);
      if (ctrl) ctrl.set(null, null, null, v);
    }

    function vals() {
      return { r: (+sRoof.value) / 100, d: (+sDoors.value) / 100, f: (+sFire.value) / 100 };
    }

    /* manual scrub — immediate, cancels any tween */
    sRoof.addEventListener("input", function () {
      tween.cancel();
      var v = (+sRoof.value) / 100;
      applyRoof(v, false);
      var s = vals(); refreshCaption(v, s.d, s.f);
    });
    sDoors.addEventListener("input", function () {
      tween.cancel();
      var v = (+sDoors.value) / 100;
      applyDoors(v, false);
      var s = vals(); refreshCaption(s.r, v, s.f);
    });
    sFire.addEventListener("input", function () {
      tween.cancel();
      var v = (+sFire.value) / 100;
      applyFire(v, false);
      var s = vals(); refreshCaption(s.r, s.d, v);
    });
    sGrate.addEventListener("input", function () {
      applyGrate((+sGrate.value) / 100);
    });

    /* preset buttons — animated tween of roof + doors + fire */
    presetBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var p = postureById(postures, btn.getAttribute("data-posture"));
        var s = vals();
        var from = { r: s.r, d: s.d, f: s.f };
        var to = { r: p.roof, d: p.doors, f: p.fire };
        presetBtns.forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        if (labelEl) labelEl.textContent = p.label;
        if (capEl) capEl.textContent = p.caption;
        tween.run(from, to, 1400, function (cur) {
          applyRoof(cur.r, true);
          applyDoors(cur.d, true);
          applyFire(cur.f, true);
        }, function () {
          applyRoof(p.roof, true);
          applyDoors(p.doors, true);
          applyFire(p.fire, true);
          refreshCaption(p.roof, p.doors, p.fire);
        });
      });
    });

    /* init paint */
    paintRange(sRoof); paintRange(sDoors); paintRange(sFire); paintRange(sGrate);
    applyGrate((+sGrate.value) / 100);
    var s0 = vals();
    applyRoof(s0.r, false); applyDoors(s0.d, false); applyFire(s0.f, false);
    refreshCaption(s0.r, s0.d, s0.f);
  }

  /* ============================================================
     BOOT — one live view, everything else is imagery.
     ============================================================ */
  function boot() {
    initReveals();
    var vizEl = document.querySelector('.viz[data-viz="config"]');
    var ctrl = vizEl ? buildConfigurator(vizEl) : null;
    /* The markup ships in "Open Station" so the no-JS poster and caption
       agree. With motion allowed and a live model, start sealed and lift
       the roofs the first time the stage scrolls into view. */
    var intro = ctrl && !REDUCED && ("IntersectionObserver" in window);
    if (intro) {
      var sr = document.getElementById("scrub-roof");
      if (sr) sr.value = 0;
    }
    wireConfigurator(ctrl, POSTURES);
    if (intro) {
      var btn = document.querySelector('.preset[data-posture="station"]');
      var touched = false;
      document.querySelector(".stage").addEventListener("pointerdown", function () { touched = true; }, { once: true });
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        setTimeout(function () { if (!touched && btn) btn.click(); }, 450);
      }, { threshold: 0.45 });
      io.observe(vizEl);
    }
  }

  /* ---------- go ---------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
