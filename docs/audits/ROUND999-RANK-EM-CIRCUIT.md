# Round999: Rank Em Legends circuit

2026-10-03. Implementation and verification in progress. Not merged or live.

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

Round997 publication remains blocked by Lovable's empty Publish panel. Round998
is verified in PR113. Keep this work isolated until that publication queue is
resolved. AdSense and indexing submissions remain deferred.
