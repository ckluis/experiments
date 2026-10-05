# omegaClass — one cabinet, every fire

A browser-based 3D concept for a **single wide stainless outdoor-kitchen cabinet** that opens into a
complete **asado + smoke station**. Closed, it's a sealed weatherproof monolith. Open, it lays out
left-to-right into three zones — a **prep + sink** counter, a **brasero-fed Argentine parrilla**, and a
**vertical rack smoker** — sheltered by **two independent lift-up roofs**. Designed and checked against
how a master **asador** and a master **pitmaster** actually cook, so both can work it at once.

> *"One cabinet. Every fire."*

## What's here

| File | Purpose |
|------|---------|
| `index.html` | The product page: hero → closed/open idea → a to-scale front elevation of the three zones and two cooks → zone cards → a live 3D **configurator** (four posture presets with thumbnails, three scrubbers + grate) → specs, engineering and weight budget → comparison matrix → the plan (price bands, unit economics, roadmap). Every section is visible without JavaScript; the configurator shows a static render until WebGL is running. |
| `PLAN.md` | The full concept plan: product, engineering, **design & differentiation** (a complete two-master station in one cabinet), manufacturing/DFM (BOM, COGS, MSRP $21,000), go-to-market, financials, the ask. |
| `SPEC.md` | Internal build spec — dimensions, the three-transformation kinematics, the module API, art direction, and build conventions. |
| `src/grillModel.js` | The parametric Three.js rig. Global `createOmegaGrill()` → `{ root, setRoof, setDoors, setFire, setGrate, getState, postures, parts, dispose, fitRadius }` (with setLid alias). Three independent axes + grate. |
| `src/app.js` | Scene/app: **one WebGLRenderer** for the configurator, cinematic lighting, OrbitControls (orbit only, no wheel hijack), the scrubbers + posture tweens, ember flicker, render-on-demand that pauses off screen, context-loss and no-WebGL fallbacks to the poster render, and transform-only scroll reveals. **IIFE-wrapped**. |
| `src/grillModel.test.html` | Standalone model harness — roof/doors/fire/grate sliders + posture buttons. |
| `vendor/` | Three.js r128 + classic OrbitControls, vendored so the page runs from `file://`. |

## Run it

**Just open `index.html` in a browser** — no server, no build step, no network. Three.js is
vendored locally and loaded as classic `<script>` tags (not ES modules, which browsers block over
`file://`). Requires WebGL; without it, each canvas shows a readable fallback and the page stays intact.

## The design, in one paragraph

A wide stainless **cabinet**, 240 × 68 × 205 cm on leveling feet, ~300 kg, sealed weatherproof when shut.
**Open the roof** and two independent corrugated lids rise up and forward on gas struts into high overhead
roofs (front edge ~230 cm), each sheltering a half of the station. Left to right: a **prep + sink** counter
with lower cabinets; a dedicated **brasero** feeding a wide crank-lift **parrilla** — burn wood down and
rake coals under the grate, the real Argentine way; and a **vertical smoker** — **open the smoker's** dual
doors on three racks over a firebox below (smoke rises up through the food and out a top flue). **Light the
fires** and both come alive. The four postures — Closed, Open Station, Asado, Load the Smoker — are the dials
at their corners. See `PLAN.md` for the engineering, manufacturing, and business case.
