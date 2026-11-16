import { nrlSeasonPlan, type NrlDrawModel } from '@/data/nrlManagerSeasons';
import { hashLabel, rngFrom } from '@/lib/careerEngine';
import {
  NRL_MAX_BENCH_USED, NRL_ROLES, nrlArchivedFinals, nrlLadder,
  type NrlFixture, type NrlManagerState, type NrlMatchResult, type NrlPlayer, type NrlRole, type NrlScoring,
} from '@/lib/nrlManager';
import { makeNrlScoringReport, nrlScorePoints, validNrlScoringReport, type NrlMatchScoringReport, type NrlPlayerScoring } from '@/lib/nrlPlayerScoring';

export type NrlLeaguePlayer = Pick<NrlPlayer, 'id' | 'name' | 'role' | 'secondaryRole' | 'rating'> & { clubId: string };
type LeaguePlayerIdentity = [id: string, name: string, clubId: string];
type Score = [tries: number, conversions: number, penalties: number, fieldGoals: number, longFieldGoals: number];
type LeagueSide = [
  starters: number[], bench: number[], kicker: number, scorers: [number, ...Score][],
  handoff?: [kicker: number, openingConversions: number, openingPenalties: number],
];
type LeagueFixture = [round: number, home: string, away: string, homeScore: Score, awayScore: Score, homeSide: LeagueSide, awaySide: LeagueSide];

export interface NrlLeagueBook {
  year: number;
  players: LeaguePlayerIdentity[];
  fixtures: LeagueFixture[];
}

type MatchContext = Pick<NrlManagerState, 'seed' | 'clubId' | 'originStandDown'>;
type LeagueFixtureSummary = NrlFixture & Pick<NrlMatchResult, 'homeScore' | 'awayScore'>;
type ManagedClub = (fixture: Pick<NrlFixture, 'round'>) => string;
type LeagueLeader = NrlPlayerScoring & {
  name: string; clubId: string; starts: number; appearances: number; points: number;
};

const packScore = ({ tries, conversions, penalties, fieldGoals, longFieldGoals }: NrlScoring): Score =>
  [tries, conversions, penalties, fieldGoals, longFieldGoals];
const unpackScore = ([tries, conversions, penalties, fieldGoals, longFieldGoals]: Score): NrlScoring =>
  ({ tries, conversions, penalties, fieldGoals, longFieldGoals });

const identity = ({ id, name, clubId }: NrlLeaguePlayer): LeaguePlayerIdentity => [id, name, clubId];
const halfback = NRL_ROLES.indexOf('Halfback');

export function createNrlLeagueBook(year: number, players: readonly NrlLeaguePlayer[]): NrlLeagueBook {
  return { year, players: players.map(identity), fixtures: [] };
}

function simulatedStarters(roster: readonly NrlLeaguePlayer[], unavailable: readonly string[]) {
  const eligible = roster.filter(player => !unavailable.includes(player.id));
  const chosen = new Map<NrlRole, string>();
  const assigned = new Set<string>();
  for (const role of NRL_ROLES) {
    const player = eligible.find(candidate => candidate.role === role);
    if (!player) continue;
    chosen.set(role, player.id);
    assigned.add(player.id);
  }
  for (const role of NRL_ROLES) {
    if (chosen.has(role)) continue;
    const player = eligible.find(candidate => !assigned.has(candidate.id) && candidate.secondaryRole === role)
      ?? eligible.find(candidate => !assigned.has(candidate.id))!;
    chosen.set(role, player.id);
    assigned.add(player.id);
  }
  return NRL_ROLES.map(role => ({ role, id: chosen.get(role)! }));
}

