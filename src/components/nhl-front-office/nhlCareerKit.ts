/**
 * Round 1559: the NHL Front Office's career kit, the code its board fetches when a screen needs the GM's career
 * (the season's close, the fired and out of work screens, a career box opened, a new front office), the way the NFL
 * board fetches src/components/front-office/nflCareerKit.ts (Round 1550). What every sport's kit carries is
 * gmCareerKitCore.ts, re-exported whole; the NHL's own lines follow it: its read adapter and its career file.
 *
 * THIS ROUND IS DARK: nothing imports this file or its loader yet. Round 1561 binds the NHL board to it, through
 * nhlCareerKitLoad.ts only, never statically (scripts/simFoLazyDesk.mjs holds that edge for the NFL and gains the
 * NHL's row with the board). Nothing here is evaluated at module scope: it only re-exports.
 */
export * from '@/components/front-office-shared/gmCareerKitCore';
export { nhlDeskHost } from '@/lib/gmDeskHostNhl';
export { nhlAwayHost, nhlLegacy, nhlOutcome, nhlTakeSeat } from '@/lib/nhlGmCareer';
