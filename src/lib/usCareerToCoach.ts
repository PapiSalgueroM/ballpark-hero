/* Round 113: your career does not end when you stop playing, in all four US sims.

   Soccer Career got this in rounds 107 to 112: the day you hang the boots up
   you walk into a job market that judges you on what you actually did, and a
   sack drops you into an unemployed state with an offer feed you have to have
   earned. The four American sims stopped dead at retirement with a legacy
   screen and nothing after it, which is a strange place to end a game whose
   whole subject is a life in sport.

   This is the American version of that bridge. It reads a finished playing
   career out of any of the four engines and turns it into a COACHING career.

   What is different about American sport, and why this is not a copy paste:

     THERE IS NO PYRAMID. Nobody gets relegated, so "the tier of club" means
     something else here. A tier one job is not a bigger league, it is a
     loaded contender with a win now mandate. A tier four job is not the
     bottom division, it is a seat on somebody else's staff, and that is
     where nearly every ex player actually starts.

     THE GOOD JOBS BARELY EVER OPEN. Bad teams fire coaches, good teams
     keep them, so the vacancy list every cycle skews ugly on purpose. Some
     windows there is simply nothing open that you could take, and that is a
     real reason to get zero offers rather than a made up one.

     THE AWARDS HAVE DIFFERENT NAMES. A Hart is not a Cy Young is not an
     All-Pro. Every piece of copy in here uses the right word for the sport
     rather than a generic one, and the reputation maths is documented
     against real career milestones per sport and per position, because an
     eight year corner and an eight year quarterback do not put up remotely
     comparable counting stats.

   The rule from the soccer rounds carries over unchanged and is the whole
   point: BEING FIRED DOES NOT HAND YOU ANOTHER JOB. Offers are earned, the
   feed can be empty, and sitting out is somewhere you can get stuck.
*/

import { NFL_TEAM_NAMES } from './nflMyCareer';
import { NBA_TEAMS } from '@/data/conquestDataNba';
import { MLB_TEAMS } from '@/data/conquestDataMlb';
import { NHL_TEAMS } from '@/data/conquestDataNhl';

export type UsSport = 'nfl' | 'nba' | 'mlb' | 'nhl';

/**
 * What kind of job this is. 1 is the best chair in the sport, 4 is a seat on
 * a staff. There is no promotion or relegation in America, so this is about
 * the state of the franchise and the size of the chair, not a division.
 */
export type CoachTier = 1 | 2 | 3 | 4;

/** How the last job ended. The single biggest short term factor. */
export type CoachDeparture =
  | 'firedCollapse'    // fired with the locker room gone, the worst way out
  | 'firedLosing'      // fired on results, the normal way out
  | 'mutual'           // parted ways, the polite firing
  | 'contractExpired'  // they simply did not renew you
  | 'resigned'         // walked away on your own terms
  | 'poached'          // a bigger job came and took you
  | 'retiredPlayer';   // your first job hunt, straight out of playing

/** Only the season fields this bridge reads. All four engines already have them. */
export interface UsSeasonLike {
  year: number;
  team: string;
  ovr: number;
  games: number;
  awards: string[];
  teamResult: string;
  // basketball
  ppg?: number; rpg?: number; apg?: number;
  // football
  passYds?: number; rushYds?: number; recYds?: number;
  tackles?: number; sacks?: number; picks?: number; fgMade?: number;
  // baseball
  hr?: number; rbi?: number; so?: number; wins?: number; saves?: number; holds?: number;
  // hockey
  goals?: number; assists?: number; points?: number;
}

/**
 * Only the career fields this bridge reads. Every one of the four engine
 * states satisfies this already, which is why no engine has to change.
 * The honours live under different names per sport, so they are all optional
 * and normalised below.
 */
export interface UsCareerLike {
  name: string;
  pos: string;
  team: string;
  ovr: number;
  retired: boolean;
  seasons: UsSeasonLike[];
  rings?: number;        // NFL, NBA, MLB
  cups?: number;         // NHL
  mvps?: number;         // NFL, NBA
  mvpCys?: number;       // MLB
  harts?: number;        // NHL, position appropriate major
  allPros?: number;      // NFL
  allNbas?: number;      // NBA
  allStars?: number;     // MLB, NHL
  finalsMvps?: number;   // NBA
  connSmythes?: number;  // NHL
}

