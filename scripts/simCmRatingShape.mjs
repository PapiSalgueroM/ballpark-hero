/**
 * Round 1102: Club Manager's ratings read with age (curve 2), and ages for August 2026.
 *
 * WHAT CHANGED. Until this round a rating was the market value curve and nothing else, so a 21
 * year old full back outrated the best centre half of his time and a 39 year old great was a 78.
 * scripts/lib/cmValueCurve.mjs now adds whole points for age to the value rating, once, for every
 * generator: the 2026 squads, the gathered leagues, the free agents and the four past seasons.
 * scripts/lib/cmAges.mjs gives every man of the 2026 squads his age on 1 August 2026.
 *
 *
 * The bake is deterministic and every input below is a committed file, so each number is ONE
 * number and not a band over seeds. Everything was measured on 2026-10-09 on this tree.
 *
 * 1. THE CURVE, pure. A man valued at the cap is 94 at every age from 14 to 45; the rating never
 *    falls as the value rating rises; the age points are whole, zero from 24 to 29, never under
 *    minus six or over plus eight, the table typed out by hand; a call with one argument, an age of
 *    13 or a position outside the thirteen throws.
 * 2. ONE SCALE EVERYWHERE (hard). A registry lists every file that ships rated men: the 2026
 *    squads, the A-League, every gathered league of scripts/lib/gatheredLeagues.mjs, the four past
 *    seasons and the real free agents. Each carries the curve's stamp; the rows read equal the
 *    count the file prints about itself; and every row's rating is one the curve gives for a value
 *    rating its printed value can mean (the dollars that round to that value at the file's
 *    decimals) at its age, or its age plus one in a past season (ERA_RATING_AGE_SHIFT: the era
 *    files ship the table's 1 January age and are rated at that season's August). A file under
 *    src/data that holds rated rows and is not in the registry fails. Share of rows pinned to one
 *    value rating: 2026 squads 88.4 percent (4,401 rows), A-League 70.3 (310), Russia 86.8 (403),
 *    2005 72.1 (1,727), 2010 90.2 (1,751), 2015 91.6 (1,659), 2020 95.7 (1,774), free agents 0 (7).
 * 3. THE GATE: THE OUTCOME, MAN BY MAN, AGAINST THE VALUE RATING ALONE. Inside one club, does the
 *    rating order agree with who the manager actually played (the table's own matches column,
 *    which the curve never reads)? scripts/data/cmRatingShapeSample.json holds [value rating,
 *    August age, matches] for every outfield man of every club with twelve or more of them, no
 *    names. The mean over clubs of Spearman(rating, matches), read with age minus value alone,
 *    must be at least 0.020 in BOTH blocks:
 *      the 2026 rows, 135 clubs, 2,235 men: 0.235 to 0.270, gain 0.035 (standard error 0.010; 86
 *        clubs better, 49 worse; bootstrap over clubs, seed 1102, 4,000 draws: fifth percentile
 *        0.019). The youth point and the give back share were CHOSEN on these rows.
 *      the 2025 rows, 120 clubs, 2,000 men, a full season of matches: 0.399 to 0.437, gain 0.038
 *        (standard error 0.010; 71 better, 48 worse; fifth percentile 0.022). No constant was
 *        chosen on them: this is the out of sample test, and it gains as much.
 *    0.020 sits a little over halfway from the old curve (0.000 by construction) to the measured
 *    gains. What this gate cannot do: it reads DIRECTION, not size. A flat half point a year
 *    scores 0.030 and 0.036 on the two blocks and the veteran points doubled 0.038 and 0.038, so
 *    the SIZE of the points stands on the same man value path in the curve module's header (4,246
 *    men with a row in each year), never on this number.
 * 4. CLUB BY CLUB, PRINTED AND NOT GATED (see the section for why): 14 leagues measured, mean
 *    rank correlation of the best eleven with the real 2025-26 finish 0.607 on the value rating
 *    and 0.587 shipped. Asserted: ten or more leagues were measured, and the two committed
 *    statements of how 2025-26 finished agree (src/data/clubManagerFinalTables2025_26.ts, Round
 *    612, and scripts/data/finalTables2025.json: 15 leagues, 145 clubs in both, none placed
 *    differently). Printed for Round 1109: the clubs whose tier differs between the value rating
 *    and the shipped one (ten: AC Milan and Al-Nassr up; Bournemouth, Brighton, Chelsea, Como,
 *    Feyenoord, Hull City, RB Leipzig and Roma down; tiers 8/17/41/193 to 7/14/44/194).
 * 5. THE SPREAD. The engine's result rule is READ from simScore, poisson and simAiMatch in
 *    src/lib/clubManager.ts (every constant by pattern, the section stops on any miss, so a retune
 *    of that rule stops it on purpose). Nine leagues with twelve usable clubs: the standard
 *    deviation of points a game, luck included, misses the real one by 0.038 on the shipped
 *    ratings, 0.039 on the value rating, 0.079 flattened to half the distance from 94 and 0.066
 *    stretched to one and a half times it. THE GATE: the shipped miss is under both planted
 *    scales' (headroom 0.028 to the nearer one). Printed, never asserted: the slope at which the
 *    shipped elevens would give each league its real spread (median 0.054, the engine ships
 *    0.055), and the game's Premier League, best eleven Arsenal 88.7 to worst Hull City 77.4, 11.4
 *    apart (10.1 on the value rating), standard deviation 3.00 (2.85).
 * 6. AGES. (a) every man a ledger ties to the club he is baked at ships his exact age on
 *    2026-08-01: 362 found, 300 or more required. (b) printed: 257 of the Round 669 ledger's 366
 *    written rows (0.702) are a year older by August than on their 1 January reference. (c) the
 *    rule's five literal cases and three throws. (d) CM_ROSTER_META.ages adds up to the players
 *    (362 born, 4,013 moved, 26 written, 0 unknown), moved is at least 3,500 and unknown is zero.
 *    (e) THE EVIDENCE THE RULE STANDS ON: of the 44 men on scripts/data/cmBirthDates2026.json
 *    (two publishers each), 43 have a bulk table row and all 43 hold the man's age on 1 January of
 *    the row's year; forty or more are required. 18 of the 43 have their birthday after 1 August,
 *    the men the rule alone would ship a year old.
 * Then, printed for Round 1109 and the review and never asserted: the veteran bargain (the
 * cheapest eleven rated 84 or more costs 288.1m on the value rating and 166.6m shipped; men rated
 * 82 or more at 15m or less: 0 and 19), the pool a board ask reads (men of 21 or under rated 86 or
 * more: 19 and 7), the top of the world, the free agents and the mean rating by age.
 *
 * NEGATIVE CONTROLS, SIM_CM_SHAPE_CONTROL=<name>. Each is applied to a copy in memory or in the
 * temp folder, refuses with exit 2 unless its target is found exactly once (or it changed a row),
 * and ends 1 only when exactly its own section(s) went red; 5 means it went red somewhere else, 0
 * that it turned nothing red. All fourteen were run on 2026-10-09 and ended 1:
 *   oldcurve     agePoints answers zero, the curve before the round       1, 2, 3  gain 0.000 on both
 *                blocks; 2,051 rows of the 2026 squads off the curve and every other file with them
 *   flip         every age point changes sign                             1, 2, 3  gain minus 0.075
 *                and minus 0.085
 *   eraold       the 2015 season back on the value curve alone            2        731 rows off (741 set back)
 *   erashift     the 2010 season rated at its shipped age, no year added  2        953 rows off
 *   offcurve     one man valued 5m or more gains a point                  2        exactly that row
 *   nostamp      the A-League file loses its stamp                        2
 *   unlisted     a file of rated men is not in the registry               2
 *   emptysample  the sample is cut to five clubs                          3        the count refuses it
 *   tableswap    two neighbours swap in the folded Premier League table   4        the Round 612 file disagrees
 *   flat         the shipped ratings at half their distance from 94       5        0.079, not under 0.079
 *   stretch      the same at one and a half times it                      5        0.066, not under 0.066
 *   agesasis     every ledgered man read a year younger, as before        6        362 of 362 wrong
 *   nomove       a bulk row is no longer moved on a year                  6        the literal cases
 *   tableyear    every ledgered table year moved by one                   6        43 of 43 off
 *
 * WHAT THIS HARNESS DOES NOT HOLD. It cannot hold the file from before the round, so "re rating
 * from a shipped file equals a full re bake" is proved elsewhere: for the 2026 squads by the
 * round's comparer (all 4,401 rows, in the commit that re baked them) and for the four past seasons
 * by scripts/simEraBakeExtend.mjs part C. Nothing here retunes the engine: the result slope, the
 * tier lines, the ageing rule and the board asks are Round 1109's.
 *
 * Run: node scripts/simCmRatingShape.mjs
 * Offline: reads committed files only. No database, no network, no dump.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DB_TO_ENGINE } from './lib/dbClubNames.mjs';
import { GATHERED_LEAGUES } from './lib/gatheredLeagues.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_CM_SHAPE_CONTROL ?? '';
/* Each control and the section(s) it must turn red. */
const OWN = {
  oldcurve: ['1', '2', '3'], flip: ['1', '2', '3'], eraold: ['2'], erashift: ['2'], offcurve: ['2'], nostamp: ['2'],
  unlisted: ['2'], flat: ['5'], stretch: ['5'], tableswap: ['4'], agesasis: ['6'], nomove: ['6'], tableyear: ['6'],
  emptysample: ['3'],
};
if (CONTROL && !OWN[CONTROL]) { console.error(`unknown control ${CONTROL}; the controls are ${Object.keys(OWN).join(', ')}`); process.exit(2); }

