import { useLocation } from 'react-router-dom';
import { ALL_GAMES } from '@/data/gameRegistry';
import { storageTrouble } from '@/lib/safeStorage';

/* Round 1142: the one line that tells a player his browser is not keeping
   anything. Before this round a browser that blocks site data got no game at
   all; now every game opens and plays, and the honest part is saying, once a
   page, that it will not be there next time.

   Game routes only. The home page offers before it asks (Round 283) and a
   line about saving has nothing to say above a list of games.

   It never reaches a saved page: it depends on the visitor's browser, so it
   is marked data-no-prerender and it does not render under the prerenderer at
   all. One line on a phone, on purpose: the game must not move down the page
   by more than that. scripts/playStorageBlocked.mjs measures both. */
function isGameRoute(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return ALL_GAMES.some(g => path === g.path || path.startsWith(`${g.path}/`));
}

export function StorageNotice() {
  const { pathname } = useLocation();
  if (!storageTrouble) return null;
  /* mutation: renders under the prerenderer */
  if (!isGameRoute(pathname)) return null;
  return (
    <p
      role="status"
      data-dukb-storage-notice={storageTrouble}
      data-no-prerender=""
      data-site-chrome=""
      className="mx-auto max-w-3xl px-3 py-1 text-center text-xs leading-5 text-muted-foreground"
    >
      {storageTrouble === 'full'
        ? "This browser's storage is full, so progress won't be saved."
        : "This browser blocks storage, so progress won't be saved."}
      {/* the reassurance only where there is room for it on the same line */}
      <span className="hidden sm:inline"> You can still play everything.</span>
    </p>
  );
}

export default StorageNotice;
