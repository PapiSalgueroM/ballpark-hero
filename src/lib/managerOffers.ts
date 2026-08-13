/* ─── Round 107: what happens to you after you get sacked ───

   His ask, in two parts. First: "after their career as a player is finished
   they can playout as a manager", and "if someone gets fired as a manger they
   dont have to end their series but rather will have job oportunites". Then
   the part that actually matters: "but if u get fired it dosent mean u get
   good offers. it depends on many factors on the job offers u get".

   That second sentence is the whole design. A sacked manager who is simply
   handed another good job has learned nothing and risked nothing, and the
   sack stops meaning anything at all. So getting fired here drops you into
   an unemployed state with an offer feed that you have to have EARNED, and
   it is genuinely possible to open that feed and find nothing in it.

   What moves the needle, roughly in order of weight:

     PLAYING REPUTATION. A legend gets a look a journeyman never gets. This
     is the whole point of carrying a playing career forward into management:
     the Ballon d'Ors you won at 27 open doors at 45 that are shut to
     everyone else. It fades with time though, because the game moves on.

     WHAT YOU DID AS A MANAGER. Trophies and promotions travel. So do
     relegations, in the other direction.

     HOW YOU WENT OUT. Sacked after relegation is not the same as sacked
     narrowly missing Europe, and neither is the same as walking away on your
     own terms with your head high.

     HOW LONG YOU HAVE BEEN SITTING. Offers dry up. A year out is a story, a
     third year out is an answer.

     WHERE YOU FELL FROM. Clubs recruit at or below the level you last
     worked at. Falling down the pyramid is normal and climbing back is the
     game.

     WHO YOU ARE. Your own country and the leagues you have actually worked
     in trust you more than one you have never set foot in.

   Nothing here hands out an elite job to a manager who has not earned one.
   The ceiling on the tier you can be offered is hard.
*/

/** Club tiers, 1 is elite and 4 is the bottom of the playable pyramid. */
export type ClubTier = 1 | 2 | 3 | 4;

/** How the last job ended. This is the single biggest short term factor. */
export type Departure =
  | 'relegated'      // sacked after going down
  | 'sacked'         // sacked on results
  | 'mutual'         // left by mutual consent, the polite sack
  | 'resigned'       // walked away on your own terms
  | 'poached'        // left because someone better came in for you
  | 'retiredPlayer'; // your first job hunt, straight out of playing

export interface ManagerProfile {
  /** 0 to 100. Carried from the playing career: trophies, awards, caps. */
  playingRep: number;
  /** Seasons since you stopped playing. Playing reputation fades. */
  seasonsSinceRetired: number;
  /** Trophies won as a manager. */
  managerTrophies: number;
  /** Promotions won as a manager. Worth real money at the lower end. */
  promotions: number;
  /** Relegations suffered as a manager. */
  relegations: number;
  /** Seasons managed in total. Experience counts for something. */
  seasonsManaged: number;
  /** Tier of the last club you worked at. */
  lastTier: ClubTier;
  /** How the last job ended. */
  departure: Departure;
  /** Seasons sitting unemployed right now. */
  seasonsOut: number;
  /** Your nationality, matched against a club's country. */
  nationality: string;
  /** Countries whose leagues you have actually worked in. */
  workedIn: string[];
}

export interface JobOffer {
  club: string;
  country: string;
  tier: ClubTier;
  league: string;
  /** What the board will expect, in plain words. */
  brief: string;
  /** Why this club came for you, so the offer never feels arbitrary. */
  reason: string;
  /** Rough transfer budget, in millions. */
  budget: number;
  /** How much they want you: drives how long the offer stays open. */
  keenness: number;
}

