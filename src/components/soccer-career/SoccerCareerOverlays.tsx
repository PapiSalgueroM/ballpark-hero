import { Component, Fragment, lazy, Suspense, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { escapeCloses, focusDialogOnMount } from "@/lib/dialogA11y";
import { reloadToRetryChunk } from "@/lib/freshBuild";
import { readCompletedRecords, type CompletedRecordsRead } from "@/lib/soccerCareerCompletedRecords";

const PastCareersSheet = lazy(() => import("@/components/soccer-career/PastCareersSheet"));
export const SaveMovedNotice = lazy(() => import('@/components/SaveMovedNotice').catch(() => { reloadToRetryChunk(); return new Promise<never>(() => undefined); }));

export const completedRecordsStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
};

/* Round 1045: a boundary inside the lazy chunk cannot catch the chunk failing
   to load (a deploy swapped the files), so the mount carries its own: the
   overlay says so with Retry and Close, and the save is never touched.
   Retry reloads the page (src/lib/freshBuild.ts, Round 832): a lazy import
   that failed stays failed for the life of the page, so a remount alone
   would throw the same error again. The save is already on disk. */
export class CentreMountBoundary extends Component<{ onClose: () => void; what?: string; children: ReactNode }, { failed: boolean; tries: number }> {
  state = { failed: false, tries: 0 };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return <Fragment key={this.state.tries}>{this.props.children}</Fragment>;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" data-season-centre>
        <div role="dialog" aria-modal="true" aria-label={this.props.what ?? "Season Centre"} tabIndex={-1} ref={focusDialogOnMount} onKeyDown={escapeCloses(this.props.onClose)} className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-card p-4 text-center outline-none">
          <p className="text-sm">Couldn't load the {this.props.what ?? "Season Centre"}. Your career is safe.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => { if (!reloadToRetryChunk()) this.setState(s => ({ failed: false, tries: s.tries + 1 })); }} className="h-10 flex-1 rounded-lg border border-border text-sm font-semibold">↻ Retry</button>
            <button type="button" onClick={this.props.onClose} className="h-10 flex-1 rounded-lg bg-primary text-sm font-bold text-primary-foreground">✕ Close it</button>
          </div>
        </div>
      </div>
    );
  }
}

/* Release BS fix: a loading layer has one control, so Tab stays on it, the phone layer's rule below */
export function keepTabInside(event: { key: string; preventDefault(): void; stopPropagation(): void; currentTarget: HTMLElement }): boolean {
  if (event.key !== "Tab") return false;
  event.preventDefault(); event.stopPropagation();
  event.currentTarget.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  return true;
}

export function useSoccerPastCareers(saveMoved: boolean, saveFailed = false) {
  const [pastCareersOpen, setPastCareersOpen] = useState(false);
  const [pastCareersRead, setPastCareersRead] = useState<CompletedRecordsRead | null>(null);
  const pastCareersTrigger = useRef<HTMLButtonElement>(null);
  const openPastCareers = () => {
    setPastCareersRead(readCompletedRecords(completedRecordsStorage));
    setPastCareersOpen(true);
  };
  const closePastCareers = () => {
    setPastCareersOpen(false);
    queueMicrotask(() => {
      if (pastCareersTrigger.current?.isConnected) pastCareersTrigger.current.focus({ preventScroll: true });
    });
  };
  const pastCareersOverlay = pastCareersOpen && !saveMoved && (
    <CentreMountBoundary what="record book" onClose={closePastCareers}>
      <Suspense fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div role="dialog" aria-modal="true" aria-label="Opening past careers" tabIndex={-1} ref={focusDialogOnMount} onKeyDown={event => { if (!keepTabInside(event)) escapeCloses(closePastCareers)(event); }} className="w-full max-w-sm rounded-xl border border-border bg-card p-4">
            <p role="status">Opening past careers...</p>
            <Button variant="outline" className="mt-3 min-h-11 w-full" onClick={closePastCareers}>Back</Button>
          </div>
        </div>
      }>
        <PastCareersSheet
          records={pastCareersRead?.status === 'known' ? pastCareersRead.records : []}
          notice={saveFailed
            ? 'Your latest progress could not be saved. Close Past careers and use Retry save before starting over.'
            : pastCareersRead?.status === 'blocked'
              ? 'This record book could not be opened. Its saved data is unchanged.'
              : undefined}
          onClose={closePastCareers}
        />
      </Suspense>
    </CentreMountBoundary>
  );
  return { openPastCareers, pastCareersTrigger, pastCareersOverlay };
}
