# Round 1502: the world's Champions League bound into Club Manager's season (dark)

Builder's round notes, kept with the branch r1502-cm-ucl-binding (base d8aaa4cb, release-bi-gate after part one).
The full account, with every runner result, is results-g/finish-1502.md in the lead's kit.

## What the round does
Every season a Club Manager save is NOT in the Champions League, that season's competition is opened at the draw
into one saved slice (CareerState.worldComps.ucl: the entrants, a strength snapshot, a seed and, for the league
phase, the 1228 slate) and evaluated against the week, never stepped. The eras play their eight groups of four
(their verified 32, with a named stand in for my club when it is one of them), today's world plays the 36 club
league phase off the real tables. Nothing shows it yet: Round 1503 builds the screen.

## Steps, each its own pushed commit
- E2 (Round 1347's, by the lead's ruling on the weight): the optional `rand` of poisson and simScore, `size` and
  `exclude` on uclFieldFromTables, uclDirectQualifiersFromTables and seasonOneUclField, uclFinalTables lifted out of
  uclQualifiersFrom, clubManager.ts's groupFixtures deleted for worldCompetition.ts's, advanceUclBracket's AI tie
  one settleTie call (TieRules.extraTime, optional). Bridged in the same commit: simExtraTime (its AI edits now edit
  the call's rules), simSeasonLaw (poisson's rand), simUclSeasonOne (its holders control).
- E3: startCareer's last step opens the slice (openWorldUclOnStart, after the seed, in a try and catch); the binding
  block beside initUclWorld (format, field, open, bind, nights, nights done, evaluation, winner); both dailies strip
  the key; simDailyDeals controls world and worlddeadline; the seed inverse (scripts/lib/cmWorldSeed1250.mjs)
  accepts the open line before either last line, Round 1344's included.
- E4: startNextSeason opens or deletes (never keeps the spread's slice), joinClubNow decides the slice on the joined
  season (carryWorldUcl, with `seen`), worldUclNightDates in clubManagerCalendar.ts; the kits' bridges
  (simManagerWorldContinuity, simCmUnseededWorld).
- E6: loadCareer's repairWorldUcl, narrowly (season one of today's world, any season of an era), after every
  registration, before ensureBoardAsks, in its own try and catch.
- E5 (LAST, held out of a release until the screen ships): uclHolderOf, the watched winner as next season's holder.

## Named hunks (for the release join)
src/lib/clubManager.ts: the import block (one import of worldCompetition.ts and one of uclLeaguePhase.ts);
CareerState.worldComps beside uclField; uclQualifiersFrom and the new uclFinalTables; uclFieldFromTables and
uclDirectQualifiersFromTables (size, exclude) and the new excludedClubs; seasonOneUclField (size, exclude);
advanceUclBracket's AI tie (one settleTie call); groupFixtures (deleted, a comment in its place); the binding block
after it (worldUclFormatOf to worldUclWinner, carryWorldUcl, repairWorldUcl); poisson and simScore (rand);
startCareer (one line before the return); startNextSeason (two lines after nextUclField, a try block after
initUclWorld); loadCareer (one call before the board asks); from E5 uclHolderOf after uclQualifiersFrom.
src/lib/clubManagerCalendar.ts: the import block (carryWorldUcl, worldUclNights), worldUclNightDates before
kickoffOf, one call before joinClubNow's return. src/lib/worldCompetition.ts: the header, TieRules.extraTime,
WorldCompSlice.seen, settleTie's two extra time guards, the two RECORDED DEBT comments made true.
src/lib/managerHotSeat.ts and src/lib/deadlineDay.ts: one strip each after the world seed's (Round 1344 adds its
ledger strip at the same place: keep both).
scripts: simDailyDeals.mjs (two STRIPS, two controls, one check, BASELINE untouched), cmWorldSeed1250.mjs (the
agreed AFTER shape), simExtraTime.mjs, simSeasonLaw.mjs, simUclSeasonOne.mjs, simManagerWorldContinuity.mjs,
simCmUnseededWorld.mjs, simWorldUcl.mjs (sections 1 to 7), NEW lib/worldUclFleet.mjs, NEW proofWorldUclFleet.mjs
(round time, not in the suite); from E5 NEW lib/worldUclHolder1502.mjs, simWorldEditor.mjs, simUclField.mjs.

## Judgment calls
- The watched sim calls simScore(strH, strA, 0.2, -0.08, scale, rand) itself rather than through a shared
  simAiScore (advice 27 not taken): simAiMatch's line is anchored byte for byte by recordWorldTieGolden1347.mjs and
  simSeasonLaw.mjs, and changing it would move both. Owed: one named pair of home and away edges.
- `exclude` takes one name or a list: a created club's replaced club is kept out of the watched field with my club.
- The eras' round of 16 is the participant's own draw (drawUclRoundOf16, group and association rule); row G4-early
  is still to verify and G5's knockout rows are not two sourced, so the watched round of 16 applies no Russia and
  Ukraine ban, exactly as the participant's does not (owed to a data round, said by the screen's ? in 1503).
- A mid season move that cannot carry a slice opens a fresh one only where the field is fixed data; a move to a
  club that is an entrant of the watched competition drops it (counted in simWorldUcl section 3).
- The dates: a night on a calendar week takes that week's date; a league phase night after a league round is that
  round's Wednesday (date plus four); past the last round, a week at a time.

## Owed (not this round)
The screen, the Cups panel, help, What's New and the reference page (1503); the guide sentence that you can follow
the Champions League from outside it (the other lane's guide); the Ballon d'Or reading the watched winner; the
participant in the league phase; the eras' second publishers (ERA_UCL_FIELDS, G4-early, G5 knockout rows).
