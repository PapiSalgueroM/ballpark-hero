/* Round 126: the four US career games get the second life Soccer Career has had
   since Round 112.

   Round 113 built usCareerToCoach.ts: reputation out of a playing career, a
   standing that moves with results, a hard ceiling on the class of job that
   will look at you, a vacancy list that skews ugly on purpose, and a
   recordCoachSeason that folds a finished year back into all of it. It was
   measured over 12,235 offers. Then nothing imported it. Not one page, not
   one component. For thirteen rounds it has been the best piece of dead code
   in the repo.

   This file is the wiring. It is the American answer to the three things the
   soccer arc does inside soccerCareerEngine.ts (refreshManagerOffers,
   acceptManagerOffer, advanceManagerSeason), pulled out into a lib of its own
   because four games need it instead of one.

   Three things here are deliberately better than the soccer version:

     1. The soccer engine never calls recordManagerSeason. Not once. Grep it.
        It rebuilds the whole profile from the playing career on every offer
        refresh and then hand patches five fields onto it, so a dugout career
        is a set of counters that happen to sit next to a job market rather
        than a record the market is actually reading. Here the CoachProfile is
        the single source of truth, every season goes through the engine's own
        recordCoachSeason, and the next offer feed is generated off the result.

     2. The soccer season is flat dice. A 15 percent sack chance and a 20
        percent trophy chance, the same numbers whether you are Guardiola or a
        man who has never won a game. Here the season is played off the tier
        of the job you took and your own standing, so a good coach handed a
        rebuild really does overachieve, and that shows up in the record, the
        standing and the next set of offers.

     3. The engine produces a vacancy list and the soccer UI throws its
        equivalent away. An empty feed that also tells you six jobs opened and
        none of them were jobs you could take is a completely different
        message from a blank screen, and it is the honest one.
*/

import {
  coachProfileFromCareer, coachStanding, bestCoachTierAvailable,
  coachingVacancies, generateCoachOffers, recordCoachSeason, recordSeasonOut,
  coachTierLabel, titleWord, usTeamLabel, briefFor, rosterFor,
} from './usCareerToCoach';
import type {
  UsSport, CoachTier, CoachProfile, CoachOffer, CoachDeparture, UsCareerLike,
} from './usCareerToCoach';

export type { UsSport, CoachTier, CoachProfile, CoachOffer } from './usCareerToCoach';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* ---------------- the shape of a coaching career on disk ---------------- */

/** The chair you are currently sitting in. Null while you are out of work. */
export interface CoachJob {
  team: string;
  tier: CoachTier;
  role: string;
  /** What the front office said they wanted, kept so the hot seat reads true. */
  brief: string;
  /** What you inherited the day you walked in. */
  roster: string;
  /** Seasons in THIS chair, which is what patience is measured in. */
  seasonsHere: number;
}

/** One finished coaching season, for the log. */
export interface CoachSeasonRow {
  n: number;
  year: number;
  team: string;
  tier: CoachTier;
  role: string;
  wins: number;
  losses: number;
  /** Hockey only. Zero everywhere else. */
  otl: number;
  /** The whole season in one sentence a fan would say out loud. */
  line: string;
  madePlayoffs: boolean;
  roundsWon: number;
  champion: boolean;
  /** How it ended, or null if you are still there. */
  departure: CoachDeparture | null;
}

export interface CoachCareerState {
  /** Save version, so a later round can repair this the way ensureContracts does. */
  v: number;
  sport: UsSport;
  profile: CoachProfile;
  /** The calendar year the next coaching season will be played in. */
  year: number;
  job: CoachJob | null;
  unemployed: boolean;
  offers: CoachOffer[];
  /** How many jobs opened league wide this cycle, so silence has a reason. */
  openings: number;
  /** How many of those were jobs you could actually have taken. */
  reachable: number;
  offerNote: string;
  results: CoachSeasonRow[];
  /** Set when the player closes the book on the whole thing himself. */
  done: boolean;
}

