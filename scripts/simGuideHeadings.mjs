/**
 * ROUND 638: THE GUIDE HEADINGS FENCE.
 *
 * The owner asked for "lots of key words and headings and sub headings and
 * sub sub headings" on every game page, for traction. The guide block at the
 * bottom of each game page (src/components/seo/GameSeoContent.tsx) printed five
 * generic h2s over flat lists. A guide can now be written in sections (an h3
 * over a list, with optional h4 groups, see src/data/gameContent/types.ts), and
 * its h2 titles can carry the game's name and the phrase a searcher types.
 * Converting a guide is a regroup, never a rewrite: every sentence it held
 * before must still be there, exactly once, and nothing may be invented. This
 * harness is what holds a converted guide to that.
 *
 *   1. THE WORDS. For every converted guide: all four parts and all five h2
 *      titles are set; every h2 carries the registry label exactly once; every
 *      h3 and h4 has a heading and at least one item or paragraph; no heading
 *      repeats in the block and no three word phrase repeats across h3s and
 *      h4s; no heading is a bare "Step 1"; no dash anywhere in the guide and
 *      no hyphen in a heading; and the flat lists derived from the sections
 *      hold exactly the sentences frozen in scripts/data/guideHeadingsFrozen.json
 *      before the conversion, each once, in the same part.
 *   2. THE OUTLINE. Every game's block rendered through react-dom/server in a
 *      MemoryRouter, both ways the page can title it (h1, or h2 under the
 *      page's own h1): the block has one top heading, no level is ever
 *      skipped, the five h2s are the titles the guide asks for, and a converted
 *      guide renders every heading and every sentence it holds, with at least
 *      8 h3s and 1 h4 above its FAQ.
 *   3. THE RATCHET. The number of converted guides equals CONVERTED_FLOOR.
 *      Fewer means a conversion was lost; more means raise the floor.
 *   4. THE SAVED PAGES. Where public/<route>/index.html has been prerendered
 *      since its guide was converted, its guide headings equal the rendered
 *      ones. A snapshot that predates the conversion is skipped, loudly.
 *
 * NEGATIVE CONTROLS (GUIDE_HEADINGS_CONTROL). Each refuses to run if its
 * anchor is missing, edits only an in memory copy, and must turn exactly its
 * own section red:
 *   skiplevel  the renderer prints a section heading as h4 directly under h2   section 2
 *   nokeyword  the Club Manager rules h2 loses the game's name                 section 1
 *   lostline   one Club Manager rule sentence is dropped from the sections     section 1
 *   unconvert  the Stadium Tycoon guide goes back to flat lists                section 3
 *   snapdrift  a Club Manager snapshot carries one stale h3                    section 4
 * Under a control the harness exits 1 when exactly the predicted section is
 * red (the break was caught) and 2 when it is not (the control proves nothing).
 *
 * FREEZE, before converting a guide:
 *   node scripts/simGuideHeadings.mjs --freeze /route
 * records that route's current flat text in the fixture. It refuses a route
 * that is already converted or already frozen.
 *
 * Run: node scripts/simGuideHeadings.mjs
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const FIXTURE = path.join(ROOT, 'scripts/data/guideHeadingsFrozen.json');
const SEO = path.join(ROOT, 'src/components/seo/GameSeoContent.tsx');

/* Raise this in the round that converts another guide. */
const CONVERTED_FLOOR = 126;

