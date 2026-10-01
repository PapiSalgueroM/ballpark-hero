/* ─── Round 783: apply for a job, the other direction of the phone ───

   A player's report, 2026-09-23: "in manager career mode, add the ability to
   request to join another club. then that club either rejects you and u stay
   at ur current club, or they accept your offer and you can choose to join at
   that exact moment or at the start of the next season. obviously, you can
   already receive an offer from a club, but it would be better if you could
   give an offer to a club."

   Club Manager has had the phone ringing INTO the dugout since Round 168
   (mid season approaches) and Round 309 (the summer's real vacancies). This
   is the manager picking the phone up himself. The design, in one paragraph:
   you pick any club in a modelled league and apply, the club takes two to
   five of your match days to answer, and the answer is read off the manager
   profile the engine already keeps (managerStanding over the same profile the
   job market and the wilderness use), the gap in stature between the two
   clubs, how badly the club you wrote to is doing this season, and one roll
   fixed the moment you apply so a reload cannot reroll it. A yes gives you
   the choice the report asked for: walk in now (the engine's own mid season
   takeover path, the run-in simulated under the manager before you) or at
   the start of next season (a move stored on the save that fires exactly
   once at the rollover). A no comes with a reason in plain words, voiced by
   a role and never a named person, and that club will not take another call
   from you until next season is over.

   THIS FILE IS THE PURE HALF. It imports nothing from the engine but types,
   so src/lib/clubManager.ts can import it without a runtime cycle: the engine
   builds an ApplicationInput from a save and this file turns it into a yes or
   a no. Every number a screen or a harness reads about the job hunt comes
   from here, which is also what lets scripts/simCmApplications.mjs rewrite
   one small file for its negative controls and have the whole bundled engine
   see the rewrite.

   LIMITS. One open application at a time. At most APPLICATIONS_PER_SEASON a
   season. A decline puts the club on a cooldown that covers the rest of this
   season and the whole of next. Nothing while a summer move or an approach's
   pre-agreement is already on the save, because two promised chairs is not a
   game anybody can finish.

   OLD SAVES. Every field here is optional on CareerState and jobHuntOf hands
   back the empty hunt when it is absent, so a save written before this round
   loads unchanged and behaves exactly as it always did until the manager
   applies somewhere. */

import type { CareerState } from '@/lib/clubManager';
import { managerStanding, type ManagerProfile } from '@/lib/managerOffers';

/** Applications a manager can send in one season. */
export const APPLICATIONS_PER_SEASON = 3;
/** The club answers after this many of YOUR match days, inclusive both ends. */
export const ANSWER_MIN_MATCHES = 2;
export const ANSWER_MAX_MATCHES = 5;
/** A decline covers the season it landed in plus this many more. */
export const COOLDOWN_SEASONS = 1;
/** The board's reaction to a lame duck, the same hit an approach's handshake takes. */
export const LEAVING_BOARD_HIT = 6;

export interface JobApplication {
  club: string;
  /** The league the club plays in, for the screens. */
  league: string;
  tier: number;
  /** When it was sent. */
  season: number;
  week: number;
  /** Your match days left before they answer. */
  matchesLeft: number;
  /** The roll the club will decide on, fixed when you applied. */
  roll: number;
  status: 'pending' | 'accepted';
  /** Set once decided. */
  decidedWeek?: number;
  /** The odds the club worked to, for the screen and the harness. */
  odds?: number;
}

export interface JobHuntMove {
  from: string;
  to: string;
  /** The generated name the club you left put in the dugout. */
  interim: string;
  season: number;
  week: number;
  when: 'now' | 'summer';
}

export interface JobHunt {
  /** The one application in flight, or null. */
  open: JobApplication | null;
  /** Clubs that said no, each with the last season the cooldown covers. */
  cooldowns: { club: string; until: number }[];
  /** How many applications went out in `sentSeason`. */
  sentSeason: number;
  sent: number;
  /** An accepted application that chose the summer. Fires once at the rollover. */
  summerMove: { club: string; blurb: string } | null;
  /** The last move made through an application. */
  lastMove?: JobHuntMove;
}

