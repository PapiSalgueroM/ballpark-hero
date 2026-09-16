# Round 617 contract: Club Manager's league fixture list plays half a season at one venue

Written 2026-09-15 by the Claude desktop lane (block 610 to 619), from the evidence gathered
while clearing the Round 612 finance red. This is the build contract: the engine change, the
save rule, and the fence, with the reasons. It is law for the round; anything it does not say
is decided by the builder and written into `docs/PROJECT-STATE.md` when the round lands.

## 1. The defect, with proof

`roundPairs` in `src/lib/clubManager.ts` (near line 8040) builds each league round with the
circle method: club 0 fixed, the rest rotated, pair i = (arr[i], arr[n minus 1 minus i]). It
swaps home and away on `(r + i) % 2 === 1`, where r is the round inside the half and i the pair
index. For the fixed club (i = 0) that alternates the way a real list does. For every rotating
club the pair index moves by one each round in the same direction as the round counter, so
`r + i` keeps its parity and the club keeps its venue for its whole run through one row of the
circle. Result, for every club but one: the club at shuffled slot k plays k rounds at one venue
and the rest of the half at the other, mirrored after the turn. Longest same venue run: 19 in a
20 club league, 17 in an 18 club league, 11 in a 12 club league. A verbatim copy of the function
printing every club's pattern shows it (the session scratchpad's `probePairs.mjs`, 2026-09-15),
and two independent readers reproduced it. Seen in play: Newcastle away for its first fifteen
league rounds, Ajax with no home league game from calendar week 9 to week 33.

Consequences: the fixture list is not a real one; the finance projection averages the gates
banked so far, so a club whose home run comes late projects a season from a few early gates
(Ajax, 19 percent over at week 5 and 10 percent over at week 30); the crowd, mood and form
loops all see lumpy seasons.

The shared circle method in `src/lib/leagueCore.ts` (`roundRobinCalendar`, read by Rebuild and
Stadium Tycoon) already swaps venue on the round's parity alone, which is the standard rule:
every club alternates, with a double where it changes row or wraps (a few a season, never three
in a row). Club Manager does not read it in this round because the two generators pair clubs
differently round by round (the shared one rotates the other way and is index based), so
swapping it in would change which clubs meet in which round for every live save, a pairing
migration that belongs to a later round with its own gate. The fix is the same venue rule inside
`roundPairs`.

## 2. The rule

For a balanced schedule, `roundPairs` swaps home and away on `r % 2 === 1` (the round's parity
inside the half) and keeps everything else: the fixed club, the left rotation, the second half
reversal on `round >= n minus 1`, the BYE ghost for odd sizes. Verified on the verbatim copy for
20, 18, 12, 24, 15 and 13 clubs: every club plays once per round, meets every other club once
at home and once away, has home count equal to away count over the season, and its longest
same venue run is 2. The run is counted over rounds, with a club's bye round ending it: in an
odd league the games either side of a bye are two rounds apart and share a parity, so counted
over played games with the bye skipped the worst run at 13 and 15 clubs is 3. The fence measures
the quantity it names, over rounds.

## 3. The save rule (what makes this a round, not a rider)

`fixtureFor` recomputes venues from `leagueClubs` and the round on every read, and so do the
other three callers (the AI world's rounds near line 8284, the rest of my round's results near
12193, and my bye week near 13619). Changing the rule under a live save would flip the venue of
every remaining fixture of the season in progress, and the season's balance would be wrong.
`loadCareer` rejects any `saveVersion` other than the current one, so the version cannot be
bumped without wiping every save.

So the rule is per save:

- `CareerState` gets an optional field `balancedFixtures?: true`, beside `uclField` in the
  optional block, documented the way the neighbours are.
- `roundPairs(clubs, round, balanced: boolean)`: `balanced` true applies section 2; false
  applies the old parity, byte for byte the output the function gave before this round.
- Every caller passes `!!state.balancedFixtures`.
- `startCareer` sets `balancedFixtures: true` on every new career (real club, custom club,
  historic era alike).
- `startNextSeason` sets `balancedFixtures: true` on the new season's state whether or not the
  old one had it, so every save converges at its next rollover and no season is disturbed.
- A save with the field absent keeps the old venues for the season it is in. Nothing migrates
  it mid season, on purpose.
- `roundPairs` is exported, so the fence can call it directly.

## 4. The fence: `scripts/simFixtureBalance.mjs`