const CONTROLS = { skiplevel: 2, nokeyword: 1, lostline: 1, unconvert: 3, snapdrift: 4 };
const CONTROL = process.env.GUIDE_HEADINGS_CONTROL || '';
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`GUIDE_HEADINGS_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}
const abort = m => { console.error(`simGuideHeadings: cannot run: ${m}`); process.exit(2); };
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

/* ---- the block, the loader and the registry, bundled once ---- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `guideHeadings-${process.pid}-`));
let seoPath = SEO;
if (CONTROL === 'skiplevel') {
  const src = lf(fs.readFileSync(SEO, 'utf8'));
  const anchor = '<h3 className="text-sm font-semibold text-foreground mb-2">{section.heading}</h3>\n          {list(section.items)}';
  if (!src.includes(anchor)) abort('control skiplevel: the section h3 in GuideSections is not in the shape it rewrites');
  seoPath = path.join(TMP, 'GameSeoContent.skiplevel.tsx');
  fs.writeFileSync(seoPath, src.replace(anchor, anchor.replaceAll('h3', 'h4')));
  console.log('CONTROL skiplevel: every section heading in GuideSections is printed as h4 straight under its h2; section 2 must go red');
}
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.cjs');
fs.writeFileSync(ENTRY, `
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import GameSeoContent from '${seoPath.replaceAll('\\', '/')}';
export { loadGameContent } from '${ROOT_URL}/src/data/gameContent/loader.ts';
export { flatGuide, guideH2Titles } from '${ROOT_URL}/src/data/gameContent/guideShape.ts';
export { ALL_GAMES } from '${ROOT_URL}/src/data/gameRegistry.ts';
export const render = (route, props) => renderToStaticMarkup(
  React.createElement(HelmetProvider, { context: {} },
    React.createElement(MemoryRouter, { initialEntries: [route] },
      React.createElement(GameSeoContent, props))));
