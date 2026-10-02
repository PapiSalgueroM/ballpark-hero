# NFL ratings candidate: financial review, 2026-10-02

This is an offline, preproduction review of the existing `/front-office` engine and the TEMP `refined-finance` candidate. It does not approve the rating model, opening contracts or publication. Contracts, prices, caps after the starting season, player development and game events in these checks are simulation values. All scenario names are fictional. No production code, data, save or database was changed.

Authoritative receipts are in `C:/Users/antho/AppData/Local/Temp/dukb-nfl889-finance-peer-2026-10-02/verified-report.json`, with the executable `check-finance.mjs` and its private engine copies. The reviewed candidate payload is copied there as `candidate-payload.json`; its SHA256 is recorded in the report. The candidate is under revision, so these results apply to that financial snapshot only.

## Verified P1: practice promotion bypasses the cap

The actual `promoteFromPractice` checks practice membership and the 53-player ceiling, then moves the player to the active roster. It never checks affordability. The Board disables Call up only for roster capacity, calls that same function and persists the accepted result.

The verified fixture has 52 active players, a $301.2M league cap and $301.1M already used. Its $18M practice player is deliberately simulated.

| Actual path | Accepted | Cap used afterward | Room afterward | Team strength afterward |
| --- | --- | --- | --- | --- |
| Current practice promotion | Yes | $319.1M | -$17.9M | 77.5, from 70 |
| TEMP candidate practice promotion | Yes | $319.1M | -$17.9M | 77.5, from 70 |
| Current free-agent signing at the same cost | No | $301.1M | $0.1M | Unchanged |
| Private promotion guard prototype | No | $301.1M | $0.1M | Unchanged |

The promoted player occupies the 53rd slot. JSON save/recovery and `ensureFoLeagueIds` retain the negative room and the moved player. The Board's Play guard checks excess headcount, so this 53-player state is not blocked by that guard. This last statement is source evidence, not a browser acceptance result.

The highest practice price in the reviewed candidate snapshot was $9.9M for a simulated DB rating of 88. Using that actual candidate price in the same fixture also succeeds and leaves -$9.8M room. Higher practice prices increase the size of this existing bypass; they do not cause the missing check.

Relevant source:

- `src/lib/frontOffice.ts`: `promoteFromPractice`, `capUsed`, `capRoom`, `signPlayer`.
- `src/components/front-office/FrontOfficeBoard.tsx`: `doPromote`, the practice Call up button and `playWeek`.
- `src/components/front-office/FrontOfficeFullRoster.test.tsx`: existing direct promotion stimulus.

### Smallest proposed production repair

Pass the actual `league.cap` into `promoteFromPractice`. Before either array is changed, refuse when `capRoom(team, cap) < practicePlayer.salary`. Reuse the existing cap calculation so dead money is included. Keep membership and roster-capacity refusals, player identity, salary, contract, saved depth and the accepted move unchanged.

The Board should use the same affordability result for the disabled button and refusal reason, and show the call-up price in readable row text. A title-only price is insufficient feedback on touch screens. Keep the callback, save key and save payload unchanged. Existing over-cap saves should remain recoverable; this repair should prevent new unaffordable promotions rather than silently rewrite them.

The private prototype changes only the function's cap argument and a check before `splice`. It proves the original unaffordable case is rejected without mutation. Independent cases retain affordable promotion, exact equality with the cap, full-roster refusal, missing player refusal, dead-money accounting and repeated-player refusal. The free-agent comparison remains unchanged.

Required production proof should cover the actual Board with a restored near-cap full roster, the visible price/refusal, a rejected click with identical save and depth, an affordable successful click, reload with the exact promoted player, and the existing full-roster/legacy tests. A copied removal of the cap guard must fail the unaffordable case while those positive baselines pass. Update the existing direct test stimulus to pass the real fixture cap without weakening its outcomes. No broader trade or automatic-offseason policy change belongs in this small repair.

## Existing trade policy has a separate cap exception

