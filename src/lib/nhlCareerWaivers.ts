/*
   nhlCareerWaivers.ts, when an NHL My Career player needs waivers (Round 920)

   Decks A and C both tell waiver stories, and a review found them telling
   the same player opposite things: deck C said a second year skater could
   go down without waivers while deck A said he needed them, and with 79 to
   82 games a season both were wrong for most of the players who drew them.
   So the question is answered once, here, and both decks ask it.

   The current agreement, read 2026-10-03 from two sources:
   - A player is exempt from waivers until he has played 160 NHL games as a
     skater or 80 as a goalie, or until his exemption years run out,
     whichever comes first. The years for a player signed at 18 are five
     (skater) or six (goalie); at 19 they are four or five.
     dkpittsburghsports.com/2018/09/29/nhl-waiver-faq-calculator-tlh ;
     thehockeywriters.com/nhl-waiver-rules (160 games or five seasons at 18)
   - Every career here starts at 18 or 19 (nhlMyCareer.ts startNhlCareer),
     so only those two rows matter, and each side below holds under both.
     The first source also cuts the years for a teenager who plays eleven or
     more NHL games; that was not read twice, so neither side leans on it.
   - Neither source says whether playoff games count toward the 160. So the
     exempt side counts them and the required side does not, and each claim
     holds whichever way the rule really goes.
   - The draw runs between seasons and speaks about the season ahead, which
     is the player's yrs + 1 th: exempt needs that season inside the
     shortest years row (four, so yrs <= 2 keeps a margin of one), required
     needs it past the longest (five for a skater, six for a goalie).

   The 2005 agreement's table was not read twice, so a 2006-07 career gets
   these stories from the 2013-14 season on, like deck C's other agreement
   rules. Neither function draws from rng and neither touches the save.
*/
import type { NhlCareerState } from './nhlMyCareer';
import { nhlEraById } from './nhlMyCareer';

/** The current agreement is in force for the season ahead. */
const currentAgreement = (c: NhlCareerState): boolean => nhlEraById(c.eraId).id === 'now' || c.year >= 2013;
const gamesLimit = (c: NhlCareerState): number => (c.pos === 'G' ? 80 : 160);
const regularGames = (c: NhlCareerState): number => c.seasons.reduce((s, l) => s + (l.games || 0), 0);
const allGames = (c: NhlCareerState): number => c.seasons.reduce((s, l) => s + (l.games || 0) + (l.poGames || 0), 0);

/** Still exempt in the season ahead: the club can send him down and bring
 *  him back without waivers. */
export function nhlWaiverExempt(c: NhlCareerState): boolean {
  return currentAgreement(c) && c.seasons.length <= 2 && allGames(c) < gamesLimit(c);
}

/** No longer exempt in the season ahead: to send him down the club has to
 *  put him on waivers, and any other club can claim him. */
export function nhlWaiverRequired(c: NhlCareerState): boolean {
  return currentAgreement(c)
    && (regularGames(c) >= gamesLimit(c) || c.seasons.length >= (c.pos === 'G' ? 6 : 5));
}
