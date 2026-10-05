/**
 * Round 1014: Aussie Rules Manager, the full season. Eighteen fictional clubs,
 * 23 home and away rounds, the finals (the 2026 wildcard week, then the final
 * eight), a Grand Final, and a summer of ageing, retirements and a national
 * draft into season two and beyond.
 *
 * ONE MATCH CORE. The minute loop (quarter), the AI match (simulateOtherMatch),
 * the ladder maths (ladderFor), selection (automaticLineup, validLineup) and
 * preparation (prepareClubs) are imported from the Round 792 file
 * aussieRulesManager.ts, unchanged. This file owns what legitimately differs:
 * the 18 club data, the season length, the finals, the summer and the draft.
 *
 * THE OLD SAVE IS NEVER CONVERTED (the Round 301 rule, written down here).
 * 'aussie-rules-manager-save-v1' holds an action log that the frozen v1 engine
 * replays. A six club, ten round season cannot honestly become an 18 club
 * league, so v1 saves stay readable on the legacy board for good and starting
 * this season removes them. The v2 save is the STATE itself, the shape Club
 * Manager and the front offices use, because an action log would freeze every
 * rule in this file forever, which is the trap v1 is in.
 *
 * FICTIONAL CLUBS, A REAL SHAPED COMPETITION. Every club, place, nickname and
 * player is invented. The shape (club count, games, ladder points, percentage,
 * the finals) is sourced or labelled as this game's rule in aussieRulesFormat.ts.
 * No real person or club receives a generated stat, result or line of dialogue.
 */
import { hashLabel, rngFrom } from '@/lib/careerEngine';
import { roundRobinCalendar } from '@/lib/leagueCore';
import { raiseWithinPotential } from '@/lib/careerHeadroom';
import { bandRead } from '@/lib/gmDealTable';
import {
  automaticLineup, emptyMatch, ladderFor, prepareClubs, quarter, readManagerSave, ROLE_COUNTS, ROLES, simulateOtherMatch, validLineup,
  type Club, type LadderRow, type Match, type Player, type Preparation, type Role, type Score, type Tactic,
} from '@/lib/aussieRulesManager';
import { CURRENT_FINALS_FORMAT, EXTRA_TIME, exitForTie, FINALS_PRESETS, type AussieFinalsFormat, type FinalsExit } from '@/lib/aussieRulesFormat';
import { eliminated, finalsWeeks, resolveWeek, type TieOutcome } from '@/lib/finalsBracket';
import type { HubTile } from '@/components/hub/HubTiles';

export const SLUG = 'aussie-rules-manager';
export const SAVE_KEY = 'aussie-rules-manager-save-v2';
export const LEGACY_SAVE_KEY = 'aussie-rules-manager-save-v1';
export const ROUNDS = 23;
export const CLUB_COUNT = 18;
export const LIST_SIZE = 36;
/** Every list keeps one more than the starting count in each role, so a full bench can always be picked. */
// v1's ROLE_COUNTS plus one each, written out so no imported value is read at module scope.
export const ROLE_FLOORS: Record<Role, number> = { defender: 7, midfielder: 6, ruck: 2, forward: 7 };
/** Fatigue every player sheds between rounds and between finals weeks (v1 uses 20). Game rule. */
export const RECOVERY = 20;
/** Tier skill offsets, a game rule tuned in simAussieRulesSeason section 6. */
export const TIER_OFFSETS: Record<number, number> = { 1: 6, 2: 3, 3: 0, 4: -3, 5: -6 };
export const DRAFT_AGE = 18;

export interface LeaguePlayer extends Player { age: number; potential: number }
export interface LeagueClub extends Club { players: LeaguePlayer[]; tier: number }
export type LeaguePhase = 'prepare' | 'quarter' | 'break' | 'report' | 'seasonOver' | 'summer' | 'draft';
export type LeagueStage = 'homeAway' | 'finals';
export interface FinalsTieRecord { id: string; week: number; homeId: string; awayId: string; result?: { home: Score; away: Score; extraTime: boolean } }
export interface Prospect { id: string; name: string; role: Role; age: number; skill: number; potential: number }
export interface DraftState { order: string[]; pool: Prospect[]; made: { clubId: string; prospectId: string }[]; at: number }
export interface HistoryRow {
  season: number; place: number; w: number; d: number; l: number; pf: number; pa: number; exit: FinalsExit;
  premier: string; runnerUp: string; gf: { home: string; away: string; homeScore: Score; awayScore: Score };
  leadingGoalkicker: { name: string; club: string; goals: number };
}
export interface LeagueState {
  version: 2; seed: number; myClub: string; clubName: string; season: number; format: AussieFinalsFormat;
  phase: LeaguePhase; stage: LeagueStage; round: number; week: number;
  clubs: LeagueClub[]; starters: string[]; bench: string[]; preparation: Preparation | null; swapsThisBreak: number;
  match: Match | null; results: Match[]; goals: Record<string, number>;
  finals: { ties: FinalsTieRecord[] } | null; draft: DraftState | null; nextId: number; history: HistoryRow[];
}
export type LeagueAction =
  | { type: 'lineup'; starters: string[]; bench: string[] }
  | { type: 'prepare'; choice: Preparation }
  | { type: 'play'; tactic: Tactic }
  | { type: 'playMatch'; tactic: Tactic }
  | { type: 'swap'; outId: string; inId: string }
  | { type: 'next' }
  | { type: 'simWeek' }
  | { type: 'pick'; prospectId: string }
  | { type: 'draftAuto' };

/** The 18 clubs: fixed data, so the menu draws nothing. Places and nicknames are invented. */
// Places are invented and checked against near misses of real towns (research section 12); nicknames avoid NICKNAME_DENY_LIST.
export const CLUBS: { id: string; place: string; nickname: string; style: Tactic; tier: number }[] = [
  ['Caldermere', 'Comets', 'control', 1], ['Mosswick', 'Kites', 'direct', 3], ['Tarnwick', 'Foxes', 'pressure', 2],
  ['Alderfen', 'Herons', 'control', 4], ['Verrendale', 'Embers', 'direct', 2], ['Quillmere', 'Gales', 'pressure', 5],
  ['Brindlefern', 'Currawongs', 'control', 3], ['Hollowmere', 'Plovers', 'direct', 1], ['Kelworth', 'Quolls', 'pressure', 4],
  ['Fallmere', 'Wattles', 'control', 2], ['Glenwick', 'Ironbarks', 'direct', 5], ['Haverfen', 'Bandicoots', 'pressure', 3],
  ['Darnwick', 'Lorikeets', 'control', 4], ['Belvarra', 'Numbats', 'direct', 2], ['Elverfern', 'Larrikins', 'pressure', 1],
  ['Tressvale', 'Pelicans', 'control', 3], ['Vantmere', 'Kestrels', 'direct', 4], ['Fernwick', 'Echidnas', 'pressure', 5],
].map(([place, nickname, style, tier], index) => ({ id: `club-${String(index).padStart(2, '0')}`, place: place as string, nickname: nickname as string, style: style as Tactic, tier: tier as number }));
export const clubLabel = (id: string) => { const club = CLUBS.find(value => value.id === id); return club ? `${club.place} ${club.nickname}` : id; };
export const placeOf = (id: string) => CLUBS.find(value => value.id === id)?.place ?? id;

