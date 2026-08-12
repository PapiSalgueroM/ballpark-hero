import { initMlbLeague, simMlbRound, mlbStandings, mlbLeagueSeeds, runMlbPlayoffs, mlbOffseason, mlbDraftClass, mlbProspectToPlayer, mlbRelease, mlbSign, mlbTrade, mlbStrength, mlbCapRoom, mlbCapUsed, mlbAiMoves, MLB_ROUNDS, AL, NL, MLB_DIVISIONS, isPitcher } from '@/lib/mlbFrontOffice';
import { MLB_FO_ROSTERS } from '@/data/mlbFoPlayers';

let seed = 77;
const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

// data integrity
const teams = Object.keys(MLB_FO_ROSTERS);
if (teams.length !== 30) throw new Error(`teams ${teams.length}`);
if (AL.length !== 15 || NL.length !== 15) throw new Error('league split');
const covered = new Set(MLB_DIVISIONS.flatMap(d => d.teams));
for (const t of teams) if (!covered.has(t)) throw new Error(`no division for ${t}`);
for (const [ab, ps] of Object.entries(MLB_FO_ROSTERS)) {
  if (ps.length !== 13) throw new Error(`${ab} roster ${ps.length}`);
  for (const p of ps) {
    if (!p.name || p.ovr < 55 || p.ovr > 99 || p.age < 18 || p.age > 50) throw new Error(`${ab} bad seed ${JSON.stringify(p)}`);
  }
}

const lg = initMlbLeague(rng);
// payroll sanity: nobody wildly over the tax line at start
const payrolls = Object.values(lg.teams).map(t => mlbCapUsed(t)).sort((a, b) => a - b);
console.log('payrolls min/median/max:', payrolls[0], payrolls[15], payrolls[29], 'line', lg.cap);
if (payrolls[29] > lg.cap * 1.05) throw new Error('initial payroll blows the tax line');

// GM moves
const my = lg.teams['NYY'];
const worst = [...my.players].sort((a, b) => a.ovr - b.ovr)[0];
if (!mlbRelease(my, lg.freeAgents, worst.id)) throw new Error('release');
const target = lg.freeAgents.find(p => p.salary <= mlbCapRoom(my, lg.cap));
if (target && !mlbSign(my, lg.freeAgents, target.id, lg.cap)) throw new Error('sign');
const res = mlbTrade(my, lg.teams['BOS'], my.players[my.players.length - 1].id, lg.teams['BOS'].players[0].id, true, lg.cap);
if (!['accepted', 'rejected', 'invalid'].includes(res)) throw new Error('trade');
console.log('GM moves OK, trade:', res);

for (let s = 0; s < 4; s++) {
  for (let r = 0; r < MLB_ROUNDS; r++) { simMlbRound(lg, 'NYY', rng); mlbAiMoves(lg, 'NYY', rng); }
  // 162-shaped season
  const games = Object.values(lg.teams).map(t => t.wins + t.losses);
  const avgGames = games.reduce((a, b) => a + b, 0) / games.length;
  if (avgGames < 120 || avgGames > 200) throw new Error(`weird season length ${avgGames}`);
  for (const alFlag of [true, false]) {
    const seeds = mlbLeagueSeeds(lg, alFlag);
    if (seeds.length !== 6 || new Set(seeds).size !== 6) throw new Error('seeds');
    // seeds 1-3 must be the division winners
    const divs = alFlag ? MLB_DIVISIONS.slice(0, 3) : MLB_DIVISIONS.slice(3);
    const winners = new Set(divs.map(d => mlbStandings(lg, d.teams)[0].abbr));
    for (const w of seeds.slice(0, 3)) if (!winners.has(w)) throw new Error('seed 1-3 not a division winner');
  }
  const { series, champion } = runMlbPlayoffs(lg, rng);
  if (!champion) throw new Error('champ');
  // per league: 2 WC + 2 LDS + 1 LCS = 5, x2 + WS = 11
  if (series.length !== 11) throw new Error(`series count ${series.length}`);
  for (const sr of series) {
    const w = Math.max(sr.homeWins, sr.awayWins);
    if (sr.name.includes('Wild Card') && w !== 2) throw new Error('WC not best-of-3');
    if (sr.name.includes('DS') && w !== 3) throw new Error('LDS not best-of-5');
    if ((sr.name.includes('CS') || sr.name === 'World Series') && w !== 4) throw new Error('LCS/WS not best-of-7');
  }
  lg.champions.push({ season: lg.season, team: champion });
  const cls = mlbDraftClass(rng);
  lg.teams[mlbStandings(lg)[29].abbr].players.push(mlbProspectToPlayer(cls[0], rng));
  const notes = mlbOffseason(lg, rng);
  console.log(`season ${lg.season - 1}: champ ${champion}, retirements ${notes.length}, FA pool ${lg.freeAgents.length}, line ${lg.cap}`);
}
for (const t of Object.values(lg.teams)) {
  if (t.players.length < 9) throw new Error(`${t.abbr} collapsed`);
  if (t.players.filter(p => p.pos === 'SP').length < 3) throw new Error(`${t.abbr} no rotation`);
  if (t.players.filter(p => !isPitcher(p)).length < 6) throw new Error(`${t.abbr} no lineup`);
  const s = mlbStrength(t);
  if (!(s > 55 && s < 100)) throw new Error(`strength ${t.abbr} ${s}`);
}
console.log('MLB FRONT OFFICE OK across 4 seasons');
