# Copy plan per game family (Phase 0 audit, copy area, 2026-10-08)

Proposal only. Nothing in `src`, `public` or the product was changed to write this. Every number comes from
`copy-measure.mjs` (guide text at source, branch `ad-readiness`, Release AL) or `copy-data-sources.mjs` (what data
each reskin page reaches), both in this folder. The per game table is `copy-by-game.json`; the tier of every game is
in `copy-tiers.json`; the data each reskin page can quote is in `copy-data-sources.json`.

## 1. What the measurement says, in plain words

- 133 games, 133 guides, 114,321 guide words: 90,486 of body text, 20,332 of headings, 3,503 of one FAQ template.
- The brief is right about the SHAPE. Every guide prints the same five titled parts in the same order, because
  `src/components/seo/GameSeoContent.tsx` (lines 249 to 321) prints them unconditionally. 45 guides have a body of 385 to
  405 words and 72 are under 450: they were written to a size.
- The brief is right about the HEADINGS, and they are newer than the text. Round 638 (2026-09-19) put a keyword title on
  every part and a sub heading over almost every sentence, at the owner's request at the time, without changing a word of
  the sentences. Result today: 2,110 sub headings, 1,906 of them (90%) over exactly one bullet or paragraph, 873 (41%)
  over exactly one sentence, 1,350 (64%) repeating the words of the line under them. On a Tier C page there are 33 words
  of heading for every 100 words of text. All 665 part titles carry the game's name; 129 of 133 "How to play" titles
  tack a describing phrase onto it ("How to play X, a free ... game"; 118 of them use the word free). The brief's own
  standard page does it too: "How to play Soccer Career, a free football career simulation game".
- The brief is right about the FAQ template. "Is X free to play?" and its answer are added in code
  (`GameSeoContent.tsx` lines 177 to 178) to all 133 pages, and it also goes into the FAQ structured data.
- The brief is WRONG that reskins share "the same templated text". The sentences are written per game. Two Higher or
  Lower guides share 1.5% of their four word runs on average, Connect 4 2.2%, Perfect Season 2.6%, Connections 1.7%.
  Of 484 hand written FAQ answers only 4 repeat on another page. The reskin intros already do what the brief asks of
  Tier C: "The pool is every driver in F1 history with at least 8 career wins, 42 of them, from the 1950s through 2025"
  matches `src/data/f1HLDrivers.ts` (42 entries, 1950 to 2025). 37 of 65 Tier C intros carry a number.
- Real repeated text does exist, in four places: My Career for the four US sports (38 shared sentences, 2,322 words,
  27.7% alike), Gauntlet Draft (17 sentences, 23% alike), College Dynasty (20.1% alike) and Conquest (16 sentences, 9.8%).
- The brief's banned filler is almost absent from the guides: zero "test your knowledge", zero "fun for all fans", zero
  "whether you're a casual fan". It lives in a different place, the one line description each page file passes in:
  `LineupBuilder.tsx:539` (/build-your-xi), `NbaLineup.tsx:405`, `CollegeGrid.tsx:159`, `Teammates.tsx:37` and `:180`,
  `NascarChain.tsx:21`, `GuessTheCollege.tsx:92`, plus "How well do you know ..." on six guessing boards.

So Phase 1 is mostly a REMOVAL (the Round 638 heading layer, the keyword tails on the part titles, the template FAQ)
plus a targeted rewrite of the four families that really repeat themselves, not a rewrite of 114,000 words.

## 2. What makes /soccer-career different from a Tier C page

Measured, same script:

| | /soccer-career | Tier C median | /golf-higher-lower |
|---|---|---|---|
| body words | 2,179 | 397 | 325 |
| words under each sub heading | 68.6 | 17.9 | 14.3 |
| sub headings over one bullet | 9 of 23 | 97% of them | 16 of 16 |
| heading words per 100 body words | 9.4 | 32.9 | 45.5 |
| words per FAQ (question and answer) | 56 | 27 | 22 |
| numbers per 100 words | 4.1 | 3.5 | 4.9 |