export interface CoachProfile {
  sport: UsSport;
  /** 0 to 100, carried out of the playing career. */
  playingRep: number;
  /** Seasons since you stopped playing. Playing reputation fades. */
  seasonsSinceRetired: number;
  /** Championships won as the coach. */
  ringsAsCoach: number;
  /** Playoff appearances as the coach. */
  playoffBerths: number;
  /** Playoff series or rounds won as the coach. This is what travels. */
  playoffRoundsWon: number;
  /** Losing seasons as the coach. */
  losingSeasons: number;
  /** Seasons in the job, at any level. */
  seasonsCoached: number;
  /** The tier of the last job you held. */
  lastTier: CoachTier;
  /** How that job ended. */
  departure: CoachDeparture;
  /** Seasons sitting out right now. */
  seasonsOut: number;
  /** The franchise you played for. That door stays open longest. */
  playedFor: string;
  /** Franchises you have actually worked for as a coach. */
  workedFor: string[];
}

/** A job that is actually open this cycle. Always a real franchise. */
export interface CoachOpening {
  team: string;
  sport: UsSport;
  tier: CoachTier;
  role: string;
}

export interface CoachOffer extends CoachOpening {
  /** What the front office expects, in plain words. */
  brief: string;
  /** Why this team came for you, so the offer never feels arbitrary. */
  reason: string;
  /** What you would be inheriting. */
  roster: string;
  /** How badly they want you. Drives how long the offer stays open. */
  keenness: number;
}

export interface CoachJobHunt {
  profile: CoachProfile;
  standing: number;
  ceiling: CoachTier | null;
  openings: CoachOpening[];
  offers: CoachOffer[];
  /** What to tell the player when nobody calls, so silence still reads. */
  note: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
// Note the Number.isFinite check rather than `t || 4`. Zero is falsy, and the
// first version of this used the short form, which turned "one rung above a
// tier 1 job" into "tier 4" and quietly capped every great coach at a staff
// job forever. The harness caught it on the first run.
const clampTier = (t: number): CoachTier =>
  clamp(Math.round(Number.isFinite(t) ? t : 4), 1, 4) as CoachTier;
const pick = <T,>(arr: T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)];

/* ---------------- the real franchises, straight out of the engines ---------------- */

/**
 * Every team name this file can produce comes from the exact list the matching
 * career engine already uses, so an offer can never name a franchise the game
 * does not know. NFL comes from the engine's own NFL_TEAM_NAMES rather than
 * the Conquest dataset on purpose: the two disagree on the Rams abbreviation,
 * and the engine's list is the one a career actually plays in.
 */
export function usTeamsFor(sport: UsSport): string[] {
  if (sport === 'nfl') return NFL_TEAM_NAMES.map(t => t.label);
  if (sport === 'nba') return NBA_TEAMS.map(t => `${t.city} ${t.name}`);
  if (sport === 'mlb') return MLB_TEAMS.map(t => `${t.city} ${t.name}`);
  return NHL_TEAMS.map(t => `${t.city} ${t.name}`);
}

/** Resolve whatever the engine stored as `team` into the label fans use. */
export function usTeamLabel(sport: UsSport, id: string): string {
  if (sport === 'nfl') return NFL_TEAM_NAMES.find(t => t.abbr === id)?.label ?? id;
  if (sport === 'nba') { const t = NBA_TEAMS.find(x => x.id === id); return t ? `${t.city} ${t.name}` : id; }
  if (sport === 'mlb') { const t = MLB_TEAMS.find(x => x.id === id); return t ? `${t.city} ${t.name}` : id; }
  const t = NHL_TEAMS.find(x => x.id === id); return t ? `${t.city} ${t.name}` : id;
}

/* ---------------- the language of each sport ---------------- */

/** The MVP class award, named correctly for the sport. */
export function majorAwardWord(sport: UsSport): string {
  return sport === 'mlb' ? 'an MVP or a Cy Young'
    : sport === 'nhl' ? 'a Hart, a Norris or a Vezina'
    : 'an MVP';
}

/** The trophy, named correctly for the sport. */
export function titleWord(sport: UsSport): string {
  return sport === 'nfl' ? 'a Super Bowl'
    : sport === 'nba' ? 'a title'
    : sport === 'mlb' ? 'a World Series'
    : 'a Stanley Cup';
}

/** The end of season honour, named correctly for the sport. */
export function allLeagueWord(sport: UsSport): string {
  return sport === 'nfl' ? 'All-Pro' : sport === 'nba' ? 'All-NBA' : 'All-Star';
}

/** What the tier actually means, for the UI. */
export function coachTierLabel(tier: CoachTier): string {
  return tier === 1 ? 'Contender'
    : tier === 2 ? 'Playoff team'
    : tier === 3 ? 'Rebuild'
    : 'Staff job';
}

