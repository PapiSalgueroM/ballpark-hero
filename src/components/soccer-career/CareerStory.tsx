/* Round 974: the career story. Every season the engine clears its log, so a
   player fifteen seasons in could only ever read his last three lines. The
   engine now keeps each finished season (CareerState.story) and this screen
   reads it back: one small tile per season, tap one to read it, a back button
   to the list. The season in progress is the last tile, read straight off the
   live log. Lines are rendered on read, the same way the Latest Events card
   draws them (money in the player's currency, flags as images). */
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useRevealScroll } from "@/hooks/useRevealScroll";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TextWithFlags } from "@/components/FlagImg";
import { localizeMoney as money } from "@/lib/soccerCurrency";
import { cleanCareerStory, type CareerState, type CareerStorySeason } from "@/lib/soccerCareerEngine";

export interface StoryTile extends CareerStorySeason {
  key: string;
  /** the season still being written (or the last one, once he has retired) */
  current: boolean;
}

type StorySource = Pick<CareerState, "story" | "events" | "seasons" | "age" | "currentClub">;

/** Finished seasons oldest first, then the season in progress when its log
    has anything in it. Pure, so the page and the tests read the same list. */
export function storyTiles(career: StorySource): StoryTile[] {
  const tiles: StoryTile[] = cleanCareerStory(career.story).map((e, i) => ({ ...e, key: `s${i}`, current: false }));
  const lines = Array.isArray(career.events) ? career.events.filter(l => typeof l === "string") : [];
  if (lines.length > 0) {
    const row = career.seasons.length > 0 ? career.seasons[career.seasons.length - 1] : null;
    /* Next Season can stop on the retirement question before it writes the
       new year's row, so the year is counted from the age, not read off the
       last row. */
    const year = row ? row.year + (career.age - row.age) : 0;
    tiles.push({ key: "now", year, age: career.age, club: career.currentClub, lines, current: true });
  }
  return tiles;
}

/** The first year the story holds, when seasons before it were played under
    a build that did not keep them (a save from before Round 974). */
export function storyStartsLate(career: StorySource, tiles: StoryTile[]): number | null {
  const first = career.seasons.length > 0 ? career.seasons[0] : null;
  if (!first || tiles.length === 0) return null;
  return tiles[0].year > first.year ? tiles[0].year : null;
}

function SeasonTiles({ tiles, retired, onOpen }: { tiles: StoryTile[]; retired: boolean; onOpen: (key: string) => void }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" data-story-tiles>
      {tiles.map(t => (
        <button
          key={t.key}
          type="button"
          data-story-tile={t.key}
          onClick={() => onOpen(t.key)}
          className={`min-w-0 min-h-11 rounded-xl border p-2 text-left transition-colors ${t.current ? "border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20" : "border-border bg-muted/20 hover:bg-muted/40"}`}
        >
          <span className="flex items-center justify-between gap-1">
            <span className="text-sm font-black tabular-nums">{t.year}</span>
            {t.current && (
              <span className="rounded bg-emerald-500 px-1 py-0.5 text-[8px] font-black text-black">{retired ? "LAST" : "NOW"}</span>
            )}
          </span>
          <span className="block text-[10px] text-foreground/80 truncate">{t.club}</span>
          <span className="block text-[10px] text-muted-foreground">Age {t.age} · {t.lines.length + (t.more ?? 0)} {t.lines.length + (t.more ?? 0) === 1 ? "moment" : "moments"}</span>
        </button>
      ))}
    </div>
  );
}

function SeasonPage({ tile, retired, headingRef, onBack, onPrevious, onNext }: {
  tile: StoryTile; retired: boolean; headingRef: RefObject<HTMLHeadingElement>;
  onBack: () => void; onPrevious?: () => void; onNext?: () => void;
}) {
  return (
    <div className="space-y-3" data-story-season={tile.key}>
      <button type="button" onClick={onBack} data-story-back className="min-h-11 text-sky-400 text-xs font-bold px-2 rounded hover:bg-white/5">‹ All seasons</button>
      <div>
        <h3 ref={headingRef} tabIndex={-1} data-story-heading className="text-lg font-black outline-none">{tile.year}{tile.current ? (retired ? ", the last chapter" : ", this season") : ""}</h3>
        <div className="text-xs text-muted-foreground" data-story-identity>Age {tile.age} at {tile.club}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={!onPrevious} onClick={onPrevious} data-story-previous className="min-h-11 rounded border border-border px-2 text-xs font-bold hover:bg-muted/40 disabled:opacity-40">‹ Previous chapter</button>
        <button type="button" disabled={!onNext} onClick={onNext} data-story-next className="min-h-11 rounded border border-border px-2 text-xs font-bold hover:bg-muted/40 disabled:opacity-40">Next chapter ›</button>
      </div>
      <div className="space-y-1.5">
        {tile.lines.map((line, i) => (
          <div key={i} data-story-line className="text-xs text-foreground/80 flex items-start gap-2">
            <span className="shrink-0">›</span><span><TextWithFlags text={money(line)} size={14} /></span>
          </div>
        ))}
      </div>
      {(tile.more ?? 0) > 0 && (
        <p className="text-[10px] text-muted-foreground" data-story-more>Plus {tile.more} more from that season that did not fit in the book.</p>
      )}
    </div>
  );
}

