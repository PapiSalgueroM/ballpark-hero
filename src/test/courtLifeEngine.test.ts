import { describe, expect, it } from 'vitest';
import {
  COURT_HALF_TICKS, COURT_RIM_HEIGHT, COURT_SHOT_CLOCK_TICKS, continueCourtPeriod, courtBasket,
  createCourtMatch, neutralCourtInput, neutralizeCourtMatch, simulateCourtMatch, stepCourtMatch,
  type CourtInput, type CourtMatch, type CourtMatchConfig, type CourtPlayerSpec,
} from '@/lib/courtLife';

const spec = (id: string): CourtPlayerSpec => ({ id, name: id, condition: 100,
  attrs: { finishing: 99, shooting: 99, passing: 80, defense: 65, conditioning: 65 } });
const config = (seed = 71): CourtMatchConfig => ({ id: `fixture-${seed}`, seed,
  home: { id: 'home', name: 'Harbor', chemistry: 70, players: ['h0', 'h1', 'h2'].map(spec) },
  away: { id: 'away', name: 'Foundry', chemistry: 50, players: ['a0', 'a1', 'a2'].map(spec) },
  controlledPlayerId: 'h0', role: { inboundPriority: 1, callPriority: 1 } });
const input = (changes: Partial<CourtInput> = {}): CourtInput => ({ ...neutralCourtInput(), ...changes });
function advance(match: CourtMatch, ticks: number, command = input()) {
  for (let tick = 0; tick < ticks; tick++) match = stepCourtMatch(match, command);
  return match;
}
function court(seed = 71) {
  const match = advance(createCourtMatch(config(seed)), 18);
  expect(match.ball.ownerId).toBe('h0');
  match.players.forEach((player, index) => { player.x = 2 + index * 2; player.y = 18; player.vx = 0; player.vy = 0; });
  const human = match.players[0]; human.x = 8; human.y = 6; human.facingX = 0; human.facingY = -1;
  match.ball.x = human.x; match.ball.y = human.y; match.ball.z = 1;
  return match;
}
function shot(match: CourtMatch) {
  match = stepCourtMatch(match, input({ shoot: 'press' }));
  match = advance(match, 12);
  return stepCourtMatch(match, input({ shoot: 'release' }));
}
function settle(match: CourtMatch) {
  for (let tick = 0; tick < 150 && match.ball.mode === 'shot'; tick++) match = stepCourtMatch(match);
  expect(match.ball.mode).not.toBe('shot'); return match;
}
function reconcile(match: CourtMatch) {
  for (const side of ['home', 'away'] as const) {
    expect(match.score[side]).toBe(match.players.filter(player => player.side === side).reduce((sum, player) => sum + player.stats.points, 0));
    expect(match.score[side]).toBe(match.events.filter(event => event.kind === 'basket' && event.side === side).reduce((sum, event) => sum + (event.points ?? 0), 0));
  }
  const baskets = match.events.filter(event => event.kind === 'basket');
  expect(new Set(baskets.map(event => event.flightId)).size).toBe(baskets.length);
  expect(match.ball.mode === 'owned').toBe(match.ball.ownerId !== null);
  for (const player of match.players) {
    expect(player.stats.made).toBeLessThanOrEqual(player.stats.attempts);
    expect(player.stats.points).toBe(player.stats.made * 2 + player.stats.threes);
    expect(player.stats.assists).toBe(match.events.filter(event => event.kind === 'basket' && event.otherPlayerId === player.id).length);
    expect([player.x, player.y, player.z, player.vx, player.vy, player.stamina, player.stride].every(Number.isFinite)).toBe(true);
    expect(player.x).toBeGreaterThanOrEqual(0); expect(player.x).toBeLessThanOrEqual(16);
    expect(player.y).toBeGreaterThanOrEqual(0); expect(player.y).toBeLessThanOrEqual(24);
  }
}

