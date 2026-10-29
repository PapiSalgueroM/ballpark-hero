/**
 * Round 1543 tool: Stadium Tycoon's goal, win and streak ladder under the scoring
 * law, measured against the pre-law base record, and each rung's threshold picked
 * by the rule (brief-1543 section 1, brief-1539 design 3.3, critic-1539 items 2, 4
 * and 14, the lead's rulings on Q2 to Q4). A tool, not a gate: its name does not
 * start with sim, so runAllSims skips it, as scripts/predictTycoonScorelines.mjs.
 *
 * It bundles the lib as it stands, plays the `pace` bot of scripts/lib/tycoonBots.mjs
 * with `counts` on seeds 1 to 60 for 240 minutes at the hook's cadence, and reads the
 * base record (scripts/data/tycoonScorelineBaseline.json, pace, seeds 1 to 40, 300
 * minutes, `firsts` at the old thresholds and the 120 and 240 minute checkpoints).
 *
 * The rule, applied to every rung (an ACHIEVEMENTS or MILESTONES row whose hit reads
 * totalGoals, totalWins or streak; pairs that share a threshold share a row):
 *  - ON TARGET: the head median minute is within 25 percent of the base median minute
 *    or within two matches (4.2 minutes), whichever is wider, on the calibration
 *    seeds 1 to 20 and the holdout 21 to 40 (each against its own base median); the
 *    third set 41 to 60 against the base calibration median (the record stops at 40).
 *  - FIXED by the lead: the five win streak pair and as10 (ten is where streakMult
 *    and the fan pull stop rising). Printed, never picked.
 *  - A rung on target at its old threshold is not moved.
 *  - An off target rung the base reached in its 300 minutes is MINUTE anchored: the
 *    NICE value at or below its old threshold whose head calibration median is
 *    nearest the base calibration median by |ln(head / base)|, ties to the larger;
 *    it must then be on target on all three sets, or STOP.
 *  - A rung the base never reached (its base median "later" on both sets) is MATCH
 *    anchored: old x (head per match rate / base per match rate), each rate the
 *    median over the calibration seeds of (count at 240 minus count at 120) / (matches
 *    at 240 minus matches at 120); the nearest NICE value by |ln|, ties to the larger,
 *    never above old and above the new value of the rung below it, or STOP.
 *  - Every family must still rise strictly, or STOP.
 * Medians are simTycoonScorelines S8's (v[floor(n / 2)], a rung never reached counts
 * as later). The bootstrap error of each median (1,000 resamples, seeded) and its
 * headroom to the picking edge are printed for the builder; they are not a verdict.
 * The picks are made on whatever ladder the lib carries, so run after the edit it is
 * the re-measure (critic item 14): a moved rung reads "kept" when its current value
 * is still the pick.
 *
 *   node scripts/measureTycoonLadder.mjs
 * Exit 0 every rung resolves, 1 a STOP fired (it names the rung), 2 could not run.
 * The table is also written as JSON to $RC_OUT/ladder.json when RC_OUT is set.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDt, bundleTs, freshTmp, runBot, mulberry } from './lib/tycoonBots.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.join(ROOT, 'src/lib/stadiumTycoon.ts');
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const abort = m => { console.error(`ABORT: ${m}`); process.exit(2); };
const BASE = JSON.parse(read(path.join(ROOT, 'scripts/data/tycoonScorelineBaseline.json')));
const DT = readDt(ROOT);
const MINUTES = 240;
const MATCH = 2.1;
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const SETS = { cal: range(1, 20), hold: range(21, 40), third: range(41, 60) };
const NICE = [...range(1, 10), 12, 15, 20, 25, 30, 35, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000];
const FIELD = { goals: 'totalGoals', wins: 'totalWins', streak: 'streak' };
/* The ladder before Round 1543, typed from c50eb038 (unchanged through Round 1539,
   1afe5364): each row's ids, the counter its hit reads and its old threshold. */
