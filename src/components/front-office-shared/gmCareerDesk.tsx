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
 * tile says is decided in src/lib/gmDeskHost.ts.
 *
 * Not mounted by this round: nothing imports this file but its own test.
 */
import type { GmPanelDef } from '@/lib/gmDesk';
import { hostCareerTile, hostMarketTile, hostXpTile, type GmCareerFacts } from '@/lib/gmDeskHost';
import { lazyGmPanel } from './gmLazyPanel';

export const GM_CAREER_KEYS = { market: 'seat', career: 'career', xp: 'xp' } as const;

const MARKET: GmPanelDef<GmCareerFacts> = {
  key: GM_CAREER_KEYS.market,
  title: 'Job market',
  tile: ({ facts }) => (facts.phase === 'fired' ? hostMarketTile(facts.career.market, facts.career.pack) : null),
  Panel: lazyGmPanel<GmCareerFacts>(() => import('./GmJobMarketPanel')),
};

const CAREER: GmPanelDef<GmCareerFacts> = {
  key: GM_CAREER_KEYS.career,
  title: 'Career',
  tile: ({ facts }) => hostCareerTile(facts.career.seat, facts.career.nameOf),
  Panel: lazyGmPanel<GmCareerFacts>(() => import('./GmCareerPanel')),
};

const XP: GmPanelDef<GmCareerFacts> = {
  key: GM_CAREER_KEYS.xp,
  title: 'GM level',
  tile: ({ desk, facts }) => hostXpTile(desk, facts.career.live, facts.career.deskOn),
  Panel: lazyGmPanel<GmCareerFacts>(() => import('./GmXpDeskPanel')),
};

export const GM_CAREER_PANELS: readonly GmPanelDef<GmCareerFacts>[] = [MARKET, CAREER, XP];
