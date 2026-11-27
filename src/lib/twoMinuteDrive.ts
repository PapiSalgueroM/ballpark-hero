export type Defense = 'pressure' | 'shell' | 'press' | 'sideline';
export type Call = 'draw' | 'out' | 'seam' | 'screen';
export type Action = Call | 'timeout' | 'spike' | 'kick';

export interface DriveScenario {
  id: string;
  name: string;
  spot: number;
  seconds: number;
  timeouts: number;
  deficit: number;
  down: number;
  yards: number;
  looks: Defense[];
}

export const drives: DriveScenario[] = [
  { id: 'pressure', name: 'Blitz alley', spot: 41, seconds: 67, timeouts: 1, deficit: 4, down: 1, yards: 10, looks: ['pressure', 'press', 'shell', 'sideline'] },
  { id: 'range', name: 'Steal three', spot: 36, seconds: 30, timeouts: 1, deficit: 2, down: 1, yards: 10, looks: ['shell', 'sideline', 'pressure', 'press'] },
  { id: 'boundary', name: 'No timeouts', spot: 58, seconds: 26, timeouts: 0, deficit: 5, down: 1, yards: 10, looks: ['press', 'pressure', 'sideline', 'shell'] },
  { id: 'last', name: 'Fourth and short', spot: 46, seconds: 45, timeouts: 1, deficit: 3, down: 4, yards: 2, looks: ['sideline', 'press', 'shell', 'pressure'] },
];

// A catch at the boundary stops the clock. Interior gains keep it moving.
export const plays = {
  draw: { name: 'Draw', cue: 'Run inside the pass rush.', time: 5, yards: { pressure: 4, shell: 13, press: 6, sideline: 10 } },
  out: { name: 'Speed out', cue: 'Break to the sideline.', time: 5, yards: { pressure: 8, shell: 9, press: 0, sideline: 0 } },
  seam: { name: 'Deep seam', cue: 'Attack behind the corner.', time: 8, yards: { pressure: -6, shell: 0, press: 24, sideline: 18 } },
  screen: { name: 'Slip screen', cue: 'Invite pressure, then throw underneath.', time: 6, yards: { pressure: 18, shell: 6, press: 4, sideline: 8 } },
} satisfies Record<Call, { name: string; cue: string; time: number; yards: Record<Defense, number> }>;
export const looks: Record<Defense, string> = {
  pressure: 'Two linebackers crowd the line. There is grass behind the rush.',
  shell: 'Both safeties stay deep. The box is light and the corners give cushion.',
  press: 'The corners crowd your receivers. One safety patrols the deep middle.',
  sideline: 'The corners sit on the boundary. The middle of the field is open.',
};
const counter: Record<Call, Defense> = { draw: 'pressure', out: 'sideline', seam: 'shell', screen: 'press' };
export const calls = Object.keys(plays) as Call[];
export type Drive = {
  spot: number; line: number; down: number; seconds: number; timeouts: number; running: boolean;
  snaps: number; lastCall: Call | null; repeats: number; verdict: 'win' | 'loss' | 'tie' | null; recap: string;
};
export function kickoff(s: DriveScenario): Drive {
  return { spot: s.spot, seconds: s.seconds, timeouts: s.timeouts, down: s.down, line: Math.min(100, s.spot + s.yards),
    running: false, snaps: 0, lastCall: null, repeats: 0, verdict: null, recap: '' };
}
export function defense(s: DriveScenario, d: Drive): Defense {
  return d.lastCall && d.repeats >= 2 ? counter[d.lastCall] : s.looks[d.snaps % s.looks.length];
}
export const fieldGoalYards = (d: Drive) => 117 - d.spot;
export const fieldPosition = (spot: number) => spot === 50 ? 'Midfield' : spot < 50 ? 'Own ' + spot : 'Opp ' + (100 - spot);
export const gameClock = (seconds: number) => Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
export function driveStep(s: DriveScenario, d: Drive, action: Action): Drive | null {
  if (d.verdict) return null;
  if (action === 'timeout') return d.running && d.timeouts > 0
    ? { ...d, running: false, timeouts: d.timeouts - 1, recap: 'Timeout. Your next snap has no setup runoff.' } : null;
  if (action === 'spike' && !d.running) return null;
  if (action === 'kick' && fieldGoalYards(d) > 55) return null;
  const runoff = d.running ? (action === 'spike' ? 2 : 8) : 0;
  if (d.seconds <= runoff) return { ...d, seconds: 0, verdict: 'loss', recap: 'Time expired before the offense could snap.' };
  const cost = action === 'kick' ? 4 : action === 'spike' ? 1 : plays[action].time;
  const seconds = Math.max(0, d.seconds - runoff - cost);
  if (action === 'kick') {
    const verdict = s.deficit < 3 ? 'win' : s.deficit === 3 ? 'tie' : 'loss';
    return { ...d, verdict, seconds, recap: 'The ' + fieldGoalYards(d) + '-yard kick is good. ' + (verdict === 'tie' ? 'You forced overtime.' : verdict === 'win' ? 'You take the lead.' : 'You needed a touchdown.') };
  }
  const gain = action === 'spike' ? 0 : plays[action].yards[defense(s, d)];
  const spot = Math.min(100, Math.max(1, d.spot + gain));
  const firstDown = spot >= d.line;
  const down = firstDown ? 1 : d.down + 1;
  const note = action === 'spike' ? 'Spike. Clock stopped.' : gain < 0 ? 'Sacked for a loss of ' + -gain + '.' : gain === 0 ? 'Incomplete. Clock stopped.'
    : plays[action].name + ' gains ' + (spot - d.spot) + ' yards' + (action === 'out' ? ' and gets out of bounds.' : ' in bounds.');
  const verdict = spot === 100 ? 'win' : down > 4 || !seconds ? 'loss' : null;
  return { spot, down: Math.min(4, down), seconds, line: firstDown ? Math.min(100, spot + 10) : d.line,
    timeouts: d.timeouts, running: gain !== 0 && action !== 'out' && !verdict, snaps: d.snaps + 1,
    lastCall: action === 'spike' ? d.lastCall : action, repeats: action === 'spike' ? d.repeats : action === d.lastCall ? d.repeats + 1 : 1,
    verdict, recap: note + (spot === 100 ? ' Touchdown!' : down > 4 ? ' Turnover on downs.' : seconds === 0 ? ' Time expired.' : firstDown ? ' First down.' : '') };
}

export function replayDrive(s: DriveScenario, actions: readonly unknown[]): Drive | null {
  let d = kickoff(s);
  if (actions.length > 40) return null;
  for (const action of actions) {
    if (![...calls, 'timeout', 'spike', 'kick'].includes(action as string)) return null;
    const next = driveStep(s, d, action as Action);
    if (!next) return null;
    d = next;
  }
  return d;
}
