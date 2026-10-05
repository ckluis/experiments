#!/usr/bin/env node
// Builds the index from the folders under groups/.
//
//   groups/<group>/group.json          one per project type: title, question line, accent, order
//   groups/<group>/<item>/item.json    one per experiment: name, status, repo, copy, stack, links
//   groups/<group>/<item>/preview.*    the card image (preview.svg preferred), or "preview": "/repo/path"
//
// Writes registry.json, index.html, the README table and the social-card counts.
//   node build/build.mjs           write
//   node build/build.mjs --check   exit 1 if anything is stale
//   node build/build.mjs --stats   refresh GitHub stars/forks into build/github-stats.json first
//                                  (uses GITHUB_TOKEN if set, otherwise the unauthenticated API)
// No dependencies.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GROUPS = path.join(ROOT, 'groups');
const STATS = path.join(ROOT, 'build', 'github-stats.json');
const CHECK = process.argv.includes('--check');
const REFRESH = process.argv.includes('--stats');

const STATUS = {
  shipped:      { label: 'Shipped',    filter: 'shipped' },
  spec:         { label: 'Spec',       filter: 'progress' },
  concept:      { label: 'Concept',    filter: 'progress' },
  local:        { label: 'Local',      filter: 'progress' },
  'case-study': { label: 'Case study', filter: 'case' },
  archived:     { label: 'Archived',   filter: 'archived' },
};
const FILTERS = [['all', 'All'], ['shipped', 'Shipped'], ['progress', 'Spec & concept'], ['case', 'Case studies'], ['archived', 'Archived']];

const errors = [];
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const isExternal = href => /^https?:\/\//.test(href);
const fmtDate = iso => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

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
  for (const k of ['order', 'title', 'line', 'accent']) if (g[k] == null) errors.push(`groups/${slug}/group.json: missing "${k}"`);
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
    if (it.repo && !/^[\w.-]+\/[\w.-]+$/.test(it.repo)) errors.push(`${where}: "repo" must look like owner/name`);
    if (!Array.isArray(it.links) || !it.links.length) errors.push(`${where}: needs at least one link`);
    it.stack = it.stack || [];
    it.facts = it.facts || [];
    const local = ['svg', 'png', 'jpg', 'jpeg', 'webp'].map(x => `preview.${x}`).find(f => fs.existsSync(path.join(idir, f)));
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

const all = groups.flatMap(g => g.items);

/* ---------- GitHub stats (cached; refreshed only with --stats) ---------- */

