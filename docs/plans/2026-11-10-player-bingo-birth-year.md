# Player Bingo birth-year bands

R0008 reports a player in the 1997 to 1999 band who was born in 2000. The active Player Bingo route, Soccer catalog entry and saved page passed the [entry preflight](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/42810749109) on the PR541 stack.

The held market fixture carries age 26 for the reported player. The held squad migration carries his date of birth. The club and federation both confirm 27 January 2000. The live row and the reporter's session remain unverified. [Real Madrid profile](https://www.realmadrid.com/en-US/football/first-team/players/aurelien-tchouameni) · [French Football Federation profile](https://www.fff.fr/equipe-nationale/joueur/9440-tchouameni-aurelien/fiche.html)

1. Reproduce the band error through the actual loader with fictional market and squad rows. Capture all four predicates and support lists. The adjacent-year controls must keep their placements.
2. If the original reproduces, use a valid, unambiguous squad birth date from the existing read. Require the same normalized name and country and a birth year consistent with the market row. Keep the existing age fallback when the match cannot be established.
3. Verify the fixed result, physical restoration controls, and the built route. Keep query count, pagination, cancellation and World Cup criteria behavior. Use fictional records for the new tests.
