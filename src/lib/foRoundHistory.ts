export type FoRoundChange = [name: string, delta: number, overall: number];

export type FoRoundRecord = {
  round: number;
  wins: number;
  losses: number;
  otLosses?: number;
  reports?: string[];
};

type RoundOwner = { team: string; season: number };
export type FoRoundResult = FoRoundRecord & { changes: FoRoundChange[] | null };
export type FoRoundHistory = RoundOwner & { rounds: FoRoundResult[] };

type RoundLeague = {
  season: number;
  round: number;
  champions: { season: number }[];
  teams: Record<string, Pick<FoRoundRecord, 'wins' | 'losses' | 'otLosses'>>;
};

export const foCompletedRounds = (league: RoundLeague, limit: number): number => {
  const finished = league.champions.some(row => row.season === league.season);
  return Math.max(0, Math.min(limit, league.round - (finished ? 0 : 1)));
};

export function readFoRoundHistory(value: unknown, league: RoundLeague, team: string, limit: number): FoRoundHistory | null {
  if (!value || typeof value !== 'object') return null;
  const archive = value as Partial<FoRoundHistory>;
  const club = league.teams[team], completed = foCompletedRounds(league, limit);
  if (!club || archive.team !== team || archive.season !== league.season
    || !Array.isArray(archive.rounds) || archive.rounds.length > completed) return null;
  const rounds = archive.rounds.filter(row => row && Number.isInteger(row.round) && row.round >= 1 && row.round <= completed
    && Number.isInteger(row.wins) && row.wins >= 0 && row.wins <= club.wins
    && Number.isInteger(row.losses) && row.losses >= 0 && row.losses <= club.losses
    && (club.otLosses === undefined ? row.otLosses === undefined : typeof row.otLosses === 'number' && Number.isInteger(row.otLosses)
      && row.otLosses >= 0 && row.otLosses <= club.otLosses)
    && (row.changes === null || (Array.isArray(row.changes) && row.changes.length <= 60
    && row.changes.every(change => Array.isArray(change) && change.length === 3
      && typeof change[0] === 'string' && change[0].length > 0 && change[0].length <= 160
      && Number.isInteger(change[1]) && change[1] !== 0 && Number.isInteger(change[2])
      && change[2] >= 1 && change[2] <= 99 && change[2] - change[1] >= 1 && change[2] - change[1] <= 99))));
  if (rounds.length === 0 || new Set(rounds.map(row => row.round)).size !== rounds.length) return null;
  return { team, season: league.season, rounds: rounds.map(row => ({ ...roundRecord(row), changes: row.changes })) };
}

export function foRatingChanges(players: ReadonlyArray<{ id: string; name: string; ovr: number }>, opening: ReadonlyMap<string, number>): FoRoundChange[] {
  return players.flatMap<FoRoundChange>(player => {
    const before = opening.get(player.id);
    return before === undefined || before === player.ovr ? [] : [[player.name, player.ovr - before, player.ovr]];
  });
}

function roundRecord({ round, wins, losses, otLosses, reports }: FoRoundRecord): FoRoundRecord {
  const checkedReports = Array.isArray(reports) && reports.length > 0 && reports.length <= 2
    && reports.every(line => typeof line === 'string' && line.length > 0 && line.length <= 640);
  return { round, wins, losses, ...(otLosses === undefined ? {} : { otLosses }), ...(checkedReports ? { reports } : {}) };
}

export function appendFoRoundHistory(
  history: FoRoundHistory | null, previous: (FoRoundRecord & RoundOwner) | null,
  played: FoRoundRecord & RoundOwner, changes: FoRoundChange[],
): FoRoundHistory {
  const { team, season, round } = played;
  const rounds = history?.team === team && history.season === season ? history.rounds : [];
  const legacy = previous?.team === team && previous.season === season && previous.round < round
    && !rounds.some(row => row.round === previous.round) ? [{ ...roundRecord(previous), changes: null }] : [];
  return { team, season, rounds: [...rounds, ...legacy, { ...roundRecord(played), changes }] };
}
