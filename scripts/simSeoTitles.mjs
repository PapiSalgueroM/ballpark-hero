/**
 * ROUND 642: THE SEARCH TITLE AND DESCRIPTION FENCE.
 *
 * The owner asked for "lots of key words ... because we need more traction to
 * our website". A search result is a page's <title> and meta description, and
 * before this round many game pages had titles that named no sport and no
 * kind of game ("Missing XI | DoUKnowBall", "Rarity Round | DoUKnowBall") and
 * descriptions long enough to be cut off mid sentence. Every game in
 * src/data/gameRegistry.ts now has a title (without the brand suffix) and a
 * description in src/data/seoMeta.ts, keyed by path, which
 * src/components/seo/PageSeo.tsx loads with a cached dynamic import so the
 * text stays out of the entry chunk every page loads. This harness holds all
 * of that to its rules.
 *
 *   1. THE WORDS. Every registry game has an entry and no entry names a path
 *      the registry does not have. Each title carries the game's label exactly
 *      once, is unique across the site (other games, the hubs and every page
 *      that passes its own title), names a sport or league word from its
 *      category's list below, and fits in 60 characters with " | DoUKnowBall"
 *      on it, or in 60 without it when PageSeo drops the brand (reported by
 *      name). Each description is 120 to 158 characters, unique, contains
 *      "free" and a sport word. No dash character anywhere and no hyphen
 *      outside the label itself.
 *   2. THE RENDER. PageSeo rendered through react-dom/server inside a
 *      MemoryRouter and a HelmetProvider. Before the module loads, a game page
 *      renders its own props (so the text really is lazy) and no Game
 *      JSON-LD (a render React discards strands its Helmet instance, and a
 *      stranded one must not carry a stale Game block). After
 *      loadSeoMeta() resolves, every game route renders, with a page prop
 *      that is deliberately different, a <title>, meta description, og:title,
 *      og:description, twitter:title, twitter:description and JSON-LD name and
 *      description equal to seoMeta after PageSeo's brand rule, each exactly
 *      once. A route with no entry keeps the props it passed.
 *   3. THE SAVED PAGES. Where public/<route>/index.html carries the seoMeta
 *      description, its head must carry all six tags exactly as rendered and
 *      exactly one Game JSON-LD block, named with the new title. A
 *      snapshot that carries none of it predates this round and is skipped,
 *      loudly: npm run build:seo refreshes it. BUT once any saved page carries
 *      the new text, every one must: a mix is red, because a page whose lazy
 *      chunk failed to land during the prerender reads exactly like one that
 *      predates the round, and a half refreshed set is never shippable.
 *   4. THE ENTRY CHUNK. After npm run build, the chunk dist/index.html loads
 *      must not contain the SEO text (two descriptions are searched for), and
 *      exactly one other chunk must: the lazy seoMeta chunk, whose size is
 *      reported. A dist with the text in no chunk predates this round and is
 *      skipped, loudly.
 *
 * NEGATIVE CONTROLS (SEO_TITLES_CONTROL). Each refuses to run if its anchor is
 * missing, edits only an in memory copy, and must turn exactly its own section
 * red with the finding it names:
 *   dupetitle   /hockey-career takes /baseball-career's title           section 1
 *   longdesc    /footle's description grows past 158 characters         section 1
 *   noregistry  PageSeo ignores seoMeta and uses the page prop          section 2
 *   earlyld     a game page emits its Game JSON-LD before the chunk     section 2
 *   staleshot   a saved /club-manager head keeps its old title          section 3
 *   twold       a saved /club-manager head carries two Game blocks      section 3
 *   inentry     a side build where PageSeo imports seoMeta statically,  section 4
 *               putting the map back on the entry chunk's import path
 *               (vite build into a temp dir through a transform plugin,
 *               about a minute; the real dist and src are untouched)
 * Under a control the harness exits 1 when exactly the predicted section is
 * red (the break was caught) and 2 when it is not (the control proves nothing).
 *
 * Run: npm run build && node scripts/simSeoTitles.mjs
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const SEO = path.join(ROOT, 'src/components/seo/PageSeo.tsx');

const BRAND = ' | DoUKnowBall';
const TITLE_LIMIT = 60;
const DESC_MIN = 120;
const DESC_MAX = 158;
/* The two descriptions section 4 looks for in the built chunks. Chosen with no
   quote or backslash in them, so the minified JS carries them byte for byte. */
