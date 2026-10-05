# STOWORK — The Carry-On Studio

A browser-based 3D concept for a **carry-on-sized case that unfolds into a full
three-monitor portable office in under two minutes**. Not a laptop — a deployable
office. Built as a static, no-build, GitHub-Pages-hostable experiment.

> *"Your whole office. In a carry-on. In under two minutes."*

## What's here

| File | Purpose |
|------|---------|
| `index.html` | The landing page that sells the concept. Its centrepiece is the deploy stage: one live 3D model you can scrub, play or turn, from closed case to full office, with a six-frame storyboard underneath. |
| `PLAN.md` | The full concept plan: product definition, engineering & mechanism detail, **design & differentiation** (what makes it original and hard to copy), **manufacturing/DFM** (BOM, COGS, MSRP), go-to-market, financials & the ask. Written to be handed to a design engineer, a contract manufacturer, and an investor. |
| `SPEC.md` | Internal build spec — the physical engineering, deployment kinematics, and the JS module API contract. Source of truth for the model. |
| `vendor/` | Three.js r128 (`three.min.js`) + classic `OrbitControls.js` (used by the test harness), vendored so the page runs from `file://` with no network. |
| `src/caseModel.js` | The parametric Three.js rig. Defines the global `createPortableOffice()` returning `{ root, setDeploy(t), stages, ... }`. A single deploy parameter `t ∈ [0,1]` drives every hinge, the lift, the wing fold, the AV boom, and the keyboard tray. |
| `src/studio.js` | Shared lights, transparent shadow-catcher ground and camera framing (`StoworkStudio`). Used by the live stage and by the offline captures in `renders/`, so stills and live model match. |
| `src/app.js` | The deploy stage: a single WebGL context, drag-to-turn, scrubber, play timeline, setup clock, storyboard. Falls back to cross-fading the rendered stills without WebGL, and to the static storyboard without JS. |
| `renders/` | Transparent WebP stills captured from the live model (`stage-0…5` are the six deploy stages; `hero-*` and `detail-*` illustrate the page). |
| `src/caseModel.test.html` | Standalone self-verification harness for the model — a slider to scrub `t` 0→1. |
| `style.css` | Landing-page styling. |

## Run it

**Just open `index.html` in a browser.** No server, no build step, no network.
Double-click the file (or drag it into Safari/Chrome) and it runs from `file://`.

It works this way because Three.js is **vendored locally** in `vendor/` and loaded as
plain classic `<script>` tags (not ES modules, which browsers block over `file://`).
The same files also drop straight onto any static host (GitHub Pages, Netlify, etc.).

WebGL is optional. Without it the deploy stage steps through the rendered stills; without
JavaScript the page shows the fully deployed still and the six-stage storyboard. Nothing
on the page is hidden until a script reveals it.

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
