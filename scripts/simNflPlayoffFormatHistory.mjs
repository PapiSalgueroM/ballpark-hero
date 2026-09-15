/*
 * Round 522 harness: the NFL playoff format history reference page.
 *
 * Same shape as scripts/simUclFormatHistory.mjs, minus the engine agreement
 * section: this page has no "what the game plays" block generated from an
 * engine, only a short honest sentence, because NFL Front Office has no era
 * system the way Club Manager does.
 *
 * Sections:
 *  1. The timeline is contiguous from 1933, no gaps, no overlaps, exactly one
 *     open period, unique ids, independent historical field fixtures, including the 1982 exception.
 *  2. Every period cites at least two distinct publishers, every id resolves,
 *     every URL is https, nothing is cited by nothing, the verification date
 *     is real and not in the future.
 *  4. Historical boundary fixtures, qualifications, parsed FAQ copy and overtime
 *     exceptions agree with the independent research record.
 *  3. The shipped snapshot carries every row, the source list and enough of
 *     the page that a crawler receives the page rather than a shell.
 *
 * Controls:
 *   NFL_PLAYOFF_CONTROL=gap   moves a period's first season by a year, so
 *                             section 1 must report the hole.
 *   NFL_PLAYOFF_CONTROL=onesrc strips a period down to one source, so
 *                             section 2 must report it.
 *
 * Additional controls restore each corrected misconception: earlyfield, bracket,
 * strike, restore, byes, precursor, tiebreak, labels, faq, overtime, qualification,
 * strikebyes, realignment, modernbyes, fieldfaq, otfaq and otyear. The
 * snapshot control removes a corrected claim from the in-memory HTML only.
 * Each must fire its exact intended finding; unrecognized controls fail closed.
 *
 * NFL_PLAYOFF_SOURCE_ONLY=1 is for source iteration before prerendering only.
 * Default mode still checks the public snapshot, including all corrected prose.
 * Run: node scripts/simNflPlayoffFormatHistory.mjs
 */
import { build } from 'esbuild';
import ts from 'typescript';
import { decodeHTML } from 'entities';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP = os.tmpdir().replaceAll('\\', '/');
const PID = process.pid;
const ENTRY = `${TMP}/nflPlayoff.${PID}.entry.mjs`;
const BUNDLE = `${TMP}/nflPlayoff.${PID}.bundle.mjs`;
const LIB = `${ROOT}/src/lib/nflPlayoffFormatHistory.ts`;

