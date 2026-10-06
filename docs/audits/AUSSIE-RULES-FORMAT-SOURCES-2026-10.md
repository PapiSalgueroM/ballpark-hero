<!-- Round 1014: copied verbatim from the research agent's receipts (dukb-handoff/2026-10-05/research/afl-format.md, complete 2026-10-05). src/lib/aussieRulesFormat.ts encodes them. -->
# AFL format receipts for Round 1014 (Aussie Rules Manager full season)

Research agent, started 2026-10-05. Rule: two independent non-wiki sources per fact. Wikipedia is a spot check only.
Read date for every source below is 2026-10-05 unless stated. "Line relied on" is the sentence as returned by the fetch
(the Regulations lines are copied from a pdftotext extraction of the PDF itself, so those are exact).
Status: COMPLETE 2026-10-05. Every brief item (1 to 13) is settled below; anything without two sources says UNVERIFIED.

## Bottom line for the builder (read this first)

| # | fact | value | status |
|---|---|---|---|
| 1 | 2026 finals | FINAL TEN. Wildcard Round exists: 7 hosts 10, 8 hosts 9, sudden death, on the old pre-finals bye weekend (the bye is gone; top six rest that week). Higher ranked winner = seed 7, lower = seed 8. Then the since-2000 final eight. 11 finals. | VERIFIED (AFL, ABC; Zero Hanger) |
| 2 | final eight | QF1 1v4, QF2 2v3, EF1 5v8, EF2 6v7; SF1 L-QF1 v W-EF1, SF2 L-QF2 v W-EF2; PF1 W-QF1 v W-SF2, PF2 W-QF2 v W-SF1; GF. Top four double chance. Exactly the brief's 'final8'. | VERIFIED |
| 3 | drawn final (GF too) | Extra time = two 3 minute periods (plus stoppages). Still level: another pair of 3 minute periods, repeated until a winner. NO next-score rule (golden score was abolished for 2020 on). | VERIFIED (AFL Regs 2026, ESPN) |
| 4 | ladder | 4 win, 2 draw, 0 loss. Percentage = PF / PA x 100. Order: points, percentage; at season end only, then head to head points, head to head percentage, then by lot. | VERIFIED (AFL Regs, Zero Hanger, ABC, SEN) |
| 5 | clubs | 18 | VERIFIED |
| 6 | season | 23 games per club over 25 rounds (Opening Round + Rounds 1 to 24), two byes each, 17 opponents, 6 met twice. The game's 23 rounds and no byes is a labelled simplification. | VERIFIED (AFL, AFL Tables, Zero Hanger) |
| 7 | draft order | Non-finalists reverse ladder (picks 1 to 8), then WILDCARD LOSERS (9, 10), EF losers, SF losers, PF losers, each group reverse ladder, runner-up 17, premier 18. Read off the 2026 order printed by AFL.com.au and Zero Hanger; rule prose beyond "reverse ladder" not found. | VERIFIED as the 2026 order |
| 8 | draft age | Must be 18 by 31 December of the draft year; any 18+ may nominate. "Draftees are 18" is the game's simplification. | VERIFIED (AFL, SEN) |
| 9 | scoring 2023 to 2026 | about 84 pts a team (89 in 2026), 23 scoring shots (24.5 in 2026), accuracy 52.7 to 53.4 percent, draws about 1 percent. | Averages single dataset (AFL Tables): loose band only. Draw counts VERIFIED. |
| 10 | ladder shape | minor premier 17 to 19 wins of 23, bottom club 1 to 3 wins (2023 to 2026). | VERIFIED (AFL Tables, Zero Hanger) |
| 11 | matchday | 23 named = 18 on field + 5 interchange, no substitute in 2026. Interchange cap 75 is AFL-only. | VERIFIED except the 75 |
| 12 | nickname deny list | see section 12 (AFL, AFLW, VFL, SANFL, WAFL, NRL). v1's "Storm" is NRL. | DONE (guard) |
| 13 | dates (docs only) | Trade Period 5 to 14 October 2026; National Draft 19 and 20 November 2026; free agency 2 to 9 October. | VERIFIED (AFL, Zero Hanger) |

Corrections to the brief's beliefs:
- The brief's "bounded next-score loop" after extra time is not the real rule. Use repeated pairs of 3 minute periods.
- The brief's ladder fallback "then numeric club index" is not the AFL's; the AFL goes head to head, then by lot. Label the index as this game's lot.
- The default format for a 2026 season is 'wildcard' (final ten), not 'final8'. 'final8' is the 2000 to 2025 system and stays valid as a preset.
- Codex's 792 claim "2026 is a final ten" is correct.

Note on access: theage.com.au, heraldsun.com.au, smh.com.au, foxsports.com.au and theguardian.com refuse this agent's
fetcher, so the news sources used are ABC, SEN, AFL.com.au, Zero Hanger, Austadiums and AFL Tables (dataset).

Sections below are in the order they were settled (finals and season length first), not numeric order.
Fetch caveat: WebFetch returns a summarising model's reading of each page. The Regulations lines were read from the PDF
text directly. Where a summary was internally inconsistent (one AFL Tables ladder read, one Zero Hanger draft article)
it is flagged in place and the figure was taken only where two reads agree.

## Source table (ids used below)

