/**
 * Round 1559: the NHL Front Office's career kit, the code its board fetches when a screen needs the GM's career
 * (the season's close, the fired and out of work screens, a career box opened, a new front office), the way the NFL
 * board fetches src/components/front-office/nflCareerKit.ts (Round 1550). What every sport's kit carries is
 * gmCareerKitCore.ts, re-exported whole; the NHL's own lines follow it: its read adapter and its career file.
 *
 * Round 1561 bound the NHL board to it, through nhlCareerKitLoad.ts only, never statically (scripts/simFoLazyDesk.mjs
 * holds that edge on its NHL row, sections 3 and 4). Nothing here is evaluated at module scope: it only re-exports.
 */
export * from '@/components/front-office-shared/gmCareerKitCore';
export { nhlDeskHost } from '@/lib/gmDeskHostNhl';
export { nhlAwayHost, nhlLegacy, nhlOutcome, nhlTakeSeat } from '@/lib/nhlGmCareer';
