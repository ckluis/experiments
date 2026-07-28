// caseModel.js — STOWORK "Carry-On Studio" parametric 3D model.
//
// Builds the full deployable-office rig described in SPEC.md (sections 3 & 4) and
// exposes a single normalized deploy parameter t ∈ [0,1] that drives every hinge,
// lift and slide. Pure scene graph: no window / DOM / renderer / camera / lights.
//
// Coordinate frame (SPEC §3): +X right, +Y up, +Z toward the user. 1 unit = 1 cm.
// Origin at the centre of the base footprint; table surface at y = 0.
//
// Classic script: THREE is a global provided by vendor/three.min.js (loaded first).
// No ES module import — so this works from file:// with no server and no build step.
//
// Visual-quality pass: procedural equirectangular studio environment (DataTexture)
// drives real metal/glass reflections; rounded/beveled shells; canvas-painted screen
// UI; refined keyboard/trackpad; spinner/handle/hinge/vent/speaker detailing; and a
// premium compute bay. All procedural — no external asset files.

const DEG = THREE.MathUtils.degToRad;
const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;

// Smoothstep easing over an arbitrary window; clamps outside [edge0, edge1] so a
// part holds its start state before its window and its end state after it.
function smoothstep(edge0, edge1, x) {
  const u = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return u * u * (3 - 2 * u);
}

// ---- Named stages (SPEC §2 — exact ids / labels / captions / t values) --------
const STAGES = [
  { t: 0.00, id: 'stowed',   label: 'Stowed',            caption: '55×35×23 cm. Airline carry-on legal.' },
  { t: 0.15, id: 'opened',   label: 'Opened',            caption: 'Lay flat, unlatch, lid swings clear.' },
  { t: 0.45, id: 'monitors', label: 'Monitors Up',       caption: 'Gas-strut lift raises the display to eye level.' },
  { t: 0.70, id: 'triptych', label: 'Triptych Deployed', caption: 'Two wings fan into a curved 3-screen array.' },
  { t: 0.85, id: 'av',       label: 'AV Boom',           caption: 'Broadcast mic + 4K camera rise to your face.' },
  { t: 1.00, id: 'ready',    label: 'Ready to Work',     caption: 'Keyboard forward. Power on. Under two minutes.' },
];

// ---- Deploy kinematics constants (per-part t windows from SPEC §3) ------------
const LID_OPEN   = DEG(-112);  // rear-top clamshell swings up & back past vertical
const LIFT_STOW_Y = 8;         // liftAssembly y when stowed (flat inside the base)
const LIFT_RISE   = 12;        // +12 cm gas-strut lift (SPEC)
const BRIDGE_FLAT = DEG(90);   // monitorBridge tilt: flat (panel points +Z) -> 0 upright
const MAST_BASE   = 6.5;       // telescoping post length when stowed (bottom pinned to floor)
const WING_FOLD   = DEG(170);  // wing folded face-to-face over the centre panel (stowed)
const WING_OPEN   = DEG(35);   // wing fanned ~35° into the curved array (deployed)
const BOOM_MIN    = 3;         // retracted boom length
const BOOM_MAX    = 12;        // extended boom length (~+9 cm rise)
const MIC_TILT    = DEG(45);   // mic head pivots down toward the user's mouth
const KB_STOW_Z   = 9;         // keyboard tray z (tucked)
const KB_SLIDE    = 6;         // tray advances +6 cm toward the user
const TRACK_TILT  = DEG(-8);   // trackpad flips ~8° up-> flat
const LED_MAX     = 2.6;       // power LED emissive intensity when on
const SCREEN_GLOW_LOW  = 0.18; // baseline screen glow
const SCREEN_GLOW_HIGH = 0.55; // screen glow after power-on

// ===========================================================================
// Procedural geometry + texture helpers (pure; THREE global; browser canvas).
// Kept at module scope so they allocate no closure state — reused per build.
// ===========================================================================

// Rounded-rectangle path centred on the origin, in the XY plane.
function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// Beveled rounded box, centred on the origin, extruded along +Z (depth = d).
// Corners of the front (XY) face are rounded by ~r; every edge gets a subtle
// bevel so nothing reads as a hard cube. No maps are applied to these (envMap +
// reflection only), so ExtrudeGeometry's cm-scale UVs are irrelevant here.
function roundedBoxGeo(w, h, d, r, bevel) {
  bevel = bevel === undefined ? Math.min(0.15, d * 0.2) : bevel;
  bevel = Math.max(0.01, Math.min(bevel, w / 2 - 0.02, h / 2 - 0.02, d / 2 - 0.005));
  const rr = Math.max(0.02, Math.min(r, w / 2, h / 2) - bevel);
  const shape = roundedRectShape(w - 2 * bevel, h - 2 * bevel, rr);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.02, d - 2 * bevel),
    bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 2, curveSegments: 5, steps: 1,
  });
  geo.translate(0, 0, -(d / 2 - bevel)); // recentre so the box straddles z=0
  return geo;
}

