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

/* 1. The Hall ballot's line against the legacy bullet, for a career retiring today. */
let ptsStandout = 0; let lied = 0; let anyStandout = 0; const shown = [];
for (const k of C) {
  const c = k.c; c.retired = true; c.hallCal = 2;
  const leg = nba.nbaLegacyOf(c); const tot = nba.nbaCareerTotals(c); const rec = E.hallRecordFor(E.NBA_CAREER_HALL, c);
  if (leg.standout) anyStandout++;
  if (leg.standout?.stat === 'pts') {
    ptsStandout++;
    if (leg.standout.total !== tot.pts) { lied++; if (shown.length < 3) shown.push({ pos: k.pos, era: k.era, realPts: tot.pts, printedTotal: leg.standout.total, weighs: rec.weighs, bullet: leg.bullets[1], score: leg.score, outcome: rec.outcome }); }
  }
}
console.log(`\n[1] Hall ballot line: careers with a standout ${anyStandout}, with a POINTS standout ${ptsStandout}, of them printing a total that is not the career's points ${lied}`);
for (const x of shown) console.log('   ', JSON.stringify(x));

/* 2. All-Star starters: who gets voted in. */
const st = S.filter(s => s.line.allStar === 'starter'); const stOld = st.filter(s => s.line.year < 2016); const stNew = st.filter(s => s.line.year >= 2016);
const desc = v => `n ${v.length}, ppg p05 ${q(v.map(s => s.line.ppg), 0.05)}, p25 ${q(v.map(s => s.line.ppg), 0.25)}, median ${q(v.map(s => s.line.ppg), 0.5)}; bench ${v.filter(s => s.role === 'backup').length}; under 10 ppg ${v.filter(s => s.line.ppg < 10).length} (${pct(v.filter(s => s.line.ppg < 10).length, v.length)}); under 14 ppg ${pct(v.filter(s => s.line.ppg < 14).length, v.length)}`;
console.log(`\n[2] All-Star starters before 2016-17 (fans alone): ${desc(stOld)}`);
console.log(`    All-Star starters from 2016-17 (weighted): ${desc(stNew)}`);
const worst = sorted(stOld.map(s => s.line.ppg)).slice(0, 3);
for (const s of stOld.filter(s => worst.includes(s.line.ppg)).slice(0, 3)) console.log('    e.g.', s.line.year, s.pos, s.arch, s.role, `fan ${s.fan}`, E.nbaStatLine(s.line), `mpg ${s.line.mpg}`, s.line.awards.join('/'));
const res = S.filter(s => s.line.allStar === 'reserve');
console.log(`    reserves: n ${res.length}, ppg p05 ${q(res.map(s => s.line.ppg), 0.05)}, median ${q(res.map(s => s.line.ppg), 0.5)}`);

/* 3. Stat title winners against the real leaders the data file holds. */
const N = E.norms;
for (const [award, key, stat] of [['Scoring Champion', 'ppg', 'pts'], ['Rebounding Champion', 'rpg', 'reb'], ['Assists Leader', 'apg', 'ast']]) {
  for (const era of ['now', 'y2004']) {
    const w = S.filter(s => has(s, award) && (era === 'now' ? s.line.year >= 2020 : s.line.year <= 2008)).map(s => s.line[key]);
    const real = N.NBA_LEADERS[era][stat].map(r => r.value);
    console.log(`[3] ${award} ${era === 'now' ? '2020 on' : 'to 2008'}: n ${w.length}, lowest ${sorted(w)[0]}, p10 ${q(w, 0.1)}, median ${q(w, 0.5)}; real leaders of that era's ten seasons ${Math.min(...real)} to ${Math.max(...real)}; winners under the lowest real leader ${pct(w.filter(v => v < Math.min(...real)).length, w.length)}`);
  }
}

/* 4. MVP seasons. */
const mvp = S.filter(s => has(s, 'MVP'));
console.log(`\n[4] MVP seasons ${mvp.length}: ppg p05 ${q(mvp.map(s => s.line.ppg), 0.05)}, median ${q(mvp.map(s => s.line.ppg), 0.5)}; club wins p05 ${q(mvp.map(s => s.line.clubWins), 0.05)}, median ${q(mvp.map(s => s.line.clubWins), 0.5)}; bench ${mvp.filter(s => s.role === 'backup').length}; by pos ${POS.map(p => `${p} ${mvp.filter(s => s.pos === p).length}`).join(' ')}`);
const dpoy = S.filter(s => has(s, 'Defensive Player of the Year'));
console.log(`    DPOY ${dpoy.length}: by pos ${POS.map(p => `${p} ${dpoy.filter(s => s.pos === p).length}`).join(' ')}; lowest spg+bpg ${sorted(dpoy.map(s => +(s.line.spg + s.line.bpg).toFixed(1)))[0]}`);
const six = S.filter(s => has(s, 'Sixth Man of the Year'));
console.log(`    Sixth Man ${six.length}: ppg p05 ${q(six.map(s => s.line.ppg), 0.05)}, median ${q(six.map(s => s.line.ppg), 0.5)}`);
const roy = S.filter(s => has(s, 'Rookie of the Year'));
console.log(`    Rookie of the Year ${roy.length}: ppg lowest ${sorted(roy.map(s => s.line.ppg))[0]}, median ${q(roy.map(s => s.line.ppg), 0.5)}; bench ${roy.filter(s => s.role === 'backup').length}`);
const allR = S.filter(s => has(s, 'All-Rookie Team'));
console.log(`    All-Rookie ${allR.length} of ${S.filter(s => s.n === 0).length} rookie seasons (${pct(allR.length, S.filter(s => s.n === 0).length)}): ppg lowest ${sorted(allR.map(s => s.line.ppg))[0]}, p10 ${q(allR.map(s => s.line.ppg), 0.1)}, median ${q(allR.map(s => s.line.ppg), 0.5)}; bench ${allR.filter(s => s.role === 'backup').length}`);

