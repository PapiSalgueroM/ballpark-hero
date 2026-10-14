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
  2023 corroboration (leedsunited.com: five from nine named). Since the closing check it also has a fact dated
  2026-27 itself on two hosts: the Championship game Cardiff City 5-1 Watford of 13 October 2026, where Watford
  made five changes (Sky Sports' report; ESPN's commentary lists five for each side, each side's five in three
  stoppages). The three stoppage limit has no dated 2026-27 statement: it is the EFL's own rule from 2022-23 (Law 3
  as it stands mandates it only for top divisions), nothing found reverses it, and the ledger's caveat says so.
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
- OWED, extra time: under five the other dugout uses its three stoppages by 88 in nearly every match, so the
  extra time draw returns before drawing anything and they make no change in extra time at all (r1331-et, 10,000
  seeds of one Arsenal knockout night: 3.97 changes a night, 0.00 of them in extra time, on 1,636 nights; on the
  base rules 2.77 and 0.79 on 1,511). Decision 1(b) ("breaks free" in drawOppSubs) and decision 2 ("unused changes
  carry on") both ask for them. 52d787d5 put them on at the break before extra time (minute 90, as mine go on, the
  count drawn as before, a redraw from 90 keeping them), with simCmSubs section extratime (1.06, 0.98 and 0.99 a
  night at three seed bases, ET_MIN 0.5, control etfrozen 0.00; r1331-et2) and the digest unmoved. It was backed
  out in cb722d78: the live viewer fires a change at 90 as the extra time stage opens, and its "Sub:" banner takes
  the place of the "Level 3-3 on aggregate" banner (liveSimMotion "the extra time banner says what is true", red
  in r1331-et2b). The viewer is F3's (this round owns four lines of LiveSimScreen.tsx), so the engine hunk waits in
  52d787d5 for a round that also lets the extra time banner keep its time. The other dugout never changes at half
  time either, under any rule (it never did). CLOSED by the closing check: see "Closing check (fix2)" below.
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
  no stoppage mark, so they count as none): the fix, as the brief rules. Said whole (review minor 7, r1331-run-s2):
  its stoppages start from none as well, so its two remaining changes can each open a stoppage of their own on top of
  the ones its old changes already took, up to five stoppages in play in that one match (a base save with changes at 46, 60 and 70 resumed with three stoppages left and ended
  with stoppages in play at 60, 70, 75 and 80). Only a match in flight on release day can do it; counting an old
  line as a stoppage was not done, because a line without the mark could also be a break change and the engine
  cannot tell which (the reason the mark exists).

## Proof (see the closing report for every runner result)

- simCmSubs: ledger, rule, opponent, coach, press, and with SUBS_BASE the legacy (40 careers byte and draw equal),
  three (20) and hotseat (30 dailies and an unstamped free run) sections, every control fired.
- Westerlo, the 2026-10-12 daily: still asks "Cercle Brugge on paper are a level above you"; a stamped free run on
  its seed asks "Gent on paper are a level above you" (engine and built page, also after a reload).
- Question kinds over the press fleet, head against base: bigGame 8 and 3, derby 3 and 4, dropped 29 and 39, bid 12
  and 10, slump 10 and 7, request 13 and 13, roll 3 and 3, boardHeat 2 and 0.
- simDailyDeals: every date before the cutover deals what it did; the five from it on were recorded again from this
  tree (a5541fe8); rulesall and rulesstale fire.
- The real fixture fleets against the base dec9075b with the head forced onto the old rules (the two matchRules
  reads answering 'base', a runner only patch): simCmFixtureFleet green (nofetch 250 careers, oldsaves 132 saves,
  dailies 11 clubs) and simCmRealFixtures green (premier, 13 groups with legacy, baseline and uncopied), r1331-fx.
  So outside the rule and the press the round moved nothing they hold.
- Save size, season 15, head against base: Real Madrid 194,168 and 188,570, Everton 199,501 and 197,256, Lincoln City
  199,637 and 200,686 (budget 203,000); slots 510,827 and 509,335 of 532,500.

## Bridges for kits pinned to old engines (one edit each, controls still fire)

- simCmShootoutOrder (pre-1072 arms), simCmUnseededWorld (b6eb78e7) and simManagerWorldContinuity (b6eb78e7): the arm
  that stands for the old engine plays `matchRules: 'base'` and the key comes off before any compare.
- simCmQuickSubs and simCmQuickLegs hold the three change coach of Rounds 1072 and 1146: their careers play the base
  rules; the coach under five is simCmSubs section coach.