const STAFF_ROLES: Record<UsSport, string[]> = {
  nfl: ['Offensive Coordinator', 'Defensive Coordinator', 'Quarterbacks Coach', 'Special Teams Coordinator'],
  nba: ['Lead Assistant', 'Player Development Coach', 'Defensive Assistant'],
  mlb: ['Bench Coach', 'Hitting Coach', 'Pitching Coach', 'Third Base Coach'],
  nhl: ['Associate Coach', 'Assistant Coach', 'Goaltending Coach'],
};

/* ---------------- reputation out of the playing career ---------------- */

/**
 * The career counting stat term, expressed as a fraction of a genuinely great
 * career at that position, so it can never be more than a few points of the
 * hundred. This exists because the football lesson from Round 104 applies
 * here too: a quarterback and a cornerback are not on one scale, and a single
 * generic yardage number hands every rep point in the sport to passers.
 *
 * The benchmarks are real milestones, deliberately set a notch under the
 * record so an all time career clears 1 and a very good one lands near 0.5:
 *   NBA points        25,000  (Kareem 38,387, LeBron past 42,000)
 *   NFL passing       55,000  (Brees 80,358, Brady 89,214)
 *   NFL scrimmage     14,000  (Emmitt Smith 21,579 rushing, Rice 22,895 rec)
 *   NFL sacks            100  (Bruce Smith 200)
 *   NFL tackles        1,200  (Ray Lewis past 2,000 by the loose count)
 *   NFL picks             40  (Paul Krause 81)
 *   NFL field goals      350  (Vinatieri 599)
 *   MLB strikeouts     3,000  (Nolan Ryan 5,714), wins 250 (Cy Young 511)
 *   MLB home runs        450  (Bonds 762), RBI 1,500 (Aaron 2,297)
 *   MLB saves            400  (Rivera 652)
 *   NHL points           900  (Gretzky 2,857), goalie wins 350 (Brodeur 691)
 */
export function careerVolumeScore(sport: UsSport, pos: string, seasons: UsSeasonLike[]): number {
  const sum = (f: (s: UsSeasonLike) => number) => seasons.reduce((a, s) => a + (f(s) || 0), 0);
  if (sport === 'nba') {
    return clamp(sum(s => (s.ppg ?? 0) * s.games) / 25000, 0, 1.4);
  }
  if (sport === 'nhl') {
    if (pos === 'G') return clamp(sum(s => s.wins ?? 0) / 350, 0, 1.4);
    return clamp(sum(s => s.points ?? 0) / 900, 0, 1.4);
  }
  if (sport === 'mlb') {
    if (pos === 'SP') return clamp(sum(s => s.so ?? 0) / 3000 * 0.5 + sum(s => s.wins ?? 0) / 250 * 0.5, 0, 1.4);
    if (pos === 'RP') return clamp(sum(s => s.saves ?? 0) / 400 * 0.6 + sum(s => s.holds ?? 0) / 250 * 0.4, 0, 1.4);
    return clamp(sum(s => s.hr ?? 0) / 450 * 0.5 + sum(s => s.rbi ?? 0) / 1500 * 0.5, 0, 1.4);
  }
  // Football, where every position room keeps a different set of books.
  if (pos === 'QB') return clamp(sum(s => s.passYds ?? 0) / 55000, 0, 1.4);
  if (pos === 'K') return clamp(sum(s => s.fgMade ?? 0) / 350, 0, 1.4);
  if (pos === 'LB' || pos === 'CB' || pos === 'EDGE') {
    // Each of these three rooms maxes out a different column, so they add
    // rather than average and a specialist is not punished for it.
    return clamp(sum(s => s.tackles ?? 0) / 1200 + sum(s => s.sacks ?? 0) / 100 + sum(s => s.picks ?? 0) / 40, 0, 1.4);
  }
  return clamp(sum(s => (s.rushYds ?? 0) + (s.recYds ?? 0)) / 14000, 0, 1.4);
}