export const COACH_SAVE_VERSION = 1;

/* ---------------- how each sport plays a season ---------------- */

interface SportShape {
  games: number;
  /** Rounds you have to win to lift the thing. */
  rounds: number;
  /** Hockey splits its losses. Nobody else does. */
  otl: boolean;
  /** Roughly the winning percentage that gets you in. */
  bar: number;
  /** What losing in each round is called, in that sport's own words. */
  lostIn: string[];
  wonIt: string;
  missed: string;
}

const SHAPE: Record<UsSport, SportShape> = {
  nfl: {
    games: 17, rounds: 4, otl: false, bar: 0.52,
    lostIn: ['lost on Wild Card weekend', 'lost in the Divisional round', 'lost the Conference Championship', 'lost the Super Bowl'],
    wonIt: 'WON THE SUPER BOWL', missed: 'missed the playoffs',
  },
  nba: {
    games: 82, rounds: 4, otl: false, bar: 0.50,
    lostIn: ['lost in the first round', 'lost the conference semis', 'lost the Conference Finals', 'lost the Finals'],
    wonIt: 'WON THE TITLE', missed: 'missed the playoffs',
  },
  mlb: {
    games: 162, rounds: 4, otl: false, bar: 0.545,
    lostIn: ['lost the Wild Card round', 'lost the Division Series', 'lost the Championship Series', 'lost the World Series'],
    wonIt: 'WON THE WORLD SERIES', missed: 'missed October',
  },
  nhl: {
    games: 82, rounds: 4, otl: true, bar: 0.545,
    lostIn: ['lost in the first round', 'lost in the second round', 'lost the Conference Finals', 'lost the Stanley Cup Final'],
    wonIt: 'WON THE STANLEY CUP', missed: 'missed the playoffs',
  },
};

/** What a franchise at this tier wins before the coach has done anything. */
const TIER_BASE: Record<CoachTier, number> = {
  1: 0.615,  // loaded, and everyone knows it
  2: 0.545,  // in it every year, scares nobody
  3: 0.415,  // the rebuild you were hired to sit through
  4: 0.500,  // not your team. You run one room on it.
};

export function coachSportShape(sport: UsSport) {
  return SHAPE[sport];
}

/** The record, written the way a fan writes it. */
export function formatCoachRecord(r: { wins: number; losses: number; otl: number }): string {
  return r.otl > 0 ? `${r.wins}-${r.losses}-${r.otl}` : `${r.wins}-${r.losses}`;
}

/* ---------------- starting the thing ---------------- */

/**
 * The day you announce it. Reads the finished playing career through the
 * Round 113 bridge and opens the first job hunt.
 *
 * Note there is no guarantee of an offer here, and that is on purpose. A
 * career backup does not get handed a headset because he filled in a form.
 */
export function startCoachCareer(
  sport: UsSport,
  career: UsCareerLike,
  year: number,
  rng: () => number = Math.random,
): CoachCareerState {
  const profile = coachProfileFromCareer(sport, career);
  const s: CoachCareerState = {
    v: COACH_SAVE_VERSION,
    sport,
    profile,
    year,
    job: null,
    unemployed: true,
    offers: [],
    openings: 0,
    reachable: 0,
    offerNote: '',
    results: [],
    done: false,
  };
  refreshCoachOffers(s, rng, true);
  return s;
}

/**
 * Rebuild the offer feed. Called the day you retire, the day you are fired,
 * and every season you spend sitting at home.
 *
 * `exclude` is the club that just let you go, because they are not about to
 * hire you back in February.
 */
export function refreshCoachOffers(
  s: CoachCareerState,
  rng: () => number = Math.random,
  first = false,
  excludeTeam = '',
): void {
  const skip = excludeTeam || s.job?.team || '';
  const openings = coachingVacancies(s.sport, rng).filter(o => o.team !== skip);
  const ceiling = bestCoachTierAvailable(s.profile);
  const reachable = ceiling === null ? 0 : openings.filter(o => o.tier >= ceiling).length;
  const offers = generateCoachOffers(s.profile, openings, rng);
  s.openings = openings.length;
  s.reachable = reachable;
  s.offers = offers;
  s.offerNote = coachOfferNote(s, first);
}

