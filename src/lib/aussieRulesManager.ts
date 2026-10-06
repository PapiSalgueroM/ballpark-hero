/**
 * Round792: a fictional six-club league, not an AFL roster or season prediction.
 * Match facts: 2026 Laws 5.5,10.1,12.2,16; Regulations2.5,12.2,12.8.
 * https://resources.afl.com.au/afl/document/2026/02/13/8676d880-481a-4211-a479-305f138ce8b6/Laws-of-Australian-Football-Final-13-February-2026-.pdf
 * https://resources.afl.com.au/afl/document/2026/02/13/54c158af-15e9-483b-a195-62a0f4e33b11/AFL-Regulations-Final-11-February-2026-.pdf
 * https://resources.afl.com.au/afl/document/2024/01/24/9c2526c2-fe93-4b84-b253-e9615831d56b/2023-2027-AFL-and-AFLW-CBA.pdf
 * https://www.abc.net.au/news/2026-03-03/whats-new-in-the-afl-for-2026-rule-change-wildcard-round-sub/106376360
 * Eighteen on field, five interchange, four20 active-minute quarters, goals6,
 * behinds1, league wins4/draws2. Break-time swaps are exempt from the75 cap.
 * Exactly36 seniors, role counts, five swaps per break, training, fatigue,
 * tactics and the ten-round league-only finish are game rules. No real person
 * or club receives a generated stat, result or attributed dialogue.
 */
import { rngFrom, hashLabel } from '@/lib/careerEngine';

export const SLUG = 'aussie-rules-manager';
export const SAVE_KEY = 'aussie-rules-manager-save-v1';
export type Role = 'defender' | 'midfielder' | 'ruck' | 'forward';
export type Preparation = 'train' | 'rest';
export type Tactic = 'control' | 'direct' | 'pressure';
export type Phase = 'prepare' | 'quarter' | 'break' | 'report' | 'complete';
export interface Player { id: string; name: string; role: Role; skill: number; stamina: number; fatigue: number; prep: number }
export interface Club { id: string; name: string; players: Player[]; style: Tactic }
export interface Score { goals: number; behinds: number; total: number }
export interface ScoringEvent { id: string; clubId: string; playerId: string; quarter: number; minute: number; kind: 'goal' | 'behind'; points: 6 | 1 }
export interface Match { round: number; homeId: string; awayId: string; quarter: number; homeScore: Score; awayScore: Score; events: ScoringEvent[]; homeSquad: string[]; awaySquad: string[] }
export interface LadderRow { clubId: string; played: number; wins: number; draws: number; losses: number; points: number; pointsFor: number; pointsAgainst: number; percentage: number }
export interface ManagerState {
  seed: number; clubId: string; round: number; phase: Phase; clubs: Club[];
  starters: string[]; bench: string[]; preparation: Preparation | null;
  match: Match | null; results: Match[]; swapsThisBreak: number;
}
export type ManagerAction =
  | { type: 'lineup'; starters: string[]; bench: string[] }
  | { type: 'prepare'; choice: Preparation }
  | { type: 'play'; tactic: Tactic }
  | { type: 'swap'; outId: string; inId: string }
  | { type: 'next' };