const PROBE_PATHS = ['/footle', '/club-manager'];

/* The sport and league words a title and a description must name, one list per
   registry category. The World & Olympic category spans every sport, so it
   takes all of the others plus its own. */
const SPORT_WORDS = {
  'Soccer': ['soccer', 'football', 'World Cup'],
  'Pro Football': ['NFL', 'football'],
  'College Sports': ['college football', 'college basketball', 'college sports', 'CFB', 'CBB', 'NCAA'],
  'Pro Basketball': ['NBA', 'basketball'],
  'Baseball': ['MLB', 'baseball'],
  'Hockey': ['NHL', 'hockey'],
  'Formula 1': ['F1', 'Formula 1'],
  'Tennis': ['tennis', 'ATP', 'WTA'],
  'Golf': ['golf'],
  'Aussie Rules': ['AFL', 'Aussie rules', 'footy'],
  'NASCAR': ['NASCAR'],
  'Combat Sports': ['boxing', 'UFC', 'MMA'],
};
SPORT_WORDS['World & Olympic Games'] = ['sports', 'Olympic', ...new Set(Object.values(SPORT_WORDS).flat())];

const CONTROLS = {
  dupetitle: { section: 1, finding: 'shares its title' },
  longdesc: { section: 1, finding: 'characters, outside' },
  noregistry: { section: 2, finding: 'rendered <title>' },
  earlyld: { section: 2, finding: 'before the seoMeta chunk was loaded, a stranded' },
  staleshot: { section: 3, finding: 'saved title' },
  twold: { section: 3, finding: 'Game JSON-LD block(s)' },
  inentry: { section: 4, finding: 'entry chunk' },
};
const CONTROL = process.env.SEO_TITLES_CONTROL || '';
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`SEO_TITLES_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}
const abort = m => { console.error(`simSeoTitles: cannot run: ${m}`); process.exit(2); };
const lf = s => s.replaceAll('\r\n', '\n');

/* A worktree inside the repo has no node_modules of its own, so walk up for
   the tools and the packages rather than trusting ROOT/node_modules. */
function findUp(rel) {
  let dir = ROOT;
  for (let i = 0; i < 6; i += 1) {
    const p = path.join(dir, 'node_modules', rel);
    if (fs.existsSync(p)) return p;
    dir = path.dirname(dir);
  }
  return null;
}
const ESBUILD = findUp('.bin/esbuild');
const REACT = findUp('react/package.json');
if (!ESBUILD || !REACT) abort('esbuild or react not found in any node_modules above the repo');
const MODULES = path.dirname(path.dirname(REACT));

/* ---- PageSeo, seoMeta, the registry and a renderer, bundled once ---- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `seoTitles-${process.pid}-`));
const pageSeoSrc = lf(fs.readFileSync(SEO, 'utf8'));
/* The load itself, not the type beside it that names the same module. */
const LAZY_ANCHOR = "seoMetaLoad = import('@/data/seoMeta')";
const LOOKUP_ANCHOR = 'const entry = meta?.[path];';
let seoPath = SEO;
const HOLD_ANCHOR = 'const holdJsonLd = isGame && !meta;';
if (CONTROL === 'noregistry') {
  if (!pageSeoSrc.includes(LOOKUP_ANCHOR)) abort('control noregistry: the seoMeta lookup in PageSeo is not in the shape it rewrites');
  seoPath = path.join(TMP, 'PageSeo.noregistry.tsx');
  fs.writeFileSync(seoPath, pageSeoSrc.replace(LOOKUP_ANCHOR, 'const entry = (null as SeoMetaMap | null)?.[path];'));
  console.log('CONTROL noregistry: PageSeo never reads seoMeta, so every page falls back to its own prop; section 2 must go red');
}
if (CONTROL === 'earlyld') {
  if (!pageSeoSrc.includes(HOLD_ANCHOR)) abort('control earlyld: the JSON-LD hold in PageSeo is not in the shape it rewrites');
  seoPath = path.join(TMP, 'PageSeo.earlyld.tsx');
  fs.writeFileSync(seoPath, pageSeoSrc.replace(HOLD_ANCHOR, 'const holdJsonLd = isGame && false;'));
  console.log('CONTROL earlyld: a game page emits its Game JSON-LD before the seoMeta chunk lands; section 2 must go red');
}
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.cjs');
fs.writeFileSync(ENTRY, `
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PageSeo, { loadSeoMeta } from '${seoPath.replaceAll('\\', '/')}';
export { loadSeoMeta };
export { CATEGORIES, ALL_GAMES } from '${ROOT_URL}/src/data/gameRegistry.ts';
export { SEO_META } from '${ROOT_URL}/src/data/seoMeta.ts';
export const render = (route, props) => {
  const context = {};
  const markup = renderToStaticMarkup(
    React.createElement(HelmetProvider, { context },
      React.createElement(MemoryRouter, { initialEntries: [route] },
        React.createElement(PageSeo, props))));
  const h = context.helmet;
  /* React 18 hands the head to the context; React 19 would render it inline.
     Reading both means the check survives that upgrade. */
  return markup + (h ? [h.title, h.meta, h.link, h.script].map(x => x.toString()).join('') : '');
};
`);
execSync(`"${ESBUILD}" "${ENTRY}" --bundle --format=cjs --platform=node --jsx=automatic --alias:@=${ROOT_URL}/src --outfile="${BUNDLE}" --log-level=error`, {
  stdio: 'inherit',
  env: { ...process.env, NODE_PATH: MODULES },
});
const { CATEGORIES, ALL_GAMES, SEO_META, loadSeoMeta, render: renderRaw } = createRequire(import.meta.url)(BUNDLE);
/* React 18's server renderer warns that useLayoutEffect does nothing on the
   server once per Router. Only that message is dropped. */
const render = (route, props) => {
  const error = console.error;
  console.error = (...a) => { if (!String(a[0]).includes('useLayoutEffect does nothing on the server')) error(...a); };
  try { return renderRaw(route, props); } finally { console.error = error; }
};

/* ---- helpers ---- */
const decode = s => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const count = (s, sub) => s.split(sub).length - 1;
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const namesSport = (s, cat) => SPORT_WORDS[cat].some(w => new RegExp(`\\b${escRe(w).replace(/ /g, '\\s')}\\b`, 'i').test(s));
/* Built from code points so this file carries no dash character of its own. */
const DASH = new RegExp(`[${String.fromCharCode(0x2010)}-${String.fromCharCode(0x2015)}${String.fromCharCode(0x2212)}]`);
/* The brand rule, restated here rather than imported, so a change to it in
   PageSeo shows up as a disagreement instead of being agreed with. */
const expectedTitle = full => (full.length > TITLE_LIMIT && full.endsWith(BRAND) ? full.slice(0, -BRAND.length) : full);
const kb = n => `${(n / 1024).toFixed(1)} KB`;

/** Every head tag this harness cares about, from a rendered string or a saved page's head. */
function headOf(html) {
  const metas = key => [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map(m => m[0])
    .filter(t => new RegExp(`(?:name|property)="${escRe(key)}"`).test(t))
    .map(t => decode((t.match(/content="([^"]*)"/) ?? [])[1] ?? ''));
  const titles = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map(m => decode(m[1]));
  const ld = [];
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1]);
      for (const o of Array.isArray(parsed) ? parsed : [parsed]) if (o['@type'] === 'Game') ld.push(o);
    } catch { /* an unparseable block is simSchema's to report */ }
  }
  return {
    title: titles,
    description: metas('description'),
    'og:title': metas('og:title'),
    'og:description': metas('og:description'),
    'twitter:title': metas('twitter:title'),
    'twitter:description': metas('twitter:description'),
    ld,
  };
}

const findings = { 1: [], 2: [], 3: [], 4: [] };
const notes = { 1: '', 2: '', 3: '', 4: '' };
const skipped = { 3: [], 4: [] };

/* ---------- 1. the words ---------- */
/* An in memory copy, so a control that edits it can never reach PageSeo. */
const entries = CATEGORIES.flatMap(c => c.games.map(g => ({
  path: g.path, label: g.label, category: c.title,
  title: SEO_META[g.path]?.title, description: SEO_META[g.path]?.description,
})));
if (CONTROL === 'dupetitle') {
  const from = entries.find(e => e.path === '/baseball-career');
  const to = entries.find(e => e.path === '/hockey-career');
  if (!from?.title || !to?.title || from.label !== to.label) abort('control dupetitle: /baseball-career and /hockey-career no longer share a label with titles to copy');
  to.title = from.title;
  console.log(`CONTROL dupetitle: /hockey-career now reads "${to.title}"; section 1 must go red`);
}
if (CONTROL === 'longdesc') {
  const e = entries.find(x => x.path === '/footle');
  if (!e?.description || e.description.length > DESC_MAX) abort('control longdesc: /footle has no description inside the limit to grow');
  e.description += ' New mystery player every single day for everyone.';
  if (e.description.length <= DESC_MAX) abort('control longdesc: the grown description is still inside the limit');
  console.log(`CONTROL longdesc: /footle's description is now ${e.description.length} characters; section 1 must go red`);
}
{
  const f = findings[1];
  const registryPaths = new Set(entries.map(e => e.path));
  for (const p of Object.keys(SEO_META)) if (!registryPaths.has(p)) f.push(`src/data/seoMeta.ts has an entry for ${p}, which is not a registry game`);
  /* Titles the rest of the site already uses: the hubs and every page that
     passes a literal title for a route the registry does not own. */
  const siteTitles = new Map();
  const pagesDir = path.join(ROOT, 'src/pages');
  for (const file of fs.readdirSync(pagesDir)) {
    if (!file.endsWith('.tsx') || file.endsWith('.test.tsx')) continue;
    for (const m of lf(fs.readFileSync(path.join(pagesDir, file), 'utf8')).matchAll(/<PageSeo\b([\s\S]{0,900}?)\/>/g)) {
      const p = (m[1].match(/path="([^"]+)"/) ?? [])[1];
      const t = (m[1].match(/title="([^"]+)"/) ?? [])[1];
      if (t && p && !registryPaths.has(p)) siteTitles.set(t, `src/pages/${file}`);
    }
  }
  for (const m of lf(fs.readFileSync(path.join(ROOT, 'src/lib/sportHub.ts'), 'utf8')).matchAll(/seoTitle:\s*'([^']+)'/g)) siteTitles.set(m[1], 'src/lib/sportHub.ts');

  const byTitle = new Map(), byDesc = new Map();
  const dropped = [];
  let kept = 0;
  for (const e of entries) {
    const { title: t, description: d, label, path: p } = e;
    if (!t || !d) { f.push(`${p} has no ${!t ? 'title' : 'description'} in src/data/seoMeta.ts`); continue; }
    const n = count(t, label);
    if (n !== 1) f.push(`${p}: the title "${t}" carries the label "${label}" ${n} times, not once`);
    if (byTitle.has(t)) f.push(`${p} shares its title with ${byTitle.get(t)}: "${t}"`);
    else byTitle.set(t, p);
    const full = t + BRAND;
    if (siteTitles.has(full) || siteTitles.has(t)) f.push(`${p} shares its title with ${siteTitles.get(full) ?? siteTitles.get(t)}: "${t}"`);
    if (full.length <= TITLE_LIMIT) kept += 1;
    else if (t.length <= TITLE_LIMIT) dropped.push(`${p} (${t.length})`);
    else f.push(`${p}: the title is ${t.length} characters even without the brand, over ${TITLE_LIMIT}`);
    if (!namesSport(t, e.category)) f.push(`${p}: the title "${t}" names no ${e.category} word (${SPORT_WORDS[e.category].slice(0, 6).join(', ')})`);
    if (d.length < DESC_MIN || d.length > DESC_MAX) f.push(`${p}: the description is ${d.length} characters, outside ${DESC_MIN} to ${DESC_MAX}`);
    if (byDesc.has(d)) f.push(`${p} shares its description with ${byDesc.get(d)}`);
    else byDesc.set(d, p);
    if (!/\bfree\b/i.test(d)) f.push(`${p}: the description never says free`);
    if (!namesSport(d, e.category)) f.push(`${p}: the description names no ${e.category} word`);
    if (DASH.test(t) || DASH.test(d)) f.push(`${p}: a dash character in the title or description`);
    if (t.split(label).join('').includes('-')) f.push(`${p}: a hyphen in the title outside the label: "${t}"`);
    if (d.split(label).join('').includes('-')) f.push(`${p}: a hyphen in the description outside the label`);
  }
  notes[1] = `${entries.length} games, ${byTitle.size} distinct titles, ${byDesc.size} distinct descriptions, ${kept} keep the brand in 60, ${dropped.length} drop it${dropped.length ? ` (${dropped.join(', ')})` : ''}, checked against ${siteTitles.size} other page titles`;
}