let section = '0';
const failures = [];
const fail = msg => { failures.push({ section, msg }); console.error(`  FAIL [${section}]: ${msg}`); };
const refuse = msg => { console.error(`CONTROL ${CONTROL} did not apply: ${msg}`); process.exit(2); };
const say = msg => console.log(`   ${msg}`);
const lf = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const json = rel => JSON.parse(lf(rel));
/* A guard that reads source reads the code, never the prose about it: block comments and whole
   line comments are cut before anything is matched. */
const stripComments = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const count = (text, needle) => text.split(needle).length - 1;
const mean = v => v.reduce((s, x) => s + x, 0) / v.length;
const sd = v => { const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length); };
const f3 = x => (Number.isFinite(x) ? x.toFixed(3) : String(x));
const hist = o => Object.keys(o).map(Number).sort((a, b) => a - b).map(k => `${k > 0 ? '+' : ''}${k}: ${o[k]}`).join(', ');

/* ---------- the two modules under test, or a control's copy of one ---------- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-shape-'));
async function load(rel, mutate) {
  const file = path.join(ROOT, rel);
  if (!mutate) return import(pathToFileURL(file).href);
  const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (/ from '\.\.?\//.test(src)) refuse(`${rel} imports a file beside itself, so a copy of it cannot stand alone`);
  const out = mutate(src);
  const copy = path.join(TMP, `${path.basename(rel, '.mjs')}.control.mjs`);
  fs.writeFileSync(copy, out);
  return import(pathToFileURL(copy).href);
}
const once = (src, target, what) => { if (count(src, target) !== 1) refuse(`${what}: the target is in the module ${count(src, target)} times, exactly one is needed`); };
const AGE_POINTS_HEAD = 'export function agePoints(valueRating, age) {';
const BULK_RULE = "return { age: age + (2026 - year) + 1, basis: 'moved' };";
const curve = await load('scripts/lib/cmValueCurve.mjs',
  CONTROL === 'oldcurve' ? src => { once(src, AGE_POINTS_HEAD, 'oldcurve'); console.log('[control oldcurve: agePoints answers zero for everybody, the curve before the round]'); return src.replace(AGE_POINTS_HEAD, `${AGE_POINTS_HEAD}\n  return 0;`); }
    : CONTROL === 'flip' ? src => { once(src, AGE_POINTS_HEAD, 'flip'); console.log('[control flip: every age point changes sign]'); return `${src.replace(AGE_POINTS_HEAD, 'function agePointsWas(valueRating, age) {')}\nexport function agePoints(valueRating, age) { return 0 - agePointsWas(valueRating, age); }\n`; }
      : null);
const ages = await load('scripts/lib/cmAges.mjs',
  CONTROL === 'nomove' ? src => { once(src, BULK_RULE, 'nomove'); console.log('[control nomove: a bulk row of 2026 is no longer moved on a year]'); return src.replace(BULK_RULE, "return { age: age + (2026 - year) + 0, basis: 'moved' };"); } : null);
const { CURVE_VERSION, RATING_FLOOR, RATING_CEIL, ENGINE_POSITIONS, valueRatingOf, agePoints, rateFrom, ratingOf } = curve;
const { AGES_AS_OF, HAND_WRITTEN_FROM_ID, ERA_RATING_AGE_SHIFT, ageOn, buildBirths, augustAge2026 } = ages;

/* ---------- Spearman: Pearson on the ranks, tied values share their mean rank ---------- */
function spearman(xs, ys) {
  const rank = v => {
    const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
    const r = new Array(v.length);
    let i = 0;
    while (i < idx.length) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j += 1;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k += 1) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  const rx = rank(xs), ry = rank(ys);
  const mx = mean(rx), my = mean(ry);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < xs.length; i += 1) { num += (rx[i] - mx) * (ry[i] - my); dx += (rx[i] - mx) ** 2; dy += (ry[i] - my) ** 2; }
  return num / Math.sqrt(dx * dy);
}

