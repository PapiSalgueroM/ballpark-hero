/**
 * ROUND 642: THE SEARCH TITLE AND DESCRIPTION FENCE.
 *
 * The owner asked for "lots of key words ... because we need more traction to
 * our website". A search result is a page's <title> and meta description, and
 * before this round many game pages had titles that named no sport and no
 * kind of game ("Missing XI | DoUKnowBall", "Rarity Round | DoUKnowBall") and
 * descriptions long enough to be cut off mid sentence. Every game in
 * src/data/gameRegistry.ts now carries a seoTitle (without the brand suffix)
 * and a seoDescription, and src/components/seo/PageSeo.tsx prefers them for
 * the page's own path. This harness holds all of that to its rules.
 *
 *   1. THE WORDS. Every registry game has both fields. Each title carries the
 *      game's label exactly once, is unique across the site (other games, the
 *      hubs and every page that passes its own title), names a sport or
 *      league word from its category's list below, and fits in 60 characters
 *      with " | DoUKnowBall" on it, or in 60 without it when PageSeo drops the
 *      brand (reported by name). Each description is 120 to 158 characters,
 *      unique, contains "free" and a sport word. No dash character anywhere
 *      and no hyphen outside the label itself.
 *   2. THE RENDER. PageSeo rendered through react-dom/server inside a
 *      MemoryRouter and a HelmetProvider for every game route, with a page
 *      prop that is deliberately different: the <title>, the meta
 *      description, og:title, og:description, twitter:title,
 *      twitter:description and the JSON-LD name and description must be what
 *      the registry says after PageSeo's brand rule, each exactly once. And
 *      a route with no registry entry must keep the props it passed.
 *   3. THE SAVED PAGES. Where public/<route>/index.html carries the registry
 *      description, its head must carry all six tags exactly as rendered. A
 *      snapshot that carries none of it predates this round and is skipped,
 *      loudly: the prerenderer (npm run build:seo) refreshes it.
 *
 * NEGATIVE CONTROLS (SEO_TITLES_CONTROL). Each refuses to run if its anchor is
 * missing, edits only an in memory copy, and must turn exactly its own section
 * red with the finding it names:
 *   dupetitle   /hockey-career takes /baseball-career's title           section 1
 *   longdesc    /footle's description grows past 158 characters         section 1
 *   noregistry  PageSeo ignores the registry and uses the page prop     section 2
 *   staleshot   a saved /club-manager head keeps its old title          section 3
 * Under a control the harness exits 1 when exactly the predicted section is
 * red (the break was caught) and 2 when it is not (the control proves nothing).
 *
 * Run: node scripts/simSeoTitles.mjs
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const SEO = path.join(ROOT, 'src/components/seo/PageSeo.tsx');

const BRAND = ' | DoUKnowBall';
const TITLE_LIMIT = 60;
const DESC_MIN = 120;
const DESC_MAX = 158;

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
  staleshot: { section: 3, finding: 'saved title' },
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

/* ---- PageSeo, the registry and a renderer, bundled once ---- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `seoTitles-${process.pid}-`));
let seoPath = SEO;
if (CONTROL === 'noregistry') {
  const src = lf(fs.readFileSync(SEO, 'utf8'));
  const anchor = 'ALL_GAMES.find(g => g.path === path)';
  if (!src.includes(anchor)) abort('control noregistry: the registry lookup in PageSeo is not in the shape it rewrites');
  seoPath = path.join(TMP, 'PageSeo.noregistry.tsx');
  fs.writeFileSync(seoPath, src.replace(anchor, 'ALL_GAMES.find(g => g.path === path && false)'));
  console.log('CONTROL noregistry: PageSeo never finds a registry entry, so every page falls back to its own prop; section 2 must go red');
}
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.cjs');
fs.writeFileSync(ENTRY, `
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PageSeo from '${seoPath.replaceAll('\\', '/')}';
export { CATEGORIES, ALL_GAMES } from '${ROOT_URL}/src/data/gameRegistry.ts';
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
const { CATEGORIES, ALL_GAMES, render } = createRequire(import.meta.url)(BUNDLE);

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

const findings = { 1: [], 2: [], 3: [] };
const notes = { 1: '', 2: '', 3: '' };

/* ---------- 1. the words ---------- */
/* An in memory copy, so a control that edits it can never reach PageSeo. */
const entries = CATEGORIES.flatMap(c => c.games.map(g => ({ path: g.path, label: g.label, category: c.title, seoTitle: g.seoTitle, seoDescription: g.seoDescription })));
if (CONTROL === 'dupetitle') {
  const from = entries.find(e => e.path === '/baseball-career');
  const to = entries.find(e => e.path === '/hockey-career');
  if (!from?.seoTitle || !to?.seoTitle || from.label !== to.label) abort('control dupetitle: /baseball-career and /hockey-career no longer share a label with titles to copy');
  to.seoTitle = from.seoTitle;
  console.log(`CONTROL dupetitle: /hockey-career now reads "${to.seoTitle}"; section 1 must go red`);
}
if (CONTROL === 'longdesc') {
  const e = entries.find(x => x.path === '/footle');
  if (!e?.seoDescription || e.seoDescription.length > DESC_MAX) abort('control longdesc: /footle has no description inside the limit to grow');
  e.seoDescription += ' New mystery player every single day for everyone.';
  if (e.seoDescription.length <= DESC_MAX) abort('control longdesc: the grown description is still inside the limit');
  console.log(`CONTROL longdesc: /footle's description is now ${e.seoDescription.length} characters; section 1 must go red`);
}
{
  const f = findings[1];
  /* Titles the rest of the site already uses: the hubs and every page that
     passes a literal title for a route the registry does not own. */
  const registryPaths = new Set(entries.map(e => e.path));
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
    const { seoTitle: t, seoDescription: d, label, path: p } = e;
    if (!t || !d) { f.push(`${p} is missing its ${!t ? 'seoTitle' : 'seoDescription'}`); continue; }
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
  const games = ALL_GAMES.filter((g, i, a) => a.findIndex(x => x.path === g.path) === i);
  const error = console.error;
  /* React 18's server renderer warns that useLayoutEffect does nothing on the
     server once per Router. Only that message is dropped. */
  console.error = (...a) => { if (!String(a[0]).includes('useLayoutEffect does nothing on the server')) error(...a); };
  try {
    for (const g of games) {
      if (!g.seoTitle || !g.seoDescription) continue;
      const propTitle = `Page prop title for ${g.path}${BRAND}`;
      const propDesc = `Page prop description for ${g.path}, which the registry must replace.`;
      const head = headOf(render(g.path, { title: propTitle, description: propDesc, path: g.path }));
      rendered.set(g.path, head);
      const full = g.seoTitle + BRAND;
      const want = {
        title: expectedTitle(full),
        description: g.seoDescription,
        'og:title': full,
        'og:description': g.seoDescription,
        'twitter:title': full,
        'twitter:description': g.seoDescription,
      };
      for (const [key, value] of Object.entries(want)) {
        const got = head[key];
        const tag = key === 'title' ? '<title>' : key;
        if (got.length !== 1) f.push(`${g.path}: rendered ${got.length} ${tag} tags, expected exactly 1`);
        else if (got[0] !== value) f.push(`${g.path}: rendered ${tag} "${got[0].slice(0, 70)}", the registry says "${value.slice(0, 70)}"`);
      }
      if (head.ld.length !== 1) f.push(`${g.path}: rendered ${head.ld.length} Game JSON-LD objects, expected 1`);
      else if (head.ld[0].name !== full || head.ld[0].description !== g.seoDescription) f.push(`${g.path}: the Game JSON-LD name or description is not the registry's`);
    }
    /* A route the registry does not own keeps exactly what it passed. */
    const own = { title: 'About DoUKnowBall', description: 'A page with no registry entry keeps the description it passes.', path: '/about' };
    if (ALL_GAMES.some(g => g.path === own.path)) abort('/about became a registry game, pick another route for the fallback check');
    const head = headOf(render(own.path, own));
    if (head.title[0] !== own.title || head.description[0] !== own.description || head['og:title'][0] !== own.title) {
      f.push(`/about has no registry entry and did not keep its own props (title "${head.title[0]}")`);
    }
  } finally {
    console.error = error;
  }
  notes[2] = `${rendered.size} game routes rendered through PageSeo, six tags and the JSON-LD each checked; /about keeps its own props`;
}

