/**
 * Round 1533: the out of work screen. Every front office board mounts it on
 * phase 'fired', in place of the old fired screen whose one button deleted the
 * save. Written once for the four boards (the NFL binds it first; the NBA, MLB
 * and NHL mount the same component next round, with their own facts).
 *
 * Top to bottom: the card (who let him go, what the phone did, and after a
 * year out who won and how his old club finished without him: every fact read
 * off the league by the host), then the three career boxes (Job market,
 * Career, GM level), then a small link that starts a new front office. That
 * link deletes the save, so it takes two taps: the first says so, the second
 * does it, and tapping anything else drops the arm.
 *
 * While a box is open the card and the link are not drawn (the recap's own
 * rule), so an open box has the screen to itself. Nothing above the boxes
 * changes height when the arm or a box changes. Looking writes nothing: the
 * board hands its desk, or an empty one on a save whose desk was never opened.
 * Every word comes from src/lib/gmDeskHost.ts except the link's own two lines.
 */
import { useState } from 'react';
import { GmDeskMount } from './GmDeskMount';
import { GM_CAREER_PANELS } from './gmCareerDesk';
import type { GmDesk } from '@/lib/gmDesk';
import type { GmCareerFacts, HostCard } from '@/lib/gmDeskHost';
import type { GmSportKey } from '@/lib/gmSport';

export interface GmOutOfWorkProps<F extends GmCareerFacts> {
  sport: GmSportKey;
  /** hostOutOfWorkCard over the league, his record and the market. */
  card: HostCard;
  /** The board's desk, or readGmDesk(undefined) on a save whose desk is off. */
  desk: GmDesk;
  facts: F;
  open: string | null;
  onOpen: (key: string | null) => void;
  onDesk: (next: GmDesk) => void;
  /** The board's reset, called on the second tap of the link only. */
  onNewFrontOffice: () => void;
}

export function GmOutOfWork<F extends GmCareerFacts>({ sport, card, desk, facts, open, onOpen, onDesk, onNewFrontOffice }: GmOutOfWorkProps<F>) {
  const [armed, setArmed] = useState(false);
  const boxOpen = open !== null && GM_CAREER_PANELS.some(p => p.key === open);
  const openBox = (key: string | null) => { setArmed(false); onOpen(key); };
  const changeDesk = (next: GmDesk) => { setArmed(false); onDesk(next); };
  return (
    <div className="space-y-4" data-gm-out-of-work>
      {!boxOpen && (
        <div className="rounded-2xl border border-destructive/50 bg-card p-5 text-center" data-gm-out-card>
          <p className="text-3xl" aria-hidden="true">🪑</p>
          <p className="mt-2 font-display text-2xl font-black text-foreground">{card.title}</p>
          {card.lines.map(line => <p key={line} className="mt-2 text-sm text-muted-foreground">{line}</p>)}
        </div>
      )}
      <GmDeskMount<GmCareerFacts> sport={sport} desk={desk} facts={facts} panels={GM_CAREER_PANELS} open={open} onOpen={openBox} onDesk={changeDesk} />
      {!boxOpen && (
        <div className="text-center" data-gm-new-front-office>
          {armed && (
            <p className="mb-1 text-[12px] font-semibold text-destructive" data-gm-arm="restart">This deletes the save. Tap again to start over.</p>
          )}
          <button
            type="button"
            onClick={() => (armed ? onNewFrontOffice() : setArmed(true))}
            className="min-h-[44px] rounded-full px-4 text-[12px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Start a new front office
          </button>
        </div>
      )}
    </div>
  );
}

export default GmOutOfWork;