/* ================================================================== */
section = '1';
console.log('1) the curve: the cap holds, it never falls as value rises, and it fails closed');
/* ================================================================== */
{
  if (CURVE_VERSION !== 2) fail(`CURVE_VERSION is ${CURVE_VERSION}; this harness was written for curve 2`);
  if (ENGINE_POSITIONS.size !== 13) fail(`the curve knows ${ENGINE_POSITIONS.size} positions, the files hold thirteen`);
  if (valueRatingOf(216_000_000) !== 94 || valueRatingOf(1_000_000) !== 64) fail(`the value curve moved: 216m dollars reads ${valueRatingOf(216_000_000)} (94) and 1m reads ${valueRatingOf(1_000_000)} (64)`);
  const AGES = Array.from({ length: 32 }, (_, i) => 14 + i);
  let capOff = 0, falls = 0, outOfBand = 0, prime = 0;
  for (const age of AGES) {
    if (rateFrom(RATING_CEIL, age, 'ST') !== RATING_CEIL) capOff += 1;
    for (let vr = RATING_FLOOR; vr < RATING_CEIL; vr += 1) if (rateFrom(vr + 1, age, 'CM') < rateFrom(vr, age, 'CM')) falls += 1;
    for (let vr = RATING_FLOOR; vr <= RATING_CEIL; vr += 1) {
      const pts = agePoints(vr, age);
      if (!Number.isInteger(pts) || pts < -6 || pts > 8) outOfBand += 1;
      if (age >= 24 && age <= 29 && pts !== 0) prime += 1;
    }
  }
  if (capOff) fail(`a man valued at the cap is not ${RATING_CEIL} at ${capOff} of ${AGES.length} ages`);
  if (falls) fail(`the rating falls as the value rating rises in ${falls} places`);
  if (outOfBand) fail(`${outOfBand} age points are outside minus six to plus eight, or not whole`);
  if (prime) fail(`${prime} age points from 24 to 29 are not zero`);
  /* typed out by hand from the round's table, never computed */
  const vets = [30, 31, 32, 33, 34, 35, 36, 37, 38, 45].map(a => agePoints(70, a)).join(',');
  if (vets !== '1,2,2,3,4,5,6,7,8,8') fail(`the points back from 30 read ${vets}; by the table 1,2,2,3,4,5,6,7,8,8 (and the same eight at 38 and at 45)`);
  const youth = [14, 18, 19, 20, 21, 22, 23].map(a => agePoints(70, a)).join(',');
  if (youth !== '-6,-6,-5,-4,-3,-2,-1') fail(`the points off under 24 read ${youth}; by the table -6,-6,-5,-4,-3,-2,-1`);
  const half = [agePoints(90, 17), agePoints(92, 17), agePoints(94, 17)].join(',');
  if (half !== '-2,-1,0') fail(`the half distance limit reads ${half} at 90, 92 and 94; by the table -2,-1,0`);
  const throwsOn = fn => { try { fn(); return false; } catch { return true; } };
  const closed = [
    ['one argument', () => ratingOf(5_000_000)],
    ['an age of 13', () => ratingOf(5_000_000, 13, 'CB')],
    ['a position outside the thirteen', () => ratingOf(5_000_000, 26, 'SW')],
    ['no position', () => ratingOf(5_000_000, 26)],
  ].filter(([, fn]) => !throwsOn(fn)).map(([what]) => what);
  if (closed.length) fail(`ratingOf answered instead of throwing on: ${closed.join(', ')}`);
  say(`curve ${CURVE_VERSION}: ${AGES.length} ages by ${RATING_CEIL - RATING_FLOOR + 1} value ratings read; the cap is ${RATING_CEIL} at every age; four bad calls all throw`);
}

/* ---------- reading a baked file: rows by their shape, comments cut first ---------- */
const ROW = /^\s*\{ n: '((?:[^'\\]|\\.)*)', p: '([A-Z]+)', a: (\d+), v: ([\d.]+), r: (\d+) \},?\s*$/;
const FA_ROW = /^\s*\{ name: '((?:[^'\\]|\\.)*)', position: '([A-Z]+)', age: (\d+), value: ([\d.]+), rating: (\d+) \},?\s*$/;
const CLUB = /^ {2}'((?:[^'\\]|\\.)+)': \[$/;
const unq = s => s.replace(/\\(.)/g, '$1');
function readBaked(text, shape) {
  const clubs = new Map();
  const rows = [];
  let cur = null;
  for (const line of stripComments(text).split('\n')) {
    const c = shape === 'fa' ? null : CLUB.exec(line);
    if (c) { cur = unq(c[1]); clubs.set(cur, []); continue; }
    const m = (shape === 'fa' ? FA_ROW : ROW).exec(line);
    if (!m) continue;
    const row = { n: unq(m[1]), p: m[2], a: Number(m[3]), v: Number(m[4]), r: Number(m[5]), club: cur, vText: m[4] };
    rows.push(row);
    if (cur !== null) clubs.get(cur).push(row);
  }
  return { rows, clubs };
}
const metaBlock = (text, name) => {
  const code = stripComments(text);
  const at = code.indexOf(`export const ${name} = {`);
  if (at < 0) return null;
  const end = code.indexOf('\n};', at);
  return end < 0 ? null : code.slice(at, end);
};
const metaNumber = (block, key) => { const m = block && new RegExp(`^  ${key}: (\\d+),$`, 'm').exec(block); return m ? Number(m[1]) : null; };
/* Every value rating a printed value can mean: the dollars that round to v at the file's decimals. */
function valueRatings(v, dp) {
  const h = 0.5 / 10 ** dp;
  const lo = valueRatingOf(Math.max(1, ((v - h) / 0.75) * 1e6));
  const hi = valueRatingOf(((v + h) / 0.75) * 1e6);
  const out = [];
  for (let x = lo; x <= hi; x += 1) out.push(x);
  return out;
}
/* The value rating a shipped row stands on: the candidate its own rating agrees with (the middle
   one where several do, which only happens against a clamp). Null when none does. */
function valueRatingOfRow(row, dp, shift) {
  const fits = valueRatings(row.v, dp).filter(x => rateFrom(x, row.a + shift, row.p) === row.r);
  return fits.length ? fits[Math.floor((fits.length - 1) / 2)] : null;
}

/* THE REGISTRY: every file that ships rated men, the decimals its values are printed at, and how
   far on from the shipped age it is rated. A gathered league comes off scripts/lib/gatheredLeagues.mjs,
   so the next one is in here the day it is added. */
let REGISTRY = [
  { id: '2026', label: 'the 2026 squads', file: 'src/data/clubManagerRosters.ts', meta: 'CM_ROSTER_META', dp: 1, shift: 0 },
  { id: 'aleague', label: 'the A-League', file: 'src/data/clubManagerALeague2026.ts', meta: 'CM_ALEAGUE_META', dp: 2, shift: 0, prefix: 'ALEAGUE' },
  ...GATHERED_LEAGUES.map(g => ({ id: g.id, label: `the ${g.label}`, file: g.out, meta: `CM_${g.prefix}_META`, dp: 2, shift: 0, prefix: g.prefix })),
  ...[2005, 2010, 2015, 2020].map(y => ({ id: `era${y}`, label: `the ${y} season`, file: `src/data/clubManagerEra${y}.ts`, meta: `ERA${y}_META`, dp: 1, shift: ERA_RATING_AGE_SHIFT, era: true })),
  { id: 'freeagents', label: 'the real free agents', file: 'src/data/clubManagerFreeAgents2026.ts', shape: 'fa', stamp: 'CM_REAL_FREE_AGENTS_CURVE', dp: 1, shift: 0, minRows: 5 },
];
if (CONTROL === 'unlisted') {
  const gone = REGISTRY.find(f => f.id === 'russia2026');
  if (!gone) refuse('the registry has no russia2026 row to take out');
  REGISTRY = REGISTRY.filter(f => f !== gone);
  console.log(`[control unlisted: ${gone.file} is taken out of the registry, as a league added without it would be]`);
}
const TEXT = new Map(REGISTRY.map(f => [f.id, lf(f.file)]));

