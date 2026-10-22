/* Round 1532 probe (not committed): simTycoonPackPace's visitors (visitEarnings copied
   verbatim) on a given tree; prints the 10th percentile of earned gems at the end of
   visit 4 and visit 10 for both policies (critic item 10's price ratio input), and
   the p90 purchase visits the harness gates on.
   node packprobe.mjs <tree root> <label> */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const TREE = path.resolve(process.argv[2]);
const LABEL = process.argv[3] ?? TREE;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pack-probe-'));
const pathOf = name => path.join(TREE, 'src/lib', `${name}.ts`);
const output = path.join(temp, 'm.mjs');
await build({
  stdin: { contents: [['T', pathOf('stadiumTycoon')], ['R', pathOf('tycoonRewards')], ['W', pathOf('wonderkidFactory')]].map(([id, file]) => `export * as ${id} from ${JSON.stringify(file.split(path.sep).join('/'))};`).join('\n'), resolveDir: TREE, loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', outfile: output, logLevel: 'error', alias: { '@': path.join(TREE, 'src') },
});
const M = await import(pathToFileURL(output).href);
const DT = 0.2; const VISITS = 10;
function mulberry(seed) { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function visitEarnings({ T, R }, seed, policy) {
  const roll = mulberry(seed);
  let s = T.newTycoon(0);
  let ledger = R.newLedger(seed);
  const trace = [];
  const credit = (visit, fullTimes) => { ledger = R.creditFullTimes(ledger, fullTimes); trace.push({ visit, earned: ledger.earned }); };
  const upgrade = () => {
    for (;;) {
      const full = T.attendance(s) >= T.capacity(s) - 5;
      const options = T.TRACKS.filter(t => T.canBuy(s, t.id)).sort((a, b) => T.costOf(s, a.id) * (full && a.id === 'stands' ? 0.55 : 1) - T.costOf(s, b.id) * (full && b.id === 'stands' ? 0.55 : 1));
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
      credit(visit, away.results.map((m, i) => ({ totalMatches: beforeMatches + i + 1, result: m.result === 'W' ? 'win' : m.result === 'D' ? 'draw' : 'loss', away: true })));
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
const pct = (v, p) => [...v].sort((a, b) => a - b)[Math.ceil(v.length * p) - 1];
const out = { label: LABEL, prices: M.W.PACKS.map(p => [p.id, p.price]) };
for (const policy of ['immediate', 'afterFinal']) {
  const runs = Array.from({ length: 100 }, (_, i) => visitEarnings(M, (i + 1) * 101, policy));
  const at = (run, v) => { const pts = run.trace.filter(x => x.visit <= v); return pts.length ? pts[pts.length - 1].earned : 0; };
  out[policy] = {};
  for (const v of [2, 4, 6, 10]) { const e = runs.map(r => at(r, v)); out[policy][`visit${v}`] = { p10: pct(e, 0.1), median: pct(e, 0.5), p90: pct(e, 0.9) }; }
}
console.log(`PACKPROBE ${JSON.stringify(out)}`);
fs.rmSync(temp, { recursive: true, force: true });