const CONTROL = process.env.NFL_PLAYOFF_CONTROL || '';
const SOURCE_ONLY = process.env.NFL_PLAYOFF_SOURCE_ONLY === '1';
const PAGE = path.join(ROOT, 'src/pages/NflPlayoffFormatHistory.tsx');
const KNOWN = ['gap', 'onesrc', 'earlyfield', 'bracket', 'strike', 'restore', 'byes', 'precursor', 'tiebreak', 'labels', 'faq', 'overtime', 'qualification', 'strikebyes', 'realignment', 'modernbyes', 'fieldfaq', 'otfaq', 'otyear', 'snapshot'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`NFL_PLAYOFF_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

function patched(from, to, outName, sourcePath = LIB) {
  let src = fs.readFileSync(sourcePath, 'utf8').replaceAll('\r\n', '\n');
  const n = src.split(from).length - 1;
  if (n !== 1) {
    console.error(`control cannot run: the library contains the target ${n} times, not once`);
    console.error(`  looked for: ${from}`);
    process.exit(1);
  }
  if (from === to) throw new Error('Control must change source');
  src = src.replace(from, to);
  console.log(`CONTROL MUTATION APPLIED: ${CONTROL}`);
  const out = `${TMP}/${outName}`;
  fs.writeFileSync(out, src);
  return out;
}

let libPath = LIB;
let pagePath = PAGE;
const mutations = {
  gap: ["    id: 'ten-teams',\n    from: 1978,", "    id: 'ten-teams',\n    from: 1979,"],
  onesrc: ["sources: ['bears', 'hof1990s'],", "sources: ['bears'],"],
  earlyfield: ["title: 'Two winners meet for the NFL title',\n    fieldSize: 2,", "title: 'Two winners meet for the NFL title',\n    fieldSize: 0,"],
  bracket: ["title: 'Four division winners, two NFL rounds',\n    fieldSize: 4,", "title: 'Four division winners, two NFL rounds',\n    fieldSize: 2,"],
  strike: ["title: 'The strike exception: sixteen teams',\n    fieldSize: 16,", "title: 'The strike exception: sixteen teams',\n    fieldSize: 10,"],
  restore: ["title: 'Back to ten teams',\n    fieldSize: 10,", "title: 'Back to ten teams',\n    fieldSize: 16,"],
  byes: ['Only the top two seeds in each conference receive first round byes.', 'All three division winners in each conference receive first round byes.'],
  precursor: ['The 1932 Bears and Portsmouth Spartans had already played a tiebreaker to decide the title.', 'No title had been decided on the field before 1933.'],
  tiebreak: ['Tied leaders can require an extra playoff first.', 'No other postseason games existed.'],
  labels: ['The Eastern and Western division winners, later conference winners,', 'The Eastern and Western conference winners, later division winners,'],
  qualification: ['The top eight teams in each conference qualify by record, seeded 1 through 8,', 'The top six teams in each conference qualify by record, seeded 1 through 6,'],
  strikebyes: ['for this season only, with no first round byes.', 'for this season only, with first round byes for the top seeds.'],
  realignment: ['Four division winners plus two wild cards in each conference,', 'Three division winners plus three wild cards in each conference,'],
  modernbyes: ['only the top seed in each conference gets a first round bye.', 'the top two seeds in each conference get first round byes.'],
  otyear: ['regularSeasonModified: 2012,', 'regularSeasonModified: 2011,'],
};
if (mutations[CONTROL]) {
  libPath = patched(...mutations[CONTROL], `nflPlayoffFormatHistory.${PID}.control.ts`);
} else if (CONTROL === 'faq') {
  pagePath = patched('In 1967, four NFL division champions began playing two conference championships followed by the NFL title game.', 'In 1970, the NFL first began using a bracket instead of one title game.', `nflPlayoffFormatHistory.${PID}.control.tsx`, PAGE);
} else if (CONTROL === 'fieldfaq') {
  pagePath = patched('then returned to ten in 1983.', 'then kept sixteen in 1983.', `nflPlayoffFormatHistory.${PID}.control.tsx`, PAGE);
} else if (CONTROL === 'otfaq') {
  pagePath = patched('an opening defensive touchdown or safety can end the game.', 'every team is guaranteed an offensive drive.', `nflPlayoffFormatHistory.${PID}.control.tsx`, PAGE);
} else if (CONTROL === 'overtime') {
  libPath = patched('but kept its single 10-minute period, which can expire before a reply and can end in a tie.', 'with unlimited 15-minute periods until both teams have an offensive drive.', `nflPlayoffFormatHistory.${PID}.control.ts`);
}

fs.writeFileSync(ENTRY, `export const lib = await import('${libPath.replaceAll('\\', '/')}');`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error' });
const { lib } = await import(pathToFileURL(BUNDLE).href);
const { NFL_PLAYOFF_PERIODS, NFL_PLAYOFF_SOURCES, NFL_OVERTIME, NFL_PLAYOFF_VERIFIED_ON, seasonRange, sourceById, periodFor } = lib;

for (const [name, v] of Object.entries({ NFL_PLAYOFF_PERIODS, NFL_PLAYOFF_SOURCES, NFL_OVERTIME, NFL_PLAYOFF_VERIFIED_ON, seasonRange, sourceById, periodFor })) {
  if (v === undefined) {
    console.error(`the harness could not reach ${name}; the bundle is not the shape it expects`);
    process.exit(1);
  }
}

let failures = 0;
const sectionMessages = {};
let section = '';
const fail = m => { failures += 1; (sectionMessages[section] ??= []).push(m); console.error('  FAIL: ' + m); };

/* ---------- 1. Contiguity ---------- */
section = '1';
console.log('1) the timeline is contiguous from 1933 with exactly one open period');
{
  const ps = NFL_PLAYOFF_PERIODS;
  const ids = new Set(ps.map(p => p.id));
  if (ids.size !== ps.length) fail('period ids are not unique');
  if (ps.length === 0 || ps[0].from !== 1933) fail(`the first period starts in ${ps[0]?.from}, not 1933`);
  for (let i = 1; i < ps.length; i += 1) {
    const prev = ps[i - 1];
    const cur = ps[i];
    if (prev.to === null) { fail(`${prev.id} is open but ${cur.id} follows it`); continue; }
    if (cur.from !== prev.to + 1) fail(`${prev.id} ends ${prev.to} and ${cur.id} starts ${cur.from}: a hole or an overlap`);
    if (cur.to !== null && cur.to < cur.from) fail(`${cur.id} ends before it starts`);
  }
  const open = ps.filter(p => p.to === null).length;
  if (open !== 1) fail(`${open} open periods, expected exactly one (the current format)`);
  let covered = 0;
  for (let y = 1933; y <= 2026; y += 1) {
    const hits = ps.filter(p => y >= p.from && (p.to === null || y <= p.to)).length;
    if (hits !== 1) fail(`season ${y} is claimed by ${hits} periods`);
    else covered += 1;
  }
  console.log(`   ${ps.length} periods, ${covered} seasons each on exactly one row, ${seasonRange(ps[0])} through ${seasonRange(ps[ps.length - 1])}`);
}

/* ---------- 2. Two publishers ---------- */
section = '2';
console.log('2) every period rests on at least two publishers, and the provenance is well formed');
{
  let cited = 0;
  for (const p of NFL_PLAYOFF_PERIODS) {
    const srcs = p.sources.map(id => sourceById(id));
    const missing = p.sources.filter((id, i) => !srcs[i]);
    if (missing.length) fail(`${p.id} cites unknown source ids: ${missing.join(', ')}`);
    const publishers = new Set(srcs.filter(Boolean).map(s => s.publisher));
    if (publishers.size < 2) fail(`${p.id} rests on ${publishers.size} publisher(s): ${[...publishers].join(', ') || 'none'}`);
    cited += srcs.filter(Boolean).length;
  }
  const otPubs = new Set(NFL_OVERTIME.sources.map(id => sourceById(id)?.publisher).filter(Boolean));
  if (otPubs.size < 2) fail(`the overtime block rests on ${otPubs.size} publisher(s)`);
  for (const s of NFL_PLAYOFF_SOURCES) {
    if (!/^https:\/\//.test(s.url)) fail(`${s.id} is not an https URL`);
    try { new URL(s.url); } catch { fail(`${s.id} has an unparseable URL`); }
  }
  const ids = new Set(NFL_PLAYOFF_SOURCES.map(s => s.id));
  if (ids.size !== NFL_PLAYOFF_SOURCES.length) fail('source ids are not unique');
  const unused = NFL_PLAYOFF_SOURCES.filter(s => !NFL_PLAYOFF_PERIODS.some(p => p.sources.includes(s.id)) && !NFL_OVERTIME.sources.includes(s.id));
  if (unused.length) fail(`${unused.length} source(s) nothing cites: ${unused.map(s => s.id).join(', ')}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(NFL_PLAYOFF_VERIFIED_ON) || Number.isNaN(Date.parse(NFL_PLAYOFF_VERIFIED_ON))) {
    fail(`NFL_PLAYOFF_VERIFIED_ON is not a date: ${NFL_PLAYOFF_VERIFIED_ON}`);
  } else if (Date.parse(NFL_PLAYOFF_VERIFIED_ON) > Date.now()) {
    fail(`NFL_PLAYOFF_VERIFIED_ON is in the future: ${NFL_PLAYOFF_VERIFIED_ON}`);
  }
  console.log(`   ${NFL_PLAYOFF_SOURCES.length} sources across ${new Set(NFL_PLAYOFF_SOURCES.map(s => s.publisher)).size} publishers, ${cited} citations, verified ${NFL_PLAYOFF_VERIFIED_ON}`);
}

