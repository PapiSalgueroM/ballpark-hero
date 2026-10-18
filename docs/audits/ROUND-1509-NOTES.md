# Round 1509 notes: the Europa League followed every season beside the Champions League

Branch r1509-cm-europa-watch, base origin/main 77556430 (Release BJ). Brief:
dukb-handoff/2026-10-10/briefs/brief-1509.md. Kept at every push; the builder's scratch notes live in .tmp-fx.

## The steps and their commits

1. The ledger (dark), 65ad85c9: scripts/data/cmEuroAccess.json (39 rows) and its receipt, euroAccess.ts's
   constants and EURO_ACCESS_PARTIAL, simWorldEuro section 0 with the controls onesource, wiki, thinused, receipt.
2. The keyed lift, 50247294: every function of Round 1502's binding block keyed by competition, each exported
   worldUcl* name a one line wrapper passing 'ucl', the seed `world-${comp}|`, one object with two keys written by
   setWorldComp, the view and the night dates keyed. Names for Round 1510: worldCompField, openWorldComp,
   worldCompBind (private), worldCompNights, worldCompNightsDone, evalWorldComp, carryWorldComp,
   repairWorldComp, worldCompWinnerOf(career, comp), worldCompFormatOf, worldCompNightDates (calendar),
   worldCompView (view); uelHolderOf(career) is worldCompWinnerOf's one line reader.
3. The rule, pure, 85414f0b: euroFieldFromTables and euroRouteOf over plain finishing orders, unit tested.
4. The watched Europa League, 75f92025 and fixes c2a49314, 769e2ac8, c5af5e04: opened at a new career's start (in
   openWorldUclOnStart's body, participants included), at every rollover (one block after the watched Champions
   League), carried across a job move (both keys, seen per key), repaired at load in season one; worldUelField
   (the rule over the finished tables, or over the real 2025-26 tables, cup winners and Conference League winner in
   season one), `via` and `earned` on the slice; the Europa League's legs from row U-legs; its nights on the six
   European midweeks and the Champions League's first ten marks with its final at 0.95; dated the Thursday.
5. The screen, b0236c4c: a third tile on the Cups panel, the competition screen by key, its ?, how each club got
   in, the place my club earned; the help block; What's New; the walk's cases (u) and (v) and the controls
   notileuel and wednesday.
6. (a) The board, 39978122: euroPlaceOf and europeRungOf, objectiveStatuses' league branch (an era save keeps its
   position grade), simWorldEuro section 3. (b) The winner, a06f9e18: uelHolderOf into next season's Champions
   League (the participant's field and the watched one), scripts/lib/worldUelHolder1509.mjs, simWorldEuro
   section 5.

## Decisions taken by the builder

- The watched Champions League's fill takes the fifth placed club of the four deepest leagues every season unless
  it is my club, so in those leagues the Europa League's league place passes from fifth to sixth. euroPlaceOf at a
  season's end therefore reads the same Champions League the rollover will draw (my club kept out, the holders in),
  so that it agrees with the rule run without the exclusion (section 3 holds it); mid season it reads my league's
  places and the cup final only, as ruling 1e says.
- A mid season move to a club that is an entrant of the Europa League draws it again without that club in season
  one and leaves none later (Round 1502's rule per key); the nights shown before the move then read differently,
  and the screen says so.
- setWorldComp: taking the Champions League's key off deletes the object first and puts back what is left, so the
  object stands where the engine always put it among the save's keys (the fleet proof is byte equal on that).
- The participant's 32 field takes the league places, the holders and the Europa League winner and is cut to 32,
  so in a season when both holders come from outside the league places the Europa League winner does not fit
  there (section 5 counts it); the watched 36 always has room.
- simCmShootoutOrder hashes a match's state without worldComps (participants now carry worldComps.uel).

## Measured (runner results named in the builder's closing report)

- Step 2: fleet proof against 65ad85c9 byte equal on every step (190 journeys); weight +0.2K on the three rows.
- Step 4: fleet proof against 85414f0b byte equal but for worldComps.uel (60 and 130 journeys, draws equal);
  weight /club-manager 620.0K (+1.6K over BJ's 618.4K), /manager-hot-seat 637.1K (+1.6K), /deadline-day 646.6K
  (+1.6K), inside the lead's +3.0K; the save at season 15 +1,461 (Real Madrid), +1,417 (Everton), +1,494
  (Lincoln City) bytes over 85414f0b, slopes unchanged, under SIZE_BUDGET 214,000.
- Season one of a Chelsea career: the English clubs in the Europa League are Bournemouth (league place, Liverpool
  fifth being in the Champions League on its fill), Sunderland (the FA Cup's place passed down, Manchester City in
  the Champions League), Crystal Palace (the Conference League's winners) and Brighton (the fill).

## Owed

- To the other lane (src/data/gameContent is theirs): one sentence for clubManagement.ts, for example "The Europa
  League plays out every season too, and you can follow its table, matchdays, knockouts and final from the Cups
  panel; win your cup and the board counts it.", then their genSearchKeywords.
- To the lead: the three engine weight rows (sweepWeight is red over 619, 636 and 646 by about 1.6K each, inside
  the accepted +3.0K); scripts/data/cmLeagueRulesDigest.json moves by the new key (named, not retaken); the saved
  What's New page; the participant's own Europa League nights (a later number).
