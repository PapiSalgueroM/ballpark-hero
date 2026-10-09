import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { ALL_GAMES } from '@/data/gameRegistry';
import { getStorageTrouble, probeStorageWrites, recheckStorageWrites, subscribeStorageTrouble, type StorageTrouble } from '@/lib/safeStorage';

/* Round 1142: the one line that tells a player his browser is not keeping
   anything. Before this round a browser that blocks site data got no game at
   all; now every game opens and plays, and the honest part is saying, once a
   page, that it will not be there next time.

   Game routes only. The home page offers before it asks (Round 283) and a
   line about saving has nothing to say above a list of games.

   It never reaches a saved page: it depends on the visitor's browser, so it
   is marked data-no-prerender and it does not render under the prerenderer at
   all. One line on a phone, on purpose: the game must not move down the page
   by more than that. The phone copy is the short one because the first cut
   wrapped to a second line at 360 wide and below (measured: 48px against 28,
   with "saved." alone on line two). scripts/playStorageBlocked.mjs measures
   the height at 320, 360 and 390 and the shift at 390.

   Round 1144: the line follows the seam instead of reading it once a page.
   It used to say "Storage is full" for the rest of the visit, after the
   player had made room and his save had gone through, until the page was
   loaded again. Now the seam says when its answer changes and the line
   leaves on the spot. Two things keep that honest:
     - The seam cannot see a game's own save succeed (a game that guards its
       save writes to the browser directly), so while the line says full
       this asks the seam to check again a moment after any press and when
       the tab comes back. Never on a timer, and never in a browser that
       stores normally: the check does nothing unless the seam already says
       full, so nobody else's browser is written to because of this.
     - The page must not jump. When the line leaves, its place stays: the
       same words, not painted and hidden from a screen reader, until the
       next page. The game does not move at all.
   Blocked storage is decided as the page loads and stays for the visit. */

/* Routed and playable, but commented out of the registry, so off the home
   page and the hubs. Somebody who lands on one is still playing a game, and
   one of them tells him his best streak is saved on this device. */
export const UNLISTED_GAME_ROUTES = [
  '/football-timeline', '/guess-nfl-team', '/shirt-number', '/higher-lower-transfers', '/pack-battle',
];

export function isGameRoute(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return UNLISTED_GAME_ROUTES.includes(path)
    || ALL_GAMES.some(g => path === g.path || path.startsWith(`${g.path}/`));
}

/** How long after a press the seam is asked again. Long enough for the press's
 *  own work (a save, a reset that frees room) to have run, and presses inside
 *  it share one check, so at most four a second however fast he taps. */
export const RECHECK_AFTER_MS = 250;

export function StorageNotice() {
  const { pathname } = useLocation();
  const prerender = typeof window !== 'undefined' && !!(window as Window & { __DUKB_PRERENDER__?: boolean }).__DUKB_PRERENDER__;
  const game = !prerender && isGameRoute(pathname);
  /* Asked here and nowhere earlier: whether this browser takes a write can
     only be learned by writing, and the seam does not write as it loads. The
     seam remembers the answer, so this is one write and one remove a visit,
     on the first game page, and nothing at all on the home page or a hub.
     It is asked while rendering, before the seam is read below, so the line
     is there on the first paint and the game never jumps down a line after
     it. */
  if (game) probeStorageWrites();
  const trouble = useSyncExternalStore(subscribeStorageTrouble, getStorageTrouble, getStorageTrouble);
  /* the page the line was last on, and what it said there */
  const shown = useRef<{ path: string; trouble: StorageTrouble } | null>(null);
  const full = game && trouble === 'full';
  useEffect(() => {
    if (!full) return undefined;
    let timer: number | undefined;
    const ask = () => {
      if (timer !== undefined) return;
      timer = window.setTimeout(() => { timer = undefined; recheckStorageWrites(); }, RECHECK_AFTER_MS);
    };
    const back = () => { if (document.visibilityState === 'visible') ask(); };
    window.addEventListener('click', ask, true);
    document.addEventListener('visibilitychange', back);
    return () => {
      window.removeEventListener('click', ask, true);
      document.removeEventListener('visibilitychange', back);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [full]);
  /* another page: whatever the line said on the last one is no longer held */
  if (shown.current && shown.current.path !== pathname) shown.current = null;
  if (!game) return null;
  if (trouble) shown.current = { path: pathname, trouble };
  /* the line has left on this page: its place stays so nothing moves */
  const says = trouble ?? shown.current?.trouble ?? null;
  if (!says) return null;
  const isFull = says === 'full';
  return (
    <p
      role={trouble ? 'status' : undefined}
      aria-hidden={trouble ? undefined : true}
      data-dukb-storage-notice={trouble ?? undefined}
      data-dukb-storage-notice-left={trouble ? undefined : ''}
      data-no-prerender=""
      data-site-chrome=""
      className={`mx-auto max-w-3xl px-3 py-1 text-center text-xs leading-5 text-muted-foreground${trouble ? '' : ' invisible'}`}
    >
      <span className="sm:hidden">
        {isFull ? "Storage is full, so progress won't save." : "Storage is blocked, so progress won't save."}
      </span>
      {/* the longer line and the reassurance only where there is room for them */}
      <span className="hidden sm:inline">
        {isFull
          ? "This browser's storage is full, so progress won't be saved."
          : "This browser blocks storage, so progress won't be saved."}
        {' '}You can still play everything.
      </span>
    </p>
  );
}

export default StorageNotice;