/**
 * What to say when the phone does not ring, and what to say when it does.
 *
 * The soccer version has two sentences for silence. This has five, because
 * "nobody wants you" and "the jobs that opened were jobs you could not take"
 * and "you have been out so long they have stopped picturing you in a
 * headset" are three completely different problems with three completely
 * different fixes, and telling a player which one he has is the difference
 * between a game and a blank screen.
 */
function coachOfferNote(s: CoachCareerState, first: boolean): string {
  const standing = coachStanding(s.profile);
  const n = s.offers.length;
  if (n === 1) return 'One team wants to talk. That is how nearly every one of these starts.';
  if (n > 1) return `${n} teams want to talk.`;

  if (bestCoachTierAvailable(s.profile) === null) {
    return 'Nobody is calling and nobody is going to. The sport has closed the file on you.';
  }
  if (s.reachable === 0) {
    return `${s.openings} jobs opened around the league and not one of them was a job you could take. That is the market, not you.`;
  }
  if (first) {
    return standing < 30
      ? 'Nothing. You were a player and that is all you were, and the phone knows the difference. Get on a staff somewhere small and start again.'
      : 'No offers this cycle. Front offices are slow on first time coaches. Sit tight and wait for somebody to panic in February.';
  }
  if ((s.profile.seasonsOut ?? 0) >= 3) {
    return 'Quiet again. Three years is about how long it takes a league to stop picturing you on a sideline.';
  }
  return standing < 25
    ? 'Nobody called. Not one team. The sport has moved on and you are going to have to give it a reason to look back.'
    : 'Quiet cycle. The jobs that opened were not jobs you could take. It happens, and it happens more the longer you sit.';
}

/** Take one of the jobs on the table. */
export function acceptCoachOffer(prev: CoachCareerState, index: number): CoachCareerState {
  const offer = prev.offers[index];
  if (!offer) return prev;
  return {
    ...prev,
    job: {
      team: offer.team,
      tier: offer.tier,
      role: offer.role,
      brief: offer.brief,
      roster: offer.roster,
      seasonsHere: 0,
    },
    unemployed: false,
    offers: [],
    offerNote: '',
    profile: { ...prev.profile, seasonsOut: 0 },
  };
}

/* ---------------- playing a coaching season ---------------- */

/**
 * How good the team is this year, before a ball is thrown.
 *
 * The tier sets the floor and the ceiling. Your own standing is worth about
 * eight wins in an 82 game season at the extremes, which is roughly what a
 * genuinely great coach is worth in real life and is small enough that a bad
 * roster is still a bad roster.
 */
function seasonWinPct(s: CoachCareerState, rng: () => number): number {
  const job = s.job;
  if (!job) return 0.5;
  const standing = coachStanding(s.profile);
  /* Worth about eight wins over an 82 game season at the extremes, which is
     roughly what a genuinely great head coach is worth and is small enough
     that a bad roster is still a bad roster. An assistant gets a fraction of
     it, because he is not the one making the call. Without that fraction a
     respected coordinator sat on a ten win team every single year forever and
     a staff job played identically to running the place. */
  const coachEffect = (standing - 50) / 500 * (job.tier === 4 ? 0.4 : 1);
  // A rebuild you have been sitting through starts to come good. A window
  // does not stay open forever either.
  const drift = job.tier >= 3 ? Math.min(0.075, job.seasonsHere * 0.022)
    : job.tier === 1 ? -Math.min(0.05, job.seasonsHere * 0.014)
    : 0;
  // A season is a season. Injuries, a schedule, a bounce.
  const noise = (rng() - 0.5) * 0.11;
  return clamp(TIER_BASE[job.tier] + coachEffect + drift + noise, 0.16, 0.84);
}

