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
 *   - the recap and the fired and out of work screens are drawn (a save that loads straight into one of them
 *     waits for it in a holding box, then draws);
 *   - a press conference waits for an answer (Media eases a gamble through the host's XP effects);
 *   - a career box (Job market, Career, GM level) is opened.
 *
 * What the hub draws on every visit (the two career boxes, the record and XP readers, the GM level help, the
 * summer's ask the draft reads) stays static in src/lib/gmCareerFace.ts, so the boxes and the draft never wait;
 * a save older than the record draws its boxes from the save alone (hostBoxLegacy). The board's kitNeeded says
 * the same in code, and scripts/simFoLazyDesk.mjs, FrontOfficeLazyDesk.test.tsx and playGmCareer.mjs (Walk E)
 * hold it. Nothing here is evaluated at module scope: it only re-exports.
 *
 * Round 1559: what every sport's kit carries (the host's names, the tier reader, the out of work screen, the Phone
 * icon) is gmCareerKitCore.ts, re-exported whole; the NFL's own lines follow it.
 */
export * from '@/components/front-office-shared/gmCareerKitCore';
export { nflDeskHost } from '@/lib/gmDeskHostNfl';
export { nflAwayHost, nflLegacy, nflOutcome, nflTakeSeat } from '@/lib/nflGmCareer';
/* Round 1542: the season's awards, named in closeSeason beside the verdict (the same press, which waits for this
   kit), so the close and the shared ranking it calls are not in the page */
export { nflCloseSeasonStats } from '@/lib/nflSeasonAwards';
