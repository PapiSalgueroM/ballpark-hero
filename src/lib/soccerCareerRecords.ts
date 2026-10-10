import type { CareerState, SeasonRecord } from './soccerCareerEngine';

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