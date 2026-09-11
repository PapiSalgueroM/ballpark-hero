# Transfer Path active identities, Round 531 integration, 2026-09-11

Written by the Round 531 integrator. Piece 2 of the round baked `src/data/careerPlayers.ts`
from the live career tables (253 players, it was 151 hand typed, see
`docs/audits/career-bake-2026-09-11.md`). Transfer Path's Active Players Only rule draws its
identity candidates from that file, so the derivation in
`scripts/lib/transferPathActiveIdentities.mjs` found more of them, the generator
(`scripts/genTransferPathHints.mjs`) refused to run at its 78 identity tripwire, and
`simTransferPathActiveIdentity` went red. This file is the evidence the moved tripwires cite.

## The rule, unchanged

An identity is admitted only when a committed two source evidence set already carries the
normalized name plus nationality: the 2026 World Cup squads
(`supabase/migrations/20260901_round_389_world_cup_2026_squads.sql`, Round 389) or the 2026
stale player sweep (`scripts/data/staleSweep2026.json`, source URLs per entry), or when the
verified 2026 transfer overlay (`scripts/transferOverlay2026.mjs`, no nationality) names a
normalized name that is unique in the overlay, the fallback pool and the pull and that no
direct evidence row carries. Three guards apply to every candidate: the normalized name is
unique in the fallback pool, unique in the pull (`scripts/data/transferPathPull/careers.txt`),
and carried by at most one directly evidenced identity. No name was typed, no season inferred.

## The thirteen the harness named, one by one

Career nationality is the value in `src/data/careerPlayers.ts`, which is the live table's row.

| Name | Career nationality | Committed evidence already carrying name plus nationality | Verdict |
|---|---|---|---|
| Alexis Mac Allister | Argentina | World Cup squads: `('Alexis Mac Allister','Argentina','MF',20,'1998-12-24',46,6,'Liverpool',2026)` | admitted |
| Bruno Guimarães | Brazil | World Cup squads: `('Bruno Guimarães','Brazil','MF',8,'1997-11-16',43,3,'Newcastle United',2026)`; the overlay also names him (to Arsenal), the direct row decides | admitted |
| Cody Gakpo | Netherlands | World Cup squads: `('Cody Gakpo','Netherlands','FW',11,'1999-05-07',50,21,'Liverpool',2026)` | admitted |
| David Luiz | Brazil | Stale sweep, active entry "David Luiz" (Pafos FC), nationality Brazil | admitted |
| Emiliano Martínez | Argentina | World Cup squads carry the name TWICE: `('Emiliano Martínez','Argentina','GK',23,...,'Aston Villa',2026)` and `('Emiliano Martínez','Uruguay','MF',15,...,'Palmeiras',2026)`; the overlay names him too (to Chelsea) | **refused** by the direct namesake guard, the one `TPAI_CONTROL=directcollision` proves. The evidence covers him, the rule does not admit a name the evidence itself holds twice |
| Jordan Henderson | England | World Cup squads: `('Jordan Henderson','England','MF',14,'1990-06-17',90,3,'Brentford',2026)`; stale sweep active entry "Jordan Henderson" (Chelsea FC), England | admitted |
| Juan Mata | Spain | Stale sweep, active entry "Juan Mata" (Melbourne Victory), nationality Spain | admitted |
| Julián Álvarez | Argentina | World Cup squads: `('Julián Alvarez','Argentina','FW',9,'2000-01-31',51,14,'Atlético Madrid',2026)`; the identity key folds accents, so `julian alvarez\|argentina` matches | admitted |
| Lautaro Martínez | Argentina | World Cup squads: `('Lautaro Martínez','Argentina','FW',22,'1997-08-22',77,37,'Inter Milan',2026)` | admitted |
| Luis Díaz | Colombia | World Cup squads: `('Luis Díaz','Colombia','FW',7,'1997-01-13',74,22,'Bayern Munich',2026)` | admitted |
| Michael Olise | France | World Cup squads: `('Michael Olise','France','FW',11,'2001-12-12',17,7,'Bayern Munich',2026)` | admitted |
| Ollie Watkins | England | World Cup squads: `('Ollie Watkins','England','FW',19,'1995-12-30',22,7,'Aston Villa',2026)`; the overlay also names him (to Al-Hilal) | admitted |
| Vitinha | Portugal | World Cup squads: `('Vitinha','Portugal','MF',23,'2000-02-13',38,0,'Paris Saint-Germain',2026)` | admitted |

