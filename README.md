# Experiments

A field index of the substrates, frameworks, languages, tools, and design studies I
build to answer one question at a time — *what if the foundation were different?*

By **Chris Kluis** — [ckluis.com](https://ckluis.com) · [kilofeet](https://kilofeet.com) ·
[LinkedIn](https://www.linkedin.com/in/ckluis) · [X](https://x.com/ckluis)

**→ [Open the index](https://ckluis.github.io/experiments/)**

Locally: open `index.html` in a browser. It links out to each experiment's spec page
and, where one exists, its source repository. Each spec links back to the index.

## How the index is built

`index.html` is generated. Every experiment is a folder:

```
groups/<group>/group.json          title, question line, accent colour, order, old anchors
groups/<group>/<item>/item.json    name, status, line, question, description, stack, facts, links
groups/<group>/<item>/preview.*    the card image (or "preview": "/path/in/repo.png" in item.json)
```

```sh
node build/build.mjs          # writes index.html, registry.json, this table and the social-card counts
node build/build.mjs --check  # exits 1 if anything is stale
```

To add an experiment, add a folder with an `item.json` and a `preview.png`, then run the build.
The design lives in `build/index.template.html`. Statuses: `shipped`, `spec`, `concept`,
`case-study`, `local`, `archived`. `registry.json` is the machine-readable list of every
folder and its metadata — don't edit it by hand.

## The experiments

<!-- registry:start -->
| Type | Project | Stack | Status | Links |
|---|---|---|---|---|
| Foundations | **regel** — code as governed Postgres rows | Go · TypeScript · Postgres | Shipped | [live](https://ckluis.github.io/regel/) · [code](https://github.com/ckluis/regel) |
| Foundations | **kern** — a homoiconic SaaS substrate | Lisp · Postgres | Spec | [read the spec](kern.html) |
| Foundations | **eigen** — local-first hypermedia in one Rust binary | Rust · Postgres | Spec | [read the spec](eigen.html) |
| Foundations | **taal** — the BEAM, built on Go | Go · Actor model | Spec | [read the spec](taal.html) |
| Foundations | **streng** — a closed-world TypeScript | TypeScript · Native compiler | Spec | [read the spec](streng.html) |
| Platforms & frameworks | **samen** — a governed B2B-SaaS foundry | Elixir · Ash · Oban · Postgres | Shipped | [live](https://ckluis.github.io/samen/) · [code](https://github.com/ckluis/samen) |
| Platforms & frameworks | **tinker** — internal tools on data you can't see | Rust · PostgreSQL 18 · MCP | Shipped | [live](https://ckluis.github.io/tinker/) · [code](https://github.com/ckluis/tinker) |
| Platforms & frameworks | **chord** — the omakase full-stack for G# | G# · Full-stack | Spec | [read the spec](chord.html) |
| Platforms & frameworks | **fugue** — the Phoenix of G#, on Orleans | G# · Orleans | Spec | [read the spec](fugue.html) |
| Platforms & frameworks | **realbook** — the WordPress of G#, with a gate | G# · CMS | Spec | [read the spec](realbook.html) |
| Platforms & frameworks | **lui** — layout-first UI with an AI sidecar | UI framework · AI sidecar | Spec | [read the spec](lui.html) |
| Platforms & frameworks | **cauldron** — a web framework from zero dependencies | Common Lisp · SBCL · Zero deps · One binary | Archived | [code](https://github.com/ckluis/cauldron) · [kern took it further](kern.html) |
| Platforms & frameworks | **crucible-works** — a business platform built to prove cauldron | Common Lisp · On cauldron · Multi-tenant Postgres | Archived | [code](https://github.com/ckluis/crucible-works) · [samen took it further](https://ckluis.github.io/samen/) |
| Agent tools | **baton** v7.5 — one thread that never fills up | Claude Code mod · JavaScript · Multi-agent | Shipped | [live](https://ckluis.github.io/baton/) · [code](https://github.com/ckluis/baton) · [changelog](https://github.com/ckluis/baton/blob/main/CHANGELOG.md) · [v6](https://ckluis.github.io/baton/baton-v6.html) |
| Agent tools | **luminaryTeam** — a 40-expert adversarial review | Prompts · Multi-agent · Claude | Archived | [live](https://ckluis.github.io/luminaryTeam/) · [code](https://github.com/ckluis/luminaryTeam) |
| Agent tools | **senkani** — token compression for coding agents | Swift · macOS · MCP | Archived | [live](https://ckluis.github.io/senkani) · [code](https://github.com/ckluis/senkani) |
| Agent tools | **workflowForge** — paste a workflow, get a page you can send | Single-file HTML · SVG renderer · Bring your own model · No server | Shipped | [live](https://ckluis.github.io/workflowForge/) · [code](https://github.com/ckluis/workflowForge) |
| Products | **aiCRO** — a full growth engagement from one URL | Node.js · Claude · Self-contained HTML | Shipped | [live](https://ckluis.github.io/aiCRO/) · [code](https://github.com/ckluis/aiCRO) |
| Products | **once-campfire-fSharp** — Campfire in F#, faster than the Rust port | F# · .NET 10 · ASP.NET Core · Falco · SQLite | Shipped | [live](https://ckluis.github.io/once-campfire-fSharp/) · [code](https://github.com/ckluis/once-campfire-fSharp) |
| Products | **terminalHelper** — a searchable terminal command reference | Go · Bubble Tea · SQLite | Shipped | [read the spec](terminalHelper.html) · [code](https://github.com/ckluis/terminalHelper) |
| Products | **nonprofitEventPlanner** — run a whole youth trip from your phone | Rails 8 · Hotwire · Postgres | Local | [read the spec](nonprofitEventPlanner.html) |
| Products | **customCMS** — one brain, many book storefronts | Go · SQLite · Claude Code | Local | [read the spec](customCMS.html) |
| Experiments in an experimental language | **bocht** — a whole backend in one Bend binary | Bend · C · WAL · MCP | Case study | [live](https://ckluis.github.io/bocht/) · [code](https://github.com/ckluis/bocht) · [the bend series](bend/index.html) |
| Experiments in an experimental language | **bochtCMS** — an MCP-only CMS, and the curve its tests missed | Bend · MCP · JSON-RPC · Claude Code | Case study | [live](https://ckluis.github.io/bochtCMS/) · [code](https://github.com/ckluis/bochtCMS) · [the bend series](bend/index.html) |
| Experiments in an experimental language | **shellOS** — a desktop shell drawn in pure Bend | Bend · PTY · VT100 · Claude Code | Case study | [live](https://ckluis.github.io/shellOS/) · [code](https://github.com/ckluis/shellOS) · [the bend series](bend/index.html) |
| Design studies | **Overlook** — an open letter to Slack | Vanilla JS · 12 live demos · Agent sim · No-build | Concept | [read the letter](overlook/index.html) · [see the graph](overlook/index.html#graph) |
| Design studies | **wijzer** — an open letter to Apple | SVG · Computed ephemeris · True scale · No-build | Concept | [read the letter](wijzer/index.html) · [try the faces](wijzer/index.html#swipe) |
| Design studies | **uiExplorer** — the UI Lab | HTML/CSS · Zero-dep · AI-native | Shipped | [live](https://ckluis.github.io/uiExplorer/) · [code](https://github.com/ckluis/uiExplorer) |
| Design studies | **omegaClass** — an outdoor fire station in one cabinet | Three.js · Two-axis rig · PBR + reflections · No-build | Concept | [open the 3d](3d/omegaClassGrills/index.html) · [read the plan](3d/omegaClassGrills/PLAN.md) |
| Design studies | **STOWORK** — a carry-on that becomes a workstation | Three.js · Parametric rig · No-build | Concept | [open the 3d](3d/portable-office/index.html) · [read the plan](3d/portable-office/PLAN.md) |
<!-- registry:end -->

## Card drawings

Each card shows `preview.svg` from the item's folder: a drawing of the project's mechanism or signature
UI on a dark ground, in one shared style. The spec is in [`build/card-style.md`](build/card-style.md).
Stars and forks come from GitHub and are cached in `build/github-stats.json`; refresh them with
`node build/build.mjs --stats`.

The index's own social card is generated from `previews/_social-experiments-src.html`:

```sh
npx playwright screenshot --viewport-size=1200,630 --wait-for-timeout=3000 \
  previews/_social-experiments-src.html previews/social-experiments.png
```

`baton.html` is a redirect stub — baton moved to its own repository, and the old
URL is kept so existing links still land somewhere useful.