/* Rewrite the ratings of a file's text in memory (a data control): fn(row) gives the new rating. */
function rerate(text, shape, fn) {
  let changed = 0;
  const out = text.split('\n').map(line => {
    const m = (shape === 'fa' ? FA_ROW : ROW).exec(line);
    if (!m) return line;
    const row = { n: unq(m[1]), p: m[2], a: Number(m[3]), v: Number(m[4]), r: Number(m[5]) };
    const r = fn(row);
    if (r === row.r) return line;
    changed += 1;
    return line.replace(/(r(?:ating)?: )\d+( \},?\s*)$/, `$1${r}$2`);
  });
  return { text: out.join('\n'), changed };
}
const reg = id => REGISTRY.find(f => f.id === id);
if (CONTROL === 'eraold') {
  /* The 2015 season goes back to the curve before the round: each rating is again the value
     rating its printed value gives. */
  const res = rerate(TEXT.get('era2015'), null, row => valueRatingOf((row.v / 0.75) * 1e6));
  if (res.changed < 1) refuse('re rating the 2015 season on the old curve changed no row');
  TEXT.set('era2015', res.text);
  console.log(`[control eraold: ${res.changed} ratings of the 2015 season set back to the value curve alone]`);
}
if (CONTROL === 'erashift') {
  /* The 2010 season is rated at its shipped age, with no year added: what the round first proposed. */
  const f = reg('era2010');
  const res = rerate(TEXT.get('era2010'), null, row => { const x = valueRatingOfRow(row, f.dp, f.shift); return x === null ? row.r : rateFrom(x, row.a, row.p); });
  if (res.changed < 1) refuse('re rating the 2010 season at its shipped age changed no row');
  TEXT.set('era2010', res.text);
  console.log(`[control erashift: ${res.changed} ratings of the 2010 season re rated at the shipped age, no year added]`);
}
if (CONTROL === 'offcurve') {
  let done = null;
  const res = rerate(TEXT.get('2026'), null, row => {
    if (done || row.v < 5 || row.r >= RATING_CEIL || valueRatings(row.v, 1).length !== 1) return row.r;
    done = row;
    return row.r + 1;
  });
  if (res.changed !== 1) refuse(`one row was to gain a point, ${res.changed} did`);
  TEXT.set('2026', res.text);
  console.log(`[control offcurve: ${done.n} (valued ${done.v}m, ${done.r}) gains one rating point]`);
}
if (CONTROL === 'nostamp') {
  const stamp = `  curve: ${CURVE_VERSION},\n`;
  if (count(TEXT.get('aleague'), stamp) !== 1) refuse(`the A-League file carries its curve stamp ${count(TEXT.get('aleague'), stamp)} times`);
  TEXT.set('aleague', TEXT.get('aleague').replace(stamp, ''));
  console.log('[control nostamp: the A-League file loses its curve stamp]');
}

/* ================================================================== */
section = '2';
console.log('2) one scale everywhere: every file carries the stamp and every row sits on the curve');
/* ================================================================== */
const PARSED = new Map();
const offByFile = new Map();
{
  for (const f of REGISTRY) {
    const text = TEXT.get(f.id);
    const meta = f.meta ? metaBlock(text, f.meta) : null;
    if (f.meta && !meta) { fail(`${f.file}: no ${f.meta} block`); continue; }
    const stampMatch = f.stamp ? new RegExp(`^export const ${f.stamp} = (\\d+);$`, 'm').exec(stripComments(text)) : null;
    const stamp = f.stamp ? (stampMatch ? Number(stampMatch[1]) : null) : metaNumber(meta, 'curve');
    if (stamp !== CURVE_VERSION) fail(`${f.label}: the file is stamped curve ${stamp ?? 'nothing'}, the curve module is on ${CURVE_VERSION}`);
    if (f.era && count(meta, `\n  ratedAtAge: 'a + ${f.shift}',`) !== 1) fail(`${f.label}: META does not say ratedAtAge: 'a + ${f.shift}'`);
    const parsed = readBaked(text, f.shape);
    PARSED.set(f.id, parsed);
    const want = f.meta ? metaNumber(meta, 'players') : null;
    if (want !== null && parsed.rows.length !== want) fail(`${f.label}: ${parsed.rows.length} rows read, the file says it holds ${want} players`);
    if (f.minRows && parsed.rows.length < f.minRows) fail(`${f.label}: ${parsed.rows.length} rows read, at least ${f.minRows} are expected`);
    if (!parsed.rows.length) { fail(`${f.label}: no row read, so nothing below is checking this file`); continue; }
    let off = 0, pinned = 0;
    const examples = [];
    for (const row of parsed.rows) {
      const cands = valueRatings(row.v, f.dp);
      if (cands.length === 1) pinned += 1;
      let ok = false;
      try { ok = cands.some(x => rateFrom(x, row.a + f.shift, row.p) === row.r); } catch (e) { examples.push(`${row.n}: ${e.message.slice(0, 70)}`); }
      if (!ok) { off += 1; if (examples.length < 3) examples.push(`${row.n} (${row.p} ${row.a}, valued ${row.v}) is ${row.r}, the curve allows ${[...new Set(cands.map(x => { try { return rateFrom(x, row.a + f.shift, row.p); } catch { return '?'; } }))].join(' or ')}`); }
    }
    offByFile.set(f.id, off);
    if (off) fail(`${f.label}: ${off} of ${parsed.rows.length} rows are off the curve at their age${f.shift ? ` plus ${f.shift}` : ''}: ${examples.join('; ')}`);
    say(`${f.label.padEnd(30)} curve ${stamp ?? 'none'}, ${String(parsed.rows.length).padStart(4)} rows, ${off} off the curve, ${(100 * pinned / parsed.rows.length).toFixed(1)}% pinned to one value rating${f.shift ? `, rated at age plus ${f.shift}` : ''}`);
  }
  /* A file of rated men that nobody listed: a check written for the files somebody remembered
     cannot find the one they forgot. */
  const listed = new Set(REGISTRY.map(f => f.file));
  const dataDir = path.join(ROOT, 'src', 'data');
  const strays = fs.readdirSync(dataDir).filter(n => n.endsWith('.ts')).map(n => `src/data/${n}`).filter(rel => !listed.has(rel)).filter(rel => {
    const lines = stripComments(lf(rel)).split('\n');
    return lines.some(l => ROW.test(l) || FA_ROW.test(l));
  });
  if (strays.length) fail(`rated men ship in a file this harness does not list: ${strays.join(', ')}`);
  if (CONTROL === 'eraold' && (offByFile.get('era2015') ?? 0) < 500) refuse(`only ${offByFile.get('era2015') ?? 0} rows of the 2015 season went off the curve, at least 500 were measured`);
  if (CONTROL === 'erashift' && (offByFile.get('era2010') ?? 0) < 500) refuse(`only ${offByFile.get('era2010') ?? 0} rows of the 2010 season went off the curve, at least 500 were measured`);
  if (CONTROL === 'offcurve' && offByFile.get('2026') !== 1) refuse(`${offByFile.get('2026')} rows of the 2026 squads went off the curve, exactly one was planted`);
}

/* ================================================================== */
section = '3';
console.log('3) the outcome, man by man: inside a club, does the rating order agree with who was played?');
/* ================================================================== */
/* The measure sits outside the curve: the table's own matches column. For each club of the sample,
   Spearman of the rating against matches, once on the value rating alone and once read with the
   age; the gain is the mean over clubs of the difference. Position is not in the sample and the
   curve does not use it, so every man is read as a central midfielder. */
