/*
 * Round 520 harness: the Champions League format history reference page.
 *
 * WHAT A REFERENCE PAGE CAN GET WRONG, AND WHICH OF THOSE THIS CATCHES.
 *
 * A timeline can have a hole in it (a season no row claims), two rows can
 * claim the same season, a row can rest on one publisher while the page says
 * two, the generated "what Club Manager plays" block can go stale, and the
 * game engine can drift away from the history the page says it follows. The
 * last two matter most: the page prints "that is the real 2010-11 format"
 * under the 2010-11 start, and that sentence is a claim about the engine, so
 * the engine has to be measured against the timeline rather than trusted, and
 * the file the page reads has to be measured against the engine rather than
 * trusted. What no harness can check is whether the verified facts are true;
 * that was done by hand, twice per format change, on the date the module
 * records, and the sources are printed so a reader can do it again.
 *
 * Sections:
 *  1. The timeline is contiguous from 1955, no gaps, no overlaps, exactly one
 *     open period, unique ids, and the season labels read the way people
 *     write them.
 *  2. Every period cites at least two distinct publishers, every id resolves,
 *     every URL is https, nothing is cited by nothing, and the verification
 *     date is a real date not in the future.
 *  3. The engine agrees with the history: the generated JSON equals what the
 *     engine computes right now, every historic Club Manager era's shape
 *     matches its real season's row, the modern save is declared a stand in,
 *     and the years typed in the module equal the years the engine exports.
 *  4. The shipped snapshot carries every row, the source list and enough of
 *     the page that a crawler receives the page rather than a shell.
 *
 * Controls:
 *   UCL_FORMAT_CONTROL=gap   moves a period's first season by a year, so
 *                            section 1 must report the hole.
 *   UCL_FORMAT_CONTROL=legs  flips the engine's legs rule in a patched copy
 *                            of clubManager.ts, so section 3 must report that
 *                            the engine no longer matches history, by the
 *                            timeline comparison specifically and not by any
 *                            other section 3 finding.
 *
 * Run: node scripts/simUclFormatHistory.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const PID = process.pid;
const ENTRY = `${TMP}/uclFormat.${PID}.entry.mjs`;
const BUNDLE = `${TMP}/uclFormat.${PID}.bundle.mjs`;
const LIB = `${ROOT}/src/lib/uclFormatHistory.ts`;
const ENGINE = `${ROOT}/src/lib/clubManager.ts`;
const SHAPES_JSON = path.join(ROOT, 'src', 'data', 'uclEngineShapes.json');

const CONTROL = process.env.UCL_FORMAT_CONTROL || '';
const KNOWN = ['gap', 'legs'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`UCL_FORMAT_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

/* A control that rewrites a string the file does not contain changes nothing
   and the harness stays green for the wrong reason, so every swap asserts its
   target is present exactly once before it edits. */
function patched(file, from, to, outName) {
  let src = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const n = src.split(from).length - 1;
  if (n !== 1) {
    console.error(`control cannot run: ${path.basename(file)} contains the target ${n} times, not once`);
    console.error(`  looked for: ${from}`);
    process.exit(1);
  }
  src = src.replace(from, to);
  const out = `${TMP}/${outName}`;
  fs.writeFileSync(out, src);
  return out;
}