// A small offscreen canvas (browser only; parse-safe for `node --check`).
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Procedural equirectangular STUDIO environment as a DataTexture. A soft
// top-lit gradient plus a few bright "softbox" lobes — this is what makes the
// anodized shell, the aluminium device and the glass actually read as metal and
// glass (crisp specular highlights + graded reflections). No renderer needed.
function makeStudioEnvTexture() {
  const W = 512, H = 256;
  const data = new Uint8Array(W * H * 4);
  // Bright soft rectangles in the upper hemisphere (u wraps in azimuth).
  const boxes = [
    { u: 0.26, v: 0.30, su: 0.10, sv: 0.17, i: 1.00 },
    { u: 0.72, v: 0.26, su: 0.08, sv: 0.14, i: 0.85 },
    { u: 0.50, v: 0.13, su: 0.22, sv: 0.10, i: 0.45 },
  ];
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1); // 0 = up/top, 1 = down/floor
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      let lum = lerp(0.60, 0.035, smoothstep(0.05, 0.95, v)); // vertical falloff
      lum += 0.10 * Math.exp(-Math.pow((v - 0.5) / 0.12, 2)); // gentle horizon lift
      for (const b of boxes) {                                 // softbox lobes
        let du = Math.abs(u - b.u); du = Math.min(du, 1 - du);
        lum += b.i * Math.exp(-(Math.pow(du / b.su, 2) + Math.pow((v - b.v) / b.sv, 2)));
      }
      lum = Math.min(1.15, lum);
      const warm = smoothstep(0.35, 1.0, v); // cool up top, warmer/darker low
      const r = lum * lerp(0.86, 1.02, warm);
      const g = lum * lerp(0.90, 0.86, warm);
      const bl = lum * lerp(1.05, 0.72, warm);
      const idx = (y * W + x) * 4;
      data[idx]     = Math.min(255, r * 255) | 0;
      data[idx + 1] = Math.min(255, g * 255) | 0;
      data[idx + 2] = Math.min(255, bl * 255) | 0;
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// Rounded-rect fill helper for the canvas UI painters.
function cvRoundRect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Believable on-screen UI painted to a CanvasTexture (used as map + emissiveMap
// so the panel glows when powered on). `kind` selects complementary content per
// screen: 'center' (desktop + editor + chart), 'left' (terminal/docs), 'right'
// (analytics dashboard). Panels are 16:10.
function makeScreenTexture(kind) {
  const W = 512, H = 320, c = makeCanvas(W, H), g = c.getContext('2d');
  const AMBER = '#e6a15c';

  // Desktop wallpaper — subtle diagonal gradient.
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#15304a');
  grad.addColorStop(0.55, '#0f2233');
  grad.addColorStop(1, '#0a1622');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // faint vignette glow top-left
  const rg = g.createRadialGradient(120, 70, 20, 120, 70, 320);
  rg.addColorStop(0, 'rgba(90,160,210,0.22)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);

  // Menu bar
  g.fillStyle = 'rgba(10,16,22,0.82)';
  g.fillRect(0, 0, W, 22);
  g.fillStyle = AMBER;
  g.beginPath(); g.arc(16, 11, 5, 0, Math.PI * 2); g.fill(); // brand mark
  g.fillStyle = '#cfe0ee';
  g.font = '12px system-ui, sans-serif';
  g.fillText('STOWORK', 30, 15);
  g.textAlign = 'right';
  g.fillText('9:41', W - 12, 15);
  g.textAlign = 'left';

  const traffic = (x, y) => {
    ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
      g.fillStyle = col; g.beginPath(); g.arc(x + i * 15, y, 5, 0, Math.PI * 2); g.fill();
    });
  };

  if (kind === 'center') {
    // Code editor window
    cvRoundRect(g, 28, 40, 300, 180, 10);
    g.fillStyle = 'rgba(14,20,28,0.94)'; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.fillRect(28, 40, 300, 24);
    traffic(46, 52);
    const codeColors = ['#7fd1ff', '#e6a15c', '#9ad29a', '#c9a2ff', '#cfe0ee', '#7fd1ff', '#e88'];
    for (let i = 0; i < 11; i++) {
      const y = 76 + i * 13, w = 60 + ((i * 53) % 220);
      g.fillStyle = codeColors[i % codeColors.length];
      g.globalAlpha = 0.85;
      g.fillRect(46 + (i % 3) * 10, y, w, 5);
    }
    g.globalAlpha = 1;
    // Chart card
    cvRoundRect(g, 344, 40, 140, 120, 10);
    g.fillStyle = 'rgba(14,20,28,0.94)'; g.fill();
    g.strokeStyle = 'rgba(230,161,92,0.9)'; g.lineWidth = 2;
    g.beginPath();
    const pts = [0.2, 0.45, 0.35, 0.62, 0.55, 0.8, 0.72, 0.95];
    pts.forEach((p, i) => {
      const x = 356 + i * 17, y = 150 - p * 92;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.stroke();
    g.fillStyle = 'rgba(230,161,92,0.14)';
    g.lineTo(356 + 7 * 17, 150); g.lineTo(356, 150); g.closePath(); g.fill();
    // Dock
    cvRoundRect(g, 150, 286, 212, 24, 12);
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fill();
    for (let i = 0; i < 7; i++) {
      cvRoundRect(g, 160 + i * 28, 290, 18, 16, 4);
      g.fillStyle = ['#7fd1ff', '#e6a15c', '#9ad29a', '#c9a2ff', '#ff8fae', '#8fb4ff', '#ffd479'][i]; g.fill();
    }
  } else if (kind === 'left') {
    // Terminal window
    cvRoundRect(g, 30, 44, 452, 232, 10);
    g.fillStyle = 'rgba(8,12,17,0.95)'; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(30, 44, 452, 24);
    traffic(48, 56);
    g.font = '11px ui-monospace, monospace';
    const lines = [
      ['#9ad29a', '~/stowork $ deploy --stage ready'],
      ['#6f8296', 'booting compute bay ............ ok'],
      ['#6f8296', 'triptych calibrated ............ ok'],
      ['#e6a15c', 'AV boom: mic + 4K camera online'],
      ['#cfe0ee', 'three displays @ 2560×1600'],
      ['#9ad29a', 'ready in 104s'],
    ];
    lines.forEach((ln, i) => { g.fillStyle = ln[0]; g.fillText(ln[1], 46, 92 + i * 20); });
    g.fillStyle = AMBER; g.fillRect(46, 92 + 6 * 20, 8, 12); // cursor
  } else {
    // Analytics dashboard (right wing)
    g.fillStyle = 'rgba(10,16,22,0.5)'; g.fillRect(0, 22, W, H);
    // KPI tiles
    const tiles = [['UPTIME', '99.9%'], ['LATENCY', '12ms'], ['THROUGHPUT', '4.1k']];
    tiles.forEach((tt, i) => {
      cvRoundRect(g, 28 + i * 156, 44, 140, 60, 10);
      g.fillStyle = 'rgba(16,22,30,0.95)'; g.fill();
      g.fillStyle = '#6f8296'; g.font = '10px system-ui, sans-serif';
      g.fillText(tt[0], 42 + i * 156, 66);
      g.fillStyle = i === 1 ? AMBER : '#cfe0ee'; g.font = 'bold 22px system-ui, sans-serif';
      g.fillText(tt[1], 42 + i * 156, 92);
    });
    // Bar chart
    cvRoundRect(g, 28, 120, 292, 156, 10);
    g.fillStyle = 'rgba(16,22,30,0.95)'; g.fill();
    const bars = [0.4, 0.65, 0.5, 0.8, 0.72, 0.95, 0.6, 0.85];
    bars.forEach((b, i) => {
      const h = b * 118, x = 46 + i * 33;
      g.fillStyle = i % 2 ? AMBER : '#4f8fb8';
      cvRoundRect(g, x, 258 - h, 20, h, 4); g.fill();
    });
    // Donut
    g.lineWidth = 16;
    g.strokeStyle = 'rgba(79,143,184,0.35)';
    g.beginPath(); g.arc(410, 198, 48, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = AMBER;
    g.beginPath(); g.arc(410, 198, 48, -Math.PI / 2, Math.PI * 0.9); g.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// Fine horizontal print-layer lines for the 3D-printed cradle (bump map).
function makeLayerLineTexture() {
  const W = 8, H = 128, c = makeCanvas(W, H), g = c.getContext('2d');
  for (let y = 0; y < H; y++) {
    const s = (Math.sin(y / H * Math.PI * 2 * 42) * 0.5 + 0.5); // ~42 ridges
    const v = 70 + s * 90;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(0, y, W, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

// Fine perforated speaker grille (dot lattice) — bump + map on a small panel.
function makePerforationTexture() {
  const S = 128, c = makeCanvas(S, S), g = c.getContext('2d');
  g.fillStyle = '#0a0c0f'; g.fillRect(0, 0, S, S);
  for (let y = 6; y < S; y += 9) {
    for (let x = 6 + (((y / 9) | 0) % 2) * 4.5; x < S; x += 9) {
      g.fillStyle = '#20262e'; g.beginPath(); g.arc(x, y, 2.4, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#05070a'; g.beginPath(); g.arc(x, y, 1.3, 0, Math.PI * 2); g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

// Horizontal louver / cooling-vent slots (map on the rear panel behind the bay).
function makeVentTexture() {
  const W = 128, H = 128, c = makeCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#22272e'; g.fillRect(0, 0, W, H);
  for (let y = 8; y < H - 6; y += 12) {
    g.fillStyle = '#05070a'; g.fillRect(8, y, W - 16, 6);
    g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(8, y + 6, W - 16, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Build and return the parametric STOWORK rig.
 * @returns {{root:THREE.Group, setDeploy:(t:number)=>void, getDeploy:()=>number,
 *            stages:typeof STAGES, parts:Object, dispose:()=>void, fitRadius:number}}
 */
function createPortableOffice() {
  // Textures that traverse-based disposal will NOT reach (they live on
  // material.map / .envMap / .bumpMap, not on geometry) — disposed explicitly.
  const textures = [];
  const track = (t) => { textures.push(t); return t; };

  // --- procedural studio environment (the biggest quality lever) --------------
  const envMap = track(makeStudioEnvTexture());

  // --- shared materials (SPEC §3 look, upgraded to a reflective premium palette)
  // Anodized aluminium shell: physically-based metal + a touch of clearcoat.
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0x2b2f36, metalness: 0.92, roughness: 0.42,
    clearcoat: 0.35, clearcoatRoughness: 0.35, envMap, envMapIntensity: 0.95,
  });
  const interiorMat = new THREE.MeshStandardMaterial({ color: 0x14171b, metalness: 0.15, roughness: 0.85 }); // soft-black interior
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xe6a15c, metalness: 0.7, roughness: 0.34, envMap, envMapIntensity: 1.0 }); // amber metal trim
  const seamMat = new THREE.MeshStandardMaterial({ color: 0xe6a15c, emissive: 0xe6a15c, emissiveIntensity: 0.4, metalness: 0.4, roughness: 0.4 }); // lit amber seam
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x0c0e11, metalness: 0.5, roughness: 0.5, envMap, envMapIntensity: 0.5 });
  // Trackpad glass: clearcoated, low-roughness, strong reflections = real glass.
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x14181e, metalness: 0.1, roughness: 0.12,
    clearcoat: 1.0, clearcoatRoughness: 0.06, envMap, envMapIntensity: 1.3,
  });
  const keycapMat = new THREE.MeshStandardMaterial({ color: 0x24272d, metalness: 0.25, roughness: 0.62, envMap, envMapIntensity: 0.4 });
  const keyGlowMat = new THREE.MeshStandardMaterial({ color: 0x140f06, emissive: 0xe6a15c, emissiveIntensity: 0.05, roughness: 0.9 }); // amber backlight bleed
  const foamMat = new THREE.MeshStandardMaterial({ color: 0x1b1d20, metalness: 0.0, roughness: 0.95 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, metalness: 0.0, roughness: 0.95 });
  const ledMat = new THREE.MeshStandardMaterial({ color: 0xe6a15c, emissive: 0xe6a15c, emissiveIntensity: 0.0 });
  const deviceLedMat = new THREE.MeshStandardMaterial({ color: 0x2a2205, emissive: 0xe6a15c, emissiveIntensity: 0.2 });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x05070a, emissive: 0x53c2ff, emissiveIntensity: 1.4 });
  // Brushed-aluminium mini computer + its dark trim.
  const deviceMat = new THREE.MeshPhysicalMaterial({
    color: 0xc8ccd0, metalness: 0.9, roughness: 0.3,
    clearcoat: 0.25, clearcoatRoughness: 0.4, envMap, envMapIntensity: 1.15,
  });
  const deviceDarkMat = new THREE.MeshStandardMaterial({ color: 0x191c20, metalness: 0.4, roughness: 0.5, envMap, envMapIntensity: 0.5 });
  // Matte 3D-printed plastic cradle with fine print-layer bump lines.
  const layerTex = track(makeLayerLineTexture());
  layerTex.repeat.set(1, 6);
  const cradleMat = new THREE.MeshStandardMaterial({
    color: 0x6c6f74, metalness: 0.0, roughness: 0.92, bumpMap: layerTex, bumpScale: 0.04,
  });
  // Perforated speaker + rear-vent panel materials.
  const perfTex = track(makePerforationTexture());
  perfTex.repeat.set(3, 2);
  const speakerMat = new THREE.MeshStandardMaterial({ color: 0x0a0c0f, roughness: 0.85, metalness: 0.2, map: perfTex, bumpMap: perfTex, bumpScale: 0.05 });
  const ventTex = track(makeVentTexture());
  const ventMat = new THREE.MeshStandardMaterial({ color: 0x22272e, roughness: 0.8, metalness: 0.3, map: ventTex, bumpMap: ventTex, bumpScale: 0.06 });

  // Per-screen emissive materials (animated together in setDeploy). Each panel
  // owns one so it can carry its own painted UI.
  const screenMats = [];
  function makeScreenMat(tex) {
    const m = new THREE.MeshStandardMaterial({
      color: 0x0b0f14, map: tex, emissive: 0xffffff, emissiveMap: tex,
      emissiveIntensity: SCREEN_GLOW_LOW, metalness: 0.0, roughness: 0.22,
      envMap, envMapIntensity: 0.32,
    });
    screenMats.push(m);
    return m;
  }

  // --- small builder helpers ---------------------------------------------------
  // Box mesh at a local position with shadow flags on.
  function box(w, h, d, material, pos) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  // Rounded/beveled box mesh — premium visible surfaces (soft chamfers).
  function rbox(w, h, d, r, material, pos, bevel) {
    const m = new THREE.Mesh(roundedBoxGeo(w, h, d, r, bevel), material);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  // A flat OLED panel: rounded dark bezel + a plane carrying painted UI (clean
  // 0..1 UVs) + a tiny camera dot. Faces +Z, centred on its group.
  function panel(w, h, contentTex) {
    const g = new THREE.Group();
    const bez = rbox(w + 1.4, h + 1.4, 0.7, 0.7, bezelMat, [0, 0, -0.15], 0.18);
    g.add(bez);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), makeScreenMat(contentTex));
    scr.position.set(0, 0, 0.22);
    g.add(scr);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), lensMat); // camera dot
    dot.position.set(0, h / 2 + 0.4, 0.24);
    g.add(dot);
    return g;
  }

  const root = new THREE.Group();
  root.name = 'STOWORK_root';

  // ===========================================================================
  // caseBase — static open-top tray resting on the table (bottom at y = 0).
  // Footprint 53 (x) × 11 (y) × 35 (z).  (SPEC §3)
  // ===========================================================================
  const caseBase = new THREE.Group();
  caseBase.name = 'caseBase';
  root.add(caseBase);

  const WALL = 1.2;
  caseBase.add(box(53, 1.5, 35, shellMat, [0, 0.75, 0]));              // floor
  caseBase.add(rbox(53, 11, WALL, 0.5, shellMat, [0, 5.5, 17.4], 0.25));   // front wall
  caseBase.add(rbox(53, 11, WALL, 0.5, shellMat, [0, 5.5, -17.4], 0.25));  // rear wall
  caseBase.add(rbox(WALL, 11, 35, 0.4, shellMat, [-26.4, 5.5, 0], 0.25));  // left wall
  caseBase.add(rbox(WALL, 11, 35, 0.4, shellMat, [26.4, 5.5, 0], 0.25));   // right wall
  caseBase.add(box(53, 0.6, 1.0, seamMat, [0, 11.1, 17.4]));          // lit amber front-lip seam

  // Front latches (two spring clasps that meet the lid rim when closed).
  for (const lx of [-16, 16]) {
    const latch = rbox(3.4, 1.8, 1.0, 0.4, accentMat, [lx, 10.6, 18.0], 0.2);
    caseBase.add(latch);
  }

  // Stereo speaker grilles in the base front edge (fine perforation texture).
  for (const sx of [-19, 19]) {
    const grille = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.5), speakerMat);
    grille.position.set(sx, 5.4, 18.05);
    caseBase.add(grille);
  }

  // Rear cooling vents (louvers behind the compute bay).
  const rearVent = new THREE.Mesh(new THREE.PlaneGeometry(18, 6.5), ventMat);
  rearVent.position.set(-16, 5.4, -18.05);
  rearVent.rotation.y = Math.PI;
  caseBase.add(rearVent);

  // Spinner wheels — four corner castors so the closed case reads as a real
  // carry-on. Static; sit at the base's lower corners, protruding slightly.
  const wheelGeo = new THREE.CylinderGeometry(1.6, 1.6, 1.4, 20);
  const wheelHubGeo = new THREE.SphereGeometry(0.6, 12, 12);
  for (const wx of [-24.5, 24.5]) {
    for (const wz of [-15.5, 15.5]) {
      const housing = rbox(3.6, 3.2, 4.4, 0.9, shellMat, [wx, 1.4, wz], 0.3);
      caseBase.add(housing);
      const wheel = new THREE.Mesh(wheelGeo, rubberMat);
      wheel.rotation.z = Math.PI / 2;                 // axle along X
      wheel.position.set(wx + Math.sign(wx) * 1.0, 0.2, wz);
      wheel.castShadow = true;
      caseBase.add(wheel);
      const hub = new THREE.Mesh(wheelHubGeo, accentMat);
      hub.position.copy(wheel.position);
      caseBase.add(hub);
    }
  }

  // Telescoping pull-handle on the rear exterior, retracted (stowed).
  const handle = new THREE.Group();
  handle.position.set(0, 0, -18.2);
  for (const hx of [-14, 14]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 8, 16), shellMat);
    post.position.set(hx, 8, 0);
    post.castShadow = true;
    handle.add(post);
  }
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 30, 16), shellMat);
  grip.rotation.z = Math.PI / 2;
  grip.position.set(0, 11.8, 0);
  grip.castShadow = true;
  handle.add(grip);
  caseBase.add(handle);

  // Lid hinge knuckles along the rear-top edge (barrel look at the pivot).
  const knuckleGeo = new THREE.CylinderGeometry(1.0, 1.0, 4.5, 20);
  for (const kx of [-20, 0, 20]) {
    const kn = new THREE.Mesh(knuckleGeo, shellMat);
    kn.rotation.z = Math.PI / 2;             // barrel axis along X (hinge line)
    kn.position.set(kx, 10.8, -17.4);
    kn.castShadow = true;
    caseBase.add(kn);
  }

  // batteryBlock — heavy pack sitting low over the wheels (visual only).
  // Shifted into the centre-right engine bay so the compute bay owns the left-rear.
  const batteryBlock = rbox(30, 5.5, 12, 1.0, interiorMat, [10, 4.2, -2], 0.4);
  batteryBlock.name = 'batteryBlock';
  batteryBlock.add(box(30.4, 0.5, 12.4, seamMat, [0, 3.0, 0]));       // amber cap strip
  caseBase.add(batteryBlock);

  // ===========================================================================
  // computeBay — recessed 200×200 mm well in the base's LEFT-REAR quadrant
  // (world x∈[-25.6,-6.4], z∈[-16.8,2.4]). Static (not driven by setDeploy) but
  // revealed as the lid opens. Hosts the user's mini computer in a swappable
  // 3D-printed cradle. Children: computeCradle + computeDevice. (SPEC §1/§3)
  // ===========================================================================
  const computeBay = new THREE.Group();
  computeBay.name = 'computeBay';
  computeBay.position.set(-16, 0, -7.2); // centre of the left-rear well
  caseBase.add(computeBay);

  // dark interior liner: floor + left/rear/right walls. Open top + open front —
  // the cradle's ribbed lip closes the front so the machine stays visible.
  computeBay.add(box(19.4, 0.4, 19.4, interiorMat, [0, 1.75, 0]));    // bay floor
  computeBay.add(box(0.5, 9, 19.4, interiorMat, [-9.6, 6, 0]));       // left wall liner
  computeBay.add(box(19.4, 9, 0.5, interiorMat, [0, 6, -9.5]));       // rear wall liner
  computeBay.add(box(0.7, 9, 19.4, interiorMat, [9.6, 6, 0]));        // right partition (divides from battery)
  computeBay.add(box(0.6, 7, 1.4, seamMat, [-9.15, 5.5, 0]));         // amber keyed alignment rib (left wall)
  computeBay.add(box(14, 4, 1.2, bezelMat, [0, 4, -8.6]));            // fixed blind-mate connector block

  // computeCradle — the swappable 3D-printed holder. Matte warm-grey plastic,
  // visibly distinct from the aluminium device and the anodized shell: a raised
  // riser, a tall print-layer-ribbed front lip, and an amber quarter-turn latch.
  const computeCradle = new THREE.Group();
  computeCradle.name = 'computeCradle';
  computeCradle.add(box(19.0, 1.4, 18.8, cradleMat, [0, 2.65, 0]));   // printed riser plate under the device
  computeCradle.add(box(19.0, 5.5, 1.0, cradleMat, [0, 4.7, 9.6]));   // front retaining lip (layer-lined)
  computeCradle.add(box(19.0, 4.0, 0.5, cradleMat, [0, 4.4, -9.1]));  // low rear retainer
  for (const yr of [2.9, 3.8, 4.7, 5.6, 6.5]) {                       // extra crisp print-layer ridges on the lip
    computeCradle.add(box(19.0, 0.22, 0.28, cradleMat, [0, yr, 10.15]));
  }
  // amber quarter-turn latch (rotated post + tab so it reads as a turn-lock)
  const latchPost = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.2, 20), accentMat);
  latchPost.rotation.x = Math.PI / 2;
  latchPost.position.set(0, 6.3, 10.4);
  computeCradle.add(latchPost);
  computeCradle.add(box(3.6, 0.9, 0.5, accentMat, [0, 6.3, 10.5]));   // latch tab
  computeBay.add(computeCradle);

  // computeDevice — a generic mini computer (Mac-mini-class, ~19×19×6 cm) sitting
  // on the cradle riser. Rounded brushed-aluminium body, dark base, dark circular
  // top vent, dark rear port strip with cutouts, small glowing power light.
  const computeDevice = new THREE.Group();
  computeDevice.name = 'computeDevice';
  const devBody = rbox(19.0, 6, 18.4, 1.4, deviceMat, [0, 6.35, 0], 0.3); // aluminium body (top ≈ y9.35)
  computeDevice.add(devBody);
  computeDevice.add(box(18.2, 1.0, 17.6, deviceDarkMat, [0, 3.7, 0]));    // dark base foot
  const topDisc = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 0.5, 40), deviceDarkMat);
  topDisc.position.set(0, 9.55, 0);                                       // dark top vent disc, near-flush
  topDisc.castShadow = true; topDisc.receiveShadow = true;
  computeDevice.add(topDisc);
  computeDevice.add(box(15, 3.2, 0.35, deviceDarkMat, [0, 6.0, -9.15]));  // dark rear port strip
  for (const px of [-5, -2.5, 0, 2.5, 5]) {                              // rear port cutouts
    computeDevice.add(box(1.6, 1.1, 0.5, bezelMat, [px, 6.0, -9.25]));
  }
  const devLed = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), deviceLedMat);
  devLed.position.set(7.2, 4.4, 9.3);                                     // front power light
  computeDevice.add(devLed);
  computeBay.add(computeDevice);

  // powerLED — emissive dot on the front wall (ramps on at the very end).
  const powerLED = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), ledMat);
  powerLED.name = 'powerLED';
  powerLED.position.set(21, 9.4, 18.0);
  caseBase.add(powerLED);

  // --- keyboardTray — slides toward the user; holds the TKL keyboard + trackpad
  const keyboardTray = new THREE.Group();
  keyboardTray.name = 'keyboardTray';
  keyboardTray.position.set(0, 1.6, KB_STOW_Z);
  caseBase.add(keyboardTray);
  keyboardTray.add(rbox(52, 0.8, 15, 1.2, interiorMat, [0, 0, 0], 0.3)); // tray plate

  // keyboard — TKL low-profile key grid (instanced, beveled keycaps).
  const KB_COLS = 15, KB_ROWS = 5, KEY = 1.9, PITCH = 2.4;
  const kbWidth = KB_COLS * PITCH - (PITCH - KEY);
  const kbDepth = KB_ROWS * PITCH - (PITCH - KEY);
  const KB_CX = -8.25; // keyboard block centred left of the tray
  // Soft-chamfered keycap: roundedBoxGeo(KEY,0.9,KEY) already spans KEY×KEY in
  // the XZ footprint and 0.9 in Y — i.e. a low keycap. No reorientation needed.
  const keycapGeo = roundedBoxGeo(KEY, 0.9, KEY, 0.32, 0.12);
  const keyboard = new THREE.InstancedMesh(keycapGeo, keycapMat, KB_COLS * KB_ROWS);
  keyboard.name = 'keyboard';
  keyboard.castShadow = true;
  const m4 = new THREE.Matrix4();
  let ki = 0;
  for (let r = 0; r < KB_ROWS; r++) {
    for (let c = 0; c < KB_COLS; c++) {
      const x = KB_CX - kbWidth / 2 + KEY / 2 + c * PITCH;
      const z = -kbDepth / 2 + KEY / 2 + r * PITCH;
      m4.makeTranslation(x, 0.85, z);
      keyboard.setMatrixAt(ki++, m4);
    }
  }
  keyboard.instanceMatrix.needsUpdate = true;
  keyboardTray.add(keyboard);
  keyboardTray.add(rbox(kbWidth + 1.4, 0.5, kbDepth + 1.4, 0.6, bezelMat, [KB_CX, 0.45, 0], 0.2)); // keyboard deck
  const kbGlow = new THREE.Mesh(new THREE.PlaneGeometry(kbWidth + 0.6, kbDepth + 0.6), keyGlowMat); // amber backlight bleed
  kbGlow.rotation.x = -Math.PI / 2;
  kbGlow.position.set(KB_CX, 0.74, 0);
  keyboardTray.add(kbGlow);

  // trackpad — glass haptic pad right of the keyboard; subtle flip-up to flat.
  const trackpad = new THREE.Group();
  trackpad.name = 'trackpad';
  trackpad.position.set(17.5, 0.5, 0);
  trackpad.add(rbox(15, 0.6, 11, 1.2, glassMat, [0, 0.3, 0], 0.15));   // glass surface (clearcoat sheen)
  trackpad.add(rbox(15.6, 0.4, 11.6, 1.3, bezelMat, [0, 0.05, 0], 0.15)); // bezel
  keyboardTray.add(trackpad);

  // ===========================================================================
  // lid — clamshell top, hinged along the rear-top edge of the base.
  // Pivot at (0, 11, -17.4); rotates about X. Closed (0) covers the base.
  // ===========================================================================
  const lid = new THREE.Group();
  lid.name = 'lid';
  lid.position.set(0, 11, -17.4);
  root.add(lid);

  // shallow downward-open tray shell (covers y 11..~22, full footprint, when closed)
  lid.add(rbox(53, 2, 35, 1.4, shellMat, [0, 10, 17.4], 0.5));         // outer top
  lid.add(rbox(53, 9, WALL, 0.5, shellMat, [0, 5.5, 34.6], 0.25));     // front rim
  lid.add(rbox(53, 9, WALL, 0.5, shellMat, [0, 5.5, 0.2], 0.25));      // rim near hinge
  lid.add(rbox(WALL, 9, 35, 0.4, shellMat, [-26, 5.5, 17.4], 0.25));   // left rim
  lid.add(rbox(WALL, 9, 35, 0.4, shellMat, [26, 5.5, 17.4], 0.25));    // right rim
  lid.add(box(49, 0.4, 31, interiorMat, [0, 9.0, 17.4]));             // soft interior liner

  // headphoneCradle + stowed headphones on the lid inner face (visible when open).
  const headphoneCradle = new THREE.Group();
  headphoneCradle.name = 'headphoneCradle';
  headphoneCradle.position.set(0, 8.2, 17.4);
  headphoneCradle.rotation.x = Math.PI / 2; // ring lies against the inner face
  headphoneCradle.add(new THREE.Mesh(new THREE.TorusGeometry(9, 1.1, 12, 32), interiorMat)); // molded EVA ring
  lid.add(headphoneCradle);

  const headphones = new THREE.Group();
  headphones.name = 'headphones';
  headphones.position.set(0, 8.6, 17.4);
  const bandCurve = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.9, 10, 24, Math.PI), interiorMat);
  bandCurve.rotation.z = Math.PI; // headband arch
  headphones.add(bandCurve);
  for (const sx of [-7.5, 7.5]) { // ear cups
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 2.6, 24), foamMat);
    cup.rotation.x = Math.PI / 2;
    cup.position.set(sx, 0, 0.4);
    cup.castShadow = true;
    headphones.add(cup);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.4, 24), accentMat);
    plate.rotation.x = Math.PI / 2;
    plate.position.set(sx, 0, 1.7);
    headphones.add(plate);
  }
  lid.add(headphones);

  // ===========================================================================
  // liftAssembly — the display + AV, raised by the rear lift linkage.
  // Sits at the rear of the base; rises +12 cm. Origin = the bridge pivot.
  // ===========================================================================
  const liftAssembly = new THREE.Group();
  liftAssembly.name = 'liftAssembly';
  // Shifted to workspace centre x≈+7 (SPEC §3) so the display + rear lift posts
  // clear the left engine bay. setDeploy only touches .position.y, so this x is
  // preserved across the whole deploy — kinematics are unaffected.
  liftAssembly.position.set(7, LIFT_STOW_Y, -13);
  root.add(liftAssembly);

  // liftMast — telescoping posts (4-bar/gas-strut proxy). Two scaling cylinders
  // whose bottoms stay pinned to the base floor as the assembly rises, plus a
  // visible scissor cross-brace + cross-tie so the linkage reads under the display.
  const liftMast = new THREE.Group();
  liftMast.name = 'liftMast';
  liftAssembly.add(liftMast);
  const mastGeo = new THREE.CylinderGeometry(0.9, 0.9, 1, 16); // unit height, scaled in setDeploy
  const mastPosts = [];
  for (const mx of [-11, 11]) { // spacing narrowed so the left post clears the compute bay after the +7 offset
    const post = new THREE.Mesh(mastGeo, shellMat);
    post.position.x = mx;
    post.castShadow = true;
    liftMast.add(post);
    mastPosts.push(post);
  }
  // scissor X-brace + a cross-tie between the posts (static; reads as the linkage)
  for (const dir of [1, -1]) {
    const bar = box(22, 0.8, 0.8, shellMat, [0, -3, 0]);
    bar.rotation.z = dir * DEG(28);
    liftMast.add(bar);
  }
  liftMast.add(box(22, 0.7, 0.7, shellMat, [0, -6, 0])); // low cross-tie

  // monitorBridge — cross-member that tilts flat->upright and carries everything.
  const monitorBridge = new THREE.Group();
  monitorBridge.name = 'monitorBridge';
  liftAssembly.add(monitorBridge);
  monitorBridge.add(rbox(34, 3, 4, 1.0, shellMat, [0, 0.5, 0], 0.4)); // bottom bridge bar

  // wing hinge barrels — vertical knuckles at each wing pivot (±15.5).
  for (const hx of [-15.5, 15.5]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 20, 16), shellMat);
    barrel.position.set(hx, 0.75 + 19.5 / 2, 0);
    barrel.castShadow = true;
    monitorBridge.add(barrel);
  }

  // monitorCenter — fixed centre panel, faces +Z. 31 × 19.5 cm (14" 16:10).
  const centerTex = track(makeScreenTexture('center'));
  const monitorCenter = panel(31, 19.5, centerTex);
  monitorCenter.name = 'monitorCenter';
  monitorCenter.position.set(0, 0.75 + 19.5 / 2, 0);
  monitorBridge.add(monitorCenter);

  // wingLeft — hinges on a VERTICAL (Y) axis at the centre panel's LEFT edge.
  const leftTex = track(makeScreenTexture('left'));
  const wingLeft = new THREE.Group();
  wingLeft.name = 'wingLeft';
  wingLeft.position.set(-15.5, 0, 0); // pivot at the shared edge (SPEC: parent at the panel edge)
  monitorBridge.add(wingLeft);
  const wingLeftPanel = panel(31, 19.5, leftTex);
  wingLeftPanel.position.set(-15.5, 0.75 + 19.5 / 2, 0.4); // extends left of the hinge
  wingLeft.add(wingLeftPanel);

  // wingRight — mirror of wingLeft on the RIGHT edge.
  const rightTex = track(makeScreenTexture('right'));
  const wingRight = new THREE.Group();
  wingRight.name = 'wingRight';
  wingRight.position.set(15.5, 0, 0);
  monitorBridge.add(wingRight);
  const wingRightPanel = panel(31, 19.5, rightTex);
  wingRightPanel.position.set(15.5, 0.75 + 19.5 / 2, 0.4); // extends right of the hinge
  wingRight.add(wingRightPanel);

  // boom — telescoping AV arm rising from the bridge top-centre.
  const boom = new THREE.Group();
  boom.name = 'boom';
  boom.position.set(0, 0.75 + 19.5 + 0.5, 0); // top-centre of the centre panel
  monitorBridge.add(boom);

  // cameraModule — 4K webcam at eye level (boom base = bridge top-centre).
  const cameraModule = new THREE.Group();
  cameraModule.name = 'cameraModule';
  cameraModule.position.set(0, 0.6, 0.8);
  cameraModule.add(rbox(5.5, 2.6, 2, 0.7, bezelMat, [0, 0, 0], 0.3));
  const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.22, 10, 24), lensMat);
  lensRing.position.set(0, 0, 1.05);
  cameraModule.add(lensRing);
  cameraModule.add(new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), lensMat).translateZ(1.06));
  boom.add(cameraModule);

  // telescoping mast — unit-height cylinder scaled/repositioned in setDeploy.
  const boomMast = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1, 12), shellMat);
  boomMast.name = 'boomMast';
  boomMast.castShadow = true;
  boom.add(boomMast);

  // micArm — sits at the boom tip; pivots the capsule down toward the user.
  const micArm = new THREE.Group();
  micArm.name = 'micArm';
  boom.add(micArm);
  micArm.add(box(0.6, 0.6, 4, shellMat, [0, 0, 2])); // short arm reaching forward (+Z)
  const micCapsule = new THREE.Group();
  micCapsule.name = 'micCapsule';
  micCapsule.position.set(0, 0, 4.2);
  micCapsule.add(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 3, 20), bezelMat)); // body
  const micFoam = new THREE.Mesh(new THREE.SphereGeometry(1.5, 18, 18), foamMat);         // foam windscreen
  micFoam.position.y = 1.8;
  micCapsule.add(micFoam);
  micArm.add(micCapsule);

  // ---------------------------------------------------------------------------
  const parts = {
    caseBase, batteryBlock, powerLED, keyboardTray, keyboard, trackpad,
    computeBay, computeDevice, computeCradle,
    lid, headphoneCradle, headphones,
    liftAssembly, liftMast, monitorBridge, monitorCenter,
    wingLeft, wingRight, boom, cameraModule, boomMast, micArm, micCapsule,
  };

  // ===========================================================================
  // setDeploy — maps a single t ∈ [0,1] onto every part transform.
  // Each part is eased with smoothstep over its own window and clamped outside.
  // Idempotent: every call recomputes absolute transforms from t alone.
  // ===========================================================================
  let currentT = -1;
  function setDeploy(t) {
    t = clamp(t, 0, 1);
    currentT = t;

    // 1) LID — rear clamshell swings open  [0.00, 0.15]
    lid.rotation.x = lerp(0, LID_OPEN, smoothstep(0.00, 0.15, t));

    // 2) LIFT — assembly rises + bridge tilts flat->upright  [0.15, 0.45]
    const pLift = smoothstep(0.15, 0.45, t);
    liftAssembly.position.y = LIFT_STOW_Y + LIFT_RISE * pLift;
    monitorBridge.rotation.x = lerp(BRIDGE_FLAT, 0, pLift);
    const mastLen = MAST_BASE + LIFT_RISE * pLift;
    for (const post of mastPosts) { post.scale.y = mastLen; post.position.y = -mastLen / 2; }

    // 3) WINGS — fan from folded-over-centre to ~35° array  [0.45, 0.70]
    const pWing = smoothstep(0.45, 0.70, t);
    wingLeft.rotation.y = lerp(WING_FOLD, WING_OPEN, pWing);
    wingRight.rotation.y = lerp(-WING_FOLD, -WING_OPEN, pWing);

    // 4) BOOM — telescopes up + mic head tips toward the user  [0.70, 0.85]
    const pBoom = smoothstep(0.70, 0.85, t);
    const boomLen = lerp(BOOM_MIN, BOOM_MAX, pBoom);
    boomMast.scale.y = boomLen;
    boomMast.position.y = boomLen / 2;
    micArm.position.y = boomLen;
    micArm.rotation.x = lerp(0, MIC_TILT, pBoom);

    // 5) KEYBOARD / POWER — tray slides out, trackpad flattens, power on  [0.85, 1.00]
    keyboardTray.position.z = KB_STOW_Z + KB_SLIDE * smoothstep(0.85, 1.00, t);
    trackpad.rotation.x = lerp(TRACK_TILT, 0, smoothstep(0.88, 1.00, t));
    const pPow = smoothstep(0.95, 1.00, t);
    ledMat.emissiveIntensity = pPow * LED_MAX;
    const glow = lerp(SCREEN_GLOW_LOW, SCREEN_GLOW_HIGH, pPow);
    for (const m of screenMats) m.emissiveIntensity = glow; // all three panels power on together
    keyGlowMat.emissiveIntensity = lerp(0.05, 0.6, pPow);    // keyboard backlight
    deviceLedMat.emissiveIntensity = lerp(0.2, 1.6, pPow);   // compute power light
  }

  // Initialise to the fully stowed carry-on.
  setDeploy(0);

  // Free ALL geometries + materials + textures (dedup so shared assets dispose
  // once). Traverse reaches geometry/material; textures live on material maps
  // and are tracked separately, so both are released here.
  function dispose() {
    const geos = new Set();
    const mats = new Set();
    root.traverse((o) => {
      if (o.geometry) geos.add(o.geometry);
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m));
    });
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  }

  return {
    root,
    setDeploy,
    getDeploy: () => currentT,
    stages: STAGES,
    parts,
    dispose,
    fitRadius: 60, // approx bounding radius (cm) at t=1 — app frames the camera to this
  };
}
