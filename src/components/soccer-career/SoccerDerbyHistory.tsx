import { useLayoutEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  savedDerbyHistory, savedDerbyRivalRecords, type SavedDerbyHistorySeason, type SavedDerbyHistoryMeeting,
} from "@/lib/soccerCareerDerbyHistory";

type Mode = "list" | "detail" | "help";
const control = "min-h-11 min-w-11 rounded-lg px-3 text-xs font-bold hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring";
const yearLabel = (season: SavedDerbyHistorySeason) => season.year === null ? "Year not recorded" : String(season.year);
const clubLabel = (season: SavedDerbyHistorySeason) => season.club ?? "Club not recorded";
const missingCopy = {
  empty: "No derby meetings were saved for this season.",
  unrecorded: "Derby details were not recorded for this season.",
  invalid: "These saved derby details could not be read. No results have been guessed.",
};

function Records({ team, player, missed }: Pick<SavedDerbyHistorySeason, "team" | "player" | "missed">) {
  return <div className="grid grid-cols-2 gap-2 text-xs" data-derby-records>
    <div className="rounded-lg bg-muted/30 p-3" data-derby-team-record>
      <h3 className="font-bold">Club fixtures</h3>
      <p className="mt-1 tabular-nums">{team.meetings} saved</p>
      <p className="tabular-nums">{team.w} W · {team.d} D · {team.l} L</p>
    </div>
    <div className="rounded-lg bg-muted/30 p-3" data-derby-player-record>
      <h3 className="font-bold">Your appearances</h3>
      <p className="mt-1 tabular-nums">{player.played} played · {missed} not played</p>
      <p className="tabular-nums">{player.w} W · {player.d} D · {player.l} L</p>
      <p className="tabular-nums">{player.goals} {player.goals === 1 ? "goal" : "goals"}</p>
    </div>
  </div>;
}

function Meeting({ meeting, showSeason = false }: { meeting: SavedDerbyHistoryMeeting; showSeason?: boolean }) {
  return <article className="rounded-xl border border-border p-3 text-xs space-y-2" data-derby-meeting={`${meeting.seasonIndex}:${meeting.rivalIndex}:${meeting.meetingIndex}`}>
    {showSeason && <div className="text-muted-foreground space-y-0.5" data-derby-meeting-season>
      <p data-derby-meeting-year>{meeting.year === null ? "Year not recorded" : meeting.year}</p>
      <p className="break-words" data-derby-meeting-club>{meeting.club ?? "Club not recorded"}</p>
      <p>{meeting.age === null ? "Age not recorded" : `Age ${meeting.age}`}</p>
      {meeting.onLoanFrom && <p className="break-words">On loan from {meeting.onLoanFrom}</p>}
    </div>}
    <div>
      <h3 className="font-bold break-words" data-derby-meeting-name>{meeting.name}</h3>
      <p className="text-muted-foreground break-words" data-derby-meeting-rival>{meeting.rival}</p>
    </div>
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
      <p className="break-words" data-derby-home-club>{meeting.homeClub ?? "Club not recorded"}</p>
      <p className="font-black tabular-nums whitespace-nowrap" data-derby-score>{meeting.homeGoals}-{meeting.awayGoals}</p>
      <p className="break-words text-right" data-derby-away-club>{meeting.awayClub ?? "Club not recorded"}</p>
    </div>
    <p className="text-muted-foreground" data-derby-venue>{meeting.home ? "Home" : "Away"} for your saved club</p>
    <p data-derby-result>Club result: {meeting.result === "W" ? "Win" : meeting.result === "D" ? "Draw" : "Loss"}</p>
    <p data-derby-played>{meeting.played ? "You played." : "You did not play."} <span data-derby-goals>Your goals: {meeting.goals}</span></p>
    {meeting.won && <p className="font-bold text-orange-400" data-derby-winner>Your saved winning goal.</p>}
  </article>;
}

