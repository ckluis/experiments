#!/usr/bin/env node
// Builds rewrites/index.html, the "Rewrite a product in a new language" page, from rewrites/data.json.
//
//   rewrites/data.json   apps (with KLOC), the six-ways medians, the cards, the matrix, and the sources
//   node build/rewrites.mjs           write rewrites/index.html and previews/social-rewrites.svg
//   node build/rewrites.mjs --check   exit 1 if either is stale
//
// Every number on the page is a link to the source it came from: medians to the six-ways benchmark, multiples are
// computed here from those medians, KLOC to the one-rule count. A card or fact naming an unknown source fails the
// build. To add a rewrite: add its app (rewrite: true) with its medians in every row, a card, and a matrix value.
// No dependencies.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'rewrites');
const CHECK = process.argv.includes('--check');
const D = JSON.parse(fs.readFileSync(path.join(DIR, 'data.json'), 'utf8'));

const errors = [];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const src = k => { if (!D.sources[k]) errors.push(`unknown source "${k}"`); return D.sources[k] || { href: '#', label: '' }; };
const sn = (text, k) => { const s = src(k); return `<a class="sn" href="${esc(s.href)}" title="${esc(s.label)}">${text}</a>`; };
const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const cap = s => s[0].toUpperCase() + s.slice(1);
const int = n => Math.round(n).toLocaleString('en-US');
const x = n => (n >= 10 ? n.toFixed(1) : n.toFixed(2)) + '×';

const apps = D.apps, byId = Object.fromEntries(apps.map(a => [a.id, a]));
const rewrites = apps.filter(a => a.rewrite);
for (const r of D.rows) for (const a of apps) if (r.median[a.id] == null) errors.push(`row "${r.route}" (${r.group}) has no median for ${a.id}`);
for (const c of D.cards) if (!byId[c.app]) errors.push(`card for unknown app "${c.app}"`);
for (const a of rewrites) {
  if (!D.cards.some(c => c.app === a.id)) errors.push(`rewrite ${a.id} has no card`);
  for (const m of D.matrix) if (m.values[a.id] == null) errors.push(`matrix row "${m.label}" has no value for ${a.id}`);
}
const row = (group, key) => D.rows.find(r => r.group.startsWith(group) && r.key === key);
const ALONE = 'Each route alone', MIXED = 'Reads while';
const room = row(ALONE, 'room_show'), post = row(ALONE, 'post_message'), roomMixed = row(MIXED, 'room_show');
if (!room || !post || !roomMixed) errors.push('six-ways rows are missing the room page, post or mixed room page');
if (errors.length) { console.error(`✗ rewrites/data.json:\n  ${errors.join('\n  ')}`); process.exit(1); }

const ratio = (r, a, b) => r.median[a] / r.median[b];
const sixN = (r, a) => sn(int(r.median[a]), 'six');
const sixX = (r, a, b) => sn(x(ratio(r, a, b)), 'six');
const kloc = a => sn(a.kloc.toFixed(1), a.kloc_src);

/* ---------- the code-against-speed chart (log-log) ---------- */