export function emptyJobHunt(season: number): JobHunt {
  return { open: null, cooldowns: [], sentSeason: season, sent: 0, summerMove: null };
}

/**
 * The hunt as the engine reads it: the empty one on a save from before the
 * round, and the season's count reset when the season has moved on. Pure, and
 * never writes to the save; the engine stores what it hands back.
 */
export function jobHuntOf(career: Pick<CareerState, 'jobHunt' | 'season'>): JobHunt {
  const h = career.jobHunt;
  if (!h || typeof h !== 'object' || !Array.isArray(h.cooldowns)) return emptyJobHunt(career.season);
  const sentSeason = typeof h.sentSeason === 'number' ? h.sentSeason : career.season;
  return {
    open: h.open && typeof h.open === 'object' && typeof h.open.club === 'string' ? h.open : null,
    cooldowns: h.cooldowns.filter(c => c && typeof c.club === 'string' && typeof c.until === 'number'),
    sentSeason: sentSeason === career.season ? sentSeason : career.season,
    sent: sentSeason === career.season && typeof h.sent === 'number' ? h.sent : 0,
    summerMove: h.summerMove && typeof h.summerMove === 'object' && typeof h.summerMove.club === 'string' ? h.summerMove : null,
    lastMove: h.lastMove,
  };
}

export type ApplyRefusal =
  | 'own'        // that is your club
  | 'open'       // one at a time
  | 'cooldown'   // they said no recently
  | 'limit'      // three a season
  | 'committed'  // a summer move or a pre-agreement is already on the save
  | 'sacked';    // out of work: the wilderness has its own market

/** Why this application cannot go out, or null when it can. */
export function applyRefusal(
  career: Pick<CareerState, 'jobHunt' | 'season' | 'clubName' | 'pendingMove' | 'sacked' | 'wilderness'>,
  club: string,
): ApplyRefusal | null {
  if (career.sacked || career.wilderness) return 'sacked';
  if (club === career.clubName) return 'own';
  const hunt = jobHuntOf(career);
  if (hunt.summerMove || career.pendingMove) return 'committed';
  if (hunt.open) return 'open';
  if (hunt.cooldowns.some(c => c.club === club && career.season <= c.until)) return 'cooldown';
  if (hunt.sent >= APPLICATIONS_PER_SEASON) return 'limit';
  return null;
}

/** The season a decline at `club` keeps the door shut through, or null. */
export function cooldownUntil(career: Pick<CareerState, 'jobHunt' | 'season'>, club: string): number | null {
  const c = jobHuntOf(career).cooldowns.find(x => x.club === club && career.season <= x.until);
  return c ? c.until : null;
}

export function applicationsLeft(career: Pick<CareerState, 'jobHunt' | 'season'>): number {
  return Math.max(0, APPLICATIONS_PER_SEASON - jobHuntOf(career).sent);
}

/**
 * Send one. The delay and the roll are drawn here and stored, so the answer
 * is decided the day you apply and a reload changes nothing. Returns the new
 * hunt, or null when applyRefusal says no.
 */
export function openApplication(
  career: Pick<CareerState, 'jobHunt' | 'season' | 'week' | 'clubName' | 'pendingMove' | 'sacked' | 'wilderness'>,
  target: { club: string; league: string; tier: number },
  rng: () => number = Math.random,
): JobHunt | null {
  if (applyRefusal(career, target.club)) return null;
  const hunt = jobHuntOf(career);
  const span = ANSWER_MAX_MATCHES - ANSWER_MIN_MATCHES + 1;
  return {
    ...hunt,
    open: {
      club: target.club,
      league: target.league,
      tier: target.tier,
      season: career.season,
      week: career.week,
      matchesLeft: ANSWER_MIN_MATCHES + Math.min(span - 1, Math.floor(rng() * span)),
      roll: rng(),
      status: 'pending',
    },
    sent: hunt.sent + 1,
    sentSeason: career.season,
  };
}

