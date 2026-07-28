// grillModel.js — omegaClass "Zoned Asado + Smoke Station" parametric 3D model (SPEC v6).
//
// ONE wide sealed stainless outdoor-kitchen CABINET, 240(W)×68(D)×205(H) cm on leveling
// feet, that opens into a full OUTDOOR FIRE STATION laid out left-to-right in THREE zones,
// sheltered by TWO independent lift-up roof lids:
//
//   • PREP zone   (LEFT,   x≈−90): wood counter, stainless sink + gooseneck faucet, cutting
//                                   board, lower cabinets/drawers, tool hooks.
//   • PARRILLA    (CENTER, x≈−15): a dedicated BRASERO ember-maker (x≈−45) beside a wide
//                                   V-channel PARRILLA grate (x≈+5) on a crank lift over an
//                                   ember bed; grease channel + cup; a landing ledge.
//   • VERTICAL SMOKER (RIGHT, x≈+80): an insulated cookbox with DUAL front doors (hinged at
//                                   their OUTER edges, swinging to the sides), 3 stacked racks,
//                                   a FIREBOX BELOW the chamber (smoke rises up through the
//                                   food), a low intake damper, and a flue on top.
//
// Control axes (SPEC §2), all independent / clamped / smoothstep:
//   roof  r → 0 both lids down (sealed) → 1 both lids lifted UP & FORWARD on gas struts into
//             HIGH overhead roofs (front edge ~230 cm), underside task lights on.
//   doors d → 0 cookbox dual doors closed → 1 doors swung OUT to the sides, 3 racks revealed.
//   fire  f → 0 all cold → 1 brasero + parrilla embers glow, flames over the grate, the
//             cookbox firebox-below glows, and smoke rises from the cookbox flue ∝ f×(1−d).
//   grate g → parrilla V-grate height on its crank lift (default 0.4).
//
// Coordinate frame (SPEC §3): +X right, +Y up, +Z toward the cook (front). 1 unit = 1 cm.
// Origin at the cabinet footprint centre; ground y = 0.
//
// Classic script: THREE is a GLOBAL from vendor/three.min.js (r128), loaded first. NO
// import / export / IIFE — createOmegaGrill stays a GLOBAL so app.js (an IIFE) can call it.
// Runs from file:// with no server and no build step.
//
// Flawless-bar visual pass: a procedural equirectangular STUDIO env (DataTexture,
// EquirectangularReflectionMapping — cool sky lobe + warm ember lobe + two softboxes) drives
// real stainless reflections; MeshPhysicalMaterial clearcoat marine steel; warm procedural
// WOOD counter; dark glowing GLASS windows; emissive ember-beds with instanced coals; charring
// logs; additive flame licks over the parrilla; a soft translucent smoke plume from the cookbox
// flue; corrugated roof undersides. All procedural — no external assets, textures <=1024, all
// tracked for dispose.

const DEG = THREE.MathUtils.degToRad;
const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;

// Smoothstep over an arbitrary window; clamps outside [e0,e1] so a part holds its start
// state before its window and its end state after it (SPEC §2 easing rule).
function smoothstep(e0, e1, x) {
  const u = clamp((x - e0) / (e1 - e0), 0, 1);
  return u * u * (3 - 2 * u);
}

// ---- Physical constants (cm) — SPEC §1 envelope ----------------------------------
// The cabinet: 240 (W) × 68 (D) × 205 (H) on leveling feet.
const CAB_W = 240, HALF_W = 120, CAB_D = 68, HALF_D = 34;
const FEET_H = 7, BODY_Y0 = FEET_H, TOP_Y = 205;   // carcass 7 → 205
const WALL_T = 4;                                   // shell wall thickness
const COUNTER_Y = 92;                               // working counter height

// Zone dividers + zone X-centres (SPEC §3).
const DIV1_X = -62;   // prep | parrilla divider
const DIV2_X = 35;    // parrilla | cookbox divider
const PREP_X0 = -HALF_W, PREP_X1 = DIV1_X;          // prep zone  -120 → -62 (centre ~-91)

// PREP zone (LEFT).
const PREP_CX = (PREP_X0 + PREP_X1) / 2;            // ~-91
const SINK_CX = -101, SINK_CZ = 2;

// PARRILLA zone (CENTRE): a dedicated brasero + a wide crank-lift grate.
const BRASERO_CX = -46, BRASERO_W = 36, BRASERO_D = 46, BRASERO_CZ = -2;
const BRASERO_Y0 = 84, BRASERO_Y1 = 128;
const GRATE_CX = 4, PIT_W = 62, PIT_D = 52, PIT_CZ = -2;
const PIT_Y0 = 82, EMBER_Y = 96;
const GRATE_LOW = 104, GRATE_HIGH = 120;
const LANDING_CX = -30;                              // landing ledge X (between brasero + grate zone edge)

// VERTICAL SMOKER cookbox (RIGHT). Chamber ABOVE, firebox BELOW.
const COOK_CX = 80, COOK_W = 80, COOK_D = 58, COOK_CZ = -3;
const FB_Y0 = 14, FB_Y1 = 58;                        // firebox BELOW the chamber
const CHAM_Y0 = 62, CHAM_Y1 = 190;                   // insulated rack chamber
const COOK_FRONT = COOK_CZ + COOK_D / 2;             // chamber front z (~+26)
// flue on top of the cookbox (rises out the back-right of the top)
const FLUE_X = 80, FLUE_Z = -18, FLUE_R = 7.5;
const FLUE_Y0 = 190, FLUE_Y1 = 230;

// TWO lift-up roof lids. Each hinged at its TOP-BACK edge; swings up & forward.
const LID_HINGE_Y = TOP_Y, LID_HINGE_Z = -HALF_D;    // pivot y=205, z=-34
const LID_T = 6, LID_LEN = 189;                      // FULL-HEIGHT slab; panel covers front y 16 → 205
const LID_PANEL_CY = -LID_LEN / 2;                   // panel centre local Y (rel. hinge)
// Outer face sits slightly PROUD of the body (z≈+39) so the closed lid cleanly OVERLAYS the
// lower cabinet facade + its handles (an overlay-slab lid), never z-fighting the fronts behind.
const LID_PROUD = 5;
const LID_PANEL_CZ = (HALF_D + LID_PROUD - LID_T / 2) - LID_HINGE_Z; // outer face world z≈+39
const LID_OPEN = DEG(-74);                            // open swing → gentle near-horizontal awning
const LID_L_CX = -42, LID_L_W = 150;                 // lidL over prep + parrilla
const LID_R_CX = 78, LID_R_W = 82;                   // lidR over cookbox

// LOWER FRONT FACADE — a continuous always-present sealed run of cabinet doors + drawer
// fronts (+ one framed wood-store) across the WHOLE lower front, so closed reads as one
// clean monolith. Sits just inside the front face; toe-kick recessed below it.
const FACE_Z = HALF_D - 1.5;          // facade front plane (~+32.5)
const FACE_Y0 = 15, FACE_Y1 = 90;     // band: toe-kick top → counter apron
const TOE_Y0 = 1.5, TOE_Y1 = 15, TOE_Z = HALF_D - 8; // recessed toe-kick

// ===========================================================================
// Procedural geometry + texture helpers (pure; THREE global; browser canvas).
// ===========================================================================

// Rounded-rectangle path centred on the origin in the XY plane.
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

// Beveled rounded box centred on the origin, extruded along +Z (depth d). Every edge gets a
// subtle bevel so nothing reads as a raw cube (SPEC §3).
function roundedBoxGeo(w, h, d, r, bevel) {
  bevel = bevel === undefined ? Math.min(0.6, d * 0.2, w * 0.2, h * 0.2) : bevel;
  bevel = Math.max(0.05, Math.min(bevel, w / 2 - 0.05, h / 2 - 0.05, d / 2 - 0.02));
  const rr = Math.max(0.05, Math.min(r, w / 2, h / 2) - bevel);
  const shape = roundedRectShape(w - 2 * bevel, h - 2 * bevel, rr);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.02, d - 2 * bevel),
    bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 2, curveSegments: 6, steps: 1,
  });
  geo.translate(0, 0, -(d / 2 - bevel)); // recentre so the box straddles z=0
  geo.computeVertexNormals();
  return geo;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Procedural equirectangular STUDIO env as a DataTexture. A mostly-DARK charcoal studio:
