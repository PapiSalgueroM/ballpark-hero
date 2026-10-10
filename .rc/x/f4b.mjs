/* Round 1225, a MEASUREMENT sent to a runner (not a gate, not committed): does a real fixture list move the
   league's outcomes? For one league of each size (24, 20, 18): 20 seeded full seasons on the real list beside
   the same 20 seeds with the key taken out, on goals a match and the home win share, league wide. The noise
   those two numbers carry is measured first: twenty disjoint generated fleets of 20 seasons make ten disjoint
   pairs, and the spread of the ten differences is the yardstick. Nothing is asserted on a maximum and nothing
   is called "not significant": the numbers are printed for the notes.  node .rc/x/f4.mjs  */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const ROOT = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-f4-'));
const entry = path.join(work, 'entry.ts'), out = path.join(work, 'engine.cjs');
const P = f => JSON.stringify(path.join(ROOT, f).split(path.sep).join('/'));
fs.writeFileSync(entry, `export * as cm from ${P('src/lib/clubManager.ts')};\nexport * as fx from ${P('src/lib/clubManagerFixtures.ts')};\n`);
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent', jsx: 'automatic', external: ['react', 'react/jsx-runtime'], alias: { '@': path.join(ROOT, 'src') } });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const mod = createRequire(import.meta.url)(out);
for (const e of mod.fx.REAL_LEAGUE_FIXTURES) await mod.fx.ensureRealLeagueFixtures(e.key);
const { cm } = mod;

function seeded(seed, fn) {
  const random = Math.random, now = Date.now;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Date.now = () => 1791547200000;
  try { return fn(); } finally { Math.random = random; Date.now = now; }
}
function season(club, seed, strip) {
  return seeded(seed, () => {
    let state = cm.startCareer(club);
    const keyed = !!state.realLeagueFixtures;
    if (strip) delete state.realLeagueFixtures;
    let matches = 0, goals = 0, homeWins = 0;
    for (let i = 0; i < 300 && state.week < state.calendar.length; i++) {
      const before = state.week, run = cm.playNextEntry(state, { skipHalftime: true });
      state = run.state;
      if (run.kind === 'match' && run.report.competition === 'league') {
        for (const r of [{ hg: run.report.homeGoals, ag: run.report.awayGoals }, ...run.report.otherResults]) { matches += 1; goals += r.hg + r.ag; if (r.hg > r.ag) homeWins += 1; }
      }
      if (state.week === before) break;
    }
    return { matches, goals, homeWins, keyed };
  });
}
function fleet(club, firstSeed, strip, size = 20) {
  const sum = { matches: 0, goals: 0, homeWins: 0, keyed: 0, seasons: size };
  for (let s = 0; s < size; s++) { const r = season(club, firstSeed + s, strip); sum.matches += r.matches; sum.goals += r.goals; sum.homeWins += r.homeWins; sum.keyed += r.keyed ? 1 : 0; }
  return { ...sum, goalsPerMatch: sum.goals / sum.matches, homeWinShare: sum.homeWins / sum.matches };
}
const sd = xs => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)); };
const report = [];
for (const leagueId of (process.env.F4_LEAGUES || 'championship,laliga,bundesliga').split(',')) {
  const t0 = Date.now();
  const names = cm.playableClubs(leagueId).map(c => c.name), club = names[Math.floor(names.length / 2)];
  const real = fleet(club, 500000, false), generated = fleet(club, 500000, true);
  /* More pairs of the same comparison on other seeds, so one pair is not the whole story. */
  const more = [];
  for (let k = 1; k <= Number(process.env.F4_MORE || 0); k++) { const a = fleet(club, 500000 + k * 5000, false), b = fleet(club, 500000 + k * 5000, true); more.push({ goals: a.goalsPerMatch - b.goalsPerMatch, home: a.homeWinShare - b.homeWinShare }); }
  const fleets = Array.from({ length: 20 }, (_, i) => fleet(club, 900000 + i * 1000, true));
  const dGoals = [], dHome = [];
  for (let p = 0; p < 10; p++) { dGoals.push(fleets[2 * p].goalsPerMatch - fleets[2 * p + 1].goalsPerMatch); dHome.push(fleets[2 * p].homeWinShare - fleets[2 * p + 1].homeWinShare); }
  const row = {
    leagueId, club, clubs: names.length, realSeasonsKeyed: real.keyed, matchesReal: real.matches, matchesGenerated: generated.matches,
    goalsPerMatch: { real: real.goalsPerMatch, generated: generated.goalsPerMatch, difference: real.goalsPerMatch - generated.goalsPerMatch, nullSd: sd(dGoals), nullDifferences: dGoals },
    homeWinShare: { real: real.homeWinShare, generated: generated.homeWinShare, difference: real.homeWinShare - generated.homeWinShare, nullSd: sd(dHome), nullDifferences: dHome },
    morePairs: more,
    seconds: Math.round((Date.now() - t0) / 1000),
  };
  row.goalsPerMatch.inNullSds = row.goalsPerMatch.difference / row.goalsPerMatch.nullSd;
  row.homeWinShare.inNullSds = row.homeWinShare.difference / row.homeWinShare.nullSd;
  report.push(row);
  const f = (x, d = 4) => x.toFixed(d);
  if (more.length) { const all = [{ goals: row.goalsPerMatch.difference, home: row.homeWinShare.difference }, ...more]; const mean = k => all.reduce((x, y) => x + y[k], 0) / all.length; console.log(`${leagueId}: ${all.length} pairs of 20 seasons, real minus generated: goals a match ${all.map(x => x.goals.toFixed(4)).join(' ')} (mean ${mean('goals').toFixed(4)}); home win share ${all.map(x => x.home.toFixed(4)).join(' ')} (mean ${mean('home').toFixed(4)})`); }
  console.log(`${leagueId} (${club}, ${names.length} clubs, ${real.keyed} of 20 real seasons held the key, ${row.seconds}s): goals a match real ${f(real.goalsPerMatch)} generated ${f(generated.goalsPerMatch)} difference ${f(row.goalsPerMatch.difference)} = ${f(row.goalsPerMatch.inNullSds, 2)} null sd (null sd ${f(row.goalsPerMatch.nullSd)}); home win share real ${f(real.homeWinShare)} generated ${f(generated.homeWinShare)} difference ${f(row.homeWinShare.difference)} = ${f(row.homeWinShare.inNullSds, 2)} null sd (null sd ${f(row.homeWinShare.nullSd)})`);
}
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'f4.json'), JSON.stringify(report, null, 2));
console.log(`f4: measured ${report.length} leagues, ${report.reduce((s, r) => s + r.matchesReal, 0)} real list matches`);
