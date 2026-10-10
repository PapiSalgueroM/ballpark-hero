import { useLayoutEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { CareerState } from "@/lib/soccerCareerEngine";
import { programmeOptions, chooseProgramme, cancelProgramme } from "@/lib/soccerCareerProgramme";

type Mode = "help" | "list" | "detail";
type ProgrammeId = ReturnType<typeof programmeOptions>[number]["id"];
type Restore = { top: number; target: "title" | "help" | ProgrammeId };
const control = "min-h-11 min-w-11 rounded-lg px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export default function SoccerCareerProgramme({ career, onChange, onClose }: {
  career: CareerState; onChange: (career: CareerState) => void; onClose: () => void;
}) {
  const views = programmeOptions(career);
  const [mode, setMode] = useState<Mode>("help");
  const [selected, setSelected] = useState<ProgrammeId | null>(null);
  const opener = useRef<HTMLElement | null>(document.activeElement as HTMLElement);
  const heading = useRef<HTMLHeadingElement>(null);
  const help = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const tiles = useRef(new Map<ProgrammeId, HTMLButtonElement>());
  const listTop = useRef(0);
  const helpReturn = useRef<{ mode: "list" | "detail"; top: number } | null>(null);
  const restore = useRef<Restore | null>(null);
  const view = views.find(item => item.id === selected);

  useLayoutEffect(() => {
    const pending = restore.current;
    if (!pending || !body.current) return;
    body.current.scrollTop = pending.top;
    const target = pending.target === "title" ? heading.current
      : pending.target === "help" ? help.current : tiles.current.get(pending.target);
    target?.focus({ preventScroll: true });
    restore.current = null;
  }, [mode, selected, career]);

  const showList = () => {
    restore.current = { top: listTop.current, target: selected ?? "title" };
    setMode("list");
  };
  const showDetail = (id: ProgrammeId) => {
    listTop.current = body.current?.scrollTop ?? 0;
    restore.current = { top: 0, target: "title" };
    setSelected(id);
    setMode("detail");
  };
  const showHelp = () => {
    if (mode === "help") return;
    helpReturn.current = { mode, top: body.current?.scrollTop ?? 0 };
    restore.current = { top: 0, target: "title" };
    setMode("help");
  };
  const leaveHelp = () => {
    const previous = helpReturn.current;
    restore.current = { top: previous?.top ?? listTop.current, target: previous ? "help" : "title" };
    setMode(previous?.mode ?? "list");
    helpReturn.current = null;
  };
  const apply = (next: CareerState) => {
    if (next === career) return;
    restore.current = { top: body.current?.scrollTop ?? 0, target: "title" };
    onChange(next);
  };

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent data-soccer-programme data-programme-mode={mode}
      className="flex max-h-[88dvh] w-[calc(100%-1.5rem)] max-w-md flex-col gap-0 overflow-hidden rounded-2xl p-0 [&>button]:hidden"
      onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}
      onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus({ preventScroll: true }); }}>
      <div className="shrink-0 border-b border-border px-3 pb-3 pt-2">
        <div className="flex items-center justify-between gap-2">
          {mode === "detail" ? <button type="button" data-programme-back className={control} onClick={showList}>Back to plans</button>
            : mode === "help" && helpReturn.current ? <button type="button" data-programme-back className={control} onClick={leaveHelp}>Back</button>
            : <span />}
          <div className="flex shrink-0 gap-1">
            <button type="button" ref={help} data-programme-help aria-label="Career programme help" className={control} onClick={showHelp}>?</button>
            <button type="button" data-programme-close aria-label="Close career programme" className={control} onClick={onClose}>Close</button>
          </div>
        </div>
        <DialogTitle ref={heading} tabIndex={-1} className="mt-1 text-base font-black outline-none">
          {mode === "help" ? "Your career plans: how it works" : mode === "detail" && view ? view.title : "Your career plans"}
        </DialogTitle>
        <DialogDescription className="mt-1 text-xs">Choices for your simulated career. Check the context before choosing.</DialogDescription>
      </div>
      <div ref={body} data-programme-body className="min-h-0 overflow-y-auto overscroll-contain p-3 text-sm">
        {mode === "help" ? <div data-programme-rules className="space-y-3">
          <p>Pick a tile, read its effect and tradeoff, then choose an available option. Each plan belongs to the club and season shown in its detail.</p>
          <p>Some choices need a transfer offer, a loan, an injury return or the captain's armband. An unavailable choice explains what is missing.</p>
          <p>A plan is not a guaranteed result. The detail shows your current choice and the outcome your career actually kept. Opening, reading or closing this screen does not change your career.</p>
          <p>Use Cancel plan when it is offered to remove a queued choice. A completed deal or recorded season cannot be undone here.</p>
          <h3 className="font-bold">Example</h3>
          <p>Open Tactical role and compare the available roles. Read both the effect and the tradeoff before choosing. Your choice is kept for the eligible season; after that season, check its recorded outcome instead of assuming the preview happened.</p>
          <p>Back returns to the same tile and list position. Close or Escape returns to your career. You can reopen these rules with ?.</p>
          <button type="button" data-programme-start className={control + " w-full bg-primary text-primary-foreground"} onClick={leaveHelp}>
            {helpReturn.current ? "Back to my plans" : "See my plans"}
          </button>
        </div> : mode === "list" ? <div className="grid grid-cols-2 gap-2" data-programme-list>
          {views.map(item => <button type="button" key={item.id} data-programme-tile={item.id}
            ref={element => { if (element) tiles.current.set(item.id, element); else tiles.current.delete(item.id); }}
            className={control + " min-w-0 border border-border bg-muted/20 p-3 text-left"} onClick={() => showDetail(item.id)}>
            <span className="block font-bold">{item.title}</span>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">{item.description}</span>
            {item.choice && <span className="mt-2 block text-xs text-primary">Choice recorded</span>}
          </button>)}
        </div> : view ? <section data-programme-detail={view.id} className="space-y-3">
          <p>{view.description}</p>
          <p data-programme-context className="rounded-lg bg-muted/30 p-3 text-xs">{view.context}</p>
          <div data-programme-current className="rounded-lg border border-border p-3 text-xs" aria-live="polite">
            <p><strong>Current choice:</strong> {view.choices.find(choice => choice.id === view.choice)?.label ?? "No choice recorded"}</p>
            <p className="mt-1" data-programme-outcome><strong>Recorded outcome:</strong> {view.outcome ?? "No outcome recorded yet"}</p>
          </div>
          <div className="space-y-2">
            {view.choices.map(choice => <div key={choice.id} className="rounded-lg border border-border p-3" data-programme-option={choice.id}>
              <h3 className="text-sm font-bold">{choice.label}</h3>
              <p className="mt-1 text-xs" data-programme-effect>{choice.effect}</p>
              <p className="mt-1 text-xs text-muted-foreground" data-programme-tradeoff>{choice.tradeoff}</p>
              {!choice.eligible && <p className="mt-2 text-xs text-muted-foreground" data-programme-disabled-reason>{choice.reason}</p>}
              <button type="button" data-programme-choice={choice.id} className={control + " mt-2 w-full bg-primary text-primary-foreground disabled:opacity-50"}
                disabled={!choice.eligible || choice.id === view.choice} onClick={() => apply(chooseProgramme(career, view.id, choice.id))}>
                {choice.id === view.choice ? "Current choice" : "Choose " + choice.label}
              </button>
            </div>)}
          </div>
          {view.canCancel && <button type="button" data-programme-cancel className={control + " w-full border border-border"} onClick={() => apply(cancelProgramme(career, view.id))}>Cancel plan</button>}
        </section> : <p>This plan is not available in this career.</p>}
      </div>
    </DialogContent>
  </Dialog>;
}
