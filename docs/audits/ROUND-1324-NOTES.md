# Round 1324 notes: the shared event deck core (W1a)

Branch r1324-deck-core, base origin/main 8fea14e2. Brief: C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1324.md.
Files this round owns: src/lib/gmInbox.ts, src/lib/gmInbox.test.ts, scripts/simGmInbox.mjs, scripts/simEventDeck.mjs
(new), scripts/data/gmInboxReplay.json (new, recorded from the base), this file.

## Step (a): the kit's section 1 and the recorder, on the unchanged engine

- `scripts/simEventDeck.mjs` drives the seven GM packs at seeds 1, 2 and 3 over four drives (FLEET 100 desks, SILENT,
  STUBBORN and FALLEN 20 each, ten seasons a desk) and holds them byte equal to `scripts/data/gmInboxReplay.json`.
- The recording was made on this PC from the base engine with
  `SIM_EVENT_DECK_RECORD=8fea14e2 node scripts/simEventDeck.mjs`, which refuses unless
  `git diff --quiet <sha> -- src/lib/gmInbox.ts src/lib/careerInbox.ts src/lib/keyedRng.ts src/data/gmInbox` exits 0.
  Recorded: 84 rows, 72,509 events dealt, 267,577 deck draws, 296 repeat ids suffixed on FALLEN desks, base 8fea14e2,
  gmInbox.ts blob 0055dbd1, frozen drive hash baf7540a6deb, 63,093 bytes (per desk hashes kept for every drive).
- FALLEN desks keep the year still as well as handing in the week of the season, because with the year moving the id
  suffix can never run (an id carries the year). The kit fails the whole run if the suffix never ran.
- The drive is the code between the two FROZEN DRIVE markers; its hash is in the recording, so any change to the drive
  reads as a re-record, which is the lead's call.
- Runtime of the whole replay: 35.7 to 44.6 s on this PC, so no shard is needed; `SIM_EVENT_DECK_SHARD=<seat>` exists
  anyway for a quick look at one seat.

## Facts recorded for the lead

- No seat binds gmInbox (decision 2): the importers on the base are listed below, and none is a page, a hook or a
  daily. A GM pack round today would ship cards no one can meet; a GM seat bind (the NFL desk first) is the candidate
  after W1b.
- `git grep -l "lib/gmInbox\|gmInbox'\|GmInboxPanel\|data/gmInbox" -- src scripts` on the base lists only:
  src/lib/gmInbox.test.ts, the seven packs and their index under src/data/gmInbox (a type import),
  src/components/front-office-shared/GmInboxPanel.tsx and GmInboxPanel.test.tsx (the panel is imported by its test
  alone), scripts/simGmInbox.mjs and scripts/simCareerInbox.mjs (its single home rule names gmInbox.ts). No daily,
  no page, no hook: Hot Seat, Deadline Day, the Career Ladder and every dated puzzle cannot move.

### Step (a) proof on a runner (rc r1324-a, head 604d2887)

- `deck: node scripts/simEventDeck.mjs` exit 0 in 23 s, closing line `simEventDeck: green.`: all 84 rows byte equal
  on Linux to the recording made on this Windows PC, so the recording is platform independent.
- `deck-replay: EVENT_DECK_CONTROL=replay node scripts/simEventDeck.mjs` exit 1, closing line `simEventDeck: 1 failure,
  red sections 1 (CONTROL=replay fired)`: 84 of 84 rows moved (nfl|3|FLEET: deck draws 11,463 not 8,592).
- simHarnessAnchors exit 0 (green), simNoRivalNames exit 0 (0 findings).

## Step (b): weight, story, the subject rest and the pack validator

- `weight` (3.3.1): `gmTake` keeps the uniform line verbatim for equal weights (all absent, or all one number) and
  otherwise lands one draw on the running sum. One draw a pick either way.
- `story` (3.3.2): the book key is careerEventDeck's `ledgerKey` (imported; careerEventDeck.ts untouched). A one shot
  with a story is used once for the story AND waits out the story's stamp (the brief's "no two cards of one story
  inside the story's cooldown"; a plain one shot still ignores cooldowns, line 225 kept verbatim). After a pick every
  other card of the story leaves the week's draw.
