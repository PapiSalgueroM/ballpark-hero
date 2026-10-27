# Player Bingo category expansion

Adds twelve criteria derived from player data already loaded by Player Bingo: full-backs, wingers, two middle value bands, two middle age bands, combined attacking seasons, appearance totals, scoring in fewer appearances and discipline combinations. Fixed criteria increase from 52 to 64. Each still needs eight supported pool players to reach a board.

The original criterion IDs and predicates, 24-square board, quotas, scoring and deck algorithms are preserved. Related appearance and discipline alternatives share exclusion groups. No player data, achievement lists, validators, database tables or external facts are added.

Unchanged-source baseline ad372160036e9364c31fb7298444cb02e44ea40b, run40441132045, passed the actual application type gate. The ten frozen tests produced exactly nine missing-category failures and one preservation pass. The fixed source is pending remote qualification; no live change is claimed.

The focused proof covers boundaries, unknown values, same-season requirements, minimum support and 128 deterministic fixture boards with distinct-player winning lines in their first sixty draws. This is bounded constructed-input coverage. Current production support and browser/release checks remain separate. The existing honours source pin is refreshed for this exact library while retaining its four executable controls.
