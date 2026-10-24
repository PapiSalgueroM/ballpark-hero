import type { FacilityKind, SetPieceKey } from '@/lib/clubManager';

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