export interface ManagerSave { version: 1; seed: number; clubId: string; actions: ManagerAction[] }
export const ROLE_LABELS: Record<Role, string> = { defender: 'Defender', midfielder: 'Midfielder', ruck: 'Ruck', forward: 'Forward' };
export const TACTICS: { id: Tactic; label: string; description: string }[] = [
  { id: 'control', label: 'Control', description: 'In this game, control counters direct play and uses the least energy.' },
  { id: 'direct', label: 'Direct', description: 'In this game, direct play counters pressure and uses some extra energy.' },
  { id: 'pressure', label: 'Pressure', description: 'In this game, pressure counters control but uses the most energy.' },
];
export const PREPARATIONS: { id: Preparation; label: string; description: string }[] = [
  { id: 'train', label: 'Train', description: 'Add 8 match preparation and 8 fatigue to every player.' },
  { id: 'rest', label: 'Rest', description: 'Remove 30 fatigue from every player, with no preparation boost.' },
];
export const ROLE_COUNTS: Record<Role, number> = { defender: 6, midfielder: 5, ruck: 1, forward: 6 };
export const ROLES: Role[] = ['defender', 'midfielder', 'ruck', 'forward'];
const FIRST = ['Valen', 'Renwick', 'Tavren', 'Ellorin', 'Kelren', 'Marven', 'Orlin', 'Sovren', 'Calven', 'Darven', 'Lioren', 'Nerwick', 'Averin', 'Brevren', 'Dorren', 'Evrin', 'Felren', 'Galven'];
const LAST = ['Mosswick', 'Tressvale', 'Kelworth', 'Caldermere', 'Fernwick', 'Westmere', 'Brindlefern', 'Hollowmere', 'Tarnwick', 'Alderfen', 'Verrendale', 'Cresswick', 'Bellmere', 'Darnwick', 'Elverfern', 'Fallmere', 'Glenwick', 'Haverfen'];
const CLUB_PLACES = ['Caldermere', 'Mosswick', 'Tarnwick', 'Alderfen', 'Verrendale', 'Cresswick'];
const CLUB_ENDINGS = ['Comets', 'Kites', 'Foxes', 'Herons', 'Storm', 'Embers'];
const MAX_ACTIONS = 260;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const validSeed = (seed: unknown): seed is number => Number.isInteger(seed) && (seed as number) >= 0 && (seed as number) <= 0xffffffff;
const validClub = (id: unknown): id is string => typeof id === 'string' && /^club-[0-5]$/.test(id);
const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id, index) => id === b[index]);

export function createWorld(seed: number): Club[] {
  if (!validSeed(seed)) return [];
  const rng = rngFrom(seed);
  const used = new Set<string>();
  return CLUB_PLACES.map((place, clubIndex) => ({
    id: `club-${clubIndex}`, name: `${place} ${CLUB_ENDINGS[Math.floor(rng() * CLUB_ENDINGS.length)]}`,
    style: TACTICS[Math.floor(rng() * TACTICS.length)].id,
    players: Array.from({ length: 36 }, (_, playerIndex) => {
      const role: Role = playerIndex < 12 ? 'defender' : playerIndex < 22 ? 'midfielder' : playerIndex < 26 ? 'ruck' : 'forward';
      const start = Math.floor(rng() * FIRST.length * LAST.length);
      let name = '';
      for (let attempt = 0; attempt < FIRST.length * LAST.length; attempt += 1) {
        const index = (start + attempt) % (FIRST.length * LAST.length);
        const candidate = `${FIRST[Math.floor(index / LAST.length)]} ${LAST[index % LAST.length]}`;
        if (!used.has(candidate)) { name = candidate; break; }
      }
      used.add(name);
      return { id: `club-${clubIndex}-p-${playerIndex}`, name, role, skill: 40 + Math.floor(rng() * 51), stamina: 45 + Math.floor(rng() * 46), fatigue: 0, prep: 0 };
    }),
  }));
}