/* ---------- 4. Historical facts and reader-facing explanations ---------- */
section = '4';
console.log('4) independent season fixtures and the visible explanations agree');
// Fixed boundary observations from the Bears history and HOF decade results.
// These are independent of the production period ranges, including the contraction.
const fixtures = [
  [1933, 2], [1941, 2], [1965, 2], [1966, 2], [1967, 4], [1968, 4], [1969, 4],
  [1970, 8], [1977, 8], [1978, 10], [1981, 10], [1982, 16], [1983, 10],
  [1989, 10], [1990, 12], [2001, 12], [2002, 12], [2019, 12], [2020, 14], [2026, 14],
];
for (const [year, field] of fixtures) {
  if (periodFor(year).fieldSize !== field) fail(`historical field ${year}: expected ${field}, got ${periodFor(year).fieldSize}`);
}
const early = periodFor(1933);
if (!/Eastern and Western division winners, later conference winners/.test(early.qualifying)) fail('1933 division labels must precede conference labels');
if (!early.notes.some(n => /1932.*Bears.*Portsmouth.*tiebreaker.*title/.test(n))) fail('1932 title playoff precursor is missing');
if (!/Tied leaders.*extra playoff/.test(early.qualifying)) fail('early tied-leader playoff exception is missing');
if (!/top eight teams in each conference.*record.*seeded 1 through 8/.test(periodFor(1982).qualifying)) fail('1982 conference tournament qualification is missing');
if (!periodFor(1982).notes.some(n => /nine games/.test(n) && /no first round byes/.test(n))) fail('1982 strike schedule and no-bye explanation is missing');
if (!/top two seeds.*first round byes/.test(periodFor(1990).qualifying)) fail('1990 byes must belong only to the top two seeds');
if (!/Four division winners plus two wild cards/.test(periodFor(2002).qualifying)) fail('2002 must trade a wild-card place for a division-winner place');
if (!/only the top seed.*first round bye/.test(periodFor(2020).qualifying)) fail('2020 must give the only bye to the top seed');