function scatter({ w = 560, h = 380, dark = true } = {}) {
  const L = 58, R = 24, T = 26, B = 50;
  const X = k => L + (Math.log2(k / 4) / Math.log2(128 / 4)) * (w - L - R);
  const Y = v => T + (1 - Math.log2(v / 2000) / Math.log2(256000 / 2000)) * (h - T - B);
  const ink = dark ? '#f2e9da' : '#1a160f';
  let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="sc-t sc-d" class="scatter"><title id="sc-t">Code against speed</title><desc id="sc-d">Backend lines of code (KLOC, log scale) against room-page requests per second (log scale), six Campfires in the same sessions.</desc>`;
  for (const k of [4, 8, 16, 32, 64, 128]) s += `<line x1="${X(k)}" x2="${X(k)}" y1="${T}" y2="${h - B}" class="gl"/><text x="${X(k)}" y="${h - B + 18}" text-anchor="middle" class="tk">${k}</text>`;
  for (const v of [2000, 8000, 32000, 128000]) s += `<line x1="${L}" x2="${w - R}" y1="${Y(v)}" y2="${Y(v)}" class="gl"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" class="tk">${v / 1000}k</text>`;
  s += `<text x="${(L + w - R) / 2}" y="${h - 8}" text-anchor="middle" class="ax">backend KLOC →</text>`;
  s += `<text transform="translate(14 ${(T + h - B) / 2}) rotate(-90)" text-anchor="middle" class="ax">room page req/s →</text>`;
  const place = { rails: [10, 4, 'start'], rust: [0, -14, 'middle'], c: [-10, 18, 'end'], fsharp: [10, 20, 'start'], oncrack: [12, 5, 'start'], dotnetway: [-11, 20, 'end'] };
  for (const a of apps) {
    const cx = X(a.kloc), cy = Y(room.median[a.id]), [dx, dy, anchor] = place[a.id] || [10, 4, 'start'];
    s += `<g class="pt ${a.rewrite ? 'rw' : 'ref'}"><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${a.rewrite ? 7 : 5}"/><text x="${(cx + dx).toFixed(1)}" y="${(cy + dy).toFixed(1)}" text-anchor="${anchor}">${esc(a.short)}</text></g>`;
  }
  return s + `</svg>`;
}

/* ---------- pieces ---------- */

const fill = (text, a) => text.replace(/\{(\w+)\}/g, (m, k) => {
  if (k === 'room_x_rust') return sixX(room, a.id, 'rust');
  const f = D.facts[k]; if (!f) { errors.push(`unknown fact {${k}}`); return m; }
  return sn(esc(f[0]), f[1]);
});

const card = (c, i) => {
  const a = byId[c.app];
  return `<article class="ptile${i % 2 ? ' flip' : ''} reveal">
    <div class="ptext">
      <div class="n">${esc(c.n)}</div>
      <h3>${esc(c.title)}</h3>
      <p class="tl2">${c.tagline}</p>
      <p class="rule"><b>The rule</b>${esc(c.rule)}</p>
      <p>${fill(c.body, a)}</p>
      <div class="pills">${c.pills.map(p => `<span>${esc(p)}</span>`).join('')}</div>
      <div class="kv">
        <div><b>${kloc(a)}</b><span>KLOC</span></div>
        <div><b>${sixX(room, a.id, 'rails')}</b><span>Rails, room page</span></div>
        <div><b>${sixX(room, a.id, 'rust')}</b><span>Rust, room page</span></div>
        <div><b>${sn(esc(c.parity[0]), c.parity[2])}</b><span>${esc(c.parity[1])}</span></div>
      </div>
      <a class="open" href="${esc(a.live)}">Open ${esc(a.name)} →</a> <a class="open ghost" href="${esc(a.repo)}">Source ↗</a>
    </div>
    <a class="pshot" href="${esc(a.live)}" aria-label="${esc(a.name)}"><img src="${esc(a.card)}" width="640" height="400" alt="${esc(a.name)} card drawing" loading="lazy"></a>
  </article>`;
};

const best = r => apps.reduce((m, a) => (r.median[a.id] > r.median[m] ? a.id : m), apps[0].id);
const fullTable = () => {
  let s = `<div class="scrollx"><table class="six"><thead><tr><th>Workload</th>${apps.map(a => `<th class="${a.rewrite ? 'rw' : ''}">${esc(a.name)}<small>${esc(a.commit)}</small></th>`).join('')}</tr></thead><tbody>`;
  let g = '';
  for (const r of D.rows) {
    if (r.group !== g) { g = r.group; s += `<tr class="grp"><td colspan="${apps.length + 1}">${esc(g === ALONE ? 'Each route alone, 16 clients' : 'Reads while a writer posts 10 a second')}</td></tr>`; }
    const top = best(r);
    s += `<tr><td>${esc(r.route)}</td>${apps.map(a => `<td class="${a.rewrite ? 'rw' : ''}${a.id === top ? ' top' : ''}">${sixN(r, a.id)}${a.id === 'rails' ? '' : `<small>${sixX(r, a.id, 'rails')}</small>`}</td>`).join('')}</tr>`;
  }
  return s + `</tbody></table></div>`;
};

