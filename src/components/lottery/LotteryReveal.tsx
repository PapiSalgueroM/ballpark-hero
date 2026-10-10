/* Round 1222: a lottery, turned over one club at a time. ONE presenter for
   every game that has a lottery: the front offices' lottery night and draft
   night in the US My Careers mount this same file.

   Pure presentation over rows somebody else's engine already drew. It knows
   no sport, no GM and no career: it is handed its rows, its rule line and its
   help as props, and src/lib/lotteryReveal.ts decides the pace and the words.

   The rules it keeps so a binder cannot forget them:
   - THE BOX NEVER CHANGES SIZE. Every tile is in the DOM from the first
     frame, face down, in a fixed two column grid ordered by pick. A face
     arrives by opacity and transform only, and the "?" opens its panel OVER
     the grid, inside the card's own box, so nothing under the card moves.
   - NO TIMERS. A tile turns on a CSS delay from the celebration kit's
     revealDelay. Nothing here reads a clock or schedules anything.
   - IT DOES NOT HOLD THE PLAYER. The continue button is in the DOM and live
     from the first frame. Pressed early, every tile lands at once and the
     caller moves on. The whole run of any field fits the pace rule in the
     lib, so the screen is never a wait either way.
   - EVERY NUMBER IS FINAL FROM THE FRAME IT APPEARS. What animates is the
     tile arriving, never a figure counting through values that were not true.
   - REDUCED MOTION ENDS ON THE FINAL FRAME. Every face starts invisible, so
     switching the animation off without landing it would hide the whole
     lottery from the people who asked for less motion.
   - CLUBS, NEVER PEOPLE. A tile is a club and a slot. Nobody is quoted. */
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { revealDelay } from '@/components/club-manager/Celebration';
import { cleanLotteryRows, lotteryMoveWords, lotteryRevealPace } from '@/lib/lotteryReveal';
import type { LotteryRevealRow } from '@/lib/lotteryReveal';

export interface LotteryRevealHelpBlock {
  /** "The league's rule", "This game's own", "A worked example". */
  heading: string;
  lines: string[];
}

export interface LotteryRevealProps {
  /** The tiles, in the order they turn over (the caller's: last slot first is a lottery's own drama). */
  rows: LotteryRevealRow[];
  /** One line under the heading, built from the table by lotteryRuleLine. */
  ruleLine: string;
  /** The small label above the heading. */
  eyebrow?: string;
  /** What the draw meant, in the caller's words. It arrives with the last tile. */
  headline?: string;
  /** One plain line that is there from the first frame (what is simulated, say). */
  note?: string;
  /** The rules and a worked example behind the "?". Without it there is no "?". */
  help?: LotteryRevealHelpBlock[];
  /** Without it there is no button: the caller has its own way on. */
  onContinue?: () => void;
  continueLabel?: string;
  /** False draws the last frame at once: an order with no draw, or a night already watched. */
  reveal?: boolean;
}

