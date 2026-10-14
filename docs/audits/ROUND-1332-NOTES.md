# Round 1332 notes: the shared deck, part two, and the inbox panel half

Branch r1332-deck-kit, base origin/main 082fc277 (Release BC dec9075b plus the 2026-10-13 handoff).
FENCE_BASE is 082fc277. Brief: C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1332.md.
Nothing a player can reach changes: no route mounts GmInboxPanel, and the US careers' inbox renders
as before (it passes no settledLine). Every gate below ran on a GitHub runner (the lane's rc kit).

## What each step built

(a) The panel half. InboxPanel takes one optional prop, `settledLine`, asked only about an answered
card; when it returns a line, that line shows in the reply box's exact classes
(`data-inbox-settled`) instead of "You replied". GmInboxPanel passes
`m => gmExpiredLine(<the message as saved>)`, and its full desk sentence adds ", or your assistant
deals with one for you." only when an open card's def can expire. The kit's `panelexpiry` control
now also strips the gmExpiredLine call from the fence's copy of the code.

(b) The effect registry. `GmChoiceDef.fx` (a plain number, or `{ who, v }` for a key that names a
man), `GmFxDef`/`GmFxRegistry` on the binding and the seat. choiceEffects prints every nonzero key
after the built ins (a key with no words prints raw), answerGmInbox refuses an option with an
unregistered key before anything moves and then applies each key, gmNeutralIndex counts fx, and
gmPackProblems (bindGmInbox passes the registry) refuses an unregistered key, a built in name, a
man on a plain key, a bare number on a man's key, a man off the targets, a value that is not finite.

(c) Slots, tags and the resolver. `GmInboxPack.slots`, `GmEventDef.tag` ('conduct' or 'private'),
`person(s, { role } | { id })` on the binding and seat. gmCardSafe (step 4b, through gmEligible's new
optional `safe`) holds a card whose slot has no value or whose person slot names nobody, and a tagged
card unless its subject, every person slot and every man an option moves resolve to `real: false`.
Step 7b fills the slots. bindGmInbox refuses a pack with a tagged card or a person slot and no
resolver; gmPackProblems refuses an undeclared slot, a stray brace, a brace in a voice, beat, label,
reply or target, a slot on an undeclared or yes or no fact, an unknown tag.

(d) The compact desk. `store: 'compact'` (opt in, rising clock only): step 8b prunes the book to the
entries still cooling; messages keep `t` and `sv`; gmShortKey (FNV 1a, 32 bit, base 36, collisions
refused); gmDeskSave and gmDeskLoad (a compact message is `{ d, y, c, n?, t?, s?, w?, a?, x? }`,
rebuilt from the pack; the loader fails closed field by field). Nothing calls the codec yet. The
frozen words ledger is scripts/data/eventDeckWords.json (FX_COMPACT's eleven cards, by the append
mode only).

## Runner results (name, head, exit codes)

- r1332-a-base (bee67294 with the base's two components): the new tests, exit 1: three tests fail on
  the base, the two settled card tests ("expected null to be truthy": no settled box, it says
  "You replied") and the expiring desk sentence; the other seven pass, as they must.
- r1332-a (bee67294): tsc 0, vitest 0, kit 0 (97.9 s), the 16 kit controls each exit 1 and fired,
  simGmInbox seeds 1 to 3 identical to FENCE_BASE (29 lines each, green), its 16 controls exit 1,
  simCareerInbox 0 and privatecap 1, simHarnessAnchors, simNoRivalNames (0 findings),
  simNoInventedQuotes, simNoInventedConduct, simInventedNames, simRevealMoments, simStorageWrites 0.
- r1332-b (53717858): the same, all green; fxsilent, fxdrop, fxunbound, fxneutral each exit 1 (red
  section 11, fired).
- r1332-c (f5bc595e) and r1332-d (fc80a418): see the closing report.
- r1332-c (f5bc595e): all green but the kit, red in section 12 only for one fixture label of the kit's own
  FX_REGISTRY ("Call the family" matched the private list); fixed in (d).
- r1332-d2 (fc80a418): all green; the kit 206.2 s; all 31 kit controls (each on its own sections) exit 1 and fired.
- r1332-e-measure (a3567006): section 15 measured at seeds 1 to 10 (written in the kit header).
- r1332-f-walk (f6943255): npm run build 0; no chunk of either build carries an engine error string; sweepWeight
  green on the head (/nfl-my-career 486.4K, /front-office 372.5K, /club-manager 602.2K, /soccer-career 828.2K);
  playCareerHub green; the walk (36 boxes, /nfl-my-career and /nhl-my-career at 320, 390, 1280) head equal to the base
  within 1 px, same text and fonts, no sideways scroll. Pictures: dukb-handoff/2026-10-10/results-g/r1332-shots.
- The adversarial review was this builder's own (no reviewer agent in this run): it added the rule that a tagged card
  must name who it is about, the whole desk t and sv check, and the fence over pack modules imported alone. A hostile
  save probe (ten broken blocks through gmDeskLoad) loaded every one sane, no crash, no prototype pollution.
- Final gate results: see dukb-handoff/2026-10-10/results-g/finish-1332.md.
- r1332-g (7bb38f00): build, tsc, vitest, the kit (263 s) and its two halves, all 33 kit controls, simGmInbox
  identical to the base, its 16 controls, simCareerInbox and privatecap, simRevealMoments, simStorageWrites: green.
  The 24 rule fences: 20 green; simSchemaNames and simLeaderboardCaps (live database) red on head and base alike;
  simWritesAreSent and simResultMoment (no browser in that request) red on both; r1332-h: simResultMoment green with a
  browser; r1332-cmpw: simWritesAreSent red on head and base with the same two failures (known).
- r1332-h (b36e366d): the kit as three gate lines: sections 1 to 12 in 101 s, 13 in 71 s, 14 to 16 in 29 s.
- r1332-f-weight2 (b36e366d): gzipped JS, head minus base: the four US career routes +45 to +52 B (/nfl-my-career and
  /nhl-my-career round up by 0.1K), /front-office +17 B (rounds up by 0.1K), /club-manager +20 B, /soccer-career +27 B.
- Suite (r1332-all1 to all6, 746 harnesses): 83 not green on the head, 7 of them killed at a 25 minute cap; every
  other one rerun on the head and the base on one runner (r1332-cmp35, cmp12, cmp4, cmp6): identical but for two
  whose last line follows the live service (simSoccerGridLabels, simAnswerFromRecords, same failure on both).
