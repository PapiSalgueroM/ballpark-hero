import { X } from 'lucide-react';
import { LEGEND_TARGET } from '@/hooks/useDailyLegend';

interface DailyLegendOverlayProps {
  streakDays: number;
  onDismiss: () => void;
}

/* ROUND 377: THE NUMBER IS DERIVED, AND IT USED TO BE TYPED.
   Both lines below said "all 37 games", which was true when the site had 37 and
   has been wrong ever since. One of them is the congratulation a winner reads,
   the other is the post they send to everyone they know. LEGEND_TARGET is the
   same list the award rule counts, so the copy and the rule cannot disagree
   again. */
export function DailyLegendOverlay({ streakDays, onDismiss }: DailyLegendOverlayProps) {
  const tweetText = encodeURIComponent(
    `I just completed all ${LEGEND_TARGET} daily games on douknowball.com today! 🏆 Can you beat that? #DoUKnowBall`
  );
  const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative bg-card border border-[hsl(var(--ft-gold)/0.4)] rounded-2xl p-8 md:p-12 max-w-md w-[90%] text-center shadow-2xl animate-in zoom-in-95 duration-500">
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Trophy */}
        <div className="text-7xl md:text-8xl mb-4 animate-bounce">🏆</div>

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold font-display text-[hsl(var(--ft-gold))] mb-3">
          🏆 Daily Legend!
        </h2>

        {/* Subtitle */}
        <p className="text-muted-foreground text-sm md:text-base mb-6 leading-relaxed">
          You completed all {LEGEND_TARGET} daily games today. Come back tomorrow to keep your streak alive!
        </p>

        {/* Streak */}
        <div className="inline-flex items-center gap-2 bg-secondary/60 border border-border rounded-xl px-5 py-3 mb-6">
          <span className="text-2xl">🔥</span>
          <div className="text-left">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Current Streak</p>
            <p className="text-xl font-bold text-foreground">
              {streakDays} {streakDays === 1 ? 'day' : 'days'}
            </p>
          </div>
        </div>

        {/* Share to Twitter/X */}
        <div>
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[hsl(var(--ft-gold))] text-black font-bold text-sm hover:opacity-90 transition-opacity"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share on X
          </a>
        </div>
      </div>
    </div>
  );
}
