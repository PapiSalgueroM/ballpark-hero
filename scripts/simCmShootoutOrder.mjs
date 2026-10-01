/*
 * Round 782 harness: the shootout order, from a player's report on 2026-09-23:
 *
 *   "let us have a choice of all 11 players like who will shoot 1 by 1 in
 *    penalty shootout so we do not lose"
 *
 * Before this round a Club Manager shootout was one draw: 0.5, plus the
 * strength gap times 0.012, plus the assigned penalty taker's edge, clamped
 * to 0.2..0.8. It still is, for every save that never set an order. With an
 * order set on the tactics tab (CareerState.shootoutOrder, player ids, up
 * to eleven) the shootout goes kick by kick: shootoutTakerOrder walks the
 * listed men still on the pitch in the manager's order, then the unlisted
 * in shirt order with the keeper last; the other side sends its eleven on
 * the pitch best first, keeper last; every kick is one draw against
 * shootoutKickChance, the base rate (0.76, real world shootouts convert
 * about 75 to 78 in a hundred) up with the taker's edge and down with the
 * keeper's, each inside SHOOTOUT_TAKER_EDGE_CAP; five each, over early once
 * a side cannot be caught, then sudden death round the list. The report
 * carries every kick (MatchWeekReport.shootout), decidedBy and shootoutWon
 * exactly as before.
 *
 * Sections, each against the real engine bundled with esbuild:
 *   1) The walk, through the whole match. One base career (Real Madrid,
 *      BASE_SEED) is simmed to its first cup week once; then N seeds play
 *      that cup match with a seven man order set (five men of the eleven
 *      and two bench men, listed second and fifth). For every match that
 *      reached a shootout, my first five kicks (or as many as were taken)
 *      must be the first five men of the order who finished the match, in
 *      that order, read off the report's own ratings sheet, subs, reds and
 *      injuries. 100 percent, a hard assert, with a floor on how many
 *      shootouts were reached and a floor on how many of them needed the
 *      skip to get the first five right, so neither can pass on an empty
 *      set. The scored share across every kick is printed and held to a
 *      wide band around the base rate.
 *   2) The order is worth something. The same eleven (ratings 90 down to
 *      62, a spread the cap bites on at both ends) against a copy of itself,
 *      on common random numbers: one arm kicks its five best first, the
 *      other its five worst first. The best first arm must win a larger
 *      share, by a floor set from measurement. The real Real Madrid eleven
 *      is measured the same way and printed, not asserted, because its
 *      spread is narrow and the gap small by design.
 *   3) The cap. Over every taker rating and keeper rating 40 to 99 the
 *      taker's edge and the keeper's edge each stay inside the cap and the
 *      kick's odds stay inside twice the cap of the base rate.
 *   4) Unset means unchanged. scripts/data/cmShootoutUnset782.json holds,
 *      for 150 seeds of that same cup match with no order set, the result
 *      (how it was decided, who won the shootout, the score), the next
 *      number off the stream after the match, and a hash of the whole
 *      report and the save after it, written by the engine as it stood
 *      BEFORE this round (src/lib/clubManager.ts at origin/main 84d81619,
 *      unchanged since the branch point 9136539b). The engine now must
 *      reproduce every row. The next number alone is a weak witness (the
 *      engine's later draws are conditional, so a stream shifted by one can
 *      fall back into step: under unsetpath it came out the same on 17 of
 *      the 28 shootout rows, and 8 of them matched on every other field);
 *      the hash catches all 28.
 *   5) An old save loads. A career written without the field comes back
 *      with no order, plays the fixture's match the fixture's way, and an
 *      order set on it survives a save and a load; a bad id is refused.
 *
 * Negative controls (house rule: prove the checks can fail), each a rewrite
 * of a copy of src/lib/clubManager.ts that refuses to run if its anchor is
 * not in the file:
 *   CM_SHOOTOUT_CONTROL=ignoreorder  settleShootout walks shirt order and
 *     ignores the manager's list. Section 1 must go red.
 *   CM_SHOOTOUT_CONTROL=noskip       shootoutTakerOrder stops skipping a
 *     listed man who is off the pitch. Section 1 must go red.
 *   CM_SHOOTOUT_CONTROL=nocap        shootoutKeeperEdge loses its clamp.
 *     Section 3 must go red.
 *   CM_SHOOTOUT_CONTROL=unsetpath    the one draw path takes one extra
 *     number off the stream first. Section 4 must go red (and 5 with it).
 *
 * MEASURED, 2026-10-01, on the default seed and SIM_SEED=1 to 5 (six runs,
 * section 2 is 4000 paired shootouts an arm, 7 to 9 seconds a run):
 *   metric                                     fixed                                control                      floor / band
 *   shootouts reached in section 1             22, 24, 26, 25, 24, 32 of 150                                     floor 12
 *   first five kicks in listed order           all of them in every run             0 of 22 (ignoreorder, noskip) all
 *   the skip decided who took the first five   22, 24, 26, 25, 24, 32 (every one)                                floor 12
 *   scored share, all kicks                    80.6, 76.1, 75.9, 79.3, 72.9, 77.4 %                              band 62 to 90
 *   best five first minus worst five first     9.7, 9.4, 10.4, 9.2, 9.5, 11.0 pts                                floor 6
 *   Real Madrid's own eleven, same gap         2.3 points                                                        printed
 *   edges and odds past the cap                0 of 3600 pairs                      2355 (nocap)                 0
 *   biggest move off the base rate             0.120                                0.200 (nocap)                printed
 *   fixture rows reproduced                    150 of 150                           122 of 150 (unsetpath)       150
 *   fixture rows that are shootouts            28                                                                floor 12
 *
 * Measured once and not asserted, because it is a design fact rather than
 * a check: on the same shootouts (1500 seeds of that cup match, the order
 * changes nothing before the whistle) an order of the five best first won
 * 61.3 percent for Real Madrid against 67.6 with no order, 58.2 against
 * 64.3 for Burnley, and 45.9 against 42.9 for Getafe. The old one draw
 * reads the whole eleven's strength gap (0.012 a point, up to 0.8); kick by
 * kick reads only each taker and keeper inside the cap, so a strong side
 * does a little worse with an order set and a weaker one a little better.
 *
 * Regenerating the fixture is a deliberate act and only ever from an engine
 * whose unset path is known to be the pre Round 782 one:
 *   CM_SHOOTOUT_WRITE_FIXTURE=<path to that clubManager.ts> node scripts/simCmShootoutOrder.mjs
 *
 * Nothing here reads dist, and every match runs on a fixed clock (a few
 * engine ids carry Date.now and the hash covers the save), so it is safe
 * to run between builds and on any day.
 *
 * Run: node scripts/simCmShootoutOrder.mjs
 */