/* ---------- the decision ---------- */

/** Everything the club looks at, read off the save by the engine. */
export interface ApplicationInput {
  /** managerStanding over the employed profile, 0 to 100. */
  standing: number;
  /** Your club's tier and theirs, 1 elite to 4 underdogs. */
  myTier: number;
  targetTier: number;
  /** Your club's expected finish minus your position now: positive is overachieving. */
  overshoot: number;
  /** Wins in your last five. */
  formWins: number;
  /** How badly their season is going, 0 (fine) to about 20 (a mess). */
  targetTrouble: number;
  /** Their place in their table right now, for the words. Null when unknown. */
  targetPos: number | null;
  targetClubs: number | null;
}

/* The weights. STANDING_WEIGHT is the anchor scripts/simCmApplications.mjs
   rewrites for its deaf control, so its declaration line stays exactly as it
   is or the control refuses to run. */
export const STANDING_WEIGHT = 0.05;
export const OVERSHOOT_WEIGHT = 0.06;
export const FORM_WEIGHT = 0.25;
export const TIER_UP_WEIGHT = 0.9;
export const TIER_DOWN_WEIGHT = 0.35;
export const TROUBLE_WEIGHT = 0.05;
export const ODDS_BASE = -0.4;
export const ODDS_FLOOR = 0.04;
export const ODDS_CEILING = 0.92;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * The chance the club says yes, 0.04 to 0.92. A logistic over the factors so
 * no single one decides on its own: a modest manager applying two tiers up
 * sits near the floor, the same manager applying to a club in trouble a tier
 * below is better than even, and a serial winner is wanted nearly everywhere.
 */
export function acceptanceOdds(input: ApplicationInput): number {
  const tierUp = Math.max(0, input.myTier - input.targetTier);
  const tierDown = Math.max(0, input.targetTier - input.myTier);
  const logit = ODDS_BASE
    + STANDING_WEIGHT * (input.standing - 50)
    + OVERSHOOT_WEIGHT * clamp(input.overshoot, -8, 8)
    + FORM_WEIGHT * (clamp(input.formWins, 0, 5) - 2)
    - TIER_UP_WEIGHT * tierUp
    + TIER_DOWN_WEIGHT * tierDown
    + TROUBLE_WEIGHT * clamp(input.targetTrouble, 0, 20);
  return clamp(1 / (1 + Math.exp(-logit)), ODDS_FLOOR, ODDS_CEILING);
}

export function decideApplication(input: ApplicationInput, roll: number): { accepted: boolean; odds: number } {
  const odds = acceptanceOdds(input);
  return { accepted: roll < odds, odds };
}

/** The odds in the words the confirm sheet uses. */
export function oddsWord(p: number): string {
  if (p < 0.15) return 'A long shot';
  if (p < 0.4) return 'Unlikely';
  if (p < 0.65) return 'A real chance';
  return 'They will listen';
}