const FIRST = ['Arvel', 'Bastren', 'Cadrel', 'Dellan', 'Edrin', 'Faelan', 'Garven', 'Halren', 'Iskel', 'Jorvan', 'Kavrin', 'Lorcen', 'Mavren', 'Nolvan', 'Orvel', 'Pellan', 'Quinlo', 'Ravel', 'Sorrin', 'Tamsel',
  'Ulvan', 'Varrel', 'Wendel', 'Yorren', 'Zavrin', 'Albren', 'Belvan', 'Corvel', 'Dravin', 'Elwen', 'Fendrel', 'Gavrel', 'Hollin', 'Irvane', 'Jessel', 'Korvan', 'Lendrel', 'Merrin', 'Nevrin', 'Ostrel',
  'Parvin', 'Rendal', 'Selvan', 'Torvel', 'Uldren', 'Vesten', 'Wylan', 'Yaren', 'Brannel', 'Cassel', 'Dorvane', 'Emric', 'Falkren', 'Gellan', 'Harvel', 'Jarrin', 'Kesten', 'Lowen', 'Marlen', 'Narvel'];
const LAST = ['Aldfen', 'Barlwick', 'Cranholm', 'Dunmere', 'Elverholm', 'Falstead', 'Gormvale', 'Harlfen', 'Isterwick', 'Jasmere', 'Kernvale', 'Lomwick', 'Marlfen', 'Norholm', 'Ormstead', 'Pellwick', 'Quarmere', 'Ravfen', 'Sellmere', 'Thornfen',
  'Ulmwick', 'Velholm', 'Wrenmere', 'Yarvale', 'Ambermere', 'Brisfen', 'Coldholm', 'Dravwick', 'Eskvale', 'Fenmere', 'Glassfen', 'Hollowick', 'Ivelmere', 'Jorvale', 'Kelfen', 'Larkholm', 'Mossvale', 'Nettlefen', 'Oakmere', 'Pinholm',
  'Quillfen', 'Rushwick', 'Saltholm', 'Tarnvale', 'Umberfen', 'Vantholm', 'Willowfen', 'Yewmere', 'Bramblewick', 'Copperfen', 'Dunholm', 'Embervale', 'Fernholm', 'Greywick', 'Heathmere', 'Ironvale', 'Juniperfen', 'Kinvale', 'Linnmere', 'Marrowfen'];
export const NAME_BANK_SIZE = FIRST.length * LAST.length;

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const validSeed = (seed: unknown): seed is number => Number.isInteger(seed) && (seed as number) >= 0 && (seed as number) <= 0xffffffff;
export const isClubId = (id: unknown): id is string => typeof id === 'string' && CLUBS.some(club => club.id === id);
export const seasonSeed = (seed: number, season: number) => hashLabel(`${seed}|${season}`);

/** A free invented name, probing the bank from a random start like v1 does. */
function freshName(rng: () => number, used: Set<string>): string {
  const start = Math.floor(rng() * NAME_BANK_SIZE);
  for (let attempt = 0; attempt < NAME_BANK_SIZE; attempt += 1) {
    const index = (start + attempt) % NAME_BANK_SIZE;
    const candidate = `${FIRST[Math.floor(index / LAST.length)]} ${LAST[index % LAST.length]}`;
    if (!used.has(candidate)) { used.add(candidate); return candidate; }
  }
  return `Player ${used.size + 1}`;
}
/** Headroom above today's skill by age: young players have the most to grow into. Game rule. */
function potentialFor(rng: () => number, skill: number, age: number): number {
  const room = age <= 21 ? 5 + Math.floor(rng() * 21) : age <= 25 ? Math.floor(rng() * 11) : Math.floor(rng() * 4);
  return Math.min(99, skill + room);
}
const roleAt = (index: number): Role => index < 12 ? 'defender' : index < 22 ? 'midfielder' : index < 26 ? 'ruck' : 'forward';

export function createLeagueWorld(seed: number): { clubs: LeagueClub[]; nextId: number } {
  const rng = rngFrom(hashLabel(`${seed}|world`));
  const used = new Set<string>();
  let nextId = 0;
  const clubs = CLUBS.map(data => ({
    id: data.id, name: `${data.place} ${data.nickname}`, style: data.style, tier: data.tier,
    players: Array.from({ length: LIST_SIZE }, (_, index): LeaguePlayer => {
      const name = freshName(rng, used);
      const skill = clamp(40 + Math.floor(rng() * 51) + TIER_OFFSETS[data.tier], 20, 99);
      const age = 18 + Math.floor(rng() * 16);
      return { id: `p-${nextId++}`, name, role: roleAt(index), skill, stamina: 45 + Math.floor(rng() * 46), fatigue: 0, prep: 0, age, potential: potentialFor(rng, skill, age) };
    }),
  }));
  return { clubs, nextId };
}

// The season draw: 23 rounds of nine games off the shared round robin, over a
// club order shuffled once per season. Derived from (seed, season), never saved.
let calendarMemo: [number, number][] | null = null;
function calendar(): [number, number][] {
  if (!calendarMemo) calendarMemo = roundRobinCalendar(CLUB_COUNT).slice(0, ROUNDS * (CLUB_COUNT / 2));
  return calendarMemo;
}
export function seasonOrder(seed: number, season: number): string[] {
  const rng = rngFrom(hashLabel(`${seed}|${season}|order`));
  const order = CLUBS.map(club => club.id);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order;
}
export function fixturesFor(seed: number, season: number, round: number): { homeId: string; awayId: string }[] {
  if (!Number.isInteger(round) || round < 0 || round >= ROUNDS) return [];
  const order = seasonOrder(seed, season);
  const games = CLUB_COUNT / 2;
  return calendar().slice(round * games, round * games + games).map(([home, away]) => ({ homeId: order[home], awayId: order[away] }));
}
const otherSide = (match: Pick<Match, 'homeId' | 'awayId'>, clubId: string) => match.homeId === clubId ? match.awayId : match.homeId;
/** Finals dice labels sit above every home and away round, one per week, so no final reuses a round's dice. */
export const finalsRound = (week: number) => ROUNDS + week;
export const clubOf = (state: Pick<LeagueState, 'clubs'>, id: string) => state.clubs.find(club => club.id === id);
export const leaguePlayer = (state: Pick<LeagueState, 'clubs'>, id: string): LeaguePlayer | undefined => {
  for (const club of state.clubs) { const found = club.players.find(player => player.id === id); if (found) return found; }
  return undefined;
};
const strip = (match: Match): Match => ({ ...match, events: [], homeSquad: [], awaySquad: [] });
/** Adds a match's goals into the tally IN PLACE: callers pass a copy made once per round. */
function tally(goals: Record<string, number>, match: Match): Record<string, number> {
  const next = goals;
  for (const event of match.events) if (event.kind === 'goal') next[event.playerId] = (next[event.playerId] ?? 0) + 1;
  return next;
}
/** The ladder over this season's home and away games, through v1's one ladder maths. */
export const leagueLadder = (state: Pick<LeagueState, 'clubs' | 'results'>): LadderRow[] => ladderFor(state);
export const seedsOf = (state: Pick<LeagueState, 'clubs' | 'results'>) => leagueLadder(state).map(row => row.clubId);

