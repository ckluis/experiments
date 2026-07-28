# STOWORK — The Carry-On Studio

A browser-based 3D concept for a **carry-on-sized case that unfolds into a full
three-monitor portable office in under two minutes**. Not a laptop — a deployable
office. Built as a static, no-build, GitHub-Pages-hostable experiment.

> *"Your whole office. In a carry-on. In under two minutes."*

## What's here

| File | Purpose |
|------|---------|
| `index.html` | The landing page that sells the concept. Live 3D + an interactive scrubber that walks the case through every stage of its 6-stage deployment. |
| `PLAN.md` | The full concept plan: product definition, engineering & mechanism detail, **design & differentiation** (what makes it original and hard to copy), **manufacturing/DFM** (BOM, COGS, MSRP), go-to-market, financials & the ask. Written to be handed to a design engineer, a contract manufacturer, and an investor. |
| `SPEC.md` | Internal build spec — the physical engineering, deployment kinematics, and the JS module API contract. Source of truth for the model. |
| `vendor/` | Three.js r128 (`three.min.js`) + classic `OrbitControls.js`, vendored so the page runs from `file://` with no network. |
| `src/caseModel.js` | The parametric Three.js rig. Defines the global `createPortableOffice()` returning `{ root, setDeploy(t), stages, ... }`. A single deploy parameter `t ∈ [0,1]` drives every hinge, the lift, the wing fold, the AV boom, and the keyboard tray. |
| `src/app.js` | The scene/app: renderer, lighting, OrbitControls, the scrubber, stage animation, the setup clock, and a graceful no-WebGL fallback. |
| `src/caseModel.test.html` | Standalone self-verification harness for the model — a slider to scrub `t` 0→1. |
| `style.css` | Landing-page styling. |

## Run it

**Just open `index.html` in a browser.** No server, no build step, no network.
Double-click the file (or drag it into Safari/Chrome) and it runs from `file://`.

It works this way because Three.js is **vendored locally** in `vendor/` and loaded as
plain classic `<script>` tags (not ES modules, which browsers block over `file://`).
The same files also drop straight onto any static host (GitHub Pages, Netlify, etc.).

Requires a browser with WebGL (every current desktop browser has it). Where WebGL is
unavailable, each 3D canvas shows a readable fallback panel and the page stays intact.

## The design, in one paragraph

Closed, it's a **55 × 35 × 23 cm** airline-legal carry-on. Deployed: the lid swings
clear, a gas-strut lift raises a **tri-fold triptych** (a center OLED panel with two
wings that fold flat over it for stow and fan into a curved 93 cm 3-screen array), an
AV boom lifts a broadcast mic + 4K camera to eye level, and a TKL keyboard + haptic
trackpad slide forward. Two SKUs: **Dock** (one USB4 cable to your laptop/phone) and
**Core** (dock your own Mac mini / Mac Studio / mini-PC in the swappable compute bay).
Deployment budget: **≤ 110 seconds**. See `PLAN.md`
for the full engineering, design-differentiation, manufacturing, and investment case.

## Verification

The model is pure scene-graph (no renderer), so its kinematics are verified numerically:
driving `setDeploy(t)` across all six stages produces the expected world-space bounding
boxes — a 54×23×37 cm closed carry-on at `t=0`, widening to 83 cm as the wings fan, with
the center screen rising to ~30 cm above the desk (seated eye level) at `t=1`. `setDeploy`
is idempotent and clamps out-of-range input.
