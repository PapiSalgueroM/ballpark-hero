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

## Owed (decision 11 and the critic)

- To the other lane (guides): src/data/gameContent/basketball.ts lines on "up to three decisions"
  and "23 badges" go stale at Part B, not in this round.
- A data round after the 2027 World Cup final (12 September 2027): BASKETBALL_LAST_PLAYED_SUMMER and
  the 2027 field and places.
- To session I: binding soccerInternational.ts's simulateTournament and soccerCareerEngine.ts's
  InternationalStats to src/lib/careerIntl.ts, behind a byte digest of seeded careers.
