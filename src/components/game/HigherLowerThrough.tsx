/**
 * Round 1549: the one line under a Higher or Lower total that says what the
 * number runs through ("through 2025", "through the 2026 US Open").
 *
 * Lifted from Round 662's hockey card, where career totals with no season on
 * them had gone stale by up to 312 points before anybody noticed. A career
 * total is a fact with an expiry date, so every Higher or Lower card that
 * reveals one mounts this line, and the old "played until" wording, which was
 * false for every man still playing, is gone. A row nobody could check says so
 * plainly rather than borrowing a season it was never checked against.
 */
export const HL_SEASON_UNCONFIRMED = 'unverified';

export function HigherLowerThrough({ through }: { through: string | number }) {
  return (
    <span className="text-[10px] text-muted-foreground">
      {through === HL_SEASON_UNCONFIRMED ? 'season not confirmed' : `through ${through}`}
    </span>
  );
}