let stats = fs.existsSync(STATS) ? JSON.parse(fs.readFileSync(STATS, 'utf8')) : { fetched: null, repos: {} };
if (REFRESH) {
  const headers = { 'User-Agent': 'ckluis-experiments-build', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const next = { fetched: new Date().toISOString().slice(0, 10), repos: {} };
  for (const repo of [...new Set(all.filter(i => i.repo).map(i => i.repo))].sort()) {
    const res = await fetch(`https://api.github.com/repos/${repo}`, { headers });
    if (!res.ok) { console.error(`✗ GitHub ${res.status} for ${repo}${res.status === 403 ? ' (rate limited, set GITHUB_TOKEN)' : ''}`); process.exit(1); }
    const j = await res.json();
    next.repos[repo] = { stars: j.stargazers_count, forks: j.forks_count, pushed: j.pushed_at };
  }
  stats = next;
  fs.writeFileSync(STATS, JSON.stringify(stats, null, 2) + '\n');
  console.log(`✓ refreshed GitHub stats for ${Object.keys(stats.repos).length} repos`);
}
for (const it of all) if (it.repo && !stats.repos[it.repo]) console.warn(`! no cached stats for ${it.repo}; run node build/build.mjs --stats`);

/* ---------- derive ---------- */

const counts = { experiments: all.length, shipped: all.filter(i => i.status === 'shipped').length, groups: groups.length };
groups.forEach((g, gi) => {
  g.num = pad(gi + 1);
  g.items.forEach((it, ii) => { it.num = `${g.num}.${pad(ii + 1)}`; it.group = g; it.primary = it.links[0]; it.gh = it.repo ? stats.repos[it.repo] || null : null; });
});

/* ---------- render pieces ---------- */

const linkAttrs = href => isExternal(href) ? ` href="${esc(href)}" target="_blank" rel="noopener"` : ` href="${esc(href)}"`;
const arrow = href => isExternal(href) ? '↗' : '→';
const num = (it, k) => it.gh
  ? `<span class="c-num${it.gh[k] ? '' : ' zero'}">${it.gh[k]}</span>`
  : `<span class="c-num none" title="${it.repo ? 'not fetched yet' : 'no public repository'}">—</span>`;

const nav = groups.map(g => `<a href="#${g.slug}" data-nav="${g.slug}" style="--g:${g.accent}"><span>${g.num}</span>${esc(g.title)}</a>`).join('');
const chips = groups.map(g => `<a href="#${g.slug}" data-nav="${g.slug}" style="--g:${g.accent}"><i></i>${esc(g.title)}<span>${g.items.length}</span></a>`).join('');
const filters = FILTERS.map(([k, label], i) => {
  const n = k === 'all' ? all.length : all.filter(it => STATUS[it.status].filter === k).length;
  return `<button type="button" data-filter="${k}" aria-pressed="${i === 0}">${label}<span>${n}</span></button>`;
}).join('');

function card(it) {
  const facts = it.facts.length ? `<div class="kf">${it.facts.slice(0, 3).map(([n, l]) => `<span><b>${esc(n)}</b> ${esc(l)}</span>`).join('')}</div>` : '';
  const links = it.links.map((l, i) => `<a class="${i === 0 ? 'kb' : 'kl'}"${linkAttrs(l.href)}>${esc(l.label)} ${arrow(l.href)}</a>`).join('');
  const updated = it.gh && it.gh.pushed ? `<span class="kd">updated ${fmtDate(it.gh.pushed)}</span>` : '';
  return `<div class="card" style="--g:${it.group.accent}">
          <div class="kimg"><img src="${esc(it.previewPath)}" alt="${esc(it.alt || it.name)}" loading="lazy" decoding="async" width="640" height="400"></div>
          <div class="kbody">
            <div class="kt"><b>${esc(it.name)}${it.version ? ` <sup>${esc(it.version)}</sup>` : ''}</b><span class="kst s-${it.status}">${STATUS[it.status].label}</span></div>
            <p class="kq">${esc(it.question)}</p>
            <p class="kdesc">${esc(it.body)}</p>
            ${facts}
            <div class="ks">${it.stack.map(s => `<span>${esc(s)}</span>`).join('')}${updated}</div>
            <div class="kls">${links}</div>
          </div>
        </div>`;
}

function row(it) {
  return `<li class="row" id="${it.slug}" data-status="${STATUS[it.status].filter}">
        <a class="rlink"${linkAttrs(it.primary.href)}>
          <span class="c-proj"><b>${esc(it.name)}</b>${it.version ? `<sup>${esc(it.version)}</sup>` : ''}</span>
          <span class="c-desc">${esc(it.line)}</span>
          <span class="c-st s-${it.status}"><i></i>${STATUS[it.status].label}</span>
          ${num(it, 'stars')}
          ${num(it, 'forks')}
          <span class="c-go" aria-hidden="true">${arrow(it.primary.href)}</span>
        </a>
        <details class="more"><summary aria-label="Preview ${esc(it.name)}"><span></span></summary></details>
        ${card(it)}
      </li>`;
}

function section(g) {
  const aliases = g.aliases.map(a => `<span id="${esc(a)}" class="alias" aria-hidden="true"></span>`).join('');
  return `<section class="tg" id="${g.slug}" style="--g:${g.accent}">${aliases}
      <header class="tgh">
        <span class="tgn">${g.num}</span>
        <h2>${esc(g.title)}</h2>
        <p>${esc(g.line)}</p>
        <span class="tgc">${g.items.length}</span>
      </header>
      <ol class="rows">
      ${g.items.map(row).join('\n      ')}
      </ol>
    </section>`;
}

const groupList = groups.map(g => g.title.toLowerCase());
const describe = `A field index of ${counts.experiments} experiments by Chris Kluis: ${groupList.slice(0, -1).join(', ')} and ${groupList.at(-1)}. Most built solo in spare hours, all in the open.`;

/* ---------- index.html ---------- */

const template = fs.readFileSync(path.join(ROOT, 'build', 'index.template.html'), 'utf8');
const vars = {
  COUNT: counts.experiments, SHIPPED: counts.shipped, GROUPS: counts.groups,
  DESCRIPTION: esc(describe), NAV: nav, CHIPS: chips, FILTERS: filters,
  SECTIONS: groups.map(section).join('\n    '), FIRST: groups[0].slug,
  STATS_DATE: stats.fetched ? fmtDate(stats.fetched) : 'not yet fetched',
};
const html = template.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
const left = html.match(/\{\{\w+\}\}/g);
if (left) { console.error(`✗ template has unknown placeholders: ${[...new Set(left)].join(', ')}`); process.exit(1); }

/* ---------- registry.json ---------- */

const registry = {
  $comment: 'Generated by build/build.mjs from the folders under groups/. Edit the folders, not this file.',
  counts,
  stats_fetched: stats.fetched,
  groups: groups.map(g => ({
    slug: g.slug, folder: `groups/${g.slug}`, number: g.num, title: g.title, line: g.line, accent: g.accent, aliases: g.aliases,
    items: g.items.map(it => ({
      slug: it.slug, folder: it.folder, number: it.num, name: it.name, ...(it.version ? { version: it.version } : {}),
      status: it.status, ...(it.repo ? { repo: it.repo, github: it.gh } : {}),
      line: it.line, question: it.question, body: it.body, stack: it.stack,
      ...(it.facts.length ? { facts: it.facts } : {}), links: it.links, preview: it.previewPath, alt: it.alt || it.name,
    })),
  })),
};

/* ---------- README table ---------- */

const mdLinks = it => it.links.map(l => `[${l.label.toLowerCase()}](${isExternal(l.href) ? l.href : l.href})`).join(' · ');
const table = [
  '| Type | Project | Stack | Status | Links |',
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
