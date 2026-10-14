# Round 1331 notes: five changes in three stoppages, the other dugout, the coach, the press fixture

Branch r1331-cm-engine-fixes, started from origin/main dec9075b (the Release BC record) on 2026-10-13, merged with
origin/main 082fc277 (docs only) at 12f3fd65. Every gate ran on a GitHub runner (remote checks named r1331-*).

## The rule and its sources

- `scripts/data/cmSubsRuleSources.json`: every law line and league fact with two sources on two hosts, the date
  read (2026-10-13) and the line quoted. `scripts/simCmSubs.mjs` section ledger holds the module to it.
- `src/lib/clubManagerSubsRule.ts`: `subsRuleFor(leagueBaseId, seasonStartYear)`, pure, no imports. Five changes in
  three stoppages: La Liga, Serie A, Bundesliga, Ligue 1 from 2020-21; the Premier League and the EFL Championship
  from 2022-23 (England stayed at three in 2020-21 and 2021-22). Three, no limit, before.
- Partial (`CM_SUBS_PARTIAL`, keeps three, the guide says so): every other league of the game, MLS's two
  conferences included (21 ids). Nothing was found in the round's time that two sources their 2026-27 rule.
- The Championship row rests on the EFL's 2022-23 rule (Irish Examiner 10 June 2022, ESPN 4 August 2022) with a
  2023 corroboration (leedsunited.com: five from nine named). No source dated 2026-27 itself was found and none
  that reverses it: the ledger's caveat says so. The lead may want one more line dated 2026-27.
- Not covered on purpose: no Champions League row (cups and European ties follow the career league's row); nation
  jobs are not played live and keep three; the 2019-20 restart plays three (a season goes by its start year);
  extra time's own half time is not a moment the engine has (its thirty minutes are one stretch), so a change at
  105 counts as a stoppage; no extra change in extra time (owed, decision 1 NOT).

## The engine

- `matchRuleOf(career)`: 'base' (Hot Seat) answers three with no limit, else `subsRuleFor` of the career league's
  base id (era suffix off) and `worldYear`. `isBreakChange`: any change before the second half is drawn (the
  dressing room records it at 46), and the minute extra time is drawn from with no board. `SubLine.stop?: true`
  marks my changes made in play under a stoppage limit (never written under three, so a three change match saves
  what it always did); `stopsUsed` counts distinct minute and board pairs of them.
- `changeLive` refuses past the rule's changes, or a change in play that opens a fourth stoppage; a second change
  at a stoppage already used is taken.
- `drawOppSubs(…, rule)`: room `rule.subs - made`, count `ri(rule.subs - 2, rule.subs)` (ri(1, 3) under three, the
  stream unchanged), and under a stoppage limit the changes go on at most the stoppages left (no new draw).
- The coach: under three line for line; under five two at the break, up to two at each look, a change and a
  stoppage kept back for an injury. Measured means a match (r1331-s3c): five 2.83, the same careers on the base
  rules 1.89, the three change eras 1.62. The other dugout: 3.43 under five, 1.61 on the base rules.
- The press: `nextFixtureFrom`, `matchEdge(career, fixture?)`, `buildPressQuestion` and `maybeAskPress` take an
  optional week; the call at the whistle reads the week after the match just played (the base rules keep the old
  read). The derby question had the same bug and is fixed by the same read. Every other press engine (foGmPress,
  usCareerPress, soccerCareerPress) reads no upcoming fixture, so none has this bug.
- Manager Hot Seat: `HOT_SEAT_RULES_FROM = '2026-10-24'`; `rulesOf(setup)`; a daily before it and an unstamped free
  run play `matchRules: 'base'`; new free runs are stamped `rules: 1331` and the free save carries it;
  `handoverState` and `loadCareer` take the key off. Deadline Day plays no match (simDailyDeals and simDeadlineDay
  unchanged prove it).
- A 2026-27 match paused by an older build at three changes may make two more after the update (old sub lines carry
  no stoppage mark, so they count as none): the fix, as the brief rules.

## Proof (see the closing report for every runner result)

- simCmSubs: ledger, rule, opponent, coach, press, and with SUBS_BASE the legacy (40 careers byte and draw equal),
  three (20) and hotseat (30 dailies and an unstamped free run) sections, every control fired.
- Westerlo, the 2026-10-12 daily: still asks "Cercle Brugge on paper are a level above you"; a stamped free run on
  its seed asks "Gent on paper are a level above you" (engine and built page, also after a reload).
- Question kinds over the press fleet, head against base: bigGame 8 and 3, derby 3 and 4, dropped 29 and 39, bid 12
  and 10, slump 10 and 7, request 13 and 13, roll 3 and 3, boardHeat 2 and 0.
- simDailyDeals: every date before the cutover deals what it did; the five from it on were recorded again from this
  tree (a5541fe8); rulesall and rulesstale fire.
- Save size, season 15, head against base: Real Madrid 194,168 and 188,570, Everton 199,501 and 197,256, Lincoln City
  199,637 and 200,686 (budget 203,000); slots 510,827 and 509,335 of 532,500.

## Bridges for kits pinned to old engines (one edit each, controls still fire)

- simCmShootoutOrder (pre-1072 arms), simCmUnseededWorld (b6eb78e7) and simManagerWorldContinuity (b6eb78e7): the arm
  that stands for the old engine plays `matchRules: 'base'` and the key comes off before any compare.
- simCmQuickSubs and simCmQuickLegs hold the three change coach of Rounds 1072 and 1146: their careers play the base
  rules; the coach under five is simCmSubs section coach.

## Red on the base too, not this round's

simCmUnseededWorld (112 failures, Round 1326's words, the same first line on base and head), simManagerWorldContinuity
(inactive and constructors on Round 1326's "Win the La Liga"), simManagerMatchPlans (its persistence control's
anchor `note(saveCareer(career));` is not in useClubManager.ts on base either).