`);
execSync(`"${ESBUILD}" "${ENTRY}" --bundle --format=cjs --platform=node --jsx=automatic --alias:@=${ROOT_URL}/src --outfile="${BUNDLE}" --log-level=error`, {
  stdio: 'inherit',
  env: { ...process.env, NODE_PATH: MODULES },
});
const { loadGameContent, flatGuide, guideH2Titles, ALL_GAMES, render: renderRaw } = createRequire(import.meta.url)(BUNDLE);
/* React 18's server renderer warns once per Link and Router that
   useLayoutEffect does nothing on the server, 1.5MB of it over 254 renders.
   Only that one message is dropped; any other error still prints. */
const render = (route, props) => {
  const error = console.error;
  console.error = (...a) => { if (!String(a[0]).includes('useLayoutEffect does nothing on the server')) error(...a); };
  try { return renderRaw(route, props); } finally { console.error = error; }
};

const PARTS = ['howToPlay', 'rules', 'example', 'tips'];
const SECTION_KEY = { howToPlay: 'howToPlaySections', rules: 'ruleSections', example: 'exampleSections', tips: 'tipSections' };
const H2_KEYS = ['howToPlay', 'rules', 'example', 'tips', 'faq'];
const isConverted = c => !!c && PARTS.some(p => c[SECTION_KEY[p]]);

const games = ALL_GAMES.filter((g, i, a) => a.findIndex(x => x.path === g.path) === i);
const content = new Map();
for (const g of games) content.set(g.path, await loadGameContent(g.path));
const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));

/* ---- freeze mode ---- */
const freezeAt = process.argv.indexOf('--freeze');
if (freezeAt >= 0) {
  const route = process.argv[freezeAt + 1];
  const c = content.get(route);
  if (!c) abort(`--freeze ${route}: no game with a guide at that route`);
  if (isConverted(c)) abort(`--freeze ${route}: already converted, so its original flat text is gone; freeze before converting`);
  if (fixture.routes[route]) abort(`--freeze ${route}: already frozen`);
  const flat = flatGuide(c);
  fixture.routes[route] = Object.fromEntries(PARTS.map(p => [p, flat[p]]));
  fixture.routes = Object.fromEntries(Object.keys(fixture.routes).sort().map(k => [k, fixture.routes[k]]));
  fs.writeFileSync(FIXTURE, JSON.stringify(fixture, null, 2) + '\n');
  console.log(`simGuideHeadings: froze ${route} (${PARTS.map(p => `${p} ${flat[p].length}`).join(', ')}) into scripts/data/guideHeadingsFrozen.json`);
  fs.rmSync(TMP, { recursive: true, force: true });
  process.exit(0);
}

/* ---- the in memory controls on the guide data ---- */
if (CONTROL === 'nokeyword') {
  const h = content.get('/club-manager')?.headings;
  if (!h?.rules?.includes('Club Manager')) abort('control nokeyword: the Club Manager rules h2 does not carry the name');
  h.rules = h.rules.replace('Club Manager', '').trim();
  console.log(`CONTROL nokeyword: the Club Manager rules h2 now reads "${h.rules}"; section 1 must go red`);
}
if (CONTROL === 'lostline') {
  const line = 'Every league table shows goals for and against as a pair, 25-23, beside the goal difference those two make.';
  const home = (content.get('/club-manager')?.ruleSections ?? []).find(s => s.items.includes(line) && s.items.length > 1);
  if (!home) abort('control lostline: the goals pair rule is not in a Club Manager rule section with company');
  home.items.splice(home.items.indexOf(line), 1);
  console.log('CONTROL lostline: the goals pair rule is dropped from the Club Manager sections; section 1 must go red');
}
if (CONTROL === 'unconvert') {
  const c = content.get('/stadium-tycoon');
  if (!isConverted(c)) abort('control unconvert: the Stadium Tycoon guide is not converted');
  const flat = flatGuide(c);
  for (const p of PARTS) { c[p] = flat[p]; delete c[SECTION_KEY[p]]; }
  delete c.headings;
  console.log('CONTROL unconvert: the Stadium Tycoon guide is back to flat lists; section 3 must go red');
}

/* ---- helpers ---- */
const decode = s => s
  .replace(/<[^>]+>/g, '')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();
const headingsOf = html => [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map(m => ({ level: Number(m[1]), text: decode(m[2]) }));
const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const show = h => `h${h.level} "${h.text}"`;
const DASH = /[\u2010-\u2015\u2212]/;
const STOP = new Set('a an the and or of to in on for with your you it its at by from is are as up out'.split(' '));
const words = s => (s.toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? []);
const shingles = s => {
  const w = words(s);
  const out = new Set();
  for (let i = 0; i + 3 <= w.length; i += 1) {
    const tri = w.slice(i, i + 3);
    if (tri.some(x => !STOP.has(x))) out.add(tri.join(' '));
  }
  return out;
};
const strings = v => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);

/** The section headings of a converted guide in page order, with their levels. */
function outlineOf(c) {
  const out = [];
  for (const p of PARTS) {
    for (const s of c[SECTION_KEY[p]] ?? []) {
      out.push({ level: 3, text: s.heading, part: p });
      for (const sub of s.subsections ?? []) out.push({ level: 4, text: sub.heading, part: p });
    }
  }
  return out;
}

const labelOf = new Map(games.map(g => [g.path, g.label]));
const converted = games.filter(g => isConverted(content.get(g.path))).map(g => g.path);
const findings = { 1: [], 2: [], 3: [], 4: [] };
const notes = { 1: '', 2: '', 3: '', 4: '' };

/* ---------- 1. the words ---------- */
{
  let sentences = 0;
  let headingCount = 0;
  let orderKept = 0;
  const f = findings[1];
  for (const route of converted) {
    const c = content.get(route);
    const label = labelOf.get(route);
    for (const p of PARTS) if (!c[SECTION_KEY[p]]) f.push(`${route}: converted, but ${p} is still a flat list`);
    for (const k of H2_KEYS) if (!c.headings?.[k]?.trim()) f.push(`${route}: converted, but headings.${k} is not set`);
    const titles = guideH2Titles(c, label);
    for (const k of H2_KEYS) {
      const t = titles[k];
      const n = t.split(label).length - 1;
      if (n !== 1) f.push(`${route}: the ${k} h2 "${t}" carries the label "${label}" ${n} times, it must carry it once`);
      if (t.length > 80) f.push(`${route}: the ${k} h2 is ${t.length} characters, which reads as stuffing (80 at most)`);
    }
    const outline = outlineOf(c);
    for (const p of PARTS) {
      for (const s of c[SECTION_KEY[p]] ?? []) {
        const body = p === 'example' ? s.paragraphs : s.items;
        if (!s.heading?.trim()) f.push(`${route}: a ${p} h3 has no heading`);
        if (!Array.isArray(body) || body.length === 0 || body.some(x => !x?.trim())) f.push(`${route}: the ${p} h3 "${s.heading}" has no ${p === 'example' ? 'paragraph' : 'item'} of its own, or an empty one`);
        for (const sub of s.subsections ?? []) {
          if (!sub.heading?.trim()) f.push(`${route}: an h4 under "${s.heading}" has no heading`);
          if (!Array.isArray(sub.items) || sub.items.length === 0 || sub.items.some(x => !x?.trim())) f.push(`${route}: the h4 "${sub.heading}" has no item, or an empty one`);
        }
      }
    }
    for (const h of outline) {
      if (h.text.length > 60) f.push(`${route}: the h${h.level} "${h.text}" is ${h.text.length} characters (60 at most)`);
      if (/^\s*(?:step|part|section|stage|phase|tip|rule|beat)\b\s*\d*\s*[:.]?\s*$|\b(?:step|part|section)\s+\d+\b/i.test(h.text)) f.push(`${route}: the h${h.level} "${h.text}" is a numbered placeholder, not a thing in the game`);
    }
    const every = [...H2_KEYS.map(k => titles[k]), ...outline.map(h => h.text), ...c.faqs.map(x => x.q)];
    headingCount += every.length;
    const seen = new Map();
    for (const t of every) {
      const key = t.toLowerCase().replace(/\s+/g, ' ').trim();
      if (seen.has(key)) f.push(`${route}: the heading "${t}" appears twice in the block`);
      seen.set(key, true);
    }
    const owner = new Map();
    for (const h of outline) {
      for (const tri of shingles(h.text)) {
        if (owner.has(tri) && owner.get(tri) !== h.text) f.push(`${route}: the phrase "${tri}" repeats across "${owner.get(tri)}" and "${h.text}"`);
        else owner.set(tri, h.text);
      }
    }
    /* The game's own name is exempt: "82-0 Perfect Season" carries a hyphen in
       the registry, every h2 must carry that name, and the rule is about a
       heading reaching for a dash, not about a scoreline in a proper name.
       Everything else in the heading is still checked. */
    for (const t of [...H2_KEYS.map(k => titles[k]), ...outline.map(h => h.text)]) {
      const rest = label ? t.split(label).join(' ') : t;
      if (/[-\u2010-\u2015\u2212]/.test(rest)) f.push(`${route}: the heading "${t}" carries a dash or hyphen`);
    }
    for (const s of strings(c)) if (DASH.test(s)) f.push(`${route}: a dash in "${s.slice(0, 70)}..."`);
    if (!fixture.routes[route]) f.push(`${route}: converted with no frozen original in scripts/data/guideHeadingsFrozen.json, so nothing proves no sentence was cut; freeze before converting`);
  }
  for (const [route, frozen] of Object.entries(fixture.routes)) {
    const c = content.get(route);
    if (!c) { f.push(`${route}: frozen in the fixture but no game with a guide lives there any more`); continue; }
    const flat = flatGuide(c);
    for (const p of PARTS) {
      const was = frozen[p];
      const now = flat[p] ?? [];
      for (const s of was) {
        sentences += 1;
        const n = now.filter(x => x === s).length;
        if (n !== 1) f.push(`${route}: the ${p} sentence "${s.slice(0, 70)}..." appears ${n} times after the conversion, it must appear once`);
      }
      for (const s of now) if (!was.includes(s)) f.push(`${route}: the ${p} sentence "${s.slice(0, 70)}..." is not in the frozen original, so it was invented or edited`);
      if (JSON.stringify(was) === JSON.stringify(now)) orderKept += 1;
    }
  }
  notes[1] = `${converted.length} converted guide${converted.length === 1 ? '' : 's'}, ${headingCount} headings checked; ${sentences} frozen sentences checked across ${Object.keys(fixture.routes).length} routes (${orderKept} of ${Object.keys(fixture.routes).length * PARTS.length} parts also keep their original order)`;
}

/* ---------- 2. the outline ---------- */
const rendered = new Map();
{
  const f = findings[2];
  let renders = 0;
  let withGuide = 0;
  const counts = [];
  for (const g of games) {
    const c = content.get(g.path);
    for (const ownH1 of [false, true]) {
      let html;
      try {
        html = render(g.path, { title: `${g.label} guide`, description: g.description ?? '', pageHasOwnH1: ownH1 });
      } catch (e) {
        f.push(`${g.path}: the block threw while rendering: ${e.message}`);
        continue;
      }
      renders += 1;
      const hs = headingsOf(html);
      const top = ownH1 ? 2 : 1;
      if (!hs.length || hs[0].level !== top) f.push(`${g.path} (${ownH1 ? 'page has its own h1' : 'block owns the h1'}): the first heading is ${hs[0] ? show(hs[0]) : 'missing'}, it must be an h${top}`);
      const h1s = hs.filter(h => h.level === 1).length;
      if (h1s !== (ownH1 ? 0 : 1)) f.push(`${g.path} (${ownH1 ? 'page has its own h1' : 'block owns the h1'}): ${h1s} h1s in the block`);
      let prev = ownH1 ? 1 : 0;
      for (const h of hs) {
        if (h.level > prev + 1) { f.push(`${g.path}: ${show(h)} follows an h${prev}, skipping a level`); break; }
        prev = h.level;
      }
      if (!c) continue;
      if (!ownH1) withGuide += 1;
      const titles = guideH2Titles(c, labelOf.get(g.path));
      const h2s = hs.filter(h => h.level === 2).map(h => h.text);
      const at = H2_KEYS.map(k => h2s.indexOf(titles[k]));
      if (at.some(i => i < 0) || at.some((x, i) => i > 0 && x <= at[i - 1])) f.push(`${g.path}: the five guide h2s are not all there in order (${H2_KEYS.map((k, i) => `${k} ${at[i] < 0 ? 'missing' : 'ok'}`).join(', ')})`);
      if (!ownH1) rendered.set(g.path, { hs, html });
      if (!isConverted(c)) continue;
      const a = hs.findIndex(h => h.level === 2 && h.text === titles.howToPlay);
      const b = hs.findIndex(h => h.level === 2 && h.text === titles.faq);
      const inner = a >= 0 && b > a ? hs.slice(a, b) : [];
      const want = outlineOf(c).map(({ level, text }) => ({ level, text }));
      const got = inner.filter(h => h.level >= 3);
      const h3 = got.filter(h => h.level === 3).length;
      const h4 = got.filter(h => h.level === 4).length;
      if (!ownH1) counts.push(`${g.path} ${h3} h3 and ${h4} h4`);
      if (h3 < 8) f.push(`${g.path}: ${h3} h3s above the FAQ, a converted guide needs at least 8`);
      if (h4 < 1) f.push(`${g.path}: no h4 above the FAQ, a converted guide needs at least 1`);
      if (JSON.stringify(got) !== JSON.stringify(want)) {
        const i = want.findIndex((w, k) => !got[k] || got[k].level !== w.level || got[k].text !== w.text);
        f.push(`${g.path}: the rendered outline differs from the guide's sections at ${i < 0 ? 'the end' : show(want[i])} (rendered ${got[i] ? show(got[i]) : 'nothing'})`);
      }
      for (const p of PARTS) for (const s of flatGuide(c)[p]) if (!html.includes(escapeHtml(s))) f.push(`${g.path}: the ${p} sentence "${s.slice(0, 60)}..." is not on the rendered page`);
    }
  }
  if (renders < games.length * 2) f.push(`only ${renders} of ${games.length * 2} renders completed`);
  if (withGuide < 100) f.push(`only ${withGuide} games rendered a guide, so the guides did not load`);
  notes[2] = `${renders} renders of ${games.length} games (${withGuide} with a guide) walked for top heading and levels; ${counts.join('; ') || 'no converted guide'}`;
}

