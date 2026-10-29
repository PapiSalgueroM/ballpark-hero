/* Round 1569: one way out of every screen, in all four US careers.

   A player report of 2026-10-26 (NBA My Career, "i cant start another game")
   came from a board that only offered New career on the retirement card. A
   career with under six seasons had no way out at all (Hang them up now
   waits for six), and the market, the extension talk, the curtain, the
   rival cards, the retirement talk, the coaching career and the road to the
   draft each replaced the hub with no way back to it.

   This control sits at the top of every screen the board draws once a
   career or a prospect exists. One tap opens the same confirmation the
   retirement card's New career opens (USCareerActionConfirm, action
   "restart"), and the second tap starts over. Cancel changes nothing. The
   reset it calls is the board's own: it removes this sport's save key and
   nothing else, so the record books and the other careers stay.

   It sticks just under the site's 44px menu bar (top-12 is 48px) while the
   board is on screen. Measured on the built site before this round: the
   board's own reveal scroll puts a new screen's top right under that bar, so
   a control drawn in the flow above it would be hidden under the bar on the
   very screens a player wants out of. The row lets taps through; only the
   pill takes them.

   data-career-start-over lets the board's parity replay leave it out
   (src/test/usBoardFixture.test.tsx), the way it leaves out every additive
   control since Round 992. */
import { RotateCcw } from 'lucide-react';
import USCareerActionConfirm from '@/components/us-career/USCareerActionConfirm';

interface Props {
  sport: 'NFL' | 'NBA' | 'MLB' | 'NHL';
  onConfirm: () => void;
}

export default function UsCareerStartOver({ sport, onConfirm }: Props) {
  return (
    <div data-career-start-over="" className="pointer-events-none sticky top-12 z-20 mb-2 flex justify-end">
      <USCareerActionConfirm action="restart" sport={sport} onConfirm={onConfirm}>
        <button type="button" className="pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-xs font-semibold text-muted-foreground shadow-sm hover:text-foreground">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Start over
        </button>
      </USCareerActionConfirm>
    </div>
  );
}