/** The new round's own fixture with your list manager's best 23 on current form. */
function openRound(state: LeagueState, round: number): LeagueState {
  const fixture = fixturesFor(state.seed, state.season, round).find(value => value.homeId === state.myClub || value.awayId === state.myClub)!;
  const lineup = automaticLineup(clubOf(state, state.myClub)!);
  return { ...state, ...lineup, stage: 'homeAway', round, phase: 'prepare', preparation: null, swapsThisBreak: 0, match: emptyMatch(round, fixture.homeId, fixture.awayId) };
}
function recover(clubs: LeagueClub[]): LeagueClub[] {
  return clubs.map(club => ({ ...club, players: club.players.map(player => ({ ...player, fatigue: Math.max(0, player.fatigue - RECOVERY), prep: 0 })) }));
}
function freshSeason(state: LeagueState, season: number): LeagueState {
  const clubs = state.clubs.map(club => ({ ...club, players: club.players.map(player => ({ ...player, fatigue: 0, prep: 0 })) }));
  return openRound({ ...state, season, format: CURRENT_FINALS_FORMAT, clubs, week: 0, results: [], goals: {}, finals: null, draft: null }, 0);
}
export function createLeague(seed: number, clubId: string): LeagueState | null {
  if (!validSeed(seed) || !isClubId(clubId)) return null;
  const world = createLeagueWorld(seed);
  const base: LeagueState = {
    version: 2, seed, myClub: clubId, clubName: clubLabel(clubId), season: 1, format: CURRENT_FINALS_FORMAT, phase: 'prepare', stage: 'homeAway', round: 0, week: 0,
    clubs: world.clubs, starters: [], bench: [], preparation: null, swapsThisBreak: 0, match: null, results: [], goals: {}, finals: null, draft: null, nextId: world.nextId, history: [],
  };
  return freshSeason(base, 1);
}

/** Starters a club fields from its own matchday 23 (repeats v1's line; it ends when v1 retires). */
function matchdayStarters(club: LeagueClub, squad: string[]): string[] {
  return automaticLineup({ ...club, players: club.players.filter(player => squad.includes(player.id)) }).starters;
}
/**
 * A final level after four quarters (Regulation 2.8(a), two sourced in aussieRulesFormat.ts):
 * blocks of EXTRA_TIME.periods periods of EXTRA_TIME.minutes, repeated until somebody leads.
 * No golden score. Every period is v1's quarter, so each charges one quarter's fatigue (game
 * rule), and the block bound only guards the loop: the harness shows it is never reached.
 */
export function settleLevelFinal<C extends LeagueClub>(clubs: C[], match: Match, seed: number, lineups: (clubs: C[], match: Match) => [string[], string[]], tactics: [Tactic, Tactic]): { clubs: C[]; match: Match; extraTime: boolean; blocks: number } {
  let result = { clubs, match };
  if (match.homeScore.total !== match.awayScore.total) return { ...result, extraTime: false, blocks: 0 };
  let blocks = 0;
  while (blocks < EXTRA_TIME.blockBound && result.match.homeScore.total === result.match.awayScore.total) {
    for (let period = 0; period < EXTRA_TIME.periods; period += 1) {
      const [home, away] = lineups(result.clubs, result.match);
      result = quarter(result.clubs, result.match, seed, home, away, tactics[0], tactics[1], EXTRA_TIME.minutes);
    }
    blocks += 1;
  }
  return { ...result, extraTime: true, blocks };
}
function simulateTie(clubs: LeagueClub[], seed: number, round: number, homeId: string, awayId: string): { clubs: LeagueClub[]; match: Match; extraTime: boolean } {
  const played = simulateOtherMatch({ clubs, seed, round }, homeId, awayId);
  const home = (list: LeagueClub[]) => list.find(club => club.id === homeId)!;
  const away = (list: LeagueClub[]) => list.find(club => club.id === awayId)!;
  return settleLevelFinal(played.clubs, played.match, seed, (list, match) => [matchdayStarters(home(list), match.homeSquad), matchdayStarters(away(list), match.awaySquad)], [home(clubs).style, away(clubs).style]);
}
const outcomeOf = (tie: FinalsTieRecord): TieOutcome | null => !tie.result ? null
  : tie.result.home.total >= tie.result.away.total ? { winner: tie.homeId, loser: tie.awayId } : { winner: tie.awayId, loser: tie.homeId };
export function finalsOutcomes(state: Pick<LeagueState, 'finals'>): Record<string, TieOutcome> {
  const outcomes: Record<string, TieOutcome> = {};
  for (const tie of state.finals?.ties ?? []) { const outcome = outcomeOf(tie); if (outcome) outcomes[tie.id] = outcome; }
  return outcomes;
}
export const lastWeek = (format: AussieFinalsFormat) => Math.max(...finalsWeeks(FINALS_PRESETS[format].ties));
/** Name the week's ties and open your own, or the week you sit out. */
function openWeek(state: LeagueState, week: number): LeagueState {
  const preset = FINALS_PRESETS[state.format];
  const pairings = resolveWeek(preset.ties, seedsOf(state), finalsOutcomes(state), week) ?? [];
  const ties = [...(state.finals?.ties ?? []), ...pairings.map(pair => ({ id: pair.id, week, homeId: pair.homeId, awayId: pair.awayId }))];
  const mine = pairings.find(pair => pair.homeId === state.myClub || pair.awayId === state.myClub);
  const lineup = automaticLineup(clubOf(state, state.myClub)!);
  return { ...state, ...lineup, stage: 'finals', week, phase: 'prepare', preparation: null, swapsThisBreak: 0, finals: { ties }, match: mine ? emptyMatch(finalsRound(week), mine.homeId, mine.awayId) : null };
}
/** Your match is over: record it, play the rest of the round or week, show the report. */
function finishMine(state: LeagueState, played: { clubs: LeagueClub[]; match: Match }, tactic: Tactic): LeagueState {
  const seed = seasonSeed(state.seed, state.season);
  let clubs = played.clubs;
  if (state.stage === 'homeAway') {
    const results = [...state.results, strip(played.match)];
    const goals = tally({ ...state.goals }, played.match);
    for (const fixture of fixturesFor(state.seed, state.season, state.round).filter(value => value.homeId !== state.myClub && value.awayId !== state.myClub)) {
      const other = simulateOtherMatch({ clubs, seed, round: state.round }, fixture.homeId, fixture.awayId);
      clubs = other.clubs; tally(goals, other.match); results.push(strip(other.match));
    }
    return { ...state, clubs, results, goals, match: played.match, phase: 'report', swapsThisBreak: 0 };
  }
  const settled = settleLevelFinal(clubs, played.match, seed, (list, match) => {
    const ownHome = match.homeId === state.myClub;
    const other = matchdayStarters(list.find(club => club.id === otherSide(match, state.myClub))!, ownHome ? match.awaySquad : match.homeSquad);
    return ownHome ? [state.starters, other] : [other, state.starters];
  }, [played.match.homeId === state.myClub ? tactic : clubOf(state, played.match.homeId)!.style, played.match.awayId === state.myClub ? tactic : clubOf(state, played.match.awayId)!.style]);
  return playRestOfWeek({ ...state, clubs: settled.clubs, match: settled.match }, settled.match, settled.extraTime);
}
/** Record your tie (if you played) and play every other tie of the week. */
function playRestOfWeek(state: LeagueState, mine: Match | null, mineExtra: boolean): LeagueState {
  const seed = seasonSeed(state.seed, state.season);
  let clubs = state.clubs;
  const ties = (state.finals?.ties ?? []).map(tie => {
    if (tie.week !== state.week || tie.result) return tie;
    if (mine && tie.homeId === mine.homeId && tie.awayId === mine.awayId) return { ...tie, result: { home: mine.homeScore, away: mine.awayScore, extraTime: mineExtra } };
    const played = simulateTie(clubs, seed, finalsRound(state.week), tie.homeId, tie.awayId);
    clubs = played.clubs;
    return { ...tie, result: { home: played.match.homeScore, away: played.match.awayScore, extraTime: played.extraTime } };
  });
  return { ...state, clubs, finals: { ties }, phase: 'report', swapsThisBreak: 0 };
}
function playQuarter(state: LeagueState, tactic: Tactic): LeagueState {
  const match = state.match!;
  const other = clubOf(state, otherSide(match, state.myClub))!;
  const otherIds = matchdayStarters(other, match.homeId === other.id ? match.homeSquad : match.awaySquad);
  const ownHome = match.homeId === state.myClub;
  const result = quarter(state.clubs, match, seasonSeed(state.seed, state.season), ownHome ? state.starters : otherIds, ownHome ? otherIds : state.starters, ownHome ? tactic : other.style, ownHome ? other.style : tactic);
  if (result.match.quarter < 4) return { ...state, ...result, phase: 'break', swapsThisBreak: 0 };
  return finishMine(state, result, tactic);
}
const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id, index) => id === b[index]);

