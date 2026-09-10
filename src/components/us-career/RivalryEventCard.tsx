/* ─── Round 521: the rivalry event card, drawn once ──────────────────────────

   A dismissible interstitial for one beat off careerRivalryEvents.ts: the
   emoji, the title, the narrated line, and what it did, with one Continue
   button. It also carries the flagship's head to head VS block (Soccer
   Career's own RivalryEventCard in SoccerCareer.tsx), since several beats
   (the NFL table's "Surpassed Your Rival!" among them) are specifically
   about that numeric gap and the data already exists on every save that
   has a rival. The comparison is optional: pass it when the host has a
   rival on hand, and the card degrades to just the beat when it does not.
   Kept in this component's own gold/bg-card language rather than copying
   the flagship's orange theme, since it is drawn inside each sport's own
   board alongside that board's other cards. Sport neutral otherwise:
   everything else comes in as a plain RivalryEvent prop, so a future
   sport's board reuses this file rather than rebuilding it. */
import type { RivalryEvent } from '@/lib/careerRivalryEvents';

export interface RivalryHeadToHead {
  myName: string;
  myRating: number;
  rivalName: string;
  rivalRating: number;
}

export function RivalryEventCard({
  event, onContinue, headToHead,
}: { event: RivalryEvent; onContinue: () => void; headToHead?: RivalryHeadToHead }) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-gold/40 bg-card p-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">🪞 Rivalry</p>
        <p className="mt-1 text-3xl leading-none">{event.emoji}</p>
        <p className="mt-1.5 font-display text-lg font-black text-foreground">{event.title}</p>
        <p className="mt-2 text-sm leading-snug text-muted-foreground">{event.description}</p>
        <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-foreground">{event.consequence}</p>
        {headToHead && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-secondary/60 p-3">
            <div className="flex-1 text-center">
              <div className="text-xs font-bold text-foreground">{headToHead.myName}</div>
              <div className="text-xl font-black text-gold">{headToHead.myRating}</div>
            </div>
            <div className="text-sm font-black text-muted-foreground">VS</div>
            <div className="flex-1 text-center">
              <div className="text-xs font-bold text-foreground">{headToHead.rivalName}</div>
              <div className="text-xl font-black text-muted-foreground">{headToHead.rivalRating}</div>
            </div>
          </div>
        )}
      </div>
      <button
        onClick={onContinue}
        className="mx-auto flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
      >
        Continue
      </button>
    </div>
  );
}
