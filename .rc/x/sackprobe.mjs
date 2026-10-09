/* Fix pass probe (never committed): how a club's first 14 calendar weeks go by quick sim, over many seeds, on
   whatever tree is checked out. Usage: node sackprobe.mjs <label> [careers]. Offline: bundles the engine from src. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const label = process.argv[2] ?? 'tree';
const N = Number(process.argv[3] ?? 200);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sackprobe-'));
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const entry = path.join(TMP, 'entry.mjs');
const out = path.join(TMP, 'engine.mjs');
fs.writeFileSync(entry, `export * from ${JSON.stringify(path.join(ROOT, 'src/lib/clubManager.ts').replaceAll('\\', '/'))};\n`);
await build({
  entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
  absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') },
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
});
const cm = await import(pathToFileURL(out).href);
await cm.ensureAllEraRosters();
const seeded = seed => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const real = Math.random;
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
for (const [club, era] of [['Barcelona', 'era2005'], ['Barcelona', undefined], ['Everton', undefined], ['Real Madrid', 'era2015']]) {
  let sacked = 0;
  const ppm = [], morale = [], benchMorale = [], xiMorale = [], conf = [];
  for (let i = 0; i < N; i++) {
    Math.random = seeded(7700000 + i * 7919);
    let s = era ? cm.startCareer(club, era) : cm.startCareer(club);
    let guard = 0, pts = 0, games = 0;
    while (s.week < 14 && guard++ < 40 && !s.sacked) {
      const r = cm.playNextEntry(s, { skipHalftime: true });
      s = r.state;
      if (r.kind === 'match') { games += 1; pts += r.report.won ? 3 : r.report.drawn ? 1 : 0; }
      if (r.kind === 'seasonOver') break;
    }
    Math.random = real;
    if (s.sacked) sacked += 1;
    ppm.push(games ? pts / games : 0);
    morale.push(mean(s.squad.map(p => p.morale)));
    const xi = new Set(s.xiIds ?? []);
    xiMorale.push(mean(s.squad.filter(p => xi.has(p.id)).map(p => p.morale)));
    benchMorale.push(mean(s.squad.filter(p => !xi.has(p.id)).map(p => p.morale)));
    conf.push(s.boardConfidence);
  }
  const se = xs => { const m = mean(xs); return Math.sqrt(mean(xs.map(x => (x - m) * (x - m))) / xs.length); };
  console.log(`SACK ${label} ${club}${era ? ` ${era}` : ''}: ${N} careers to week 14: sacked ${sacked} (${(100 * sacked / N).toFixed(1)}%), points a match ${mean(ppm).toFixed(3)} (se ${se(ppm).toFixed(3)}), squad morale ${mean(morale).toFixed(1)}, eleven ${mean(xiMorale).toFixed(1)}, the rest ${mean(benchMorale).toFixed(1)}, board ${mean(conf).toFixed(1)}`);
}
fs.rmSync(TMP, { recursive: true, force: true });
