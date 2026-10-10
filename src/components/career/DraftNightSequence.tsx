/* Round 1220: draft night, watched, in all four US My Careers.

   Pure presentation over src/lib/careerDraftNight.ts, the split the season
   curtain and the front offices' draft night already use: the lib decides
   which rows there are, this file says when each lands and what it looks
   like. Nothing here chooses a pick, a club or a grade.

   The rules it keeps:
   - EVERYTHING IS IN THE DOM FROM THE FIRST FRAME. Every row, the closing
     row and both buttons, so the card has its final height at once, the page
     never moves while the night plays and a keyboard user is never held.
   - IT DOES NOT BLOCK. "Start your career" is live from the first frame and
     "Skip to my pick" lands every row at once.
   - THE CLOCK IS HERE, not in the lib: a row arrives on a CSS delay from the
     celebration kit's revealDelay, and careerNightClock is the one place the
     pace is worked out. The whole night lands inside CAREER_NIGHT_CEILING_MS,
     the bound the front offices' night answers to, with a tenth in hand.
   - NO SPOILER BEFORE THE CLOSING ROW. Confetti only mounts once the row has
     landed (the kit's burst fires on mount), and the caller holds its own
     result words on the same clock (see ProspectJourney).
   - REDUCED MOTION ENDS ON THE FINAL FRAME: the kit's classes land visible,
     and the caller starts the night already skipped.
   - No other prospect is ever named. A pick is a number and a club.

   The lottery tile is the ONE shared presenter (Round 1222,
   src/components/motion/LotteryReveal.tsx). It is mounted, never copied, and
   only where the career engine models a lottery: the NBA, both eras. */
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CelebrationStyles, ConfettiBurst, revealAfter, revealDelay } from '@/components/club-manager/Celebration';
import { LotteryReveal } from '@/components/motion/LotteryReveal';
import { lotteryFactsFromWeights, lotteryRevealPace, lotteryRuleLine } from '@/lib/lotteryReveal';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { buildCareerDraftNight, careerNightGapLine, careerNightResultLine } from '@/lib/careerDraftNight';
import type { CareerNight } from '@/lib/careerDraftNight';
import { preDraftProjectionLine } from '@/lib/careerPreDraft';
import type { PreDraftDescriptor } from '@/lib/careerPreDraft';

/* The journey loads this file as one lazy chunk and reaches the builder
   through it, so the first chunk of a career page carries none of the night. */
export { buildCareerDraftNight };

/** The longest a night may take to land, whatever the sport and era. */
export const CAREER_NIGHT_CEILING_MS = 5000;
/** The share of the ceiling a night may use. The rest is headroom. */
const USE = 0.9;
/** Seconds the board waits before its first row, after the lottery if there is one. */
const LEAD = 0.3;
/** Seconds between rows at most: the front offices' pick step. */
const MAX_STEP = 0.4;
/** The breath before the closing row, and how long that row takes to land. */
const BEAT = 0.4;
const LAND = 0.4;

export interface CareerNightClock {
  /** When the first board row arrives, in seconds. */
  start: number;
  /** Seconds between board rows. */
  step: number;
  /** When the closing row starts to land. */
  closeAt: number;
  /** When it has landed: the night is over. */
  landedAt: number;
}

/** When everything lands. The step shrinks when a lottery has used part of
 *  the time, so no night can run past the allowed share of the ceiling. */
export function careerNightClock(night: CareerNight): CareerNightClock {
  const lotteryS = night.lottery.length ? lotteryRevealPace(night.lottery.length).totalMs / 1000 : 0;
  const start = Math.round((lotteryS + LEAD) * 1000) / 1000;
  const before = Math.max(0, night.board.length - 1);
  const allowed = (CAREER_NIGHT_CEILING_MS / 1000) * USE;
  const fit = Math.floor(((allowed - start - BEAT - LAND) / Math.max(1, before)) * 100) / 100;
  const step = Math.max(0.05, Math.min(MAX_STEP, fit));
  const closeAt = Math.round((revealAfter(before, start, step) + BEAT) * 1000) / 1000;
  return { start, step, closeAt, landedAt: Math.round((closeAt + LAND) * 1000) / 1000 };
}

export type CareerNightStage = 'live' | 'landed' | 'skipped';

