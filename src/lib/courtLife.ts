export type CourtSide = 'home' | 'away';
export type CourtPhase = 'playing' | 'inbound' | 'halftime' | 'finished';
export type CourtBallMode = 'owned' | 'pass' | 'shot' | 'loose' | 'dead';
export interface CourtAttributes { finishing: number; shooting: number; passing: number; defense: number; conditioning: number }
export interface CourtPlayerSpec { id: string; name: string; attrs: CourtAttributes; condition?: number }
export interface CourtTeamSpec { id: string; name: string; color?: string; chemistry?: number; players: CourtPlayerSpec[] }
export interface CourtRole { inboundPriority: number; callPriority: number }
export interface CourtMatchConfig {
  id: string; seed: number; home: CourtTeamSpec; away: CourtTeamSpec;
  controlledPlayerId?: string | null; role?: CourtRole;
}
export interface CourtInput {
  moveX: number; moveY: number; shoot: 'none' | 'press' | 'release';
  pass: boolean; steal: boolean; jump: boolean; sprint: boolean; guard: boolean;
}
export interface CourtStats {
  points: number; attempts: number; made: number; threes: number; assists: number;
  rebounds: number; offensiveRebounds: number; steals: number; blocks: number; turnovers: number;
}
export interface CourtPlayer extends CourtPlayerSpec {
  side: CourtSide; condition: number; x: number; y: number; vx: number; vy: number;
  z: number; vz: number; stamina: number; facingX: number; facingY: number;
  action: 'idle' | 'move' | 'dribble' | 'shoot' | 'pass' | 'steal' | 'jump' | 'guard';
  actionTicks: number; cooldown: number; chargeTicks: number; stride: number; stats: CourtStats;
}
export interface CourtBall {
  mode: CourtBallMode; x: number; y: number; z: number; vx: number; vy: number; vz: number;
  ownerId: string | null; lastTouchId: string | null; flightId: number; scoredFlightId: number;
  shooterId: string | null; shotSide: CourtSide | null; shotValue: 2 | 3;
  intendedReceiverId: string | null; passerId: string | null; releasedTick: number;
  reboundEligible: boolean; rimTouched: boolean; turnoverOwnerId: string | null;
}
export type CourtEventKind = 'inbound' | 'pass' | 'catch' | 'shot' | 'basket' | 'miss' | 'rim'
  | 'block' | 'rebound' | 'steal' | 'turnover' | 'out' | 'halftime' | 'overtime' | 'finish';
export interface CourtEvent {
  id: number; tick: number; kind: CourtEventKind; side: CourtSide | null;
  playerId: string | null; otherPlayerId?: string; points?: number; flightId?: number; text: string;
}
export interface CourtMatch {
  version: 1; id: string; seed: number; rngState: number; tick: number;
  teams: { home: CourtTeamSpec; away: CourtTeamSpec }; players: CourtPlayer[];
  controlledPlayerId: string | null; role: CourtRole; phase: CourtPhase; period: 1 | 2 | 3 | 4;
  remainingTicks: number; shotClockTicks: number; possession: CourtSide; inboundTicks: number;
  score: { home: number; away: number }; ball: CourtBall; nextFlightId: number;
  lastPass: { passerId: string; receiverId: string; tick: number } | null;
  callUntilTick: number; events: CourtEvent[]; message: string;
  result: null | { winner: CourtSide | 'draw'; home: number; away: number };
}
export const COURT_TICK_MS = 1000 / 30;
export const COURT_HZ = 30;
export const COURT_WIDTH = 16;
export const COURT_LENGTH = 24;
export const COURT_HALF_TICKS = 75 * COURT_HZ;
export const COURT_OVERTIME_TICKS = 30 * COURT_HZ;
export const COURT_SHOT_CLOCK_TICKS = 12 * COURT_HZ;
export const COURT_RIM_HEIGHT = 3.05;
export const COURT_RIM_RADIUS = .34;
export const COURT_BALL_RADIUS = .12;
export const COURT_THREE_POINT_DISTANCE = 6.75;
export const neutralCourtInput = (): CourtInput => ({ moveX: 0, moveY: 0, shoot: 'none', pass: false, steal: false, jump: false, sprint: false, guard: false });
export const courtBasket = (side: CourtSide) => ({ x: COURT_WIDTH / 2, y: side === 'home' ? 1.6 : COURT_LENGTH - 1.6 });
export const courtBackboard = (side: CourtSide) => ({ x: COURT_WIDTH / 2, y: courtBasket(side).y + (side === 'home' ? -.5 : .5), halfWidth: .9, minZ: 2.7, maxZ: 4 });

