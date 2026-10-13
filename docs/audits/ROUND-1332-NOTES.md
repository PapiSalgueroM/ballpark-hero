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
