# College tables, Round 706: the record behind the migrations

Written 2026-09-30. This is the evidence file the five Round 706 migrations and
`scripts/simCollegeTables.mjs` point at. Everything below was read on 2026-09-30
from two organisations, drafthistory.com (its year pages, `index.php/years/YYYY`)
and profootballarchives.com (its draft pages, `drafts/YYYYnfldraft.html`). Where
the two disagree, or where one page could not be read cleanly, the line says so
and the fact is NOT used as a pin.

## 1. The 13 invented 1977 rows (migration 20260930120000, step 2b)

The live `nfl_draft_picks` 1977 tail (picks 280 to 335, ids 14568 to 14623) was
read in full on 2026-09-30. 43 of its 56 rows match both sources on player, team
and college (spelling aside: the table's "Oakley Dalton" is drafthistory.com's
"Oaklay Dalton", its "Rolf Benirschke" is "Rolf Benirshke"). The other 13 are
not on either source at any pick, carry positions no draft record uses ("Corner
Back", "Wide Reciaver", "Defensive Line Men") and a team no NFL club ever had
("Baltimore Fatsos"). Both sources agree on who was really taken:

| id | pick | table says | drafthistory.com | profootballarchives.com |
|---|---|---|---|---|
| 14568 | 280 | Sammy Strock, Tight End, Buccaneers, Alabama | Chuck Rodgers, Buccaneers, DB, North Dakota State | Chuck Rodgers, DB, North Dakota State, Buccaneers |
| 14569 | 281 | John Bafia, Quarterback, Buccaneers, Boston College | Bill Westbeld, Seahawks, T, Dayton | Bill Westbeld, T, Dayton, Seahawks |
| 14608 | 320 | Adam Dzierdzik, Corner Back, Vikings, Ohio State | Dave Greenwood, Lions, G, Iowa State | Dave Greenwood, G-C, Iowa State, Lions |
| 14610 | 322 | Kyle Ecke, Wide Receiver, Bears, Jackson State | Terry Irving, Bengals, DB, Jackson State | Terry Irvin, DB, Jackson State, Bears |
| 14611 | 323 | Stephen Aragon, Guard, 49ers, North Dakota | Scott Martin, 49ers, G, North Dakota | Scott Martin, G, North Dakota, 49ers |
| 14612 | 324 | Ethan Ranney, Tight end, Broncos, Western Illinois | Scott Levenhagen, Broncos, TE, Western Illinois | Scott Levenhagen, TE, Western Illinois, Broncos |
| 14613 | 325 | Anthony Dzierdzik, Center, Bears, Georgia Tech | Leo Tierney, Browns, C, Georgia Tech | Leo Tierney, C, Georgia Tech, Browns |
| 14614 | 326 | Ethan Venderveen, Wide receiver, Bengals, Morehouse | Alex Percival, Bengals, WR, Morehouse (GA) | Alex Percival, WR, Morehouse, Bengals |
| 14615 | 327 | Justin Venderveen, Defensive end, Redskins, Missouri | Curtis Kirkland, Redskins, DE, Missouri | Curtis Kirkland, DE, Missouri, Redskins |
| 14616 | 328 | Elliot Ecke, Linebacker, Cardinals, Texas | Rick Fenlaw, Cardinals, LB, Texas | Rick Fenlaw, LB, Texas, Cardinals |
| 14617 | 329 | Charlie Kirk, Defensive tackle, Seahawks, Tulsa | I.V. Wilson, Seahawks, DT, Tulsa | I.V. Wilson, DT, Tulsa, Seahawks |
| 14618 | 330 | Benedict Fernzi, Wide Reciaver, Rams, Illinois | Barry Caudill, Rams, C, Southern Mississippi | Barry Caudill, C, Southern Mississippi, Rams |
| 14619 | 331 | Jakob Cepon, Defensive Line Men, Baltimore Fatsos, North Dakota | Bill Deutsch, Colts, RB, North Dakota | Bill Deutsch, RB, North Dakota, Colts |

The two sources disagree on the team at pick 322 (Bengals against Bears) and on
the spelling Irving against Irvin, so that pick is NOT inserted; none of the 13
real picks is inserted by Round 706. The migration deletes the 13 invented rows
by (id, player_name) and leaves 1977's tail with 43 rows for 56 picks, which
makes step 3 file the whole tail as round NULL (known not to be the first
round, not guessed). The real picks go in when a round inserts them from both
sources with the pick 322 team settled.

Round boundaries both sources give for 1977: round 11 is picks 280 to 307,
round 12 is 308 to 335.

## 2. The derived rounds against the record (migration 20260930120000, step 3)

Step 3 derives a round for 1,653 rows the scrape filed as round 1 past their
year's parsed first round, and sets 270 to NULL (1941, 1977, 1982). The
derivation was run in code (`scripts/lib/collegeTablesMirror.mjs deriveRounds`)
over the live pull on 2026-09-30 and the rows below were read at the picks the
migration's own sample list names. A pick counts as a pin only when both
organisations give the same player at that pick in the same round, and the
derivation gives that round.

| year | pick | table's row | derived round | drafthistory.com | profootballarchives.com | pin |
|---|---|---|---|---|---|---|
| 1976 | 472 | Pat McNeil, Chiefs, Baylor | 17 | Pat McNeil, Chiefs, RB, Baylor, round 17 (round 17 starts at 460, the draft ends at 487) | Pat McNeil, Chiefs, RB, Baylor, round 17 (round 17 starts at 460, ends at 487) | yes |
| 1976 | 404 | Bob Dzierzak, Buccaneers, Utah State | 15 | Bob Dzierzak, Buccaneers, DT, Utah State, round 15 (round 15 starts at 404) | Bob Dzierzak, Buccaneers, DT, Utah State, round 15 (starts at 404) | yes |
| 1970 | 313 | Billy Main, Steelers, Oregon State | 13 | Billy Main, Steelers, RB, Oregon State, round 13 | Billy Main, RB, Oregon State, Steelers, round 13 | yes |
| 1970 | 442 | Rayford Jenkins, Chiefs, Alcorn A&M | 17 | Rayford Jenkins, Chiefs, DB, Alcorn State, round 17 (17 rounds, 442 picks) | Rayford Jenkins, DB, Alcorn State, Chiefs, round 17 (17 rounds, 442 picks) | yes |
| 1971 | 442 | Charles Hill, Raiders, Sam Houston State | 17 | Charles Hill, Raiders, WR, Sam Houston State, round 17 (17 rounds, 442 picks) | Chuck Hill, WR, Sam Houston State, Raiders, round 17 (17 rounds, 442 picks) | yes |
| 1972 | 150 | Curt Watson (stored mirrored, "Watson, CurtCurt Watson"), Saints, Tennessee | 6 | Curt Watson, Saints, RB, Tennessee, round 6 | Curt Watson, RB, Tennessee, Saints, round 6 | yes |
| 1972 | 250 | Mike Franks, Cardinals, Eastern New Mexico | 10 | Mike Franks, Cardinals, QB, Eastern New Mexico, round 10 | Mike Franks, QB, Eastern New Mexico, Cardinals, round 10 | yes |
| 1973 | 330 | Alan Kelso, 49ers, Washington | 13 | Alan Kelso, 49ers, C, Washington, round 13 | Al Kelso, C, Washington, 49ers, round 13 | yes |
| 1973 | 400 | Ken Muhlbeier, Broncos, Idaho | 16 | Ken Muhlbeier, Broncos, C, Idaho, round 16 | Ken Muhlbeier, C, Idaho, Broncos, round 16 | yes |
| 1974 | 100 | Jimmy Allen, Steelers, UCLA | 4 | Jimmy Allen, Steelers, DB, UCLA, round 4 | Jimmy Allen, DB, UCLA, Steelers, round 4 | yes |
| 1975 | 240 | Hank Englehardt, Broncos, Pacific | 10 | Hank Englehardt, Broncos, C, Pacific, round 10 | Hank Englehardt, C, Pacific, Broncos, round 10 | yes |
| 1975 | 300 | Andre Roundtree, Lions, Iowa State | 12 | Andre Roundtree, Lions, LB, Iowa State, round 12 | Andre Roundtree, LB, Iowa State, Lions, round 12 | yes |
| 1946 | 280 | Jay Perrin, Rams, USC | 29 | Jay Perrin, Rams, T, USC, round 29 (32 rounds, 300 picks) | Jay Perrin, Rams, T, Southern California, round 29 (32 rounds, 300 picks) | yes |
| 1946 | 281 | Jim LaRue, Cardinals, Duke | 30 | Jim LaRue, Cardinals, B, Duke, round 30 | Jim LaRue, Cardinals, B, round 30 (college read as Maryland) | yes, on the round |
| 1950 | 391 | Dud Parker, Eagles, Baylor | 30 | Dud Parker, Eagles, B, Baylor, round 30 (30 rounds, 391 picks) | Dud Parker, Eagles, B, Baylor, round 30 (30 rounds, 391 picks) | yes |

Read but NOT used as pins, because the two pages did not come back agreeing:

- 1971 pick 200: derived round 8; drafthistory.com gives Ted Gregory, Giants,
  DE, Delaware, round 8; the profootballarchives.com page read back Larry
  Woods, Lions, DT, Tennessee State, round 4 at that pick, which cannot be pick
  200 in a 26 a round draft, so that read is not trusted either way.
- 1974 pick 380: derived round 15; profootballarchives.com gives Ransom
  Terrell, Browns, LB, Arizona, round 15; drafthistory.com's page read back
  round 16 for the same player, which contradicts its own 26 a round structure.
- 1975 pick 380: derived round 15; both give round 15, but drafthistory.com
  gives Brison Manor, Jets, DT, Arkansas (the table's row) and
  profootballarchives.com gives Jerry Arnold, Broncos, G, Oklahoma: a player
  question for another round, not a round question.
- 1946 pick 51 and 1950 pick 93: derived rounds 7 and 8, drafthistory.com
  agrees on both (Pat Lenshan, Cardinals, round 7; Dick Harris, Colts, round 8);
  the profootballarchives.com pages did not read back cleanly at those picks.

Draft shapes both organisations agree on: 1970 to 1975 are 17 rounds of 26,
442 picks; 1976 is 17 rounds, 487 picks, round 15 from 404 and round 17 from
460 to 487; 1946 is 32 rounds, 300 picks; 1950 is 30 rounds, 391 picks.

`scripts/simCollegeTables.mjs` section 1 holds the "pin: yes" rows above
against the derivation: before the migration lands it derives those rounds
from the live table, and after it lands it reads them back from the rows.

## 3. The other four tables

Nothing in `ncaa_player_stats`, `cfb_qb_stats`, `cfb_rb_stats` or
`cbb_programs` needed an outside source: the twin rows are identical copies
(checked column for column before any delete), the placeholder names start
with "_" on the source site itself, and the three cbb pairs are the same
school at the same home court in the same city (the rows' own hints). The one
outside fact used, Loyola Chicago's 1963 title, is already two sourced in
`scripts/simCbbPrograms.mjs`.
