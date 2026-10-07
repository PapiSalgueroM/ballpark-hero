# Court Life design contract

Round 1075, October 7, 2026. Status: implementation in progress, not accepted or live.

## Objective and distinction

Play your way from a new teammate to the player your crew trusts, on the court
and between games. The user controls one created fictional player through real
full-court 3v3 matches. Training, recovery, relationships and money decisions
change the next playable match. This is distinct from Buzzer Beater's isolated
shots and NBA My Career's annual simulation. It does not modify either engine
or Claude's career, manager or real-data lanes.

The game is complete only when the court, six-game season, meaningful decisions,
save/restore, earned ending and next-season continuation all work. A hub with
passive match outcomes does not satisfy this contract.

## Complete season loop

Four fictional crews play home and away, six user fixtures per season. Every user
match is played directly. The other fixture each round uses the same physical
engine with six AI players. The sealed schedule and roster travel in the save.

Between fixtures, the compact hub offers Next game, Train, Team and Life. A tile
opens one panel with Back. Spend a finite amount of time on preparation and
resolve a contextual decision. Play the match, read the reconciled recap, receive
progression once and return to the hub. The final table and season ending derive
from the six recorded results. Next season retains earned career progress and
creates a new sealed six-game schedule; it does not re-award the previous one.

Rules are explicitly this game's arcade house rules, not an official competition:

- Three players per side, two 75-second halves and a 12-second possession clock.
- Two points inside 6.75 court units from the hoop, three outside it.
- Physical passing, dribbling, jumping, shots, blocks, loose balls and rebounds.
- Out-of-bounds and clock violations award a baseline inbound.
- No fouls or free throws in this version.
- A released shot stays live at the horn until its physical outcome.
- A tied second half gets 30 seconds of overtime, and at most one more overtime.
  Still tied after that means a draw. No coin-flip winner or infinite game.

## Controls and presentation

Mobile gets a movement pad and 44px or larger context-labelled actions. Shoot
uses press, hold and release. Pass sends a physical ball to the highlighted
teammate; off-ball it calls for a pass. Defense exposes Steal, Jump and Guard.
Sprint spends stamina. Equivalent keyboard actions remain visible in Help.

Each physical key or pointer is bound to its action at press time. A possession
change cannot turn a held Steal into a fresh Pass. Help, Pause, blur, hidden tabs
and pointer cancellation clear held input. Resume is deliberate. A restored
match opens paused with no held shot waiting to fire.

Use a stable full-court camera, original player silhouettes, visible ball shadow,
clear possession marker and a compact scoreboard. Movement, stride, jumping,
ball height and action poses come from engine state. The renderer may interpolate
between two states but may not step physics, pick a random pose outcome or award
points. Reduced motion removes flashes, shake and decorative effects; essential
court motion follows the same physical state and timing.

Pre-play Help includes controls, house rules and a worked possession: draw the
defender, pass to the open teammate, cut, receive and shoot. The same instructions
remain available through `?`. Results and next actions must appear without driver
scrolling on the tested phone sizes. Panels use the existing reveal-scroll hook.

## Authoritative match API

`src/lib/courtLife.ts` is pure, deterministic and serializable. It exports the
types and functions below, using a fixed 30Hz tick:

- `createCourtMatch(config)` seals three specs per team, seed and controlled ID.
- `stepCourtMatch(match, input)` returns a new state and never mutates its input.
- `continueCourtPeriod(match)` resumes the halftime break only.
- `neutralizeCourtMatch(match)` cancels the controlled player's held shot charge,
  preserving trajectory, velocity, RNG, clocks and earned events.
- `simulateCourtMatch(config)` runs six AI players through those same rules.
- `courtPassTarget`, `courtShotMeter`, `courtBasket` and geometry constants expose
  presentation facts without another copy of the rules.

The state holds tick, RNG state, period, clocks, six players, authoritative ball,
score, possession, pending inbound, stats and ordered events. Ball states are
owned, pass, shot, loose and dead. Ball flight IDs are monotonic. Ownership is
exclusive. A basket requires an actual downward hoop-plane crossing and can be
credited only once per flight. Swept contacts prevent fast balls tunnelling
through hands, rim or receivers. Misses become actual loose balls. A poke counts
as a steal only after the defending side controls the loose ball. An assist
requires a received pass followed by a basket inside the stated time window.