const matrix = () => {
  const num = [
    ['Lines of code (KLOC)', a => kloc(a)],
    ['Room page, req/s', a => sixN(room, a.id)],
    ['… against Rails', a => sixX(room, a.id, 'rails')],
    ['… against Rust', a => sixX(room, a.id, 'rust')],
    ['Post a message, req/s', a => sixN(post, a.id)],
    ['… against Rails', a => sixX(post, a.id, 'rails')],
    ['Room page with a writer, against Rails', a => sixX(roomMixed, a.id, 'rails')],
    ['Screens checked against the original', a => { const c = D.cards.find(c => c.app === a.id); return `${sn(esc(c.parity[0]), c.parity[2])} <small>${esc(c.parity[1])}</small>`; }],
  ];
  let s = `<div class="scrollx"><table class="mx"><thead><tr><th></th>${rewrites.map(a => `<th>${esc(a.name)}</th>`).join('')}</tr></thead><tbody>`;
  for (const m of D.matrix) s += `<tr><th>${esc(m.label)}</th>${rewrites.map(a => `<td>${m.values[a.id]}</td>`).join('')}</tr>`;
  s += `<tr class="sep"><td colspan="${rewrites.length + 1}"></td></tr>`;
  for (const [label, f] of num) s += `<tr class="n"><th>${label}</th>${rewrites.map(a => `<td>${f(a)}</td>`).join('')}</tr>`;
  return s + `</tbody></table></div>`;
};

/* ---------- headline numbers ---------- */

