/* Round 186: the season curtain, shared by all four career games. S-3's
   third pass. Pure presentation over usCareerReveal's decisions: the year
   slams in, the result lands a beat later, a title pours confetti and
   pulses, the story lines tick in one by one in engine order, and the
   stat line is the true final from frame one (the Round 147 rule: animate
   emphasis, never a number through false values). A suspended season gets
   the muted card and no theatre at all.

   The reveal is transient state on each board, never persisted: reload
   mid-curtain and the save opens on the same screen it always did. */

import { ConfettiBurst, CelebrationStyles } from '@/components/club-manager/Celebration';
import { cn } from '@/lib/utils';
import type { SeasonReveal } from '@/lib/usCareerReveal';

export function SeasonRevealCard({ reveal, onContinue }: { reveal: SeasonReveal; onContinue: () => void }) {
  const banned = reveal.resultTone === 'banned';
  const title = reveal.resultTone === 'title';
  /* Lines start after the header (0.05s) and result (0.25s) have landed. */
  const lineDelay = (i: number) => `${0.6 + i * 0.22}s`;
  const afterLines = 0.6 + reveal.lines.length * 0.22 + 0.15;
  return (
    <div
      data-season-reveal
      className={cn(
        'relative overflow-hidden rounded-2xl border p-4 text-center',
        banned ? 'border-border bg-secondary/40' : title ? 'border-gold/60 bg-card cm-win-pulse' : 'border-border bg-card',
      )}
    >
      <CelebrationStyles />
      {reveal.confetti && <ConfettiBurst seed={7} count={34} />}
      <p className="cm-slam text-[10px] font-bold uppercase tracking-widest text-muted-foreground" style={{ animationDelay: '0.05s' }}>
        {reveal.header}
      </p>
      <p className="cm-slam mt-0.5 text-xs text-muted-foreground" style={{ animationDelay: '0.15s' }}>{reveal.subHeader}</p>
      <p
        className={cn(
          'cm-slam mt-2 font-display text-xl font-black',
          banned ? 'text-muted-foreground' : title ? 'text-gold' : 'text-foreground',
        )}
        style={{ animationDelay: '0.25s' }}
      >
        {banned ? '🚫 ' : ''}{reveal.result}
      </p>
      {reveal.statLine && (
        <p className="cm-rise mt-1 text-xs font-semibold text-foreground" style={{ animationDelay: '0.45s' }}>
          {reveal.statLine}
        </p>
      )}
      {reveal.lines.length > 0 && (
        <div className="mt-3 space-y-1 text-left">
          {reveal.lines.map((l, i) => (
            <p
              key={i}
              className={cn(
                'cm-tick-in rounded-lg px-2.5 py-1.5 text-xs leading-snug',
                l.tone === 'award' ? 'bg-gold/10 font-semibold text-gold' : l.tone === 'sting' ? 'bg-destructive/10 text-foreground' : 'bg-background text-muted-foreground',
              )}
              style={{ animationDelay: lineDelay(i) }}
            >
              {l.text}
            </p>
          ))}
        </div>
      )}
      <button
        onClick={onContinue}
        className="cm-rise mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
        style={{ animationDelay: `${afterLines}s` }}
      >
        Continue
      </button>
    </div>
  );
}