const DT = 1 / COURT_HZ;
const GRAVITY = 9.81;
const BODY_RADIUS = .34;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const opposite = (side: CourtSide): CourtSide => side === 'home' ? 'away' : 'home';
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const direction = (x: number, y: number) => { const length = Math.hypot(x, y); return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 }; };
const blankStats = (): CourtStats => ({ points: 0, attempts: 0, made: 0, threes: 0, assists: 0, rebounds: 0, offensiveRebounds: 0, steals: 0, blocks: 0, turnovers: 0 });
const blankBall = (): CourtBall => ({ mode: 'dead', x: 8, y: 12, z: COURT_BALL_RADIUS, vx: 0, vy: 0, vz: 0, ownerId: null, lastTouchId: null,
  flightId: 0, scoredFlightId: -1, shooterId: null, shotSide: null, shotValue: 2, intendedReceiverId: null, passerId: null,
  releasedTick: 0, reboundEligible: false, rimTouched: false, turnoverOwnerId: null });
function clone(match: CourtMatch): CourtMatch {
  return { ...match, score: { ...match.score }, ball: { ...match.ball }, lastPass: match.lastPass && { ...match.lastPass },
    players: match.players.map(player => ({ ...player, stats: { ...player.stats } })) };
}
function random(match: CourtMatch) {
  let value = match.rngState || 1;
  value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
  match.rngState = value >>> 0;
  return match.rngState / 4294967296;
}
function emit(match: CourtMatch, kind: CourtEventKind, text: string, player: CourtPlayer | null = null, extra: Partial<CourtEvent> = {}) {
  match.message = text;
  match.events = [...match.events, { id: match.events.length + 1, tick: match.tick, kind, side: player?.side ?? null, playerId: player?.id ?? null, text, ...extra }];
}
function playerById(match: CourtMatch, id: string | null) { return match.players.find(player => player.id === id); }
function chemistry(match: CourtMatch, side: CourtSide) { return clamp(match.teams[side].chemistry ?? 50, 0, 100); }
function pose(player: CourtPlayer, action: CourtPlayer['action'], ticks: number) { player.action = action; player.actionTicks = ticks; }
function nearestDefender(match: CourtMatch, player: CourtPlayer) {
  return Math.min(...match.players.filter(other => other.side !== player.side).map(other => distance(player, other)));
}
function segmentNear(a: { x: number; y: number }, b: { x: number; y: number }, target: { x: number; y: number }) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((target.x - a.x) * dx + (target.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return { t, distance: Math.hypot(a.x + dx * t - target.x, a.y + dy * t - target.y) };
}
function openLane(match: CourtMatch, from: CourtPlayer, to: CourtPlayer) {
  return Math.min(...match.players.filter(player => player.side !== from.side).map(player => segmentNear(from, to, player).distance));
}
function giveBall(match: CourtMatch, player: CourtPlayer) {
  const ball = match.ball;
  if (ball.turnoverOwnerId) {
    const loser = playerById(match, ball.turnoverOwnerId);
    if (loser && loser.side !== player.side) {
      const toucher = playerById(match, ball.lastTouchId);
      const stealer = toucher?.side === player.side ? toucher : player;
      loser.stats.turnovers++; stealer.stats.steals++;
      emit(match, 'steal', `${stealer.name} wins possession.`, stealer, { otherPlayerId: loser.id });
      emit(match, 'turnover', `${loser.name} loses possession.`, loser);
    }
  }
  if (ball.reboundEligible) {
    player.stats.rebounds++;
    if (ball.shotSide === player.side) player.stats.offensiveRebounds++;
    emit(match, 'rebound', `${player.name} collects the rebound.`, player, { flightId: ball.flightId });
  } else if (ball.mode === 'pass') {
    emit(match, 'catch', `${player.name} catches the pass.`, player, { otherPlayerId: ball.passerId ?? undefined });
  }
  const passer = playerById(match, ball.passerId);
  match.lastPass = ball.mode === 'pass' && passer?.side === player.side && passer.id !== player.id
    ? { passerId: passer.id, receiverId: player.id, tick: match.tick } : null;
  if (match.possession !== player.side || ball.reboundEligible) match.shotClockTicks = COURT_SHOT_CLOCK_TICKS;
  match.possession = player.side;
  ball.mode = 'owned'; ball.ownerId = player.id; ball.lastTouchId = player.id;
  ball.shooterId = null; ball.shotSide = null; ball.passerId = null; ball.intendedReceiverId = null;
  ball.reboundEligible = false; ball.turnoverOwnerId = null; ball.rimTouched = false;
  ball.vx = 0; ball.vy = 0; ball.vz = 0;
}
function inbound(match: CourtMatch, side: CourtSide) {
  match.phase = 'inbound'; match.possession = side; match.inboundTicks = 18; match.shotClockTicks = COURT_SHOT_CLOCK_TICKS;
  match.lastPass = null; match.callUntilTick = 0;
  const scoredFlightId = match.ball.scoredFlightId;
  match.ball = { ...blankBall(), scoredFlightId };
  for (const team of ['home', 'away'] as const) {
    const attacking = team === side;
    const startY = side === 'home' ? 18 : 6;
    match.players.filter(player => player.side === team).forEach((player, index) => {
      player.x = [8, 3.4, 12.6][index];
      player.y = startY + (side === 'home' ? -1 : 1) * (attacking ? index * 1.4 : 3.2 + index * 1.4);
      player.vx = 0; player.vy = 0; player.z = 0; player.vz = 0; player.chargeTicks = 0;
      player.action = 'idle'; player.actionTicks = 0; player.cooldown = 0;
    });
  }
}
function finishPeriod(match: CourtMatch) {
  if (match.period === 1) {
    match.phase = 'halftime'; match.ball.mode = 'dead'; match.ball.ownerId = null;
    emit(match, 'halftime', 'Halftime. Catch your breath.');
  } else if (match.score.home === match.score.away && match.period < 4) {
    match.period = (match.period + 1) as 3 | 4; match.remainingTicks = COURT_OVERTIME_TICKS;
    inbound(match, match.period === 3 ? 'home' : 'away');
    emit(match, 'overtime', `Overtime ${match.period - 2}. Thirty seconds.`);
  } else {
    match.phase = 'finished'; match.ball.mode = 'dead'; match.ball.ownerId = null;
    const winner = match.score.home === match.score.away ? 'draw' : match.score.home > match.score.away ? 'home' : 'away';
    match.result = { winner, home: match.score.home, away: match.score.away };
    for (const player of match.players) { player.vx = 0; player.vy = 0; player.chargeTicks = 0; player.action = 'idle'; }
    emit(match, 'finish', winner === 'draw' ? 'Still level after two overtimes. Draw.' : `${match.teams[winner].name} win ${match.score[winner]} to ${match.score[opposite(winner)]}.`);
  }
}

export function createCourtMatch(config: CourtMatchConfig): CourtMatch {
  const specs = [...config.home.players, ...config.away.players];
  if (config.home.players.length !== 3 || config.away.players.length !== 3 || new Set(specs.map(player => player.id)).size !== 6)
    throw new Error('A court match needs six distinct players, three per crew.');
  if (config.controlledPlayerId && !specs.some(player => player.id === config.controlledPlayerId)) throw new Error('Controlled player must belong to a crew.');
  const teams = Object.fromEntries((['home', 'away'] as const).map(side => [side, { ...config[side], players: config[side].players.map(player => ({ ...player, attrs: { ...player.attrs } })) }])) as CourtMatch['teams'];
  const players = (['home', 'away'] as const).flatMap(side => teams[side].players.map(spec => ({ ...spec, attrs: { ...spec.attrs }, side,
    condition: clamp(spec.condition ?? 100, 0, 100), x: 8, y: 12, vx: 0, vy: 0, z: 0, vz: 0,
    stamina: 55 + clamp(spec.condition ?? 100, 0, 100) * .45, facingX: 0, facingY: side === 'home' ? -1 : 1,
    action: 'idle' as const, actionTicks: 0, cooldown: 0, chargeTicks: 0, stride: 0, stats: blankStats() })));
  const match: CourtMatch = { version: 1, id: config.id, seed: config.seed >>> 0, rngState: config.seed >>> 0 || 1, tick: 0, teams, players,
    controlledPlayerId: config.controlledPlayerId ?? null,
    role: { inboundPriority: clamp(config.role?.inboundPriority ?? .25, 0, 1), callPriority: clamp(config.role?.callPriority ?? .25, 0, 1) },
    phase: 'inbound', period: 1, remainingTicks: COURT_HALF_TICKS, shotClockTicks: COURT_SHOT_CLOCK_TICKS,
    possession: 'home', inboundTicks: 18, score: { home: 0, away: 0 }, ball: blankBall(), nextFlightId: 1,
    lastPass: null, callUntilTick: 0, events: [], message: 'Find space. Move the ball.', result: null };
  inbound(match, 'home');
  return match;
}

export function courtPassTarget(match: CourtMatch, playerId: string): string | null {
  const player = playerById(match, playerId);
  if (!player) return null;
  const teammates = match.players.filter(other => other.side === player.side && other.id !== player.id);
  return teammates.sort((a, b) => {
    const value = (other: CourtPlayer) => {
      const vector = direction(other.x - player.x, other.y - player.y);
      return (vector.x * player.facingX + vector.y * player.facingY) * 2 + Math.min(3, openLane(match, player, other));
    };
    return value(b) - value(a) || a.id.localeCompare(b.id);
  })[0]?.id ?? null;
}
export function courtShotMeter(match: CourtMatch, playerId: string): { charge: number; ideal: number; window: number } {
  const player = playerById(match, playerId);
  return { charge: clamp((player?.chargeTicks ?? 0) / 30, 0, 1), ideal: 13 / 30, window: (1.3 + (player?.attrs.shooting ?? 50) * .025) / 30 };
}

function passBall(match: CourtMatch, player: CourtPlayer, receiver: CourtPlayer) {
  const ball = match.ball, length = distance(player, receiver), time = clamp(length / 12, .22, .85);
  const error = (100 - player.attrs.passing) * .005 * (1.1 - chemistry(match, player.side) * .004);
  ball.mode = 'pass'; ball.ownerId = null; ball.lastTouchId = player.id; ball.passerId = player.id;
  ball.intendedReceiverId = receiver.id; ball.turnoverOwnerId = player.id; ball.shooterId = null; ball.shotSide = null;
  ball.x = player.x; ball.y = player.y; ball.z = 1.35 + player.z;
  ball.vx = (receiver.x + receiver.vx * time * .65 + (random(match) * 2 - 1) * error - ball.x) / time;
  ball.vy = (receiver.y + receiver.vy * time * .65 + (random(match) * 2 - 1) * error - ball.y) / time;
  ball.vz = .5 * GRAVITY * time; ball.releasedTick = match.tick; ball.flightId = match.nextFlightId++;
  player.cooldown = 8; player.chargeTicks = 0; pose(player, 'pass', 9);
  emit(match, 'pass', `${player.name} passes to ${receiver.name}.`, player, { otherPlayerId: receiver.id, flightId: ball.flightId });
}
function shootBall(match: CourtMatch, player: CourtPlayer) {
  const basket = courtBasket(player.side), length = distance(player, basket), ball = match.ball;
  const rating = length < 3 ? player.attrs.finishing : player.attrs.shooting;
  const timingError = Math.max(0, Math.abs(player.chargeTicks - 13) - (1.3 + rating * .025));
  const dispersion = .035 + (100 - rating) * .0035 + Math.max(0, length - 3) * .025
    + timingError * .032 + Math.hypot(player.vx, player.vy) * .012 + (100 - player.stamina) * .001;
  const time = clamp(.8 + length * .035, .82, 1.6);
  const targetX = basket.x + (random(match) * 2 - 1) * dispersion;
  const targetY = basket.y + (random(match) * 2 - 1) * dispersion;
  ball.mode = 'shot'; ball.ownerId = null; ball.lastTouchId = player.id; ball.shooterId = player.id; ball.shotSide = player.side;
  ball.shotValue = length >= COURT_THREE_POINT_DISTANCE ? 3 : 2; ball.flightId = match.nextFlightId++; ball.releasedTick = match.tick;
  ball.x = player.x; ball.y = player.y; ball.z = 1.9 + player.z;
  ball.vx = (targetX - ball.x) / time; ball.vy = (targetY - ball.y) / time;
  ball.vz = (COURT_RIM_HEIGHT - ball.z + .5 * GRAVITY * time * time) / time;
  ball.reboundEligible = true; ball.rimTouched = false; ball.turnoverOwnerId = null; ball.passerId = null; ball.intendedReceiverId = null;
  player.stats.attempts++; player.stamina = Math.max(0, player.stamina - 2); player.chargeTicks = 0; player.cooldown = 13; pose(player, 'shoot', 12);
  emit(match, 'shot', `${player.name} releases for ${ball.shotValue}.`, player, { flightId: ball.flightId, points: ball.shotValue });
}
function aiInput(match: CourtMatch, player: CourtPlayer): CourtInput {
  const input = neutralCourtInput(), ball = match.ball, owner = playerById(match, ball.ownerId), basket = courtBasket(player.side);
  let target = { x: player.x, y: player.y };
  if (ball.mode === 'loose' || ball.mode === 'shot' || ball.mode === 'pass') {
    const intended = ball.mode === 'pass' ? playerById(match, ball.intendedReceiverId) : null;
    const chaser = intended?.side === player.side ? intended : [...match.players.filter(other => other.side === player.side)].sort((a, b) => distance(a, ball) - distance(b, ball))[0];
    target = chaser.id === player.id ? { x: ball.x + ball.vx * .12, y: ball.y + ball.vy * .12 }
      : { x: clamp(ball.x + (player.id < chaser.id ? -2 : 2), 2, 14), y: ball.y + (player.side === 'home' ? 1.2 : -1.2) };
    input.jump = ball.z > 1.8 && ball.z < 3.7 && distance(player, ball) < 1.3 && player.cooldown === 0;
    input.guard = ball.mode === 'shot' && ball.shotSide !== player.side;
  } else if (owner?.id === player.id) {
    const length = distance(player, basket), open = nearestDefender(match, player);
    const teammates = match.players.filter(other => other.side === player.side && other.id !== player.id);
    const caller = teammates.find(other => other.id === match.controlledPlayerId && match.callUntilTick >= match.tick && openLane(match, player, other) > .7);
    const best = [...teammates].sort((a, b) => (nearestDefender(match, b) - distance(b, basket) * .25) - (nearestDefender(match, a) - distance(a, basket) * .25))[0];
    if (player.chargeTicks > 0) input.shoot = player.chargeTicks >= 13 ? 'release' : 'none';
    else if (player.cooldown === 0 && caller && match.tick % Math.max(3, Math.round(16 - match.role.callPriority * 13)) === 0) {
      player.facingX = direction(caller.x - player.x, caller.y - player.y).x;
      player.facingY = direction(caller.x - player.x, caller.y - player.y).y; input.pass = true;
    } else if (player.cooldown === 0 && best && openLane(match, player, best) > 1 && distance(player, best) > 2
      && nearestDefender(match, best) - distance(best, basket) * .25 > open - length * .25 + .9) {
      const vector = direction(best.x - player.x, best.y - player.y); player.facingX = vector.x; player.facingY = vector.y; input.pass = true;
    } else if (player.cooldown === 0 && ((length < 5.8 && open > 1.1) || length < 2.7 || match.shotClockTicks < 80)) input.shoot = 'press';
    else {
      target = { x: basket.x, y: basket.y + (player.side === 'home' ? 1.4 : -1.4) };
      for (const defender of match.players.filter(other => other.side !== player.side && distance(other, player) < 2)) target.x += player.x >= defender.x ? 2.3 : -2.3;
      input.sprint = length > 6 && player.stamina > 25;
    }
  } else if (owner?.side === player.side) {
    const index = match.players.filter(other => other.side === player.side).findIndex(other => other.id === player.id);
    const cutting = (Math.floor(match.tick / 105) + index) % 3 === 0 && distance(owner, basket) < 8;
    target = { x: basket.x + (index === 1 ? -1 : 1) * (cutting ? 1.7 : 4.5), y: basket.y + (player.side === 'home' ? 1 : -1) * (cutting ? 3 : 7.2) };
  } else {
    const defenders = match.players.filter(other => other.side === player.side), attackers = match.players.filter(other => other.side !== player.side);
    const index = defenders.findIndex(other => other.id === player.id);
    const nearest = owner ? [...defenders].sort((a, b) => distance(a, owner) - distance(b, owner))[0] : null;
    const mark = nearest?.id === player.id ? owner : attackers[index];
    if (mark) {
      const rim = courtBasket(mark.side), offset = direction(rim.x - mark.x, rim.y - mark.y);
      target = { x: mark.x + offset.x * .95, y: mark.y + offset.y * .95 };
      input.guard = distance(player, mark) < 2.5;
      input.steal = owner?.id === mark.id && distance(player, mark) < 1 && player.cooldown === 0 && match.tick % 17 === index * 3;
      input.jump = mark.chargeTicks >= 9 && distance(player, mark) < 1.8 && player.cooldown === 0;
    }
  }
  const vector = direction(target.x - player.x, target.y - player.y);
  if (distance(target, player) > .16 && player.chargeTicks === 0) { input.moveX = vector.x; input.moveY = vector.y; }
  return input;
}
function movePlayer(match: CourtMatch, player: CourtPlayer, input: CourtInput) {
  player.cooldown = Math.max(0, player.cooldown - 1); player.actionTicks = Math.max(0, player.actionTicks - 1);
  const vector = direction(clamp(input.moveX, -1, 1), clamp(input.moveY, -1, 1));
  const effort = Math.min(1, Math.hypot(input.moveX, input.moveY));
  const sprint = input.sprint && player.stamina > 8 && !input.guard;
  const speed = (3.25 + player.attrs.conditioning * .009) * (sprint ? 1.4 : input.guard ? .74 : 1) * (.76 + player.stamina * .0024) * (player.chargeTicks > 0 ? .18 : 1);
  player.vx += (vector.x * speed * effort - player.vx) * .34;
  player.vy += (vector.y * speed * effort - player.vy) * .34;
  const oldX = player.x, oldY = player.y;
  player.x = clamp(player.x + player.vx * DT, BODY_RADIUS, COURT_WIDTH - BODY_RADIUS);
  player.y = clamp(player.y + player.vy * DT, BODY_RADIUS, COURT_LENGTH - BODY_RADIUS);
  player.stride += Math.hypot(player.x - oldX, player.y - oldY);
  if (effort > .1) { player.facingX = vector.x; player.facingY = vector.y; }
  const maxStamina = 55 + player.condition * .45;
  player.stamina = clamp(player.stamina + (sprint && effort > .1 ? -9 : (2.2 + player.attrs.conditioning * .035) * (.45 + player.condition * .0055)) * DT, 0, maxStamina);
  if (player.z > 0 || player.vz > 0) { player.z = Math.max(0, player.z + player.vz * DT - .5 * GRAVITY * DT * DT); player.vz -= GRAVITY * DT; if (player.z === 0) player.vz = 0; }
  if (input.jump && player.z === 0 && player.cooldown === 0 && player.stamina >= 5) {
    player.vz = 4.1; player.stamina -= 5; player.cooldown = 25; pose(player, 'jump', 23);
  }
  if (player.actionTicks === 0) player.action = input.guard ? 'guard' : effort > .1 ? match.ball.ownerId === player.id ? 'dribble' : 'move' : 'idle';
}
function actions(match: CourtMatch, player: CourtPlayer, input: CourtInput) {
  const ball = match.ball;
  if (ball.ownerId === player.id) {
    if (input.pass && player.cooldown === 0) {
      const receiver = playerById(match, courtPassTarget(match, player.id));
      if (receiver) passBall(match, player, receiver);
    } else if (input.shoot === 'press' && player.cooldown === 0 && player.chargeTicks === 0) {
      player.chargeTicks = 1; pose(player, 'shoot', 2);
    } else if (player.chargeTicks > 0) {
      if (input.shoot === 'release') shootBall(match, player);
      else { player.chargeTicks = Math.min(60, player.chargeTicks + 1); pose(player, 'shoot', 2); }
    }
  } else {
    player.chargeTicks = 0;
    if (input.pass && player.id === match.controlledPlayerId && match.possession === player.side) match.callUntilTick = match.tick + 60;
    const owner = playerById(match, ball.ownerId);
    if (input.steal && player.cooldown === 0 && owner && owner.side !== player.side && distance(player, owner) < 1.2 && player.stamina >= 3) {
      player.cooldown = 24; player.stamina -= 3; pose(player, 'steal', 10);
      const chance = clamp(.12 + player.attrs.defense * .003 - owner.attrs.passing * .001 + (owner.stamina < 20 ? .15 : 0), .1, .5);
      if (random(match) < chance) {
        const vector = direction(player.x - owner.x, player.y - owner.y);
        ball.mode = 'loose'; ball.ownerId = null; ball.turnoverOwnerId = owner.id; ball.lastTouchId = player.id;
        ball.vx = vector.x * 2.2; ball.vy = vector.y * 2.2; ball.vz = 1; ball.releasedTick = match.tick;
        owner.chargeTicks = 0; match.lastPass = null;
      }
    }
  }
}
function miss(match: CourtMatch) {
  if (match.ball.mode !== 'shot') return;
  const shooter = playerById(match, match.ball.shooterId);
  match.ball.mode = 'loose';
  emit(match, 'miss', `${shooter?.name ?? 'The shooter'} misses. Rebound is live.`, shooter ?? null, { flightId: match.ball.flightId });
}
function stepBall(match: CourtMatch) {
  const ball = match.ball, owner = playerById(match, ball.ownerId);
  if (ball.mode === 'owned' && owner) {
    ball.x = owner.x + owner.facingX * .28; ball.y = owner.y + owner.facingY * .28;
    ball.z = owner.chargeTicks > 0 ? 1.7 + owner.z : .2 + Math.abs(Math.sin(match.tick * .42)) * .85 + owner.z;
    return;
  }
  if (ball.mode === 'dead') return;
  const previous = { x: ball.x, y: ball.y, z: ball.z };
  ball.x += ball.vx * DT; ball.y += ball.vy * DT; ball.z += ball.vz * DT - .5 * GRAVITY * DT * DT; ball.vz -= GRAVITY * DT;
  if (ball.mode === 'shot') {
    for (const defender of match.players.filter(player => player.side !== ball.shotSide)) {
      const contact = segmentNear(previous, ball, defender);
      const height = previous.z + (ball.z - previous.z) * contact.t;
      const reach = .42 + defender.attrs.defense * .003 + (defender.action === 'guard' ? .12 : 0);
      if (contact.distance < reach && height > 1.35 && height < 2.02 + defender.z && match.tick > ball.releasedTick + 1) {
        defender.stats.blocks++; ball.lastTouchId = defender.id;
        ball.x = previous.x + (ball.x - previous.x) * contact.t; ball.y = previous.y + (ball.y - previous.y) * contact.t; ball.z = height;
        ball.vx = (ball.x - defender.x) * 3; ball.vy = (ball.y - defender.y) * 3; ball.vz = 1.8;
        emit(match, 'block', `${defender.name} blocks the shot.`, defender, { otherPlayerId: ball.shooterId ?? undefined, flightId: ball.flightId });
        miss(match); break;
      }
    }
  }
  if (ball.mode === 'shot' && ball.shotSide) {
    const basket = courtBasket(ball.shotSide);
    if (previous.z > COURT_RIM_HEIGHT && ball.z <= COURT_RIM_HEIGHT && ball.vz < 0) {
      const fraction = (previous.z - COURT_RIM_HEIGHT) / (previous.z - ball.z);
      const crossing = { x: previous.x + (ball.x - previous.x) * fraction, y: previous.y + (ball.y - previous.y) * fraction };
      const separation = distance(crossing, basket);
      if (separation < COURT_RIM_RADIUS - COURT_BALL_RADIUS && ball.scoredFlightId !== ball.flightId) {
        const shooter = playerById(match, ball.shooterId)!;
        ball.scoredFlightId = ball.flightId;
        match.score[shooter.side] += ball.shotValue; shooter.stats.points += ball.shotValue; shooter.stats.made++;
        if (ball.shotValue === 3) shooter.stats.threes++;
        const assist = match.lastPass && match.lastPass.receiverId === shooter.id && match.tick - match.lastPass.tick <= 180
          ? playerById(match, match.lastPass.passerId) : null;
        if (assist) assist.stats.assists++;
        emit(match, 'basket', `${shooter.name} scores ${ball.shotValue}.`, shooter, { points: ball.shotValue, flightId: ball.flightId, otherPlayerId: assist?.id });
        inbound(match, opposite(shooter.side));
        if (match.remainingTicks === 0) finishPeriod(match);
        return;
      }
      if (separation < COURT_RIM_RADIUS + COURT_BALL_RADIUS) {
        const normal = direction(crossing.x - basket.x, crossing.y - basket.y);
        ball.x = crossing.x; ball.y = crossing.y; ball.z = COURT_RIM_HEIGHT + .03;
        ball.vx = normal.x * 2.6; ball.vy = normal.y * 2.6; ball.vz = 2.3; ball.rimTouched = true;
        match.shotClockTicks = COURT_SHOT_CLOCK_TICKS;
        emit(match, 'rim', 'Off the rim. Find the rebound.', playerById(match, ball.shooterId) ?? null, { flightId: ball.flightId });
        // A rim bounce can still fall through. Resolve the shot only on a
        // catch, block, floor contact or later downward hoop crossing.
      }
    }
    const board = courtBackboard(ball.shotSide), boardY = board.y;
    if ((previous.y - boardY) * (ball.y - boardY) <= 0 && previous.y !== ball.y) {
      const t = (boardY - previous.y) / (ball.y - previous.y);
      const x = previous.x + (ball.x - previous.x) * t, z = previous.z + (ball.z - previous.z) * t;
      if (Math.abs(x - board.x) <= board.halfWidth && z >= board.minZ && z <= board.maxZ) { ball.y = boardY + Math.sign(previous.y - boardY) * .02; ball.vy *= -.65; }
    }
  }
  if (ball.x < 0 || ball.x > COURT_WIDTH || ball.y < 0 || ball.y > COURT_LENGTH) {
    const toucher = playerById(match, ball.lastTouchId);
    if (toucher && toucher.side === match.possession && !ball.shotSide) { toucher.stats.turnovers++; emit(match, 'turnover', `${toucher.name} sends it out.`, toucher); }
    emit(match, 'out', 'Out of bounds. Inbound from the baseline.', toucher ?? null);
    inbound(match, toucher ? opposite(toucher.side) : opposite(match.possession));
    if (match.remainingTicks === 0) finishPeriod(match);
    return;
  }
  if (ball.z <= COURT_BALL_RADIUS) {
    ball.z = COURT_BALL_RADIUS; ball.vz = Math.abs(ball.vz) > 1 ? Math.abs(ball.vz) * .45 : 0;
    ball.vx *= .8; ball.vy *= .8; miss(match);
    if (ball.mode === 'pass') ball.mode = 'loose';
  }
  if ((ball.mode === 'pass' || ball.mode === 'loose' || (ball.mode === 'shot' && ball.rimTouched)) && match.tick > ball.releasedTick + 3) {
    const catches = match.players.map(player => ({ player, contact: segmentNear(previous, ball, player) }))
      .filter(({ player, contact }) => {
        const height = previous.z + (ball.z - previous.z) * contact.t;
        return contact.distance < .56 + player.attrs.passing * .0015 + chemistry(match, player.side) * .001
          && height <= 1.8 + player.z && height >= 0 && (player.id !== ball.passerId || match.tick - ball.releasedTick > 15);
      }).sort((a, b) => a.contact.t - b.contact.t || a.contact.distance - b.contact.distance || a.player.id.localeCompare(b.player.id));
    if (catches.length) { miss(match); giveBall(match, catches[0].player); }
  }
}

export function stepCourtMatch(match: CourtMatch, input: CourtInput = neutralCourtInput()): CourtMatch {
  if (match.phase === 'finished' || match.phase === 'halftime') return match;
  const next = clone(match); next.tick++;
  if (next.phase === 'inbound') {
    next.inboundTicks--;
    if (next.inboundTicks <= 0) {
      const crew = next.players.filter(player => player.side === next.possession);
      const human = crew.find(player => player.id === next.controlledPlayerId);
      const receiver = human && random(next) < next.role.inboundPriority ? human : crew[Math.floor(random(next) * crew.length)];
      giveBall(next, receiver); next.phase = 'playing';
      emit(next, 'inbound', `${receiver.name} brings it in.`, receiver);
      stepBall(next);
    }
    return next;
  }
  next.remainingTicks = Math.max(0, next.remainingTicks - 1);
  next.shotClockTicks = Math.max(0, next.shotClockTicks - 1);
  const inputs = next.players.map(player => player.id === next.controlledPlayerId ? input : aiInput(next, player));
  next.players.forEach((player, index) => movePlayer(next, player, inputs[index]));
  for (let a = 0; a < next.players.length; a++) for (let b = a + 1; b < next.players.length; b++) {
    const one = next.players[a], two = next.players[b], separation = distance(one, two);
    if (separation < BODY_RADIUS * 2) {
      const vector = separation === 0 ? { x: a % 2 ? 1 : -1, y: 0 } : direction(one.x - two.x, one.y - two.y);
      const push = (BODY_RADIUS * 2 - separation) / 2;
      one.x = clamp(one.x + vector.x * push, BODY_RADIUS, COURT_WIDTH - BODY_RADIUS); one.y = clamp(one.y + vector.y * push, BODY_RADIUS, COURT_LENGTH - BODY_RADIUS);
      two.x = clamp(two.x - vector.x * push, BODY_RADIUS, COURT_WIDTH - BODY_RADIUS); two.y = clamp(two.y - vector.y * push, BODY_RADIUS, COURT_LENGTH - BODY_RADIUS);
    }
  }
  next.players.forEach((player, index) => actions(next, player, inputs[index]));
  stepBall(next);
  if (next.phase === 'playing' && next.remainingTicks === 0 && next.ball.mode !== 'shot') finishPeriod(next);
  else if (next.phase === 'playing' && next.shotClockTicks === 0 && next.ball.mode !== 'shot') {
    const owner = playerById(next, next.ball.ownerId ?? next.ball.turnoverOwnerId);
    if (owner) owner.stats.turnovers++;
    emit(next, 'turnover', 'Twelve seconds. Possession changes.', owner ?? null);
    inbound(next, opposite(next.possession));
  }
  return next;
}
export function continueCourtPeriod(match: CourtMatch): CourtMatch {
  if (match.phase !== 'halftime') return match;
  const next = clone(match); next.period = 2; next.remainingTicks = COURT_HALF_TICKS;
  for (const player of next.players) player.stamina = Math.min(55 + player.condition * .45, player.stamina + 25);
  inbound(next, 'away'); return next;
}
export function neutralizeCourtMatch(match: CourtMatch): CourtMatch {
  const next = clone(match), player = playerById(next, next.controlledPlayerId);
  if (player) { player.chargeTicks = 0; if (player.action === 'shoot') { player.action = 'idle'; player.actionTicks = 0; } }
  return next;
}
export function simulateCourtMatch(config: CourtMatchConfig): CourtMatch {
  let match = createCourtMatch({ ...config, controlledPlayerId: null });
  for (let tick = 0; tick < 30000 && match.phase !== 'finished'; tick++) match = match.phase === 'halftime' ? continueCourtPeriod(match) : stepCourtMatch(match);
  if (match.phase !== 'finished') throw new Error('Court match exceeded its finite clock budget.');
  return match;
}
