# NBA line norms and award rules: the sources (Round 1103)

Read 2026-10-07 by the builder of Round 1103. Every real number in `src/data/nbaLeagueNorms.ts` is listed here
with where it was read. Two sources agreeing is the rule; a number read from one source is marked PARTIAL here
and in `NBA_NORMS_PARTIAL`, and the harness check that leans on it is looser. Nothing here was typed from memory.

Sources are named by site and page. No wiki page was used.

## 1. One club's averages a game, regular season

| Season | Points | Rebounds | Assists | Steals | Blocks | Source one | Source two | Verdict |
|---|---|---|---|---|---|---|---|---|
| 2025-26 | 115.6 | 43.8 | 26.7 | 8.4 | 4.8 | basketball-reference.com/leagues/NBA_stats_per_game.html, the Per Game table (1,230 games) | espn.com/nba/stats/team/_/season/2026/seasontype/2, the thirty club rows averaged: 115.61, 43.76, 26.73, 8.41, 4.85 | AGREE to one decimal (blocks 4.85 sits on the rounding edge; the first source prints 4.8 and that is what is stored) |
| 2003-04 | 93.4 | 42.2 | 21.3 | 7.9 | 5.1 | the same page (1,189 games) | espn.com/nba/stats/team/_/season/2004/seasontype/2, the twenty nine club rows averaged: 93.40, 42.21, 21.30, 7.93, 5.05 | AGREE to one decimal (blocks 5.05 on the rounding edge; the first source prints 5.1) |

## 2. The league leading average, ten seasons to each anchor

Source one: basketball-reference.com/leaders/pts_per_g_yearly.html, trb_per_g_yearly.html, ast_per_g_yearly.html (two
decimals). Source two: landofbasketball.com/awards/nba_scoring_leader_year.htm, nba_rebounds_leader_year.htm,
nba_assists_leader_year.htm (one decimal). All sixty agree once the first source is rounded to one decimal, and one
decimal is what the file stores. No names are stored.

| Season | Points (one / two) | Rebounds (one / two) | Assists (one / two) |
|---|---|---|---|
| 1994-95 | 29.30 / 29.3 | 16.80 / 16.8 | 12.33 / 12.3 |
| 1995-96 | 30.38 / 30.4 | 14.88 / 14.9 | 11.17 / 11.2 |
| 1996-97 | 29.65 / 29.6 | 16.05 / 16.1 | 11.40 / 11.4 |
| 1997-98 | 28.74 / 28.7 | 15.01 / 15.0 | 10.54 / 10.5 |
| 1998-99 | 26.75 / 26.8 | 12.98 / 13.0 | 10.78 / 10.8 |
| 1999-00 | 29.67 / 29.7 | 14.11 / 14.1 | 10.12 / 10.1 |
| 2000-01 | 31.08 / 31.1 | 13.53 / 13.5 | 9.78 / 9.8 |
| 2001-02 | 31.38 / 31.4 | 12.99 / 13.0 | 10.89 / 10.9 |
| 2002-03 | 32.09 / 32.1 | 15.42 / 15.4 | 8.89 / 8.9 |
| 2003-04 | 28.03 / 28.0 | 13.89 / 13.9 | 9.22 / 9.2 |
| 2016-17 | 31.58 / 31.6 | 14.13 / 14.1 | 11.20 / 11.2 |
| 2017-18 | 30.43 / 30.4 | 15.99 / 16.0 | 10.25 / 10.3 |
| 2018-19 | 36.13 / 36.1 | 15.59 / 15.6 | 10.74 / 10.7 |
| 2019-20 | 34.34 / 34.3 | 15.16 / 15.2 | 10.21 / 10.2 |
| 2020-21 | 31.98 / 32.0 | 14.33 / 14.3 | 11.74 / 11.7 |
| 2021-22 | 30.57 / 30.6 | 14.67 / 14.7 | 10.80 / 10.8 |
| 2022-23 | 33.08 / 33.1 | 12.32 / 12.3 | 10.66 / 10.7 |
| 2023-24 | 33.86 / 33.9 | 13.66 / 13.7 | 10.90 / 10.9 |
| 2024-25 | 32.68 / 32.7 | 13.89 / 13.9 | 11.58 / 11.6 |
| 2025-26 | 33.48 / 33.5 | 12.86 / 12.9 | 10.72 / 10.7 |

