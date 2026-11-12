import type { NrlManagerState, NrlPlayer, NrlRole, NrlScoring } from '@/lib/nrlManager';

export interface NrlPlayerScoring extends NrlScoring { playerId: string }
export interface NrlMatchScoringReport { kickerId: string; starters: string[]; lines: NrlPlayerScoring[] }
export interface NrlScoringLeader extends NrlPlayerScoring { name: string; points: number }
export type NrlSeasonScoringTotal = [
  playerId: string, name: string, tries: number, conversions: number, penalties: number, fieldGoals: number, longFieldGoals: number,
];

const scoringFields = ['tries', 'conversions', 'penalties', 'fieldGoals', 'longFieldGoals'] as const;
const emptyScoring = (): NrlScoring => ({ tries: 0, conversions: 0, penalties: 0, fieldGoals: 0, longFieldGoals: 0 });

// Point values come from NRL Laws, Section 6.
// https://www.nrl.com/siteassets/operations/the-game/nrl-international-rules-book-2023.pdf
export function nrlScorePoints(scoring: NrlScoring): number {
  return 4 * scoring.tries + 2 * scoring.conversions + 2 * scoring.penalties
    + scoring.fieldGoals + 2 * scoring.longFieldGoals;
}

const tryWeight: Record<NrlRole, number> = {
  Fullback: 1.65, 'Left Wing': 2.15, 'Left Centre': 1.55, 'Right Centre': 1.55, 'Right Wing': 2.15,
  'Five-eighth': 0.95, Halfback: 0.75, 'Prop 8': 0.45, Hooker: 0.85, 'Prop 10': 0.45,
  'Left Second Row': 1.1, 'Right Second Row': 1.1, Lock: 0.65,
};
const fieldWeight = (role: NrlRole) => role === 'Halfback' || role === 'Five-eighth' ? 5 : 0.35;

export function makeNrlScoringReport(
  totals: NrlScoring,
  starting: { id: string; role: NrlRole }[],
  rotation: ReadonlyMap<string, NrlPlayer>,
  kickerId: string,
  rng: () => number,
): NrlMatchScoringReport {
  const participants = starting.flatMap(({ id, role }) => {
    const reserve = rotation.get(id);
    return reserve
      ? [{ id, role, share: 0.68 }, { id: reserve.id, role, share: 0.32 }]
      : [{ id, role, share: 1 }];
  });
  const lines = new Map<string, NrlPlayerScoring>();
  function lineFor(playerId: string): NrlPlayerScoring {
    const current = lines.get(playerId);
    if (current) return current;
    const line = { playerId, ...emptyScoring() };
    lines.set(playerId, line);
    return line;
  }
  function distribute(field: 'tries' | 'fieldGoals' | 'longFieldGoals', weight: (role: NrlRole) => number) {
    const weighted = participants.map(player => player.share * weight(player.role));
    const total = weighted.reduce((sum, value) => sum + value, 0);
    for (let count = 0; count < totals[field]; count++) {
      let pick = rng() * total;
      for (const [index, value] of weighted.entries()) {
        pick -= value;
        if (pick < 0 || index === weighted.length - 1) {
          lineFor(participants[index].id)[field]++;
          break;
        }
      }
    }
  }
  distribute('tries', role => tryWeight[role]);
  if (totals.conversions || totals.penalties) {
    const kicker = lineFor(kickerId);
    kicker.conversions = totals.conversions;
    kicker.penalties = totals.penalties;
  }
  distribute('fieldGoals', fieldWeight);
  distribute('longFieldGoals', fieldWeight);
  return { kickerId, starters: starting.map(player => player.id), lines: [...lines.values()] };
}

interface NrlScoringMatchday {
  starting: { id: string; role: NrlRole }[];
  rotation: ReadonlyMap<string, NrlPlayer>;
}