const GAIN_FLOOR = 0.020;
{
  const sample = json('scripts/data/cmRatingShapeSample.json');
  if (CONTROL === 'emptysample') {
    if (sample.clubs.length <= 5) refuse('the sample already holds five clubs or fewer');
    sample.clubs = sample.clubs.slice(0, 5);
    console.log('[control emptysample: the 2026 block of the sample is cut to five clubs]');
  }
  const BLOCKS = [
    { key: 'clubs', label: 'the 2026 rows (the block the constants were chosen on)', clubs: 135, men: 2235 },
    { key: 'holdout2025', label: 'the 2025 rows (held out: no constant was chosen on them)', clubs: 120, men: 2000 },
  ];
  for (const b of BLOCKS) {
    const clubs = sample[b.key] ?? [];
    const men = clubs.reduce((s, l) => s + l.length, 0);
    if (clubs.length !== b.clubs || men !== b.men) { fail(`${b.label}: the sample holds ${clubs.length} clubs and ${men} men, ${b.clubs} and ${b.men} were written, so this cannot pass on a thin sample`); continue; }
    const gains = [];
    let undefinedClubs = 0;
    const baseRho = [], newRho = [];
    for (const l of clubs) {
      const m = l.map(x => x[2]);
      const a = spearman(l.map(x => x[0]), m);
      const z = spearman(l.map(x => rateFrom(x[0], x[1], 'CM')), m);
      if (!Number.isFinite(a) || !Number.isFinite(z)) { undefinedClubs += 1; continue; }
      baseRho.push(a); newRho.push(z); gains.push(z - a);
    }
    if (undefinedClubs) fail(`${b.label}: ${undefinedClubs} clubs have one rating or one matches figure for every man, so their rank correlation is undefined`);
    const gain = mean(gains);
    const se = Math.sqrt(gains.reduce((s, x) => s + (x - gain) ** 2, 0) / (gains.length - 1) / gains.length);
    const better = gains.filter(x => x > 1e-9).length, worse = gains.filter(x => x < -1e-9).length;
    /* a seeded bootstrap over the clubs: seed 1102, 4,000 draws, the fifth percentile */
    let s = 1102;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const boots = [];
    for (let i = 0; i < 4000; i += 1) { let t = 0; for (let k = 0; k < gains.length; k += 1) t += gains[Math.floor(rnd() * gains.length)]; boots.push(t / gains.length); }
    boots.sort((x, y) => x - y);
    say(`${b.label}: ${clubs.length} clubs, ${men} men`);
    say(`   value rating alone ${f3(mean(baseRho))}, read with age ${f3(mean(newRho))}: gain ${gain >= 0 ? '+' : ''}${f3(gain)} (standard error ${f3(se)}; ${better} clubs better, ${worse} worse; bootstrap fifth percentile ${f3(boots[200])}, median ${f3(boots[2000])})`);
    if (!(gain >= GAIN_FLOOR)) fail(`${b.label}: reading the value rating with the age gains ${f3(gain)} over the value rating alone, the floor is ${GAIN_FLOOR.toFixed(3)}`);
  }
}

/* ---------- the world's squads and the real tables, for sections 4 and 5 ---------- */
/* A man the gathered files supersede is dropped from his old baked club, as the engine's join does. */
const SQUADS = new Map();
for (const f of REGISTRY.filter(x => !x.era && x.shape !== 'fa')) for (const [club, rows] of PARSED.get(f.id)?.clubs ?? []) SQUADS.set(club, rows.map(r => ({ ...r, dp: f.dp, shift: f.shift })));
for (const f of REGISTRY.filter(x => x.prefix)) {
  const m = new RegExp(`^export const CM_${f.prefix}_SUPERSEDES: Record<string, string> = (\\{.*\\});$`, 'm').exec(stripComments(TEXT.get(f.id)));
  if (!m) { section = '4'; fail(`${f.label}: no SUPERSEDES line to read`); continue; }
  for (const [name, club] of Object.entries(JSON.parse(m[1]))) if (SQUADS.has(club)) SQUADS.set(club, SQUADS.get(club).filter(r => r.n !== name));
}
/* bakedXIAvg's rule (src/lib/clubManager.ts): the best eleven by rating, padded to eleven with 60. */
const eleven = (rows, rate) => { const rs = rows.map(rate).sort((a, b) => b - a).slice(0, 11); while (rs.length < 11) rs.push(60); return mean(rs); };
const shipped = r => r.r;
const onValue = r => valueRatingOfRow(r, r.dp, r.shift) ?? r.r;
const tables = json('scripts/data/finalTables2025.json').leagues;
const USABLE_MEN = 8;
function usableClubs(league) { return league.rows.filter(r => r.club !== null && (SQUADS.get(r.club)?.length ?? 0) >= USABLE_MEN); }
const ENGINE = stripComments(lf('src/lib/clubManager.ts'));