function ordinal(n: number): string {
  const rem = n % 100;
  if (rem >= 11 && rem <= 13) return `${n}th`;
  const suffix = n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

/**
 * Why they said no, in casual copy, read off the factor that weighed most.
 * The speaker is always a role (the board, the chairman) and never a name,
 * and nothing in it is a quote. The club names are real clubs, which is
 * reporting; the people are not.
 */
export function declineLine(input: ApplicationInput, club: string, myClub: string, form: string[]): string {
  const tierUp = input.myTier - input.targetTier;
  if (tierUp >= 1 && input.standing < 72) {
    return `The ${club} board passed. They want someone who has run a club this size before, and ${myClub} does not count for them yet.`;
  }
  if (input.targetTrouble <= 1 && input.targetPos !== null) {
    return `${club} are ${ordinal(input.targetPos)} and the board are happy with the man they have got. They thanked you for the interest, and that was that.`;
  }
  if (input.standing < 45) {
    return `The ${club} board passed. Without a trophy or a promotion on the record they could not sell you to their own supporters.`;
  }
  if (input.overshoot <= -2 || input.formWins <= 1) {
    const run = form.length ? ` (${form.join('')})` : '';
    return `The ${club} board looked at ${myClub}'s last five${run} and where you sit in the table, and decided this was not the moment.`;
  }
  return `The ${club} board went with somebody they already knew. Nothing personal, the chairman made clear through his people.`;
}

export function acceptLine(club: string, myClub: string): string {
  return `The ${club} board want you. They have squared it with the man in their dugout and the job is yours: walk in now, or see the season out at ${myClub} and start there in the summer.`;
}

/**
 * Record the answer. A yes keeps the application on the save as accepted,
 * waiting for your choice; a no clears it and shuts that door until next
 * season is over.
 */
export function recordDecision(hunt: JobHunt, accepted: boolean, week: number, odds: number): JobHunt {
  const open = hunt.open;
  if (!open) return hunt;
  if (accepted) {
    return { ...hunt, open: { ...open, status: 'accepted', decidedWeek: week, odds } };
  }
  const until = open.season + COOLDOWN_SEASONS;
  return {
    ...hunt,
    open: null,
    cooldowns: [...hunt.cooldowns.filter(c => c.club !== open.club), { club: open.club, until }],
  };
}

/** One of your match days has gone by. Null when nothing is due yet. */
export function countDown(hunt: JobHunt): { hunt: JobHunt; due: boolean } {
  const open = hunt.open;
  if (!open || open.status !== 'pending') return { hunt, due: false };
  const left = open.matchesLeft - 1;
  return { hunt: { ...hunt, open: { ...open, matchesLeft: left } }, due: left <= 0 };
}

/** You said yes to the summer: the application closes and the move is booked. */
export function bookSummerMove(hunt: JobHunt, blurb: string): JobHunt | null {
  const open = hunt.open;
  if (!open || open.status !== 'accepted') return null;
  return { ...hunt, open: null, summerMove: { club: open.club, blurb } };
}

/**
 * The rollover takes the booked move. It comes back cleared, which is what
 * makes it fire exactly once: the line `summerMove: null` below is the anchor
 * scripts/simCmApplications.mjs rewrites for its twice control, so it stays
 * exactly as written. `from` is the club the season was played at.
 */
export function consumeSummerMove(hunt: JobHunt, from: string, season: number, interim: string): JobHunt {
  const move = hunt.summerMove;
  return {
    ...hunt,
    open: null,
    summerMove: null,
    sentSeason: season,
    sent: 0,
    lastMove: move ? { from, to: move.club, interim, season, week: 0, when: 'summer' } : hunt.lastMove,
  };
}

/** The application closes as you walk in now. */
export function closeOnJoiningNow(hunt: JobHunt, from: string, interim: string, season: number, week: number): JobHunt {
  const open = hunt.open;
  return {
    ...hunt,
    open: null,
    summerMove: null,
    lastMove: open ? { from, to: open.club, interim, season, week, when: 'now' } : hunt.lastMove,
  };
}

/** The profile a club reads about a manager who is in work: on his own terms, not a season out. */
export function employedProfile(base: ManagerProfile): ManagerProfile {
  return { ...base, departure: 'resigned', seasonsOut: 0 };
}

/** The standing the club reads first, 0 to 100, straight off the shared market model. */
export function employedStanding(base: ManagerProfile): number {
  return managerStanding(employedProfile(base));
}

/** How the old board take you leaving, for the inbox. Narrated, nobody is quoted. */
export function leavingLine(from: string, to: string, when: 'now' | 'summer', interim: string): string {
  if (when === 'summer') {
    return `The ${from} board have heard you are off to ${to} in the summer. They expect the season seen out properly, and the mood in the boardroom has gone cold.`;
  }
  return `You walked out of ${from} mid season and the board are not pretending otherwise. ${interim} takes the dressing room until the summer, and the chairman's statement thanked you in a single line.`;
}
