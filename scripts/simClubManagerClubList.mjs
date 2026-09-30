/**
 * ROUND 655: CLUB MANAGER'S LEAGUES AND CLUBS REACH A CRAWLER AS TEXT.
 *
 * The club picker on /club-manager is all buttons and only its era step draws
 * on first load, so the saved page (public/club-manager/index.html, which is
 * what Bing and every other raw HTML reader gets) never carried a single club
 * name. src/components/club-manager/ClubManagerClubList.tsx now prints every
 * modern league as an h3 over a paragraph of its clubs, inside the guide block,
 * from the same REAL_LEAGUES lists the picker offers. This holds it there.
 *
 * Every check runs on two documents: THE RENDER (GameSeoContent with the list
 * as its child, through react-dom/server, so it always runs) and THE SAVED PAGE
 * (what the prerenderer wrote, which is what a crawler is actually served).
 *
 *   1. LEAGUES. The block's h2 appears exactly once, and its h3s are exactly
 *      "<league> clubs you can manage (<count>)" for every REAL_LEAGUES entry,
 *      in data order, with nothing else.
 *   2. CLUBS. The paragraph under each league h3 names exactly that league's
 *      clubs, each once. The picker's playableClubs holds the same clubs.
 *   3. PARTIAL MARKS. A club reads "(partial data)" exactly when isPartialClub
 *      says so, the line explaining the mark is there, and every club with an
 *      empty baked squad is marked (it is all youth players).
 *   4. THE DATE. Exactly one "Squads as of X." line, and X is
 *      CM_ROSTER_META.asOf, the roster bake's own date. Never the clock.
 *   5. NO OTHER ERA. No club that exists only in a past season's world
 *      (ERA_LEAGUES) appears anywhere in the block.
 *   6. WIRING. ClubManager.tsx passes the list into GameSeoContent (read from
 *      the code with comments stripped), GameSeoContent draws it inside its
 *      section and above the related games, and the list carries no
 *      data-no-prerender, which would strip it from the saved page.
 *
 * THE ONE SAVED PAGE ALLOWED TO LACK THE LIST is the Release F snapshot this
 * round was built on, pinned below by the hash of its text. It is skipped,
 * loudly, until a release build (npm run build:seo) rewrites it. Any other
 * saved page without the list is red: that is a list that was dropped, not a
 * page that predates it. CM_CLUBLIST_PAGE=<path> reads a different file, for
 * example dist/club-manager/index.html after a build:seo whose public/ copy
 * was reverted.
 *
 * NEGATIVE CONTROLS (CM_CLUBLIST_CONTROL). Each refuses to run if its anchor
 * is missing or its edit changes nothing, edits only an in memory copy, and
 * must turn exactly its own section red:
 *   dropleague  the saved page loses the Süper Lig h3 and its paragraph   section 1
 *   dropclub    the saved Bundesliga paragraph loses Bayern Munich        section 2
 *   unmark      the saved Scottish paragraph drops Aberdeen's mark        section 3
 *   clockdate   the saved date line carries today's date from the clock   section 4
 *   eraclub     the saved block gains a paragraph of past era clubs       section 5
 *   unwired     ClubManager.tsx stops passing the list into the block     section 6
 * Under a control the harness exits 1 when exactly the predicted section is
 * red (the break was caught) and 2 when it is not (the control proves nothing).
 *
 * Run: node scripts/simClubManagerClubList.mjs
 */
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const require = createRequire(import.meta.url);