/* ---------- 2. the render ---------- */
const rendered = new Map();
{
  const f = findings[2];
  const games = ALL_GAMES.filter((g, i, a) => a.findIndex(x => x.path === g.path) === i && SEO_META[g.path]);
  const propsFor = p => ({
    title: `Page prop title for ${p}${BRAND}`,
    description: `Page prop description for ${p}, which seoMeta must replace.`,
    path: p,
  });
  /* 2a. Nothing has asked for the module yet, so the first render must be
     the page's own props: the text is lazy, not imported. */
  const first = headOf(render('/footle', propsFor('/footle')));
  if (first.title[0] !== propsFor('/footle').title) {
    f.push(`/footle rendered "${first.title[0]}" before the seoMeta chunk was loaded, so the text is not lazy`);
  }
  /* And it holds its Game block: Helmet strands an instance from a discarded
     render, and a stranded one carrying the prop's JSON-LD left two Game
     blocks in the head on 19 of 24 fresh browser renders. */
  if (first.ld.length) f.push(`/footle rendered ${first.ld.length} Game JSON-LD block(s) before the seoMeta chunk was loaded, a stranded early render would keep it beside the real one`);
  /* 2b. Load it the way the page does, then every later render reads the
     cache synchronously. */
  const loaded = await loadSeoMeta();
  if (!loaded) f.push('loadSeoMeta() resolved to nothing, so the seoMeta module did not load');
  for (const g of games) {
    const meta = SEO_META[g.path];
    const head = headOf(render(g.path, propsFor(g.path)));
    rendered.set(g.path, head);
    const full = meta.title + BRAND;
    const want = {
      title: expectedTitle(full),
      description: meta.description,
      'og:title': full,
      'og:description': meta.description,
      'twitter:title': full,
      'twitter:description': meta.description,
    };
    for (const [key, value] of Object.entries(want)) {
      const got = head[key];
      const tag = key === 'title' ? '<title>' : key;
      if (got.length !== 1) f.push(`${g.path}: rendered ${got.length} ${tag} tags, expected exactly 1`);
      else if (got[0] !== value) f.push(`${g.path}: rendered ${tag} "${got[0].slice(0, 70)}", seoMeta says "${value.slice(0, 70)}"`);
    }
    if (head.ld.length !== 1) f.push(`${g.path}: rendered ${head.ld.length} Game JSON-LD objects, expected 1`);
    else if (head.ld[0].name !== full || head.ld[0].description !== meta.description) f.push(`${g.path}: the Game JSON-LD name or description is not seoMeta's`);
  }
  /* A route with no entry keeps exactly what it passed, loaded or not. */
  const own = { title: 'About DoUKnowBall', description: 'A page with no seoMeta entry keeps the description it passes.', path: '/about' };
  if (SEO_META[own.path]) abort('/about has a seoMeta entry now, pick another route for the fallback check');
  const head = headOf(render(own.path, own));
  if (head.title[0] !== own.title || head.description[0] !== own.description || head['og:title'][0] !== own.title) {
    f.push(`/about has no seoMeta entry and did not keep its own props (title "${head.title[0]}")`);
  }
  notes[2] = `/footle renders its own props before the chunk loads; after it, ${rendered.size} game routes render seoMeta in six tags and the JSON-LD; /about keeps its own props`;
}

