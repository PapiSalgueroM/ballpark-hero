// Review probe (run lens, Round 1532): old saves made by the BASE engine, loaded by the HEAD engine.
// Run on a runner from the repo root after: git worktree add --detach /tmp/rbase <base sha>
//   node .rc/x/oldsaves.mjs /tmp/rbase
// 1) identity: deserialize and re-serialize of every base save is the same JSON on base and head;
//    offlineEarnings Object.is on five horizons; incomePerSec, tapValue, fanGrowthPerSec,
//    prestigeThreshold, canPrestige equal; a head save loads on the base build (rollback) to the same
//    JSON and still writes baseMatchNo.
// 2) the no goal path: 300 seconds of tick with every roll 0.999 (nobody can score in either engine)
//    leaves money, lifetime, fanbase, streak, levels, matches and our own table row identical
//    (rival rows play on the league's own stream at the new chances by design, so they are dropped).
// 3) the returning player: the exact binomial win share of the loaded save's next match on base and on
//    head, printed by policy and checkpoint (information, no fence).
// Exit 1 if any identity check of 1 or 2 fails.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { runBot, readDt } from '../../scripts/lib/tycoonBots.mjs';

const ROOT = process.cwd();
const BASEDIR = process.argv[2];
if (!BASEDIR || !fs.existsSync(path.join(BASEDIR, 'src/lib/stadiumTycoon.ts'))) { console.error('no base tree'); process.exit(2); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oldsaves-'));
async function engine(dir, name) {
  const out = path.join(tmp, `${name}.mjs`);
  await build({ stdin: { contents: `export * from ${JSON.stringify(path.join(dir, 'src/lib/stadiumTycoon.ts'))};`, resolveDir: dir, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(dir, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')] });
  return import(pathToFileURL(out).href);
}
const B = await engine(BASEDIR, 'base');
const H = await engine(ROOT, 'head');
if (B.matchGap || !H.matchGap) { console.error('base and head engines are not the expected ones'); process.exit(2); }
const DT = readDt(ROOT);
function pmf(p) { const a = new Array(91).fill(0); if (p <= 0) a[0] = 1; else if (p >= 1) a[90] = 1; else { a[0] = Math.pow(1 - p, 90); for (let k = 1; k <= 90; k += 1) a[k] = a[k - 1] * ((91 - k) / k) * (p / (1 - p)); } return a; }
function winShare(p, q) { const a = pmf(p), b = pmf(q); let w = 0, cb = 0; for (let k = 0; k <= 90; k += 1) { w += a[k] * cb; cb += b[k]; } return w; }

const NOW0 = 1767225600000;
const saves = [];
for (const policy of ['pace', 'nosquad', 'paceSell', 'over4']) {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const run = runBot(B, { policy, seed, minutes: 240, dt: DT, keepStates: true });
    for (const [c, st] of Object.entries(run.states)) saves.push({ tag: `${policy}/${seed}/${c}`, policy, minute: Number(c), raw: B.serializeTycoon(st, NOW0) });
  }
}
const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/test/fixtures/tycoonSaves.json'), 'utf8'));
for (const e of corpus.entries) if (e.key === 'stadium') saves.push({ tag: `corpus/${e.name}`, policy: 'corpus', minute: -1, raw: e.raw });

let bad = 0; const fails = [];
const fail = m => { bad += 1; if (fails.length < 12) fails.push(m); };
const horizons = [0, 60e3, 3600e3, 9 * 3600e3, 30 * 3600e3];
const cliff = {};
let noGoalCompared = 0, noGoalSkipped = 0;
for (const sv of saves) {
  const now1 = NOW0 + 1000;
  const lb = B.deserializeTycoon(sv.raw, now1); const lh = H.deserializeTycoon(sv.raw, now1);
  if (!lb || !lh) { if (!!lb !== !!lh) fail(`${sv.tag}: loads on one engine only`); continue; }
  if (JSON.stringify(lb) !== JSON.stringify(lh)) fail(`${sv.tag}: loads to different JSON`);
  if (B.serializeTycoon(lb, now1) !== H.serializeTycoon(lh, now1)) fail(`${sv.tag}: re-serializes differently`);
  for (const hz of horizons) if (!Object.is(B.offlineEarnings(lb, now1 + hz), H.offlineEarnings(lh, now1 + hz))) fail(`${sv.tag}: offlineEarnings differs at +${hz} ms`);
  for (const fn of ['incomePerSec', 'tapValue', 'fanGrowthPerSec', 'prestigeThreshold', 'canPrestige', 'capacity', 'attendance']) if (!Object.is(B[fn](lb), H[fn](lh))) fail(`${sv.tag}: ${fn} differs`);
  // rollback: the head's save read by the base build
  const hraw = H.serializeTycoon(lh, now1);
  const back = B.deserializeTycoon(hraw, now1);
  if (!back || JSON.stringify(back) !== JSON.stringify(H.deserializeTycoon(hraw, now1))) fail(`${sv.tag}: a head save does not load the same on the base build`);
  if (lh.league && !Number.isFinite(JSON.parse(hraw).league?.baseMatchNo) && Number.isFinite(JSON.parse(sv.raw).league?.baseMatchNo)) fail(`${sv.tag}: the head stopped writing baseMatchNo`);
  // the no goal path
  let sb = structuredClone(lb), sh = structuredClone(lh); let seasonMoved = false;
  const noGoal = () => 0.999;
  for (let t = 0; t < 300 / DT; t += 1) {
    const rb = B.tick(sb, DT, noGoal), rh = H.tick(sh, DT, noGoal); sb = rb.state; sh = rh.state;
    if ([...rb.events, ...rh.events].some(e => e.kind === 'title' || e.kind === 'seasonEnd' || e.kind === 'promoted')) { seasonMoved = true; break; }
    const kb = rb.events.map(e => `${e.kind}:${e.amount ?? ''}`).join(','), kh = rh.events.map(e => `${e.kind}:${e.amount ?? ''}`).join(',');
    if (kb !== kh) { fail(`${sv.tag}: no goal tick ${t} events differ: base [${kb}] head [${kh}]`); break; }
  }
  if (seasonMoved) noGoalSkipped += 1; else {
    noGoalCompared += 1;
    const pick = s => JSON.stringify({ money: s.money, lifetime: s.lifetime, fanbase: s.fanbase, streak: s.streak, levels: s.levels, totalMatches: s.totalMatches, minute: s.minute, matchNo: s.matchNo, me: s.league?.clubs?.[0], md: s.league?.matchday });
    if (pick(sb) !== pick(sh)) fail(`${sv.tag}: after 300 no goal seconds base ${pick(sb).slice(0, 200)} head ${pick(sh).slice(0, 200)}`);
  }
  // the returning player
  const wb = winShare(B.goalChancePerMin(lb), B.oppChancePerMin(lb, 0)); const wh = winShare(H.goalChancePerMin(lh), H.oppChancePerMin(lh, 0));
  const k = `${sv.policy} @${sv.minute}`;
  (cliff[k] ??= []).push({ div: B.divisionIndex(lb), sq: B.levelOf(lb, 'squad'), base: Math.round(wb * 1000) / 10, head: Math.round(wh * 1000) / 10, gap: Math.round(H.matchGap(lh) * 10) / 10 });
}
console.log(`old saves: ${saves.length} (base engine fleet ${saves.length - corpus.entries.filter(e => e.key === 'stadium').length}, corpus ${corpus.entries.filter(e => e.key === 'stadium').length})`);
console.log(`no goal path: ${noGoalCompared} compared over 300 s, ${noGoalSkipped} skipped because a season ended inside`);
for (const [k, rows] of Object.entries(cliff)) {
  const lo = rows.filter(r => r.head < 25).length;
  console.log(`  ${k}: next match win share base ${rows.map(r => r.base).join(' ')} | head ${rows.map(r => r.head).join(' ')} | div ${rows.map(r => r.div).join(' ')} | head under 25%: ${lo} of ${rows.length}`);
}
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'oldsaves.json'), JSON.stringify({ fails, cliff }, null, 1));
for (const m of fails) console.error(`  FAIL: ${m}`);
console.log(`oldsaves: ${saves.length} saves, ${bad} identity failures`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(bad ? 1 : 0);