/* ---------- 3. the saved pages ---------- */
const skipped = [];
if (CONTROL && CONTROL !== 'staleshot') {
  notes[3] = `not run under control ${CONTROL}: it reads the real saved pages`;
} else {
  const f = findings[3];
  let compared = 0;
  for (const g of ALL_GAMES) {
    if (!g.seoTitle || !g.seoDescription) continue;
    const r = rendered.get(g.path);
    if (!r) continue;
    const full = g.seoTitle + BRAND;
    const file = path.join(ROOT, 'public', g.path.slice(1), 'index.html');
    let html;
    if (CONTROL === 'staleshot' && g.path === '/club-manager') {
      html = `<head><title>Club Manager: Football Management Sim${BRAND}</title>`
        + `<meta name="description" content="${g.seoDescription}">`
        + `<meta property="og:title" content="${full}"><meta property="og:description" content="${g.seoDescription}">`
        + `<meta name="twitter:title" content="${full}"><meta name="twitter:description" content="${g.seoDescription}"></head>`;
      console.log('CONTROL staleshot: a saved /club-manager head carries the new description under its old title; section 3 must go red');
    } else if (fs.existsSync(file)) {
      const doc = fs.readFileSync(file, 'utf8');
      const end = doc.indexOf('</head>');
      html = end >= 0 ? doc.slice(0, end) : doc;
    } else {
      skipped.push(`${g.path}: no saved page at public${g.path}/index.html`);
      continue;
    }
    const saved = headOf(html);
    /* WHY THE DESCRIPTION DECIDES AND NOT THE TITLE. Two games kept the title
       they already had (Stadium Tycoon and Idle Arena lost only the brand
       question, which was never in doubt), so an old snapshot can carry the
       registry title by coincidence. Every registry description is new text,
       so a saved head holding none of it in any of its three places was
       written before this round. One holding it anywhere was written after,
       and then every tag must agree. */
    const hasDesc = [saved.description, saved['og:description'], saved['twitter:description']].some(a => a.includes(g.seoDescription));
    if (!hasDesc) {
      skipped.push(`${g.path}: public${g.path}/index.html predates this round (title "${(saved.title[0] ?? '').slice(0, 50)}"); npm run build:seo refreshes it`);
      continue;
    }
    compared += 1;
    for (const key of ['title', 'description', 'og:title', 'og:description', 'twitter:title', 'twitter:description']) {
      const want = r[key][0];
      const got = saved[key];
      const label = key === 'title' ? 'title' : key === 'description' ? 'description' : key;
      if (got.length !== 1 || got[0] !== want) f.push(`${g.path}: saved ${label} "${(got[0] ?? 'missing').slice(0, 60)}" is not the rendered "${want.slice(0, 60)}"${got.length > 1 ? ` (${got.length} tags)` : ''}`);
    }
  }
  notes[3] = `${compared} saved page${compared === 1 ? '' : 's'} compared, ${skipped.length} skipped`;
}

