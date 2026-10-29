# Round 1541 notes: NBA My Career international summers, Part A (dark)

Branch r1541-nba-team-usa, started from origin/main 0846f9c5 (INTL_BASE). Brief:
dukb-handoff/2026-10-10/briefs/brief-1541.md, with the critic's corrections (critic-1541.md).
Nothing a player sees changes in this round: the board does not read `sport.intl` until Part B (Round 1544).

## Step 1: the ledger (done)

- scripts/data/basketballIntlSources.json: 69 facts, 165 reads, read 2026-10-22 through a fetch tool.
  Every fact of a played edition (calendar, name, shape, field, finishing places) and the two game
  lengths has two reads or more on two hosts that are not each other; fiba.basketball and
  about.fiba.basketball count as one body; no wiki host. The main pairs: Olympedia with Land of
  Basketball for every Olympics (plus Basketball Reference, APBR and FIBA as third reads); Land of
  Basketball with Global Sports Archive, FIBA, Basketball Reference and wire reports (Reuters, AP,
  AFP carried by papers) for the World Cups.
- src/data/basketballIntl.ts: 15 editions as tuples (Olympics 2004, 2008, 2012, 2016, 2021 (the
  Tokyo 2020 Games), 2024, 2028, 2032; World Championship 2006 and 2010; Basketball World Cup 2014,
  2019, 2023, 2027, 2031), five shapes, the partial list, the projection cycles, the game lengths.
- BASKETBALL_INTL_PARTIAL = wc-2027, oly-2028, wc-2031, oly-2032: their competition systems are not
  published (2027 and 2028 have two reads for the team count only). Each plays the last verified
  shape of its competition. No played edition is partial.
- 2019 and 2023 had a second group round; the engine plays one group round, so they are
  `playable: false`, played as eight groups of four into a round of 16 (`game-8x4`).
- Calendar 2004 to 2050: 23 summers with an edition, 24 without; the game's own cycles start at
  2035 (World Cup) and 2036 (Olympics), one cycle after the last ledgered edition of each.
- Fields: 11 played fields, 47 nations; Puerto Rico and Serbia and Montenegro have no flag in
  FlagImg.tsx and render as their name (named in simCareerIntl section 3).
- Not two sourced, so not used: Qatar's automatic place at 2027 (one read, Eurohoops), and the men's
  basketball tournament on the Brisbane 2032 programme (no read; the organisers' venue page answered 404).
- TEAM USA: a registered mark of the USOPC (USPTO 74522713, registration 2455565, and 86505061,
  registration 4773080, read on two mirrors of the register, Justia and Docket Alarm). Never printed.

## Step 2: src/lib/careerIntl.ts (done)

The sport free module: the calendar a ledger answers (played, still to come, the game's own cycles, an
unknown id rendered from its parse), the field the game draws on the edition's own stream (from the last two
played fields of the competition, widened when short, null when even that is short), the tournament (pots by
strength, a round robin a group through leagueCore's roundRobinCalendar, best thirds, a knockout seeded by group
place and record, 1 v 8, 4 v 5, 2 v 7, 3 v 6, a bronze game as a flag), the call (derived from the save), the
answer, the derived totals (intlStatsOf) and the repair on load. The bind hands in whether a group game may end
level and the table order (critic item 7); its unit file runs a never level bind and a bind whose groups may
draw and whose level knockouts name a winner. worldCompetition.ts (Club Manager's) is not bound: its header
says its tables are football's.

## Step 3: the NBA bind, dark (done)

- src/lib/nbaCareerIntl.ts: the game's own rules as constants (the call at 86, at most 36, health 50 or more;
  rungs 92, 89, 87, 85, 82, 76; lift 0.5 a point over 86 up to 4; score 80 + 1.2 x gap + N(0, 9), floor 45,
  overtime 10 + 0.3 x gap + N(0, 3); his line x 40/48 x 0.75 plus a draw; the knock 8 percent plus 1 a year over
  30, health minus 8, floor 30), the words, the help rules built from the constants, NBA_CAREER_INTL.
- usCareerSport.ts: optional `intl` on the career and optional `intl` face on the binding (type imports only).
  nbaCareerSport.ts carries `intl: NBA_CAREER_INTL`; the NFL, MLB and NHL bindings carry none. The board does
  not read it until Round 1544.
- src/test/helpers/usCareerDrive.ts takes an optional intl policy, answered after the summer is dealt and
  before card 1 (critic item 4), and an onSummer hook. With no policy the drive is the drive it was.