interface PlayedSeason {
  wins: number; losses: number; otl: number;
  madePlayoffs: boolean; roundsWon: number; champion: boolean;
  wpct: number;
}

function playOutSeason(sport: UsSport, wpct: number, rng: () => number): PlayedSeason {
  const sh = SHAPE[sport];
  const wins = Math.round(sh.games * wpct);
  let losses = sh.games - wins;
  let otl = 0;
  if (sh.otl) { otl = Math.round(losses * (0.15 + rng() * 0.18)); losses -= otl; }

  const odds = clamp(0.5 + (wpct - sh.bar) * 5.2, 0.02, 0.96);
  const madePlayoffs = rng() < odds;
  let roundsWon = 0;
  if (madePlayoffs) {
    const pWin = clamp(0.34 + (wpct - 0.5) * 1.6, 0.18, 0.72);
    while (roundsWon < sh.rounds && rng() < pWin) roundsWon += 1;
  }
  return { wins, losses, otl, madePlayoffs, roundsWon, champion: roundsWon >= sh.rounds, wpct };
}

/** The season in one sentence. */
function seasonLine(sport: UsSport, job: CoachJob, p: PlayedSeason): string {
  const sh = SHAPE[sport];
  const rec = formatCoachRecord(p);
  const tail = p.champion ? sh.wonIt
    : p.madePlayoffs ? sh.lostIn[Math.min(p.roundsWon, sh.lostIn.length - 1)]
    : sh.missed;
  if (job.tier === 4) {
    // An assistant's log has to say whose title it was, because his own title
    // count is not going up and a line that reads the other way is a lie.
    return p.champion
      ? `${job.team} went ${rec} and ${sh.wonIt}. You were on the staff for it.`
      : `${job.team} went ${rec} and ${tail}.`;
  }
  return `${rec}, ${tail}.`;
}

/**
 * Does the building keep you?
 *
 * Every tier is judged on the thing it actually hired you for, which is why
 * the brief on the offer was written in the first place. A rebuild that fires
 * you after one bad year was lying in the interview, and this does not do
 * that.
 */
function decideDeparture(
  s: CoachCareerState, p: PlayedSeason, rng: () => number,
): { stay: boolean; departure: CoachDeparture; why: string } {
  const job = s.job!;
  const years = job.seasonsHere + 1;
  const keep = { stay: true, departure: 'retiredPlayer' as CoachDeparture, why: '' };

  // A title buys you everything, everywhere.
  if (p.champion) return keep;

  if (job.tier === 1) {
    if (p.roundsWon >= 2) return keep;
    if (!p.madePlayoffs) {
      return rng() < 0.78
        ? { stay: false, departure: 'firedLosing', why: 'A contender that misses is a fired coach. You knew that when you took it.' }
        : keep;
    }
    if (years >= 2 && rng() < 0.42) {
      return { stay: false, departure: 'firedLosing', why: 'Out early again. The owner wanted a parade and got a first round exit.' };
    }
    return keep;
  }

  if (job.tier === 2) {
    if (p.roundsWon >= 1 || p.madePlayoffs) return keep;
    const odds = years <= 1 ? 0.3 : 0.6;
    return rng() < odds
      ? { stay: false, departure: 'firedLosing', why: 'They were close when they hired you and they are not close now.' }
      : keep;
  }

  if (job.tier === 3) {
    // Year one is allowed to be ugly. They said so.
    if (years <= 1) {
      return rng() < 0.07
        ? { stay: false, departure: 'firedCollapse', why: 'One year in and the locker room was already gone. That is the fast way out.' }
        : keep;
    }
    const last = s.results[s.results.length - 1];
    const better = last ? p.wins > last.wins : true;
    if (p.madePlayoffs || better) return keep;
    const odds = years >= 4 ? 0.6 : 0.34;
    return rng() < odds
      ? { stay: false, departure: 'firedLosing', why: 'The rebuild stopped moving and somebody had to answer for it.' }
      : keep;
  }

  /* Staff jobs go when the head coach goes, and that is most of why they end.
     Coordinators move constantly in real life and the first pass at this had
     them at eleven percent on a winning year, which parked one measured
     career at the same desk for twelve straight seasons. Eighteen is closer
     to the churn the job actually has. */
  const losing = p.wins < p.losses;
  return rng() < (losing ? 0.32 : 0.18)
    ? { stay: false, departure: 'contractExpired', why: 'The head coach was let go and the whole staff went with him. Nobody blamed you.' }
    : keep;
}

