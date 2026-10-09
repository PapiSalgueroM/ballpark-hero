/**
 * Round 899 (second review fix): the shared era extend step,
 * scripts/lib/eraBakeExtend.mjs, under a harness of its own.
 *
 * Rounds 901 (2010-11) and 902 (2005-06) add leagues to their eras by calling
 * this lib, and a careless edit that deletes one of its fail closed guards
 * (the year-after proof of a move, the removal that is still inside the
 * world, one man at one club) would otherwise ship green: nothing else runs
 * them. This harness holds the template in three parts.
 *
 *   A. A small synthetic world, written to a temp folder (two shipped clubs,
 *      a two club league from a fake pull, a fake year-after pull), extended
 *      once with every kind of correction the lib takes: a fold, a namesake,
 *      a move of a new row and of a shipped line, a removal plain, `later`
 *      and `single`, and an arrival. The result is checked to the player:
 *      who sits where, the counts, the META, the shipped lines carried as the
 *      same bytes, and that the written file parses back.
 *   B. One bad correction per guard, each of which must die with its own
 *      message. A guard that stops firing turns this red. (The lib's last
 *      audit, shipped lines surviving byte for byte, guards the lib's own
 *      code rather than a caller's list, so no correction can reach it; A
 *      checks the bytes directly instead.)
 *   C. When the offline pulls are on this machine (the lead's paths, or
 *      ERA_PULL and ERA_NEXT), the real 2015-16 bake is rebuilt from the
 *      60 club file it grew from (git show 89d31144) with --check, which must
 *      say byte identical, and since Round 901 the 2010-11 bake the same way
 *      from its 40 club file (git show 06dc0741), since Round 902 the 2005-06
 *      bake from its 40 club file (git show 06dc0741 too, Round 899's head,
 *      where the 2005-06 file was still Round 176's), and since Round 971 the
 *      2020-21 bake, which grows from an empty era of its own and reads one
 *      pull (ERA_PULL_2020). Without the pulls this part prints SKIPPED and why;
 *      A and B do not need them and always run.
 *
 * Round 901 review fix: a name with rows at two clubs of the new leagues is
 * settled only by the caller's poolNamesakes (A places one by it, B holds its
 * three guards, control nosplit cuts the undeclared one out).
 *
 * Round 1102 (ratings read with age, curve 2):
 *   - a new line is rated at the row's age plus ERA_RATING_AGE_SHIFT and the written META carries
 *     the curve's stamp (A types three ratings out by hand, one of which reads the shift);
 *   - B gains its thirtieth guard: the step refuses a shipped file that is not on today's curve,
 *     because it carries shipped lines as bytes and would leave two scales in one file;
 *   - R holds rerateShippedEra, the function that moved the four shipped files: ratings and the
 *     two META lines move and nothing else, a second run changes nothing, a row it cannot read and
 *     a stamp it does not know both stop it, CRLF comes back CRLF;
 *   - C re rates each base from git with that same function before it extends, so the rebuild
 *     proves the whole path: re rating a shipped file gives what a full bake on today's curve
 *     gives. MEASURED 2026-10-09 on this machine with the lead's pulls: all four byte identical
 *     (the bases re rated 498 of 1,098, 410 of 802 and 354 of 747 ratings; 2020-21 grows from
 *     nothing, so every one of its 1,774 lines was baked fresh on the curve).
 *   - THE CONTROLS WERE RED FOR THE WRONG REASON and are fixed: since Round 1035 lifted the curve
 *     into its own module, the lib copy in the temp folder could not be imported, so the four lib
 *     controls ended on a missing module, and c2drift's mirrored bake died the same way. The copy's
 *     imports now point at the real modules, the mirror carries them, and a control aimed at part
 *     C exits 2 unless it reaches the comparison. Measured 2026-10-09: noprove 2 failures in B
 *     (plus the thin club it leaves behind), nostillin 1, nodupe 1, nosplit 1, c2drift and
 *     stale2020 1 each on "the rebuilt era file differs".
 *
 * Negative controls, SIM_ERA_EXTEND_CONTROL=noprove|nostillin|nodupe|nosplit: the
 * harness imports a COPY of the lib with that guard cut out (it first proves
 * the guarded line is in the lib, and refuses with exit 2 if not), and the
 * run must then end red. SIM_ERA_EXTEND_CONTROL=c2drift (Round 902 review
 * fix) runs C's 2005-06 rebuild on a copy of that bake with one proved
 * correction cut out, and it must then say the rebuilt file differs (it refuses with exit 2
 * when the pulls are not here or the line is gone).
 * SIM_ERA_EXTEND_CONTROL=stale2020 (Round 971) leaves the lib alone and runs
 * the 2020-21 rebuild against a copy of the shipped era file with one name
 * edited by hand: part C must go red on it. Nothing on disk outside the
 * temp folder changes.
 *
 * Run: node scripts/simEraBakeExtend.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.join(ROOT, 'scripts', 'lib', 'eraBakeExtend.mjs');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'era-extend-'));

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* ---------- the controls: a copy of the lib with one guard cut out ---------- */
const CONTROLS = {
  noprove: ['if (!next.some(r => worldClubOf(r.club) === to)) {', 'if (false) {'],
  nostillin: ['if (stillIn && !rm.later) die(', 'if (false) die('],
  nodupe: ['if (seen.has(p.n)) die(', 'if (false) die('],
  nosplit: ['if (undeclaredSplit.length) die(', 'if (false) die('],
};
const CONTROL = process.env.SIM_ERA_EXTEND_CONTROL ?? '';
/* Round 902 review fix: the 2005-06 rebuild (it was its own part C2 before
   Round 901 lifted C into one loop over the eras) had no control of its own,
   every control skipped it. c2drift rebuilds the 2005-06 bake from a COPY of
   bakeEra2005.mjs with one proved correction (Kuranyi, Stuttgart to Schalke)
   cut out, so the rebuilt file can no longer match the shipped one and that
   rebuild must go red. A and B run on the real lib; the other eras' rebuilds
   are skipped. */
