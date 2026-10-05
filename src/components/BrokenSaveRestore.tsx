import { useEffect, useRef, useState } from 'react';
import type { ContinueSave } from '@/data/continueSaves';
import { backupKeysOf, browserStorage, openGame, restoreBackup, routeSaveEntry } from '@/lib/brokenSaveRecovery';

/**
 * Round 958 review: the way back from a fresh start.
 *
 * RouteErrorBoundary offers "Start a fresh game" on a long game whose page
 * broke, and moves the save to a dated backup key rather than deleting it. It
 * cannot tell a broken save from a code bug, and a code bug gets fixed by a
 * later deploy. Without this card the backup was unreachable: nothing on the
 * site read it, so a player with a healthy career who started fresh after a
 * bug lost it for good.
 *
 * On the game's own page, while a backup of its save exists, a small card
 * offers to put the newest one back. A save the player has now is set aside
 * the same way first (restoreBackup), so the swap never deletes anything.
 * "Not now" hides it until the next full load.
 *
 * Fixed to the bottom of the screen so its arrival never moves the page (the
 * no scroll rule), read after mount so a saved page never captures it (no
 * backups exist under the prerenderer anyway), and every storage call goes
 * through the library, which never throws.
 */
export function BrokenSaveRestore({ pathname }: { pathname: string }) {
  const [offer, setOffer] = useState<{ entry: ContinueSave; backupKey: string; hasSave: boolean } | null>(null);
  const [failed, setFailed] = useState(false);
  const hidden = useRef(new Set<string>());

  useEffect(() => {
    setFailed(false);
    const entry = routeSaveEntry(pathname);
    const storage = browserStorage();
    const backupKey = entry ? backupKeysOf(entry, storage)[0] : undefined;
    if (!entry || !storage || !backupKey || hidden.current.has(backupKey)) { setOffer(null); return; }
    let hasSave = false;
    try { hasSave = storage.getItem(entry.saveKey) !== null; } catch { /* treat as no save */ }
    setOffer({ entry, backupKey, hasSave });
  }, [pathname]);

  if (!offer) return null;

  const putBack = () => {
    if (restoreBackup(offer.entry, offer.backupKey, browserStorage()).ok) openGame(offer.entry.path);
    else setFailed(true);
  };
  const notNow = () => {
    hidden.current.add(offer.backupKey);
    setOffer(null);
  };

  return (
    <div
      data-dukb-set-aside=""
      role="region"
      aria-label="Your old save"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:max-w-sm z-50 p-4 bg-card border border-border rounded-xl shadow-lg text-sm text-muted-foreground"
    >
      <p className="font-semibold text-foreground mb-1">Your old save is still here</p>
      <p className="mb-3">
        When this game broke you started fresh, and we kept the old save aside in this browser. Want it back?
        {offer.hasSave && ' The game you have now gets kept aside in its place, so nothing is deleted.'}
      </p>
      {failed && (
        <p role="alert" className="mb-3 text-xs">
          Your browser would not let us swap the saves, so nothing changed.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={putBack}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Put my old save back
        </button>
        <button
          type="button"
          onClick={notNow}
          className="px-4 py-2 rounded-lg bg-transparent border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

export default BrokenSaveRestore;