const aliases = [`--alias:@=${ROOT_URL}/src`];
if (CONTROL === 'gap') {
  const libPath = patched(LIB, "    id: 'four-groups',\n    from: 1994,", "    id: 'four-groups',\n    from: 1995,", `uclFormatHistory.${PID}.control.ts`);
  aliases.unshift(`--alias:@/lib/uclFormatHistory=${libPath}`);
} else if (CONTROL === 'legs') {
  const enginePath = patched(
    ENGINE,
    '  return uclSeasonYear(eraId) >= UCL_TWO_LEG_FIRST_YEAR ? 2 : 1;',
    '  return uclSeasonYear(eraId) >= UCL_TWO_LEG_FIRST_YEAR ? 1 : 2;',
    `clubManager.${PID}.control.ts`,
  );
  aliases.unshift(`--alias:@/lib/clubManager=${enginePath}`);
}

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lib = await import('@/lib/uclFormatHistory');
export const engineLib = await import('@/lib/uclFormatHistoryEngine');
export const engine = await import('@/lib/clubManager');
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error ${aliases.join(' ')}`,
  { stdio: 'inherit' },
);
const { lib, engineLib, engine } = await import(pathToFileURL(BUNDLE).href);
const {
  UCL_FORMAT_PERIODS, UCL_FORMAT_SOURCES, UCL_AWAY_GOALS, UCL_FORMAT_VERIFIED_ON,
  periodFor, seasonOf, seasonRange, sourceById,
} = lib;
const { clubManagerUclShapes } = engineLib;
const { UCL_R16_FIRST_YEAR, UCL_R16_LAST_YEAR, UCL_AWAY_GOALS_LAST_YEAR, UCL_TWO_LEG_FIRST_YEAR, CM_ERAS: ENGINE_ERAS } = engine;

for (const [name, v] of Object.entries({ UCL_FORMAT_PERIODS, UCL_FORMAT_SOURCES, UCL_AWAY_GOALS, UCL_FORMAT_VERIFIED_ON, periodFor, seasonOf, seasonRange, sourceById, clubManagerUclShapes, UCL_R16_FIRST_YEAR, UCL_R16_LAST_YEAR, UCL_AWAY_GOALS_LAST_YEAR, UCL_TWO_LEG_FIRST_YEAR, ENGINE_ERAS })) {
  if (v === undefined) {
    console.error(`the harness could not reach ${name}; the bundle is not the shape it expects`);
    process.exit(1);
  }
}

let failures = 0;
const sectionMessages = {};
let section = '';
const fail = m => {
  failures += 1;
  (sectionMessages[section] ??= []).push(m);
  console.error('  FAIL: ' + m);
};

/* ---------- 1. Contiguity ---------- */
section = '1';
console.log('1) the timeline is contiguous from 1955 with exactly one open period');
{
  const ps = UCL_FORMAT_PERIODS;
  const ids = new Set(ps.map(p => p.id));
  if (ids.size !== ps.length) fail('period ids are not unique');
  if (ps.length === 0 || ps[0].from !== 1955) fail(`the first period starts in ${ps[0]?.from}, not 1955`);
  for (let i = 1; i < ps.length; i += 1) {
    const prev = ps[i - 1];
    const cur = ps[i];
    if (prev.to === null) { fail(`${prev.id} is open but ${cur.id} follows it`); continue; }
    if (cur.from !== prev.to + 1) fail(`${prev.id} ends ${prev.to} and ${cur.id} starts ${cur.from}: a hole or an overlap`);
    if (cur.to !== null && cur.to < cur.from) fail(`${cur.id} ends before it starts`);
  }
  const open = ps.filter(p => p.to === null).length;
  if (open !== 1) fail(`${open} open periods, expected exactly one (the current format)`);
  /* and the lookup must land every season since 1955 on exactly one row */
  let covered = 0;
  for (let y = 1955; y <= 2026; y += 1) {
    const hits = ps.filter(p => y >= p.from && (p.to === null || y <= p.to)).length;
    if (hits !== 1) fail(`season ${y} is claimed by ${hits} periods`);
    else covered += 1;
  }
  /* the labels people actually write: the review found the page saying
     1999-00 in the table and 1999-2000 in the FAQ */
  for (const [y, want] of [[1955, '1955-56'], [1999, '1999-2000'], [2009, '2009-10'], [2024, '2024-25']]) {
    if (seasonOf(y) !== want) fail(`seasonOf(${y}) is ${seasonOf(y)}, expected ${want}`);
  }
  console.log(`   ${ps.length} periods, ${covered} seasons each on exactly one row, ${seasonRange(ps[0])} through ${seasonRange(ps[ps.length - 1])}`);
}

/* ---------- 2. Two publishers ---------- */
section = '2';
console.log('2) every period rests on at least two publishers, and the provenance is well formed');
{
  let cited = 0;
  for (const p of UCL_FORMAT_PERIODS) {
    const srcs = p.sources.map(id => sourceById(id));
    const missing = p.sources.filter((id, i) => !srcs[i]);
    if (missing.length) fail(`${p.id} cites unknown source ids: ${missing.join(', ')}`);
    const publishers = new Set(srcs.filter(Boolean).map(s => s.publisher));
    if (publishers.size < 2) fail(`${p.id} rests on ${publishers.size} publisher(s): ${[...publishers].join(', ') || 'none'}`);
    cited += srcs.filter(Boolean).length;
  }
  const awayPubs = new Set(UCL_AWAY_GOALS.sources.map(id => sourceById(id)?.publisher).filter(Boolean));
  if (awayPubs.size < 2) fail(`the away goals block rests on ${awayPubs.size} publisher(s)`);
  for (const s of UCL_FORMAT_SOURCES) {
    if (!/^https:\/\//.test(s.url)) fail(`${s.id} is not an https URL`);
    try { new URL(s.url); } catch { fail(`${s.id} has an unparseable URL`); }
  }
  const ids = new Set(UCL_FORMAT_SOURCES.map(s => s.id));
  if (ids.size !== UCL_FORMAT_SOURCES.length) fail('source ids are not unique');
  const unused = UCL_FORMAT_SOURCES.filter(s => !UCL_FORMAT_PERIODS.some(p => p.sources.includes(s.id)) && !UCL_AWAY_GOALS.sources.includes(s.id));
  if (unused.length) fail(`${unused.length} source(s) nothing cites: ${unused.map(s => s.id).join(', ')}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(UCL_FORMAT_VERIFIED_ON) || Number.isNaN(Date.parse(UCL_FORMAT_VERIFIED_ON))) {
    fail(`UCL_FORMAT_VERIFIED_ON is not a date: ${UCL_FORMAT_VERIFIED_ON}`);
  } else if (Date.parse(UCL_FORMAT_VERIFIED_ON) > Date.now()) {
    fail(`UCL_FORMAT_VERIFIED_ON is in the future: ${UCL_FORMAT_VERIFIED_ON}`);
  }
  console.log(`   ${UCL_FORMAT_SOURCES.length} sources across ${new Set(UCL_FORMAT_SOURCES.map(s => s.publisher)).size} publishers, ${cited} citations, verified ${UCL_FORMAT_VERIFIED_ON}`);
}

