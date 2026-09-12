# Higher or Lower soccer pool, verification record

Round 535, run 2026-09-12. Target file `src/data/higherLowerPlayers.ts`, read by
`src/hooks/useHigherLower.ts` (/higher-lower) and by the three soccer categories in
`src/lib/faceOff.ts` (/face-off). Before this round the file shipped 204 rows and five
career totals per row with no source of any kind.

**Outcome: 204 rows in, 70 out. 58 VERIFIED, 12 CORRECTED, 134 REMOVED.**

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
and the row is in `HL_MARKED` so both games say on the card that the number is one
publisher's figure and not a settled one. It is not claimed as verified anywhere.

The old row shipped 1,363 games and 1,281 goals, which is the all matches pair and is
internally coherent. What was wrong with it was not arithmetic, it was that the pool
never said which convention it was on, so one row counted friendlies and tour games
while the rest did not, and the two games compared them as though they were the same
kind of number.

## The sources, and which ones refused

Two independent publishers per shipped cap figure.

- **Source A, RSSSF** (`rsssf.org`), the record international players archive: a page per
  country listing every international with their cap total, plus the 100 caps and 30
  goals century list. Independent of Wikipedia, maintained by the Rec.Sport.Soccer
  Statistics Foundation.
- **Source B, Wikipedia**, the national team records and statistics article for the
  relevant country, or the list of England internationals, or the list of men's
  footballers with 100 or more international caps.

**A row ships only where the two print the SAME number.** That single rule is why the
pool is 70 rows and not 204. The two publishers snapshot on different dates, so a player
still adding caps usually cannot be pinned: RSSSF has Cristiano Ronaldo on 226 caps and
Wikipedia on 233, and neither is wrong, they are just months apart. Rather than pick one
and call it verified, those rows were removed and are listed below as the queue.

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

## What is verified and what is not

**internationalCaps is two source verified on all 70 shipped rows.** That is the column
this round fixed.

**appearances and goals are NOT two source verified.** One publisher is reachable for the
club convention and one is not two. They stay in the file, because removing them leaves a
one stat pool and empties both games, and under the marking rule they say so instead:
`HL_UNVERIFIED_STATS` in the data file lists them, `HL_UNVERIFIED_NOTE` is the line, and
both consumers print it (`/higher-lower` under the revealed card, `/face-off` under the
reveal). `scripts/simHigherLower.mjs` section 4 fails if either consumer stops printing it.

`HL_MARKED` carries a second, narrower caveat on an era rule rather than a hand picked
list: a club career finished before 1985 has no settled appearance or goal total, because
the publishers of the time counted friendlies and tour games differently and nobody has
reconciled them since. Five rows qualify: Pele, Johan Cruyff, Bobby Charlton, Gerd Muller,
Giacinto Facchetti.

## Structural defects found and fixed, beyond the numbers

- **The pool carried the same person twice, twice over.** "Ronaldo de Assis (R10)" was a
  byte for byte copy of the Ronaldinho row, and "Toni Ruediger" was a byte for byte copy of
  the Antonio Ruediger row. Both games could therefore ask which of two identical people
  had more of something. Both duplicates removed.
- **Lev Yashin was given the wrong country.** He played for the Soviet Union, not Russia.
  His caps could not be two source verified in this round, so the row is removed rather
  than corrected.
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

The 134 removed rows are all listed below with the reason. They fall into four buckets:

1. **Two sources read and they disagree** (26 rows). Almost all are active players whose
   two publishers snapshot months apart. A third source pinned to a stated date settles
   each of these cheaply.
2. **One source only** (66 rows). RSSSF prints a cap figure, the independent second was not
   reached. The RSSSF figure is recorded in the table so the next round only needs source B.
3. **Structurally broken** (6 rows): the two duplicates, the three impossible goal counts,
   and Lev Yashin's country.
4. **Not reached at all** (the balance). No publisher was read for the row in this round.

And the standing item: **appearances and goals need a second reachable publisher.** Until
one exists, the marking stays.

---

## Row by row

Before and After are written `appearances/goals/caps`. Source A and Source B are the two
publishers behind the caps figure. A blank source cell on a REMOVED row means that
publisher was not read for that row.

