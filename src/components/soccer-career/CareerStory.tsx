/* Round 974: the career story. Every season the engine clears its log, so a
   player fifteen seasons in could only ever read his last three lines. The
   engine now keeps each finished season (CareerState.story) and this screen
   reads it back: one small tile per season, tap one to read it, a back button
   to the list. The season in progress is the last tile, read straight off the
   live log. Lines are rendered on read, the same way the Latest Events card
   draws them (money in the player's currency, flags as images). */
import { useState } from "react";
import { focusDialogOnMount, escapeCloses } from "@/lib/dialogA11y";
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
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-story-tiles>
      {tiles.map(t => (
        <button
          key={t.key}
          type="button"
          data-story-tile={t.key}
          onClick={() => onOpen(t.key)}
          className={`rounded-xl border p-2.5 text-left transition-colors ${t.current ? "border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20" : "border-border bg-muted/20 hover:bg-muted/40"}`}
        >
          <span className="flex items-center justify-between gap-1">
            <span className="text-base font-black tabular-nums">{t.year}</span>
            {t.current && (
              <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black text-black">{retired ? "LAST" : "NOW"}</span>
            )}
          </span>
          <span className="block text-[10px] text-muted-foreground truncate">Age {t.age}, {t.club}</span>
          <span className="block text-[10px] text-muted-foreground">{t.lines.length + (t.more ?? 0)} {t.lines.length + (t.more ?? 0) === 1 ? "moment" : "moments"}</span>
        </button>
      ))}
    </div>
  );
}

function SeasonPage({ tile, retired, onBack }: { tile: StoryTile; retired: boolean; onBack: () => void }) {
  return (
    <div className="space-y-3" data-story-season={tile.key}>
      <button type="button" onClick={onBack} data-story-back className="text-sky-400 text-xs font-bold px-1.5 py-1 rounded hover:bg-white/5">‹ All seasons</button>
      <div>
        <div className="text-lg font-black">{tile.year}{tile.current ? (retired ? ", the last chapter" : ", this season") : ""}</div>
        <div className="text-xs text-muted-foreground">Age {tile.age} at {tile.club}</div>
      </div>
      <div className="space-y-1.5">
        {tile.lines.map((line, i) => (
          <div key={i} data-story-line className="text-xs text-foreground/80 flex items-start gap-2">
            <span className="shrink-0">›</span><span><TextWithFlags text={money(line)} size={14} /></span>
          </div>
        ))}
      </div>
      {(tile.more ?? 0) > 0 && (
        <p className="text-[10px] text-muted-foreground">Plus {tile.more} more from that season that did not fit in the book.</p>
      )}
    </div>
  );
}

function StoryBody({ career }: { career: StorySource & { retired: boolean } }) {
  const [open, setOpen] = useState<string | null>(null);
  const tiles = storyTiles(career);
  const tile = open === null ? null : tiles.find(t => t.key === open) ?? null;
  if (tile) return <SeasonPage tile={tile} retired={career.retired} onBack={() => setOpen(null)} />;
  const startsLate = storyStartsLate(career, tiles);
  return (
    <div className="space-y-2">
      {tiles.length === 0
        ? <p className="text-xs text-muted-foreground">Nothing written yet. Play a season and it starts here.</p>
        : <SeasonTiles tiles={tiles} retired={career.retired} onOpen={setOpen} />}
      {startsLate !== null && (
        <p className="text-[10px] text-muted-foreground" data-story-starts-late>The book starts in {startsLate}. Seasons before that were played before the story was kept.</p>
      )}
    </div>
  );
}

/** With onClose it is a dialog over the page (opened from Latest Events);
    without it, a card in the page (the retirement screen). */
export default function CareerStory({ career, onClose }: { career: StorySource & { retired: boolean }; onClose?: () => void }) {
  if (!onClose) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 space-y-2" data-career-story="inline">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">📖 Career Story</span>
        <StoryBody career={career} />
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Career Story" tabIndex={-1} ref={focusDialogOnMount} onKeyDown={escapeCloses(onClose)} data-career-story="dialog"
        className="w-full max-w-md max-h-[88vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-base font-black">📖 Career Story</h2>
          <button type="button" onClick={onClose} className="text-xs font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded bg-muted/30">Close</button>
        </div>
        <div className="p-4">
          <StoryBody career={career} />
        </div>
      </div>
    </div>
  );
}
