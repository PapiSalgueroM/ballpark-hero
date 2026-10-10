/* Reviewer's local probe (light): what the head's MLB October and the short
   seasons actually print. usage: node local1.mjs <checkout dir> <out dir> */
import path from 'node:path';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const DIR = path.resolve(process.argv[2]);
const OUTDIR = path.resolve(process.argv[3]);
const out = path.join(OUTDIR, `local1-${process.pid}.mjs`);
await build({
  stdin: { contents: ["export * as mlb from './src/lib/mlbMyCareer.ts';", "export * as nhl from './src/lib/nhlMyCareer.ts';"].join('\n'), resolveDir: DIR, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(DIR, 'src') },
});
const G = await import(pathToFileURL(out).href);
const M = G.mlb; const N = G.nhl;
const mulberry = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

console.log('== MLB October: games of a run by year and result (min..max, n, share at the min) ==');
for (const year of [2005, 2008, 2015, 2020, 2021, 2023, 2026]) {
  const by = new Map(); let badLine = 0; let lines = 0; let hrOverHits = 0; let lead0 = 0;
  for (let i = 0; i < 12000; i++) {
    const rng = mulberry(year * 104729 + i);
    const pos = ['CF', 'SS', '1B', 'SP', 'RP', 'DH'][i % 6];
    const c = M.startMlbCareer('Probe', pos, M.MLB_ARCHETYPES[pos][i % M.MLB_ARCHETYPES[pos].length], rng, null, year < 2026 ? 'y2004' : undefined);
    c.year = year; c.health = 100;
    const { line } = M.simMlbSeason(c, 90, rng);
    if (line.poGames === undefined) continue;
    if (!by.has(line.teamResult)) by.set(line.teamResult, []);
    by.get(line.teamResult).push(line.poGames);
    const m = /^(\d+) for (\d+) \((\.?\d*\.?\d+)\), (\d+) HR$/.exec(line.poLine ?? '');
    if (m) {
      lines++;
      const [h, ab, hr] = [Number(m[1]), Number(m[2]), Number(m[4])];
      if (m[3].startsWith('0')) lead0++;
      if (hr > h) hrOverHits++;
      if (ab !== 4 * line.poGames || m[3] !== `.${String(Math.round(1000 * h / ab)).padStart(3, '0')}`) badLine++;
    }
  }
  for (const [res, list] of [...by.entries()].sort()) {
    const lo = Math.min(...list); const hi = Math.max(...list);
    console.log(`${year} | ${res.padEnd(30)} | ${lo}..${hi} | n=${list.length} | at min ${(100 * list.filter(g => g === lo).length / list.length).toFixed(1)}%`);
  }
  console.log(`${year} | hitter lines ${lines}, not his hits over his at bats: ${badLine}, HR over hits: ${hrOverHits}, leading zero: ${lead0}`);
}

console.log('== MLB season games by year, club, position (min..max) ==');
for (const [year, team] of [[2020, 'BOS'], [2020, 'DET'], [2026, 'NYY'], [2026, 'BOS'], [2005, 'CIN']]) {
  for (const pos of ['CF', 'SP', 'RP']) {
    const g = []; const hr = []; const w = [];
    for (let i = 0; i < 3000; i++) {
      const rng = mulberry(year * 31 + i * 7 + pos.length);
      const c = M.startMlbCareer('Probe', pos, M.MLB_ARCHETYPES[pos][0], rng, null, year < 2026 ? 'y2004' : undefined);
      c.year = year; c.team = team; c.health = 100; c.ovr = 88;
      const { line } = M.simMlbSeason(c, 80, rng);
      g.push(line.games); if (line.hr !== undefined) hr.push(line.hr); if (line.wins !== undefined) w.push(line.wins);
    }
    const mm = a => (a.length ? `${Math.min(...a)}..${Math.max(...a)}` : '-');
    console.log(`${year} ${team} ${pos}: games ${mm(g)}, HR ${mm(hr)}, wins ${mm(w)}`);
  }
}

console.log('== NHL season games by year, club, position (min..max) ==');
for (const [year, team] of [[2012, 'BOS'], [2019, 'CAR'], [2019, 'ATL'], [2019, 'PHX'], [2020, 'BOS'], [2026, 'BOS'], [2025, 'BOS']]) {
  for (const pos of ['C', 'G']) {
    const g = []; const pts = []; const w = [];
    for (let i = 0; i < 3000; i++) {
      const rng = mulberry(year * 37 + i * 11 + pos.length);
      const c = N.startNhlCareer('Probe', pos, N.NHL_ARCHETYPES[pos][0], rng, null, year < 2026 ? 'y2006' : undefined);
      c.year = year; c.team = team; c.health = 100; c.ovr = 90;
      const { line } = N.simNhlSeason(c, 80, rng);
      g.push(line.games); if (line.points !== undefined) pts.push(line.points); if (line.wins !== undefined) w.push(line.wins);
    }
    const mm = a => (a.length ? `${Math.min(...a)}..${Math.max(...a)}` : '-');
    console.log(`${year} ${team} ${pos}: games ${mm(g)}, points ${mm(pts)}, wins ${mm(w)}`);
  }
}
