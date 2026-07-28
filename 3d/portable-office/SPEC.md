# BUILD SPEC — Portable Office ("The Carry-On Studio")

Internal build spec for the 3D experiment. This is the single source of truth for
part naming, dimensions, deploy kinematics, and the JS module API. Two builders work
in parallel against this contract; they MUST NOT diverge from the names and API here.

Product working name: **STOWORK** (stow + work). Tagline: *"Your whole office. In a carry-on. In under two minutes."*

---

## 0. Product thesis (for copy + plan; keep consistent everywhere)

Remote/travel work strips you of everything that makes you fast and professional:
your keyboard, trackpad, a broadcast-grade mic, real headphones, a proper camera, and
above all **screen real estate**. A laptop gives you one cramped screen and a mushy
keyboard. STOWORK is a **carry-on-sized case that unfolds into a full three-monitor
workstation with pro AV in under two minutes**, then folds back down to airline-legal
carry-on dimensions.

It is NOT a laptop. It is a deployable office. Bring your own brain: drive it from your
laptop/phone over one cable (the "Dock" SKU), or dock your own **Mac mini / Mac Studio**
(or mini-PC) into the case's swappable compute bay (the "Core" SKU).

---

## 1. Physical envelope & why it's real

### Closed (stowed) — IATA carry-on legal
- External: **55 cm (W) × 35 cm (D) × 23 cm (H)** — within the common 56×36×23 cabin limit.
- Wheeled spinner case, telescoping pull handle, aluminum-frame clamshell.
- Target weight (case only): Dock SKU **7.9 kg**, Core SKU **8.2 kg** (compute bay + connector
  block + one cradle). Add your machine: **+0.67 kg** (Mac mini) or **+2.7 kg** (Mac Studio) —
  a Studio-loaded Core is ~10.9 kg, heavy but within US-domestic cabin allowances (flag strict
  10 kg carriers). Heaviest mass (battery) sits low over the wheels for balance.

### Deployed footprint on a standard desk/table
- Occupies roughly **60 cm deep × 95 cm wide** of desk once the monitor triptych is fanned.
- Requires only a chair and a table. Runs 4–6 h off internal battery, or AC passthrough.

### The three-monitor problem — how it actually fits
A 14" 16:10 panel is ~31 × 19.5 cm. Three side-by-side = ~93 cm wide, far wider than the
55 cm case. Solution: a **tri-fold triptych**. Center panel is fixed; two wing panels
hinge on vertical axes at the center panel's left/right edges and **fold flat, face-to-face,
over the center panel** when stowed. Stowed stack = ~31 × 19.5 × 2.4 cm (3 ultra-thin OLED
panels + hinges), which lies flat in the rear compartment of the base. Deployed, the wings
swing out ~35° each into a **curved, immersive 3-panel array** ~93 cm wide.

Panels are thin-film OLED (2026-plausible: ~1.2 mm glass-plastic laminate, matte AR coat).
Center panel **16"** (35×22 cm) optional as premium; spec uses uniform **14"** for a clean
stowed nest. Combined resolution target: 3× 2560×1600.

### Input
- **Keyboard:** low-profile mechanical, **TKL (tenkeyless, 36 cm)** sits in the front well of
  the base. TKL + trackpad inline = 36 + 16 = 52 cm, fits the 53 cm interior width exactly.
  (Full-size keyboard offered as a variant on a fold-out right wing that carries the trackpad.)
- **Trackpad:** 16 × 11 cm glass haptic pad, right of the keyboard.
- Keyboard sits on a **slide-out tray** that advances ~6 cm toward the user for wrist comfort.

### Pro AV (the things you lose on the road)
- **Microphone:** cardioid condenser capsule on a short **telescoping boom** that rises from
  the top-center bridge of the monitor assembly, angling down toward the user's mouth.
- **Camera:** 4K webcam module co-located on the bridge at eye level (center-top), so you look
  into it naturally instead of down at a laptop.
- **Headphones:** over-ear studio headphones stowed in a molded EVA cradle in the lid, charging
  on pogo pins. (Housed, not kinematically deployed — but modeled as a visible stowed object.)
- **Speakers:** stereo drivers in the base front edge.

### Lift / ergonomics
- The triptych rides a **rear 4-bar lift linkage** (gas-strut assisted) that raises it ~12 cm
  and rotates it from flat-stowed (screens up) to vertical, putting the center of the screen
  near seated eye level when the case is on a standard 74 cm desk.

