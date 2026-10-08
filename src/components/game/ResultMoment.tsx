import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/formatNumber';
import { SportGlyph, sportStyle } from '@/components/home/SportGlyph';
import { sportOf, SPORT_NAME } from '@/data/homeFront';

/**
 * Round 710: one result moment for every game.
 *
 * The owner, 2026-09-19, said he could see no difference on the site after a
 * month. The home page got its sport inks and drawn glyphs in Round 658; the
 * next thing every player meets is the end of a game, and each game drew that
 * its own way. This is the one piece they all share now: the sport's ink and
 * its drawn mark, the score the game already worked out, and one of three
 * honest states.
 *
 * What it never does: compute, round, award or record anything. The score is
 * whatever the game passes (since Round 1085 a bare number or an all digit
 * string is written with grouped thousands, 1,000 for 1000, and anything
 * else, 7/9 or $1.2M, is shown as given), and every points line, stat row
 * and share stays with the game that owns it.
 *
 * Motion is transforms and opacity only, on boxes whose size is fixed from
 * the first frame (the score pill is a fixed height), so nothing below it
 * moves while it plays. Every element is in the DOM with its final text from
 * the first render; under prefers-reduced-motion the animations are removed
 * and the settled frame shows at once. scripts/simResultMoment.mjs and
 * scripts/playReducedMotion.mjs hold both.
 */
export type ResultOutcome = 'win' | 'close' | 'loss';

/** The one line each state says, above the score. Plain and true in any game. */
export const RESULT_STATE_COPY: Record<ResultOutcome, string> = {
  win: 'Nailed it',
  close: 'Good try',
  loss: 'Not this time',
};

const HEADLINE_TONE: Record<ResultOutcome, string> = {
  win: 'text-correct',
  close: 'text-tile',
  loss: 'text-destructive',
};

/** Bigger for a short score, smaller for a long one, so "9/9" and "$1.25M" both sit in the pill. */
function scoreSize(score: ReactNode): string {
  const len = typeof score === 'string' || typeof score === 'number' ? String(score).length : 4;
  if (len <= 3) return 'text-4xl';
  if (len <= 6) return 'text-3xl';
  if (len <= 9) return 'text-2xl';
  return 'text-xl';
}

export interface ResultMomentProps {
  outcome: ResultOutcome;
  /** The game's route; the sport, its ink and its glyph come from the registry. */
  gamePath: string;
  /** The score exactly as the game worked it out, e.g. "7/9", "12", "$1.2M". */
  score?: ReactNode;
  /** A few words under the score saying what it counts, e.g. "cells", "streak". */
  scoreLabel?: string;
  /** The game's own headline. Rendered as the moment's h2. */
  headline?: ReactNode;
  /** The game's own emoji, worn as a sticker on the score (or in it, with no score). */
  badge?: ReactNode;
  /** Anything the game shows under the headline. */
  children?: ReactNode;
  className?: string;
}

export function ResultMoment({ outcome, gamePath, score, scoreLabel, headline, badge, children, className }: ResultMomentProps) {
  const sport = sportOf(gamePath);
  const hasScore = score !== undefined && score !== null && score !== '';
  const shownScore = typeof score === 'number' || typeof score === 'string' ? formatNumber(score) : score;
  return (
    <div
      data-result-moment={outcome}
      data-sport={sport}
      style={sportStyle(sport)}
      className={cn('relative isolate overflow-hidden rounded-xl border border-tile/40 bg-tile/10 px-4 pb-4 pt-3 text-center', className)}
    >
      {/* the sport's mark, drawn large in the corner the way the home stage does it */}
      <SportGlyph sport={sport} className="rm-mark pointer-events-none absolute -right-6 -top-6 -z-10 h-28 w-28 text-tile opacity-[0.14]" />

      <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-tile">
        <SportGlyph sport={sport} className="h-3.5 w-3.5 shrink-0" />
        {sport !== 'world' && <span>{SPORT_NAME[sport]}</span>}
        {sport !== 'world' && <span aria-hidden="true">·</span>}
        <span data-result-state>{RESULT_STATE_COPY[outcome]}</span>
      </p>

      {/* The pill's height is fixed, so the reveal can never push the page. */}
      <div className="relative mx-auto mt-3 h-20 w-max max-w-full">
        {outcome === 'win' && <span aria-hidden="true" className="rm-burst pointer-events-none absolute inset-0 rounded-full border-2 border-tile" />}
        <div
          className={cn(
            'rm-score relative grid h-20 min-w-[5.5rem] max-w-full place-items-center rounded-full border-[3px] bg-surface-1 px-5',
            outcome === 'loss' ? 'border-tile/50' : 'border-tile',
            outcome === 'win' && 'shadow-[0_0_28px_hsl(var(--tile)/0.35)]',
          )}
        >
          {hasScore ? (
            <span data-result-score className={cn('font-display font-extrabold leading-none tabular-nums text-foreground break-words', scoreSize(shownScore))}>
              {shownScore}
            </span>
          ) : badge ? (
            <span aria-hidden="true" className="text-4xl leading-none">{badge}</span>
          ) : (
            <SportGlyph sport={sport} className="h-10 w-10 text-tile" />
          )}
        </div>
        {hasScore && badge && (
          <span aria-hidden="true" className="rm-badge pointer-events-none absolute -right-3 -top-2 text-2xl leading-none">{badge}</span>
        )}
      </div>
      {scoreLabel && <p className="mt-1.5 text-xs text-muted-foreground">{scoreLabel}</p>}

      {headline && (
        <h2 className={cn('rm-head mt-2 text-2xl font-display font-bold leading-tight', HEADLINE_TONE[outcome])}>{headline}</h2>
      )}
      {children}

      <style>{`
        @keyframes rmPop { 0% { opacity: 0; transform: scale(.6); } 60% { opacity: 1; transform: scale(1.08); } 100% { opacity: 1; transform: none; } }
        @keyframes rmSettle { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: none; } }
        @keyframes rmRise { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: none; } }
        @keyframes rmBurst { 0% { opacity: .9; transform: scale(1); } 100% { opacity: 0; transform: scale(1.55); } }
        @keyframes rmMark { 0% { transform: rotate(-24deg) scale(.8); } 100% { transform: none; } }
        .rm-score { animation: rmPop 520ms cubic-bezier(.2,.8,.3,1.2) 80ms both; }
        [data-result-moment="loss"] .rm-score { animation: rmSettle 420ms ease-out 80ms both; }
        .rm-burst { opacity: 0; animation: rmBurst 900ms ease-out 360ms both; }
        .rm-badge { animation: rmPop 460ms cubic-bezier(.2,.8,.3,1.2) 420ms both; }
        .rm-head { animation: rmRise 380ms ease-out 240ms both; }
        .rm-mark { animation: rmMark 800ms ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .rm-score, .rm-badge, .rm-head, [data-result-moment="loss"] .rm-score { animation: none; opacity: 1; transform: none; }
          .rm-mark { animation: none; transform: none; }
          .rm-burst { display: none; }
        }
      `}</style>
    </div>
  );
}

export default ResultMoment;
