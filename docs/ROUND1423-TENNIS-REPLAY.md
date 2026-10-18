# Round 1423: Tennis Player replay confirmation

Status: claimed, source hypothesis only. No product change or passing runtime yet.

Root owns only the Play Again UI-state reset in
`src/components/tennis-player/TennisPlayerBoard.tsx`, new focused regression
tests, a remote proof/browser/workflow and closing documentation. Base:
`775564305e9da84dab59f2b9fe246d044a3cc8e9`.

Source hypothesis: search stays usable with Give Up confirmation open. A win
can therefore hide that prompt, then Play Again clears only the hook's game
state. The next Unlimited round may inherit the prompt before any guess.

1. Run the actual original board and hook with fictional rows. Reproduce
   through the actual built route at phone and desktop sizes before adopting
   any product edit. Same-puzzle replay is deliberate.
2. If confirmed, clear only that obsolete local confirmation on Play Again.
   Preserve scoring, saves, clues, hints, search, ordinary Cancel and surrender.
3. Verify the fixed unit/browser paths, exact original-source negative control,
   existing tennis outcomes, real app types, serial plain build, all 15
   built-site readers and all 14 unchanged fatal weight gates.

All app/runtime work stays in GitHub Actions with ordinary offlineTransport.
Native local text, Git, ZIP, hashes and saved JSON only. No data facts, remote
database calls, dependency/cap/transport waivers or publication claim. The
shared primary is WORKBOARD append only. All 60 earlier report heads stay
sealed. Claude I keeps protected Soccer Career, Manager, tournament and
actual release/main/publication work. This round does not join those changes.