import './lib/seedRandom.mjs';
import { buildSync } from 'esbuild';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const TAG = `cmShootout.${process.pid}`;
const ENTRY = `${TMP}/${TAG}.entry.mjs`;
const BUNDLE = `${TMP}/${TAG}.bundle.mjs`;
const FIXTURE = `${ROOT}/scripts/data/cmShootoutUnset782.json`;

const CONTROL = process.env.CM_SHOOTOUT_CONTROL || '';
const KNOWN = ['ignoreorder', 'noskip', 'nocap', 'unsetpath'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`CM_SHOOTOUT_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}
const WRITE_FIXTURE = process.env.CM_SHOOTOUT_WRITE_FIXTURE || '';

const readLF = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const abort = m => { console.error(m); process.exit(1); };
const swap = (src, from, to, where) => {
  if (!src.includes(from)) {
    console.error(`control cannot run: ${where} is not in the shape CM_SHOOTOUT_CONTROL=${CONTROL} rewrites`);
    console.error(`  looked for: ${JSON.stringify(from)}`);
    process.exit(1);
  }
  return src.replace(from, to);
};

/* ---------- the engine, or a control's copy of it ---------- */
let enginePath = WRITE_FIXTURE ? path.resolve(WRITE_FIXTURE).replaceAll('\\', '/') : `${ROOT_URL}/src/lib/clubManager.ts`;
if (CONTROL) {
  let engine = readLF(`${ROOT}/src/lib/clubManager.ts`);
  if (CONTROL === 'ignoreorder') {
    engine = swap(engine,
      'squadByIds(state, shootoutTakerOrder(order, onIds, myKeeper?.id ?? null))',
      'squadByIds(state, shootoutTakerOrder([], onIds, myKeeper?.id ?? null))',
      'settleShootout (the walk over the order)');
  } else if (CONTROL === 'noskip') {
    engine = swap(engine,
      '    if (on.has(id) && !out.includes(id)) out.push(id);\n',
      '    if (!out.includes(id)) out.push(id);\n',
      'shootoutTakerOrder (the skip for a man off the pitch)');
  } else if (CONTROL === 'nocap') {
    engine = swap(engine,
      '  return clamp((keeperRating - 75) * 0.004, -SHOOTOUT_TAKER_EDGE_CAP, SHOOTOUT_TAKER_EDGE_CAP);\n',
      '  return (keeperRating - 75) * 0.004;\n',
      'shootoutKeeperEdge (the clamp)');
  } else if (CONTROL === 'unsetpath') {
    engine = swap(engine,
      '  if (!order) return { won: Math.random() < clamp(0.5 + (mine - oppS) * 0.012 + shootoutTakerEdge(taker), 0.2, 0.8) };\n',
      '  if (!order) { Math.random(); return { won: Math.random() < clamp(0.5 + (mine - oppS) * 0.012 + shootoutTakerEdge(taker), 0.2, 0.8) }; }\n',
      'settleShootout (the one draw path)');
  }
  const copy = `${TMP}/${TAG}.control.engine.ts`;
  fs.writeFileSync(copy, engine);
  enginePath = copy;
}

fs.writeFileSync(ENTRY, `
let slot = {};
globalThis.localStorage = {
  getItem: k => (k in slot ? slot[k] : null),
  setItem: (k, v) => { slot[k] = String(v); },
  removeItem: k => { delete slot[k]; },
  clear: () => { slot = {}; },
};
export const cm = await import('${enginePath}');
`);
/* esbuild through its own module rather than a path under ROOT, so a worktree
   that resolves node_modules by walking up (no junction, ever) bundles too. */
buildSync({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error', alias: { '@': `${ROOT_URL}/src` } });
const { cm } = await import(pathToFileURL(BUNDLE).href);
const {
  startCareer, playNextEntry, saveCareer, loadCareer, resolveXI,
  setShootoutOrder, shootoutOrderOf, runShootout, shootoutTakerOrder,
  shootoutKickChance, shootoutTakerEdge, shootoutKeeperEdge,
  SHOOTOUT_TAKER_EDGE_CAP, SHOOTOUT_BASE_RATE,
} = cm;
const needed = WRITE_FIXTURE
  ? { startCareer, playNextEntry }
  : { startCareer, playNextEntry, saveCareer, loadCareer, resolveXI, setShootoutOrder, shootoutOrderOf, runShootout, shootoutTakerOrder, shootoutKickChance, shootoutTakerEdge, shootoutKeeperEdge };
for (const [name, fn] of Object.entries(needed)) {
  if (typeof fn !== 'function') abort(`the harness could not reach ${name}; the bundle is not the shape it expects`);
}

/* ---------- seeds ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* A fixed clock too: a few engine ids carry Date.now, and the fixture's
   hash covers the whole save, so the replay must not read the real time. */
const FIXED_NOW = Date.UTC(2026, 9, 1);
function withSeed(seed, fn) {
  const saved = Math.random;
  const savedNow = Date.now;
  Math.random = mulberry32(seed >>> 0);
  Date.now = () => FIXED_NOW;
  try { return fn(); } finally { Math.random = saved; Date.now = savedNow; }
}
/** FNV-1a over a string, as hex: the witness that two runs drew the same numbers all the way through. */
function fnv(s) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
const SIM_SEED = Number.isFinite(Number(process.env.SIM_SEED)) ? Number(process.env.SIM_SEED) : 0;
/* The base career and the fixture walk fixed seeds whatever SIM_SEED says,
   because the fixture was written on them. SIM_SEED moves sections 1 and 2. */
const BASE_SEED = 782_001;
const FIXTURE_SEEDS = Array.from({ length: 150 }, (_, i) => 782_100 + i);
const CLUB = 'Real Madrid';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const pct = x => `${(x * 100).toFixed(1)}%`;

/* ---------- the base career, simmed to its first cup week ---------- */
const atCup = withSeed(BASE_SEED, () => {
  const start = startCareer(CLUB);
  const cupIdx = start.calendar.findIndex(e => e.type === 'cup');
  if (cupIdx < 0) abort(`${CLUB} has no cup entry in its calendar`);
  /* playNextEntry hands back after every match, so the walk to the cup week is a loop. */
  let s = start;
  for (let guard = 0; s.week < cupIdx && guard < 60; guard++) {
    const r = playNextEntry(s, { skipHalftime: true, untilWeek: cupIdx });
    s = r.state;
    if (r.kind === 'reached') break;
    if (r.kind !== 'match') abort(`could not sim to the cup week: got ${r.kind} at week ${s.week} (wanted ${cupIdx})`);
  }
  if (s.week !== cupIdx) abort(`could not sim to the cup week: stopped at week ${s.week} (wanted ${cupIdx})`);
  return s;
});
const cupEntry = atCup.calendar[atCup.week];
console.log(`   base: ${CLUB}, cup ${cupEntry.cupRound} in week ${atCup.week}, squad ${atCup.squad.length}, no order set: ${!('shootoutOrder' in atCup)}`);

/** One cup match from the base, on a seed, and the next number off the stream once it is over. */
function playCup(state, seed) {
  return withSeed(seed, () => {
    const r = playNextEntry(state, { skipHalftime: true });
    if (r.kind !== 'match' || !r.report) abort(`seed ${seed}: the cup week did not play a match (${r.kind})`);
    if (r.report.competition !== 'cup') abort(`seed ${seed}: played a ${r.report.competition} match, not the cup`);
    const rep = r.report;
    return {
      seed, decidedBy: rep.decidedBy, shootoutWon: rep.shootoutWon ?? null,
      homeGoals: rep.homeGoals, awayGoals: rep.awayGoals, next: Math.random(),
      /* Everything the match wrote, the report and the save after it. The
         next number off the stream alone is a weak witness: the engine's
         later draws are conditional, so a stream shifted by one can land on
         the same count by the end (17 of the 28 shootout rows did, measured
         under unsetpath). The other results, ratings and books drawn after
         the shootout cannot all land the same. */
      hash: fnv(JSON.stringify({ report: rep, state: r.state })),
      report: rep,
    };
  });
}
const row = ({ seed, decidedBy, shootoutWon, homeGoals, awayGoals, next, hash }) => ({ seed, decidedBy, shootoutWon, homeGoals, awayGoals, next, hash });

/* ---------- fixture writing: a deliberate act, from a pre 782 engine ---------- */
if (WRITE_FIXTURE) {
  const rows = FIXTURE_SEEDS.map(s => row(playCup(atCup, s)));
  const pens = rows.filter(r => r.decidedBy === 'pens').length;
  fs.writeFileSync(FIXTURE, JSON.stringify({
    note: 'Round 782: the pre round shootout outcome of one cup match, by seed, with no order set. Written from the engine named in writtenFrom. Replayed by scripts/simCmShootoutOrder.mjs section 4; regenerate only from an engine whose one draw path is known to be the pre 782 one.',
    writtenFrom: path.basename(WRITE_FIXTURE), writtenOn: new Date().toISOString().slice(0, 10),
    club: CLUB, baseSeed: BASE_SEED, cupWeek: atCup.week, cupRound: cupEntry.cupRound, rows,
  }, null, 1) + '\n');
  console.log(`   wrote ${rows.length} rows (${pens} shootouts) to ${path.relative(ROOT, FIXTURE)}`);
  process.exit(0);
}

const nameOf = new Map(atCup.squad.map(p => [p.id, p.name]));
const idsOfName = new Map();
for (const p of atCup.squad) idsOfName.set(p.name, [...(idsOfName.get(p.name) ?? []), p.id]);

/* ================================================================== */
console.log('1) The walk, through the whole match: my first five kicks are the first five listed men who finished');
/* ================================================================== */
{
  const xi = resolveXI(atCup).filter(Boolean);
  const bench = atCup.squad.filter(p => !p.onLoan && !xi.some(x => x.id === p.id)).sort((a, b) => b.rating - a.rating);
  /* Five of the eleven (not the keeper, a mix of lines so the walk is not
     the rating order by accident) and two bench men who are off the pitch
     unless a change brings one on. The bench men sit second and fifth, so
     every shootout has to skip them to get the first five right. */
  const outfield = xi.filter(p => p.position !== 'GK');
  const picks = [outfield[outfield.length - 1], outfield[0], outfield[Math.floor(outfield.length / 2)], outfield[1], outfield[outfield.length - 2]];
  const order = [picks[0].id, bench[0].id, picks[1].id, picks[2].id, bench[1].id, picks[3].id, picks[4].id];
  const ordered = setShootoutOrder(atCup, order);
  if (!ordered) abort('setShootoutOrder refused a list of seven men from the squad');
  if (JSON.stringify(ordered.shootoutOrder) !== JSON.stringify(order)) fail(`the order was not kept as given: ${JSON.stringify(ordered.shootoutOrder)}`);
  console.log(`   order: ${order.map(id => nameOf.get(id)).join(', ')}`);

  let reached = 0;
  let inOrder = 0;
  let kicksAll = 0;
  let scoredAll = 0;
  let noDetail = 0;
  let skipsSeen = 0;
  const N = 150;
  for (let i = 0; i < N; i++) {
    const seed = 782_500 + SIM_SEED * 1000 + i;
    const out = playCup(ordered, seed);
    const rep = out.report;
    if (rep.decidedBy !== 'pens') {
      if (rep.shootout) fail(`seed ${seed}: a match decided ${rep.decidedBy} carries shootout kicks`);
      continue;
    }
    reached += 1;
    const d = rep.shootout;
    if (!d || !Array.isArray(d.kicks) || !d.kicks.length) { noDetail += 1; fail(`seed ${seed}: a shootout with an order set carries no kicks`); continue; }
    /* The men who finished: everyone on the ratings sheet minus anyone subbed off, sent off or carried off. */
    const det = rep.detail;
    const played = new Set();
    for (const r of det.myRatings) {
      const ids = idsOfName.get(r.name) ?? [];
      if (ids.length !== 1) abort(`seed ${seed}: ${r.name} maps to ${ids.length} ids in the squad; pick a club with unique names`);
      played.add(ids[0]);
    }
    const off = new Set();
    for (const s of det.subs) if (s.offId) off.add(s.offId);
    for (const c of det.cards) if (c.kind === 'red' && c.id) off.add(c.id);
    for (const inj of det.injuries) if (inj.id) off.add(inj.id);
    const finished = [...played].filter(id => !off.has(id));
    const expected = order.filter(id => finished.includes(id)).map(id => nameOf.get(id));
    /* A shootout where the skip decided who took one of the first five. */
    if (JSON.stringify(expected.slice(0, 5)) !== JSON.stringify(order.slice(0, 5).map(id => nameOf.get(id)))) skipsSeen += 1;
    const mineKicks = d.kicks.filter(k => k.side === 'me').map(k => k.taker);
    const n = Math.min(5, mineKicks.length, expected.length);
    const got = mineKicks.slice(0, n);
    const want = expected.slice(0, n);
    if (JSON.stringify(got) === JSON.stringify(want)) inOrder += 1;
    else fail(`seed ${seed}: my first kicks were ${got.join(', ')} but the order says ${want.join(', ')}`);
    /* The count on the report agrees with the kicks, and with who went through. */
    const last = d.kicks[d.kicks.length - 1];
    if (last.mine !== d.mine || last.theirs !== d.theirs) fail(`seed ${seed}: the final count ${d.mine}-${d.theirs} is not the last kick's ${last.mine}-${last.theirs}`);
    if ((d.mine > d.theirs) !== !!rep.shootoutWon) fail(`seed ${seed}: shootoutWon ${rep.shootoutWon} disagrees with the count ${d.mine}-${d.theirs}`);
    if (d.mine === d.theirs) fail(`seed ${seed}: a shootout ended level ${d.mine}-${d.theirs}`);
    /* Five each at least, unless it was over early, and the sides alternate. */
    const mineN = mineKicks.length;
    const theirN = d.kicks.length - mineN;
    if (Math.abs(mineN - theirN) > 1) fail(`seed ${seed}: ${mineN} kicks to ${theirN}, the sides did not alternate`);
    for (let k = 1; k < d.kicks.length; k++) if (d.kicks[k].side === d.kicks[k - 1].side) { fail(`seed ${seed}: two kicks in a row by ${d.kicks[k].side}`); break; }
    kicksAll += d.kicks.length;
    scoredAll += d.kicks.filter(k => k.result === 'scored').length;
  }
  const scoredShare = kicksAll ? scoredAll / kicksAll : NaN;
  console.log(`   ${N} cup matches, ${reached} shootouts, ${inOrder} with my first kicks in the listed order, ${skipsSeen} where skipping a listed man off the pitch changed who took the first five`);
  console.log(`   ${kicksAll} kicks, scored share ${pct(scoredShare)} (base rate ${SHOOTOUT_BASE_RATE})`);
  if (reached < 12) fail(`only ${reached} shootouts in ${N} matches, below the floor of 12, the assert has nothing to bite on`);
  if (skipsSeen < 12) fail(`the skip decided the first five in only ${skipsSeen} shootouts, below the floor of 12, so the skip is not being tested`);
  if (inOrder !== reached - noDetail) fail(`the first five kicks followed the order in ${inOrder} of ${reached} shootouts, not all of them`);
  if (!(scoredShare >= 0.62 && scoredShare <= 0.90)) fail(`scored share ${pct(scoredShare)} is outside 62 to 90 percent`);
}

