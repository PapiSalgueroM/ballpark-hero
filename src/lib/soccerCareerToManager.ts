/* ─── Round 108: the day you hang them up is not the end of the save ───

   His ask: "after their career as a player is finished they can playout as a
   manager." Soccer Career already ends at a retirement ceremony and stops.
   Everything needed to keep going is sitting right there in the seasons
   array and nobody was reading it.

   This is the bridge. It reads a finished playing career and turns it into
   the profile the job market judges you on, so the fifteen years you just
   played become the reason a club does or does not call. That is the whole
   point of continuing in the same save rather than starting a fresh manager
   game: a Ballon d'Or winner and a lower league grinder walk out of
   retirement into two completely different worlds.

   SeasonRecord.type has allowed 'manager' since the engine was written, so
   the manager seasons append to the same career log and the whole thing
   stays one continuous story.
*/

import { repFromPlayingCareer, generateJobOffers, managerStanding, bestTierAvailable } from './managerOffers';
import type { ManagerProfile, JobOffer, OfferClub, ClubTier } from './managerOffers';

/** Only the fields of a season this bridge actually reads. */
export interface PlayedSeason {
  club: string;
  clubCountry: string;
  clubTier: number;
  apps: number;
  goals: number;
  rating: number;
  leagueTitle: boolean;
  championsLeague: boolean;
  worldCup: boolean;
  ballonDor: boolean;
  type: string;
}

export interface RetiredPlayer {
  nationality: string;
  peakOverall: number;
  intCaps: number;
  seasons: PlayedSeason[];
}

const clampTier = (t: number): ClubTier => Math.max(1, Math.min(4, Math.round(t || 4))) as ClubTier;

/**
 * Everything the job market knows about you the day you retire.
 *
 * Note what is NOT here: how good you were at 24. Clubs hire on what you
 * won and where you did it, so a very good player at a small club retires
 * with less pull than a decent one who kept winning things.
 */
export function managerProfileFromCareer(p: RetiredPlayer): ManagerProfile {
  const played = p.seasons.filter(s => s.type === 'playing');
  const totals = played.reduce(
    (a, s) => ({
      goals: a.goals + (s.goals || 0),
      apps: a.apps + (s.apps || 0),
      titles: a.titles + (s.leagueTitle ? 1 : 0),
      ucl: a.ucl + (s.championsLeague ? 1 : 0),
      wc: a.wc + (s.worldCup ? 1 : 0),
      bd: a.bd + (s.ballonDor ? 1 : 0),
    }),
    { goals: 0, apps: 0, titles: 0, ucl: 0, wc: 0, bd: 0 },
  );

  const playingRep = repFromPlayingCareer({
    ballonDors: totals.bd,
    leagueTitles: totals.titles,
    championsLeagues: totals.ucl,
    worldCups: totals.wc,
    caps: p.intCaps,
    careerGoals: totals.goals,
    seasons: played.length,
    peakOverall: p.peakOverall,
  });

  // Where you finished matters more than where you peaked: the last club on
  // the sheet is the one people picture you at.
  const last = played[played.length - 1];
  const bestTier = played.reduce((b, s) => Math.min(b, s.clubTier || 4), 4);
  // Your first job hunt is judged on the level you PLAYED at, softened one
  // rung because playing at a club and running it are different jobs.
  const lastTier = clampTier(Math.min(4, (last?.clubTier ?? 4) + 1));

  // Countries you actually played in are countries that will take your call.
  const workedIn = [...new Set(played.map(s => s.clubCountry).filter(Boolean))];

  return {
    playingRep,
    seasonsSinceRetired: 0,
    managerTrophies: 0,
    promotions: 0,
    relegations: 0,
    seasonsManaged: 0,
    lastTier,
    departure: 'retiredPlayer',
    seasonsOut: 0,
    nationality: p.nationality,
    workedIn: workedIn.length ? workedIn : [p.nationality],
    // Peaking at an elite club is itself a credential even after the drop off.
    ...(bestTier <= 1 && playingRep >= 55 ? { lastTier: clampTier(2) } : {}),
  };
}

export interface RetirementJobHunt {
  profile: ManagerProfile;
  standing: number;
  ceiling: ClubTier | null;
  offers: JobOffer[];
  /** What to tell the player when nobody calls, so silence still reads. */
  note: string;
}

/**
 * The first job hunt, run the moment the boots come off.
 *
 * An empty feed is a legitimate outcome here too. A player who spent his
 * career in the lower divisions does not get handed a dugout on day one, and
 * the note says so rather than leaving a blank screen.
 */
export function retirementJobHunt(
  p: RetiredPlayer,
  clubs: OfferClub[],
  rng: () => number = Math.random,
): RetirementJobHunt {
  const profile = managerProfileFromCareer(p);
  const standing = managerStanding(profile);
  const ceiling = bestTierAvailable(profile);
  const offers = generateJobOffers(profile, clubs, rng);

  let note: string;
  if (offers.length === 0) {
    note = standing < 25
      ? 'Nothing yet. You were a player, not a name, and the phone knows the difference. Take your badges and try again next summer.'
      : 'No offers this window. Boards move slowly on first time managers. Sit tight and see who panics in the spring.';
  } else if (offers.length === 1) {
    note = 'One club came in. That is how most of these start.';
  } else {
    note = `${offers.length} clubs want to talk. Your playing career is doing the work here.`;
  }
  return { profile, standing, ceiling, offers, note };
}

/**
 * Fold a completed managerial season back into the profile, so the next job
 * hunt is judged on what you have actually done in the dugout.
 */
export function recordManagerSeason(
  profile: ManagerProfile,
  season: { trophies?: number; promoted?: boolean; relegated?: boolean; tier: number; stillEmployed: boolean; departure?: ManagerProfile['departure'] },
): ManagerProfile {
  return {
    ...profile,
    seasonsManaged: profile.seasonsManaged + 1,
    managerTrophies: profile.managerTrophies + (season.trophies ?? 0),
    promotions: profile.promotions + (season.promoted ? 1 : 0),
    relegations: profile.relegations + (season.relegated ? 1 : 0),
    lastTier: clampTier(season.tier),
    seasonsSinceRetired: profile.seasonsSinceRetired + 1,
    // Employed means the clock on being out of work has not started.
    seasonsOut: season.stillEmployed ? 0 : profile.seasonsOut + 1,
    departure: season.departure ?? profile.departure,
  };
}
