import { LAND_ON_HUB_KEY } from './clubManagerLanding';
import { parkedKey, SAVE_KEY, SLOT_COUNT } from './clubManagerSaveKeys';

export function hasClubManagerBootData(
  readLocal = (key: string) => localStorage.getItem(key),
  readSession = (key: string) => sessionStorage.getItem(key),
): boolean {
  try {
    if (readLocal(SAVE_KEY) !== null || readSession(LAND_ON_HUB_KEY) !== null) return true;
    for (let slot = 1; slot <= SLOT_COUNT; slot++) {
      if (readLocal(parkedKey(slot)) !== null) return true;
    }
    return false;
  } catch {
    // Recovery owns both unreadable bytes and storage failures.
    return true;
  }
}