/* ---------- 3. the saved pages ---------- */
if (CONTROL && CONTROL !== 'staleshot' && CONTROL !== 'twold') {
  notes[3] = `not run under control ${CONTROL}: it reads the real saved pages`;
} else {
  const f = findings[3];
  let compared = 0;
  for (const g of ALL_GAMES) {
    const meta = SEO_META[g.path];
    const r = rendered.get(g.path);
    if (!meta || !r) continue;
    const full = meta.title + BRAND;
    const file = path.join(ROOT, 'public', g.path.slice(1), 'index.html');
    let html;
    if (CONTROL === 'staleshot' && g.path === '/club-manager') {
      html = `<head><title>Club Manager: Football Management Sim${BRAND}</title>`
        + `<meta name="description" content="${meta.description}">`
        + `<meta property="og:title" content="${full}"><meta property="og:description" content="${meta.description}">`
        + `<meta name="twitter:title" content="${full}"><meta name="twitter:description" content="${meta.description}"></head>`;
      console.log('CONTROL staleshot: a saved /club-manager head carries the new description under its old title; section 3 must go red');
    } else if (CONTROL === 'twold' && g.path === '/club-manager') {
      /* Every tag right, plus the stranded instance's block beside the real one. */
      const ld = name => `<script type="application/ld+json" data-rh="true">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Game', name, description: meta.description })}</script>`;
      html = `<head><title>${expectedTitle(full)}</title>`
        + `<meta name="description" content="${meta.description}">`
        + `<meta property="og:title" content="${full}"><meta property="og:description" content="${meta.description}">`
        + `<meta name="twitter:title" content="${full}"><meta name="twitter:description" content="${meta.description}">`
        + `${ld(`Club Manager: Football Management Sim${BRAND}`)}${ld(full)}</head>`;
      console.log('CONTROL twold: a saved /club-manager head is right in every tag but carries a stale Game JSON-LD beside the real one; section 3 must go red');
    } else if (fs.existsSync(file)) {
      const doc = fs.readFileSync(file, 'utf8');
      const end = doc.indexOf('</head>');
      html = end >= 0 ? doc.slice(0, end) : doc;
    } else {
      skipped[3].push(`${g.path}: no saved page at public${g.path}/index.html`);
      continue;
    }
    const saved = headOf(html);
    /* WHY THE DESCRIPTION DECIDES AND NOT THE TITLE. Two games kept the title
       they already had (Stadium Tycoon and Idle Arena), so an old snapshot can
       carry the seoMeta title by coincidence. Every seoMeta description is new
       text, so a saved head holding none of it in any of its three places was
       written before this round. One holding it anywhere was written after,
       and then every tag must agree. */
    const hasDesc = [saved.description, saved['og:description'], saved['twitter:description']].some(a => a.includes(meta.description));
    if (!hasDesc) {
      skipped[3].push(`${g.path}: public${g.path}/index.html predates this round (title "${(saved.title[0] ?? '').slice(0, 50)}"); npm run build:seo refreshes it`);
      continue;
    }
    compared += 1;
    for (const key of ['title', 'description', 'og:title', 'og:description', 'twitter:title', 'twitter:description']) {
      const want = r[key][0];
      const got = saved[key];
      if (got.length !== 1 || got[0] !== want) f.push(`${g.path}: saved ${key} "${(got[0] ?? 'missing').slice(0, 60)}" is not the rendered "${want.slice(0, 60)}"${got.length > 1 ? ` (${got.length} tags)` : ''}`);
    }
    const names = saved.ld.map(o => o.name);
    if (saved.ld.length !== 1 || names[0] !== full || saved.ld[0].description !== meta.description) {
      f.push(`${g.path}: saved head carries ${saved.ld.length} Game JSON-LD block(s) (${names.map(n => `"${String(n).slice(0, 40)}"`).join(', ')}), expected exactly one named "${full.slice(0, 40)}"`);
    }
  }
  /* A MIX IS RED. Before build:seo every saved page predates this round and
     after it none does. Some carrying the new text while others do not means
     a partial refresh, or a page whose lazy chunk never landed while the
     prerenderer watched, and the two look identical from here. */
  if (compared > 0 && skipped[3].length > 0) {
    f.push(`${compared} saved pages carry the seoMeta text and ${skipped[3].length} do not (first: ${skipped[3][0].split(':')[0]}); a half refreshed set means a partial prerender or a chunk that never landed, run npm run build:seo`);
  }
  notes[3] = `${compared} saved page${compared === 1 ? '' : 's'} compared, ${skipped[3].length} skipped`;
}

