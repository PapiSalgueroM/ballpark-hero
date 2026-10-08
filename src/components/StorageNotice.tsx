import { useLocation } from 'react-router-dom';
import { ALL_GAMES } from '@/data/gameRegistry';
import { probeStorageWrites } from '@/lib/safeStorage';

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
   the height at 320, 360 and 390 and the shift at 390. */

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

export function StorageNotice() {
  const { pathname } = useLocation();
  if (typeof window !== 'undefined' && (window as Window & { __DUKB_PRERENDER__?: boolean }).__DUKB_PRERENDER__) return null;
  if (!isGameRoute(pathname)) return null;
  /* Asked here and nowhere earlier: whether this browser takes a write can
     only be learned by writing, and the seam does not write as it loads. The
     seam remembers the answer, so this is one write and one remove a visit,
     on the first game page, and nothing at all on the home page or a hub.
     It is asked while rendering so the line is there on the first paint and
     the game never jumps down a line after it. */
  const trouble = probeStorageWrites();
  if (!trouble) return null;
  const full = trouble === 'full';
  return (
    <p
      role="status"
      data-dukb-storage-notice={trouble}
      data-no-prerender=""
      data-site-chrome=""
      className="mx-auto max-w-3xl px-3 py-1 text-center text-xs leading-5 text-muted-foreground"
    >
      <span className="sm:hidden">
        {full ? "Storage is full, so progress won't save." : "Storage is blocked, so progress won't save."}
      </span>
      {/* the longer line and the reassurance only where there is room for them */}
      <span className="hidden sm:inline">
        {full
          ? "This browser's storage is full, so progress won't be saved."
          : "This browser blocks storage, so progress won't be saved."}
        {' '}You can still play everything.
      </span>
    </p>
  );
}

export default StorageNotice;
