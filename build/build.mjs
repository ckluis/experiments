#!/usr/bin/env node
// Builds the index from the folders under groups/.
//
//   groups/<group>/group.json          one per group: title, question line, accent, order
//   groups/<group>/<item>/item.json    one per experiment: name, status, copy, stack, links
//   groups/<group>/<item>/preview.*    the card image (or item.json "preview": "/repo/path.png")
//
// Writes registry.json, index.html, the README table and the social-card counts.
// Run from anywhere:  node build/build.mjs          (write)
//                     node build/build.mjs --check  (exit 1 if anything is stale)
// No dependencies.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GROUPS = path.join(ROOT, 'groups');
const CHECK = process.argv.includes('--check');

const STATUS = {
  shipped:      { label: 'Shipped',    tier: 1 },
  spec:         { label: 'Spec',       tier: 2 },
  concept:      { label: 'Concept',    tier: 2 },
  'case-study': { label: 'Case study', tier: 2 },
  local:        { label: 'Local',      tier: 2 },
  archived:     { label: 'Archived',   tier: 3 },
};

const errors = [];
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const isExternal = href => /^https?:\/\//.test(href);

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { errors.push(`${rel(file)}: ${e.code === 'ENOENT' ? 'missing' : e.message}`); return null; }
}
const dirs = p => fs.readdirSync(p, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.')).map(d => d.name);

/* ---------- load ---------- */

const groups = dirs(GROUPS).map(slug => {
  const dir = path.join(GROUPS, slug);
  const g = readJSON(path.join(dir, 'group.json'));
  if (!g) return null;
  for (const k of ['order', 'title', 'line', 'blurb', 'accent']) if (g[k] == null) errors.push(`groups/${slug}/group.json: missing "${k}"`);
  g.slug = slug;
  g.aliases = g.aliases || [];
  g.items = dirs(dir).map(islug => {
    const idir = path.join(dir, islug);
    const it = readJSON(path.join(idir, 'item.json'));
    if (!it) return null;
    const where = `${rel(idir)}/item.json`;
    it.slug = islug;
    it.folder = rel(idir);
    for (const k of ['name', 'order', 'status', 'line', 'question', 'body', 'links']) if (it[k] == null) errors.push(`${where}: missing "${k}"`);
    if (it.status && !STATUS[it.status]) errors.push(`${where}: unknown status "${it.status}" (use ${Object.keys(STATUS).join(', ')})`);
    if (!Array.isArray(it.links) || !it.links.length) errors.push(`${where}: needs at least one link`);
    it.stack = it.stack || [];
    it.facts = it.facts || [];
    const local = ['png', 'jpg', 'jpeg', 'webp', 'svg'].map(x => `preview.${x}`).find(f => fs.existsSync(path.join(idir, f)));
    it.previewPath = it.preview
      ? (it.preview.startsWith('/') ? it.preview.slice(1) : `${it.folder}/${it.preview}`)
      : local ? `${it.folder}/${local}` : null;
    if (!it.previewPath) errors.push(`${where}: no preview.* in the folder and no "preview" path`);
    else if (!fs.existsSync(path.join(ROOT, it.previewPath))) errors.push(`${where}: preview ${it.previewPath} does not exist`);
    for (const l of it.links || []) {
      if (!l.label || !l.href) errors.push(`${where}: every link needs a label and an href`);
      else if (!isExternal(l.href) && !fs.existsSync(path.join(ROOT, l.href.split('#')[0]))) errors.push(`${where}: link ${l.href} points at a file that does not exist`);
    }
    return it;
  }).filter(Boolean).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return g;
}).filter(Boolean).sort((a, b) => a.order - b.order);

const ids = new Map();
for (const g of groups) for (const id of [g.slug, ...g.aliases, ...g.items.map(i => i.slug)]) {
  if (ids.has(id)) errors.push(`anchor "${id}" is used twice (${ids.get(id)} and ${g.slug}) — folder names must be unique`);
  ids.set(id, g.slug);
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem${errors.length === 1 ? '' : 's'} in groups/:\n  ` + errors.join('\n  '));
  process.exit(1);
}

/* ---------- derive ---------- */

const all = groups.flatMap(g => g.items);
const counts = { experiments: all.length, shipped: all.filter(i => i.status === 'shipped').length, groups: groups.length };
groups.forEach((g, gi) => {
  g.num = pad(gi + 1);
  g.items.forEach((it, ii) => { it.num = `${g.num}.${pad(ii + 1)}`; it.group = g; it.primary = it.links[0]; });
});

/* ---------- render pieces ---------- */

const linkAttrs = href => isExternal(href) ? ` href="${esc(href)}" target="_blank" rel="noopener"` : ` href="${esc(href)}"`;
const arrow = href => isExternal(href) ? '↗' : '→';
const statusTally = g => Object.keys(STATUS).map(s => [s, g.items.filter(i => i.status === s).length]).filter(([, n]) => n);

const nav = groups.map(g => `<a href="#${g.slug}" data-nav="${g.slug}" style="--g:${g.accent}"><span>${g.num}</span>${esc(g.title)}</a>`).join('');

const chips = groups.map(g => `<a href="#${g.slug}" data-nav="${g.slug}" style="--g:${g.accent}"><i></i>${esc(g.title)}<span>${g.items.length}</span></a>`).join('');

const lineup = groups.map(g => {
  const names = g.items.map(it =>
    `<a class="ln t${STATUS[it.status].tier}" href="#${it.slug}" data-img="${esc(it.previewPath)}" data-q="${esc(it.question)}" data-st="${esc(STATUS[it.status].label)}">${esc(it.name)}</a>`
  );
  // the group tag is glued to its first name so a line never ends on a stranded label
  const first = `<span class="lgs"><a class="lgtag" href="#${g.slug}">${g.num} ${esc(g.title)}</a>${names[0]}</span>`;
  return `<span class="lg" style="--g:${g.accent}">${[first, ...names.slice(1)].join('<i aria-hidden="true">·</i> ')}</span>`;
}).join(' ');

const legend = groups.map(g => `<a href="#${g.slug}" style="--g:${g.accent}"><i></i>${esc(g.title)} <span>${g.items.length}</span></a>`).join('');

function card(it) {
  const st = STATUS[it.status];
  const facts = it.facts.length ? `<div class="cfacts">${it.facts.map(([n, l]) => `<div><b>${esc(n)}</b><span>${esc(l)}</span></div>`).join('')}</div>` : '';
  const stack = it.stack.length ? `<div class="cstack">${it.stack.map(s => `<span>${esc(s)}</span>`).join('')}</div>` : '';
  const links = it.links.map((l, i) => `<a class="${i === 0 ? 'cbtn' : 'clink'}"${linkAttrs(l.href)}>${esc(l.label)} <span>${arrow(l.href)}</span></a>`).join('');
  return `<article class="card" aria-label="${esc(it.name)}">
          <div class="cshot"><img src="${esc(it.previewPath)}" alt="${esc(it.alt || it.name)}" loading="lazy" decoding="async"></div>
          <div class="cbody">
            <div class="ctop"><span class="pill s-${it.status}">${st.label}</span><span class="cnum">${it.num} · ${esc(it.group.title)}</span></div>
            <h3>${esc(it.name)}${it.version ? `<sup>${esc(it.version)}</sup>` : ''}</h3>
            <p class="cq">${esc(it.question)}</p>
            <p class="cdesc">${esc(it.body)}</p>
            ${facts}${stack}
            <div class="clinks">${links}</div>
          </div>
        </article>`;
}

function row(it) {
  return `<li class="row" id="${it.slug}">
        <a class="rlink"${linkAttrs(it.primary.href)}>
          <span class="rn">${it.num}</span>
          <span class="rmain"><span class="rname${it.name.length > 18 ? ' xlong' : it.name.length > 13 ? ' long' : ''}">${esc(it.name)}${it.version ? `<sup>${esc(it.version)}</sup>` : ''}</span><span class="rline">${esc(it.line)}</span></span>
          <span class="rst s-${it.status}"><i></i>${STATUS[it.status].label}</span>
          <span class="rgo" aria-hidden="true">${arrow(it.primary.href)}</span>
        </a>
        ${card(it)}
      </li>`;
}

function section(g, gi) {
  const tally = statusTally(g);
  const bar = tally.map(([s, n]) => `<i class="s-${s}" style="flex:${n}" title="${n} ${STATUS[s].label.toLowerCase()}"></i>`).join('');
  const tallyText = tally.map(([s, n]) => `<span class="s-${s}"><i></i>${n} ${STATUS[s].label.toLowerCase()}</span>`).join('');
  const aliases = g.aliases.map(a => `<span id="${esc(a)}" class="alias" aria-hidden="true"></span>`).join('');
  return `<section class="grp${gi % 2 ? ' alt' : ''}" id="${g.slug}" style="--g:${g.accent}">${aliases}
  <div class="wrap">
    <header class="gh reveal">
      <div class="gnum" aria-hidden="true">${g.num}</div>
      <div class="gt">
        <div class="mono gk">Group ${g.num} · ${g.items.length} experiment${g.items.length === 1 ? '' : 's'}</div>
        <h2>${esc(g.title)}</h2>
        <p class="gline">${esc(g.line)}</p>
        <p class="gblurb">${esc(g.blurb)}</p>
      </div>
      <div class="gmeta"><div class="gbar">${bar}</div><div class="gtally">${tallyText}</div></div>
    </header>
    <ol class="hl" data-group="${g.slug}">
      ${g.items.map(row).join('\n      ')}
    </ol>
  </div>
</section>`;
}

const groupList = groups.map(g => g.title.toLowerCase());
const describe = `A field index of ${counts.experiments} experiments by Chris Kluis — ${groupList.slice(0, -1).join(', ')} and ${groupList.at(-1)}. Most built solo in spare hours, all in the open.`;

/* ---------- index.html ---------- */

const template = fs.readFileSync(path.join(ROOT, 'build', 'index.template.html'), 'utf8');
const vars = {
  COUNT: counts.experiments, SHIPPED: counts.shipped, GROUPS: counts.groups,
  DESCRIPTION: esc(describe), NAV: nav, CHIPS: chips, LINEUP: lineup, LEGEND: legend,
  SECTIONS: groups.map(section).join('\n\n'), FIRST: groups[0].slug,
};
let html = template.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
const left = html.match(/\{\{\w+\}\}/g);
if (left) { console.error(`✗ template has unknown placeholders: ${[...new Set(left)].join(', ')}`); process.exit(1); }

/* ---------- registry.json ---------- */

const registry = {
  $comment: 'Generated by build/build.mjs from the folders under groups/. Edit the folders, not this file.',
  counts,
  groups: groups.map(g => ({
    slug: g.slug, folder: `groups/${g.slug}`, number: g.num, title: g.title, line: g.line, blurb: g.blurb, accent: g.accent, aliases: g.aliases,
    items: g.items.map(it => ({
      slug: it.slug, folder: it.folder, number: it.num, name: it.name, ...(it.version ? { version: it.version } : {}),
      status: it.status, line: it.line, question: it.question, body: it.body, stack: it.stack,
      ...(it.facts.length ? { facts: it.facts } : {}), links: it.links, preview: it.previewPath, alt: it.alt || it.name,
    })),
  })),
};

/* ---------- README table ---------- */

const mdLinks = it => it.links.map(l => `[${l.label.toLowerCase()}](${isExternal(l.href) ? l.href : l.href})`).join(' · ');
const table = [
  '| Group | Project | Stack | Status | Links |',
  '|---|---|---|---|---|',
  ...all.map(it => `| ${it.group.title} | **${it.name}**${it.version ? ` ${it.version}` : ''} — ${it.line} | ${it.stack.join(' · ')} | ${STATUS[it.status].label} | ${mdLinks(it)} |`),
].join('\n');
const readmePath = path.join(ROOT, 'README.md');
const readme = fs.readFileSync(readmePath, 'utf8');
const START = '<!-- registry:start -->', END = '<!-- registry:end -->';
if (!readme.includes(START) || !readme.includes(END)) { console.error(`✗ README.md needs ${START} and ${END} markers around the table`); process.exit(1); }
const readmeOut = readme.replace(new RegExp(`${START}[\\s\\S]*?${END}`), `${START}\n${table}\n${END}`);

/* ---------- social card counts ---------- */

const socialPath = path.join(ROOT, 'previews', '_social-experiments-src.html');
let social = fs.readFileSync(socialPath, 'utf8');
const stat = (label, n) => { social = social.replace(new RegExp(`(<div class="n">)\\d+(</div><div class="l">${label}</div>)`), `$1${n}$2`); };
stat('Experiments', counts.experiments); stat('Shipped', counts.shipped); stat('Groups', counts.groups);

/* ---------- write or check ---------- */

const outputs = [
  [path.join(ROOT, 'index.html'), html],
  [path.join(ROOT, 'registry.json'), JSON.stringify(registry, null, 2) + '\n'],
  [readmePath, readmeOut],
  [socialPath, social],
];
const stale = outputs.filter(([file, body]) => !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== body);
if (CHECK) {
  if (stale.length) { console.error(`✗ stale: ${stale.map(([f]) => rel(f)).join(', ')} — run node build/build.mjs`); process.exit(1); }
  console.log(`✓ up to date · ${counts.experiments} experiments, ${counts.shipped} shipped, ${counts.groups} groups`);
} else {
  for (const [file, body] of stale) fs.writeFileSync(file, body);
  console.log(`✓ ${counts.experiments} experiments · ${counts.shipped} shipped · ${counts.groups} groups`);
  console.log(stale.length ? `  wrote ${stale.map(([f]) => rel(f)).join(', ')}` : '  nothing changed');
  if (stale.some(([f]) => f === socialPath)) console.log('  social counts changed — re-shoot previews/social-experiments.png (see README)');
}
