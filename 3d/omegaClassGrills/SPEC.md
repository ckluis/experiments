# BUILD SPEC — omegaClass (v6: the Zoned Asado + Smoke Station)

Source of truth for the omegaClass 3D experiment. **This is the persona-validated redesign.** It keeps
the reference-photo idea (a stainless outdoor-kitchen cabinet whose front lifts into a roof) but makes it
a WIDER, ZONED unit so a master asador and a master pitmaster can both actually work on it — with real
counter/landing space, a dedicated brasero, and a proper vertical smoker.

Two+ builders work in parallel against this contract; do not diverge from names/API here.

Product: **omegaClass** — working tagline *"One cabinet. Every fire."* (Ω motif.)

> **NO PATENT / IP LANGUAGE ANYWHERE.** Frame novelty as design originality / engineering rigor, never legal.

---

## 0. Product thesis — validated against how the masters actually cook

Closed, omegaClass is one sealed, weatherproof stainless cabinet. Open, it's a full **outdoor fire station**
laid out left-to-right in three zones so two experts can work at once without fighting for space:

- **The asador's zone** (open fire): a **dedicated brasero** (ember maker) beside a **wide crank-lift
  parrilla**. He burns wood down in the brasero and rakes glowing coals under the grate — the real Argentine
  method — riding the crank for heat, with **landing counter** right there to rest and plate.
- **The pitmaster's zone** (smoke): a **vertical cabinet smoker** — an insulated chamber with **dual cabinet
  doors** and multiple **racks**, heated from a **firebox BELOW** (smoke rises up through the food), vented by
  a top flue. Load racks, seal the doors, tend the fire below, wrap on the counter.
- **The shared prep zone**: a **sink + faucet + counter** for prep, plating, and wrapping.

