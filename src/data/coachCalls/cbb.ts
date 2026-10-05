/**
 * Round 947: college basketball's coach's calls, as data for src/lib/coachCalls.ts.
 * Every number here (odds, swings in points, the counter matrix, the one
 * score cap) is a game rule. No rule book value is stated in the copy.
 */
import type { CoachCallsPack } from '@/lib/coachCalls';

export const CBB_CALLS: CoachCallsPack = {
  sport: 'cbb',
  label: 'College basketball',
  units: { perimeter: ['PG', 'SG', 'SF'], paint: ['PF', 'C'] },
  band: 1.5,
  /** A three. */
  oneScore: 3,
  blowout: 15,
  /** Matches CBB_POINTS_PER_EDGE in src/lib/cbbDynasty.ts; simCoachCalls checks it. */
  pointsPerEdge: 1.5,
  /** Half a coordinator's cap (STAFF_UNIT_EDGE_MAX is 3). */
  planEdge: 1.5,
  ties: { kind: 'overtime', points: 3 },
  plan: {
    off: {
      read: ['perimeter', 'paint'],
      tendencies: [
        { id: 'perimeter-d', label: 'Chases shooters off the line' },
        { id: 'rim-d', label: 'Walls off the rim' },
        { id: 'level-d', label: 'Sound everywhere' },
      ],
      identities: [
        { id: 'post', label: 'Feed the post', blurb: 'Their guards are the better half, so go inside at their bigs.', vs: { 'perimeter-d': 1, 'rim-d': -1, 'level-d': 0 } },
        { id: 'threes', label: 'Let it fly', blurb: 'Their bigs are the better half, so shoot over them.', vs: { 'perimeter-d': -1, 'rim-d': 1, 'level-d': 0 } },
        { id: 'transition', label: 'Run in transition', blurb: 'Beat a sound defense before it sets. Quick guards pick it off.', vs: { 'perimeter-d': -1, 'rim-d': 0, 'level-d': 1 } },
        { id: 'motion', label: 'Motion offense', blurb: 'Move it and take the open look. Worth nothing extra, costs nothing.', vs: { 'perimeter-d': 0, 'rim-d': 0, 'level-d': 0 } },
      ],
    },
    def: {
      read: ['perimeter', 'paint'],
      tendencies: [
        { id: 'shooters', label: 'Lives on the three' },
        { id: 'post-o', label: 'Pounds the paint' },
        { id: 'level-o', label: 'Inside and out' },
      ],
      identities: [
        { id: 'switch', label: 'Switch everything', blurb: 'Run their shooters off the line.', vs: { shooters: 1, 'post-o': -1, 'level-o': 0 } },
        { id: 'pack', label: 'Pack the paint', blurb: 'Sag off and dare a post team to beat you from outside.', vs: { shooters: -1, 'post-o': 1, 'level-o': 0 } },
        { id: 'pressure', label: 'Full court pressure', blurb: 'Speed up a balanced team. Big men just throw over it.', vs: { shooters: 0, 'post-o': -1, 'level-o': 1 } },
        { id: 'man', label: 'Straight man to man', blurb: 'Guard your man. Worth nothing extra, costs nothing.', vs: { shooters: 0, 'post-o': 0, 'level-o': 0 } },
      ],
    },
  },
  moments: [
    {
      id: 'foul-up-three', title: 'Foul up three?', setup: 'Up three, seven seconds left, their ball. Foul before the shot or defend it straight up?', lead: [3, 3], weight: 6, closing: true,
      options: [
        { id: 'defend', label: 'Defend it straight up', blurb: 'Your guards against their shooters. Get a stop and you finish at the line. Give up a three and it is overtime.', mine: 'perimeter', theirs: 'perimeter', base: 0.7, slope: 0.02, win: 2, lose: 3 },
        { id: 'foul', label: 'Foul before the shot', blurb: 'Your bigs on the boards. They shoot two instead of a three and the lead holds, unless they grab a missed free throw and tie it.', mine: 'paint', theirs: 'paint', base: 0.8, slope: 0.01, win: 0, lose: 3 },
      ],
    },
    {
      id: 'press', title: 'Press when trailing?', setup: 'Down late and the clock is against you. Press the inbound or play it safe?', lead: [-99, -1], weight: 4, closing: true,
      options: [
        { id: 'half', label: 'Play the half court', blurb: 'Get a stop the normal way.', mine: 'perimeter', theirs: 'perimeter', base: 1, slope: 0, win: 0, lose: 0 },
        { id: 'press', label: 'Full court press', blurb: 'Your guards against theirs. A steal is a quick basket, a broken press is a layup the other way.', mine: 'perimeter', theirs: 'perimeter', base: 0.4, slope: 0.025, win: 2, lose: 2 },
      ],
    },
    {
      id: 'zone-or-man', title: 'Zone or man?', setup: 'They are scoring every trip. Switch to a zone or stay in man?', lead: [-99, 99], weight: 3,
      options: [
        { id: 'man', label: 'Stay in man', blurb: 'Trust the matchups.', mine: 'perimeter', theirs: 'perimeter', base: 1, slope: 0, win: 0, lose: 0 },
        { id: 'zone', label: 'Go to a zone', blurb: 'Your bigs against their shooters. Works if they cannot hit from outside and takes a basket off them, but a hot shooter makes you pay.', mine: 'paint', theirs: 'perimeter', base: 0.5, slope: 0.03, win: 2, lose: 2, winBy: 'stop' },
      ],
    },
    {
      id: 'ice', title: 'Ice the shooter?', setup: 'Their best free throw shooter steps to the line in a tight game. Burn a timeout to ice him?', lead: [-99, 99], weight: 2,
      options: [
        { id: 'shoot', label: 'Let him shoot', blurb: 'Keep the timeout.', mine: 'perimeter', theirs: 'perimeter', base: 1, slope: 0, win: 0, lose: 0 },
        { id: 'ice', label: 'Call timeout', blurb: 'Close to a coin flip. Rattle him and he misses one. If not, you have burned the timeout you wanted for your own last trip and it costs you a point.', mine: 'perimeter', theirs: 'perimeter', base: 0.5, slope: 0.005, win: 1, lose: 1, winBy: 'stop', loseBy: 'miss' },
      ],
    },
  ],
};
