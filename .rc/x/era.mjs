/* Review of Round 1301 (runner only, never committed): the NHL standout marks against careers of BOTH eras a
   player can pick (today's league, and the 2006-07 throwback, which since Round 1226 plays the real short
   seasons at their true length). The Hall harness's fleet starts every career today, so it never sees the second.
   usage: cd <tree> && node era.mjs <tag> <careers>
   Prints, per era: the pooled share of careers at or over a from mark and a to mark of each calibration table
   the tree has, the Hall share as the tree's own stamp tells it, and the mean career games and points of a skater. */
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const [TAG, NRAW] = process.argv.slice(2);
const N = Number(NRAW || 6000);
const file = path.join(os.tmpdir(), `review-era-${process.pid}.mjs`);
const entry = [
  "export { nhlLegacyOf as LEGACY, NHL_ARCHETYPES as ARCH, startNhlCareer as start, simNhlSeason as season, nhlProgress as progress, drawNhlEvent as drawEvent, nhlShouldRetire as stop, nhlRollTeamQuality as roll, nhlCareerTotals as TOTALS, NHL_LEGACY_WEIGHTS as WEIGHTS, NHL_ERAS as ERAS } from './src/lib/nhlMyCareer.ts';",
  "export { stampHallCalibration, HALL_CALIBRATION } from './src/lib/careerHallOfFame.ts';",
].join('\n');
await build({ stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: file, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic', banner: { js: "import { createRequire as __r } from 'node:module'; const require = __r(import.meta.url);" } });
const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear(), key: () => null, length: 0 };
const eng = await import(pathToFileURL(file).href);
try { unlinkSync(file); } catch { /* only a copy */ }
const POS = ['C', 'LW', 'RW', 'D', 'G'];
const stream = n => { let seed = n >>> 0; return () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const pct = x => (100 * x).toFixed(2);
console.log(`era ${TAG}: calibration ${eng.HALL_CALIBRATION}, eras [${eng.ERAS.map(e => `${e.id} from ${e.startYear}`).join(', ')}], ${N} careers an era`);
for (const era of eng.ERAS) {
  Math.random = stream(8301000);
  const rows = [];
  for (let i = 0; i < N; i += 1) {
    const pos = POS[i % POS.length];
    const archs = eng.ARCH[pos];
    const c = eng.start(`Era ${i}`, pos, archs[i % archs.length], Math.random, null, era.id);
    let tq = null, guard = 0;
    while (!c.retired && guard++ < 30) {
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push({ year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0, awards: [], teamResult: 'SUSPENDED', salary: 0 });
      } else { tq = eng.roll(tq, Math.random); eng.season(c, tq, Math.random); }
      eng.progress(c, Math.random);
      const ev = eng.drawEvent(c, Math.random);
      if (ev) ev.options[Math.floor(Math.random() * ev.options.length)].apply(c, Math.random);
      if (eng.stop(c)) c.retired = true;
    }
    c.retired = true;
    eng.stampHallCalibration(c);
    const games = c.seasons.reduce((s, x) => s + (x.games ?? 0), 0);
    const short = c.seasons.filter(x => typeof x.slate === 'number' && x.slate < 82).length;
    /* Awards won in a season the tree recorded as shorter than 82 games, against awards won in the others. */
    const shortRows = c.seasons.filter(x => typeof x.slate === 'number' && x.slate < 82), fullRows = c.seasons.filter(x => !(typeof x.slate === 'number' && x.slate < 82) && (x.games ?? 0) > 0);
    const aw = xs => xs.reduce((s, x) => s + (x.awards?.length ?? 0), 0);
    rows.push({ pos, t: { ...eng.TOTALS(c) }, hof: eng.LEGACY(c).hof, score: eng.LEGACY(c).score, seasons: c.seasons.length, games, short, first: c.seasons[0]?.year, last: c.seasons.at(-1)?.year,
      cups: c.cups, harts: c.harts, conn: c.connSmythes, stars: c.allStars, awShort: aw(shortRows), nShort: shortRows.length, awFull: aw(fullRows), nFull: fullRows.length });
  }
  {
    const m = f => (rows.reduce((s, r) => s + f(r), 0) / rows.length).toFixed(4);
    const sum = f => rows.reduce((s, r) => s + f(r), 0);
    const sorted = rows.map(r => r.score).sort((a, b) => a - b);
    console.log(`era ${TAG} ${era.id} awards a career: Cups ${m(r => r.cups)}, the major ${m(r => r.harts)}, Conn Smythes ${m(r => r.conn)}, All-Star nods ${m(r => r.stars)}; median legacy ${sorted[Math.floor(sorted.length / 2)]}; season awards a season: in seasons under 82 games ${sum(r => r.nShort) ? (sum(r => r.awShort) / sum(r => r.nShort)).toFixed(4) : 'none played'} (${sum(r => r.nShort)} seasons), in the others ${(sum(r => r.awFull) / Math.max(1, sum(r => r.nFull))).toFixed(4)} (${sum(r => r.nFull)} seasons)`);
  }
  const skaters = rows.filter(r => r.pos !== 'G');
  const mean = (xs, f) => xs.reduce((s, x) => s + f(x), 0) / Math.max(1, xs.length);
  const parts = [];
  for (const cal of [2, 3]) {
    const W = eng.WEIGHTS[cal];
    if (!W) continue;
    let a = 0, b = 0, n = 0;
    for (const pos of POS) for (const s of W.positions[pos]?.standout ?? []) {
      const mine = rows.filter(r => r.pos === pos);
      a += mine.filter(r => (r.t[s.stat] ?? 0) >= s.from).length; b += mine.filter(r => (r.t[s.stat] ?? 0) >= s.to).length; n += mine.length;
    }
    parts.push(`marks of calibration ${cal}: at or over from ${pct(a / n)} percent, at or over to ${pct(b / n)}`);
  }
  console.log(`era ${TAG} ${era.id} (first season ${rows[0].first}): ${parts.join('; ')}; Hall share as told ${pct(mean(rows, r => (r.hof ? 1 : 0)))} percent; a skater: ${mean(skaters, r => r.seasons).toFixed(2)} seasons, ${mean(skaters, r => r.games).toFixed(0)} games, ${mean(skaters, r => r.t.points ?? 0).toFixed(0)} points; seasons recorded under 82 games a career ${mean(rows, r => r.short).toFixed(2)}`);
}
console.log(`era ${TAG}: done`);
