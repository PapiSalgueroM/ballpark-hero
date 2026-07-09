import { Flag, Play } from 'lucide-react';

/**
 * Shown the moment the FIRST bingo line completes (owner spec 2026-07-08):
 * the win is banked either way; the player chooses between cashing out now
 * or keeping the same board alive for bonus lines, with one extra strike
 * granted for the extended run and a blackout bonus for clearing all 24.
 */
interface FirstLineBannerProps {
  onBank: () => void;
  onContinue: () => void;
}

export function FirstLineBanner({ onBank, onContinue }: FirstLineBannerProps) {
  return (
    <div className="bg-card border-2 border-primary rounded-2xl p-5 text-center mb-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="text-4xl mb-1">🎉</div>
      <h3 className="text-xl font-bold text-primary font-display">BINGO! Line complete</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        Your win is banked. Keep playing this board for +100 points per extra line
        (with <span className="text-foreground font-semibold">+1 bonus strike</span>),
        and a +500 bonus if you black out all 24 tiles.
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={onContinue}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-bold hover:opacity-90 transition-opacity"
        >
          <Play className="w-4 h-4" /> Keep playing this board
        </button>
        <button
          onClick={onBank}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-border bg-secondary text-foreground font-semibold hover:bg-secondary/70 transition-colors"
        >
          <Flag className="w-4 h-4" /> Bank the win
        </button>
      </div>
    </div>
  );
}

/** Transient toast for every line completed AFTER the first (auto-cleared by the page). */
export function LineFlash({ lines }: { lines: number }) {
  return (
    <div className="mb-3 px-4 py-2 rounded-xl bg-primary/10 border border-primary text-center text-sm font-bold text-primary animate-in fade-in slide-in-from-top-2 duration-300">
      🔥 Line {lines} complete! +100 bonus
    </div>
  );
}

export default FirstLineBanner;
