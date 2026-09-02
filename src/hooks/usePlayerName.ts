import { useEffect, useState } from 'react';
import { getCurrentPlayerName, getStoredPlayerName } from '@/lib/completions';

type NamedProfile = {
  display_name?: string | null;
  username?: string | null;
} | null | undefined;

/**
 * Supplies the current leaderboard identity without minting randomness during
 * render. A first-time guest gets a handle immediately after the first commit;
 * returning guests and named accounts can use the stored value right away.
 */
export function usePlayerName(profile?: NamedProfile): string | null {
  const [playerName, setPlayerName] = useState(() => getStoredPlayerName(profile));

  useEffect(() => {
    const refresh = () => setPlayerName(getCurrentPlayerName(profile));
    refresh();
    window.addEventListener('dukb-player-name-changed', refresh);
    return () => window.removeEventListener('dukb-player-name-changed', refresh);
  }, [profile]);

  return playerName;
}
