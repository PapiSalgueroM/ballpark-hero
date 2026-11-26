import type { CareerState, SeasonRecord } from './soccerCareerEngine';
import { readCupRun } from './soccerCareerCup';
import { savedClubCampaign } from './soccerSeasonCompetitions';
import { readClubWorldCup } from './soccerClubWorldCup';
import { readNationsLeagueCampaign } from './soccerNationsLeague';

export interface CareerBest {
  label: string;
  value: number;
  season: SeasonRecord;
  index: number;
  ties: number;
}
interface CareerRecordSeason {
  season: SeasonRecord;
  index: number;
}
export interface ClubStint {
  club: string;
  parent: string | null;
  firstYear: number;
  lastYear: number;
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  rows: CareerRecordSeason[];
}

function savedLeagueApps(season: SeasonRecord) {
  const league = season.leagueApps;
  return typeof league === 'number' && Number.isSafeInteger(league) && league >= 0
    && Number.isSafeInteger(season.apps) && league <= season.apps ? league : null;
}

export function careerRecordAppearances(season: SeasonRecord, seniorSeasons: readonly CareerRecordSeason[]) {
  const league = savedLeagueApps(season);
  if (league === null) return null;

  let prior: { year: number; club: string; delta: number } | null = null;
  for (const { season: candidate } of seniorSeasons) {
    if (!Number.isSafeInteger(candidate.year) || !(candidate.year < season.year)
      || (prior && candidate.year < prior.year)) continue;
    const previousLeague = savedLeagueApps(candidate);
    if (previousLeague !== null) prior = { year: candidate.year, club: candidate.club, delta: league - previousLeague };
  }
  return { league, otherClub: season.apps - league, prior };
}

/** Only the senior club record, never academy or post-retirement work. */
export function careerRecordBook(career: Pick<CareerState, 'seasons' | 'position'>) {
  const rows = career.seasons.map((season, index) => ({ season, index })).filter(r => r.season.type === 'playing')
    .filter(r => !(r.season.clubTier === 99 && r.season.apps === 0 && !r.season.clubCountry));
  const stints: ClubStint[] = [];
  for (const row of rows) {
    const season = row.season;
    const parent = season.onLoanFrom ?? null;
    let stint = stints[stints.length - 1];
    if (!stint || stint.club !== season.club || stint.parent !== parent || stint.lastYear + 1 !== season.year) {
      stint = { club: season.club, parent, firstYear: season.year, lastYear: season.year, apps: 0, goals: 0, assists: 0, cleanSheets: 0, rows: [] };
      stints.push(stint);
    }
    stint.lastYear = season.year;
    for (const stat of ['apps', 'goals', 'assists', 'cleanSheets'] as const) stint[stat] += season[stat];
    stint.rows.push(row);
  }
  const bests: CareerBest[] = [];
  const stats: { stat: 'apps' | 'goals' | 'assists' | 'cleanSheets' | 'rating'; label: string; minApps: number }[] = [
    { stat: 'apps', label: 'Most appearances', minApps: 1 },
    ...(career.position === 'GK' ? [{ stat: 'cleanSheets' as const, label: 'Most clean sheets', minApps: 1 }] : [
      { stat: 'goals' as const, label: 'Most goals', minApps: 1 },
      { stat: 'assists' as const, label: 'Most assists', minApps: 1 },
    ]),
    { stat: 'rating', label: 'Best season rating', minApps: 10 },
  ];
  for (const { stat, label, minApps } of stats) {
    const eligible = rows.filter(r => r.season.apps >= minApps && r.season[stat] > 0);
    if (!eligible.length) continue;
    const value = Math.max(...eligible.map(r => r.season[stat]));
    const tied = eligible.filter(r => r.season[stat] === value);
    bests.push({ label, value, season: tied[0].season, index: tied[0].index, ties: tied.length });
  }
  const totals = stints.reduce((sum, s) => ({ apps: sum.apps + s.apps, goals: sum.goals + s.goals, assists: sum.assists + s.assists, cleanSheets: sum.cleanSheets + s.cleanSheets }), { apps: 0, goals: 0, assists: 0, cleanSheets: 0 });
  return { rows, stints, bests, totals };
}