fs.rmSync(TMP, { recursive: true, force: true });

/* ---------- the report ---------- */
const TITLES = {
  1: 'the words: label once, unique, sport word, 60 with the brand, 120 to 158 with free, no dash',
  2: 'the render: PageSeo emits the registry title and description everywhere they go',
  3: 'the saved pages carry the registry head once prerendered',
};
console.log('');
for (const n of [1, 2, 3]) {
  console.log(`${n}) ${TITLES[n]}`);
  for (const m of findings[n].slice(0, 12)) console.error(`  FAIL: ${m}`);
  if (findings[n].length > 12) console.error(`  ... and ${findings[n].length - 12} more`);
  console.log(`   ${findings[n].length ? 'RED' : 'ok '} ${notes[n]}`);
  if (n === 3) {
    for (const s of skipped.slice(0, 8)) console.log(`   SKIP (loud): ${s}`);
    if (skipped.length > 8) console.log(`   SKIP (loud): ... and ${skipped.length - 8} more saved pages that predate this round`);
  }
}
const red = [1, 2, 3].filter(n => findings[n].length);
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
console.log(`simSeoTitles: green. ${rendered.size} games carry a keyword title and description, PageSeo renders them, and ${skipped.length ? `${skipped.length} saved pages still wait for build:seo` : 'every saved page matches'}.`);