export default function SoccerDerbyHistory({ seasons, onClose }: { seasons: readonly unknown[]; onClose: () => void }) {
  const history = savedDerbyHistory({ seasons });
  const rivals = savedDerbyRivalRecords(history);
  const [mode, setMode] = useState<Mode>("list");
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState<"seasons" | "rivals">("seasons");
  const [selectedRival, setSelectedRival] = useState<string | null>(null);
  const opener = useRef(typeof document === "undefined" ? null : document.activeElement as HTMLElement | null);
  const body = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const help = useRef<HTMLButtonElement>(null);
  const tiles = useRef(new Map<number, HTMLButtonElement>());
  const rivalTiles = useRef(new Map<string, HTMLButtonElement>());
  const viewButtons = useRef<{ seasons: HTMLButtonElement | null; rivals: HTMLButtonElement | null }>({ seasons: null, rivals: null });
  const listPosition = useRef({ seasons: 0, rivals: 0 });
  const helpReturn = useRef<{ mode: "list" | "detail"; top: number }>({ mode: "list", top: 0 });
  const restore = useRef<{ top: number; target: "title" | "help" | "rival" | "view" | number; rival?: string } | null>(null);
  const season = history.seasons.find(row => row.seasonIndex === selected);
  const rival = rivals.find(row => row.rival === selectedRival);

  useLayoutEffect(() => {
    const pending = restore.current;
    if (!pending || !body.current) return;
    body.current.scrollTop = pending.top;
    const target = pending.target === "help" ? help.current : pending.target === "title" ? title.current : pending.target === "rival" ? rivalTiles.current.get(pending.rival ?? "") : pending.target === "view" ? viewButtons.current[view] : tiles.current.get(pending.target);
    target?.focus({ preventScroll: true });
    restore.current = null;
  }, [mode, selected, view, selectedRival]);

  const showSeason = (index: number) => {
    listPosition.current.seasons = body.current?.scrollTop ?? 0;
    restore.current = { top: 0, target: "title" };
    setSelected(index); setMode("detail");
  };
  const backToList = () => {
    restore.current = view === "rivals"
      ? { top: listPosition.current.rivals, target: "rival", rival: selectedRival ?? "" }
      : { top: listPosition.current.seasons, target: selected ?? "title" };
    setMode("list");
  };
  const changeView = (next: typeof view) => {
    if (view === next) return;
    listPosition.current[view] = body.current?.scrollTop ?? 0;
    restore.current = { top: listPosition.current[next], target: "view" };
    setView(next);
  };
  const showRival = (name: string) => {
    listPosition.current.rivals = body.current?.scrollTop ?? 0;
    restore.current = { top: 0, target: "title" };
    setSelectedRival(name); setMode("detail");
  };
  const showHelp = () => {
    if (mode === "help") return;
    helpReturn.current = { mode, top: body.current?.scrollTop ?? 0 };
    restore.current = { top: 0, target: "title" };
    setMode("help");
  };
  const backFromHelp = () => {
    restore.current = { top: helpReturn.current.top, target: "help" };
    setMode(helpReturn.current.mode);
  };

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent data-derby-history data-derby-history-mode={mode} data-derby-list-view={view}
      className="flex max-h-[88dvh] w-[calc(100%-1.5rem)] max-w-md flex-col gap-0 overflow-hidden rounded-2xl p-0 [&>button]:hidden"
      onOpenAutoFocus={event => { event.preventDefault(); title.current?.focus({ preventScroll: true }); }}
      onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus({ preventScroll: true }); }}>
      <header className="shrink-0 border-b border-border px-3 pb-3 pt-2">
        <div className="flex items-center justify-between gap-2">
          {mode === "detail" ? <button type="button" className={control} onClick={backToList} data-derby-back={view === "rivals" ? "rivals" : "list"}>Back to {view === "rivals" ? "rivals" : "seasons"}</button>
            : mode === "help" ? <button type="button" className={control} onClick={backFromHelp} aria-label="Back to derby history" data-derby-back="help">Back</button>
              : <span />}
          <div className="flex shrink-0 gap-1">
            <button type="button" ref={help} data-derby-history-help className={control} aria-label="Derby history help" onClick={showHelp}>?</button>
            <button type="button" className={control} aria-label="Close derby history" onClick={onClose} data-derby-close>Close</button>
          </div>
        </div>
        <DialogTitle ref={title} tabIndex={-1} className="mt-1 break-words px-1 text-base font-black focus:outline-none">
          {mode === "help" ? "Derby history help" : "Derby history"}
        </DialogTitle>
        <DialogDescription className="mt-1 px-1 text-xs">Saved simulated meetings from your career.</DialogDescription>
        {mode === "list" && <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Derby history views">
          <button type="button" ref={node => { viewButtons.current.seasons = node; }} className={`${control} border border-border ${view === "seasons" ? "bg-orange-500/15 text-orange-400" : "text-muted-foreground"}`} aria-pressed={view === "seasons"} onClick={() => changeView("seasons")} data-derby-list-tab="seasons">Seasons</button>
          <button type="button" ref={node => { viewButtons.current.rivals = node; }} className={`${control} border border-border ${view === "rivals" ? "bg-orange-500/15 text-orange-400" : "text-muted-foreground"}`} aria-pressed={view === "rivals"} onClick={() => changeView("rivals")} data-derby-list-tab="rivals">Rivals</button>
        </div>}
      </header>
      <div ref={body} className="min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3" data-derby-history-body>
        {mode === "list" && <>
          <Records team={history.team} player={history.player} missed={history.missed} />
          <p className="text-xs text-muted-foreground">Pick a season or rival to see the saved meetings. Use ? for how records work. These totals cover only readable saved derby details.</p>
          {view === "seasons" && (history.seasons.length === 0 ? <p className="text-sm" data-derby-empty>No saved senior seasons yet.</p> : <div className="grid grid-cols-2 gap-2" data-derby-seasons>
            {history.seasons.map(row => <button type="button" key={row.seasonIndex}
              ref={node => { if (node) tiles.current.set(row.seasonIndex, node); else tiles.current.delete(row.seasonIndex); }}
              className="min-h-11 min-w-11 rounded-xl border border-border p-3 text-left text-xs hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              aria-label={`View derby season ${yearLabel(row)}, ${clubLabel(row)}, record ${row.seasonIndex + 1}`}
              onClick={() => showSeason(row.seasonIndex)} data-derby-season={row.seasonIndex} data-derby-season-status={row.status}>
              <span className="block font-black" data-derby-season-year>{yearLabel(row)}</span>
              <span className="block break-words mt-1" data-derby-season-club>{clubLabel(row)}</span>
              {row.onLoanFrom && <span className="block text-muted-foreground break-words mt-1">On loan from {row.onLoanFrom}</span>}
              <span className="block text-muted-foreground mt-2">{row.status === "saved" ? `${row.meetingCount} saved ${row.meetingCount === 1 ? "meeting" : "meetings"}` : row.status === "empty" ? "No meetings saved" : row.status === "invalid" ? "Details unreadable" : "Details not recorded"}</span>
            </button>)}
          </div>)}
          {view === "rivals" && (rivals.length === 0 ? <p className="text-sm" data-derby-no-rivals>No readable rival meetings saved. The Seasons view still shows missing or unreadable details.</p> : <div className="grid grid-cols-2 gap-2" data-derby-rivals>
            {rivals.map(record => <button type="button" key={record.rival}
              ref={node => { if (node) rivalTiles.current.set(record.rival, node); else rivalTiles.current.delete(record.rival); }}
              className="min-h-11 min-w-11 rounded-xl border border-border p-3 text-left text-xs hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              aria-label={`View derby rival ${record.rival}`} onClick={() => showRival(record.rival)} data-derby-rival={record.rival}>
              <span className="block font-black break-words">{record.rival}</span>
              <span className="block text-muted-foreground mt-2">{record.team.meetings} saved {record.team.meetings === 1 ? "meeting" : "meetings"}</span>
              <span className="block tabular-nums mt-1">{record.player.played} played · {record.player.goals} {record.player.goals === 1 ? "goal" : "goals"}</span>
            </button>)}
          </div>)}
        </>}
        {mode === "detail" && view === "seasons" && season && <section className="space-y-3" data-derby-detail={season.seasonIndex}>
          <div className="rounded-lg bg-muted/20 p-3 text-sm" data-derby-season-identity>
            <p className="font-bold">{yearLabel(season)}</p><p className="break-words">{clubLabel(season)}</p>
            <p className="text-xs text-muted-foreground">{season.age === null ? "Age not recorded" : `Age ${season.age}`}</p>
            {season.onLoanFrom && <p className="text-xs text-muted-foreground break-words">On loan from {season.onLoanFrom}</p>}
          </div>
          {season.status === "saved" ? <>
            <Records team={season.team} player={season.player} missed={season.missed} />
            {history.meetings.filter(meeting => meeting.seasonIndex === season.seasonIndex).map(meeting => <Meeting key={`${meeting.rivalIndex}:${meeting.meetingIndex}`} meeting={meeting} />)}
          </> : <p className="text-sm" data-derby-missing={season.status}>{missingCopy[season.status]}</p>}
        </section>}
        {mode === "detail" && view === "rivals" && rival && <section className="space-y-3" data-derby-rival-detail={rival.rival}>
          <h3 className="text-sm font-black break-words" data-derby-rival-heading>{rival.rival}</h3>
          <p className="text-xs text-muted-foreground">Every readable saved meeting under this exact rival name, across your clubs and seasons.</p>
          <Records team={rival.team} player={rival.player} missed={rival.missed} />
          {rival.meetings.map(meeting => <Meeting key={`${meeting.seasonIndex}:${meeting.rivalIndex}:${meeting.meetingIndex}`} meeting={meeting} showSeason />)}
        </section>}
        {mode === "help" && <section className="space-y-3 text-sm" data-derby-help>
          <h3 className="font-bold">What this save kept</h3>
          <p>Pick a season or rival to see saved simulated derby meetings. Seasons with the same year stay separate, including loans. Missing or unreadable details stay marked.</p>
          <p>Rivals groups only the exact saved rival name across your clubs and years. Different spellings stay separate. An older season with missing details adds no guessed meetings.</p>
          <p>Club fixtures include every saved result, even when you did not play. Your appearances, W-D-L and goals include only the meetings you played.</p>
          <p>Home and Away refer to your club in that season. The score puts the home club first. Your derby goals are already part of your season goals, not extra goals added by this screen.</p>
          <p>A saved winning goal means your goal put the club ahead for good. Reading this history does not award anything again.</p>
          <h3 className="font-bold">Example</h3>
          <p>Your club wins 2-1 at home while you do not play, then draws 1-1 away with one goal from you. Club fixtures show 1 W, 1 D and 0 L. Your record shows one played draw and one goal.</p>
          <p>Back returns to the same season or list position. Close or Escape returns to your career.</p>
        </section>}
      </div>
    </DialogContent>
  </Dialog>;
}