const kl = rewrites.map(a => a.kloc), roomX = rewrites.map(a => ratio(room, a.id, 'rails'));
const minA = rewrites.reduce((m, a) => (a.kloc < m.kloc ? a : m)), fastA = rewrites.reduce((m, a) => (room.median[a.id] > room.median[m.id] ? a : m));
const spreadRoom = Math.max(...rewrites.map(a => room.median[a.id])) / Math.min(...rewrites.map(a => room.median[a.id]));
const TITLE = 'Rewrites: one product, rebuilt under different rules';
const DESC = `Basecamp's ONCE Campfire rewritten ${rewrites.length} times in F#, each under a different rule, each checked screen by screen against Rails and timed on Basecamp's own harness beside Rails, Rust and C.`;
const URL = 'https://ckluis.github.io/experiments/rewrites/';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(TITLE)}</title>
<meta name="description" content="${esc(DESC)}">
<link rel="canonical" href="${URL}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="ckluis / experiments">
<meta property="og:url" content="${URL}">
<meta property="og:title" content="${esc(TITLE)}">
<meta property="og:description" content="${esc(DESC)}">
<meta property="og:image" content="https://ckluis.github.io/experiments/previews/social-rewrites.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Code against speed: three F# rewrites of Campfire beside Rails, Rust and C.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@ckluis">
<meta name="twitter:creator" content="@ckluis">
<meta name="twitter:title" content="${esc(TITLE)}">
<meta name="twitter:description" content="${esc(DESC)}">
<meta name="twitter:image" content="https://ckluis.github.io/experiments/previews/social-rewrites.png">
<script>document.documentElement.classList.add('js')</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;450;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/series.css">
<link rel="stylesheet" href="assets/rewrites.css">
</head>
<body>
<!-- Generated by build/rewrites.mjs from rewrites/data.json. Edit those, not this file. -->
<a href="https://ckluis.github.io/experiments/" class="xa-back" aria-label="Back to all experiments"><span class="xa-arrow">←</span> Experiments</a>
<header class="hero">
  <div class="wrap">
    <nav class="rail reveal" aria-label="The rewrites"><span class="rl">Rewrites</span><a href="${URL}" aria-current="page"><span class="i">00</span>Compare</a>${rewrites.map((a, i) => `<a href="${esc(a.live)}"><span class="i">0${i + 1}</span>${esc(a.name)}</a>`).join('')}</nav>
    <div>
      <div class="eyebrow reveal">A series of experiments · Oct 2026</div>
      <h1 class="reveal d1">Rewrites<span class="def">one shipped product, rebuilt under different rules</span></h1>
      <p class="tag reveal d2">Same pixels. Same database. <em>Different rules.</em></p>
      <p class="lede reveal d2">Basecamp's <a href="https://github.com/basecamp/once-campfire">ONCE Campfire</a> is a Rails chat app. Basecamp rewrote it in seven languages and published ${sn('the harness', 'upstream')} that checks and times every version. These are ${words[rewrites.length] || rewrites.length} more, all in F#, each built by Claude Code agent workflows under one rule, each checked screen by screen against the original and timed on Basecamp's harness beside Rails, Rust and C, in the same sessions.</p>
      <div class="hstats reveal d3">
        <div><div class="n">${rewrites.length}</div><div class="l">rewrites, three rules</div></div>
        <div><div class="n">${apps.length}</div><div class="l">apps in the same sessions</div></div>
        <div><div class="n">${sn(Math.min(...kl).toFixed(1), 'kloc')}–${sn(Math.max(...kl).toFixed(1), 'kloc')}</div><div class="l">KLOC</div></div>
        <div><div class="n">${sn(x(Math.min(...roomX)), 'six')}–${sn(x(Math.max(...roomX)), 'six')}</div><div class="l">Rails, room page</div></div>
      </div>
      <nav class="jump reveal d3" aria-label="Sections"><a href="#three">The three</a><a href="#differ">How they differ</a><a href="#six">Six ways</a><a href="#method">The method</a><a href="#next">Next</a></nav>
    </div>
    <figure class="spec reveal d2" aria-label="Code against speed">
      <div class="lab"><span>Code against speed</span><span>same sessions · 16 clients</span></div>
      ${scatter()}
      <div class="no"><div><b>${sn(minA.kloc.toFixed(1), 'kloc')}</b>${esc(minA.name)}, the smallest rewrite</div><div><b>${sixX(room, fastA.id, 'c')}</b>${esc(fastA.name)} against C</div><div><b>${sn(x(spreadRoom), 'six')}</b>room-page spread, same language</div></div>
    </figure>
  </div>
</header>

<section class="sec" id="three"><div class="wrap">
  <div class="sh">
    <div class="num reveal">01 — The three</div>
    <h2 class="reveal d1">One language, <em>three rules.</em></h2>
    <p class="reveal d2">The port came first. The other two fork it and change one thing: what each is allowed to do. Each has its own page, and every number on those pages links to the file it came from.</p>
  </div>
  <div class="ptiles">
  ${D.cards.map(card).join('\n  ')}
  </div>
</div></section>

<section class="sec alt" id="differ"><div class="wrap">
  <div class="sh">
    <div class="num reveal">02 — How they differ</div>
    <h2 class="reveal d1">Same language, <em>${sn(x(spreadRoom), 'six')} apart.</em></h2>
    <p class="reveal d2">The language was held constant, so these differences come from the rules. Layers first, then the numbers, all from the same benchmark sessions.</p>
  </div>
  <div class="reveal">${matrix()}</div>
  <p class="note reveal">Lines of code by upstream's counting rule, applied the same way to all three (${sn('the count', 'kloc')}); Rails, Rust and C from ${sn("onCrack's count", 'kloc_up')} under the same rule. Screens are each project's own final gate, and the gates grew: the port checked 214 states against Rust, onCrack 944 screenshots against Rails, theDotNetWay 4,918 cells (three browsers, four viewports, light and dark).</p>
