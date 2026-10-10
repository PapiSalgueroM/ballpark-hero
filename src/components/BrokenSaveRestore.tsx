import { useEffect, useRef, useState } from 'react';
import type { ContinueSave } from '@/data/continueSaves';
import {
  backupDate, browserStorage, deleteBackup, dismissBackup, offeredBackup, routeSaveEntry,
} from '@/lib/brokenSaveRecovery';
import { reopenGame, restoreNow, takeOutcome, type KeeperOutcome } from '@/lib/saveKeeper';

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
 * That set-aside save is then the newest backup, which is why the copy says
 * "kept aside" and never "when this game broke": after a swap it is the game
 * the player just put down, not a broken one.
 *
 * "Leave it aside" is remembered for that backup (dismissBackup), so the card stays
 * away until a newer backup exists instead of coming back on every visit.
 * "Delete it" asks once more and then removes that backup for good, the only
 * way a backup goes on the player's word.
 *
 * Fixed to the bottom of the screen so its arrival never moves the page (the
 * no scroll rule), read after mount so a saved page never captures it (no
 * backups exist under the prerenderer anyway), and every storage call goes
 * through the library, which never throws.
 *
 * Round 1219: "Put that save back" no longer swaps the saves in the open
 * page. Measured in a real browser, a game left open (Stadium Tycoon, the
 * academy, the arena) wrote itself over the save that had just been put back
 * as the page reloaded, and the backup it came from was already gone. The
 * button now only STAGES the put back (src/lib/saveKeeper.ts), the page is
 * replaced by a full load of the game, and the swap is made while that load
 * starts, before any game is in memory. This card then says, once, what
 * happened. A backup that is exactly the save now being played is not
 * offered: there would be nothing to put back.
 */
type Offer = { entry: ContinueSave; backupKey: string; hasSave: boolean; when: string | null };

/** What the load did with a put back, in plain words. */
function outcomeWords(o: KeeperOutcome): string {
  if (o.ok) {
    return o.kept
      ? 'The game you had before is kept aside in this browser, so nothing was deleted.'
      : 'This is the save that was kept aside.';
  }
  if (o.why === 'no-room') return 'Your browser is out of room, so the save could not be put back. It is still kept aside.';
  if (o.why === 'gone') return 'That kept aside save is not in this browser any more, so nothing was put back.';
  if (o.why === 'stale') return 'The page took too long to load, so the save was not put back. It is still kept aside, and you can press the button again.';
  return 'This browser would not let the site read its storage, so nothing was put back.';
}

export function BrokenSaveRestore({ pathname }: { pathname: string }) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [failed, setFailed] = useState<'swap' | 'delete' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [outcome, setOutcome] = useState<KeeperOutcome | null>(null);
  /* Holds "Leave it aside" for this visit even where storage refuses to remember it. */
  const hidden = useRef(new Set<string>());

  useEffect(() => {
    setFailed(null);
    setConfirming(false);
    const entry = routeSaveEntry(pathname);
    /* Asked once per load: what a staged put back did on the way in. */
    const told = takeOutcome(pathname);
    setOutcome(prev => told ?? (prev && entry && prev.path === entry.path ? prev : null));
    const storage = browserStorage();
    const backupKey = entry ? offeredBackup(entry, storage) : null;
    if (!entry || !storage || !backupKey || hidden.current.has(backupKey)) { setOffer(null); return; }
    let hasSave = false;
    let playing = false;
    try {
      const current = storage.getItem(entry.saveKey);
      hasSave = current !== null;
      playing = hasSave && storage.getItem(backupKey) === current;
    } catch { /* treat as no save */ }
    if (playing) { setOffer(null); return; }
    const made = backupDate(backupKey);
    const when = made ? made.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;
    setOffer({ entry, backupKey, hasSave, when });
  }, [pathname]);

  const primary = 'px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity';
  const plain = 'px-4 py-2 rounded-lg bg-transparent border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors';
  const shell = 'fixed bottom-4 left-4 right-4 sm:left-auto sm:max-w-sm z-50 p-4 bg-card border border-border rounded-xl shadow-lg text-sm text-muted-foreground';

  if (outcome) {
    return (
      <div data-dukb-set-aside="" data-dukb-put-back={outcome.ok ? 'done' : 'refused'} role="region" aria-label="Your kept aside save" className={shell}>
        <p className="font-semibold text-foreground mb-1">{outcome.ok ? 'Your save is back' : 'Nothing changed'}</p>
        <p role="status" className="mb-3">{outcomeWords(outcome)}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setOutcome(null)} className={primary}>OK</button>
        </div>
      </div>
    );
  }

  if (!offer) return null;

  const putBack = () => {
    if (restoreNow(offer.entry, offer.backupKey).ok) reopenGame(offer.entry.path);
    else setFailed('swap');
  };
  const notNow = () => {
    hidden.current.add(offer.backupKey);
    dismissBackup(offer.entry, offer.backupKey, browserStorage());
    setOffer(null);
  };
  const deleteForGood = () => {
    if (deleteBackup(offer.entry, offer.backupKey, browserStorage()).ok) setOffer(null);
    else { setConfirming(false); setFailed('delete'); }
  };

  return (
    <div
      data-dukb-set-aside=""
      role="region"
      aria-label="Your kept aside save"
      className={shell}
    >
      <p className="font-semibold text-foreground mb-1">You have a save kept aside</p>
      {confirming ? (
        <p className="mb-3">Delete that kept aside save for good? You can't undo this.</p>
      ) : (
        <p className="mb-3">
          There's a save of this game kept aside in this browser{offer.when ? ` from ${offer.when}` : ''}. Want it back?
          {offer.hasSave && ' The game you have now gets kept aside in its place, so nothing is deleted.'}
        </p>
      )}
      {failed && (
        <p role="alert" className="mb-3 text-xs">
          {failed === 'swap'
            ? 'Your browser would not let us swap the saves, so nothing changed.'
            : 'Your browser would not let us delete it, so it is still kept aside.'}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {confirming ? (
          <>
            <button type="button" onClick={deleteForGood} className={primary}>Yes, delete it</button>
            <button type="button" onClick={() => setConfirming(false)} className={plain}>Keep it</button>
          </>
        ) : (
          <>
            <button type="button" onClick={putBack} className={primary}>Put that save back</button>
            <button type="button" onClick={notNow} className={plain}>Leave it aside</button>
            <button type="button" onClick={() => setConfirming(true)} className={plain}>Delete it</button>
          </>
        )}
      </div>
    </div>
  );
}

export default BrokenSaveRestore;
