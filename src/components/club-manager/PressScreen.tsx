import { cn } from '@/lib/utils';
import { Mic, Newspaper } from 'lucide-react';
import { pressOf, pressMoodLabel, PRESS_SILENCE } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import { useRevealScroll } from '@/hooks/useRevealScroll';

interface PressScreenProps {
  career: CareerState;
  onAnswer: (optionIdx: number) => void;
  onDuck: () => void;
}

/**
 * Round 135: the press room.
 *
 * One question at a time and never more than four things you can say back, so
 * the whole thing is one tap and you are out. That is deliberate: the loudest
 * complaint about press conferences in the games that already have them is that
 * they are a weekly form to fill in with one obviously correct box, and after a
 * season of that everybody delegates them forever. Here the press only turn up
 * when something has actually happened, there is a button that hands the whole
 * thing to your assistant, and every answer spends one thing to buy another so
 * there is no box that is always right.
 */
export function PressScreen({ career, onAnswer, onDuck }: PressScreenProps) {
  const press = pressOf(career);
  const q = press.pending;
  const askRef = useRevealScroll<HTMLDivElement>(`press:${q ? q.id : 'none'}`, { skipFirst: true });
  const moodTone = press.mood >= 60 ? 'text-emerald-400' : press.mood >= 40 ? 'text-muted-foreground' : 'text-red-400';

  return (
    <div className="space-y-2">
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
          <Newspaper className="w-3 h-3" /> The back pages
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-sm font-bold font-display', moodTone)}>{pressMoodLabel(press.mood)}</span>
          <span className="text-[9px] text-muted-foreground shrink-0">
            {press.answered} fronted up {'·'} {press.ducked} left to the assistant
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-1.5">
          <div
            className={cn('h-full rounded-full transition-all', press.mood >= 60 ? 'bg-emerald-500' : press.mood >= 40 ? 'bg-yellow-500' : 'bg-red-500')}
            style={{ width: `${Math.max(3, press.mood)}%` }}
          />
        </div>
        <p className="text-[9px] text-muted-foreground mt-1.5 leading-snug">
          The board do not watch every match, they read about it. Keep the papers onside and a defeat gets the benefit of the
          doubt upstairs. Let them turn on you and the same defeat costs you more.
        </p>
        {press.lastLine && (
          <p className="text-[10px] italic text-muted-foreground mt-1.5 border-t border-border/50 pt-1.5">{press.lastLine}</p>
        )}
      </div>

      <div ref={askRef}>
        {!q && (
          <div className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs text-muted-foreground">{PRESS_SILENCE}</p>
          </div>
        )}

        {q && (
          <div className="bg-card border border-gold/40 rounded-xl p-3">
            <div className="text-[10px] text-gold uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Mic className="w-3 h-3" /> Press conference
            </div>
            <p className="text-xs text-foreground leading-relaxed">{q.text}</p>
            <div className="space-y-1.5 mt-2.5">
              {q.options.map((o, i) => (
                <button
                  key={i}
                  onClick={() => onAnswer(i)}
                  className="w-full rounded-lg border border-border hover:border-primary px-2.5 py-2 text-left transition-colors"
                >
                  <span className="block text-[11px] font-bold text-foreground">{o.label}</span>
                  <span className="block text-[9px] text-muted-foreground mt-0.5">
                    {[
                      o.squad > 0.4 ? 'the dressing room will love it' : o.squad < -0.4 ? 'the dressing room will not enjoy it' : null,
                      o.subject > 0 ? 'he will walk in ten feet tall' : o.subject < 0 ? 'he will read it like everyone else' : null,
                      /* 0.25 and not 0.4: the safe answers are worth about a
                         third of a point of board confidence, and at the wider
                         threshold the boring option showed only its downside,
                         which made it look like a trap rather than a trade. */
                      o.board > 0.25 ? 'the board will like hearing it' : o.board < -0.25 ? 'the board will wince' : null,
                      o.mood > 0.9 ? 'a headline' : o.mood < -0.9 ? 'the press will not thank you' : null,
                      o.fire ? 'and the other lot will have it on their wall' : null,
                      o.sharpen ? 'and your own will go out with clear heads' : null,
                      o.list ? 'and he is on the list the moment you say it' : null,
                    ].filter(Boolean).join(' · ') || 'safe, and nobody will write a word about it'}
                  </span>
                </button>
              ))}
              <button
                onClick={onDuck}
                className="w-full rounded-lg border border-border/60 px-2.5 py-2 text-left hover:border-primary/40 transition-colors"
              >
                <span className="block text-[11px] font-bold text-muted-foreground">Send your assistant</span>
                <span className="block text-[9px] text-muted-foreground mt-0.5">
                  Nothing said, nothing gained. The papers make a small note of who did not turn up.
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PressScreen;