/* 7. All-Rookie by team, and what share of rookies make it by role. */
{
  const rk = S.filter(s => s.n === 0 && s.line.games > 0);
  for (const team of [1, 2]) {
    const v = rk.filter(s => s.line.allRookieTeam === team);
    const prod = v.map(s => +(s.line.ppg + s.line.rpg + s.line.apg).toFixed(1));
    console.log(`[7] All-Rookie team ${team}: n ${v.length} (${pct(v.length, rk.length)} of rookie seasons); ppg lowest ${sorted(v.map(s => s.line.ppg))[0]}, p10 ${q(v.map(s => s.line.ppg), 0.1)}, p25 ${q(v.map(s => s.line.ppg), 0.25)}, median ${q(v.map(s => s.line.ppg), 0.5)}; points+rebounds+assists p10 ${q(prod, 0.1)}, median ${q(prod, 0.5)}; under 8 ppg ${pct(v.filter(s => s.line.ppg < 8).length, v.length)}; bench ${pct(v.filter(s => s.role === 'backup').length, v.length)}; mpg median ${q(v.map(s => s.line.mpg), 0.5)}`);
  }
  const starters = rk.filter(s => s.role !== 'backup'); const bench = rk.filter(s => s.role === 'backup');
  console.log(`    rookie starters on a team ${pct(starters.filter(s => s.line.allRookieTeam).length, starters.length)} of ${starters.length}; rookie bench men on a team ${pct(bench.filter(s => s.line.allRookieTeam).length, bench.length)} of ${bench.length}; all rookies ppg median ${q(rk.map(s => s.line.ppg), 0.5)}`);
  const royS = S.filter(s => has(s, 'Rookie of the Year'));
  console.log(`    Rookie of the Year: n ${royS.length}; ppg lowest ${sorted(royS.map(s => s.line.ppg))[0]}, p10 ${q(royS.map(s => s.line.ppg), 0.1)}, p25 ${q(royS.map(s => s.line.ppg), 0.25)}, median ${q(royS.map(s => s.line.ppg), 0.5)}; under 10.2 ppg ${pct(royS.filter(s => s.line.ppg < 10.2).length, royS.length)}`);
  const stb = S.filter(s => s.line.allStar === 'starter' && s.role === 'backup');
  console.log(`    All-Star STARTERS who came off the bench all season: ${stb.length} of ${S.filter(s => s.line.allStar === 'starter').length}; their ppg median ${q(stb.map(s => s.line.ppg), 0.5)}, mpg median ${q(stb.map(s => s.line.mpg), 0.5)}`);
  const dp = S.filter(s => has(s, 'Defensive Player of the Year'));
  console.log(`    DPOY by position: ${POS.map(p => `${p} ${dp.filter(s => s.pos === p).length}`).join(' ')} of ${dp.length}; by archetype ${[...new Set(dp.map(s => s.arch))].map(a => `${a} ${dp.filter(s => s.arch === a).length}`).join(' ')}`);
}

/* 5. The club record against its result, and odd records. */
const B = nba.NBA_RECORD_BANDS; let outBand = 0;
for (const s of S) { const L = nba.nbaSeasonGames(s.line.year); const b = B[s.line.teamResult]; if (!b) continue; const lo = Math.round(b[0] * L / 82) - 1; const hi = Math.round(b[1] * L / 82) + 1; if (s.line.clubWins < lo || s.line.clubWins > hi) outBand++; }
console.log(`\n[5] club records outside their result's band: ${outBand} of ${S.length}; short seasons (not 82): ${S.filter(s => nba.nbaSeasonGames(s.line.year) !== 82).length}`);
const lens = {}; for (const s of S) { const L = nba.nbaSeasonGames(s.line.year); if (L !== 82) lens[`${s.line.year}:${L}`] = (lens[`${s.line.year}:${L}`] ?? 0) + 1; }
console.log('    lengths', JSON.stringify(lens));
const over = S.filter(s => s.line.games > nba.nbaSeasonGames(s.line.year));
console.log(`    seasons with more games than the season has: ${over.length}`);

/* 6. A few season cards as the player reads them. */
console.log('\n[6] sample season notes');
for (const s of [S.find(x => has(x, 'MVP')), S.find(x => x.line.allStar === 'starter' && x.role === 'backup'), S.find(x => has(x, 'All-Rookie Team')), S.find(x => x.line.year === 2011), S.find(x => has(x, 'Scoring Champion'))].filter(Boolean)) {
  console.log('   ', s.line.year, s.pos, s.arch, s.role, `g ${s.line.games}`, E.nbaStatLine(s.line), `| ${s.line.clubWins}-${s.line.clubLosses} ${s.line.teamResult} |`, s.notes.join(' ~ ').slice(0, 330));
}