// Parse the actual FAQ literals, not comments that happen to describe the correction.
const pageAst = ts.createSourceFile(PAGE, fs.readFileSync(pagePath, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let faqs = [];
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(pageAst) === 'FAQS' && ts.isArrayLiteralExpression(node.initializer)) {
    faqs = node.initializer.elements.map(el => Object.fromEntries(el.properties.filter(ts.isPropertyAssignment).map(prop => [prop.name.getText(pageAst), ts.isStringLiteral(prop.initializer) ? prop.initializer.text : ''])));
  }
  ts.forEachChild(node, visit);
}
visit(pageAst);
if (faqs.length !== 4 || faqs.some(f => !f.q || !f.a)) fail('four readable FAQ question/answer literals are required');
const bracketFaq = faqs.find(f => /bracket instead/.test(f.q))?.a ?? '';
if (!/^In 1967,/.test(bracketFaq) || !/1970 merger expanded/.test(bracketFaq) || !/tied leaders/.test(bracketFaq)) fail('bracket FAQ must distinguish 1967 from the 1970 merger and earlier tiebreakers');
const fieldFaq = faqs.find(f => /always grow/.test(f.q))?.a ?? '';
if (!/sixteen.*1982.*ten in 1983/.test(fieldFaq)) fail('field FAQ must explain the 1982 exception and 1983 return');
const otFaq = faqs.find(f => /overtime work/.test(f.q))?.a ?? '';
if (!/opportunity to possess/.test(otFaq) || !/not a guaranteed offensive drive/.test(otFaq) || !/defensive touchdown or safety/.test(otFaq)) fail('overtime FAQ must explain opportunity and defensive-score exceptions');
if (!/single 10-minute period.*expire before a reply.*tie/.test(NFL_OVERTIME.text) || !/15 minutes.*continue/.test(NFL_OVERTIME.text)) fail('overtime must distinguish the regular-season time limit from postseason continuation');
for (const [key, year] of Object.entries({ firstDecidedBy: 1958, secondRuleChange: 2010, regularSeasonModified: 2012, thirdRuleChange: 2022, regularSeasonBoth: 2025 })) {
  if (NFL_OVERTIME[key] !== year || !NFL_OVERTIME.text.includes(String(year))) fail(`overtime milestone ${key} must be ${year} in data and prose`);
}
const prose = [...NFL_PLAYOFF_PERIODS.flatMap(p => [p.qualifying, ...p.notes]), ...faqs.map(f => f.a)].join(' ');
if (/No other postseason games existed|every division winner got a bye|first with a guaranteed multi-game bracket/.test(prose)) fail('superseded historical claims remain in reader-facing prose');
console.log(`   ${fixtures.length} historical field fixtures, four parsed FAQs, early exceptions, qualification and overtime milestones checked`);

