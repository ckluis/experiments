# Experimental Architectures

A field index of the substrates, frameworks, languages, and tools I build to answer
one question at a time — *what if the foundation were different?*

By **Chris Kluis** — [ckluis.com](https://ckluis.com) · [kilofeet](https://kilofeet.com) ·
[LinkedIn](https://www.linkedin.com/in/ckluis) · [X](https://x.com/ckluis)

**→ [Open the index](https://ckluis.github.io/experimentalArchitectures/)** *(once Pages is enabled)*

Locally: open `index.html` in a browser. It links out to each experiment's spec page
and, where one exists, its source repository. Each spec links back to the index.

## The experiments

| Section | Project | Stack | Status | Spec | Live · Code |
|---|---|---|---|---|---|
| Substrate | **regel** — a governed code-as-rows substrate | Go · TypeScript · Postgres | Shipped | `regel.html` | [live](https://ckluis.github.io/regel/) · [code](https://github.com/ckluis/regel) |
| Substrate | **kern** — a homoiconic SaaS substrate | Lisp · Postgres | Spec | `kern.html` | — |
| Substrate | **eigen** — a local-first hypermedia framework | Rust · Postgres | Spec | `eigen.html` | — |
| Frameworks | **samen** — a governed B2B-SaaS foundry | Elixir · Ash · Oban · Postgres | Shipped | `samen.html` | [live](https://ckluis.github.io/samen/) · [code](https://github.com/ckluis/samen) |
| Frameworks | **chord** — the omakase full-stack for G# | G# | Spec | `chord.html` | — |
| Frameworks | **fugue** — the Phoenix of G#, on Orleans | G# · Orleans | Spec | `fugue.html` | — |
| Frameworks | **realbook** — the WordPress of G#, with a gate | G# | Spec | `realbook.html` | — |
| Languages | **taal** — building the BEAM on Go | Go · actor model | Spec | `taal.html` | — |
| Languages | **streng** — a closed-world TypeScript | TypeScript · native compiler | Spec | `streng.html` | — |
| Interfaces | **lui** — a layout-first UI framework | UI framework · AI sidecar | Spec | `lui.html` | — |
| Interfaces | **uiExplorer** — the UI Lab, provenance-first UI experiments | HTML/CSS · zero-dep · AI | Shipped | — | [live](https://ckluis.github.io/uiExplorer/) · [code](https://github.com/ckluis/uiExplorer) |
| Tools | **aiCRO** — a full growth engagement from one URL | Node.js · Claude | Shipped | — | [live](https://ckluis.github.io/aiCRO/) · [code](https://github.com/ckluis/aiCRO) |
| Tools | **senkani** — token compression for AI coding agents | Swift · macOS · MCP | Shipped | — | [live](https://ckluis.github.io/senkani) · [code](https://github.com/ckluis/senkani) |
| Tools | **terminalHelper** — a searchable terminal command reference | Go · Bubble Tea · SQLite | Shipped | `terminalHelper.html` | [code](https://github.com/ckluis/terminalHelper) |
| Tools | **nonprofitEventPlanner** — run a whole youth trip from your phone | Rails 8 · Hotwire · Postgres | Local | `nonprofitEventPlanner.html` | private |
| Tools | **customCMS** — BookEngine: one brain, many book storefronts | Go · SQLite · Claude | Local | `customCMS.html` | private |

## Regenerating spec previews

Card thumbnails in `previews/` are baked screenshots of each spec's masthead:

```sh
for f in chord eigen fugue kern lui realbook regel samen streng taal customCMS nonprofitEventPlanner; do
  npx playwright screenshot --viewport-size=1200,760 --wait-for-timeout=1600 "$f.html" "previews/$f.png"
done
```

External projects (no local spec) use hand-built inline SVG previews in `index.html`.
