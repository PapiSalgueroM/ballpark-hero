/* Round 1048: the small eager host of the US careers' Season Center.

   The board shows only the season curtain the moment a season is played, so
   a button in the hub is unmounted by the season it started and cannot own
   an overlay. This host wraps the board (in the NBA and NFL wrappers) and
   owns it instead: the entry in the hub asks it to open a season, and it
   draws an opaque cover at once (so the curtain under it is never read
   before he has watched), a loading tile, and then the lazy viewer.

   Eager on purpose and tiny on purpose: the context, the cover, the chunk
   boundary (a boundary inside the lazy chunk cannot catch the chunk failing
   to load) and nothing else. It imports no sport and none of the season
   modules; the viewer and everything it needs load on the first press. It
   keeps no career after a close and never writes anything. */
import { Component, Suspense, createContext, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { UsCareerCore, UsCareerSeason, UsCareerSport } from '@/lib/usCareerSport';

export interface UsSeasonCentreRequest {
  career: UsCareerCore;
  row: UsCareerSeason;
  /** The element that asked, to give focus back to when there is no curtain. */
  from?: HTMLElement | null;
}

/** Opens a season in the Season Center; null when no host wraps the board. */
export const UsSeasonCentreOpen = createContext<((r: UsSeasonCentreRequest) => void) | null>(null);

const loadViewer = () => lazy(() => import('@/components/us-career/season/UsSeasonCentre'));

const TILE = 'fixed inset-0 z-50 flex items-center justify-center p-4';

class ChunkBoundary extends Component<{ onRetry: () => void; onClose: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className={TILE} data-season-centre-failed>
        <div role="dialog" aria-modal="true" aria-label="Season Center" tabIndex={-1} ref={el => el?.focus()} className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-card p-4 text-center outline-none">
          <div className="text-sm font-bold">📺 Season Center</div>
          <p className="text-sm text-muted-foreground">The season could not be loaded. Your career is safe.</p>
          <div className="flex gap-2">
            <button type="button" onClick={this.props.onRetry} className="h-11 flex-1 rounded-lg border border-border text-sm font-semibold">↻ Retry</button>
            <button type="button" onClick={this.props.onClose} className="h-11 flex-1 rounded-lg bg-primary text-sm font-bold text-primary-foreground">Back to your season</button>
          </div>
        </div>
      </div>
    );
  }
}

export function UsSeasonCentreHost({ sport, children }: { sport: UsCareerSport; children: ReactNode }) {
  const [request, setRequest] = useState<UsSeasonCentreRequest | null>(null);
  const [Viewer, setViewer] = useState(loadViewer);
  const [tries, setTries] = useState(0);
  const from = useRef<HTMLElement | null>(null);
  const closed = useRef(false);
  const open = useCallback((r: UsSeasonCentreRequest) => { from.current = r.from ?? null; setRequest(r); }, []);
  const close = useCallback(() => { closed.current = true; setRequest(null); }, []);
  /* focus goes back to the curtain's Continue when the curtain is there,
     otherwise to whatever opened the overlay */
  useEffect(() => {
    if (request !== null || !closed.current) return;
    closed.current = false;
    const next = document.querySelector<HTMLElement>('[data-season-reveal] button') ?? (from.current?.isConnected ? from.current : null);
    next?.focus();
  }, [request]);
  return (
    <UsSeasonCentreOpen.Provider value={open}>
      {children}
      {request && (
        <div data-no-prerender>
          <div className="fixed inset-0 z-40 bg-background" data-us-centre-cover />
          <ChunkBoundary key={tries} onRetry={() => { setViewer(loadViewer); setTries(n => n + 1); }} onClose={close}>
            <Suspense fallback={(
              <div className={TILE} data-season-centre-loading>
                <div role="status" tabIndex={-1} ref={el => el?.focus()} className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold outline-none">📺 Getting your season ready...</div>
              </div>
            )}>
              <Viewer sport={sport} career={request.career} row={request.row} onClose={close} />
            </Suspense>
          </ChunkBoundary>
        </div>
      )}
    </UsSeasonCentreOpen.Provider>
  );
}
