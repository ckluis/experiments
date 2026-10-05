# Card drawings

Every project's card shows `groups/<group>/<item>/preview.svg`: a clean drawing of the project's
**mechanism or signature UI**, not a screenshot of its landing page. tinker's "one field, three faces"
(`groups/frameworks/tinker/preview.svg`) is the reference; match its construction.

Draw from the project's own material and never invent features, numbers or names it doesn't state.

## Spec
- Root: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400" role="img" aria-label="…one sentence describing what the drawing shows…">`
- Background, in this order: `<rect width="640" height="400" fill="#14110c"/>`, a 24px dot-grid pattern
  (`#efe6d6` at opacity .06), one radial glow of the group accent at ≤ .22 opacity from one corner.
- Colours, nothing else:
  - ivory `#efe6d6` for primary strokes/text; ivory at opacity .45/.35/.2/.12 for secondary
  - panels `#1c1812` fill with ivory .2 stroke
  - the **group accent (light tone)** for the single focal element and its labels:
    foundations `#9b86e8` · frameworks `#e08a5a` · agent-tools `#5fb3a1` · products `#d9a94a` ·
    field-reports `#6f9fd6` · design-studies `#e07a9c`
  - optional status colours, sparingly: ok `#7fc49a`, fail/blocked `#e07a5f`
- Strokes 1.5px (1–1.2 for hairlines), `stroke-linecap="round"`, rounded rects (rx 6–14).
- Text: at most ~10 short labels. `font-family="JetBrains Mono, ui-monospace, monospace"`, 10–13px,
  uppercase small labels with letter-spacing .06–.1em. Optionally ONE display line
  `font-family="Fraunces, Georgia, serif" font-style="italic"` at 22–28px (a 2–5 word thesis, top-left,
  like tinker's "One field, three faces."). No paragraphs. Text must never overflow its box or the canvas.
- Composition: one clear idea, a focal element, ≥ 32px margins, generous negative space, nothing touching
  edges, readable when shown at 360px wide (so no detail smaller than ~10px at full size matters).
- No `<image>`, no external references, no scripts, no `<foreignObject>`. Filters only `feGaussianBlur`
  (stdDeviation ≤ 24) if needed. Keep each file under ~14 KB.

## Check it

Open the SVG in a browser at 640×400 and at 360px wide (the hover card's size). Nothing should touch
an edge, overlap, or be smaller than ~10px at full size. Validate it parses:
`python3 -c "import xml.dom.minidom,sys;xml.dom.minidom.parse(sys.argv[1])" preview.svg`
