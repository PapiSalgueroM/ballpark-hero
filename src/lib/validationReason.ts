/* One reason string out of whatever a validator answered.
 *
 * The connect 4 validators answer a refusal two ways. The model's own verdict
 * carries a plain string. A verdict the cache or our records decided carries
 * an object keyed by the two attributes, one line each ("Lakers": "Verified
 * from our own records.", "MVP Winner": "This player does not match this
 * attribute."). Round 397 taught the soccer hook to flatten that object; the
 * four US hooks never got it, and Round 703 made the object the common shape
 * of a records-decided refusal, so an object reached
 * useState<string | null> and the page rendered it as a React child, which
 * throws and drops the board to the error boundary.
 *
 * Every connect 4 hook reads its refusal through this, so a new reason shape
 * in one validator cannot break one game and not the others. */
export function normalizeValidationReason(reason: unknown, fallback: string): string {
  if (typeof reason === 'string' && reason.trim()) return reason.trim();
  if (reason && typeof reason === 'object') {
    const parts = Object.values(reason)
      .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
      .map(value => String(value).trim())
      .filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
  }
  return fallback;
}
