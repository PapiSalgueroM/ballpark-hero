/* Round 1307: the NFL front office's Game Day tile, bound.

   The shared card (src/components/front-office-shared/GmGameDayCard.tsx)
   with the NFL's game day law and the words of its "?"
   (src/lib/gameLaws/nflGameDay.ts), and nothing more. The board reaches
   this file through a lazy import only, so the card, the story law, the
   match clock and the help sheet are one chunk that a week box asks for
   and the press never waits on. */
import { GmGameDayCard } from '@/components/front-office-shared/GmGameDayCard';
import { NFL_GAME_DAY, NFL_GAME_DAY_HELP } from '@/lib/gameLaws/nflGameDay';
import type { GmGameDayMount } from '@/lib/gmGameLog';

/** "w6" reads "Wk 6"; a playoff round keeps its own name. */
export const nflWhereLabel = (where: string): string => (/^w\d+$/.test(where) ? `Wk ${where.slice(1)}` : where);

export default function NflGameDay(props: GmGameDayMount) {
  return <GmGameDayCard {...props} law={NFL_GAME_DAY} help={NFL_GAME_DAY_HELP} whereLabel={nflWhereLabel} />;
}