describe('Court Life actual physical engine', () => {
  it('replays neutralized saved movement with identical RNG and immutable inputs', () => {
    const original = createCourtMatch(config()), bytes = JSON.stringify(original);
    let moving = advance(original, 30, input({ moveX: .7, moveY: -.4, sprint: true }));
    expect(JSON.stringify(original)).toBe(bytes);
    expect(moving.players[0].stride).toBeGreaterThan(1);
    moving = stepCourtMatch(moving, input({ shoot: 'press' }));
    expect(moving.players[0].chargeTicks).toBe(1);
    const saved = JSON.parse(JSON.stringify(moving)) as CourtMatch;
    let one = neutralizeCourtMatch(moving), two = neutralizeCourtMatch(saved);
    expect(one.players[0].chargeTicks).toBe(0);
    expect(one.rngState).toBe(moving.rngState); expect(one.ball).toEqual(moving.ball);
    for (let tick = 0; tick < 90; tick++) { const command = input({ moveX: tick < 40 ? -1 : 0 }); one = stepCourtMatch(one, command); two = stepCourtMatch(two, command); }
    expect(one).toEqual(two); reconcile(one);
  });

  it('scores only actual downward hoop crossings once per released flight', () => {
    let match = shot(court());
    expect(match.ball.mode).toBe('shot'); expect(match.score.home).toBe(0);
    expect(match.players[0].stats.attempts).toBe(1);
    const flight = match.ball.flightId;
    match = settle(match);
    expect(match.score.home).toBe(2); expect(match.players[0].stats.made).toBe(1);
    expect(match.events.filter(event => event.kind === 'basket')).toHaveLength(1);
    reconcile(match);
    const basket = courtBasket('home');
    match.phase = 'playing'; match.ball = { ...match.ball, mode: 'shot', ownerId: null, x: basket.x, y: basket.y,
      z: COURT_RIM_HEIGHT + .01, vx: 0, vy: 0, vz: -2, shooterId: 'h0', shotSide: 'home', shotValue: 2, flightId: flight, scoredFlightId: flight };
    match = stepCourtMatch(match);
    expect(match.score.home).toBe(2); expect(match.events.filter(event => event.kind === 'basket')).toHaveLength(1);
  });

  it('keeps rising shots and passes through the hoop plane scoreless', () => {
    for (const mode of ['shot', 'pass'] as const) {
      let match = court(); const basket = courtBasket('home');
      match.ball = { ...match.ball, mode, ownerId: null, x: basket.x, y: basket.y, z: COURT_RIM_HEIGHT - .01,
        vx: 0, vy: 0, vz: 2, flightId: 8, shooterId: 'h0', shotSide: 'home', releasedTick: match.tick };
      match = stepCourtMatch(match); expect(match.ball.z).toBeGreaterThan(COURT_RIM_HEIGHT); expect(match.score.home).toBe(0);
    }
  });

  it('blocks the physical flight at a reachable defending hand', () => {
    let match = court(); const defender = match.players[3];
    defender.x = 8; defender.y = 5; defender.z = 1.3; defender.vz = 3; defender.cooldown = 80;
    match.players[0].chargeTicks = 13;
    match = stepCourtMatch(match, input({ shoot: 'release' }));
    match = settle(match);
    expect(match.events.filter(event => event.kind === 'block')).toHaveLength(1);
    expect(match.players[3].stats.blocks).toBe(1); expect(match.score.home).toBe(0);
    expect(match.ball.lastTouchId).toBe('a0'); reconcile(match);
  });

  it('resolves an intercepted moving pass as one steal and one turnover', () => {
    let match = court();
    match.players[0].x = 4; match.players[0].y = 12; match.players[0].facingX = 1; match.players[0].facingY = 0;
    match.players[1].x = 12; match.players[1].y = 12;
    match.players[2].x = 2; match.players[2].y = 18;
    match.players[3].x = 7; match.players[3].y = 12;
    match = stepCourtMatch(match, input({ pass: true }));
    expect(match.ball.mode).toBe('pass'); expect(match.ball.ownerId).toBeNull();
    expect(match.players[0].stats.turnovers).toBe(0);
    for (let tick = 0; tick < 70 && match.possession === 'home'; tick++) match = stepCourtMatch(match);
    expect(match.possession).toBe('away'); expect(match.players[0].stats.turnovers).toBe(1);
    expect(match.players.filter(player => player.side === 'away').reduce((sum, player) => sum + player.stats.steals, 0)).toBe(1);
    expect(match.events.filter(event => event.kind === 'steal')).toHaveLength(1); reconcile(match);
  });

  it('turns a missed physical shot into a collected live rebound', () => {
    let match = court(); const basket = courtBasket('home');
    match.players[3].x = basket.x + .5; match.players[3].y = basket.y;
    match.ball = { ...match.ball, mode: 'shot', ownerId: null, x: basket.x + .4, y: basket.y,
      z: COURT_RIM_HEIGHT + .03, vx: 0, vy: 0, vz: -2, shooterId: 'h0', shotSide: 'home', flightId: 1,
      reboundEligible: true, releasedTick: match.tick - 8 };
    match.players[0].stats.attempts = 1;
    match = stepCourtMatch(match);
    expect(match.events.filter(event => event.kind === 'rim')).toHaveLength(1); expect(match.score.home).toBe(0);
    for (let tick = 0; tick < 100 && !match.events.some(event => event.kind === 'rebound'); tick++) match = stepCourtMatch(match);
    expect(match.events.filter(event => event.kind === 'rebound')).toHaveLength(1);
    expect(match.players.reduce((sum, player) => sum + player.stats.rebounds, 0)).toBe(1); reconcile(match);
  });

  it('credits an assist only after the received pass becomes an actual basket', () => {
    let match = court(); match.players[0].y = 7.5;
    match.players[1].x = 8; match.players[1].y = 5.5;
    match = stepCourtMatch(match, input({ pass: true }));
    expect(match.ball.mode).toBe('pass'); expect(match.players[0].stats.assists).toBe(0);
    for (let tick = 0; tick < 150 && !match.events.some(event => event.kind === 'basket'); tick++) match = stepCourtMatch(match);
    expect(match.events.some(event => event.kind === 'catch' && event.playerId === 'h1')).toBe(true);
    expect(match.events.some(event => event.kind === 'basket' && event.playerId === 'h1' && event.otherPlayerId === 'h0')).toBe(true);
    expect(match.players[0].stats.assists).toBe(1); expect(match.players[1].stats.made).toBe(1); reconcile(match);
  });

  it('changes possession for the clock and actual out of bounds', () => {
    let match = court(); match.shotClockTicks = 1;
    match = stepCourtMatch(match); expect(match.phase).toBe('inbound'); expect(match.possession).toBe('away');
    expect(match.players[0].stats.turnovers).toBe(1);
    match = court(); match.ball = { ...match.ball, mode: 'pass', ownerId: null, x: 15.99, y: 12, z: 1,
      vx: 10, vy: 0, vz: 0, lastTouchId: 'h0', passerId: 'h0', turnoverOwnerId: 'h0' };
    match = stepCourtMatch(match); expect(match.events.filter(event => event.kind === 'out')).toHaveLength(1);
    expect(match.phase).toBe('inbound'); expect(match.possession).toBe('away'); expect(match.players[0].stats.turnovers).toBe(1);
    match = advance(match, 18); expect(match.ball.ownerId).not.toBeNull(); expect(match.shotClockTicks).toBe(COURT_SHOT_CLOCK_TICKS);
  });

  it('ends two halves and at most two overtimes with an explicit tied draw', () => {
    let match = court(); match.remainingTicks = 1;
    match = stepCourtMatch(match); expect(match.phase).toBe('halftime');
    const held = stepCourtMatch(match, input({ shoot: 'press' })); expect(held).toBe(match);
    match = continueCourtPeriod(match); expect(match.period).toBe(2); expect(match.remainingTicks).toBe(COURT_HALF_TICKS);
    for (const period of [2, 3, 4]) {
      match = advance(match, 18); match.remainingTicks = 1;
      match = stepCourtMatch(match);
      if (period < 4) { expect(match.period).toBe(period + 1); expect(match.phase).toBe('inbound'); }
    }
    expect(match.phase).toBe('finished'); expect(match.result).toEqual({ winner: 'draw', home: 0, away: 0 });
    expect(stepCourtMatch(match)).toBe(match);
  });

  it('keeps a released buzzer shot live until its physical outcome', () => {
    let match = court(); match.period = 2; match.remainingTicks = 2; match.players[0].chargeTicks = 13;
    match = stepCourtMatch(match, input({ shoot: 'release' }));
    match = stepCourtMatch(match); expect(match.remainingTicks).toBe(0); expect(match.phase).toBe('playing');
    match = settle(match); expect(match.phase).toBe('finished'); expect(match.result?.winner).toBe('home'); expect(match.score.home).toBe(2);
  });

  it('makes condition change actual stamina and movement while keeping a playable floor', () => {
    const freshConfig = config(), tiredConfig = config(); tiredConfig.home.players[0].condition = 0;
    let fresh = advance(createCourtMatch(freshConfig), 18), tired = advance(createCourtMatch(tiredConfig), 18);
    const start = tired.players[0].y;
    fresh = advance(fresh, 60, input({ moveY: -1, sprint: true })); tired = advance(tired, 60, input({ moveY: -1, sprint: true }));
    expect(fresh.players[0].stamina).toBeGreaterThan(tired.players[0].stamina);
    expect(fresh.players[0].y).toBeLessThan(tired.players[0].y); expect(tired.players[0].y).toBeLessThan(start - 3);
  });

  it('finishes genuine six AI games with reconciled shots points and active players', () => {
    const games = [71, 89, 113, 167].map(seed => simulateCourtMatch(config(seed)));
    for (const match of games) {
      expect(match.phase).toBe('finished'); expect(match.tick).toBeGreaterThan(4500);
      expect(match.events.filter(event => event.kind === 'shot').length).toBeGreaterThan(5);
      expect(match.events.filter(event => event.kind === 'basket').length).toBeGreaterThan(0);
      expect(match.players.every(player => player.stride > 10)).toBe(true); reconcile(match);
    }
  }, 30000);
});
