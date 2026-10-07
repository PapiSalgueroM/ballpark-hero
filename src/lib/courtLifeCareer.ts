import {
  createCourtMatch, neutralizeCourtMatch, simulateCourtMatch,
  COURT_HALF_TICKS, COURT_LENGTH, COURT_SHOT_CLOCK_TICKS, COURT_WIDTH,
  type CourtAttributes, type CourtMatch, type CourtMatchConfig, type CourtRole, type CourtStats, type CourtTeamSpec,
} from '@/lib/courtLife';
import { createCourtLifeWorld, COURT_ATTRIBUTE_KEYS, type CourtAttribute, type CourtLifeChange, type CourtLifeWorld } from '@/data/courtLifeWorld';

export const COURT_CAREER_VERSION = 1;
export const COURT_CAREER_SAVE_KEY = 'court-life-career-v1';
export type CourtCareerPhase = 'preparation' | 'match' | 'seasonComplete';
export interface CourtResources { condition: number; credits: number; trust: number }
export interface CourtFixture { id: string; round: number; homeId: string; awayId: string; seed: number }
export interface CourtFixtureResult {
  fixtureId: string; home: number; away: number; winner: 'home' | 'away' | 'draw';
  tick: number; rngState: number; stats: Record<string, CourtStats>;
}
export type CourtCareerAction = { kind: 'training'; attribute: CourtAttribute } | { kind: 'recovery' | 'work' | 'team' };
export interface CourtCareerEffect extends CourtResources { attrs: CourtAttributes }
export interface CourtPreparationRecord { label: string; effect: CourtCareerEffect }
export interface CourtWeekRecord {
  round: number; fixtureId: string; preparation: CourtPreparationRecord[];
  decision: { decisionId: string; optionId: string; label: string; effect: CourtCareerEffect };
  beforeMatch: { resources: CourtResources; attributes: CourtAttributes; role: string };
  afterMatch: CourtResources;
}
export interface CourtChapter {
  season: number; fixtures: CourtFixture[]; results: CourtFixtureResult[];
  weeks: CourtWeekRecord[]; resources: CourtResources; attributes: CourtAttributes; score: number; claimed: boolean;
}
export interface CourtCareer {
  version: 1; id: string; seed: number; playerId: string; crewId: string; archetypeId: string;
  world: CourtLifeWorld; season: number; round: number; phase: CourtCareerPhase;
  resources: CourtResources; blocksLeft: number; preparation: CourtPreparationRecord[];
  decisionId: string; decision: null | { optionId: string; label: string; effect: CourtCareerEffect };
  fixtures: CourtFixture[]; results: CourtFixtureResult[];
  activeMatch: null | { fixtureId: string; paused: boolean; match: CourtMatch };
  weeks: CourtWeekRecord[]; chapters: CourtChapter[];
}
export interface CourtStanding { crewId: string; played: number; wins: number; draws: number; losses: number; scored: number; conceded: number }
export type CourtSaveDecode = { status: 'valid'; career: CourtCareer } | { status: 'invalid' | 'unsupported'; reason: string };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const zeroAttrs = (): CourtAttributes => ({ finishing: 0, shooting: 0, passing: 0, defense: 0, conditioning: 0 });
const STATS = ['points', 'attempts', 'made', 'threes', 'assists', 'rebounds', 'offensiveRebounds', 'steals', 'blocks', 'turnovers'] as const;
const zeroStats = (): CourtStats => ({ points: 0, attempts: 0, made: 0, threes: 0, assists: 0, rebounds: 0, offensiveRebounds: 0, steals: 0, blocks: 0, turnovers: 0 });

