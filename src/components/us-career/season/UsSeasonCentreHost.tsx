/* Round 1048: the small eager host of the US careers' Season Center.

   The board shows only the season curtain the moment a season is played, so
   a button in the hub is unmounted by the season it started and cannot own
   an overlay. This host wraps the board (in the NBA and NFL wrappers) and
   owns it instead: the entry in the hub asks it to get the viewer READY
   first, and only then plays the season and asks it to open, so the opaque
   cover and the viewer arrive in the same paint as the curtain under them
   (the curtain is never read before he has watched).

   Ready comes before the season on purpose. The viewer is a set of lazy
   chunks, and a tab left open across a release asks for chunk names the
   host no longer serves: the site answers a failed chunk by reloading the
   page once (src/lib/freshBuild.ts). The curtain is not on the save, so a
   season played BEFORE that load failed would be gone from the screen after
   the reload with no viewer and no curtain. Loaded first, a failure costs
   nothing: no season has been played.

   Eager on purpose and tiny on purpose: the context, the cover, the "could
   not be loaded" tile and nothing else. It imports no sport and none of the
   season modules; the viewer and everything it needs load on the first
   press. It keeps no career after a close and never writes anything. */
import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import type { UsCareerCore, UsCareerSeason, UsCareerSport } from '@/lib/usCareerSport';
import type { UsSeasonCentreProps } from '@/components/us-career/season/UsSeasonCentre';
import { reloadToRetryChunk } from '@/lib/freshBuild';
import { settlePendingSaves } from '@/lib/safeStorage';

export interface UsSeasonCentreRequest {
  career: UsCareerCore;
  row: UsCareerSeason;
  /** The element that asked, to give focus back to when there is no curtain. */
  from?: HTMLElement | null;
}

/** What the entry in the hub asks of the host around the board. */
export interface UsSeasonCentreApi {
  /** Loads the viewer and the sport's number file. True: both are in memory
   *  and `open` will show a season at once. False: they could not be loaded
   *  (the host says so itself) or the page is reloading for a new build;
   *  either way the caller must not play a season for the viewer's sake. */
  ready(from?: HTMLElement | null): Promise<boolean>;
  /** Shows a season. Only after `ready` answered true; otherwise it does nothing. */
  open(r: UsSeasonCentreRequest): void;
}

/** The host around the board; null when there is none (a test mounting the bare board). */
export const UsSeasonCentreOpen = createContext<UsSeasonCentreApi | null>(null);

/* The viewer, once its chunk is in memory. Kept by the module so a second
   press, or a second board, never waits. */
let viewer: ComponentType<UsSeasonCentreProps> | null = null;

/** 'ok': the viewer and the number file are in memory. 'failed': a chunk
 *  could not be loaded. 'gone': an import answered with nothing, which is
 *  the site's stale chunk handler cancelling the error because it is
 *  reloading the page. */
function loadAll(sport: UsCareerSport): Promise<'ok' | 'failed' | 'gone'> {
  const load = sport.loadSeasonCentre;
  if (!load) return Promise.resolve('failed');
  return Promise.all([import('@/components/us-career/season/UsSeasonCentre'), load()]).then(
    ([m, bind]) => {
      if (!m || !m.default || !bind) return 'gone';
      viewer = m.default;
      return 'ok';
    },
    () => 'failed',
  );
}

const TILE = 'fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4';

export function UsSeasonCentreHost({ sport, children }: { sport: UsCareerSport; children: ReactNode }) {
  const [request, setRequest] = useState<UsSeasonCentreRequest | null>(null);
  const [failed, setFailed] = useState(false);
  const from = useRef<HTMLElement | null>(null);
  const closed = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const api = useMemo<UsSeasonCentreApi>(() => ({
    ready: async asker => {
      const got = await loadAll(sport);
      if (got === 'ok') return true;
      if (got === 'failed' && alive.current) { from.current = asker ?? null; setFailed(true); }
      return false;
    },
    open: r => {
      if (!viewer) return;
      from.current = r.from ?? null;
      setRequest(r);
    },
  }), [sport]);
  /* the tile's Reload was pressed over a save the browser still refuses */
  const [held, setHeld] = useState(false);
  const close = useCallback(() => { closed.current = true; setRequest(null); setFailed(false); setHeld(false); }, []);
  /* A chunk that failed stays failed for the life of the page in Chromium
     (calling import() again asks nothing of the network), so the way to try
     again is a new page. Nothing was played, so a reload loses nothing. Only
     when the browser says it is offline is the import asked again instead. */
  const retry = useCallback(() => {
    /* Round 1144: "Your career is safe" was not true with a save the browser
       had refused still waiting in the board under this tile: the reload
       threw it away. The save is retried once first (the same call a reload
       makes itself); while it is still refused the page stays and the tile
       says why. */
    if (!settlePendingSaves()) { setHeld(true); return; }
    setHeld(false);
    if (reloadToRetryChunk()) return;
    const asker = from.current;
    setFailed(false);
    void api.ready(asker);
  }, [api]);
  /* focus goes back to the curtain's Continue when the curtain is there,
     otherwise to whatever opened the overlay */
  useEffect(() => {
    if (request !== null || failed || !closed.current) return;
    closed.current = false;
    const next = document.querySelector<HTMLElement>('[data-season-reveal] button') ?? (from.current?.isConnected ? from.current : null);
    next?.focus();
  }, [request, failed]);
  const Viewer = viewer;
  return (
    <UsSeasonCentreOpen.Provider value={api}>
      {children}
      {request && Viewer && (
        <div data-no-prerender>
          <div className="fixed inset-0 z-40 bg-background" data-us-centre-cover />
          <Viewer sport={sport} career={request.career} row={request.row} onClose={close} />
        </div>
      )}
      {failed && !request && (
        <div className={TILE} data-no-prerender data-season-centre-failed>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Season Center"
            tabIndex={-1}
            ref={el => el?.focus()}
            onKeyDown={e => { if (e.key === 'Escape') close(); }}
            className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-card p-4 text-center outline-none"
          >
            <div className="text-sm font-bold">📺 Season Center</div>
            {held ? (
              <p role="status" data-season-centre-held-reload className="text-sm text-muted-foreground">Your latest progress has not been saved yet, so the page was not reloaded: a reload would lose it. Go back to your season and use Retry save first.</p>
            ) : (
              <p className="text-sm text-muted-foreground">The game by game view could not be loaded, so your season has not been played. Your career is safe. Reload the page and press Week by week again, or go back and press Play.</p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={retry} className="h-11 flex-1 rounded-lg border border-border text-sm font-semibold">↻ Reload</button>
              <button type="button" onClick={close} className="h-11 flex-1 rounded-lg bg-primary text-sm font-bold text-primary-foreground">Back to your season</button>
            </div>
          </div>
        </div>
      )}
    </UsSeasonCentreOpen.Provider>
  );
}
