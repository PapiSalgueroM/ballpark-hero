# Round 1082: permanent contract review

## Problem and scope

Soccer Career currently shows an offer's base wage, while acceptance applies
the existing agent multiplier and rounds it. The offer card also treats the
raw pay-cut flag as final pay. Players need to see the terms they will actually
sign, compare a genuine current deal, and back out before accepting.

Pinned main: 94b9490dde4cc2b4d59c4551a1aa9d31eb0806d8.
Pinned tree: 634bdd573633cdc76e2ffa1259c7e8d9678c7e68.
Own branch: codex/soccer-transfer-review-1082.

## Behavior

Each permanent offer opens a compact review. It shows rounded agent-adjusted
weekly pay, contract years, current pay and years when that contract exists,
and the actual weekly difference. First contracts, expired contracts and
released players have no current deal available to stay on. A loan player's
existing contract belongs to the parent club. Missing squad data is explicit.

Recorded squad fit uses the existing club, next season, position and rating
lookup. It is a rating comparison and does not promise starts. A reopenable
worked example explains the wage comparison. Back and Escape leave the offer
untouched and restore focus. Only Sign contract invokes the existing page's
acceptance handler, with a synchronous guard against duplicate clicks.

The new review does not show a numerical appearance forecast. The existing
projectLeagueApps function describes a base-38 simulation band. Later phone
standing and frozen-out state affect appearances, prior spells count toward
club tenure, and the band is not rescaled to historical league size. This is
a pre-existing limitation, recorded here without changing engine behavior or
the older transfer-window and loan projections.

Loans, negotiation, signing events, fees, money, save repair and Claude's six
Season Centre integration hunks remain unchanged. No new sports data or assets
are introduced. The original career browser driver gains review and signing
actions, with every existing assertion preserved. Its full campaign walk is
not credited as executed by this round.

## Verification

Preparation and diagnostic runs retained a290px movement on the320px dream
offer. Scroll had changed before first pointerdown and before React focus;
the old sibling action row made a352px layout viewport on the320px screen.
A bounded trial wraps the Stay/Wait actions inside equal grid columns with
44px minimum height. The driver and strict1px no-jump requirement stay intact.
Remote rerun must establish whether this corrects the observed failure.

All application execution happens in remote GitHub Actions. Before import,
outcome workers freeze time and install counted deterministic RNG, storage and
transport guards. Engine-generated careers and offers supply the baselines;
every staged fixture field is declared. Retain full before/after values,
signing states, RNG state, storage operations, emitted bundles and copied faults.
Each fault must change executable source and fail its mapped AssertionError,
with an independent healthy unchanged signing baseline and held source hashes.

The native proof uses the actual built /soccer-career route and its real
acceptance handler. Retain first-contract, current-contract and released
legacy journeys at 320px touch dark, 390px touch light and desktop keyboard,
including Back, focus, help, signature, persistence and reload. Measure actual
rectangles and fonts, inspect screenshots, and restore every effective DOM
fault. Cache the actual template font sheet/files and club-country flag payloads
before the guarded browser. Forward no external request, write or scored game.

Run the actual application type gate and build, relevant unchanged career,
loan, squad, historical-league, recovery and currency regressions, then all
20 source/built readers. Runtime output establishes measured counts; authored
coverage counts are not accepted evidence before execution.

## Delivery

Draft PR and separate exact-head final CI acceptance before READY. Do not merge
or publish. Claude owns release and the league/data lanes. No local runtime,
production database probe, paid resource or root source/stash change. Final
receipts stay in the external Codex handoff and the two permitted root notes.
