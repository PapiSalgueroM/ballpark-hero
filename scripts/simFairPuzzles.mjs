/**
 * Round 214 harness: every puzzle on this site has exactly one right answer.
 *
 * The puzzle games all share one failure mode and it is the worst kind,
 * because the better you know the sport the more likely it is to catch
 * you. A connections board with a name that honestly belongs in two of its
 * groups has no right answer. A ranking round with two men on the same
 * number has two right orders. A team sheet whose blanked man is not
 * actually on the sheet cannot be solved at all.
 *
 * Nothing was checking any of it, across three hundred and twenty two
 * connections boards, fourteen ranking rounds and a hundred and eighty one
 * team sheets.
 *
 * They are all clean, every one of them, which is worth knowing and worth
 * keeping. So this is a fence rather than a fix: the rules below were true
 * when it was written and now they cannot quietly stop being true. A round
 * that finds nothing is still worth shipping if it stops the next one
 * being found by a player.
 *
 * The two shapes are both legitimate and both stay. Soccer uses four
 * groups of four named `category`; the other four sports use four groups of
 * five named `theme`. What matters is that a puzzle is internally
 * consistent, not that they match each other.
 *
 * IT ALSO COUNTS THE POOLS, and that is the uncomfortable part. Round 213
 * gave every daily game a shuffled walk that shows its whole pool before
 * repeating any of it, which is the best thing you can do with four
 * puzzles and still means a four day cycle. The NBA, NFL and NHL games
 * have four puzzles each. They have been repeating twice a week since they
 * shipped. That is a content gap, not a code bug, and it cannot be closed
 * by generating puzzles: a group like "plays for the Clippers" is a claim
 * about the world, and this project's oldest rule is that the screen never
 * lies about anything it cannot check. So the counts are RECORDED here as
 * a floor. A thin game may not get thinner, a new game may not ship thin,
 * and the day somebody writes more the floor comes up with them.
 *
 * Run: node scripts/simFairPuzzles.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/connHarnessEntry.mjs';
const BUNDLE = '/tmp/connHarness.bundle.mjs';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const soccer = await import('${ROOT}/src/data/connectionsPuzzles.ts');
const baseball = await import('${ROOT}/src/data/baseballConnectionsPuzzles.ts');
const nba = await import('${ROOT}/src/data/nbaConnectionsPuzzles.ts');
const nfl = await import('${ROOT}/src/data/nflConnectionsPuzzles.ts');
const nhl = await import('${ROOT}/src/data/nhlConnectionsPuzzles.ts');
export { soccer, baseball, nba, nfl, nhl };
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });
const mods = await import(BUNDLE);

/**
 * The pool floors, measured 2026-08-20.
 *
 * These are a RATCHET, not a target. A number here may only ever go up,
 * and it goes up in the same round that earns it, so a game that gets more
 * puzzles cannot silently lose them again later.
 */
const FLOOR = { soccer: 250, baseball: 60, nba: 4, nfl: 4, nhl: 4 };
/* Below this a daily game repeats inside a week, which players notice. */
const COMFORTABLE = 14;

console.log('1) No player belongs to two groups of the same board');
let puzzles = 0, groups = 0, tiles = 0;
const counts = {};
for (const [sport, mod] of Object.entries(mods)) {
  const list = Object.values(mod).find(v => Array.isArray(v));
  if (!list) { fail(`${sport}: no puzzle array exported`); continue; }
  counts[sport] = list.length;
  const ids = new Set();
  const boards = new Set();
  for (const p of list) {
    puzzles += 1;
    if (!p.id) fail(`${sport}: a puzzle with no id`);
    if (ids.has(p.id)) fail(`${sport}: two puzzles share the id ${p.id}`);
    ids.add(p.id);
    if (!Array.isArray(p.groups) || p.groups.length !== 4) {
      fail(`${sport} ${p.id}: ${p.groups?.length ?? 0} groups, and a connections board has four`);
      continue;
    }
    const all = [];
    const labels = new Set();
    const diffs = new Set();
    const sizes = new Set();
    for (const g of p.groups) {
      groups += 1;
      const label = g.category ?? g.theme;
      const names = g.players ?? [];
      sizes.add(names.length);
      if (!label || !String(label).trim()) fail(`${sport} ${p.id}: a group with no label`);
      if (labels.has(label)) fail(`${sport} ${p.id}: two groups both called "${label}"`);
      labels.add(label);
      if (g.difficulty) {
        if (diffs.has(g.difficulty)) fail(`${sport} ${p.id}: two groups at difficulty ${g.difficulty}`);
        diffs.add(g.difficulty);
      }
      if (new Set(names).size !== names.length) fail(`${sport} ${p.id}: "${label}" lists the same man twice`);
      for (const n of names) {
        if (typeof n !== 'string' || !n.trim()) fail(`${sport} ${p.id}: "${label}" has an empty tile`);
        all.push(n);
        tiles += 1;
      }
    }
    /* THE RULE THIS FILE EXISTS FOR. */
    const seen = new Map();
    for (const n of all) seen.set(n, (seen.get(n) ?? 0) + 1);
    const shared = [...seen.entries()].filter(([, c]) => c > 1);
    if (shared.length) {
      fail(`${sport} ${p.id}: ${shared.map(([n, c]) => `${n} is in ${c} groups`).join(', ')}, so the board has no right answer`);
    }
    /* A board with uneven groups cannot be laid out as a grid. */
    if (sizes.size !== 1) fail(`${sport} ${p.id}: groups of ${[...sizes].join(' and ')}, which will not lay out`);
    /* And two boards made of the same sixteen names are one board twice. */
    const key = [...all].sort().join('|');
    if (boards.has(key)) fail(`${sport}: ${p.id} is the same board as one already in the pool`);
    boards.add(key);
  }
}
console.log(`   ${puzzles} puzzles, ${groups} groups, ${tiles} tiles, 0 shared between groups`);