/* ---------- 3. The engine agrees with history, and the JSON with the engine ---------- */
section = '3';
console.log('3) the generated block equals the engine, every era plays its real season, and the modern save admits it is a stand in');
{
  const r16 = UCL_FORMAT_PERIODS.find(p => p.stage === 'groups' && p.roundOf16);
  if (!r16) fail('no period with eight groups and a round of 16, so the engine years have nothing to match');
  else {
    if (r16.from !== UCL_R16_FIRST_YEAR) fail(`the round of 16 period starts ${r16.from} in the timeline and ${UCL_R16_FIRST_YEAR} in the engine`);
    if (r16.to !== UCL_R16_LAST_YEAR) fail(`the round of 16 period ends ${r16.to} in the timeline and ${UCL_R16_LAST_YEAR} in the engine`);
  }
  if (UCL_AWAY_GOALS.lastSeason !== UCL_AWAY_GOALS_LAST_YEAR) {
    fail(`away goals last season is ${UCL_AWAY_GOALS.lastSeason} in the timeline and ${UCL_AWAY_GOALS_LAST_YEAR} in the engine`);
  }
  const first = UCL_FORMAT_PERIODS[0];
  if (first.from !== UCL_TWO_LEG_FIRST_YEAR || first.koLegs !== 2) {
    fail(`the engine plays two legs from ${UCL_TWO_LEG_FIRST_YEAR}; the timeline's first period starts ${first.from} with ${first.koLegs} leg(s)`);
  }

  const shapes = clubManagerUclShapes();
  if (shapes.length !== ENGINE_ERAS.length) fail(`${shapes.length} era shapes for ${ENGINE_ERAS.length} eras`);

  /* the file the page reads must be what the engine says right now */
  let stale = 0;
  if (!fs.existsSync(SHAPES_JSON)) {
    fail('src/data/uclEngineShapes.json is missing: run node scripts/genUclEngineShapes.mjs');
  } else {
    const json = JSON.parse(fs.readFileSync(SHAPES_JSON, 'utf8'));
    const filed = Array.isArray(json.shapes) ? json.shapes : [];
    if (filed.length !== shapes.length) { stale += 1; fail(`uclEngineShapes.json has ${filed.length} shapes, the engine has ${shapes.length}`); }
    for (const s of shapes) {
      const f = filed.find(x => x?.era?.id === s.era.id);
      if (!f) { stale += 1; fail(`uclEngineShapes.json has no entry for ${s.era.id}`); continue; }
      for (const k of ['firstKo', 'legs', 'awayGoals', 'realId', 'matchesReal', 'line']) {
        if (JSON.stringify(f[k]) !== JSON.stringify(s[k])) { stale += 1; fail(`uclEngineShapes.json is stale for ${s.era.label} (${k}): run node scripts/genUclEngineShapes.mjs`); }
      }
    }
  }

  let historic = 0;
  let matched = 0;
  let standIns = 0;
  for (const s of shapes) {
    const real = periodFor(s.era.startYear);
    if (s.era.id === 'now') {
      /* the modern save is the one place the engine does not play the real
         format, and the page must say so rather than claim a match */
      if (s.matchesReal) fail(`the modern save claims to match the real ${real.title}, which the engine does not play`);
      if (!/stand in/.test(s.line)) fail(`the modern save's line does not say it is a stand in: ${s.line}`);
      if (s.firstKo !== 'QF') fail(`the modern save's first knockout round is ${s.firstKo}, expected QF`);
      standIns += 1;
      continue;
    }
    historic += 1;
    if (s.matchesReal) matched += 1;
    else {
      fail(`${s.era.label}: engine plays ${s.firstKo} first, ${s.legs} leg(s), away goals ${s.awayGoals}; the real season ran "${real.title}" (r16 ${real.roundOf16}, legs ${real.koLegs}, away goals ${s.era.startYear <= UCL_AWAY_GOALS.lastSeason})`);
    }
    if (s.matchesReal && !/That is the real/.test(s.line)) fail(`${s.era.label}: the line does not state the match: ${s.line}`);
  }
  console.log(`   ${matched} of ${historic} historic eras match their real season, ${standIns} modern save declared a stand in, generated file ${stale === 0 ? 'fresh' : 'STALE'}`);
}