export function courtCareerPlayer(career: CourtCareer) {
  return career.world.crews.find(crew => crew.id === career.crewId)!.players.find(player => player.id === career.playerId)!;
}
export function courtCareerRole(trust: number): { name: 'Newcomer' | 'Trusted outlet' | 'Floor leader'; config: CourtRole } {
  if (trust >= 70) return { name: 'Floor leader', config: { inboundPriority: 0.8, callPriority: 0.9 } };
  if (trust >= 40) return { name: 'Trusted outlet', config: { inboundPriority: 0.55, callPriority: 0.6 } };
  return { name: 'Newcomer', config: { inboundPriority: 0.25, callPriority: 0.25 } };
}
function schedule(id: string, seed: number, season: number, crews: CourtTeamSpec[]): CourtFixture[] {
  const rounds = [[[0, 1], [2, 3]], [[2, 0], [1, 3]], [[0, 3], [1, 2]], [[1, 0], [3, 2]], [[0, 2], [3, 1]], [[3, 0], [2, 1]]];
  return rounds.flatMap((pairs, round) => pairs.map(([home, away], index) => ({
    id: `${id}:s${season}:r${round + 1}:${index}`, round, homeId: crews[home].id, awayId: crews[away].id,
    seed: ((seed + season * 104729 + round * 7919 + index * 3571) % 2147483646) + 1,
  })));
}
function contextualDecision(resources: CourtResources, round: number) {
  return resources.condition < 50 ? 'late-night' : resources.credits < 10 ? 'shift-offer'
    : resources.trust < 40 ? 'crew-session' : ['equipment', 'neighbors', 'responsibility'][round % 3];
}
export function createCourtLifeCareer(options: { id: string; name: string; crewId: string; archetypeId: string; seed: number }): CourtCareer {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(options.id) || !Number.isInteger(options.seed) || options.seed < 1 || options.seed > 2147483646) throw new Error('Choose a valid career ID and seed.');
  const name = options.name.trim().replace(/\s+/g, ' ').slice(0, 24);
  if (!name) throw new Error('Give your player a name.');
  const world = createCourtLifeWorld(), crew = world.crews.find(row => row.id === options.crewId);
  const archetype = world.archetypes.find(row => row.id === options.archetypeId);
  if (!crew || !archetype) throw new Error('Choose a crew and playing style.');
  const playerId = `${options.id}:player`;
  crew.players[0] = { id: playerId, name, attrs: { ...archetype.attrs } };
  const resources = { condition: 85, credits: 18, trust: 25 };
  return {
    version: 1, id: options.id, seed: options.seed, playerId, crewId: crew.id, archetypeId: archetype.id,
    world, season: 1, round: 0, phase: 'preparation', resources, blocksLeft: 2, preparation: [],
    decisionId: contextualDecision(resources, 0), decision: null,
    fixtures: schedule(options.id, options.seed, 1, world.crews), results: [], activeMatch: null, weeks: [], chapters: [],
  };
}

