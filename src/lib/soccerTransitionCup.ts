import { initialPress, passBall, pressBoards, type PressState } from '@/lib/breakThePress';

interface Counter {
  start: number;
  route: number[];
  scout: string;
}

export const cupTies = [
  { name: 'Quarterfinal', opponent: 'Wide runners', counter: { start: 14, route: [5, 7, 17, 19, 24], scout: 'They start on the left, then look for the central runner at C4.' } },
  { name: 'Semifinal', opponent: 'Switch team', counter: { start: 10, route: [4, 14, 12, 22], scout: 'Their right winger usually squares the ball to C3 before the last run.' } },
  { name: 'Final', opponent: 'Inside runners', counter: { start: 19, route: [1, 11, 13, 23], scout: 'Watch for the pass across row 3. The inside runner wants D3.' } },
];

const tieBreaks: Counter[] = [
  { start: 10, route: [3, 13, 11, 21], scout: 'Their spare runner comes inside to B3 before going for goal.' },
  { start: 14, route: [0, 10, 12, 22], scout: 'Look for the switch back into the centre on row 3.' },
  { start: 12, route: [0, 5, 15, 19, 24], scout: 'They stay on the left until row 4, then send the ball across.' },
];

export interface CupReceipt {
  round: number;
  scored: boolean;
  conceded: boolean;
  decidingStop?: boolean;
  advanced: boolean;
}

export interface CupState {
  round: number;
  phase: 'attack' | 'defend' | 'tiebreak' | 'result';
  attack: PressState;
  defender: number;
  beat: number;
  recovery: boolean;
  receipts: CupReceipt[];
}

// Passes use shirt indices, defensive moves use pitch squares, and 25 confirms advancement.
export const NEXT_TIE = 25;
export const CUP_KEY = 'dukb-soccer-transition-cup-v1';

export function startCup(): CupState {
  return { round: 0, phase: 'attack', attack: initialPress(pressBoards[0]), defender: cupTies[0].counter.start, beat: 0, recovery: true, receipts: [] };
}

export function currentCounter(state: CupState): Counter {
  return state.phase === 'tiebreak' ? tieBreaks[state.round] : cupTies[state.round].counter;
}

export function coverDistance(from: number, to: number): number {
  return Math.abs(from % 5 - to % 5) + Math.abs(Math.floor(from / 5) - Math.floor(to / 5));
}

function cutPass(from: number, to: number, defend: number): boolean {
  // The defender has to reach the receiver or a square the actual pass crosses.
  return defend !== from && coverDistance(from, defend) + coverDistance(defend, to) === coverDistance(from, to)
    && (from % 5 === to % 5 ? defend % 5 === from % 5 : Math.floor(defend / 5) === Math.floor(from / 5));
}

export function playCupMove(state: CupState, move: number): CupState | null {
  if (!Number.isInteger(move) || move < 0 || move > NEXT_TIE) return null;
  if (state.phase === 'result') {
    if (move !== NEXT_TIE || !state.receipts[state.round].advanced || state.round === cupTies.length - 1) return null;
    const round = state.round + 1;
    return { ...state, round, phase: 'attack', attack: initialPress(pressBoards[round]), defender: cupTies[round].counter.start, beat: 0 };
  }
  if (state.phase === 'attack') {
    const attack = passBall(pressBoards[state.round], state.attack, move);
    if (!attack) return null;
    return { ...state, attack, phase: attack.result === 'playing' ? 'attack' : 'defend' };
  }
  const distance = coverDistance(state.defender, move);
  if (move === NEXT_TIE || distance > (state.recovery ? 2 : 1)) return null;
  const { route } = currentCounter(state);
  const beat = state.beat + 1;
  const stopped = cutPass(route[state.beat], route[beat], move);
  const next = { ...state, defender: move, beat, recovery: state.recovery && distance < 2 };
  if (!stopped && beat < route.length - 1) return next;
  const scored = state.attack.result === 'won';
  const conceded = !stopped;
  if (state.phase === 'defend' && scored === conceded) {
    return { ...next, phase: 'tiebreak', defender: tieBreaks[state.round].start, beat: 0 };
  }
  const receipt: CupReceipt = state.phase === 'tiebreak'
    ? { round: state.round, scored, conceded: scored, decidingStop: stopped, advanced: stopped }
    : { round: state.round, scored, conceded, advanced: scored && !conceded };
  return { ...next, phase: 'result', receipts: [...next.receipts, receipt] };
}

export function replayCup(moves: readonly number[]): CupState | null {
  if (moves.length > 45) return null;
  let state = startCup();
  for (const move of moves) {
    const next = playCupMove(state, move);
    if (!next) return null;
    state = next;
  }
  return state;
}

export function readCup(raw: string | null): number[] | null {
  if (!raw) return null;
  try {
    const moves: unknown = JSON.parse(raw);
    return Array.isArray(moves) && replayCup(moves) ? moves : null;
  } catch { return null; }
}
