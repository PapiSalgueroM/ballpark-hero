# Higher or Lower soccer pool, verification record

Round 535, run 2026-09-12. Target file `src/data/higherLowerPlayers.ts`, read by
`src/hooks/useHigherLower.ts` (/higher-lower) and by the three soccer categories in
`src/lib/faceOff.ts` (/face-off). Before this round the file shipped 204 rows and five
career totals per row with no source of any kind.

**Outcome: 204 rows in, 199 out.**

| Status | Rows | What the row's cap figure is |
| --- | --- | --- |
| VERIFIED | 58 | two independent publishers print the same number, and the number was already right |
| CORRECTED | 12 | two independent publishers print the same number, and the file's number was wrong |
| MARKED | 129 | one named publisher's figure, with the URL on this page and a line on the card in both games |
| REMOVED | 5 | structurally broken, not unfinished: two duplicate people and three rows with more career goals than appearances |

**The first pass at this round removed 134 rows and shipped 70, and that was the
wrong call.** Its own evidence sorted those 134 into two sources disagreeing (26),
one source read (68), never reached (34) and structurally broken (6). Only five of
the 134 were actually broken: the sixth was Lev Yashin, whose country was wrong and
is now fixed. The other 128 were unfinished checking, not bad data, and the round
had run out of fetch budget rather than out of publishers. Meanwhile appearances
and goals could not be checked against any publisher on this file's convention and
were kept on every row under the marking rule, because dropping them would empty
both games. That is two standards in one file: the caps column was held to
proof and the club columns to disclosure. This pass applies the club column's
standard to caps as well, which is the weaker claim honestly labelled rather than
the stronger claim quietly assumed. Nothing ships now that did not ship before
without a publisher named for it, and 34 rows that had no publisher at all were
read for the first time on 2026-09-12 rather than restored on the old numbers.

---

## The convention, one rule applied to every row

- **internationalCaps**: senior full internationals (A matches), as published.
- **appearances, goals**: senior competitive **club** matches, all competitions (league,
  domestic cup, league cup, continental, super cups). Friendlies and tour games do not
  count, youth and reserve teams do not count, international matches do not count.

Where a total depends on the convention, the narrowest figure a publisher actually
prints ships, and every competing figure is named here and nowhere in the game.

**Pele is the case where even that is not enough, and this record originally overstated
it.** A first pass through this file said his club pair was "the competitive figure both
publishers agree on". That was wrong and is corrected here. The three published figures
are not three readings of one convention, they are three different conventions:

| Figure | What it actually counts | Source |
| --- | --- | --- |
| 647 games, 606 goals (Santos 583/569 plus New York Cosmos 64/37) | Wikipedia's club career table, which that article labels **league** appearances and goals, so it is narrower than this file's convention | https://en.wikipedia.org/wiki/Pel%C3%A9 |
| 851 games, 778 goals | RSSSF's "official matches" total, which is **club plus national team** together, so it is wider than this file's convention | https://www.rsssf.org/players/ppeledata.html |
| 1,413 games, 1,324 goals | RSSSF's all matches total, friendlies and tour games counted | https://www.rsssf.org/players/ppeledata.html |

No publisher reached in this round prints Pele's senior competitive club total on this
file's convention, all competitions and club only. **647/606 ships because it is the one
published pair that cannot be an overstatement**, being a strict subset of the convention,
and the row is in `HL_PRE1985_CLUB` so both games say on the card that the number is one
publisher's figure and not a settled one. It is not claimed as verified anywhere.

The old row shipped 1,363 games and 1,281 goals, which is the all matches pair and is
internally coherent. What was wrong with it was not arithmetic, it was that the pool
never said which convention it was on, so one row counted friendlies and tour games
while the rest did not, and the two games compared them as though they were the same
kind of number.

## The sources, and which ones refused

Two independent publishers behind a VERIFIED cap figure, one named publisher behind a
MARKED one, and no shipped figure without a URL on this page.

- **Source A, RSSSF** (`rsssf.org`), the record international players archive: a page per
  country listing every international with their cap total, plus the 100 caps and 30
  goals century list. Independent of Wikipedia, maintained by the Rec.Sport.Soccer
  Statistics Foundation.
- **Source B, Wikipedia**, the national team records and statistics article for the
  relevant country, or the list of England internationals, or the list of men's
  footballers with 100 or more international caps.

**A row is VERIFIED only where the two print the SAME number, and 70 rows clear that
bar.** The two publishers snapshot on different dates, so a player still adding caps
usually cannot be pinned: RSSSF has Cristiano Ronaldo on 226 caps and Wikipedia on 233,
and neither is wrong, they are just months apart.

**Where they disagree, both figures are recorded here and the narrower one ships,
marked.** RSSSF is the narrower read on all 26 of those rows, which is the same rule the
club columns already follow: the figure that can understate a career but cannot inflate
one. The row then says on the card, in both games, that one publisher stands behind it.

**Thirty four rows had no publisher read for them at all in the first pass**, so they
were read on 2026-09-12 before being restored, and nothing was restored on the file's own
unsourced number:

- **RSSSF country pages, 24 rows.** The pages already cited plus Northern Ireland,
  Wales, Ireland, Norway, Sweden, Scotland, Slovenia, Morocco, Gabon, South Korea,
  Georgia, Bulgaria, Turkey, the Yugoslavia and Serbia page, Nigeria, Ecuador and the
  Soviet Union and CIS page. Each row's page and the date that page carries are in the
  table below. These pages go a long way down, to 3 caps on Norway's and 5 on Uruguay's,
  which is why a first pass that only read the top of the archive missed them.
- **The player's own Wikipedia article, 11 rows.** Eleven players sit below their
  country's RSSSF page threshold (England's stops at 30 caps, Spain's and Portugal's at
  15, France's at 11), so the infobox cap total is the figure on record, with the as of
  stamp the infobox prints. That stamp is in the table too.

Reading them changed real numbers rather than confirming them: the file had Cole Palmer
on 24 caps against a published 14, James Maddison on 12 against 7, Mathys Tel on 6 when
he has no senior France cap at all, and Iker Muniain on 10 against 2. Those four are the
argument for reading a source before restoring a row.

**Blocked, and therefore not cited anywhere in this record.** Every publisher that prints
a club career total on the convention above refused the fetch:

| Host | Result |
| --- | --- |
| `worldfootball.net` | HTTP 403 on every player page |
| `fbref.com` (Sports Reference) | HTTP 403 |
| `transfermarkt.com` | blocked outright by the fetch tool |
| `footballdatabase.eu` | HTTP 403 |
| `playmakerstats.com` | HTTP 403 |
| `11v11.com` | HTTP 403 |
| `weltfussball.de` | HTTP 403 |
| `soccerway.com` | loads, but serves no player profile content |
| `eu-football.info` | empty body |
| `en.wikipedia.org` career statistics tables | the article loads, but the fetch truncates long articles before the "Career total" row, so the all competitions club total is not reliably readable |