function packSide(report: NrlMatchScoringReport, bench: readonly string[], indexes: ReadonlyMap<string, number>): LeagueSide {
  const index = (id: string) => indexes.get(id)!;
  const { kickerHandoff } = report;
  const side: LeagueSide = [
    report.starters.map(index), bench.map(index), index(report.kickerId),
    report.lines.map(line => [index(line.playerId), ...packScore(line)]),
  ];
  if (kickerHandoff) side[4] = [index(kickerHandoff.playerId), kickerHandoff.openingConversions, kickerHandoff.openingPenalties];
  return side;
}

export function appendNrlLeagueMatches(book: NrlLeagueBook, context: MatchContext, players: readonly NrlLeaguePlayer[],
  results: readonly NrlMatchResult[]): NrlLeagueBook {
  if (!results.length) return book;
  const indexes = new Map(book.players.map(([id], index) => [id, index]));
  const squads = new Map<string, NrlLeaguePlayer[]>();
  for (const player of players) {
    const squad = squads.get(player.clubId) ?? [];
    squad.push(player);
    squads.set(player.clubId, squad);
  }
  for (const squad of squads.values()) squad.sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id));
  const { seed, clubId: managed, originStandDown } = context;
  const fixtures = results.map((match): LeagueFixture => {
    const { round, homeId, awayId, homeScoring, awayScoring } = match;
    const unavailable = originStandDown?.find(window => window.round === round)?.clubs;
    function side(clubId: string, score: NrlScoring) {
      if (clubId === managed && match.playerScoring) return packSide(match.playerScoring, match.benchUsed ?? [], indexes);
      const starters = simulatedStarters(squads.get(clubId)!, unavailable?.[clubId] ?? []);
      // Scoring is already settled. This fixture-side stream assigns credit without consuming a match roll.
      const kicker = starters[halfback].id;
      const rng = rngFrom(hashLabel(`nrl-league-attribution-v1|${seed}|${book.year}|${round}|${homeId}|${awayId}|${clubId}`));
      return packSide(makeNrlScoringReport(score, starters, new Map(), kicker, rng), [], indexes);
    }
    return [round, homeId, awayId, packScore(homeScoring), packScore(awayScoring), side(homeId, homeScoring), side(awayId, awayScoring)];
  });
  return { ...book, fixtures: [...book.fixtures, ...fixtures] };
}

function readSide(book: NrlLeagueBook, score: Score, [starters, bench, , scorers]: LeagueSide) {
  const player = (index: number) => {
    const [id, name] = book.players[index];
    return { id, name };
  };
  return {
    scoring: unpackScore(score), starters: starters.map(player), bench: bench.map(player),
    scorers: scorers.map(([index, ...scores]) => ({ playerId: book.players[index][0], name: book.players[index][1], ...unpackScore(scores) })),
  };
}

export function nrlLeagueMatch(book: NrlLeagueBook | undefined, round: number, homeId: string, awayId: string) {
  const fixture = book?.fixtures.find(([at, home, away]) => round === at && homeId === home && awayId === away);
  if (!book || !fixture) return undefined;
  const [, , , homeScore, awayScore, homeSide, awaySide] = fixture;
  return { round, homeId, awayId, home: readSide(book, homeScore, homeSide), away: readSide(book, awayScore, awaySide) };
}

export function nrlLeagueFixtures(book: NrlLeagueBook | undefined): LeagueFixtureSummary[] {
  if (!book) return [];
  const regular = nrlSeasonPlan(book.year).draw.length;
  return book.fixtures.map(([round, homeId, awayId, home, away]) => ({
    round, homeId, awayId, homeScore: nrlScorePoints(unpackScore(home)), awayScore: nrlScorePoints(unpackScore(away)),
    ...(round > regular && { finalsRound: round - regular }),
  }));
}