/**
 * How much each honour is worth, per sport.
 *
 * These are NOT four copies of one table, and that is the honest part. The
 * four engines hand out hardware at wildly different rates, so a single set
 * of weights would have made a median NFL career look like a first ballot
 * Hall of Famer and a median NBA career look like a backup. Measured over
 * 300 full simulated careers per sport, per engine, in August 2026:
 *
 *   sport  rings(p50/max)  major(mean/max)  allLeague(p50/max)  peak(p50)
 *   NFL       0 / 5           1.32 / 9          9 / 17            80
 *   NBA       0 / 6           0.00 / 0          0 / 13            84
 *   MLB       0 / 6           0.00 / 0          2 / 18            80
 *   NHL       0 / 6           0.01 / 2          8 / 22            84
 *
 * Two of those numbers are worth saying out loud because they are engine
 * quirks, not design:
 *   - The NFL engine gives a MEDIAN career nine first team All-Pro seasons
 *     and the NHL engine eight All-Star selections, which is not what those
 *     awards are in real life. So in those two sports the honour is weighted
 *     as what it functionally is here: a marker of a long good career.
 *   - NBA MVP is gated on an overall of 92 and the highest peak seen across
 *     300 careers was 91, so it effectively never fires. MLB MVP and Cy
 *     Young never fired either. The MVP weight is still set to what an MVP
 *     is worth, because the day those gates get retuned this should be
 *     correct without anyone remembering to come back here.
 *
 * ─── Round 123: that day arrived, and this table had to be rebuilt ───
 *
 * careerAwards.ts made every award something you have to beat the rest of
 * the league to win, so the counts above are gone. Measured over 1760 NFL,
 * 1100 NBA, 2420 MLB and 1100 NHL full careers in August 2026, after:
 *
 *   sport  rings(p50/max)  major(mean/max)  allLeague(mean/max)  peak(p50)
 *   NFL       0 / 5           0.03 / 2          0.20 / 3           80
 *   NBA       0 / 6           0.10 / 5          1.32 / 12          84
 *   MLB       0 / 6           0.01 / 2          0.82 / 9           80
 *   NHL       0 / 6           0.06 / 2          1.01 / 9           84
 *
 * All-Pro fell by a factor of forty four and the NHL All-Star nod by a
 * factor of eight, so leaving this table alone would have sent every retiring
 * player to the coaching market with almost nothing and quietly killed the
 * Round 113 feature. Two things changed and the second one is the important
 * one.
 *
 * The award weights went up, a lot, because an award is now worth what an
 * award is worth. A first team All-Pro season is 8 rather than 1.3 because
 * you now have to be the best in the league at your job to get one.
 *
 * And the LONGEVITY terms went up in the three sports whose median career now
 * wins nothing at all, because something has to carry the middle of the
 * distribution and it can no longer be hardware. That is not a fudge, it is
 * what a front office is actually looking at when it interviews a man who
 * played seventeen years and never made an All-Pro team: how long you lasted,
 * how good you got, and how much you piled up. Awards are now the thing that
 * separates the top, which is what they are for.
 *
 * Calibrated so a median career lands near 40, a very good one near 70, and
 * only a career the sport would argue about clears 90. Measured medians after
 * the rebuild: NFL 45, NBA 39, MLB 38, NHL 48, against the documented 45, 38,
 * 37 and 49 from Round 113. Share of retirees who skip the staff route and
 * start as a head coach: NFL 14 percent, NBA 20, MLB 8, NHL 27.
 */
const REP_WEIGHTS: Record<UsSport, {
  ring: number; major: number; finalsMvp: number; allLeague: number;
  season: number; peak: number; volume: number;
}> = {
  nfl: { ring: 7, major: 16, finalsMvp: 8, allLeague: 8, season: 0.85, peak: 1.1, volume: 6.5 },
  nba: { ring: 7, major: 16, finalsMvp: 10, allLeague: 6, season: 0.5, peak: 0.75, volume: 5 },
  mlb: { ring: 7, major: 20, finalsMvp: 8, allLeague: 4, season: 0.65, peak: 0.9, volume: 5.5 },
  nhl: { ring: 7, major: 18, finalsMvp: 10, allLeague: 7, season: 0.6, peak: 0.85, volume: 6 },
};

/**
 * Turn a finished US playing career into a starting reputation, 0 to 100.
 *
 * Same scale and the same philosophy as the soccer version so both markets
 * speak one language: deliberately hard to max out, and only somebody the
 * sport still argues about clears 90. Peak overall is measured above 62
 * rather than 60 because that is roughly where a rookie starts in all four
 * engines, so it reads as "how far past replacement level did you get".
 */
