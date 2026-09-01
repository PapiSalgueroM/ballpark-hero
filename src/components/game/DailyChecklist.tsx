import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ALL_GAMES } from '@/data/gameRegistry';
import { completionSlugForPath } from '@/data/completionSlugs';
import { CheckCircle2, Circle } from 'lucide-react';

const DAILY_GAMES = ALL_GAMES.filter(g => g.daily);

function getLocalCompletions(): Set<string> {
  const today = new Date().toISOString().slice(0, 10);
  const completed = new Set<string>();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(today)) {
      try {
        const val = localStorage.getItem(key);
        if (val) {
          const parsed = JSON.parse(val);
          if (parsed.status && parsed.status !== 'playing') {
            // Try to extract game slug from key
            const slug = key.replace(/-?\d{4}-\d{2}-\d{2}/, '').replace(/-$/, '').replace(/^-/, '');
            if (slug) completed.add(slug);
          }
        }
      } catch { /* skip */ }
    }
  }
  return completed;
}

/* ROUND 376: A PATH IS NOT ALWAYS THE SLUG THE GAME RECORDS UNDER, and this
   stripped the slash and assumed it was. Six games record under a different
   name: the four Conquest boards as `<sport>-imperialism`, and the Quiz Board
   under the original route name it carried before Round 305 renamed it. All
   five are marked daily, so they appear on this list, and the box looked for
   `conquest`
   while the completion row said `conquest-imperialism`. Finishing the game
   never ticked it, on any day, for anyone.
   BOTH NAMES ARE ACCEPTED RATHER THAN SWAPPING ONE FOR THE OTHER, because the
   set this is tested against is mixed: the signed in half holds the recorded
   completion slugs, and the guest half is scraped out of localStorage key names
   just above, which follow each game's own storage prefix and are not
   guaranteed to be either one. Matching on either can fix the database side
   without risking the local side. */
function isDone(path: string, completed: Set<string>): boolean {
  return completed.has(path.replace(/^\//, '')) || completed.has(completionSlugForPath(path));
}

export function DailyChecklist() {
  const [completedSlugs, setCompletedSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadCompletions = async () => {
      const localCompleted = getLocalCompletions();

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const today = new Date().toISOString().slice(0, 10);
        const { data } = await supabase
          .from('daily_completions')
          .select('game_slug')
          .eq('user_id', user.id)
          .eq('date', today);

        if (data) {
          const dbSlugs = new Set(data.map(d => d.game_slug));
          // Merge local + db
          setCompletedSlugs(new Set([...localCompleted, ...dbSlugs]));
          return;
        }
      }

      setCompletedSlugs(localCompleted);
    };

    loadCompletions();
  }, []);

  const completedCount = DAILY_GAMES.filter(g =>
    isDone(g.path, completedSlugs)
  ).length;

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-display font-bold text-foreground">
          Today's Daily Games
        </h2>
        <span className="text-xs font-semibold text-muted-foreground">
          {completedCount}/{DAILY_GAMES.length} completed
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {DAILY_GAMES.map(game => {
          const done = isDone(game.path, completedSlugs);
          return (
            <Link
              key={game.path}
              to={game.path}
              className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-all
                ${done
                  ? 'border-correct/30 bg-correct/10 text-correct opacity-60'
                  : 'border-border bg-card text-foreground hover:border-primary/40'
                }`}
            >
              <span>{game.emoji}</span>
              <span className="whitespace-nowrap">{game.label}</span>
              {done
                ? <CheckCircle2 className="w-3.5 h-3.5 text-correct" />
                : <Circle className="w-3.5 h-3.5 text-muted-foreground" />
              }
            </Link>
          );
        })}
      </div>
    </section>
  );
}