Twelve admitted, one refused. Every admitted identity was already in a committed evidence
set, so nothing here is a new fact about a player; the only thing that changed is which career
records the evidence can be matched against.

## The counts, before and after

| | 2026-09-07 (Round 509) | 2026-09-11 (Round 531) |
|---|---|---|
| Identity candidates (fallback pool) | 151 | 253 |
| Verified active identities | 78 | 90 |
| Retained puzzles with an active path (of 885) | 203 | 212 |
| Migration | `20260907190000_restore_verified_active_transfer_path_hints.sql`, APPLIED and immutable | `20260911190000_refresh_verified_active_transfer_path_hints.sql`, NOT applied |

Applied was checked, not assumed, and it contradicts `docs/PROJECT-STATE.md` ("its guarded
restore migration remains unapplied on purpose"): on 2026-09-11 the live `transfer_path_puzzles`
table had 885 rows and exactly 203 rows with both `active_min_steps` and `active_hint` set, read
through the app's own pinned URL and public key, and `simTransferPathHints` section 3 matches
those 203 rows to the 2026-09-07 file text for text. The desktop lane applied it after the
Round 509 frontend went live on 2026-09-08. That file therefore stays in the repo untouched,
and the generator now treats it as an applied input, never an output.

## What the refresh migration does and when it may be applied

The generator no longer writes a restore from the null state; it writes a refresh from the
applied state. Every one of its 212 rows carries, beside the value it writes, the applied value
it replaces (the 2026-09-07 row for 203 of them, `null::smallint, null::text` for the 9 pairs the
bigger identity set connects for the first time). It is write once and fail closed: one
transaction, refuses unless the table holds exactly 885 rows and exactly 203 complete active
pairs, then for each row requires exactly one live row with that puzzle id, both endpoints and
both active fields `is not distinct from` the replaced value, updates only the two active fields,
counts updated rows from the database, and refuses unless exactly 212 were updated, exactly 212
complete pairs exist afterwards and no row holds half a pair. So it cannot apply twice, cannot
apply on a drifted table, and cannot apply before the 2026-09-07 restore.
`simTransferPathActiveIdentity` section 4 reads every one of those guards off the file, checks
each replaced value against the applied file, and `TPAI_CONTROL=restoreguard` proves the check.

The condition in `docs/PROJECT-STATE.md` ("after the matching frontend deploys") is NOT met for
this file. The frontend live since 2026-09-08 (Round 509) carries the 78 identity set. This
refresh was derived on the 90 identity set, so twelve of the players its hints may route through
(Luis Díaz, Vitinha and the rest above) are players the live page's active filter still refuses.
Applying it before the Round 531 frontend is live would recreate the Round 294 defect, a hint
leading into a refusal. Apply it only after this branch is merged, deployed and published, then
run `simTransferPathHints` and `simTransferPathModes` against live: both accept exactly two live
states, the applied 203 or the refreshed 212, and while the table sits in the applied state both
print a PENDING line naming this file and how many applied rows the 90 identity set already
beats, so the step cannot be forgotten.

## tp-5 and tp-14

The career bake found the fallback puzzle file stale on these two (min 3 on the 151 player
pool, 2 on the 253 player pool). The live rows were read the same day: both already carry
`min_steps` 2 with the derived hints (Gerrard to Xabi Alonso to Ronaldo, Liverpool then Real
Madrid; Salah to Ashley Cole to Ibrahimović, Chelsea then LA Galaxy), because the Round 509
companion derived them on the full pull. No correction migration is needed. The regenerated
`src/data/transferPathPuzzles.ts` now agrees with live.

## The harness change

`simTransferPathActiveIdentity` section 1 builds its own fresh derivation to compare against
the generated file. Until now that derivation admitted any directly evidenced key without the
uniqueness guards, while section 2 of the same harness asserts the generator refuses exactly
those cases. The 151 player pool never exposed the gap; Emiliano Martínez did (the harness
counted 91, the generator 90). Section 1 now applies the same three guards, so the harness
and the generator can only agree for the same reason. Nothing was loosened: the set section 1
accepts is smaller than before, and all six controls still fire.
