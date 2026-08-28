/* ─── Round 109: the job market runs on the real football pyramid ───

   Rounds 107 and 108 built the machinery for what happens after you retire
   or get sacked, but they took the list of clubs as an argument, which meant
   the only thing that had ever run through them was a synthetic test pyramid
   of "England T2 Club 3". That is fine for proving the maths and useless as
   a game.

   This is the missing link: it turns Club Manager's real data, 186 clubs
   across nine leagues in seven countries, into the pool the job market draws
   from. So a Spanish forward who spent his career at Real Madrid retires and
   the calls come from real Spanish clubs at a level he can actually get,
   and the club he accepts is one the Club Manager engine already knows how
   to simulate. One save, one pyramid, no seams.
*/

import { REAL_LEAGUES, NATIONS, playableClubs } from './clubManager';
import type { OfferClub, ManagerProfile, JobOffer } from './managerOffers';
import { generateJobOffers } from './managerOffers';

/** Which country a league belongs to, straight from the nation table. */
function countryOfLeague(leagueId: string): string {
  const nation = NATIONS.find(n => n.leagueIds.includes(leagueId));
  return nation ? nation.name : 'Unknown';
}

let CACHE: OfferClub[] | null = null;

/** Round 310: promotion and relegation move clubs between leagues per save,
 *  so the "built once" premise below only holds per registered membership.
 *  registerLeagueOverrides calls this on every registration, which keeps
 *  the pool honest without this cache learning any override signature. */
export function invalidateOfferClubCache(): void {
  CACHE = null;
}

/**
 * Every club in the game, as the job market sees it. Built once and cached,
 * because it is pure and gets asked for on every render of the offer screen.
 */
export function allOfferClubs(): OfferClub[] {
  if (CACHE) return CACHE;
  const out: OfferClub[] = [];
  for (const league of REAL_LEAGUES) {
    const country = countryOfLeague(league.id);
    for (const c of playableClubs(league.id)) {
      out.push({
        name: c.name,
        country,
        tier: c.tier,
        league: league.name,
        budget: c.budget,
      });
    }
  }
  CACHE = out;
  return out;
}

/** The clubs currently without a manager, which is who can actually hire. */
export function vacancies(rng: () => number = Math.random, exclude: string[] = []): OfferClub[] {
  const skip = new Set(exclude);
  // Roughly one club in six is between managers at any given point, which is
  // about right for a real season's worth of churn and keeps the market from
  // feeling like every job in the world is open at once.
  return allOfferClubs().filter(c => !skip.has(c.name) && rng() < 0.17);
}

/**
 * The offer feed against the real pyramid. `exclude` is normally the club
 * that just sacked you, because they are not about to hire you back.
 */
export function realJobOffers(
  profile: ManagerProfile,
  rng: () => number = Math.random,
  exclude: string[] = [],
): JobOffer[] {
  const open = vacancies(rng, exclude);
  // If the churn roll came up thin, fall back to the whole pyramid rather
  // than handing the player an empty screen for a reason that is not about
  // him. Being unwanted should be earned, not a dice roll on vacancies.
  const pool = open.length >= 12 ? open : allOfferClubs().filter(c => !exclude.includes(c.name));
  return generateJobOffers(profile, pool, rng);
}

/** Countries the job market covers, for the UI to show at a glance. */
export function marketCountries(): string[] {
  return [...new Set(allOfferClubs().map(c => c.country))].sort();
}
