/**
 * Round 947: Australian football's coach's calls, as data for
 * src/lib/coachCalls.ts, for the fictional league in aussieRulesManager.ts.
 * A goal is 6 and a behind 1 (the 2026 Laws, cited in that file's header).
 * Everything else here (odds, swings, the counter matrix) is a game rule.
 */
import type { CoachCallsPack } from '@/lib/coachCalls';

export const AFL_CALLS: CoachCallsPack = {
  sport: 'afl',
  label: 'Australian football',
  units: { back: ['defender'], mid: ['midfielder'], ruck: ['ruck'], fwd: ['forward'] },
  band: 2,
  /** A goal. */
  oneScore: 6,
  blowout: 24,
  /** The college engines' scale. The Aussie Rules engine has no such constant:
   *  simCoachCalls measures its slope (final margin on the two lineups'
   *  strength gap) at 1.55 to 2.03 points a rating point over 8 seed bases, so
   *  1.5 sits at or a little under it. */
  pointsPerEdge: 1.5,
  /** Lower than the college packs: the six clubs are drawn from one pool and sit
   *  close together, so a full plan here would outweigh the roster. */
  planEdge: 0.75,
  ties: { kind: 'draw' },
  plan: {
    off: {
      read: ['back', 'mid'],
      tendencies: [
        { id: 'strong-back', label: 'A strong back line' },
        { id: 'press-mid', label: 'Presses up the ground' },
        { id: 'level-d', label: 'No clear hole' },
      ],
      identities: [
        { id: 'long', label: 'Kick it long', blurb: 'Go over a press to your forwards. A strong back line feasts on it.', vs: { 'strong-back': -1, 'press-mid': 1, 'level-d': 0 } },
        { id: 'carry', label: 'Run and carry', blurb: 'Take on a midfield that is the weak half of their defense.', vs: { 'strong-back': 1, 'press-mid': -1, 'level-d': 0 } },
        { id: 'switch', label: 'Switch it wide', blurb: 'Stretch a sound defense side to side. A press runs it down.', vs: { 'strong-back': 0, 'press-mid': -1, 'level-d': 1 } },
        { id: 'simple', label: 'Keep it simple', blurb: 'Hit the open man. Worth nothing extra, costs nothing.', vs: { 'strong-back': 0, 'press-mid': 0, 'level-d': 0 } },
      ],
    },
    def: {
      read: ['fwd', 'mid'],
      tendencies: [
        { id: 'forward-heavy', label: 'Kicks to a big forward line' },
        { id: 'mid-run', label: 'Runs it through the middle' },
        { id: 'level-o', label: 'Spreads it around' },
      ],
      identities: [
        { id: 'zone', label: 'Zone off half back', blurb: 'Crowd the space in front of a dangerous forward line.', vs: { 'forward-heavy': 1, 'mid-run': -1, 'level-o': 0 } },
        { id: 'man', label: 'Man on man', blurb: 'Go head to head with a running midfield.', vs: { 'forward-heavy': -1, 'mid-run': 1, 'level-o': 0 } },
        { id: 'press', label: 'Press high', blurb: 'Lock the ball in against a team with no clear go to. Long kicks beat it.', vs: { 'forward-heavy': -1, 'mid-run': 0, 'level-o': 1 } },
        { id: 'structure', label: 'Hold your structure', blurb: 'Stay in position. Worth nothing extra, costs nothing.', vs: { 'forward-heavy': 0, 'mid-run': 0, 'level-o': 0 } },
      ],
    },
  },
  moments: [
    {
      id: 'tag', title: 'Tag their best midfielder?', setup: 'Their best midfielder is winning it at every stoppage. Send a tagger to him?', lead: [-99, 99], weight: 3,
      options: [
        { id: 'own', label: 'Play your own game', blurb: 'Let your midfield run.', mine: 'mid', theirs: 'mid', base: 1, slope: 0, win: 0, lose: 0 },
        { id: 'tag', label: 'Send a tagger', blurb: 'Your midfield against theirs. Shut him down and the ball comes your way, lose the battle and you are a runner short.', mine: 'mid', theirs: 'mid', base: 0.55, slope: 0.02, win: 4, lose: 3 },
      ],
    },
    {
      id: 'flood', title: 'Flood the back half?', setup: 'You lead late and they are coming. Flood the back half or keep your shape?', lead: [1, 99], weight: 4, closing: true,
      options: [
        { id: 'shape', label: 'Keep your shape', blurb: 'An even fight: win it and you goal on the rebound, lose it and they goal.', mine: 'back', theirs: 'fwd', base: 0.5, slope: 0.02, win: 6, lose: 6 },
        { id: 'flood', label: 'Flood the back half', blurb: 'Everybody back. They rarely get through, but you will not score either.', mine: 'back', theirs: 'fwd', base: 0.8, slope: 0.02, win: 0, lose: 6 },
      ],
    },
    {
      id: 'extra-stoppage', title: 'An extra at the stoppage?', setup: 'The ball is locked up in their half. Throw an extra number to the stoppage?', lead: [-99, 99], weight: 3,
      options: [
        { id: 'hold', label: 'Hold your numbers', blurb: 'Keep everyone in position.', mine: 'ruck', theirs: 'ruck', base: 1, slope: 0, win: 0, lose: 0 },
        { id: 'extra', label: 'Throw an extra in', blurb: 'Your ruck against theirs. Win the clearance and you goal, lose it and they run away with a spare.', mine: 'ruck', theirs: 'ruck', base: 0.5, slope: 0.025, win: 6, lose: 6 },
      ],
    },
    {
      id: 'swing-tall', title: 'Swing a tall defender forward?', setup: 'Down late and you need a goal. Swing your tall defender forward?', lead: [-99, -1], weight: 4, closing: true,
      options: [
        { id: 'stay', label: 'Leave him back', blurb: 'Keep the defense whole.', mine: 'fwd', theirs: 'back', base: 1, slope: 0, win: 0, lose: 0 },
        { id: 'swing', label: 'Swing him forward', blurb: 'Your forwards against their backs. A goal if he clunks it, a goal the other way if they clear it past him.', mine: 'fwd', theirs: 'back', base: 0.4, slope: 0.02, win: 6, lose: 6 },
      ],
    },
  ],
};