/* ================================================================== */
console.log('2) The order is worth something: five best first beats five worst first, on common random numbers');
/* ================================================================== */
{
  const ratings = [90, 88, 86, 84, 82, 78, 74, 70, 66, 64, 62];
  const synth = ratings.map((r, i) => ({ name: `m${i}`, rating: r }));
  const keeper = 75;
  const theirs = { takers: synth.map(p => ({ ...p, name: `t${p.name}` })), keeperRating: keeper };
  const bestFirst = { takers: [...synth].sort((a, b) => b.rating - a.rating), keeperRating: keeper };
  const worstFirst = { takers: [...synth].sort((a, b) => a.rating - b.rating), keeperRating: keeper };
  const N = 4000;
  const share = side => {
    let wins = 0;
    for (let i = 0; i < N; i++) {
      const seed = 782_900_000 + SIM_SEED * 10_000 + i;
      const d = withSeed(seed, () => runShootout({ mine: side, theirs, myFirst: i % 2 === 0 }));
      if (d.mine > d.theirs) wins += 1;
    }
    return wins / N;
  };
  const best = share(bestFirst);
  const worst = share(worstFirst);
  const gap = best - worst;
  console.log(`   synthetic eleven 90..62 vs itself, ${N} shootouts an arm: best five first ${pct(best)}, worst five first ${pct(worst)}, gap ${(gap * 100).toFixed(1)} points`);
  /* Measured 2026-10-01 over the default seed and SIM_SEED 1..5: see the
     header. The floor sits well under the lowest run (9.2). */
  const FLOOR = 0.06;
  if (!(gap >= FLOOR)) fail(`best five first beats worst five first by ${(gap * 100).toFixed(1)} points, under the floor of ${FLOOR * 100}`);

  /* The real eleven, measured and printed. Its spread is a few points, so the gap is small by design. */
  const xi = resolveXI(atCup).filter(Boolean);
  const gk = xi.find(p => p.position === 'GK') ?? xi[0];
  const out = xi.filter(p => p !== gk).map(p => ({ name: p.name, rating: p.rating }));
  const realTheirs = { takers: [...out].sort((a, b) => b.rating - a.rating).concat({ name: gk.name, rating: gk.rating }), keeperRating: gk.rating };
  const realBest = { takers: [...out].sort((a, b) => b.rating - a.rating).concat({ name: gk.name, rating: gk.rating }), keeperRating: gk.rating };
  const realWorst = { takers: [...out].sort((a, b) => a.rating - b.rating).concat({ name: gk.name, rating: gk.rating }), keeperRating: gk.rating };
  const rb = (() => { let w = 0; for (let i = 0; i < N; i++) { const d = withSeed(782_950_000 + i, () => runShootout({ mine: realBest, theirs: realTheirs, myFirst: i % 2 === 0 })); if (d.mine > d.theirs) w += 1; } return w / N; })();
  const rw = (() => { let w = 0; for (let i = 0; i < N; i++) { const d = withSeed(782_950_000 + i, () => runShootout({ mine: realWorst, theirs: realTheirs, myFirst: i % 2 === 0 })); if (d.mine > d.theirs) w += 1; } return w / N; })();
  console.log(`   ${CLUB}'s eleven (outfield ${Math.min(...out.map(p => p.rating))} to ${Math.max(...out.map(p => p.rating))}): best first ${pct(rb)}, worst first ${pct(rw)}, gap ${((rb - rw) * 100).toFixed(1)} points (printed, not asserted)`);
}