function previewChange(career: CourtCareer, change: CourtLifeChange) {
  const attrs = courtCareerPlayer(career).attrs, effect: CourtCareerEffect = { condition: 0, credits: 0, trust: 0, attrs: zeroAttrs() };
  for (const key of ['condition', 'credits', 'trust'] as const) {
    effect[key] = clamp(career.resources[key] + (change[key] ?? 0), 0, key === 'credits' ? 1000000 : 100) - career.resources[key];
  }
  for (const key of COURT_ATTRIBUTE_KEYS) effect.attrs[key] = clamp(attrs[key] + (change.attrs?.[key] ?? 0), 1, 95) - attrs[key];
  return { effect, reason: (change.credits ?? 0) + career.resources.credits < 0 ? 'Not enough credits.' : null };
}
function applyEffect(career: CourtCareer, effect: CourtCareerEffect): CourtCareer {
  const next = copy(career), player = courtCareerPlayer(next);
  for (const key of ['condition', 'credits', 'trust'] as const) next.resources[key] += effect[key];
  for (const key of COURT_ATTRIBUTE_KEYS) player.attrs[key] += effect.attrs[key];
  return next;
}
export function previewCareerAction(career: CourtCareer, action: CourtCareerAction) {
  let label: string, change: CourtLifeChange;
  if (action.kind === 'training') {
    if (!COURT_ATTRIBUTE_KEYS.includes(action.attribute)) throw new Error('Choose a real training skill.');
    const growth = courtCareerPlayer(career).attrs[action.attribute] >= 85 ? 1 : 2;
    label = `Train ${action.attribute}`; change = { credits: -6, condition: -12, attrs: { [action.attribute]: growth } };
  } else if (action.kind === 'recovery') { label = 'Recovery'; change = { condition: 18 }; }
  else if (action.kind === 'work') { label = 'Work a shift'; change = { credits: 12, condition: -10, trust: -2 }; }
  else { label = 'Team session'; change = { credits: -2, condition: -6, trust: 8, attrs: { passing: 1 } }; }
  const preview = previewChange(career, change);
  return { label, ...preview, reason: career.phase !== 'preparation' ? 'Preparation is closed.' : career.blocksLeft === 0 ? 'Both time blocks are used.' : preview.reason };
}
export function careerActions(career: CourtCareer) {
  const actions: CourtCareerAction[] = [...COURT_ATTRIBUTE_KEYS.map(attribute => ({ kind: 'training' as const, attribute })), { kind: 'recovery' }, { kind: 'work' }, { kind: 'team' }];
  return actions.map(action => ({ action, ...previewCareerAction(career, action) }));
}
export function applyCareerAction(career: CourtCareer, action: CourtCareerAction): CourtCareer {
  const preview = previewCareerAction(career, action);
  if (preview.reason) return career;
  const next = applyEffect(career, preview.effect);
  next.blocksLeft -= 1; next.preparation.push({ label: preview.label, effect: preview.effect });
  return next;
}
export function currentLifeDecision(career: CourtCareer) {
  const decision = career.world.decisions.find(row => row.id === career.decisionId)!;
  return { ...decision, options: decision.options.map(option => {
    const preview = previewChange(career, option.change);
    return { ...option, ...preview, reason: career.phase !== 'preparation' ? 'Preparation is closed.' : career.decision ? 'You already made this choice.' : preview.reason };
  }) };
}
export function chooseLifeDecision(career: CourtCareer, optionId: string): CourtCareer {
  const option = currentLifeDecision(career).options.find(row => row.id === optionId);
  if (!option || option.reason) return career;
  const next = applyEffect(career, option.effect);
  next.decision = { optionId, label: option.label, effect: option.effect };
  return next;
}
export function currentCareerFixture(career: CourtCareer) {
  return career.fixtures.find(row => row.round === career.round && (row.homeId === career.crewId || row.awayId === career.crewId)) ?? null;
}
export function careerMatchConfig(career: CourtCareer, fixture = currentCareerFixture(career)!): CourtMatchConfig {
  const team = (id: string): CourtTeamSpec => {
    const crew = copy(career.world.crews.find(row => row.id === id)!);
    if (id === career.crewId) crew.chemistry = clamp((crew.chemistry ?? 50) + (career.resources.trust - 25) * 0.4, 0, 100);
    for (const player of crew.players) if (player.id === career.playerId) player.condition = career.resources.condition;
    return crew;
  };
  return { id: fixture.id, seed: fixture.seed, home: team(fixture.homeId), away: team(fixture.awayId),
    controlledPlayerId: fixture.homeId === career.crewId || fixture.awayId === career.crewId ? career.playerId : null,
    role: courtCareerRole(career.resources.trust).config };
}
export function startCareerMatch(career: CourtCareer): CourtCareer {
  if (career.phase !== 'preparation' || career.blocksLeft !== 0 || !career.decision) return career;
  const fixture = currentCareerFixture(career);
  if (!fixture) return career;
  const match = createCourtMatch(careerMatchConfig(career, fixture));
  return { ...career, phase: 'match', activeMatch: { fixtureId: fixture.id, paused: true, match } };
}
export function updateCareerMatch(career: CourtCareer, match: CourtMatch, paused: boolean): CourtCareer {
  if (career.phase !== 'match' || !career.activeMatch || match.id !== career.activeMatch.fixtureId || match.tick < career.activeMatch.match.tick) return career;
  return { ...career, activeMatch: { fixtureId: match.id, paused, match: paused ? neutralizeCourtMatch(match) : match } };
}
function compactResult(match: CourtMatch): CourtFixtureResult {
  return { fixtureId: match.id, home: match.score.home, away: match.score.away, winner: match.result!.winner,
    tick: match.tick, rngState: match.rngState, stats: Object.fromEntries(match.players.map(player => [player.id, { ...player.stats }])) };
}
export function courtSeasonStats(career: Pick<CourtCareer, 'playerId' | 'results'>): CourtStats {
  const total = zeroStats();
  for (const result of career.results) {
    const stats = result.stats[career.playerId];
    if (stats) for (const key of STATS) total[key] += stats[key];
  }
  return total;
}
export function courtStandings(world: CourtLifeWorld, fixtures: CourtFixture[], results: CourtFixtureResult[]): CourtStanding[] {
  const rows = world.crews.map(crew => ({ crewId: crew.id, played: 0, wins: 0, draws: 0, losses: 0, scored: 0, conceded: 0 }));
  for (const result of results) {
    const fixture = fixtures.find(row => row.id === result.fixtureId)!;
    const home = rows.find(row => row.crewId === fixture.homeId)!, away = rows.find(row => row.crewId === fixture.awayId)!;
    home.played++; away.played++; home.scored += result.home; home.conceded += result.away; away.scored += result.away; away.conceded += result.home;
    if (result.home === result.away) { home.draws++; away.draws++; }
    else if (result.home > result.away) { home.wins++; away.losses++; }
    else { away.wins++; home.losses++; }
  }
  return rows.sort((a, b) => (b.wins * 2 + b.draws) - (a.wins * 2 + a.draws) || (b.scored - b.conceded) - (a.scored - a.conceded) || b.scored - a.scored || a.crewId.localeCompare(b.crewId));
}
export function courtSeasonScore(career: Pick<CourtCareer, 'world' | 'fixtures' | 'results' | 'crewId' | 'playerId'>) {
  return courtSeasonScoreBreakdown(career).total;
}
export function courtSeasonScoreBreakdown(career: Pick<CourtCareer, 'world' | 'fixtures' | 'results' | 'crewId' | 'playerId'>) {
  const line = courtStandings(career.world, career.fixtures, career.results).find(row => row.crewId === career.crewId)!;
  const stats = courtSeasonStats(career);
  const wins = 50 * (line.wins + line.draws * 0.5) / 6;
  const scoring = 20 * Math.min(stats.points, 60) / 60;
  const teamwork = 20 * Math.min(2 * stats.assists + stats.steals + stats.blocks + stats.rebounds, 36) / 36;
  const security = 10 * Math.max(0, 1 - stats.turnovers / 18);
  return { wins, scoring, teamwork, security, total: Math.round(wins + scoring + teamwork + security) };
}
export function completeCareerMatch(career: CourtCareer, match = career.activeMatch?.match): CourtCareer {
  const fixture = currentCareerFixture(career);
  if (!fixture || career.phase !== 'match' || !match || career.results.some(row => row.fixtureId === match.id)) return career;
  if (match.id !== fixture.id || match.phase !== 'finished' || !validMatch(match) || !match.result) return career;
  const config = careerMatchConfig(career, fixture);
  if (!sameData(match.teams, { home: config.home, away: config.away }) || match.seed !== fixture.seed || !match.players.some(row => row.id === career.playerId)) return career;
  const otherFixture = career.fixtures.find(row => row.round === career.round && row.id !== fixture.id)!;
  const otherMatch = simulateCourtMatch(careerMatchConfig(career, otherFixture));
  const results = [...career.results, compactResult(match), compactResult(otherMatch)];
  const player = match.players.find(row => row.id === career.playerId)!;
  const ownSide = fixture.homeId === career.crewId ? 'home' : 'away';
  const won = match.result.winner === ownSide, draw = match.result.winner === 'draw';
  const trust = clamp(player.stats.assists * 2 + player.stats.steals + player.stats.blocks + (won ? 2 : 0) - player.stats.turnovers * 2, -8, 8);
  const next = applyEffect(career, previewChange(career, { credits: 10 + (won ? 6 : draw ? 3 : 0),
    condition: -Math.max(8, Math.round((100 - player.stamina) / 5)), trust }).effect);
  next.weeks.push({ round: career.round, fixtureId: fixture.id, preparation: copy(career.preparation),
    decision: { decisionId: career.decisionId, ...copy(career.decision!) },
    beforeMatch: { resources: { ...career.resources }, attributes: { ...courtCareerPlayer(career).attrs }, role: courtCareerRole(career.resources.trust).name },
    afterMatch: { ...next.resources } });
  next.results = results; next.round += 1; next.activeMatch = null;
  next.blocksLeft = 2; next.preparation = []; next.decision = null;
  next.decisionId = contextualDecision(next.resources, next.round);
  next.phase = next.round === 6 ? 'seasonComplete' : 'preparation';
  if (next.phase === 'seasonComplete') next.chapters.push({ season: next.season, fixtures: copy(next.fixtures), results: copy(next.results),
    weeks: copy(next.weeks), resources: { ...next.resources }, attributes: { ...courtCareerPlayer(next).attrs }, score: courtSeasonScore(next), claimed: false });
  return next;
}
export function claimCourtSeasonScore(career: CourtCareer): { career: CourtCareer; completion: null | { id: string; score: number; wins: number } } {
  if (career.phase !== 'seasonComplete') return { career, completion: null };
  const chapter = career.chapters.find(row => row.season === career.season && !row.claimed);
  if (!chapter) return { career, completion: null };
  const next = copy(career); next.chapters.find(row => row.season === chapter.season)!.claimed = true;
  const own = courtStandings(career.world, chapter.fixtures, chapter.results).find(row => row.crewId === career.crewId)!;
  return { career: next, completion: { id: `${career.id}:season:${chapter.season}`, score: chapter.score, wins: own.wins } };
}
export function nextCareerSeason(career: CourtCareer): CourtCareer {
  if (career.phase !== 'seasonComplete') return career;
  const next = copy(career); next.season += 1; next.round = 0; next.phase = 'preparation';
  next.fixtures = schedule(next.id, next.seed, next.season, next.world.crews); next.results = []; next.weeks = [];
  next.blocksLeft = 2; next.preparation = []; next.decision = null; next.activeMatch = null;
  next.decisionId = contextualDecision(next.resources, 0);
  return next;
}
export function courtCareerHistory(career: CourtCareer) {
  return career.chapters.map(chapter => ({ season: chapter.season, weeks: chapter.weeks, score: chapter.score }));
}

