import { cn } from '@/lib/utils';
import { ConfettiBurst } from '@/components/club-manager/Celebration';
import { draftNightHeadline, pickDelayMs, PICK_STEP_MS } from '@/lib/draftNight';
import type { DraftNight } from '@/lib/draftNight';

/**
 * Round 515: draft night, shared by all four front offices.
 *
 * Pure presentation over draftNight.ts's decisions, the same split Round 186
 * used for the season curtain. Every fact on this card came from the engine's
 * own pick sequence; nothing here chooses anything.
 *
 * IT DOES NOT BLOCK. The card sits above a board that stays usable, so a player
 * who does not care can keep drafting through it and playGames does not read a
 * settling screen as a dead one. There is no dismiss button because there is
 * nothing to dismiss: the card is part of the page, not over it.
 *
 * Round 530: the FINAL pick is narrated too. Before this the last pick left for
 * the hub in the same commit it was made, so its reveal never reached a render
 * (Round 519 named that as not done). Now the board holds the draft screen after
 * the last pick and hands this card `onContinue`; the card draws a full width
 * "Continue to the hub" button under the rows, timed off the same clock the rows
 * land on (pickDelayMs of the last row plus one step), so it appears once the
 * last pick has settled. That is not a dismiss: the offseason has already run
 * by then and the button is simply the way off a draft that is over. Under
 * reduced motion it is there at once, like everything else here.
 *
 * REDUCED MOTION ENDS ON THE FINAL FRAME rather than cancelling. Every row here
 * starts at opacity 0 and animates in, so simply switching the animation off
 * would leave the whole pick list invisible, which is a worse bug than the one
 * being fixed. That is the mistake Round 423's note in Celebration.tsx warns
 * about, and this card is written to its rule.
 */
export function DraftNightCard({ night, onContinue }: { night: DraftNight; onContinue?: () => void }) {
  if (!night || night.picks.length === 0) return null;
  const mine = night.picks.find(p => p.mine);
  /* When the last row lands, plus the step the run leaves after it: the same
     arithmetic buildDraftNight uses for totalMs, taken from pickDelayMs here so
     the button and the rows cannot drift onto different clocks. */
  const continueAtMs = pickDelayMs(night.picks.length - 1) + PICK_STEP_MS;

  return (
    <div data-draft-night className="relative overflow-hidden rounded-2xl border border-border bg-card p-3">
      {/* Decoration only, and it removes itself for reduced motion. */}
      {mine && <ConfettiBurst seed={mine.overall + mine.playerName.length} count={18} />}

      <div className="relative">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">On the clock</p>
        <p className="fo-draft-head text-sm font-bold text-foreground">{draftNightHeadline(night)}</p>

        <ol className="mt-2 space-y-1">
          {night.picks.map((p, i) => (
            <li
              key={`${p.overall}-${p.playerName}`}
              className={cn(
                'fo-draft-row flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5',
                p.mine ? 'border-gold/50 bg-gold/10' : 'border-border bg-secondary/40',
              )}
              style={{ animationDelay: `${pickDelayMs(i)}ms` }}
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-foreground">
                  <span className="text-muted-foreground">{p.overall}. </span>
                  {p.team} {p.mine ? 'select' : 'take'} {p.playerName}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {p.pos}{p.mine ? ' · your pick' : ''}
                </span>
              </span>
              {/* The scouted grade, final from the frame it appears. Round 147's
                  rule: animate the row arriving, never a number counting up
                  through values that were never true. And it is the SCOUTED
                  grade, never the true rating, because the draft is built on
                  that error and printing the truth would give the game away. */}
              <span className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-xs font-black tabular-nums',
                p.mine ? 'bg-gold/20 text-gold' : 'bg-primary/15 text-primary',
              )}>
                {p.grade}
              </span>
            </li>
          ))}
        </ol>

        {onContinue && (
          <button
            type="button"
            data-draft-continue
            onClick={onContinue}
            className="fo-draft-continue mt-3 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
            style={{ animationDelay: `${continueAtMs}ms` }}
          >
            Continue to the hub
          </button>
        )}
      </div>

      <style>{`
        @keyframes foDraftIn {
          0% { opacity: 0; transform: translateY(6px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .fo-draft-row { opacity: 0; animation: foDraftIn 0.34s ease-out forwards; }
        .fo-draft-continue { opacity: 0; animation: foDraftIn 0.34s ease-out forwards; }
        @keyframes foDraftHead { 0% { opacity: 0; } 100% { opacity: 1; } }
        .fo-draft-head { opacity: 0; animation: foDraftHead 0.3s ease-out forwards; }
        /* Round 423's rule, and it matters more here than usual: every row above
           starts invisible, so cancelling the animation without landing it would
           hide the entire pick list from the people who asked for less motion.
           The rows end on their final frame instead, which is the whole board
           shown at once with no movement. The Continue button is on the same
           rule, or the way off the draft would be invisible to them. */
        @media (prefers-reduced-motion: reduce) {
          .fo-draft-row, .fo-draft-head, .fo-draft-continue {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}

export default DraftNightCard;