const CONTROLS = { dropleague: 1, dropclub: 2, unmark: 3, clockdate: 4, eraclub: 5, unwired: 6 };
const CONTROL = process.env.CM_CLUBLIST_CONTROL || '';
const abort = m => { console.error(`simClubManagerClubList: cannot run: ${m}`); process.exit(2); };
if (CONTROL && !CONTROLS[CONTROL]) abort(`CM_CLUBLIST_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);

/* The Release F snapshot (deployment fe10102e), sha256 of its text with line
   endings folded to LF. It is the only saved page that may lack the list. */
const PRE_655_SNAPSHOT = 'ba5d048a4c1a46ea0fd61f9927f5eb29b21a2df38c96fba624f8ea108c52ad35';
const PAGE = process.env.CM_CLUBLIST_PAGE
  ? path.resolve(ROOT, process.env.CM_CLUBLIST_PAGE)
  : path.join(ROOT, 'public', 'club-manager', 'index.html');
const PAGE_LABEL = path.relative(ROOT, PAGE).replaceAll('\\', '/');
const PAGE_SRC = path.join(ROOT, 'src/pages/ClubManager.tsx');
const LIST_SRC = path.join(ROOT, 'src/components/club-manager/ClubManagerClubList.tsx');

const HEADING = 'Every league and club in Club Manager';
const MARK = ' (partial data)';
const lf = s => s.replaceAll('\r\n', '\n');

/* ---------- the engine, the block and the list, bundled once ---------- */
let esbuild;
try { esbuild = require('esbuild'); } catch { abort('esbuild not found in any node_modules above the repo'); }
const REACT = (() => { try { return require.resolve('react/package.json'); } catch { return null; } })();
if (!REACT) abort('react not found in any node_modules above the repo');
const MODULES = path.dirname(path.dirname(REACT));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `cmClubList-${process.pid}-`));
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.cjs');
fs.writeFileSync(ENTRY, `
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import GameSeoContent from '${ROOT_URL}/src/components/seo/GameSeoContent.tsx';
import { ClubManagerClubList } from '${ROOT_URL}/src/components/club-manager/ClubManagerClubList.tsx';
export { REAL_LEAGUES, ERA_LEAGUES, isPartialClub, playableClubs, CM_ROSTER_META, CM_ROSTERS } from '${ROOT_URL}/src/lib/clubManager.ts';
export const render = () => renderToStaticMarkup(
  React.createElement(HelmetProvider, { context: {} },
    React.createElement(MemoryRouter, { initialEntries: ['/club-manager'] },
      React.createElement(GameSeoContent, { title: 'Club Manager', description: 'The guide block.', pageHasOwnH1: true },
        React.createElement(ClubManagerClubList)))));
`);
esbuild.buildSync({
  entryPoints: [ENTRY],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  alias: { '@': `${ROOT_URL}/src` },
  nodePaths: [MODULES],
  define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
  outfile: BUNDLE,
  logLevel: 'error',
});
/* The engine reads saves at load in places; a quiet store keeps this a
   render of the data, with no save and no promotions registered. */
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const {
  REAL_LEAGUES, ERA_LEAGUES, isPartialClub, playableClubs, CM_ROSTER_META, CM_ROSTERS, render: renderRaw,
} = require(BUNDLE);
const renderHtml = (() => {
  const error = console.error;
  console.error = (...a) => { if (!String(a[0]).includes('useLayoutEffect does nothing on the server')) error(...a); };
  try { return renderRaw(); } finally { console.error = error; }
})();
fs.rmSync(TMP, { recursive: true, force: true });

/* ---------- what the page must say, straight from the data ---------- */
if (!Array.isArray(REAL_LEAGUES) || REAL_LEAGUES.length < 10) abort('REAL_LEAGUES did not load');
const modernClubs = new Set(REAL_LEAGUES.flatMap(l => l.clubs));
for (const c of modernClubs) {
  if (c.includes(', ') || c.includes(' (') || c.endsWith('.')) abort(`club name "${c}" cannot be read back out of a comma list`);
}
const eraOnly = [...new Set(Object.values(ERA_LEAGUES).flat().flatMap(l => l.clubs))].filter(c => !modernClubs.has(c));
if (eraOnly.length === 0) abort('no club exists only in a past season, so section 5 would prove nothing');
const wantH3 = REAL_LEAGUES.map(l => `${l.name} clubs you can manage (${l.clubs.length})`);
const leagueByH3 = new Map(REAL_LEAGUES.map((l, i) => [wantH3[i], l]));
const partialCount = [...modernClubs].filter(c => isPartialClub(c)).length;

/* ---------- reading a document ---------- */
const decode = s => s
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<[^>]+>/g, '')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

/** The list block: from its h2 to the next h1 or h2, the section's end, or site chrome. */
function blockOf(html) {
  const hits = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].filter(m => decode(m[1]) === HEADING);
  if (hits.length !== 1) return { h2s: hits.length, block: null, start: hits[0]?.index ?? -1 };
  const from = hits[0].index + hits[0][0].length;
  const rest = html.slice(from);
  const end = rest.search(/<h[12]\b|<\/section>|<div data-site-chrome/i);
  return { h2s: 1, block: end < 0 ? rest : rest.slice(0, end), start: hits[0].index };
}
const tokensOf = block => [...block.matchAll(/<(h3|h4|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
  .map(m => ({ tag: m[1].toLowerCase(), text: decode(m[2]) }));
const namesOf = text => text.replace(/\.$/, '').split(', ').map(t => (t.endsWith(MARK)
  ? { name: t.slice(0, -MARK.length), marked: true }
  : { name: t, marked: false }));

/* ---------- the documents ---------- */
const docs = [{ label: 'render', html: renderHtml }];
const skipped = [];
const findings = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
const notes = { 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' };

let saved = null;
if (!fs.existsSync(PAGE)) {
  findings[1].push(`saved page: nothing at ${PAGE_LABEL}, so a crawler gets no Club Manager page at all`);
} else {
  saved = fs.readFileSync(PAGE, 'utf8');
  const hash = crypto.createHash('sha256').update(lf(saved)).digest('hex');
  if (blockOf(saved).h2s === 0 && hash === PRE_655_SNAPSHOT) {
    skipped.push(`${PAGE_LABEL} is the Release F snapshot this round was built on and predates the list; a release build (npm run build:seo) rewrites it`);
    saved = null;
  }
}

/* ---------- the controls on the saved page ---------- */
const needSaved = c => {
  if (saved === null) abort(`control ${c} breaks the saved page, and ${PAGE_LABEL} carries no list to break; run npm run build:seo or point CM_CLUBLIST_PAGE at a saved page that has it`);
};
const swap = (c, from, to) => {
  if (!saved.includes(from)) abort(`control ${c}: its anchor ${JSON.stringify(from.slice(0, 80))} is not in ${PAGE_LABEL}`);
  const next = saved.replace(from, () => to);
  if (next === saved) abort(`control ${c} changed nothing`);
  saved = next;
};
const blockTokenHtml = (tag, text) => {
  const m = blockOf(saved).block?.match(new RegExp(`<${tag}\\b[^>]*>(?:(?!</${tag}>)[\\s\\S])*?</${tag}>`, 'gi'))
    ?.find(x => decode(x) === text);
  return m ?? null;
};
let pageSrc = lf(fs.readFileSync(PAGE_SRC, 'utf8'));
if (CONTROL === 'dropleague') {
  needSaved(CONTROL);
  const h3 = wantH3[REAL_LEAGUES.findIndex(l => l.name === 'Süper Lig')];
  const h3Html = h3 && blockTokenHtml('h3', h3);
  if (!h3Html) abort('control dropleague: no Süper Lig h3 in the saved block');
  const at = saved.indexOf(h3Html);
  const pEnd = saved.indexOf('</p>', at + h3Html.length);
  if (pEnd < 0) abort('control dropleague: no paragraph after the Süper Lig h3');
  swap(CONTROL, saved.slice(at, pEnd + 4), '');
  console.log('CONTROL dropleague: the saved page loses the Süper Lig h3 and its paragraph; section 1 must go red');
}
if (CONTROL === 'dropclub') {
  needSaved(CONTROL);
  const bundes = REAL_LEAGUES.find(l => l.id === 'bundesliga');
  if (!bundes?.clubs.includes('Bayern Munich')) abort('control dropclub: Bayern Munich is not a Bundesliga club in the data');
  const pText = `${bundes.clubs.map(c => (isPartialClub(c) ? c + MARK : c)).join(', ')}.`;
  const pHtml = blockTokenHtml('p', pText);
  if (!pHtml) abort('control dropclub: the saved block has no Bundesliga paragraph in the expected shape');
  const cut = pHtml.includes('Bayern Munich, ') ? pHtml.replace('Bayern Munich, ', '') : pHtml.replace(', Bayern Munich', '');
  swap(CONTROL, pHtml, cut);
  console.log('CONTROL dropclub: the saved Bundesliga paragraph loses Bayern Munich; section 2 must go red');
}
if (CONTROL === 'unmark') {
  needSaved(CONTROL);
  if (!isPartialClub('Aberdeen')) abort('control unmark: Aberdeen is not a partial club in the data');
  const scot = REAL_LEAGUES.find(l => l.id === 'scottish');
  const pText = `${scot.clubs.map(c => (isPartialClub(c) ? c + MARK : c)).join(', ')}.`;
  const pHtml = blockTokenHtml('p', pText);
  if (!pHtml) abort('control unmark: the saved block has no Scottish Premiership paragraph in the expected shape');
  swap(CONTROL, pHtml, pHtml.replace(`Aberdeen${MARK}`, 'Aberdeen'));
  console.log('CONTROL unmark: the saved Scottish paragraph drops Aberdeen\'s partial data mark; section 3 must go red');
}
if (CONTROL === 'clockdate') {
  needSaved(CONTROL);
  const line = blockTokenHtml('p', `Squads as of ${CM_ROSTER_META.asOf}.`);
  if (!line) abort('control clockdate: the saved block has no date line');
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  swap(CONTROL, line, line.replace(CM_ROSTER_META.asOf, today));
  console.log(`CONTROL clockdate: the saved date line reads "Squads as of ${today}.", off the clock; section 4 must go red`);
}
if (CONTROL === 'eraclub') {
  needSaved(CONTROL);
  const { block } = blockOf(saved);
  if (!block) abort('control eraclub: the saved page has no block to plant into');
  const planted = `${eraOnly.slice(0, 2).join(', ')}.`;
  const lastP = block.lastIndexOf('</p>');
  if (lastP < 0) abort('control eraclub: the saved block has no paragraph to plant after');
  swap(CONTROL, block, `${block.slice(0, lastP + 4)}<p>${planted}</p>${block.slice(lastP + 4)}`);
  console.log(`CONTROL eraclub: the saved block gains "${planted}", clubs only a past season holds; section 5 must go red`);
}
if (CONTROL === 'unwired') {
  const anchor = '<ClubManagerClubList />';
  if (!pageSrc.includes(anchor)) abort('control unwired: ClubManager.tsx does not pass <ClubManagerClubList /> in the shape it removes');
  const next = pageSrc.replace(anchor, '');
  if (next === pageSrc) abort('control unwired changed nothing');
  pageSrc = next;
  console.log('CONTROL unwired: ClubManager.tsx no longer passes the list into GameSeoContent; section 6 must go red');
}
if (saved !== null) docs.push({ label: `saved page ${PAGE_LABEL}`, html: saved });

/* ---------- 1 to 5, on every document ---------- */
let clubsSeen = 0;
let marksSeen = 0;
for (const doc of docs) {
  const { h2s, block } = blockOf(doc.html);
  if (!block) {
    findings[1].push(`${doc.label}: the h2 "${HEADING}" appears ${h2s} times, not once`);
    for (const n of [2, 3, 4, 5]) findings[n].push(`${doc.label}: not checked, there is no single list block`);
    continue;
  }
  const tokens = tokensOf(block);

  /* 1. leagues */
  const h3s = tokens.filter(t => t.tag === 'h3').map(t => t.text);
  const missing = wantH3.filter(h => !h3s.includes(h));
  const extra = h3s.filter(h => !leagueByH3.has(h));
  for (const h of missing) findings[1].push(`${doc.label}: no h3 "${h}"`);
  for (const h of extra) findings[1].push(`${doc.label}: an h3 no modern league makes, "${h}"`);
  for (const h of new Set(h3s)) if (h3s.filter(x => x === h).length > 1) findings[1].push(`${doc.label}: the h3 "${h}" appears ${h3s.filter(x => x === h).length} times`);
  if (!missing.length && !extra.length && h3s.join('|') !== wantH3.join('|')) findings[1].push(`${doc.label}: the league h3s are out of data order`);

  /* 2 and 3. each league's paragraph, and its marks */
  tokens.forEach((t, i) => {
    const league = t.tag === 'h3' ? leagueByH3.get(t.text) : null;
    if (!league) return;
    const next = tokens[i + 1];
    if (!next || next.tag !== 'p') { findings[2].push(`${doc.label}: ${league.name} has no paragraph of clubs under its h3`); return; }
    const got = namesOf(next.text);
    const names = got.map(g => g.name);
    for (const c of league.clubs) if (!names.includes(c)) findings[2].push(`${doc.label}: ${league.name} is missing ${c}`);
    for (const n of new Set(names)) {
      if (!league.clubs.includes(n)) findings[2].push(`${doc.label}: ${league.name} names "${n}", which is not one of its clubs`);
      else if (names.filter(x => x === n).length > 1) findings[2].push(`${doc.label}: ${league.name} names ${n} more than once`);
    }
    for (const g of got) {
      if (!league.clubs.includes(g.name)) continue;
      clubsSeen += 1;
      if (g.marked) marksSeen += 1;
      if (g.marked !== isPartialClub(g.name)) findings[3].push(`${doc.label}: ${g.name} is ${g.marked ? 'marked partial data but the data is not thin' : 'not marked, but isPartialClub says its data is thin'}`);
    }
  });
  const explain = tokens.filter(t => t.tag === 'p' && t.text.startsWith('Partial data means'));
  if (explain.length !== 1) findings[3].push(`${doc.label}: the line explaining the partial data mark appears ${explain.length} times, not once`);

  /* 4. the date */
  const dated = tokens.filter(t => /^Squads as of /.test(t.text));
  const wantDate = `Squads as of ${CM_ROSTER_META.asOf}.`;
  if (dated.length !== 1) findings[4].push(`${doc.label}: ${dated.length} "Squads as of" lines, not one`);
  for (const d of dated) if (d.text !== wantDate) findings[4].push(`${doc.label}: "${d.text}" is not the roster bake's own date, "${wantDate}"`);

  /* 5. no other era */
  const pieces = tokens.flatMap(t => [t.text, ...namesOf(t.text).map(g => g.name)]);
  const leaked = eraOnly.filter(c => pieces.includes(c));
  for (const c of leaked) findings[5].push(`${doc.label}: ${c} appears, and only a past season holds that club`);
}