| id | publisher | title | URL |
|---|---|---|---|
| REG26 | AFL (official document) | AFL Regulations, Final 11 February 2026 (PDF) | https://resources.afl.com.au/afl/document/2026/02/13/54c158af-15e9-483b-a195-62a0f4e33b11/AFL-Regulations-Final-11-February-2026-.pdf |
| AFL-WC | AFL.com.au | Biggest finals shake-up in 25 years as Wildcard Round introduced (Staff writers with AAP) | https://www.afl.com.au/news/1451972/biggest-finals-shake-up-in-25-years-as-wildcard-round-introduced |
| AFL-WCX | AFL.com.au | What is Wildcard Round and how does it work? (Martin Smith) | https://www.afl.com.au/news/1589531/what-is-wildcard-round-and-how-does-it-work-rankings-system-explained-finals-history-and-more |
| AFL-FIX | AFL.com.au | 2026 Toyota AFL Premiership Fixture Confirmed | https://www.afl.com.au/news/1452366/2026-toyota-afl-premiership-fixture-confirmed |
| AFL-DBL | AFL.com.au | Who has the toughest draw? We break down your club's fixture (Dejan Kalinic, 2025-11-13) | https://www.afl.com.au/news/1452103/double-ups-prime-slots-degree-of-difficulty-we-rank-your-clubs-fixture |
| ABC-WC | ABC News | AFL gives teams finishing 10th chance to win premiership through wildcard round in finals, 2025-11-10 | https://www.abc.net.au/news/2025-11-10/afl-introduces-wildcard-round-to-finals/105990434 |
| ABC-NEW | ABC News | From rule changes to new wildcard round, here's what's new in AFL for 2026, 2026-03-03 | https://www.abc.net.au/news/2026-03-03/whats-new-in-the-afl-for-2026-rule-change-wildcard-round-sub/106376360 |
| MCG-FIX | Melbourne Cricket Ground (mcg.org.au) | 2026 AFL Premiership Season at the MCG: full fixture revealed, 2025-11-13 | https://www.mcg.org.au/news/2025/november/2026-afl-premiership-season-at-the-mcg-full-fixture-revealed |
| AFLT26 | AFL Tables (documented statistics dataset) | 2026 season page | https://afltables.com/afl/seas/2026.html |
| ZH-LAD | Zero Hanger | AFL Ladder 2026 | https://www.zerohanger.com/afl/afl-ladder/ |

## 1. 2026 finals format: the Wildcard Round. VERIFIED

Value:
- 2026 is a FINAL TEN ("Final Ten System" in the Regulations). The top six go straight to the first full week of finals.
- Wildcard Round, its own week, played on the weekend that used to be the pre-finals bye: 7th hosts 10th, 8th hosts 9th. Both sudden death.
- The two winners are re-ranked by home and away ladder position: the higher ranked winner becomes the 7 seed, the lower ranked the 8 seed.
- Week 1 is then the unchanged since-2000 final eight: QF 1v4, QF 2v3, EF 5v8, EF 6v7. So 5th plays the LOWER ranked wildcard winner and 6th plays the HIGHER ranked wildcard winner.
- It REPLACES the pre-finals bye: the top six have the week off while the wildcard games are played. Total finals: 2 wildcard + 9 = 11.
- Announced Monday 2025-11-10. First played 2026-08-28 and 2026-08-29.

Receipts:
- REG26, reg 2.6(a): "At the completion of the Home and Away Matches, the first ten Clubs on the Premiership Ladder shall compete in the Finals Series under the Final Ten System."
- REG26, reg 2.7(b): "the Clubs that are placed seventh and eighth on the Premiership Ladder at the end of the Home and Away Matches shall play the Wildcard Final in which they compete at a venue in the State where they are based" (the 7th and 8th clubs host).
- AFL-WC: "Seventh will play 10th, while eighth will play ninth on a weekend that will form an extra week in the finals series."
- AFL-WC: "From 2026 onwards, the top six on the ladder at the end of the home and away season will move straight through to finals, while the teams finishing seventh to 10th will play off for the last two spots in September"
- AFL-WC: "The teams that finish in the top six will all have a week off ahead the first full week of finals."
- AFL-WC structure list: "Fifth v lowest-ranked Wildcard winner", "Sixth v highest-ranked Wildcard winner"
- AFL-WCX: "the top eight will then play off in the finals system that had been in place since 2000 (1 v 4, 2 v 3, 5 v 8, 6 v 7)"
- ABC-WC: "The wildcard weekend will see 7th place finishers take on 10th and the 8th host 9th."
- ABC-WC: "The winners would be seeded seventh and eighth in the finals, with the rest of the four-week series remaining as it has since 2000."
- ABC-WC: "Both wildcard games will take place on the weekend that is currently set aside for the pre-finals bye."
- ABC-NEW (search summary): seventh plays 10th and eighth hosts ninth, the highest ranked winner taking the seventh seed, the other the eighth; it fills the pre-finals bye week that existed since 2016.

Independent publishers: AFL (REG26, AFL-WC) and ABC (ABC-WC). VERIFIED.