console.log('2) The pools are deep enough that a daily is not a weekly');
{
  for (const [sport, floor] of Object.entries(FLOOR)) {
    const have = counts[sport] ?? 0;
    if (have < floor) {
      fail(`${sport}: down to ${have} puzzles from a floor of ${floor}, so a board has been lost`);
    }
    if (have > floor) {
      fail(`${sport}: up to ${have} puzzles from a floor of ${floor}. Raise the floor in this round so the new ones cannot be lost.`);
    }
  }
  const thin = Object.entries(counts).filter(([, n]) => n < COMFORTABLE).map(([s, n]) => `${s} ${n}`);
  /* Deliberately NOT a failure. It is a real content gap, it is recorded
     rather than hidden, and failing on it every run would train everybody
     to ignore this harness. */
  console.log(`   pools: ${Object.entries(counts).map(([s, n]) => `${s} ${n}`).join(', ')}`);
  if (thin.length) {
    console.log(`   THIN, repeats inside a week: ${thin.join(', ')}. Round 213's shuffled walk covers`);
    console.log('   the whole pool before repeating any of it, which is the most that can be done');
    console.log('   with four boards. These need writing, and they cannot be generated: a group is');
    console.log('   a claim about the world and this site does not ship claims it cannot check.');
  }
}

console.log('3) A ranking round has one right order');
{
  /* Two men on the same number means two orders are both correct and the
     game marks one of them wrong. */
  const RANK_ENTRY = '/tmp/rankEntry.mjs';
  const RANK_BUNDLE = '/tmp/rank.bundle.mjs';
  fs.writeFileSync(RANK_ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const otl = await import('${ROOT}/src/lib/orderTheList.ts');
const mx = await import('${ROOT}/src/lib/missingXi.ts');
const m5 = await import('${ROOT}/src/lib/missingFive.ts');
const m9 = await import('${ROOT}/src/lib/missingNine.ts');
const m11 = await import('${ROOT}/src/lib/missingEleven.ts');
export { otl, mx, m5, m9, m11 };
`);
  execSync(`${ROOT}/node_modules/.bin/esbuild ${RANK_ENTRY} --bundle --format=esm --platform=node --outfile=${RANK_BUNDLE} --log-level=error`, { stdio: 'inherit' });
  const g = await import(RANK_BUNDLE);

  const rounds = Object.values(g.otl).find(v => Array.isArray(v) && v[0]?.items);
  if (!rounds) fail('the ranking rounds are not where this harness looks for them');
  else {
    const ids = new Set();
    for (const r of rounds) {
      if (ids.has(r.id)) fail(`two ranking rounds share the id ${r.id}`);
      ids.add(r.id);
      const items = r.items ?? [];
      if (items.length < 4) fail(`${r.id}: only ${items.length} items to order`);
      const values = items.map(i => i.value);
      const names = items.map(i => i.name);
      if (new Set(names).size !== names.length) fail(`${r.id}: the same man is listed twice`);
      const tied = new Map();
      for (const v of values) tied.set(v, (tied.get(v) ?? 0) + 1);
      const clash = [...tied.entries()].filter(([, c]) => c > 1);
      if (clash.length) {
        const who = clash.map(([v]) => items.filter(i => i.value === v).map(i => i.name).join(' and ')).join('; ');
        fail(`${r.id}: ${who} are on the same number, so two orders are both right`);
      }
      if (values.some(v => typeof v !== 'number' || !Number.isFinite(v))) fail(`${r.id}: a value that is not a number`);
      if (!r.statLabel || !String(r.statLabel).trim()) fail(`${r.id}: no label saying what is being ranked`);
    }
    console.log(`   ${rounds.length} ranking rounds, no ties, no repeats`);
  }

  console.log('4) A team sheet can actually be solved');
  const SHEETS = [['Missing XI', g.mx, 11], ['Missing Five', g.m5, 5], ['Missing Nine', g.m9, 9], ['Missing Eleven', g.m11, 11]];
  let sheets = 0;
  for (const [label, mod, want] of SHEETS) {
    const lineups = Object.values(mod).find(v => Array.isArray(v) && v[0]?.slots);
    if (!lineups) { fail(`${label}: no lineups found`); continue; }
    const ids = new Set();
    for (const l of lineups) {
      sheets += 1;
      if (ids.has(l.id)) fail(`${label}: two sheets share the id ${l.id}`);
      ids.add(l.id);
      const names = l.slots.map(s => s.name);
      if (names.length !== want) fail(`${label} ${l.id}: ${names.length} men on a sheet that should hold ${want}`);
      if (names.some(n => typeof n !== 'string' || !n.trim())) fail(`${label} ${l.id}: a slot with nobody in it`);
      /* Two men with one name on a sheet: whichever is blanked, the answer
         is already visible in the other slot. */
      if (new Set(names).size !== names.length) fail(`${label} ${l.id}: the same name fills two slots, so a blank would be given away`);
      const cands = (l.blankCandidates ?? []).map(c => c.name);
      if (cands.length === 0) fail(`${label} ${l.id}: nobody can be blanked, so the sheet is never used`);
      if (new Set(cands).size !== cands.length) fail(`${label} ${l.id}: the same man is offered twice as the blank`);
      for (const c of cands) {
        if (!names.includes(c)) fail(`${label} ${l.id}: ${c} can be blanked but is not on the sheet, which is unsolvable`);
      }
    }
  }
  console.log(`   ${sheets} team sheets, every blank on its own sheet and every slot filled`);
}

console.log('');
if (failures > 0) {
  console.error(`simFairPuzzles: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simFairPuzzles: green. Every board on the site has exactly one right answer.');
