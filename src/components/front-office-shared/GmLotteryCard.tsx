/* Round 1222: lottery night on a front office board. Unmounted for now: each
   sport's bind mounts it (lazily) at the top of its draft screen.

   A thin binding and nothing more. The one lottery presenter
   (src/components/lottery/LotteryReveal.tsx) draws the card; gmLotteryNight
   decides the rows and every word from the SAVED order. This file only joins
   the two, so the front offices and the US My Careers show one reveal and
   not two copies of it.

   It reads a saved order and never draws: a second look, a reload or a
   re-render shows the same night. `seen` draws the last frame at once, so a
   night somebody already watched is not staged again.

   WHAT IT MARKS IS HIS CLUB'S OWN PICK, the one its record earned. It is
   handed a saved order and a club, never the night's slots, so it cannot
   know a pick he traded away or one he bought: the tile says "your club"
   and the closing line says "your club's own pick", which is true either
   way. A bind that wants more hands the words in. */
import LotteryReveal from '@/components/lottery/LotteryReveal';
import { lotteryHelp, lotteryNight, lotteryNightRule } from '@/lib/gmLotteryNight';
import type { SavedDraftOrder } from '@/lib/gmDraftOrder';
import type { GmLotteryRules } from '@/lib/gmPicks';
import type { GmDraftOrderRules } from '@/data/gmDraftOrder/rules';

export interface GmLotteryCardProps {
  order: SavedDraftOrder;
  myClub: string;
  /** A club id as the text a tile shows. Text only, never a badge. */
  labelOf?: (club: string) => string;
  /** The rule set this build knows for the order's rule id, or null. */
  rules: GmDraftOrderRules | null;
  /** The table on the pick rules in use, for the rule line and the worked example. */
  lottery: GmLotteryRules | null;
  /** The night has been watched already. */
  seen?: boolean;
  onContinue?: () => void;
  continueLabel?: string;
}

export function GmLotteryCard({ order, myClub, labelOf, rules, lottery, seen = false, onContinue, continueLabel }: GmLotteryCardProps) {
  const view = lotteryNight(order, myClub, labelOf);
  const drawn = order.lottery !== null;
  return (
    <div data-gm-lottery={drawn ? 'drawn' : 'plain'}>
      <LotteryReveal
        rows={view.rows}
        ruleLine={lotteryNightRule(order, lottery)}
        eyebrow={drawn ? 'Lottery night' : 'The draft order'}
        headline={view.headline || undefined}
        help={lotteryHelp(order, rules, lottery)}
        onContinue={onContinue}
        continueLabel={continueLabel}
        reveal={view.reveal && !seen}
        drawn={drawn}
        mineLabel="your club"
      />
    </div>
  );
}

export default GmLotteryCard;