export function reduceLeague(state: LeagueState, action: LeagueAction): LeagueState {
  if (!isLeagueAction(action)) return state;
  if (action.type === 'lineup') {
    if (state.phase !== 'prepare' || !state.match || !validLineup({ clubs: state.clubs, clubId: state.myClub }, action.starters, action.bench) || (sameIds(state.starters, action.starters) && sameIds(state.bench, action.bench))) return state;
    return { ...state, starters: [...action.starters], bench: [...action.bench] };
  }
  if (action.type === 'prepare') {
    if (state.phase !== 'prepare' || !state.match) return state;
    const clubs = prepareClubs(state.clubs, state.myClub, action.choice, state.match.round);
    const other = automaticLineup(clubs.find(club => club.id === otherSide(state.match!, state.myClub))!);
    const own = [...state.starters, ...state.bench], otherSquad = [...other.starters, ...other.bench];
    const match = { ...state.match, homeSquad: state.match.homeId === state.myClub ? own : otherSquad, awaySquad: state.match.awayId === state.myClub ? own : otherSquad };
    return { ...state, clubs, match, phase: 'quarter', preparation: action.choice };
  }
  if (action.type === 'play') return state.phase === 'quarter' && state.match && state.match.quarter < 4 ? playQuarter(state, action.tactic) : state;
  if (action.type === 'playMatch') {
    if ((state.phase !== 'quarter' && state.phase !== 'break') || !state.match) return state;
    let next: LeagueState = state.phase === 'break' ? { ...state, phase: 'quarter', swapsThisBreak: 0 } : state;
    while (next.phase === 'quarter') {
      next = playQuarter(next, action.tactic);
      if (next.phase === 'break') next = { ...next, phase: 'quarter', swapsThisBreak: 0 };
    }
    return next;
  }
  if (action.type === 'swap') {
    if (state.phase !== 'break' || state.swapsThisBreak >= 5 || !state.starters.includes(action.outId) || !state.bench.includes(action.inId) || leaguePlayer(state, action.outId)?.role !== leaguePlayer(state, action.inId)?.role) return state;
    return { ...state, starters: state.starters.map(id => id === action.outId ? action.inId : id), bench: state.bench.map(id => id === action.inId ? action.outId : id), swapsThisBreak: state.swapsThisBreak + 1 };
  }
  if (action.type === 'simWeek') return state.stage === 'finals' && state.phase === 'prepare' && !state.match ? playRestOfWeek(state, null, false) : state;
  if (action.type === 'pick') return pickFor(state, action.prospectId);
  if (action.type === 'draftAuto') return autoDraft(state);
  return advance(state);
}
function advance(state: LeagueState): LeagueState {
  if (state.phase === 'break') return { ...state, phase: 'quarter', swapsThisBreak: 0 };
  if (state.phase === 'report') {
    const clubs = recover(state.clubs);
    if (state.stage === 'homeAway') return state.round < ROUNDS - 1 ? openRound({ ...state, clubs }, state.round + 1) : openWeek({ ...state, clubs }, 0);
    return state.week < lastWeek(state.format) ? openWeek({ ...state, clubs }, state.week + 1) : closeSeason(state);
  }
  if (state.phase === 'seasonOver') return runSummer(state);
  if (state.phase === 'summer') return openDraft(state);
  if (state.phase === 'draft' && state.draft && state.draft.at >= state.draft.order.length) return freshSeason({ ...state, draft: null }, state.season + 1);
  return state;
}

/** The tie that ended a club's finals: a loss whose loser gets no second chance (a qualifying final loss is not one). */
function knockout(state: Pick<LeagueState, 'finals' | 'format'>, clubId: string): FinalsTieRecord | undefined {
  const secondChance = new Set(FINALS_PRESETS[state.format].ties.flatMap(tie => [tie.home, tie.away]).flatMap(slot => 'loserOf' in slot ? [slot.loserOf] : []));
  return (state.finals?.ties ?? []).find(tie => !secondChance.has(tie.id) && outcomeOf(tie)?.loser === clubId);
}
/** The week a club went out of the finals; null for the premier or a non-finalist. */
function eliminatedWeek(state: Pick<LeagueState, 'finals' | 'format'>, clubId: string): number | null {
  return knockout(state, clubId)?.week ?? null;
}
export function finalsExit(state: Pick<LeagueState, 'clubs' | 'results' | 'finals' | 'format'>, clubId: string): FinalsExit {
  if (seedsOf(state).indexOf(clubId) >= FINALS_PRESETS[state.format].qualifiers) return 'missed';
  const lost = knockout(state, clubId);
  return lost ? exitForTie(lost.id) : 'premiers';
}
export function leadingGoalkicker(state: Pick<LeagueState, 'clubs' | 'goals'>): { name: string; club: string; goals: number } {
  const [id, goals] = Object.entries(state.goals).sort((a, b) => b[1] - a[1] || Number(a[0].slice(2)) - Number(b[0].slice(2)))[0] ?? ['', 0];
  const club = state.clubs.find(value => value.players.some(player => player.id === id));
  return { name: club?.players.find(player => player.id === id)?.name ?? 'Nobody', club: club?.id ?? '', goals };
}
function closeSeason(state: LeagueState): LeagueState {
  const ladder = leagueLadder(state);
  const place = ladder.findIndex(row => row.clubId === state.myClub) + 1;
  const row = ladder[place - 1];
  const gf = (state.finals?.ties ?? []).find(tie => tie.week === lastWeek(state.format))!;
  const outcome = outcomeOf(gf)!;
  const history: HistoryRow = {
    season: state.season, place, w: row.wins, d: row.draws, l: row.losses, pf: row.pointsFor, pa: row.pointsAgainst, exit: finalsExit(state, state.myClub),
    premier: outcome.winner, runnerUp: outcome.loser, gf: { home: gf.homeId, away: gf.awayId, homeScore: gf.result!.home, awayScore: gf.result!.away },
    leadingGoalkicker: leadingGoalkicker(state),
  };
  return { ...state, phase: 'seasonOver', match: null, preparation: null, swapsThisBreak: 0, history: [...state.history, history] };
}

