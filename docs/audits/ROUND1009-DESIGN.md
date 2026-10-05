# Round 1009: see what your career decision changed

## Player outcome

An ordinary NFL, NBA, MLB or NHL career choice now opens a compact result before
returning to the hub. The event title and selected option remain visible. The
card compares the career immediately before and after the existing choice was
applied, so a capped health gain from 98 to 100 is +2, never an advertised +10.
The new result does not repeat the engine's narrative, which can include nominal
numeric changes. The existing News feed remains unchanged.

The card shows changed OVR, health, morale, fanbase, potential, career earnings,
cash, annual salary, contract years, annual upkeep, unexplained money, heat,
suspended seasons and karma when those recorded fields differ. Changed teams
use each saved state's existing era-aware team label. Money remains in millions.
Career earnings, cash and salary stay separately labeled. Missing values say
Not recorded and never become an invented zero or a calculated gain. Unchanged
fields are omitted; no tracked change has an explicit empty result.

The first four changes appear immediately. Show all changes opens any remainder
in the same card. The body can scroll inside the card while the result heading
and Continue remain outside that scrolling region. All controls have 44px
targets. Focus enters the result heading without moving the page first, and a
local full-card geometry check follows the shared reveal hook. Reduced motion
uses immediate scrolling. Expanding the list does not steal keyboard focus.
Continue returns focus to the existing season action when the hub returns.

## State and implementation boundary

The ordinary event handler consumes its event synchronously before applying the
option. Repeated input from the same render cannot apply a second option or
consume more random draws. Each newly drawn event is available once. The
original engine application, team-quality roll, News feed update, saved phase
and persist call remain in their existing order and retain their values.

The result is a transient snapshot of formatted fields, not a new saved event
history. Continue clears that snapshot without saving, drawing randomness or
playing a season. Reload follows the existing restore behavior with the choice
already applied; it does not replay the choice or reconstruct missing history.
Load, reset and non-season mode changes clear the transient result. Existing
rivalry choices, practice, contracts, coaching and season reviews keep their
own flows. No simulation balance, save schema, completion scoring, sport data,
Front Office or Soccer Career changes belong to this round.

The pure usCareerDecisionOutcome formatter imports career types only. The
shared CareerDecisionOutcome component consumes formatted data. UsCareerBoard
owns application and navigation. No new facts, dialogue, rewards or forecasts
are generated for the result.

## Verification contract

Use the real four-sport board bindings and actual engine choices. Check capped
health and rating changes, reductions, zero and missing fields, team transfers,
salary versus earnings versus cash, and contract years. Exercise more than four
changes, an unchanged result and a second ordinary event after Continue.

Compare saved career bytes and random draw order against an independently
applied original event. Rapid repeated choices must apply once. Continue and
view expansion must cause no writes, draws, completion calls or extra seasons.
Reload must keep the applied career without offering the same outcome again.
Retain an independent existing retirement or rivalry baseline for source controls.

Native checks use 320 and 390 phones plus 1280 by 720 mouse and keyboard, both
themes and reduced motion. Capture the result before a driver scrolls to its
controls. The event title, chosen option, initial changes and Continue should be
visible together, with full names and no horizontal page overflow. Expanded
details must be reachable and keep focus on their control. Returning to the hub
must focus a visible season action. Every geometry and state guard requires an
effective negative control and restored positive check.

## Status

Product source is awaiting independent static review and remote verification.
No runtime acceptance or publication is claimed. Root owns Git, CI, integration
and release receipts. No local test, build, browser, install or database probe
was run for this implementation.