export function DraftNightSequence({
  night, desc, draftYear, stage, onLanded, onSkip, onContinue,
}: {
  night: CareerNight;
  desc: PreDraftDescriptor;
  draftYear: number;
  /** live: the rows are arriving. landed: they arrived. skipped: last frame at once. */
  stage: CareerNightStage;
  onLanded: () => void;
  onSkip: () => void;
  onContinue?: () => void;
}) {
  /* The press brought the night in below the button. The buttons under the
     board are what must end up on screen, so the closing row above them is
     in view when it lands and the page does not move again after this. */
  const actionsRef = useRevealScroll<HTMLDivElement>('career-night', { skipFirst: false, block: 'end' });
  const clock = careerNightClock(night);
  const moving = stage !== 'skipped';
  const over = stage !== 'live';
  const closing = night.board[night.board.length - 1];
  const before = night.board.slice(0, -1);
  const L = desc.lottery;
  const first = night.lottery.find(r => r.slot === 1);

  return (
    <div data-career-night data-night-stage={stage} className="space-y-3">
      <CelebrationStyles />
      {L && night.lottery.length > 0 && (
        <LotteryReveal
          rows={night.lottery.map(r => ({ slot: r.slot, label: desc.teamLabel(r.team), seed: r.seed, moved: r.seed - r.slot }))}
          ruleLine={lotteryRuleLine(lotteryFactsFromWeights(L.combos, L.drawn))}
          eyebrow="The lottery"
          note="A simulated lottery. The order is generated for your career."
          headline={first ? `${desc.teamLabel(first.team)} hold the first pick.` : undefined}
          reveal={moving}
        />
      )}
      <div data-night-board className="relative overflow-hidden rounded-xl border border-border bg-card p-3">
        {/* Decoration, and only once the row has landed: the burst fires on mount. */}
        {over && closing.kind === 'you' && closing.round === 1 && <ConfettiBurst seed={closing.pick} count={18} />}
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{draftYear} draft</p>
          <p data-night-range className="text-xs">{preDraftProjectionLine(night.projection, 'had')}</p>
          <ol className="mt-2 space-y-1" aria-label="The draft board">
            {before.map((row, i) => (
              <li
                key={row.kind === 'gap' ? `gap-${row.from}` : row.kind === 'pick' ? `pick-${row.pick}` : i}
                data-night-row={row.kind}
                className={cn(
                  moving && 'cm-tick-in',
                  row.kind === 'gap'
                    ? 'px-2.5 py-1 text-xs italic text-muted-foreground'
                    : 'flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5 text-xs',
                )}
                style={moving ? { animationDelay: revealDelay(i, clock.start, clock.step) } : undefined}
              >
                {row.kind === 'gap' && careerNightGapLine(row)}
                {row.kind === 'pick' && (
                  <>
                    <span className="w-10 shrink-0 font-black tabular-nums">{row.pick}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{desc.teamLabel(row.team)}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">Round {row.round}</span>
                  </>
                )}
              </li>
            ))}
            <li
              data-night-row={closing.kind}
              className={cn(
                moving && (closing.kind === 'you' ? 'cm-slam' : 'cm-rise'),
                'rounded-lg border px-2.5 py-2',
                closing.kind === 'you' ? 'border-gold/50 bg-gold/10' : 'border-border bg-secondary/40',
              )}
              style={moving ? { animationDelay: `${clock.closeAt}s` } : undefined}
              onAnimationEnd={e => { if (e.target === e.currentTarget) onLanded(); }}
            >
              {closing.kind === 'you' && (
                <>
                  <span className="block text-sm font-black">Pick {closing.pick}: {desc.teamLabel(closing.team)}</span>
                  <span className="block text-xs">Your name is called. Round {closing.round}, pick {closing.pickInRound}.</span>
                </>
              )}
              {closing.kind === 'unpicked' && (
                <>
                  <span className="block text-sm font-black">The last pick is in.</span>
                  <span className="block text-xs">Your name was not called. Your first club: {desc.teamLabel(closing.team)}.</span>
                </>
              )}
            </li>
          </ol>
          {/* What a screen reader hears when the closing row lands. */}
          <p role="status" className="sr-only">{over ? careerNightResultLine(closing, desc.teamLabel) : ''}</p>
        </div>
      </div>
      <div ref={actionsRef} data-night-actions className={cn('grid scroll-mb-3 gap-2', !over && 'grid-cols-2')}>
        {!over && <Button variant="outline" className="w-full whitespace-normal" onClick={onSkip}>Skip to my pick</Button>}
        {onContinue && <Button className="w-full whitespace-normal" onClick={onContinue}>Start your career</Button>}
      </div>
    </div>
  );
}

export default DraftNightSequence;
