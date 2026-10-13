import { useCallback, useEffect, useState } from 'react';
import { saveFence, fenceKeyOf } from '@/lib/saveFence';

/* Round 1330: the watch half of Round 1323's one tab wins rule, for any long
   game whose save is fenced (src/lib/saveFence.ts). Soccer Career binds it now;
   the front offices bind it next. Club Manager still carries its own copy
   inline in useClubManager.ts, written before this hook existed.

   `moved` turns true once another tab has written the save since this page
   adopted it, and never turns back: the page covers itself and asks for a
   reload. `check()` asks the fence now and returns the answer, for a page whose
   write was just refused.

   It checks on a storage event for the fence key or for a clear (key null), on
   pageshow (a page back from the back forward cache missed the events), and when
   the tab becomes visible (the moment the player looks). A storage event for
   any other key, the save's own bytes included, is not a game write: a person
   or a walk editing the save by hand moves nothing.

   No adopt, no release and no write here: those stay the game's. */
export function useSaveFenceWatch(saveKey: string) {
  const [moved, setMoved] = useState(false);

  const check = useCallback((): boolean => {
    const now = saveFence.moved(saveKey);
    if (now) setMoved(true);
    return now;
  }, [saveKey]);

  useEffect(() => {
    const fenceKey = fenceKeyOf(saveKey);
    const onStorage = (e: StorageEvent) => { if (e.key === null || e.key === fenceKey) check(); };
    const onShow = () => { check(); };
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', onShow);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', onShow);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [saveKey, check]);

  return { moved, check };
}

export default useSaveFenceWatch;
