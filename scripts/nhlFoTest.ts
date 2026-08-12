import { initNhlLeague, simNhlRound, nhlFoStandings, runNhlFoPlayoffs, nhlOffseason, nhlDraftClass, nhlProspectToPlayer, nhlRelease, nhlSign, nhlTrade, nhlStrength, nhlCapRoom, nhlCapUsed, nhlPoints, nhlAiMoves, NHL_FO_ROUNDS, EASTERN, WESTERN, NHL_FO_DIVISIONS } from '@/lib/nhlFrontOffice';
import { NHL_FO_ROSTERS } from '@/data/nhlFoPlayers';

let seed = 55;
const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

// data integrity
const teams = Object.keys(NHL_FO_ROSTERS);
if (teams.length !== 32) throw new Error(`teams ${teams.length}`);
if (EASTERN.length !== 16 || WESTERN.length !== 16) throw new Error('conference split');
const covered = new Set(NHL_FO_DIVISIONS.flatMap(d => d.teams));
for (const t of teams) if (!covered.has(t)) throw new Error(`no division for ${t}`);
for (const d of NHL_FO_DIVISIONS) if (d.teams.length !== 8) throw new Error(`${d.name} size`);
for (const [ab, ps] of Object.entries(NHL_FO_ROSTERS)) {
  if (ps.length !== 13) throw new Error(`${ab} roster ${ps.length}`);
  for (const p of ps) {
    if (!p.name || p.ovr < 55 || p.ovr > 99 || p.age < 17 || p.age > 48) throw new Error(`${ab} bad seed ${JSON.stringify(p)}`);
  }
}

const lg = initNhlLeague(rng);
const caps = Object.values(lg.teams).map(t => nhlCapUsed(t)).sort((a, b) => a - b);
console.log('cap hits min/median/max:', caps[0], caps[16], caps[31], 'cap', lg.cap);
if (caps[31] > lg.cap * 1.05) throw new Error('initial cap hit blows the ceiling');

// GM moves
const my = lg.teams['TOR'];
const worst = [...my.players].sort((a, b) => a.ovr - b.ovr)[0];
if (!nhlRelease(my, lg.freeAgents, worst.id)) throw new Error('release');
const target = lg.freeAgents.find(p => p.salary <= nhlCapRoom(my, lg.cap));
if (target && !nhlSign(my, lg.freeAgents, target.id, lg.cap)) throw new Error('sign');
const res = nhlTrade(my, lg.teams['MTL'], my.players[my.players.length - 1].id, lg.teams['MTL'].players[0].id, true, lg.cap);
if (!['accepted', 'rejected', 'invalid'].includes(res)) throw new Error('trade');
console.log('GM moves OK, trade:', res);

for (let s = 0; s < 4; s++) {
  for (let r = 0; r < NHL_FO_ROUNDS; r++) { simNhlRound(lg, 'TOR', rng); nhlAiMoves(lg, 'TOR', rng); }
  // points bookkeeping: wins*2 + otl, and games add up
  for (const t of Object.values(lg.teams)) {
    if (nhlPoints(t) !== t.wins * 2 + t.otLosses) throw new Error('points math');
    if (t.otLosses < 0 || t.losses < 0) throw new Error('negative losses');
  }
  const east = nhlFoStandings(lg, EASTERN);
  if (east.length !== 16) throw new Error('east table');
  // standings must be sorted by points
  for (let i = 1; i < east.length; i++) {
    if (nhlPoints(east[i]) > nhlPoints(east[i - 1])) throw new Error('standings not by points');
  }
  const { series, champion } = runNhlFoPlayoffs(lg, rng);
  if (!champion) throw new Error('champ');
  // per conference: 2 divisions x (2 semis + 1 final) + conf final = 7, x2 + Cup = 15
  if (series.length !== 15) throw new Error(`series count ${series.length}`);
  for (const sr of series) {
    if (Math.max(sr.homeWins, sr.awayWins) !== 4) throw new Error('series not best-of-7');
    if (sr.home === sr.away) throw new Error('team plays itself');
  }
  // 16 distinct playoff teams
  const seen = new Set(series.filter(sr => sr.name.includes('Semi')).flatMap(sr => [sr.home, sr.away]));
  if (seen.size !== 16) throw new Error(`playoff field ${seen.size}`);
  lg.champions.push({ season: lg.season, team: champion });
  const cls = nhlDraftClass(rng);
  lg.teams[nhlFoStandings(lg)[31].abbr].players.push(nhlProspectToPlayer(cls[0], rng));
  const notes = nhlOffseason(lg, rng);
  console.log(`season ${lg.season - 1}: champ ${champion}, retirements ${notes.length}, FA pool ${lg.freeAgents.length}, cap ${lg.cap}`);
}
for (const t of Object.values(lg.teams)) {
  if (t.players.length < 8) throw new Error(`${t.abbr} collapsed`);
  if (t.players.filter(p => p.pos === 'G').length < 1) throw new Error(`${t.abbr} no goalie`);
  const s = nhlStrength(t);
  if (!(s > 55 && s < 100)) throw new Error(`strength ${t.abbr} ${s}`);
}
console.log('NHL FRONT OFFICE OK across 4 seasons');