export function repFromUsPlayingCareer(sport: UsSport, input: {
  rings?: number;
  majorAwards?: number;
  finalsMvps?: number;
  allLeague?: number;
  seasons?: number;
  peakOverall?: number;
  volume?: number;
}): number {
  const w = REP_WEIGHTS[sport];
  const v =
    (input.majorAwards ?? 0) * w.major +
    (input.rings ?? 0) * w.ring +
    (input.finalsMvps ?? 0) * w.finalsMvp +
    (input.allLeague ?? 0) * w.allLeague +
    Math.min(input.seasons ?? 0, 20) * w.season +
    Math.max(0, (input.peakOverall ?? 62) - 62) * w.peak +
    clamp(input.volume ?? 0, 0, 1.4) * w.volume;
  return clamp(Math.round(v), 0, 100);
}

/** Pull the honours out of whichever engine wrote them, under their own names. */
export function usCareerHonors(sport: UsSport, c: UsCareerLike) {
  const rings = sport === 'nhl' ? (c.cups ?? 0) : (c.rings ?? 0);
  const majorAwards = sport === 'mlb' ? (c.mvpCys ?? 0)
    : sport === 'nhl' ? (c.harts ?? 0)
    : (c.mvps ?? 0);
  const allLeague = sport === 'nfl' ? (c.allPros ?? 0)
    : sport === 'nba' ? (c.allNbas ?? 0)
    : (c.allStars ?? 0);
  const finalsMvps = sport === 'nba' ? (c.finalsMvps ?? 0)
    : sport === 'nhl' ? (c.connSmythes ?? 0)
    : 0;
  return { rings, majorAwards, allLeague, finalsMvps };
}

/**
 * Everything the coaching market knows about you the day you retire.
 *
 * Note what is NOT in here: how good you were at 26. Front offices hire on
 * what you won and how long you lasted, so a very good player on bad teams
 * retires with less pull than a decent one who kept getting rings.
 */
export function coachProfileFromCareer(sport: UsSport, c: UsCareerLike): CoachProfile {
  const played = c.seasons.filter(s => s.teamResult !== 'SUSPENDED');
  const h = usCareerHonors(sport, c);
  const peakOverall = played.reduce((b, s) => Math.max(b, s.ovr || 0), c.ovr || 0);
  const playingRep = repFromUsPlayingCareer(sport, {
    rings: h.rings,
    majorAwards: h.majorAwards,
    finalsMvps: h.finalsMvps,
    allLeague: h.allLeague,
    seasons: played.length,
    peakOverall,
    volume: careerVolumeScore(sport, c.pos, played),
  });

  // Where a retiring player starts. A name walks straight into a chair, a
  // very good player gets handed a rebuild, and everybody else takes the
  // normal route in through somebody else's staff. That last case is not a
  // punishment, it is what almost every real coach did.
  //
  // The two thresholds are set off the measured reputation spread rather
  // than picked out of the air: at 60 and 82, roughly one retiree in five
  // skips the staff route across all four sports. The first draft used 52
  // and 78, and that had 46 percent of NHL careers being handed a franchise
  // on the day they retired, which is not a thing that happens.
  const lastTier: CoachTier = playingRep >= 82 ? 2 : playingRep >= 60 ? 3 : 4;

  const teams = new Set(played.map(s => s.team).filter(Boolean));
  return {
    sport,
    playingRep,
    seasonsSinceRetired: 0,
    ringsAsCoach: 0,
    playoffBerths: 0,
    playoffRoundsWon: 0,
    losingSeasons: 0,
    seasonsCoached: 0,
    lastTier,
    departure: 'retiredPlayer',
    seasonsOut: 0,
    playedFor: usTeamLabel(sport, c.team),
    workedFor: [...teams].map(t => usTeamLabel(sport, t)),
  };
}

/* ---------------- the market ---------------- */

/**
 * Your standing in the sport right now, 0 to 100. This is the number every
 * front office looks at first.
 */
