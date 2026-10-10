# Round 1213 notes: Club Manager, the real 2026/27 fixture lists of more leagues (the data)

Branch `r1213-cm-fixture-data`, based on `origin/main` at `074a9054`. Written by the builder as it goes, so a
later session can finish from here. Nothing in this round is imported by the game: no screen changes.

## What this round is, and is not

It is the DATA round of a three round split. It adds a tool, committed source parsers, one ledger file and one
receipt a league, a pure data harness and a frozen digest file. The round that binds the ledgers to the engine
(the registry, the lazy loaders, Help, What's New, the browser walk) comes after Release AT is live. A third
round takes the harder leagues.

## How a league is added (the whole procedure)

1. Its entry in `scripts/lib/cmFixtureSources/leagues.mjs`: the game's league id, two sources on two hosts, the
   committed parser for each, and an explicit name table a source (source spelling to game spelling, exact).
2. `node scripts/genCmLeagueFixtures.mjs fetch <leagueId>` saves both sources as raw bytes OUTSIDE the repo, in
   `C:/Users/antho/dukb-handoff/2026-10-10/cm-fixtures-raw/<leagueId>/` (or `CM_FIXTURE_RAW`). One plain GET with
   an honest User-Agent. A snapshot is never overwritten.
3. `node scripts/genCmLeagueFixtures.mjs rows <leagueId>` prints counts and club spellings (never a list), which
   is how the name table gets filled.
4. `node scripts/genCmLeagueFixtures.mjs write <leagueId>` runs the whole proof and writes
   `src/data/clubManager<League>Fixtures2026.ts`, `scripts/data/clubManager<League>Fixtures2026.receipt.json` and
   the league's line in `scripts/data/cmLeagueFixtures.frozen.json`. It writes nothing on any doubt.
5. `node scripts/simCmLeagueFixtures.mjs` on a runner, plus the rule fences, then one commit for that league.

A reviewer's independent recheck: fetch again into a NEW folder and compare with the committed ledger:
`node scripts/genCmLeagueFixtures.mjs fetch <leagueId> --dir <new folder>` then
`node scripts/genCmLeagueFixtures.mjs check <leagueId> --dir <new folder>`. It prints the matchdays compared and
the tuple differences, exits 0 only on zero, and writes nothing. The receipt's `recheck` field is null until a
reviewer has done this; whoever does it records `{ on, by, rounds compared, differences }` there.

## What must not be trusted

- A count or a fixture quoted in the brief from a summarising reader. Only rows parsed from kept bytes count.
- A snapshot hash can not be reproduced from the web later: the pages change every week (scores, moved dates).
  It can be reproduced from the kept bytes, which is why they are kept.
- Section E of the harness is a drift guard (ledger equals receipt). The truth check is the tool's: two sources,
  two different committed parsers, every tuple equal.

## Design choices a later round must know

- The data files are written with UNQUOTED keys (`url: "https://..."`), because `scripts/simLiveScores.mjs`
  accepts a publisher's address in the browser bundle only in that shape. The fence was not touched.
- The frozen digest covers `key, leagueId, seasonStartYear, clubs, rounds` only. The `sources` of a ledger can be
  repaired without a new key.
- A receipt source's `kind` says what the source is (league, federation, press, broadcaster, compiled feed).
  Nothing looks a source up by its kind.
- Matchday numbers are those of the list as first published. A match moved to another date keeps its matchday.
- The order of matches inside a matchday is the order of the source the receipt names in `orderSource`.
- The harness finds ledgers by listing `src/data/clubManager*Fixtures2026.ts`. When Release AT brings the Premier
  League's file to main it will be listed as PENDING (no frozen line) and held to sections A to G. The binding
  round freezes its line.

## Leagues

(one line a league as it lands: in or out, sources, snapshot hashes, sizes, the runner result that proved it)

## Runner results

(name, commit, what ran, exit codes)
