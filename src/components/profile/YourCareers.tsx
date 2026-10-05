import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { describeSave, savedGames, type SavedGame } from '@/data/continueSaves';
import { sportOf } from '@/data/homeFront';
import { SportGlyph, sportStyle } from '@/components/home/SportGlyph';
import { SAVED_FALLBACK } from '@/components/home/ContinueRow';

/** Where a player with no saves is pointed: the two deepest games. */
export const CAREER_STARTERS: readonly { path: string; label: string }[] = [
  { path: '/soccer-career', label: 'Soccer Career' },
  { path: '/club-manager', label: 'Club Manager' },
];

function browserStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Round 981: Your careers, on your own profile.
 *
 * The same list and the same reading rules as the home page's Continue
 * playing row (src/data/continueSaves.ts): every career, manager, dynasty,
 * front office and idle game this browser holds a save for, one small tile
 * each, straight back into it. Which tiles show is fixed on the first render
 * so the card never changes size; what each says is read from the save after
 * the page has drawn and lands in a line that already holds its height.
 *
 * Saves live in the browser they were played in, so a second device says so
 * plainly instead of showing an empty box with no reason.
 */
export default function YourCareers() {
  const [saved] = useState<SavedGame[]>(() => savedGames(browserStorage()));
  const [lines, setLines] = useState<Record<string, string>>({});

  useEffect(() => {
    if (saved.length === 0) return;
    const storage = browserStorage();
    const next: Record<string, string> = {};
    for (const { entry } of saved) {
      let raw: string | null = null;
      try { raw = storage ? storage.getItem(entry.saveKey) : null; } catch { raw = null; }
      const line = describeSave(entry, raw);
      if (line) next[entry.path] = line;
    }
    setLines(next);
  }, [saved]);

  return (
    <Card className="border-border/60" data-profile-careers="">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" /> Your careers
          </CardTitle>
          {saved.length > 0 && (
            <span className="text-sm font-semibold text-primary">{saved.length} saved</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {saved.length === 0 ? (
          <div className="space-y-2" data-profile-careers-empty="">
            <p className="text-sm text-muted-foreground">
              No careers saved in this browser yet. Careers live in the browser you play them in, so one started on another device stays there.
            </p>
            <div className="flex flex-wrap gap-2">
              {CAREER_STARTERS.map(s => (
                <Link
                  key={s.path}
                  to={s.path}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-surface-1 px-3 py-1.5 text-sm font-medium text-foreground hover:border-primary/60 hover:text-primary"
                >
                  Start {s.label} <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {saved.map(({ entry, game }) => {
              const sport = sportOf(game.path);
              return (
                <li key={game.path}>
                  <Link
                    to={game.path}
                    style={sportStyle(sport)}
                    data-profile-career={game.path}
                    className="group flex h-[64px] items-center gap-3 rounded-xl border border-border/60 bg-surface-1 px-3 transition-[border-color,background-color] duration-200 hover:border-tile/60 hover:bg-surface-2"
                  >
                    <span aria-hidden="true" className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-tile/15 text-lg ring-1 ring-inset ring-tile/25">
                      {game.emoji}
                      <span className="absolute -bottom-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-surface-1 text-tile ring-1 ring-tile/50">
                        <SportGlyph sport={sport} className="h-3.5 w-3.5" />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold leading-5 text-foreground group-hover:text-primary">
                        {game.label}
                      </span>
                      <span data-profile-career-line="" className="block truncate text-xs leading-4 text-muted-foreground">
                        {lines[entry.path] ?? SAVED_FALLBACK}
                      </span>
                    </span>
                    <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
