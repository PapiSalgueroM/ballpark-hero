/**
 * Round 1223: the three career boxes every front office shares.
 *
 *   Job market   only while he is between seats (the phase is 'fired')
 *   Career       every club he has run, a mark a graded season
 *   GM level     his XP and the seven trees
 *
 * One list, built once at module level as GmDeskMount asks. A sport's facts
 * type extends GmCareerFacts and its own list spreads this one after its own
 * panels: a definition over the base facts fits a list over the sport's,
 * because the facts sit in argument position only.
 *
 * Each screen loads on demand (gmLazyPanel.tsx), so a board that mounts the
 * boxes pays for the three tiles and nothing else until one is tapped. What a
 * tile says is decided in src/lib/gmCareerFace.ts (re-exported by src/lib/gmDeskHost.ts).
 *
 * Round 1533 mounts it on the NFL board (the hub and the out of work screen).
 */
import type { GmPanelDef } from '@/lib/gmDesk';
/* Round 1550: the boxes' words from the part of the career every screen reads, never from the whole host, so a
   board that mounts these boxes does not download the market, the verdict and the year out with its page. */
import { hostCareerTile, hostMarketTile, hostXpTile } from '@/lib/gmCareerFace';
import type { GmCareerFacts } from '@/lib/gmDeskHost';
import { lazyGmPanel } from './gmLazyPanel';

export const GM_CAREER_KEYS = { market: 'seat', career: 'career', xp: 'xp' } as const;

/* Round 1561 (finding 9): a career screen's holding box stands at that screen's own height, measured at 390 by 844
   (the owner's phone) on both boards by scripts/playGmCareer.mjs Walk A, r1561-m: the Job market with one offer
   255 px, the Career screen of two clubs 184, the GM level screen 684, the same on the NFL and the NHL rows. At 320
   and 1280 the screens differ (270 to 285, 184, 729; 224, 167, 676), so there the walk asks only that nothing above
   the screen moves. The panel's own holding box (lazyGmPanel) and the board's, while the career kit is on its way
   (GmCareerKitHolding), read the same number. */
export const GM_CAREER_FLOORS = { [GM_CAREER_KEYS.market]: 255, [GM_CAREER_KEYS.career]: 184, [GM_CAREER_KEYS.xp]: 684 } as const;
/** The holding height of a career box by its key; a key that is not a career box keeps the lazy screen's 220. */
export const gmCareerFloor = (key: string | null | undefined): number =>
  (key && Object.prototype.hasOwnProperty.call(GM_CAREER_FLOORS, key) ? GM_CAREER_FLOORS[key as keyof typeof GM_CAREER_FLOORS] : 220);

const MARKET: GmPanelDef<GmCareerFacts> = {
  key: GM_CAREER_KEYS.market,
  title: 'Job market',
  tile: ({ facts }) => (facts.phase === 'fired' ? hostMarketTile(facts.career.market) : null),
  Panel: lazyGmPanel<GmCareerFacts>(() => import('./GmJobMarketPanel'), GM_CAREER_FLOORS[GM_CAREER_KEYS.market]),
};

const CAREER: GmPanelDef<GmCareerFacts> = {
  key: GM_CAREER_KEYS.career,
  title: 'Career',
  tile: ({ facts }) => hostCareerTile(facts.career.seat, facts.career.nameOf),
  Panel: lazyGmPanel<GmCareerFacts>(() => import('./GmCareerPanel'), GM_CAREER_FLOORS[GM_CAREER_KEYS.career]),
};

const XP: GmPanelDef<GmCareerFacts> = {
  key: GM_CAREER_KEYS.xp,
  title: 'GM level',
  tile: ({ desk, facts }) => hostXpTile(desk, facts.career.live, facts.career.deskOn),
  Panel: lazyGmPanel<GmCareerFacts>(() => import('./GmXpDeskPanel'), GM_CAREER_FLOORS[GM_CAREER_KEYS.xp]),
};

export const GM_CAREER_PANELS: readonly GmPanelDef<GmCareerFacts>[] = [MARKET, CAREER, XP];