/* ---------- 4. The shipped snapshot ---------- */
section = '4';
if (CONTROL) {
  console.log('4) snapshot check skipped under a control');
} else {
  console.log('4) the shipped snapshot carries every row, the source list and the page');
  const snap = path.join(ROOT, 'public', 'champions-league-format-history', 'index.html');
  if (!fs.existsSync(snap)) {
    fail('public/champions-league-format-history/index.html is missing: run npm run build:seo so the page ships as a snapshot');
  } else {
    const html = fs.readFileSync(snap, 'utf8');
    const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    let rows = 0;
    for (const p of UCL_FORMAT_PERIODS) {
      if (!text.includes(p.title)) fail(`the snapshot does not carry the row "${p.title}"`);
      else rows += 1;
    }
    for (const must of [UCL_FORMAT_VERIFIED_ON, 'stand in', 'That is the real']) {
      if (!text.includes(must)) fail(`the snapshot does not contain ${JSON.stringify(must)}`);
    }
    /* the source list itself, by URL, because the words UEFA and RSSSF occur
       in prose (and UEFA in the footer of every page) so they prove nothing */
    const cited = UCL_FORMAT_SOURCES.filter(s => html.includes(s.url)).length;
    const cite = UCL_FORMAT_SOURCES.length - 2;
    if (cited < cite) fail(`only ${cited} of ${UCL_FORMAT_SOURCES.length} source URLs reached the snapshot (floor ${cite})`);
    /* MEASURED 2026-09-10 on the first shipped snapshot: 1,884 readable
       words by this regex; the bare template is 948 and /records is 1,839.
       The floor sits at about half the page so it separates a shell from the
       page and tolerates copy edits; a lost block is caught above by name. */
    const words = text.split(' ').filter(Boolean).length;
    if (words < 900) fail(`the snapshot carries only ${words} words, which is a shell rather than the page (measured 1,884)`);
    console.log(`   ${rows} of ${UCL_FORMAT_PERIODS.length} rows, ${cited} of ${UCL_FORMAT_SOURCES.length} source URLs, ${words} readable words`);
  }
}

console.log('');
if (CONTROL) {
  /* each control names the section AND the message it must have produced, so
     a control cannot pass on a neighbouring finding */
  const want = CONTROL === 'gap'
    ? { section: '1', signal: 'a hole or an overlap' }
    : { section: '3', signal: 'the real season ran' };
  const hits = (sectionMessages[want.section] ?? []).filter(m => m.includes(want.signal)).length;
  if (hits > 0) {
    console.log(`simUclFormatHistory control: green. UCL_FORMAT_CONTROL=${CONTROL} was reported by section ${want.section} with "${want.signal}" (${hits} finding${hits === 1 ? '' : 's'}).`);
    process.exit(0);
  }
  console.error(`simUclFormatHistory control: RED. UCL_FORMAT_CONTROL=${CONTROL} changed the code and section ${want.section} never said "${want.signal}".`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simUclFormatHistory: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simUclFormatHistory: green. The timeline is whole, twice sourced, the generated block is fresh, and the engine plays what it says.');