/* ---------- 4. the entry chunk ---------- */
let distDir = path.join(ROOT, 'dist');
if (CONTROL === 'inentry') {
  if (count(pageSeoSrc, LAZY_ANCHOR) !== 1) abort(`control inentry: PageSeo carries "${LAZY_ANCHOR}" ${count(pageSeoSrc, LAZY_ANCHOR)} times, not once, so there is no one load to make static`);
  const vitePath = findUp('vite/dist/node/index.js');
  if (!vitePath) abort('control inentry: vite not found in any node_modules above the repo');
  const { build } = await import(pathToFileURL(vitePath).href);
  distDir = path.join(TMP, 'dist-inentry');
  let fired = false;
  console.log('CONTROL inentry: a side build where PageSeo imports seoMeta statically, so the map rides the entry chunk again; section 4 must go red');
  try {
    await build({
      root: ROOT,
      configFile: path.join(ROOT, 'vite.config.ts'),
      mode: 'production',
      logLevel: 'error',
      build: { outDir: distDir, emptyOutDir: true },
      plugins: [{
        name: 'seo-titles-control-inentry',
        enforce: 'pre',
        transform(code, id) {
          if (!id.replaceAll('\\', '/').endsWith('src/components/seo/PageSeo.tsx')) return null;
          const src = lf(code);
          if (count(src, LAZY_ANCHOR) !== 1) return null;
          fired = true;
          return `import * as seoMetaStatic from '@/data/seoMeta';\n${src.replace(LAZY_ANCHOR, 'seoMetaLoad = Promise.resolve(seoMetaStatic)')}`;
        },
      }],
    });
  } catch (e) {
    /* A crash must never read as a caught break: that is exit 2, not 1. */
    abort(`control inentry: the side build failed: ${String(e?.message ?? e).split('\n')[0]}`);
  }
  if (!fired) abort('control inentry: the transform never saw PageSeo, so the side build proves nothing');
}
{
  const f = findings[4];
  const indexHtml = path.join(distDir, 'index.html');
  const probes = PROBE_PATHS.map(p => SEO_META[p]?.description);
  if (probes.some(d => !d || /["'\\]/.test(d))) abort(`the probe descriptions (${PROBE_PATHS.join(', ')}) are missing or carry a quote or backslash`);
  if (!fs.existsSync(indexHtml)) {
    skipped[4].push(`no ${path.relative(ROOT, indexHtml)}: run npm run build first`);
    notes[4] = 'no build to read';
  } else {
    const entryRel = (fs.readFileSync(indexHtml, 'utf8').match(/<script[^>]+type="module"[^>]+src="\/(assets\/[^"]+\.js)"/) ?? [])[1];
    if (!entryRel) {
      f.push('dist/index.html loads no module script, so the entry chunk cannot be found');
    } else {
      const assets = path.join(distDir, 'assets');
      const holders = fs.readdirSync(assets).filter(n => n.endsWith('.js')).filter(n => {
        const js = fs.readFileSync(path.join(assets, n), 'utf8');
        return probes.every(d => js.includes(d));
      });
      const entryName = path.basename(entryRel);
      const entryBytes = fs.readFileSync(path.join(distDir, entryRel));
      const entryText = entryBytes.toString('utf8');
      const inEntry = probes.filter(d => entryText.includes(d)).length;
      if (inEntry) f.push(`the entry chunk ${entryName} carries ${inEntry} of the ${probes.length} probe descriptions, so every page pays for all 127`);
      if (!holders.length) {
        skipped[4].push(`${path.relative(ROOT, distDir)} holds none of the SEO text in any chunk, so it predates this round; run npm run build`);
        notes[4] = `entry ${entryName} ${kb(entryBytes.length)}, no chunk holds the SEO text yet`;
      } else {
        const lazy = holders.filter(n => n !== entryName);
        if (lazy.length !== 1 && !inEntry) f.push(`the SEO text sits in ${lazy.length} non entry chunks (${lazy.join(', ')}), expected exactly one`);
        const sizes = lazy.map(n => {
          const b = fs.readFileSync(path.join(assets, n));
          return `${n} ${kb(b.length)} raw, ${kb(gzipSync(b).length)} gzipped`;
        });
        notes[4] = `entry ${entryName} ${kb(entryBytes.length)} raw, ${kb(gzipSync(entryBytes).length)} gzipped, carries ${inEntry} of ${probes.length} probes; SEO text in ${sizes.join('; ') || 'the entry chunk only'}`;
      }
    }
  }
}

fs.rmSync(TMP, { recursive: true, force: true });

/* ---------- the report ---------- */
const TITLES = {
  1: 'the words: label once, unique, sport word, 60 with the brand, 120 to 158 with free, no dash',
  2: 'the render: props before the chunk, seoMeta everywhere after it',
  3: 'the saved pages carry the seoMeta head once prerendered, all or none',
  4: 'the entry chunk carries none of the SEO text; one lazy chunk carries it',
};
console.log('');
for (const n of [1, 2, 3, 4]) {
  console.log(`${n}) ${TITLES[n]}`);
  for (const m of findings[n].slice(0, 12)) console.error(`  FAIL: ${m}`);
  if (findings[n].length > 12) console.error(`  ... and ${findings[n].length - 12} more`);
  console.log(`   ${findings[n].length ? 'RED' : 'ok '} ${notes[n]}`);
  const s = skipped[n] ?? [];
  for (const line of s.slice(0, 8)) console.log(`   SKIP (loud): ${line}`);
  if (s.length > 8) console.log(`   SKIP (loud): ... and ${s.length - 8} more`);
}
const red = [1, 2, 3, 4].filter(n => findings[n].length);
const total = red.reduce((t, n) => t + findings[n].length, 0);
console.log('');
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const caught = red.length === 1 && red[0] === want.section && findings[want.section].some(m => m.includes(want.finding));
  if (caught) {
    console.log(`simSeoTitles control ${CONTROL}: section ${want.section} red with the expected finding and every other section green, the break was caught where it should be (exit 1)`);
    process.exit(1);
  }
  console.error(`simSeoTitles control ${CONTROL}: DEAD OR LEAKY. Expected only section ${want.section} red with "${want.finding}", got red in [${red.join(', ') || 'none'}]`);
  process.exit(2);
}
if (red.length) {
  console.error(`simSeoTitles: RED, ${total} failure${total === 1 ? '' : 's'} in section${red.length === 1 ? '' : 's'} ${red.join(', ')}`);
  process.exit(1);
}
const waits = [skipped[3].length ? `${skipped[3].length} saved pages still wait for build:seo` : 'every saved page matches', skipped[4].length ? 'the entry chunk check waits for a build' : 'the entry chunk is clean'];
console.log(`simSeoTitles: green. ${rendered.size} games carry a keyword title and description, PageSeo renders them lazily, ${waits.join(', and ')}.`);