/* ================================================================== */
console.log('3) The cap: no edge and no kick moves past it, either way');
/* ================================================================== */
{
  let pairs = 0;
  let bad = 0;
  let worst = 0;
  for (let t = 40; t <= 99; t++) {
    const te = shootoutTakerEdge({ rating: t });
    if (Math.abs(te) > SHOOTOUT_TAKER_EDGE_CAP + 1e-12) { bad += 1; if (bad <= 3) fail(`taker edge at ${t} is ${te}, past the cap ${SHOOTOUT_TAKER_EDGE_CAP}`); }
    for (let k = 40; k <= 99; k++) {
      pairs += 1;
      const ke = shootoutKeeperEdge(k);
      const p = shootoutKickChance({ rating: t }, k);
      const move = Math.abs(p - SHOOTOUT_BASE_RATE);
      worst = Math.max(worst, move);
      if (Math.abs(ke) > SHOOTOUT_TAKER_EDGE_CAP + 1e-12) { bad += 1; if (bad <= 3) fail(`keeper edge at ${k} is ${ke}, past the cap ${SHOOTOUT_TAKER_EDGE_CAP}`); }
      if (move > 2 * SHOOTOUT_TAKER_EDGE_CAP + 1e-12) { bad += 1; if (bad <= 3) fail(`kick odds at taker ${t} vs keeper ${k} are ${p.toFixed(4)}, ${move.toFixed(4)} off the base rate, past twice the cap`); }
      if (Math.abs(p - (SHOOTOUT_BASE_RATE + te - ke)) > 1e-12) { bad += 1; if (bad <= 3) fail(`kick odds at ${t} vs ${k} are not base plus taker minus keeper`); }
    }
  }
  if (shootoutKeeperEdge(null) !== 0 || shootoutKeeperEdge(undefined) !== 0) fail('a shootout with no keeper rating moves the odds');
  console.log(`   ${pairs} taker and keeper pairs 40 to 99: ${bad} past the cap, the biggest move off the base rate ${worst.toFixed(3)} (twice the cap is ${(2 * SHOOTOUT_TAKER_EDGE_CAP).toFixed(3)})`);
  if (bad) fail(`${bad} edges or kicks moved past the cap`);
}

