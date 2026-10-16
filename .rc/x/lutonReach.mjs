/* Round BHG probe (runner only, never committed): how often does PR278's rule name Luton in a 2023 Premier League
   season? For every Premier League club in FALLBACK_CLUBS, every finish 1 to 20, a severe results season, and three
   saved worlds (none, an empty 2023 world, a 2023 world naming a champion), derive the season and call the rule. */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { bundleAwardsNight } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/careerAwardsNightBundle.mjs')).href);
const { soccer, season: S, core: C, hist: H } = await bundleAwardsNight(ROOT, { extra: { season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts', hist: 'src/lib/season/historicalOpponentLabels.ts' } });
const clubs = soccer.FALLBACK_CLUBS;
const pl = clubs.filter(c => c.league === 'Premier League');
console.log(`Premier League clubs in FALLBACK_CLUBS: ${pl.length}`);
const worlds = { none: undefined, empty: { year: 2023, leagues: {}, ucl: '' }, champion: { year: 2023, leagues: { 'Premier League': 'Manchester City' }, ucl: '' }, manCity: { year: 2023, leagues: { 'Premier League': 'Man City' }, ucl: '' }, newcastle: { year: 2023, leagues: { 'Premier League': 'Newcastle' }, ucl: '' } };
const out = {};
for (const [wname, world] of Object.entries(worlds)) {
  const tally = { table: [0, 0], severe: [0, 0], byFinish: {} , why: {} };
  for (const club of pl) {
    for (const finish of [...Array.from({ length: 20 }, (_, i) => i + 1), 'severe']) {
      const severe = finish === 'severe';
      if (world && world.leagues['Premier League'] === club.name && finish !== 1) continue;
      const row = { year: 2023, age: 26, club: club.name, clubCountry: club.country, clubTier: club.tier,
        apps: severe ? 14 : 32, leagueApps: severe ? 14 : 30, goals: 5, assists: 3, cleanSheets: 0, yellowCards: 2, redCards: 0, rating: 7,
        injury: severe ? 'ACL' : null, injuryWeeks: severe ? 28 : 0, injurySevere: severe,
        leagueTitle: finish === 1, leagueFinish: severe ? undefined : finish, leagueSize: severe ? undefined : 20,
        domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null,
        type: 'playing', intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null };
      const career = { playerName: 'Probe', position: 'ST', seasons: [row], awards: [], phone: world ? { world } : {} };
      let ctx, s, r = null;
      try { ctx = S.buildSoccerSeasonCtx(career, clubs, row); s = C.deriveSeason(S.SOCCER, row, ctx); r = s ? H.historicalOpponentLabels(row, ctx, s) : null; }
      catch (e) { tally.why.error = (tally.why.error || 0) + 1; continue; }
      const k = severe ? 'severe' : 'table';
      tally[k][0] += 1; if (r) tally[k][1] += 1;
      if (!severe) { tally.byFinish[finish] = (tally.byFinish[finish] || 0) + (r ? 1 : 0); }
      if (!r && s) { const unnamed = s.labels.filter(l => !l.named).length; const key = `${s.mode}:unnamed=${unnamed}`; tally.why[key] = (tally.why[key] || 0) + 1; }
    }
  }
  out[wname] = tally;
  console.log(`world ${wname}: table seasons named ${tally.table[1]}/${tally.table[0]}, severe seasons named ${tally.severe[1]}/${tally.severe[0]}`);
  console.log(`  named by finish: ${JSON.stringify(tally.byFinish)}`);
  console.log(`  refusals: ${JSON.stringify(tally.why)}`);
}
console.log('lutonReach: done');