/** Summer growth by age, a game rule: under 22 +2 to +5, 22 to 25 0 to +3, 26 to 29 -1 to +1, 30 and over -1 to -4. */
export function growthFor(rng: () => number, age: number): number {
  if (age < 22) return 2 + Math.floor(rng() * 4);
  if (age <= 25) return Math.floor(rng() * 4);
  if (age <= 29) return -1 + Math.floor(rng() * 3);
  return -(1 + Math.floor(rng() * 4));
}
function runSummer(state: LeagueState): LeagueState {
  const rng = rngFrom(hashLabel(`${state.seed}|${state.season}|summer`));
  const clubs = state.clubs.map(club => ({ ...club, players: club.players.map(player => {
    const change = growthFor(rng, player.age);
    const skill = change >= 0 ? raiseWithinPotential(player.skill, player.potential, change) : clamp(player.skill + change, 20, 99);
    return { ...player, age: player.age + 1, skill, fatigue: 0, prep: 0 };
  }) }));
  return { ...state, clubs, phase: 'summer' };
}
/** Retirement odds by age after the summer birthday: none before 31, certain at 35. Game rule. */
export const retireOdds = (age: number) => age < 31 ? 0 : age >= 35 ? 1 : [0.15, 0.3, 0.5, 0.75][age - 31];
/** Who retires this summer: fixed per player and season, so the summer panel can name them. */
export function retirees(state: Pick<LeagueState, 'seed' | 'season' | 'clubs'>): Set<string> {
  const out = new Set<string>();
  for (const club of state.clubs) for (const player of club.players) {
    if (hashLabel(`${state.seed}|${state.season}|retire|${player.id}`) / 4294967296 < retireOdds(player.age)) out.add(player.id);
  }
  return out;
}
export function roleDeficits(club: Pick<LeagueClub, 'players'>): Record<Role, number> {
  const deficits = { defender: 0, midfielder: 0, ruck: 0, forward: 0 } as Record<Role, number>;
  for (const role of ROLES) deficits[role] = Math.max(0, ROLE_FLOORS[role] - club.players.filter(player => player.role === role).length);
  return deficits;
}
/** One pass of the draft order: non-finalists in reverse ladder order, then finalists by the week they went out (lower ladder place first), the premier last. */
export function draftBaseOrder(state: Pick<LeagueState, 'clubs' | 'results' | 'finals' | 'format'>): string[] {
  const seeds = seedsOf(state);
  const qualifiers = FINALS_PRESETS[state.format].qualifiers;
  const missed = seeds.slice(qualifiers).reverse();
  const finalists = seeds.slice(0, qualifiers).map((id, index) => ({ id, index, week: eliminatedWeek(state, id) ?? Infinity }))
    .sort((a, b) => a.week - b.week || b.index - a.index).map(value => value.id);
  return [...missed, ...finalists];
}
const idNumber = (id: string) => Number(id.slice(2));
const grade = (prospect: Prospect) => prospect.skill + prospect.potential;
const bestOf = (list: Prospect[]) => [...list].sort((a, b) => grade(b) - grade(a) || idNumber(a.id) - idNumber(b.id))[0];
export function draftPool(state: Pick<LeagueState, 'draft'>): Prospect[] {
  const taken = new Set(state.draft?.made.map(pick => pick.prospectId) ?? []);
  return (state.draft?.pool ?? []).filter(prospect => !taken.has(prospect.id));
}
export function picksLeft(state: Pick<LeagueState, 'draft'>, clubId: string): number {
  return state.draft ? state.draft.order.slice(state.draft.at).filter(id => id === clubId).length : 0;
}
/** Prospects of a role every OTHER club still has to take to reach its floors. */
function reservedFor(state: LeagueState, role: Role, except: string): number {
  return state.clubs.filter(club => club.id !== except).reduce((sum, club) => sum + roleDeficits(club)[role], 0);
}
/** A club's pick by role need first, then grade, never taking a prospect another club needs to fill its list. */
function rivalChoice(state: LeagueState, clubId: string): Prospect | undefined {
  const left = draftPool(state);
  const deficits = roleDeficits(clubOf(state, clubId)!);
  const need = ROLES.filter(role => deficits[role] > 0).sort((a, b) => deficits[b] - deficits[a])[0];
  const needed = need ? left.filter(prospect => prospect.role === need) : [];
  if (needed.length) return bestOf(needed);
  const free = left.filter(prospect => left.filter(other => other.role === prospect.role).length > reservedFor(state, prospect.role, clubId));
  return bestOf(free.length ? free : left);
}
function applyPick(state: LeagueState, clubId: string, prospect: Prospect): LeagueState {
  const stamina = 45 + hashLabel(`${state.seed}|${prospect.id}|stamina`) % 46;
  const player: LeaguePlayer = { id: prospect.id, name: prospect.name, role: prospect.role, skill: prospect.skill, stamina, fatigue: 0, prep: 0, age: prospect.age, potential: prospect.potential };
  const clubs = state.clubs.map(club => club.id === clubId ? { ...club, players: [...club.players, player] } : club);
  const draft = state.draft!;
  return { ...state, clubs, draft: { ...draft, made: [...draft.made, { clubId, prospectId: prospect.id }], at: draft.at + 1 } };
}
function runRivalPicks(state: LeagueState): LeagueState {
  let next = state;
  while (next.draft && next.draft.at < next.draft.order.length && next.draft.order[next.draft.at] !== next.myClub) {
    const clubId = next.draft.order[next.draft.at];
    const choice = rivalChoice(next, clubId);
    if (!choice) break;
    next = applyPick(next, clubId, choice);
  }
  return next;
}
const ROLE_WORDS: Record<Role, string> = { defender: 'defender', midfielder: 'midfielder', ruck: 'ruck', forward: 'forward' };
/** Why your pick would be refused, or null when it is allowed. */
export function pickRefusal(state: LeagueState, prospectId: string): string | null {
  if (state.phase !== 'draft' || !state.draft || state.draft.order[state.draft.at] !== state.myClub) return 'It is not your pick.';
  const prospect = draftPool(state).find(value => value.id === prospectId);
  if (!prospect) return 'That prospect has already gone.';
  const club = clubOf(state, state.myClub)!;
  const after = roleDeficits({ players: [...club.players, { ...prospect, stamina: 0, fatigue: 0, prep: 0 }] });
  const short = ROLES.filter(role => after[role] > 0);
  if (ROLES.reduce((sum, role) => sum + after[role], 0) > picksLeft(state, state.myClub) - 1) {
    return `Your list still needs ${short.map(role => `${after[role]} more ${ROLE_WORDS[role]}${after[role] === 1 ? '' : 's'}`).join(' and ')}, and this pick would leave too few picks to get there.`;
  }
  const mine = roleDeficits(club)[prospect.role];
  if (!mine && draftPool(state).filter(other => other.role === prospect.role).length - 1 < reservedFor(state, prospect.role, state.myClub)) {
    return `Other clubs still need every ${ROLE_WORDS[prospect.role]} left in the pool to fill their lists.`;
  }
  return null;
}
function pickFor(state: LeagueState, prospectId: string): LeagueState {
  if (pickRefusal(state, prospectId) !== null) return state;
  return runRivalPicks(applyPick(state, state.myClub, draftPool(state).find(value => value.id === prospectId)!));
}
/** Your list manager makes every pick you have left, by the rivals' rule. */
function autoDraft(state: LeagueState): LeagueState {
  if (state.phase !== 'draft' || !state.draft || state.draft.at >= state.draft.order.length) return state;
  let next = state;
  while (next.draft!.at < next.draft!.order.length) {
    const clubId = next.draft!.order[next.draft!.at];
    const choice = rivalChoice(next, clubId);
    if (!choice) break;
    next = applyPick(next, clubId, choice);
  }
  return next;
}
/** Retirements leave, the order and the pool are set, and the rivals pick up to your first turn. */
function openDraft(state: LeagueState): LeagueState {
  const out = retirees(state);
  const clubs = state.clubs.map(club => ({ ...club, players: club.players.filter(player => !out.has(player.id)) }));
  const vacancies = new Map(clubs.map(club => [club.id, LIST_SIZE - club.players.length]));
  const order = expandOrder(draftBaseOrder(state), vacancies);
  const rng = rngFrom(hashLabel(`${state.seed}|${state.season}|draft`));
  const roles: Role[] = [];
  // Every role a list is short of comes into the pool twice over plus two; the rest follow the list shape (12, 10, 4, 10).
  for (const role of ROLES) for (let count = clubs.reduce((sum, club) => sum + roleDeficits(club)[role], 0) + 2; count > 0; count -= 1) roles.push(role);
  const size = 2 * order.length + 10;
  while (roles.length < size) {
    let draw = rng() * 36, index = 0;
    for (const weight of [12, 10, 4, 10]) { if (draw < weight) break; draw -= weight; index += 1; }
    roles.push(ROLES[Math.min(index, 3)]);
  }
  const used = new Set(clubs.flatMap(club => club.players.map(player => player.name)));
  let nextId = state.nextId;
  const pool = roles.map((role): Prospect => {
    const skill = 38 + Math.floor(rng() * 25);
    return { id: `p-${nextId++}`, name: freshName(rng, used), role, age: DRAFT_AGE, skill, potential: Math.max(skill, 55 + Math.floor(rng() * 41)) };
  });
  return runRivalPicks({ ...state, clubs, nextId, phase: 'draft', starters: [], bench: [], match: null, preparation: null, swapsThisBreak: 0, draft: { order, pool, made: [], at: 0 } });
}
/** The fogged read of a prospect's ceiling you see on draft night: a band, fixed per name and season. */
export function scoutedPotential(state: Pick<LeagueState, 'season'>, prospect: Prospect): { low: number; high: number; mid: number } {
  const read = bandRead(prospect.potential, 0.12, `${prospect.name}|${state.season}`);
  const low = Math.max(prospect.skill, Math.round(read.low)), high = Math.min(99, Math.max(low, Math.round(read.high)));
  return { low, high, mid: Math.round((low + high) / 2) };
}