Corroboration, how 2026 actually played out (AFLT26, ZH-LAD ladder; ABC match reports 2026-08-28 and 2026-08-29):
- Ladder 7 Melbourne, 8 Western Bulldogs, 9 Collingwood, 10 Carlton.
- Wildcard: Western Bulldogs (8) beat Collingwood (9) 14.12 (96) to 14.9 (93); Carlton (10) beat Melbourne (7) 10.14 (74) to 7.13 (55).
- Elimination finals: Geelong (5) v Carlton (the lower ranked winner), Adelaide (6) v Western Bulldogs (the higher ranked winner). Matches the rule exactly.

## 6. 2026 home and away season length. VERIFIED

Value: 18 clubs, 23 matches each, over 25 rounds (Opening Round plus Rounds 1 to 24). Every club has exactly two byes
(Opening Round or one of Rounds 2 to 4, then one of Rounds 12 to 16). Every club meets 17 opponents, 6 of them twice.
The game's 23 rounds with no byes stays a labelled simplification (the real calendar has 25 rounds with byes).

Receipts:
- AFL-FIX: "Opening Round through to Round 15 have today been released fully fixtured, while Rounds 16 to 24 remain floating with match ups and venues confirmed."
- AFL-FIX: "The bye rounds will take place over Rounds 12 to 16 and will feature at least seven games on each weekend. No team who has had two byes (due to Opening Round) will play against a team who hasn't had their bye yet."
- AFL-FIX: "all 18 clubs start their quest for the 2026 Toyota Premiership."
- AFL-DBL: every one of the 18 clubs has a "Play twice:" list of exactly 6 clubs and a "Byes:" line of exactly two rounds (for example Adelaide "Byes: Opening Round, round 12"; Brisbane "Byes: Round two, round 15"). 17 + 6 = 23.
- MCG-FIX: fixtures listed through Round 24; "Dates and times of fixtures from Rounds 16-24 will be confirmed in 2026."
- AFLT26: final home and away ladder, P = 23 for every club (Fremantle 23 played, 19 W, 4 L, 76 pts, 137.2%).
- ZH-LAD: final 2026 ladder, P = 23 for all 18 clubs.

Independent publishers: AFL (AFL-FIX, AFL-DBL), AFL Tables (AFLT26), Zero Hanger (ZH-LAD), MCG (round count). VERIFIED.

## 3. Drawn finals: extra time. VERIFIED

Value (REG26 reg 2.8(a)): a drawn final, the Grand Final included, goes to Additional Time after a 6 minute 30 second
rest: two 3 minute periods (plus stoppages), changing ends between them. If still level, Further Additional Time: again
two 3 minute periods (plus stoppages), repeated until a winner. NOT "next score wins". This replaces the belief in the brief.
For the game: an extra time block = two 3 minute halves; repeat blocks until not level.

Receipts:
- REG26 2.8(a)(ii): "after a six (6) minute and 30 second rest period, (which shall commence from the time the goal Umpires signal that the Match is to proceed into Additional Time), Additional Time shall be played;"
- REG26 2.8(a)(iii): "each Club shall change ends at the completion of ordinary time for the first three (3) minute period (plus stoppages) of Additional Time and shall change ends again after the first three (3) minute period without delay;"
- REG26 2.8(a)(ix): "if the scores are still tied at the conclusion of Additional Time, the goal Umpires shall immediately consult with each other to confirm that the score of each Club is identical and if that is the case, the goal Umpires shall signal to the Timekeepers that Further Additional Time will be played;"
- REG26 2.8(a)(x): "each Club shall immediately change ends at the conclusion of Additional Time for the first three (3) minute period (plus stoppages) of Further Additional Time and shall change ends again after the first three (3) minute period without delay. At the conclusion of the Further Additional Time, the Club which has scored the highest points is the winner of the Match;"
- REG26 2.8(a)(xi): "if the scores are still tied at the conclusion of Further Additional Time, the process set out in Regulation 2.8(a)(x) will be repeated until, at the conclusion of any repeated period of Further Additional Time, the winning Club can be determined;"
- ESPN-ET. ESPN, "AFL dumps golden score for tied finals", Jason Phelan, 2019-12-18. https://www.espn.com.au/afl/story/_/id/28323336/afl-dumps-golden-score-tied-finals
  - "Two three-minute halves of extra time would be played, with further extra-time periods to continue until there was a winner."
  - (the replaced rule) "two five-minute halves of extra time" where "the second period of extra time would have continued without a siren until one of the teams scored a goal or a point."
- AFL-GS. AFL.com.au, "No more golden score: League changes finals tie-break rule", Ben Collins. https://www.afl.com.au/news/344176/no-more-golden-score-league-changes-finals-tie-break-rule
  - "Teams will now play reduced three-minute halves, plus time-on, and additional periods of extra time with changes of ends will be played until there is a winner."
  - "The League announced it had removed the possibility of finals, including the Grand Final, being decided by a golden score."
- AFL-GFD. AFL.com.au, "What happens if the AFL Grand Final is a draw?" (2021 rules). https://www.afl.com.au/news/680200/what-happens-if-the-afl-grand-final-is-a-draw-what-does-it-mean-for-interchanges
  - "Additional time period of two x three-minute halves (plus time-on) will be played as required, until a result is determined."
  - "Clubs shall receive 10 interchanges for each two x three-minute period (excluding medical substitute)."