- `subject` and `subjectRest` (3.3.3): keys `role:<target>` and `id:<value>`; a fact subject with no usable value
  (missing, boolean, empty string, not finite) holds the card back. The rest book `gmInboxRest` is written only by a
  pack whose subjectRest is above 0, only once such a card is dealt, and is rebased and pruned at the top of every week.
  With subjectRest 0 the subjects are inert (no hold, no sibling removal, no book). `repairGmInbox` drops a bad book
  alone (the field is deleted, so a desk reads as never having had one).
- `gmPackProblems` (3.3.8) lists every problem (bad weight, empty story, a role subject not in targets, an undeclared
  fact subject, a subjectRest that is not a whole number); `bindGmInbox` throws on the first, after its existing
  effect check. `gmNeutralIndex` is in this step too, for (d).
- Measured (kit, seeds 1 to 10): FX_WEIGHT light share 0.2385 to 0.2636 (mean 0.2478), band 0.23 to 0.272, the
  weightoff control 0.4983; FX_STORY loose cards deal 1.756 to 1.767 times as many, floor 1.5, the story control
  1.00 with 8,151 story breaks; FX_SUBJECT 13,343 subject cards, book never above 5 entries, the rest control 26,968
  breaks.
- Engine size: 17,298 bytes LF (17,663 CRLF, the brief's measure) before; 23,124 LF (23,603 CRLF) after (b).

### Step (b) proof on a runner (rc r1324-b, head aa199fc1)

- tsc exit 0 (97 s); vitest of gmInbox.test.ts and GmInboxPanel.test.tsx exit 0, 2 files, 35 tests passed.
- simEventDeck exit 0 (48.2 s), `simEventDeck: green.`; controls: replay exit 1 (red sections 1, 3; section 3's equal
  weight rows are compared with the recording too), weightoff exit 1 (red section 3), story exit 1 (red section 4), rest
  exit 1 (red section 5). Every control's closing line says it fired; none aborted.
- simGmInbox at SEED 1, 2 and 3 on the head printed every line the same as on the base 8fea14e2 (`gmcmp`, a worktree
  of the base on the runner, `diff` of the whole output), each `simGmInbox: green.`; its twelve controls each exit 1
  with a closing failure line (quote 3, flip 2, cool 8, drift 1, never 1, random 1, shift 1, opencap 1, maxcap 3,
  oneshot 2, ungate 1, unclamp 1 failures).
- simCareerInbox exit 0, its privatecap control exit 1; simHarnessAnchors, simNoRivalNames, simNoInventedQuotes,
  simNoInventedConduct and simInventedNames exit 0.

## Step (c): keyOf, texts and the season clock

- `keyOf` (3.3.4) is an optional field of the binding, passed to the seat as is; absent reads as ''.
- `texts` (3.3.5): wording 0 is `text`, `texts` add 1 to n; the pick is one value of `keyedRng` on
  `<save key>|<card id>|<year>|<clock>` times (1 + n), floored, so the deck's rng is never touched. The picked words
  are saved whole in `text` (today's shape, immune to a later edit of a variant list, advice 26). gmInbox imports
  keyedRng directly; careerInbox already imports it, so the module graph gains nothing by it, and the only new module
  in gmInbox's graph is careerEventDeck.ts (decision 6).
- `clock: 'season'` (3.3.7): the cooldown test is careerEventDeck's `onCooldown(last, card, season, pack.cooldown)`
  (held while season minus last is at most the cooldown); the week clock keeps gmInbox's own comparison, so the two
  clocks differ by one on purpose. Everything else counts in the pack's own ticks; `perWeek` means per tick (its
  comment says so).
- gmPackProblems also names an empty wording and a clock that is neither week nor season.
- simGmInbox section 1 scans every wording like a text (quote marks, first person, placeholders, real names, conduct)
  and fails any wording, text included, that prints a meter word next to a signed number. New controls
  `quotevariant` (the brief's) and `effectvariant` (added so the effect check has a control of its own). The string
  floor is unchanged: no GM pack has wordings, so the count stays 389.
- Measured (kit, seeds 1 to 10): FX_TEXTS wording ratios to an even share 0.915 to 1.053, band 0.865 to 1.1;
  with and without wordings the same 15,517 deals and 60,001 deck draws at seed 1; another key reads other words on
  6,483 weeks of the same deal. FX_SEASON: 3,336 of 12,000 cards held out, zero disagreements with onCooldown.
  Controls on this PC (shard afl): textrng red section 6, seasonweek red section 9 (864 disagreements).

## Step (d): expiry and the neutral rule

- `expires` (3.3.6): a message of such a card carries `w` (the tick it arrived) and, once settled, `auto: true`; no
  other message gains either field (kit section 2 checks every GM desk state). At step (2) of the week, after both
  books are rebased, an open message whose def still exists and still expires, with `clock - w >= expires`, is
  replaced (never written into) by a copy answered on its neutral option with `auto` set. Nothing moves: it does not go
  through the answer flow. It counts as answered from step (3), so its slot is free the same week and the kept cap
  drops it first. A message whose def is gone or lost its expiry stays open; a `w` from the future is rebased.
- Judgement call: the neutral index is read off the message's own saved choices, not the def's, because `answered`
  indexes the saved choices; on a deal they are the same array, and if a later pack edit removed the neutral option
  the message stays open (fail closed) instead of landing on a wrong option.
- `gmExpiredLine(msg, pack)` returns `📨 <voice>: your assistant dealt with it (<neutral label>).` read off the saved
  message (so a later pack edit never rewrites a line already on a desk); `pack` is accepted for the brief's call shape
  and not read. Null for any message not settled this way.
- `isMsg` in the repair accepts a finite `w` and `auto: true` on an answered message only; anything else bends the
  message and the inbox resets alone (today's rule).
- gmPackProblems names an `expires` that is not a whole number at or above 1, and an expiring card with no option
  that moves nothing; bind refuses both.
- NEUTRAL_BASELINE (kit section 8) holds the seven GM packs, whose 54 cards have no neutral option; every other pack
  the kit knows (today the fixtures) must have one on every card.
- Measured (kit, seeds 1 to 10): FX_EXPIRE on 20 silent desks, 2,634 cards settled at seed 1, every one at exactly
  w plus expires on option 1 with no meter moved; silent desks dealt 44.75 to 45.42 times the cards of the same pack
  without expiry (which freezes at three open), floor 30. Controls on this PC (shard afl): expireoff red section 7
  (0 settled, 1.0 times), expirefx red section 7 (6,570 breaks), neutral red section 8.

### Step (c) proof on a runner (rc r1324-c, head 1a30cbe9)

- tsc exit 0 (77 s); vitest exit 0, 38 tests passed; simEventDeck exit 0 in 37.7 s; controls replay, weightoff, story,
  rest, textrng and seasonweek each exit 1 with a "fired" closing line on their own section.
- simGmInbox at SEED 1, 2 and 3 printed every line the same as the base 8fea14e2 (`gmcmp`); its twelve old controls
  and the new quotevariant and effectvariant each exit 1 with a closing failure line.
- simCareerInbox exit 0 and privatecap exit 1; simHarnessAnchors, simNoRivalNames, simNoInventedQuotes,
  simNoInventedConduct, simInventedNames exit 0.

## Step (e): kit section 10, share and reach

- Every pack the kit knows over the FLEET drive at SEED (100 desks of ten seasons): every card dealt, and the top
  card's share of its pack's deals (a mean over 1,000 seasons) under that pack's ceiling. Measured at seeds 1 to 10
  (lowest to highest, percent, always the same top card): nfl 19.38 to 20.39 (nfl_fan_night), nba 26.58 to 27.79,
  mlb 25.56 to 26.82, nhl 24.66 to 25.81, college 27.54 to 28.48, gym 33.60 to 34.71, afl 33.98 to 35.36. Ceiling =
  highest plus 2 points (about five seed to seed standard deviations). A pack with no ceiling fails until a pack round
  measures one (SIM_EVENT_DECK_MEASURE=1 prints them).
- `reachBy` (advice 22): an optional pack field naming a fact; the engine never reads it, gmPackProblems refuses an
  undeclared one, and section 10 prints cards reached per value as a report line (no pack has one yet).
- THE `heavy` CONTROL CHANGED FORM, measured: the brief's "one NFL card at weight 50" left section 10 exactly as it was
  (2,793 deals, top card 20.2%), because every NFL card sits out a whole season (cooldown 22, the season's 22 weeks)
  and the cards that share a beat almost never come up together, so a weight has nothing to win. The control now takes
  the top card's cooldown away as well (and keeps the weight 50): nfl_fan_night then takes 31.7% of 3,283 deals,
  ceiling 22.4%, section 10 red. A fact for W2, W3 and every pack round: in today's GM packs a weight barely moves
  anything; weights matter only where cards compete for the same week.

### Step (d) proof on a runner (rc r1324-d, head 692f6cd1) and its one red

- tsc exit 2: `gmInboxWeek` wrote `w` and `auto` into an array typed `InboxMessage[]` (two TS2353 errors at the
  expiry lines). Fixed by typing the week's working list as `GmInboxMessage[]` (types only; nothing a desk deals can
  move). Everything else on that head: vitest exit 0 (42 tests), simEventDeck exit 0, every deck control red on its
  own section (expireoff and expirefx section 7, neutral section 8), simGmInbox equal to the base at seeds 1 to 3, all
  fourteen of its controls red, simCareerInbox green and privatecap red, the five legal fences green.

## Final proof on head 94cd6535

### Decision 6, the weight (rc r1324-w: #!serve, #!playwright, #!serial)

- `build` (vite build of the head) exit 0; `distgrep-head`: 512 JS chunks, 0 carry the engine's bind error text
  "pack moves"; `basebuild` (vite build of 8fea14e2 in a worktree on the runner) exit 0, 0 chunks carry it.
- `weight-head` and `weight-base` (sweepWeight, SWEEP_OFFLINE=1, the head's dist on 4173 and the base's on 4174) both
  exit 0 with `sweepWeight: green.`, and the three rows read the same on both: /club-manager 589K gz over 39 files
  (588.8K to the tenth), /soccer-career 823K over 45 files (822.9K), /front-office 364K over 36 files (364.2K).
- Engine bytes: src/lib/gmInbox.ts 17,663 CRLF (17,298 LF) before, 27,911 CRLF (27,363 LF) after; minified 4,479 to
  7,907, gzipped 1,921 to 3,216 (esbuild transform of the module alone). That is what W3 carries in its lazy chunk.

### Adversarial review and QA pass (by the builder; no reviewer agent was available to this run)

- The engine was read end to end against the brief's order of work and every rule of 3.3. Found and fixed: the type
  gate's two errors (step d). Hunted and found sound: equal weights mixing absent and 1 take the uniform line; a
  role key and an id key never collide; a hostile rest book (array, string, NaN entries) is pruned to nothing by the
  week and dropped by the repair; a hostile `w` or `auto` bends the message and resets the inbox alone; an expiring
  card whose def is gone stays open; nothing in gmInbox.ts matches simCareerInbox's single home patterns except the
  allowed drop oldest answered line; no dash anywhere in the round's files.
- Open, not defects of this round: a pack option whose karma is NaN would move trust to NaN through the answer flow
  (the validator does not check karma; W1b's effect registry is the place).

### The gates (rc r1324-e, 54 lines on head 94cd6535)

- tsc exit 0 (90 s, empty output); vitest of gmInbox.test.ts and GmInboxPanel.test.tsx exit 0, 42 tests passed.
- simEventDeck exit 0 in 56.2 s, `simEventDeck: green.`; its ten controls each exit 1 with a fired closing line on
  their own section: replay (1, 3), weightoff (3), story (4), rest (5), textrng (6), expireoff (7), expirefx (7),
  neutral (8), seasonweek (9), heavy (10).
- simGmInbox at SEED 1, 2 and 3 printed every line the same as the base (`gmcmp`, 3 of 3); all fourteen of its controls
  exit 1 (the twelve old ones, quotevariant, effectvariant).
- simCareerInbox exit 0, privatecap exit 1; simHarnessAnchors, simNoRivalNames, simNoInventedQuotes,
  simNoInventedConduct, simInventedNames exit 0.
- The 24 rule fences: 20 exit 0. simSchemaNames ("SUPABASE UNREACHABLE. NOTHING WAS CHECKED.") and simLeaderboardCaps
  ("fetch failed" on game_score_caps) read the live database, which the runner cannot reach by design: not run in
  effect, and neither reads gmInbox. simWritesAreSent and simResultMoment exit 1 on ERR_MODULE_NOT_FOUND for Playwright
  (that request had no #!playwright line); rerun with Playwright as rc r1324-e2.
- rc r1324-e2 (#!serve, #!playwright, head 94cd6535): simResultMoment exit 0 (green); simWritesAreSent exit 1, "the
  harness could not drive Guess the Nation to a finish: TimeoutError: locator.click". rc r1324-e3 (#!build,
  #!playwright, #!serial) ran it on the head and on a build of the base 8fea14e2 on the same runner: both exit 1 with
  the same first failing line, so the red is the runner's (Guess the Nation cannot be driven there), not this round's.

## After merging origin/main (Release BB, 36cc9ffe) into the branch: head 0b6889d6

- Main touched none of gmInbox.ts, careerInbox.ts, careerEventDeck.ts, keyedRng.ts or the packs, so the recording
  stands. `git diff --quiet origin/main -- src/data/gmInbox src/lib/careerInbox.ts src/lib/careerEventDeck.ts
  src/lib/keyedRng.ts src/components/front-office-shared` exit 0; `git diff --stat origin/main -- src public index.html
  package.json package-lock.json vite.config.ts tsconfig.app.json` lists src/lib/gmInbox.ts and src/lib/gmInbox.test.ts
  only.
- rc r1324-m (55 lines on 0b6889d6): tsc exit 0 (70 s); vitest exit 0, 42 tests; simEventDeck exit 0 (42.5 s) and its
  ten controls each exit 1 on their own section; simGmInbox printed every line the same as 8fea14e2 (gmcmp, 3 of 3)
  and as the new main 36cc9ffe (gmcmp-main, 3 of 3); its fourteen controls exit 1; simCareerInbox exit 0, privatecap
  exit 1; the five legal fences exit 0; the 24 rule fences as before (20 exit 0, two need the live database, two need
  Playwright: simResultMoment green with it, simWritesAreSent red identically on base and head).
- rc r1324-w2 (head 0b6889d6 against a build of the new main 36cc9ffe): build exit 0; 516 JS chunks, 0 carry "pack
  moves" on either; sweepWeight exit 0 on both with equal rows: /club-manager 592.0K gz, /soccer-career 826.7K,
  /front-office 372.1K.

## runAllSims on the runners (head 63c7fe1c, the code of 94cd6535, before the merge)

- One line (rc r1324-all) hit the runner's 4,200 s per command cap: exit 124, no output.
- Six round robin shards (rc r1324-all1 to all6): shards 1, 3, 4 and 6 finished (14, 19, 10 and 19 not green); shards
  2 and 5 hit the cap again and were rerun harness by harness (rc r1324-each2a, 2b, 5a, 5b): 8, 3, 2 and 9 non zero,
  simUsCareerSummer and simFootleKitNumbers killed at that runner script's own 25 minute cap.
- Every non-green harness was rerun on the head and on the base 8fea14e2 on one runner. rc r1324-cmp1b: the 52 of
  shards 1, 3 and 6, the same 51 names non-green on both (simRunnerTransport green alone on both: a flake under load).
  rc r1324-cmp2 (base checked out at the same path): 20 of 20 identical, verdict and first failing line (the 10 whose
  first lines still differed when the base ran as a nested worktree, plus shard 4's 10). rc r1324-cmp3 and cmp3b: the
  21 per harness reds of shards 2 and 5, 21 of 21 identical, exit code and last line. rc r1324-usc: simUsCareerSummer
  alone on the head exit 0, `simUsCareerSummer: green.` (2,513 s). No red is this round's; most need the live
  database or a browser the runner does not give them.