interface CampaignLine {
  year: number;
  season: boolean;
  team: string;
  result: string;
  topScorer?: boolean;
  goals: number | null;
  apps: number | null;
  assists: number | null;
}

interface CompetitionRecord {
  editions: CampaignLine[];
  name: string;
  campaigns: number;
  goals: number | null;
  apps: number | null;
  assists: number | null;
  campaignsWithAssists: number;
}

export function careerCompetitionRecords(career: Pick<CareerState, 'seasons' | 'lastUCLResult' | 'intlHistory' | 'lastTournament'>) {
  const club = new Map<string, CompetitionRecord>();
  const international = new Map<string, CompetitionRecord>();
  const count = (n: unknown): n is number => Number.isSafeInteger(n) && Number(n) >= 0;
  function add(to: Map<string, CompetitionRecord>, name: string, line: CampaignLine) {
    const { goals, apps, assists } = line;
    if (!name || (goals !== null && !count(goals)) || (apps !== null && !count(apps))) return;
    const record = to.get(name) ?? { name, editions: [], campaigns: 0, goals: null, apps: null, assists: null, campaignsWithAssists: 0 };
    record.editions.push({ ...line, assists: count(assists) ? assists : null });
    record.campaigns += 1;
    if (goals !== null) record.goals = (record.goals ?? 0) + goals;
    if (apps !== null) record.apps = (record.apps ?? 0) + apps;
    if (count(assists)) {
      record.assists = (record.assists ?? 0) + assists;
      record.campaignsWithAssists += 1;
    }
    to.set(name, record);
  }
  for (const season of career.seasons) {
    if (season.type !== 'playing') continue;
    const domestic = readCupRun(season);
    if (domestic || season.domesticCup) {
      const lastTie = domestic?.stages.at(-1);
      const result = lastTie && !lastTie.won ? {
        early: 'Early rounds', QF: 'Quarter-final', SF: 'Semi-final', F: 'Final',
      }[lastTie.stage] : 'Club won';
      add(club, domestic?.cup ?? 'Domestic cup', {
        year: season.year, season: true, team: season.club, result, goals: null, apps: null, assists: null,
      });
    }
    const run = savedClubCampaign(career, season);
    if (run) {
      const matches = [...(run.firstStage?.stages ?? []).flatMap(stage => stage.games), ...run.matches];
      const savedGoals = matches.reduce((sum, match) => sum + match.playerGoals, 0);
      const maxAssists = matches.reduce((sum, match) => sum + match.goalsFor - match.playerGoals, 0);
      const assists = count(run.playerAssists) && run.playerAssists <= maxAssists && run.playerAssists <= season.assists ? run.playerAssists : null;
      if (matches.length && savedGoals === run.playerGoals) add(club, run.competition ?? 'Champions League', {
        year: season.year, season: true, team: season.club, result: run.result, topScorer: run.isTopScorer,
        goals: savedGoals, apps: null, assists,
      });
    }
    const worldCup = readClubWorldCup(season);
    if (worldCup?.apps) add(club, 'Club World Cup', {
      year: worldCup.edition, season: false, team: worldCup.club, result: worldCup.result,
      goals: worldCup.goals, apps: worldCup.apps, assists: worldCup.assists,
    });
    const nationsLeague = readNationsLeagueCampaign(season);
    if (nationsLeague?.apps) add(international, 'Nations League', {
      year: nationsLeague.year, season: true, team: nationsLeague.nation, result: nationsLeague.result,
      goals: nationsLeague.goals, apps: nationsLeague.apps, assists: nationsLeague.assists,
    });
  }
  for (const row of career.intlHistory ?? []) {
    if (!row?.apps) continue;
    const last = career.lastTournament;
    const latestAssists = last?.year === row.year && last.short === row.short && last.nation === row.nation
      && last.playerApps === row.apps && last.playerGoals === row.goals ? last.playerAssists : null;
    add(international, row.short, {
      year: row.year, season: false, team: row.nation, result: row.myResult,
      goals: row.goals, apps: row.apps, assists: count(row.assists) ? row.assists : latestAssists ?? null,
    });
  }
  return { club: [...club.values()], international: [...international.values()] };
}
