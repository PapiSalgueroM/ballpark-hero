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
