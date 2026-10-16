import { CAREER_HISTORICAL_OPPONENT_DISPLAY } from '@/data/careerHistoricalOpponentDisplay';
import { CAREER_LEAGUE_SEASONS } from '@/data/careerLeagueSeasons';
import type { SeasonRecord } from '@/lib/soccerCareerEngine';
import type { DerivedSeason, SlotLabel } from './core';
import type { SoccerSeasonCtx } from './soccer';

/** Fill one uniquely identified membership slot after the season is derived. */
export function historicalOpponentLabels(row: Pick<SeasonRecord, 'type' | 'year' | 'club'>, ctx: Pick<SoccerSeasonCtx, 'league'>, season: DerivedSeason): { names: string[]; labels: SlotLabel[]; note: string } | null {
  if (row.type !== 'playing' || row.year !== 2023 || ctx.league?.key !== 'Premier League') return null;
  const display = CAREER_HISTORICAL_OPPONENT_DISPLAY.find(member => member.year === row.year && member.league === ctx.league!.key);
  const ledger = CAREER_LEAGUE_SEASONS['Premier League'][2023];
  if (!display || ledger.others.length !== 1 || ledger.others[0] !== display.identity) return null;
  const members = [...ledger.clubs, display.name];
  if (members.length !== ledger.size || new Set(members).size !== members.length || !ledger.clubs.includes(row.club)) return null;
  if (season.teams !== ledger.size || season.labels.length !== ledger.size || season.labels[0]?.name !== row.club || !season.labels[0].named) return null;
  if (new Set(season.labels.map(label => label.key)).size !== season.labels.length) return null;
  const used = season.labels.filter(label => label.named).map(label => label.name);
  if (new Set(used).size !== used.length || used.some(name => !members.includes(name))) return null;
  const missing = season.labels.flatMap((label, slot) => label.named ? [] : [slot]);
  const unused = members.filter(name => !used.includes(name));
  if (missing.length !== 1 || missing[0] === 0 || unused.length !== 1 || unused[0] !== display.name) return null;
  const opponents = new Set(season.games.map(game => game.opp));
  if (opponents.size !== ledger.size - 1 || [...opponents].some(slot => !Number.isInteger(slot) || slot < 1 || slot >= ledger.size)) return null;
  const labels = season.labels.map((label, slot) => slot === missing[0] ? { name: display.name, named: true, key: display.name } : label);
  if (new Set(labels.map(label => label.key)).size !== labels.length) return null;
  return { labels, names: labels.map(label => label.name), note: '2023/24 club membership is verified. Match order and results are simulated.' };
}
