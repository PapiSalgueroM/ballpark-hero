/**
 * Round 585's missing visitor measurement, contract section 5.
 * Day 1 has visits 1 and 2, at hour 0 and hour 12. Each visit lasts five
 * minutes; every later one starts 12 hours after the preceding start. Thus
 * day 2 ends at visit 4 and day 5 ends at visit 10. Away pay and matchdays use
 * the engine's cap and finale hold, in the hook's order. Live ticks are 0.2s.
 *
 * Two reproducible policies buy the cheapest stadium upgrade every two
 * seconds (favoring seats when full), without taps, staff, boosts, whistles
 * or legacy purchases. One sells up immediately; the other waits for a
 * season final. The immediate policy can abandon a waiting final and is
 * slower. Seeds are 101, 202, ... 10100, as in the packs dry-spell harness.
 *
 * This measures affordability with a bed available, after the free Scout.
 * It reports both saving directly for Club and opening a paid Scout first.
 * It does not estimate how quickly a new visitor learns the controls.
 * Results are random: p90 is an explicit operational interpretation of the
 * design's day targets, not a guarantee to every player. Actual success
 * fractions are printed beside it so the missed tail remains visible.
 *
 * A fourfold-price copy, bundled only in the OS temp directory, must fail
 * every pace check. Replaying the same earnings isolates price from luck.
 * No source, dist, storage, or snapshot files are changed by this harness.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tycoon-pack-pace-'));
const SAMPLES = 100;
const DT = 0.2;
const VISITS = 10;
const POLICIES = ['immediate', 'afterFinal'];
const pathOf = name => path.join(ROOT, 'src/lib', `${name}.ts`);
let failures = 0;
const fail = message => { failures += 1; console.error(`  FAIL: ${message}`); };

async function bundle(name, academy = pathOf('wonderkidFactory')) {
  const output = path.join(temp, `${name}.mjs`);
  const imports = [
    ['T', pathOf('stadiumTycoon')], ['R', pathOf('tycoonRewards')], ['W', academy],
  ].map(([id, file]) => `export * as ${id} from ${JSON.stringify(file.split(path.sep).join('/'))};`).join('\n');
  await build({
    stdin: { contents: imports, resolveDir: ROOT, loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', outfile: output, logLevel: 'error',
    alias: { '@/lib/wonderkidFactory': academy, '@': path.join(ROOT, 'src') },
  });
  return import(pathToFileURL(output).href);
}

function mulberry(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function visitEarnings({ T, R }, seed, policy) {
  const roll = mulberry(seed);
  let s = T.newTycoon(0);
  let ledger = R.newLedger(seed);
  const trace = [];
  const credit = (visit, fullTimes) => {
    ledger = R.creditFullTimes(ledger, fullTimes);
    trace.push({ visit, earned: ledger.earned });
  };
  const upgrade = () => {
    for (;;) {
      const full = T.attendance(s) >= T.capacity(s) - 5;
      const options = T.TRACKS.filter(t => T.canBuy(s, t.id)).sort((a, b) =>
        T.costOf(s, a.id) * (full && a.id === 'stands' ? 0.55 : 1)
        - T.costOf(s, b.id) * (full && b.id === 'stands' ? 0.55 : 1));
      if (!options.length) break;
      s = T.buy(s, options[0].id);
    }
  };
  for (let visit = 1; visit <= VISITS; visit += 1) {
    const now = (visit - 1) * 12 * 3600 * 1000;
    if (visit > 1) {
      const pay = T.offlineEarnings(s, now);
      const count = Math.floor(T.awaySecondsOf(s, now) / T.AWAY_MATCHDAY_SEC);
      const beforeMatches = s.totalMatches ?? 0;
      const paid = { ...s, money: s.money + pay, lifetime: s.lifetime + pay, savedAt: now };
      const away = T.playAwayMatchdays(paid, count, roll);
      s = away.state;
      credit(visit, away.results.map((m, i) => ({
        totalMatches: beforeMatches + i + 1,
        result: m.result === 'W' ? 'win' : m.result === 'D' ? 'draw' : 'loss', away: true,
      })));
    }
    upgrade();
    if (policy === 'immediate' && T.canPrestige(s)) s = T.prestige(s, now);
    for (let step = 1; step <= Math.round(300 / DT); step += 1) {
      const r = T.tick(s, DT, roll);
      s = r.state;
      const result = r.events.find(e => ['win', 'draw', 'loss'].includes(e.kind));
      const season = r.events.find(e => ['title', 'seasonEnd'].includes(e.kind) && e.position !== undefined);
      if (result) credit(visit, [{ totalMatches: s.totalMatches, result: result.kind, away: false, position: season?.position }]);
      if (step % Math.round(2 / DT) === 0) upgrade();
      if (T.canPrestige(s) && (policy === 'immediate' || season)) s = T.prestige(s, now + step * DT * 1000);
    }
    s.savedAt = now + 300000;
  }
  return { seed, trace };
}

function purchases({ R, W }, run) {
  const academy = W.newFactory(0, run.seed);
  const makeKid = (lo, hi, roll) => W.makeProspectInBand(academy, lo, hi, roll);
  const open = (ledger, id) => {
    const next = R.openPack(ledger, id, true, makeKid);
    assert(next, `${id} must open at its measured affordable price`);
    return { ...next, pending: null };
  };
  const fresh = R.newLedger(run.seed);
  assert.equal(R.priceOf(fresh, 'scout'), 0, 'the introductory Scout is free');
  const usedFree = open(fresh, 'scout');
  assert(R.priceOf(usedFree, 'scout') > 0, 'the measured Scout must be paid');
  let sequence = usedFree;
  let scout = Infinity;
  let club = Infinity;
  let clubAfterScout = Infinity;
  for (const point of run.trace) {
    const saving = { ...usedFree, earned: point.earned };
    if (club === Infinity && R.canOpen(saving, 'club', true)) club = point.visit;
    sequence = { ...sequence, earned: point.earned };
    if (scout === Infinity && R.canOpen(sequence, 'scout', true)) {
      sequence = open(sequence, 'scout');
      scout = point.visit;
    }
    if (scout !== Infinity && clubAfterScout === Infinity && R.canOpen(sequence, 'club', true)) {
      sequence = open(sequence, 'club');
      clubAfterScout = point.visit;
    }
  }
  return { scout, club, clubAfterScout };
}

const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1];
const CHECKS = [
  { id: 'scout', label: 'paid Scout by day 2', limit: 4 },
  { id: 'club', label: 'Club by day 5, saving directly', limit: 10 },
  { id: 'clubAfterScout', label: 'Club by day 5, after a paid Scout', limit: 10 },
];
function report(modules, runs, label) {
  const results = runs.map(run => purchases(modules, run));
  const red = [];
  for (const check of CHECKS) {
    const values = results.map(r => r[check.id]);
    const reached = values.filter(v => v <= check.limit).length;
    const quantiles = [0.1, 0.5, 0.9].map(p => {
      const value = percentile(values, p);
      return Number.isFinite(value) ? String(value) : `>${VISITS}`;
    }).join('/');
    const pass = percentile(values, 0.9) <= check.limit;
    console.log(`  ${pass ? 'ok ' : 'RED'} ${label}: ${check.label}: ${reached}/${SAMPLES}; p10/median/p90 visit ${quantiles}`);
    if (!pass) red.push(check.id);
  }
  return red;
}

try {
  const live = await bundle('live');
  const academySource = fs.readFileSync(pathOf('wonderkidFactory'), 'utf8');
  let dearSource = academySource;
  for (const pack of live.W.PACKS) {
    const match = new RegExp(`(id: '${pack.id}',[^\\n]*?price: )${pack.price}(, firstFree:)`, 'g');
    assert.equal([...dearSource.matchAll(match)].length, 1, `the ${pack.id} price control must change exactly one pack`);
    dearSource = dearSource.replace(match, (_, before, after) => `${before}${pack.price * 4}${after}`);
  }
  assert.notEqual(dearSource, academySource, 'the price control must change code');
  const dearPath = path.join(temp, 'wonderkidFactory-dear.ts');
  fs.writeFileSync(dearPath, dearSource);
  const dear = await bundle('dear', dearPath);
  for (const pack of live.W.PACKS) assert.equal(dear.R.packById(pack.id).price, pack.price * 4, 'the reward ledger must read the controlled price');

  console.log(`Round 585 pack pace: ${SAMPLES} seeded visitors per policy, two five-minute visits per day.`);
  console.log('Visits 1/2 are day 1, 3/4 day 2, 9/10 day 5; p90 is a population target, not a promise to every visitor.');
  for (const policy of POLICIES) {
    const runs = Array.from({ length: SAMPLES }, (_, i) => visitEarnings(live, (i + 1) * 101, policy));
    for (const id of report(live, runs, policy)) fail(`${policy}: ${id} misses the contract's day target at p90`);
    const controlled = report(dear, runs, `${policy}, 4x prices`);
    for (const check of CHECKS) if (!controlled.includes(check.id)) fail(`${policy}: the applied price control did not break ${check.id}`);
  }
  if (failures) process.exitCode = 1;
  else console.log('simTycoonPackPace: green. Both policies measured; every applied price control broke its pace check.');
} finally {
  assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()), 'cleanup stays inside the OS temp directory');
  assert(path.basename(temp).startsWith('tycoon-pack-pace-'), 'cleanup targets this harness only');
  fs.rmSync(temp, { recursive: true, force: true });
}