- src/test/clubManagerVarScreen.test.tsx (a13b90e9): its case hints were found on the old stream, and two of them
  (league match 2, hint 2287; extra time 'awarded', hint 1927) held no case in 2,500 seeds on the new rules
  (r1331-vt: head red, head forced onto the old rules green, base green). Its two careers play the base rules. A
  probe (r1331-vt2, r1331-et) showed the rule moves nothing the review screen reads: the first halves of match 2
  hold 149 and 38 reviews (disallowed, awarded) on the new rules and 150 and 39 on the old; the extra time split
  differs only because the 34 step walk meets a different knockout opponent on each rule and the penalty reviews
  are keyed by match, minute and man.

## The fence on league ids, the digest and the 1081 pin (the round's last three commits)

- simCmLeagueRules section 3d (Round 832: no league id branched on, and no map keyed by league id, outside the
  LEAGUE_RULES rows) named the five change table six times while it was an object keyed by league id. It is now a
  list of [league id, first season] tuples (73c5422d), the shape decision 8 of the brief asks for; the fence reads 0
  findings and its own control idbranch still fires (r1331-dig2). The fence was not edited.
- scripts/data/cmLeagueRulesDigest.json was retaken in its own commit (b16b3488), by its legs: the base commit's src
  reproduces the committed digest (r1331-dig rules-base: 0 differ in modern 27, eras 20, pure 48); the head with both
  matchRules reads forced to the base rules reproduces it too (r1331-dig2 rules-old, exit 0); the head on its own
  rules differs in 27 modern and 16 era entries and 0 pure ones (r1331-dig rules-head; the press fix moves every
  era, the rule moves the five change seasons); then the write (r1331-dig2 write-digest, exit 0).
- The Round 1081 pin (scripts/fixtures/managerAppealIsolation1081/manifest.json, unchangedSource for
  src/lib/clubManager.ts, the LF text sha256) went from 22833be3 to 36f255cf in its own commit (a72d76bc), last.
  clubManager.ts has not changed since (the extra time hunk was backed out to the same text, checked by hash).

## Red on the base too, not this round's

simCmUnseededWorld (112 failures, Round 1326's words, the same first line on base and head), simManagerWorldContinuity
(inactive and constructors on Round 1326's "Win the La Liga"), simManagerMatchPlans (its persistence control's
anchor `note(saveCareer(career));` is not in useClubManager.ts on base either).

## Review fixes (2026-10-14, after the RUN and READ reviews of 4713018e)

- Held by simCmSubs now, each with a control that fires (r1331-fx1): the bigGame edge against the fixture the
  question names (press; control pressedge, 13 of 26 untrue; head 0 of 74 untrue over 24 edge seeds, closest -6.01),
  the break before extra time free for my changes (section extratime, the Arsenal knockout walk, 12 nights: 12 taken
  at 90, 12 refused at 95; control etbreak), the season read as the start year (rule: a 2020 era Premier League
  career plays three in 2021-22 and five in 2022-23; control yearplus), a change at 45+1 uses a stoppage (rule;
  control ht45), the cutover day itself on the current rules (section cutover; control cutover).
- The opponent band was a coin toss at 3 seeds (gap 1.38 at seed base 9000): 8 seeds, OPP_GAP 1.3 from four bases.
- Copy: the live sheet's stops phrase no longer wraps mid phrase; the help and What's New say "for good from
  2022-23"; SubsRule.stops and changeLive's doc say what the engine does; the ledger's law lines cite Law 3 as it
  stands and IFAB circular 20 for what they claim.
- OWED TO THE LEAD, not on this branch: the older help line at ClubManagerHelp.tsx 48 and the guide
  src/data/gameContent/clubManagement.ts 121 and 122 still say three. See
  C:/Users/antho/dukb-handoff/2026-10-10/results-g/fix-1331.md and fix2-1331.md.
- Closing check (fix2): the extra time gap of the other dugout (the OWED item above) is CLOSED on this branch: the
  side branch r1331-et-opp (51566ac8 engine hunk and simCmSubs section oppextratime with control etfrozen,
  e0527b07 the one viewer hunk in LiveSimScreen.tsx, f5788892 the 1081 pin) was fast forwarded in, because
  decisions 1(b) and 2 ask for the behaviour and the viewer hunk is its smallest consequence. That hunk is three
  lines of F3's file beyond the two counters: a change at the break before extra time is told on the line under
  the pitch, so the extra time banner keeps its place (my own changes made at that break included).
- Engine note found while sourcing: the 2020 amendment freed the two extra time breaks only where a competition
  allowed an extra change in extra time (circular 20); the engine frees the break before extra time in every five
  change season, 2020-21 and 2021-22 included. Law 3 frees it from 2022-23. Not changed (the extra change in extra
  time is owed by decision 1).