</div></section>

<section class="sec" id="six"><div class="wrap">
  <div class="sh">
    <div class="num reveal">03 — Six ways</div>
    <h2 class="reveal d1">Requests a second, <em>six Campfires, one harness.</em></h2>
    <p class="reveal d2">Basecamp's <code>once-campfire-verification</code> harness ran all six apps in each of four sessions: 3 rounds of 8 seconds at 16 clients, the app on 4 CPUs and the load generator on 4, every response checked and every post audited. Each cell is the median of 6 rounds; the fastest in each row is shaded and the rewrites are outlined, with their multiple of Rails beneath.</p>
  </div>
  <div class="reveal">${fullTable()}</div>
  <p class="note reveal">Measured in one Linux VM on an Apple M4, so the absolute rates are not comparable with ${sn("Basecamp's published figures", 'upstream_review')} on a Ryzen; Rails here is current Rails (${esc(byId.rails.commit)}). Source, sessions and every round: ${sn("the six-ways benchmark", 'six')}.</p>
</div></section>

<section class="sec alt" id="method"><div class="wrap">
  <div class="sh">
    <div class="num reveal">04 — The method</div>
    <h2 class="reveal d1">A rewrite counts <em>only if it can't be told apart.</em></h2>
    <p class="reveal d2">Same loop each time. The rule changes; the gates don't.</p>
  </div>
  <div class="steps">
    <div class="step reveal"><div class="who">Reference</div><h4>Pin the original</h4><p>Rails and Basecamp's Rust port, pinned as submodules, with the Rust port's parity harness and golden vectors.</p></div>
    <div class="step reveal d1"><div class="who">Rule</div><h4>Pick one constraint</h4><p>Same work as Rust; any work at all; the framework's way. Everything else stays: the database, the cookies, the pages.</p></div>
    <div class="step reveal d2"><div class="who">Claude Code</div><h4>Build in phases</h4><p>Agent workflows design each phase, build it unit by unit, and hand it to an independent, adversarial verifier.</p></div>
    <div class="step reveal d3"><div class="who">Gates</div><h4>Prove it's the same</h4><p>Screenshot, accessibility-tree and DOM parity on every seed, a cookie round trip and a database differential with Rails, then Basecamp's harness.</p></div>
  </div>
  <p class="note reveal">Chris Kluis set each rule, made the calls and decided what shipped. Claude Code did the translating, building, testing and measuring.</p>
</div></section>

<section class="sec dark" id="next"><div class="wrap">
  <div class="sh">
    <div class="num reveal">05 — Next</div>
    <h2 class="reveal d1">More languages, <em>the same gates.</em></h2>
    <p class="reveal d2">Nothing here is specific to F#. The recipe needs a shipped product, a reference implementation, a pixel gate and its makers' harness. More languages are planned; each will join the table above under the same gates and the same sessions. ${sn("Basecamp's own comparison", 'upstream_review')} covers Django, Laravel, Express, Elixir, Go, Rust and C.</p>
  </div>
</div></section>

<footer class="foot"><div class="wrap">
  <h2>${cap(words[rewrites.length] || String(rewrites.length))} rewrites. One harness. <em>Every number linked to its source.</em></h2>
  <div class="credits"><div class="credit"><div class="k">The original</div><p>ONCE Campfire by Basecamp (37signals), MIT. Rust and C ports and the verification harness by Basecamp.</p></div><div class="credit"><div class="k">The rewrites</div><p>Claude Code agent workflows: translation, builds, pixel and data parity, benchmarks and verification.</p></div><div class="credit"><div class="k">Direction</div><p>Chris Kluis: picked each rule, made the calls, and published the series.</p></div></div>
  <div class="links">${rewrites.map(a => `<a href="${esc(a.live)}">${esc(a.name)}</a>`).join('')}<a href="https://github.com/basecamp/once-campfire-verification" target="_blank" rel="noopener">once-campfire-verification ↗</a><a href="https://ckluis.github.io/experiments/">All experiments ↗</a></div>
  <p class="fine">Benchmarks: four sessions in one Linux VM (colima) on an Apple M4, late October 2026, at the commits under each column. Lines of code: counted 30 October 2026 at the same commits.</p>
