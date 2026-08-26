/**
 * Round 293: the home page's own checklist, for people who come back.
 *
 * Reads the local streak record (every visitor has one, signed in or not),
 * picks the dailies this person actually plays, and says per game whether
 * it is done today. Renders nothing for a first visit, so the fold that
 * playHomeFold measures for a fresh profile does not move.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getStreakState, getEtDateString } from '@/lib/streaks';
import { pickYourDailies, yourDailiesLine, type YourDaily } from '@/lib/yourDailies';

export function YourDailies() {
  const [list, setList] = useState<YourDaily[]>([]);
  useEffect(() => {
    try { setList(pickYourDailies(getStreakState().perGame, getEtDateString())); } catch { setList([]); }
  }, []);
  if (list.length === 0) return null;
  return (
    <section aria-label="Your dailies" data-no-prerender="true">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">📅 Your dailies</p>
        <span className="text-[11px] text-muted-foreground">{yourDailiesLine(list)}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {list.map(d => (
          <Link
            key={d.game.path}
            to={d.game.path}
            aria-label={`${d.game.label}, ${d.done ? 'done today' : 'not played yet today'}${d.streak > 0 ? `, ${d.streak} day streak` : ''}`}
            className={cn(
              'min-w-0 flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors',
              d.done ? 'border-primary/40 bg-primary/5' : 'border-border bg-card/80 hover:border-primary/40',
            )}
          >
            <span className="text-lg shrink-0" aria-hidden="true">{d.done ? '✅' : d.game.emoji}</span>
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block truncate">{d.game.label}</span>
              <span className="text-[10px] text-muted-foreground block truncate">
                {d.done ? (d.streak > 1 ? `done, ${d.streak} days running` : 'done today') : d.streak > 0 ? `${d.streak} day streak, play to keep it` : 'not yet today'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default YourDailies;