/* ---------- 3. the ratchet ---------- */
{
  if (converted.length < CONVERTED_FLOOR) findings[3].push(`${converted.length} converted guides and the floor is ${CONVERTED_FLOOR}: a converted guide went back to flat lists`);
  if (converted.length > CONVERTED_FLOOR) findings[3].push(`${converted.length} converted guides and the floor is ${CONVERTED_FLOOR}: raise CONVERTED_FLOOR in this file to ${converted.length}`);
  notes[3] = `${converted.length} converted (${converted.join(', ') || 'none'}), floor ${CONVERTED_FLOOR}`;
}

/* ---------- 4. the saved pages ---------- */
const skipped = [];
if (CONTROL && CONTROL !== 'snapdrift') {
  notes[4] = `not run under control ${CONTROL}: it reads the real saved pages, which would see the control as drift`;
} else {
  let compared = 0;
  for (const route of converted) {
    const r = rendered.get(route);
    const c = content.get(route);
    if (!r) { findings[4].push(`${route}: no render to compare against`); continue; }
    const titles = guideH2Titles(c, labelOf.get(route));
    const a = r.hs.findIndex(h => h.level === 2 && h.text === titles.howToPlay);
    const b = r.hs.findIndex(h => h.level === 2 && h.text === 'More games to play');
    const want = r.hs.slice(a, b < 0 ? undefined : b);
    let snapshot;
    const file = path.join(ROOT, 'public', route.slice(1), 'index.html');
    if (CONTROL === 'snapdrift' && route === '/club-manager') {
      const stale = want.findIndex(h => h.level === 3);
      if (stale < 0) abort('control snapdrift: the Club Manager render has no h3 to make stale');
      snapshot = want.map((h, i) => `<h${h.level}>${i === stale ? `${h.text} (old)` : h.text}</h${h.level}>`).join('\n');
      console.log(`CONTROL snapdrift: a Club Manager snapshot whose h3 "${want[stale].text}" is stale; section 4 must go red`);
    } else if (fs.existsSync(file)) {
      snapshot = fs.readFileSync(file, 'utf8');
    } else {
      skipped.push(`${route}: no saved page at public${route}/index.html`);
      continue;
    }
    const got = headingsOf(snapshot);
    const mine = new Set([...H2_KEYS.map(k => c.headings?.[k]).filter(Boolean), ...outlineOf(c).map(h => h.text)]);
    const hits = got.filter(h => mine.has(h.text)).length;
    if (hits === 0) {
      skipped.push(`${route}: public${route}/index.html predates the conversion, none of its ${mine.size} converted headings are in it; the prerenderer (npm run build:seo) refreshes it`);
      continue;
    }
    compared += 1;
    const i = got.findIndex(h => h.level === want[0].level && h.text === want[0].text);
    const slice = i < 0 ? [] : got.slice(i, i + want.length);
    if (JSON.stringify(slice) !== JSON.stringify(want)) {
      const k = want.findIndex((w, j) => !slice[j] || slice[j].level !== w.level || slice[j].text !== w.text);
      findings[4].push(`${route}: the saved page's guide headings differ from the render at ${show(want[k])} (saved ${slice[k] ? show(slice[k]) : 'nothing'})`);
    }
  }
  notes[4] = `${compared} saved page${compared === 1 ? '' : 's'} compared, ${skipped.length} skipped`;
}