## Measured for the lead (runner r1541-s3a, r1541-s3b; 400 careers an era, seeds 0 to 399)

- Share of careers ever called at the proposed bar 86: 57.5 percent (2026 start) and 59.5 percent (2003-04
  throwback), 2.10 and 2.01 calls a career, 3.66 and 3.38 a called career. Above the one in two the brief
  named as the top of the target. At other bars (2026 start / throwback): 87: 48.8 / 47.3; 88: 37.3 / 37.3;
  89: 27.0 / 28.5; 90: 19.0 / 19.5.
- Of the edition summers rated 86 or more, health under 50 held back 3 and 2 (0.4 and 0.2 percent), age over
  36 held back 6 and 5: the age cap and the health bar almost never decide anything (critic's answer 2).
- Gold and medal percent by tier at the call (86-88, 89-91, 92-94, 95-99), held out sets pooled: played
  editions gold 46.6, 54.4, 64.4, 66.8; still to come 68.1, 77.4, 86.9, 94.0; projected 65.0, 80.9, 88.4, 93.2.
  Medal about 79, 83, 89, 90 (played) and 89 to 99 elsewhere. The design intent (92-94 wins gold in half to
  three quarters of summers) holds for the played editions and is exceeded for editions still to come and
  projected ones: there every nation plays at the mean of its rungs, which pulls the field toward the field
  rung while the USA's own mean is 89.5. A lead decision before Part B.
- Legacy and the Hall, measured never asserted (called careers, always go against always rest): 2026 start
  median 453 vs 457, Hall share 43.0 vs 44.3 percent; throwback 479 vs 479, 46.2 vs 46.2.

## Weight and save size (runner r1541-weigh and r1541-f1)

- Gzipped JS a route loads, 390 by 844, database and ad hosts blocked, base 0846f9c5 against this head, both
  built on the runner: /nba-my-career 578.5K to 585.5K (+7.0K, one more file; the NbaMyCareer chunk 85.8K to
  92.3K: the ledger, careerIntl.ts and nbaCareerIntl.ts); /nfl-my-career 493.1K to 493.1K; /mlb-my-career
  566.7K to 566.8K; /nhl-my-career 569.3K to 569.3K. /nba-my-career has no row in sweepWeight's BUDGETS (open
  question 10). The /nfl-my-career row (493K) reads 493.1K on base and head alike.
- A career of 21 seasons or more that went every time it was called: the save grows by 5.4K (2026 start) and
  6.5K (throwback) at the median, 12.7K at most, almost all of it `last`, the snapshot of the latest
  tournament (a 32 nation World Cup is 64 games). Critic item 25 suggests deriving `last` on read instead;
  kept stored as a snapshot here (a later tuning of the bind's numbers would otherwise redraw a bracket that
  disagrees with the medal on the save), a lead decision for Part B.

## Owed (decision 11 and the critic)

- Part B (Round 1544) must rewrite this lane's own page copy that goes false with four decisions a summer and
  26 badges (critic item 2: src/pages/NbaMyCareer.tsx 35, 40 and 42; scripts/playNbaNumbers.mjs 205 and
  scripts/simNbaAwardsSense.mjs 1649 to 1651 read those numbers), and public/nba-my-career/index.html and the
  lastmod ledger move at that release's build:seo (the lead's).
- To the other lane, the guide line src/data/gameContent/basketball.ts 2176 ("Each of the 23 badges") beside
  1957, 2007 and 2037, and a look at whether the footer disclaimer should name the IOC and FIBA beside UEFA.
- To FlagImg.tsx's owner, if the lead rules it: `"Puerto Rico": "pr"` (open question 6). Serbia and
  Montenegro stays a name.
- Critic item 12: the other lane's uncommitted US career drafts in the root checkout touch usCareerSport.ts
  and nbaCareerSport.ts; this round's hunks there are one optional field each (the type and `intl:`).
- Critic item 23: a summer card that narrates a quiet summer at home can follow an Olympic summer (the deal
  comes before the call); a later filter can read the intl row.

- To the other lane (guides): src/data/gameContent/basketball.ts lines on "up to three decisions"
  and "23 badges" go stale at Part B, not in this round.
- A data round after the 2027 World Cup final (12 September 2027): BASKETBALL_LAST_PLAYED_SUMMER and
  the 2027 field and places.
- To session I: binding soccerInternational.ts's simulateTournament and soccerCareerEngine.ts's
  InternationalStats to src/lib/careerIntl.ts, behind a byte digest of seeded careers.