/* The picker's own view of each league must be the list's view. */
for (const l of REAL_LEAGUES) {
  const picker = playableClubs(l.id).map(c => c.name);
  const a = [...picker].sort().join('|');
  const b = [...l.clubs].sort().join('|');
  if (a !== b) findings[2].push(`data: the picker offers ${picker.length} ${l.name} clubs and the list prints ${l.clubs.length}, not the same clubs`);
}
/* A club with no baked players at all is youth players only, so it must carry the mark. */
const emptyUnmarked = [...modernClubs].filter(c => (CM_ROSTERS[c] ?? []).length === 0 && !isPartialClub(c));
for (const c of emptyUnmarked) findings[3].push(`data: ${c} has no baked players and is not in CM_PARTIAL, so the page would call a youth squad full data`);

const docCount = docs.length;
notes[1] = `${REAL_LEAGUES.length} modern leagues looked for as h3s in ${docCount} document${docCount === 1 ? '' : 's'}`;
notes[2] = `${modernClubs.size} clubs in the data, ${clubsSeen} club names read, each league also read off the picker`;
notes[3] = `${partialCount} partial clubs in the data, ${marksSeen} marks read, ${[...modernClubs].filter(c => (CM_ROSTERS[c] ?? []).length === 0).length} empty squads in the data`;
notes[4] = `the bake's date is "${CM_ROSTER_META.asOf}"`;
notes[5] = `${eraOnly.length} clubs only a past season holds, looked for in the block`;

