import type { NrlManagerState, NrlPlayer, NrlRole, NrlScoring } from '@/lib/nrlManager';

export interface NrlPlayerScoring extends NrlScoring { playerId: string }
export interface NrlMatchScoringReport {
  kickerId: string;
  starters: string[];
  lines: NrlPlayerScoring[];
  kickerHandoff?: { playerId: string; openingConversions: number; openingPenalties: number };
}
export interface NrlScoringLeader extends NrlPlayerScoring { name: string; points: number }
export type NrlSeasonScoringTotal = [
  playerId: string, name: string, tries: number, conversions: number, penalties: number, fieldGoals: number, longFieldGoals: number,
];
type NrlFinalsScoring = [tries: number, conversions: number, penalties: number, fieldGoals: number, longFieldGoals: number];
type NrlSeasonPlayerRow = [
  id: string, name: string, rating: number, regularStarts: number, regularBench: number,
  finalsStarts: number, finalsBench: number, finalsScoring?: NrlFinalsScoring,
];
export type NrlSeasonPlayerArchive = NrlSeasonPlayerRow[];

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

function afterScore(total: NrlScoring, before: NrlScoring): NrlScoring {
  const remaining = emptyScoring();
  for (const field of scoringFields) remaining[field] = total[field] - before[field];
  return remaining;
}