const PLAYER_ID = /^p-[0-9]{1,6}$/;
const TACTIC_IDS = ['control', 'direct', 'pressure'];
function exactKeys(value: unknown, keys: string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const own = Object.keys(value);
  return own.length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
}
const isPlayerId = (id: unknown): id is string => typeof id === 'string' && PLAYER_ID.test(id);
export function isLeagueAction(value: unknown): value is LeagueAction {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (item.type === 'next' || item.type === 'simWeek' || item.type === 'draftAuto') return exactKeys(item, ['type']);
  if (item.type === 'prepare') return exactKeys(item, ['type', 'choice']) && (item.choice === 'train' || item.choice === 'rest');
  if (item.type === 'play' || item.type === 'playMatch') return exactKeys(item, ['type', 'tactic']) && TACTIC_IDS.includes(item.tactic as string);
  if (item.type === 'swap') return exactKeys(item, ['type', 'outId', 'inId']) && isPlayerId(item.outId) && isPlayerId(item.inId);
  if (item.type === 'pick') return exactKeys(item, ['type', 'prospectId']) && isPlayerId(item.prospectId);
  return item.type === 'lineup' && exactKeys(item, ['type', 'starters', 'bench']) && Array.isArray(item.starters) && Array.isArray(item.bench)
    && item.starters.length === 18 && item.bench.length === 5 && [...item.starters, ...item.bench].every(isPlayerId);
}

/** Raw save cap. Measured peak 150,647 chars at 40 seasons, growing about 390 a season from history
 *  rows (simAussieRulesSeason header), so this leaves room for several hundred more seasons. */
