import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { CompletedRecord } from "@/lib/soccerCareerCompletedRecords";

type Props = {
  records: readonly CompletedRecord[];
  notice?: string;
  onClose: () => void;
};

export default function PastCareersSheet({ records, notice, onClose }: Props) {
  const [open, setOpen] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const helpId = useId();
  const title = useRef<HTMLHeadingElement>(null);
  const screen = useRef<HTMLHeadingElement>(null);
  const tiles = useRef(new Map<string, HTMLButtonElement>());
  const lastRecord = useRef<string | null>(null);
  const selected = records.find(record => record.key === selectedKey) ?? null;

  useEffect(() => {
    const tile = !help && selectedKey === null && lastRecord.current
      ? tiles.current.get(lastRecord.current) : null;
    (tile ?? screen.current)?.focus({ preventScroll: true });
    if (tile) lastRecord.current = null;
  }, [help, selectedKey]);

  const back = () => {
    if (help) setHelp(false);
    else if (selected) setSelectedKey(null);
    else setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent data-past-careers="" className="max-h-[85dvh] w-[calc(100vw-1.5rem)] max-w-xl gap-3 overflow-y-auto rounded-xl p-3 sm:p-4 [&>button:last-child]:inline-flex [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:items-center [&>button:last-child]:justify-center"
        onOpenAutoFocus={event => { event.preventDefault(); title.current?.focus({ preventScroll: true }); }}
        onCloseAutoFocus={event => { event.preventDefault(); if (!open) onClose(); }}>
        <div className="flex items-center gap-2 pr-12">
          <Button type="button" variant="outline" className="min-h-11" onClick={back}>Back</Button>
          <Button type="button" variant="outline" className="min-h-11 min-w-11 px-3 text-lg" aria-label="How past careers work"
            aria-expanded={help} aria-controls={helpId} onClick={() => setHelp(value => !value)}>?</Button>
        </div>
        <DialogTitle ref={title} tabIndex={-1} className="text-center text-lg font-black outline-none">Past careers</DialogTitle>
        <DialogDescription className="sr-only">Completed playing records saved in this browser.</DialogDescription>
        <h3 ref={screen} tabIndex={-1} className="break-words text-sm font-bold outline-none [overflow-wrap:anywhere]">
          {help ? "How it works" : selected ? selected.profile[0] : "Saved records"}
        </h3>
        {help ? (
          <div id={helpId} className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            <p>This book lives in this browser. Clearing site data clears it. These are saved summaries, so you cannot carry on an old career.</p>
            <p>The book keeps the best 12 from the cards already here and the record you are saving. Cards rank by saved legacy score. Ties go to the card most recently added or changed. A new record outside the top 12 is not kept.</p>
            <p>The same player details and playing seasons count as one record. Its latest saved legacy replaces the old card, even if the score is lower. Dropped cards are not restored automatically.</p>
            <p>For example, if a record's saved score changes from 84 to 55, its one card shows 55. Different playing seasons make a separate record.</p>
          </div>
        ) : notice ? (
          <p role="status" className="rounded-xl border border-border bg-muted/20 p-3 text-sm text-muted-foreground">{notice}</p>
        ) : selected ? (
          <div data-past-career-detail="" className="space-y-3">
            <p className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">{selected.profile[1]} · {selected.profile[2]}</p>
            <p className="text-xs text-muted-foreground">{selected.firstYear === null ? "No playing seasons" : selected.firstYear === selected.lastYear ? selected.firstYear : `${selected.firstYear} to ${selected.lastYear}`}</p>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center">
              <p className="text-sm font-bold text-primary">{selected.legacy.tier}</p>
              <p className="text-3xl font-black tabular-nums">{selected.legacy.score}<span className="text-sm text-muted-foreground">/100</span></p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([["Goals", selected.goals], ["Trophies", selected.trophies], ["Ballon d'Or", selected.ballonDors], ["Caps", selected.caps]] as const).map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border bg-muted/20 p-2 text-center">
                  <p className="font-black tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {selected.legacy.breakdown.map((row, index) => (
                <div key={index} className="flex items-start justify-between gap-3 text-xs">
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">{row.label}</span>
                  <span className="shrink-0 font-bold tabular-nums">{row.points > 0 ? "+" : ""}{row.points}</span>
                </div>
              ))}
            </div>
          </div>
        ) : records.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {records.map(record => (
              <button key={record.key} type="button" data-past-career-record="" ref={element => {
                if (element) tiles.current.set(record.key, element); else tiles.current.delete(record.key);
              }} onClick={() => { lastRecord.current = record.key; setSelectedKey(record.key); }}
                className="min-h-28 min-w-0 space-y-1 rounded-xl border border-border bg-muted/20 p-3 text-left hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <p className="break-words text-sm font-black [overflow-wrap:anywhere]">{record.profile[0]}</p>
                <p className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">{record.profile[1]} · {record.profile[2]}</p>
                <p className="text-xs font-bold text-primary">{record.legacy.tier}</p>
                <p className="text-xl font-black tabular-nums">{record.legacy.score}<span className="text-xs text-muted-foreground">/100</span></p>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-border bg-muted/20 p-3 text-sm text-muted-foreground">No completed records kept yet.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}