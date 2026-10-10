/* Reviewer's local probe 4 (light): the awards of a short season, BEFORE and AFTER, on the same players.
   A natural fleet is played by the head engine up to a target year; that one season is then played from the
   same copy and the same stream by the base engine (where the year is 82 or 162 games) and by the head.
   usage: node local4.mjs <base dir> <head dir> <out dir> [careers a position] */
import path from 'node:path';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const [BASE, HEAD, OUTDIR] = [2, 3, 4].map(i => path.resolve(process.argv[i]));
const PER = Number(process.argv[5] || 2000);
async function load(dir, tag) {
  const out = path.join(OUTDIR, `local4-${tag}-${process.pid}.mjs`);
  await build({
    stdin: { contents: ["export * as mlb from './src/lib/mlbMyCareer.ts';", "export * as nhl from './src/lib/nhlMyCareer.ts';"].join('\n'), resolveDir: dir, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(dir, 'src') },
  });
  return import(pathToFileURL(out).href);
}
const B = await load(BASE, 'base'); const H = await load(HEAD, 'head');
const stream = seed => { const r = () => { r.s = (r.s + 0x6D2B79F5) | 0; let t = Math.imul(r.s ^ (r.s >>> 15), 1 | r.s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; r.s = seed | 0; return r; };

function run(sport, era, targets) {
  const E = H[sport]; const EB = B[sport]; const U = sport === 'mlb' ? 'Mlb' : 'Nhl';
  const ARCH = sport === 'mlb' ? E.MLB_ARCHETYPES : E.NHL_ARCHETYPES;
  const tally = new Map(targets.map(y => [y, { seasons: 0, base: new Map(), head: new Map(), baseAny: 0, headAny: 0 }]));
  let seedN = 0;
  for (const pos of Object.keys(ARCH)) for (let i = 0; i < PER; i += 1) {
    const rng = stream(40000003 + (seedN += 1) * 7919);
    const c = E[`start${U}Career`](`Fleet ${i}`, pos, ARCH[pos][i % ARCH[pos].length], rng, null, era);
    let tq = E[`${sport}RollTeamQuality`](null, rng);
    for (let s = 0; s < 20 && !c.retired; s += 1) {
      E[`${sport}AssignRole`](c, tq, rng);
      if (tally.has(c.year)) {
        const snap = JSON.stringify(c); const t = tally.get(c.year);
        const ob = EB[`sim${U}Season`](JSON.parse(snap), tq, stream(rng.s)).line;
        const oh = E[`sim${U}Season`](JSON.parse(snap), tq, stream(rng.s)).line;
        t.seasons += 1;
        for (const a of ob.awards) t.base.set(a, (t.base.get(a) ?? 0) + 1);
        for (const a of oh.awards) t.head.set(a, (t.head.get(a) ?? 0) + 1);
        if (ob.awards.length) t.baseAny += 1;
        if (oh.awards.length) t.headAny += 1;
      }
      E[`sim${U}Season`](c, tq, rng); E[`${sport}Progress`](c, rng);
      tq = E[`${sport}RollTeamQuality`](tq, rng);
      if (E[`${sport}ShouldRetire`](c)) c.retired = true;
    }
  }
  for (const [year, t] of tally) {
    const names = [...new Set([...t.base.keys(), ...t.head.keys()])].sort();
    console.log(`${sport.toUpperCase()} ${year}: ${t.seasons} seasons of the same players. Seasons with any award: base ${t.baseAny} (${(100 * t.baseAny / t.seasons).toFixed(2)}%), head ${t.headAny} (${(100 * t.headAny / t.seasons).toFixed(2)}%)`);
    console.log(`   ${names.map(a => `${a} ${t.base.get(a) ?? 0} -> ${t.head.get(a) ?? 0}`).join(' | ')}`);
  }
}
console.log(`careers a position: ${PER}. "a -> b" is the count on the base (the year played as 82 or 162 games) and on the head.`);
run('nhl', 'y2006', [2011, 2012, 2013, 2019, 2020]);
run('mlb', 'y2004', [2019, 2020, 2021]);
run('nhl', undefined, [2026, 2030]);
