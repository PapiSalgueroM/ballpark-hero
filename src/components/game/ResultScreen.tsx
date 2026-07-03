import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import ShareButtons from '@/components/game/ShareButtons';

interface ResultScreenStat {
  label: string;
  value: ReactNode;
}

interface ResultScreenProps {
  /** True for a win-styled headline (text-correct), false for a loss-styled
   *  one (text-destructive). Omit for a neutral, streak-style outcome (no
   *  fixed win/lose binary, e.g. HigherLowerTransfers) which renders the
   *  headline in text-primary instead. */
  won?: boolean;
  /** Big emoji or icon at the top of the card. */
  outcomeEmoji: ReactNode;
  /** Headline, e.g. "Correct!", "Game Over", "Run over at 12". */
  headline: string;
  /** Primary stat line under the headline, e.g. "You guessed X in 3 tries!". */
  statLine?: ReactNode;
  /** Optional fun fact / context line under the stat line. */
  funFact?: ReactNode;
  /** Optional row of secondary stats (score, streak, best), rendered as a
   *  horizontal row of label/value pairs. */
  statRow?: ResultScreenStat[];
  /** Emoji-grid block. Always rendered as a styled block (spec 3.6 item 5),
   *  even a one-line grid, never a bare <pre>. Pass a plain string; if a game
   *  genuinely has no natural grid, pass a one-line summary instead of
   *  omitting this prop, per Problem 6 in the R5 spec. */
  emojiGrid: string;
  /** Props forwarded to the shared ShareButtons component. `emojiGrid` is
   *  wired through automatically from the prop above. */
  share: {
    score: string;
    gameName: string;
    gamePath: string;
    customText?: string;
  };
  /** Slot for extra content between the emoji grid and the share row, e.g.
   *  PostGameStats. */
  children?: ReactNode;
  /** Play-again button. Omit to render no primary CTA (e.g. daily mode with
   *  no replay). */
  onPlayAgain?: () => void;
  playAgainLabel?: string;
  /** Optional secondary slot rendered under the play-again button, e.g. a
   *  "come back tomorrow" note or a play-next link. */
  playNext?: ReactNode;
  className?: string;
}

/**
 * Shared end-of-game card per R5 spec 3.6. Replaces both Footle's and
 * HigherLowerTransfers's hand-built game-over <div>s with one component.
 */
export function ResultScreen({
  won,
  outcomeEmoji,
  headline,
  statLine,
  funFact,
  statRow,
  emojiGrid,
  share,
  children,
  onPlayAgain,
  playAgainLabel = 'Play Again',
  playNext,
  className,
}: ResultScreenProps) {
  const headlineColor = won === true ? 'text-correct' : won === false ? 'text-destructive' : 'text-primary';

  return (
    <div
      className={cn(
        'bg-surface-1 border border-border rounded-2xl p-5 md:p-6 max-w-md w-full mx-auto text-center shadow-xl animate-in fade-in zoom-in-95 duration-300',
        className,
      )}
    >
      {/* 1. Emoji / icon, tuned per outcome tier */}
      <div className="text-5xl mb-3">{outcomeEmoji}</div>

      {/* 2. Headline */}
      <h2 className={cn('text-2xl font-display font-bold mb-1', headlineColor)}>
        {headline}
      </h2>

      {/* 3. Stat line (score, streak, guesses used) */}
      {statLine && <p className="text-foreground text-sm md:text-base mb-1">{statLine}</p>}

      {/* 4. Optional fun fact / context line */}
      {funFact && <p className="text-muted-foreground text-sm mt-1 mb-3">{funFact}</p>}

      {/* Optional stat row (secondary stats like current streak / best) */}
      {statRow && statRow.length > 0 && (
        <div className="flex items-center justify-center gap-4 mt-2 mb-1">
          {statRow.map((stat, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</span>
              <span className="text-base font-bold font-display text-foreground">{stat.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* 5. Emoji-grid block, ALWAYS rendered, styled not raw <pre> */}
      <div className="my-4 py-3 px-4 rounded-xl bg-surface-2 border border-border/60 font-mono text-lg leading-relaxed tracking-widest whitespace-pre-wrap break-words">
        {emojiGrid}
      </div>

      {children}

      {/* 6. Share row */}
      <ShareButtons
        score={share.score}
        gameName={share.gameName}
        gamePath={share.gamePath}
        customText={share.customText}
        emojiGrid={emojiGrid}
      />

      {/* 7. Play-again / play-next slots */}
      {onPlayAgain && (
        <button
          onClick={onPlayAgain}
          className="mt-5 inline-flex items-center gap-2 px-8 py-3 min-h-[44px] bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
        >
          {playAgainLabel}
        </button>
      )}
      {playNext && <div className="mt-4">{playNext}</div>}
    </div>
  );
}

export default ResultScreen;
