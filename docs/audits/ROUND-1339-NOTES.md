# Round 1339: an old Club Manager career stops listing men at your own club on the market

Written 2026-10-16 by the desktop Claude lane (session I, builder of Round 1339). Branch r1339-cm-market-extras.
The full account, with every runner result name and exit code, is the lane's finish file
(dukb-handoff/2026-10-10/results-g/finish-1339.md).

## The short answer

A career with no world seed (every career started before Release AZ went live on 2026-10-13, and a Manager Hot Seat
day carried on into Club Manager) listed men "at" the managed club on the transfer market who were not in the squad:
a deep club's bake beyond the 26 a squad starts with, and from the second season the men sold and the men whose deals
ran out. Since Release BE the club's own page lists only the squad, so the two screens disagreed. One line in
worldMarket (src/lib/clubManager.ts) now drops the managed club's rows in every career, seeded or not. The world itself
of an old career is untouched: no seed, no ledger (ruling Y1's ledger half stands).

## What holds it

- scripts/simCmOwnClubMarket.mjs: both arms built from this tree's text (main's old line put back for the parent),
  five sections (old saves, the feed, fresh starts and seeded journeys, the two dailies, the start moment's headroom)
  and three controls (legacy, slice, shallow), each proven to fire on a runner.
- scripts/data/cmPreAzMarketFixture.json: three raw saves written by the engine of 36cc9ffe (before AZ) on a runner by
  scripts/genCmPreAzMarketFixture.mjs, twice, byte equal.
- scripts/playCmOwnClubMarket.mjs: the built site, an old save resumed, the market searched for the club: no rows; its
  control builds this tree with the old line and finds 4 and 17.
- src/lib/clubManagerOwnClubLevel.test.ts, scripts/simFreeAgents.mjs (FA_CONTROL=ownclub), and the bridges in
  scripts/simCmUnseededWorld.mjs and scripts/simManagerWorldContinuity.mjs (scripts/lib/cmOwnClubMarket1339.mjs).

## Measured

- The fix's reach: over 90 saves written by the pre AZ engine, 752 men at their own club left the market (150 of them
  in the first 120 rows the feed draws from); a season 3 save that sold its two stars listed 17, six in the first 120.
- What did not move: 1700 new career starts (every playable club of every era, created clubs, an edited world) and 27
  seeded journeys byte equal; 120 Hot Seat days and 60 Deadline Days equal; at the start moment the best own club man
  sits at index 1150 or later of the market, far past the 120 rows the start's feed reads.
- Visible beyond the market, by design, in old careers only: at the next summer the feed's signings and the board's
  asks are drawn from a market without your own men (one measured case: a marquee ask of 110m became 100m).