export function makeNrlInterchangeScoringReport(
  totals: NrlScoring, firstHalf: NrlScoring, opening: NrlScoringMatchday, closing: NrlScoringMatchday,
  kickerId: string, rng: () => number,
): NrlMatchScoringReport {
  const first = makeNrlScoringReport(firstHalf, opening.starting, opening.rotation, kickerId, rng);
  const remaining = emptyScoring();
  for (const field of scoringFields) remaining[field] = totals[field] - firstHalf[field];
  const second = makeNrlScoringReport(remaining, closing.starting, closing.rotation, kickerId, rng);
  const lines = new Map(first.lines.map(line => [line.playerId, line]));
  for (const line of second.lines) {
    const total = lines.get(line.playerId);
    if (total) {
      for (const field of scoringFields) total[field] += line[field];
    } else {
      lines.set(line.playerId, line);
    }
  }
  return { ...first, lines: [...lines.values()] };
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const countIn = (value: unknown, max: number) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;

export function validNrlScoringReport(
  value: unknown, totals: NrlScoring, benchUsed: string[], known: ReadonlyMap<string, NrlPlayer>, starterCount: number,
): value is NrlMatchScoringReport {
  if (!record(value) || !Array.isArray(value.starters) || value.starters.length !== starterCount
    || typeof value.kickerId !== 'string' || !value.starters.includes(value.kickerId) || !Array.isArray(value.lines)) return false;
  const participants = [...value.starters, ...benchUsed];
  if (new Set(participants).size !== participants.length || !participants.every(id => typeof id === 'string' && known.has(id))
    || value.lines.length > participants.length) return false;
  const eligible = new Set(participants);
  const scorers = new Set<string>();
  const counted = emptyScoring();
  for (const line of value.lines) {
    if (!record(line) || typeof line.playerId !== 'string' || !eligible.has(line.playerId) || scorers.has(line.playerId)
      || (line.playerId !== value.kickerId && (line.conversions !== 0 || line.penalties !== 0))
      || !scoringFields.every(field => countIn(line[field], totals[field]))) return false;
    const scores = line as unknown as NrlPlayerScoring;
    if (nrlScorePoints(scores) === 0) return false;
    scorers.add(line.playerId);
    for (const field of scoringFields) counted[field] += scores[field];
  }
  return scoringFields.every(field => counted[field] === totals[field]);
}

const pointsOrder = (a: NrlScoringLeader, b: NrlScoringLeader) =>
  b.points - a.points || b.tries - a.tries || a.name.localeCompare(b.name) || a.playerId.localeCompare(b.playerId);

export function nrlScoringLeaders(state: Pick<NrlManagerState, 'results' | 'squad'>): NrlScoringLeader[] {
  const totals = new Map<string, NrlScoring>();
  for (const match of state.results) for (const line of match.playerScoring?.lines ?? []) {
    const total = totals.get(line.playerId) ?? emptyScoring();
    for (const field of scoringFields) total[field] += line[field];
    totals.set(line.playerId, total);
  }
  const names = new Map(state.squad.map(player => [player.id, player.name]));
  return [...totals].map(([playerId, scoring]) => ({
    playerId, name: names.get(playerId) ?? playerId, ...scoring, points: nrlScorePoints(scoring),
  })).sort(pointsOrder);
}

export function nrlTryLeaders(leaders: NrlScoringLeader[]): NrlScoringLeader[] {
  return leaders.filter(player => player.tries > 0).sort((a, b) => b.tries - a.tries || pointsOrder(a, b));
}

export function archiveNrlScoring(state: Pick<NrlManagerState, 'results' | 'squad'>): NrlSeasonScoringTotal[] {
  return nrlScoringLeaders(state).map(({ playerId, name, tries, conversions, penalties, fieldGoals, longFieldGoals }) =>
    [playerId, name, tries, conversions, penalties, fieldGoals, longFieldGoals]);
}

export function nrlArchivedScoringLeaders(archive: NrlSeasonScoringTotal[] | undefined): NrlScoringLeader[] {
  return (archive ?? []).map(([playerId, name, tries, conversions, penalties, fieldGoals, longFieldGoals]) => {
    const scoring = { tries, conversions, penalties, fieldGoals, longFieldGoals };
    return { playerId, name, ...scoring, points: nrlScorePoints(scoring) };
  }).sort(pointsOrder);
}

export function validNrlScoringArchive(value: unknown): value is NrlSeasonScoringTotal[] {
  if (!Array.isArray(value) || value.length > 30) return false;
  const ids = new Set<string>();
  let tries = 0;
  let conversions = 0;
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== 7 || typeof row[0] !== 'string' || !row[0]
      || typeof row[1] !== 'string' || !row[1] || ids.has(row[0])
      || !row.slice(2).every(count => countIn(count, 651)) || row.slice(2).every(count => count === 0)) return false;
    ids.add(row[0]);
    tries += row[2];
    conversions += row[3];
  }
  return conversions <= tries;
}