| Player | Before apps/goals/caps | After apps/goals/caps | Source A | Source B | Note | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Pelé | 1363/1281/92 | 647/606/92 | https://www.rsssf.org/miscellaneous/braz-recintlp.html | https://en.wikipedia.org/wiki/Brazil_national_football_team_records_and_statistics | caps 92 agreed by both. Club pair was an all matches goal count against a narrower appearance count; the narrowest published pair ships and is marked, see the Pele table above, no publisher prints this file's convention for him | CORRECTED |
| Diego Maradona | 592/312/91 | 592/312/91 | https://www.rsssf.org/miscellaneous/arg-recintlp.html | https://en.wikipedia.org/wiki/Argentina_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Johan Cruyff | 520/294/48 | 520/294/48 | https://www.rsssf.org/miscellaneous/ned-recintlp.html | https://en.wikipedia.org/wiki/Netherlands_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Franz Beckenbauer | 584/75/103 | removed | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one source only: RSSSF prints 103 caps, no independent second reached | REMOVED |
| Ronaldinho | 615/205/97 | removed | https://www.rsssf.org/miscellaneous/braz-recintlp.html | https://en.wikipedia.org/wiki/Brazil_national_football_team_records_and_statistics | two sources read, they disagree: caps 97 vs a Wikipedia read of 33 that is plainly wrong, so a third source is owed | REMOVED |
| Zinedine Zidane | 681/125/108 | 681/125/108 | https://www.rsssf.org/miscellaneous/fran-recintlp.html | https://en.wikipedia.org/wiki/France_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Ronaldo Nazário | 518/352/98 | 518/352/98 | https://www.rsssf.org/miscellaneous/braz-recintlp.html | https://en.wikipedia.org/wiki/Brazil_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Thierry Henry | 797/411/123 | 797/411/123 | https://www.rsssf.org/miscellaneous/fran-recintlp.html | https://en.wikipedia.org/wiki/France_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Paolo Maldini | 902/33/126 | 902/33/126 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| David Beckham | 719/127/115 | 719/127/115 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Roberto Carlos | 850/113/125 | 850/113/125 | https://www.rsssf.org/miscellaneous/braz-recintlp.html | https://en.wikipedia.org/wiki/Brazil_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Kaká | 618/192/92 | removed | https://www.rsssf.org/miscellaneous/braz-recintlp.html |  | one source only: RSSSF prints 92 caps, no independent second reached | REMOVED |
| George Best | 586/205/37 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Michel Platini | 580/312/72 | removed | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one source only: RSSSF prints 72 caps, no independent second reached | REMOVED |
| Eusébio | 614/623/64 | removed |  |  | shipped 623 goals against 614 appearances | REMOVED |
| Marco van Basten | 373/277/58 | removed | https://www.rsssf.org/miscellaneous/ned-recintlp.html |  | one source only: RSSSF prints 58 caps, no independent second reached | REMOVED |
| Gerd Müller | 607/566/62 | 607/566/62 | https://www.rsssf.org/miscellaneous/duit-recintlp.html | https://en.wikipedia.org/wiki/Germany_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Romário | 740/755/70 | removed |  |  | shipped 755 goals against 740 appearances | REMOVED |
| Alessandro Del Piero | 705/289/91 | 705/289/91 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Rivaldo | 676/292/74 | removed | https://www.rsssf.org/miscellaneous/braz-recintlp.html |  | one source only: RSSSF prints 74 caps, no independent second reached | REMOVED |
| Michael Owen | 482/222/89 | 482/222/89 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Raúl | 862/399/102 | 862/399/102 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Andriy Shevchenko | 651/342/111 | removed | https://www.rsssf.org/miscellaneous/century.html |  | one source only: RSSSF prints 111 caps, no independent second reached | REMOVED |
| Patrick Vieira | 698/54/107 | 698/54/107 | https://www.rsssf.org/miscellaneous/fran-recintlp.html | https://en.wikipedia.org/wiki/France_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Ruud Gullit | 483/176/66 | removed | https://www.rsssf.org/miscellaneous/ned-recintlp.html |  | one source only: RSSSF prints 66 caps, no independent second reached | REMOVED |
| Dennis Bergkamp | 638/201/79 | 638/201/79 | https://www.rsssf.org/miscellaneous/ned-recintlp.html | https://en.wikipedia.org/wiki/Netherlands_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Alan Shearer | 559/283/63 | 559/283/63 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Ryan Giggs | 963/168/64 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Roy Keane | 602/62/67 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Xavi | 940/85/133 | 940/85/133 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Andrés Iniesta | 874/86/131 | 874/86/131 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Carles Puyol | 593/18/100 | 593/18/100 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Roberto Baggio | 490/236/56 | 490/236/56 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Fabio Cannavaro | 669/16/136 | 669/16/136 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Cafu | 801/36/142 | 801/36/142 | https://www.rsssf.org/miscellaneous/braz-recintlp.html | https://en.wikipedia.org/wiki/Brazil_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Cristiano Ronaldo | 1240/940/218 | removed | https://www.rsssf.org/miscellaneous/port-recintlp.html | https://en.wikipedia.org/wiki/Portugal_national_football_team_records_and_statistics | two sources read, they disagree: caps 226 vs 233 | REMOVED |
| Lionel Messi | 1110/860/190 | removed | https://www.rsssf.org/miscellaneous/arg-recintlp.html | https://en.wikipedia.org/wiki/Argentina_national_football_team_records_and_statistics | two sources read, they disagree: caps 196 vs 207 | REMOVED |
| Neymar | 620/280/128 | removed | https://www.rsssf.org/miscellaneous/century.html |  | one source only: RSSSF prints 128 caps, no independent second reached | REMOVED |
| Kylian Mbappé | 460/310/92 | removed | https://www.rsssf.org/miscellaneous/fran-recintlp.html | https://en.wikipedia.org/wiki/France_national_football_team_records_and_statistics | two sources read, they disagree: caps 94 vs 106 | REMOVED |
| Robert Lewandowski | 910/672/160 | removed | https://www.rsssf.org/miscellaneous/century.html |  | one source only: RSSSF prints 163 caps, no independent second reached | REMOVED |
| Erling Haaland | 330/280/42 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Mohamed Salah | 720/340/110 | removed | https://www.rsssf.org/miscellaneous/century.html |  | one source only: RSSSF prints 115 caps, no independent second reached | REMOVED |
| Kevin De Bruyne | 610/120/108 | removed | https://www.rsssf.org/miscellaneous/belg-recintlp.html | https://en.wikipedia.org/wiki/Belgium_national_football_team_records_and_statistics | two sources read, they disagree: caps 115 vs 124 | REMOVED |
| Luka Modrić | 850/80/182 | removed | https://www.rsssf.org/miscellaneous/kroa-recintlp.html | https://en.wikipedia.org/wiki/Croatia_national_football_team_records_and_statistics | two sources read, they disagree: caps 194 vs 202 | REMOVED |
| Toni Kroos | 735/52/114 | 735/52/114 | https://www.rsssf.org/miscellaneous/duit-recintlp.html | https://en.wikipedia.org/wiki/Germany_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Sergio Ramos | 830/101/180 | 830/101/180 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Virgil van Dijk | 575/48/75 | removed | https://www.rsssf.org/miscellaneous/ned-recintlp.html |  | one source only: RSSSF prints 88 caps, no independent second reached | REMOVED |
| Karim Benzema | 860/435/97 | removed | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one source only: RSSSF prints 97 caps, no independent second reached | REMOVED |
| Luis Suárez | 770/500/140 | removed | https://www.rsssf.org/miscellaneous/uru-recintlp.html | https://en.wikipedia.org/wiki/Uruguay_national_football_team_records_and_statistics | two sources read, they disagree: caps 138 vs 143 | REMOVED |
| Zlatan Ibrahimović | 860/496/122 | removed | https://www.rsssf.org/miscellaneous/century.html |  | one source only: RSSSF prints 122 caps, no independent second reached | REMOVED |
| Thomas Müller | 730/245/131 | 730/245/131 | https://www.rsssf.org/miscellaneous/duit-recintlp.html | https://en.wikipedia.org/wiki/Germany_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Wayne Rooney | 763/313/120 | 763/313/120 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Franck Ribéry | 620/135/81 | removed | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one source only: RSSSF prints 81 caps, no independent second reached | REMOVED |
| Arjen Robben | 615/248/96 | 615/248/96 | https://www.rsssf.org/miscellaneous/ned-recintlp.html | https://en.wikipedia.org/wiki/Netherlands_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Andrea Pirlo | 686/58/116 | 686/58/116 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Samuel Eto'o | 718/395/118 | removed | https://www.rsssf.org/miscellaneous/century.html |  | one source only: RSSSF prints 118 caps, no independent second reached | REMOVED |
| Didier Drogba | 650/305/105 | removed | https://www.rsssf.org/miscellaneous/century.html |  | one source only: RSSSF prints 105 caps, no independent second reached | REMOVED |
| Frank Lampard | 898/271/106 | 898/271/106 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Steven Gerrard | 748/186/114 | 748/186/114 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Robin van Persie | 558/276/102 | 558/276/102 | https://www.rsssf.org/miscellaneous/ned-recintlp.html | https://en.wikipedia.org/wiki/Netherlands_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Fernando Torres | 680/262/110 | 680/262/110 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| David Silva | 680/115/125 | 680/115/125 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Mesut Özil | 580/85/92 | removed | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one source only: RSSSF prints 92 caps, no independent second reached | REMOVED |
| Edinson Cavani | 680/405/136 | 680/405/136 | https://www.rsssf.org/miscellaneous/uru-recintlp.html | https://en.wikipedia.org/wiki/Uruguay_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Pierre-Emerick Aubameyang | 585/310/72 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Sergio Agüero | 692/379/101 | 692/379/101 | https://www.rsssf.org/miscellaneous/arg-recintlp.html | https://en.wikipedia.org/wiki/Argentina_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Antoine Griezmann | 720/275/140 | 720/275/137 | https://www.rsssf.org/miscellaneous/fran-recintlp.html | https://en.wikipedia.org/wiki/France_national_football_team_records_and_statistics | caps 140 was wrong, both sources print 137 | CORRECTED |
| Eden Hazard | 574/153/126 | 574/153/126 | https://www.rsssf.org/miscellaneous/belg-recintlp.html | https://en.wikipedia.org/wiki/Belgium_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Sadio Mané | 620/235/110 | removed | https://www.rsssf.org/miscellaneous/century.html |  | one source only: RSSSF prints 126 caps, no independent second reached | REMOVED |
| Son Heung-min | 600/220/130 | removed | https://www.rsssf.org/miscellaneous/century.html |  | one source only: RSSSF prints 140 caps, no independent second reached | REMOVED |
| Harry Kane | 640/395/105 | removed | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | two sources read, they disagree: caps 112 vs 121 | REMOVED |
| Vinicius Jr | 360/132/44 | removed | https://www.rsssf.org/miscellaneous/braz-recintlp.html |  | one source only: RSSSF prints 45 caps, no independent second reached | REMOVED |
| Jude Bellingham | 300/78/48 | removed | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | two sources read, they disagree: caps 46 vs 56 | REMOVED |
| Bukayo Saka | 290/78/46 | removed | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | two sources read, they disagree: caps 48 vs 56 | REMOVED |
| Phil Foden | 315/88/48 | removed | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | two sources read, they disagree: caps 47 vs 49 | REMOVED |
| Pedri | 245/27/40 | removed | https://www.rsssf.org/miscellaneous/span-recintlp.html |  | one source only: RSSSF prints 38 caps, no independent second reached | REMOVED |
| Gavi | 185/15/32 | removed | https://www.rsssf.org/miscellaneous/span-recintlp.html |  | one source only: RSSSF prints 28 caps, no independent second reached | REMOVED |
| Jamal Musiala | 250/65/44 | removed | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one source only: RSSSF prints 40 caps, no independent second reached | REMOVED |
| Florian Wirtz | 235/60/36 | removed | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one source only: RSSSF prints 37 caps, no independent second reached | REMOVED |
| Lamine Yamal | 120/22/28 | removed | https://www.rsssf.org/miscellaneous/span-recintlp.html |  | one source only: RSSSF prints 23 caps, no independent second reached | REMOVED |
| N'Golo Kanté | 550/24/56 | removed | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one source only: RSSSF prints 65 caps, no independent second reached | REMOVED |
| Raphaël Varane | 510/20/93 | removed | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one source only: RSSSF prints 93 caps, no independent second reached | REMOVED |
| Thibaut Courtois | 570/0/106 | removed | https://www.rsssf.org/miscellaneous/belg-recintlp.html | https://en.wikipedia.org/wiki/Belgium_national_football_team_records_and_statistics | two sources read, they disagree: caps 107 vs 115 | REMOVED |
| Alisson Becker | 475/1/70 | removed | https://www.rsssf.org/miscellaneous/braz-recintlp.html |  | one source only: RSSSF prints 76 caps, no independent second reached | REMOVED |
| Manuel Neuer | 750/0/124 | removed | https://www.rsssf.org/miscellaneous/duit-recintlp.html | https://en.wikipedia.org/wiki/Germany_national_football_team_records_and_statistics | two sources read, they disagree: caps 124 vs 128 | REMOVED |
| Jan Oblak | 520/0/72 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Marc-André ter Stegen | 490/0/42 | removed | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one source only: RSSSF prints 44 caps, no independent second reached | REMOVED |
| Gianluigi Buffon | 1125/0/176 | 1125/0/176 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Iker Casillas | 870/0/167 | 870/0/167 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Petr Čech | 670/0/124 | removed | https://www.rsssf.org/miscellaneous/century.html |  | one source only: RSSSF prints 124 caps, no independent second reached | REMOVED |
| Dani Alves | 910/72/126 | 910/72/126 | https://www.rsssf.org/miscellaneous/braz-recintlp.html | https://en.wikipedia.org/wiki/Brazil_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Marcelo | 680/51/58 | removed | https://www.rsssf.org/miscellaneous/braz-recintlp.html |  | one source only: RSSSF prints 58 caps, no independent second reached | REMOVED |
| Philipp Lahm | 560/17/113 | 560/17/113 | https://www.rsssf.org/miscellaneous/duit-recintlp.html | https://en.wikipedia.org/wiki/Germany_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Gerard Piqué | 650/54/102 | 650/54/102 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Sergio Busquets | 782/18/143 | 782/18/143 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Trent Alexander-Arnold | 375/24/36 | removed | https://www.rsssf.org/miscellaneous/eng-recintlp.html |  | one source only: RSSSF prints 34 caps, no independent second reached | REMOVED |
| Achraf Hakimi | 345/38/82 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| João Cancelo | 440/18/52 | removed | https://www.rsssf.org/miscellaneous/port-recintlp.html |  | one source only: RSSSF prints 64 caps, no independent second reached | REMOVED |
| Andrew Robertson | 455/11/78 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Kyle Walker | 620/8/86 | 620/8/96 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | caps 86 was wrong, both sources print 96 | CORRECTED |
| Jordi Alba | 590/26/93 | 590/26/93 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Casemiro | 580/44/78 | removed | https://www.rsssf.org/miscellaneous/braz-recintlp.html |  | one source only: RSSSF prints 82 caps, no independent second reached | REMOVED |
| Joshua Kimmich | 465/34/100 | removed | https://www.rsssf.org/miscellaneous/duit-recintlp.html | https://en.wikipedia.org/wiki/Germany_national_football_team_records_and_statistics | two sources read, they disagree: caps 106 vs 114 | REMOVED |
| Bruno Fernandes | 565/152/70 | removed | https://www.rsssf.org/miscellaneous/port-recintlp.html | https://en.wikipedia.org/wiki/Portugal_national_football_team_records_and_statistics | two sources read, they disagree: caps 85 vs 94 | REMOVED |
| Bernardo Silva | 515/75/90 | removed | https://www.rsssf.org/miscellaneous/port-recintlp.html | https://en.wikipedia.org/wiki/Portugal_national_football_team_records_and_statistics | two sources read, they disagree: caps 107 vs 113 | REMOVED |
| Martin Ødegaard | 375/65/66 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Rodri | 395/39/66 | removed | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | two sources read, they disagree: caps 59 vs 70 | REMOVED |
| Declan Rice | 355/21/60 | removed | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | two sources read, they disagree: caps 72 vs 80 | REMOVED |
| Marcus Rashford | 435/142/64 | removed | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | two sources read, they disagree: caps 68 vs 78 | REMOVED |
| Raheem Sterling | 585/160/84 | 585/160/82 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | caps 84 was wrong, both sources print 82 | CORRECTED |
| Jack Grealish | 370/45/40 | removed | https://www.rsssf.org/miscellaneous/eng-recintlp.html |  | one source only: RSSSF prints 39 caps, no independent second reached | REMOVED |
| James Maddison | 365/62/12 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Cole Palmer | 210/68/24 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Leroy Sané | 430/95/60 | removed | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one source only: RSSSF prints 72 caps, no independent second reached | REMOVED |
| Kingsley Coman | 410/66/58 | removed | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one source only: RSSSF prints 61 caps, no independent second reached | REMOVED |
| Ousmane Dembélé | 400/80/50 | removed | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one source only: RSSSF prints 57 caps, no independent second reached | REMOVED |
| Rafael Leão | 315/70/35 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Federico Valverde | 325/33/65 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Rúben Dias | 375/13/58 | removed | https://www.rsssf.org/miscellaneous/port-recintlp.html |  | one source only: RSSSF prints 74 caps, no independent second reached | REMOVED |
| William Saliba | 255/8/28 | removed | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one source only: RSSSF prints 31 caps, no independent second reached | REMOVED |
| Kim Min-jae | 295/9/60 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Antonio Rüdiger | 475/20/70 | removed | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one source only: RSSSF prints 81 caps, no independent second reached | REMOVED |
| Marquinhos | 565/40/90 | removed | https://www.rsssf.org/miscellaneous/braz-recintlp.html | https://en.wikipedia.org/wiki/Brazil_national_football_team_records_and_statistics | two sources read, they disagree: caps 103 vs 110 | REMOVED |
| Thiago Silva | 730/35/115 | 730/35/113 | https://www.rsssf.org/miscellaneous/braz-recintlp.html | https://en.wikipedia.org/wiki/Brazil_national_football_team_records_and_statistics | caps 115 was wrong, both sources print 113 | CORRECTED |
| Giorgio Chiellini | 685/36/117 | 685/36/117 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Leonardo Bonucci | 680/35/121 | 680/35/121 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Ciro Immobile | 555/272/57 | 555/272/57 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Radamel Falcao | 580/315/105 | removed | https://www.rsssf.org/miscellaneous/century.html |  | one source only: RSSSF prints 104 caps, no independent second reached | REMOVED |
| Diego Costa | 480/210/24 | removed | https://www.rsssf.org/miscellaneous/span-recintlp.html |  | one source only: RSSSF prints 24 caps, no independent second reached | REMOVED |
| Alexis Sánchez | 650/240/158 | 650/240/168 | https://www.rsssf.org/miscellaneous/century.html | https://en.wikipedia.org/wiki/List_of_men's_footballers_with_100_or_more_international_caps | caps 158 was wrong, both sources print 168 | CORRECTED |
| Mauro Icardi | 425/230/8 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Romelu Lukaku | 635/322/120 | removed | https://www.rsssf.org/miscellaneous/belg-recintlp.html | https://en.wikipedia.org/wiki/Belgium_national_football_team_records_and_statistics | two sources read, they disagree: caps 124 vs 127 | REMOVED |
| Dries Mertens | 590/222/112 | 590/222/109 | https://www.rsssf.org/miscellaneous/belg-recintlp.html | https://en.wikipedia.org/wiki/Belgium_national_football_team_records_and_statistics | caps 112 was wrong, both sources print 109 | CORRECTED |
| Yaya Touré | 580/88/101 | removed | https://www.rsssf.org/miscellaneous/century.html |  | one source only: RSSSF prints 101 caps, no independent second reached | REMOVED |
| Arturo Vidal | 640/95/142 | 640/95/147 | https://www.rsssf.org/miscellaneous/century.html | https://en.wikipedia.org/wiki/List_of_men's_footballers_with_100_or_more_international_caps | caps 142 was wrong, both sources print 147 | CORRECTED |
| Ivan Rakitić | 670/85/106 | 670/85/106 | https://www.rsssf.org/miscellaneous/kroa-recintlp.html | https://en.wikipedia.org/wiki/Croatia_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Mats Hummels | 610/44/78 | removed | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one source only: RSSSF prints 78 caps, no independent second reached | REMOVED |
| Pepe | 680/38/141 | 680/38/141 | https://www.rsssf.org/miscellaneous/port-recintlp.html | https://en.wikipedia.org/wiki/Portugal_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Hugo Lloris | 680/0/145 | 680/0/145 | https://www.rsssf.org/miscellaneous/fran-recintlp.html | https://en.wikipedia.org/wiki/France_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| David de Gea | 560/0/45 | removed | https://www.rsssf.org/miscellaneous/span-recintlp.html |  | one source only: RSSSF prints 45 caps, no independent second reached | REMOVED |
| Keylor Navas | 530/0/113 | removed | https://www.rsssf.org/miscellaneous/century.html |  | one source only: RSSSF prints 126 caps, no independent second reached | REMOVED |
| Ederson | 380/0/25 | removed | https://www.rsssf.org/miscellaneous/braz-recintlp.html |  | one source only: RSSSF prints 30 caps, no independent second reached | REMOVED |
| Lautaro Martínez | 390/192/68 | removed | https://www.rsssf.org/miscellaneous/arg-recintlp.html | https://en.wikipedia.org/wiki/Argentina_national_football_team_records_and_statistics | two sources read, they disagree: caps 75 vs 84 | REMOVED |
| Viktor Gyökeres | 320/155/38 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Alexander Isak | 345/140/58 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Ollie Watkins | 375/122/22 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Darwin Núñez | 325/132/48 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Julián Álvarez | 310/118/44 | removed | https://www.rsssf.org/miscellaneous/arg-recintlp.html |  | one source only: RSSSF prints 49 caps, no independent second reached | REMOVED |
| Khvicha Kvaratskhelia | 275/64/45 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Cesc Fàbregas | 752/98/110 | 752/98/110 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Wesley Sneijder | 610/105/134 | 610/105/134 | https://www.rsssf.org/miscellaneous/ned-recintlp.html | https://en.wikipedia.org/wiki/Netherlands_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Ronaldo de Assis (R10) | 615/205/97 | removed |  |  | the same man as Ronaldinho, identical row | REMOVED |
| Lev Yashin | 570/0/74 | removed |  |  | nationality was Russia, he played for the Soviet Union; caps not reached two source | REMOVED |
| Alfredo Di Stéfano | 654/510/31 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Ferenc Puskás | 530/620/85 | removed |  |  | shipped 620 goals against 530 appearances | REMOVED |
| Lothar Matthäus | 710/159/150 | 710/159/150 | https://www.rsssf.org/miscellaneous/duit-recintlp.html | https://en.wikipedia.org/wiki/Germany_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Giacinto Facchetti | 634/75/94 | 634/75/94 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Bobby Charlton | 758/249/106 | 758/249/106 | https://www.rsssf.org/miscellaneous/eng-recintlp.html | https://en.wikipedia.org/wiki/List_of_England_international_footballers | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Hristo Stoichkov | 595/259/83 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Peter Schmeichel | 693/0/129 | removed | https://www.rsssf.org/miscellaneous/century.html |  | one source only: RSSSF prints 129 caps, no independent second reached | REMOVED |
| Oliver Kahn | 632/0/86 | 632/0/86 | https://www.rsssf.org/miscellaneous/duit-recintlp.html | https://en.wikipedia.org/wiki/Germany_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Granit Xhaka | 560/48/130 | removed | https://www.rsssf.org/miscellaneous/century.html | https://en.wikipedia.org/wiki/List_of_men's_footballers_with_100_or_more_international_caps | two sources read, they disagree: caps 143 vs 152 | REMOVED |
| Nicolò Barella | 380/42/62 | 380/42/70 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps 62 was wrong, both sources print 70 | CORRECTED |
| Hakan Çalhanoğlu | 490/88/90 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Alejandro Grimaldo | 380/42/18 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Theo Hernández | 330/36/28 | removed | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one source only: RSSSF prints 41 caps, no independent second reached | REMOVED |
| Dayot Upamecano | 310/10/30 | removed | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one source only: RSSSF prints 35 caps, no independent second reached | REMOVED |
| Jules Koundé | 295/10/35 | removed | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one source only: RSSSF prints 46 caps, no independent second reached | REMOVED |
| Ronald Araújo | 200/10/35 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Dani Carvajal | 490/18/52 | removed | https://www.rsssf.org/miscellaneous/span-recintlp.html |  | one source only: RSSSF prints 52 caps, no independent second reached | REMOVED |
| Toni Rüdiger | 475/20/70 | removed |  |  | the same man as Antonio Rüdiger, identical row | REMOVED |
| Emiliano Martínez | 350/0/52 | removed | https://www.rsssf.org/miscellaneous/arg-recintlp.html |  | one source only: RSSSF prints 57 caps, no independent second reached | REMOVED |
| Mike Maignan | 320/0/28 | removed | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one source only: RSSSF prints 37 caps, no independent second reached | REMOVED |
| Diogo Jota | 370/112/42 | removed | https://www.rsssf.org/miscellaneous/port-recintlp.html |  | one source only: RSSSF prints 49 caps, no independent second reached | REMOVED |
| Dušan Vlahović | 300/128/35 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Victor Osimhen | 310/148/38 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Kai Havertz | 380/88/52 | removed | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one source only: RSSSF prints 55 caps, no independent second reached | REMOVED |
| Aurélien Tchouaméni | 280/14/42 | removed | https://www.rsssf.org/miscellaneous/fran-recintlp.html |  | one source only: RSSSF prints 43 caps, no independent second reached | REMOVED |
| Enzo Fernández | 245/18/30 | removed | https://www.rsssf.org/miscellaneous/arg-recintlp.html |  | one source only: RSSSF prints 37 caps, no independent second reached | REMOVED |
| Moisés Caicedo | 225/10/42 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Sandro Tonali | 260/16/22 | 260/16/32 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps 22 was wrong, both sources print 32 | CORRECTED |
| Kobbie Mainoo | 95/6/16 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Warren Zaïre-Emery | 120/8/18 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Mathys Tel | 130/22/6 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Xavi Simons | 175/38/22 | removed | https://www.rsssf.org/miscellaneous/ned-recintlp.html |  | one source only: RSSSF prints 32 caps, no independent second reached | REMOVED |
| Nico Williams | 175/28/28 | removed | https://www.rsssf.org/miscellaneous/span-recintlp.html |  | one source only: RSSSF prints 30 caps, no independent second reached | REMOVED |
| Alejandro Garnacho | 140/24/10 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| João Félix | 325/78/35 | removed | https://www.rsssf.org/miscellaneous/port-recintlp.html |  | one source only: RSSSF prints 50 caps, no independent second reached | REMOVED |
| Álvaro Morata | 530/195/86 | 530/195/87 | https://www.rsssf.org/miscellaneous/span-recintlp.html | https://en.wikipedia.org/wiki/Spain_national_football_team_records_and_statistics | caps 86 was wrong, both sources print 87 | CORRECTED |
| Ángel Di María | 780/165/145 | 780/165/145 | https://www.rsssf.org/miscellaneous/arg-recintlp.html | https://en.wikipedia.org/wiki/Argentina_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Ivan Perišić | 620/120/120 | removed | https://www.rsssf.org/miscellaneous/kroa-recintlp.html | https://en.wikipedia.org/wiki/Croatia_national_football_team_records_and_statistics | two sources read, they disagree: caps 150 vs 158 | REMOVED |
| David Alaba | 515/40/105 | removed | https://www.rsssf.org/miscellaneous/century.html |  | one source only: RSSSF prints 111 caps, no independent second reached | REMOVED |
| Marco Reus | 528/170/48 | 528/170/48 | https://www.rsssf.org/miscellaneous/duit-recintlp.html | https://en.wikipedia.org/wiki/Germany_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Paulo Dybala | 475/155/35 | removed | https://www.rsssf.org/miscellaneous/arg-recintlp.html |  | one source only: RSSSF prints 40 caps, no independent second reached | REMOVED |
| James Rodríguez | 520/98/110 | removed | https://www.rsssf.org/miscellaneous/century.html | https://en.wikipedia.org/wiki/List_of_men's_footballers_with_100_or_more_international_caps | two sources read, they disagree: caps 122 vs 130 | REMOVED |
| Gerard Moreno | 420/145/22 | removed | https://www.rsssf.org/miscellaneous/span-recintlp.html |  | one source only: RSSSF prints 18 caps, no independent second reached | REMOVED |
| Iker Muniain | 520/65/10 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Lorenzo Insigne | 510/120/54 | 510/120/54 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
| Jamie Vardy | 525/205/26 | removed |  |  | not reached in this round, no publisher read for this row | REMOVED |
| Ilkay Gündoğan | 580/82/82 | removed | https://www.rsssf.org/miscellaneous/duit-recintlp.html |  | one source only: RSSSF prints 82 caps, no independent second reached | REMOVED |
| Christian Eriksen | 600/105/132 | removed | https://www.rsssf.org/miscellaneous/century.html | https://en.wikipedia.org/wiki/List_of_men's_footballers_with_100_or_more_international_caps | two sources read, they disagree: caps 147 vs 151 | REMOVED |
| Maya Yoshida | 580/30/128 | 580/30/126 | https://www.rsssf.org/miscellaneous/century.html | https://en.wikipedia.org/wiki/List_of_men's_footballers_with_100_or_more_international_caps | caps 128 was wrong, both sources print 126 | CORRECTED |
| Tim Howard | 625/0/121 | removed | https://www.rsssf.org/miscellaneous/century.html |  | one source only: RSSSF prints 121 caps, no independent second reached | REMOVED |
| Claudio Marchisio | 452/47/55 | 452/47/55 | https://www.rsssf.org/miscellaneous/ital-recintlp.html | https://en.wikipedia.org/wiki/Italy_national_football_team_records_and_statistics | caps agreed by both, club pair unchanged and marked | VERIFIED |