Independent publishers: AFL (REG26, the current 2026 text) and ESPN (ESPN-ET). VERIFIED. The Grand Final is included (AFL-GS).
Game note: there is NO next-score loop in the real rule. The brief's bounded next-score loop should become "repeat a
pair of 3 minute periods until not level", with a bound the harness proves is never hit. Real periods also add
time-on, which the game can ignore (label: this game's extra time periods are a flat 3 minutes).

## 4. Ladder points, percentage, tiebreaks. VERIFIED

Value: 4 points a win, 2 a draw, 0 a loss or bye. Percentage = points for / points against x 100 over home and away
matches. Order: points, then percentage; if still equal at season end, points from the matches between the tied clubs,
then percentage from those matches, then by lot.

Receipts:
- REG26 2.5(b)(i)(A): "four Premiership Points shall be awarded to the winner"
- REG26 2.5(b)(i)(B): "two Premiership Points shall be awarded to each Club who competes in a Match that is drawn, cancelled or unable to be completed"
- REG26 2.5(b)(i)(C): "a percentage shall be calculated for each Club based on the proportion of points scored for and against each Club during the Home and Away Matches."
- REG26 2.5(c)(iii): "where two or more Clubs have accumulated the same total of Premiership Points, the Club with the highest percentage as calculated under Regulation 2.5(b)(i)(C) shall be placed first as between them;"
- REG26 2.5(c)(iv)(A): "the position of the tied Clubs shall be adjusted by accumulating the Premiership Points awarded to the relevant Clubs as a result of the Home and Away Matches played between them"
- REG26 2.5(c)(iv)(B): "...calculating each such Club's percentage based on the proportion of points scored for and against each such Club from the Home and Away Matches between them"
- REG26 2.5(c)(iv)(C): "where two or more Clubs still remain tied, the position of the Clubs shall be adjusted by lot"
- ZH-LAD: "Clubs earn four premiership points for a win and two for a draw, with ladder position determined by total points and percentage."
- Arithmetic check from AFLT26 / ZH-LAD: Fremantle PF 2286, PA 1666 gives 137.2 (2286/1666 x 100 = 137.21). Hawthorn 15 W 2 D = 64 pts.
- ABC-PCT. ABC News, "The maths that will decide the AFL finals", Simon Leo Brown, 2017-06-19. https://www.abc.net.au/news/2017-06-19/the-maths-that-will-decide-the-afl-finals/8630874
  - "The percentage is the number of points a team has scored throughout the season divided by the points conceded, multiplied by 100."
- SEN-TIE. SEN, "How the AFL determines ladder position if teams finish on the same points and percentage", Lachlan Geleit, 2024-08-21. https://www.sen.com.au/news/2024/08/21/how-the-afl-determines-ladder-position-if-teams-finish-on-the-same-points
  - (search extract) "In the event that teams are tied on both points and percentage, the AFL determines the ladder position from the results of home and away matches between those two clubs."
  - "If those results are equal ... then the teams are simply drawn out of a hat."
  - "If they're still locked together, it is actually written into the rules that the Executive General Manager of Football ... will draw the club out of a hat."

Independent publishers: points 4/2: AFL (REG26) and Zero Hanger (ZH-LAD). Percentage = PF/PA x 100: AFL (REG26, "proportion of points scored for and against") and ABC (ABC-PCT). Tiebreak after percentage (head to head points, then head to head percentage, then lot): AFL (REG26) and SEN (SEN-TIE). VERIFIED.
Game note: the head to head and lot steps apply only at the END of the home and away season on an exact points AND
percentage tie, which is vanishingly rare. The brief's "then numeric club index" stands in for the lot and must be
labelled as this game's rule (or implement head to head first and use the index as the lot).

## 2. The final eight pairings week by week, and the top four's double chance. VERIFIED

Value (after the wildcard week, seeds 1 to 8):
- Week 1: QF1 1v4, QF2 2v3, EF1 5v8, EF2 6v7. QF losers are NOT eliminated (the double chance); EF losers are out.
- Week 2: SF1 = loser QF1 v winner EF1; SF2 = loser QF2 v winner EF2. SF losers out.
- Week 3: PF1 = winner QF1 v winner SF2; PF2 = winner QF2 v winner SF1 (the crossover). PF losers out.
- Week 4: Grand Final between the PF winners. It is at the MCG (REG26 2.7(g)); the game says "the Grand Final ground".
- Hosting: QF hosts are the higher seeds, PF hosts the QF winners (REG26 2.7(d), 2.7(f)). The game has no home advantage, so cosmetic.
This is exactly the 'final8' preset in the brief (step 3).

Receipts:
- AFL-WCX: "the top eight will then play off in the finals system that had been in place since 2000 (1 v 4, 2 v 3, 5 v 8, 6 v 7)"
- ZH-WC. Zero Hanger, "How does AFL Wildcard round work?", Harrison McIlwaine, 2026-08-24. https://www.zerohanger.com/how-does-afl-wildcard-round-work-what-is-it-when-is-it-why-its-needed-finals-fixtures-181664
  - "Fifth will host the lowest-ranked Wildcard winner, and sixth will host the highest-ranked Wildcard winner in the traditional elimination finals, while first will play host to fourth and second, host to third, in the traditional qualifying finals."
- ROAR-FIN. The Roar, "AFL Finals Format: How Does the Finals System Work?" https://www.theroar.com.au/afl/afl-finals-format-how-does-it-work/ (the page fetch was refused with 403; these lines are the search engine's extract of the page, so supporting only)
  - "One of the advantages given to teams in the top four is that they cannot be eliminated if they lose in the first week. This is known as the 'double chance.'"
  - "The loser of first versus fourth will play the winner of fifth versus eighth, and the loser of second versus third will play the winner of sixth versus seventh."
  - "In the third week the winners of the qualifying finals from the first week play the winners of the semi-finals from the second weeks in preliminary finals."
- SEN-F8. SEN, "31 years of the final eight", Dylan Leach, 2025-11-12. https://www.sen.com.au/news/2025/11/12/afl-final-eight-when-did-it-start
  - "the top four teams played each other in the opening week and were guaranteed a double chance, with the bottom four playing in the elimination finals and needing to win four games to win the flag."
- REG26 2.7(e): "the Clubs which lose the Qualifying Finals shall play the Semi-Final"; 2.7(f): "the Clubs which win the Qualifying Finals shall play the Preliminary Final"

The 2026 series identifies the crossover completely (every pairing is distinguishable), reported by independent publishers:
- 2026 ladder: 1 Fremantle, 2 Sydney, 3 Brisbane, 4 Hawthorn, 5 Geelong, 6 Adelaide (AFLT26, ZH-LAD).
- QF1 Hawthorn (4) beat Fremantle (1); QF2 Sydney (2) beat Brisbane (3) (AFLT26).
- AFL-SF. AFL.com.au, "SEMI-FINALS FIXTURE: Venues, times, ticket on-sale details". https://www.afl.com.au/news/1601524/semi-finals-fixture-venues-times-ticket-on-sale-details-for-week-two
  - "Fremantle v Geelong at Optus Stadium" (SF1 = loser QF1 v winner EF1, Geelong 5th) and "Brisbane v Adelaide at the Gabba" (SF2 = loser QF2 v winner EF2, Adelaide 6th).
  - "Hawthorn will play the victor of the Brisbane v Adelaide semi-final, while Sydney will host the winner of the Fremantle v Geelong semi-final." (PF1 = W QF1 v W SF2; PF2 = W QF2 v W SF1)
- SEN-PF. SEN, "AFL Preliminary Finals by the numbers", 2026-09-13. https://www.sen.com.au/news/2026/09/13/afl-news-preliminary-finals-sydney-v-fremantle-hawthorn-v-brisbane-results-times-and-dates
  - "Sydney will host Freo in the Preliminary Final at the SCG"; "The Dockers defeated Geelong by 14 points in Perth"
  - "Hawthorn hosts Brisbane at the MCG ... after the reigning back-to-back champs smashed Adelaide by 53 points."
- Wikipedia "AFL finals systems" spot check agrees (winner QF1 hosts winner SF2; winner QF2 hosts winner SF1). Not counted.

Independent publishers: AFL (AFL-WCX, AFL-SF, REG26), SEN (SEN-F8, SEN-PF), Zero Hanger (ZH-WC), AFL Tables. VERIFIED.

## 5. 18 clubs in 2026. VERIFIED

- AFL-FIX: "all 18 clubs start their quest for the 2026 Toyota Premiership."
- AFLT26 and ZH-LAD: the final 2026 ladder has 18 rows.
- REG26 28.2(b)(i): "each Club will be assigned a score from 1 to 18 in reverse order to the order in which that Club finished on the Final Premiership Ladder"
Independent publishers: AFL, Zero Hanger, AFL Tables. VERIFIED.

## 7. National draft order, and where 2026 wildcard losers sit. VERIFIED AS THE 2026 ORDER (rule prose beyond "reverse ladder" not found)

Value, as both publishers print the 2026 first round (by original club):
- Picks 1 to 8: the eight non-finalists in reverse ladder order (18th Essendon 1 ... 11th St Kilda 8).
- Picks 9 and 10: the two WILDCARD LOSERS, reverse ladder (Collingwood 9th on the ladder = pick 9, Melbourne 7th = pick 10).
- Picks 11 and 12: elimination final losers, reverse ladder (Carlton 10th = 11, Western Bulldogs 8th = 12).
- Picks 13 and 14: semi final losers, reverse ladder (Adelaide 6th = 13, Geelong 5th = 14).
- Picks 15 and 16: preliminary final losers, reverse ladder (Hawthorn 4th = 15, Sydney 2nd = 16).
- Pick 17 Grand Final loser (Fremantle), pick 18 premier (Brisbane).
So the rule the game can encode: non-finalists reverse ladder, then finalists grouped by the week they went out
(wildcard, week 1, week 2, week 3), reverse ladder inside each group, runner-up 17th, premier last. That is the brief's
rule, with the wildcard losers placed straight after the non-finalists. Priority, father-son, academy, compensation
picks and trades are not modelled.
Caveat for copy: neither publisher states the finalist part as prose; it is read off the printed order, which fits it
in every group. Copy can say "reverse finishing order, premier last" as the AFL's; anything finer, label as the game's.

Receipts:
- AFL-DO. AFL.com.au, "Draft order: How Hawthorn Hawks can get deals done for Ben King and Zach Merrett, Melbourne Demons hold two top picks", Martin Smith (week of 2026-10-05). https://www.afl.com.au/news/1625557/draft-order-how-hawthorn-hawks-can-get-deals-done-for-ben-king-and-zach-merrett-melbourne-demons-hold-two-top-picks
  - "1. Essendon, 2. Richmond, 3. West Coast, 4. Port Adelaide, 5. North Melbourne, 6. Melbourne (tied to Gold Coast), 7. Greater Western Sydney, 8. St Kilda, 9. Collingwood, 10. Melbourne, 11. Carlton, 12. Western Bulldogs, 13. Adelaide, 14. Geelong, 15. Hawthorn, 16. Carlton (tied to Sydney), 17. Fremantle, 18. Brisbane"
- ZH-DO. Zero Hanger, "AFL Draft Order 2026". https://www.zerohanger.com/afl/afl-draft-order-2026/
  - same 18 picks, with "Pick 15: Essendon via Hawthorn" (a trade) and "Pick 16: Carlton via Sydney".
  - "Draft order is primarily determined by reverse ladder position, with the lowest-ranked teams receiving the earliest selections."
- AFL-DX. AFL.com.au, "AFL Draft explainer", Martin Smith. https://www.afl.com.au/news/1253636/afl-draft-explainer-what-is-the-draft-order-compensation-picks-father-son-academies-rookie-pre-season
  - "In basic terms, the draft order is determined by reverse ladder position."
- Discrepancy noted: an earlier Zero Hanger article (Jonty Ralphsmith, 2026-09-27, https://www.zerohanger.com/afl-indicative-draft-order-183190/) printed Geelong 13 and Adelaide 14. Its own later live page (ZH-DO) and AFL-DO both print Adelaide 13, Geelong 14, which is the reverse ladder order. Taken as a since-corrected slip.
- The ladder positions used above are from AFLT26 and ZH-LAD.

Independent publishers: AFL (AFL-DO) and Zero Hanger (ZH-DO). VERIFIED for the 2026 order and the wildcard losers' slot.

## 8. Draft eligibility age. VERIFIED

Value: a player must be 18 by 31 December of the draft year. Any player 18 or older can nominate. So draftees are 17 or
18 on draft night and most are school leavers. The game's "draftees are 18" is a fair simplification; label it the game's.

Receipts:
- AFL-ELIG. AFL.com.au, "How do I get drafted by an AFL club? Am I eligible?", Ben Collins. https://www.afl.com.au/news/149356/how-do-i-get-drafted-by-an-afl-club-am-i-eligible
  - "you must be 18 years of age by December 31 that year"
- AFL-DX: "But any player 18 years or older can nominate for the draft"; "The bulk of the players picked up in the national draft are school leavers who have or will turn 18 this year"
- SEN-AGE. SEN, "Why McRae thinks minimum AFL draft age should increase", Seb Mottram, 2022-07-22. https://archive.sen.com.au/news/2022/07/22/why-mcrae-thinks-minimum-afl-draft-age-should-increase/index.html
  - "AFL rules stipulate players must be 18 by December 31 of their draft year in order to be eligible to join clubs."
Independent publishers: AFL and SEN. VERIFIED. (Both are a few years old; nothing found saying it changed for 2026.)

## 13. 2026 trade period and national draft dates (docs only, never copy). VERIFIED

- Free agency: Friday 2 October 9.00am AEST to Friday 9 October 5.00pm AEDT.
- Trade Period: Monday 5 October 9.00am AEDT to Wednesday 14 October 7.30pm AEDT. (So today, 2026-10-05, is day one of the trade period.)
- Delisted free agency: Monday 2 November to Friday 6 November.
- National Draft: round one Thursday 19 November 7.00pm AEDT, remaining rounds Friday 20 November. Rookie Draft Monday 23 November.

Receipts:
- AFL-DATES. AFL.com.au, "Dates confirmed for 2026 AFL player movement period". https://www.afl.com.au/news/1523242/dates-confirmed-for-2026-afl-player-movement-period
  - "The 2026 Continental Tyres AFL Trade Period will commence on Monday, October 5 at 9.00am AEDT and will run until Wednesday, October 14 at 7.30pm AEDT."
  - "Round One of the 2026 Telstra AFL Draft will be held on Thursday, November 19 at 7.00pm AEDT followed by the remaining rounds of the Draft on Friday, November 20, at 7.00pm AEDT"
  - "The AFL Free Agency period commences on Friday, October 2 at 9.00am AEST and will run until Friday, October 9, 5.00pm AEDT."
- ZH-DATES. Zero Hanger, "AFL Draft latest: 2026 trade, draft and free agency dates revealed", Aidan Cellini, 2026-05-20. https://www.zerohanger.com/afl-draft-latest-2026-trade-draft-and-free-agency-dates-revealed-177286/
  - "The Trade Period will commence on Monday, October 5 at 9.00am AEDT and will run until Wednesday, October 14 at 7.30pm AEDT."
  - "Round One of the draft will be held on Thursday, November 19 at 7.00pm AEDT followed by the remaining rounds of the Draft on Friday, November 20, at 7.00pm AEDT"
- AFL-DO also: "the Continental Tyres AFL Trade Period running from October 5 until Deadline Day on October 14."
Independent publishers: AFL and Zero Hanger. VERIFIED.

## 11. Matchday composition in 2026. VERIFIED (18 on field, 5 interchange, no substitute); interchange cap 75 single-publisher

Value: 23 players named, 18 in playing position plus 5 interchange players, all five available all match. The
substitute was scrapped for 2026. The interchange cap is 75 rotations a match (unchanged). So v1's "five interchange"
is now also the AFL's 2026 rule and copy may say so, citing these. In drawn finals the cap resets with 10 more
interchanges per extra time pair (REG26 12.8(c), AFL-GFD), which the game does not model.

Receipts:
- REG26 12.2(a)(i): "23 Players (inclusive of five (5) Interchange Players);"
- REG26, team list rule: "The Team list must contain the name and guernsey number of 18 Players in playing position, five (5) Interchange Players and three (3) Emergency Players."
- REG26 definitions: "Interchange Cap: is the total number of Interchanges that a Club may make in the course of a Match, being 75."
- AFL-RULES. AFL.com.au, "Changes to Laws of the Game and AFL Regulations" (Greg Swann quoted). https://www.afl.com.au/news/1435386/league-scraps-sup-rule-and-centre-bounce-in-major-shake-up
  - "The removal of the substitute means clubs will name 23 players, with five players named on the interchange bench from next season."
  - "We have listened to the feedback from players, the clubs and the AFLPA to remove the substitute in favour of a fifth interchange player with rotations to remain the same."
- ESPN-RULES. ESPN (AAP), "Centre bounce, sub gone in AFL rules shake-up", 2025-10-01. https://www.espn.com.au/afl/story/_/id/46442874/afl-centre-bounce-scrapped-substitute-rule-removed-changes
  - "Clubs will now name 23 players in their match-day teams, including five on the interchange bench."
  - "We're not changing the number of interchanges or anything like that, so there'll be five on the bench."
- ABC-NEW: "Instead, each team will be able to name five players on the bench, all of whom are available to play the whole match." and "Not for the first time, the AFL has made the call to do away with the sub in 2026 and beyond."
Independent publishers: AFL (REG26, AFL-RULES), ESPN, ABC. VERIFIED for 23 = 18 + 5 and no sub. The number 75 is AFL-only
(REG26, plus AFL.com.au https://www.afl.com.au/news/1528399/afl-gives-all-clear-to-last-minute-interchange-in-collingwood-hawthorn-draw-in-round-eight),
with ESPN and AFL-RULES only saying the number did not change. Treat 75 as UNVERIFIED for copy.

Other 2026 law changes (ABC-NEW, context only, not needed by the game): a last-disposal out of bounds rule between the
50 metre arcs, the centre bounce replaced by a throw-up, a centre square ruck change.

## 12. Nickname deny list (guard, one source per league is enough). DONE

Do not give a fictional club any of these nicknames (case-insensitive, singular or plural):

AFL and AFLW (18 clubs; AFL-FIX, ZH-LAD): Crows, Lions, Blues, Magpies, Pies, Bombers, Dockers, Cats, Suns, Giants,
Hawks, Demons, Dees, Kangaroos, Roos, Power, Tigers, Saints, Swans, Eagles, Bulldogs, Dogs. Plus Tasmania's Devils
(AFL entry 2028, already in the VFL).

NRL (17 clubs; Zero Tackle 2026 team lists https://www.zerotackle.com/round-17-team-lists-2026-235154/ and Rugby League
Zone https://rugbyleaguezone.com/nrl-round-17-team-lists-2026-431091/, via search extract): Broncos, Raiders, Bulldogs,
Sharks, Dolphins, Titans, Sea Eagles, Storm, Knights, Cowboys, Eels, Panthers, Rabbitohs, Dragons, Roosters, Warriors,
Wests Tigers (Tigers). Also announced entrants: Bears (Perth, 2027) and Chiefs (Papua New Guinea, 2028): add as a precaution.

SANFL (10 clubs; https://sanfl.com.au/ club list, nicknames per Austadiums https://www.austadiums.com/sport/comp/sanfl/teams):
Crows, Bulldogs (Central District), Tigers (Glenelg), Roosters (North Adelaide), Redlegs (Norwood), Magpies (Port
Adelaide), Panthers (South Adelaide), Double Blues (Sturt), Bloods (West Adelaide), Eagles (Woodville-West Torrens).

WAFL (10 clubs; https://wafl.com.au/ club list, nicknames per Austadiums https://www.austadiums.com/sport/comp/wafl/teams):
Tigers (Claremont), Sharks (East Fremantle), Royals (East Perth), Thunder (Peel), Demons (Perth), Bulldogs (South
Fremantle), Lions (Subiaco), Swans (Swan Districts), Falcons (West Perth), Eagles (West Coast).

VFL (AFL.com.au VFL clubs https://www.afl.com.au/vfl/clubs and Austadiums https://www.austadiums.com/sport/comp/vfl/teams):
Hawks (Box Hill), Demons (Casey), Lions (Coburg), Bulldogs (Footscray), Dolphins (Frankston), Borough (Port
Melbourne), Zebras (Sandringham), Sharks (Southport), Devils (Tasmania), Tigers (Werribee), Seagulls (Williamstown),
plus the AFL clubs' reserves (already covered). Add Bullants (Northern Bullants, the former North Melbourne VFL name).

Combined deny list (unique): Bears, Blues, Bloods, Bombers, Borough, Broncos, Bulldogs, Bullants, Cats, Chiefs,
Cowboys, Crows, Dees, Demons, Devils, Dockers, Dogs, Dolphins, Double Blues, Dragons, Eagles, Eels, Falcons, Giants,
Hawks, Kangaroos, Knights, Lions, Magpies, Panthers, Pies, Power, Rabbitohs, Raiders, Redlegs, Roos, Roosters, Royals,
Saints, Sea Eagles, Seagulls, Sharks, Storm, Suns, Swans, Thunder, Tigers, Titans, Warriors, Zebras.

v1 check: v1's CLUB_ENDINGS are Comets, Kites, Foxes, Herons, Storm, Embers. Only "Storm" (NRL) is on the list, as the
brief says. Side note: v1's place "Cresswick" is one letter off the real Victorian town Creswick; harmless, but v2
can pick a place that is not a near-miss of a real town.

## 9. Optional: score realism, 2023 to 2026 home and away. Totals from AFL Tables (documented dataset); draws two-sourced

AFL Tables season lines (home and away games only, 207 a season), quoted exactly:
- 2023: "Games: 207, Goals: 5035, Behinds: 4434, Accuracy: 53.17%, Total points: 34644, Average score: 83" https://afltables.com/afl/seas/2023.html
- 2024: "Games: 207, Goals: 5080, Behinds: 4442, Accuracy: 53.35%, Total points: 34922, Average score: 84" https://afltables.com/afl/seas/2024.html
- 2025: "Games: 207, Goals: 5070, Behinds: 4483, Accuracy: 53.07%, Total points: 34903, Average score: 84" https://afltables.com/afl/seas/2025.html
- 2026: "Games: 207, Goals: 5347, Behinds: 4809, Accuracy: 52.65%, Total points: 36891, Average score: 89" https://afltables.com/afl/seas/2026.html
Each line checks: goals x 6 + behinds = total points.
Derived per team per game: 2023 83.7 pts, 22.9 scoring shots; 2024 84.4, 23.0; 2025 84.3, 23.1; 2026 89.1, 24.5.
Accuracy 52.7 to 53.4 percent. The brief's back-of-envelope (about 22 shots, 80 to 90 points, accuracy about 0.54) sits
just inside or beside these.

Drawn home and away games (ladder D columns and the match lists):
- 2023: 2 (Richmond v Carlton R1 58-58; Sydney v Geelong R16 54-54). AFLT and Zero Hanger 2023 ladder (D = 1 for Carlton, Sydney, Geelong, Richmond).
- 2024: 3 (Essendon v Collingwood; Adelaide v Brisbane; Fremantle v Collingwood). Zero Hanger 2024 ladder D: Brisbane 1, Collingwood 2, Fremantle 1, Essendon 1, Adelaide 1.
- 2025: 1 (North Melbourne v Brisbane, R10, 10.11 (71) each). Zero Hanger 2025 ladder D: Brisbane 1.
- 2026: 3 (Collingwood and Hawthorn drew twice; Western Bulldogs v Carlton). AFLT26 and ZH-LAD ladder D: Hawthorn 2, Collingwood 2, Western Bulldogs 1, Carlton 1.
Draw rate 2023 to 2026: 9 of 828 = 1.1 percent (2023 to 2025: 6 of 621 = 1.0 percent). Matches the brief's "about 1 percent".
Status: averages are single-dataset (AFL Tables; Zero Hanger 2025 points-for figures agree where read, e.g. Adelaide PF
2278, West Coast PF 1466, but a full second tally was not done). Use as a LOOSE band, label it the game's band. Draw
counts: VERIFIED (AFL Tables and Zero Hanger).
Zero Hanger ladders: https://www.zerohanger.com/afl/2023-afl-ladder/ , https://www.zerohanger.com/afl/2024-afl-ladder/ , https://www.zerohanger.com/afl/2025-afl-ladder/

## 10. Optional: ladder shape, minor premier and bottom club wins. VERIFIED (AFL Tables and Zero Hanger)

| season | minor premier | W-L-D | bottom club | W-L-D |
|---|---|---|---|---|
| 2023 | Collingwood | 18-5-0 | West Coast | 3-20-0 |
| 2024 | Sydney | 17-6-0 | Richmond | 2-21-0 |
| 2025 | Adelaide | 18-5-0 | West Coast | 1-22-0 |
| 2026 | Fremantle | 19-4-0 | Essendon | 2-21-0 |
Sources: AFL Tables season pages (above) and the Zero Hanger ladders (above, plus ZH-LAD for 2026).
So a real season's top club wins 17 to 19 of 23 and the bottom club 1 to 3. Use as the plausible band for tier tuning.

## Extra, for the record: the 2026 Grand Final

Brisbane Lions 14.12 (96) d Fremantle 12.17 (89), MCG, 2026-09-26 (AFLT26). Brisbane were 3rd: they lost QF2 to Sydney,
beat Adelaide in SF2 and Hawthorn in PF1, so the 2026 premier came the long way round through the double chance. Only
AFL Tables read for this line; not needed by the game.