/* ================================================================== */
section = '4';
console.log('4) club by club against the real 2025-26 tables (printed, not a gate), and the two committed tables agree');
/* ================================================================== */
/* WHY NOTHING HERE GATES THE CURVE. The plan asked for a higher rank correlation between each
   club's best eleven and its real finish, in every league. Measured in design, that number cannot
   tell this curve from its opposite: 0.581 on the value curve, 0.565 on this one, 0.588 with every
   age point negated, 0.549 with the scale flattened and 0.610 with it stretched. Club order is set
   by squad value and an average of eleven hardly moves, so it follows the scale and not the age
   terms. It is printed on every run so nobody has to measure it again; section 3 is the gate. */
{
  if (CONTROL === 'tableswap') {
    const rows = tables.premier?.rows;
    if (!rows || rows[1].club === null || rows[2].club === null) refuse('the folded Premier League table has no second and third club to swap');
    [rows[1].club, rows[2].club] = [rows[2].club, rows[1].club];
    console.log(`[control tableswap: the folded Premier League table swaps its second and third clubs, ${rows[2].club} and ${rows[1].club}]`);
  }
  const measured = [], thin = [];
  for (const [id, lg] of Object.entries(tables)) {
    if (id === 'ligamxApertura') continue;
    const rows = usableClubs(lg);
    if (rows.length < 8) { thin.push(`${lg.name} (${rows.length})`); continue; }
    const finish = rows.map(r => -r.pos);
    const a = spearman(rows.map(r => eleven(SQUADS.get(r.club), onValue)), finish);
    const z = spearman(rows.map(r => eleven(SQUADS.get(r.club), shipped)), finish);
    measured.push({ a, z });
    say(`${lg.name.padEnd(24)} ${String(rows.length).padStart(2)} of ${String(lg.rows.length).padStart(2)} clubs  value rating ${f3(a)}  shipped ${f3(z)}  ${z - a >= 0 ? '+' : ''}${f3(z - a)}`);
  }
  if (measured.length) say(`mean of ${measured.length} leagues: value rating ${f3(mean(measured.map(x => x.a)))}, shipped ${f3(mean(measured.map(x => x.z)))}. Too few clubs in both seasons with ${USABLE_MEN} men to measure: ${thin.join(', ') || 'none'}`);
  if (measured.length < 10) fail(`only ${measured.length} leagues could be measured against a real table, ten or more were (13 at design)`);

  /* The two committed statements of how 2025-26 finished must be one fact. */
  const r612 = stripComments(lf('src/data/clubManagerFinalTables2025_26.ts'));
  let leagues = 0, both = 0;
  const apart = [];
  for (const m of r612.matchAll(/^ {4}(\w+): \{\s*\n\s*table: (\[.*\]),$/gm)) {
    leagues += 1;
    const lg = tables[m[1]];
    if (!lg) { apart.push(`${m[1]} has a Round 612 table and no folded one`); continue; }
    JSON.parse(m[2]).forEach((club, i) => {
      const row = lg.rows.find(r => r.club === club);
      if (!row) return;
      both += 1;
      if (row.pos !== i + 1) apart.push(`${club} (${m[1]}) is ${i + 1} in the Round 612 file and ${row.pos} in the folded table`);
    });
  }
  if (leagues < 10 || both < 100) fail(`only ${leagues} Round 612 leagues and ${both} shared clubs were read (15 and 145 when written), so the agreement check is not checking`);
  if (apart.length) fail(`the two committed 2025-26 tables disagree: ${apart.slice(0, 4).join('; ')}`);
  say(`the Round 612 tables and the folded tables: ${leagues} leagues, ${both} clubs in both, ${apart.length} placed differently`);

  /* The tiers, printed for Round 1109 and the lead to rule on, never asserted: a club's tier sets
     its money, its academy and the board's patience, and it is read off the best eleven. */
  const tierLine = /entry\.xi >= (\d+) \? 1 : entry\.xi >= (\d+) \? 2 : entry\.xi >= (\d+) \? 3 : 4/.exec(ENGINE);
  if (!tierLine || count(ENGINE, tierLine[0]) !== 1) fail('the engine\'s tier lines (clubDefMap in src/lib/clubManager.ts) are not where this harness reads them, so the tier table cannot be printed');
  else {
    const lines = tierLine.slice(1, 4).map(Number);
    const tierOf = x => (x >= lines[0] ? 1 : x >= lines[1] ? 2 : x >= lines[2] ? 3 : 4);
    const round1 = x => Math.round(x * 10) / 10;
    const counts = { value: [0, 0, 0, 0], shipped: [0, 0, 0, 0] };
    const movedTier = [];
    for (const [club, rows] of SQUADS) {
      if (rows.length < USABLE_MEN) continue;
      const v = round1(eleven(rows, onValue)), s = round1(eleven(rows, shipped));
      counts.value[tierOf(v) - 1] += 1; counts.shipped[tierOf(s) - 1] += 1;
      if (tierOf(v) !== tierOf(s)) movedTier.push(`${club} ${v} to ${s} (tier ${tierOf(v)} to ${tierOf(s)})`);
    }
    say(`tiers at ${lines.join(', ')} over the clubs with ${USABLE_MEN} or more men: ${counts.value.join('/')} on the value rating, ${counts.shipped.join('/')} shipped`);
    say(`clubs whose tier differs between the two (${movedTier.length}): ${movedTier.join('; ') || 'none'}`);
  }
}

/* ================================================================== */
section = '5';
console.log('5) the spread: do the shipped elevens give a league about as wide as the real one?');
/* ================================================================== */
/* The engine's own result rule, read from its source and not copied: goals are two Poissons whose
   means are a base plus a slope a rating point, clamped, capped at a top score, with a small home
   edge. From it the exact expected points and their variance, luck included, for a double round
   robin of the usable clubs; then the standard deviation of points a game against the real table's.
   THE GATE is a baseline computed in the same run: the shipped scale must miss the real spread by
   less than the same ratings flattened to half their distance from the top, and by less than the
   same ratings stretched to one and a half times it. Nothing absolute is asserted, because Round
   1108 moves the elevens in the same release and a retune of the rule (Round 1109) moves the size. */
{
  const body = (() => { const at = ENGINE.indexOf('function simScore('); const end = ENGINE.indexOf('\n}\n', at); return at < 0 || end < 0 ? '' : ENGINE.slice(at, end); })();
  const lam = [...body.matchAll(/const l([AB]) = clamp\(([\d.]+) \+ \(s[AB] - s[AB]\) \* ([\d.]+) \+ boost[AB], ([\d.]+), ([\d.]+)\);/g)];
  const pois = (() => { const at = ENGINE.indexOf('function poisson('); const end = ENGINE.indexOf('\n}\n', at); return at < 0 || end < 0 ? [] : [...ENGINE.slice(at, end).matchAll(/return Math\.min\(k - 1, (\d+)\);/g)]; })();
  const edge = [...ENGINE.matchAll(/return simScore\(strengthOf\(state, home\), strengthOf\(state, away\), ([\d.]+), (-[\d.]+), scale\);/g)];
  const same = i => lam.length === 2 && lam[0][i] === lam[1][i];
  if (lam.length !== 2 || lam[0][1] === lam[1][1] || !same(2) || !same(3) || !same(4) || !same(5) || pois.length !== 1 || edge.length !== 1) {
    fail(`the engine's result rule is not where this harness reads it (simScore's two lambda lines: ${lam.length}, poisson's cap: ${pois.length}, the home edge in simAiMatch: ${edge.length}). A change to simScore stops this section on purpose: read the new rule into it, never a copy`);
  } else {
    const BASE = Number(lam[0][2]), SLOPE = Number(lam[0][3]), LO = Number(lam[0][4]), HI = Number(lam[0][5]);
    const CAP = Number(pois[0][1]), HOME = Number(edge[0][1]), AWAY = Number(edge[0][2]);
    const clampL = v => Math.max(LO, Math.min(HI, v));
    const dist = l => { const d = []; let s = 0; let p = Math.exp(-l); for (let k = 0; k < CAP; k += 1) { if (k > 0) p *= l / k; d.push(p); s += p; } d.push(1 - s); return d; };
    function leagueSd(st, slope) {
      const n = st.length, ppg = new Array(n).fill(0), vr = new Array(n).fill(0);
      for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) {
        if (i === j) continue;
        const a = dist(clampL(BASE + (st[i] - st[j]) * slope + HOME)), b = dist(clampL(BASE + (st[j] - st[i]) * slope + AWAY));
        let w = 0, d = 0;
        for (let x = 0; x <= CAP; x += 1) for (let y = 0; y <= CAP; y += 1) { const p = a[x] * b[y]; if (x > y) w += p; else if (x === y) d += p; }
        const l = 1 - w - d;
        ppg[i] += 3 * w + d; ppg[j] += 3 * l + d;
        vr[i] += 9 * w + d - (3 * w + d) ** 2; vr[j] += 9 * l + d - (3 * l + d) ** 2;
      }
      const g = 2 * (n - 1);
      return Math.sqrt(sd(ppg.map(x => x / g)) ** 2 + vr.reduce((s, x) => s + x, 0) / n / g / g);
    }
    const toTop = k => r => Math.max(RATING_FLOOR, Math.min(RATING_CEIL, Math.round(RATING_CEIL - k * (RATING_CEIL - r.r))));
    const SCALES = { shipped, 'value rating': onValue, flat: toTop(0.5), stretch: toTop(1.5) };
    if (CONTROL === 'flat' || CONTROL === 'stretch') { SCALES.shipped = SCALES[CONTROL]; console.log(`[control ${CONTROL}: the shipped ratings are read ${CONTROL === 'flat' ? 'at half' : 'at one and a half times'} their distance from ${RATING_CEIL}]`); }
    const miss = { shipped: [], 'value rating': [], flat: [], stretch: [] };
    const slopes = [];
    for (const [id, lg] of Object.entries(tables)) {
      if (id === 'ligamxApertura') continue;
      const rows = usableClubs(lg).filter(r => r.played > 0);
      if (rows.length < 12) continue;
      const real = sd(rows.map(r => r.points / r.played));
      const got = {};
      for (const [name, rate] of Object.entries(SCALES)) { got[name] = leagueSd(rows.map(r => eleven(SQUADS.get(r.club), rate)), SLOPE); miss[name].push(Math.abs(got[name] - real)); }
      /* the slope at which the shipped elevens would give exactly the real spread, by bisection */
      const st = rows.map(r => eleven(SQUADS.get(r.club), SCALES.shipped));
      let lo = 0.005, hi = 0.3;
      for (let i = 0; i < 40; i += 1) { const mid = (lo + hi) / 2; if (leagueSd(st, mid) < real) lo = mid; else hi = mid; }
      slopes.push((lo + hi) / 2);
      const xs = st.slice().sort((a, b) => a - b);
      say(`${lg.name.padEnd(20)} ${String(rows.length).padStart(2)} clubs  real ${f3(real)}  shipped ${f3(got.shipped)}  value rating ${f3(got['value rating'])}  flat ${f3(got.flat)}  stretch ${f3(got.stretch)}  elevens ${xs[0].toFixed(1)} to ${xs[xs.length - 1].toFixed(1)}`);
    }
    const n = miss.shipped.length;
    if (n < 6) fail(`only ${n} leagues have twelve usable clubs and a real table, six or more did (8 when written), so the spread is not being measured`);
    else {
      const m = Object.fromEntries(Object.entries(miss).map(([k, v]) => [k, mean(v)]));
      const sorted = slopes.slice().sort((a, b) => a - b);
      const median = (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.ceil((sorted.length - 1) / 2)]) / 2;
      say(`mean miss over ${n} leagues: shipped ${f3(m.shipped)}, value rating ${f3(m['value rating'])}, flat ${f3(m.flat)}, stretch ${f3(m.stretch)} (the rule: ${BASE} plus ${SLOPE} a point, clamped ${LO} to ${HI}, capped at ${CAP}, home ${HOME}, away ${AWAY})`);
      say(`the slope that would give each league its real spread on the shipped ratings: median ${f3(median)} (the engine ships ${SLOPE}); for Round 1109, not a gate`);
      if (!(m.shipped < m.flat)) fail(`the shipped scale misses the real spread by ${f3(m.shipped)}, no better than the same ratings flattened (${f3(m.flat)})`);
      if (!(m.shipped < m.stretch)) fail(`the shipped scale misses the real spread by ${f3(m.shipped)}, no better than the same ratings stretched (${f3(m.stretch)})`);
    }
    /* The Premier League's twenty, printed for the plan's "further apart than ten points" and never
       asserted: a range is a max in disguise and Round 1108 moves men in the same release. */
    const pl = tables.premier;
    if (pl) {
      const clubs = [...pl.rows.map(r => r.club).filter(Boolean), ...(pl.gameClubsNotInTheTable ?? [])].filter(c => SQUADS.has(c));
      const xi = clubs.map(c => [c, eleven(SQUADS.get(c), shipped)]).sort((a, b) => b[1] - a[1]);
      const xv = clubs.map(c => eleven(SQUADS.get(c), onValue)).sort((a, b) => b - a);
      if (xi.length) say(`the game's Premier League, ${xi.length} clubs: best eleven ${xi[0][0]} ${xi[0][1].toFixed(1)}, worst ${xi[xi.length - 1][0]} ${xi[xi.length - 1][1].toFixed(1)}, apart ${(xi[0][1] - xi[xi.length - 1][1]).toFixed(1)} (on the value rating ${(xv[0] - xv[xv.length - 1]).toFixed(1)}); standard deviation ${sd(xi.map(x => x[1])).toFixed(2)} (${sd(xv).toFixed(2)})`);
    }
  }
}

