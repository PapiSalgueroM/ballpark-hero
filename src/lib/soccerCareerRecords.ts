import type { CareerState, SeasonRecord } from './soccerCareerEngine';
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
export interface ClubStint {
  club: string;
  parent: string | null;
  firstYear: number;
  lastYear: number;
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  rows: { season: SeasonRecord; index: number }[];
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

interface CompetitionRecord {
  name: string;
  campaigns: number;
  goals: number;
  apps: number | null;
  assists: number | null;
  campaignsWithAssists: number;
}

export function careerCompetitionRecords(career: Pick<CareerState, 'seasons' | 'lastUCLResult' | 'intlHistory' | 'lastTournament'>) {
  const club = new Map<string, CompetitionRecord>();
  const international = new Map<string, CompetitionRecord>();
  const count = (n: unknown): n is number => Number.isSafeInteger(n) && Number(n) >= 0;
  function add(to: Map<string, CompetitionRecord>, name: string, goals: number, apps: number | null, assists: number | null) {
    if (!name || !count(goals) || (apps !== null && !count(apps))) return;
    const record = to.get(name) ?? { name, campaigns: 0, goals: 0, apps: null, assists: null, campaignsWithAssists: 0 };
    record.campaigns += 1;
    record.goals += goals;
    if (apps !== null) record.apps = (record.apps ?? 0) + apps;
    if (count(assists)) {
      record.assists = (record.assists ?? 0) + assists;
      record.campaignsWithAssists += 1;
    }
    to.set(name, record);
  }
  for (const season of career.seasons) {
    if (season.type !== 'playing') continue;
    const run = savedClubCampaign(career, season);
    if (run) {
      const matches = [...(run.firstStage?.stages ?? []).flatMap(stage => stage.games), ...run.matches];
      const savedGoals = matches.reduce((sum, match) => sum + match.playerGoals, 0);
      const maxAssists = matches.reduce((sum, match) => sum + match.goalsFor - match.playerGoals, 0);
      const assists = count(run.playerAssists) && run.playerAssists <= maxAssists && run.playerAssists <= season.assists ? run.playerAssists : null;
      if (matches.length && savedGoals === run.playerGoals) add(club, run.competition ?? 'Champions League', savedGoals, null, assists);
    }
    const worldCup = readClubWorldCup(season);
    if (worldCup?.apps) add(club, 'Club World Cup', worldCup.goals, worldCup.apps, worldCup.assists);
    const nationsLeague = readNationsLeagueCampaign(season);
    if (nationsLeague?.apps) add(international, 'Nations League', nationsLeague.goals, nationsLeague.apps, nationsLeague.assists);
  }
  for (const row of career.intlHistory ?? []) {
    if (!row?.apps) continue;
    const last = career.lastTournament;
    const latestAssists = last?.year === row.year && last.short === row.short && last.nation === row.nation
      && last.playerApps === row.apps && last.playerGoals === row.goals ? last.playerAssists : null;
    add(international, row.short, row.goals, row.apps, count(row.assists) ? row.assists : latestAssists);
  }
  return { club: [...club.values()], international: [...international.values()] };
}