export function makeNrlInterchangeScoringReport(
  totals: NrlScoring, firstHalf: NrlScoring, opening: NrlScoringMatchday, closing: NrlScoringMatchday,
  kickerId: string, rng: () => number, late?: NrlScoringMatchday & { through60: NrlScoring }, closingKickerId = kickerId,
): NrlMatchScoringReport {
  const first = makeNrlScoringReport(firstHalf, opening.starting, opening.rotation, kickerId, rng);
  const second = makeNrlScoringReport(afterScore(late?.through60 ?? totals, firstHalf), closing.starting, closing.rotation, closingKickerId, rng);
  const finish = late && makeNrlScoringReport(afterScore(totals, late.through60), late.starting, late.rotation, closingKickerId, rng);
  const lines = new Map(first.lines.map(line => [line.playerId, line]));
  for (const line of [...second.lines, ...(finish?.lines ?? [])]) {
    const total = lines.get(line.playerId);
    if (total) {
      for (const field of scoringFields) total[field] += line[field];
    } else {
      lines.set(line.playerId, line);
    }
  }
  return { ...first, lines: [...lines.values()], ...(closingKickerId !== kickerId && { kickerHandoff: {
    playerId: closingKickerId, openingConversions: firstHalf.conversions, openingPenalties: firstHalf.penalties,
  } }) };
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
  const handoff = value.kickerHandoff;
  let deputy: string | undefined;
  let firstConversions = totals.conversions;
  let firstPenalties = totals.penalties;
  if (handoff !== undefined) {
    if (!record(handoff) || Object.keys(handoff).length !== 3 || typeof handoff.playerId !== 'string'
      || handoff.playerId === value.kickerId || !value.starters.includes(handoff.playerId)
      || !countIn(handoff.openingConversions, totals.conversions) || !countIn(handoff.openingPenalties, totals.penalties)) return false;
    deputy = handoff.playerId;
    firstConversions = handoff.openingConversions as number;
    firstPenalties = handoff.openingPenalties as number;
  }
  const scorers = new Set<string>();
  const counted = emptyScoring();
  for (const line of value.lines) {
    if (!record(line) || typeof line.playerId !== 'string' || !eligible.has(line.playerId) || scorers.has(line.playerId)
      || !scoringFields.every(field => countIn(line[field], totals[field]))) return false;
    const opening = line.playerId === value.kickerId;
    const closing = deputy === line.playerId;
    if (line.conversions !== (opening ? firstConversions : closing ? totals.conversions - firstConversions : 0)
      || line.penalties !== (opening ? firstPenalties : closing ? totals.penalties - firstPenalties : 0)) return false;
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

export type NrlSquadStatsScope = 'all' | 'regular' | 'finals';

export function nrlSquadSeasonStats({ clubId, results, squad }: Pick<NrlManagerState, 'clubId' | 'results' | 'squad'>,
  scope: NrlSquadStatsScope) {
  const players = new Map(squad.map(({ id, name, rating }) => [id, { id, name, rating, starts: 0, bench: 0, ...emptyScoring() }]));
  let played = 0;
  let tracked = 0;
  for (const match of results) {
    if (match.homeId !== clubId && match.awayId !== clubId) continue;
    if ((scope === 'regular' && match.finalsRound) || (scope === 'finals' && !match.finalsRound)) continue;
    played++;
    const report = match.playerScoring;
    if (!report) continue;
    tracked++;
    for (const id of report.starters) players.get(id)!.starts++;
    for (const id of match.benchUsed ?? []) players.get(id)!.bench++;
    for (const line of report.lines) {
      const player = players.get(line.playerId)!;
      for (const field of scoringFields) player[field] += line[field];
    }
  }
  const rows = [...players.values()].map(player => ({ ...player, apps: player.starts + player.bench, points: nrlScorePoints(player) }))
    .sort((a, b) => b.apps - a.apps || b.points - a.points || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return { played, tracked, rows };
}

export function archiveNrlPlayerSeasons(season: Pick<NrlManagerState, 'clubId' | 'results' | 'squad'>): NrlSeasonPlayerArchive | undefined {
  const regular = nrlSquadSeasonStats(season, 'regular');
  const finals = nrlSquadSeasonStats(season, 'finals');
  if (!regular.tracked || regular.played !== regular.tracked || finals.played !== finals.tracked) return;
  const finalsById = new Map(finals.rows.map(player => [player.id, player]));
  return regular.rows.flatMap(player => {
    const final = finalsById.get(player.id)!;
    if (!player.apps && !final.apps) return [];
    const row: NrlSeasonPlayerRow = [player.id, player.name, player.rating, player.starts, player.bench, final.starts, final.bench];
    if (final.points > 0) row.push([final.tries, final.conversions, final.penalties, final.fieldGoals, final.longFieldGoals]);
    return [row];
  });
}

export function nrlArchivedPlayerSeason(row: NrlSeasonPlayerRow, total: NrlSeasonScoringTotal | undefined) {
  const [, , rating, regularStarts, regularBench, finalsStarts, finalsBench, finalsScoring] = row;
  const [, , tries, conversions, penalties, fieldGoals, longFieldGoals] = total ?? ['', '', 0, 0, 0, 0, 0];
  const [ft, fc, fp, ff, fl] = finalsScoring ?? [0, 0, 0, 0, 0];
  const regular = { tries: tries - ft, conversions: conversions - fc, penalties: penalties - fp, fieldGoals: fieldGoals - ff, longFieldGoals: longFieldGoals - fl };
  const finals = { tries: ft, conversions: fc, penalties: fp, fieldGoals: ff, longFieldGoals: fl };
  return {
    rating,
    regular: { ...regular, starts: regularStarts, bench: regularBench, apps: regularStarts + regularBench, points: nrlScorePoints(regular) },
    finals: { ...finals, starts: finalsStarts, bench: finalsBench, apps: finalsStarts + finalsBench, points: nrlScorePoints(finals) },
  };
}

export function validNrlPlayerSeasonArchive(value: unknown, scoring: NrlSeasonScoringTotal[], finalMatches: number, finalPoints: number):
  value is NrlSeasonPlayerArchive {
  if (!Array.isArray(value) || value.length < 13 || value.length > 30) return false;
  const scoringById = new Map(scoring.map(row => [row[0], row]));
  const ids = new Set<string>();
  let regularStarts = 0, regularBench = 0, finalsStarts = 0, finalsBench = 0, finalsPoints = 0;
  let finalsTries = 0, finalsConversions = 0;
  for (const row of value) {
    if (!Array.isArray(row) || (row.length !== 7 && row.length !== 8)) return false;
    const [id, name, rating, rs, rb, fs, fb, goals] = row;
    if (typeof id !== 'string' || !id || typeof name !== 'string' || !name || ids.has(id)
      || !countIn(rating, 98) || rating < 40 || !countIn(rs, 24) || !countIn(rb, 24) || rs + rb > 24
      || !countIn(fs, finalMatches) || !countIn(fb, finalMatches) || fs + fb > finalMatches || rs + rb + fs + fb === 0) return false;
    const total = scoringById.get(id);
    if (total && total[1] !== name) return false;
    if (goals !== undefined && (!Array.isArray(goals) || goals.length !== scoringFields.length || !total || fs + fb === 0
      || !goals.every((count, index) => countIn(count, total[index + 2] as number)) || !goals.some(Boolean))) return false;
    const split = nrlArchivedPlayerSeason(row as NrlSeasonPlayerRow, total);
    if (split.regular.points && rs + rb === 0) return false;
    regularStarts += rs;
    regularBench += rb;
    finalsStarts += fs;
    finalsBench += fb;
    finalsPoints += split.finals.points;
    finalsTries += split.finals.tries;
    finalsConversions += split.finals.conversions;
    ids.add(id);
  }
  const tries = scoring.reduce((sum, row) => sum + row[2], 0);
  const conversions = scoring.reduce((sum, row) => sum + row[3], 0);
  return regularStarts === 13 * 24 && regularBench <= 4 * 24 && finalsStarts === 13 * finalMatches
    && finalsBench <= 4 * finalMatches && finalsPoints === finalPoints
    && finalsConversions <= finalsTries && conversions - finalsConversions <= tries - finalsTries
    && scoring.every(row => ids.has(row[0]));
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