export function LotteryReveal({
  rows, ruleLine, eyebrow = 'Lottery night', headline, note, help, onContinue, continueLabel = 'Continue to the draft', reveal = true,
}: LotteryRevealProps) {
  const [settled, setSettled] = useState(!reveal);
  const [helpOpen, setHelpOpen] = useState(false);

  const turning = cleanLotteryRows(rows);
  if (turning.length === 0) return null;
  const pace = lotteryRevealPace(turning.length);
  const turnAt = new Map(turning.map((r, i) => [r.slot, i]));
  const grid = [...turning].sort((a, b) => a.slot - b.slot);
  const still = settled || !reveal;
  const blocks = (help ?? []).filter(b => b && b.heading && Array.isArray(b.lines) && b.lines.length > 0);

  return (
    <div
      data-lottery-reveal
      data-lottery-settled={still ? '' : undefined}
      className={cn('relative overflow-hidden rounded-2xl border border-border bg-card p-3', still && 'lr-settled')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
          <p data-lottery-rule className="text-xs text-foreground">{ruleLine}</p>
          {note && <p data-lottery-note className="mt-0.5 text-[10px] text-muted-foreground">{note}</p>}
        </div>
        {blocks.length > 0 && (
          <button
            type="button"
            data-lottery-help
            aria-label={helpOpen ? 'Back to the lottery' : 'How the lottery works'}
            aria-expanded={helpOpen}
            onClick={() => setHelpOpen(o => !o)}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/60 text-sm font-black text-foreground hover:brightness-110"
          >
            ?
          </button>
        )}
      </div>

      {/* The stage: the grid, and the help drawn over it so the box holds its size. */}
      <div data-lottery-stage className={cn('relative mt-2', blocks.length > 0 && 'min-h-[11rem]')}>
        <ol data-lottery-grid aria-hidden={helpOpen || undefined} className={cn('grid grid-cols-2 gap-1.5', helpOpen && 'invisible')}>
          {grid.map(r => (
            <li
              key={r.slot}
              data-lottery-slot={r.slot}
              data-lottery-mine={r.mine ? '' : undefined}
              className="relative h-12 overflow-hidden rounded-lg border border-border bg-secondary/40"
            >
              {/* Face down: the pick this tile is, and nothing else yet. */}
              <span aria-hidden className="absolute inset-0 flex items-center justify-center text-sm font-black tabular-nums text-muted-foreground/60">
                {r.slot}
              </span>
              <span
                data-lottery-face
                className={cn(
                  'lr-face absolute inset-0 flex items-center gap-2 px-2',
                  r.mine ? 'bg-gold/20 text-gold' : 'bg-card text-foreground',
                )}
                style={still ? undefined : { animationDelay: revealDelay(turnAt.get(r.slot) ?? 0, pace.start, pace.step) }}
              >
                <span className="w-5 shrink-0 text-center text-sm font-black tabular-nums">{r.slot}</span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold">{r.label}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    Seed {r.seed} · {lotteryMoveWords(r.moved)}{r.mine ? ' · yours' : ''}
                  </span>
                </span>
              </span>
            </li>
          ))}
        </ol>

        {helpOpen && (
          <div data-lottery-help-panel className="absolute inset-0 space-y-2 overflow-y-auto rounded-lg border border-border bg-card p-2.5">
            {blocks.map(b => (
              <div key={b.heading}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{b.heading}</p>
                {b.lines.map((l, i) => <p key={i} className="text-xs text-foreground">{l}</p>)}
              </div>
            ))}
            <button
              type="button"
              data-lottery-help-close
              onClick={() => setHelpOpen(false)}
              className="min-h-11 w-full rounded-full border border-border bg-secondary/60 px-3 text-xs font-bold text-foreground hover:brightness-110"
            >
              Back to the lottery
            </button>
          </div>
        )}
      </div>

      {/* The closing line holds its room from the first frame and arrives with the last tile. */}
      {headline && (
        <p
          data-lottery-headline
          className="lr-after mt-2 text-sm font-bold text-foreground"
          style={still ? undefined : { animationDelay: revealDelay(turning.length, pace.start, pace.step) }}
        >
          {headline}
        </p>
      )}

      {onContinue && (
        <button
          type="button"
          data-lottery-continue
          onClick={() => { setSettled(true); onContinue(); }}
          className="mt-3 min-h-11 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
        >
          {continueLabel}
        </button>
      )}

      <style>{`
        @keyframes lrTurn {
          0% { opacity: 0; transform: scaleY(0.2); }
          100% { opacity: 1; transform: scaleY(1); }
        }
        .lr-face { opacity: 0; animation: lrTurn 0.32s ease-out forwards; }
        @keyframes lrAfter { 0% { opacity: 0; } 100% { opacity: 1; } }
        .lr-after { opacity: 0; animation: lrAfter 0.3s ease-out forwards; }
        .lr-settled .lr-face, .lr-settled .lr-after { animation: none; opacity: 1; transform: none; }
        @media (prefers-reduced-motion: reduce) {
          .lr-face, .lr-after, .lr-settled .lr-face, .lr-settled .lr-after {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}

export default LotteryReveal;