/**
 * A bigger job comes and takes you.
 *
 * Gated on the engine's OWN ceiling rather than a hand rolled score, which is
 * the fix for the soccer version's `earned = trophies + promotions * 2 + ...`
 * line: there is already one number in this system that decides what class of
 * job will look at you, and inventing a second one next to it is how the two
 * drift apart.
 */
function maybePoached(s: CoachCareerState, p: PlayedSeason, rng: () => number): CoachTier | null {
  const job = s.job!;
  if (job.tier <= 1) return null;
  if (job.seasonsHere < 1) return null;
  if (!p.madePlayoffs && !p.champion) return null;
  const ceiling = bestCoachTierAvailable(s.profile);
  if (ceiling === null || ceiling >= job.tier) return null;
  const odds = p.champion ? 0.55 : p.roundsWon >= 2 ? 0.4 : 0.25;
  return rng() < odds ? (ceiling as CoachTier) : null;
}

/**
 * Play one season in the chair and fold it back into the profile.
 *
 * Everything that happens to the standing happens through the engine's own
 * recordCoachSeason. Nothing in here reaches in and edits a counter, which is
 * the whole reason the next offer feed can be trusted.
 */
export function playCoachSeason(
  prev: CoachCareerState,
  rng: () => number = Math.random,
): { state: CoachCareerState; notes: string[] } {
  const s: CoachCareerState = { ...prev, results: [...prev.results], profile: { ...prev.profile } };
  const job = s.job;
  if (!job || s.unemployed) return { state: s, notes: [] };

  const notes: string[] = [];
  const p = playOutSeason(s.sport, seasonWinPct(s, rng), rng);
  const exit = decideDeparture(s, p, rng);
  const poachedTo = exit.stay ? maybePoached(s, p, rng) : null;

  /* An assistant does not get credited with the ring. He was on the staff of a
     team that won it, which is a real credential and is worth exactly what a
     deep run is worth, so it is banked as one more round rather than as a
     title of his own. This is the difference between a resume and a lie. */
  const asHead = job.tier <= 3;
  const champion = asHead && p.champion;
  const roundsWon = asHead ? p.roundsWon : Math.max(0, Math.round(p.roundsWon * 0.5));

  const departure: CoachDeparture = poachedTo !== null ? 'poached'
    : exit.stay ? s.profile.departure
    : exit.departure;

  s.profile = recordCoachSeason(s.profile, {
    tier: job.tier,
    team: job.team,
    wins: p.wins,
    losses: p.losses + p.otl,
    madePlayoffs: p.madePlayoffs,
    roundsWon,
    champion,
    stillEmployed: exit.stay,
    departure,
  });
  /* Note what is NOT here: a reset of seasonsOut on the way out the door.
     recordCoachSeason starts the out of work clock the moment you are let go
     and coachOfferCount has an idleCut that only bites from two seasons out,
     which together say plainly that "just fired" is meant to read as one
     season out, not zero. The soccer engine zeroes it at the same moment and
     the result there is that a sacking costs almost nothing, because the only
     thing left is the departure penalty. Measured on the way to shipping this:
     leaving the clock alone took the share of retirees who coach nineteen or
     more of their first twenty seasons from 97 percent down to 61, which is
     the difference between a market and a conveyor belt. acceptCoachOffer
     puts it back to zero the moment somebody hires you, so it can never get
     stuck on. */

  const row: CoachSeasonRow = {
    n: s.results.length + 1,
    year: s.year,
    team: job.team,
    tier: job.tier,
    role: job.role,
    wins: p.wins,
    losses: p.losses,
    otl: p.otl,
    line: seasonLine(s.sport, job, p),
    madePlayoffs: p.madePlayoffs,
    roundsWon: p.roundsWon,
    champion: p.champion,
    departure: exit.stay ? null : exit.departure,
  };
  s.results.push(row);
  s.year += 1;

  notes.push(`${job.team}: ${row.line}`);
  if (p.champion && asHead) notes.push(`You are a champion as a coach. ${titleWord(s.sport).replace(/^an? /, 'The ')} is yours.`);
  else if (p.champion) notes.push('The team won it all. You were on the staff, and every building in the league now knows your name.');

  if (poachedTo !== null) {
    // The bigger job is a real vacancy, drawn the same way every other job is.
    const open = coachingVacancies(s.sport, rng).filter(o => o.tier <= poachedTo && o.team !== job.team);
    const target = open[0];
    if (target) {
      // A fresh brief and a fresh roster, because the new job is a different
      // job. Carrying the old ones over is how a man handed a franchise ends
      // up being told to run his side of the ball.
      s.job = {
        team: target.team, tier: target.tier, role: target.role,
        brief: briefFor(target.tier, s.sport, rng),
        roster: rosterFor(target.tier, rng),
        seasonsHere: 0,
      };
      notes.push(`${target.team} came for you and paid to get you out of your deal. You are their ${target.role} now.`);
    } else {
      s.job = { ...job, seasonsHere: job.seasonsHere + 1 };
    }
    return { state: s, notes };
  }

  if (exit.stay) {
    s.job = { ...job, seasonsHere: job.seasonsHere + 1 };
    return { state: s, notes };
  }

  notes.push(exit.why);
  s.job = null;
  s.unemployed = true;
  // The team that just fired you is not about to hire you back in February.
  refreshCoachOffers(s, rng, false, job.team);
  notes.push(s.offers.length
    ? `${s.offers.length} team${s.offers.length === 1 ? '' : 's'} came in.`
    : 'Nobody has called.');
  return { state: s, notes };
}

