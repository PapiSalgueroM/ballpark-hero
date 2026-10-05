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
 *      from its 40 club file (git show 06dc0741). Without the pulls this part prints SKIPPED and why;
 *      A and B do not need them and always run.
 *
 * Round 901 review fix: a name with rows at two clubs of the new leagues is
 * settled only by the caller's poolNamesakes (A places one by it, B holds its
 * three guards, control nosplit cuts the undeclared one out).
 *
 * Negative controls, SIM_ERA_EXTEND_CONTROL=noprove|nostillin|nodupe|nosplit: the
 * harness imports a COPY of the lib with that guard cut out (it first proves
 * the guarded line is in the lib, and refuses with exit 2 if not), and the
 * run must then end red. Nothing on disk outside the temp folder changes.
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
let libUrl = pathToFileURL(LIB).href;
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  if (!c) { console.error(`unknown control ${CONTROL}`); process.exit(2); }
  const src = fs.readFileSync(LIB, 'utf8');
  if (!src.includes(c[0])) { console.error(`CONTROL ${CONTROL} did not apply: the lib has no "${c[0]}"`); process.exit(2); }
  const copy = path.join(TMP, 'eraBakeExtend.control.mjs');
  fs.writeFileSync(copy, src.replace(c[0], c[1]));
  libUrl = pathToFileURL(copy).href;
  console.log(`CONTROL ${CONTROL} applied: the lib copy has "${c[0]}" cut out`);
}
const { extendEra, readShippedEra, gbpM, ratingOf } = await import(libUrl);

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
    `    { n: 'Dee Fold', p: 'CAM', a: 26, v: ${gbpM(2e6)}, r: ${ratingOf(2e6)} },`,
  ],
};
const shippedText = ({ players = 6, clubs = SHIPPED, extraLine = null } = {}) => [
  '// a synthetic era for scripts/simEraBakeExtend.mjs',
  "import type { BakedPlayer } from '@/data/clubManagerRosters';", '',
  'export const ERATEST_META = {', '  year: 2015,', `  players: ${players},`, `  clubs: ${Object.keys(clubs).length},`, '  moves: 10,', '};', '',
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
    ['an unmapped position', c => { c.rows = [...ROWS, row('Pat Odd', 'Gamma FC', 'Sweeper', 20, 1e6)]; }, 'unmapped position'],
    ['the extend run twice', c => { c.newLeagues = [{ label: 'Again', dbToEra: { 'Alpha AFC': 'Alpha' } }]; }, 'must not run twice'],
    ['a shipped file holding a name twice', c => { c.file = writeShipped('twice.ts', { players: 7, extraLine: SHIPPED.Alpha[0] }); }, 'twice'],
    ['a META that miscounts', c => { c.file = writeShipped('meta.ts', { players: 9 }); }, 'META says'],
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
  if (CASES.length < 29) fail(`only ${CASES.length} guard cases, the lib has 29 a caller can reach`);
}

/* ---------- C. the real era bakes rebuild byte for byte ---------- */
/* Round 901: one entry per era the shared step has extended, each rebuilt
   from the file it grew from (the commit is the last one before its extend). */
const REBUILDS = [
  { label: '2015-16', script: 'bakeEra2015.mjs', base: '89d31144', file: 'clubManagerEra2015.ts', clubs: 60 },
  { label: '2010-11', script: 'bakeEra2010.mjs', base: '06dc0741', file: 'clubManagerEra2010.ts', clubs: 40 },
];
for (const rb of REBUILDS) {
  console.log(`C) the ${rb.label} bake rebuilds from its ${rb.clubs} club base byte for byte`);
  const PULL = process.env.ERA_PULL ?? 'C:/Users/antho/dukb-handoff/data/market-base-2005-2010-2015.json';
  const NEXT_PULL = process.env.ERA_NEXT ?? 'C:/Users/antho/dukb-handoff/data/market-base-2006-2011-2016.json';
  let skip = null;
  if (CONTROL) skip = 'a control run checks A and B only';
  else if (!fs.existsSync(PULL) || !fs.existsSync(NEXT_PULL)) skip = `the offline pulls are not on this machine (${PULL}, ${NEXT_PULL}); set ERA_PULL and ERA_NEXT to run it`;
  let base = null;
  if (!skip) {
    try {
      base = path.join(TMP, `base-${rb.label}.ts`);
      fs.writeFileSync(base, execFileSync('git', ['show', `${rb.base}:src/data/${rb.file}`], { cwd: ROOT, maxBuffer: 1 << 26 }));
    } catch { skip = `git cannot show the ${rb.clubs} club base (${rb.base}), a shallow clone?`; }
  }
  if (skip) { console.log(`   SKIPPED: ${skip}`); continue; }
  let out = '';
  let code = 0;
  try {
    out = execFileSync(process.execPath, [path.join(ROOT, 'scripts', rb.script), '--extend-big-five', '--check',
      `--base=${base}`, `--pull=${PULL}`, `--next=${NEXT_PULL}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });
  } catch (e) { code = e.status ?? 1; out = `${e.stdout ?? ''}${e.stderr ?? ''}`; }
  const verdict = out.split('\n').filter(l => l.startsWith('CHECK:') || l.startsWith('FATAL:')).join(' / ');
  console.log(`   ${verdict || '(no verdict line)'}`);
  if (code !== 0 || !out.includes('byte identical')) fail(`the rebuilt ${rb.label} era file does not match the shipped one (exit ${code})`);
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log('');
if (failures > 0) {
  console.error(`simEraBakeExtend: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simEraBakeExtend: green. The shared extend step still fails closed on every guard.');