export function coachStanding(p: CoachProfile): number {
  // Playing reputation is a real asset and a decaying one. Same half life as
  // the soccer market, about eight seasons: the rings you won at 29 are still
  // getting you interviews at 45, just fewer of them.
  const playing = p.playingRep * Math.pow(0.92, Math.max(0, p.seasonsSinceRetired));

  // What you have actually done in the job. In American sport a coach is
  // judged on January and nothing else, so playoff rounds are worth more per
  // unit than simply making it, and a title is worth more than both.
  //
  // The positive side saturates on purpose. Uncapped, a coach with four
  // titles and twenty series wins runs the raw score past 250, and once you
  // are that far above the ceiling nothing that happens afterwards can be
  // felt at all: he could collapse to 21 and 61, get run out of town, sit
  // out five years and still come out clamped at 100. Capping the good
  // stuff keeps the number meaning something for the people it should.
  const earned =
    p.ringsAsCoach * 11 +
    p.playoffRoundsWon * 3.2 +
    p.playoffBerths * 2.4 +
    Math.min(p.seasonsCoached, 15) * 1.2;
  const record = Math.min(58, earned) - Math.min(p.losingSeasons, 10) * 3.6;

  // Having held a big chair is itself a credential, even if it ended badly.
  const pedigree = [0, 14, 9, 4, 1][p.lastTier] ?? 0;

  const exit: Record<CoachDeparture, number> = {
    firedCollapse: -18,
    firedLosing: -10,
    mutual: -5,
    contractExpired: -3,
    resigned: 0,
    poached: 8,
    retiredPlayer: 0,
  };

  // Sitting out is the quiet killer. One year out is a broadcast job, three
  // years out is the answer to a question nobody asks any more.
  const idle = -Math.pow(Math.max(0, p.seasonsOut), 1.35) * 8.5;

  // The same base the soccer market needed, and for the same reason. Without
  // it one bad year pinned a coach at zero permanently, which is not "hard to
  // get another job", it is "the save is over", and the save being over is
  // exactly what this whole feature exists to prevent.
  const base = 34;
  return clamp(base + playing * 0.45 + record + pedigree + exit[p.departure] + idle, 0, 100);
}

/**
 * The best kind of job that will even consider you. A HARD ceiling, which is
 * the rule that stops a fired coach walking into a contender.
 */
export function bestCoachTierAvailable(p: CoachProfile): CoachTier | null {
  const s = coachStanding(p);
  // You cannot leap up from where you fell either. Teams hire at your level
  // or below, with one rung of stretch if you are genuinely in demand.
  const stretch = s >= 72 ? 1 : 0;
  const fromHistory = clamp(p.lastTier - stretch, 1, 4) as CoachTier;
  const fromStanding: CoachTier | null =
    s >= 78 ? 1 : s >= 60 ? 2 : s >= 40 ? 3 : s >= 8 ? 4 : null;
  if (fromStanding === null) return null;
  return Math.max(fromHistory, fromStanding) as CoachTier;
}

/**
 * How many teams come in for you. Zero is a real and common answer, which is
 * the whole point of building this rather than rehiring you automatically.
 */
export function coachOfferCount(p: CoachProfile, rng: () => number): number {
  const s = coachStanding(p);
  if (s < 12) return rng() < 0.07 ? 1 : 0;   // essentially out of the sport
  const base = (s - 12) / 26;                 // 0 at the floor, about 3.4 at the top
  const roll = base * (0.55 + rng() * 0.9);
  const idleCut = p.seasonsOut >= 2 ? 0.55 : 1;
  return clamp(Math.floor(roll * idleCut + (rng() < 0.35 ? 1 : 0)), 0, 4);
}

/**
 * The jobs that are actually open this cycle, at real franchises.
 *
 * Deliberately skewed ugly. Winning teams keep their coach, so the head
 * coaching chairs that come free are mostly attached to a rebuild, and a
 * contender only opens up when somebody retires or gets poached. Staff jobs
 * are always around because there are a lot more of them.
 *
 * A short vacancy list is its own honest reason to end a window with nothing:
 * some years the jobs you could actually take just are not open.
 */
export function coachingVacancies(sport: UsSport, rng: () => number = Math.random): CoachOpening[] {
  const teams = usTeamsFor(sport);
  const shuffled = [...teams].sort(() => rng() - 0.5);
  const headJobs = 3 + Math.floor(rng() * 5);   // 3 to 7, roughly a real hiring cycle
  const staffJobs = 4 + Math.floor(rng() * 5);  // 4 to 8
  const out: CoachOpening[] = [];
  for (let i = 0; i < headJobs && i < shuffled.length; i++) {
    const r = rng();
    const tier: CoachTier = r < 0.12 ? 1 : r < 0.42 ? 2 : 3;
    out.push({ team: shuffled[i], sport, tier, role: 'Head Coach' });
  }
  for (let i = headJobs; i < headJobs + staffJobs && i < shuffled.length; i++) {
    out.push({ team: shuffled[i], sport, tier: 4, role: pick(STAFF_ROLES[sport], rng) });
  }
  return out;
}

/** Does this franchise trust you? Your old team and your old employers do. */
function familiarity(p: CoachProfile, team: string): number {
  if (team === p.playedFor) return 1.28;
  if (p.workedFor.includes(team)) return 1.12;
  return 0.9;
}