/* ================================================================== */
console.log('4) Unset means unchanged: the frozen fixture replays row for row');
/* ================================================================== */
let fixture = null;
{
  if (!fs.existsSync(FIXTURE)) abort(`the fixture ${path.relative(ROOT, FIXTURE)} is missing; see the header for how it is written`);
  fixture = JSON.parse(readLF(FIXTURE));
  if (fixture.club !== CLUB || fixture.baseSeed !== BASE_SEED || fixture.cupWeek !== atCup.week) {
    fail(`the fixture was written for ${fixture.club} seed ${fixture.baseSeed} week ${fixture.cupWeek}, this run is ${CLUB} ${BASE_SEED} ${atCup.week}`);
  }
  if (fixture.rows.length !== FIXTURE_SEEDS.length) fail(`the fixture holds ${fixture.rows.length} rows, the harness walks ${FIXTURE_SEEDS.length} seeds`);
  let same = 0;
  let pens = 0;
  let withKicks = 0;
  let shown = 0;
  for (const want of fixture.rows) {
    const out = playCup(atCup, want.seed);
    const got = row(out);
    if (out.report.shootout) withKicks += 1;
    if (want.decidedBy === 'pens') pens += 1;
    if (JSON.stringify(got) === JSON.stringify(want)) same += 1;
    else if (shown++ < 3) console.error(`  differs, seed ${want.seed}: got ${JSON.stringify(got)}, fixture ${JSON.stringify(want)}`);
  }
  console.log(`   ${same} of ${fixture.rows.length} rows reproduced (${pens} of them shootouts, written from ${fixture.writtenFrom} on ${fixture.writtenOn}); ${withKicks} carried kicks`);
  if (same !== fixture.rows.length) fail(`${fixture.rows.length - same} rows differ from the pre round engine with no order set`);
  if (withKicks) fail(`${withKicks} reports carried shootout kicks with no order set`);
  if (pens < 12) fail(`the fixture holds only ${pens} shootouts, under the floor of 12`);
}