### Power / compute
- Base holds a swappable **battery pack** (low, over the wheels).
- **Dock SKU:** one USB4/Thunderbolt cable to your laptop/phone drives all three displays + AV + power.
- **Core SKU:** the base carries a **compute bay** that hosts your own mini computer —
  a **Mac mini or Mac Studio** (or a mini-PC) — so the case is a complete desktop that
  travels with your real machine. (Replaces the old "built-in ARM module" idea: BYO
  compute is more powerful, upgradeable, and never obsolete.)

### Compute bay & swappable 3D-printed cradle  ← NEW, the differentiator
The base is packaged as a **left "engine-bay" third** (compute + battery) and a **right
two-thirds workspace** (keyboard in front, monitor triptych + lift at the rear, centered
on where the user sits). The engine bay contains:

- **Standardized compute bay:** a keyed **200 × 200 mm** opening, **100 mm** deep, in the
  base's left-rear. Sized to swallow the tallest target device (Mac Studio, 197×197×95 mm)
  and everything shorter. Alignment ribs + a **quarter-turn latch** seat a cradle in one drop.
- **Fixed blind-mate connector block** at the back of the bay: power-in, N× USB4/Thunderbolt,
  DisplayPort/HDMI to the internal 3-display driver board, and fan-sync. The case side never
  changes — only the cradle does.
- **Device-specific 3D-printed cradles (the swap mechanism):** a printed frame that drops into
  the 200×200 bay, holds one machine in a **pre-fit nested pocket**, and routes that machine's
  ports via a short captive loom to the fixed connector block. Swap machines = swap the cradle.
  - **Mac mini cradle:** 197×197 pocket, 36 mm deep, on a printed riser so the mini's top sits
    flush with the bay lip; airflow channel aligns the mini's perimeter intake / rear exhaust.
  - **Mac Studio cradle:** 197×197 pocket, ~95 mm deep — a minimal frame; the Studio nearly
    fills the bay.
  - **Generic mini-PC cradle:** parametric STL — print to any device's L×W×H + port map
    (Intel NUC, Framework Desktop, Beelink, etc.).
  - Cradles are **user-fabricable** (open STL family) or shipped, so future machines are a
    reprint, not a new case. Print-layer look is intentional and part of the identity.

Reference device dims: **Mac mini** 197×197×36 mm, **Mac Studio** 197×197×95 mm.
Ventilation: bay floor + rear louvers align to the device's intake/exhaust; the case rear
panel has matching exhaust cutouts behind the bay.

---

## 2. Deployment sequence — sub-2-minute, few-motion

Target: **≤ 110 seconds**, mostly gas-strut/motor-assisted single motions.

| # | Action | Time | Drives model part |
|---|--------|------|-------------------|
| 1 | Lay case flat, unlatch, lid swings back | 0–12 s | `lid` rotation |
| 2 | Raise monitor lift; bridge tilts flat→vertical | 12–40 s | `liftMast`, `monitorBridge` |
| 3 | Fan the two wing monitors open | 40–62 s | `wingLeft`, `wingRight` |
| 4 | Extend mic/camera boom | 62–78 s | `boom` |
| 5 | Slide keyboard tray out, flip trackpad, power on | 78–105 s | `keyboardTray`, `trackpad`, `powerLED` |

This maps to a single normalized **deploy parameter `t ∈ [0,1]`**.

### Named stages (for scrubber ticks + hero buttons) — USE THESE EXACT labels & t values
```
STAGES = [
  { t: 0.00, id: "stowed",   label: "Stowed",            caption: "55×35×23 cm. Airline carry-on legal." },
  { t: 0.15, id: "opened",   label: "Opened",            caption: "Lay flat, unlatch, lid swings clear." },
  { t: 0.45, id: "monitors", label: "Monitors Up",       caption: "Gas-strut lift raises the display to eye level." },
  { t: 0.70, id: "triptych", label: "Triptych Deployed", caption: "Two wings fan into a curved 3-screen array." },
  { t: 0.85, id: "av",       label: "AV Boom",           caption: "Broadcast mic + 4K camera rise to your face." },
  { t: 1.00, id: "ready",    label: "Ready to Work",     caption: "Keyboard forward. Power on. Under two minutes." }
]
```

---

## 3. 3D model coordinate frame & part kinematics

**Frame:** right-handed. `+X` = right (width), `+Y` = up, `+Z` = toward the viewer/user (depth).
Units: **1 world unit = 1 cm.** Model built roughly to real dimensions, then the camera framed to fit.
Origin: center of the base footprint on the table; table surface at `y = 0`, base sits on it.

