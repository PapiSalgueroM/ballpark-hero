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
 * ROUND 700: THE ONE LAZY CHUNK BECAME 32 PARTS. Every game page fetched all
 * 127 entries (9.3K gzipped) to read one, so scripts/genSeoMetaParts.mjs now
 * splits src/data/seoMeta.ts into src/data/seoMetaParts by a hash of the path
 * and PageSeo loads only the part holding its own page. Three sections moved
 * with it:
 *   2. loadSeoMeta takes the page's path and loads that part. With only
 *      /footle's part loaded, a game in another part still renders its own
 *      props, so no part carries text that is not its own; then every game's
 *      part is loaded the way its page loads it and every route renders as
 *      before.
 *   4. Every description the minifier keeps byte for byte (no quote, no
 *      backslash, no backtick) is searched for in every built chunk: none may
 *      sit in the entry chunk, each must sit in exactly one other chunk, the
 *      part chunk its path hashes to, and no chunk may hold entries from two
 *      parts (the shape of the old whole map). The part sizes are reported.
 *   6. THE PARTS ARE WHAT THE SOURCE MAKES. genSeoMetaParts in check mode
 *      finds nothing to rewrite, and through the page's own lookup every
 *      entry is found, word for word, in the part the page would load and in
 *      no other part, and no part carries a path the source does not.
 *
 * NEGATIVE CONTROLS (SEO_TITLES_CONTROL). Each refuses to run if its anchor is
 * missing, edits only an in memory copy, and must turn exactly its own section
 * red with the finding it names:
 *   dupetitle   /nba-higher-lower is planted as /nba-career's twin      section 1
 *   longdesc    /footle's description grows past 158 characters         section 1
 *   noregistry  PageSeo ignores seoMeta and uses the page prop          section 2
 *   earlyld     a game page emits its Game JSON-LD before the chunk     section 2
 *   staleshot   a saved /club-manager head keeps its old title          section 3
 *   twold       a saved /club-manager head carries two Game blocks      section 3
 *   brandheading   a saved /club-manager guide heading reads its old     section 5
 *                  branded prop
 *   sportlessh1    the saved /nba-higher-lower h1 loses its league       section 5
 *   sportlesslabel /nba-connections' label loses its league              section 5
 *   inentry     a side build where PageSeo imports seoMeta statically,  section 4
 *               putting the map back on the entry chunk's import path
 *               (vite build into a temp dir through a transform plugin,
 *               about three minutes; the real dist and src are untouched)
 *   onechunk    a side build where every part is put in one chunk, the  section 4
 *               old whole map under a new name (vite build into a temp
 *               dir with a manualChunks rule, about three minutes)
 *   drift       a temp copy of src/data/seoMeta.ts gets a new /footle    section 6
 *               description and the committed parts are not regenerated
 *   misplaced   the page's lookup is moved one part along, in memory     section 6
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
  onechunk: { section: 4, finding: 'parts in one chunk' },
  drift: { section: 6, finding: 'is not what the source makes' },
  misplaced: { section: 6, finding: 'is not in the part its lookup loads' },
  brandheading: { section: 5, finding: 'carries the brand' },
  sportlessh1: { section: 5, finding: 'the h1 names no sport' },
  sportlesslabel: { section: 5, finding: 'family label' },
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
/* The load itself, not the type beside it that names the same module. Round
   700: it is one part's loader now, called with the part the path hashes to. */
const LAZY_ANCHOR = 'load = SEO_META_PARTS[part]()';
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
export { SEO_META_PARTS, SEO_META_PART_COUNT, seoMetaPart } from '${ROOT_URL}/src/data/seoMetaParts/index.ts';
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
const { CATEGORIES, ALL_GAMES, SEO_META, SEO_META_PARTS, SEO_META_PART_COUNT, seoMetaPart, loadSeoMeta, render: renderRaw } = createRequire(import.meta.url)(BUNDLE);
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