Players and AI share movement, stamina, legal actions and physical contact rules.
AI passes into actual space, drives, shoots, cuts, marks opponents and pursues
rebounds. It cannot teleport or read a future shot result. Any stored prose is a
description of a recorded event, never a second source of game facts.

## Progression and saves

Five attributes are finishing, shooting, passing, defense and conditioning.
Finishing and shooting change release dispersion at their respective distances.
Passing changes dispersion and legal catch tolerance. Defense changes reachable
contact range. Conditioning changes movement, stamina use and recovery. Every
effect needs an outcome test and a neutralized comparison before acceptance.

Condition is 0 to 100 with a playable stamina floor. Credits are nonnegative.
Training, recovery, work and team time compete for finite time. Credits may fund
preparation, but cannot block match entry or purchase a guaranteed result. Team
chemistry modestly affects passing and catching. There is no gambling mechanic.

Trust earns Newcomer, Trusted outlet and Floor leader roles. Role changes affect
inbound priority and timely responses to legal calls for the ball. These are
responsibilities, not invented playing-time claims when the human always plays.
The recap must show why trust and resources changed. Use fictional people and
authored decisions with present costs and persistent consequences.

Saves carry schema version, career ID, rules version, RNG, sealed teams, schedule,
completed match IDs, choices and full active match state. Restore opens paused.
An unsupported or corrupt save is preserved with a visible reason, not silently
replaced. The career reducer settles each match ID at most once. Double clicks,
reloads and repeated recap visits cannot mint results, money, XP or completions.

Finished seasons genuinely call the existing completion pipeline once with a
score capped at 100. Practice and incomplete matches award no global points.
The score model reserves 50 for wins, 20 for points, 20 for teamwork and defense,
and 10 for possession care, with finite season caps. The exact formula is shown
in the season recap and tested independently. The route's 100-point cap migration
is reviewed source work; production SQL remains the release owner's task.
There is no shared daily puzzle in this career mode and no daily-comparability
claim. Fresh careers use seeds; continuing careers retain their own world.

## Reuse and legal scope

Reuse the existing shell, navigation, Help, buttons, completion recorder,
recorded-finish conventions and reveal-scroll behavior. Follow the established
source-keyed input and explicit pause patterns. Do not stretch Buzzer's
release-decided shot engine or extract speculative generic sports abstractions.

All rosters, crews, sponsors, results and dialogue are fictional. Use original
unbranded art, no real logos, crests, kits, athlete likenesses or invented claims
about real people. No database is needed for the playable career. Generated name
pools must join the existing fictional-name guard before shipping.

## Acceptance and delivery

All execution runs remotely in GitHub Actions. Local work is source editing and
static inspection only. No production database calls or public scored QA games.

1. Actual physical outcomes for shots, passes, blocks, interceptions, rebounds,
   out-of-bounds, clocks and the horn. Effective copied faults must break their
   mapped assertion while an unrelated baseline passes.
2. Conservation: one ball owner, unique scoring flights, finite coordinates,
   scoreboard equals basket events, player points equal team points, and assists
   and other earned stats reconcile against their causal events.
3. Exact seeded replay and save continuation, including a live airborne ball.
   Neutralize both replay arms identically when testing input-neutral restore.
4. Paired-seed balance batches: open shots beat contested shots, useful passing
   beats forced contested shooting, defense matters, and active play beats idle.
   Set margins from measured repeated headroom. Do not assert a sample maximum
   or treat lack of significance as success.
5. Every career attribute and resource has a measured intended consequence.
   Complete seasons produce different earned roles and legitimate endings.
6. Six fixtures, table, economy, decisions and season completion reconcile.
   Reapplying the same choice or match has no effect. Saves do not repay finishes.
7. Native 320px and 390px touch plus desktop keyboard, both themes and motion
   settings. Verify actual possessions, full career flow, fonts, controls,
   focus, no clipping, no unintended scroll, no runtime/asset errors and no
   forwarded external writes. Preserve reports, source hashes and screenshots.
8. Animation samples bind rendered coordinates to exact engine ticks. Rendering
   corruption must be detected by an effective geometry control.

Register the lazy route, catalog, real guide and worked example, completion cap,
sim harnesses, search, snapshots, sitemap and news only with the complete release.
Update project state in that round. Claude retains AH/main/publication ownership.