export function clubById(state: Pick<ManagerState, 'clubs'>, id: string): Club | undefined { return state.clubs.find(club => club.id === id); }
export function playerById(state: ManagerState, id: string): Player | undefined { return state.clubs.flatMap(club => club.players).find(player => player.id === id); }
export function effectiveSkill(player: Player): number { return player.skill * (1 - player.fatigue * 0.0045) + player.prep; }
export function automaticLineup(club: Club, order: 'best' | 'worst' = 'best'): { starters: string[]; bench: string[] } {
  const sorted = [...club.players].sort((a, b) => (effectiveSkill(b) - effectiveSkill(a)) * (order === 'best' ? 1 : -1) || a.id.localeCompare(b.id));
  const starters = ROLES.flatMap(role => sorted.filter(player => player.role === role).slice(0, ROLE_COUNTS[role]).map(player => player.id));
  const available = sorted.filter(player => !starters.includes(player.id));
  const bench = ROLES.map(role => available.find(player => player.role === role)!.id);
  bench.push(available.find(player => !bench.includes(player.id))!.id);
  return { starters, bench };
}
export function fixturesForRound(round: number): { homeId: string; awayId: string }[] {
  if (!Number.isInteger(round) || round < 0 || round >= 10) return [];
  const order = [0, 1, 2, 3, 4, 5];
  for (let rotation = 0; rotation < round % 5; rotation += 1) order.splice(1, 0, order.pop()!);
  return Array.from({ length: 3 }, (_, index) => {
    const reverse = ((round % 5 + index) % 2 === 1) !== (round >= 5);
    return { homeId: `club-${order[reverse ? 5 - index : index]}`, awayId: `club-${order[reverse ? index : 5 - index]}` };
  });
}
export function emptyMatch(round: number, homeId: string, awayId: string): Match {
  return { round, homeId, awayId, quarter: 0, homeScore: { goals: 0, behinds: 0, total: 0 }, awayScore: { goals: 0, behinds: 0, total: 0 }, events: [], homeSquad: [], awaySquad: [] };
}
function ownFixture(state: Pick<ManagerState, 'round' | 'clubId'>): Match {
  const fixture = fixturesForRound(state.round).find(value => value.homeId === state.clubId || value.awayId === state.clubId)!;
  return emptyMatch(state.round, fixture.homeId, fixture.awayId);
}
export function createManager(seed: number, clubId = 'club-0'): ManagerState | null {
  if (!validSeed(seed) || !validClub(clubId)) return null;
  const clubs = createWorld(seed);
  const lineup = automaticLineup(clubs.find(club => club.id === clubId)!);
  return { seed, clubId, round: 0, phase: 'prepare', clubs, ...lineup, preparation: null, match: ownFixture({ round: 0, clubId }), results: [], swapsThisBreak: 0 };
}
export function opponentTactic(state: ManagerState): Tactic {
  const other = state.match?.homeId === state.clubId ? state.match.awayId : state.match?.homeId;
  return state.clubs.find(club => club.id === other)?.style ?? 'control';
}
export function validLineup(state: Pick<ManagerState, 'clubs' | 'clubId'>, starters: unknown, bench: unknown): starters is string[] {
  if (!Array.isArray(starters) || !Array.isArray(bench) || starters.length !== 18 || bench.length !== 5) return false;
  const ids = [...starters, ...bench];
  const club = clubById(state, state.clubId)!;
  return new Set(ids).size === 23 && ids.every(id => typeof id === 'string' && club.players.some(player => player.id === id))
    && ROLES.every(role => starters.filter(id => club.players.find(player => player.id === id)?.role === role).length === ROLE_COUNTS[role]);
}
function exactKeys(value: Record<string, unknown>, keys: string[]) { return Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key)); }
export function isManagerAction(value: unknown): value is ManagerAction {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (item.type === 'next') return exactKeys(item, ['type']);
  if (item.type === 'prepare') return exactKeys(item, ['type', 'choice']) && ['train', 'rest'].includes(item.choice as string);
  if (item.type === 'play') return exactKeys(item, ['type', 'tactic']) && ['control', 'direct', 'pressure'].includes(item.tactic as string);
  if (item.type === 'swap') return exactKeys(item, ['type', 'outId', 'inId']) && typeof item.outId === 'string' && typeof item.inId === 'string' && /^club-[0-5]-p-(?:[0-9]|[12][0-9]|3[0-5])$/.test(item.outId) && /^club-[0-5]-p-(?:[0-9]|[12][0-9]|3[0-5])$/.test(item.inId);
  return item.type === 'lineup' && exactKeys(item, ['type', 'starters', 'bench']) && Array.isArray(item.starters) && Array.isArray(item.bench) && item.starters.length === 18 && item.bench.length === 5 && [...item.starters, ...item.bench].every(id => typeof id === 'string' && /^club-[0-5]-p-(?:[0-9]|[12][0-9]|3[0-5])$/.test(id));
}
export function tacticEdge(tactic: Tactic, against: Tactic): number {
  if (tactic === against) return 0;
  return (tactic === 'control' && against === 'direct') || (tactic === 'direct' && against === 'pressure') || (tactic === 'pressure' && against === 'control') ? 9 : -9;
}
function strength(club: Club, ids: string[]): number { return ids.reduce((sum, id) => sum + effectiveSkill(club.players.find(player => player.id === id)!), 0) / ids.length; }
function scoreFor(events: ScoringEvent[], clubId: string): Score {
  const goals = events.filter(event => event.clubId === clubId && event.kind === 'goal').length;
  const behinds = events.filter(event => event.clubId === clubId && event.kind === 'behind').length;
  return { goals, behinds, total: goals * 6 + behinds };
}
// Round 1014: shared with the full season (aussieRulesLeague.ts). minutes is a trailing
// default so v1 replays bit for bit; an extra time period charges one quarter's fatigue.
export function quarter<C extends Club>(clubs: C[], match: Match, seed: number, homeIds: string[], awayIds: string[], homeTactic: Tactic, awayTactic: Tactic, minutes = 20): { clubs: C[]; match: Match } {
  const home = clubs.find(club => club.id === match.homeId)!;
  const away = clubs.find(club => club.id === match.awayId)!;
  const homeStrength = strength(home, homeIds) + tacticEdge(homeTactic, awayTactic);
  const awayStrength = strength(away, awayIds) + tacticEdge(awayTactic, homeTactic);
  const rng = rngFrom(hashLabel(`${seed}|${match.round}|${match.homeId}|${match.awayId}|${match.quarter}`));
  const events = [...match.events];
  for (let minute = 1; minute <= minutes; minute += 1) {
    // Always consume the same four dice, so choices face the same seeded chances.
    const possession = rng(), shot = rng(), accuracy = rng(), scorer = rng();
    const attackingHome = possession < clamp(0.5 + (homeStrength - awayStrength) * 0.006, 0.15, 0.85);
    const attacking = attackingHome ? home : away;
    const value = attackingHome ? homeStrength : awayStrength;
    if (shot >= clamp(0.45 + value * 0.0015, 0.3, 0.7)) continue;
    const ids = attackingHome ? homeIds : awayIds;
    const candidates = ids.flatMap(id => {
      const player = attacking.players.find(item => item.id === id)!;
      return Array.from({ length: player.role === 'forward' ? 4 : player.role === 'midfielder' ? 2 : 1 }, () => player.id);
    });
    const goal = accuracy < clamp(0.42 + value * 0.002, 0.3, 0.7);
    events.push({ id: `${match.round}-${match.homeId}-${match.quarter + 1}-${minute}`, clubId: attacking.id, playerId: candidates[Math.floor(scorer * candidates.length)], quarter: match.quarter + 1, minute, kind: goal ? 'goal' : 'behind', points: goal ? 6 : 1 });
  }
  const cost = (tactic: Tactic) => tactic === 'pressure' ? 7 : tactic === 'direct' ? 3 : 2;
  const nextClubs = clubs.map(club => {
    const ids = club.id === home.id ? homeIds : club.id === away.id ? awayIds : [];
    const tactic = club.id === home.id ? homeTactic : awayTactic;
    if (!ids.length) return club;
    return { ...club, players: club.players.map(player => ids.includes(player.id) ? { ...player, fatigue: clamp(player.fatigue + 7 + (100 - player.stamina) * 0.1 + cost(tactic), 0, 100) } : player) };
  });
  return { clubs: nextClubs, match: { ...match, quarter: match.quarter + 1, events, homeScore: scoreFor(events, home.id), awayScore: scoreFor(events, away.id) } };
}
export function simulateOtherMatch<C extends Club>(state: Pick<ManagerState, 'seed' | 'round'> & { clubs: C[] }, homeId: string, awayId: string): { clubs: C[]; match: Match } {
  const homeOpening = automaticLineup(clubById(state, homeId)!);
  const awayOpening = automaticLineup(clubById(state, awayId)!);
  let result = { clubs: state.clubs, match: { ...emptyMatch(state.round, homeId, awayId), homeSquad: [...homeOpening.starters, ...homeOpening.bench], awaySquad: [...awayOpening.starters, ...awayOpening.bench] } };
  for (let index = 0; index < 4; index += 1) {
    const home = result.clubs.find(club => club.id === homeId)!;
    const away = result.clubs.find(club => club.id === awayId)!;
    result = quarter(result.clubs, result.match, state.seed, automaticLineup({ ...home, players: home.players.filter(player => result.match.homeSquad.includes(player.id)) }).starters, automaticLineup({ ...away, players: away.players.filter(player => result.match.awaySquad.includes(player.id)) }).starters, home.style, away.style);
  }
  return result;
}
// Round 1014: lifted verbatim from the prepare branch so both seasons share it.
export function prepareClubs<C extends Club>(clubs: C[], ownId: string, ownChoice: Preparation, round: number): C[] {
  return clubs.map(club => {
    const choice = club.id === ownId ? ownChoice : round % 2 === 0 ? 'train' : 'rest';
    return { ...club, players: club.players.map(player => ({ ...player, prep: choice === 'train' ? 8 : 0, fatigue: clamp(player.fatigue + (choice === 'train' ? 8 : -30), 0, 100) })) };
  });
}
export function reduceManager(state: ManagerState, action: ManagerAction): ManagerState {
  if (state.phase === 'complete' || !isManagerAction(action)) return state;
  if (action.type === 'lineup') {
    if (state.phase !== 'prepare' || !validLineup(state, action.starters, action.bench) || (sameIds(state.starters, action.starters) && sameIds(state.bench, action.bench))) return state;
    return { ...state, starters: [...action.starters], bench: [...action.bench] };
  }
  if (action.type === 'prepare') {
    if (state.phase !== 'prepare') return state;
    const clubs = prepareClubs(state.clubs, state.clubId, action.choice, state.round);
    const opponent = state.match!.homeId === state.clubId ? state.match!.awayId : state.match!.homeId;
    const other = automaticLineup(clubs.find(club => club.id === opponent)!);
    const ownSquad = [...state.starters, ...state.bench];
    const otherSquad = [...other.starters, ...other.bench];
    const match = { ...state.match!, homeSquad: state.match!.homeId === state.clubId ? ownSquad : otherSquad, awaySquad: state.match!.awayId === state.clubId ? ownSquad : otherSquad };
    return { ...state, phase: 'quarter', preparation: action.choice, clubs, match };
  }
  if (action.type === 'swap') {
    if (state.phase !== 'break' || state.swapsThisBreak >= 5 || !state.starters.includes(action.outId) || !state.bench.includes(action.inId) || playerById(state, action.outId)?.role !== playerById(state, action.inId)?.role) return state;
    return { ...state, starters: state.starters.map(id => id === action.outId ? action.inId : id), bench: state.bench.map(id => id === action.inId ? action.outId : id), swapsThisBreak: state.swapsThisBreak + 1 };
  }
  if (action.type === 'next') {
    if (state.phase === 'break') return { ...state, phase: 'quarter', swapsThisBreak: 0 };
    if (state.phase !== 'report') return state;
    if (state.round === 9) return { ...state, phase: 'complete' };
    const round = state.round + 1;
    const clubs = state.clubs.map(club => ({ ...club, players: club.players.map(player => ({ ...player, fatigue: Math.max(0, player.fatigue - 20), prep: 0 })) }));
    return { ...state, clubs, round, phase: 'prepare', preparation: null, match: ownFixture({ round, clubId: state.clubId }), swapsThisBreak: 0 };
  }
  if (state.phase !== 'quarter' || !state.match || state.match.quarter >= 4) return state;
  const opponent = state.match.homeId === state.clubId ? state.match.awayId : state.match.homeId;
  const other = clubById(state, opponent)!;
  const otherSquad = state.match.homeId === other.id ? state.match.homeSquad : state.match.awaySquad;
  const otherIds = automaticLineup({ ...other, players: other.players.filter(player => otherSquad.includes(player.id)) }).starters;
  const ownHome = state.match.homeId === state.clubId;
  let result = quarter(state.clubs, state.match, state.seed, ownHome ? state.starters : otherIds, ownHome ? otherIds : state.starters, ownHome ? action.tactic : other.style, ownHome ? other.style : action.tactic);
  if (result.match.quarter < 4) return { ...state, ...result, phase: 'break', swapsThisBreak: 0 };
  const results = [...state.results, result.match];
  for (const fixture of fixturesForRound(state.round).filter(value => value.homeId !== state.clubId && value.awayId !== state.clubId)) {
    const simulated = simulateOtherMatch({ ...state, clubs: result.clubs }, fixture.homeId, fixture.awayId);
    result = { clubs: simulated.clubs, match: result.match };
    results.push(simulated.match);
  }
  return { ...state, ...result, results, phase: 'report', swapsThisBreak: 0 };
}
export function ladderFor(state: Pick<ManagerState, 'clubs' | 'results'>): LadderRow[] {
  const rows = state.clubs.map(club => ({ clubId: club.id, played: 0, wins: 0, draws: 0, losses: 0, points: 0, pointsFor: 0, pointsAgainst: 0, percentage: 0 }));
  for (const match of state.results) {
    const home = rows.find(row => row.clubId === match.homeId)!;
    const away = rows.find(row => row.clubId === match.awayId)!;
    for (const [row, own, other] of [[home, match.homeScore.total, match.awayScore.total], [away, match.awayScore.total, match.homeScore.total]] as const) {
      row.played += 1; row.pointsFor += own; row.pointsAgainst += other;
      if (own > other) { row.wins += 1; row.points += 4; }
      else if (own === other) { row.draws += 1; row.points += 2; }
      else row.losses += 1;
      row.percentage = row.pointsAgainst ? row.pointsFor / row.pointsAgainst * 100 : row.pointsFor ? 100 : 0;
    }
  }
  // Exact ties use the generated club id as the declared fictional-league tiebreak.
  return rows.sort((a, b) => b.points - a.points || b.percentage - a.percentage || a.clubId.localeCompare(b.clubId));
}
export function replayManager(seed: number, clubId: string, actions: unknown): ManagerState | null {
  let state = createManager(seed, clubId);
  if (!state || !Array.isArray(actions) || actions.length > MAX_ACTIONS) return null;
  for (const action of actions) {
    if (!isManagerAction(action)) return null;
    const next = reduceManager(state, action);
    if (next === state) return null;
    state = next;
  }
  return state;
}
export function readManagerSave(raw: string | null): { save: ManagerSave; state: ManagerState } | null {
  if (!raw || raw.length > 150000) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== 'object' || Array.isArray(value) || !exactKeys(value, ['version', 'seed', 'clubId', 'actions']) || value.version !== 1 || !validSeed(value.seed) || !validClub(value.clubId)) return null;
    const state = replayManager(value.seed, value.clubId, value.actions);
    return state ? { save: value as unknown as ManagerSave, state } : null;
  } catch { return null; }
}