fs.rmSync(TMP, { recursive: true, force: true });

/* ---------- the report ---------- */
const TITLES = {
  1: 'the words: labels in every h2, full sections, no repeats, no dashes, every frozen sentence once',
  2: 'the outline: one top heading, no skipped level, 8 h3 and 1 h4 in a converted guide',
  3: 'the ratchet: converted guides against the floor',
  4: 'the saved pages match the render once prerendered',
};
console.log('');
for (const n of [1, 2, 3, 4]) {
  console.log(`${n}) ${TITLES[n]}`);
  for (const m of findings[n].slice(0, 12)) console.error(`  FAIL: ${m}`);
  if (findings[n].length > 12) console.error(`  ... and ${findings[n].length - 12} more`);
  console.log(`   ${findings[n].length ? 'RED' : 'ok '} ${notes[n]}`);
  if (n === 4) for (const s of skipped) console.log(`   SKIP (loud): ${s}`);
}
const red = [1, 2, 3, 4].filter(n => findings[n].length);
const total = red.reduce((t, n) => t + findings[n].length, 0);
console.log('');
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  if (red.length === 1 && red[0] === want) {
    console.log(`simGuideHeadings control ${CONTROL}: section ${want} red and every other section green, the break was caught where it should be (exit 1)`);
    process.exit(1);
  }
  console.error(`simGuideHeadings control ${CONTROL}: DEAD OR LEAKY. Expected only section ${want} red, got red in [${red.join(', ') || 'none'}]`);
  process.exit(2);
}
if (red.length) {
  console.error(`simGuideHeadings: RED, ${total} failure${total === 1 ? '' : 's'} in section${red.length === 1 ? '' : 's'} ${red.join(', ')}`);
  process.exit(1);
}
console.log(`simGuideHeadings: green. ${converted.length} guides carry keyword h2s over h3 and h4 sections with every original sentence intact, and all ${games.length} blocks render a clean outline.`);
