/* Round 1532 fix probe (not committed): the over4 bot's win share over minutes 15 to
   120, exactly as simTycoonScorelines S4 measures it (a mean over seeds of each
   seed's share), on seeds 1 to 160, printed by block, so the band's seed count can
   be set from measured headroom. node over4probe.mjs [first] [last] */
import fs from 'node:fs';
import path from 'node:path';
import { readDt, bundleTs, freshTmp, runBot } from '../../scripts/lib/tycoonBots.mjs';

const ROOT = process.cwd();
const DT = readDt(ROOT);
const tmp = freshTmp('over4probe');
const unix = p => p.split(path.sep).join('/');
const entry = path.join(tmp, 'entry.ts');
fs.writeFileSync(entry, `export * as T from '${unix(path.join(ROOT, 'src/lib/stadiumTycoon.ts'))}';\n`);
const { T } = await bundleTs(ROOT, entry, tmp, 'live');
const first = Number(process.argv[2] ?? 1); const last = Number(process.argv[3] ?? 160);
const t0 = Date.now();
const share = {};
for (let seed = first; seed <= last; seed += 1) {
  const run = runBot(T, { policy: 'over4', seed, minutes: 120, dt: DT });
  const ms = run.matches.filter(m => m.t >= 15 && m.t < 120);
  share[seed] = (100 * ms.filter(m => m.res === 'w').length) / ms.length;
}
const stat = seeds => { const v = seeds.map(s => share[s]).filter(Number.isFinite); const n = v.length; const m = v.reduce((a, b) => a + b, 0) / n; const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)); return `n ${n} mean ${m.toFixed(2)} sd ${sd.toFixed(2)} se ${(sd / Math.sqrt(n)).toFixed(2)}`; };
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i).filter(s => s >= first && s <= last);
console.log(`OVER4 dt ${DT}, ${((Date.now() - t0) / 1000).toFixed(0)} s for seeds ${first} to ${last}`);
for (const [label, seeds] of [['1-20', range(1, 20)], ['21-40', range(21, 40)], ['41-100', range(41, 100)], ['101-160', range(101, 160)], ['cal80 1-20+41-100', [...range(1, 20), ...range(41, 100)]], ['hold80 21-40+101-160', [...range(21, 40), ...range(101, 160)]], ['all', range(first, last)]]) {
  if (seeds.length) console.log(`OVER4 ${label}: ${stat(seeds)}`);
}
console.log(`OVER4 per seed ${JSON.stringify(Object.fromEntries(Object.entries(share).map(([k, v]) => [k, Math.round(v * 10) / 10])))}`);
fs.rmSync(tmp, { recursive: true, force: true });
