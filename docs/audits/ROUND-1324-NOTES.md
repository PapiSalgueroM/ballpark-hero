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