Overhead, **two independent lift-up roof lids** (the photo's move) shelter each half of the station — raise
only the zone you're using. It rises straight up/forward into a high roof, never blocking the cook.

Why this beats the old config: the previous unit stacked a grill and smoker vertically shoulder-to-shoulder
with almost no counter — neither master could work. Going **wider and zoned** gives each their fire, their
technique, and their landing space.

---

## 1. Physical envelope & why it's real (use these numbers)

### The cabinet (closed)
- A wide stainless cabinet: **240 cm (W) × 68 cm (D) × 205 cm (H)**, marine/powder-coat stainless, on
  adjustable **leveling feet**. Closed = a sealed weatherproof monolith (two roof lids down, cookbox doors shut).
- Counter working height ~**92 cm**. Left-to-right zones (origin-centered X; see §3): **prep+sink** (left),
  **parrilla+brasero** (center), **vertical smoker cookbox** (right).

### Zone A — prep + sink (LEFT, ~60 cm)
- Stainless/butcher-block **counter**, a **sink** + gooseneck **faucet**, a cutting board, landing space,
  and **lower cabinets/drawers** below. This is the shared prep/plate/wrap surface.

### Zone B — parrilla + brasero (CENTER, ~90 cm) — the asador
- A **dedicated brasero** (~35 cm, left of the grate): a firebox that burns wood/charcoal down to embers,
  with a slot/ledge to **rake coals under the grate**.
- A **wide V-channel parrilla grate** (~55 cm) on a **crank lift** (~15 cm range) over an ember bed; fat
  drains to a channel → grease cup. **Landing counter** beside it (part of the prep zone / a ledge).

### Zone C — vertical smoker cookbox (RIGHT, ~90 cm) — the pitmaster
- An **insulated double-wall chamber** with **dual front cabinet doors** (each ~44 cm, hinged at the outer
  edges, swing open to reveal the racks; glass window optional) and **3 stacked racks** inside.
- Heated from a **firebox BELOW** the chamber (a fire/ember box at the base; smoke + heat rise up through the
  racks — a vertical/cabinet smoker), an intake damper low, and a **flue on top** (smoke out; smoke visible
  when the doors are closed + fire lit). A fire-access door on the below firebox.

### Overhead — two independent lift-up roof lids
- **`lidL`** shelters the prep + parrilla half; **`lidR`** shelters the cookbox half. Each is a stainless panel
  (corrugated underside), **hinged at the top-back**, lifting **up and forward ~100°** on visible gas struts
  into a **high overhead roof** (front edge ~**230 cm**). Each carries an underside task light. Raise
  independently. Closed, they seal the top.

### Materials / feel
Brushed + polished marine stainless, warm wood/butcher-block counter, matte-black firebox interiors, corrugated
roof undersides, glass cookbox-door windows, glowing embers, curling smoke, visible gas struts, leveling feet.

### Footprint / weight
Closed ~240×68×205 cm. Open: lids cantilever forward ~130 cm as roofs; full front access to all three zones.
Weight target ~**300 kg** (a large all-stainless station).

### Why it's distinctive (design originality — NO patent language)
One sealed stainless cabinet that opens into a complete asado + smoke station: a brasero-fed parrilla AND a
vertical rack smoker AND real prep/sink/counter/storage, sheltered by lift-up roofs — genuinely usable by a
master asador and a master pitmaster at once. Frame as design/engineering originality, never IP.

---

## 2. Control axes & named postures

THREE independent normalized parameters (+ one minor):
- **roof** `r ∈ [0,1]` — 0 both lids down (sealed) → 1 both lids raised into overhead roofs, task lights on,
  station revealed. (The two lids move together under this one control for the demo; independent raise is a
  real-product feature noted in copy.)
- **doors** `d ∈ [0,1]` — 0 cookbox dual doors closed (sealed to smoke) → 1 doors swung open to the sides,
  racks revealed.
- **fire** `f ∈ [0,1]` — 0 all cold → 1 everything lit: **brasero + parrilla embers glow, flames over the
  grate**, the **cookbox firebox-below glows**, and **smoke rises from the cookbox flue when its doors are
  closed** (`∝ f × (1 − d)`).
- **grate** `g ∈ [0,1]` — parrilla grate height. Default 0.4.

Per-part windows (smoothstep; CLAMP): lids lift `r∈[0,0.85]`, task lights `r∈[0.6,1]`; cookbox doors swing
`d∈[0,0.9]`; brasero/parrilla/firebox glow `f∈[0.2,1]`, parrilla flames `∝ f`, cookbox smoke `∝ f×(1−d)`,
intake damper `f∈[0.1,0.4]`; grate Y over `g∈[0,1]`.

**Named postures** — USE THESE EXACT ids/labels/values:
```
POSTURES = [
  { id: "closed",  label: "Closed",        roof: 0.0, doors: 0.0, fire: 0.0, caption: "One sealed stainless cabinet on leveling feet — weatherproof and locked. 240×68×205 cm." },
  { id: "station", label: "Open Station",  roof: 1.0, doors: 0.0, fire: 0.0, caption: "Both roofs up — brasero, wide parrilla, sink and counter, and the sealed smoker, all revealed and sheltered." },
  { id: "asado",   label: "Asado",         roof: 1.0, doors: 0.0, fire: 1.0, caption: "Brasero lit, coals raked under the parrilla, flames up — and the smoker running sealed, smoke curling from its flue." },
  { id: "smoker",  label: "Load the Smoker",roof: 1.0, doors: 1.0, fire: 1.0, caption: "Cookbox doors open on three racks, firebox glowing below — a vertical smoker, smoke rising through the food." }
]
```

---

## 3. 3D model — coordinate frame, part hierarchy, kinematics

**Frame:** `+X` right, `+Y` up, `+Z` toward viewer (front). **1 unit = 1 cm.** Origin at cabinet footprint
center; ground `y = 0`. Zone centers along X: **prep** ~x=−90, **parrilla+brasero** ~x=−15 (brasero ~x=−45,
grate ~x=+5), **cookbox** ~x=+80.

**Art direction (flawless bar):** marine stainless `MeshPhysicalMaterial` (metalness high, roughness ~0.25–0.4,
**clearcoat**) + a **procedural equirectangular studio env map** (`DataTexture`, `EquirectangularReflectionMapping`)
on ALL metals/glass. Warm **wood** counter; **corrugated** roof undersides. Rounded/beveled edges (`roundedBoxGeo`).
Embers: instanced coals + hot ember-bed emissiveMap (brasero, parrilla, cookbox firebox); smoke: soft translucent
plume from the cookbox flue ∝ f×(1−d); flames: additive licks over the parrilla ∝ f. Molten-accent Ω + dampers.
Textures ≤1024, procedural only.

**Part hierarchy (Groups) — keep names; expose all in `parts`:**
- `root`
  - `cabinet` (Group, static): `carcass` (wide shell + zone dividers), `backWall`, `feet` (4 leveling), Ω `badge`.
    - **prep zone**: `counter` (wood), `sink` (+ `faucet`), `cuttingBoard`, `lowerCabinets`, `drawers`, `toolHooks`.
    - **parrilla zone**: `brasero` (`braseroBody`, `braseroLogs`, `braseroEmbers`, rake ledge), `parrilla` = `grate`
      (V-ribs, raised by `g`) + `crank`, `emberBed` (+ instanced `coals`), `flameGroup`, `greaseChannel`+`greaseCup`, `landingLedge`.
    - **cookbox zone**: `cookboxBody` (insulated), `cookboxDoorL`/`cookboxDoorR` (dual doors, hinged OUTER edges,
      swing open with `d`; each has `windowL`/`windowR` glass), `racks` (3 stacked grill racks), `fireboxBelow`
      (`fireboxBody`, `fireboxDoor`, `fireboxLogs`, `fireboxEmbers` glow with `f`, `fireboxDamper`), `cookFlue`
      (+ `flueDamper`, `flueCap`) + `smokePlume` (opacity ∝ f×(1−d)), `cookTaskLight`.
  - `roof` (Group):
    - `lidL` — over prep+parrilla, hinged top-back, lifts up-forward with `r`; `lidPanelL` (corrugated), `strutL1`/`strutL2`, `lightL`.
    - `lidR` — over cookbox, hinged top-back, lifts up-forward with `r`; `lidPanelR` (corrugated), `strutR1`/`strutR2`, `lightR`.

**Kinematics** per §2. `roof`, `doors`, `fire`, `grate` INDEPENDENT and composable. Setters clamped/idempotent.
Sanity: (r0,d0,f0)=sealed wide cabinet ~240×205×68; (r1,·,·)=both lids up into HIGH overhead roofs (front edges
~230 cm, front clear), the three zones revealed; (·,d1,·)=cookbox doors swung to the sides, 3 racks visible;
(·,·,f1)=brasero+parrilla flames + cookbox firebox-below glowing + smoke from the cookbox flue when doors closed.
Cookbox doors hinge at OUTER edges (open to the sides); roof lids hinge at TOP-BACK and lift UP/forward (never
low forward gates); the smoker firebox is BELOW the rack chamber (vertical smoker).

---

## 4. JS MODULE API — hard contract (classic script, NOT a module)

### `src/grillModel.js` (Model Builder owns)
**Classic script. `THREE` GLOBAL (r128). GLOBAL `function createOmegaGrill()`. NO import/export/IIFE/CDN.**

```js
function createOmegaGrill() {
  return {
    root,
    setRoof(r),           // 0..1 — raise/lower BOTH lift-up roof lids
    setDoors(d),          // 0..1 — open/close the vertical smoker's dual cabinet doors
    setFire(f),           // 0..1 — light brasero + parrilla + cookbox firebox; flames + smoke
    setGrate(g),          // 0..1 — parrilla grate height (default 0.4)
    getState(),           // -> {roof,doors,fire,grate}
    postures,             // exact POSTURES array from §2 (id,label,roof,doors,fire,caption)
    parts,                // { cabinet, roof, lidL, lidR, brasero, parrilla, grate, cookboxBody, cookboxDoorL, cookboxDoorR, racks, fireboxBelow, sink, counter, ... }
    dispose(), fitRadius,
  };
}
```
Back-compat aliases: **`setLid = setPod = setStation = setRoof`**; **`setPitDoors`** not needed. Default build:
roof 0, doors 0, fire 0, grate 0.4. Write `src/grillModel.test.html` (classic scripts + roof/doors/fire/grate
sliders + posture buttons; file://).

### `src/app.js` (Page Builder owns) — KEEP the shared-renderer engine
- KEEP the ONE shared `WebGLRenderer` + scissor-per-`.viz`-slot engine (exactly ONE `new THREE.WebGLRenderer(`,
  IIFE-wrapped, fallback/self-diagnostic). Classic script, `outputEncoding=sRGBEncoding`.
- Configurator now has **THREE** scrubbers: **"Open the roof"** → `setRoof`, **"Open the smoker"** → `setDoors`,
  **"Light the fires"** → `setFire`, + minor grate. The 4 posture presets `closed/station/asado/smoker` (roof+
  doors+fire) with animated tweens + §2 captions. Drive from `getState()` → {roof,doors,fire,grate}.

### File ownership: Model → `src/grillModel.js`+test; Page → `index.html`,`style.css`,`src/app.js`; Plan → `PLAN.md`.

---

## 5. Landing page — art direction (molten-steel cinematic + stainless/wood; NO patent)

Keep the look. Rewrite copy for the WIDER ZONED ASADO + SMOKE STATION (three zones: prep+sink / parrilla+brasero /
vertical smoker; two lift-up roof lids). Lead with the persona truth: built so a master asador AND a master
pitmaster can both work it. Sections: 1) Hero (wordmark + Ω + tagline "One cabinet. Every fire." + auto-rotating
model, CTAs); 2) The three moves (**roofs lift** to shelter the station · the **smoker's doors open** on its racks ·
the **fires light** — brasero-fed parrilla + vertical smoker); 3) **Configurator** (three scrubbers "Open the roof" /
"Open the smoker" / "Light the fires" + grate + the 4 postures); 4) Anatomy (real §1 numbers — the two lift-up roof
lids + struts; the brasero + wide crank parrilla; the vertical smoker: dual doors + 3 racks + firebox below + flue;
the prep/sink/counter/storage; materials); 5) Postures gallery; 6) "Why it's different" (a whole asado + smoke
station in one sealed cabinet — validated for real cooks — design/engineering originality, NO patent); 7) Reserve
($12,500, spec → PLAN.md); 8) Footer (Ω, `../../index.html`). Responsive/mobile-safe.