/** A season spent at home. The only thing that changes is the clock. */
export function sitOutCoachSeason(
  prev: CoachCareerState,
  rng: () => number = Math.random,
): { state: CoachCareerState; notes: string[] } {
  const s: CoachCareerState = { ...prev, results: [...prev.results] };
  s.profile = recordSeasonOut(s.profile);
  s.results.push({
    n: s.results.length + 1,
    year: s.year,
    team: 'Out of work',
    tier: 4,
    role: 'No job',
    wins: 0, losses: 0, otl: 0,
    line: 'A season on the couch.',
    madePlayoffs: false, roundsWon: 0, champion: false,
    departure: null,
  });
  s.year += 1;
  refreshCoachOffers(s, rng);
  return {
    state: s,
    notes: [s.offers.length
      ? `A year out of the game. ${s.offers.length} team${s.offers.length === 1 ? '' : 's'} interested now.`
      : 'Another year out of the game. The phone stayed quiet.'],
  };
}

/* ---------------- what the UI needs to say ---------------- */

/** Standing, ceiling and the one line that explains both. */
export function coachOutlook(s: CoachCareerState): {
  standing: number;
  ceiling: CoachTier | null;
  ceilingLabel: string;
  blurb: string;
} {
  const standing = Math.round(coachStanding(s.profile));
  const ceiling = bestCoachTierAvailable(s.profile);
  const ceilingLabel = ceiling === null ? 'Nothing' : `T${ceiling} ${coachTierLabel(ceiling)}`;
  const blurb = ceiling === null
    ? 'No team in the league would put you in front of a room right now.'
    : ceiling === 1 ? 'A team with a real roster would hand you the keys tomorrow.'
    : ceiling === 2 ? 'Playoff teams will interview you. A contender still will not.'
    : ceiling === 3 ? 'Somebody rebuilding will give you the chair and three years.'
    : 'A seat on a staff, working for somebody else. That is where nearly every coach in the sport started.';
  return { standing, ceiling, ceilingLabel, blurb };
}