/* ---------- 6. wiring ---------- */
{
  const code = src => src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
  const page = code(pageSrc);
  if (!/import\s*\{\s*ClubManagerClubList\s*\}\s*from\s*'@\/components\/club-manager\/ClubManagerClubList'/.test(page)) {
    findings[6].push('ClubManager.tsx does not import ClubManagerClubList');
  }
  const open = page.indexOf('<GameSeoContent');
  const close = page.indexOf('</GameSeoContent>', open);
  if (open < 0 || close < 0) findings[6].push('ClubManager.tsx has no <GameSeoContent> element with children');
  else if (!/<ClubManagerClubList\s*\/>/.test(page.slice(open, close))) findings[6].push('ClubManager.tsx does not pass <ClubManagerClubList /> into GameSeoContent');
  if (page.split('<GameSeoContent').length !== 2) findings[6].push('ClubManager.tsx draws GameSeoContent more than once, so which block carries the list is unclear');

  const list = code(lf(fs.readFileSync(LIST_SRC, 'utf8')));
  if (/data-no-prerender/.test(list)) findings[6].push('ClubManagerClubList carries data-no-prerender, so the prerenderer strips it from the saved page');

  const sec = renderHtml.search(/<section\b[^>]*data-seo-content/);
  const secEnd = renderHtml.indexOf('</section>', sec);
  const at = blockOf(renderHtml).start;
  const related = renderHtml.search(/<h2\b[^>]*>More games to play<\/h2>/);
  if (sec < 0 || at < sec || at > secEnd) findings[6].push('render: GameSeoContent does not draw the list inside its section');
  else if (related >= 0 && at > related) findings[6].push('render: the list sits below the related games instead of below the guide');
  notes[6] = 'ClubManager.tsx and ClubManagerClubList.tsx read as code, the render read for where the block draws it';
}