export function nrlLeagueLeaders(book: NrlLeagueBook | undefined, clubId?: string): LeagueLeader[] {
  if (!book) return [];
  const { players: dictionary, fixtures } = book;
  const players = new Map<number, LeagueLeader>();
  function row(index: number) {
    const current = players.get(index);
    if (current) return current;
    const [playerId, name, owner] = dictionary[index];
    const next = { playerId, name, clubId: owner, starts: 0, appearances: 0, points: 0, ...unpackScore([0, 0, 0, 0, 0]) };
    players.set(index, next);
    return next;
  }
  function count(club: string, [starters, bench, , lines]: LeagueSide) {
    if (clubId && club !== clubId) return;
    for (const index of starters) {
      const player = row(index);
      player.starts++;
      player.appearances++;
    }
    for (const index of bench) row(index).appearances++;
    for (const [index, tries, conversions, penalties, fieldGoals, longFieldGoals] of lines) {
      const player = row(index);
      player.tries += tries;
      player.conversions += conversions;
      player.penalties += penalties;
      player.fieldGoals += fieldGoals;
      player.longFieldGoals += longFieldGoals;
    }
  }
  for (const [, home, away, , , homeSide, awaySide] of fixtures) {
    count(home, homeSide);
    count(away, awaySide);
  }
  return [...players.values()].map(player => ({ ...player, points: nrlScorePoints(player) }))
    .sort((a, b) => b.tries - a.tries || b.starts - a.starts || b.points - a.points
      || a.name.localeCompare(b.name) || a.playerId.localeCompare(b.playerId));
}

