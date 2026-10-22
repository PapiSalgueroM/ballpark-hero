/**
 * Round 1550: the NFL Front Office's career kit, the part of the GM career the board fetches when it needs it.
 *
 * Round 1533 bound the desk host to the board statically, and the page every visitor downloads grew by the whole
 * job market, the year out, the verdict, the seat packs and the out of work screen (/front-office 389.5K against
 * its 374K row). Almost none of it runs while a season is being played. This file is one chunk the board asks for
 * through nflCareerKitLoad.ts, and only at these moments:
 *
 *   - a new front office starts (his record opens at the tier of the club he took);
 *   - the season reaches its last week (the verdict at the close needs it, so it is on its way before the press);
 *   - the recap, the draft after it and the fired and out of work screens are drawn (a save that loads straight
 *     into one of them waits for it, then draws);
 *   - a career box (Job market, Career, GM level) is opened;
 *   - a save older than the record is on the hub (its record is read off the league through the adapter).
 *
 * What the hub draws on every visit (the two career boxes, the record and XP readers, the GM level help) stays
 * static in src/lib/gmCareerFace.ts, so the boxes never wait. Nothing here is evaluated at module scope: it only
 * re-exports.
 */
export {
  hostArrivalLine, hostArriving, hostAwayRefusalLine, hostEarnsLine, hostMarket, hostNewSeat, hostOutOfWorkCard,
  hostPressOption, hostSeasonAway, hostSeasonVerdict, hostSeatTeams, hostSpendPoint,
  hostXpEffects, hostXpRecapLine,
} from '@/lib/gmDeskHost';
export { leagueTiers } from '@/lib/gmSeat';
export { nflDeskHost } from '@/lib/gmDeskHostNfl';
export { nflLegacy, nflTakeSeat } from '@/lib/nflGmCareer';
export { GmOutOfWork } from '@/components/front-office-shared/GmOutOfWork';
/* the recap's See who is calling button, the one place the board draws it */
export { Phone } from 'lucide-react';