const findings = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
const notes = { 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' };
const skipped = { 3: [], 4: [], 5: [] };

/* ---------- 1. the words ---------- */
/* An in memory copy, so a control that edits it can never reach PageSeo. */
const entries = CATEGORIES.flatMap(c => c.games.map(g => ({
  path: g.path, label: g.label, category: c.title,
  title: SEO_META[g.path]?.title, description: SEO_META[g.path]?.description,
})));
/* Round 651 re-anchored this. The two Career Path games were its pair because
   they shared a label, so a copied title still carried the right label once
   and the ONLY thing wrong was the duplicate. Round 651 put the sport in every
   label that had a twin, so no genuine pair is left, and the control now
   PLANTS the twin: /nba-higher-lower takes /nba-career's label and title in
   memory, the exact shape the Career Path games had before. Both are
   basketball games, so the copied title still names the right sport and the
   label once, and the duplicate is the only thing wrong with it. */
if (CONTROL === 'dupetitle') {
  const from = entries.find(e => e.path === '/nba-career');
  const to = entries.find(e => e.path === '/nba-higher-lower');
  if (!from?.title || !to?.title || from.category !== to.category) abort('control dupetitle: /nba-career and /nba-higher-lower are not two titled games in one category');
  to.label = from.label;
  to.title = from.title;
  console.log(`CONTROL dupetitle: /nba-higher-lower is planted as a twin of /nba-career, label "${to.label}" and title "${to.title}"; section 1 must go red`);
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
  /* 2b. Round 700: a page loads the part holding its own path and nothing
     else. With /footle's part alone loaded, a game in another part must
     still render its own props: if it rendered seoMeta text, a part would be
     carrying entries that are not its own and the split would be saving
     nothing. */
  const footle = await loadSeoMeta('/footle');
  if (!footle?.['/footle']) f.push("loadSeoMeta('/footle') resolved to nothing or to a part without /footle, so the seoMeta part did not load");
  const other = games.find(g => seoMetaPart(g.path) !== seoMetaPart('/footle'));
  if (!other) abort('every game hashes to /footle\'s part, so per part loading cannot be told apart');
  const early = headOf(render(other.path, propsFor(other.path)));
  if (early.title[0] !== propsFor(other.path).title) {
    f.push(`${other.path} rendered "${early.title[0]}" with only /footle's part loaded, so a part carries entries that are not its own`);
  }
  /* 2c. Then every game loads its own part the way its page does, and every
     later render reads the cache synchronously. */
  for (const g of games) {
    const part = await loadSeoMeta(g.path);
    if (!part?.[g.path]) f.push(`loadSeoMeta('${g.path}') resolved to nothing or to a part without it, so its seoMeta part did not load`);
  }
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
  notes[2] = `/footle renders its own props before its part loads, ${other.path} still does with only /footle's part loaded; after every game's part, ${rendered.size} game routes render seoMeta in six tags and the JSON-LD; /about keeps its own props`;
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

/* ---------- 4. the entry chunk and the parts ---------- */
let distDir = path.join(ROOT, 'dist');
/* The two side builds share one shape: the real config, a temp outDir, and
   one change that must provably reach the bundle. */
async function sideBuild(name, extra) {
  const vitePath = findUp('vite/dist/node/index.js');
  if (!vitePath) abort(`control ${name}: vite not found in any node_modules above the repo`);
  const { build } = await import(pathToFileURL(vitePath).href);
  distDir = path.join(TMP, `dist-${name}`);
  try {
    await build({
      root: ROOT,
      configFile: path.join(ROOT, 'vite.config.ts'),
      mode: 'production',
      logLevel: 'error',
      ...extra,
      build: { outDir: distDir, emptyOutDir: true, ...extra.build },
    });
  } catch (e) {
    /* A crash must never read as a caught break: that is exit 2, not 1. */
    abort(`control ${name}: the side build failed: ${String(e?.message ?? e).split('\n')[0]}`);
  }
}
if (CONTROL === 'inentry') {
  if (count(pageSeoSrc, LAZY_ANCHOR) !== 1) abort(`control inentry: PageSeo carries "${LAZY_ANCHOR}" ${count(pageSeoSrc, LAZY_ANCHOR)} times, not once, so there is no one load to make static`);
  let fired = false;
  console.log('CONTROL inentry: a side build where PageSeo imports seoMeta statically, so the map rides the entry chunk again; section 4 must go red');
  await sideBuild('inentry', {
    plugins: [{
      name: 'seo-titles-control-inentry',
      enforce: 'pre',
      transform(code, id) {
        if (!id.replaceAll('\\', '/').endsWith('src/components/seo/PageSeo.tsx')) return null;
        const src = lf(code);
        if (count(src, LAZY_ANCHOR) !== 1) return null;
        fired = true;
        return `import * as seoMetaStatic from '@/data/seoMeta';\n${src.replace(LAZY_ANCHOR, 'load = Promise.resolve({ SEO_META_PART: seoMetaStatic.SEO_META })')}`;
      },
    }],
  });
  if (!fired) abort('control inentry: the transform never saw PageSeo, so the side build proves nothing');
}
if (CONTROL === 'onechunk') {
  /* Every part module into one chunk: the whole map back under a new name,
     the exact thing Round 700 took apart. */
  const merged = new Set();
  console.log('CONTROL onechunk: a side build where all the parts land in one chunk, the old whole map again; section 4 must go red');
  await sideBuild('onechunk', {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!/src\/data\/seoMetaParts\/seoMetaPart\d\d\.ts$/.test(id.replaceAll('\\', '/'))) return undefined;
            merged.add(id);
            return 'seoMetaAll';
          },
        },
      },
    },
  });
  if (merged.size !== SEO_META_PART_COUNT) abort(`control onechunk: the rule saw ${merged.size} of the ${SEO_META_PART_COUNT} part modules, so the side build proves nothing`);
}
{
  const f = findings[4];
  const indexHtml = path.join(distDir, 'index.html');
  /* Every description the minifier carries byte for byte. A double quote, a
     backslash or a backtick may be escaped in the built string, so those
     few are not searched for; the two probes must be among the searchable. */
  const searchable = Object.entries(SEO_META).filter(([, e]) => !/["`\\]/.test(e.description));
  if (PROBE_PATHS.some(p => !searchable.some(([q]) => q === p))) abort(`the probe descriptions (${PROBE_PATHS.join(', ')}) are missing or carry a double quote, backtick or backslash`);
  if (!fs.existsSync(indexHtml)) {
    skipped[4].push(`no ${path.relative(ROOT, indexHtml)}: run npm run build first`);
    notes[4] = 'no build to read';
  } else {
    const entryRel = (fs.readFileSync(indexHtml, 'utf8').match(/<script[^>]+type="module"[^>]+src="\/(assets\/[^"]+\.js)"/) ?? [])[1];
    if (!entryRel) {
      f.push('dist/index.html loads no module script, so the entry chunk cannot be found');
    } else {
      const assets = path.join(distDir, 'assets');
      const chunks = fs.readdirSync(assets).filter(n => n.endsWith('.js')).map(n => [n, fs.readFileSync(path.join(assets, n), 'utf8')]);
      const entryName = path.basename(entryRel);
      const entryBytes = fs.readFileSync(path.join(distDir, entryRel));
      const holdersOf = new Map();
      const partsIn = new Map();
      for (const [p, e] of searchable) {
        const holders = chunks.filter(([, js]) => js.includes(e.description)).map(([n]) => n);
        holdersOf.set(p, holders);
        for (const n of holders) {
          if (!partsIn.has(n)) partsIn.set(n, new Set());
          partsIn.get(n).add(seoMetaPart(p));
        }
      }
      if (!partsIn.size) {
        skipped[4].push(`${path.relative(ROOT, distDir)} holds none of the SEO text in any chunk, so it predates Round 642; run npm run build`);
        notes[4] = `entry ${entryName} ${kb(entryBytes.length)}, no chunk holds the SEO text yet`;
      } else {
        const inEntry = [...holdersOf.values()].filter(h => h.includes(entryName)).length;
        if (inEntry) f.push(`the entry chunk ${entryName} carries ${inEntry} of the ${searchable.length} searchable descriptions, so every page pays for them`);
        /* Round 700: the old whole map, under any name, is a chunk holding
           entries from more than one part. */
        for (const [n, parts] of partsIn) {
          if (n !== entryName && parts.size > 1) f.push(`${n} holds entries from ${parts.size} parts in one chunk, so a page fetching it pays for other pages' text`);
        }
        /* A game's own page chunk may carry the same words as its own prop
           (Contract Chaos passes its description verbatim), which costs no
           other page anything. What matters is that exactly one PART chunk
           holds an entry, the one its path hashes to. */
        for (const [p, holders] of holdersOf) {
          const want = `seoMetaPart${String(seoMetaPart(p)).padStart(2, '0')}-`;
          const inParts = holders.filter(n => /^seoMetaPart\d\d-/.test(n));
          if (inParts.length !== 1 || !inParts[0].startsWith(want)) f.push(`${p}: its description sits in ${inParts.join(', ') || 'no part chunk'}, expected exactly one, its own part ${want}*.js`);
        }
        const partGz = chunks.filter(([n]) => /^seoMetaPart\d\d-/.test(n)).map(([n]) => gzipSync(fs.readFileSync(path.join(assets, n))).length).sort((a, b) => a - b);
        const sizes = partGz.length
          ? `${partGz.length} part chunks, ${kb(partGz[0])} to ${kb(partGz[partGz.length - 1])} gzipped (median ${kb(partGz[Math.floor(partGz.length / 2)])}), ${kb(partGz.reduce((a, b) => a + b, 0))} together`
          : 'no part chunks';
        notes[4] = `entry ${entryName} ${kb(entryBytes.length)} raw, ${kb(gzipSync(entryBytes).length)} gzipped, carries ${inEntry} of ${searchable.length} searchable descriptions; ${sizes}`;
      }
    }
  }
}

/* ---------- 5. the saved headings (Round 651) ---------- */
/* The round that put these titles on the page, checked where a crawler reads
   them. Before it, the guide block printed its old title prop as the heading,
   so 73 saved game pages carried "Soccer Career Simulator | DoUKnowBall" as an
   h2 (the only h1 on seven of them), and twenty family h1s ("HIGHER OR LOWER"
   on ten pages) named no sport. On every saved game page:
     (a) an h1 or h2 is the game's seoMeta title, the guide heading;
     (b) no h1 to h4 carries " | DoUKnowBall";
     (c) in the families that share a name across sports (Higher or Lower,
         Connections, Career Path, Connect 4, Gauntlet Draft, Perfect
         Season), the h1 names a sport word of the game's category;
   and in the registry, (d) every family label names its sport too.
   Controls, each editing only an in memory copy:
     brandheading    the saved /club-manager guide heading goes back to its
                     branded prop, so (a) and (b) must both fire
     sportlessh1     the saved /nba-higher-lower h1 loses its league, (c)
     sportlesslabel  /nba-connections' label loses its league, (d) */
const FAMILY = /Higher or Lower|Connections|Career Path|Connect 4|Gauntlet Draft|Perfect Season/;
{
  const f = findings[5];
  const headingsOf = html => [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map(m => ({ level: Number(m[1]), text: decode(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() }));
  const games = CATEGORIES.flatMap(c => c.games.map(g => ({ path: g.path, label: g.label, category: c.title })))
    .filter((g, i, a) => a.findIndex(x => x.path === g.path) === i);
  if (CONTROL === 'sportlesslabel') {
    const g = games.find(x => x.path === '/nba-connections');
    if (!g || !namesSport(g.label, g.category)) abort('control sportlesslabel: /nba-connections has no sport bearing label to strip');
    g.label = g.label.replace(/\bNBA\s*/, '');
    if (namesSport(g.label, g.category)) abort('control sportlesslabel: the stripped label still names its sport');
    console.log(`CONTROL sportlesslabel: /nba-connections is labelled "${g.label}" in memory; section 5 must go red`);
  }
  let pages = 0, family = 0;
  for (const g of games) {
    if (FAMILY.test(g.label)) {
      if (!namesSport(g.label, g.category)) f.push(`${g.path}: the family label "${g.label}" names no ${g.category} word, so it reads the same as its sibling in another sport`);
    }
    const meta = SEO_META[g.path];
    const file = path.join(ROOT, 'public', g.path.slice(1), 'index.html');
    if (!meta || !fs.existsSync(file)) { skipped[5].push(`${g.path}: no saved page or no seoMeta entry`); continue; }
    let doc = fs.readFileSync(file, 'utf8');
    const end = doc.indexOf('</head>');
    doc = (end >= 0 ? doc.slice(end) : doc).replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ');
    if (CONTROL === 'brandheading' && g.path === '/club-manager') {
      const re = new RegExp(`(<h[12]>)${escRe(meta.title)}(</h[12]>)`);
      const edited = doc.replace(re, `$1Club Manager: Football Management Sim${BRAND}$2`);
      if (edited === doc) abort('control brandheading: the saved /club-manager page has no guide heading to put back');
      doc = edited;
      console.log('CONTROL brandheading: the saved /club-manager guide heading reads its old branded prop again; section 5 must go red');
    }
    if (CONTROL === 'sportlessh1' && g.path === '/nba-higher-lower') {
      const edited = doc.replace(/<h1>([^<]*?)\bNBA\s+/, '<h1>$1');
      if (edited === doc) abort('control sportlessh1: the saved /nba-higher-lower h1 carries no NBA to strip');
      doc = edited;
      console.log('CONTROL sportlessh1: the saved /nba-higher-lower h1 loses its league; section 5 must go red');
    }
    pages += 1;
    const hs = headingsOf(doc);
    if (!hs.some(h => h.level <= 2 && h.text === meta.title)) f.push(`${g.path}: no saved h1 or h2 is the seoMeta title "${meta.title}", so the guide heading is not the game's search title`);
    for (const h of hs) if (h.level <= 4 && h.text.includes(BRAND)) f.push(`${g.path}: the saved h${h.level} "${h.text.slice(0, 60)}" carries the brand`);
    if (FAMILY.test(g.label)) {
      family += 1;
      const h1s = hs.filter(h => h.level === 1);
      if (!h1s.length) f.push(`${g.path}: the saved page has no h1`);
      for (const h of h1s) if (!namesSport(h.text, g.category)) f.push(`${g.path}: the saved h1 "${h.text}" names no ${g.category} word, the h1 names no sport`);
    }
  }
  notes[5] = `${pages} saved game pages read: guide heading is the seoMeta title and no heading carries the brand; ${family} family h1s and every family label name their sport`;
}

/* ---------- 6. the parts are what the source makes (Round 700) ---------- */
/* src/data/seoMeta.ts is the only place anyone writes this text and the parts
   are generated from it, so two things can go wrong: somebody edits the
   source and never regenerates, or the page's lookup and the generator's
   placement stop agreeing. (a) runs the generator in check mode; (b) loads
   every part through the bundled loaders and finds each entry where the
   page's own lookup says it is, word for word, and nowhere else.
   Controls: drift edits a temp copy of the source, so (a) must fire;
   misplaced moves the lookup one part along in memory, so (b) must. */
{
  const f = findings[6];
  let genRoot = ROOT;
  if (CONTROL === 'drift') {
    genRoot = path.join(TMP, 'drift-root');
    const from = path.join(ROOT, 'src/data');
    const to = path.join(genRoot, 'src/data');
    fs.mkdirSync(path.join(to, 'seoMetaParts'), { recursive: true });
    for (const n of fs.readdirSync(path.join(from, 'seoMetaParts'))) fs.copyFileSync(path.join(from, 'seoMetaParts', n), path.join(to, 'seoMetaParts', n));
    const src = fs.readFileSync(path.join(from, 'seoMeta.ts'), 'utf8');
    const desc = SEO_META['/footle']?.description;
    if (!desc || count(src, desc) !== 1) abort('control drift: /footle\'s description is not in src/data/seoMeta.ts exactly once, so there is nothing to edit');
    fs.writeFileSync(path.join(to, 'seoMeta.ts'), src.replace(desc, `${desc} Edited.`));
    console.log('CONTROL drift: a temp copy of src/data/seoMeta.ts gives /footle a new description and the parts beside it are not regenerated; section 6 must go red');
  }
  const { writeSeoMetaParts } = await import(pathToFileURL(path.join(ROOT, 'scripts/genSeoMetaParts.mjs')).href);
  const drift = await writeSeoMetaParts(genRoot, { check: true });
  for (const line of drift) f.push(`${line}; run node scripts/genSeoMetaParts.mjs and commit src/data/seoMetaParts`);

  let lookup = seoMetaPart;
  if (CONTROL === 'misplaced') {
    lookup = p => (seoMetaPart(p) + 1) % SEO_META_PART_COUNT;
    console.log('CONTROL misplaced: the page looks one part along from where the generator put each entry; section 6 must go red');
  }
  if (SEO_META_PARTS.length !== SEO_META_PART_COUNT) f.push(`the index has ${SEO_META_PARTS.length} loaders for ${SEO_META_PART_COUNT} parts`);
  const parts = await Promise.all(SEO_META_PARTS.map(load => load().then(m => m.SEO_META_PART)));
  const homes = new Map();
  parts.forEach((part, i) => { for (const p of Object.keys(part ?? {})) homes.set(p, [...(homes.get(p) ?? []), i]); });
  for (const [p, e] of Object.entries(SEO_META)) {
    const got = parts[lookup(p)]?.[p];
    if (!got || got.title !== e.title || got.description !== e.description) f.push(`${p} is not in the part its lookup loads (part ${lookup(p)}) word for word`);
    const n = (homes.get(p) ?? []).length;
    if (n !== 1) f.push(`${p} sits in ${n} parts, not exactly one`);
  }
  for (const p of homes.keys()) if (!SEO_META[p]) f.push(`a part carries ${p}, which src/data/seoMeta.ts does not`);
  const sizes = parts.map(part => Object.keys(part ?? {}).length);
  notes[6] = `genSeoMetaParts --check finds ${drift.length} file(s) to rewrite; ${Object.keys(SEO_META).length} entries over ${parts.length} parts (${Math.min(...sizes)} to ${Math.max(...sizes)} each), every one found where the page looks`;
}

fs.rmSync(TMP, { recursive: true, force: true });

/* ---------- the report ---------- */
const TITLES = {
  1: 'the words: label once, unique, sport word, 60 with the brand, 120 to 158 with free, no dash',
  2: 'the render: props before the chunk, seoMeta everywhere after it',
  3: 'the saved pages carry the seoMeta head once prerendered, all or none',
  4: 'the entry chunk carries none of the SEO text; each entry sits in its own part chunk and no chunk holds two parts',
  5: 'the saved headings: guide heading is the search title, no brand, family h1s and labels name their sport',
  6: 'the parts are what src/data/seoMeta.ts makes, and the page finds every entry in the part it loads',
};
console.log('');
for (const n of [1, 2, 3, 4, 5, 6]) {
  console.log(`${n}) ${TITLES[n]}`);
  for (const m of findings[n].slice(0, 12)) console.error(`  FAIL: ${m}`);
  if (findings[n].length > 12) console.error(`  ... and ${findings[n].length - 12} more`);
  console.log(`   ${findings[n].length ? 'RED' : 'ok '} ${notes[n]}`);
  const s = skipped[n] ?? [];
  for (const line of s.slice(0, 8)) console.log(`   SKIP (loud): ${line}`);
  if (s.length > 8) console.log(`   SKIP (loud): ... and ${s.length - 8} more`);
}
const red = [1, 2, 3, 4, 5, 6].filter(n => findings[n].length);
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
const waits = [skipped[3].length ? `${skipped[3].length} saved pages still wait for build:seo` : 'every saved page matches', skipped[4].length ? 'the entry chunk check waits for a build' : 'the entry chunk is clean', skipped[5].length ? `${skipped[5].length} saved pages had no headings to read` : 'every saved guide heading is its search title'];
console.log(`simSeoTitles: green. ${rendered.size} games carry a keyword title and description, PageSeo renders them lazily, ${waits.join(', and ')}.`);