/** The hot seat, so a firing is never a surprise. */
export function coachHotSeat(s: CoachCareerState): { label: string; tone: 'good' | 'warm' | 'hot'; line: string } {
  const job = s.job;
  if (!job) return { label: 'No job', tone: 'hot', line: 'You are not employed. Nothing is warm because nothing is on.' };
  const last = s.results[s.results.length - 1];
  const delivered = last && last.team === job.team;
  if (!delivered) {
    return { label: 'Fresh start', tone: 'good', line: `Season one. ${job.brief}` };
  }
  if (last.champion) return { label: 'Untouchable', tone: 'good', line: 'You just won it. Nobody in the building is going to say a word to you for a year.' };
  if (job.tier === 1) {
    if (last.roundsWon >= 2) return { label: 'Safe', tone: 'good', line: 'A deep run keeps a contender happy. Barely.' };
    if (!last.madePlayoffs) return { label: 'Hot seat', tone: 'hot', line: 'You missed with this roster. They are already interviewing.' };
    return { label: 'Warm', tone: 'warm', line: 'Out early with a team built to win now. Do that twice and you are gone.' };
  }
  if (job.tier === 2) {
    if (last.madePlayoffs) return { label: 'Safe', tone: 'good', line: 'You got them in. That was the job.' };
    return { label: 'Hot seat', tone: 'hot', line: 'They were a playoff team when they hired you.' };
  }
  if (job.tier === 3) {
    if (job.seasonsHere <= 1) return { label: 'Safe', tone: 'good', line: 'Year one is allowed to be ugly here. They said so out loud.' };
    if (last.madePlayoffs) return { label: 'Safe', tone: 'good', line: 'A rebuild that makes the playoffs is a rebuild that worked.' };
    return { label: 'Warm', tone: 'warm', line: 'Patience is not infinite. They want to see the arrow point up.' };
  }
  return last.wins < last.losses
    ? { label: 'Warm', tone: 'warm', line: 'When a head coach goes the staff goes with him, and this one is not safe.' }
    : { label: 'Safe', tone: 'good', line: 'Winning teams keep their staffs together.' };
}

export interface CoachTotals {
  seasons: number;
  wins: number;
  losses: number;
  otl: number;
  rings: number;
  berths: number;
  roundsWon: number;
  yearsOut: number;
  winPct: number;
}

export function coachTotals(s: CoachCareerState): CoachTotals {
  let wins = 0, losses = 0, otl = 0, seasons = 0, yearsOut = 0;
  for (const r of s.results) {
    if (r.team === 'Out of work') { yearsOut += 1; continue; }
    seasons += 1; wins += r.wins; losses += r.losses; otl += r.otl;
  }
  const played = wins + losses + otl;
  return {
    seasons, wins, losses, otl, yearsOut,
    rings: s.profile.ringsAsCoach,
    berths: s.profile.playoffBerths,
    roundsWon: s.profile.playoffRoundsWon,
    winPct: played ? Math.round((wins / played) * 1000) / 1000 : 0,
  };
}

/** What the sport decides your coaching career was. */
export function coachVerdict(s: CoachCareerState): string {
  const t = coachTotals(s);
  if (t.seasons === 0) return 'Never got a job. It happens to more ex players than anybody admits.';
  if (t.rings >= 3) return `${t.rings} titles. They will name something in the building after you.`;
  if (t.rings >= 1) return `A champion. ${t.rings} title${t.rings === 1 ? '' : 's'} and nobody can take that off the resume.`;
  if (t.roundsWon >= 6) return 'Won a lot of series and never the last one. That is a real career and a real ache.';
  if (t.berths >= 4) return 'The guy who gets you in. Twice a decade somebody wonders why he never got a better roster.';
  if (t.seasons >= 10) return 'Ten years in the league, which almost nobody manages. Respected everywhere, hired slowly.';
  if (t.seasons >= 4) return 'A few years in the chair and a lot of film. Plenty of coaches would take that.';
  return 'A short run at it. The sport is brutal about this.';
}