const OLD = [
  { ids: ['win1', 'aw1'], counter: 'wins', old: 1 },
  { ids: ['win10', 'aw10'], counter: 'wins', old: 10 },
  { ids: ['win50', 'aw50'], counter: 'wins', old: 50 },
  { ids: ['aw150'], counter: 'wins', old: 150 },
  { ids: ['aw400'], counter: 'wins', old: 400 },
  { ids: ['goals25', 'ag25'], counter: 'goals', old: 25 },
  { ids: ['ag100'], counter: 'goals', old: 100 },
  { ids: ['ag500'], counter: 'goals', old: 500 },
  { ids: ['ag2000'], counter: 'goals', old: 2000 },
  { ids: ['streak5', 'as5'], counter: 'streak', old: 5, fixed: 'the lead: five stays five (Q2, critic item 4)' },
  { ids: ['as10'], counter: 'streak', old: 10, fixed: 'the lead: ten is where streakMult and the fan pull stop rising (Q2)' },
];
const OLD_IDS = OLD.flatMap(r => r.ids);

const tmp = freshTmp('tycoon-ladder');
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ } });
const T = await bundleTs(ROOT, LIB, tmp, 'ladder');
const started = Date.now();
const secs = () => `${((Date.now() - started) / 1000).toFixed(0)} s`;

/* ---------- the rungs, found by the hit functions' code, thresholds by probing ---------- */
const fresh = T.newTycoon(0);
const rows = [...T.ACHIEVEMENTS, ...T.MILESTONES];
const found = rows.filter(r => /\.(totalGoals|totalWins|streak)\b/.test(String(r.hit))).map(r => r.id);
const missing = OLD_IDS.filter(id => !found.includes(id));
const extra = found.filter(id => !OLD_IDS.includes(id));
if (missing.length || extra.length) abort(`the rungs found by code are not the sixteen of the ladder (missing ${missing.join(' ') || 'none'}, a new rung needs an anchor: ${extra.join(' ') || 'none'})`);
const thresholdOf = id => {
  const row = rows.find(r => r.id === id); const field = FIELD[OLD.find(r => r.ids.includes(id)).counter];
  for (let k = 0; k <= 5000; k += 1) if (row.hit({ ...fresh, [field]: k })) return k;
  return NaN;
};
for (const r of OLD) {
  const cur = r.ids.map(thresholdOf);
  if (cur.some(c => c !== cur[0]) || !Number.isFinite(cur[0])) abort(`${r.ids.join(' and ')} do not share one threshold (${cur.join(', ')})`);
  r.current = cur[0];
}
let cap = 0;
while (cap < 50 && T.streakMult({ ...fresh, streak: cap + 1 }) > T.streakMult({ ...fresh, streak: cap })) cap += 1;

/* ---------- the runs ---------- */
const runs = {};
for (const [set, seeds] of Object.entries(SETS)) runs[set] = seeds.map(seed => runBot(T, { policy: 'pace', seed, minutes: MINUTES, dt: DT, counts: true }));
for (const r of OLD) for (const set of Object.keys(SETS)) for (const run of runs[set]) for (const id of r.ids) {
  const a = run.firsts[id]; const b = run.countFirsts[r.counter][r.current];
  if (a !== b) abort(`seed ${run.seed}: ${id} was earned at ${a} but ${r.counter} reached ${r.current} at ${b}, so the counter and the badge disagree`);
}
console.log(`Round 1543: the ladder, pace at dt ${DT}s, ${MINUTES} minutes, seeds 1 to 60 [${secs()}]`);

