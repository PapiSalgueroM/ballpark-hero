import type { FacilityKind, SetPieceKey, Duty } from '@/lib/clubManager';

export const SET_PIECE_INFO: Record<SetPieceKey, { label: string; blurb: string }> = {
  captain: { label: 'Captain', blurb: 'Wears the armband. The eleven take a defeat a little better with him out there, and the job does him good.' },
  cornersLeft: { label: 'Corners, left', blurb: 'Takes every corner from the left flag while he is on the pitch.' },
  cornersRight: { label: 'Corners, right', blurb: 'Takes every corner from the right flag while he is on the pitch.' },
  freeKicks: { label: 'Free kicks', blurb: 'Steps up for a direct free kick, and it is his goal when one goes in.' },
  penalties: { label: 'Penalties', blurb: 'Takes the penalties, in the match and in a shootout, where his rating shifts the odds a touch.' },
};

export const FACILITY_INFO: Record<FacilityKind, { label: string; blurb: string; emoji: string }> = {
  recruitment: {
    label: 'Youth recruitment',
    blurb: 'How far up the queue you are for the best local kids. Drives intake quality and how many turn up.',
    emoji: '\u{1F50D}',
  },
  coaching: {
    label: 'Coaching staff',
    blurb: 'Better coaches develop EVERY player faster, not just the teenagers, and sharpen your scouting reports.',
    emoji: '\u{1F9E2}',
  },
  facilities: {
    /* Round 467: the first team's training ground is one of the four club
       facilities now, so this youth building says what it is. */
    label: 'Academy building',
    blurb: 'The youth building itself. Lifts intake quality and helps everyone squeeze more out of the week.',
    emoji: '\u{1F3DF}\uFE0F',
  },
};

export const DUTY_INFO: Record<Duty, { label: string; blurb: string }> = {
  sweeper: { label: 'Sweeper keeper', blurb: 'Starts high and clears up behind the line. More of the ball, more risk.' },
  shotStopper: { label: 'Shot stopper', blurb: 'Stays on his line and stops what comes.' },
  stopper: { label: 'Stopper', blurb: 'Steps out to meet the striker early.' },
  cover: { label: 'Cover', blurb: 'Drops off and sweeps up behind his partner.' },
  attackingFullBack: { label: 'Attacking full back', blurb: 'Bombs on and overlaps. More going forward, more space behind him.' },
  holdingFullBack: { label: 'Holding full back', blurb: 'Stays home and tucks in beside the centre backs.' },
  anchor: { label: 'Anchor', blurb: 'Sits in front of the back line and breaks things up.' },
  deepPlaymaker: { label: 'Deep playmaker', blurb: 'Sits deep and starts the moves from there.' },
  boxToBox: { label: 'Box to box', blurb: 'Runs both ways all afternoon.' },
  playmaker: { label: 'Playmaker', blurb: 'Everything goes through him.' },
  creator: { label: 'Creator', blurb: 'Finds the pass in the last third.' },
  shadowStriker: { label: 'Shadow striker', blurb: 'Plays off the front man and arrives late in the box.' },
  winger: { label: 'Winger', blurb: 'Stays wide, beats his man and crosses.' },
  insideForward: { label: 'Inside forward', blurb: 'Cuts in off the flank looking for the goal himself.' },
  poacher: { label: 'Poacher', blurb: 'Lives in the box and finishes what comes his way.' },
  targetMan: { label: 'Target man', blurb: 'Holds it up and brings the others into play.' },
  falseNine: { label: 'False nine', blurb: 'Drops into midfield and pulls the defence out of shape.' },
};
