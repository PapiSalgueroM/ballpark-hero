/* Review probe: HEAD's engine against a true bundle of origin/main (its own
   src out of git), with a shootout order SET.
   A) a side that names an eleven: every seed must be equal in full (the
      report with every kick, the save after it, the next match played on the
      same stream, and the next number off the stream).
   B) no order: equal in full, same seeds.
   C) a thin side: expected to differ, measured and printed.
   D) the pure function against the old expression on random full rosters. */
import fs from 'node:fs';
import { ROOT, OUT, MAIN_SHA, bundleEngine, mainTree, withSeed, sortedJSON, sha, reachCup, cupOppOf, classOf, fail, done } from './sholib.mjs';

const N = Number(process.env.PARITY_N || 400);
const head = (await bundleEngine(ROOT, 'head')).cm;
const main = (await bundleEngine(mainTree(), 'main')).cm;
console.log(`parity: HEAD tree ${ROOT} against origin/main ${MAIN_SHA.slice(0, 8)}; main exports shootoutRosterSide: ${typeof main.shootoutRosterSide}, head: ${typeof head.shootoutRosterSide}`);
if (typeof main.shootoutRosterSide === 'function') fail('the baseline already carries shootoutRosterSide, so it is not the tree before the commit');

const CLUB = 'Real Madrid';
function playTwo(engine, state, seed) {
  return withSeed(seed, () => {
    const r = engine.playNextEntry(state, { skipHalftime: true });
    if (r.kind !== 'match' || !r.report) throw new Error(`seed ${seed}: ${r.kind}`);
    /* The next entry on the same stream: the witness that the match after is unchanged. */
    let s = r.state;
    let nextRep = null;
    for (let g = 0; g < 6 && !nextRep; g++) {
      const n = engine.playNextEntry(s, { skipHalftime: true });
      s = n.state;
      if (n.kind === 'match') nextRep = n.report;
      if (n.kind === 'seasonOver') break;
    }
    return { rep: r.report, state: r.state, nextRep, after: s, next: Math.random() };
  });
}
const kicksOf = rep => (rep.shootout?.kicks ?? []).map(k => `${k.side}:${k.taker}${k.gen ? '*' : ''}:${k.result}:${k.mine}-${k.theirs}`).join(' | ');
const orderFor = (engine, s, n = 7) => {
  const xi = engine.resolveXI(s).filter(Boolean);
  const bench = s.squad.filter(p => !p.onLoan && !xi.some(x => x.id === p.id)).sort((a, b) => b.rating - a.rating);
  const outfield = xi.filter(p => p.position !== 'GK');
  const picks = [outfield[outfield.length - 1], outfield[0], outfield[Math.floor(outfield.length / 2)], outfield[1], outfield[outfield.length - 2]];
  return [picks[0].id, bench[0].id, picks[1].id, picks[2].id, bench[1].id, picks[3].id, picks[4].id].slice(0, n);
};

function compare(label, baseSeed, club, { order, seeds, seedFrom, expectEqual }) {
  const a0 = reachCup(head, club, baseSeed);
  const b0 = reachCup(main, club, baseSeed);
  if (sortedJSON(a0) !== sortedJSON(b0)) { fail(`${label}: the two engines do not reach the same cup week save from seed ${baseSeed}`); return null; }
  const opp = cupOppOf(a0);
  const roster = head.oppRosterFor(a0, opp);
  const cls = classOf(roster);
  let a = a0; let b = b0;
  if (order) {
    const ids = orderFor(head, a0);
    a = head.setShootoutOrder(a0, ids); b = main.setShootoutOrder(b0, ids);
    if (!a || !b) { fail(`${label}: setShootoutOrder refused`); return null; }
  }
  let pens = 0; let equal = 0; let pensEqual = 0; let kicks = 0; let nextPlayed = 0; let shown = 0;
  let headWon = 0; let mainWon = 0; let mainPens = 0; let distinctOk = 0; let genKicks = 0; let theirKicks = 0;
  for (let i = 0; i < seeds; i++) {
    const seed = seedFrom + i;
    const x = playTwo(head, a, seed);
    const y = playTwo(main, b, seed);
    const same = sortedJSON({ r: x.rep, s: x.state, n: x.nextRep, a: x.after }) === sortedJSON({ r: y.rep, s: y.state, n: y.nextRep, a: y.after }) && x.next === y.next;
    if (x.nextRep) nextPlayed += 1;
    if (y.rep.decidedBy === 'pens') { mainPens += 1; if (y.rep.shootoutWon) mainWon += 1; }
    if (x.rep.decidedBy === 'pens') {
      pens += 1;
      if (x.rep.shootoutWon) headWon += 1;
      kicks += x.rep.shootout?.kicks?.length ?? 0;
      const theirs = (x.rep.shootout?.kicks ?? []).filter(k => k.side === 'opp');
      theirKicks += theirs.length; genKicks += theirs.filter(k => k.gen).length;
      const first11 = theirs.slice(0, 11).map(k => k.taker);
      if (new Set(first11).size === first11.length) distinctOk += 1;
      if (same && kicksOf(x.rep) === kicksOf(y.rep)) pensEqual += 1;
    }
    if (same) equal += 1;
    else if (expectEqual && shown++ < 3) {
      console.log(`  differs, seed ${seed}: head ${x.rep.decidedBy} ${x.rep.homeGoals}-${x.rep.awayGoals} next ${x.next} | main ${y.rep.decidedBy} ${y.rep.homeGoals}-${y.rep.awayGoals} next ${y.next}`);
      console.log(`    head kicks: ${kicksOf(x.rep)}`);
      console.log(`    main kicks: ${kicksOf(y.rep)}`);
    }
  }
  console.log(`${label}: ${club} seed ${baseSeed} v ${opp} (${roster.length} on their roster, ${cls}), order ${order ? 'set' : 'unset'}: ${equal} of ${seeds} equal in full (report, save, next match, next draw); ${pens} on penalties, ${pensEqual} of them equal kick for kick; ${kicks} kicks; next match played in ${nextPlayed}`);
  if (order && pens) console.log(`   head: I won ${headWon} of ${pens} shootouts; main: ${mainWon} of ${mainPens}; their kicks ${theirKicks}, ${genKicks} by generated men; nobody twice in their first eleven: ${distinctOk} of ${pens}`);
  if (expectEqual) {
    if (equal !== seeds) fail(`${label}: ${seeds - equal} of ${seeds} seeds differ from origin/main`);
    if (order && cls !== 'full') fail(`${label}: the side is ${cls}, not one that names an eleven, so this is not the parity case`);
  }
  return { opp, cls, pens, equal, size: roster.length, headWon, mainWon, mainPens, distinctOk };
}