/* ---------- the report ---------- */
const TITLES = {
  1: 'leagues: one h2, and an h3 with its club count for every modern league, in order',
  2: 'clubs: every league paragraph names exactly its clubs, the same ones the picker offers',
  3: 'partial marks: exactly the isPartialClub clubs, explained once, every empty squad marked',
  4: 'the date: one line, the roster bake\'s own, never the clock',
  5: 'no other era: no club only a past season holds',
  6: 'wiring: in the guide block, drawn, not stripped',
};
console.log('');
for (const n of [1, 2, 3, 4, 5, 6]) {
  console.log(`${n}) ${TITLES[n]}`);
  for (const m of findings[n].slice(0, 12)) console.error(`  FAIL: ${m}`);
  if (findings[n].length > 12) console.error(`  ... and ${findings[n].length - 12} more`);
  console.log(`   ${findings[n].length ? 'RED' : 'ok '} ${notes[n]}`);
}
for (const s of skipped) console.log(`   SKIP (loud): ${s}`);
console.log(`   documents read: ${docs.map(d => d.label).join(', ')}`);

const red = [1, 2, 3, 4, 5, 6].filter(n => findings[n].length);
console.log('');
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  if (red.length === 1 && red[0] === want) {
    console.log(`simClubManagerClubList control ${CONTROL}: caught. Exactly section ${want} is red, as it must be.`);
    process.exit(1);
  }
  console.error(`simClubManagerClubList control ${CONTROL}: NOT caught cleanly. Red sections: ${red.join(', ') || 'none'}; expected exactly ${want}.`);
  process.exit(2);
}
if (red.length) {
  console.error(`simClubManagerClubList: RED in section${red.length === 1 ? '' : 's'} ${red.join(', ')}.`);
  process.exit(1);
}
console.log(`simClubManagerClubList: green. ${REAL_LEAGUES.length} leagues and ${modernClubs.size} clubs reach ${docs.length === 2 ? 'the render and the saved page' : 'the render (the saved page was skipped, see above)'}.`);
