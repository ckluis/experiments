// studio.js — shared "photo studio" for STOWORK: lights, shadow catcher and
// camera framing. Used by the live deploy viewer (app.js) AND by the offline
// render harness that produced renders/*.webp, so the still frames the page
// shows without WebGL match the live model exactly.
//
// Classic script; defines one global: StoworkStudio. Requires THREE.
(function () {
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (k) => { k = clamp01(k); return k * k * (3 - 2 * k); };

  // Default viewing angle: front-right three-quarter, slightly elevated —
  // the "product shot" angle. Azimuth from +Z toward +X, polar from +Y.
  const VIEW = { az: 0.56, pol: 1.25 };

  function addLights(scene, { shadowSize = 1024 } = {}) {
    // Warm key from above front-right; casts the soft contact shadow.
    const key = new THREE.DirectionalLight(0xfff0de, 2.5);
    key.position.set(60, 95, 75);
    key.castShadow = true;
    key.shadow.mapSize.set(shadowSize, shadowSize);
    Object.assign(key.shadow.camera, { near: 10, far: 400, left: -90, right: 90, top: 90, bottom: -90 });
    key.shadow.bias = -0.0005;
    key.shadow.radius = 5;
    scene.add(key);

    // Cool fill from the left so the dark side keeps its shape.
    const fill = new THREE.DirectionalLight(0x8fb4d6, 0.75);
    fill.position.set(-80, 40, -20);
    scene.add(fill);

    // Amber rim from behind: separates the silhouette from the dark ground.
    const rim = new THREE.DirectionalLight(0xffc489, 0.6);
    rim.position.set(-40, 60, -120);
    scene.add(rim);

    scene.add(new THREE.HemisphereLight(0x34404d, 0x0a0d10, 0.5));

    // Transparent ground that only receives the shadow — the page's CSS
    // backdrop shows through the canvas, so live and still frames sit on the
    // same ground.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1200, 1200),
      new THREE.ShadowMaterial({ opacity: 0.5 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    return { key, fill, rim, ground };
  }

  // Camera distance + look-at height for a deploy value t and a canvas aspect.
  // Closed, the case is small, so the camera sits closer; as the rig grows the
  // camera eases back. Narrow (portrait-ish) canvases push the camera out so
  // the full 83 cm array still fits side to side.
  function frame(t, aspect) {
    const e = ease(t / 0.7); // the rig reaches full width when the wings finish
    let dist = 116 + (152 - 116) * e;
    const ty = 11 + (24 - 11) * ease(t / 0.45);
    // Wide frames are height-limited; only frames narrower than ~1.15:1
    // become width-limited and need the camera pulled back.
    const ref = 1.15;
    if (aspect < ref) dist *= ref / aspect;
    return { dist, targetY: ty };
  }

  function placeCamera(camera, t, aspect, az = VIEW.az, pol = VIEW.pol) {
    const { dist, targetY } = frame(t, aspect);
    const s = Math.sin(pol);
    camera.position.set(dist * s * Math.sin(az), targetY + dist * Math.cos(pol), dist * s * Math.cos(az));
    camera.lookAt(0, targetY, 0);
  }

  // Creates the context ourselves first, so a browser without WebGL fails
  // quietly (null) instead of three.js logging a console error.
  function makeRenderer(canvas, opts = {}) {
    if (!canvas) canvas = document.createElement('canvas');
    const attrs = Object.assign({
      alpha: true, antialias: true, depth: true, stencil: true,
      premultipliedAlpha: true, preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false
    }, opts);
    let gl = null;
    try { gl = canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs); } catch (e) { gl = null; }
    if (!gl) throw new Error('WebGL unavailable');
    const r = new THREE.WebGLRenderer(Object.assign({ canvas, context: gl }, attrs));
    r.setClearColor(0x000000, 0);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.outputEncoding = THREE.sRGBEncoding;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    return r;
  }

  window.StoworkStudio = { VIEW, addLights, frame, placeCamera, makeRenderer };
})();