function StoryBody({ career, dialog = false }: { career: StorySource & { retired: boolean }; dialog?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listPlace = useRef<{ key: string; top: number; pageY: number } | null>(null);
  const returning = useRef(false);
  const revealRef = useRevealScroll<HTMLDivElement>(open, { enabled: !dialog && open !== null, skipFirst: false });
  const tiles = storyTiles(career);
  const index = open === null ? -1 : tiles.findIndex(t => t.key === open);
  const tile = tiles[index] ?? null;
  const startsLate = storyStartsLate(career, tiles);

  useLayoutEffect(() => {
    if (open !== null) {
      if (dialog && revealRef.current) revealRef.current.scrollTop = 0;
      headingRef.current?.focus({ preventScroll: true });
    } else if (returning.current && listPlace.current) {
      const place = listPlace.current;
      if (revealRef.current) revealRef.current.scrollTop = place.top;
      revealRef.current?.querySelector<HTMLButtonElement>(`[data-story-tile="${place.key}"]`)?.focus({ preventScroll: true });
      if (!dialog) window.scrollTo({ top: place.pageY, behavior: "auto" });
      returning.current = false;
    }
  }, [open, dialog, revealRef]);

  const openTile = (key: string) => {
    listPlace.current = { key, top: revealRef.current?.scrollTop ?? 0, pageY: window.scrollY };
    setOpen(key);
  };
  return (
    <div ref={revealRef} className={dialog ? "min-h-0 overflow-y-auto p-4" : "space-y-2"} data-story-scroll>
      {tile ? <SeasonPage tile={tile} retired={career.retired} headingRef={headingRef}
        onBack={() => { returning.current = true; setOpen(null); }}
        onPrevious={index > 0 ? () => setOpen(tiles[index - 1].key) : undefined}
        onNext={index < tiles.length - 1 ? () => setOpen(tiles[index + 1].key) : undefined} /> : (
        <>
          {tiles.length === 0
            ? <p className="text-xs text-muted-foreground">Nothing written yet. Play a season and it starts here.</p>
            : <SeasonTiles tiles={tiles} retired={career.retired} onOpen={openTile} />}
          {startsLate !== null && (
            <p className="mt-2 text-[10px] text-muted-foreground" data-story-starts-late>The book starts in {startsLate}. Seasons before that were played before the story was kept.</p>
          )}
        </>
      )}
    </div>
  );
}

/** With onClose it is a dialog over the page (opened from Latest Events);
    without it, a card in the page (the retirement screen). */
export default function CareerStory({ career, onClose }: { career: StorySource & { retired: boolean }; onClose?: () => void }) {
  const opener = useRef(typeof document !== "undefined" ? document.activeElement as HTMLElement | null : null);
  if (!onClose) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 space-y-2" data-career-story="inline">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">📖 Career Story</span>
        <StoryBody career={career} />
      </div>
    );
  }
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent data-career-story="dialog"
        className="w-[calc(100%-1.5rem)] max-w-md max-h-[88dvh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 [&>button]:min-h-11 [&>button]:min-w-11"
        onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus({ preventScroll: true }); }}>
        <div className="border-b border-border px-4 py-3 pr-14">
          <DialogTitle className="text-base font-black">📖 Career Story</DialogTitle>
          <DialogDescription className="mt-1 text-xs">Your recorded moments, one season at a time.</DialogDescription>
        </div>
        <StoryBody career={career} dialog />
        <div className="border-t border-border px-4 py-3">
          <button type="button" onClick={onClose} data-story-close className="min-h-11 w-full rounded-lg border border-border text-xs font-bold hover:bg-muted/40">Back to your career</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