/* A) named eleven, order set, the harness's own base and three more clubs. */
let pensA = 0;
const rA = compare('A1', 782_002, CLUB, { order: true, seeds: N, seedFrom: 991_000, expectEqual: true });
pensA += rA?.pens ?? 0;
for (const [club, n] of [['Burnley', 150], ['Getafe', 150], ['Arsenal', 150]]) {
  let found = null;
  for (let k = 0; k < 30 && found === null; k++) {
    try {
      const s = withSeed(782_001 + k, () => head.startCareer(club));
      const opp = s.cupDraw?.[s.calendar.find(e => e.type === 'cup')?.cupRound];
      if (opp && classOf(head.oppRosterFor(s, opp)) === 'full') found = 782_001 + k;
    } catch (e) { console.log(`  ${club}: ${String(e.message).slice(0, 120)}`); break; }
  }
  if (found === null) { console.log(`A (${club}): no first cup tie against a named eleven in 30 careers, skipped`); continue; }
  const r = compare(`A (${club})`, found, club, { order: true, seeds: n, seedFrom: 992_000, expectEqual: true });
  pensA += r?.pens ?? 0;
}
console.log(`A total: ${pensA} shootouts against a named eleven compared kick for kick`);
if (pensA < 40) fail(`only ${pensA} shootouts against a named eleven were compared, below a floor of 40`);

/* B) no order: the one draw path, same seeds. */
compare('B1', 782_002, CLUB, { order: false, seeds: N, seedFrom: 991_000, expectEqual: true });
compare('B2 (thin tie, no order)', 782_001, CLUB, { order: false, seeds: N, seedFrom: 993_000, expectEqual: true });

/* C) the thin side, order set: the intended change, measured. */
const rC = compare('C1 (thin tie, order set)', 782_001, CLUB, { order: true, seeds: Math.max(N, 600), seedFrom: 993_000, expectEqual: false });
if (rC) {
  if (rC.cls !== 'thin') console.log(`   NOTE: seed 782001's tie is ${rC.cls} now, not thin`);
  if (rC.cls === 'thin' && rC.distinctOk !== rC.pens) fail(`C1: a man of theirs kicked twice inside their first eleven in ${rC.pens - rC.distinctOk} of ${rC.pens} shootouts`);
  if (rC.cls === 'thin' && rC.equal === Math.max(N, 600)) fail('C1: the thin tie is equal to main on every seed, so the fix was never walked');
}

/* D) the pure function against the old expression, random rosters of eleven or more. */
{
  const rnd = withSeed(4242, () => Array.from({ length: 200_000 }, () => Math.random()));
  let q = 0; const R = () => rnd[q++ % rnd.length];
  const POS = ['GK', 'CB', 'LB', 'RB', 'CM', 'CDM', 'CAM', 'LW', 'RW', 'ST'];
  let wrong = 0; let noKeeper = 0; const T = 3000;
  for (let t = 0; t < T; t++) {
    const size = 11 + Math.floor(R() * 20);
    const keeperless = R() < 0.3;
    const roster = Array.from({ length: size }, (_, i) => ({ n: `P${t}_${i}`, p: keeperless ? POS[1 + Math.floor(R() * 9)] : POS[Math.floor(R() * 10)], r: 55 + Math.floor(R() * 12), ...(R() < 0.2 ? { g: true } : {}) }));
    if (!roster.some(p => p.p === 'GK')) noKeeper += 1;
    const old = [...roster].sort((x, y) => y.r - x.r).slice(0, 11);
    const now = head.shootoutRosterSide(roster, 70);
    if (JSON.stringify(old) !== JSON.stringify(now)) wrong += 1;
  }
  console.log(`D: ${T} random rosters of eleven or more (${noKeeper} without a keeper, ratings full of ties): ${wrong} differ from the old expression`);
  if (wrong) fail(`D: shootoutRosterSide differs from the old expression on ${wrong} full rosters`);
  if (noKeeper < 300) fail('D: too few keeperless full rosters were drawn to mean anything');
}
fs.writeFileSync(`${OUT}/parity-done.txt`, 'ok\n');
done('parity');
