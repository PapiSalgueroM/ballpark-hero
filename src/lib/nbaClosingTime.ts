export type Spot = 'wing' | 'rim' | 'corner';
export type ClosingCall = Spot | 'shoot' | 'hold' | 'timeout' | 'trap' | 'foul' | 'deny-rim' | 'deny-corner' | 'next';

export const closingSpots: Record<Spot, string> = { wing: 'Wing', rim: 'Rim', corner: 'Corner' };
export const closingScenarios = [
  { name: 'Two for one', home: 94, away: 96, clock: 39, side: 'offense', opening: 'rim', target: 'rim', freeThrows: 2 },
  { name: 'Protect the lead', home: 88, away: 86, clock: 21, side: 'defense', opening: 'wing', target: 'corner', freeThrows: 2 },
  { name: 'One timeout left', home: 101, away: 102, clock: 7, side: 'defense', opening: 'corner', target: 'rim', freeThrows: 1 },
] as const;

export const CLOSING_KEY = 'dukb-nba-closing-time-v1';
export type ClosingFinish = 'Win' | 'Overtime earned' | 'Loss';
export interface ClosingReceipt { game: number; home: number; away: number; result: ClosingFinish }
export function closingScore(receipts: readonly ClosingReceipt[]): number {
  const earned = receipts.reduce((total, game) => total + (game.result === 'Win' ? 2 : game.result === 'Overtime earned' ? 1 : 0), 0);
  return Math.round(100 * earned / (2 * closingScenarios.length));
}

export interface ClosingState {
  game: number;
  home: number;
  away: number;
  clock: number;
  shotClock: number;
  side: 'offense' | 'defense' | 'result';
  ball: Spot;
  open: Spot;
  backcourt: boolean;
  timeout: boolean;
  replies: number;
  log: string[];
  receipts: ClosingReceipt[];
}

export function startClosing(game = 0, receipts: ClosingReceipt[] = []): ClosingState {
  const setup = closingScenarios[game];
  return { game, home: setup.home, away: setup.away, clock: setup.clock, shotClock: Math.min(24, setup.clock),
    side: setup.side, ball: 'wing', open: setup.opening, backcourt: setup.side === 'offense', timeout: true,
    replies: 0, log: [], receipts };
}

export function opponentLook(state: ClosingState): 'rim' | 'corner' {
  const opening = closingScenarios[state.game].target;
  return state.replies % 2 === 0 ? opening : opening === 'rim' ? 'corner' : 'rim';
}

export function hasOutlet(state: ClosingState): boolean {
  // The last situation always starts with an outlet. The other scout reports change on each trip.
  return state.game === 2 || (state.game + state.replies) % 2 === 1;
}

export function closingCost(state: ClosingState, call: Spot | 'shoot'): number {
  return (state.backcourt ? 4 : 0) + (call === 'rim' ? 3 : 2);
}

function tick(state: ClosingState, seconds: number): ClosingState {
  return { ...state, clock: Math.max(0, state.clock - seconds), shotClock: Math.max(0, state.shotClock - seconds) };
}

function settle(state: ClosingState, text: string): ClosingState {
  const next = { ...state, log: [...state.log, text] };
  if (next.clock > 0) return next;
  const { game, home, away } = next;
  const result: ClosingFinish = home > away ? 'Win' : home === away ? 'Overtime earned' : 'Loss';
  return { ...next, side: 'result', receipts: [...next.receipts, { game, home, away, result }] };
}

function exchange(state: ClosingState, side: 'offense' | 'defense'): ClosingState {
  const openSpots: Spot[] = ['wing', 'rim', 'corner'];
  const first = openSpots.indexOf(closingScenarios[state.game].opening);
  const replies = state.replies + (side === 'offense' ? 1 : 0);
  const possessions = closingScenarios[state.game].side === 'defense' ? Math.max(0, replies - 1) : replies;
  return { ...state, side, replies, shotClock: Math.min(24, state.clock), ball: 'wing', backcourt: side === 'offense',
    open: openSpots[(first + possessions) % openSpots.length] };
}