The one row where rounding the first source to one decimal gives another digit is 1996-97 points (29.65 prints as 29.7
by the usual rule; the second source prints 29.6). The file stores the second source's 29.6: the two sources differ by
five hundredths, inside what one decimal can say.

## 3. Regular starters by position (DERIVED, and PARTIAL: one dataset)

`NBA_STARTER_NORMS` is computed by `scripts/genNbaLeagueNorms.mjs` from two table extracts that are not in the repo
(they hold real players' season lines). Its header records the pages, the date, the filter and a checksum of each
extract against the page.

- Pages: basketball-reference.com/leagues/NBA_2026_per_game.html and NBA_2004_per_game.html, the per game table.
- Filter: one row a player (a traded player's season total row), first listed position, 41 starts or more.
- Starters: 149 of 583 players in 2025-26 (PG 29, SG 30, SF 34, PF 27, C 29); 137 of 443 in 2003-04 (PG 26, SG 29,
  SF 27, PF 28, C 27).
- Medians, points / rebounds / assists / minutes. 2025-26: PG 17.3/3.9/6.1/31.0, SG 12.4/4.0/2.8/29.1, SF
  15.2/5.2/3.2/30.3, PF 14.8/5.3/2.5/29.7, C 12.1/8.0/2.0/27.2. 2003-04: PG 14.6/3.4/5.9/34.8, SG 17.3/4.0/3.2/36.0,
  SF 12.9/4.6/2.2/32.0, PF 15.1/8.6/2.1/34.7, C 8.7/7.4/1.0/28.7.

No second table carrying the five positions and games started for both seasons could be had, so EVERY key of the
starter norms is PARTIAL. The harness gives a partial key 15 percent of its median more on each side.

Smell checks passed: quartiles in order everywhere, no position under 15 starters, both league rows between 80 and
125 points, every league leading average above the 75th percentile starter at any position.

## 4. The award rules

| Fact | Value in the file | Source one | Source two | Verdict |
|---|---|---|---|---|
| The games rule | 65 of 82, from the 2023-24 season, for MVP, Defensive Player of the Year, Most Improved Player, All-NBA and All-Defensive | nbcsportsphiladelphia.com/nba/nba-65-game-rule-awards-explainer/562235/ | espn.com/nba/story/_/id/39318248 | AGREE |
| Outside the games rule | Rookie of the Year, Sixth Man, All-Rookie | the same NBC Sports Philadelphia page ("not impacted") | hoopsrumors.com/2025/05/nba-announces-2024-25-all-rookie-teams.html (All-Rookie "doesn't require players to meet the 65-game minimum") | AGREE for All-Rookie; Rookie of the Year and Sixth Man rest on source one plus source two's list of covered awards, which names neither |
| The rule's exceptions | NOT MODELLED: 62 games and a season ending injury with 85 percent of the club's games before it; a game counts at 20 minutes | both pages above | | The engine does not know when in a season he was hurt. The game applies the plain bar and its help says so |
| Stat title minimum today | 70 percent of the club's games (58 of 82) | nba.com/stats/help/statminimums | basketball-reference.com/about/rate_stat_req.html ("58 G" for 2013-14 on) | AGREE |
| ... from which season | 2013-14 | basketball-reference.com/about/rate_stat_req.html | none read | PARTIAL (`rules.statTitleShareFrom`) |
| ... before it | 70 games, or 1,400 points, 800 rebounds, 400 assists (1999-2000 to 2010-11 and 2012-13) | the same page | none read | PARTIAL (`rules.statTitleGamesBefore`, `rules.statTitleTotalsBefore`) |
| ... the short 2011-12 season | 56 games, or 1,127 points, 644 rebounds, 321 assists (the 66 game season; stored as `statTitleShortBefore` under its start year, 2011, and applied as written since the fix pass of 2026-10-08, when the page was read again) | the same page ("2011-12 NBA 56 G or 1610 MP/1127 PTS/644 TRB/321 AST") | none read | PARTIAL (`rules.statTitleShortBefore`). The 72 game 2020-21 season is after the share came in: the page reads "58 G, or on pace for 58 G", and the game asks 70 percent of 72, which is 51 |
| All-Star size | 24: five starters and seven reserves a conference | pr.nba.com/2026-nba-all-star-game-starters-voting-results (five starters a conference) and nba.com/news/2026-all-star-reserves (seven a conference) | espn.com/nba/story/_/id/47348186 (five starters a conference; "head coaches will pick seven reserves from each conference (regardless of position)") | AGREE. A report of 25 players in the 2026 game counts an addition made for that year's three team format; the selection itself is 24 |
| All-Star starters' vote | fans 50 percent, players 25, media 25 | pr.nba.com (as above) | espn.com (as above) | AGREE |
| ... since which season | the 2016-17 season; the fans alone picked the starters from 1974-75 until then | nba.com/all-star-voting-format-explained | stlamerican.com/sports/local-sports/nba-players-media-to-join-fans-in-voting-for-2017-all-star-game (read 2026-10-08, carrying the league release: fans 50 percent, players and a media panel 25 each for the 2017 game; "Previously, only fans voted for the starters") | AGREE |
| All-NBA | 15, three teams of five, picked without regard to position | nba.com/news/2025-26-all-nba-teams-announced | sports.yahoo.com (the 2026 All-NBA teams story, the same fifteen in three teams) | AGREE |
| All-Defensive | 10, two teams of five | nba.com/news/2025-26-all-defensive-teams-announced | hoopsrumors.com/2026/05/nba-announces-2025-26-all-defensive-teams.html | AGREE |
| All-Rookie | 10, two teams of five, first year players, no games minimum | hoopsrumors.com/2025/05/nba-announces-2024-25-all-rookie-teams.html | nba.com/news/2025-26-all-rookie-teams-announced (two teams of five) | AGREE on the size and the missing minimum. "First year players" is the award's own name; neither page spells the eligibility out |

## 5. What the game does with these

- The stat line of a new season is held so the median healthy starter at each position sits inside the real starters'
  quartiles of section 3 (scripts/simNbaAwardsSense.mjs, section A).
- A career that starts in 2003-04 has every average scaled by `nbaEraScale(year)`: a straight line between the two
  league rows of section 1. That line is the game's rule. It is not a claim about any season in between.
- The league leading averages of section 2 are the bars a stat title is decided against.
- The award rules of section 4 are applied as written above.

## 6. PARTIAL keys, in one list

Every `y2004.<pos>.<stat>` and `now.<pos>.<stat>` starter quartile (sixty keys), `rules.statTitleShareFrom`,
`rules.statTitleGamesBefore`, `rules.statTitleTotalsBefore`, `rules.statTitleShortBefore`.

## 7. What the round measured (for the legacy recalibration round)

Every number here is scripts/simNbaAwardsSense.mjs at full size: 6,000 careers a seed, seeds 1 to 5, the board's
own order, one career in four in the 2003-04 era. "Main" is the game before Round 1103, recorded once in
scripts/data/nbaAwardsSenseBaseline.json.

| What | Main (five seeds) | Round 1103 (five seeds) |
|---|---|---|
| Hall of Fame inducted, percent of careers | 31.70, 31.88, 31.78, 31.75, 31.55 | 31.68, 31.58, 32.17, 32.30, 31.50 |
| First ballot, percent of careers | 27.03, 27.93, 27.83, 27.57, 27.45 | 27.33, 27.53, 27.87, 27.38, 27.32 |
| MVPs a career | 0.316, 0.323, 0.310, 0.313, 0.311 | 0.296, 0.315, 0.319, 0.304, 0.304 |
| All-NBA a career | 1.972, 2.006, 1.981, 1.987, 1.986 | 1.955, 1.969, 2.002, 1.956, 1.974 |
| All-Star a career | none existed | 3.162, 3.151, 3.187, 3.179, 3.165 |
| All-Defensive a career | 1.342, 1.383, 1.357, 1.337, 1.361 | 1.349, 1.302, 1.365, 1.362, 1.377 |
| Careers with an MVP, percent | 16.22, 16.85, 16.27, 16.75, 16.68 | 17.18, 17.07, 17.73, 17.70, 17.53 |
| Careers with an All-NBA, percent | 59.07, 58.88, 58.60, 58.68, 58.93 | 61.70, 60.98, 62.35, 62.47, 62.20 |
| My share of the head to head years with the rival, percent | 62.33, 63.02, 62.30, 62.52, 62.80 | 62.32, 62.25, 62.35, 62.97, 62.51 |

The legacy constant. `NBA_LEGACY_NEW_LINE_SCALE` in src/lib/nbaMyCareer.ts is what the points of a season on the
new line are worth to the legacy score against a season on the old one. It is set from the Hall rate, by the
harness's own knob (`SENSE_TRY_SCALE`). The value shipped is 1.4, measured on 2026-10-08 in the round's fix pass,
after two things changed under the first value (1.25):

1. The constant weighs the points TERM only. It used to be added to the career's points total before the table
   was read, so the Hall of Fame card printed a total the player never scored and the points standout was paid on
   it. It is now a term of the calibration 2 table itself (the points of new line seasons, at 430 a point times
   the constant less one, which is 1,075 at 1.4), so every total the scorer, the standout and the card read is the
   career's real one.
2. The standout marks (the Hall ballot round's ledger, scripts/data/careerHallMarks.json) were measured again on
   the new line, the way scripts/genCareerHallMarks.mjs says to (six runs of 2,000 careers, the table, six runs
   again). On the old line's marks no new line career could reach an assists mark at any position.

| Constant | Inducted, percent (five full seeds) | First ballot, percent | Read on |
|---|---|---|---|
| 1.00 | mean 29.96 | mean 25.79 | the new marks, real totals |
| 1.10 | mean 30.38 | mean 26.15 | the same |
| 1.25 | mean 31.10 | mean 26.81 | the same |
| 1.30 | 31.28, 31.17, 31.73, 31.87, 30.75 (mean 31.36) | 26.98, 27.10, 27.40, 26.75, 26.92 (mean 27.03) | the second measuring run |
| 1.35 | 31.45, 31.45, 31.95, 32.17, 31.03 (mean 31.61) | 27.18, 27.30, 27.65, 27.07, 27.15 (mean 27.27) | the same |
| 1.40, the value shipped | 31.68, 31.58, 32.17, 32.30, 31.50 (mean 31.85, main 31.73) | 27.33, 27.53, 27.87, 27.38, 27.32 (mean 27.49, main 27.56) | the same |

All six rows are 6,000 careers a seed, seeds 1 to 5, on the new marks: the first three on the fix pass's first
measuring run, the last three on its second, which gave the same table. Before the fix pass the round carried 1.25 on inflated totals
and the old marks (31.52 and 27.31), and its first pass tried 1.00, 1.15 and 1.30 on fleets of 3,000 careers.

The new marks, from and to, by position (the ledger holds the careers behind them): PG points 31,000 to 38,700,
assists 10,700 to 13,700; SG points 32,500 to 39,900, rebounds 7,850 to 9,610, assists 5,420 to 6,470; SF points
31,800 to 39,900, rebounds 10,400 to 11,800, assists 8,270 to 10,300; PF points 28,700 to 34,100, rebounds 11,000
to 13,400; C points 26,700 to 32,200, rebounds 15,600 to 18,400. A power forward's and a centre's assists left
the list by the ledger's own half rule: on the new line a big man no longer passes like a guard.

Which marks a career is read on follows the line it was played on (`nbaLegacyTableFor`). A career with no game
on the new line is read on the marks the Hall ballot round measured on the old line, frozen in the engine as
that round committed them, so a career retired on calibration 2 before this round keeps the ballot it was told:
src/test/nbaOldSaveLines.test.ts and section H of the harness hold that on the frozen fixture, and the first
table of new marks alone re-told six of its ten stamped careers. A career with every game on the new line is
read on the ledger's table. In between, each mark is a straight line from one book to the other by the career's
share of games on the new line, and a family only the old books list fades with that share. Nothing in that is
tuned. A career read on Hall calibration 1 (retired before the ballot round) is the Round 123 formula to the bit.

What the Hall of Fame ballot's own harness says on this tree (scripts/simCareerHall.mjs nba, 2,000 careers, run
whole on 2026-10-08): all 32 checks green. 10.23 percent of careers reach a standout mark (its band 7.98 to
12.65, no cell out), the standout is paid on 346 of 2,000 careers, none is off the restated calibration 2 score,
and the Hall share on its fleet goes from 30.7 percent on calibration 1 to 34.4 on calibration 2 (its ceiling
38.0). Its controls markdrift, todrift, noramp, catchersteals, nostandout and below each fired.
