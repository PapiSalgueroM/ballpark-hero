# Round 993: Road to the Draft

Status: implemented for remote verification, 2026-10-03. Not accepted or published.

## Player experience

Make the league with a prospect you shaped. The primary creation option opens
three acts: choose a route, play its seasons and make scouting decisions, then
take a showcase approach and see the draft result. MLB and NHL include the
recorded development seasons before the professional debut. Going undrafted
still leads to a camp signing. Quick start remains available.

The prospect file uses the existing generated player portrait, stadium geometry,
navy (#143d69), scouting blue (#1355aa), paper (#eef3f7), ink (#13304b) and white.
Space Grotesk carries the short stage headlines; body text stays on the site's
existing stack. A single draft reveal animation answers the result. There are
no downloaded assets, real likenesses, logos or new font requests.

Choices show their exact capped meter effects. Every new control is at least
44px. Help includes rules, a worked example and the model limits before play,
and can be reopened. New steps use the existing reveal hook; keyboard focus
moves once with preventScroll. Reduced motion presents the final state.

This is an unlimited career opening, not a new daily or separately scored game.
The existing career legacy score remains its outcome. My Player keeps a readable
record of the amateur and development seasons after joining the league.

## Save and engine contract

- The four existing save keys are retained. Before joining, the saved wrapper
  has c:null, phase:prospect and the complete versioned prospect profile/state.
- Route selection, each season, each decision, showcase and draft result save
  immediately. A ref consumes each offered action only once before React renders.
- The professional constructor receives the actual result as its optional final
  argument. Pick, team, rating, potential, age, health and debut year exist before
  salary, fanbase, initial wealth, depth chart, rival and inbox are derived.
- Draft pick 0 means an undrafted signing. Rookie guarantees, opening endorsement
  checks, pressure copy and legacy text explicitly exclude that sentinel. The
  undrafted path does not receive messages claiming a draft selection.
- A completed journey stays in c.prospect. Development years advance age and year;
  they do not add professional seasons or professional earnings.
- Existing saves and constructor callers without an entry retain their original
  RNG order and save shape. The original round900 recording is not regenerated.
  Its DOM projection excludes only the additive practice/prospect entry sections;
  its legacy quick-start path, full save bytes and gameplay checks remain exact.
- Nested malformed prospect records are rejected. A corrupt archive is removed
  independently when an otherwise valid professional save is restored.

## Data and model boundaries

The engine, sport descriptors, original tests and distribution harness come from
r914-career-pre-draft-path. Its source pairs and omissions are retained in
[the rules audit](US-PRE-DRAFT-RULES-2026-10.md). All prospect names and results
are simulated. Draft order omits traded/extra picks and MLB/NHL lotteries.
The UI states those limits. Optional MLB real slot figures are not shown or paid
by this integration; professional finances retain the existing simulation model.

Additional reads on 2026-10-03 confirmed NFL seven rounds and eligibility in
[NFL Operations](https://operations.nfl.com/calendar-events/nfl-draft/nfl-draft-rules)
and the [NFLPA CBA, Article 6](https://nflpaweb.blob.core.windows.net/website/PDFs/CBA/March-15-2020-NFL-NFLPA-Collective-Bargaining-Agreement-Final-Executed-Copy.pdf).
The optional 2026 MLB top slot was cross-checked in
[MLB](https://www.mlb.com/yankees/news/mlb-draft-2026-bonus-pool-pick-values?t=mlb-draft-coverage)
and [Baseball America](https://www.baseballamerica.com/stories/2026-mlb-draft-bonus-pools-slot-values-for-each-team/).

## Acceptance

Local work is limited to source inspection, TS/TSX and CSS parsing, and diff
checks because this machine is under memory pressure. Type checking, build,
original900/913/914 checks and controls, actual Board reload/handoff/undrafted
cases, one professional season, and native mobile/desktop review remain CI gates.
The mounted993 harness is owned separately by save_diagnosis in this worktree.
The serial prospect-journey workflow includes original900 controls, all914 model
controls, the992 practice outcomes/controls and913 timing controls. The native
career993 walk covers all four sports at390px, NBA at320px with reduced motion,
and NBA at1440px with keyboard. It captures choices, the draft reveal, the scout
archive and the first professional season, and checks complete saves after each
transition against an expectation computed before the input.

The first complete remote gate passed at f3b5545d (run 37107869842), including
both native reveal controls. It is retained as a baseline, not final acceptance.
The reviewed 914 model through fc4bd863 is now integrated: corrected NHL combine
tests, truthful NFL decisions, route-specific NBA cards, MLB/NHL rate lines and
the full undrafted development ladder. The updated model harness retains its
measured bands and all 14 controls. Our constructor entry, invalid-input guards,
integer/length/age validation and truthful NHL draft-entry wording remain.
The renamed-card fixture now reaches its final choice through actual seasons;
corrupt line cases retain valid array lengths to isolate their content guard.
Fresh type, build, compatibility, model and native gates are required.
