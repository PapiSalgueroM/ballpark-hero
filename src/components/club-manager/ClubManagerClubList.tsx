import { REAL_LEAGUES, isPartialClub, CM_ROSTER_META } from '@/lib/clubManager';
// Round 1035: the A-League Men squads were read later than the bake, on their own date.
import { CM_ALEAGUE_META } from '@/data/clubManagerALeague2026';

/**
 * Round 655: every league and club you can take over today, as readable text.
 *
 * The picker is all buttons and only its era step draws on first load, so
 * before this no league or club name reached the saved page a crawler reads.
 * This renders inside the guide block (GameSeoContent's children), below the
 * guide, from the same REAL_LEAGUES club lists the picker offers, with the
 * picker's own partial data mark and one date taken from the roster bake,
 * never from the clock. Modern era only: the past seasons are other worlds.
 * scripts/simClubManagerClubList.mjs holds the saved page to all of that.
 */
export function ClubManagerClubList() {
  return (
    <div className="mt-10 text-left text-sm text-muted-foreground leading-relaxed space-y-3">
      <h2 className="text-base font-semibold text-foreground">Every league and club in Club Manager</h2>
      <p>{`Squads as of ${CM_ROSTER_META.asOf}; A-League Men squads as of ${CM_ALEAGUE_META.read}.`}</p>
      <p>Partial data means the market data covers only part of that squad, or none of it, and the rest is filled with youth players.</p>
      {REAL_LEAGUES.map(l => (
        <div key={l.id}>
          <h3 className="font-medium text-foreground">{`${l.name} clubs you can manage (${l.clubs.length})`}</h3>
          <p className="mt-1">{`${l.clubs.map(c => (isPartialClub(c) ? `${c} (partial data)` : c)).join(', ')}.`}</p>
        </div>
      ))}
    </div>
  );
}