</div></footer>
<script src="assets/series.js"></script>
</body>
</html>
`;

/* ---------- social card (1200×630 SVG; rsvg-convert makes the PNG) ---------- */

const social = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
<defs><radialGradient id="g" cx="88%" cy="10%" r="80%"><stop offset="0" stop-color="#5cc4dd" stop-opacity=".28"/><stop offset="1" stop-color="#5cc4dd" stop-opacity="0"/></radialGradient>
<style>.gl{stroke:#efe6d6;stroke-opacity:.1}.tk,.ax{fill:#efe6d6;fill-opacity:.5;font:13px 'JetBrains Mono',monospace}.pt text{font:600 17px Inter,sans-serif;fill:#efe6d6}.pt.ref circle{fill:#efe6d6;fill-opacity:.55}.pt.ref text{fill-opacity:.7}.pt.rw circle{fill:#5cc4dd}.pt.rw text{fill:#5cc4dd}</style></defs>
<rect width="1200" height="630" fill="#14110c"/><rect width="1200" height="630" fill="url(#g)"/>
<text x="64" y="120" font-family="Fraunces, Georgia, serif" font-size="88" font-weight="600" fill="#efe6d6">Rewrites</text>
<text x="64" y="176" font-family="Fraunces, Georgia, serif" font-style="italic" font-size="34" fill="#5cc4dd">Same pixels. Different rules.</text>
<text x="64" y="236" font-family="Inter, sans-serif" font-size="22" fill="#efe6d6" fill-opacity=".75">Basecamp's Campfire, rewritten ${rewrites.length} times in F#,</text>
<text x="64" y="268" font-family="Inter, sans-serif" font-size="22" fill="#efe6d6" fill-opacity=".75">timed beside Rails, Rust and C.</text>
<text x="64" y="560" font-family="JetBrains Mono, monospace" font-size="16" fill="#efe6d6" fill-opacity=".5">ckluis.github.io/experiments/rewrites</text>
<g transform="translate(560 60)">${scatter({ w: 600, h: 500 }).replace(/<svg[^>]*>/, '').replace('</svg>', '').replace(/<title[^>]*>.*?<\/title><desc[^>]*>.*?<\/desc>/, '')}</g>
</svg>
`;

if (errors.length) { console.error(`✗ rewrites/data.json:\n  ${errors.join('\n  ')}`); process.exit(1); }
const outputs = [[path.join(DIR, 'index.html'), html], [path.join(ROOT, 'previews', 'social-rewrites.svg'), social]];
const stale = outputs.filter(([f, body]) => !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== body);
const rel = f => path.relative(ROOT, f);
if (CHECK) {
  if (stale.length) { console.error(`✗ stale: ${stale.map(([f]) => rel(f)).join(', ')} — run node build/rewrites.mjs`); process.exit(1); }
  console.log(`✓ rewrites page up to date · ${rewrites.length} rewrites, ${apps.length} apps, ${D.rows.length} workloads`);
} else {
  for (const [f, body] of stale) fs.writeFileSync(f, body);
  console.log(`✓ rewrites page · ${rewrites.length} rewrites, ${apps.length} apps, ${D.rows.length} workloads`);
  console.log(stale.length ? `  wrote ${stale.map(([f]) => rel(f)).join(', ')}` : '  nothing changed');
  if (stale.some(([f]) => f.endsWith('.svg'))) console.log('  social card changed — rsvg-convert previews/social-rewrites.svg -o previews/social-rewrites.png');
}