The actual `proposeTrade` and `executeTalksTrade` accept either available room plus the outgoing salary or the existing `incoming <= outgoing * 1.5 + 5` allowance. They do not require a nonnegative final balance when that allowance applies.

A fictional team using $301.1M trades a $22M player for a $25M player. The actual direct trade is accepted and leaves $304.1M used, or -$2.9M room. Both clubs keep their player counts. This is an existing, explicit simulation policy, not an exploit demonstrated by equal ratings or different opening prices. Its suitability for the advertised NFL cap system needs a separate product/rules review. No conclusion about real NFL trade regulations was made, and the promotion prototype does not change this policy.

## Renewal and future-cap observations

The candidate reuses the existing `salaryFor(position, overall)` curve for expiring contracts. That function has no current or future cap argument. The league raises its simulated cap by five percent each offseason, rounded to whole millions; ordinary renewal, generated depth and free-agent ask prices use the static curve.

A fictional 26-year-old QB rated 93, with a one-year $18.4M deal, is retained by the actual ordinary renewal branch at $30.6M. The league cap moves from $301.2M to $316M. The same quoted curve returns $30.6M for a QB rated 93 in either engine; its result does not scale with a later cap.

The franchise-tag path is distinct: its actual top-five/prior-salary quote refuses a cap overspend without modifying the league. An affordable tag updates the exact payroll delta. Cutting that guaranteed player preserves the full tagged salary as dead money, and the existing same-season re-sign refusal remains active. These positive checks passed.

Cross-team salary variation at the same rating is not, by itself, an exploit. The reviewed candidate preserves each club's original fictional active payroll and allocates it by the existing curve's relative demand above the simulation floors. Consequently, its multiplier differs by team. That allocation is a proposed game-economy choice, not verified player compensation.

## Actual multi-season results

One deterministic four-season run was played for each engine, using seed 1889. Each season ran all 17 regular-season games per club, weekly injuries, actual AI free-agent decisions, all 13 playoff games, championship bookkeeping, actual offseason tags/retirements/renewals/practice refills, and JSON recovery with unchanged payrolls. The GM club was CLE. All loaded scenario names were replaced with explicit simulated names before actions.

| Season just completed | Next cap | Current next average payroll | Candidate next average payroll | Current / candidate clubs over cap after summer |
| --- | --- | --- | --- | --- |
| 2026 | $316M | $166.38M | $167.85M | 0 / 0 |
| 2027 | $332M | $154.75M | $166.33M | 0 / 0 |
| 2028 | $349M | $144.21M | $175.38M | 0 / 0 |
| 2029 | $366M | $140.17M | $181.53M | 0 / 0 |

Neither arm had an over-cap club in its measured weekly states or season-close states. Current weekly AI signing counts were 8, 2, 6 and 15; candidate counts were 7, 3, 10 and 24. Player ratings deliberately affect later development, retention and AI choices, so the later paths are not claimed to use identical random draws or contracts. CPU size trimming also changes individual opening cuts even though the candidate holds each untrimmed opening budget.

These runs do not establish broad financial balance, absence of all exploits, a fair distribution of results or native UI behavior. They do show that the reviewed higher-price snapshot did not bankrupt ordinary AI clubs in these complete runs. The cap-bypass finding comes from its separate adversarial fixture and remains verified.

## Review result

Fifteen offline checks passed. The production NFL engine's raw bytes remained unchanged, and the private candidate engine was independently confirmed to differ from it only in the initial full-roster quote lookup before the guard prototype was made. The bundles contain no Supabase module. No network, database, browser or desktop interaction occurred.

Repair the practice-promotion cap bypass before relying on higher practice prices as a meaningful management constraint. Continue reviewing the rating role model and financial allocation independently. Static renewal pricing and the existing trade exception warrant separate design decisions, not undocumented changes in a rating-data release.

## Round 892 practice-promotion repair

The audit above records the unchanged engine reviewed before this repair. Round 892 separately authorizes a narrow correction on `/front-office`: `promoteFromPractice` now requires the current league cap, refuses invalid cap context and selected practice salaries, and checks the existing cap room including dead money before moving a player. Valid zero salaries and exact cap equality remain accepted. Roster capacity, membership, player identity, depth, feed and save callbacks keep their prior behavior.

