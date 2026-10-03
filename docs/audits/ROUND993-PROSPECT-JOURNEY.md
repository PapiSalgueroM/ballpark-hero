# Round 993: Road to the Draft

Status: accepted and merged as 9b9bfb14 through PR109, 2026-10-03. Publication pending.

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

Exact commit `dacafa8a1af42ebb97e51a5e6fb1d3d87c65545d` passed
[CI37110583860](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/37110583860).
Verification ran on a standard public GitHub runner because the local machine
was under memory pressure. This is the scoped product gate, not a claim that
the entire repository suite or production database probes ran.

- Real app type check and production build.
- 36 mounted prospect outcomes and 15 effective controls. Each control rejected
  four named assertions and preserved four quiet legacy cases.
- 26 original model/component tests and all 14 model controls.
- Four original career replays and six controls, plus 32 practice outcomes and
  12 controls. All 48 training tests, 43 recorded replays and six timing controls
  passed, with 2,245,687 training checks recorded.
- 13 career regression families, the own-key action control and all 17 built
  readers passed.
- Six native journeys: all four sports at 390px, NBA at 320px with reduced
  motion, and NBA at 1440px with keyboard. Two viewport controls failed as
  intended. All six normal paths had zero horizontal overflow. Screenshots of
  route choice, decisions, draft results, scout archives and pro play were reviewed.

The reviewed 914 closing corrections are included: off-ice NHL combine tests,
truthful NFL decisions, prep-only NBA cards, MLB/NHL rate lines and the full
undrafted development ladder. Invalid-input guards and strict saved outcome
validation remain in place.

Completed awaiting-Join saves now validate their stored team, pick/round math,
year, rating, age and development length without rerunning the current model.
Recorded choices can outlive their card definitions. Professional archives keep
their existing structural reader. Four added mounted cases carry deliberately
different valid historical stats and ratings through reload, career entry,
archive viewing and a professional season. The actual previous replay reader is
a rejection control, and a second control removes semantic outcome validation.
Artifact `11269388362` was retained locally with matching SHA256:
`8f50f27d479357dbc2df4fc35477b9d6bf7696f740bbfea36933de78bf7fff62`.
Evidence: `C:/Users/antho/AppData/Local/Temp/dukb-prospect993-ci37110583860/ballpark-hero/ballpark-hero/prospect-journey-artifacts/`.
PR: https://github.com/PapiSalgueroM/ballpark-hero/pull/109.
