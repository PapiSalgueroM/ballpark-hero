import { NBA_ROUNDS, type NbaLeague } from './nbaFrontOffice';

export type NbaRoundChange = [name: string, delta: number, overall: number];

export type NbaRoundResult = {
  round: number;
  wins: number;
  losses: number;
  changes: NbaRoundChange[] | null;
};

export type NbaRoundHistory = { team: string; season: number; rounds: NbaRoundResult[] };

export const nbaCompletedRounds = (league: NbaLeague): number => {
  const finished = league.champions.some(row => row.season === league.season);
  return Math.max(0, Math.min(NBA_ROUNDS, league.round - (finished ? 0 : 1)));
};

export function readNbaRoundHistory(value: unknown, league: NbaLeague, team: string): NbaRoundHistory | null {
  if (!value || typeof value !== 'object') return null;
  const archive = value as Partial<NbaRoundHistory>;
  const club = league.teams[team], completed = nbaCompletedRounds(league);
  if (!club || archive.team !== team || archive.season !== league.season
    || !Array.isArray(archive.rounds) || archive.rounds.length > completed) return null;
  const rounds = archive.rounds.filter(row => row && Number.isInteger(row.round) && row.round >= 1 && row.round <= completed
    && Number.isInteger(row.wins) && row.wins >= 0 && row.wins <= club.wins
    && Number.isInteger(row.losses) && row.losses >= 0 && row.losses <= club.losses
    && (row.changes === null || (Array.isArray(row.changes) && row.changes.length <= 60
    && row.changes.every(change => Array.isArray(change) && change.length === 3
      && typeof change[0] === 'string' && change[0].length > 0 && change[0].length <= 160
      && Number.isInteger(change[1]) && change[1] !== 0 && Number.isInteger(change[2])
      && change[2] >= 1 && change[2] <= 99 && change[2] - change[1] >= 1 && change[2] - change[1] <= 99))));
  if (rounds.length === 0 || new Set(rounds.map(row => row.round)).size !== rounds.length) return null;
  return { team, season: league.season, rounds };
}