`besoccer.com` does answer and does print club career totals, and `national-football-teams.com`
answers for caps. Neither is used as a shipped source here: besoccer is one publisher and
one is not two, and national-football-teams disagreed with RSSSF by up to 19 caps on
settled careers (Sergio Ramos 161 against RSSSF's 180), which reads as a stale snapshot
rather than a second opinion.

## What is verified and what is not, in the file itself

The distinction is machine readable, so the next round can shrink the marked set without
guessing which rows it already did, and so neither game can claim a check that was never
made.

| In `src/data/higherLowerPlayers.ts` | Holds | Card says |
| --- | --- | --- |
| `HL_CAPS_VERIFIED` | the 70 names whose caps two publishers printed the same | nothing, there is nothing to say |
| `HL_CAPS_MARKED` | the other 129 names, each mapped to the URL of the one publisher behind its figure | `HL_CAPS_NOTE` |
| `HL_UNVERIFIED_STATS` | appearances and goals, on every row | `HL_UNVERIFIED_NOTE` |
| `HL_PRE1985_CLUB` | the 9 rows whose club career finished before 1985 | `HL_PRE1985_CLUB_NOTE` instead of the line above |

Every row is in exactly one of the first two, never both and never neither, and
`scripts/simHigherLower.mjs` section 6 fails if that stops being true or if a marked row
loses its URL.

**appearances and goals are not checked against a publisher at all**, and the note now
says that rather than the old wording, which claimed they "come from one publisher, not
two". No club total in this file was read off a publisher on this convention: every host
that prints one refused the fetch, so the honest claim is weaker than the one the first
pass shipped. They stay in the file because removing them leaves a one stat pool and
empties both games. Both consumers print the line (`/higher-lower` under the revealed
card, `/face-off` under the reveal) and section 4 fails if either stops.

`HL_PRE1985_CLUB` carries a narrower caveat on an era rule rather than a hand picked
list: a club career finished before 1985 has no settled appearance or goal total, because
the publishers of the time counted friendlies and tour games differently and nobody has
reconciled them since. Nine rows qualify, four of them restored this pass: Pele, Johan
Cruyff, Franz Beckenbauer, George Best, Gerd Muller, Alfredo Di Stefano, Lev Yashin,
Giacinto Facchetti, Bobby Charlton.

## Structural defects found and fixed, beyond the numbers

- **The pool carried the same person twice, twice over.** "Ronaldo de Assis (R10)" was a
  byte for byte copy of the Ronaldinho row, and "Toni Ruediger" was a byte for byte copy of
  the Antonio Ruediger row. Both games could therefore ask which of two identical people
  had more of something. Both duplicates removed.
- **Two rows paired a cap total with a country it does not belong to, and both are
  corrected rather than removed.** Lev Yashin was down as Russia; he played for the Soviet
  Union, and RSSSF's Soviet Union and CIS page prints the 74 caps the file already
  carried, so the fix is the country and the row stays. Alfredo Di Stefano was down as
  Argentina with 31 caps, which is his Spain total: RSSSF's Spain page prints "31 23" for
  him, and he won 6 caps for Argentina. The row now says Spain, which is the team those 31
  games were played for.
- **Three rows shipped more career goals than career appearances**, which is what happens
  when an all matches goal total meets a narrower appearance total in the same row:
  Eusebio (623 goals in 614 games), Romario (755 in 740) and Ferenc Puskas (620 in 530).
  All three are removed, because the competitive pair for each is itself disputed between
  publishers, and `scripts/simHigherLower.mjs` section 2 now fails on the shape so it
  cannot come back. Pele was a fourth row on the same theme but not the same defect: his
  pair was coherent and simply on the other convention, and he is handled above.
- **Two stats were deleted outright rather than verified: career assists and career
  trophies.** No publisher prints either on any agreed convention. There is no career
  assist figure at all for a career that ended before the 1990s, and "trophies won" depends
  entirely on whether you count a Super Cup, a shared title, or an unused substitute's
  medal, so every published count is a house rule. That removed 408 numbers that were
  deciding two games. `/higher-lower` is now a three stat game and the how to play, the
  SEO copy and the examples were rewritten to match.

## The queue for the next round

The 129 MARKED rows ship today and are the work list. They are still the same four
buckets, which is what makes them a queue rather than a pile: each bucket needs a
different thing done to it, and the row by row table below says which bucket a row is in
by what its note says.

1. **Two publishers read and they disagree** (26 rows). Almost all are active players
   whose publishers snapshot months apart. Both figures are in the table. A third source
   pinned to a stated date settles each of these cheaply, and the row then moves to
   `HL_CAPS_VERIFIED`.
2. **One publisher read, RSSSF** (68 rows). The independent second was never reached.
   These need source B only, and source B for most of them is the national team records
   article that the 70 verified rows already used.
3. **Read for the first time on 2026-09-12** (35 rows, the 34 that had nothing plus Lev
   Yashin). 24 came from an RSSSF country page and 11 from the player's own Wikipedia
   infobox. The 11 Wikipedia rows are the weakest in the pool, because their countries'
   RSSSF pages stop above their cap totals, so a second publisher for a low cap
   international is the harder half of this bucket.
4. **Removed and staying removed** (5 rows). Two duplicate people and three rows with
   more career goals than appearances. Nothing to check, they are broken.

And the standing item: **appearances and goals need any reachable publisher on this
file's convention.** Until one exists, the marking stays and the note says what it
actually is, which is unchecked rather than single sourced.

---

## Row by row

Before and After are written `appearances/goals/caps`. On a VERIFIED or CORRECTED row,
Source A and Source B are the two publishers that print the same cap figure. On a MARKED
row, Source A is the one publisher the shipped figure comes from, and Source B is filled
only where a second publisher was read and disagreed, in which case the note carries both
numbers. The five REMOVED rows are structural and carry no source, because there is
nothing about them a source would settle.

| Player | Before apps/goals/caps | After apps/goals/caps | Source A | Source B | Note | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Pelé | 1363/1281/92 | 647/606/92 | https://www.rsssf.org/miscellaneous/braz-recintlp.html | https://en.wikipedia.org/wiki/Brazil_national_football_team_records_and_statistics | caps 92 agreed by both. Club pair was an all matches goal count against a narrower appearance count; the narrowest published pair ships and is marked, see the Pele table above, no publisher prints this file's convention for him | CORRECTED |
| Diego Maradona | 592/312/91 | 592/312/91 | https://www.rsssf.org/miscellaneous/arg-recintlp.html | https://en.wikipedia.org/wiki/Argentina_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Johan Cruyff | 520/294/48 | 520/294/48 | https://www.rsssf.org/miscellaneous/ned-recintlp.html | https://en.wikipedia.org/wiki/Netherlands_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Franz Beckenbauer | 584/75/103 | 584/75/103 | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one publisher: RSSSF prints 103 caps and no independent second was reached, so 103 ships marked single source. Club pair unchanged and marked. | MARKED |
| Ronaldinho | 615/205/97 | 615/205/97 | https://www.rsssf.org/miscellaneous/braz-recintlp.html | https://en.wikipedia.org/wiki/Brazil_national_football_team_records_and_statistics | two publishers disagree: RSSSF prints 97, a Wikipedia read of 33 that is plainly wrong. The narrower figure 97 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Zinedine Zidane | 681/125/108 | 681/125/108 | https://www.rsssf.org/miscellaneous/fran-recintlp.html | https://en.wikipedia.org/wiki/France_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Ronaldo Nazário | 518/352/98 | 518/352/98 | https://www.rsssf.org/miscellaneous/braz-recintlp.html | https://en.wikipedia.org/wiki/Brazil_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Thierry Henry | 797/411/123 | 797/411/123 | https://www.rsssf.org/miscellaneous/fran-recintlp.html | https://en.wikipedia.org/wiki/France_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Paolo Maldini | 902/33/126 | 902/33/126 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| David Beckham | 719/127/115 | 719/127/115 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Roberto Carlos | 850/113/125 | 850/113/125 | https://www.rsssf.org/miscellaneous/braz-recintlp.html | https://en.wikipedia.org/wiki/Brazil_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Kaká | 618/192/92 | 618/192/92 | https://www.rsssf.org/miscellaneous/braz-recintlp.html |  | one publisher: RSSSF prints 92 caps and no independent second was reached, so 92 ships marked single source. Club pair unchanged and marked. | MARKED |
| George Best | 586/205/37 | 586/205/37 | https://www.rsssf.org/miscellaneous/nil-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 37 caps on a page dated 16 Jan 2026, read 2026-09-12, so 37 ships marked single source. Club pair unchanged and marked. | MARKED |
| Michel Platini | 580/312/72 | 580/312/72 | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one publisher: RSSSF prints 72 caps and no independent second was reached, so 72 ships marked single source. Club pair unchanged and marked. | MARKED |
| Eusébio | 614/623/64 | removed |  |  | shipped 623 goals against 614 appearances | REMOVED |
| Marco van Basten | 373/277/58 | 373/277/58 | https://www.rsssf.org/miscellaneous/ned-recintlp.html |  | one publisher: RSSSF prints 58 caps and no independent second was reached, so 58 ships marked single source. Club pair unchanged and marked. | MARKED |
| Gerd Müller | 607/566/62 | 607/566/62 | https://www.rsssf.org/miscellaneous/duit-recintlp.html | https://en.wikipedia.org/wiki/Germany_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Romário | 740/755/70 | removed |  |  | shipped 755 goals against 740 appearances | REMOVED |
| Alessandro Del Piero | 705/289/91 | 705/289/91 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Rivaldo | 676/292/74 | 676/292/74 | https://www.rsssf.org/miscellaneous/braz-recintlp.html |  | one publisher: RSSSF prints 74 caps and no independent second was reached, so 74 ships marked single source. Club pair unchanged and marked. | MARKED |
| Michael Owen | 482/222/89 | 482/222/89 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Raúl | 862/399/102 | 862/399/102 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Andriy Shevchenko | 651/342/111 | 651/342/111 | https://www.rsssf.org/miscellaneous/century.html |  | one publisher: RSSSF prints 111 caps and no independent second was reached, so 111 ships marked single source. Club pair unchanged and marked. | MARKED |
| Patrick Vieira | 698/54/107 | 698/54/107 | https://www.rsssf.org/miscellaneous/fran-recintlp.html | https://en.wikipedia.org/wiki/France_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Ruud Gullit | 483/176/66 | 483/176/66 | https://www.rsssf.org/miscellaneous/ned-recintlp.html |  | one publisher: RSSSF prints 66 caps and no independent second was reached, so 66 ships marked single source. Club pair unchanged and marked. | MARKED |
| Dennis Bergkamp | 638/201/79 | 638/201/79 | https://www.rsssf.org/miscellaneous/ned-recintlp.html | https://en.wikipedia.org/wiki/Netherlands_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Alan Shearer | 559/283/63 | 559/283/63 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Ryan Giggs | 963/168/64 | 963/168/64 | https://www.rsssf.org/miscellaneous/wal-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 64 caps on a page dated 14 Mar 2026, read 2026-09-12, so 64 ships marked single source. Club pair unchanged and marked. | MARKED |
| Roy Keane | 602/62/67 | 602/62/67 | https://www.rsssf.org/miscellaneous/ier-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 67 caps on a page dated 16 Jan 2026, read 2026-09-12, so 67 ships marked single source. Club pair unchanged and marked. | MARKED |
| Xavi | 940/85/133 | 940/85/133 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Andrés Iniesta | 874/86/131 | 874/86/131 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Carles Puyol | 593/18/100 | 593/18/100 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Roberto Baggio | 490/236/56 | 490/236/56 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Fabio Cannavaro | 669/16/136 | 669/16/136 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Cafu | 801/36/142 | 801/36/142 | https://www.rsssf.org/miscellaneous/braz-recintlp.html | https://en.wikipedia.org/wiki/Brazil_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Cristiano Ronaldo | 1240/940/218 | 1240/940/226 | https://www.rsssf.org/miscellaneous/port-recintlp.html | https://en.wikipedia.org/wiki/Portugal_national_football_team_records_and_statistics | two publishers disagree: RSSSF prints 226, the records article prints 233. The narrower figure 226 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Lionel Messi | 1110/860/190 | 1110/860/196 | https://www.rsssf.org/miscellaneous/arg-recintlp.html | https://en.wikipedia.org/wiki/Argentina_national_football_team_records_and_statistics | two publishers disagree: RSSSF prints 196, the records article prints 207. The narrower figure 196 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Neymar | 620/280/128 | 620/280/128 | https://www.rsssf.org/miscellaneous/century.html |  | one publisher: RSSSF prints 128 caps and no independent second was reached, so 128 ships marked single source. Club pair unchanged and marked. | MARKED |
| Kylian Mbappé | 460/310/92 | 460/310/94 | https://www.rsssf.org/miscellaneous/fran-recintlp.html | https://en.wikipedia.org/wiki/France_national_football_team_records_and_statistics | two publishers disagree: RSSSF prints 94, the records article prints 106. The narrower figure 94 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Robert Lewandowski | 910/672/160 | 910/672/163 | https://www.rsssf.org/miscellaneous/century.html |  | one publisher: RSSSF prints 163 caps and no independent second was reached, so 163 ships marked single source. Club pair unchanged and marked. | MARKED |
| Erling Haaland | 330/280/42 | 330/280/48 | https://www.rsssf.org/miscellaneous/noo-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 48 caps on a page dated 14 Mar 2026, read 2026-09-12, so 48 ships marked single source. Club pair unchanged and marked. | MARKED |
| Mohamed Salah | 720/340/110 | 720/340/115 | https://www.rsssf.org/miscellaneous/century.html |  | one publisher: RSSSF prints 115 caps and no independent second was reached, so 115 ships marked single source. Club pair unchanged and marked. | MARKED |
| Kevin De Bruyne | 610/120/108 | 610/120/115 | https://www.rsssf.org/miscellaneous/belg-recintlp.html | https://en.wikipedia.org/wiki/Belgium_national_football_team_records_and_statistics | two publishers disagree: RSSSF prints 115, the records article prints 124. The narrower figure 115 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Luka Modrić | 850/80/182 | 850/80/194 | https://www.rsssf.org/miscellaneous/kroa-recintlp.html | https://en.wikipedia.org/wiki/Croatia_national_football_team_records_and_statistics | two publishers disagree: RSSSF prints 194, the records article prints 202. The narrower figure 194 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Toni Kroos | 735/52/114 | 735/52/114 | https://www.rsssf.org/miscellaneous/duit-recintlp.html | https://en.wikipedia.org/wiki/Germany_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Sergio Ramos | 830/101/180 | 830/101/180 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Virgil van Dijk | 575/48/75 | 575/48/88 | https://www.rsssf.org/miscellaneous/ned-recintlp.html |  | one publisher: RSSSF prints 88 caps and no independent second was reached, so 88 ships marked single source. Club pair unchanged and marked. | MARKED |
| Karim Benzema | 860/435/97 | 860/435/97 | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one publisher: RSSSF prints 97 caps and no independent second was reached, so 97 ships marked single source. Club pair unchanged and marked. | MARKED |
| Luis Suárez | 770/500/140 | 770/500/138 | https://www.rsssf.org/miscellaneous/uru-recintlp.html | https://en.wikipedia.org/wiki/Uruguay_national_football_team_records_and_statistics | two publishers disagree: RSSSF prints 138, the records article prints 143. The narrower figure 138 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Zlatan Ibrahimović | 860/496/122 | 860/496/122 | https://www.rsssf.org/miscellaneous/century.html |  | one publisher: RSSSF prints 122 caps and no independent second was reached, so 122 ships marked single source. Club pair unchanged and marked. | MARKED |
| Thomas Müller | 730/245/131 | 730/245/131 | https://www.rsssf.org/miscellaneous/duit-recintlp.html | https://en.wikipedia.org/wiki/Germany_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Wayne Rooney | 763/313/120 | 763/313/120 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Franck Ribéry | 620/135/81 | 620/135/81 | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one publisher: RSSSF prints 81 caps and no independent second was reached, so 81 ships marked single source. Club pair unchanged and marked. | MARKED |
| Arjen Robben | 615/248/96 | 615/248/96 | https://www.rsssf.org/miscellaneous/ned-recintlp.html | https://en.wikipedia.org/wiki/Netherlands_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Andrea Pirlo | 686/58/116 | 686/58/116 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Samuel Eto'o | 718/395/118 | 718/395/118 | https://www.rsssf.org/miscellaneous/century.html |  | one publisher: RSSSF prints 118 caps and no independent second was reached, so 118 ships marked single source. Club pair unchanged and marked. | MARKED |
| Didier Drogba | 650/305/105 | 650/305/105 | https://www.rsssf.org/miscellaneous/century.html |  | one publisher: RSSSF prints 105 caps and no independent second was reached, so 105 ships marked single source. Club pair unchanged and marked. | MARKED |
| Frank Lampard | 898/271/106 | 898/271/106 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Steven Gerrard | 748/186/114 | 748/186/114 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Robin van Persie | 558/276/102 | 558/276/102 | https://www.rsssf.org/miscellaneous/ned-recintlp.html | https://en.wikipedia.org/wiki/Netherlands_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Fernando Torres | 680/262/110 | 680/262/110 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| David Silva | 680/115/125 | 680/115/125 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Mesut Özil | 580/85/92 | 580/85/92 | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one publisher: RSSSF prints 92 caps and no independent second was reached, so 92 ships marked single source. Club pair unchanged and marked. | MARKED |
| Edinson Cavani | 680/405/136 | 680/405/136 | https://www.rsssf.org/miscellaneous/uru-recintlp.html | https://en.wikipedia.org/wiki/Uruguay_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Pierre-Emerick Aubameyang | 585/310/72 | 585/310/86 | https://www.rsssf.org/miscellaneous/gab-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 86 caps on a page dated 16 Feb 2026, read 2026-09-12, so 86 ships marked single source. Club pair unchanged and marked. | MARKED |
| Sergio Agüero | 692/379/101 | 692/379/101 | https://www.rsssf.org/miscellaneous/arg-recintlp.html | https://en.wikipedia.org/wiki/Argentina_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Antoine Griezmann | 720/275/140 | 720/275/137 | https://www.rsssf.org/miscellaneous/fran-recintlp.html | https://en.wikipedia.org/wiki/France_national_football_team_records_and_statistics | caps 140 was wrong, both sources print 137 | CORRECTED |
| Eden Hazard | 574/153/126 | 574/153/126 | https://www.rsssf.org/miscellaneous/belg-recintlp.html | https://en.wikipedia.org/wiki/Belgium_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Sadio Mané | 620/235/110 | 620/235/126 | https://www.rsssf.org/miscellaneous/century.html |  | one publisher: RSSSF prints 126 caps and no independent second was reached, so 126 ships marked single source. Club pair unchanged and marked. | MARKED |
| Son Heung-min | 600/220/130 | 600/220/140 | https://www.rsssf.org/miscellaneous/century.html |  | one publisher: RSSSF prints 140 caps and no independent second was reached, so 140 ships marked single source. Club pair unchanged and marked. | MARKED |
| Harry Kane | 640/395/105 | 640/395/112 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | two publishers disagree: RSSSF prints 112, the records article prints 121. The narrower figure 112 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Vinicius Jr | 360/132/44 | 360/132/45 | https://www.rsssf.org/miscellaneous/braz-recintlp.html |  | one publisher: RSSSF prints 45 caps and no independent second was reached, so 45 ships marked single source. Club pair unchanged and marked. | MARKED |
| Jude Bellingham | 300/78/48 | 300/78/46 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | two publishers disagree: RSSSF prints 46, the records article prints 56. The narrower figure 46 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Bukayo Saka | 290/78/46 | 290/78/48 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | two publishers disagree: RSSSF prints 48, the records article prints 56. The narrower figure 48 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Phil Foden | 315/88/48 | 315/88/47 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | two publishers disagree: RSSSF prints 47, the records article prints 49. The narrower figure 47 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Pedri | 245/27/40 | 245/27/38 | https://www.rsssf.org/miscellaneous/span-recintlp.html |  | one publisher: RSSSF prints 38 caps and no independent second was reached, so 38 ships marked single source. Club pair unchanged and marked. | MARKED |
| Gavi | 185/15/32 | 185/15/28 | https://www.rsssf.org/miscellaneous/span-recintlp.html |  | one publisher: RSSSF prints 28 caps and no independent second was reached, so 28 ships marked single source. Club pair unchanged and marked. | MARKED |
| Jamal Musiala | 250/65/44 | 250/65/40 | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one publisher: RSSSF prints 40 caps and no independent second was reached, so 40 ships marked single source. Club pair unchanged and marked. | MARKED |
| Florian Wirtz | 235/60/36 | 235/60/37 | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one publisher: RSSSF prints 37 caps and no independent second was reached, so 37 ships marked single source. Club pair unchanged and marked. | MARKED |
| Lamine Yamal | 120/22/28 | 120/22/23 | https://www.rsssf.org/miscellaneous/span-recintlp.html |  | one publisher: RSSSF prints 23 caps and no independent second was reached, so 23 ships marked single source. Club pair unchanged and marked. | MARKED |
| N'Golo Kanté | 550/24/56 | 550/24/65 | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one publisher: RSSSF prints 65 caps and no independent second was reached, so 65 ships marked single source. Club pair unchanged and marked. | MARKED |
| Raphaël Varane | 510/20/93 | 510/20/93 | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one publisher: RSSSF prints 93 caps and no independent second was reached, so 93 ships marked single source. Club pair unchanged and marked. | MARKED |
| Thibaut Courtois | 570/0/106 | 570/0/107 | https://www.rsssf.org/miscellaneous/belg-recintlp.html | https://en.wikipedia.org/wiki/Belgium_national_football_team_records_and_statistics | two publishers disagree: RSSSF prints 107, the records article prints 115. The narrower figure 107 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Alisson Becker | 475/1/70 | 475/1/76 | https://www.rsssf.org/miscellaneous/braz-recintlp.html |  | one publisher: RSSSF prints 76 caps and no independent second was reached, so 76 ships marked single source. Club pair unchanged and marked. | MARKED |
| Manuel Neuer | 750/0/124 | 750/0/124 | https://www.rsssf.org/miscellaneous/duit-recintlp.html | https://en.wikipedia.org/wiki/Germany_national_football_team_records_and_statistics | two publishers disagree: RSSSF prints 124, the records article prints 128. The narrower figure 124 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Jan Oblak | 520/0/72 | 520/0/82 | https://www.rsssf.org/miscellaneous/slov-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 82 caps on a page dated 16 Jan 2026, read 2026-09-12, so 82 ships marked single source. Club pair unchanged and marked. | MARKED |
| Marc-André ter Stegen | 490/0/42 | 490/0/44 | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one publisher: RSSSF prints 44 caps and no independent second was reached, so 44 ships marked single source. Club pair unchanged and marked. | MARKED |
| Gianluigi Buffon | 1125/0/176 | 1125/0/176 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Iker Casillas | 870/0/167 | 870/0/167 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Petr Čech | 670/0/124 | 670/0/124 | https://www.rsssf.org/miscellaneous/century.html |  | one publisher: RSSSF prints 124 caps and no independent second was reached, so 124 ships marked single source. Club pair unchanged and marked. | MARKED |
| Dani Alves | 910/72/126 | 910/72/126 | https://www.rsssf.org/miscellaneous/braz-recintlp.html | https://en.wikipedia.org/wiki/Brazil_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Marcelo | 680/51/58 | 680/51/58 | https://www.rsssf.org/miscellaneous/braz-recintlp.html |  | one publisher: RSSSF prints 58 caps and no independent second was reached, so 58 ships marked single source. Club pair unchanged and marked. | MARKED |
| Philipp Lahm | 560/17/113 | 560/17/113 | https://www.rsssf.org/miscellaneous/duit-recintlp.html | https://en.wikipedia.org/wiki/Germany_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Gerard Piqué | 650/54/102 | 650/54/102 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Sergio Busquets | 782/18/143 | 782/18/143 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Trent Alexander-Arnold | 375/24/36 | 375/24/34 | https://www.rsssf.org/miscellaneous/eng-recintlp.html |  | one publisher: RSSSF prints 34 caps and no independent second was reached, so 34 ships marked single source. Club pair unchanged and marked. | MARKED |
| Achraf Hakimi | 345/38/82 | 345/38/92 | https://www.rsssf.org/miscellaneous/maro-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 92 caps on a page dated 26 Mar 2026, read 2026-09-12, so 92 ships marked single source. Club pair unchanged and marked. | MARKED |
| João Cancelo | 440/18/52 | 440/18/64 | https://www.rsssf.org/miscellaneous/port-recintlp.html |  | one publisher: RSSSF prints 64 caps and no independent second was reached, so 64 ships marked single source. Club pair unchanged and marked. | MARKED |
| Andrew Robertson | 455/11/78 | 455/11/90 | https://www.rsssf.org/miscellaneous/scot-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 90 caps on a page dated 16 Jan 2026, read 2026-09-12, so 90 ships marked single source. Club pair unchanged and marked. | MARKED |
| Kyle Walker | 620/8/86 | 620/8/96 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | caps 86 was wrong, both sources print 96 | CORRECTED |
| Jordi Alba | 590/26/93 | 590/26/93 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Casemiro | 580/44/78 | 580/44/82 | https://www.rsssf.org/miscellaneous/braz-recintlp.html |  | one publisher: RSSSF prints 82 caps and no independent second was reached, so 82 ships marked single source. Club pair unchanged and marked. | MARKED |
| Joshua Kimmich | 465/34/100 | 465/34/106 | https://www.rsssf.org/miscellaneous/duit-recintlp.html | https://en.wikipedia.org/wiki/Germany_national_football_team_records_and_statistics | two publishers disagree: RSSSF prints 106, the records article prints 114. The narrower figure 106 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Bruno Fernandes | 565/152/70 | 565/152/85 | https://www.rsssf.org/miscellaneous/port-recintlp.html | https://en.wikipedia.org/wiki/Portugal_national_football_team_records_and_statistics | two publishers disagree: RSSSF prints 85, the records article prints 94. The narrower figure 85 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Bernardo Silva | 515/75/90 | 515/75/107 | https://www.rsssf.org/miscellaneous/port-recintlp.html | https://en.wikipedia.org/wiki/Portugal_national_football_team_records_and_statistics | two publishers disagree: RSSSF prints 107, the records article prints 113. The narrower figure 107 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Martin Ødegaard | 375/65/66 | 375/65/67 | https://www.rsssf.org/miscellaneous/noo-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 67 caps on a page dated 14 Mar 2026, read 2026-09-12, so 67 ships marked single source. Club pair unchanged and marked. | MARKED |
| Rodri | 395/39/66 | 395/39/59 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | two publishers disagree: RSSSF prints 59, the records article prints 70. The narrower figure 59 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Declan Rice | 355/21/60 | 355/21/72 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | two publishers disagree: RSSSF prints 72, the records article prints 80. The narrower figure 72 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Marcus Rashford | 435/142/64 | 435/142/68 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | two publishers disagree: RSSSF prints 68, the records article prints 78. The narrower figure 68 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Raheem Sterling | 585/160/84 | 585/160/82 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | caps 84 was wrong, both sources print 82 | CORRECTED |
| Jack Grealish | 370/45/40 | 370/45/39 | https://www.rsssf.org/miscellaneous/eng-recintlp.html |  | one publisher: RSSSF prints 39 caps and no independent second was reached, so 39 ships marked single source. Club pair unchanged and marked. | MARKED |
| James Maddison | 365/62/12 | 365/62/7 | https://en.wikipedia.org/wiki/James_Maddison |  | no publisher had been read for this row before. The Wikipedia infobox prints 7 caps (no as of stamp, the infobox spans 2019 to 2024), read 2026-09-12, so 7 ships marked single source. Club pair unchanged and marked. | MARKED |
| Cole Palmer | 210/68/24 | 210/68/14 | https://en.wikipedia.org/wiki/Cole_Palmer |  | no publisher had been read for this row before. The Wikipedia infobox prints 14 caps (as of 31 March 2026), read 2026-09-12, so 14 ships marked single source. Club pair unchanged and marked. | MARKED |
| Leroy Sané | 430/95/60 | 430/95/72 | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one publisher: RSSSF prints 72 caps and no independent second was reached, so 72 ships marked single source. Club pair unchanged and marked. | MARKED |
| Kingsley Coman | 410/66/58 | 410/66/61 | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one publisher: RSSSF prints 61 caps and no independent second was reached, so 61 ships marked single source. Club pair unchanged and marked. | MARKED |
| Ousmane Dembélé | 400/80/50 | 400/80/57 | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one publisher: RSSSF prints 57 caps and no independent second was reached, so 57 ships marked single source. Club pair unchanged and marked. | MARKED |
| Rafael Leão | 315/70/35 | 315/70/43 | https://www.rsssf.org/miscellaneous/port-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 43 caps on a page dated 14 Mar 2026, read 2026-09-12, so 43 ships marked single source. Club pair unchanged and marked. | MARKED |
| Federico Valverde | 325/33/65 | 325/33/55 | https://www.rsssf.org/miscellaneous/uru-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 55 caps on a page dated 2 Apr 2026, read 2026-09-12, so 55 ships marked single source. Club pair unchanged and marked. | MARKED |
| Rúben Dias | 375/13/58 | 375/13/74 | https://www.rsssf.org/miscellaneous/port-recintlp.html |  | one publisher: RSSSF prints 74 caps and no independent second was reached, so 74 ships marked single source. Club pair unchanged and marked. | MARKED |
| William Saliba | 255/8/28 | 255/8/31 | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one publisher: RSSSF prints 31 caps and no independent second was reached, so 31 ships marked single source. Club pair unchanged and marked. | MARKED |
| Kim Min-jae | 295/9/60 | 295/9/75 | https://www.rsssf.org/miscellaneous/skor-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 75 caps on a page dated 14 Feb 2026, read 2026-09-12, so 75 ships marked single source. Club pair unchanged and marked. | MARKED |
| Antonio Rüdiger | 475/20/70 | 475/20/81 | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one publisher: RSSSF prints 81 caps and no independent second was reached, so 81 ships marked single source. Club pair unchanged and marked. | MARKED |
| Marquinhos | 565/40/90 | 565/40/103 | https://www.rsssf.org/miscellaneous/braz-recintlp.html | https://en.wikipedia.org/wiki/Brazil_national_football_team_records_and_statistics | two publishers disagree: RSSSF prints 103, the records article prints 110. The narrower figure 103 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Thiago Silva | 730/35/115 | 730/35/113 | https://www.rsssf.org/miscellaneous/braz-recintlp.html | https://en.wikipedia.org/wiki/Brazil_national_football_team_records_and_statistics | caps 115 was wrong, both sources print 113 | CORRECTED |
| Giorgio Chiellini | 685/36/117 | 685/36/117 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Leonardo Bonucci | 680/35/121 | 680/35/121 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Ciro Immobile | 555/272/57 | 555/272/57 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Radamel Falcao | 580/315/105 | 580/315/104 | https://www.rsssf.org/miscellaneous/century.html |  | one publisher: RSSSF prints 104 caps and no independent second was reached, so 104 ships marked single source. Club pair unchanged and marked. | MARKED |
| Diego Costa | 480/210/24 | 480/210/24 | https://www.rsssf.org/miscellaneous/span-recintlp.html |  | one publisher: RSSSF prints 24 caps and no independent second was reached, so 24 ships marked single source. Club pair unchanged and marked. | MARKED |
| Alexis Sánchez | 650/240/158 | 650/240/168 | https://www.rsssf.org/miscellaneous/century.html | https://en.wikipedia.org/wiki/List_of_men's_footballers_with_100_or_more_international_caps | caps 158 was wrong, both sources print 168 | CORRECTED |
| Mauro Icardi | 425/230/8 | 425/230/8 | https://en.wikipedia.org/wiki/Mauro_Icardi |  | no publisher had been read for this row before. The Wikipedia infobox prints 8 caps (as of 17 March 2024), read 2026-09-12, so 8 ships marked single source. Club pair unchanged and marked. | MARKED |
| Romelu Lukaku | 635/322/120 | 635/322/124 | https://www.rsssf.org/miscellaneous/belg-recintlp.html | https://en.wikipedia.org/wiki/Belgium_national_football_team_records_and_statistics | two publishers disagree: RSSSF prints 124, the records article prints 127. The narrower figure 124 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Dries Mertens | 590/222/112 | 590/222/109 | https://www.rsssf.org/miscellaneous/belg-recintlp.html | https://en.wikipedia.org/wiki/Belgium_national_football_team_records_and_statistics | caps 112 was wrong, both sources print 109 | CORRECTED |
| Yaya Touré | 580/88/101 | 580/88/101 | https://www.rsssf.org/miscellaneous/century.html |  | one publisher: RSSSF prints 101 caps and no independent second was reached, so 101 ships marked single source. Club pair unchanged and marked. | MARKED |
| Arturo Vidal | 640/95/142 | 640/95/147 | https://www.rsssf.org/miscellaneous/century.html | https://en.wikipedia.org/wiki/List_of_men's_footballers_with_100_or_more_international_caps | caps 142 was wrong, both sources print 147 | CORRECTED |
| Ivan Rakitić | 670/85/106 | 670/85/106 | https://www.rsssf.org/miscellaneous/kroa-recintlp.html | https://en.wikipedia.org/wiki/Croatia_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Mats Hummels | 610/44/78 | 610/44/78 | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one publisher: RSSSF prints 78 caps and no independent second was reached, so 78 ships marked single source. Club pair unchanged and marked. | MARKED |
| Pepe | 680/38/141 | 680/38/141 | https://www.rsssf.org/miscellaneous/port-recintlp.html | https://en.wikipedia.org/wiki/Portugal_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Hugo Lloris | 680/0/145 | 680/0/145 | https://www.rsssf.org/miscellaneous/fran-recintlp.html | https://en.wikipedia.org/wiki/France_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| David de Gea | 560/0/45 | 560/0/45 | https://www.rsssf.org/miscellaneous/span-recintlp.html |  | one publisher: RSSSF prints 45 caps and no independent second was reached, so 45 ships marked single source. Club pair unchanged and marked. | MARKED |
| Keylor Navas | 530/0/113 | 530/0/126 | https://www.rsssf.org/miscellaneous/century.html |  | one publisher: RSSSF prints 126 caps and no independent second was reached, so 126 ships marked single source. Club pair unchanged and marked. | MARKED |
| Ederson | 380/0/25 | 380/0/30 | https://www.rsssf.org/miscellaneous/braz-recintlp.html |  | one publisher: RSSSF prints 30 caps and no independent second was reached, so 30 ships marked single source. Club pair unchanged and marked. | MARKED |
| Lautaro Martínez | 390/192/68 | 390/192/75 | https://www.rsssf.org/miscellaneous/arg-recintlp.html | https://en.wikipedia.org/wiki/Argentina_national_football_team_records_and_statistics | two publishers disagree: RSSSF prints 75, the records article prints 84. The narrower figure 75 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Viktor Gyökeres | 320/155/38 | 320/155/30 | https://www.rsssf.org/miscellaneous/zwed-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 30 caps on a page dated 16 Jan 2026, read 2026-09-12, so 30 ships marked single source. Club pair unchanged and marked. | MARKED |
| Alexander Isak | 345/140/58 | 345/140/56 | https://www.rsssf.org/miscellaneous/zwed-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 56 caps on a page dated 16 Jan 2026, read 2026-09-12, so 56 ships marked single source. Club pair unchanged and marked. | MARKED |
| Ollie Watkins | 375/122/22 | 375/122/24 | https://en.wikipedia.org/wiki/Ollie_Watkins |  | no publisher had been read for this row before. The Wikipedia infobox prints 24 caps (as of 18 July 2026), read 2026-09-12, so 24 ships marked single source. Club pair unchanged and marked. | MARKED |
| Darwin Núñez | 325/132/48 | 325/132/22 | https://www.rsssf.org/miscellaneous/uru-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 22 caps on a page dated 2 Apr 2026, read 2026-09-12, so 22 ships marked single source. Club pair unchanged and marked. | MARKED |
| Julián Álvarez | 310/118/44 | 310/118/49 | https://www.rsssf.org/miscellaneous/arg-recintlp.html |  | one publisher: RSSSF prints 49 caps and no independent second was reached, so 49 ships marked single source. Club pair unchanged and marked. | MARKED |
| Khvicha Kvaratskhelia | 275/64/45 | 275/64/47 | https://www.rsssf.org/miscellaneous/geor-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 47 caps on a page dated 21 Jan 2026, read 2026-09-12, so 47 ships marked single source. Club pair unchanged and marked. | MARKED |
| Cesc Fàbregas | 752/98/110 | 752/98/110 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Wesley Sneijder | 610/105/134 | 610/105/134 | https://www.rsssf.org/miscellaneous/ned-recintlp.html | https://en.wikipedia.org/wiki/Netherlands_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Ronaldo de Assis (R10) | 615/205/97 | removed |  |  | the same man as Ronaldinho, identical row | REMOVED |
| Lev Yashin | 570/0/74 | 570/0/74 | https://www.rsssf.org/miscellaneous/ussr-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 74 caps on a page dated 2 May 2018, read 2026-09-12, so 74 ships marked single source. Club pair unchanged and marked. Nationality corrected from Russia to the Soviet Union, the team those caps are for. | MARKED |
| Alfredo Di Stéfano | 654/510/31 | 654/510/31 | https://www.rsssf.org/miscellaneous/span-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 31 caps on a page dated 14 Mar 2026, read 2026-09-12, so 31 ships marked single source. Club pair unchanged and marked. Nationality corrected from Argentina to Spain: 31 is his Spain total, and the old row paired it with Argentina, for whom he won 6. | MARKED |
| Ferenc Puskás | 530/620/85 | removed |  |  | shipped 620 goals against 530 appearances | REMOVED |
| Lothar Matthäus | 710/159/150 | 710/159/150 | https://www.rsssf.org/miscellaneous/duit-recintlp.html | https://en.wikipedia.org/wiki/Germany_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Giacinto Facchetti | 634/75/94 | 634/75/94 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Bobby Charlton | 758/249/106 | 758/249/106 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Hristo Stoichkov | 595/259/83 | 595/259/83 | https://www.rsssf.org/miscellaneous/bulg-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 83 caps on a page dated 16 Jan 2026, read 2026-09-12, so 83 ships marked single source. Club pair unchanged and marked. | MARKED |
| Peter Schmeichel | 693/0/129 | 693/0/129 | https://www.rsssf.org/miscellaneous/century.html |  | one publisher: RSSSF prints 129 caps and no independent second was reached, so 129 ships marked single source. Club pair unchanged and marked. | MARKED |
| Oliver Kahn | 632/0/86 | 632/0/86 | https://www.rsssf.org/miscellaneous/duit-recintlp.html | https://en.wikipedia.org/wiki/Germany_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Granit Xhaka | 560/48/130 | 560/48/143 | https://www.rsssf.org/miscellaneous/century.html | https://en.wikipedia.org/wiki/List_of_men's_footballers_with_100_or_more_international_caps | two publishers disagree: RSSSF prints 143, the records article prints 152. The narrower figure 143 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Nicolò Barella | 380/42/62 | 380/42/70 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps 62 was wrong, both sources print 70 | CORRECTED |
| Hakan Çalhanoğlu | 490/88/90 | 490/88/102 | https://www.rsssf.org/miscellaneous/tur-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 102 caps on a page dated 21 Jan 2026, read 2026-09-12, so 102 ships marked single source. Club pair unchanged and marked. | MARKED |
| Alejandro Grimaldo | 380/42/18 | 380/42/14 | https://en.wikipedia.org/wiki/Alejandro_Grimaldo |  | no publisher had been read for this row before. The Wikipedia infobox prints 14 caps (as of 9 June 2026), read 2026-09-12, so 14 ships marked single source. Club pair unchanged and marked. | MARKED |
| Theo Hernández | 330/36/28 | 330/36/41 | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one publisher: RSSSF prints 41 caps and no independent second was reached, so 41 ships marked single source. Club pair unchanged and marked. | MARKED |
| Dayot Upamecano | 310/10/30 | 310/10/35 | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one publisher: RSSSF prints 35 caps and no independent second was reached, so 35 ships marked single source. Club pair unchanged and marked. | MARKED |
| Jules Koundé | 295/10/35 | 295/10/46 | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one publisher: RSSSF prints 46 caps and no independent second was reached, so 46 ships marked single source. Club pair unchanged and marked. | MARKED |
| Ronald Araújo | 200/10/35 | 200/10/16 | https://www.rsssf.org/miscellaneous/uru-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 16 caps on a page dated 2 Apr 2026, read 2026-09-12, so 16 ships marked single source. Club pair unchanged and marked. | MARKED |
| Dani Carvajal | 490/18/52 | 490/18/52 | https://www.rsssf.org/miscellaneous/span-recintlp.html |  | one publisher: RSSSF prints 52 caps and no independent second was reached, so 52 ships marked single source. Club pair unchanged and marked. | MARKED |
| Toni Rüdiger | 475/20/70 | removed |  |  | the same man as Antonio Rüdiger, identical row | REMOVED |
| Emiliano Martínez | 350/0/52 | 350/0/57 | https://www.rsssf.org/miscellaneous/arg-recintlp.html |  | one publisher: RSSSF prints 57 caps and no independent second was reached, so 57 ships marked single source. Club pair unchanged and marked. | MARKED |
| Mike Maignan | 320/0/28 | 320/0/37 | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one publisher: RSSSF prints 37 caps and no independent second was reached, so 37 ships marked single source. Club pair unchanged and marked. | MARKED |
| Diogo Jota | 370/112/42 | 370/112/49 | https://www.rsssf.org/miscellaneous/port-recintlp.html |  | one publisher: RSSSF prints 49 caps and no independent second was reached, so 49 ships marked single source. Club pair unchanged and marked. | MARKED |
| Dušan Vlahović | 300/128/35 | 300/128/41 | https://www.rsssf.org/miscellaneous/joeg-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 41 caps on a page dated 21 Jan 2026, read 2026-09-12, so 41 ships marked single source. Club pair unchanged and marked. | MARKED |
| Victor Osimhen | 310/148/38 | 310/148/51 | https://www.rsssf.org/miscellaneous/nig-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 51 caps on a page dated 2 Apr 2026, read 2026-09-12, so 51 ships marked single source. Club pair unchanged and marked. | MARKED |
| Kai Havertz | 380/88/52 | 380/88/55 | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one publisher: RSSSF prints 55 caps and no independent second was reached, so 55 ships marked single source. Club pair unchanged and marked. | MARKED |
| Aurélien Tchouaméni | 280/14/42 | 280/14/43 | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one publisher: RSSSF prints 43 caps and no independent second was reached, so 43 ships marked single source. Club pair unchanged and marked. | MARKED |
| Enzo Fernández | 245/18/30 | 245/18/37 | https://www.rsssf.org/miscellaneous/arg-recintlp.html |  | one publisher: RSSSF prints 37 caps and no independent second was reached, so 37 ships marked single source. Club pair unchanged and marked. | MARKED |
| Moisés Caicedo | 225/10/42 | 225/10/58 | https://www.rsssf.org/miscellaneous/ecua-recintlp.html |  | no publisher had been read for this row before. RSSSF prints 58 caps on a page dated 21 Jan 2026, read 2026-09-12, so 58 ships marked single source. Club pair unchanged and marked. | MARKED |
| Sandro Tonali | 260/16/22 | 260/16/32 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps 22 was wrong, both sources print 32 | CORRECTED |
| Kobbie Mainoo | 95/6/16 | 95/6/14 | https://en.wikipedia.org/wiki/Kobbie_Mainoo |  | no publisher had been read for this row before. The Wikipedia infobox prints 14 caps (as of 10 June 2026), read 2026-09-12, so 14 ships marked single source. Club pair unchanged and marked. | MARKED |
| Warren Zaïre-Emery | 120/8/18 | 120/8/13 | https://en.wikipedia.org/wiki/Warren_Za%C3%AFre-Emery |  | no publisher had been read for this row before. The Wikipedia infobox prints 13 caps (as of 18 July 2026), read 2026-09-12, so 13 ships marked single source. Club pair unchanged and marked. | MARKED |
| Mathys Tel | 130/22/6 | 130/22/0 | https://en.wikipedia.org/wiki/Mathys_Tel |  | no publisher had been read for this row before. The Wikipedia infobox lists France youth caps only and no senior appearance, read 2026-09-12, so the row ships 0 marked single source, against the 6 it used to claim. Club pair unchanged and marked. | MARKED |
| Xavi Simons | 175/38/22 | 175/38/32 | https://www.rsssf.org/miscellaneous/ned-recintlp.html |  | one publisher: RSSSF prints 32 caps and no independent second was reached, so 32 ships marked single source. Club pair unchanged and marked. | MARKED |
| Nico Williams | 175/28/28 | 175/28/30 | https://www.rsssf.org/miscellaneous/span-recintlp.html |  | one publisher: RSSSF prints 30 caps and no independent second was reached, so 30 ships marked single source. Club pair unchanged and marked. | MARKED |
| Alejandro Garnacho | 140/24/10 | 140/24/8 | https://en.wikipedia.org/wiki/Alejandro_Garnacho |  | no publisher had been read for this row before. The Wikipedia infobox prints 8 caps (as of 15 November 2024), read 2026-09-12, so 8 ships marked single source. Club pair unchanged and marked. | MARKED |
| João Félix | 325/78/35 | 325/78/50 | https://www.rsssf.org/miscellaneous/port-recintlp.html |  | one publisher: RSSSF prints 50 caps and no independent second was reached, so 50 ships marked single source. Club pair unchanged and marked. | MARKED |
| Álvaro Morata | 530/195/86 | 530/195/87 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps 86 was wrong, both sources print 87 | CORRECTED |
| Ángel Di María | 780/165/145 | 780/165/145 | https://www.rsssf.org/miscellaneous/arg-recintlp.html | https://en.wikipedia.org/wiki/Argentina_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Ivan Perišić | 620/120/120 | 620/120/150 | https://www.rsssf.org/miscellaneous/kroa-recintlp.html | https://en.wikipedia.org/wiki/Croatia_national_football_team_records_and_statistics | two publishers disagree: RSSSF prints 150, the records article prints 158. The narrower figure 150 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| David Alaba | 515/40/105 | 515/40/111 | https://www.rsssf.org/miscellaneous/century.html |  | one publisher: RSSSF prints 111 caps and no independent second was reached, so 111 ships marked single source. Club pair unchanged and marked. | MARKED |
| Marco Reus | 528/170/48 | 528/170/48 | https://www.rsssf.org/miscellaneous/duit-recintlp.html | https://en.wikipedia.org/wiki/Germany_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Paulo Dybala | 475/155/35 | 475/155/40 | https://www.rsssf.org/miscellaneous/arg-recintlp.html |  | one publisher: RSSSF prints 40 caps and no independent second was reached, so 40 ships marked single source. Club pair unchanged and marked. | MARKED |
| James Rodríguez | 520/98/110 | 520/98/122 | https://www.rsssf.org/miscellaneous/century.html | https://en.wikipedia.org/wiki/List_of_men's_footballers_with_100_or_more_international_caps | two publishers disagree: RSSSF prints 122, the records article prints 130. The narrower figure 122 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Gerard Moreno | 420/145/22 | 420/145/18 | https://www.rsssf.org/miscellaneous/span-recintlp.html |  | one publisher: RSSSF prints 18 caps and no independent second was reached, so 18 ships marked single source. Club pair unchanged and marked. | MARKED |
| Iker Muniain | 520/65/10 | 520/65/2 | https://en.wikipedia.org/wiki/Iker_Muniain |  | no publisher had been read for this row before. The Wikipedia infobox prints 2 caps (no as of stamp), read 2026-09-12, so 2 ships marked single source. Club pair unchanged and marked. | MARKED |
| Lorenzo Insigne | 510/120/54 | 510/120/54 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Jamie Vardy | 525/205/26 | 525/205/26 | https://en.wikipedia.org/wiki/Jamie_Vardy |  | no publisher had been read for this row before. The Wikipedia infobox prints 26 caps (no as of stamp, his England career finished in 2018), read 2026-09-12, so 26 ships marked single source. Club pair unchanged and marked. | MARKED |
| Ilkay Gündoğan | 580/82/82 | 580/82/82 | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one publisher: RSSSF prints 82 caps and no independent second was reached, so 82 ships marked single source. Club pair unchanged and marked. | MARKED |
| Christian Eriksen | 600/105/132 | 600/105/147 | https://www.rsssf.org/miscellaneous/century.html | https://en.wikipedia.org/wiki/List_of_men's_footballers_with_100_or_more_international_caps | two publishers disagree: RSSSF prints 147, the records article prints 151. The narrower figure 147 ships marked single source, both are on record here. Club pair unchanged and marked. | MARKED |
| Maya Yoshida | 580/30/128 | 580/30/126 | https://www.rsssf.org/miscellaneous/century.html | https://en.wikipedia.org/wiki/List_of_men's_footballers_with_100_or_more_international_caps | caps 128 was wrong, both sources print 126 | CORRECTED |
| Tim Howard | 625/0/121 | 625/0/121 | https://www.rsssf.org/miscellaneous/century.html |  | one publisher: RSSSF prints 121 caps and no independent second was reached, so 121 ships marked single source. Club pair unchanged and marked. | MARKED |
| Claudio Marchisio | 452/47/55 | 452/47/55 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