const object = (value: unknown): value is Record<string, any> => value !== null && typeof value === 'object' && !Array.isArray(value);
const number = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const integer = (value: unknown, min = 0, max = 1000000) => number(value, min, max) && Number.isInteger(value);
const text = (value: unknown, max = 100) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const attrs = (value: unknown) => object(value) && COURT_ATTRIBUTE_KEYS.every(key => number(value[key], 1, 95));
const resources = (value: unknown) => object(value) && integer(value.condition, 0, 100) && integer(value.trust, 0, 100) && integer(value.credits);
const stats = (value: unknown): value is CourtStats => object(value) && STATS.every(key => integer(value[key], 0, 1000))
  && value.made <= value.attempts && value.threes <= value.made && value.points === value.made * 2 + value.threes && value.offensiveRebounds <= value.rebounds;
const effect = (value: unknown) => object(value) && ['condition', 'credits', 'trust'].every(key => integer(value[key], -1000000, 1000000))
  && object(value.attrs) && COURT_ATTRIBUTE_KEYS.every(key => integer(value.attrs[key], -95, 95));
const sameAttrs = (a: CourtAttributes, b: CourtAttributes) => COURT_ATTRIBUTE_KEYS.every(key => a[key] === b[key]);
function sameData(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((value, index) => sameData(value, b[index]));
  return object(a) && object(b) && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => sameData(a[key], b[key]));
}
function validTeam(value: unknown): value is CourtTeamSpec {
  return object(value) && text(value.id) && text(value.name, 80) && (value.color === undefined || /^#[\da-f]{6}$/i.test(value.color))
    && (value.chemistry === undefined || number(value.chemistry, 0, 100)) && Array.isArray(value.players) && value.players.length === 3
    && value.players.every((player: unknown) => object(player) && text(player.id) && text(player.name, 40) && attrs(player.attrs) && (player.condition === undefined || number(player.condition, 0, 100)))
    && new Set(value.players.map((player: any) => player.id)).size === 3;
}
function validWorld(value: unknown): value is CourtLifeWorld {
  if (!object(value) || !Array.isArray(value.crews) || value.crews.length !== 4 || !value.crews.every(validTeam)) return false;
  if (new Set(value.crews.map((crew: any) => crew.id)).size !== 4 || new Set(value.crews.flatMap((crew: any) => crew.players.map((player: any) => player.id))).size !== 12) return false;
  if (!Array.isArray(value.archetypes) || value.archetypes.length !== 5 || !value.archetypes.every((row: any) => object(row) && text(row.id) && text(row.name) && text(row.description, 300) && attrs(row.attrs) && COURT_ATTRIBUTE_KEYS.reduce((sum, key) => sum + row.attrs[key], 0) === 300)) return false;
  if (new Set(value.archetypes.map((row: any) => row.id)).size !== 5 || !Array.isArray(value.decisions) || value.decisions.length !== 6) return false;
  const ids = ['crew-session', 'shift-offer', 'late-night', 'equipment', 'neighbors', 'responsibility'];
  return ids.every(id => value.decisions.filter((row: any) => row.id === id).length === 1) && value.decisions.every((row: any) => object(row) && text(row.title) && text(row.situation, 500)
    && Array.isArray(row.options) && row.options.length === 2 && row.options[0].id !== row.options[1].id && row.options.every((option: any) => object(option) && text(option.id) && text(option.label) && text(option.explanation, 500) && object(option.change)
      && ['condition', 'credits', 'trust'].every(key => option.change[key] === undefined || integer(option.change[key], -100, 100))
      && (option.change.attrs === undefined || object(option.change.attrs) && Object.keys(option.change.attrs).every(key => COURT_ATTRIBUTE_KEYS.includes(key as CourtAttribute) && integer(option.change.attrs[key], -5, 5)))));
}
function validMatch(value: unknown): value is CourtMatch {
  if (!object(value) || value.version !== 1 || !text(value.id) || !integer(value.seed, 0, 4294967295) || !integer(value.rngState, 0, 4294967295) || !integer(value.tick, 0, 36000)
    || !object(value.teams) || !validTeam(value.teams.home) || !validTeam(value.teams.away) || value.teams.home.id === value.teams.away.id) return false;
  const specs = [...value.teams.home.players, ...value.teams.away.players], ids = specs.map(row => row.id);
  if (new Set(ids).size !== 6 || !Array.isArray(value.players) || value.players.length !== 6 || new Set(value.players.map((row: any) => row?.id)).size !== 6) return false;
  if (!value.players.every((player: any) => object(player) && ids.includes(player.id) && text(player.name, 40) && attrs(player.attrs) && stats(player.stats)
    && (player.side === 'home' || player.side === 'away') && value.teams[player.side].players.some((row: any) => row.id === player.id && sameAttrs(row.attrs, player.attrs))
    && number(player.condition, 0, 100) && number(player.stamina, 0, 100) && number(player.stride, 0, 10000) && number(player.x, 0, COURT_WIDTH) && number(player.y, 0, COURT_LENGTH)
    && number(player.z, 0, 5) && ['vx', 'vy', 'vz'].every(key => number(player[key], -30, 30)) && ['facingX', 'facingY'].every(key => number(player[key], -1, 1))
    && ['idle', 'move', 'dribble', 'shoot', 'pass', 'steal', 'jump', 'guard'].includes(player.action) && ['actionTicks', 'cooldown', 'chargeTicks'].every(key => integer(player[key], 0, 36000)))) return false;
  const side = (value: unknown) => value === 'home' || value === 'away';
  const actor = (value: unknown) => value === null || ids.includes(value as string);
  if (!actor(value.controlledPlayerId) || !object(value.role) || !number(value.role.inboundPriority, 0, 1) || !number(value.role.callPriority, 0, 1)
    || !['playing', 'inbound', 'halftime', 'finished'].includes(value.phase) || !integer(value.period, 1, 4) || !integer(value.remainingTicks, 0, COURT_HALF_TICKS)
    || !integer(value.shotClockTicks, 0, COURT_SHOT_CLOCK_TICKS) || !side(value.possession) || !integer(value.inboundTicks, 0, 300)
    || !object(value.score) || !integer(value.score.home, 0, 1000) || !integer(value.score.away, 0, 1000) || !integer(value.nextFlightId, 0, 36000) || !integer(value.callUntilTick, 0, 36000) || !text(value.message, 500)) return false;
  for (const teamSide of ['home', 'away']) if (value.players.filter((player: any) => player.side === teamSide).reduce((sum: number, player: any) => sum + player.stats.points, 0) !== value.score[teamSide]) return false;
  const ball = value.ball;
  if (!object(ball) || !['owned', 'pass', 'shot', 'loose', 'dead'].includes(ball.mode) || !number(ball.x, -5, COURT_WIDTH + 5) || !number(ball.y, -5, COURT_LENGTH + 5)
    || !number(ball.z, -1, 20) || !['vx', 'vy', 'vz'].every(key => number(ball[key], -50, 50))
    || !['ownerId', 'lastTouchId', 'shooterId', 'intendedReceiverId', 'passerId', 'turnoverOwnerId'].every(key => actor(ball[key]))
    || !integer(ball.flightId, 0, 36000) || !integer(ball.scoredFlightId, -1, 36000) || !(ball.shotSide === null || side(ball.shotSide)) || ![2, 3].includes(ball.shotValue)
    || !integer(ball.releasedTick, 0, value.tick) || typeof ball.reboundEligible !== 'boolean' || typeof ball.rimTouched !== 'boolean'
    || (ball.mode === 'owned' && ball.ownerId === null)) return false;
  if (ball.mode === 'shot' && (ball.ownerId !== null || !side(ball.shotSide) || !value.players.some((player: any) => player.id === ball.shooterId && player.side === ball.shotSide))) return false;
  if (value.lastPass !== null && (!object(value.lastPass) || !ids.includes(value.lastPass.passerId) || !ids.includes(value.lastPass.receiverId) || !integer(value.lastPass.tick, 0, value.tick))) return false;
  if (!Array.isArray(value.events) || value.events.length > 36000 || !value.events.every((event: any, index: number) => object(event) && integer(event.id) && (index === 0 || event.id > value.events[index - 1].id)
    && integer(event.tick, 0, value.tick) && ['inbound', 'pass', 'catch', 'shot', 'basket', 'miss', 'rim', 'block', 'rebound', 'steal', 'turnover', 'out', 'halftime', 'overtime', 'finish'].includes(event.kind)
    && (event.side === null || side(event.side)) && actor(event.playerId) && (event.otherPlayerId === undefined || ids.includes(event.otherPlayerId)) && (event.points === undefined || integer(event.points, 0, 3))
    && (event.flightId === undefined || integer(event.flightId, 0, 36000)) && text(event.text, 500))) return false;
  if (value.phase !== 'finished') return value.result === null;
  return object(value.result) && value.result.home === value.score.home && value.result.away === value.score.away
    && value.result.winner === (value.score.home === value.score.away ? 'draw' : value.score.home > value.score.away ? 'home' : 'away');
}
function validResults(value: unknown, fixtures: CourtFixture[], world: CourtLifeWorld, rounds: number): value is CourtFixtureResult[] {
  if (!Array.isArray(value) || value.length !== rounds * 2 || new Set(value.map(row => row?.fixtureId)).size !== value.length) return false;
  return value.every(row => {
    if (!object(row)) return false;
    const fixture = fixtures.find(item => item.id === row.fixtureId);
    if (!fixture || fixture.round >= rounds || !integer(row.home, 0, 1000) || !integer(row.away, 0, 1000) || !integer(row.tick, 1, 36000) || !integer(row.rngState, 0, 4294967295) || !object(row.stats)) return false;
    const home = world.crews.find(crew => crew.id === fixture.homeId)!, away = world.crews.find(crew => crew.id === fixture.awayId)!;
    const ids = [...home.players, ...away.players].map(player => player.id);
    return Object.keys(row.stats).length === 6 && ids.every(id => stats(row.stats[id]))
      && home.players.reduce((total, player) => total + row.stats[player.id].points, 0) === row.home
      && away.players.reduce((total, player) => total + row.stats[player.id].points, 0) === row.away
      && row.winner === (row.home === row.away ? 'draw' : row.home > row.away ? 'home' : 'away');
  });
}
function validSchedule(value: unknown, expected: CourtFixture[]): value is CourtFixture[] {
  return Array.isArray(value) && value.length === 12 && value.every((row, index) => object(row) && Object.keys(expected[index]).every(key => row[key] === expected[index][key]));
}
function validHistory(value: unknown, fixtures: CourtFixture[], world: CourtLifeWorld, crewId: string, rounds: number): value is CourtWeekRecord[] {
  return Array.isArray(value) && value.length === rounds && value.every((week, round) => {
    if (!object(week) || week.round !== round || !fixtures.some(row => row.round === round && row.id === week.fixtureId && (row.homeId === crewId || row.awayId === crewId))
      || !Array.isArray(week.preparation) || week.preparation.length !== 2 || !week.preparation.every((row: any) => object(row) && text(row.label) && effect(row.effect))
      || !object(week.decision) || !effect(week.decision.effect) || !text(week.decision.label) || !object(week.beforeMatch) || !resources(week.beforeMatch.resources)
      || !attrs(week.beforeMatch.attributes) || week.beforeMatch.role !== courtCareerRole(week.beforeMatch.resources.trust).name || !resources(week.afterMatch)) return false;
    return world.decisions.some(row => row.id === week.decision.decisionId && row.options.some(option => option.id === week.decision.optionId));
  });
}
function validCareer(value: unknown): value is CourtCareer {
  if (!object(value) || value.version !== 1 || !text(value.id, 80) || !/^[a-zA-Z0-9_-]+$/.test(value.id) || !integer(value.seed, 1, 2147483646) || value.playerId !== `${value.id}:player`
    || !validWorld(value.world) || !resources(value.resources) || !integer(value.season, 1, 10000) || !integer(value.round, 0, 6) || !integer(value.blocksLeft, 0, 2)
    || !['preparation', 'match', 'seasonComplete'].includes(value.phase) || !value.world.crews.some(crew => crew.id === value.crewId && crew.players.some(player => player.id === value.playerId))
    || !value.world.archetypes.some(row => row.id === value.archetypeId) || !validSchedule(value.fixtures, schedule(value.id, value.seed, value.season, value.world.crews))
    || !validResults(value.results, value.fixtures, value.world, value.round) || !validHistory(value.weeks, value.fixtures, value.world, value.crewId, value.round)) return false;
  const decision = value.world.decisions.find(row => row.id === value.decisionId);
  if (!decision || !Array.isArray(value.preparation) || value.preparation.length !== 2 - value.blocksLeft || !value.preparation.every((row: any) => object(row) && text(row.label) && effect(row.effect))
    || (value.decision !== null && (!object(value.decision) || !decision.options.some(row => row.id === value.decision.optionId) || !text(value.decision.label) || !effect(value.decision.effect)))) return false;
  if ((value.phase === 'seasonComplete') !== (value.round === 6)) return false;
  if (value.phase === 'match') {
    if (value.blocksLeft !== 0 || !value.decision || !object(value.activeMatch) || typeof value.activeMatch.paused !== 'boolean' || !validMatch(value.activeMatch.match)) return false;
    const fixture = currentCareerFixture(value as CourtCareer), match = value.activeMatch.match;
    if (!fixture || match.id !== fixture.id || value.activeMatch.fixtureId !== fixture.id || match.seed !== fixture.seed || match.controlledPlayerId !== value.playerId
      || match.teams.home.id !== fixture.homeId || match.teams.away.id !== fixture.awayId) return false;
    const config = careerMatchConfig(value as CourtCareer, fixture);
    if (!sameData(match.teams, { home: config.home, away: config.away })) return false;
    for (const player of match.players) {
      const original = value.world.crews.flatMap(crew => crew.players).find(row => row.id === player.id);
      if (!original || !sameAttrs(original.attrs, player.attrs)) return false;
    }
    const role = courtCareerRole(value.resources.trust).config;
    if (match.role.inboundPriority !== role.inboundPriority || match.role.callPriority !== role.callPriority) return false;
  } else if (value.activeMatch !== null) return false;
  const count = value.season - (value.phase === 'seasonComplete' ? 0 : 1);
  if (!Array.isArray(value.chapters) || value.chapters.length !== count) return false;
  if (value.phase === 'seasonComplete') {
    const chapter = value.chapters[value.chapters.length - 1];
    if (!chapter || !sameData(chapter.results, value.results) || !sameData(chapter.weeks, value.weeks) || !sameData(chapter.resources, value.resources) || !sameAttrs(chapter.attributes, courtCareerPlayer(value as CourtCareer).attrs)) return false;
  }
  return value.chapters.every((chapter: any, index: number) => object(chapter) && chapter.season === index + 1 && typeof chapter.claimed === 'boolean' && resources(chapter.resources) && attrs(chapter.attributes)
    && validSchedule(chapter.fixtures, schedule(value.id, value.seed, chapter.season, value.world.crews)) && validResults(chapter.results, chapter.fixtures, value.world, 6)
    && validHistory(chapter.weeks, chapter.fixtures, value.world, value.crewId, 6)
    && chapter.score === courtSeasonScore({ ...value, fixtures: chapter.fixtures, results: chapter.results } as CourtCareer));
}
export function encodeCourtLifeSave(career: CourtCareer): string { return JSON.stringify(career); }
export function decodeCourtLifeSave(raw: string): CourtSaveDecode {
  if (raw.length > 2000000) return { status: 'invalid', reason: 'This career file is too large to load safely.' };
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return { status: 'invalid', reason: 'This career file is not readable JSON.' }; }
  if (object(value) && value.version !== 1) return { status: 'unsupported', reason: 'This career uses a different save version. Keep the original file.' };
  try {
    if (!validCareer(value)) return { status: 'invalid', reason: 'This career has missing or inconsistent progress. Keep the original file.' };
    if (value.activeMatch) value.activeMatch = { ...value.activeMatch, paused: true, match: neutralizeCourtMatch(value.activeMatch.match) };
    return { status: 'valid', career: value };
  } catch { return { status: 'invalid', reason: 'This career has missing or inconsistent progress. Keep the original file.' }; }
}