const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));
const intIn = (value: unknown, low: number, high: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high;
const nonempty = (value: unknown): value is string => typeof value === 'string' && Boolean(value);

function validScore(value: unknown): value is Score {
  return Array.isArray(value) && value.length === 5 && intIn(value[0], 0, 22) && intIn(value[1], 0, value[0])
    && intIn(value[2], 0, 3) && intIn(value[3], 0, 2) && intIn(value[4], 0, 2);
}

function validSide(value: unknown, score: Score, indexed: ReadonlyMap<number, string>, allowBench: boolean,
  unavailable: readonly string[]): value is LeagueSide {
  if (!Array.isArray(value) || (value.length !== 4 && (value.length !== 5 || !allowBench))) return false;
  const [starters, bench, kicker, lines, handoff] = value;
  const contains = (index: unknown): index is number => typeof index === 'number' && indexed.has(index);
  const ids = (row: unknown, maximum: number): row is number[] => Array.isArray(row) && row.length <= maximum && row.every(contains);
  if (!ids(starters, NRL_ROLES.length) || starters.length !== NRL_ROLES.length || !ids(bench, allowBench ? NRL_MAX_BENCH_USED : 0)
    || !contains(kicker) || !starters.includes(kicker) || (!allowBench && kicker !== starters[halfback])
    || !Array.isArray(lines) || lines.length > starters.length + bench.length
    || !lines.every(line => Array.isArray(line) && line.length === 6 && contains(line[0]))) return false;
  if (value.length === 5 && (!Array.isArray(handoff) || handoff.length !== 3 || !contains(handoff[0])
    || !intIn(handoff[1], 0, score[1]) || !intIn(handoff[2], 0, score[2]))) return false;
  const id = (index: number) => indexed.get(index)!;
  const participants = new Set(indexed.values());
  for (const member of unavailable) participants.delete(member);
  const report: NrlMatchScoringReport = {
    starters: starters.map(id), kickerId: id(kicker),
    lines: lines.map(([index, ...scoring]) => ({ playerId: id(index), ...unpackScore(scoring as Score) })),
    ...(handoff && { kickerHandoff: { playerId: id(handoff[0]), openingConversions: handoff[1], openingPenalties: handoff[2] } }),
  };
  return validNrlScoringReport(report, unpackScore(score), bench.map(id), participants, NRL_ROLES.length);
}

function validateBook(value: unknown, year: number, fixtures: readonly NrlFixture[], managedClub: ManagedClub,
  originStandDown?: NrlManagerState['originStandDown']): value is NrlLeagueBook {
  const { clubs } = nrlSeasonPlan(year);
  if (!record(value) || Object.keys(value).length !== 3 || value.year !== year
    || !Array.isArray(value.players) || value.players.length !== clubs.length * 30
    || !Array.isArray(value.fixtures) || value.fixtures.length !== fixtures.length) return false;
  const byClub = new Map<string, Map<number, string>>(clubs.map(({ id }) => [id, new Map()]));
  const ids = new Set<string>(), names = new Set<string>();
  for (const [index, player] of value.players.entries()) {
    if (!Array.isArray(player) || player.length !== 3) return false;
    const [id, name, club] = player;
    const squad = byClub.get(club);
    if (!nonempty(id) || !nonempty(name) || !squad || ids.has(id) || names.has(name)) return false;
    ids.add(id);
    names.add(name);
    squad.set(index, id);
  }
  if ([...byClub.values()].some(squad => squad.size !== 30)) return false;
  return fixtures.every((match, index) => {
    const row = (value.fixtures as unknown[])[index];
    if (!Array.isArray(row) || row.length !== 7) return false;
    const { round, homeId, awayId } = match;
    const [, , , home, away, homeSide, awaySide] = row;
    if (row[0] !== round || row[1] !== homeId || row[2] !== awayId || !validScore(home) || !validScore(away)) return false;
    const managed = managedClub(match);
    const called = originStandDown?.find(window => window.round === round)?.clubs;
    return validSide(homeSide, home, byClub.get(homeId)!, homeId === managed, called?.[homeId] ?? [])
      && validSide(awaySide, away, byClub.get(awayId)!, awayId === managed, called?.[awayId] ?? []);
  });
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function validNrlActiveLeagueBook(value: unknown, season: NrlManagerState, players: readonly NrlLeaguePlayer[]): value is NrlLeagueBook {
  const { caretaker, clubId, results, year, originStandDown } = season;
  const managed = ({ round }: Pick<NrlFixture, 'round'>) => caretaker && round < caretaker.round ? caretaker.clubId : clubId;
  if (!validateBook(value, year, results, managed, originStandDown) || !same(value.players, players.map(identity))) return false;
  const indexes = new Map(value.players.map(([id], index) => [id, index]));
  return results.every((match, index) => {
    const [, , , home, away, homeSide, awaySide] = value.fixtures[index];
    if (!same(home, packScore(match.homeScoring)) || !same(away, packScore(match.awayScoring))) return false;
    if (!match.playerScoring) return true;
    const side = match.homeId === managed(match) ? homeSide : awaySide;
    return same(side, packSide(match.playerScoring, match.benchUsed ?? [], indexes));
  });
}

export function validNrlArchivedLeagueBook(value: unknown, year: number, finals: unknown, ladder: unknown,
  managed: ManagedClub, drawModel?: NrlDrawModel): value is NrlLeagueBook {
  const { draw } = nrlSeasonPlan(year, drawModel);
  const pastFinals = nrlArchivedFinals(finals, year);
  if (!pastFinals) return false;
  const regular = draw.flatMap((round, index) => round.map(([homeId, awayId]) => ({ round: index + 1, homeId, awayId })));
  if (!validateBook(value, year, [...regular, ...pastFinals.matches], managed)) return false;
  const scores = nrlLeagueFixtures(value);
  if (!pastFinals.matches.every((match, index) => {
    const saved = scores[regular.length + index];
    return saved.homeScore === match.homeScore && saved.awayScore === match.awayScore;
  })) return false;
  const results = regular.map((_, index) => ({
    ...scores[index], homeScoring: unpackScore(value.fixtures[index][3]), awayScoring: unpackScore(value.fixtures[index][4]), extraTime: false,
  }));
  return same(ladder, nrlLadder({ year, round: draw.length + 1, results })
    .map(({ clubId, wins, draws, pointsFor, pointsAgainst }) => [clubId, wins, draws, pointsFor, pointsAgainst]));
}
