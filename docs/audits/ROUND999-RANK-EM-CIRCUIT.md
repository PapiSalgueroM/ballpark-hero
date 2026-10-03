# Round999: Rank Em Legends circuit

2026-10-03. Accepted and merged through PR114. Publication pending.

## Acceptance

Head `859328af7c3b02f64f0058ece155e47ccf7eb98e` merged as
`b1b8a289c1a42a2e6d1eb737118f11529f4032c7`. Actual merge and tested PR checkout
`9ce354852b2ad80592f49c5b02523264ae4238ad` share tree
`ab54f798828decd1b28681cd0c474810e04baacf`.

Remote [run 37125937291](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/37125937291)
passed real app types/build, 14 normal outcomes, 14 effective copied-source
controls, both original ranking/completion gates and all 17 built readers.
Each control produced exactly its intended AssertionError, retained one passing
independent Daily baseline and skipped the other 12 cases. All 14 changed copies
matched their single intended edit and every runner retained seven source inputs
byte for byte. No import, timeout or runtime fault earned control credit.

Four native profiles passed: 320x780 touch/reduced motion, 390x844 touch,
1440x1000 dark keyboard and 1440x1000 light keyboard. Three complete runs
independently checked 5/5, 3/5 and 0/5 boards and the actual 8/15 finish. The
390px run restored saved draft, reveal and results through real reloads. Each
reveal checked all names, totals, units and submitted positions. Replay and
all three reviews passed. The light profile completed its NBA board.

Retained evidence includes 31 screenshots, 52 positive visibility checks,
41 width checks and three effective geometry controls. Each control changed
the actual page, failed the exact existing guard, then restored a passing
baseline and unchanged save bytes. No page, console or asset errors, score
write attempts or protected-save writes were recorded. All 14 external GETs
were fulfilled locally. Two reviewers inspected the actual phone and desktop
screenshots. Earlier 320px intro and restored 390px reveal clipping are fixed.

Artifact 11275620898 (2,520,979 bytes) was downloaded and SHA256 verified:
`9e9dc0cf7e9f1e58fadcff80efbdea2cd341dc5987904c780e8190bef4b9b533`.
Evidence: `C:/Users/antho/AppData/Local/Temp/dukb-rank999-ci-2026-10-03/859328af/evidence/`.
Preview: `C:/Users/antho/.codex/visualizations/2026/10/03/01a10028-7165-70b1-90e1-1946dd227be4/rank-em-circuit-preview999.png`.

This is scoped remote verification, not a full repository or production data
audit. All 45 circuit entries have separate two-source provenance. No local
runtime gates or production database probes were run. Publication still needs
a host success receipt and actual public circuit verification.

## Design contract

Rank five names in each of three sports, then see how many of the fifteen
positions you placed correctly. One NBA, one NHL and one MLB board make a run.
The existing editable ranking controls remain the repeated decision: choose a
name, move or remove it, then lock once. Each sport changes both the names and
the statistic. Each reveal retains the actual correct order and values until
the player chooses the next sport. The finish has a combined result, individual
sport results, review and replay.

This extends the existing puzzle rather than adding another route. Daily and
Unlimited retain the original fourteen-board pool, daily rotation and score.
The circuit has an unranked score out of fifteen with no account reward or
leaderboard booking. A separate versioned local save retains the actual deal,
picks, answers and phase. Invalid saves must safely return to the introduction.
The generated deal excludes today's daily board. Replaying starts a new run.

Use the existing compact ranking board with 44px controls, a three-sport progress
strip, complete answer context and explicit actions. Motion is a finite response
to locking, with a static reduced-motion view. Rules and a worked example appear
before play and can be reopened. All play remains available signed out.

## Data boundary

Reuse completed NBA, NHL and MLB career totals already stored in
src/lib/orderTheList.ts. The new circuit excludes tables with potentially
changing totals. NHL totals describe NHL careers, not other leagues.

The MLB hits and original stolen-base boards are excluded. Ty Cobb's4189 hits
and897 steals are supported by historical reconstruction while MLB retains4191
and892 in its official record convention. Those disagreements must not be
flattened into a claim of universal agreement. The circuit has a separately
verified stolen-base board with Kenny Lofton instead, under its own ID. It is
also excluded when the original stolen-base board is today's Daily. The existing
Daily/Unlimited dataset is not rewritten by this round.

The intended circuit pool is nine boards: NBA points, rebounds, blocks and
games; NHL points, assists and games; MLB home runs and the circuit stolen-base
board. The45 entries and sources are documented in ROUND999-DATA-PROVENANCE.md.
No production records, database probes or current-season totals are introduced.

## Verification contract

Remote CI must run real app types and build, then actual mounted/model outcomes
and effective copied-source negative controls. Check mixed and perfect scores,
daily exclusion, same-frame duplicate actions, saved drafts/reveals/results,
invalid-save rejection and Daily/Unlimited completion isolation. Retain original
Rank Em edit and duplicate-completion regressions and all built-site readers.

Native keyboard and phone play must finish all three boards, independently
check the revealed names/values and exact total, resume saved progress, reopen
rules and replay. Inspect final screenshots for instructions with Start and
answers with Next; measure page width and actionable controls. Browser requests
are fulfilled locally in CI. No local runtime gates or production data calls.

Round997 was published in Release Z and its actual public Shot lab was played
successfully. Round998 is integrating against the accepted circuit in PR113.
Neither the circuit nor Rugby League challenge is claimed live yet. AdSense
and indexing submissions remain deferred.