export interface OfferClub {
  name: string;
  country: string;
  tier: ClubTier;
  league: string;
  budget: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Your standing in the game right now, 0 to 100. This is the number every
 * club looks at first.
 */
export function managerStanding(p: ManagerProfile): number {
  // Playing reputation is a real asset but a decaying one. Half life of
  // about eight seasons: what you did as a player is still opening doors a
  // decade later, just not as many.
  const playing = p.playingRep * Math.pow(0.92, Math.max(0, p.seasonsSinceRetired));

  // What you have actually done in the job. Trophies travel furthest,
  // promotions matter a lot at the bottom, relegations follow you.
  const record =
    p.managerTrophies * 9 +
    p.promotions * 6 +
    Math.min(p.seasonsManaged, 15) * 1.2 -
    p.relegations * 8;

  // Working at a big club is itself a credential, even if it ended badly.
  const pedigree = [0, 14, 9, 4, 0][p.lastTier] ?? 0;

  // How you went out, and how long ago. Sitting out is the quiet killer:
  // the first season out is a story you can tell, the third is a verdict.
  const exit: Record<Departure, number> = {
    relegated: -16,
    sacked: -9,
    mutual: -4,
    resigned: 0,
    poached: 8,
    retiredPlayer: 0,
  };
  const idle = -Math.pow(Math.max(0, p.seasonsOut), 1.35) * 8.5;

  // A floor of sorts: anyone who has done the job at all is a known
  // quantity, and the game has to leave a way back in from the bottom.
  // Without this base a single relegation pinned you at zero forever, which
  // is not "hard to get a good job", it is "the save is over", and that is
  // exactly what he asked me NOT to build.
  const base = 34;
  return clamp(base + playing * 0.45 + record + pedigree + exit[p.departure] + idle, 0, 100);
}

/**
 * The best tier of club that will even consider you. This is a HARD ceiling,
 * which is the rule that stops a sacked manager walking into an elite job.
 */
export function bestTierAvailable(p: ManagerProfile): ClubTier | null {
  const s = managerStanding(p);
  // You also cannot leap up the pyramid from where you fell. Clubs recruit
  // at your level or below, with one rung of stretch if you are in demand.
  const stretch = s >= 72 ? 1 : 0;
  const ceilingFromHistory = clamp(p.lastTier - stretch, 1, 4) as ClubTier;
  // Below about eight you are not a manager any more, you are a name in an
  // old programme. Everywhere above that there is always SOMETHING, even if
  // it is the worst job in the bottom division.
  const ceilingFromStanding: ClubTier | null =
    s >= 78 ? 1 : s >= 60 ? 2 : s >= 40 ? 3 : s >= 8 ? 4 : null;
  if (ceilingFromStanding === null) return null;
  return Math.max(ceilingFromHistory, ceilingFromStanding) as ClubTier;
}

/**
 * How many clubs come in for you. Zero is a real and common answer, which is
 * the point: being out of work has to be somewhere you can get stuck.
 */
export function offerCount(p: ManagerProfile, rng: () => number): number {
  const s = managerStanding(p);
  if (s < 8) return rng() < 0.08 ? 1 : 0;           // essentially unemployable
  const base = (s - 8) / 30;                         // 0 at the floor, ~3 at the top
  const roll = base * (0.55 + rng() * 0.9);
  // Sitting out a long time thins the feed even further.
  const idleCut = p.seasonsOut >= 2 ? 0.55 : 1;
  return clamp(Math.floor(roll * idleCut + (rng() < 0.35 ? 1 : 0)), 0, 4);
}

/** Does this club's country trust you? Home and worked-in count for a lot. */
function familiarity(p: ManagerProfile, country: string): number {
  if (country === p.nationality) return 1.25;
  if (p.workedIn.includes(country)) return 1.12;
  return 0.88;
}

function briefFor(tier: ClubTier, rng: () => number): string {
  const pool: Record<ClubTier, string[]> = {
    1: ['Win the league. Nothing else counts.', 'Win it, and go deep in Europe while you do it.', 'The title, and a squad that outlives you.'],
    2: ['Get us into Europe.', 'Push the top four and do not embarrass us in the cup.', 'Top six, and sell well.'],
    3: ['Mid table is fine. Stability is the job.', 'Stay up comfortably and bring the kids through.', 'Consolidate. No drama, no panic.'],
    4: ['Stay up. That is the whole brief.', 'Survive, and cut the wage bill while you do it.', 'Keep us in this division and we will talk again.'],
  };
  const opts = pool[tier];
  return opts[Math.floor(rng() * opts.length)];
}

/**
 * Why this club came for you. Never arbitrary: the reason is drawn from the
 * factor that actually got you the offer, so the feed teaches you what the
 * game is rewarding.
 */
function reasonFor(p: ManagerProfile, club: OfferClub, rng: () => number): string {
  const playingNow = p.playingRep * Math.pow(0.92, Math.max(0, p.seasonsSinceRetired));
  const reasons: string[] = [];
  if (playingNow >= 55) reasons.push('The board grew up watching you play and the fans have not forgotten either.');
  if (p.managerTrophies >= 2) reasons.push('They want someone who has actually lifted something.');
  if (p.promotions >= 1 && club.tier >= 3) reasons.push('You have got a club out of this division before and they know it.');
  if (club.country === p.nationality) reasons.push('They wanted someone who knows the country and the league.');
  if (p.workedIn.includes(club.country) && club.country !== p.nationality) reasons.push('You have worked here before and it went well enough to remember.');
  if (p.seasonsManaged >= 8) reasons.push('They are buying experience, plain and simple.');
  if (p.departure === 'relegated' && club.tier === 4) reasons.push('They are gambling that you learned something going down.');
  if (reasons.length === 0) reasons.push('Nobody else was interested at the money they are offering.');
  return reasons[Math.floor(rng() * reasons.length)];
}

/**
 * Generate the offer feed. Returns an empty array often, and that is not a
 * bug, it is the feature: you sit out a season, your standing drops, and you
 * find out whether anyone still wants you.
 */
export function generateJobOffers(
  p: ManagerProfile,
  clubs: OfferClub[],
  rng: () => number = Math.random,
): JobOffer[] {
  const ceiling = bestTierAvailable(p);
  if (ceiling === null) return [];
  const n = offerCount(p, rng);
  if (n === 0) return [];

  const standing = managerStanding(p);
  // Everyone at or below the ceiling is a candidate, weighted by how well
  // you fit and how much they would want you.
  const pool = clubs
    .filter(c => c.tier >= ceiling)
    .map(c => {
      const fit = familiarity(p, c.country);
      // A club one tier below your ceiling is the likeliest fit; the very
      // top of what you can get is a stretch for them as well as for you.
      const gap = c.tier - ceiling;
      const tierWeight = gap === 0 ? 0.65 : gap === 1 ? 1 : 0.7;
      return { club: c, weight: fit * tierWeight * (0.6 + rng() * 0.8) };
    })
    .sort((a, b) => b.weight - a.weight);

  const picked: JobOffer[] = [];
  const seen = new Set<string>();
  for (const { club } of pool) {
    if (picked.length >= n) break;
    if (seen.has(club.name)) continue;
    seen.add(club.name);
    picked.push({
      club: club.name,
      country: club.country,
      tier: club.tier,
      league: club.league,
      brief: briefFor(club.tier, rng),
      reason: reasonFor(p, club, rng),
      budget: club.budget,
      keenness: Math.round(clamp(standing * familiarity(p, club.country) * (0.7 + rng() * 0.5), 5, 100)),
    });
  }
  return picked;
}

/**
 * Turn a finished playing career into a starting reputation, 0 to 100.
 * Deliberately hard to max out: a genuinely great player lands in the 70s
 * and only an all time one clears 90.
 */
export function repFromPlayingCareer(input: {
  ballonDors?: number;
  leagueTitles?: number;
  championsLeagues?: number;
  worldCups?: number;
  caps?: number;
  careerGoals?: number;
  seasons?: number;
  peakOverall?: number;
}): number {
  const v =
    (input.ballonDors ?? 0) * 14 +
    (input.championsLeagues ?? 0) * 8 +
    (input.worldCups ?? 0) * 10 +
    (input.leagueTitles ?? 0) * 3.5 +
    Math.min(input.caps ?? 0, 150) * 0.12 +
    Math.min(input.careerGoals ?? 0, 400) * 0.04 +
    Math.min(input.seasons ?? 0, 20) * 0.6 +
    Math.max(0, (input.peakOverall ?? 60) - 60) * 0.9;
  return clamp(Math.round(v), 0, 100);
}