Bundled the way the sibling harnesses are (esbuild with `--alias:@=<root>/src`, a temp entry
that stubs `localStorage`; write the entry and bundle under `os.tmpdir()` with a name that
carries the process id, so two runs never share a file). Sections, each printing what it
measured:

1. **The balanced rule over every league size the game plays.** For each distinct club count
   across `REAL_LEAGUES` and every historic era's leagues (read them off the engine's exports,
   never from a list typed here), plus 13 and 15 for the odd path: over a whole season
   (`leagueRounds(n)` rounds, both halves), every club plays exactly once per round (or sits
   out exactly once per round in an odd league), meets every other club once at home and once
   away, has home equal to away, and has a longest same venue run of at most 2, counted over
   rounds with a bye ending the run (section 2). Report the sizes checked and the worst run seen.
2. **The old rule is untouched.** The harness carries a verbatim copy of the pre 617
   `roundPairs` (the old parity) as its oracle, and `roundPairs(clubs, r, false)` must equal
   the oracle's output for every round and every size in section 1. This is what protects a
   save mid season.
3. **Through the engine.** `startCareer` for a club in each league size sets
   `balancedFixtures` true, and the venues `fixtureFor` answers for my club over the whole
   calendar's league entries match the balanced schedule (longest run at most 2, home equal to
   away). The same state with the field deleted answers the old pattern (longest run equal to
   the oracle's for that slot). `startNextSeason` on a save without the field returns one with
   it set.
4. **The AI world plays the same list.** After a fresh career's first few rounds (drive with
   `playNextEntry` and `skipHalftime`), replay `roundPairs(lg.clubs, r, true)` for every world
   league over the rounds it has played and check no club sits at one venue three rounds
   running; where a league keeps a pair ledger (the tiebreak leagues), its ordered pairs must be
   exactly the replayed balanced pairs, which ties the results the world really wrote to the
   list. The ledger alone cannot answer a venue run, it holds no round order.
5. **Words match code.** The comment stripped source of `roundPairs` swaps on the round's
   parity alone in the balanced branch and on `(r + i)` in the legacy branch, all four callers
   pass the flag, `startCareer` and `startNextSeason` set it, the file carries no dash, and no
   other file under `src` carries its own copy of the circle method's venue swap (the calendar
   card had one, written when `roundPairs` was private; it reads the export now).

Negative controls (house rule: prove the checks can fail), each refusing to run if its rewrite
finds no text, each printing which sections it expects red:

- `FIXTURE_CONTROL=oldparity` bundles a copy whose balanced branch swaps on `(r + i)`.
  Sections 1, 3 and 4 must go red.
- `FIXTURE_CONTROL=noflag` bundles a copy whose `startCareer` does not set the field.
  Section 3 must go red.
- `FIXTURE_CONTROL=flipold` bundles a copy whose legacy branch swaps on the round alone.
  Section 2 must go red (and 3's flagless check).

Nothing in the fence asserts a max of a noisy quantity: the schedule is deterministic, so "at
most 2" is a structural fact, not a statistic.

## 5. Gates before the round ships

- `node_modules/.bin/tsc --noEmit -p tsconfig.app.json` at zero, `npm run build` at zero.
- The fence plain and under all three controls, output read, not the exit code alone.
- `simClubManagerFinances` re-measured over SIM_SEED 0 to 4 with a private TEMP per run
  (its header asks for this after 617): if the p90s come down, tighten the bands by the same
  recipe the header states and record the new measurement there; if not, say so in the header.
- Every harness that reads a Club Manager fixture, venue or league round: grep `scripts/` for
  `fixtureFor`, `roundPairs`, `leagueClubs` and `homeGames`, run what the grep finds, and the
  Club Manager era harnesses (`simClubManagerEraMidSeason`, `simClubManagerEraUcl`) in a tree
  with full modules (they import by absolute path).
- `simNoRivalNames`, `simNoInventedQuotes`.
- The full `runAllSims` on the frozen tree before the merge to main, from the full clone.
- An adversarial review of the diff before the commit is called final.

## 6. Records

`docs/PROJECT-STATE.md` gets the LIVE section with the deployment, the proof (a Club Manager
chunk on the live site carries the field name), and the finance re-measurement.
`docs/WORKBOARD.md` moves 617 to LIVE in the 610 block. `simClubManagerFinances`' header
gets its post 617 numbers.
