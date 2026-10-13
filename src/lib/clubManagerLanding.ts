/**
 * Round 1323: a one shot mark that the next Club Manager boot in THIS tab
 * opens the career straight on its hub, which is what Hot Seat's carry on
 * promises (it used to land on the managers screen, one press short). Kept in
 * sessionStorage so it never reaches another tab, written just before the
 * page changes and taken (read and removed) by the boot. A browser that
 * refuses it lands on the managers screen, as before.
 *
 * A module of its own with no imports, so the Hot Seat page that writes it
 * carries nothing else of Club Manager's (its route has no weight to spare).
 */
export const LAND_ON_HUB_KEY = 'dukb-cm-land-on-hub';

export function markLandOnHub(): void {
  try {
    sessionStorage.setItem(LAND_ON_HUB_KEY, '1');
  } catch {
    /* the managers screen, one press short, as before */
  }
}

export function takeLandOnHub(): boolean {
  try {
    if (sessionStorage.getItem(LAND_ON_HUB_KEY) !== '1') return false;
    sessionStorage.removeItem(LAND_ON_HUB_KEY);
    return true;
  } catch {
    return false;
  }
}
