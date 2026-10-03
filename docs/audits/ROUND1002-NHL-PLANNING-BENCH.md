# Round1002: NHL Connections planning bench

2026-10-03. Design contract, not accepted or live.

Let a player arrange tentative groups before spending a life on a submission.
Use the existing twenty names and four groups, with four compact draft tabs.
Assignment badges belong on the current tiles, not a duplicate twenty-name list.
Move a player between groups, remove a note, revise and explicitly submit five.
Planning is free. A wrong submission leaves useful notes for revision; a correct
group locks and removes solved names from editable notes.

Preserve existing puzzles, four lives, Daily score and completion payloads. Draft
state is separate, validated and scoped to mode plus the actual loaded puzzle.
Wait for loading to finish so fallback notes cannot overwrite loaded-pool notes.
Reload and mode changes may restore only canonical current unsolved names.
Malformed, foreign, duplicate and stale notes must not affect score or answers.
No new sports records or factual-verification claim is introduced.

Keep44px actions, compact A-D group counts, visible assignment state and a clear
Submit five action. Never auto-submit on the fifth selection. Explain planning
and submission in reopenable help with an anonymous hypothetical example.
Keyboard and touch users need the same controls and clear feedback. Results and
actions must appear without the driver scrolling; reduced motion stays static.

Own NHL Connections page/hook/help, a small notes helper and focused verification.
Do not touch shared career/manager components or shared scoring/puzzle sources.
Prove a wrong submission followed by four correct groups produces the original
750-point result, free rearrangement costs nothing, rapid duplicate submission
charges once, solved names stay locked, and notes/Daily bytes survive reload and
mode changes independently. Controls must demonstrate effective rejection of
accidental auto-submit, duplicate charge/assignment and stale or leaking notes.
Retain original NHL Connections regressions and all built readers. Inspect actual
320/390/1440 keyboard/touch full solves, saved notes and feedback screenshots.

Keep the product PR isolated while accepted998/999 await publication.1000 and
1001 do not become dependencies. No local runtime gates or production DB probes.
