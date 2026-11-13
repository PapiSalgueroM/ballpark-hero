import { useEffect } from 'react';

export function homeSaveStorage(): Storage | null {
  try { return typeof window !== 'undefined' ? window.localStorage : null; }
  catch { return null; }
}

export function useHomeSaveRefresh(keys: ReadonlySet<string>, refresh: (storage: Storage | null) => void) {
  useEffect(() => {
    const read = () => refresh(homeSaveStorage());
    const storageChanged = (event: StorageEvent) => {
      if (event.key !== null && !keys.has(event.key)) return;
      const storage = homeSaveStorage();
      if (event.storageArea && event.storageArea !== storage) return;
      refresh(storage);
    };
    read();
    window.addEventListener('storage', storageChanged);
    window.addEventListener('focus', read);
    window.addEventListener('pageshow', read);
    return () => {
      window.removeEventListener('storage', storageChanged);
      window.removeEventListener('focus', read);
      window.removeEventListener('pageshow', read);
    };
  }, [keys, refresh]);
}
