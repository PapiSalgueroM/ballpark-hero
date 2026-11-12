/* Round 1048: the one element the US career board gains: "📺 Week by week",
   beside the Play button.

   A press first asks the host around the board to get the viewer ready (its
   chunks in memory), THEN presses the board's own Play (the same call,
   untouched) and asks the host to open the season that press played.
   The board supplies the resulting career. A caller that only supplies
   Play reads its result from a save that changed during the press. Ready comes
   first because a chunk that fails to load reloads the page (a tab left
   open across a release), and a season played before that would be lost
   from the screen: this way a failed load costs nothing. A press that opened
   a contract talk or the market saved no season, so nothing opens. With no
   host around the board (a test mounting the bare board) it is exactly the
   Play button.

   The board's handoff is the career it asked storage to keep, even when
   storage refuses the write and another tab has saved a season for the
   same year. A handoff with no played season leaves the viewer closed.

   It renders ONE root, so taking that root away gives back the old hub
   markup exactly (src/test/usBoardFixture.test.tsx projects it out). It
   draws nothing from Math.random, writes nothing, and its label never
   says "Play the": every walker that looks for the Play button still finds
   the Play button. A sport with no Season Center bound renders nothing. */
import { useContext, useEffect, useRef, useState, type MouseEvent } from 'react';
import type { UsCareerCore, UsCareerSeason, UsCareerSport } from '@/lib/usCareerSport';
import { UsSeasonCentreOpen } from '@/components/us-career/season/UsSeasonCentreHost';

/** Distinguish an empty key from storage that could not be read. */
function readSavedBytes(saveKey: string): string | null | undefined {
  try { return localStorage.getItem(saveKey); } catch { return undefined; }
}

/** The career written during Play for a caller that supplies no handoff. */
function readSavedCareer(saveKey: string, previous: string | null | undefined): UsCareerCore | null {
  if (previous === undefined) return null;
  const raw = readSavedBytes(saveKey);
  if (!raw || raw === previous) return null;
  try {
    const c = (JSON.parse(raw) as { c?: unknown }).c;
    return c && typeof c === 'object' ? (c as UsCareerCore) : null;
  } catch { return null; }
}

/** What a save and a read back would have made of the career the board holds. */
function copyOf(c: UsCareerCore | null | undefined): UsCareerCore | null {
  try { return c ? (JSON.parse(JSON.stringify(c)) as UsCareerCore) : null; } catch { return null; }
}

const playable = (row: UsCareerSeason | null | undefined): row is UsCareerSeason => !!row && row.games > 0 && row.teamResult !== 'SUSPENDED';

export function UsSeasonCentreEntry({ sport, career, busy, canPlay, onPlay, played }: {
  sport: UsCareerSport;
  career: UsCareerCore;
  /** The hub is busy (practice is open): the button is disabled like the rest. */
  busy: boolean;
  /** Recheck whether this press may play after the viewer finishes loading. */
  canPlay?: () => boolean;
  /** The board's own playSeason. */
  onPlay: () => void;
  /** The career produced by this press of Play, or null when no season was played. */
  played?: () => UsCareerCore | null;
}) {
  const centre = useContext(UsSeasonCentreOpen);
  const [loading, setLoading] = useState<'play' | 'watch' | null>(null);
  /* the hub as it is NOW, for the moment the viewer has finished loading */
  const now = useRef({ career, busy, canPlay, onPlay, played });
  now.current = { career, busy, canPlay, onPlay, played };
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  if (!sport.loadSeasonCentre) return null;
  const watchLabel = sport.slug === 'nba' ? 'Watch games' : 'Week by week';
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
    if (at.canPlay?.() === false) return;
    if (at.busy || at.career.seasons.length !== before || at.career.year !== year) return;
    const previous = centre && !at.played ? readSavedBytes(sport.saveKey) : undefined;
    at.onPlay();
    if (!centre) return;
    const result = at.played ? copyOf(at.played()) : readSavedCareer(sport.saveKey, previous);
    const row = result && Array.isArray(result.seasons) && result.seasons.length === before + 1 ? result.seasons[before] : null;
    if (result && playable(row) && row.year === year) centre.open({ career: result, row, from });
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
        /* Round 1212 (fix pass): on a phone the line sits under the Play button as a block of its own with a
           snug leading (a club's line runs to three or four lines there); from sm up it is inline, as it was */
        <span data-season-centre-held className="block text-[11px] leading-snug text-muted-foreground sm:inline">{held}</span>
      ) : (
        <button
          type="button"
          data-week-by-week
          disabled={busy}
          aria-busy={loading === 'play' || undefined}
          onClick={press}
          aria-label={`${watchLabel}: watch the ${career.year} season game by game`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted/40"
        >
          {loading === 'play' ? '📺 Loading...' : `📺 ${watchLabel}`}
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
