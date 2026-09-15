# Round 530: NBA Arcade Free Agency

## Reproduced defects

The team picker disappeared after its first choice, including when that team
later lost all territory. It also offered eliminated teams. The hook then
refused to sign for that team, leaving no way to choose a surviving team.

An independent seed530 real-hook run settled three real battles, selected
LAL and called its captured signing handler twice in one event. Russell
Westbrook was absent from all active rosters before the action. Afterwards
he appeared twice, roster size grew from10 to11, two log entries appeared
and both rating overrides gained4 instead of2. One cooldown was consumed.

A second real run selected DEN after three battles, signed LeBron at the
existing in-game94 rating, settled three more battles and signed Westbrook.
The old original-roster-only lookup waived that recruit while retaining
Zeke Nnaji at the existing in-game77 rating. These are simulated outcomes,
not current team membership or real-world rating claims.

Baseline witnesses and reports live in
`%TEMP%/dukb-round530-baseline-57140c9ad9fe4964b331afe2fa6efd59`.
They use the real hook and simulator, with no React state replacement, no
map replacement and no production transport/storage writes.

## Intended behavior

Keep a surviving-team picker available between turns. An eliminated choice
gets an explicit explanation and can be replaced without restarting the map.
Offer only canonical pool names absent from all active rosters. Released
players can become available again later; signing history is not a permanent
ban. No team change or signing is accepted during an unresolved turn.

Each signing replaces one weakest roster member using the existing shared
NBA metadata resolver, including acquired players and activated legends.
If the waived player owns a queued upgrade, clear that now-unusable entry.
Preserve exactly three settled battles between signings and the existing
+2 rating drift. The previous label said conquests although repelled attacks
also advance that counter; the revised label names battles.

A fresh render token rejects consumed or stale team/sign callbacks, including
after another cooldown, team change, phase transition, reset or unmount.
No new battle odds, rewards, save protocol or backend behavior.

The pool's unsupported current-contract/team blurbs are removed from data,
schema and display. Its player names, positions and game ratings stay as
they were. The screen explains that availability follows this run's rosters.
No replacement real-world facts are added.

## Verification plan

Real-hook outcomes with seeded battles, focused rendered controls, exact
source controls and an independent source review. Both exact type checks,
production build, all fifteen generated-site fences, the prior NBA power and
region checks, and built phone/desktop signing flows with intercepted reads.
No default broad suite or production writes. Preserve all previous previews;
new candidate preview4207 and draft PR only.

## Implementation and checks

The hook now returns its filtered canonical signing pool. The controlled team
selector remains available and removes eliminated options; an eliminated
selection displays a recovery message. Both selection and signing are locked
outside the ready phase. Names already on any surviving roster are unavailable,
while a later waiver makes that player eligible again.

The accepted action invalidates its render token before updating the roster,
rating drift, cooldown or log. Phase changes, reset and unmount also invalidate
it. The shared NBA roster resolver supplies weakest-player ratings, preserving
acquired stars and activated legends. Only the waived player's queued upgrade
is removed. Help explains the waiver, cooldown, cap and simulated availability.

Nine real-hook cases and all thirty-seven prior NBA hook/power UI cases pass.
The production build passes and includes the final queued-upgrade help sentence
in ConquestNba-Bc81dJJ1.js. All fourteen Node site fences pass through explicit
ONLY with DB_PROBE=unreachable; the separate installed-Chrome boot fence passes
on port4331. Preview4207 serves index-Bqk1tGcq.js. Source snapshots and their
date ledger are unchanged because the default route content is unchanged.

The independent hook/data review found no actionable production issue. Review
strengthened the hook test's backend-touch collector so a caught forbidden
call is still detected. An initially ambiguous control anchor was refused
before execution, narrowed and rerun; it was never counted as a passing check.

The settled hook suite passes all nine cases and twenty exact source controls,
each producing its one intended assertion failure. Unexpected runtime and
deliberately caught mocked-backend probes both exit1 and receive no passing
credit. Both exact type configurations pass. The prior Conquest help harness
also passes all twelve cases. The prior built phone power walk completes all
five awards, bank/reopen/use actions, visible map checks and reload restart.

Hook control results:
`%TEMP%/round530-free-agency-final-143202cb36ee45b5b1fd11a68e0bb9b8/results.json`.
Prior power browser:
`%TEMP%/dukb-nba-powers-2gx2Ja/report.json`.
Build/site/boot logs: `%TEMP%/dukb-round530-build.log`,
`%TEMP%/dukb-round530-fences.log`, `%TEMP%/dukb-round530-boot.log`.

The rendered panel suite passes ten cases and nineteen exact source controls,
which produce sixty expected assertion failures. Controls cover phase locks,
surviving-team choices, status copy, canonical candidates, transport, storage
and caught or import-time backend access. The runtime probe exits 1 with its
exact nine named errors and receives no passing credit. Independent review
strengthened the UI collector to retain import-time backend touches.

UI control results:
`%TEMP%/round530-free-agency-ui-d5e4eb024e624b44abc6cf334f7ca072/results.json`.
The actual runner executes the new hook and UI harnesses plus the prior help
harness as three selected Node jobs; all pass. It does not classify or skip
either new harness as browser work. Log:
`%TEMP%/dukb-round530-targeted-runner.log`.

The first phone browser run completed twenty-five real battles, two signings,
and recovery after its selected team was eliminated. Its desktop portion was
interrupted while replacing that variable-length wait with a bounded proof;
the first run is not counted as a complete phone/desktop matrix. The original
phone dead-picker control completed separately. Those artifacts remain in
`%TEMP%/dukb-nba-free-agency-qAuL6s` and
`%TEMP%/dukb-nba-free-agency-3bOjx0/report.json`. Main inspected the phone's
second-signing screenshot and found no clipped names or unusable controls.

The final browser script settles six real battles for two signing cycles,
then scouts one actual battle in a fresh run with a constant random draw.
It restarts with the same initial map, chooses the scouted losing team, and
replays the actual battle. Both combatants, winner and final map must match
before the eliminated-favorite notice and surviving-team recovery count.
This bounds each viewport to eight battles without injecting map or hook
state. The short dead-picker control must fail its exact recipient check,
restore the original element and successfully change teams in both directions.

The final matrix passes at 390 and 1440 pixels: eight actual battles and two
signings per viewport, correct +2 displayed ratings, one transaction per
signing, candidate removal, phase and cooldown locks, and reset. Both scout
and replay eliminate MEM through the same real ATL battle; choosing another
surviving team succeeds afterwards. Both dead-picker controls pass. No
unexpected backend request, runtime error or failed local asset appears, and
the unrelated save sentinel is unchanged. Main inspected the phone and
desktop elimination screenshots and desktop signing screenshot.

Final browser report:
`%TEMP%/dukb-nba-free-agency-i92Rpe/report.json`.
Final picker controls:
`%TEMP%/dukb-nba-free-agency-T89hkG/report.json`.

Final independent review of the production changes, test collectors, exact
control wrappers and bounded browser replay is clear. The final browser
process exited 0. Its transport responses are synthetic fixtures; signing
battles use seeded simulation and scout/replay uses a fixed random draw.
No hook state, map ownership or battle result is substituted. The final
browser syntax and shipped-name fence pass after the bounded script edit.

Implementation `f67bbe6b`, stacked draft PR81:
https://github.com/PapiSalgueroM/ballpark-hero/pull/81.
Base is Round 529's final checkpoint `dcd50886` (draft PR80). Preview4207
remains available. No merge or live publication was performed.