/* ---------- medians, errors, the target ---------- */
const median = xs => { const v = xs.map(x => (x === null || x === undefined ? Infinity : x)).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
const r3 = x => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : 'later');
const inMatches = x => (Number.isFinite(x) ? `${r3(x)} (${r3(x / MATCH)} m)` : 'later');
function bootSE(xs) {
  const roll = mulberry(1543); const meds = [];
  for (let i = 0; i < 1000; i += 1) meds.push(median(xs.map(() => xs[Math.floor(roll() * xs.length)])));
  const v = meds.filter(Number.isFinite); if (v.length < meds.length) return NaN;
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
}
const tolOf = base => Math.max(0.25 * base, 2 * MATCH);
const onTarget = (head, base) => Number.isFinite(head) && Number.isFinite(base) && Math.abs(head - base) <= tolOf(base) + 1e-6;
/** Headroom to the nearer edge of the picking band, minutes (negative when outside). */
const headroom = (head, base) => (Number.isFinite(head) && Number.isFinite(base) ? tolOf(base) - Math.abs(head - base) : -Infinity);
const baseRuns = { cal: BASE.policies.pace.filter(r => r.seed >= 1 && r.seed <= 20), hold: BASE.policies.pace.filter(r => r.seed >= 21 && r.seed <= 40) };
if (baseRuns.cal.length !== 20 || baseRuns.hold.length !== 20) abort('the base record does not hold pace seeds 1 to 40');
const baseMin = (r, set) => median(baseRuns[set === 'third' ? 'cal' : set].map(b => b.firsts[r.ids[0]]));
for (const r of OLD) for (const set of ['cal', 'hold']) for (const b of baseRuns[set]) for (const id of r.ids.slice(1)) {
  if (b.firsts[id] !== b.firsts[r.ids[0]]) abort(`base seed ${b.seed}: ${id} and ${r.ids[0]} were earned at different minutes`);
}
const headAt = (r, k, set) => median(runs[set].map(run => run.countFirsts[r.counter][k]));
const seAt = (r, k, set) => bootSE(runs[set].map(run => run.countFirsts[r.counter][k] ?? Infinity));
const rate = (cps, field) => median(cps.map(c => (c[240][field] - c[120][field]) / (c[240].matches - c[120].matches)));
const rates = counter => {
  const f = counter === 'goals' ? 'goals' : 'wins';
  return { base: rate(baseRuns.cal.map(b => b.checkpoints), f), head: rate(runs.cal.map(run => run.checkpoints), f),
    baseHold: rate(baseRuns.hold.map(b => b.checkpoints), f), headHold: rate(runs.hold.map(run => run.checkpoints), f) };
};
const nearest = (target, options) => options.reduce((best, c) => {
  const d = Math.abs(Math.log(c / target)); const bd = Math.abs(Math.log(best / target));
  return d < bd - 1e-12 || (Math.abs(d - bd) <= 1e-12 && c > best) ? c : best;
}, options[0]);

