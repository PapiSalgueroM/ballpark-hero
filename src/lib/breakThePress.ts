export interface PressBoard {
  id: string;
  name: string;
  budget: number;
  teammates: number[];
  markers: number[];
}

// Squares run from A1 (0) to E5 (24), with row 1 the attacking end zone.
export const pressBoards: PressBoard[] = [
  { id: 'outlet', name: 'Find the outlet', budget: 5, teammates: [20, 22, 16, 10, 1], markers: [11, 8] },
  { id: 'switch', name: 'Switch the play', budget: 5, teammates: [21, 15, 16, 9, 2], markers: [18, 6] },
  { id: 'overlap', name: 'Make the overlap', budget: 5, teammates: [21, 20, 15, 11, 8], markers: [19, 7] },
];

export type PressResult = 'playing' | 'won' | 'intercepted' | 'pressed' | 'out';
export interface PressState {
  teammates: number[];
  markers: number[];
  carrier: number;
  passes: number;
  result: PressResult;
}
const row = (square: number) => Math.floor(square / 5);
const col = (square: number) => square % 5;
export const squareName = (square: number) => 'ABCDE'[col(square)] + (row(square) + 1);

export function initialPress(board: PressBoard): PressState {
  return { teammates: board.teammates, markers: board.markers, carrier: 0, passes: 0, result: 'playing' };
}

export function passLane(state: PressState, receiver: number): 'clear' | 'blocked' | null {
  const from = state.teammates[state.carrier], to = state.teammates[receiver];
  if (state.result !== 'playing' || to === undefined || receiver === state.carrier) return null;
  const dx = col(to) - col(from), dy = row(to) - row(from), lengthSquared = dx * dx + dy * dy;
  if (lengthSquared > 9) return null;
  const blocked = state.markers.some(marker => {
    const x = col(marker) - col(from), y = row(marker) - row(from);
    const along = x * dx + y * dy;
    return x * dy === y * dx && along > 0 && along <= lengthSquared;
  });
  return blocked ? 'blocked' : 'clear';
}

export function passBall(board: PressBoard, state: PressState, receiver: number): PressState | null {
  const lane = passLane(state, receiver);
  if (!lane) return null;
  const passes = state.passes + 1;
  if (lane === 'blocked') return { ...state, passes, result: 'intercepted' };
  const target = state.teammates[receiver];
  const markers = state.markers.map(marker => marker + Math.sign(col(target) - col(marker)));
  const teammates = [...state.teammates];
  const run = teammates[state.carrier] - 5;
  if (run >= 0 && !teammates.includes(run) && !markers.includes(run)) teammates[state.carrier] = run;
  const result = markers.includes(target) ? 'pressed' : row(target) === 0 ? 'won' : passes >= board.budget ? 'out' : 'playing';
  return { teammates, markers, carrier: receiver, passes, result };
}

export function replayPasses(board: PressBoard, passes: readonly number[]): PressState | null {
  let state = initialPress(board);
  for (const receiver of passes) {
    const next = passBall(board, state, receiver);
    if (!next) return null;
    state = next;
  }
  return state;
}

export function readPressBest(board: PressBoard, raw: string | null): number[] | null {
  if (!raw) return null;
  try {
    const path: unknown = JSON.parse(raw);
    if (!Array.isArray(path) || path.length > board.budget || !path.every(Number.isInteger)) return null;
    return replayPasses(board, path)?.result === 'won' ? path : null;
  } catch { return null; }
}
