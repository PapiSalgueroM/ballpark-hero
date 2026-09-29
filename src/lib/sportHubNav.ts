/**
 * Round 672: the three facts about each sport hub that every page needs.
 *
 * The footer on every page links all six hubs, and the home page links each
 * section heading to its hub. Both used to import SPORT_HUBS from
 * src/lib/sportHub.ts, which carries every hub's full copy (the why here
 * paragraph, the start here picks, the reference block, the FAQs, the about
 * block): about 47 KB of prose, so the entry chunk every page on the site
 * downloads was carrying six pages of writing that only the six hub pages
 * ever show. sweepWeight measured five routes over their budgets on
 * 2026-09-28 and this was the biggest thing on every one of them that the
 * page never uses.
 *
 * So the footer and the home page read this short list and the hub page
 * alone imports the copy. It is a second copy of three fields on purpose,
 * and the pair is guarded: scripts/simHubs.mjs fails unless this list names
 * the same hubs, in the same order, with the same h1 and the same category
 * titles as SPORT_HUBS. A new hub goes in both files.
 */
import type { CategoryTitle } from '@/data/gameRegistry';

export interface HubNav {
  route: string;
  h1: string;
  titles: CategoryTitle[];
}

export const HUB_NAV: HubNav[] = [
  { route: '/soccer', h1: 'Soccer Games', titles: ['Soccer'] },
  { route: '/pro-basketball', h1: 'Basketball Games', titles: ['Pro Basketball'] },
  { route: '/hockey', h1: 'Hockey Games', titles: ['Hockey'] },
  { route: '/pro-football', h1: 'Football Games', titles: ['Pro Football'] },
  { route: '/baseball', h1: 'Baseball Games', titles: ['Baseball'] },
  { route: '/college', h1: 'College Games Hub', titles: ['College Sports'] },
];