const C2_DRIFT = /^ {2}\{ n: 'Kevin Kuranyi', to: 'Schalke 04',.*\r?\n/m;
/* Round 971 review fix: the one control aimed at part C rather than the lib.
   It hands the 2020-21 rebuild a copy of the shipped era file with one
   player's name changed, the way a hand edit of the generated file would,
   and the run must end red on that rebuild. */
const C_CONTROL = CONTROL === 'stale2020';
let libUrl = pathToFileURL(LIB).href;
if (CONTROL === 'c2drift') {
  console.log('CONTROL c2drift: the 2005-06 rebuild runs a bake copy without the Kuranyi move');
} else if (CONTROL && !C_CONTROL) {
  const c = CONTROLS[CONTROL];
  if (!c) { console.error(`unknown control ${CONTROL}`); process.exit(2); }
  const src = fs.readFileSync(LIB, 'utf8');
  if (!src.includes(c[0])) { console.error(`CONTROL ${CONTROL} did not apply: the lib has no "${c[0]}"`); process.exit(2); }
  const copy = path.join(TMP, 'eraBakeExtend.control.mjs');
  /* Round 1102: the copy lives in the temp folder, so the modules the lib imports beside itself
     are pointed back at the real ones. Since Round 1035 lifted the curve out of the lib the copy
     could not be imported at all, and every control ended red on a missing module instead of on
     its own guard; part B's count below now proves the control reached the guard. */
  const libDir = pathToFileURL(path.join(ROOT, 'scripts', 'lib') + path.sep).href;
  const pointed = src.replace(c[0], c[1]).replace(/ from '\.\/([A-Za-z0-9]+\.mjs)';/g, (_, f) => ` from '${libDir}${f}';`);
  if (/ from '\.\//.test(pointed)) { console.error(`CONTROL ${CONTROL} did not apply: the lib copy still imports a file beside itself`); process.exit(2); }
  fs.writeFileSync(copy, pointed);
  libUrl = pathToFileURL(copy).href;
  console.log(`CONTROL ${CONTROL} applied: the lib copy has "${c[0]}" cut out`);
}
const { extendEra, readShippedEra, rerateShippedEra, gbpM, ratingOf, rateFrom, CURVE_VERSION, ERA_RATING_AGE_SHIFT, ERA_CURVE_META_LINES } = await import(libUrl);

/* ---------- the synthetic world ---------- */
const SHIPPED = {
  Alpha: [
    "    { n: 'Ann One', p: 'ST', a: 25, v: 9, r: 80 },",
    "    { n: 'Sam Namesake', p: 'ST', a: 29, v: 2, r: 70 },",
    "    { n: 'Lu Later', p: 'CB', a: 28, v: 1, r: 60 },",
  ],
  Beta: [
    "    { n: 'Bea Two', p: 'GK', a: 27, v: 3, r: 72 },",
    "    { n: 'Bo Shipmove', p: 'LM', a: 24, v: 2.5, r: 71 },",
    `    { n: 'Dee Fold', p: 'CAM', a: 26, v: ${gbpM(2e6)}, r: ${ratingOf(2e6, 26 + ERA_RATING_AGE_SHIFT, 'CAM')} },`,
  ],
};
/* Round 1102: a shipped era file carries the curve it was rated on (`stamp: false` writes the file
   as it was before the round, for the guard that refuses to extend one). */
const shippedText = ({ players = 6, clubs = SHIPPED, extraLine = null, stamp = true } = {}) => [
  '// a synthetic era for scripts/simEraBakeExtend.mjs',
  "import type { BakedPlayer } from '@/data/clubManagerRosters';", '',
  'export const ERATEST_META = {', '  year: 2015,', `  players: ${players},`, `  clubs: ${Object.keys(clubs).length},`, '  moves: 10,', ...(stamp ? ERA_CURVE_META_LINES : []), '};', '',
  'export const ERATEST_PARTIAL: string[] = [];', '',
  'export const ERATEST_ROSTERS: Record<string, BakedPlayer[]> = {',
  ...Object.entries(clubs).flatMap(([c, lines]) => [`  '${c}': [`, ...lines, ...(extraLine && c === 'Alpha' ? [extraLine] : []), '  ],']),
  '};', '',
].join('\n');
const writeShipped = (name, opts) => { const f = path.join(TMP, name); fs.writeFileSync(f, shippedText(opts)); return f; };
const SHIPPED_FILE = writeShipped('shipped.ts');

/* The fake pull: year 2015 rows (two new clubs, an outside club) and the
   year after (2016), the shape the lead's offline pulls have. */
let nextId = 1;
const row = (player_name, club, position, age, usd, year = 2015) =>
  ({ id: nextId++, player_name, club, position, age, market_value_usd: usd, year, nationality: 'Testland' });
const ROWS = [
  row('Gus Mover', 'Gamma FC', 'Central Midfield', 24, 4e6),
  row('Gil Stay', 'Gamma FC', 'Centre-Back', 27, 2e6),
  row('Gwen Stay', 'Gamma FC', 'Goalkeeper', 30, 1e6),
  row('Gary Leaver', 'Gamma FC', 'Left Winger', 22, 3e6),
  row('Sid Single', 'Gamma FC', 'Right-Back', 31, 1e6),
  row('Dan Stay', 'Delta SC', 'Centre-Forward', 26, 5e6),
  row('Dan Stay', 'Delta SC', 'Centre-Forward', 26, 1e6),
  row('Dora Stay', 'Delta SC', 'Right-Back', 23, 1.5e6),
  row('Dee Fold', 'Delta SC', 'Attacking Midfield', 26, 2e6),
  row('Sam Namesake', 'Delta SC', 'Centre-Forward', 31, 6e6),
  row('Ari Arrival', 'Outside FC', 'Central Midfield', 24, 3e6),
  row('Bo Shipmove', 'Outside FC', 'Left Midfield', 24, 3e6),
  /* Round 901 review fix: one string at both new clubs, tied on value, the
     lower id at Gamma; the declaration keeps Delta's, so the old silent tie
     break would put her at the wrong club. */
  row('Pia Split', 'Gamma FC', 'Right Midfield', 30, 2e6),
  row('Pia Split', 'Delta SC', 'Right Midfield', 22, 2e6),
];
const NEXT = [
  row('Gus Mover', 'Alpha AFC', 'Central Midfield', 25, 5e6, 2016),
  row('Gary Leaver', 'Outside FC', 'Left Winger', 23, 3e6, 2016),
  row('Ari Arrival', 'Delta SC', 'Central Midfield', 25, 3e6, 2016),
  row('Bo Shipmove', 'Gamma FC', 'Left Midfield', 25, 3e6, 2016),
  row('Lu Later', 'Delta SC', 'Centre-Back', 29, 1e6, 2016),
  row('Dan Stay', 'Delta SC', 'Centre-Forward', 27, 5e6, 2016),
];
const NEW_LEAGUE = { label: 'Test League', dbToEra: { 'Gamma FC': 'Gamma', 'Delta SC': 'Delta' } };
const good = () => ({
  file: SHIPPED_FILE, prefix: 'ERATEST', year: 2015, rows: ROWS, nextRows: NEXT,
  newLeagues: [NEW_LEAGUE],
  worldDbToEra: { 'Alpha AFC': 'Alpha', 'Beta CF': 'Beta', 'Gamma FC': 'Gamma', 'Delta SC': 'Delta' },
  folds: [{ n: 'Dee Fold', why: 'test' }],
  namesakes: [{ n: 'Sam Namesake', why: 'test' }],
  poolNamesakes: [{ n: 'Pia Split', keep: 'Delta', why: 'test' }],
  moves: [{ n: 'Gus Mover', to: 'Alpha', why: 'test' }, { n: 'Bo Shipmove', to: 'Gamma', why: 'test' }],
  removals: [
    { n: 'Gary Leaver', why: 'test' },
    { n: 'Lu Later', why: 'test', later: 'test' },
    { n: 'Sid Single', why: 'test', single: 'test' },
  ],
  arrivals: [{ n: 'Ari Arrival', from: 'Outside FC', to: 'Delta', why: 'test' }],
  anchors: [['Alpha', 'Ann One'], ['Delta', 'Dan Stay']],
  expectedThin: [], thinUnder: 2,
  header: () => ['// test header'],
});

/* ---------- A. one good extension, checked to the player ---------- */
console.log('A) a synthetic extension with every kind of correction lands exactly');
{
  let res = null;
  try { res = extendEra(good()); } catch (e) { fail(`the good extension died: ${e.message}`); }
  if (res) {
    const where = {};
    for (const [club, list] of res.world) where[club] = list.map(p => p.n).join(',');
    const want = {
      Alpha: 'Ann One,Gus Mover', Beta: 'Bea Two,Dee Fold',
      Gamma: 'Bo Shipmove,Gil Stay,Gwen Stay', Delta: 'Sam Namesake,Dan Stay,Ari Arrival,Pia Split,Dora Stay',
    };
    for (const [club, names] of Object.entries(want)) {
      if (where[club] !== names) fail(`${club} holds ${where[club]}, expected ${names}`);
    }
    const s = res.stats;
    const got = `${s.moved} moved, ${s.removed} removed, ${s.arrived} arrived, ${s.folded} folded, ${s.collisions} namesakes`;
    if (got !== '2 moved, 3 removed, 1 arrived, 1 folded, 1 namesakes') fail(`the stats read ${got}`);
    if (s.players !== 12 || s.clubs !== 4 || s.moves !== 17) fail(`players ${s.players}, clubs ${s.clubs}, moves ${s.moves}; expected 12, 4, 17 (10 shipped plus 2, 3, 1 and 1)`);
    const pia = res.world.get('Delta').find(p => p.n === 'Pia Split');
    if (!pia || pia.a !== 22 || res.world.get('Gamma').some(p => p.n === 'Pia Split')) fail(`Pia Split sits ${pia ? `at Delta aged ${pia.a}` : 'nowhere at Delta'}; the declared row is Delta's (aged 22)`);
    /* Dan Stay has two year-2015 rows: the higher value wins (the
       documented DISTINCT ON, offline). */
    const dan = res.world.get('Delta').find(p => p.n === 'Dan Stay');
    if (!dan || dan.v !== gbpM(5e6)) fail(`Dan Stay baked at ${dan?.v}, the higher of his two rows is ${gbpM(5e6)}`);
    for (const line of [SHIPPED.Alpha[0], SHIPPED.Beta[0], SHIPPED.Beta[2]]) {
      if (!res.text.includes(line)) fail(`a shipped line did not survive as the same bytes: ${line.trim()}`);
    }
    /* Round 1102: a new line is rated on today's curve at the row's age plus one, and the file says
       which curve it is on. Typed out by hand: a 4m dollar central midfielder of 24 is a 72 on value
       and a 72 at 25; a 1m dollar keeper of 30 is a 64 on value and a 66 at 31; a 1.5m dollar right
       back of 23 is a 66 on value and a 66 at 24 (he would be a 65 at his table age, so this row
       reads the shift). */
    const rated = { 'Gus Mover': ['Alpha', 72], 'Gwen Stay': ['Gamma', 66], 'Dora Stay': ['Delta', 66] };
    for (const [n, [club, want]] of Object.entries(rated)) {
      const p = res.world.get(club).find(x => x.n === n);
      if (!p || p.r !== want) fail(`${n} is rated ${p?.r}, the curve at his age plus ${ERA_RATING_AGE_SHIFT} gives ${want}`);
    }
    for (const l of ERA_CURVE_META_LINES) if (!res.text.split('\n').includes(l)) fail(`the written META has no "${l.trim()}" line`);
    const out = path.join(TMP, 'extended.ts');
    fs.writeFileSync(out, res.text);
    try {
      const back = readShippedEra(out, 'ERATEST');
      if (back.meta.players !== 12 || back.meta.clubs !== 4 || back.meta.moves !== 17) fail(`the written file reads back ${JSON.stringify(back.meta)}`);
    } catch (e) { fail(`the written file does not parse back: ${e.message}`); }
    console.log(`   ${got}; ${s.players} players in ${s.clubs} clubs`);
  }
}

/* ---------- B. one bad correction per guard ---------- */
console.log('B) every guard dies on its own bad correction');
{
  const without = (list, n) => list.filter(x => x.n !== n);
  /* [what it breaks, how, the words its death must carry] */
  const CASES = [
    ['a spelling with no rows', c => { c.newLeagues = [{ ...NEW_LEAGUE, dbToEra: { ...NEW_LEAGUE.dbToEra, 'Ghost FC': 'Ghost' } }]; }, 'the spelling map is wrong'],
    /* Round 902 moved 'Sweeper' into the lib's map (the 2005 bake had always
       mapped it), so the unmapped position here is one no map knows. */
    ['an unmapped position', c => { c.rows = [...ROWS, row('Pat Odd', 'Gamma FC', 'Libero', 20, 1e6)]; }, 'unmapped position'],
    ['the extend run twice', c => { c.newLeagues = [{ label: 'Again', dbToEra: { 'Alpha AFC': 'Alpha' } }]; }, 'must not run twice'],
    ['a shipped file holding a name twice', c => { c.file = writeShipped('twice.ts', { players: 7, extraLine: SHIPPED.Alpha[0] }); }, 'twice'],
    ['a META that miscounts', c => { c.file = writeShipped('meta.ts', { players: 9 }); }, 'META says'],
    /* Round 1102: shipped lines are carried as bytes, so a file still on the old curve would end up holding two scales. */
    ['a shipped file from before the curve changed', c => { c.file = writeShipped('oldcurve.ts', { stamp: false }); }, 'one file would hold two scales'],
    ['a fold whose two rows disagree', c => { c.rows = ROWS.map(r => (r.player_name === 'Dee Fold' ? { ...r, market_value_usd: 4e6 } : r)); }, "not one man's one row"],
    ['a fold of nobody', c => { c.folds = [...c.folds, { n: 'Nobody Here', why: 'x' }]; }, 'expected on both sides'],
    ['an undeclared name on both sides', c => { c.namesakes = []; }, 'names sit on both sides'],
    ['a declared namesake that never collided', c => { c.namesakes = [...c.namesakes, { n: 'Ann One', why: 'x' }]; }, 'never collided'],
    ['one string at two new clubs, undeclared', c => { c.poolNamesakes = []; }, 'two clubs of the new leagues'],
    ['a pool namesake kept at a club with no row', c => { c.poolNamesakes = [{ n: 'Pia Split', keep: 'Alpha', why: 'x' }]; }, 'keeps Alpha'],
    ['a declared pool namesake that never split', c => { c.poolNamesakes = [...c.poolNamesakes, { n: 'Gil Stay', keep: 'Gamma', why: 'x' }]; }, 'never split'],
    ['a stale mover', c => { c.moves = [...c.moves, { n: 'Nobody Here', to: 'Alpha', why: 'x' }]; }, 'the list is stale'],
    ['a mover to an unknown club', c => { c.moves = [{ n: 'Gus Mover', to: 'Omega', why: 'x' }, ...without(c.moves, 'Gus Mover')]; }, 'unknown club'],
    ['a move the year after does not prove', c => { c.moves = [{ n: 'Gus Mover', to: 'Beta', why: 'x' }, ...without(c.moves, 'Gus Mover')]; }, 'no year-2016 row names that club'],
    ['a mover already at his club', c => { c.moves = [...c.moves, { n: 'Dan Stay', to: 'Delta', why: 'x' }]; }, 'is already at'],
    ['a stale removal', c => { c.removals = [...c.removals, { n: 'Nobody Here', why: 'x' }]; }, 'the list is stale'],
    ['a removal still inside the world', c => { c.moves = without(c.moves, 'Gus Mover'); c.removals = [...c.removals, { n: 'Gus Mover', why: 'x' }]; }, 'inside the world'],
    ['a later removal with no later club', c => { c.removals = [{ n: 'Gary Leaver', why: 'x', later: 'x' }, ...without(c.removals, 'Gary Leaver')]; }, 'claims a later window'],
    ['a removal with no year after and no reason', c => { c.removals = [{ n: 'Sid Single', why: 'x' }, ...without(c.removals, 'Sid Single')]; }, 'documented single-source reason'],
    ['an arrival that is a new row', c => { c.arrivals = [...c.arrivals, { n: 'Dan Stay', from: 'Delta SC', to: 'Delta', why: 'x' }]; }, 'that is a move'],
    ['an arrival already in the shipped world', c => { c.arrivals = [...c.arrivals, { n: 'Ann One', from: 'Outside FC', to: 'Delta', why: 'x' }]; }, 'already in the shipped world'],
    ['an arrival to an unknown club', c => { c.arrivals = [{ n: 'Ari Arrival', from: 'Outside FC', to: 'Omega', why: 'x' }]; }, 'unknown club'],
    ['an arrival with no row at his old club', c => { c.arrivals = [{ n: 'Ari Arrival', from: 'Nowhere FC', to: 'Delta', why: 'x' }]; }, 'no year-2015 row at'],
    ['an arrival the year after does not prove', c => { c.arrivals = [{ n: 'Ari Arrival', from: 'Outside FC', to: 'Gamma', why: 'x' }]; }, 'no year-2016 row names that club'],
    ['one man at two clubs', c => { c.arrivals = [...c.arrivals, { n: 'Bo Shipmove', from: 'Outside FC', to: 'Gamma', why: 'x' }]; }, 'one man, one club'],
    ['a missing anchor', c => { c.anchors = [...c.anchors, ['Beta', 'Ann One']]; }, 'is missing from'],
    ['a thin club nobody declared', c => { c.thinUnder = 3; }, 'was not expected thin'],
    ['a declared thin club that is not thin', c => { c.expectedThin = ['Delta']; }, 'was expected thin and holds'],
  ];
  let died = 0;
  for (const [what, mutate, words] of CASES) {
    const cfg = good();
    mutate(cfg);
    try {
      extendEra(cfg);
      fail(`${what}: the step ran on and should have died ("${words}")`);
    } catch (e) {
      if (!String(e.message).includes(words)) fail(`${what}: it died, but with "${e.message.split('\n')[0]}" where "${words}" was expected`);
      else died += 1;
    }
  }
  console.log(`   ${died} of ${CASES.length} bad corrections died with their own message`);
  if (CASES.length < 30) fail(`only ${CASES.length} guard cases, the lib has 30 a caller can reach`);
}

/* ---------- R. the re rate of a shipped file (Round 1102) ---------- */
console.log('R) re rating a shipped file moves its ratings and its stamp and nothing else');
{
  const before = shippedText({ stamp: false });
  let res = null;
  try { res = rerateShippedEra(before, 'ERATEST'); } catch (e) { fail(`the re rate died: ${e.message}`); }
  if (res) {
    /* By hand, at the shipped age plus one: Ann One 80 at 26 stays 80, Sam Namesake 70 at 30 is 71,
       Lu Later 60 at 29 stays 60, Bea Two 72 at 28 stays 72, Bo Shipmove 71 at 25 stays 71, and
       Dee Fold is rebuilt from her line's own rating. */
    const want = { 'Ann One': 80, 'Sam Namesake': 71, 'Lu Later': 60, 'Bea Two': 72, 'Bo Shipmove': 71 };
    const a = before.split('\n');
    const b = res.text.split('\n');
    if (res.rows !== 6) fail(`the re rate read ${res.rows} rows, the file holds 6`);
    if (res.changed !== 1 || res.by[1] !== 1) fail(`the re rate moved ${res.changed} ratings (${JSON.stringify(res.by)}), by hand it is one man up one`);
    if (b.length !== a.length + ERA_CURVE_META_LINES.length) fail(`the re rated text has ${b.length} lines, the file had ${a.length} and gains ${ERA_CURVE_META_LINES.length}`);
    const rest = b.filter(l => !ERA_CURVE_META_LINES.includes(l));
    let offRow = 0;
    rest.forEach((l, i) => {
      const strip = s => s.replace(/, r: \d+ \},$/, '');
      if (strip(l) !== strip(a[i])) offRow += 1;
    });
    if (offRow) fail(`${offRow} lines differ in more than their rating`);
    for (const [n, r] of Object.entries(want)) if (!res.text.includes(`{ n: '${n}', `) || !new RegExp(`n: '${n}', .*, r: ${r} \\},`).test(res.text)) fail(`${n} is not rated ${r} after the re rate`);
    const again = rerateShippedEra(res.text, 'ERATEST');
    if (again.already !== true) fail('a second re rate of the same text did not say it is already on the curve');
    /* The stamped fixture and the re rated unstamped one are the same text but for the one rating
       that moved, so the stamp lines landed exactly where the extend step writes them. */
    const diff = shippedText().split('\n').filter((l, i) => l !== b[i]);
    if (diff.length !== 1 || !diff[0].includes("'Sam Namesake'")) fail(`the re rated text differs from the stamped fixture on ${diff.length} lines, one was expected (Sam Namesake)`);
    let died = '';
    try { rerateShippedEra(before.replace("    { n: 'Ann One', p: 'ST', a: 25, v: 9, r: 80 },", "    { n: 'Ann One', p: 'ST', a: 25, v: 9 },"), 'ERATEST'); } catch (e) { died = e.message; }
    if (!died.includes('cannot read')) fail(`a row with no rating did not stop the re rate (${died || 'it ran on'})`);
    died = '';
    try { rerateShippedEra(before.replace('  moves: 10,', '  moves: 10,\n  curve: 7,'), 'ERATEST'); } catch (e) { died = e.message; }
    if (!died.includes('does not know')) fail(`a file stamped with an unknown curve did not stop the re rate (${died || 'it ran on'})`);
    const crlf = rerateShippedEra(before.split('\n').join('\r\n'), 'ERATEST');
    if (crlf.text !== res.text.split('\n').join('\r\n')) fail('a CRLF file does not come back as the same text with CRLF line endings');
    console.log(`   ${res.rows} rows read, ${res.changed} moved, the stamp added (curve ${CURVE_VERSION}, rated at a + ${ERA_RATING_AGE_SHIFT}); a second run changes nothing; a bad row and an unknown stamp both stop it`);
  }
}

/* ---------- C. the real era bakes rebuild byte for byte ---------- */
/* Round 901: one entry per era the shared step has extended, each rebuilt
   from the file it grew from (the commit is the last one before its extend). */
/* Round 971 review fix: 2020-21 is the third. It grows from an EMPTY era the
   bake writes itself (no git base) and reads one pull holding both years
   (ERA_PULL_2020 overrides), so a change to the shared step or a hand edit
   of src/data/clubManagerEra2020.ts that undoes a summer 2020 correction
   turns this red. Before it, only a manual --check would have seen either. */
const PULL_0515 = process.env.ERA_PULL ?? 'C:/Users/antho/dukb-handoff/data/market-base-2005-2010-2015.json';
const NEXT_0515 = process.env.ERA_NEXT ?? 'C:/Users/antho/dukb-handoff/data/market-base-2006-2011-2016.json';
const PULL_2020 = process.env.ERA_PULL_2020 ?? 'C:/Users/antho/dukb-handoff/data/market-base-2020-2021.json';
const REBUILDS = [
  { label: '2015-16', script: 'bakeEra2015.mjs', base: '89d31144', file: 'clubManagerEra2015.ts', clubs: 60, pulls: [PULL_0515, NEXT_0515] },
  { label: '2010-11', script: 'bakeEra2010.mjs', base: '06dc0741', file: 'clubManagerEra2010.ts', clubs: 40, pulls: [PULL_0515, NEXT_0515] },
  /* Round 902: base 06dc0741 is Round 899's head, where the 2005-06 file was
     still Round 176's. drift is the line control c2drift cuts. */
  { label: '2005-06', script: 'bakeEra2005.mjs', base: '06dc0741', file: 'clubManagerEra2005.ts', clubs: 40, pulls: [PULL_0515, NEXT_0515], drift: C2_DRIFT },
  { label: '2020-21', script: 'bakeEra2020.mjs', base: null, file: 'clubManagerEra2020.ts', clubs: 0, pulls: [PULL_2020] },
];
for (const rb of REBUILDS) {
  console.log(`C) the ${rb.label} bake rebuilds from its ${rb.clubs} club base byte for byte`);
  let skip = null;
  const drift = CONTROL === 'c2drift' && rb.drift;
  if (CONTROL && !drift && !(C_CONTROL && rb.label === '2020-21')) skip = 'a control run checks A and B only (c2drift also runs the 2005-06 rebuild, stale2020 the 2020-21 one)';
  else if (!rb.pulls.every(p => fs.existsSync(p))) skip = `the offline pulls are not on this machine (${rb.pulls.join(', ')}); set ERA_PULL and ERA_NEXT, or ERA_PULL_2020, to run it`;
  if (skip && drift) { console.error(`CONTROL c2drift did not apply: ${skip}`); process.exit(2); }
  /* The bake it runs: the real one, or under c2drift a copy laid out the way
     the bake expects (scripts/, scripts/lib/, and the shipped era file it
     compares against under src/data/), all inside the temp folder. */
  let bake = path.join(ROOT, 'scripts', rb.script);
  if (!skip && drift) {
    const src = fs.readFileSync(bake, 'utf8');
    if (!rb.drift.test(src)) { console.error('CONTROL c2drift did not apply: the bake has no Kuranyi move line'); process.exit(2); }
    const mirror = path.join(TMP, 'mirror');
    fs.mkdirSync(path.join(mirror, 'scripts', 'lib'), { recursive: true });
    fs.mkdirSync(path.join(mirror, 'src', 'data'), { recursive: true });
    fs.writeFileSync(path.join(mirror, 'scripts', rb.script), src.replace(rb.drift, ''));
    fs.copyFileSync(LIB, path.join(mirror, 'scripts', 'lib', 'eraBakeExtend.mjs'));
    /* Round 1102: and the two modules the lib imports beside itself, or the mirrored bake dies on a
       missing module and the control is red for a reason that is not its own. */
    for (const dep of ['cmValueCurve.mjs', 'cmAges.mjs']) fs.copyFileSync(path.join(ROOT, 'scripts', 'lib', dep), path.join(mirror, 'scripts', 'lib', dep));
    fs.copyFileSync(path.join(ROOT, 'src', 'data', rb.file), path.join(mirror, 'src', 'data', rb.file));
    bake = path.join(mirror, 'scripts', rb.script);
    console.log('   CONTROL c2drift applied: the bake copy has no Kuranyi move');
  }
  let base = null;
  if (!skip && rb.base) {
    try {
      base = path.join(TMP, `base-${rb.label}.ts`);
      fs.writeFileSync(base, execFileSync('git', ['show', `${rb.base}:src/data/${rb.file}`], { cwd: ROOT, maxBuffer: 1 << 26 }));
    } catch { skip = `git cannot show the ${rb.clubs} club base (${rb.base}), a shallow clone?`; }
  }
  /* Round 1102: the base in git is from before the curve changed, and the extend step refuses to
     carry lines on an old curve. So the base is re rated from its own rows first, by the same
     function that re rated the shipped files, and the rebuild below then proves the whole path:
     re rating a shipped file gives what a full bake on today's curve gives, to the byte. */
  if (!skip && base) {
    try {
      const rr = rerateShippedEra(fs.readFileSync(base, 'utf8'), `ERA${rb.label.slice(0, 4)}`);
      if (rr.already) console.log(`   the ${rb.clubs} club base is already on curve ${CURVE_VERSION}`);
      else { fs.writeFileSync(base, rr.text); console.log(`   the ${rb.clubs} club base re rated from its own rows: ${rr.changed} of ${rr.rows} ratings moved to curve ${CURVE_VERSION}`); }
    } catch (e) { fail(`the ${rb.label} base could not be re rated: ${e.message}`); continue; }
  }
  if (skip) { console.log(`   SKIPPED: ${skip}`); continue; }
  const args = rb.base
    ? ['--extend-big-five', '--check', `--base=${base}`, `--pull=${rb.pulls[0]}`, `--next=${rb.pulls[1]}`]
    : ['--check', `--pull=${rb.pulls[0]}`];
  if (C_CONTROL && rb.label === '2020-21') {
    const shipped = fs.readFileSync(path.join(ROOT, 'src', 'data', rb.file), 'utf8');
    const was = "n: 'Kai Havertz'";
    if (!shipped.includes(was)) { console.error(`CONTROL stale2020 did not apply: the shipped era file has no "${was}"`); process.exit(2); }
    const stale = path.join(TMP, `stale-${rb.file}`);
    fs.writeFileSync(stale, shipped.replace(was, "n: 'Kai Havertz Edited'"));
    args.push(`--against=${stale}`);
    console.log(`   CONTROL stale2020 applied: the rebuild is compared with a copy where "${was}" was edited by hand`);
  }
  let out = '';
  let code = 0;
  try {
    out = execFileSync(process.execPath, [bake, ...args],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });
  } catch (e) { code = e.status ?? 1; out = `${e.stdout ?? ''}${e.stderr ?? ''}`; }
  const verdict = out.split('\n').filter(l => l.startsWith('CHECK:') || l.startsWith('FATAL:')).join(' / ');
  console.log(`   ${verdict || '(no verdict line)'}`);
  /* Round 1102: a control aimed at this part must reach the comparison, or its red is not its own. */
  if ((drift || (C_CONTROL && rb.label === '2020-21')) && !out.includes('CHECK: the rebuilt era file differs')) {
    console.error(`CONTROL ${CONTROL} did not reach the comparison: ${out.split('\n').filter(Boolean).slice(-2).join(' / ')}`);
    process.exit(2);
  }
  if (code !== 0 || !out.includes('byte identical')) fail(`the rebuilt ${rb.label} era file does not match the shipped one (exit ${code})`);
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log('');
if (failures > 0) {
  console.error(`simEraBakeExtend: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simEraBakeExtend: green. The shared extend step still fails closed on every guard.');