export function playClosing(state: ClosingState, call: ClosingCall): ClosingState | null {
  if (state.side === 'result') {
    return call === 'next' && state.game < closingScenarios.length - 1 ? startClosing(state.game + 1, state.receipts) : null;
  }
  if (state.side === 'offense') {
    if (call === 'timeout') {
      return state.timeout && state.backcourt
        ? settle({ ...state, timeout: false, backcourt: false }, 'Timeout. The inbound moves to the frontcourt. Both clocks stay put.') : null;
    }
    if (call === 'hold') {
      const burn = state.clock <= state.shotClock ? state.clock : state.shotClock - 4;
      if (burn <= 0) return null;
      return settle({ ...tick(state, burn), backcourt: false }, 'Used ' + burn + 's protecting the ball.');
    }
    if (call !== 'shoot' && call !== 'wing' && call !== 'rim' && call !== 'corner') return null;
    if (call === state.ball) return null;
    const cost = closingCost(state, call);
    if (cost > state.shotClock || (call !== 'shoot' && cost === state.shotClock)) {
      const next = tick(state, state.shotClock);
      return settle(exchange(next, 'defense'), next.clock === 0 ? 'Horn before the shot could leave.' : 'Shot clock expired. Opponents take possession.');
    }
    const next = { ...tick(state, cost), backcourt: false };
    if (call !== 'shoot') {
      // Moving into coverage draws its help toward the ball, leaving the passer available for a return.
      const open = call === state.open ? call : state.ball;
      return settle({ ...next, ball: call, open }, 'Moved the ball to the ' + call + '. ' + closingSpots[open] + ' is open.');
    }
    const points = state.ball === state.open ? state.ball === 'rim' ? 2 : 3 : 0;
    return settle(exchange({ ...next, home: state.home + points }, 'defense'), points
      ? 'Open ' + state.ball + ' shot scores ' + points + '.' : 'Contested ' + state.ball + ' shot misses. Defensive rebound.');
  }

  const setup = closingScenarios[state.game];
  if (call === 'foul') {
    // This practice set starts in the penalty. There is no clock time on the free throws.
    if (state.clock < 2) return settle(tick(state, state.clock), 'The horn beats the foul.');
    const next = tick(state, 2);
    return settle(exchange({ ...next, away: state.away + setup.freeThrows }, 'offense'),
      'Stopped the clock in 2s. They made ' + setup.freeThrows + ' of 2 free throws.');
  }
  if (call === 'trap') {
    if (state.clock < 4) return settle(tick(state, state.clock), 'The horn beats the trap.');
    const next = tick(state, 4);
    const outlet = hasOutlet(state);
    return settle(exchange({ ...next, away: state.away + (outlet ? 3 : 0) }, 'offense'), outlet
      ? 'The ballhandler passed out of the trap. The open corner scored 3.'
      : 'Two defenders trapped the isolated ballhandler. You took the ball back in 4s.');
  }
  if (call !== 'deny-rim' && call !== 'deny-corner') return null;
  if (state.away > state.home && state.clock <= state.shotClock) {
    return settle(tick(state, state.clock), 'They kept the ball until the horn.');
  }
  const target = opponentLook(state);
  const required = state.away > state.home ? 24 : 7;
  if (required > state.clock) return settle(tick(state, state.clock), 'The horn beats their next look.');
  const next = tick(state, Math.min(required, state.shotClock));
  const stopped = call === 'deny-' + target;
  const points = stopped ? 0 : target === 'rim' ? 2 : 3;
  return settle(exchange({ ...next, away: state.away + points }, 'offense'), stopped
    ? 'Covered the ' + target + '. Their shot missed, your side rebounded.'
    : 'Left the ' + target + ' open. They scored ' + points + '.');
}

export function readClosing(raw: string | null): { moves: ClosingCall[]; state: ClosingState } | null {
  if (!raw) return null;
  try {
    const moves: unknown = JSON.parse(raw);
    if (!Array.isArray(moves) || moves.length > 75) return null;
    let state = startClosing();
    for (const move of moves) {
      const next = playClosing(state, move);
      if (!next) return null;
      state = next;
    }
    return { moves, state };
  } catch { return null; }
}
