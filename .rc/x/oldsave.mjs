/* Review probe: an OLD Club Manager save in the middle of a cup tie, written
   by origin/main's engine (its own saveCareer), loaded by HEAD's loadCareer
   and settled. Paused at the interval, and paused with extra time drawn;
   against a side that names an eleven and against a thin one; with and
   without a shootout order. */
import { ROOT, MAIN_SHA, bundleEngine, mainTree, withSeed, sortedJSON, reachCup, cupOppOf, classOf, storage, fail, done } from './sholib.mjs';

const head = (await bundleEngine(ROOT, 'head')).cm;
const main = (await bundleEngine(mainTree(), 'main')).cm;
const KEY = head.SAVE_KEY;
console.log(`oldsave: saves written by origin/main ${MAIN_SHA.slice(0, 8)}, loaded by HEAD; key ${KEY}`);
const CLUB = 'Real Madrid';
const N = Number(process.env.OLDSAVE_N || 250);

function writeOld(state) {
  storage.load({});
  if (!main.saveCareer(state)) throw new Error('main refused to save');
  return storage.dump();
}
function loadWith(engine, dump) {
  storage.load(dump);
  const s = engine.loadCareer();
  if (!s) throw new Error('loadCareer gave nothing back');
  return s;
}
const finish = (engine, state, seed) => withSeed(seed, () => {
  const r = engine.playNextEntry(state, { skipHalftime: true });
  return { r, next: Math.random() };
});

for (const [baseSeed, want] of [[782_002, 'full'], [782_001, 'thin']]) {
  const at = reachCup(main, CLUB, baseSeed);
  const opp = cupOppOf(at);
  const roster = main.oppRosterFor(at, opp);
  const cls = classOf(roster);
  if (cls !== want) console.log(`NOTE: seed ${baseSeed} draws ${opp} (${cls}), wanted ${want}`);
  const ids = main.resolveXI(at).filter(Boolean).filter(p => p.position !== 'GK').slice(0, 5).map(p => p.id);
  for (const withOrder of [false, true]) {
    const base = withOrder ? main.setShootoutOrder(at, ids) : at;
    /* a) paused at the interval */
    const pausedSaves = [];
    for (let K = 0; K < 400 && pausedSaves.length < 3; K++) {
      const h = withSeed(40_000 + K, () => main.playNextEntry(base));
      if (h.kind !== 'halftime' || !h.state.live) continue;
      /* level at the break, so a shootout is in reach */
      if (h.state.live.myGoals !== h.state.live.oppGoals) continue;
      pausedSaves.push({ kind: 'interval', K, dump: writeOld(h.state) });
    }
    /* b) paused with extra time drawn */
    for (let K = 0; K < 800 && pausedSaves.length < 5; K++) {
      const h = withSeed(41_000 + K, () => main.playNextEntry(base));
      if (h.kind !== 'halftime') continue;
      const s2 = withSeed(42_000 + K, () => main.startSecondHalf(h.state));
      if (!s2 || !main.isExtraTimeDue(s2)) continue;
      const s3 = withSeed(43_000 + K, () => main.startExtraTime(s2));
      if (!s3) continue;
      pausedSaves.push({ kind: 'extra time drawn', K, dump: writeOld(s3) });
    }
    if (pausedSaves.length < 5) fail(`${opp}, order ${withOrder}: only ${pausedSaves.length} old saves could be made`);
    let settled = 0; let pens = 0; let equal = 0; let total = 0; let withKicks = 0; let clean = 0; let liveLeft = 0;
    for (const sv of pausedSaves) {
      const mine = loadWith(head, sv.dump);
      const theirs = loadWith(main, sv.dump);
      if (!mine.live || mine.live.week !== mine.week) { fail(`${opp} ${sv.kind}: HEAD loaded the save without its live match`); continue; }
      if (sortedJSON(mine) !== sortedJSON(theirs)) fail(`${opp} ${sv.kind}: HEAD and main read the same old save differently`);
      if (withOrder !== Array.isArray(mine.shootoutOrder)) fail(`${opp} ${sv.kind}: the order did not survive the load (${JSON.stringify(mine.shootoutOrder)})`);
      const per = Math.ceil(N / pausedSaves.length);
      for (let i = 0; i < per; i++) {
        const seed = 44_000 + sv.K * 7 + i;
        total += 1;
        let a; let b;
        try { a = finish(head, mine, seed); } catch (e) { fail(`${opp} ${sv.kind} seed ${seed}: HEAD threw settling the old save: ${String(e.message).slice(0, 160)}`); continue; }
        b = finish(main, theirs, seed);
        if (a.r.kind !== 'match' || !a.r.report) { fail(`${opp} ${sv.kind} seed ${seed}: HEAD did not settle (${a.r.kind})`); continue; }
        settled += 1;
        if (a.r.state.live) liveLeft += 1;
        if (sortedJSON({ r: a.r.report, s: a.r.state }) === sortedJSON({ r: b.r.report, s: b.r.state }) && a.next === b.next) equal += 1;
        if (a.r.report.decidedBy === 'pens') {
          pens += 1;
          const kicks = a.r.report.shootout?.kicks;
          if (withOrder) {
            if (!kicks?.length) { fail(`${opp} ${sv.kind} seed ${seed}: an order set and no kicks`); continue; }
            withKicks += 1;
            const first11 = kicks.filter(k => k.side === 'opp').slice(0, 11).map(k => k.taker);
            if (new Set(first11).size === first11.length) clean += 1;
            else fail(`${opp} ${sv.kind} seed ${seed}: ${first11.join(', ')}`);
          } else if (kicks) fail(`${opp} ${sv.kind} seed ${seed}: no order set and the report carries kicks`);
        }
      }
    }
    console.log(`${opp} (${cls}, ${roster.length} names), order ${withOrder ? 'set' : 'unset'}: ${pausedSaves.length} old saves (${pausedSaves.map(s => s.kind).join(', ')}); ${settled} of ${total} settled, ${pens} on penalties${withOrder ? ` (${withKicks} with kicks, ${clean} with nobody of theirs twice in eleven)` : ''}, ${equal} equal to main in full, live left on the save in ${liveLeft}`);
    if (settled !== total) fail(`${opp}, order ${withOrder}: ${total - settled} did not settle`);
    if (liveLeft) fail(`${opp}, order ${withOrder}: ${liveLeft} saves still carry the live match after full time`);
    if (pens < 8) fail(`${opp}, order ${withOrder}: only ${pens} went to penalties, below a floor of 8`);
    const mustEqual = !(withOrder && cls === 'thin');
    if (mustEqual && equal !== total) fail(`${opp}, order ${withOrder}: ${total - equal} of ${total} differ from main, and this is not the thin side with an order`);
    if (!mustEqual && equal === total) fail(`${opp}: the thin side with an order equals main on every seed, so the fix was never walked`);
  }
}
done('oldsave');
