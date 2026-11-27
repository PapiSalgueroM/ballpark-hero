export const gateNames = ['North', 'East', 'South', 'West'] as const;
export const gateFixtures = [
  {
    name: 'Season opener',
    target: 52,
    waves: [
      [13, 0, 2, 1],
      [5, 0, 8, 2],
      [0, 11, 1, 1],
      [0, 2, 2, 12],
    ],
  },
  {
    name: 'Cup semifinal',
    target: 61,
    waves: [
      [1, 12, 1, 1],
      [2, 4, 12, 0],
      [11, 4, 0, 2],
      [0, 12, 2, 4],
    ],
  },
  {
    name: 'Floodlit final',
    target: 71,
    waves: [
      [10, 0, 8, 2],
      [2, 14, 3, 0],
      [10, 2, 8, 1],
      [3, 7, 4, 13],
    ],
  },
];
export const gateKey = 'dukb-stadium-gate-control-v1';
export type GateCall = 'scan' | 'left' | 'right';
export type GateMove = { gate: number; call: GateCall; late: boolean } | { upgrade: number };
export type GateRun = { draw: number; moves: GateMove[] };
interface Receipt {
  seated: number;
  queue: number[];
  target: number;
}
export interface GateState {
  phase: 'wave' | 'build' | 'done';
  night: number;
  wave: number;
  queue: number[];
  capacity: number[];
  seated: number;
  usedLate: boolean;
  receipts: Receipt[];
  last?: { gate: number; call: GateCall; diverted: number; admitted: number; lateFans: number };
}
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const isGate = (n: unknown) => Number.isInteger(n) && Number(n) >= 0 && Number(n) < 4;
export const neighbor = (gate: number, call: 'left' | 'right') => (gate + (call === 'right' ? 1 : 3)) % 4;
export function arrivals(draw: number, night: number, wave: number): number[] {
  const row = gateFixtures[night].waves[wave];
  const rotation = (draw >> (night * 2)) & 3;
  return gateNames.map((_, i) => row[(i + rotation) % 4]);
}
export function openGates(): GateState {
  return {
    phase: 'wave',
    night: 0,
    wave: 0,
    queue: [0, 0, 0, 0],
    capacity: [4, 4, 4, 4],
    seated: 0,
    usedLate: false,
    receipts: [],
  };
}
export function gateForecast(draw: number, state: GateState, gate: number, call: GateCall, late: boolean) {
  const arriving = arrivals(draw, state.night, state.wave);
  const waiting = state.queue.map((q, i) => q + arriving[i]);
  const lanes = [...waiting];
  const capacity = [...state.capacity];
  let diverted = 0;
  if (call === 'scan') capacity[gate] += 3;
  else {
    diverted = Math.max(0, Math.min(4, lanes[gate] - capacity[gate]));
    lanes[gate] -= diverted;
    lanes[neighbor(gate, call)] += diverted;
  }
  const scanned = lanes.map((q, i) => Math.min(q, capacity[i]));
  const remaining = lanes.map((q, i) => q - scanned[i]);
  const lateFans = remaining.map(q => (late ? Math.min(q, 2) : 0));
  const queue = remaining.map((q, i) => q - lateFans[i]);
  return { arriving, waiting, diverted, scanned, lateFans, queue, admitted: sum(scanned) + sum(lateFans) };
}
export function gateStep(draw: number, state: GateState, move: GateMove): GateState | null {
  if (!move || typeof move !== 'object' || state.phase === 'done') return null;
  if ('upgrade' in move) {
    if (state.phase !== 'build' || !isGate(move.upgrade)) return null;
    return {
      ...state,
      phase: 'wave',
      night: state.night + 1,
      wave: 0,
      queue: [0, 0, 0, 0],
      seated: 0,
      last: undefined,
      capacity: state.capacity.map((c, i) => c + Number(i === move.upgrade)),
    };
  }
  if (
    state.phase !== 'wave' ||
    !isGate(move.gate) ||
    !['scan', 'left', 'right'].includes(move.call) ||
    typeof move.late !== 'boolean' ||
    (move.late && (state.usedLate || state.wave !== 3))
  )
    return null;
  const f = gateForecast(draw, state, move.gate, move.call, move.late);
  const seated = state.seated + f.admitted;
  const next = {
    ...state,
    queue: f.queue,
    seated,
    usedLate: state.usedLate || move.late,
    last: {
      gate: move.gate,
      call: move.call,
      diverted: f.diverted,
      admitted: f.admitted,
      lateFans: sum(f.lateFans),
    },
  };
  if (state.wave < 3) return { ...next, wave: state.wave + 1 };
  const receipt = { seated, queue: f.queue, target: gateFixtures[state.night].target };
  return {
    ...next,
    phase: state.night === gateFixtures.length - 1 ? 'done' : 'build',
    receipts: [...state.receipts, receipt],
  };
}
export function readGateRun(raw: string | null) {
  try {
    const run: GateRun = JSON.parse(raw ?? 'null');
    if (
      !run ||
      !Number.isInteger(run.draw) ||
      run.draw < 0 ||
      run.draw >= 64 ||
      !Array.isArray(run.moves) ||
      run.moves.length > 14
    )
      return null;
    let state = openGates();
    for (const move of run.moves) {
      const next = gateStep(run.draw, state, move);
      if (!next) return null;
      state = next;
    }
    return { run, state };
  } catch {
    return null;
  }
}
