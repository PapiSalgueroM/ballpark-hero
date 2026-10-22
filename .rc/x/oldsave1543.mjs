// Reviewer probe for Round 1543 (runner only). Saves MADE BY THE BASE (bac65fb0b, checked out at /tmp/base with
// node_modules linked) are loaded and ticked by the head, beside the base itself on the same roll stream.
//   git worktree add /tmp/base bac65fb0b && ln -s "$PWD/node_modules" /tmp/base/node_modules && node .rc/x/oldsave1543.mjs
import fs from 'node:fs';
import path from 'node:path';

const HEAD = process.cwd(); const BASE = process.env.OLDSAVE_BASE || '/tmp/base';
const bots = await import(path.join(BASE, 'scripts/lib/tycoonBots.mjs'));
const tmp = bots.freshTmp('oldsave1543');
const B = await bots.bundleTs(BASE, path.join(BASE, 'src/lib/stadiumTycoon.ts'), tmp, 'base');
const H = await bots.bundleTs(HEAD, path.join(HEAD, 'src/lib/stadiumTycoon.ts'), tmp, 'head');
const DT = bots.readDt(BASE); const NOW = 1_800_000_000_000;
// Typed here on purpose (a reviewer's own table, not read from either lib): id, counter, base threshold, head threshold.
const RUNGS = [['win1', 'totalWins', 1, 1], ['aw1', 'totalWins', 1, 1], ['win10', 'totalWins', 10, 8], ['aw10', 'totalWins', 10, 8],
  ['win50', 'totalWins', 50, 35], ['aw50', 'totalWins', 50, 35], ['aw150', 'totalWins', 150, 125], ['aw400', 'totalWins', 400, 300],
  ['goals25', 'totalGoals', 25, 10], ['ag25', 'totalGoals', 25, 10], ['ag100', 'totalGoals', 100, 30], ['ag500', 'totalGoals', 500, 75],
  ['ag2000', 'totalGoals', 2000, 250], ['streak5', 'streak', 5, 5], ['as5', 'streak', 5, 5], ['as10', 'streak', 10, 10]];
// Control: OLDSAVE_CONTROL=table types the head's thresholds as the old ones, so the extra id check must go red.
if (process.env.OLDSAVE_CONTROL === 'table') for (const r of RUNGS) r[3] = r[2];
const LADDER = new Set(RUNGS.map(r => r[0]));
let failCount = 0;
const fails = []; const fail = (what, m) => { if (fails.length < 40) fails.push(`${what}: ${m}`); failCount += 1; };
const ids = s => [...(s.ach ?? []), ...(s.claimed ?? [])];
const saves = [];
// A. Bot saves made by the base: pace and overinvest, seeds 1 to 10, the state at 5 to 240 minutes.
for (const policy of ['pace', 'overinvest']) for (let seed = 1; seed <= 10; seed += 1) {
  const run = bots.runBot(B, { policy, seed, minutes: 240, dt: DT, keepStates: true });
  for (const [c, st] of Object.entries(run.states)) saves.push({ name: `${policy} s${seed} m${c}`, raw: B.serializeTycoon(st, NOW), kind: 'bot' });
}
const botCount = saves.length;
// B. Boundary saves: every counter one under, at and one over each threshold, the base settles its own firsts.
const G = [0, 9, 10, 11, 24, 25, 29, 30, 74, 75, 99, 100, 249, 250, 499, 500, 1999, 2000];
const W = [0, 7, 8, 9, 10, 34, 35, 49, 50, 124, 125, 149, 150, 299, 300, 399, 400];
for (const g of G) for (const w of W) for (const k of [0, 4, 5, 10]) {
  const s = { ...B.newTycoon(0), totalGoals: g, totalWins: w, streak: k };
  saves.push({ name: `edge g${g} w${w} k${k}`, raw: B.serializeTycoon(B.tick(s, 2, () => 0.999).state, NOW), kind: 'edge' });
}
// C. The committed corpus and the twelve histories (the base tree's copies).
for (const e of JSON.parse(fs.readFileSync(path.join(BASE, 'src/test/fixtures/tycoonSaves.json'), 'utf8')).entries) saves.push({ name: `corpus ${e.name}`, raw: e.raw, kind: 'corpus' });
for (const [i, c] of JSON.parse(fs.readFileSync(path.join(BASE, 'scripts/data/allPlayersValueBaseline.json'), 'utf8')).cases.entries()) saves.push({ name: `history ${i + 1}`, raw: B.serializeTycoon(c.initial, NOW), kind: 'history' });