---

## 6. PLAN.md — requirements (Plan Writer) — NO patent; the zoned station

Rewrite for the wider zoned asado+smoke station (prep+sink / brasero+crank-parrilla / vertical smoker with dual
doors + racks + firebox-below + flue; two independent lift-up roof lids; sealed cabinet closed). Product def, the
3+1 postures, engineering (two lid hinges + gas struts + wind/anti-tip; dual cookbox doors + seals; vertical-smoker
draft/smoke physics fire-below-through-racks; brasero + crank grate; insulated chamber; materials; weight budget
summing to ~**300 kg**; stability; weatherproofing/locking), **"Design & differentiation"** (a complete two-master
station in one cabinet vs Acuarinox/Keveri/kamado/vertical & offset smokers/prefab kitchens — NO patent), DFM/BOM
for a large stainless station, MSRP **$12,500** (or justify — it's now a bigger, richer unit; keep consistent),
GTM, financials, risks, roadmap. Numerate, concept-stage estimates labeled, no fabricated citations.

---

## 7. BUILD CONVENTIONS — non-negotiable
- Classic scripts only; vendored `vendor/three.min.js` (r128) + `vendor/OrbitControls.js`; `<script defer>` order
  three → OrbitControls → grillModel.js → app.js. NO ES modules/importmap/CDN. Runs from `file://`, no server.
- grillModel.js = classic global `createOmegaGrill` (no IIFE); app.js = IIFE-wrapped; **keep the ONE shared renderer**.
- Graceful fallback + self-diagnostic; `dispose()` frees geometries+materials+textures. **NO patent/IP language** anywhere.

## 8. Verification checklist (Orchestrator)
- [ ] `node --check` both JS; no ES modules; app.js IIFE-wrapped; exactly ONE `new THREE.WebGLRenderer(`.
- [ ] Loads from `file://`: `createOmegaGrill` global, builds, all parts present, no console error; setRoof/setDoors/setFire + aliases exist.
- [ ] (r,d,f,g) sane: roofs lift UP into high overhead roofs; cookbox doors open to the SIDES revealing racks; smoker firebox is BELOW; smoke only when cookbox doors closed + lit; wide zoned silhouette ~240 cm.
- [ ] `grep -riE "patent|intellectual property|prior art"` across the experiment (excluding SPEC meta-notes) = EMPTY.
- [ ] Hub card + poster updated to the wider zoned station; README present.

---

## 9. v6.1 QUALITY REFINEMENTS (from live renders — the bar was not met)

Rendered the model (Chrome+SwiftShader) and found real quality gaps. Fix ALL of these; iterate WITH renders.

1. **CLOSED = a fully finished, sealed box.** Today the lift-up lids cover only the upper front and leave the
   lower storage band exposed — unfinished. FIX: give the entire LOWER front (all zones, counter-height down to
   the toe-kick) proper **cabinet doors + drawer fronts** that are always finished, so `roof=0,doors=0` reads as
   one clean sealed stainless monolith (upper lids + lower cabinet doors meet cleanly, no gaps, no open shelves).
2. **PREMIUM brushed stainless — not flat gray.** The steel currently reads matte gray. Make it look like real
   marine stainless: `MeshPhysicalMaterial` metalness 1.0, roughness ~0.28, **clearcoat 0.4**, and BOOST
   `envMapIntensity` (~1.2–1.6) so the studio env map actually reflects. Brighten the env map (add a strong
   sky/softbox gradient) so panels have gradient reflections + bright edges. Warm wood counters read wood, not tan.
3. **Parrilla zone — make it a real asador station.** WIDER grate; add an **overhead hanging rack**: a horizontal
   bar above the fire with **S-hooks** and a couple of hanging items (a sausage coil / hook), and a tool rail —
   asadores hang things over the coals. A more substantial **brasero** beside it.
4. **Dried wood below the grill.** Add a visible **wood-store rack** under the parrilla holding **split dried logs**
   (stacked, warm wood) — shows the fuel + how it feeds the brasero. Reads as real and purposeful.
5. **Bigger prep zone.** Widen the prep area: sink + gooseneck faucet AND a **wood cutting board** + open prep
   counter beside it (landing space). More usable counter.
6. **Real smoker.** Refine the vertical smoker: a proper **baffle/diffuser plate** above the below-firebox so heat
   spreads before rising through the 3 racks (reverse-flow feel), cleaner rack rails, a refined **flue** (a proper
   stack + cap, not a toy funnel), tidy dual doors with real handles + glass.
7. **Refine cabinets + hardware overall.** Consistent tubular/bar handles, crisp reveals/seams, clean toe-kick,
   refined leveling feet, the corrugated roof underside reading clearly. Everything should look manufactured, premium.

Keep the API/axes/postures/part-names from §2–4 (extend `parts` with new pieces: lowerDoors, hangRack, hooks,
woodStore, logs, cuttingBoard, baffle, etc.). Keep classic-script/global/one-renderer/no-patent conventions.

## 10. v6.2 LID + STRUT REVISION (from render review)
- **Full-height lids for a clean closed face.** Each lift-up lid must cover its zone's FULL front height (top
  down to just above the toe-kick), so `roof=0` reads as ONE clean flush stainless front (two full-height lid
  panels + a center seam) — NOT an upper-lid band over a separate lower-cabinet band. The lower cabinet fronts
  stay (revealed when the lids lift), but closed they're hidden behind the lids.
- **Natural awning, not scaffolding.** Lids open to a MODERATE near-horizontal awning (a gentle overhead roof
  extending forward at roughly cabinet-top height ~205 cm), NOT tilted steeply up. Use exactly **TWO gas struts
  per lid**, mounted DIAGONALLY (bottom end low on the cabinet body/front, top end on the lid underside partway
  out) so they read as real gas struts at ~40–55°, not a row of vertical posts. Keep the solid top-back hinge
  barrels. Tune roof cantilever/pitch by rendering until it looks like a well-engineered awning (Rumi-photo feel).
