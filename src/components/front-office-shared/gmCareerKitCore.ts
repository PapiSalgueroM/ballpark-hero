/**
 * Round 1559: what every Front Office career kit carries, whatever the sport (Round 1550's nflCareerKit.ts, the
 * host's names, the tier reader, the out of work screen and the Phone icon, moved here word for word), plus the
 * three feed lines a take and a year out print. A sport's kit is `export *` from this file plus its own adapter and
 * career names (src/components/front-office/nflCareerKit.ts, src/components/nhl-front-office/nhlCareerKit.ts).
 *
 * Re-exports only: nothing here is evaluated at module scope. It is never imported statically by a page; each
 * board fetches its kit through its loader when it needs it.
 */
export {
  hostArrivalLine, hostArriving, hostAwayRefusalLine, hostEarnsLine, hostMarket, hostNewSeat, hostOutOfWorkCard,
  hostPressOption, hostSeasonAway, hostSeasonVerdict, hostSeatTeams, hostSpendPoint,
  hostXpEffects, hostXpRecapLine,
  hostOfferGoneLine, hostTakeoverLine, hostSatOutLine,
} from '@/lib/gmDeskHost';
export { leagueTiers } from '@/lib/gmSeat';
export { GmOutOfWork } from '@/components/front-office-shared/GmOutOfWork';
/* the recap's See who is calling button, the one place a board draws it */
export { Phone } from 'lucide-react';
