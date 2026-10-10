/* Round 1048: the one element the US career board gains: "📺 Week by week",
   beside the Play button.

   A press first asks the host around the board to get the viewer ready (its
   chunks in memory), THEN presses the board's own Play (the same call,
   untouched) and asks the host to open the season THAT PRESS SAVED, read
   back from the save's own bytes, so the season shown is the season on the
   save by construction and the board needs no second touch. Ready comes
   first because a chunk that fails to load reloads the page (a tab left
   open across a release), and a season played before that would be lost
   from the screen: this way a failed load costs nothing. A press that opened
   a contract talk or the market saved no season, so nothing opens. With no
   host around the board (a test mounting the bare board) it is exactly the
   Play button.

   Release AN: when the save does not hold that season (the browser's storage
   is full and refused the write, which the board plays through), the board
   hands over the career it just played, the object it asked the save to
   keep, and the viewer opens on that. Before, that press played the season
   and opened nothing, without a word. It is still never another tab's line:
   the season must be the one this press played, for the year he pressed.

   It renders ONE root, so taking that root away gives back the old hub
   markup exactly (src/test/usBoardFixture.test.tsx projects it out). It
   draws nothing from Math.random, writes nothing, and its label never
   says "Play the": every walker that looks for the Play button still finds
   the Play button. A sport with no Season Center bound renders nothing. */
import { useContext, useEffect, useRef, useState, type MouseEvent } from 'react';
import type { UsCareerCore, UsCareerSeason, UsCareerSport } from '@/lib/usCareerSport';
import { UsSeasonCentreOpen } from '@/components/us-career/season/UsSeasonCentreHost';

/** The career on the save, or null when storage is refused, empty or unreadable. */
function readSavedCareer(saveKey: string): UsCareerCore | null {
  try {
    const raw = localStorage.getItem(saveKey);
    const c = raw ? (JSON.parse(raw) as { c?: unknown }).c : null;
    return c && typeof c === 'object' ? (c as UsCareerCore) : null;
  } catch { return null; }
}

/** What a save and a read back would have made of the career the board holds. */
function copyOf(c: UsCareerCore | null | undefined): UsCareerCore | null {
  try { return c ? (JSON.parse(JSON.stringify(c)) as UsCareerCore) : null; } catch { return null; }
}

const playable = (row: UsCareerSeason | null | undefined): row is UsCareerSeason => !!row && row.games > 0 && row.teamResult !== 'SUSPENDED';

export function UsSeasonCentreEntry({ sport, career, busy, onPlay, played }: {
  sport: UsCareerSport;
  career: UsCareerCore;
  /** The hub is busy (practice is open): the button is disabled like the rest. */
  busy: boolean;
  /** The board's own playSeason. */
  onPlay: () => void;
  /** The career the board's last Play left a played season on, or null when
   *  that press played none. Asked only when the save does not hold the season. */
  played?: () => UsCareerCore | null;
}) {
  const centre = useContext(UsSeasonCentreOpen);
  const [loading, setLoading] = useState<'play' | 'watch' | null>(null);
  /* the hub as it is NOW, for the moment the viewer has finished loading */
  const now = useRef({ career, busy, onPlay, played });
  now.current = { career, busy, onPlay, played };
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  if (!sport.loadSeasonCentre) return null;
  const banned = (career.suspendedSeasons ?? 0) > 0;
  const held = banned ? '📺 Nothing to watch this year: you are suspended.' : sport.seasonCentreHeld?.(career.year, career.eraId, { pos: career.pos, team: career.team }) ?? null;
  const press = async (e: MouseEvent<HTMLButtonElement>) => {
    if (busy || loading) return;
    const from = e.currentTarget;
    const before = career.seasons.length;
    const year = career.year;
    if (centre) {
      /* the viewer first: nothing is played until it is in memory */
      setLoading('play');
      const ready = await centre.ready(from);
      if (!alive.current) return;
      setLoading(null);
      if (!ready) return;
    }
    /* the hub may have moved on while the viewer loaded (he pressed Play, or opened practice) */
    const at = now.current;
    if (at.busy || at.career.seasons.length !== before || at.career.year !== year) return;
    at.onPlay();
    if (!centre) return;
    const saved = readSavedCareer(sport.saveKey);
    const row = saved && Array.isArray(saved.seasons) && saved.seasons.length === before + 1 ? saved.seasons[before] : null;
    if (saved && playable(row) && row.year === year) { centre.open({ career: saved, row, from }); return; }
    /* the save does not hold the season (storage refused the write): the career the board just played,
       through the same JSON round trip a save and a read would have given it */
    const mine = copyOf(at.played?.());
    const own = mine && Array.isArray(mine.seasons) && mine.seasons.length === before + 1 ? mine.seasons[before] : null;
    if (mine && playable(own) && own.year === year) centre.open({ career: mine, row: own, from });
  };
  /* a season he already played (he answered a contract talk with "play it out", or just wants it again) */
  const last = career.seasons.length ? career.seasons[career.seasons.length - 1] : null;
  const watchLast = centre && playable(last) && !sport.seasonCentreHeld?.(last.year, career.eraId, { pos: career.pos, team: last.team }) ? last : null;
  const watch = async (e: MouseEvent<HTMLButtonElement>) => {
    if (busy || loading || !centre || !watchLast) return;
    const from = e.currentTarget;
    setLoading('watch');
    const ready = await centre.ready(from);
    if (!alive.current) return;
    setLoading(null);
    if (ready) centre.open({ career, row: watchLast, from });
  };
  return (
    <span data-season-centre-entry className="mt-2 block sm:ml-2 sm:mt-0 sm:inline-block">
      {held ? (
        <span data-season-centre-held className="text-[11px] text-muted-foreground">{held}</span>
      ) : (
        <button
          type="button"
          data-week-by-week
          disabled={busy}
          aria-busy={loading === 'play' || undefined}
          onClick={press}
          aria-label={`Week by week: watch the ${career.year} season game by game`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted/40"
        >
          {loading === 'play' ? '📺 Loading...' : '📺 Week by week'}
        </button>
      )}
      {watchLast && (
        <button
          type="button"
          data-watch-last
          disabled={busy}
          aria-busy={loading === 'watch' || undefined}
          onClick={watch}
          className="ml-1 inline-flex min-h-11 items-center px-3 text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline"
        >
          {loading === 'watch' ? '↺ Loading...' : `↺ Watch the ${watchLast.year} season again`}
        </button>
      )}
    </span>
  );
}