The sentences on a Tier C page are as specific as Soccer Career's (same density of real numbers). The difference is
that Soccer Career has enough rules for a heading to gather several of them (growth, retirement, the World Cup cycle,
corruption heat), its rules are ones a player can get wrong, and its FAQ answers real questions at length. A Tier C page
has four steps and four rules, so a heading per sentence turns 325 words into 24 headings. Note Soccer Career is not
clean either: 9 of its sub headings sit over one bullet, and one is mislabelled ("A pay cut, an injury and a rival's
Ballon d'Or" sits over the rule about the award vote, `soccer2.ts` line 1854).

## 3. The tier proposal

A = full treatment, B = distinct game, C = reskin of one mechanic. By the brief's own definitions:

| Tier | Pages | Guide words today | Removed by the brief's rules (estimate) | Left |
|---|---|---|---|---|
| A | 21 | 37,943 | 3,552 | 34,391 |
| B | 47 | 36,653 | 7,951 | 28,702 |
| C | 65 | 39,725 | 10,691 to 15,269 | 24,456 to 29,034 |
| all | 133 | 114,321 | 22,194 to 26,772 (19% to 23%) | |

How the estimate is built: every tier loses the headings that sit over one bullet, the keyword tail of the five part
titles and the template FAQ. Tier B and C lose every sub heading (the brief: "No sub-headings inside it"). The higher
Tier C figure also stops printing the 4,578 words of generic steps that a family page would say once. It is an estimate
of what the rules remove, not of the rewrite.

**One constraint the brief does not know about.** The "?" help inside every game (`src/components/game/GameHelp.tsx`,
mounted through GameShell) reads its steps, rules and worked example from this same guide data. The house rule is that
every game shows instructions, rules and an example before play. So a Tier C page may stop PRINTING its generic steps,
but the data must keep them, or the "?" opens empty. Phase 1 needs the guide data to say separately what the help shows
and what the page prints.

## 4. The family page question (owner decision)

No page on the site explains a shared mechanic once. What exists is six SPORT hubs (/soccer, /pro-football,
/pro-basketball, /baseball, /hockey, /college), each with a section "Every X game here, and how they differ". Round 270
(`src/lib/sportHub.ts` header) decided that small groups get no hub because "a hub over two games is a thin page".
So the brief's "one family hub page per reskin family" means NEW indexable pages. Three ways to do it:

1. **Twelve family pages** (one per reskin family). Each can carry something no variant page has: a table of the
   variants built from the data files (what is compared, pool size, era range, daily or not). That table is original and
   derivable. Four families have only 3 or 4 variants (Perfect Lineup 3, Chain 4, Perfect Season 4, Missing starter 4),
   which is where the Round 270 worry about thin hubs applies.
2. **Eight family pages**, for the families with five or more variants, and the four small families explained in a
   section of their sport hubs or on one sibling.
3. **One page**, "How the games work", with a section per mechanic and the same tables. One new URL instead of twelve.

Recommendation: option 2 or 3. Whatever is chosen, each new page needs a route, a saved page, a sitemap row (derived),
a schema type, and has to pass simIndexing, simInternalLinks, simHubs and simSitemap. Numbers on it must be computed from
the data files at build time, not typed (the standing rule since Round 260).

## 5. Tier C: the twelve reskin families (65 pages after three grids move to Tier A)

"Alike" is the share of four word runs two variants have in common. "Own facts" are what the variant's data holds
today; "local" means a file in the repo that can be counted now, "database" means a table this audit did not query
(one read only count per table would be needed in Phase 1).

### Higher or Lower: 10 pages, 5,481 words, alike 1.5%, remove about 2,239
/higher-lower, /nfl-higher-lower, /nba-higher-lower, /mlb-higher-lower, /hockey-higher-lower, /f1-higher-lower,
/tennis-higher-lower, /cfb-higher-lower, /golf-higher-lower, /afl-higher-lower. Hub: none today.
Own facts, all local: soccer 199 players and three stats (appearances, goals, caps; it is a different game, your card is
face up); NFL has no single pool, it rotates 6 stat lists (touchdowns 60, passing yards 34, passing touchdowns 34,
rushing yards 31, receiving yards 31, receptions 30: 220 entries, 112 different players; corrected by the fact
checker, the first version of this line said "NFL 60 players"); NBA 80, career points 18,327 to 43,394; MLB 55, career home runs 399 to
762, careers 1914 to 2018; hockey 45, career points (two goalies marked unverified in the file); F1 42, wins 8 to 105,
1950 to 2025; tennis 44, Grand Slam singles titles 4 to 24, 1920 to 2026; college football 65, career passing yards 2,908
to 19,217, 1981 to 2024; golf 61, majors 2 to 18, 1861 to 2026; Aussie rules 60, career goals 511 to 1,360, 1906 to 2024.
The closest matchups (exact ties, one apart) can be listed from the same files. Most of this is already in the intros.
**Collision:** the other lane holds an uncommitted rewrite of 8 of these 10 guides (see section 9).

### Daily clue guessers: 11 pages, 6,478 words, alike 0.5%, remove about 2,623
/footle, /ufc, /olympics, /guess-the-college, /guess-the-year, /guess-the-nation, /f1-driver, /f1-constructor,
/guess-cbb-team, /guess-tennis-player, /guess-nascar-driver. Hub: none.
Own facts: Footle 557 players (local) plus market values (database); UFC 90 fighters active 1997 to 2026; Olympics 43
athletes, Games 1924 to 2026; colleges 70; Guess the Year 50 puzzles, 1972 to 2025; F1 drivers 20; F1 constructors 31;
NASCAR drivers in `nascarDrivers.json`; nation, college basketball and tennis pools in the database. Each page can also
name its clue columns, which differ per game and are the real difference between them.

### Grid: 7 pages, 5,334 words, alike 0.9%, remove about 1,471
/college-grid, /football-grid, /soccer-grid proposed Tier A (flagship: owner to confirm which); /nba-grid, /mlb-grid,
/hockey-grid, /cbb-grid Tier C. Hub: none, but four archive pages exist (/nba-grid/archive and so on, 44 past boards
each with real answer counts per square). Own facts: the franchise and achievement lists in `src/lib/*Grid.ts`, the
minimum pool size each file sets, college grid 75 stored puzzles, and from the archive how many players fit each
crossing (for example Spurs and Hawks: 49). The rarity score rule is `rarityPercent` in `src/lib/gridRarity.ts`.

### Connect 4: 5 pages, 2,803 words, alike 2.2%, remove about 1,182
/football-connect-4, /nba-connect-4, /mlb-connect-4, /nfl-connect-4, /nhl-connect-4. Hub: none.
Own facts: board is 7 by 6; curated boards NBA 9, MLB 6, NFL 6, NHL 6 (local), soccer has none local; the row and column
labels on those boards; answers are checked by a validator that refuses when it cannot verify. Thin on countable facts:
these pages will be the shortest.

### Conquest: 5 pages, 3,876 words, alike 9.8% (16 shared sentences), remove about 1,239
/conquest, /conquest-nba, /conquest-nhl, /conquest-mlb, /soccer-conquest. Hub: none.
Own facts, all local: NFL 32 teams; MLB 30; NBA and NHL team lists; soccer 96 clubs over 154 map regions with 696
borders. The Daily Challenge answer is word for word the same on four pages and must be said once.

### Connections: 5 pages, 2,963 words, alike 1.7%, remove about 1,096
/connections, /baseball-connections, /nba-connections, /nfl-connections, /nhl-connections. Hub: none.
Own facts: soccer 250 puzzles and baseball 60 (local); NBA, NFL and NHL keep 4 local and the rest in the database.
Sixteen names, four groups, four lives. Example groups can be quoted from the puzzle files.

### Career Path guessers: 5 pages, 2,721 words, alike 1.4%, remove about 1,138
/career, /baseball-career, /hockey-career, /nfl-career, /nba-career. Hub: none.
Own facts: soccer 253 players (local) plus the career tables (database); baseball 60; hockey 60; NFL 78, draft years 1957
to 2023; NBA 50. Each can say what its clue ladder reveals and in what order, which differs by sport.

### Gauntlet Draft: 5 pages, 4,048 words, alike 23% (17 shared sentences), remove about 1,327
/gauntlet-draft, /nba-gauntlet-draft, /mlb-gauntlet-draft, /nfl-gauntlet-draft, /nhl-gauntlet-draft. Hub: none.
Own facts: soccer 557 players; NBA 66 (the Perfect Lineup pool); MLB 30 rosters, 390 players; NFL 32 teams; NHL 32
rosters, 416 players. The most repeated reskin family: the daily rule and the "no player twice" rule are identical on
all five. Strongest case for a family page.

### Perfect Season: 4 pages, 2,507 words, alike 2.6%, remove about 1,017
/perfect-season-nfl, /perfect-season-nba, /perfect-season-mlb, /perfect-season-nhl. Hub: none.
Own facts: season length and picks are already stated and differ (17 games; 82 games and 6 picks; 162 games and 11
picks, chase 116 wins; 82 games and 6 slots); NFL seasons 1999 to 2024 and 78 coach stints (local). Player pools are in
the database (Lahman tables for MLB, season tables for the others): counts need one read each.

### Missing starter: 4 pages, 2,216 words, alike 1.7%, remove about 864
/missing-xi, /missing-five, /missing-nine, /missing-eleven. Hub: none.
Own facts, local: basketball 40 lineups and 130 names; baseball 30 lineups and 253 names; football 40 lineups and 370
names; soccer from the career tables (database). Every lineup carries its competition, date, opponent, score and venue,
so a page can say which finals it draws from.

### Chain: 4 pages, 2,246 words, alike 0.9%, remove about 918
/nba-chain, /ufc-chain, /tennis-chain, /nascar-chain. Hub: none.
Own facts: UFC 62 fighters and 59 fight results, 2003 to 2024 (local). NBA, tennis and NASCAR links are judged on the
server, so their pool sizes are not in the repo. What counts as a link differs per page (teammate, beat, raced against)
and is the thing to say.

### Perfect Lineup: 3 pages, 1,682 words, alike 2.3%, remove about 669
/perfect-lineup-nba, /perfect-lineup-f1, /perfect-lineup-nhl. Hub: none.
Own facts, local: NBA pool 66, F1 pool 41, NHL pool 57, each entry with a team, an era and a rating. One hook
(`usePerfectLineupGeneric`) drives all three, so the mechanic text can truly be said once.

## 6. Tier A: 21 pages, and the rules an explainer could document from code

These keep their depth. They lose only the one bullet headings, the keyword tails and the template FAQ (about 3,552 of
37,943 words). The explainers the brief asks for in Phase 2 can be written from these functions; nothing has to be invented.

- **Soccer Career** (/soccer-career, 2,409 words). `src/lib/soccerCareerEngine.ts`: `calculateLegacy` (line 7969) and
  `getLegacyTier` (7957) give the whole legacy score: goals by position with a cap (0.08 a goal up to 25 for attackers,
  0.15 up to 20 for midfielders, 0.3 up to 15 for defenders, clean sheets for keepers), assists up to 10, Champions
  League 8 each up to 20, league titles 3 each up to 10, domestic cups up to 5, Ballon d'Or 5 each up to 15, international
  up to 16, loyalty 3, 5 or 8, longevity 3, 5 or 7, integrity minus 30 to plus 20, and "the climb" of minus 18 to plus 8
  applied after the 100 cap. `rollPrimeType` (2551), `isInPrime` (2559) and `growStat` (2844) give the potential and
  decline curve: four prime types at 25, 40, 25 and 10 percent, growth of 1 to 3 in the prime, the slow down at 86, 90
  and 94, decline bands from 32, 35, 38 and 40, the extra pace loss from 28. `effectivePotential` (2607) and
  `pushCeiling` (5695) give the ceiling. `calculateBallonDor` (6896) gives the award vote. `calcSeasonRating` (4009) and
  `calcAppearances` (3775) give the season line. That is three or four explainers on its own.
- **My Career, four US sports** (/nfl-my-career, /nba-my-career, /mlb-my-career, /nhl-my-career, 9,570 words).
  `progress`, `shouldRetire`, `legacyOf` in `src/lib/nflMyCareer.ts` and the nba, mlb and nhl twins. The four guides
  share 38 sentences (the bank, the phone, the news box, the career log): the one real duplication inside Tier A.
- **Club Manager** (/club-manager, 3,726 words). `seasonLedgerScore` in `src/lib/clubManagerScore.ts` (the season
  score that reads the manager, Round 633), plus the board, transfer and finance rules in `src/lib/clubManager.ts`.
- **Front Office, four leagues** (6,602 words). `capUsed`, `capRoom`, `tradeValue`, `proposeTrade`, `runPlayoffs` in
  `src/lib/frontOffice.ts` and the nba, mlb and nhl twins (`nbaNextCap`, `nbaDraftCapital` and so on).
- **College Dynasty** (/cfb-dynasty, /cbb-dynasty, 2,088 words, 20.1% alike). `cfbRecruitClass`, `signRecruit` and twins.
- **Fight sims** (/fight-career, /fight-gym, /fight-promoter, 4,506 words). `ratingOf`, `shouldRetire`, `legacyOf`,
  `gymVerdict`, `promoterVerdict`.
- **/stadium-tycoon** (`legacyPointsOf`, `capacity`, `tapValue` in `src/lib/stadiumTycoon.ts`), **/rebuild**,
  **/aussie-rules-manager**, and the flagship grids (`rarityPercent`, and the answer counts in the archives).

## 7. Tier B: 47 pages

Distinct games. Intro, one ordered list, the rules a player could get wrong, FAQ only if it is theirs. Estimated
removal 7,951 of 36,653 words, nearly all of it sub headings (4,707 words) and keyword tails (2,027).
Soccer squad builders (11 of 12: /build-your-xi, /fantasy-draft, /squad-deal, /search-and-discard, /world-xi,
/sign-the-player, /dart-draft, /budget-builder, /mystery-box, /player-stock-market, /sports-bingo), Secret player games
(5), Champions quizzes (2), Arcade shots (2), Tycoon and idle (3 of 4), /manager-hot-seat and /deadline-day, and 22
standalone games. /build-your-xi and /fantasy-draft are on the brief's list of pages that rank: their URL, title and H1
stay. On 126 of the 133 game pages the H1 is the game's own name and the search title from `src/data/seoMeta.ts` prints
again as an h2 above the guide; on the other 7 (for example /budget-builder) that search title IS the H1. So a game's
name is in its H1, in that h2 and in all five part titles. The five part titles are the part Phase 1 can change freely.

## 8. What has to change with the copy (fences and readers)

Phase 1 cannot be done by editing the guide files alone. These read the same text:

- `scripts/simGuideHeadings.mjs` (Round 638) REQUIRES what the brief bans: the game's name in every part title, at least
  8 h3 and 1 h4 above the FAQ, exactly 131 converted guides, and every sentence frozen in
  `scripts/data/guideHeadingsFrozen.json`. It has to be rewritten to hold the new shape, on the owner's say so, since
  Round 638 was his request. The frozen file is useful on the way out: it holds the flat text of 131 guides.
- `scripts/simSchema.mjs` (lines 117 to 124) fails a game page with no FAQ markup or with fewer than two questions in
  it. Every guide has at least 2 questions of its own today, so dropping the template alone is safe, but the brief also
  allows one or zero FAQs, and that trips this check.
- `scripts/simSeoTitles.mjs` (Round 642) requires every search title to carry the label, a sport word and the kind of
  game, and every description to say "free". The brief says titles do not change, so this one stays as it is.
- 26 other harnesses and 7 tests name the guide files, most of them to check a guide sentence against the game code (for
  example simPerfectSeasonOdds, simNbaLuxuryTax, simTriviaFacts, simIdleArenaCap, simNoInventedQuotes). Each reworded
  sentence they anchor on needs its harness updated in the same round.
- `scripts/genSearchKeywords.mjs` builds the site search index from the guides and must be rerun; simSiteSearch section 7
  fails otherwise. `scripts/data/lastmod.json` will honestly re-date every changed page.
- The "?" help, as in section 3.
- Master build spec D46 (`docs/MASTER-BUILD-SPEC-2026-08.md` line 5489) is where the new template, tiers and banned
  patterns go; it already says "Do not repeat the same generic paragraph across every game".

## 9. The other lane's unshipped drafts (root checkout, uncommitted, read only)

- **Eight of the ten Higher or Lower guides are being rewritten** (`baseball.ts`, `basketball.ts`, `college.ts`,
  `hockey.ts`, `moreSports.ts`; not /higher-lower, not /nfl-higher-lower). The drafts go the opposite way to the brief:
  3,141 words on the changed lines become 5,491 (+75%), and facts that are in the data files are replaced with
  disclaimers. Golf's "Memorize the podium: Nicklaus 18, Woods 15, Hagen 11" and "61 players, everyone with at least 2
  majors" go; "Illustrative major counts only: one golfer has six and another has four" comes in. The baseball example
  with Griffey 630, Thome 612 and the three way tie on 521 (all in `src/data/mlbHLPlayers.ts`) becomes "The numbers in
  this example are not attributed to real players". The frozen fixture is not in that diff, so as it stands it would
  also turn simGuideHeadings red.
- `src/lib/sportHub.ts`: the title tag and description of all six sport hubs are changed. The brief forbids changing a
  title without asking.
- `src/lib/records.ts`, `RecordPage.tsx`, `simRecordPages.mjs`: each record page gains a "how to read this table"
  paragraph and a short related list. Useful for Phase 2, but no last verified date and no named source.
- `About.tsx`, `Contact.tsx`: About loses the "One person ... writes the game engines, checks the rosters" passage and
  prints the project email; Contact gains a what to include list. Phase 3 rewrites both pages.
- `GridArchive.tsx`: 26 lines changed (not read in detail).

Phase 1 and those drafts edit the same lines of the same files. One of the two has to stand down before Phase 1 starts.

## 10. Proposed order for Phase 1 (if approved)

1. Owner decisions first: confirm Round 638 is reversed; which grids are flagship; family pages (12, 8 or 1); what
   happens to the other lane's drafts.
2. Change the block and the fences together: plain part titles, no template FAQ, sub headings only where a heading
   gathers several rules (Tier A), the "?" help kept whole.
3. Tier C by family, largest first (Daily clue guessers, Higher or Lower, Grid), each with its data table derived at build.
4. The four repeating families (My Career US, Gauntlet Draft, Conquest, College Dynasty): say the shared part once.
5. The page description lines and board subtitles that carry the filler (section 1, last bullet).
6. Tier B, then the Tier A trims. Rerun the measurement: target zero headings over one bullet, zero sentences on more
   than three guides.
