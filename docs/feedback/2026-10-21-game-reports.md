# Owner-forwarded game requests, October 21, 2026

These are player requests retained for future work, not proof of a reproduced bug or a released feature. Anthony authorized continued improvements. The NBA/Fight visuals are a separate release in PR359; the Club Manager requests below have no implementation in that PR.

## NBA and Fight Career

Players asked to see basketball matches because the existing presentation was hard to understand, and to see the fight in Fight Career. The basketball report came from a 432 by 813 French-language Android browser on build index-D2fx3gQQ.js, submitted at 10:13:54.764Z.

Rounds 1517/1518 add an original NBA court recap and a ring with readable Fight playback to their existing viewers. Final verification and publication must be recorded in PROJECT-STATE. The visuals read the existing saved game events. They do not claim to reconstruct exact possessions or punches, and use generic figures.

## Club Manager

- Improve ball paths, show fouls clearly, make attacking phases follow tactical intent, and make players more recognizable. Respect the project's restriction on real-player likenesses, photos, club kits and logos. Prefer readable generic roles, numbers, stances and original visual cues.
- Extend the world editor to older eras and add more countries and leagues. Historical starting eras already exist; the inspected editor only admits modern squads. Any real rosters, leagues or national squads need the data guardian and two-source verification.
- Let the manager allocate money to a larger wage budget. Review the existing wage ceiling and transfer-budget relationship before adding another route to the same money.
- Add an individual coaching award. The request names the Cruyff trophy and a coach award. Verify actual award facts before using real names or eligibility rules; do not invent a real award record.
- Deepen national coaching, including actual squads, qualifiers, continental tournaments and the World Cup. Existing code already runs qualifying and summer tournaments, but the inspected national job panel is a summary without manager-selected squads. Check the protected 1516/BO world lane before any engine changes.
- Add shirt-sale revenue. This report came from /club-manager on the current legal release index-CMkbu5bk.js, submitted at 16:10:30.092Z, using a 432 by 813 French-language Android browser.

Shirt-sales source finding: the existing Shirt sponsor is a guaranteed sponsor cheque and bonus, not retail income. Gate income covers tickets and food. The inspected season ledger/projection has no merchandise row. A useful first version would record deterministic weekly shirt revenue, production cost and net cash separately from sponsorship and gate income, linked to existing fan mood and club stature. Player-popularity data, stock management and a new shop screen are not required for that first version.

This is an economy change requiring its own file claim, actual old-engine regression, balance measurements, exact cash/ledger reconciliation, old-save migration and effective double-payment controls. Advance weeks through the existing charged-week seam, not a new render timer or a state.week-only dedupe. Preserve existing sponsor receipts, ticket/food totals, random streams and budget precision. A manager changing club must not carry the old club's retail income. No branded kit image or invented real sales statistic is needed.

## Saved direction from the owner

Soccer Career remains the flagship. The saved references are GTA/BitLife for meaningful life choices, 2K/Madden/FIFA and Football Manager/PES for sport and career depth, Score! Hero for readable interactive football, FutMob for clear information, and Sports Star Idle for progression. These names belong in internal docs only, never shipped source, comments, assets or copy. The relevant product direction is meaningful decisions, readable sport action, short tile-based screens, phone controls and no page jumps. Keep each engine's outcomes authoritative, then have the visual layer explain them.

Source records: OWNER_REVIEW_2026-08-12.md, MASTER-BUILD-SPEC-2026-08.md, TWEAKS-2026-08-28.md and the saved PROJECT-STATE entries. Current implementation ownership and actual release status take precedence over this intake.