export const MAX_SAVE_CHARS = 400000;
const int = (value: unknown, low: number, high: number): value is number => Number.isInteger(value) && (value as number) >= low && (value as number) <= high;
const num = (value: unknown, low: number, high: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high;
const TOP_KEYS = ['version', 'seed', 'myClub', 'clubName', 'season', 'format', 'phase', 'stage', 'round', 'week', 'clubs', 'starters', 'bench', 'preparation', 'swapsThisBreak', 'match', 'results', 'goals', 'finals', 'draft', 'nextId', 'history'];
const PLAYER_KEYS = ['id', 'name', 'role', 'skill', 'stamina', 'fatigue', 'prep', 'age', 'potential'];
const PROSPECT_KEYS = ['id', 'name', 'role', 'age', 'skill', 'potential'];
const MATCH_KEYS = ['round', 'homeId', 'awayId', 'quarter', 'homeScore', 'awayScore', 'events', 'homeSquad', 'awaySquad'];
const EVENT_KEYS = ['id', 'clubId', 'playerId', 'quarter', 'minute', 'kind', 'points'];
const PHASES: LeaguePhase[] = ['prepare', 'quarter', 'break', 'report', 'seasonOver', 'summer', 'draft'];
const EXITS: FinalsExit[] = ['missed', 'wildcard', 'elimination', 'semi', 'preliminary', 'runnerUp', 'premiers'];
// Read at call time, never at module scope (an imported value).
const maxQuarter = () => 4 + EXTRA_TIME.periods * EXTRA_TIME.blockBound;
const validScore = (score: unknown): score is Score => exactKeys(score, ['goals', 'behinds', 'total']) && int(score.goals, 0, 999) && int(score.behinds, 0, 999) && score.total === (score.goals as number) * 6 + (score.behinds as number);
function validMatch(value: unknown, live: boolean): value is Match {
  if (!exactKeys(value, MATCH_KEYS) || !int(value.round, 0, ROUNDS + 8) || !isClubId(value.homeId) || !isClubId(value.awayId) || value.homeId === value.awayId) return false;
  if (!int(value.quarter, 0, maxQuarter()) || !validScore(value.homeScore) || !validScore(value.awayScore)) return false;
  if (!Array.isArray(value.events) || !Array.isArray(value.homeSquad) || !Array.isArray(value.awaySquad)) return false;
  if (!live) return value.events.length === 0 && value.homeSquad.length === 0 && value.awaySquad.length === 0;
  if (![0, 23].includes(value.homeSquad.length) || value.homeSquad.length !== value.awaySquad.length || ![...value.homeSquad, ...value.awaySquad].every(isPlayerId)) return false;
  const count = (clubId: unknown, kind: string) => (value.events as Record<string, unknown>[]).filter(event => event.clubId === clubId && event.kind === kind).length;
  return value.events.every(event => exactKeys(event, EVENT_KEYS) && typeof event.id === 'string' && (event.clubId === value.homeId || event.clubId === value.awayId) && isPlayerId(event.playerId)
      && int(event.quarter, 1, maxQuarter()) && int(event.minute, 1, 20) && ((event.kind === 'goal' && event.points === 6) || (event.kind === 'behind' && event.points === 1)))
    && count(value.homeId, 'goal') === (value.homeScore as Score).goals && count(value.homeId, 'behind') === (value.homeScore as Score).behinds
    && count(value.awayId, 'goal') === (value.awayScore as Score).goals && count(value.awayId, 'behind') === (value.awayScore as Score).behinds;
}
function validClubs(clubs: unknown, nextId: number): clubs is LeagueClub[] {
  if (!Array.isArray(clubs) || clubs.length !== CLUB_COUNT) return false;
  const ids = new Set<string>(), names = new Set<string>();
  return clubs.every((club, index) => {
    const data = CLUBS[index];
    if (!exactKeys(club, ['id', 'name', 'style', 'tier', 'players']) || club.id !== data.id || club.name !== `${data.place} ${data.nickname}` || club.style !== data.style || club.tier !== data.tier || !Array.isArray(club.players)) return false;
    return club.players.every(player => exactKeys(player, PLAYER_KEYS) && isPlayerId(player.id) && idNumber(player.id) < nextId && !ids.has(player.id) && !!ids.add(player.id)
      && typeof player.name === 'string' && player.name.trim() !== '' && !names.has(player.name) && !!names.add(player.name)
      && ROLES.includes(player.role as Role) && int(player.skill, 20, 99) && int(player.potential, player.skill as number, 99) && int(player.stamina, 30, 99)
      && int(player.age, 16, 40) && num(player.fatigue, 0, 100) && (player.prep === 0 || player.prep === 8));
  });
}
function validHistory(row: unknown): row is HistoryRow {
  if (!exactKeys(row, ['season', 'place', 'w', 'd', 'l', 'pf', 'pa', 'exit', 'premier', 'runnerUp', 'gf', 'leadingGoalkicker'])) return false;
  const gf = row.gf, top = row.leadingGoalkicker;
  return int(row.season, 1, 10000) && int(row.place, 1, CLUB_COUNT) && int(row.w, 0, ROUNDS) && int(row.d, 0, ROUNDS) && int(row.l, 0, ROUNDS) && (row.w as number) + (row.d as number) + (row.l as number) === ROUNDS
    && int(row.pf, 0, 99999) && int(row.pa, 0, 99999) && EXITS.includes(row.exit as FinalsExit) && isClubId(row.premier) && isClubId(row.runnerUp) && row.premier !== row.runnerUp
    && exactKeys(gf, ['home', 'away', 'homeScore', 'awayScore']) && isClubId(gf.home) && isClubId(gf.away) && validScore(gf.homeScore) && validScore(gf.awayScore)
    && exactKeys(top, ['name', 'club', 'goals']) && typeof top.name === 'string' && top.name !== '' && typeof top.club === 'string' && int(top.goals, 0, 9999);
}
/** The draft order from the list sizes before the draft: one pass of the base order, repeated until every list is full. */
function expandOrder(base: string[], vacancies: Map<string, number>): string[] {
  const order: string[] = [];
  for (let pass = 0; base.some(id => (vacancies.get(id) ?? 0) > pass); pass += 1) for (const id of base) if ((vacancies.get(id) ?? 0) > pass) order.push(id);
  return order;
}
function validDraft(s: LeagueState): boolean {
  const draft = s.draft as unknown;
  if (!exactKeys(draft, ['order', 'pool', 'made', 'at']) || !Array.isArray(draft.order) || !Array.isArray(draft.pool) || !Array.isArray(draft.made) || !int(draft.at, 0, draft.order.length) || draft.made.length !== draft.at) return false;
  const pool = new Map<string, Record<string, unknown>>();
  if (!draft.pool.every(prospect => exactKeys(prospect, PROSPECT_KEYS) && isPlayerId(prospect.id) && idNumber(prospect.id) < s.nextId && !pool.has(prospect.id) && !!pool.set(prospect.id, prospect)
    && typeof prospect.name === 'string' && prospect.name.trim() !== '' && ROLES.includes(prospect.role as Role) && int(prospect.age, 16, 40) && int(prospect.skill, 20, 99) && int(prospect.potential, prospect.skill as number, 99))) return false;
  const made = new Set<string>();
  if (!draft.made.every((pick, index) => exactKeys(pick, ['clubId', 'prospectId']) && pick.clubId === draft.order[index] && typeof pick.prospectId === 'string' && pool.has(pick.prospectId) && !made.has(pick.prospectId) && !!made.add(pick.prospectId)
    && !!clubOf(s, pick.clubId as string)?.players.some(player => player.id === pick.prospectId))) return false;
  const listed = new Set(s.clubs.flatMap(club => club.players.map(player => player.id)));
  if ([...pool.keys()].some(id => !made.has(id) && listed.has(id))) return false;
  const before = new Map(s.clubs.map(club => [club.id, LIST_SIZE - (club.players.length - (draft.made as { clubId: string }[]).filter(pick => pick.clubId === club.id).length)]));
  if (!sameIds(expandOrder(draftBaseOrder(s), before), draft.order as string[])) return false;
  if ((draft.at as number) < draft.order.length && draft.order[draft.at as number] !== s.myClub) return false;
  return s.clubs.every(club => club.players.length + picksLeft(s, club.id) === LIST_SIZE && ROLES.reduce((sum, role) => sum + roleDeficits(club)[role], 0) <= picksLeft(s, club.id));
}
function validFinals(s: LeagueState, upto: number, currentDone: boolean): boolean {
  if (!exactKeys(s.finals, ['ties']) || !Array.isArray(s.finals.ties)) return false;
  const ties = s.finals.ties as unknown[];
  const preset = FINALS_PRESETS[s.format], seeds = seedsOf(s), outcomes: Record<string, TieOutcome> = {};
  let at = 0;
  for (let week = 0; week <= upto; week += 1) {
    const expected = resolveWeek(preset.ties, seeds, outcomes, week);
    if (!expected) return false;
    const done = week < upto || currentDone;
    for (const pair of expected) {
      const tie = ties[at++];
      if (!exactKeys(tie, done ? ['id', 'week', 'homeId', 'awayId', 'result'] : ['id', 'week', 'homeId', 'awayId'])) return false;
      if (tie.id !== pair.id || tie.week !== week || tie.homeId !== pair.homeId || tie.awayId !== pair.awayId) return false;
      if (!done) continue;
      const result = tie.result;
      if (!exactKeys(result, ['home', 'away', 'extraTime']) || !validScore(result.home) || !validScore(result.away) || typeof result.extraTime !== 'boolean' || result.home.total === result.away.total) return false;
      outcomes[pair.id] = outcomeOf(tie as unknown as FinalsTieRecord)!;
    }
  }
  return at === ties.length;
}
/** A saved opponent matchday 23 the club can field: 23 of its own players with the role floors its lineup needs. */
function fieldsMatchday(club: LeagueClub, squad: string[]): boolean {
  const players = squad.map(id => club.players.find(player => player.id === id));
  return squad.length === 23 && new Set(squad).size === 23 && players.every(Boolean)
    && ROLES.every(role => players.filter(player => player?.role === role).length >= ROLE_FLOORS[role]);
}
/** Every check a loaded save must pass. Anything else is refused whole, never half trusted. */
export function validLeagueState(value: unknown): value is LeagueState {
  if (!exactKeys(value, TOP_KEYS) || value.version !== 2 || !validSeed(value.seed) || !isClubId(value.myClub) || value.clubName !== clubLabel(value.myClub as string)) return false;
  if (!int(value.season, 1, 10000) || !(value.format === 'final8' || value.format === 'wildcard') || !PHASES.includes(value.phase as LeaguePhase)) return false;
  if (!(value.stage === 'homeAway' || value.stage === 'finals') || !int(value.round, 0, ROUNDS - 1) || !int(value.week, 0, 8) || !int(value.nextId, CLUB_COUNT * LIST_SIZE, 999999)) return false;
  const s = value as unknown as LeagueState;
  if (!validClubs(s.clubs, s.nextId) || !Array.isArray(s.starters) || !Array.isArray(s.bench)) return false;
  if (!s.goals || typeof s.goals !== 'object' || Array.isArray(s.goals) || !Object.entries(s.goals).every(([id, goals]) => isPlayerId(id) && int(goals, 1, 9999))) return false;
  const closed = s.phase === 'seasonOver' || s.phase === 'summer' || s.phase === 'draft';
  if (!Array.isArray(s.history) || !s.history.every(validHistory) || s.history.length !== s.season - (closed ? 0 : 1)) return false;
  if (!int(s.swapsThisBreak, 0, 5) || (s.phase !== 'break' && s.swapsThisBreak !== 0) || !(s.preparation === null || s.preparation === 'train' || s.preparation === 'rest')) return false;
  const played = s.stage === 'finals' ? ROUNDS : s.round + (s.phase === 'report' ? 1 : 0);
  if (!Array.isArray(s.results) || s.results.length !== played * (CLUB_COUNT / 2)) return false;
  for (let round = 0; round < played; round += 1) {
    const fixtures = fixturesFor(s.seed, s.season, round);
    const games = s.results.slice(round * 9, round * 9 + 9);
    if (!games.every(game => validMatch(game, false) && game.round === round && fixtures.some(f => f.homeId === game.homeId && f.awayId === game.awayId))) return false;
    if (new Set(games.map(game => game.homeId)).size !== 9) return false;
  }
  if (s.phase === 'draft') {
    if (s.stage !== 'finals' || s.match !== null || s.preparation !== null || s.starters.length || s.bench.length || !validFinals(s, lastWeek(s.format), true)) return false;
    return validDraft(s);
  }
  if (s.draft !== null || !s.clubs.every(club => club.players.length === LIST_SIZE && ROLES.every(role => roleDeficits(club)[role] === 0))) return false;
  if (!validLineup({ clubs: s.clubs, clubId: s.myClub }, s.starters, s.bench)) return false;
  if (closed) return s.stage === 'finals' && s.match === null && s.preparation === null && s.week === lastWeek(s.format) && validFinals(s, lastWeek(s.format), true);
  let mine: { homeId: string; awayId: string } | undefined;
  if (s.stage === 'homeAway') {
    if (s.finals !== null || s.week !== 0) return false;
    mine = fixturesFor(s.seed, s.season, s.round).find(f => f.homeId === s.myClub || f.awayId === s.myClub);
  } else {
    if (s.round !== ROUNDS - 1 || s.week > lastWeek(s.format) || !validFinals(s, s.week, s.phase === 'report')) return false;
    mine = s.finals!.ties.find(tie => tie.week === s.week && (tie.homeId === s.myClub || tie.awayId === s.myClub));
  }
  if (!mine) return s.stage === 'finals' && s.match === null && (s.phase === 'prepare' || s.phase === 'report') && s.preparation === null;
  const match = s.match;
  if (!validMatch(match, true) || match.homeId !== mine.homeId || match.awayId !== mine.awayId || match.round !== (s.stage === 'finals' ? finalsRound(s.week) : s.round)) return false;
  const squad = match.homeId === s.myClub ? match.homeSquad : match.awaySquad;
  if (s.phase === 'prepare') return match.quarter === 0 && match.events.length === 0 && squad.length === 0 && s.preparation === null;
  if (s.preparation === null || squad.length !== 23 || !sameIds([...squad].sort(), [...s.starters, ...s.bench].sort())) return false;
  if (!fieldsMatchday(clubOf(s, otherSide(match, s.myClub))!, match.homeId === s.myClub ? match.awaySquad : match.homeSquad)) return false;
  if (s.phase === 'quarter') return match.quarter < 4;
  if (s.phase === 'break') return match.quarter >= 1 && match.quarter < 4;
  return match.quarter >= 4;
}
export function readLeagueSave(raw: string | null): LeagueState | null {
  if (!raw || raw.length > MAX_SAVE_CHARS) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return validLeagueState(value) ? value : null;
  } catch { return null; }
}
/** Which board the page opens: a valid full season, an unfinished ten round season, or the club menu. */
export function chooseBoard(v2raw: string | null, v1raw: string | null): 'league' | 'legacy' | 'menu' {
  if (readLeagueSave(v2raw)) return 'league';
  const legacy = readManagerSave(v1raw);
  return legacy && legacy.state.phase !== 'complete' ? 'legacy' : 'menu';
}

