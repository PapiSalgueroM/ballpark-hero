export const PITCH_CALLS = {
  fastball: 'Fastball up',
  sinker: 'Sinker down',
  changeup: 'Changeup below the zone',
} as const;

export type PitchCall = keyof typeof PITCH_CALLS;
type Batter = 'pull' | 'patient' | 'lift';
type Runner = 'inherited' | 'own' | null;
type Bases = [Runner, Runner, Runner];

export const SCOUTS: Record<Batter, { name: string; report: string }> = {
  pull: { name: 'Pull hitter', report: 'Jumps on a high fastball. A low sinker gets him rolling the ball to short.' },
  patient: { name: 'Patient hitter', report: 'Takes the first fastball at the top edge. At two strikes, a changeup off that fastball can draw a chase. He lifts a sinker to center.' },
  lift: { name: 'Lift hitter', report: 'Drives a low sinker into the gap. Change speeds after a fastball to get a swing and miss.' },
};

interface Entry {
  inning: string;
  score: [number, number];
  bases: Bases;
  outs: number;
  balls: number;
  strikes: number;
  batters: Batter[];
}

export const ENTRIES: Entry[] = [
  { inning: 'Seventh inning', score: [4, 3], bases: ['inherited', null, 'inherited'], outs: 1,
    balls: 0, strikes: 0, batters: ['pull', 'patient', 'lift'] },
  { inning: 'Eighth inning', score: [2, 1], bases: ['inherited', 'inherited', 'inherited'], outs: 2,
    balls: 3, strikes: 1, batters: ['patient', 'lift', 'pull'] },
  { inning: 'Ninth inning', score: [3, 2], bases: [null, 'inherited', null], outs: 1,
    balls: 0, strikes: 1, batters: ['lift', 'patient', 'pull'] },
];

export interface Outing {
  bases: Bases;
  outs: number;
  balls: number;
  strikes: number;
  batter: number;
  previous: PitchCall | null;
  runs: number;
  inheritedScored: number;
  strikeouts: number;
  log: string[];
  result: 'Lead held' | 'Lead lost' | null;
}

function pitchResult(batter: Batter, pitch: PitchCall, state: Outing) {
  if (pitch === 'changeup') {
    const chases = state.previous === 'fastball' && (batter === 'lift' || state.strikes === 2);
    return chases ? 'Swinging strike' : 'Ball';
  }
  if (pitch === state.previous) return 'Double';
  if (pitch === 'fastball') return batter === 'pull' ? 'Single' : 'Called strike';
  if (batter === 'pull') return 'Ground ball';
  return batter === 'lift' ? 'Double' : 'Fly ball';
}

export function pitchOuting(entry: Entry, calls: readonly PitchCall[]): Outing {
  const state: Outing = {
    bases: [...entry.bases], outs: entry.outs, balls: entry.balls, strikes: entry.strikes,
    batter: 0, previous: null, runs: 0, inheritedScored: 0, strikeouts: 0, log: [], result: null,
  };
  function score(runner: Runner) {
    if (!runner) return;
    state.runs++;
    if (runner === 'inherited') state.inheritedScored++;
  }

  for (const pitch of calls) {
    if (state.result) break;
    const batter = entry.batters[state.batter % entry.batters.length];
    const call = pitchResult(batter, pitch, state);
    let detail: string = call;
    let nextBatter = true;
    const [first, second, third] = state.bases;
    if (call === 'Ball') {
      state.balls++;
      if (state.balls === 4) {
        if (first && second) {
          score(third);
          state.bases[2] = second;
        }
        if (first) state.bases[1] = first;
        state.bases[0] = 'own';
        detail = 'Ball four. Walk';
      } else nextBatter = false;
    } else if (call === 'Called strike' || call === 'Swinging strike') {
      state.strikes++;
      if (state.strikes === 3) {
        state.outs++;
        state.strikeouts++;
        detail += '. Strikeout';
      } else nextBatter = false;
    } else if (call === 'Double' || call === 'Single') {
      score(third);
      if (call === 'Double') score(second);
      state.bases = call === 'Double' ? [null, 'own', first] : ['own', first, second];
      if (state.previous === pitch) detail += '. The hitter timed the repeated pitch';
    } else if (call === 'Ground ball' && first && state.outs < 2) {
      state.outs += 2;
      state.bases = [null, null, second];
      if (state.outs < 3) score(third);
      detail = 'Ground-ball double play';
    } else {
      state.outs++;
      if (state.outs < 3 && third) {
        score(third);
        state.bases[2] = null;
        detail = call === 'Fly ball' ? 'Sacrifice fly' : 'Run scores on the groundout';
      }
      if (call === 'Ground ball') state.bases = [null, first, second];
    }
    state.log.push(`${PITCH_CALLS[pitch]}. ${detail}.`);
    if (entry.score[1] + state.runs >= entry.score[0]) state.result = 'Lead lost';
    else if (state.outs === 3) {
      state.result = 'Lead held';
      state.bases = [null, null, null];
    }
    if (nextBatter && !state.result) {
      state.batter++;
      state.balls = 0;
      state.strikes = 0;
      state.previous = null;
    } else state.previous = pitch;
  }
  return state;
}

export type PitchCard = PitchCall[][];
export const freshCard = (): PitchCard => [[]];

export function restorePitchCard(value: unknown): PitchCard {
  if (!Array.isArray(value) || !value.length || value.length > ENTRIES.length) return freshCard();
  for (const [i, calls] of value.entries()) {
    if (!Array.isArray(calls) || calls.length > 120 ||
      !calls.every(c => typeof c === 'string' && Object.prototype.hasOwnProperty.call(PITCH_CALLS, c))) return freshCard();
    const result = pitchOuting(ENTRIES[i], calls);
    if (result.log.length !== calls.length || (i < value.length - 1 && !result.result)) return freshCard();
  }
  return value;
}
