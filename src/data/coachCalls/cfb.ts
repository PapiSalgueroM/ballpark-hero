/**
 * Round 947: college football's coach's calls, as data for src/lib/coachCalls.ts.
 * Scoring values (touchdown 6, field goal 3, the try worth 1 kicked or 2 run
 * or passed) are the college rule book's; sources in the round's audit note.
 * Everything else here (odds, swings, the counter matrix) is a game rule.
 */
import type { CoachCallsPack } from '@/lib/coachCalls';

export const CFB_CALLS: CoachCallsPack = {
  sport: 'cfb',
  label: 'College football',
  units: { run: ['RB', 'OL'], pass: ['QB', 'WR', 'TE'], front: ['DL', 'LB'], coverage: ['DB'], kick: ['K'] },
  band: 1.5,
  /** A touchdown and a two point try. */
  oneScore: 8,
  blowout: 17,
  /** Matches CFB_POINTS_PER_EDGE in src/lib/cfbDynasty.ts; simCoachCalls checks it. */
  pointsPerEdge: 1.5,
  ties: { kind: 'overtime', points: 3 },
  plan: {
    off: {
      read: ['front', 'coverage'],
      tendencies: [
        { id: 'stout-front', label: 'Stout up front' },
        { id: 'lockdown-back', label: 'Lockdown secondary' },
        { id: 'level-d', label: 'No clear weak spot' },
      ],
      identities: [
        { id: 'pound', label: 'Pound the rock', blurb: 'Run right at a front that is the weak half of their defense.', vs: { 'stout-front': -1, 'lockdown-back': 1, 'level-d': 0 } },
        { id: 'air', label: 'Air it out', blurb: 'Throw over a secondary that is the weak half of their defense.', vs: { 'stout-front': 1, 'lockdown-back': -1, 'level-d': 0 } },
        { id: 'tempo', label: 'Go up tempo', blurb: 'Snap it fast so a sound defense never settles. A great secondary eats it alive.', vs: { 'stout-front': 0, 'lockdown-back': -1, 'level-d': 1 } },
        { id: 'take', label: 'Take what they give', blurb: 'No gamble either way. Worth nothing extra, costs nothing.', vs: { 'stout-front': 0, 'lockdown-back': 0, 'level-d': 0 } },
      ],
    },
    def: {
      read: ['run', 'pass'],
      tendencies: [
        { id: 'run-first', label: 'Runs first' },
        { id: 'pass-first', label: 'Throws it around' },
        { id: 'level-o', label: 'Balanced' },
      ],
      identities: [
        { id: 'box', label: 'Load the box', blurb: 'Eight up front against a team that wants to run.', vs: { 'run-first': 1, 'pass-first': -1, 'level-o': 0 } },
        { id: 'shell', label: 'Two deep shell', blurb: 'Keep everything in front of you against a passing team.', vs: { 'run-first': -1, 'pass-first': 1, 'level-o': 0 } },
        { id: 'pressure', label: 'Bring pressure', blurb: 'Blitz a balanced offense out of rhythm. A passing team burns it.', vs: { 'run-first': 0, 'pass-first': -1, 'level-o': 1 } },
        { id: 'base', label: 'Base defense', blurb: 'Line up and play. Worth nothing extra, costs nothing.', vs: { 'run-first': 0, 'pass-first': 0, 'level-o': 0 } },
      ],
    },
  },
  moments: [
    {
      id: 'fourth-short', title: 'Fourth and short', setup: 'Fourth and one near midfield. Punt it away or go for it?', lead: [-99, 99], weight: 3,
      options: [
        { id: 'punt', label: 'Punt it', blurb: 'Flip the field and trust your defense.', mine: 'run', theirs: 'front', base: 0.5, slope: 0, win: 0, lose: 0 },
        { id: 'go', label: 'Go for it', blurb: 'Your line against their front. Convert and the drive lives, miss and they start in your half.', mine: 'run', theirs: 'front', base: 0.6, slope: 0.03, win: 4, lose: 3 },
      ],
    },
    {
      id: 'two-point', title: 'Kick it or go for two?', setup: 'You just scored. Kick the extra point or go for two?', lead: [-99, 99], weight: 3,
      options: [
        { id: 'kick', label: 'Kick the extra point', blurb: 'Nearly automatic.', mine: 'kick', theirs: 'front', base: 0.5, slope: 0, win: 0, lose: 0 },
        { id: 'two', label: 'Go for two', blurb: 'Your passing game against their secondary. One more point if it works, one fewer if it does not.', mine: 'pass', theirs: 'coverage', base: 0.45, slope: 0.03, win: 1, lose: 1 },
      ],
    },
    {
      id: 'onside', title: 'The onside kick', setup: 'You just scored and you still trail. Kick it deep or try to steal a possession?', lead: [-99, -1], weight: 4,
      options: [
        { id: 'deep', label: 'Kick it deep', blurb: 'Make them drive the length of the field.', mine: 'kick', theirs: 'pass', base: 0.5, slope: 0, win: 0, lose: 0 },
        { id: 'onside', label: 'Onside kick', blurb: 'Usually fails. When it works, you are going to score again.', mine: 'kick', theirs: 'pass', base: 0.25, slope: 0.01, win: 7, lose: 3 },
      ],
    },
    {
      id: 'kneel', title: 'Kneel or score?', setup: 'Up late with the ball inside their ten. Take a knee or punch it in?', lead: [1, 99], weight: 3,
      options: [
        { id: 'kneel', label: 'Take a knee', blurb: 'Run out the clock. The lead stays exactly where it is.', mine: 'run', theirs: 'front', base: 0.5, slope: 0, win: 0, lose: 0 },
        { id: 'score', label: 'Punch it in', blurb: 'Seven more if you get in. A fumble hands them the ball and a shot at a field goal.', mine: 'run', theirs: 'front', base: 0.75, slope: 0.02, win: 7, lose: 3 },
      ],
    },
  ],
};