/* ================================================================== */
section = '6';
console.log('6) ages: a man with a birth date on file ships his exact age, and the table rule is what the ledger shows');
/* ================================================================== */
{
  const ledger = json('scripts/data/cmBirthDates2026.json');
  const round669 = json('scripts/data/defensiveMidfield2026.json');
  const missing = json('scripts/data/window2026/missingPlayers.json');
  if (CONTROL === 'tableyear') {
    const bulk = ledger.rows.filter(r => r.table?.id < HAND_WRITTEN_FROM_ID);
    if (!bulk.length) refuse('the birth date ledger holds no man whose table row is a bulk row');
    for (const r of bulk) r.table.year += 1;
    console.log(`[control tableyear: the table year of ${bulk.length} ledgered bulk rows is moved on by one]`);
  }
  /* the ledger itself: two publishers that are not one, never a wiki, a real date, his table row */
  const badRows = ledger.rows.filter(r => {
    const pubs = new Set((r.sources ?? []).map(s => s.publisher));
    return pubs.size < 2 || (r.sources ?? []).some(s => /wiki/i.test(`${s.publisher} ${s.url}`) || !/^https:\/\//.test(s.url ?? ''))
      || !/^\d{4}-\d{2}-\d{2}$/.test(r.born ?? '') || !r.club || !Number.isInteger(r.table?.id) || !Number.isInteger(r.table?.age) || !Number.isInteger(r.table?.year);
  }).map(r => r.name);
  if (badRows.length) fail(`birth date ledger rows without two publishers, a date, a club or a table row: ${badRows.slice(0, 5).join(', ')}`);
  if (ledger.asOf !== AGES_AS_OF) fail(`the birth date ledger says its ages are for ${ledger.asOf}, the ages module says ${AGES_AS_OF}`);

  /* (a) every man the ledgers tie to the club he is baked at ships his exact age */
  const births = buildBirths({ ledgerRows: ledger.rows, round669, missing, dbToEngine: DB_TO_ENGINE });
  if (CONTROL === 'agesasis') console.log('[control agesasis: every ledgered man is read a year younger than the file ships him, as before the round]');
  let found = 0;
  const wrong = [];
  for (const [club, rows] of PARSED.get('2026')?.clubs ?? []) for (const row of rows) {
    const mine = (births.get(row.n) ?? []).filter(c => c.clubs.has(club));
    if (!mine.length) continue;
    const want = ageOn(mine[0].born, AGES_AS_OF);
    const got = CONTROL === 'agesasis' ? row.a - 1 : row.a;
    found += 1;
    if (got !== want) wrong.push(`${row.n} (${club}) ships ${got}, born ${mine[0].born} is ${want}`);
  }
  const onLedger = ledger.rows.filter(r => (PARSED.get('2026')?.clubs.get(r.club) ?? []).some(p => p.n === r.name)).length;
  if (onLedger !== ledger.rows.length) fail(`${ledger.rows.length - onLedger} men of the birth date ledger are not in the squad the ledger names: ${ledger.rows.filter(r => !(PARSED.get('2026')?.clubs.get(r.club) ?? []).some(p => p.n === r.name)).slice(0, 4).map(r => `${r.name} (${r.club})`).join(', ')}`);
  if (found < 300) fail(`only ${found} men with a birth date on file were found in the squad their ledger names, 300 or more were (335 when written)`);
  if (wrong.length) fail(`${wrong.length} of ${found} men with a birth date on file do not ship their exact age on ${AGES_AS_OF}: ${wrong.slice(0, 4).join('; ')}`);
  say(`(a) ${found} men with a birth date on file, ${ledger.rows.length} of them on this round's ledger: ${found - wrong.length} ship their exact age on ${AGES_AS_OF}`);

  /* (b) printed with its date, not a gate: nothing in a round changes it. The Round 669 rows say
     they hold the age on 2026-01-01, so the share a year older by August is the share of birthdays
     from 2 January to 1 August, which is why the table rule adds one. */
  const written = (round669.write ?? []).filter(x => Number.isInteger(x.age) && x.fotmob?.born);
  const older = written.filter(x => ageOn(x.fotmob.born, AGES_AS_OF) === x.age + 1).length;
  say(`(b) of the Round 669 ledger's ${written.length} written rows (age on ${round669.ageReference}), ${older} are a year older on ${AGES_AS_OF}: ${f3(older / Math.max(1, written.length))} (257 of 366 on 2026-10-07)`);

  /* (c) the rule's four cases and its throws, on literal rows */
  const lit = buildBirths({ ledgerRows: [{ name: 'Born Man', club: 'Here', born: '2001-12-20' }, { name: 'Other Namesake', club: 'Here', born: '1990-01-01' }] });
  const cases = [
    ['a birth date on file', { name: 'Born Man', club: 'Here', tableClub: 'Here', age: 24, year: 2026, id: 100 }, 24, 'born'],
    ['a bulk row of 2026', { name: 'Plain Man', club: 'Here', tableClub: 'Here', age: 27, year: 2026, id: 100 }, 28, 'moved'],
    ['a bulk row of 2025', { name: 'Plain Man', club: 'Here', tableClub: 'Here', age: 27, year: 2025, id: 100 }, 29, 'moved'],
    ['a hand written row', { name: 'Plain Man', club: 'Here', tableClub: 'Here', age: 39, year: 2026, id: 176416 }, 39, 'written'],
    ['no table row', { name: 'Plain Man', club: 'Here', age: 18 }, 18, 'unknown'],
  ];
  const offCases = cases.filter(([, row, age, basis]) => { try { const r = augustAge2026(row, lit); return r.age !== age || r.basis !== basis; } catch { return true; } }).map(([what, row, age, basis]) => { let got; try { const r = augustAge2026(row, lit); got = `${r.age} ${r.basis}`; } catch (e) { got = 'a throw'; } return `${what}: ${age} ${basis} by the rule, got ${got}`; });
  if (offCases.length) fail(`the ages rule: ${offCases.join('; ')}`);
  const mustThrow = [
    ['a row inside the measured id gap', { name: 'Gap', club: 'Here', age: 25, year: 2026, id: 170000 }],
    ['a bulk row of another year', { name: 'Old', club: 'Here', age: 25, year: 2024, id: 100 }],
    ['a birth date more than two years from the table', { name: 'Other Namesake', club: 'Here', tableClub: 'Here', age: 22, year: 2026, id: 100 }],
  ].filter(([, row]) => { try { augustAge2026(row, lit); return true; } catch { return false; } }).map(([what]) => what);
  if (mustThrow.length) fail(`the ages rule answered instead of throwing on: ${mustThrow.join(', ')}`);
  say(`(c) the rule's five literal cases and its three throws${offCases.length || mustThrow.length ? '' : ' all hold'}`);

  /* (d) the file's own count of how its ages are known */
  const meta = metaBlock(TEXT.get('2026'), 'CM_ROSTER_META');
  const am = meta && /^ {2}ages: \{ asOf: '([\d-]+)', born: (\d+), moved: (\d+), written: (\d+), unknown: (\d+) \},$/m.exec(meta);
  if (!am) fail('CM_ROSTER_META carries no ages line');
  else {
    const [asOf, born, moved, writ, unknown] = [am[1], Number(am[2]), Number(am[3]), Number(am[4]), Number(am[5])];
    const players = metaNumber(meta, 'players');
    if (asOf !== AGES_AS_OF) fail(`CM_ROSTER_META.ages is for ${asOf}, the ages module says ${AGES_AS_OF}`);
    if (born + moved + writ + unknown !== players) fail(`CM_ROSTER_META.ages adds up to ${born + moved + writ + unknown}, the file holds ${players} players`);
    if (moved < 3500) fail(`CM_ROSTER_META.ages says only ${moved} ages were moved on from the table, 3,500 or more were (4,040 when written)`);
    if (unknown !== 0) fail(`CM_ROSTER_META.ages says ${unknown} ages are unknown; the bake refuses to ship one`);
    if (born < found) fail(`CM_ROSTER_META.ages says ${born} ages come from a birth date, and ${found} men were just found with one`);
    say(`(d) the file says: ${born} from a birth date, ${moved} moved on from the table, ${writ} as written, ${unknown} unknown, of ${players}`);
  }

  /* (e) THE EVIDENCE THE TABLE RULE STANDS ON. A bulk row holds the man's age on 1 January of the
     row's year: for every ledgered man whose table row is a bulk row, his birth date must say so
     (a birthday in the first week of January may sit a few days either side of the table's day). */
  const bulk = ledger.rows.filter(r => r.table?.id < HAND_WRITTEN_FROM_ID);
  const offJan = bulk.filter(r => {
    const jan1 = ageOn(r.born, `${r.table.year}-01-01`);
    const firstWeek = /-01-0[1-7]$/.test(r.born);
    return !(jan1 === r.table.age || (firstWeek && ageOn(r.born, `${r.table.year}-01-08`) === r.table.age));
  });
  if (bulk.length < 40) fail(`only ${bulk.length} ledgered men have a bulk table row, so "a bulk row holds the 1 January age" stands on too few: forty or more are needed`);
  if (offJan.length) fail(`${offJan.length} of ${bulk.length} ledgered bulk rows do not hold the man's age on 1 January of the row's year: ${offJan.slice(0, 4).map(r => `${r.name} born ${r.born}, row ${r.table.year} says ${r.table.age}`).join('; ')}`);
  const late = bulk.filter(r => ageOn(r.born, AGES_AS_OF) === r.table.age + (2026 - r.table.year)).length;
  say(`(e) ${bulk.length} ledgered men with a bulk table row: ${bulk.length - offJan.length} hold the age on 1 January of the row's year; ${late} of them have their birthday after 1 August, the men the table rule alone would have a year old`);
}

/* ================================================================== */
section = 'side';
console.log('What the curve does to the game around it (printed for Round 1109 and the review, nothing asserted)');
/* ================================================================== */
/* "On the value rating" is each man's value rating at the age the file ships today. It is not the
   file from before the round, whose ages were a year younger for most men; the round's report
   carries the numbers measured against that file. Not printed here, on purpose: the ceiling a
   young man is given (rollPotential) and the asking price by age, which would need a second copy
   of an engine rule. */
{
  const men = [...SQUADS.values()].flat();
  const cheapest = (rate, floor) => { const vs = men.filter(m => rate(m) >= floor).map(m => m.v).sort((a, b) => a - b).slice(0, 11); return vs.length < 11 ? null : vs.reduce((s, x) => s + x, 0); };
  for (const floor of [80, 82, 84]) {
    const a = cheapest(onValue, floor), z = cheapest(shipped, floor);
    say(`the cheapest eleven rated ${floor} or more: ${a === null ? 'none' : `${a.toFixed(1)}m`} on the value rating, ${z === null ? 'none' : `${z.toFixed(1)}m`} shipped`);
  }
  const bargain = rate => men.filter(m => rate(m) >= 82 && m.v <= 15).length;
  say(`men rated 82 or more and valued at 15m or less: ${bargain(onValue)} on the value rating, ${bargain(shipped)} shipped`);
  const young = (rate, age, floor) => men.filter(m => m.a <= age && rate(m) >= floor).length;
  say(`men of 21 or under rated 86 or more (a board ask reads this): ${young(onValue, 21, 86)} on the value rating, ${young(shipped, 21, 86)} shipped; of 23 or under: ${young(onValue, 23, 86)} and ${young(shipped, 23, 86)}`);
  const top = men.slice().sort((a, b) => b.r - a.r || b.v - a.v).slice(0, 12).map(m => `${m.n} ${m.r}`).join(', ');
  say(`the top of the 2026 world: ${top}`);
  const fa = PARSED.get('freeagents')?.rows ?? [];
  say(`the real free agents: ${fa.map(m => `${m.n} ${m.r} (a club of level ${m.r + 6} or more can sign him)`).join(', ')}`);
  const bands = [[14, 20], [21, 23], [24, 26], [27, 29], [30, 32], [33, 35], [36, 45]];
  say(`mean rating by age, value rating then shipped: ${bands.map(([lo, hi]) => { const l = men.filter(m => m.a >= lo && m.a <= hi); return `${lo} to ${hi}: ${mean(l.map(onValue)).toFixed(1)} then ${mean(l.map(shipped)).toFixed(1)} (${l.length})`; }).join('; ')}`);
}

/* ---------- the verdict ---------- */
fs.rmSync(TMP, { recursive: true, force: true });
console.log('');
const red = [...new Set(failures.map(f => f.section))].sort();
if (CONTROL) {
  const want = OWN[CONTROL].slice().sort();
  if (!failures.length) { console.log(`simCmRatingShape: CONTROL ${CONTROL} turned nothing red. The check it is aimed at is not checking.`); process.exit(0); }
  if (red.join(',') !== want.join(',')) { console.error(`simCmRatingShape: CONTROL ${CONTROL} turned section(s) ${red.join(', ')} red, section(s) ${want.join(', ')} were expected (${failures.length} failure(s))`); process.exit(5); }
  console.error(`simCmRatingShape: CONTROL ${CONTROL} fired where it should, ${failures.length} failure(s) in section(s) ${red.join(', ')}`);
  process.exit(1);
}
if (failures.length) {
  console.error(`simCmRatingShape: ${failures.length} failure(s) in section(s) ${red.join(', ')}`);
  process.exit(1);
}
console.log('simCmRatingShape: green. One curve, every file on it, ages for August 2026, and the order inside a club is nearer to who was played.');
