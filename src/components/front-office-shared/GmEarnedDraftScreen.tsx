/* Round 1540: the earned draft night's screen, shared by every front office.

   Props only: it knows no sport, reads no save, draws no number and calls no
   engine. A board hands it the stage and the words (its own, in its own
   language), and three presses. The NBA Front Office binds it first; the NHL,
   MLB and NFL binds mount the same screen with their own words.

   SMALL TILES, NEVER A LONG PAGE. One heading tile, then EITHER the lottery
   card OR the run card with his board under it, never both. Every button is
   at least 44 px tall and nothing of this screen's own is under 12 px (the
   two shared cards and the lazy box keep their own small print).

   NO SPOILER. Before "Continue" the heading says the year, "Lottery night
   first." and the chances the board computed before the draw, nothing about
   where any pick landed, and it has no "?": closing a panel over a live card
   would remount it and play the night again. The card's own "?" carries the
   lottery's rules then. After it, the heading's "?" opens over the stage in a
   box that keeps the stage's size, the stage left in place and invisible, so
   no row of the run card plays twice and the page does not move.

   THE CARD IS LAZY, through lazyPart at module level (never in a render, or
   every render would remount it and replay the night). */
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { LotteryHelpBlock } from '@/lib/gmEarnedDraft';
import type { DraftNight } from '@/lib/draftNight';
import { DraftNightCard } from './DraftNightCard';
import { lazyPart } from './gmLazyPanel';
import type { GmLotteryCardProps } from './GmLotteryCard';

export type EarnedDraftScreenStage = 'lottery' | 'clock' | 'over';

/** The lottery card's first frame at 390 px wide, so the box the chunk lands in does not jump. */
export const LOTTERY_CARD_MIN_HEIGHT = 553;

/* Module level only (gmLazyPanel.tsx's one rule). */
const LotteryCard = lazyPart<GmLotteryCardProps>(() => import('./GmLotteryCard'), LOTTERY_CARD_MIN_HEIGHT);

export interface EarnedDraftChoice { id: string; name: string; sub: string; grade: number }
export interface EarnedDraftButton { label: string; onPress: () => void }

export interface GmEarnedDraftScreenProps {
  /** The draft's year as the heading prints it. */
  year: number;
  stage: EarnedDraftScreenStage;
  /** Stage lottery: the lines before the draw. */
  chances?: string[];
  /** Stages clock and over: the heading's lines. */
  lines?: string[];
  /** Stages clock and over: what the heading's "?" opens. */
  help?: LotteryHelpBlock[];
  /** Stage lottery: the card. */
  lottery?: GmLotteryCardProps | null;
  /** The last press's run of picks. */
  run?: { night: DraftNight; headline: string } | null;
  /** On the clock: his board, best first on his scout's read. */
  choices?: EarnedDraftChoice[];
  onPick?: (id: string) => void;
  /** On the clock: "Let your staff make your 2 picks". */
  staff?: EarnedDraftButton | null;
  /** Every slot used but the summer not run: "Finish the draft and the summer". */
  finish?: EarnedDraftButton | null;
  /** Stage over: the way to the hub. */
  onLeave?: () => void;
  error?: string;
}

export function GmEarnedDraftScreen({
  year, stage, chances = [], lines = [], help = [], lottery = null, run = null, choices = [], onPick, staff = null,
  finish = null, onLeave, error = '',
}: GmEarnedDraftScreenProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const blocks = stage === 'lottery' ? [] : help.filter(b => b.lines.length > 0);
  const open = helpOpen && blocks.length > 0;
  const rows = run && run.night.picks.length > 0 ? run : null;

  return (
    <div data-gm-earned-draft={stage} className="space-y-4">
      <div data-gm-draft-heading className="relative rounded-2xl border border-border bg-card px-12 py-4 text-center">
        <p className="font-display text-lg font-bold text-foreground">The {year} Draft</p>
        {stage === 'lottery' ? (
          <>
            <p className="mt-1 text-xs text-muted-foreground">Lottery night first.</p>
            {chances.length > 0 && (
              <div data-gm-draft-chances className="mt-1 space-y-1">
                {chances.map((l, i) => <p key={i} className="text-xs text-foreground">{l}</p>)}
              </div>
            )}
          </>
        ) : (
          <div data-gm-draft-lines className="mt-1 space-y-1">
            {lines.map((l, i) => <p key={i} className="text-xs text-muted-foreground">{l}</p>)}
          </div>
        )}
        {blocks.length > 0 && (
          <button
            type="button"
            data-gm-draft-help
            aria-label={open ? 'Back to the draft' : 'How draft night works'}
            aria-expanded={open}
            onClick={() => setHelpOpen(o => !o)}
            className="absolute right-2 top-2 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-secondary/60 text-sm font-black text-foreground hover:brightness-110"
          >
            {open ? '×' : '?'}
          </button>
        )}
      </div>

      {/* The stage, and the help drawn over it so the box holds its size. */}
      <div data-gm-draft-stage className={cn('relative', blocks.length > 0 && 'min-h-[16rem]')}>
        <div aria-hidden={open || undefined} className={cn('space-y-4', open && 'invisible')}>
          {stage === 'lottery' && lottery && <LotteryCard {...lottery} />}

          {stage === 'clock' && (
            <>
              {rows && <DraftNightCard night={rows.night} headline={rows.headline} />}
              {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
              {finish ? (
                <div className="rounded-2xl border border-border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground">Every pick of the draft is in. The summer still has to run.</p>
                  <button type="button" data-gm-draft-finish onClick={finish.onPress} className="mt-3 min-h-11 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">
                    {finish.label}
                  </button>
                </div>
              ) : (
                <>
                  {choices.length > 0 && (
                    <div data-gm-draft-board className="grid max-h-96 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                      {choices.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          data-gm-draft-choice={c.id}
                          onClick={() => onPick?.(c.id)}
                          className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left hover:border-primary/60"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-foreground">{c.name}</span>
                            <span className="block text-xs text-muted-foreground">{c.sub}</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-sm font-black text-primary">{c.grade}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {staff && (
                    <button type="button" data-gm-draft-staff onClick={staff.onPress} className="min-h-11 w-full rounded-full border border-border bg-secondary/60 px-4 py-2 text-sm font-bold text-foreground hover:brightness-110">
                      {staff.label}
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {stage === 'over' && (
            <div data-gm-draft-done className="space-y-4">
              {rows ? (
                <DraftNightCard night={rows.night} headline={rows.headline} onContinue={onLeave} />
              ) : (
                <div className="rounded-2xl border border-border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground">Your new season is ready.</p>
                  <button type="button" data-gm-draft-leave onClick={onLeave} className="mt-3 min-h-11 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">
                    Continue to the hub
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {open && (
          <div data-gm-draft-help-panel className="absolute inset-0 flex flex-col rounded-2xl border border-border bg-card">
            {/* Only the words scroll; the way back stays in sight under them. */}
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {blocks.map(b => (
                <div key={b.heading}>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{b.heading}</p>
                  {b.lines.map((l, i) => <p key={i} className="text-xs text-foreground">{l}</p>)}
                </div>
              ))}
            </div>
            <button
              type="button"
              data-gm-draft-help-close
              onClick={() => setHelpOpen(false)}
              className="mx-3 mb-3 mt-1 min-h-11 shrink-0 rounded-full border border-border bg-secondary/60 px-3 text-sm font-bold text-foreground hover:brightness-110"
            >
              Back to the draft
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default GmEarnedDraftScreen;
