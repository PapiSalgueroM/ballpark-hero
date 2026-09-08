# Round 524: saved bracket profile summary

Claimed September 8, 2026 from Round 523 `8c3d1153`. Local draft candidate.

## Evidence and scope

WorldCupPredictor.handleSaveBracket saves predictions, playoffPicks,
selectedThirds, knockoutPicks, awards and a top-level champion. The current
Profile summary ignores that champion, reading knockoutWinners.final and
awards.champion only. It also parses legacy strings without a catch and
trusts any truthy nested value as a React child. Missing normal summaries,
malformed JSON, parsed null and object-valued legacy champions are candidates
for real-component reproduction, not yet verified defects in this round.

This is a summary-reader fix, not a saved-bracket repair or save protocol
change. No storage, real account, backend, tournament data or other game
changes. Only valid nonempty strings may become the champion label. Prefer
the current top-level field, then preserve the old awards.champion priority
over knockoutWinners.final. Keep Bracket saved and the existing bracket link
when no valid champion is available. No inference from knockout picks.

## Plan and acceptance

1. Reproduce real Profile outcomes with synthetic current writer-shaped,
   serialized, legacy and malformed payloads. Assert the card and exact link,
   profile remains usable, storage unchanged and unexpected backend calls fail.
2. Make the smallest safe shape-checked reader change in Profile.tsx.
3. Prove precise source controls, rerun related profile cases, both types,
   build and all fifteen generated-site fences. Test real built phone/desktop
   screens with denied transport. Independent review before draft push.

## Results

Pending reproduction and implementation. No production edits yet.
