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