/* ---------------- old saves ---------------- */

/**
 * Repair a coaching career loaded off disk.
 *
 * House pattern, same as ensureContracts and ensureAcademy in clubManager.ts:
 * a save written before a field existed opens, gets patched in place, and
 * keeps playing. Returns null when there is nothing there at all, which is
 * what every save written before this round looks like, and that is exactly
 * right: those careers sit on the retirement screen with a new button on it.
 */
export function ensureCoachCareer(raw: unknown, sport: UsSport): CoachCareerState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<CoachCareerState>;
  if (!s.profile || typeof s.profile !== 'object') return null;

  const p = s.profile as Partial<CoachProfile>;
  const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const profile: CoachProfile = {
    sport: (p.sport as UsSport) ?? sport,
    playingRep: clamp(num(p.playingRep, 30), 0, 100),
    seasonsSinceRetired: num(p.seasonsSinceRetired),
    ringsAsCoach: num(p.ringsAsCoach),
    playoffBerths: num(p.playoffBerths),
    playoffRoundsWon: num(p.playoffRoundsWon),
    losingSeasons: num(p.losingSeasons),
    seasonsCoached: num(p.seasonsCoached),
    // Number.isFinite, never `t || 4`. Tier 0 is falsy and the short form is
    // what capped every great coach at a staff job in Round 113.
    lastTier: clamp(Math.round(Number.isFinite(p.lastTier as number) ? (p.lastTier as number) : 4), 1, 4) as CoachTier,
    departure: (p.departure as CoachDeparture) ?? 'retiredPlayer',
    seasonsOut: num(p.seasonsOut),
    playedFor: typeof p.playedFor === 'string' ? p.playedFor : '',
    workedFor: Array.isArray(p.workedFor) ? p.workedFor.filter(x => typeof x === 'string') : [],
  };

  const job = s.job && typeof s.job === 'object' ? {
    team: String((s.job as CoachJob).team ?? ''),
    tier: clamp(Math.round(Number.isFinite((s.job as CoachJob).tier) ? (s.job as CoachJob).tier : 4), 1, 4) as CoachTier,
    role: String((s.job as CoachJob).role ?? 'Head Coach'),
    brief: String((s.job as CoachJob).brief ?? 'Win more than you lose.'),
    roster: String((s.job as CoachJob).roster ?? 'What the last guy left behind.'),
    seasonsHere: num((s.job as CoachJob).seasonsHere),
  } : null;

  return {
    v: COACH_SAVE_VERSION,
    sport: (s.sport as UsSport) ?? sport,
    profile,
    year: num(s.year, 2040),
    job,
    unemployed: job === null ? true : Boolean(s.unemployed),
    offers: Array.isArray(s.offers) ? (s.offers as CoachOffer[]) : [],
    openings: num(s.openings),
    reachable: num(s.reachable),
    offerNote: typeof s.offerNote === 'string' ? s.offerNote : '',
    results: Array.isArray(s.results) ? (s.results as CoachSeasonRow[]).map(r => ({
      n: num(r?.n),
      year: num(r?.year),
      team: String(r?.team ?? 'Unknown'),
      tier: clamp(Math.round(Number.isFinite(r?.tier) ? r.tier : 4), 1, 4) as CoachTier,
      role: String(r?.role ?? 'Head Coach'),
      wins: num(r?.wins), losses: num(r?.losses), otl: num(r?.otl),
      line: String(r?.line ?? ''),
      madePlayoffs: Boolean(r?.madePlayoffs),
      roundsWon: num(r?.roundsWon),
      champion: Boolean(r?.champion),
      departure: (r?.departure as CoachDeparture) ?? null,
    })) : [],
    done: Boolean(s.done),
  };
}

/** The label a page shows for where your playing career finished. */
export function coachPlayedForLabel(sport: UsSport, teamId: string): string {
  return usTeamLabel(sport, teamId);
}