/**
 * Round 126: exported so the wiring layer can write an honest brief when a
 * bigger job comes and takes you mid career. Before this the poached coach
 * carried his old job's brief into the new building, so a man being handed a
 * franchise was still being told to run his side of the ball.
 */
export function briefFor(tier: CoachTier, sport: UsSport, rng: () => number = Math.random): string {
  const trophy = titleWord(sport);
  const pool: Record<CoachTier, string[]> = {
    1: [`Win ${trophy}. There is no other version of a good season here.`,
        `The roster is built and the window is open. Do not waste it.`,
        `Anything short of ${trophy} gets both of us fired.`],
    2: ['Get us out of the first round for once.',
        'Make the playoffs and make them uncomfortable when we get there.',
        'We are close. Close is not the job, though.'],
    3: ['Develop the young guys and do not lose the room.',
        'We are not asking you to win yet. We are asking you to build something.',
        'Three years. Year one is allowed to be ugly.'],
    4: ['Run your side of the ball and show us you can run a building.',
        'Do the work nobody sees and wait for your turn.',
        'Fix one thing that is broken here and people will notice.'],
  };
  return pick(pool[tier], rng);
}

/** Round 126: exported for the same reason briefFor is. */
export function rosterFor(tier: CoachTier, rng: () => number = Math.random): string {
  const pool: Record<CoachTier, string[]> = {
    1: ['A finished roster with a real star and no excuses left.',
        'Veterans, money spent, and a front office that expects a parade.'],
    2: ['A playoff team with one hole nobody has filled.',
        'Good enough to be in it every year, not good enough to scare anyone.'],
    3: ['Draft picks, young legs, and a lot of losing to sit through first.',
        'A gutted roster and the patience they promised you in the interview.'],
    4: ['Somebody else is in charge. You get one room and total control of it.',
        'A staff seat, a good head coach to learn from, and no press conferences.'],
  };
  return pick(pool[tier], rng);
}

/**
 * Why this team came for you. Never arbitrary: the reason is drawn from the
 * factor that actually got you the interview, so the feed teaches you what
 * the market is rewarding.
 */
function reasonFor(p: CoachProfile, job: CoachOpening, rng: () => number): string {
  const playingNow = p.playingRep * Math.pow(0.92, Math.max(0, p.seasonsSinceRetired));
  const reasons: string[] = [];
  if (playingNow >= 55) reasons.push(`Half the building grew up watching you play, and winning ${titleWord(p.sport)} still means something in this league.`);
  if (p.ringsAsCoach >= 1) reasons.push('They want somebody who has already coached a team to the end of it.');
  if (p.playoffRoundsWon >= 3) reasons.push('You have won series. That is the shortest sentence on your resume and the only one they read twice.');
  if (p.seasonsCoached >= 8) reasons.push('They are buying experience, plain and simple.');
  if (job.team === p.playedFor) reasons.push('You played here. The owner has wanted this since the day you retired.');
  else if (p.workedFor.includes(job.team)) reasons.push('You have worked in this building before and people here remember it fondly.');
  if (job.tier === 3 && p.losingSeasons >= 2) reasons.push('They think you learned something losing, and they are about to lose a lot.');
  if (job.tier === 4 && p.seasonsCoached === 0) reasons.push('A friend on the staff vouched for you. That is genuinely how most of these start.');
  if (reasons.length === 0) reasons.push('Nobody better said yes at the money they are paying.');
  return pick(reasons, rng);
}

/**
 * Generate the offer feed. Returns an empty array often, and that is not a
 * bug, it is the feature: you get fired, your standing drops, you sit out a
 * season, and you find out whether anyone still wants you.
 */
export function generateCoachOffers(
  p: CoachProfile,
  openings: CoachOpening[],
  rng: () => number = Math.random,
): CoachOffer[] {
  const ceiling = bestCoachTierAvailable(p);
  if (ceiling === null) return [];
  const n = coachOfferCount(p, rng);
  if (n === 0) return [];

  const standing = coachStanding(p);
  const pool = openings
    .filter(o => o.tier >= ceiling)
    .map(o => {
      const fit = familiarity(p, o.team);
      // The very top of what you can get is a stretch for them as well as
      // for you, so the likeliest fit sits one rung below your ceiling.
      const gap = o.tier - ceiling;
      const tierWeight = gap === 0 ? 0.65 : gap === 1 ? 1 : 0.7;
      return { o, weight: fit * tierWeight * (0.6 + rng() * 0.8) };
    })
    .sort((a, b) => b.weight - a.weight);

  const out: CoachOffer[] = [];
  const seen = new Set<string>();
  for (const { o } of pool) {
    if (out.length >= n) break;
    if (seen.has(o.team)) continue;
    seen.add(o.team);
    out.push({
      ...o,
      brief: briefFor(o.tier, p.sport, rng),
      reason: reasonFor(p, o, rng),
      roster: rosterFor(o.tier, rng),
      keenness: Math.round(clamp(standing * familiarity(p, o.team) * (0.7 + rng() * 0.5), 5, 100)),
    });
  }
  return out;
}

