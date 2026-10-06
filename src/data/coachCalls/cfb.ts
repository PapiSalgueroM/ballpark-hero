/**
 * Round 947: college football's coach's calls, as data for src/lib/coachCalls.ts.
 * Every number here (odds, swings in points, the counter matrix, the one
 * score cap) is a game rule built on the real scoring values: a touchdown 6,
 * a field goal 3, and a try worth 1 by kick or 2 by scoring a touchdown on
 * it. So a touchdown and its kick is 7, one score is a touchdown and a two
 * point try (8), and going for two instead of kicking is 1 more or 1 less.
 * Two sources, both read 2026-10-05:
 *   NCAA Football Rule 8-1-1 (value of scores), as reproduced by the San
 *   Diego County Football Officials Association:
 *   https://www.sdcfoa.org/ncaa/rule-8-scoring
 *   NFL Football Operations, terms glossary (touchdown, field goal, extra
 *   point, two point conversion):
 *   https://operations.nfl.com/learn-the-game/nfl-basics/terms-glossary/
 * No rule book value is stated in the copy: the plays are named (go for two)
 * but never priced. Overtime here is a game rule (a seeded field goal), not
 * the real overtime format.
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
  /** Half a coordinator's cap (STAFF_UNIT_EDGE_MAX is 3). */
  planEdge: 1.5,
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
        { id: 'punt', label: 'Punt it', blurb: 'Flip the field and trust your defense.', mine: 'run', theirs: 'front', base: 1, slope: 0, win: 0, lose: 0 },
        { id: 'go', label: 'Go for it', blurb: 'Your line against their front. Convert and you finish the drive with a touchdown, miss and they kick a field goal off the short field.', mine: 'run', theirs: 'front', base: 0.6, slope: 0.03, win: 7, lose: 3 },
      ],
    },
    {
      id: 'two-point', title: 'Kick it or go for two?', setup: 'You just scored. Kick the extra point or go for two?', lead: [-99, 99], weight: 3,
      options: [
        { id: 'kick', label: 'Kick the extra point', blurb: 'Nearly automatic.', mine: 'kick', theirs: 'front', base: 1, slope: 0, win: 0, lose: 0 },
        { id: 'two', label: 'Go for two', blurb: 'Your passing game against their secondary. More than the kick if it works, nothing if it does not.', mine: 'pass', theirs: 'coverage', base: 0.45, slope: 0.03, win: 1, lose: 1, loseBy: 'miss' },
      ],
    },
    {
      id: 'onside', title: 'The onside kick', setup: 'You just scored and you still trail. Kick it deep or try to steal a possession?', lead: [-99, -1], weight: 4,
      options: [
        { id: 'deep', label: 'Kick it deep', blurb: 'Make them drive the length of the field.', mine: 'kick', theirs: 'pass', base: 1, slope: 0, win: 0, lose: 0 },
        { id: 'onside', label: 'Onside kick', blurb: 'Usually fails and hands them a short field for a field goal. When it works, you go score a touchdown.', mine: 'kick', theirs: 'pass', base: 0.25, slope: 0.01, win: 7, lose: 3 },
      ],
    },
    {
      id: 'kneel', title: 'Kneel or score?', setup: 'Up late with the ball inside their ten. Take a knee or punch it in?', lead: [1, 99], weight: 3, closing: true,
      options: [
        { id: 'kneel', label: 'Take a knee', blurb: 'Run out the clock. The lead stays exactly where it is.', mine: 'run', theirs: 'front', base: 1, slope: 0, win: 0, lose: 0 },
        { id: 'score', label: 'Punch it in', blurb: 'Another touchdown if you get in. A fumble hands them the ball and they kick a field goal.', mine: 'run', theirs: 'front', base: 0.75, slope: 0.02, win: 7, lose: 3 },
      ],
    },
  ],
};
