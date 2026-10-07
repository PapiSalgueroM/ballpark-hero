/* Round 1048: the one element the US career board gains: "📺 Week by week",
   beside the Play button.

   It presses the board's own Play (the same call, untouched) and then asks
   the host around the board to open the season THAT PRESS SAVED, read back
   from the save's own bytes, so the season shown is the season on the save
   by construction and the board needs no second touch. A press that opened a
   contract talk or the market saved no season, so nothing opens. With no
   host around the board (a test mounting the bare board) it is exactly the
   Play button.

   It renders ONE root, so taking that root away gives back the old hub
   markup exactly (src/test/usBoardFixture.test.tsx projects it out). It
   draws nothing from Math.random, writes nothing, and its label never
   says "Play the": every walker that looks for the Play button still finds
   the Play button. A sport with no Season Center bound renders nothing. */
import { useContext, type MouseEvent } from 'react';
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

const playable = (row: UsCareerSeason | null | undefined): row is UsCareerSeason => !!row && row.games > 0 && row.teamResult !== 'SUSPENDED';

export function UsSeasonCentreEntry({ sport, career, busy, onPlay }: {
  sport: UsCareerSport;
  career: UsCareerCore;
  /** The hub is busy (practice is open): the button is disabled like the rest. */
  busy: boolean;
  /** The board's own playSeason. */
  onPlay: () => void;
}) {
  const open = useContext(UsSeasonCentreOpen);
  if (!sport.loadSeasonCentre) return null;
  const banned = (career.suspendedSeasons ?? 0) > 0;
  const held = banned ? '📺 Nothing to watch this year: you are suspended.' : sport.seasonCentreHeld?.(career.year, career.eraId) ?? null;
  const press = (e: MouseEvent<HTMLButtonElement>) => {
    if (busy) return;
    const from = e.currentTarget;
    const before = career.seasons.length;
    const year = career.year;
    onPlay();
    if (!open) return;
    const saved = readSavedCareer(sport.saveKey);
    const row = saved && Array.isArray(saved.seasons) && saved.seasons.length === before + 1 ? saved.seasons[before] : null;
    if (saved && playable(row) && row.year === year) open({ career: saved, row, from });
  };
  /* a season he already played (he answered a contract talk with "play it out", or just wants it again) */
  const last = career.seasons.length ? career.seasons[career.seasons.length - 1] : null;
  const watchLast = open && playable(last) && !sport.seasonCentreHeld?.(last.year, career.eraId) ? last : null;
  return (
    <span data-season-centre-entry className="mt-2 block sm:ml-2 sm:mt-0 sm:inline-block">
      {held ? (
        <span data-season-centre-held className="text-[11px] text-muted-foreground">{held}</span>
      ) : (
        <button
          type="button"
          data-week-by-week
          disabled={busy}
          onClick={press}
          aria-label={`Week by week: watch the ${career.year} season game by game`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted/40"
        >
          📺 Week by week
        </button>
      )}
      {watchLast && open && (
        <button
          type="button"
          data-watch-last
          disabled={busy}
          onClick={e => open({ career, row: watchLast, from: e.currentTarget })}
          className="ml-1 inline-flex min-h-11 items-center px-3 text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline"
        >
          ↺ Watch the {watchLast.year} season again
        </button>
      )}
    </span>
  );
}
