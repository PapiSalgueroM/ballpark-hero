/* Round 913: the NBA skin for the shared training ground
   (src/components/career/TrainingGround). Words and data only: the drills are
   the same four every career plays, wearing basketball. Nothing binds this to
   NBA My Career yet; the board gets its practice gym in a later round.

   Every position runs all four. The shooting spots put the threes on the top
   row because the top row is the one the drill makes riskier. */
import type { NbaCareerPos } from '@/lib/nbaMyCareer';
import {
  RATING_STAT, RATING_TRAINING,
  type TrainingDrillSkin, type TrainingSport,
} from '@/lib/careerTraining';

export type NbaTrainingDrill = 'handles' | 'lane' | 'spots' | 'reads';

const HARDWOOD = 'linear-gradient(180deg, #7c2d12, #9a3412)';

const DRILLS: Array<TrainingDrillSkin<NbaTrainingDrill>> = [
  {
    kind: 'cones', id: 'handles', emoji: '🏀', name: 'Handles', stat: RATING_STAT,
    unit: 'Cone', slips: 'loose', surface: HARDWOOD, pitchLines: true,
    how: 'Take the ball through the lit cones in order, baseline to baseline. Tight and quick scores best. The clock starts on the first cone.',
  },
  {
    kind: 'burst', id: 'lane', emoji: '⚡', name: 'Lane Agility', stat: RATING_STAT,
    unit: 'slides', startEmoji: '🏁', startTitle: 'Tap to start the 5 second lane drill',
    startHint: 'Then tap the floor as fast as you can', runEmoji: '🏃', go: 'GO GO GO', stop: 'Time!',
  },
  {
    kind: 'zones', mode: 'pick', id: 'spots', emoji: '🎯', name: 'Shooting Spots', stat: RATING_STAT,
    unit: 'Shot', tally: 'made', verb: 'Shoot from',
    zones: ['the left wing three', 'the top of the key three', 'the right wing three', 'the left elbow', 'the free throw line', 'the right elbow'],
    ball: '🏀', glove: '✋', surface: HARDWOOD, frame: 'box',
    how: 'Pick your spot. The defender closes out on the one he guesses. The threes along the top rim out more often.',
    made: 'Bucket!', stopped: 'Contested. He guessed your spot.', over: 'Rimmed out!',
  },
  {
    kind: 'gates', id: 'reads', emoji: '🧠', name: 'Passing Reads', stat: RATING_STAT,
    unit: 'Read', tally: 'found', surface: HARDWOOD, lit: '🙋',
    how: 'A cutter comes open: hit him before the window shuts. The reads come quicker as you go.',
    startEmoji: '🧠', startTitle: 'Tap to start the passing reads', startHint: 'Eight reads, shrinking windows',
  },
];

/* a Record, so a sixth position cannot be added to the career without this file knowing */
const RUNS_THEM: Record<NbaCareerPos, true> = { PG: true, SG: true, SF: true, PF: true, C: true };
export const NBA_TRAINING_POSITIONS = Object.keys(RUNS_THEM) as NbaCareerPos[];

/** The position is taken so every career calls its skin the same way; today
    all five positions run the same four drills. */
export function nbaTraining(_pos: NbaCareerPos): TrainingSport<NbaTrainingDrill> {
  return {
    ...RATING_TRAINING,
    title: '🏀 Practice Gym',
    label: 'Practice gym',
    shut: {
      emoji: '😮‍💨',
      title: 'Already trained this season',
      body: 'The trainers say rest is part of the work. Come back once next season tips off.',
    },
    drills: DRILLS,
  };
}
