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
export function usePlayerName(profile?: NamedProfile, authIdentity?: string | null): string | null {
  const [committedName, setCommittedName] = useState<{
    identity: string;
    displayName: string | null;
    username: string | null;
    name: string;
  } | null>(null);
  const identity = authIdentity || 'guest';
  const displayName = profile?.display_name ?? null;
  const username = profile?.username ?? null;
  const playerName = getStoredPlayerName(profile);
  const inMemoryName = committedName
    && committedName.identity === identity
    && committedName.displayName === displayName
    && committedName.username === username
    ? committedName.name
    : null;

  useEffect(() => {
    const refresh = () => {
      setCommittedName({
        identity,
        displayName,
        username,
        name: getCurrentPlayerName(profile),
      });
    };
    refresh();
    window.addEventListener('dukb-player-name-changed', refresh);
    return () => window.removeEventListener('dukb-player-name-changed', refresh);
  }, [identity, displayName, username]);

  return playerName ?? inMemoryName;
}