**Materials (shared look):** dark anodized-aluminum shell (matte, metalness ~0.6, roughness ~0.5,
color #2b2f36), soft-black interior, screens = emissive panels (subtle UI glow, color #10151c with
emissive #2f6d8f at low intensity), accent trim in a warm brand color **#e6a15c** (amber). Neutral
studio lighting: one key, one fill, soft ground shadow. No textures required (procedural only).

### Part hierarchy (Three.js `Group`s) and hinge behavior

All rotations are eased over the given `t` sub-range; **clamp** outside the range (a part holds its
end state before/after its window). Suggested easing: smoothstep.

- `root` (Group) — everything.
  - `caseBase` (Group, static) — bottom shell. Box ~53(x)×11(y)×35(z), centered, resting on table (bottom at y=0).
    Packaged as a **left engine-bay third** (compute + battery) and a **right two-thirds workspace**.
    - Contains: `batteryBlock` (visual), `computeBay` (Group), `keyboardTray` (Group), `trackpad` (Group), rear compartment.
    - `computeBay` (Group, static) — a recessed **200×200 mm well** in the base's LEFT-rear quadrant
      (roughly x∈[-25,-6], z∈[-16,+3], open top, dark interior, subtle amber keyed rib on one wall).
      Visible when the lid is open. Holds two nested children:
      - `computeDevice` — a mini-computer block, ~19.7×19.7 cm footprint, height ~6 cm (represent a
        Mac-mini-class machine; brushed-aluminium look #c8ccd0, dark top disc + a dark rear port strip).
        Keep it generic (no logos/trademarks) — it reads as "your mini computer."
      - `computeCradle` — a **3D-printed-looking** frame hugging the device (contrasting MATTE plastic,
        e.g. warm grey #6c6f74 or amber; slightly ribbed/print-layer feel via geometry if easy). Reads as
        the swappable printed holder. Sits between device and bay walls, with a small front lip/latch.
      - To keep the workspace centered on the seated user, shift `liftAssembly` + `keyboardTray` +
        `trackpad` right to a workspace center of ~x=+7 (so they clear the left engine bay). This offset
        is desirable but SECONDARY — do NOT break the existing deploy kinematics to achieve it; if a clean
        offset is awkward, keep them centered and simply place the bay/battery in the remaining left space.
    - `keyboardTray` — slides in +Z by up to +6 cm over t∈[0.85,1.0]. Holds the `keyboard` mesh (TKL, low keys grid).
    - `trackpad` — small panel right of keyboard; a subtle flip-up (rotate ~ -8° to flat) over t∈[0.88,1.0].
    - `powerLED` — small emissive dot; emissive intensity ramps 0→1 over t∈[0.95,1.0].
  - `lid` (Group) — top clamshell shell, **hinged along rear-top edge of base** (pivot at the base's back-top: pivot at y≈+11, z≈-17.5, rotation about X axis). Closed at t=0 (lid rotated forward/down covering base, i.e. rotationX ≈ +... so the lid lies over the base). Opens to ~110° back over t∈[0.0,0.15]. Lid inner face carries the `headphoneCradle` + stowed headphones (visible when open).
  - `liftAssembly` (Group) — mounted at the REAR of the base (z≈-12). This is the display + AV, raised by the lift.
    - `liftMast` — represents the 4-bar linkage/telescoping post. Over t∈[0.15,0.45]: translate the whole `liftAssembly` up in +Y by ~12 cm AND the `monitorBridge` rotates from horizontal (screens facing up, stowed flat) to vertical (screens facing +Z toward user). Model the tilt as rotationX from ~ -90° (flat) to 0° (upright) over the same range. Keep motion readable.
    - `monitorBridge` (Group) — the top cross-member holding center panel + boom.
      - `monitorCenter` — fixed panel on the bridge, faces +Z. ~31(x)×19.5(y)×0.4(z) screen with thin bezel.
      - `wingLeft` (Group) — hinged on a VERTICAL axis (Y) at the LEFT edge of `monitorCenter`. Stowed (t<0.45): folded flat over the front of center (rotationY ≈ +170°, panel lying against center). Deployed (t≥0.70): swung out to ~ +35° from the center plane, forming the left of the curved array. Interpolate rotationY over t∈[0.45,0.70].
      - `wingRight` (Group) — mirror of wingLeft on the RIGHT edge, rotationY negated.
      - `boom` (Group) — telescoping arm rising from bridge top-center. Over t∈[0.70,0.85]: extend up ~10 cm (scale/translate a thin cylinder) and pivot the mic head to angle down toward user. Holds `micCapsule` (small cylinder/foam ball) and `cameraModule` (small box with a lens dot). Camera lens gets a tiny emissive ring.
  - Optional `ground` shadow-catcher handled by the app scene, not the model.

### Stowed sanity check (t=0)
At t=0 the silhouette must read as a **closed rectangular carry-on**: lid closed over base, lift down,
triptych flat inside, boom retracted. Overall bounding box ≈ 53×23×35 (W×H×D) — i.e. a carry-on lying flat.
(The upright glamour render with pull-handle + wheels is a SEPARATE static hero pose the app may add; the
scrubber model deploys from the flat-closed clamshell.)

---

## 4. JS MODULE API — hard contract between the two builders

### `src/caseModel.js` (Model Builder owns)
**Classic script (NOT an ES module).** `THREE` is a global from `vendor/three.min.js` (r128)
loaded before this file; defines the global `createPortableOffice()` (no import/export). This
is required so the page runs from `file://` with no server — do NOT reintroduce ES modules,
importmaps, or CDN URLs. r128 note: use `renderer.outputEncoding = THREE.sRGBEncoding`.

```js
import * as THREE from 'three';

// Build and return the parametric rig.
export function createPortableOffice() {
  // ...builds the hierarchy above...
  return {
    root,                 // THREE.Group — add this to the scene
    setDeploy(t),         // (number 0..1) -> void; positions ALL parts for that t. Clamps input.
    getDeploy(),          // -> current t
    stages,               // the STAGES array from section 2 (id,label,caption,t)
    parts,                // { lid, liftAssembly, monitorBridge, wingLeft, wingRight, boom, keyboardTray, ... } for debugging
    dispose(),            // free geometries/materials
    fitRadius,            // number: approx bounding radius (cm) at t=1, so the app can frame the camera
  };
}
```
Rules:
- `setDeploy` must be idempotent and smooth for ANY t (used for animated scrubbing).
- No dependence on window/DOM. Pure scene graph. Lights/camera/renderer are the app's job.
- Self-contained: also write `src/caseModel.test.html` — a minimal standalone page (classic
  `<script>` tags: `../vendor/three.min.js`, `../vendor/OrbitControls.js`, `./caseModel.js`, then
  an inline scene script + range slider) that renders it and lets a human scrub t from `file://`.
  This is the model's self-verification harness.

### `src/app.js` (Page Builder owns) — consumes the API above
- Sets up renderer (antialias, ACES tone mapping, `setPixelRatio(min(devicePixelRatio,2))`), scene,
  fog-free neutral background, key+fill lights, a soft ground shadow plane, `OrbitControls`
  (damping on, no pan past ground, sane min/max distance using `fitRadius`).
- Imports `createPortableOffice`, adds `.root` to scene.
- Drives `setDeploy` from: (a) the scrubber slider, (b) stage buttons (jump/animate to a stage t),
  (c) an optional scroll-driven mode in the "See it deploy" section.
- Handles resize, and pauses rAF when the canvas is offscreen (IntersectionObserver) for perf.
- Exposes nothing globally except maybe `window.__stowork` for debugging.

### File ownership (NO overlap — prevents collisions)
- **Model Builder:** `src/caseModel.js`, `src/caseModel.test.html` ONLY.
- **Page Builder:** `index.html`, `style.css`, `src/app.js` ONLY.
- **Plan Writer:** `PLAN.md` ONLY.
- Orchestrator integrates, adds `../index.html` hub + `README.md`, and verifies.

---

## 5. Landing page requirements (Page Builder)

Static `index.html` + `style.css` + `src/app.js`. Three.js is **vendored locally** and loaded as
classic `<script>` tags (`vendor/three.min.js` r128, `vendor/OrbitControls.js`, `src/caseModel.js`,
`src/app.js`) — NOT ES modules/importmap/CDN. **Must run from `file://` with no server** (this is
the hard scoping) and also works on GitHub Pages. No build step.

Sections, in order:
1. **Hero** — big product name STOWORK, tagline, one-line pitch, primary CTA ("See it deploy ↓" and
   "Read the plan"). A live 3D canvas showing the deployed workstation slowly auto-rotating. Buttons to
   snap the hero model between "Stowed" and "Ready to Work".
2. **The problem** — short, punchy: what you lose on the road (screens, keyboard, trackpad, mic,
   headphones, camera). Icon row or terse list. Confident, not whiny.
3. **See it deploy** (THE interactive centerpiece) — a large 3D canvas + a **scrubber slider (0–100%)**
   with the 6 stage ticks/labels from section 2. Dragging scrubs the model through the full
   open/set-up sequence live. Stage buttons animate to each stage. Show the current stage caption + a
   running "setup clock" that reads the elapsed deploy time mapped to the 110 s budget. Include a
   "Play deployment" button that animates t 0→1 over ~6 s.
4. **The layout that makes it work** — annotated spec: dimensions (stowed vs deployed), the triptych
   fold explanation, input, AV, lift, power/compute (Dock vs Core SKUs), and the **compute bay +
   swappable 3D-printed cradle** (Mac mini / Mac Studio / mini-PC). Use the real numbers from
   sections 1–2. Small 3D or diagrammatic callouts welcome.
5. **Three states gallery** — three side-by-side mini 3D views (or snapshots) at Stowed / Triptych /
   Ready — the "different 3D models in different states" requirement. Each independently orbitable OR a
   shared canvas with three labeled poses.
6. **Built to be built** — three cards: **Original by design** (what makes it original & hard to copy), **Manufacture** (BOM/DFM
   readiness), **Invest** (market + ask). Each links to the relevant part of PLAN.md.
7. **Specs table** — condensed tech specs.
8. **CTA / footer** — "Read the full plan (PLAN.md)", back-link to the 3D experiments hub.

Design bar (per house style): cinematic, generous whitespace, real typographic hierarchy, dark studio
aesthetic matching the model materials, amber (#e6a15c) accent, tasteful motion, **mobile-safe and
no-JS-crash** (if WebGL/three fails to load, sections still render with a graceful fallback message in
each canvas slot — never a blank white void). Respect `prefers-reduced-motion` (no auto-rotate/auto-play).

---

## 6. PLAN.md requirements (Plan Writer)

A serious, credible document you could hand to a design engineer, a contract manufacturer, and an
investor. Use the real numbers and mechanisms from sections 1–3. Structure:

1. **Executive summary** — the product, the wedge, the ask.
2. **Problem & market** — remote/hybrid/travel worker pain; TAM/SAM/SOM with sourced-style estimates
   (label assumptions clearly; this is a concept plan, so state figures as reasoned estimates, not
   fabricated citations).
3. **Product definition** — full physical design: stowed/deployed dimensions, the triptych fold, lift
   linkage, input, AV, power, the two SKUs (Dock / Core), and the compute bay + swappable printed
   cradle system (Mac mini / Mac Studio / mini-PC; dims from §1). Include a deployment-sequence walkthrough
   and the ≤110 s budget table.
4. **Engineering & mechanism detail** — hinge/linkage design, materials, thermal, weight budget table,
   battery/runtime math, display driver/bandwidth reasoning, structural load paths, reliability
   (hinge cycle life target), ingress/durability.
5. **Design & differentiation** — what makes STOWORK original and hard to copy: the integrated
   *combination* (carry-on envelope + tri-fold 3-monitor + integrated pro AV + sub-2-min few-motion
   deploy + lift-to-eye-level) framed against laptops, portable monitors, and briefcase workstations;
   why the airline-carry-on constraints make it a genuine engineering achievement; and the durable
   brand/quality/ecosystem moat. Note the concept assets to produce and the brand/naming plan.
6. **Manufacturing & DFM** — indicative **BOM** (line items with rough cost bands), key suppliers by
   category, assembly steps, tooling/NRE estimate, unit cost at volume, target MSRP + margin, quality
   plan. Prototyping path (looks-like → works-like → DVT/PVT).
7. **Go-to-market** — segments (consultants, execs, creators, field engineers, digital nomads),
   pricing (Dock vs Core), channel, positioning vs laptop + portable-monitor status quo; lean into
   the "bring your own Mac mini / Mac Studio, swap it later with a reprinted cradle" story.
8. **Financials & the ask** — use-of-funds, milestones, rough P&L shape, the raise.
9. **Risks & mitigations** — technical, market, competitive, supply chain.
10. **Roadmap / milestones** — concept → prototype → brand/design lock → DVT → crowdfund/preorder → production.

Tone: confident, specific, numerate. Clearly frame all figures as reasoned concept-stage estimates
(do NOT invent fake citations or real-company endorsements). Markdown, well-structured headings, tables.

---

## 7. Verification checklist (Orchestrator)
- [ ] `caseModel.test.html` loads three via vendored classic scripts (file://) and renders without console errors; slider scrubs 0→1.
- [ ] At t=0 silhouette reads as a closed carry-on; at t=1 the 3-monitor office is fully deployed & sensible.
- [ ] `index.html` loads, hero renders, scrubber drives the full sequence, stage buttons work.
- [ ] Graceful fallback if WebGL unavailable (no white void, no thrown-uncaught crash).
- [ ] Mobile viewport doesn't overflow; `prefers-reduced-motion` honored.
- [ ] PLAN.md is complete, numerate, and internally consistent with the model's dimensions.
- [ ] Hub `../index.html` links to the experiment; `README.md` present.