const stats = { loads: 0, identicalLoads: 0, identicalTicks: 0, noExtra: 0, withExtra: 0, maxToasts: 0, toastHist: {}, maxPay: 0, maxPaySec: 0, awayExtraPay: 0, awayMax: 0, rollback: 0 };
for (const sv of saves) {
  const lb = B.deserializeTycoon(sv.raw, NOW); const lh = H.deserializeTycoon(sv.raw, NOW);
  if (!lb || !lh) { if (!!lb !== !!lh) fail(sv.name, 'one side loads and the other does not'); continue; }
  stats.loads += 1;
  if (JSON.stringify(lb) === JSON.stringify(lh)) stats.identicalLoads += 1; else fail(sv.name, 'the head loads it differently from the base');
  const rb = B.tick(lb, 0.2, bots.mulberry(7)); const rh = H.tick(lh, 0.2, bots.mulberry(7));
  const hb = new Set(ids(rb.state)); const hh = new Set(ids(rh.state));
  for (const id of ids(lb)) if (!hh.has(id)) fail(sv.name, `lost ${id} on its first head tick`);
  for (const id of hb) if (!hh.has(id)) fail(sv.name, `the base earned ${id} and the head did not`);
  for (const arr of [rh.state.ach ?? [], rh.state.claimed ?? []]) if (new Set(arr).size !== arr.length) fail(sv.name, 'a duplicate id after the first tick');
  const extra = [...hh].filter(id => !hb.has(id)).sort();
  const want = RUNGS.filter(([id, f, , nw]) => (rh.state[f] ?? 0) >= nw && !hb.has(id)).map(r => r[0]).sort();
  if (extra.join(' ') !== want.join(' ')) fail(sv.name, `extra ids ${extra.join(' ') || 'none'}, expected ${want.join(' ') || 'none'}`);
  if (extra.some(id => !LADDER.has(id))) fail(sv.name, `a non ladder id appeared: ${extra.join(' ')}`);
  for (const k of new Set([...Object.keys(rb.state), ...Object.keys(rh.state)])) {
    if (['ach', 'claimed', 'money', 'lifetime'].includes(k)) continue;
    if (JSON.stringify(rb.state[k]) !== JSON.stringify(rh.state[k])) fail(sv.name, `field ${k} differs after the first tick`);
  }
  const mPay = evs => evs.filter(e => e.kind === 'milestone').reduce((a, e) => a + (e.amount ?? 0), 0);
  const payDiff = mPay(rh.events) - mPay(rb.events);
  if (Math.abs((rh.state.money - rb.state.money) - payDiff) > 1e-6 * Math.max(1, Math.abs(rb.state.money))) fail(sv.name, `money moved by ${rh.state.money - rb.state.money}, the extra milestone pay is ${payDiff}`);
  const other = evs => JSON.stringify(evs.filter(e => e.kind !== 'ach' && e.kind !== 'milestone'));
  if (other(rb.events) !== other(rh.events)) fail(sv.name, 'a non badge event differs on the first tick');
  const toasts = rh.events.filter(e => e.kind === 'ach' || e.kind === 'milestone').length - rb.events.filter(e => e.kind === 'ach' || e.kind === 'milestone').length;
  if (toasts !== extra.length) fail(sv.name, `${toasts} extra toasts for ${extra.length} extra ids`);
  if (!extra.length) {
    stats.noExtra += 1;
    if (B.serializeTycoon(rb.state, NOW + 1000) === H.serializeTycoon(rh.state, NOW + 1000)) stats.identicalTicks += 1; else fail(sv.name, 'no lowered rung reached, yet the head save differs from the base save');
  } else {
    stats.withExtra += 1; stats.toastHist[toasts] = (stats.toastHist[toasts] ?? 0) + 1;
    if (sv.kind === 'bot') { stats.maxToasts = Math.max(stats.maxToasts, toasts); stats.maxPay = Math.max(stats.maxPay, payDiff); stats.maxPaySec = Math.max(stats.maxPaySec, payDiff / Math.max(1, H.incomePerSec(lh))); }
  }
  // Once only: a second head tick grants nothing that was already due on the first.
  const rh2 = H.tick(rh.state, 0.2, bots.mulberry(8));
  const due = [...H.ACHIEVEMENTS, ...H.MILESTONES].filter(x => x.hit(rh.state)).map(x => x.id);
  const again = rh2.events.filter(e => e.kind === 'ach' || e.kind === 'milestone');
  const newIds2 = ids(rh2.state).filter(id => !hh.has(id));
  for (const id of newIds2) if (due.includes(id)) fail(sv.name, `${id} was due on the first tick but came on the second`);
  if (again.length !== newIds2.length) fail(sv.name, `second tick: ${again.length} badge events for ${newIds2.length} new ids`);
  // A rollback to the base keeps every id the head granted.
  const back = B.deserializeTycoon(H.serializeTycoon(rh.state, NOW), NOW);
  if (back && ids(rh.state).every(id => ids(back).includes(id))) stats.rollback += 1; else fail(sv.name, 'the base drops an id of the head save');
  // The trip path: one away matchday on each side, the extra pay the card's milestone line would show.
  if (typeof H.playAwayMatchdays === 'function' && sv.kind !== 'edge') {
    let ab = null; let ah = null; let eb = ''; let eh = '';
    try { ab = B.playAwayMatchdays(lb, 1, bots.mulberry(9)); } catch (e) { eb = String(e.message); }
    try { ah = H.playAwayMatchdays(lh, 1, bots.mulberry(9)); } catch (e) { eh = String(e.message); }
    if (eb !== eh) fail(sv.name, `away: base threw "${eb}", head threw "${eh}"`);
    if (!ab || !ah) continue;
    const d = mPay(ah.events) - mPay(ab.events);
    for (const id of ids(lb)) if (!ids(ah.state).includes(id)) fail(sv.name, `lost ${id} on an away matchday`);
    if (d > 0) { stats.awayExtraPay += 1; stats.awayMax = Math.max(stats.awayMax, d); }
  }
}
console.log(`oldsave1543: ${saves.length} saves made by the base (${botCount} bot, ${saves.filter(s => s.kind === 'edge').length} boundary, ${saves.filter(s => s.kind === 'corpus').length} corpus, ${saves.filter(s => s.kind === 'history').length} histories), ${stats.loads} load on both`);
console.log(`  loads byte identical ${stats.identicalLoads} of ${stats.loads}; no lowered rung reached ${stats.noExtra}, of them byte identical after the first tick ${stats.identicalTicks}`);
console.log(`  lowered rungs granted on the first tick ${stats.withExtra}; extra toasts per save ${JSON.stringify(stats.toastHist)}; bot fleet max ${stats.maxToasts} toasts, max one off pay ${Math.round(stats.maxPay)} (${stats.maxPaySec.toFixed(1)} s of income)`);
console.log(`  rollback to the base keeps every id ${stats.rollback} of ${stats.loads}; one away matchday pays extra milestone money on ${stats.awayExtraPay} saves, max ${Math.round(stats.awayMax)}`);
for (const f of fails) console.error(`  FAIL: ${f}`);
console.log(`oldsave1543: ${failCount} failed`);
process.exit(failCount ? 1 : 0);