function noteFor(offers: CoachOffer[], standing: number, first: boolean): string {
  if (offers.length === 0) {
    if (standing < 22) {
      return first
        ? 'Nothing. You were a player and that is all you were, and the phone knows the difference. Get on a staff somewhere small and start again.'
        : 'Nobody called. Not one team. The sport has moved on and you are going to have to give it a reason to look back.';
    }
    return first
      ? 'No offers this cycle. Front offices are slow on first time coaches. Sit tight and wait for somebody to panic in February.'
      : 'Quiet cycle. The jobs that opened were not jobs you could take. It happens, and it happens more the longer you sit.';
  }
  if (offers.length === 1) return 'One team came in. That is how nearly all of these start.';
  return `${offers.length} teams want to talk.`;
}

/**
 * The first job hunt, run the moment you announce it.
 *
 * An empty feed is legitimate here too. A career backup does not get handed a
 * clipboard and a title the day he retires, and the note says so out loud
 * rather than leaving a blank screen.
 */
export function retirementCoachHunt(
  sport: UsSport,
  c: UsCareerLike,
  rng: () => number = Math.random,
): CoachJobHunt {
  const profile = coachProfileFromCareer(sport, c);
  return runCoachJobHunt(profile, rng, true);
}

/** Every job hunt after the first one, judged on your coaching record. */
export function coachJobHunt(p: CoachProfile, rng: () => number = Math.random): CoachJobHunt {
  return runCoachJobHunt(p, rng, false);
}

function runCoachJobHunt(profile: CoachProfile, rng: () => number, first: boolean): CoachJobHunt {
  const standing = coachStanding(profile);
  const ceiling = bestCoachTierAvailable(profile);
  const openings = coachingVacancies(profile.sport, rng);
  const offers = generateCoachOffers(profile, openings, rng);
  return { profile, standing, ceiling, openings, offers, note: noteFor(offers, standing, first) };
}

/**
 * Fold a finished coaching season back into the profile, so the next job hunt
 * is judged on what you did in the chair rather than what you did in a jersey.
 *
 * `stillEmployed: false` is what a firing looks like from in here. Notice what
 * it does NOT do: it does not find you a new team. It moves you to the
 * unemployed clock and lets the next hunt decide.
 */
export function recordCoachSeason(
  p: CoachProfile,
  season: {
    tier: number;
    team?: string;
    wins?: number;
    losses?: number;
    madePlayoffs?: boolean;
    roundsWon?: number;
    champion?: boolean;
    losingSeason?: boolean;
    stillEmployed: boolean;
    departure?: CoachDeparture;
  },
): CoachProfile {
  // If the caller handed us a record, believe the record over the flag.
  const losing = season.losingSeason ?? (
    typeof season.wins === 'number' && typeof season.losses === 'number'
      ? season.wins < season.losses
      : false
  );
  const workedFor = season.team && !p.workedFor.includes(season.team)
    ? [...p.workedFor, season.team]
    : p.workedFor;
  return {
    ...p,
    seasonsCoached: p.seasonsCoached + 1,
    seasonsSinceRetired: p.seasonsSinceRetired + 1,
    ringsAsCoach: p.ringsAsCoach + (season.champion ? 1 : 0),
    playoffBerths: p.playoffBerths + (season.madePlayoffs || season.champion ? 1 : 0),
    playoffRoundsWon: p.playoffRoundsWon + Math.max(0, season.roundsWon ?? 0),
    losingSeasons: p.losingSeasons + (losing ? 1 : 0),
    lastTier: clampTier(season.tier),
    // Employed means the clock on being out of work has not started.
    seasonsOut: season.stillEmployed ? 0 : p.seasonsOut + 1,
    departure: season.departure ?? p.departure,
    workedFor,
  };
}

/** A season spent out of work. The only thing that changes is the clock. */
export function recordSeasonOut(p: CoachProfile): CoachProfile {
  return {
    ...p,
    seasonsSinceRetired: p.seasonsSinceRetired + 1,
    seasonsOut: p.seasonsOut + 1,
  };
}
