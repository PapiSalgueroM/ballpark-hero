/* rv-probe1.mjs (review scratch, never committed). Plays the real engine on a seed, the harness's own fleet
   loop, and prints what a player would be told. Reads nothing but the bundle. No network.
   Usage: node .tmp-fx/rv-probe1.mjs [careers] [seed] */
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const CAREERS = Number(process.argv[2] || 600);
const SEED = Number(process.argv[3] || 1);
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const out = path.join(process.env.RV_TMP || os.tmpdir(), `rv-probe1-${process.pid}.mjs`);
await build({
  stdin: { contents: [
    "export * as nba from './src/lib/nbaMyCareer.ts';",
    "export * as awards from './src/lib/careerAwards.ts';",
    "export { NBA_CAREER_HALL } from './src/lib/nbaCareerHall.ts';",
    "export { hallRecordFor } from './src/lib/careerHallOfFame.ts';",
    "export * as norms from './src/data/nbaLeagueNorms.ts';",
    "export * as nbaAwards from './src/lib/nbaCareerAwards.ts';",
    "export { nbaStatLine } from './src/lib/usCareerStatLine.ts';",
  ].join('\n'), resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', logLevel: 'error', outfile: out, alias: { '@': path.join(ROOT, 'src') },
});
const E = await import(pathToFileURL(out).href);
const { nba } = E;
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
const rnd = mulberry32(SEED); Math.random = rnd;
const S = []; const C = [];
for (let i = 0; i < CAREERS; i++) {
  const pos = POS[i % 5]; const arch = nba.NBA_ARCHETYPES[pos][i % 3]; const era = i % 4 === 3 ? 'y2004' : 'now';
  const c = nba.startNbaCareer(`Sim ${i}`, pos, arch, rnd, null, era === 'y2004' ? 'y2004' : undefined);
  let tq = nba.nbaRollTeamQuality(null, rnd); nba.nbaAssignRole(c, tq, rnd);
  let guard = 0; let done = false;
  while (!done && guard++ < 30) {
    if ((c.suspendedSeasons ?? 0) > 0) { c.suspendedSeasons -= 1; c.seasons.push({ year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0, ppg: 0, rpg: 0, apg: 0, awards: [], teamResult: 'SUSPENDED', salary: 0 }); }
    else { nba.nbaCampBattle(c, tq, rnd); const fan = c.fanbase; const role = c.role ?? 'starter'; const n = c.seasons.length; const { line, notes } = nba.simNbaSeason(c, tq, rnd); S.push({ i, pos, arch: arch.id, era, role, n, fan, line, notes }); }
    nba.nbaProgress(c, rnd);
    const ev = nba.drawNbaEvent(c, rnd); if (ev) { const pick = ev.options[Math.floor(rnd() * ev.options.length)]; pick.apply(c, rnd); }
    tq = nba.nbaRollTeamQuality(tq, rnd);
    if (nba.nbaShouldRetire(c)) done = true;
  }
  C.push({ i, pos, arch: arch.id, era, c });
}
const has = (s, a) => s.line.awards.includes(a);
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : 'n/a');
const sorted = a => [...a].sort((x, y) => x - y);
const q = (a, p) => { const s = sorted(a); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : NaN; };
console.log(`careers ${CAREERS}, seed ${SEED}, seasons ${S.length}`);
const real = S.filter(s => s.line.teamResult !== 'SUSPENDED');

/* 1. The MVP and the All-NBA First Team against the All-Star Game. */
const mvp = real.filter(s => has(s, 'MVP'));
const first = real.filter(s => s.line.allNbaTeam === 1);
const modern = s => s.line.year >= 2016;
console.log(`[1] MVP seasons ${mvp.length}: All-Star starter ${mvp.filter(s => s.line.allStar === 'starter').length}, reserve ${mvp.filter(s => s.line.allStar === 'reserve').length} (${pct(mvp.filter(s => s.line.allStar === 'reserve').length, mvp.length)}), none ${mvp.filter(s => !s.line.allStar).length}`);
const mvpRes = mvp.filter(s => s.line.allStar === 'reserve');
console.log(`    MVP reserves: fanbase at tip off p10 ${q(mvpRes.map(s => s.fan), 0.1)}, median ${q(mvpRes.map(s => s.fan), 0.5)}, p90 ${q(mvpRes.map(s => s.fan), 0.9)}; with a fanbase of 80 or more ${mvpRes.filter(s => s.fan >= 80).length}; from 2016-17 on ${mvpRes.filter(modern).length} of ${mvp.filter(modern).length} MVP seasons`);
console.log(`    All-NBA First Team seasons ${first.length}: starter ${first.filter(s => s.line.allStar === 'starter').length}, reserve ${first.filter(s => s.line.allStar === 'reserve').length} (${pct(first.filter(s => s.line.allStar === 'reserve').length, first.length)})`);

/* 2. The first season: who makes All-Rookie. */
const rook = real.filter(s => s.n === 0);
const ar1 = rook.filter(s => s.line.allRookieTeam === 1); const ar2 = rook.filter(s => s.line.allRookieTeam === 2);
const show = (name, a) => console.log(`    ${name}: ${a.length} (${pct(a.length, rook.length)} of first seasons); ppg p10 ${q(a.map(s => s.line.ppg), 0.1)}, median ${q(a.map(s => s.line.ppg), 0.5)}; bench ${pct(a.filter(s => s.role === 'backup').length, a.length)}; under 8 ppg ${pct(a.filter(s => s.line.ppg < 8).length, a.length)}; under 6 ppg ${pct(a.filter(s => s.line.ppg < 6).length, a.length)}`);
console.log(`[2] first seasons ${rook.length}; ppg p10 ${q(rook.map(s => s.line.ppg), 0.1)}, median ${q(rook.map(s => s.line.ppg), 0.5)}, p90 ${q(rook.map(s => s.line.ppg), 0.9)}; bench ${pct(rook.filter(s => s.role === 'backup').length, rook.length)}`);
show('All-Rookie First Team', ar1); show('All-Rookie Second Team', ar2);
const none = rook.filter(s => !s.line.allRookieTeam && s.line.games * 2 >= 82);
console.log(`    left off both teams with half a season: ${none.length}; ppg median ${q(none.map(s => s.line.ppg), 0.5)}, p90 ${q(none.map(s => s.line.ppg), 0.9)}`);
const roy = rook.filter(s => has(s, 'Rookie of the Year'));
console.log(`    Rookie of the Year ${roy.length} (${pct(roy.length, rook.length)}); ppg lowest ${q(roy.map(s => s.line.ppg), 0)}, median ${q(roy.map(s => s.line.ppg), 0.5)}`);

/* 3. A season where the printed awards and the hub's honours tile disagree: an All-Star with nothing else. */
const careersAllStarOnly = C.filter(k => (k.c.allStars ?? 0) > 0 && k.c.rings === 0 && k.c.mvps === 0 && k.c.allNbas === 0 && k.c.finalsMvps === 0).length;
console.log(`[3] careers with an All-Star selection and no ring, MVP, Finals MVP or All-NBA: ${careersAllStarOnly} of ${C.length} (${pct(careersAllStarOnly, C.length)})`);