export const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
export const TIE_NAMES: Record<string, string> = { WC: 'Wildcard final', QF: 'Qualifying final', EF: 'Elimination final', SF: 'Semi final', PF: 'Preliminary final', GF: 'Grand Final' };
export const tieName = (id: string) => TIE_NAMES[id.slice(0, 2)] ?? 'Final';
export const myFinalsTie = (state: LeagueState) => state.finals?.ties.find(tie => tie.week === state.week && (tie.homeId === state.myClub || tie.awayId === state.myClub));
export const premierships = (state: Pick<LeagueState, 'history'>) => state.history.filter(row => row.exit === 'premiers').length;
/** Ladder words: place and the row's own points and percentage. */
export function ladderWords(state: LeagueState): { value: string; sub: string } {
  const ladder = leagueLadder(state);
  const index = ladder.findIndex(row => row.clubId === state.myClub);
  const row = ladder[index];
  return { value: ordinal(index + 1), sub: `${row.points} pts, ${row.percentage.toFixed(1)}%` };
}
/** The hub's boxes. Every word is decided here, where the harness can read it. */
export function hubTiles(state: LeagueState): HubTile[] {
  const wants = state.phase === 'prepare' || state.phase === 'quarter' || state.phase === 'break';
  const tiles: HubTile[] = [];
  const opponent = state.match ? placeOf(otherSide(state.match, state.myClub)) : '';
  if (state.stage === 'homeAway') tiles.push({ key: 'match', icon: '🏉', title: 'Next match', value: `Round ${state.round + 1} of ${ROUNDS}`, sub: `v ${opponent}`, accent: wants || state.phase === 'report' });
  else if (state.phase === 'seasonOver' || state.phase === 'summer' || state.phase === 'draft') tiles.push({ key: 'match', icon: '🏉', title: 'Next match', value: `Season ${state.season + 1}`, sub: state.phase === 'draft' ? 'After the draft' : 'After the summer', accent: false });
  else {
    const tie = myFinalsTie(state);
    tiles.push({ key: 'match', icon: '🏉', title: 'Next match', value: tie ? tieName(tie.id) : 'No game this week', sub: tie ? `v ${opponent}` : `Week ${state.week + 1} of the finals`, accent: true });
  }
  const ladder = ladderWords(state);
  tiles.push({ key: 'ladder', icon: '📊', title: 'Ladder', value: ladder.value, sub: ladder.sub, accent: false });
  const club = clubOf(state, state.myClub)!;
  const tired = Math.round(club.players.reduce((sum, player) => sum + player.fatigue, 0) / club.players.length);
  tiles.push({ key: 'squad', icon: '👥', title: 'Squad', value: `${club.players.length} players`, sub: `Average fatigue ${tired}`, accent: false });
  if (state.stage === 'finals' && !['seasonOver', 'summer', 'draft'].includes(state.phase)) {
    const preset = FINALS_PRESETS[state.format];
    const seeds = seedsOf(state);
    const missed = seeds.indexOf(state.myClub) >= preset.qualifiers;
    const out = eliminated(preset.ties, seeds, preset.qualifiers, finalsOutcomes(state)).has(state.myClub);
    tiles.push({ key: 'finals', icon: '🏆', title: 'Finals', value: `Week ${state.week + 1} of ${lastWeek(state.format) + 1}`, sub: missed ? 'You missed the finals' : out ? 'Your season is over' : 'Still alive', accent: false });
  }
  tiles.push({ key: 'club', icon: '🏛️', title: 'Club', value: `${premierships(state)} ${premierships(state) === 1 ? 'premiership' : 'premierships'}`, sub: `Season ${state.season}`, accent: state.phase === 'seasonOver' });
  if (state.phase === 'summer' || state.phase === 'draft') {
    const left = picksLeft(state, state.myClub);
    tiles.push({ key: 'draft', icon: '📋', title: 'Draft', value: state.phase === 'summer' ? 'Coming up' : left ? `${left} ${left === 1 ? 'pick' : 'picks'} to make` : 'Done', sub: state.phase === 'summer' ? `${retirees(state).size} players retiring` : `${state.draft!.at} of ${state.draft!.order.length} picks made`, accent: state.phase === 'draft' && left > 0 });
  }
  return tiles;
}