/* ---------- 3. The shipped snapshot ---------- */
section = '3';
if ((CONTROL && CONTROL !== 'snapshot') || SOURCE_ONLY) {
  if (CONTROL === 'snapshot' && SOURCE_ONLY) throw new Error('snapshot control requires the shipped snapshot check');
  console.log(`3) snapshot check skipped: ${CONTROL ? 'source mutation control' : 'NFL_PLAYOFF_SOURCE_ONLY=1 (not a release check)'}`);
} else {
  console.log('3) the shipped snapshot carries every row, the source list and the page');
  const snap = path.join(ROOT, 'public', 'nfl-playoff-format-history', 'index.html');
  if (!fs.existsSync(snap)) {
    fail('public/nfl-playoff-format-history/index.html is missing: run npm run build:seo so the page ships as a snapshot');
  } else {
    let html = fs.readFileSync(snap, 'utf8');
    if (CONTROL === 'snapshot') {
      const claim = periodFor(1990).qualifying;
      if (!html.includes(claim)) throw new Error('Snapshot control needs the corrected 1990 qualification sentence');
      html = html.replaceAll(claim, 'All division winners got first round byes.');
      console.log('CONTROL MUTATION APPLIED: snapshot');
    }
    const text = decodeHTML(html.replace(/<!--[^]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
    let rows = 0;
    for (const p of NFL_PLAYOFF_PERIODS) {
      if (!text.includes(p.title)) fail(`the snapshot does not carry the row "${p.title}"`);
      else rows += 1;
    }
    for (const must of [NFL_PLAYOFF_VERIFIED_ON, '1958', ...NFL_PLAYOFF_PERIODS.flatMap(p => [p.qualifying, ...p.notes]), ...faqs.flatMap(f => [f.q, f.a]), NFL_OVERTIME.text]) {
      if (!text.includes(must)) fail(`the snapshot does not contain corrected claim ${JSON.stringify(must)}`);
    }
    const cited = NFL_PLAYOFF_SOURCES.filter(s => html.includes(s.url)).length;
    if (cited < NFL_PLAYOFF_SOURCES.length - 1) fail(`only ${cited} of ${NFL_PLAYOFF_SOURCES.length} source URLs reached the snapshot`);
    if (/<meta name="robots"[^>]*noindex/i.test(html)) fail('the snapshot carries a noindex');
    const words = text.split(' ').filter(Boolean).length;
    if (words < 700) fail(`the snapshot carries only ${words} words, which is a shell rather than the page`);
    console.log(`   ${rows} of ${NFL_PLAYOFF_PERIODS.length} rows, ${cited} of ${NFL_PLAYOFF_SOURCES.length} source URLs, ${words} readable words`);
  }
}

console.log('');
if (CONTROL) {
  const expected = {
    gap: ['1', 'a hole or an overlap'], onesrc: ['2', 'rests on'],
    earlyfield: ['4', 'historical field 1933'], bracket: ['4', 'historical field 1967'],
    strike: ['4', 'historical field 1982'], restore: ['4', 'historical field 1983'],
    byes: ['4', '1990 byes'], precursor: ['4', '1932 title playoff'],
    tiebreak: ['4', 'early tied-leader'], labels: ['4', '1933 division labels'],
    faq: ['4', 'bracket FAQ'], overtime: ['4', 'regular-season time limit'],
    qualification: ['4', '1982 conference tournament'], strikebyes: ['4', '1982 strike schedule'],
    realignment: ['4', '2002 must trade'], modernbyes: ['4', '2020 must give'],
    fieldfaq: ['4', 'field FAQ'], otfaq: ['4', 'overtime FAQ'], otyear: ['4', 'overtime milestone'],
    snapshot: ['3', `snapshot does not contain corrected claim ${JSON.stringify(periodFor(1990).qualifying)}`],
  };
  const [expectedSection, signal] = expected[CONTROL];
  const want = { section: expectedSection, signal };
  const hits = (sectionMessages[want.section] ?? []).filter(m => m.includes(want.signal)).length;
  if (hits > 0) {
    console.log(`simNflPlayoffFormatHistory control: green. NFL_PLAYOFF_CONTROL=${CONTROL} was reported by section ${want.section} with "${want.signal}" (${hits} finding${hits === 1 ? '' : 's'}).`);
    process.exit(0);
  }
  console.error(`simNflPlayoffFormatHistory control: RED. NFL_PLAYOFF_CONTROL=${CONTROL} changed the code and section ${want.section} never said "${want.signal}".`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simNflPlayoffFormatHistory: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log(`simNflPlayoffFormatHistory: green. The timeline is whole, historically checked and twice sourced.${SOURCE_ONLY ? ' SOURCE ONLY: shipped snapshot not checked.' : ''}`);
