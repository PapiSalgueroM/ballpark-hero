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
   sport's board reuses this file rather than rebuilding it.

   Round 530: the beat is a moment now. The card rises, the emoji and the
   title slam in, the line and the consequence follow, and the head to head
   block rises after them. Keyed on the beat's id so a second beat plays
   again and a re-render of the same one does not. The two ratings are
   printed as their final values from frame one (Round 147). Reduced motion
   lands every piece on its final frame through CelebrationStyles. */
import { CelebrationStyles } from '@/components/club-manager/Celebration';
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
    <div className="space-y-3" key={event.id} data-rivalry-event>
      <CelebrationStyles />
      <div className="cm-rise rounded-2xl border border-gold/40 bg-card p-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">🪞 Rivalry</p>
        <p className="cm-slam mt-1 text-3xl leading-none" style={{ animationDelay: '0.2s' }}>{event.emoji}</p>
        <p className="cm-slam mt-1.5 font-display text-lg font-black text-foreground" style={{ animationDelay: '0.3s' }}>{event.title}</p>
        <p className="cm-rise mt-2 text-sm leading-snug text-muted-foreground" style={{ animationDelay: '0.55s' }}>{event.description}</p>
        <p className="cm-tick-in mt-3 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-foreground" style={{ animationDelay: '0.75s' }}>{event.consequence}</p>
        {headToHead && (
          <div className="cm-rise mt-3 flex items-center justify-between rounded-xl bg-secondary/60 p-3" style={{ animationDelay: '1s' }}>
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
        className="cm-rise mx-auto flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
        style={{ animationDelay: headToHead ? '1.2s' : '0.95s' }}
      >
        Continue
      </button>
    </div>
  );
}