/* ================================================================== */
console.log('5) An old save loads with no order, plays the old way, and an order set on it is kept');
/* ================================================================== */
{
  localStorage.clear();
  const old = JSON.parse(JSON.stringify(atCup));
  delete old.shootoutOrder;
  if (!saveCareer(old)) fail('saveCareer refused the old shape');
  const back = loadCareer();
  if (!back) abort('loadCareer returned null for a save without the field');
  if ('shootoutOrder' in back) fail('a save written without the field came back with one');
  if (shootoutOrderOf(back) !== null) fail('shootoutOrderOf reads an order off a save that has none');
  const probe = fixture?.rows?.find(r => r.decidedBy === 'pens') ?? fixture?.rows?.[0];
  if (probe) {
    const got = row(playCup(back, probe.seed));
    if (JSON.stringify(got) !== JSON.stringify(probe)) fail(`the loaded old save played seed ${probe.seed} as ${JSON.stringify(got)}, the fixture says ${JSON.stringify(probe)}`);
    else console.log(`   loaded old save, seed ${probe.seed}: ${probe.decidedBy}${probe.decidedBy === 'pens' ? `, shootout ${probe.shootoutWon ? 'won' : 'lost'}` : ''}, same as the fixture`);
  }
  const ids = back.squad.filter(p => !p.onLoan).slice(0, 4).map(p => p.id);
  const set = setShootoutOrder(back, ids);
  if (!set) abort('setShootoutOrder refused four men from the squad');
  if (!saveCareer(set)) fail('saveCareer refused a save with an order');
  const again = loadCareer();
  if (!again || JSON.stringify(again.shootoutOrder) !== JSON.stringify(ids)) fail(`an order of four did not survive save and load: ${JSON.stringify(again?.shootoutOrder)}`);
  if (setShootoutOrder(back, ['not-a-player']) !== null) fail('setShootoutOrder accepted a man who is not in the squad');
  /* onLoan is a loan signing, a man on loan TO the club who can start, so he
     can be listed; a man sent out on loan has left the squad for loanedOut. */
  const loanee = { ...back.squad[0], id: 'loanee-782', name: 'Loan Signing', onLoan: true, loanFrom: 'Elsewhere FC' };
  const withLoanee = { ...back, squad: [...back.squad, loanee] };
  const listedLoanee = setShootoutOrder(withLoanee, [loanee.id]);
  if (!listedLoanee || JSON.stringify(shootoutOrderOf(listedLoanee)) !== JSON.stringify([loanee.id])) fail('setShootoutOrder refused a loan signing, who is in the squad and can start');
  const cleared = setShootoutOrder(set, []);
  if (!cleared || 'shootoutOrder' in cleared) fail('clearing the order left the field on the save');
  console.log(`   order of ${ids.length} kept through save and load, a stranger refused, a loan signing listed, an empty list takes the field off`);
}

/* ================================================================== */
for (const f of [ENTRY, BUNDLE, `${TMP}/${TAG}.control.engine.ts`]) { try { fs.unlinkSync(f); } catch { /* not there */ } }
if (failures) {
  console.error(`\nsimCmShootoutOrder: ${failures} FAILURE(S)`);
  process.exit(1);
}
console.log('\nsimCmShootoutOrder: all sections passed');