// a deep charcoal body, a cool mid-gray sky up top fading to near-black low, a FEW
// concentrated near-white softbox BARS/streaks (high contrast), and a subtle warm ember
// lobe low-front. The dark body + crisp bright bars is what makes stainless read as real
// polished metal — a dark reflective surface with hot specular edges, not flat gray.
function makeStudioEnvTexture() {
  const W = 512, H = 256;
  const data = new Uint8Array(W * H * 4);
  // Concentrated near-white softbox BARS (narrow + strongly over-driven): a dark body with a
  // few hot streaks gives steel its crisp bright-edge-on-dark specular signature.
  const boxes = [
    { u: 0.22, v: 0.32, su: 0.055, sv: 0.30, i: 3.0 }, // tall key softbox bar (upper-left)
    { u: 0.42, v: 0.34, su: 0.024, sv: 0.24, i: 2.1 }, // thin accent streak
    { u: 0.66, v: 0.30, su: 0.050, sv: 0.28, i: 2.6 }, // tall rim softbox bar (right)
    { u: 0.86, v: 0.36, su: 0.022, sv: 0.18, i: 1.8 }, // thin far-right accent
    { u: 0.50, v: 0.055, su: 0.42, sv: 0.032, i: 2.0 }, // hot horizontal sky bar across the top
  ];
  const ember = { u: 0.50, v: 0.86, su: 0.26, sv: 0.14, i: 0.80 };
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      // mostly-dark body: cool mid-gray sky up top → deep charcoal → near-black floor. Kept
      // low so the bright bars stand out in stark contrast (the key to a metal read).
      let lum = lerp(0.17, 0.012, smoothstep(0.0, 1.0, v));
      lum += 0.04 * Math.exp(-Math.pow((v - 0.50) / 0.16, 2)); // faint horizon lift
      for (const b of boxes) {
        let du = Math.abs(u - b.u); du = Math.min(du, 1 - du);
        lum += b.i * Math.exp(-(Math.pow(du / b.su, 2) + Math.pow((v - b.v) / b.sv, 2)));
      }
      let du = Math.abs(u - ember.u); du = Math.min(du, 1 - du);
      const emb = ember.i * Math.exp(-(Math.pow(du / ember.su, 2) + Math.pow((v - ember.v) / ember.sv, 2)));
      const sky = smoothstep(0.55, 0.0, v);
      const r = lum * lerp(0.96, 1.0, 1 - sky) + emb * 1.00;
      const g = lum * lerp(0.99, 0.97, 1 - sky) + emb * 0.42;
      const bl = lum * lerp(1.18, 1.0, 1 - sky) + emb * 0.12;
      const idx = (y * W + x) * 4;
      data[idx] = Math.min(255, r * 255) | 0;
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

// Warm procedural WOOD grain for the counter, cutting board + handle accents.
function makeWoodTexture() {
  const W = 512, H = 512, c = makeCanvas(W, H), g = c.getContext('2d');
  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#5f3617');
  base.addColorStop(0.5, '#764624');
  base.addColorStop(1, '#552f13');
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 140; i++) {
    const y = Math.random() * H;
    const shade = 40 + Math.random() * 60;
    g.strokeStyle = `rgba(${shade + 20},${shade},${shade - 20},${0.06 + Math.random() * 0.12})`;
    g.lineWidth = 0.6 + Math.random() * 2.2;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= W; x += 32) {
      g.lineTo(x, y + Math.sin(x * 0.02 + i) * (1.5 + Math.random() * 2));
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

// Radial hot-to-dark gradient for the emissive ember-beds + coals.
function makeEmberGradientTexture() {
  const S = 256, c = makeCanvas(S, S), g = c.getContext('2d');
  g.fillStyle = '#050100'; g.fillRect(0, 0, S, S);
  const pools = [[0.5, 0.5, 0.5], [0.32, 0.4, 0.28], [0.68, 0.6, 0.30], [0.6, 0.32, 0.22], [0.4, 0.66, 0.24]];
  g.globalCompositeOperation = 'lighter';
  for (const [px, py, pr] of pools) {
    const rg = g.createRadialGradient(px * S, py * S, 2, px * S, py * S, pr * S);
    rg.addColorStop(0.0, '#fff1c8');
    rg.addColorStop(0.25, '#ff8a2c');
    rg.addColorStop(0.55, '#e03a10');
    rg.addColorStop(1.0, 'rgba(40,4,0,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, S, S);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// Soft radial flame sprite (warm core → transparent) for the additive flame licks.
function makeFlameTexture() {
  const S = 128, c = makeCanvas(S, S), g = c.getContext('2d');
  const rg = g.createRadialGradient(S / 2, S * 0.62, 2, S / 2, S * 0.55, S * 0.5);
  rg.addColorStop(0.0, 'rgba(255,240,190,0.95)');
  rg.addColorStop(0.3, 'rgba(255,150,40,0.75)');
  rg.addColorStop(0.7, 'rgba(220,40,10,0.25)');
  rg.addColorStop(1.0, 'rgba(120,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// Soft round SMOKE puff (grey → transparent) for the flue plume billboards.
function makeSmokeTexture() {
  const S = 128, c = makeCanvas(S, S), g = c.getContext('2d');
  const rg = g.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S * 0.5);
  rg.addColorStop(0.0, 'rgba(226,229,232,0.85)');
  rg.addColorStop(0.5, 'rgba(196,201,206,0.45)');
  rg.addColorStop(1.0, 'rgba(170,175,180,0)');
  g.fillStyle = rg; g.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// Ω monogram badge painted to a canvas, used as an emissive molten-accent decal.
function makeBadgeTexture() {
  const S = 256, c = makeCanvas(S, S), g = c.getContext('2d');
  g.clearRect(0, 0, S, S);
  const grad = g.createLinearGradient(0, 40, 0, S - 40);
  grad.addColorStop(0, '#ffd089');
  grad.addColorStop(0.5, '#ff7a1e');
  grad.addColorStop(1, '#ff3b10');
  g.fillStyle = grad;
  g.font = 'bold 180px Georgia, "Times New Roman", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = '#ff5e1e';
  g.shadowBlur = 26;
  g.fillText('Ω', S / 2, S / 2 + 8);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// ===========================================================================
// createOmegaGrill — GLOBAL builder (SPEC §4 hard contract).
// ===========================================================================
function createOmegaGrill() {
  const textures = []; // every texture tracked here so dispose() frees them all
  const track = (t) => { textures.push(t); return t; };

  const envTex = track(makeStudioEnvTexture());

  // ---- Materials (reused; PBR clearcoat marine steel + wood + glass) -----------
  const polishedSteel = new THREE.MeshPhysicalMaterial({
    color: 0x9aa0a7, metalness: 1.0, roughness: 0.23,
    clearcoat: 0.5, clearcoatRoughness: 0.2,
    envMap: envTex, envMapIntensity: 1.4,
  });
  const brushedSteel = new THREE.MeshPhysicalMaterial({
    color: 0x8b9198, metalness: 1.0, roughness: 0.3,
    clearcoat: 0.5, clearcoatRoughness: 0.2,
    envMap: envTex, envMapIntensity: 1.4,
  });
  const darkSteel = new THREE.MeshPhysicalMaterial({
    color: 0x5c6268, metalness: 1.0, roughness: 0.28,
    clearcoat: 0.5, clearcoatRoughness: 0.2,
    envMap: envTex, envMapIntensity: 1.4,
  });
  // warm butcher-block WOOD (counter, cutting board, handle accents)
  const woodTex = track(makeWoodTexture());
  const wood = new THREE.MeshPhysicalMaterial({
    color: 0xf0e2d0, map: woodTex, metalness: 0.0, roughness: 0.7,
    clearcoat: 0.18, clearcoatRoughness: 0.5, envMap: envTex, envMapIntensity: 0.25,
  });
  // matte-black insulated interiors + firebox liners
  const matteBlack = new THREE.MeshPhysicalMaterial({
    color: 0x1b1c1f, metalness: 0.55, roughness: 0.62,
    clearcoat: 0.35, clearcoatRoughness: 0.5, envMap: envTex, envMapIntensity: 0.5,
  });
  const interiorDark = new THREE.MeshStandardMaterial({
    color: 0x101012, metalness: 0.4, roughness: 0.85,
    envMap: envTex, envMapIntensity: 0.3, side: THREE.DoubleSide,
  });
  const castGrate = new THREE.MeshPhysicalMaterial({
    color: 0x3a3d41, metalness: 0.95, roughness: 0.5,
    clearcoat: 0.3, clearcoatRoughness: 0.5, envMap: envTex, envMapIntensity: 0.7,
  });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x17181a, metalness: 0.1, roughness: 0.9 });

  // cookbox-door + faucet GLASS — dark glass that glows warm when the fire is lit inside.
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x0b0e10, metalness: 0.0, roughness: 0.08,
    clearcoat: 1.0, clearcoatRoughness: 0.05,
    emissive: 0xff6a1e, emissiveIntensity: 0.0,
    transparent: true, opacity: 0.62, envMap: envTex, envMapIntensity: 1.2,
  });

  // molten emissive accents (Ω badge, dials/dampers)
  const badgeTex = track(makeBadgeTexture());
  const moltenBadge = new THREE.MeshStandardMaterial({
    color: 0x120906, emissive: 0xff6a1e, emissiveMap: badgeTex, emissiveIntensity: 1.4,
    metalness: 0.3, roughness: 0.5, transparent: true, map: badgeTex,
  });
  const moltenDial = new THREE.MeshStandardMaterial({
    color: 0x201008, emissive: 0xff5e1e, emissiveIntensity: 0.6,
    metalness: 0.6, roughness: 0.4, envMap: envTex, envMapIntensity: 0.6,
  });
  // roof-lid underside task lights (glow as the roofs complete, SPEC §2 r∈[0.6,1])
  const lidLightMat = new THREE.MeshStandardMaterial({
    color: 0x24282e, emissive: 0xfff0d4, emissiveIntensity: 0.0,
    metalness: 0.2, roughness: 0.5,
  });
  // cookbox interior task light (glows as the roof completes)
  const cookLightMat = new THREE.MeshStandardMaterial({
    color: 0x20242a, emissive: 0xfff2d8, emissiveIntensity: 0.0,
    metalness: 0.2, roughness: 0.5,
  });
  // ember-beds + coals + firebox embers (emissive ramps with f)
  const emberMap = track(makeEmberGradientTexture());
  const braseroEmberMat = new THREE.MeshStandardMaterial({
    color: 0x1a0602, emissive: 0xff5a1e, emissiveMap: emberMap, emissiveIntensity: 0.0,
    metalness: 0.2, roughness: 0.95,
  });
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0x1a0602, emissive: 0xff5a1e, emissiveMap: emberMap, emissiveIntensity: 0.0,
    metalness: 0.2, roughness: 0.95,
  });
  const coalMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xff4e14, emissiveIntensity: 0.0,
    metalness: 0.1, roughness: 0.9,
  });
  const fireboxEmberMat = new THREE.MeshStandardMaterial({
    color: 0x1a0602, emissive: 0xff6420, emissiveMap: emberMap, emissiveIntensity: 0.0,
    metalness: 0.2, roughness: 0.95,
  });
  const logMat = new THREE.MeshStandardMaterial({ color: 0x6b4426, metalness: 0.0, roughness: 0.9 });
  // hanging asado items — a coil of sausage / a cured cut over the coals
  const sausageMat = new THREE.MeshStandardMaterial({ color: 0x7d2f22, metalness: 0.0, roughness: 0.7 });
  const charMat = new THREE.MeshStandardMaterial({
    color: 0x14100e, emissive: 0xff5010, emissiveIntensity: 0.0, metalness: 0.0, roughness: 1.0,
  });
  const flameTex = track(makeFlameTexture());
  const flameMat = new THREE.MeshBasicMaterial({
    map: flameTex, color: 0xffffff, transparent: true, opacity: 0.0,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const smokeTex = track(makeSmokeTexture());
  const smokeMat = new THREE.MeshBasicMaterial({
    map: smokeTex, color: 0xcfd3d7, transparent: true, opacity: 0.0,
    depthWrite: false, side: THREE.DoubleSide,
  });

  // convenience builders (rounded box mesh + cylinder mesh, both with shadows).
  function rbox(w, h, d, r, material, pos, bevel) {
    const m = new THREE.Mesh(roundedBoxGeo(w, h, d, r, bevel), material);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function cyl(rt, rb, h, seg, material, pos) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  // Consistent tubular BAR HANDLE — a polished-steel bar on two standoffs, `horiz` axis.
  // Returns a group centred at (cx,cy,cz), standing `stand` cm proud of the face.
  function barHandle(cx, cy, cz, len, horiz, stand) {
    stand = stand || 3.2;
    const g = new THREE.Group();
    const bar = cyl(0.85, 0.85, len, 12, polishedSteel, [0, 0, 0]);
    bar.rotation.z = horiz ? Math.PI / 2 : 0;
    bar.position.z = stand;
    g.add(bar);
    const off = len / 2 - 1.5;
    for (const s of [-1, 1]) {
      const foot = cyl(0.7, 0.7, stand, 8, polishedSteel, horiz ? [s * off, 0, stand / 2] : [0, s * off, stand / 2]);
      foot.rotation.x = Math.PI / 2;
      g.add(foot);
    }
    g.position.set(cx, cy, cz);
    return g;
  }

  // ---- Scene-graph roots (SPEC §3 hierarchy — exact names) ---------------------
  const root = new THREE.Group(); root.name = 'omegaGrill';
  const cabinet = new THREE.Group(); cabinet.name = 'cabinet'; // static carcass + three zones
  const roof = new THREE.Group(); roof.name = 'roof';          // the two lift-up roof lids
  root.add(cabinet, roof);

  // ==========================================================================
  // CABINET CARCASS — the sealed wide stainless shell: back wall, side walls, floor,
  // sealed top, two zone dividers, and 4 leveling feet.
  // ==========================================================================
  const bCY = (BODY_Y0 + TOP_Y) / 2;
  const carcass = new THREE.Group(); carcass.name = 'carcass';
  // back wall (all three zones sit against it)
  carcass.add(rbox(CAB_W, TOP_Y - BODY_Y0, WALL_T, 3, polishedSteel, [0, bCY, -HALF_D + WALL_T / 2]));
  // left + right side walls
  carcass.add(rbox(WALL_T, TOP_Y - BODY_Y0, CAB_D, 3, polishedSteel, [-HALF_W + WALL_T / 2, bCY, 0]));
  carcass.add(rbox(WALL_T, TOP_Y - BODY_Y0, CAB_D, 3, polishedSteel, [HALF_W - WALL_T / 2, bCY, 0]));
  // floor + sealed top (the monolith cap)
  carcass.add(rbox(CAB_W, WALL_T, CAB_D, 3, brushedSteel, [0, BODY_Y0 + WALL_T / 2, 0]));
  carcass.add(rbox(CAB_W, WALL_T, CAB_D, 3, brushedSteel, [0, TOP_Y - WALL_T / 2, 0]));
  // two zone dividers (prep|parrilla and parrilla|cookbox)
  carcass.add(rbox(WALL_T, TOP_Y - BODY_Y0, CAB_D - 2, 2, brushedSteel, [DIV1_X, bCY, 0]));
  carcass.add(rbox(WALL_T, TOP_Y - BODY_Y0, CAB_D - 2, 2, brushedSteel, [DIV2_X, bCY, 0]));
  cabinet.add(carcass);

  // BACK WALL splash panel (brushed, faces the prep + parrilla zones)
  const backWall = new THREE.Group(); backWall.name = 'backWall';
  backWall.add(rbox(DIV2_X - PREP_X0 - 6, TOP_Y - COUNTER_Y - 8, 1.5, 0.5, brushedSteel,
    [(PREP_X0 + DIV2_X) / 2, (COUNTER_Y + TOP_Y) / 2 + 4, -HALF_D + WALL_T + 1]));
  cabinet.add(backWall);

  // LEVELING FEET (4)
  const feet = new THREE.Group(); feet.name = 'feet';
  const fx = HALF_W - 9, fz = HALF_D - 9;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    feet.add(cyl(3.2, 3.8, FEET_H, 12, darkSteel, [sx * fx, FEET_H / 2, sz * fz]));
    feet.add(rbox(9, 1.4, 9, 1, rubber, [sx * fx, 0.7, sz * fz]));
  }
  cabinet.add(feet);

  // Ω BADGE — emissive molten decal on the cabinet front, prep zone (always visible).
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), moltenBadge);
  badge.name = 'badge';
  badge.position.set(PREP_CX, 168, HALF_D + 2.6);
  cabinet.add(badge);

  // ==========================================================================
  // ZONE A — PREP (LEFT): wood counter, sink + faucet, cutting board, storage, tool rail.
  // ==========================================================================
  // COUNTER — warm butcher-block prep surface at ~92 cm across the prep zone.
  const counter = new THREE.Group(); counter.name = 'counter';
  const prepCtrX = (PREP_X0 + PREP_X1) / 2;
  const prepCtrW = PREP_X1 - PREP_X0 - 4;
  counter.add(rbox(prepCtrW, 3.6, CAB_D - 8, 1.5, wood, [prepCtrX, COUNTER_Y - 1.8, -3]));
  counter.add(rbox(prepCtrW, 1.6, CAB_D - 8, 0.8, brushedSteel, [prepCtrX, COUNTER_Y - 4.4, -3]));
  cabinet.add(counter);

  // SINK — recessed stainless bowl + gooseneck faucet.
  const sink = new THREE.Group(); sink.name = 'sink';
  sink.add(rbox(30, 12, 30, 2, brushedSteel, [SINK_CX, COUNTER_Y - 5, SINK_CZ]));   // rim
  sink.add(rbox(24, 11, 24, 3, interiorDark, [SINK_CX, COUNTER_Y - 5.5, SINK_CZ])); // bowl cavity
  const faucet = new THREE.Group(); faucet.name = 'faucet';
  faucet.position.set(SINK_CX - 9, COUNTER_Y, SINK_CZ - 12);
  faucet.add(cyl(1.6, 1.9, 22, 14, polishedSteel, [0, 11, 0]));                     // riser
  const gooseneck = new THREE.Mesh(new THREE.TorusGeometry(7, 1.4, 12, 20, Math.PI), polishedSteel);
  gooseneck.position.set(0, 22, 7); gooseneck.rotation.y = Math.PI / 2;
  faucet.add(gooseneck);
  faucet.add(cyl(1.1, 1.1, 4, 12, polishedSteel, [0, 19, 14]));                     // spout tip
  faucet.add(rbox(6, 1.6, 2, 0.6, moltenDial, [6, 11, 0]));                          // lever
  sink.add(faucet);
  cabinet.add(sink);

  // CUTTING BOARD + open LANDING — a big thick butcher board right of the sink with clear
  // landing counter beside it: real prep + plating space.
  const cuttingBoard = new THREE.Group(); cuttingBoard.name = 'cuttingBoard';
  cuttingBoard.add(rbox(36, 4, 42, 2.5, wood, [-72, COUNTER_Y + 2, 1]));       // butcher board
  cuttingBoard.add(rbox(36, 1.2, 42, 1.5, darkSteel, [-72, COUNTER_Y - 0.2, 1])); // steel tray under
  cabinet.add(cuttingBoard);

  // ==========================================================================
  // LOWER FRONT FACADE — one continuous sealed run of cabinet doors + drawer fronts across
  // the WHOLE lower front (all three zones), always present, so closed reads as a finished
  // monolith. A recessed toe-kick + refined feet float the base; a dark reveal backer makes
  // every seam read crisp; one framed wood-store (packed split logs) sits under the parrilla.
  // ==========================================================================

  // recessed dark TOE-KICK spanning the full width (floats the cabinet on its feet)
  const toeKick = new THREE.Group(); toeKick.name = 'toeKick';
  toeKick.add(rbox(CAB_W - 8, TOE_Y1 - TOE_Y0, 1.5, 0.4, matteBlack, [0, (TOE_Y0 + TOE_Y1) / 2, TOE_Z]));
  cabinet.add(toeKick);

  // continuous dark REVEAL BACKER behind every door/drawer slab — seams read as crisp lines,
  // never see-through to the interior.
  const faceCY = (FACE_Y0 + FACE_Y1) / 2;
  cabinet.add(rbox(CAB_W - 6, FACE_Y1 - FACE_Y0, 1.5, 0.4, matteBlack, [0, faceCY, FACE_Z - 2.2]));

  // a raised door/drawer slab with an inset panel line + optional bar handle.
  function faceSlab(group, x0, x1, y0, y1) {
    const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    group.add(rbox(w, h, 3, 1.6, brushedSteel, [cx, cy, FACE_Z]));
    group.add(rbox(w - Math.min(10, w * 0.28), h - Math.min(10, h * 0.28), 1.2, 1.2, polishedSteel, [cx, cy, FACE_Z + 1.5]));
    return { cx, cy, w, h };
  }

  const lowerDoors = new THREE.Group(); lowerDoors.name = 'lowerDoors';
  const lowerCabinets = new THREE.Group(); lowerCabinets.name = 'lowerCabinets';
  const drawers = new THREE.Group(); drawers.name = 'drawers';

  // -- PREP zone: a tall cabinet door (left) + a 3-drawer stack (right) --
  const pDoor = faceSlab(lowerCabinets, -116, -91, FACE_Y0 + 1, FACE_Y1 - 1);
  lowerCabinets.add(barHandle(-93.5, pDoor.cy, FACE_Z + 1.5, FACE_Y1 - FACE_Y0 - 26, false)); // vertical
  const dStack = [-116, -91]; // reuse geometry width for drawers on the right column
  const drX0 = -89, drX1 = -64, dN = 3, dGap = 2;
  const dH = (FACE_Y1 - FACE_Y0 - (dN + 1) * dGap) / dN;
  for (let i = 0; i < dN; i++) {
    const y0 = FACE_Y0 + dGap + i * (dH + dGap);
    const d = faceSlab(drawers, drX0, drX1, y0, y0 + dH);
    drawers.add(barHandle(d.cx, d.cy, FACE_Z + 1.5, (drX1 - drX0) - 12, true)); // horizontal
  }
  lowerDoors.add(lowerCabinets, drawers);

  // -- WOOD STORE — framed niche under the parrilla, packed with split dried logs --
  const woodStore = new THREE.Group(); woodStore.name = 'woodStore';
  const wsX0 = -60, wsX1 = -16, wsY0 = FACE_Y0 + 1, wsY1 = FACE_Y1 - 1;
  const wsCX = (wsX0 + wsX1) / 2, wsCY = (wsY0 + wsY1) / 2, wsW = wsX1 - wsX0, wsH = wsY1 - wsY0;
  // dark niche interior + stainless frame surround
  woodStore.add(rbox(wsW, wsH, 2, 0.6, interiorDark, [wsCX, wsCY, FACE_Z - 6]));
  for (const [fw, fh, fx, fy] of [[wsW, 4, wsCX, wsY1], [wsW, 4, wsCX, wsY0], [4, wsH, wsX0, wsCY], [4, wsH, wsX1, wsCY]]) {
    woodStore.add(rbox(fw, fh, 6, 1, brushedSteel, [fx, fy, FACE_Z - 1]));
  }
  cabinet.add(woodStore);
  // LOGS — split dried logs stacked in the niche (ends face front; warm wood)
  const logs = new THREE.Group(); logs.name = 'logs';
  const logLen = 18, logZ = FACE_Z - 8;
  const rows = [wsY0 + 6, wsY0 + 15, wsY0 + 24, wsY0 + 33, wsY0 + 42];
  for (let r = 0; r < rows.length; r++) {
    const ly = rows[r];
    const nInRow = 5 - (r % 2);
    for (let i = 0; i < nInRow; i++) {
      const lr = 3.4 + Math.random() * 1.4;
      const lx = wsX0 + 7 + i * ((wsW - 14) / (nInRow - 1)) + (r % 2) * 3;
      if (lx < wsX0 + 4 || lx > wsX1 - 4) continue;
      const log = cyl(lr, lr * 0.92, logLen + Math.random() * 4, 9, logMat, [lx, ly, logZ - Math.random() * 3]);
      log.rotation.x = Math.PI / 2;
      log.rotation.z = (Math.random() - 0.5) * 0.4;
      logs.add(log);
      const end = cyl(lr * 0.9, lr * 0.9, 1.0, 9, wood, [lx, ly, logZ + logLen / 2]);
      end.rotation.x = Math.PI / 2;
      logs.add(end);
    }
  }
  cabinet.add(logs);

  // -- PARRILLA zone: double cabinet doors (right of the wood store, under the grate) --
  const pdDoors = new THREE.Group(); pdDoors.name = 'parrillaDoors';
  const pdX0 = -13, pdX1 = 33, pdMid = (pdX0 + pdX1) / 2;
  const pdA = faceSlab(pdDoors, pdX0, pdMid - 1, FACE_Y0 + 1, FACE_Y1 - 1);
  const pdB = faceSlab(pdDoors, pdMid + 1, pdX1, FACE_Y0 + 1, FACE_Y1 - 1);
  pdDoors.add(barHandle(pdMid - 4, pdA.cy, FACE_Z + 1.5, FACE_Y1 - FACE_Y0 - 26, false));
  pdDoors.add(barHandle(pdMid + 4, pdB.cy, FACE_Z + 1.5, FACE_Y1 - FACE_Y0 - 26, false));
  lowerDoors.add(pdDoors);

  // -- COOKBOX zone: solid sealing panel above the firebox (the firebox access door itself
  //    is built with the fireboxBelow group, brought flush to the facade plane) --
  const cbPanel = new THREE.Group(); cbPanel.name = 'cookboxLowerPanel';
  faceSlab(cbPanel, 37, 116, FB_Y1 + 1, FACE_Y1 - 1); // strip between firebox top and counter
  lowerDoors.add(cbPanel);
  cabinet.add(lowerDoors);

  // TOOL HOOKS — rail on the prep back wall with a few hanging tools.
  const toolHooks = new THREE.Group(); toolHooks.name = 'toolHooks';
  const railY = COUNTER_Y + 26;
  toolHooks.add(rbox(prepCtrW - 16, 2, 2, 0.6, brushedSteel, [prepCtrX, railY, -HALF_D + 6]));
  for (let i = -2; i <= 2; i++) {
    const hx = prepCtrX + i * 12;
    const hook = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.4, 8, 14, Math.PI), darkSteel);
    hook.position.set(hx, railY - 2, -HALF_D + 6); hook.rotation.z = Math.PI;
    toolHooks.add(hook);
    toolHooks.add(cyl(0.5, 0.5, 14 + (Math.abs(i) % 2) * 5, 8, brushedSteel, [hx, railY - 11, -HALF_D + 6]));
  }
  cabinet.add(toolHooks);

  // ==========================================================================
  // ZONE B — PARRILLA (CENTRE): a dedicated BRASERO ember-maker beside a wide V-channel
  // parrilla grate on a crank lift over an ember bed; grease channel + cup; landing ledge.
  // ==========================================================================

  // --- BRASERO — the ember-maker: burns wood down, rakes coals under the grate. ---
  const brasero = new THREE.Group(); brasero.name = 'brasero';
  const braCY = (BRASERO_Y0 + BRASERO_Y1) / 2;
  const braseroBody = new THREE.Group(); braseroBody.name = 'braseroBody';
  // open-top firebox: back + two sides + floor (front lower for raking)
  braseroBody.add(rbox(BRASERO_W, BRASERO_Y1 - BRASERO_Y0, WALL_T, 2.5, polishedSteel, [BRASERO_CX, braCY, BRASERO_CZ - BRASERO_D / 2 + WALL_T / 2]));
  braseroBody.add(rbox(WALL_T, BRASERO_Y1 - BRASERO_Y0, BRASERO_D, 2.5, polishedSteel, [BRASERO_CX - BRASERO_W / 2 + WALL_T / 2, braCY, BRASERO_CZ]));
  braseroBody.add(rbox(WALL_T, BRASERO_Y1 - BRASERO_Y0, BRASERO_D, 2.5, polishedSteel, [BRASERO_CX + BRASERO_W / 2 - WALL_T / 2, braCY, BRASERO_CZ]));
  braseroBody.add(rbox(BRASERO_W, WALL_T, BRASERO_D, 2.5, brushedSteel, [BRASERO_CX, BRASERO_Y0 + WALL_T / 2, BRASERO_CZ]));
  // matte firebox liner (back + sides)
  braseroBody.add(rbox(BRASERO_W - 8, BRASERO_Y1 - BRASERO_Y0 - 6, 1.5, 0.5, interiorDark, [BRASERO_CX, braCY, BRASERO_CZ - BRASERO_D / 2 + WALL_T + 1]));
  braseroBody.add(rbox(BRASERO_W - 8, 1.5, BRASERO_D - 8, 0.5, interiorDark, [BRASERO_CX, BRASERO_Y0 + 4, BRASERO_CZ]));
  // low front lip (rake mouth) + a rake ledge/slot toward the grate (RIGHT side)
  braseroBody.add(rbox(BRASERO_W, 8, WALL_T, 1.5, brushedSteel, [BRASERO_CX, BRASERO_Y0 + 6, BRASERO_CZ + BRASERO_D / 2 - WALL_T / 2]));
  const rakeLedge = rbox(20, 2, BRASERO_D - 12, 1, darkSteel, [BRASERO_CX + BRASERO_W / 2 + 8, BRASERO_Y0 + 14, BRASERO_CZ]);
  rakeLedge.rotation.z = DEG(-8); rakeLedge.name = 'rakeLedge';
  braseroBody.add(rakeLedge);
  brasero.add(braseroBody);
  // BRASERO LOGS — split logs burning down to coals (char ends glow with f)
  const braseroLogs = new THREE.Group(); braseroLogs.name = 'braseroLogs';
  const braFloor = BRASERO_Y0 + 6;
  for (const [lx, ly, lz, lr, la] of [[-5, 0, -4, 2.6, 0.18], [3, 0, 4, 2.8, -0.28], [-1, 4.5, 0, 2.4, 0.1]]) {
    const log = cyl(lr, lr * 0.9, BRASERO_D - 14, 11, logMat, [BRASERO_CX + lx, braFloor + lr + ly, BRASERO_CZ + lz]);
    log.rotation.x = Math.PI / 2; log.rotation.z = la;
    braseroLogs.add(log);
    const end = cyl(lr * 0.85, lr * 0.85, 1.2, 11, charMat, [BRASERO_CX + lx, braFloor + lr + ly, BRASERO_CZ + lz - (BRASERO_D - 14) / 2]);
    end.rotation.x = Math.PI / 2;
    braseroLogs.add(end);
  }
  brasero.add(braseroLogs);
  // BRASERO EMBERS — glowing coal bed (emissive ramps with f)
  const braseroEmbers = new THREE.Mesh(new THREE.PlaneGeometry(BRASERO_W - 10, BRASERO_D - 10), braseroEmberMat);
  braseroEmbers.name = 'braseroEmbers';
  braseroEmbers.rotation.x = -Math.PI / 2;
  braseroEmbers.position.set(BRASERO_CX, braFloor + 1.0, BRASERO_CZ);
  brasero.add(braseroEmbers);
  cabinet.add(brasero);

  // --- PARRILLA PIT — ember bed + coals under the wide V-channel grate ---
  const emberBed = new THREE.Group(); emberBed.name = 'emberBed';
  emberBed.position.set(GRATE_CX, EMBER_Y, PIT_CZ);
  // pit walls (matte) around the ember bed
  emberBed.add(rbox(PIT_W, 14, WALL_T, 1.5, matteBlack, [0, -2, -PIT_D / 2 + WALL_T / 2]));
  emberBed.add(rbox(WALL_T, 14, PIT_D, 1.5, matteBlack, [-PIT_W / 2 + WALL_T / 2, -2, 0]));
  emberBed.add(rbox(WALL_T, 14, PIT_D, 1.5, matteBlack, [PIT_W / 2 - WALL_T / 2, -2, 0]));
  emberBed.add(rbox(PIT_W - 10, 2, PIT_D - 10, 1, interiorDark, [0, -6, 0]));
  const bedGlow = new THREE.Mesh(new THREE.PlaneGeometry(PIT_W - 12, PIT_D - 12), emberMat);
  bedGlow.rotation.x = -Math.PI / 2; bedGlow.position.y = -4.4;
  emberBed.add(bedGlow);
  const COAL_N = 60;
  const coalGeo = new THREE.DodecahedronGeometry(1.0, 0);
  const coals = new THREE.InstancedMesh(coalGeo, coalMat, COAL_N);
  coals.name = 'coals';
  const m4 = new THREE.Matrix4();
  const qt = new THREE.Quaternion();
  const cCol = new THREE.Color();
  const spanX = PIT_W / 2 - 8, spanZ = PIT_D / 2 - 8;
  for (let i = 0; i < COAL_N; i++) {
    const px = (Math.random() * 2 - 1) * spanX;
    const pz = (Math.random() * 2 - 1) * spanZ;
    const sc = 0.8 + Math.random() * 1.5;
    qt.setFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI));
    m4.compose(new THREE.Vector3(px, -3.0 + Math.random() * 1.1, pz), qt, new THREE.Vector3(sc, sc * 0.7, sc));
    coals.setMatrixAt(i, m4);
    const heat = 1 - Math.min(1, Math.sqrt((px / spanX) ** 2 + (pz / spanZ) ** 2));
    cCol.setHSL(lerp(0.015, 0.08, heat), 1.0, lerp(0.16, 0.34, heat));
    coals.setColorAt(i, cCol);
  }
  coals.instanceMatrix.needsUpdate = true;
  if (coals.instanceColor) coals.instanceColor.needsUpdate = true;
  emberBed.add(coals);
  cabinet.add(emberBed);

  // --- PARRILLA — V-channel grate (raised by g) + crank lift wheel ---
  const parrilla = new THREE.Group(); parrilla.name = 'parrilla';
  const grate = new THREE.Group(); grate.name = 'grate';
  grate.position.set(GRATE_CX, GRATE_LOW, PIT_CZ);
  const gSpanX = PIT_W - 8, gSpanZ = PIT_D - 8;
  for (const sz of [-1, 1]) grate.add(rbox(gSpanX, 2, 2.4, 0.6, castGrate, [0, 0, sz * (gSpanZ / 2)]));
  for (const sx of [-1, 1]) grate.add(rbox(2.4, 2, gSpanZ, 0.6, castGrate, [sx * (gSpanX / 2), 0, 0]));
  const ribCount = 13;
  for (let i = 0; i < ribCount; i++) {
    const rx = -gSpanX / 2 + 4 + i * ((gSpanX - 8) / (ribCount - 1));
    const vGroup = new THREE.Group();
    vGroup.position.set(rx, 0, 0);
    for (const s2 of [-1, 1]) {
      const plate = rbox(2.6, 0.5, gSpanZ, 0.2, castGrate, [s2 * 1.1, -0.5, 0]);
      plate.rotation.z = s2 * DEG(38);
      vGroup.add(plate);
    }
    grate.add(vGroup);
  }
  parrilla.add(grate);
  // CRANK — grate-lift wheel on the pit front (spins with g)
  const crank = new THREE.Group(); crank.name = 'crank';
  crank.position.set(GRATE_CX - PIT_W / 2 - 2, COUNTER_Y - 2, PIT_CZ + PIT_D / 2 + 3);
  const crankRim = new THREE.Mesh(new THREE.TorusGeometry(5, 1, 10, 22), polishedSteel);
  crank.add(crankRim);
  for (let i = 0; i < 4; i++) {
    const spoke = cyl(0.6, 0.6, 9, 8, brushedSteel, [0, 0, 0]);
    spoke.rotation.z = i * Math.PI / 4;
    crank.add(spoke);
  }
  const crankHandle = cyl(0.7, 0.7, 3.5, 8, moltenDial, [5, 0, 1.8]);
  crankHandle.rotation.x = Math.PI / 2;
  crank.add(crankHandle);
  parrilla.add(crank);
  cabinet.add(parrilla);

  // OVERHEAD HANGING RACK — a horizontal bar on two posts above the coals, with S-hooks and a
  // couple of hanging items (a sausage coil + a cured cut) and a tool rail: a real asador rig.
  const hangRack = new THREE.Group(); hangRack.name = 'hangRack';
  const hrY = 158, hrX0 = -56, hrX1 = 30, hrZ = -12, hrY0 = 122;
  for (const hx of [hrX0, hrX1]) {
    hangRack.add(cyl(1.5, 1.7, hrY - hrY0, 12, brushedSteel, [hx, (hrY0 + hrY) / 2, hrZ]));
    hangRack.add(rbox(6, 2, 6, 1, darkSteel, [hx, hrY0, hrZ])); // base plate
  }
  const hrBar = cyl(1.4, 1.4, hrX1 - hrX0 + 3, 14, polishedSteel, [(hrX0 + hrX1) / 2, hrY, hrZ]);
  hrBar.rotation.z = Math.PI / 2; hangRack.add(hrBar);
  // a lower TOOL RAIL toward the front carrying a couple of asado tools
  const trZ = 6, trY = 150;
  const toolRail = cyl(1.1, 1.1, 40, 12, brushedSteel, [-38, trY, trZ]);
  toolRail.rotation.z = Math.PI / 2; hangRack.add(toolRail);
  for (const [tx, tl] of [[-52, 26], [-44, 30], [-24, 24]]) {
    hangRack.add(cyl(0.5, 0.5, tl, 8, darkSteel, [tx, trY - tl / 2, trZ + 1]));         // shaft
    hangRack.add(rbox(4, 3, 1, 0.4, wood, [tx, trY - tl - 1, trZ + 1]));                // handle
  }
  cabinet.add(hangRack);

  // S-HOOKS + hanging items over the coals (hang down from the overhead bar).
  const hooks = new THREE.Group(); hooks.name = 'hooks';
  function sHook(hx, len) {
    const g = new THREE.Group(); g.position.set(hx, hrY, hrZ);
    const top = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.35, 8, 14, Math.PI), darkSteel);
    top.rotation.x = Math.PI / 2; top.position.y = -0.4; g.add(top);
    g.add(cyl(0.4, 0.4, len, 8, darkSteel, [0, -len / 2 - 1.4, 0]));
    const bot = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.35, 8, 14, Math.PI), darkSteel);
    bot.rotation.x = Math.PI / 2; bot.rotation.z = Math.PI; bot.position.y = -len - 1.8; g.add(bot);
    return g;
  }
  for (const [hx, ln] of [[-40, 8], [-20, 10], [0, 8], [16, 9]]) hooks.add(sHook(hx, ln));
  // a coiled sausage on one hook
  const coil = new THREE.Mesh(new THREE.TorusGeometry(5.5, 1.7, 10, 22), sausageMat);
  coil.position.set(-20, hrY - 20, hrZ); coil.rotation.x = DEG(78);
  hooks.add(coil);
  // a hanging cured cut on another hook
  const cut = rbox(9, 16, 5, 2, sausageMat, [0, hrY - 20, hrZ]);
  hooks.add(cut);
  cabinet.add(hooks);

  // FLAME GROUP — additive licks over the parrilla; height ∝ f.
  const flameGroup = new THREE.Group(); flameGroup.name = 'flameGroup';
  flameGroup.position.set(GRATE_CX, EMBER_Y + 2, PIT_CZ);
  const flameSpots = [[-18, -6], [-8, 6], [0, -5], [9, 5], [18, -6], [-12, 8], [12, -9], [4, 9], [-4, -10], [20, 6]];
  for (const [fxp, fzp] of flameSpots) {
    for (let a = 0; a < 2; a++) {
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(8, 15), flameMat);
      fl.position.set(fxp, 8, fzp);
      fl.rotation.y = a * Math.PI / 2;
      flameGroup.add(fl);
    }
  }
  cabinet.add(flameGroup);

  // GREASE CHANNEL + CUP — fat drains from the V-grate front to a channel → cup.
  const greaseChannel = new THREE.Group(); greaseChannel.name = 'greaseChannel';
  const gch = rbox(PIT_W - 6, 2.4, 5, 1, brushedSteel, [GRATE_CX, PIT_Y0 + 2, PIT_CZ + PIT_D / 2 - 2]);
  gch.rotation.z = DEG(-3);
  greaseChannel.add(gch);
  cabinet.add(greaseChannel);
  const greaseCup = new THREE.Group(); greaseCup.name = 'greaseCup';
  greaseCup.add(cyl(4, 3.4, 8, 16, darkSteel, [GRATE_CX + PIT_W / 2 - 4, PIT_Y0 - 6, PIT_CZ + PIT_D / 2 - 2]));
  cabinet.add(greaseCup);

  // LANDING LEDGE — stainless rest/plate ledge between the brasero and the grate.
  const landingLedge = new THREE.Group(); landingLedge.name = 'landingLedge';
  landingLedge.add(rbox(24, 3, CAB_D - 12, 1.5, brushedSteel, [LANDING_CX, COUNTER_Y - 1.5, -3]));
  landingLedge.add(rbox(24, 1.4, CAB_D - 12, 0.8, wood, [LANDING_CX, COUNTER_Y + 0.4, -3]));
  cabinet.add(landingLedge);

  // ==========================================================================
  // ZONE C — VERTICAL SMOKER cookbox (RIGHT): insulated chamber with DUAL front doors
  // (hinged at OUTER edges, swing to the sides), 3 stacked racks, a FIREBOX BELOW, an
  // intake damper, and a flue on top. Smoke rises up through the racks and out the flue.
  // ==========================================================================
  const chamCY = (CHAM_Y0 + CHAM_Y1) / 2;
  const cookboxBody = new THREE.Group(); cookboxBody.name = 'cookboxBody';
  // insulated double-wall chamber: back + two sides + top + floor (front open for doors)
  cookboxBody.add(rbox(COOK_W, CHAM_Y1 - CHAM_Y0, WALL_T, 2.5, polishedSteel, [COOK_CX, chamCY, COOK_CZ - COOK_D / 2 + WALL_T / 2]));
  cookboxBody.add(rbox(WALL_T, CHAM_Y1 - CHAM_Y0, COOK_D, 2.5, polishedSteel, [COOK_CX - COOK_W / 2 + WALL_T / 2, chamCY, COOK_CZ]));
  cookboxBody.add(rbox(WALL_T, CHAM_Y1 - CHAM_Y0, COOK_D, 2.5, polishedSteel, [COOK_CX + COOK_W / 2 - WALL_T / 2, chamCY, COOK_CZ]));
  cookboxBody.add(rbox(COOK_W, WALL_T, COOK_D, 2.5, brushedSteel, [COOK_CX, CHAM_Y1 - WALL_T / 2, COOK_CZ]));
  // floor with a slot so heat/smoke rises from the firebox below
  cookboxBody.add(rbox(COOK_W, WALL_T, (COOK_D - 20) / 2, 1.5, brushedSteel, [COOK_CX, CHAM_Y0 + WALL_T / 2, COOK_CZ - COOK_D / 4 - 3]));
  cookboxBody.add(rbox(COOK_W, WALL_T, (COOK_D - 20) / 2, 1.5, brushedSteel, [COOK_CX, CHAM_Y0 + WALL_T / 2, COOK_CZ + COOK_D / 4 + 3]));
  // matte insulated liner (back + sides)
  cookboxBody.add(rbox(COOK_W - 8, CHAM_Y1 - CHAM_Y0 - 8, 1.5, 0.5, interiorDark, [COOK_CX, chamCY, COOK_CZ - COOK_D / 2 + WALL_T + 1]));
  cookboxBody.add(rbox(1.5, CHAM_Y1 - CHAM_Y0 - 8, COOK_D - 8, 0.5, interiorDark, [COOK_CX - COOK_W / 2 + WALL_T + 1, chamCY, COOK_CZ]));
  cookboxBody.add(rbox(1.5, CHAM_Y1 - CHAM_Y0 - 8, COOK_D - 8, 0.5, interiorDark, [COOK_CX + COOK_W / 2 - WALL_T - 1, chamCY, COOK_CZ]));
  cabinet.add(cookboxBody);

  // BAFFLE / DIFFUSER PLATE — a tilted plate just above the firebox slot so heat + smoke
  // spread across the width before rising through the racks (reverse-flow feel).
  const baffle = new THREE.Group(); baffle.name = 'baffle';
  const bafflePlate = rbox(COOK_W - 12, 1.6, COOK_D - 22, 0.6, darkSteel, [COOK_CX, CHAM_Y0 + 10, COOK_CZ]);
  bafflePlate.rotation.x = DEG(-7);
  baffle.add(bafflePlate);
  // side rails carrying the baffle
  for (const s of [-1, 1]) baffle.add(rbox(2, 3, COOK_D - 20, 0.5, darkSteel, [COOK_CX + s * (COOK_W / 2 - 6), CHAM_Y0 + 9, COOK_CZ]));
  cabinet.add(baffle);

  // 3 STACKED RACKS inside the chamber — welded rails on all four sides + grill bars.
  const racks = new THREE.Group(); racks.name = 'racks';
  const rackW = COOK_W - 14, rackD = COOK_D - 14;
  for (const ry of [CHAM_Y0 + 30, CHAM_Y0 + 62, CHAM_Y0 + 94]) {
    const rack = new THREE.Group();
    rack.add(rbox(rackW, 1.6, 2, 0.5, castGrate, [COOK_CX, ry, COOK_CZ - rackD / 2]));
    rack.add(rbox(rackW, 1.6, 2, 0.5, castGrate, [COOK_CX, ry, COOK_CZ + rackD / 2]));
    for (const s of [-1, 1]) rack.add(rbox(2, 1.6, rackD, 0.5, castGrate, [COOK_CX + s * rackW / 2, ry, COOK_CZ]));
    const barN = 11;
    for (let i = 0; i < barN; i++) {
      const bx = COOK_CX - rackW / 2 + 3 + i * ((rackW - 6) / (barN - 1));
      rack.add(rbox(1.2, 1.0, rackD, 0.3, castGrate, [bx, ry, COOK_CZ]));
    }
    // rack support rails welded to the side walls
    racks.add(rack);
  }
  cabinet.add(racks);

  // DUAL FRONT DOORS — hinged at their OUTER vertical (Y) edges; swing OUT to the sides.
  // Each door group is placed at its outer hinge; the panel extends inward toward the centre.
  function buildDoor(name, sign) {
    // sign = -1 → left door (hinge at left/outer edge), +1 → right door (hinge at right edge)
    const doorW = COOK_W / 2 - 2;
    const g = new THREE.Group(); g.name = name;
    g.position.set(COOK_CX + sign * COOK_W / 2, chamCY, COOK_FRONT); // outer-edge hinge, front face
    // panel centre sits inward from the hinge by doorW/2
    const pcx = -sign * doorW / 2;
    g.add(rbox(doorW, CHAM_Y1 - CHAM_Y0 - 2, 3, 2, polishedSteel, [pcx, 0, -1.5]));
    g.add(rbox(doorW - 8, CHAM_Y1 - CHAM_Y0 - 12, 1.2, 1.5, brushedSteel, [pcx, 0, 0.4]));
    // glass window
    const win = new THREE.Mesh(roundedBoxGeo(doorW - 20, (CHAM_Y1 - CHAM_Y0) * 0.5, 1.4, 3), glass);
    win.name = name === 'cookboxDoorL' ? 'windowL' : 'windowR';
    win.position.set(pcx, 14, 1.2);
    g.add(win);
    // cool-touch handle near the free (inner) edge
    const handle = cyl(1.0, 1.0, CHAM_Y1 - CHAM_Y0 - 30, 12, wood, [-sign * (doorW - 6), 0, 3]);
    g.add(handle);
    return { group: g, window: win };
  }
  const dL = buildDoor('cookboxDoorL', -1);
  const dR = buildDoor('cookboxDoorR', 1);
  const cookboxDoorL = dL.group, cookboxDoorR = dR.group;
  const windowL = dL.window, windowR = dR.window;
  cabinet.add(cookboxDoorL, cookboxDoorR);

  // FIREBOX BELOW — fire/ember box at the base of the cookbox; smoke rises up through racks.
  const fireboxBelow = new THREE.Group(); fireboxBelow.name = 'fireboxBelow';
  const fbCY = (FB_Y0 + FB_Y1) / 2;
  const fireboxBody = new THREE.Group(); fireboxBody.name = 'fireboxBody';
  fireboxBody.add(rbox(COOK_W, FB_Y1 - FB_Y0, WALL_T, 2.5, polishedSteel, [COOK_CX, fbCY, COOK_CZ - COOK_D / 2 + WALL_T / 2]));
  fireboxBody.add(rbox(WALL_T, FB_Y1 - FB_Y0, COOK_D, 2.5, polishedSteel, [COOK_CX - COOK_W / 2 + WALL_T / 2, fbCY, COOK_CZ]));
  fireboxBody.add(rbox(WALL_T, FB_Y1 - FB_Y0, COOK_D, 2.5, polishedSteel, [COOK_CX + COOK_W / 2 - WALL_T / 2, fbCY, COOK_CZ]));
  fireboxBody.add(rbox(COOK_W, WALL_T, COOK_D, 2.5, brushedSteel, [COOK_CX, FB_Y0 + WALL_T / 2, COOK_CZ]));
  // matte liner (back + floor)
  fireboxBody.add(rbox(COOK_W - 8, FB_Y1 - FB_Y0 - 6, 1.5, 0.5, interiorDark, [COOK_CX, fbCY, COOK_CZ - COOK_D / 2 + WALL_T + 1]));
  fireboxBody.add(rbox(COOK_W - 8, 1.5, COOK_D - 8, 0.5, interiorDark, [COOK_CX, FB_Y0 + 4, COOK_CZ]));
  fireboxBelow.add(fireboxBody);
  // FIREBOX DOOR — fire-access door, flush in the lower facade, with an ember-glow view slit
  // and a tubular bar handle (matches the rest of the cabinet hardware).
  const fireboxDoor = new THREE.Group(); fireboxDoor.name = 'fireboxDoor';
  const fbdCY = (FACE_Y0 + FB_Y1) / 2, fbdH = FB_Y1 - FACE_Y0;
  fireboxDoor.position.set(76.5, fbdCY, FACE_Z);
  fireboxDoor.add(rbox(75, fbdH - 2, 3, 2, brushedSteel, [0, 0, 0]));
  fireboxDoor.add(rbox(63, fbdH - 12, 1.2, 1.2, polishedSteel, [0, 0, 1.5]));
  const fbSlit = new THREE.Mesh(roundedBoxGeo(50, 6, 1.4, 1), glass);
  fbSlit.position.set(0, fbdH * 0.16, 2.0);
  fireboxDoor.add(fbSlit);
  fireboxDoor.add(barHandle(0, -fbdH * 0.2, 1.5, 46, true));
  fireboxBelow.add(fireboxDoor);
  // FIREBOX LOGS — split logs on the deck (char ends glow with f)
  const fireboxLogs = new THREE.Group(); fireboxLogs.name = 'fireboxLogs';
  const fbFloor = FB_Y0 + 6;
  for (const [lx, ly, lz, lr, la] of [[-10, 0, -5, 3.0, 0.2], [6, 0, 5, 3.2, -0.3], [-2, 0, 9, 2.6, 0.1], [-3, 5.5, 0, 2.8, -0.14], [12, 0, -6, 2.8, 0.24]]) {
    const log = cyl(lr, lr * 0.9, COOK_D - 16, 11, logMat, [COOK_CX + lx, fbFloor + lr + ly, COOK_CZ + lz]);
    log.rotation.x = Math.PI / 2; log.rotation.z = la;
    fireboxLogs.add(log);
    const end = cyl(lr * 0.85, lr * 0.85, 1.2, 11, charMat, [COOK_CX + lx, fbFloor + lr + ly, COOK_CZ + lz - (COOK_D - 16) / 2]);
    end.rotation.x = Math.PI / 2;
    fireboxLogs.add(end);
  }
  fireboxBelow.add(fireboxLogs);
  // FIREBOX EMBERS — glowing coal bed (emissive ramps with f)
  const fireboxEmbers = new THREE.Mesh(new THREE.PlaneGeometry(COOK_W - 14, COOK_D - 12), fireboxEmberMat);
  fireboxEmbers.name = 'fireboxEmbers';
  fireboxEmbers.rotation.x = -Math.PI / 2;
  fireboxEmbers.position.set(COOK_CX, fbFloor + 1.2, COOK_CZ);
  fireboxBelow.add(fireboxEmbers);
  // FIREBOX DAMPER — low intake dial on the firebox front (opens with f)
  const fireboxDamper = new THREE.Group(); fireboxDamper.name = 'fireboxDamper';
  fireboxDamper.position.set(45, FB_Y0 + 9, FACE_Z + 2);
  const fdRing = cyl(4, 4, 2, 20, darkSteel, [0, 0, 0]); fdRing.rotation.x = Math.PI / 2;
  fireboxDamper.add(fdRing);
  const fdVane = rbox(1.2, 7, 1, 0.3, moltenDial, [0, 0, 1.4]);
  fireboxDamper.add(fdVane);
  fireboxDamper.userData.vane = fdVane;
  fireboxBelow.add(fireboxDamper);
  cabinet.add(fireboxBelow);

  // COOK FLUE — a proper welded smokestack: collector base, a tall straight stack, a banded
  // collar, and a flat rain-cap on standoffs (not a toy funnel).
  const cookFlue = new THREE.Group(); cookFlue.name = 'cookFlue';
  // collector base tapering into the stack
  cookFlue.add(rbox(20, 6, 20, 3, brushedSteel, [FLUE_X, FLUE_Y0 + 2, FLUE_Z]));
  cookFlue.add(cyl(FLUE_R + 2, FLUE_R + 4, 8, 24, polishedSteel, [FLUE_X, FLUE_Y0 + 8, FLUE_Z]));
  // tall straight stack
  cookFlue.add(cyl(FLUE_R, FLUE_R, FLUE_Y1 - FLUE_Y0 - 8, 24, polishedSteel, [FLUE_X, (FLUE_Y0 + 12 + FLUE_Y1) / 2, FLUE_Z]));
  // reinforcing collar band near the top
  cookFlue.add(cyl(FLUE_R + 1.1, FLUE_R + 1.1, 3, 24, brushedSteel, [FLUE_X, FLUE_Y1 - 6, FLUE_Z]));
  // flat rain-cap on three standoffs
  const flueCap = new THREE.Group(); flueCap.name = 'flueCap';
  flueCap.position.set(FLUE_X, FLUE_Y1, FLUE_Z);
  const capDisc = cyl(FLUE_R + 4, FLUE_R + 4, 2.2, 24, polishedSteel, [0, 6, 0]);
  flueCap.add(capDisc);
  flueCap.add(cyl(FLUE_R + 4, FLUE_R + 3, 1.4, 24, brushedSteel, [0, 4.6, 0])); // drip lip
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    flueCap.add(cyl(0.6, 0.6, 6, 8, darkSteel, [Math.cos(a) * (FLUE_R - 1), 3, Math.sin(a) * (FLUE_R - 1)]));
  }
  flueCap.castShadow = true;
  cookFlue.add(flueCap);
  const flueDamper = new THREE.Group(); flueDamper.name = 'flueDamper';
  flueDamper.position.set(FLUE_X + FLUE_R + 0.5, FLUE_Y0 + 24, FLUE_Z);
  const flRing = cyl(4, 4, 2, 20, darkSteel, [0, 0, 0]); flRing.rotation.z = Math.PI / 2;
  flueDamper.add(flRing);
  const flVane = rbox(1.3, 7, 1, 0.3, moltenDial, [1.4, 0, 0]);
  flueDamper.add(flVane);
  flueDamper.userData.vane = flVane;
  cookFlue.add(flueDamper);
  cabinet.add(cookFlue);

  // SMOKE PLUME — soft translucent billboards rising from the flue cap. Opacity ∝
  // f × (1 − doorsOpen): only when lit AND the cookbox doors are still closed.
  const smokePlume = new THREE.Group(); smokePlume.name = 'smokePlume';
  smokePlume.position.set(FLUE_X, FLUE_Y1 + 12, FLUE_Z);
  const puffDefs = [[14, 0, 0, 0], [18, 8, 3, 2], [22, 20, -4, -2], [26, 34, 4, 3], [30, 50, -3, -1]];
  for (const [sz, dy, dx, dz] of puffDefs) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), smokeMat);
    p.position.set(dx, dy, dz);
    smokePlume.add(p);
  }
  cabinet.add(smokePlume);

  // COOK TASK LIGHT — strip under the chamber top; lights the racks as the roof opens.
  const cookTaskLight = new THREE.Group(); cookTaskLight.name = 'cookTaskLight';
  cookTaskLight.position.set(COOK_CX, CHAM_Y1 - 8, COOK_CZ + 6);
  cookTaskLight.add(rbox(COOK_W - 24, 2, 8, 0.8, cookLightMat, [0, 0, 0]));
  cookTaskLight.add(rbox(COOK_W - 28, 1, 8.6, 0.5, glass, [0, -1.4, 0]));
  cabinet.add(cookTaskLight);

  // COOKBOX INTAKE DAMPER — low draft dial on the chamber left wall (opens early with f)
  const intakeDamper = new THREE.Group(); intakeDamper.name = 'intakeDamper';
  intakeDamper.position.set(COOK_CX - COOK_W / 2 - 0.5, CHAM_Y0 + 10, COOK_CZ + 12);
  const idRing = cyl(4.4, 4.4, 2, 20, darkSteel, [0, 0, 0]); idRing.rotation.z = Math.PI / 2;
  intakeDamper.add(idRing);
  const idVane = rbox(1.3, 7, 1, 0.3, moltenDial, [-1.4, 0, 0]);
  intakeDamper.add(idVane);
  intakeDamper.userData.vane = idVane;
  cabinet.add(intakeDamper);

  // ==========================================================================
  // ROOF — TWO independent lift-up lids. Each is hinged at its TOP-BACK edge (lid group
  // placed at pivot y=205, z=-34), a corrugated-underside stainless panel that swings up &
  // forward ~80° into a HIGH overhead roof (front edge ~230 cm) on visible gas struts, each
  // with an underside task light. lidL shelters prep+parrilla; lidR shelters the cookbox.
  // ==========================================================================
  function buildLid(name, cx, w) {
    const lid = new THREE.Group(); lid.name = name;
    lid.position.set(cx, LID_HINGE_Y, LID_HINGE_Z); // hinge at the top-back edge
    const panel = new THREE.Group(); panel.name = name === 'lidL' ? 'lidPanelL' : 'lidPanelR';
    const yTop = LID_PANEL_CY + LID_LEN / 2, yBot = LID_PANEL_CY - LID_LEN / 2;
    // main panel slab (outer weather face flush at world z≈+34 when closed)
    panel.add(rbox(w, LID_LEN, LID_T, 4, polishedSteel, [0, LID_PANEL_CY, LID_PANEL_CZ]));
    // FRAMED perimeter — an edge frame that drops below the slab so the awning reads as a heavy
    // boxed engineered panel (a slab with real depth), not a thin sheet.
    const FR_T = 4, FR_DROP = 3;                // rail width + how far the frame drops under the slab
    const frH = LID_T + FR_DROP;                 // total framed depth
    const frCZ = LID_PANEL_CZ - FR_DROP / 2;     // straddles the slab, dropping below on the underside
    for (const sx of [-1, 1]) panel.add(rbox(FR_T, LID_LEN, frH, 1.4, brushedSteel, [sx * (w / 2 - FR_T / 2), LID_PANEL_CY, frCZ]));
    for (const sy of [-1, 1]) panel.add(rbox(w, FR_T, frH, 1.4, brushedSteel, [0, LID_PANEL_CY + sy * (LID_LEN / 2 - FR_T / 2), frCZ]));
    // corrugated / slatted UNDERSIDE — ribs recessed inside the frame, arrayed across the width.
    const ribN = Math.max(6, Math.round(w / 11)), ribZ = LID_PANEL_CZ - LID_T / 2 - FR_DROP + 3;
    for (let i = 0; i < ribN; i++) {
      const rx = -w / 2 + 10 + i * ((w - 20) / (ribN - 1));
      panel.add(rbox(5.5, LID_LEN - 2 * FR_T - 4, 3.0, 0.8, brushedSteel, [rx, LID_PANEL_CY, ribZ]));
    }
    // heavy front fascia lip (a bull-nosed leading edge on the free front edge)
    panel.add(rbox(w + 4, 7, frH + 3, 2.5, brushedSteel, [0, yBot + 3, frCZ]));
    // lid handle near the free (front) edge
    const handle = cyl(1.5, 1.5, w - 30, 14, wood, [0, yBot + 12, LID_PANEL_CZ + LID_T / 2 + 3]);
    handle.rotation.z = Math.PI / 2;
    panel.add(handle);
    lid.add(panel);

    // HINGE BARREL — a solid pivot knuckle at the lid's top-back edge where it meets the cabinet.
    // Placed at the lid's local origin (the pivot line, along X): a fat barrel with knuckle rings,
    // end caps, and stout arms reaching forward to the panel's back edge, so the pivot reads as
    // real forged hardware. A cylinder about its own X axis is rotation-invariant → visually solid
    // through the whole lift with no change to the kinematics.
    const hinge = new THREE.Group(); hinge.name = name === 'lidL' ? 'hingeL' : 'hingeR';
    const barrel = cyl(4.6, 4.6, w - 10, 22, darkSteel, [0, 0, 0]);
    barrel.rotation.z = Math.PI / 2; hinge.add(barrel);
    const knN = Math.max(4, Math.round(w / 26));
    for (let i = 0; i < knN; i++) {
      const kx = -w / 2 + 12 + i * ((w - 24) / (knN - 1));
      const knuckle = cyl(5.6, 5.6, 7, 22, brushedSteel, [kx, 0, 0]); knuckle.rotation.z = Math.PI / 2;
      hinge.add(knuckle);
    }
    for (const sx of [-1, 1]) {
      const cap = cyl(5.8, 5.8, 3.5, 22, brushedSteel, [sx * (w / 2 - 5), 0, 0]); cap.rotation.z = Math.PI / 2;
      hinge.add(cap);
      // hinge CHEEK — a low-profile flat plate from the pivot forward to the panel back edge
      // (spans the top-back reveal). Thin in X + dark so it reads as forged hinge hardware that
      // merges with the barrel, NOT a second row of scaffolding poles alongside the gas struts.
      const armLen = LID_PANEL_CZ;
      const arm = rbox(3.4, 15, armLen, 1.0, darkSteel, [sx * (w / 2 - 10), yTop - 7, armLen / 2]);
      hinge.add(arm);
    }
    lid.add(hinge);
    // underside task light strip
    const light = new THREE.Group(); light.name = name === 'lidL' ? 'lightL' : 'lightR';
    light.position.set(0, LID_PANEL_CY + 10, LID_PANEL_CZ - LID_T / 2 - 3.4);
    light.add(rbox(w - 40, 2.6, 10, 0.8, darkSteel, [0, 0, 0]));
    light.add(rbox(w - 46, 1.3, 8, 0.5, lidLightMat, [0, -1.2, 0]));
    lid.add(light);
    return { lid, panel, light };
  }
  const L = buildLid('lidL', LID_L_CX, LID_L_W);
  const R = buildLid('lidR', LID_R_CX, LID_R_W);
  const lidL = L.lid, lidR = R.lid;
  const lidPanelL = L.panel, lidPanelR = R.panel;
  const lightL = L.light, lightR = R.light;
  roof.add(lidL, lidR);

  // GAS STRUTS — visible struts from the cabinet to each lid. Children of root; re-oriented
  // each setRoof() between a fixed cabinet base and a moving point on the lid.
  const UP = new THREE.Vector3(0, 1, 0);
  function makeStrut(name) {
    const g = new THREE.Group(); g.name = name;
    // thick gas-strut: a slim piston ROD riding inside a fat SLEEVE cylinder (visible telescoping
    // body), a heavy end fitting + clevis at each end so it reads as real engineered hardware.
    const rod = cyl(1.9, 1.9, 1, 14, polishedSteel, [0, 0, 0]);
    const sleeve = cyl(3.2, 3.2, 1, 16, darkSteel, [0, 0, 0]);
    const ballA = new THREE.Mesh(new THREE.SphereGeometry(3.0, 12, 10), darkSteel); ballA.castShadow = true;
    const ballB = new THREE.Mesh(new THREE.SphereGeometry(3.0, 12, 10), darkSteel); ballB.castShadow = true;
    // clevis end fittings (a stubby collar + a bracket eye) at each end
    const clevisA = cyl(3.4, 3.4, 4, 14, brushedSteel, [0, 0, 0]); clevisA.castShadow = true;
    const clevisB = cyl(3.4, 3.4, 4, 14, brushedSteel, [0, 0, 0]); clevisB.castShadow = true;
    const eyeA = new THREE.Mesh(new THREE.TorusGeometry(2.6, 1.0, 8, 16), brushedSteel); eyeA.castShadow = true;
    const eyeB = new THREE.Mesh(new THREE.TorusGeometry(2.6, 1.0, 8, 16), brushedSteel); eyeB.castShadow = true;
    g.add(rod, sleeve, ballA, ballB, clevisA, clevisB, eyeA, eyeB);
    g.userData = { rod, sleeve, ballA, ballB, clevisA, clevisB, eyeA, eyeB };
    return g;
  }
  function orientStrut(strut, a, b) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = Math.max(1, dir.length());
    strut.position.copy(a).add(b).multiplyScalar(0.5);
    strut.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
    const ud = strut.userData;
    ud.rod.scale.y = len;
    ud.sleeve.scale.y = len * 0.55;
    ud.sleeve.position.set(0, -len * 0.16, 0);
    ud.ballA.position.set(0, -len / 2, 0);
    ud.ballB.position.set(0, len / 2, 0);
    ud.clevisA.position.set(0, -len / 2 + 3.5, 0);
    ud.clevisB.position.set(0, len / 2 - 3.5, 0);
    ud.eyeA.position.set(0, -len / 2 - 1.5, 0);
    ud.eyeB.position.set(0, len / 2 + 1.5, 0);
  }
  // Each strut: which lid it tracks, a fixed cabinet base point, and a lid-local attach point.
  // TWO gas struts per lid, mounted DIAGONALLY: base sits LOW on the cabinet body (y≈162, just
  // in front of the top-back hinge); top attaches to the lid underside partway out. Endpoints are
  // recomputed from the lid's live transform each setRoof(), so they swing to ~48° at full open.
  const strutSpecs = [
    { name: 'strutL1', lid: lidL, base: new THREE.Vector3(LID_L_CX - 45, 162, -22), local: new THREE.Vector3(-38, -75, 56) },
    { name: 'strutL2', lid: lidL, base: new THREE.Vector3(LID_L_CX + 45, 162, -22), local: new THREE.Vector3(38, -75, 56) },
    { name: 'strutR1', lid: lidR, base: new THREE.Vector3(LID_R_CX - 24, 162, -22), local: new THREE.Vector3(-22, -75, 56) },
    { name: 'strutR2', lid: lidR, base: new THREE.Vector3(LID_R_CX + 24, 162, -22), local: new THREE.Vector3(22, -75, 56) },
  ];
  for (const s of strutSpecs) { s.group = makeStrut(s.name); root.add(s.group); }
  const strutL1 = strutSpecs[0].group, strutL2 = strutSpecs[1].group;
  const strutR1 = strutSpecs[2].group, strutR2 = strutSpecs[3].group;

  // ---- parts map (SPEC §3 — expose every named group) --------------------------
  const parts = {
    root, cabinet, roof,
    // cabinet shell
    carcass, backWall, feet, badge,
    // cabinet lower facade (always-present sealed front)
    toeKick, lowerDoors, lowerCabinets, drawers, woodStore, logs,
    // prep zone
    counter, sink, faucet, cuttingBoard, toolHooks,
    // parrilla zone
    brasero, braseroBody, braseroLogs, braseroEmbers, rakeLedge,
    parrilla, grate, crank, emberBed, coals, flameGroup, greaseChannel, greaseCup, landingLedge,
    hangRack, hooks,
    // cookbox zone
    cookboxBody, cookboxDoorL, cookboxDoorR, windowL, windowR, racks, baffle,
    fireboxBelow, fireboxBody, fireboxDoor, fireboxLogs, fireboxEmbers, fireboxDamper,
    cookFlue, flueDamper, flueCap, smokePlume, cookTaskLight, intakeDamper,
    // roof
    lidL, lidR, lidPanelL, lidPanelR, lightL, lightR, strutL1, strutL2, strutR1, strutR2,
  };

  // ==========================================================================
  // SETTERS — roof / doors / fire / grate INDEPENDENT & composable. Idempotent & clamped:
  // each call recomputes absolute transforms from the stored params (SPEC §2).
  // ==========================================================================
  let sRoof = -1, sDoors = -1, sFire = -1, sGrate = -1;

  // updateSmoke() — plume opacity ∝ f × (1 − doorsOpen). Both setFire + setDoors call it.
  function updateSmoke() {
    const f = Math.max(0, sFire), d = Math.max(0, sDoors);
    const lit = smoothstep(0.15, 0.45, f);
    const doorsOpen = smoothstep(0, 0.9, d);
    const smoke = lit * (1 - doorsOpen);
    smokePlume.visible = smoke > 0.01;
    smokeMat.opacity = smoke * 0.5;
    smokePlume.scale.set(1, 0.6 + smoke * 0.9, 1);
    // window glow strongest when doors closed (you see the fire through the glass)
    glass.emissiveIntensity = lit * (0.4 + 0.9 * (1 - doorsOpen)) * 1.5;
  }

  // setRoof(r): lift BOTH lids up & forward into overhead roofs. Rotates each about its
  // top-back X hinge over r∈[0,0.85]; underside task lights come on r∈[0.6,1].
  function setRoof(r) {
    r = clamp(r, 0, 1);
    sRoof = r;
    const lift = smoothstep(0.0, 0.85, r);
    lidL.rotation.x = LID_OPEN * lift;
    lidR.rotation.x = LID_OPEN * lift;
    lidL.updateMatrix();
    lidR.updateMatrix();
    for (const s of strutSpecs) {
      orientStrut(s.group, s.base, s.local.clone().applyMatrix4(s.lid.matrix));
    }
    const litUp = smoothstep(0.6, 1.0, r);
    lidLightMat.emissiveIntensity = litUp * 2.6;
    cookLightMat.emissiveIntensity = litUp * 2.4;
  }
  // Back-compat aliases (SPEC §4): setLid = setPod = setStation = setRoof.
  const setLid = setRoof;
  const setPod = setRoof;
  const setStation = setRoof;

  // setDoors(d): swing the vertical smoker's dual doors OUT to the sides about their outer
  // vertical (Y) hinges over d∈[0,0.9]; racks revealed. Updates smoke (smoke ∝ f×(1−d)).
  function setDoors(d) {
    d = clamp(d, 0, 1);
    sDoors = d;
    const open = smoothstep(0, 0.9, d) * DEG(112);
    cookboxDoorL.rotation.y = -open; // left door swings out to the left
    cookboxDoorR.rotation.y = open;  // right door swings out to the right
    updateSmoke();
  }

  // setFire(f): light brasero + parrilla ember beds, cookbox firebox-below; flames over the
  // parrilla ∝ f; dampers open early; smoke from the cookbox flue when doors closed.
  function setFire(f) {
    f = clamp(f, 0, 1);
    sFire = f;
    const glow = smoothstep(0.2, 1.0, f);                 // all ember beds glow  f∈[0.2,1]
    braseroEmberMat.emissiveIntensity = glow * 2.6;
    emberMat.emissiveIntensity = glow * 2.6;
    coalMat.emissiveIntensity = glow * 2.2;
    fireboxEmberMat.emissiveIntensity = glow * 2.4;
    charMat.emissiveIntensity = glow * 1.8;
    moltenDial.emissiveIntensity = lerp(0.4, 1.2, glow);
    const intake = smoothstep(0.1, 0.4, f);               // dampers open early
    intakeDamper.userData.vane.rotation.x = lerp(0, DEG(85), intake);
    fireboxDamper.userData.vane.rotation.z = lerp(0, DEG(85), intake);
    flueDamper.userData.vane.rotation.z = lerp(0, DEG(85), intake);
    // FLAMES over the parrilla — height ∝ f (open fire)
    const flame = glow;
    flameGroup.visible = flame > 0.01;
    flameGroup.scale.set(1, 0.25 + flame * 1.5, 1);
    flameMat.opacity = flame * 0.9;
    updateSmoke();                                        // smoke ∝ f × (1 − doors)
  }

  // setGrate(g): parrilla V-grate height on the crank lift (low sear ↔ gentle). Default 0.4.
  function setGrate(g) {
    g = clamp(g, 0, 1);
    sGrate = g;
    grate.position.y = lerp(GRATE_LOW, GRATE_HIGH, g);
    crank.rotation.z = -g * Math.PI * 3;
  }

  function getState() {
    return { roof: sRoof, doors: sDoors, fire: sFire, grate: sGrate };
  }

  // ---- Named postures (SPEC §2 — exact ids/labels/values/captions) -------------
  const postures = [
    { id: 'closed', label: 'Closed', roof: 0.0, doors: 0.0, fire: 0.0, caption: 'One sealed stainless cabinet on leveling feet — weatherproof and locked. 240×68×205 cm.' },
    { id: 'station', label: 'Open Station', roof: 1.0, doors: 0.0, fire: 0.0, caption: 'Both roofs up — brasero, wide parrilla, sink and counter, and the sealed smoker, all revealed and sheltered.' },
    { id: 'asado', label: 'Asado', roof: 1.0, doors: 0.0, fire: 1.0, caption: 'Brasero lit, coals raked under the parrilla, flames up — and the smoker running sealed, smoke curling from its flue.' },
    { id: 'smoker', label: 'Load the Smoker', roof: 1.0, doors: 1.0, fire: 1.0, caption: 'Cookbox doors open on three racks, firebox glowing below — a vertical smoker, smoke rising through the food.' },
  ];

  // initialise the build state: roof closed, doors closed, fire cold, grate 0.4 (SPEC §4 default)
  setRoof(0);
  setDoors(0);
  setFire(0);
  setGrate(0.4);

  // ---- dispose — free geometries + materials + ALL textures --------------------
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
    setRoof,
    setDoors,
    setFire,
    setGrate,
    // back-compat aliases (SPEC §4) — every old opener name now means "raise the roofs"
    setLid,
    setPod,
    setStation,
    getState,
    postures,
    parts,
    dispose,
    fitRadius: 235, // approx bounding radius (cm) for camera framing (wide 240 cm + high roofs)
  };
}
