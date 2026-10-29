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

   Where it sits (fix run of this round, after the review walked it). The
   first build made it sticky over the board's own column, and the board was
   a fragment, so its sticky parent was the page's main: it stayed pinned the
   whole page down, over the hub tiles, the offer cards' labels and the guide,
   and at 1280 a click on the Inbox tile's centre opened this confirmation.
   Now the board has its own wrapper (UsCareerBoard.tsx withSaveStatus), so
   nothing of this reaches past the board, and:
     - 1024px and wider (the reporter's 1318 x 647 Chromebook, 1280 x 900): it
       sticks just under the site's 44px menu bar (top-12 is 48px) in the
       empty margin beside the column, so it stays on screen through the
       board's reveal scrolls and covers nothing the board draws. The row is
       zero high there and lets taps through; only the pill takes them.
     - narrower (a phone has no margin): it sits in the flow at the top right
       of the board, above every screen, and covers nothing. A sticky pill on
       a phone could only sit over the column, and the reveal scroll lands
       every new card's top right corner exactly under it. The cost, said
       plainly: after a reveal scroll on a phone the control is a short
       scroll up, at the top of the board. It is on screen whenever a screen
       is opened from the top, as every saved career is.

   data-career-start-over lets the board's parity replay leave it out
   (src/test/usBoardFixture.test.tsx), the way it leaves out every additive
   control since Round 992. */
import { RotateCcw } from 'lucide-react';
import USCareerActionConfirm from '@/components/us-career/USCareerActionConfirm';

interface Props {
  sport: 'NFL' | 'NBA' | 'MLB' | 'NHL';
  onConfirm: () => void;
  /** Round 1569 (R3): the career being cleared is retired with a Hall of Fame card. */
  hallCard?: boolean;
  /** Round 1570: that card is up on the Hall wall, so it stays after the restart. */
  hallKept?: boolean;
}

export default function UsCareerStartOver({ sport, onConfirm, hallCard, hallKept }: Props) {
  return (
    <div data-career-start-over="" className="mb-2 flex justify-end lg:pointer-events-none lg:sticky lg:top-12 lg:z-20 lg:mb-0 lg:h-0">
      <USCareerActionConfirm action="restart" sport={sport} onConfirm={onConfirm} hallCard={hallCard} hallKept={hallKept}>
        <button type="button" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-xs font-semibold text-muted-foreground shadow-sm hover:text-foreground lg:pointer-events-auto lg:translate-x-[calc(100%+2rem)]">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Start over
        </button>
      </USCareerActionConfirm>
    </div>
  );
}