The practice-squad board now shows each valid call-up salary, displays the actual cap shortfall and uses the same engine refusal for the disabled button. An invalid saved practice salary displays `Salary unavailable` and remains uncallable. The Call up button gains a 44px minimum height. No rating, contract price, real roster, automatic offseason refill, trade exception or renewal rule changes in this repair.

The original 19-case replay produced 4 independent passes and 15 expected failures. The final 26 cases replayed against physical copies of the original engine and board produced 5 independent passes and 21 expected failures, with no exclusions. The repaired engine and board pass all 26. These checks use the real league constructor, actual saved board, explicitly simulated fixture names and inert recording boundaries. They measure rejected raw team/save bytes, dead money, affordable and exact-cap identity, save restoration, repeated calls, subsequent affordability, invalid restored prices and valid zero-cost calls.

| Executable copied control | Exact failed outcomes | Other outcomes held |
| --- | --- | --- |
| Remove cap-context guard | 5 | 21 |
| Remove affordability refusal | 5 | 21 |
| Remove selected-salary guard | 5 | 21 |
| Exclude dead money from promotion cap room | 2 | 24 |
| Omit the Board's current-cap argument | 2 | 24 |
| Remove visible salary | 3 | 23 |
| Remove visible refusal | 4 | 22 |

Every final control executes all 26 cases with no skips or unhandled errors. Independent free-agent admission, legacy/membership/full-roster refusal, exact affordable/equality identity and zero-cost identity pass in every control. Infinity still fails through affordability when the salary guard is removed, so that row receives no credit for the selected-salary guard. The initial control mapping/classifier attempts are retained separately from accepted final receipts.

The existing full-roster and tag/depth component suites pass 10 cases. The existing roster harness passes 90 checks over all 8 sections, including 50 franchise seasons and 162 old-save league-state comparisons. Its assertions and thresholds remain exact; three promotion calls now provide the current cap, refill attempts stop on refusal, and its existing `promoteover` control binds the moved capacity check. The existing component test changes only its required cap argument. Source preservation also verifies the entire NFL engine outside the promotion block and the accepted Board callback apart from its new cap argument.

The adapted existing `promoteover` control also fires: its sole intended capacity assertion fails when the copied engine allows the 54th player, with 86 other engine checks held. Its prior seven-section control scope and expected nonzero exit remain unchanged; that old harness runs its Board section in normal mode only.

Evidence: `C:/Users/antho/AppData/Local/Temp/dukb-892-promotion-original-2026-10-02/`, including frozen original hashes, original and repaired JSON results, `source-preservation.json`, `final-control-*.log` and the existing harness receipt. This section records offline component and engine acceptance. Native layout, keyboard, touch, production release and any proposed rating payload have separate gates owned by the root reviewer.

### Root clean gate and native status

The final isolated892 source passes the real app type gate, production build,
all15 built-output fences and the promotion/full-roster/cut/save/anchor checks.
The prior wrong-button target-class attempt is retained and uncredited.
Final receipts: `TEMP/dukb-892-clean-gate-2026-10-02/final-input-receipt.json`
and the corresponding final logs. Engine SHA256 is
`e79708b5b68ab1738a085eabea618bc3c1401e2bccd4e6a2067cbc075a44ce80`.

Owned loopback headless Chromium uses the actual Board, engine, save loader
and compiled CSS, fictional fixture players/prices and inert remote-recording
seams. Desktop completed17weekly games and13playoff games in each of two
seasons, draft/summer, accepted promotion, exact reload and restart. Phone390
completed the cap paths and both seasons, then failed because ordinary restart
tap was intercepted by feed paragraphs. Raw run `1790963248620` is retained
with173checks before failure and nine screenshots. It is not a complete native
acceptance. The earlier fresh-team selector failure is also retained. Diagnosis
continues before publication; no force-click workaround is acceptance.
