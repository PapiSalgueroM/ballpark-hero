/* ─── Round 521: the rivalry event card, drawn once ──────────────────────────

   A dismissible interstitial for one beat off careerRivalryEvents.ts: the
   emoji, the title, the narrated line, and what it did, with one Continue
   button, the same shape the flagship's own rivalry card has always used.
   Sport neutral: everything it shows comes in as a plain RivalryEvent prop,
   so a future sport's board reuses this file rather than rebuilding it. */
import type { RivalryEvent } from '@/lib/careerRivalryEvents';

export function RivalryEventCard({ event, onContinue }: { event: RivalryEvent; onContinue: () => void }) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-gold/40 bg-card p-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">🪞 Rivalry</p>
        <p className="mt-1 text-3xl leading-none">{event.emoji}</p>
        <p className="mt-1.5 font-display text-lg font-black text-foreground">{event.title}</p>
        <p className="mt-2 text-sm leading-snug text-muted-foreground">{event.description}</p>
        <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-foreground">{event.consequence}</p>
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