/* ---------- the rule ---------- */
const stops = []; const table = []; const chosen = {};
const sets3 = Object.keys(SETS);
const fmtSets = (r, k) => sets3.map(s => `${s} ${inMatches(headAt(r, k, s))}`).join(', ');
const fmtRoom = (r, k, row) => sets3.map(s => { const b = s === 'third' ? row.base.cal : row.base[s]; return `${s} ${r3(headroom(headAt(r, k, s), b))} (se ${r3(seAt(r, k, s))})`; }).join(', ');
for (const r of OLD) {
  const name = r.ids.join(' / ');
  const prior = table.filter(t => t.counter === r.counter);
  const below = prior.length ? prior[prior.length - 1].value : 0;
  const row = { ids: r.ids, counter: r.counter, old: r.old, current: r.current, base: { cal: baseMin(r, 'cal'), hold: baseMin(r, 'hold') } };
  console.log('');
  console.log(`${name} (${r.counter}, old ${r.old}, lib ${r.current}): base cal ${inMatches(row.base.cal)}, hold ${inMatches(row.base.hold)}; head at ${r.current}: ${fmtSets(r, r.current)}`);
  if (r.fixed) {
    row.kind = 'fixed'; row.value = r.old;
    if (r.current !== r.old) stops.push(`${name}: the lib carries ${r.current}, but ${r.fixed}`);
    console.log(`   FIXED at ${r.old}: ${r.fixed}${r.ids.includes('as10') ? `; streakMult stops rising at ${cap}` : ''}; on target cal ${onTarget(headAt(r, r.old, 'cal'), row.base.cal)}, hold ${onTarget(headAt(r, r.old, 'hold'), row.base.hold)} (printed, not a verdict)`);
  } else if (!Number.isFinite(row.base.cal) && !Number.isFinite(row.base.hold)) {
    row.kind = 'matches';
    const rt = rates(r.counter); row.rates = rt;
    const target = (r.old * rt.head) / rt.base; const targetHold = (r.old * rt.headHold) / rt.baseHold;
    const options = NICE.filter(c => c <= r.old && c > below);
    row.target = target; row.targetHold = targetHold;
    if (!options.length) { stops.push(`${name}: no NICE value at or below ${r.old} and above ${below}`); row.value = NaN; } else row.value = nearest(target, options);
    const holdPick = options.length ? nearest(targetHold, options) : NaN;
    console.log(`   MATCH anchored: per match base ${r3(rt.base)} (hold ${r3(rt.baseHold)}), head ${r3(rt.head)} (hold ${r3(rt.headHold)}); old x head / base ${r3(target)} (hold ${r3(targetHold)}): PICK ${row.value} (the hold rates pick ${holdPick})`);
    console.log(`   head at ${row.value}: ${fmtSets(r, row.value)}`);
  } else {
    const keep = r.current === r.old && onTarget(headAt(r, r.old, 'cal'), row.base.cal) && onTarget(headAt(r, r.old, 'hold'), row.base.hold);
    if (keep) {
      row.kind = 'kept'; row.value = r.old;
      console.log(`   ON TARGET at ${r.old}, not moved; headroom ${fmtRoom(r, r.old, row)}`);
    } else {
      row.kind = 'minutes';
      const options = NICE.filter(c => c <= r.old && c > below);
      const score = c => { const h = headAt(r, c, 'cal'); return Number.isFinite(h) ? Math.abs(Math.log(h / row.base.cal)) : Infinity; };
      row.candidates = options.map(c => [c, r3(headAt(r, c, 'cal'))]);
      console.log(`   candidates, head cal median: ${options.map(c => `${c} ${r3(headAt(r, c, 'cal'))}`).join(', ')}`);
      row.value = options.reduce((best, c) => (score(c) < score(best) - 1e-12 || (Math.abs(score(c) - score(best)) <= 1e-12 && c > best) ? c : best), options[0]);
      const ok = sets3.map(s => onTarget(headAt(r, row.value, s), s === 'third' ? row.base.cal : row.base[s]));
      row.onTarget = ok;
      console.log(`   PICK ${row.value}: ${fmtSets(r, row.value)}; on target ${sets3.map((s, i) => `${s} ${ok[i]}`).join(', ')}`);
      console.log(`   headroom to the picking edge ${fmtRoom(r, row.value, row)}`);
      if (!ok.every(Boolean)) stops.push(`${name}: ${row.value} is not on target on every set (${sets3.filter((s, i) => !ok[i]).join(' ')})`);
    }
  }
  row.verdict = row.value === r.current ? (r.current === r.old ? 'unchanged' : 'kept: the lib already carries the pick') : (r.current === r.old ? `move ${r.old} to ${row.value}` : `RE-PICK: the lib carries ${r.current}, the rule now picks ${row.value}`);
  console.log(`   => ${row.verdict}`);
  row.minutes = Object.fromEntries(sets3.map(s => [s, { atValue: r3(headAt(r, row.value, s)), atOld: r3(headAt(r, r.old, s)), atCurrent: r3(headAt(r, r.current, s)), se: r3(seAt(r, row.value, s)) }]));
  table.push(row); for (const id of r.ids) chosen[id] = row.value;
}
for (const counter of Object.keys(FIELD)) {
  const vals = table.filter(t => t.counter === counter).map(t => t.value);
  if (vals.some((v, i) => i > 0 && !(v > vals[i - 1]))) stops.push(`the ${counter} family does not rise strictly: ${vals.join(', ')}`);
}
console.log('');
console.log(`chosen: ${OLD.map(r => `${r.ids.join('/')} ${r.old} -> ${chosen[r.ids[0]]}`).join(', ')}`);
if (process.env.RC_OUT) {
  fs.mkdirSync(process.env.RC_OUT, { recursive: true });
  fs.writeFileSync(path.join(process.env.RC_OUT, 'ladder.json'), JSON.stringify({ dt: DT, minutes: MINUTES, sets: SETS, streakCap: cap, table, chosen, stops }, (k, v) => (v === Infinity ? 'later' : v), 2));
}
if (stops.length) { for (const s of stops) console.error(`STOP: ${s}`); console.log(`measureTycoonLadder: ${stops.length} STOP${stops.length === 1 ? '' : 's'} [${secs()}]`); process.exit(1); }
console.log(`measureTycoonLadder: every rung resolves, ${table.filter(t => t.value !== t.current).length} row(s) to move [${secs()}]`);
process.exit(0);
