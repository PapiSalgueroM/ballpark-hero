/* ─── Round 913: one training ground for every career ─────────────────────

   Soccer Career has had a training ground with four drills you actually play
   since Round 81 (cone run, burst tap, zone pick, and the gate tap that joined
   in Round 159). The four American careers had one card called Offseason
   focus. The drills now live in src/components/career/drills, the menu and
   the result screen live in src/components/career/TrainingGround, and a sport
   is a skin: the words, the emoji and what each drill trains. This file is the
   part with no React in it: the shape of a skin, and the one rule.

   The rule, the same in every sport: a session is scored 0 to 100, 50 banks
   one, 80 banks two, and there is one session a season. Soccer banks into a
   named attribute through its own engine (applyTrainingResult, which this
   rule is held equal to by scripts/simCareerTraining.mjs for every score from
   0 to 100). A career with a single rating and a potential banks through
   bankTrainingRating below, which goes through raiseWithinPotential, so no
   drill can lift a player past his ceiling. */
import { raiseWithinPotential } from '@/lib/careerHeadroom';

export type TrainingTier = 0 | 1 | 2;

/** A session score needs this much to bank one. */
export const TRAINING_SOLID = 50;
/** A session score needs this much to bank two. */
export const TRAINING_ELITE = 80;

/** A raw drill score as the result screen shows it: whole, 0 to 100. */
export function trainingScore(raw: number): number {
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/** What a session score banks: 0, 1 or 2. */
export function trainingTier(score: number): TrainingTier {
  const sc = trainingScore(score);
  return sc >= TRAINING_ELITE ? 2 : sc >= TRAINING_SOLID ? 1 : 0;
}

/** One session a season: open until this season's session has been banked. */
export function trainingSessionOpen(lastTrainedSeason: number | null | undefined, season: number): boolean {
  return lastTrainedSeason !== season;
}

export interface TrainingBank {
  /** the rating after the session */
  ovr: number;
  /** what the score earned: 0, 1 or 2 */
  tier: TrainingTier;
  /** what the rating actually moved, which is less than the tier at the ceiling */
  gain: number;
}

/** Bank a session into a single rating, held at potential. */
export function bankTrainingRating(ovr: number, pot: number, score: number): TrainingBank {
  const tier = trainingTier(score);
  const after = tier === 0 ? ovr : raiseWithinPotential(ovr, pot, tier);
  return { ovr: after, tier, gain: after - ovr };
}

/** The line a banked session ends on, in the same words the rating raise uses elsewhere. */
export function trainingBankNote(bank: TrainingBank): string {
  if (bank.tier === 0) return 'Rough day. No gains this time.';
  if (bank.gain >= bank.tier) return `Rating +${bank.gain}.`;
  if (bank.gain > 0) return `Rating +${bank.gain}, and that is your ceiling.`;
  return `You were already at your ceiling, so the rating stays at ${bank.ovr}.`;
}

/* ─── the skin ─── */

export type TrainingDrillKind = 'cones' | 'burst' | 'zones' | 'gates';

interface DrillSkinBase<Id extends string> {
  /** what the game calls this drill when it banks it */
  id: Id;
  emoji: string;
  name: string;
  /** the word for what it trains, as the player's own rating screen says it */
  stat: string;
}

/** Tap the numbered markers in order, against a stopwatch. */
export interface ConeRunSkin<Id extends string = string> extends DrillSkinBase<Id> {
  kind: 'cones';
  /** "Cone" in "Cone 3/8" */
  unit: string;
  /** "slips" in "2 slips" */
  slips: string;
  how: string;
  /** a CSS background for the floor */
  surface: string;
  /** draw a halfway line and a centre circle on it */
  pitchLines: boolean;
}

/** Tap as fast as you can for five seconds. */
export interface BurstTapSkin<Id extends string = string> extends DrillSkinBase<Id> {
  kind: 'burst';
  /** "steps" in "14 steps" */
  unit: string;
  startEmoji: string;
  startTitle: string;
  startHint: string;
  runEmoji: string;
  go: string;
  stop: string;
}

/** Six zones, five tries. In 'pick' you place it and the other man guesses;
    in 'save' a tell flashes, the shot comes, and you tap where it went. */
interface ZoneSkinBase<Id extends string> extends DrillSkinBase<Id> {
  kind: 'zones';
  /** "Penalty" in "Penalty 2/5" */
  unit: string;
  /** "scored" in "3 scored" */
  tally: string;
  how: string;
  /** the screen reader verb in front of a zone: "Shoot top left" */
  verb: string;
  /** six names, top row left to right, then the bottom row */
  zones: [string, string, string, string, string, string];
  /** the thing that travels, and the thing that tries to stop it */
  ball: string;
  glove: string;
  surface: string;
  /** 'goal' is three sides of a frame, 'box' is all four */
  frame: 'goal' | 'box';
}
export interface ZonePlaceSkin<Id extends string = string> extends ZoneSkinBase<Id> {
  mode: 'pick';
  /** you scored, he guessed right, you missed the top row */
  made: string;
  stopped: string;
  over: string;
}
export interface ZoneSaveSkin<Id extends string = string> extends ZoneSkinBase<Id> {
  mode: 'save';
  /** the tell, the shot, a save, a goal */
  tell: string;
  shot: string;
  saved: string;
  beaten: string;
}
export type ZonePickSkin<Id extends string = string> = ZonePlaceSkin<Id> | ZoneSaveSkin<Id>;

/** One of six gates lights up for a shrinking window: tap it before it shuts. */
export interface GateTapSkin<Id extends string = string> extends DrillSkinBase<Id> {
  kind: 'gates';
  /** "Pass" in "Pass 3/8" */
  unit: string;
  /** "through" in "5 through" */
  tally: string;
  how: string;
  startEmoji: string;
  startTitle: string;
  startHint: string;
  /** what shows in the lit gate */
  lit: string;
  surface: string;
}

export type TrainingDrillSkin<Id extends string = string> =
  | ConeRunSkin<Id> | BurstTapSkin<Id> | ZonePickSkin<Id> | GateTapSkin<Id>;

/** Everything a sport brings to the training ground. Words and data only. */
export interface TrainingSport<Id extends string = string> {
  /** the heading, emoji and all */
  title: string;
  /** the dialog's name for a screen reader */
  label: string;
  /** the one line rule above the drill tiles */
  rule: string;
  /** what the menu says once this season's session is used */
  shut: { emoji: string; title: string; body: string };
  /** an extra line for a position whose drills train something different;
      the marker lands in the markup as data-training-<marker>-rule */
  note?: { marker: string; text: string };
  drills: Array<TrainingDrillSkin<Id>>;
  /** the result line for a tier, given the drill's stat word */
  tierLine: (tier: TrainingTier, stat: string) => string;
  scoreLabel: string;
  bank: string;
  done: string;
}

/* ─── the words every single rating career shares ───
   They sit beside bankTrainingRating because they describe it: a session
   banks one or two into the rating, and the rating stops at potential. A skin
   that spreads these can only promise what the bank pays. */
export const RATING_TRAINING: Pick<TrainingSport, 'rule' | 'tierLine' | 'scoreLabel' | 'bank' | 'done'> = {
  rule: 'One session a season. Score 50+ for a +1 to your rating, 80+ for a +2. Training never takes you past your ceiling.',
  tierLine: (tier, stat) => (
    tier === 2 ? `Elite session! +2 ${stat}, up to your ceiling` :
    tier === 1 ? `Solid work. +1 ${stat}, up to your ceiling` :
    'Rough day. No gains this time'
  ),
  scoreLabel: 'session score',
  bank: 'Bank the session',
  done: 'Back to your career',
};

/** What a single rating career's drills train, in the word its own screens use. */
export const RATING_STAT = 'Rating';
