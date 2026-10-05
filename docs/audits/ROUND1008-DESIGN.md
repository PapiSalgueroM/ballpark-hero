# Round 1008: saved season review

## Player outcome

NFL, NBA, MLB and NHL Career Log opens a compact year picker. Choose one season,
then switch between Overview, Regular season and Postseason. Back to seasons
returns to the selected year tile. Back to career restores the Career Log tile.
Retirement offers Review seasons and returns to that same opener.

Overview shows the saved season's OVR, games, age, salary, team result and full
award names. OVR and games compare with the immediately preceding saved season,
with neutral higher/lower wording. First seasons have no earlier comparison.
MLB pitchers use Starts or Appearances for their recorded count. This is a
record viewer, not a new simulation or a claim about why performance changed.

The performance tabs use each sport's position binding. Postseason numbers are
read from the existing saved fields. Missing older fields say Not recorded;
real recorded zero stays zero. No playoff participation is inferred from a
missing field. Suspended seasons explicitly say no season was played.

All new controls have at least 44px targets. Selecting a year focuses its
heading with preventScroll; tab changes retain focus; returning to the picker
focuses its selected tile. The existing reveal hook handles new screens and
reduced motion. A short introduction explains that viewing plays no season.

## State and implementation boundary

CareerSeasonReview is a lazy shared display component. usCareerSeasonReview
contains pure field formatting, with only type imports from sport engines.
The four existing bindings provide reviewStats; generic UI imports no engine.
No simulation balance, random draw, persisted field, save key or completion
condition changes. Review selection is temporary. Reload follows the existing
career restore flow and the same saved seasons remain available.

The original Career Log tile and label remain. Its old dense list is replaced
by the picker. Existing retirement summary remains with one review opener.
No Front Office or Soccer Career changes are included.

## Verification contract

Remote checks must cover actual Board integration for all four sports, exact
season selection, saved values rather than current career values, prior-season
comparisons, each position's regular and postseason fields, missing older
fields, recorded zero and suspended seasons. Include empty and retired careers,
reload, keyboard selection, tab focus and return focus.

Hold save bytes, RNG draws and completion calls while browsing and returning.
Use meaningful copied-source controls for wrong row, wrong position, changed
stat values, invented missing values and writes. Retain independent original
career outcomes. Historical presentation checks may adapt only the replaced
Career Log view and additive retirement entry; never regenerate saved outcomes.

Build and type checking run remotely. Preserve existing career regressions,
import boundaries and built readers. Native phone and desktop evidence must
show complete selected context and reachable controls, no horizontal overflow,
and light/dark and reduced-motion behavior. Layout guards need effective
changed-layout controls. Independent screenshot review remains required.

## Status

Product source is ready for remote verification. No runtime acceptance or publication is
claimed. Root owns Git, CI, integration and release receipts. No local build,
test, browser process, install or database probe is authorized.
