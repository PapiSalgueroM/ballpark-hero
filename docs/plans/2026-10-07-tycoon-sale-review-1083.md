# Round 1083: review selling a ground and keep refused sales intact

## Problem and scope

Selling up currently resets the ground immediately. The button quotes a flat
income increase without explaining starting cash, legacy points or the reset.
The existing hook also commits the new ground when saving throws, so a refused
sale can disappear on reload. This round gives the player a review and commits
the sale only after its save succeeds.

Own managed branch: codex/tycoon-sale-review-1083.
Parent READY1080: 4fed0eefb92fc932531f34631dd731dd849337b8.
Parent tree: 6b4b2320bde4c76b3959d21e42f5d52d828d5efb.
Depends on PR168. This is a stacked candidate, not latest-main integration.

## Behavior

The existing Sell up button opens a compact review. Live engine helpers provide
legacy points, new ground cash including Rolling Investment, and the reputation
multiplier before and after selling. Copy explains current cash and earnings,
fans, upgrades, staff, division, match, table, streak, boosts and ticket reset.
Club name, reputation, legacy balance and perks, badges, titles and career
records carry over. Academy, first team, gems and gear use separate storage.

Back, Escape and close leave the sale untouched and restore focus. A worked
example can be reopened from the help button. The actual match keeps running;
the review follows promotions and perk purchases instead of freezing terms.
One guarded Sell and restart action uses the latest existing hook state.

The narrow doPrestige change writes the complete serialized next ground first.
An ineligible sale returns false without writing. A refused save returns false
without changing the current state/ref. The open review reports the refusal
and lets the player retry against the latest running ground. Success updates
the ref before React state so same-task pagehide retains the sold ground.
Engine, coefficients, schema, ticket policy, Academy and rewards remain held.

## Verification and limits

Application execution is remote GitHub Actions only. Twelve authored mounted
cases cover the actual page, actual hook and isolated review boundary. Twenty-two
source-copy faults must each change executable code, retain a changed complete
comparison and fail one mapped AssertionError. Each run also holds an independent
unchanged upgrade purchase baseline. Retain actual transformed input/output,
copies, configs, raw reports, logs, full state/save/RNG observations and hashes.

Native proof uses the full built /stadium-tycoon route in six authored journeys:
first and late grounds at 320px touch dark, 390px touch light and desktop keyboard.
Each review page has an equal-clock no-review page with equivalent foreground
visibility and timers. Fifteen authored restored DOM faults challenge actual
award, cash, multiplier, readable text and reachable confirmation measurements.
Use actual engine promotion and full sale/serialize results. Retain real match
reward changes rather than claiming no writes while the game is running.
Academy bytes stay held without mounting a first team; gems and owned gear are
held across the sale, refusal and retry operations. These are emulated Chromium
profiles and controlled fixtures, not physical devices or a full campaign.

Prefetch only the actual template font sheet and its font payloads. Browser
requests are intercepted locally; no external write or scored game is forwarded.
Run the proper app type gate, build, parent ticket outcomes/controls, original
tycoon regressions and load/save controls, then all twenty source/built readers.
Retain actual installed versions and package/lock bytes through every runner.

Original playLegacy gains only the final review navigation. Its full original
walk is not credited as executed here. Original simTycoonLoads changes only
the exact REF_FIRST_PRESTIGE source anchor to bind its existing updater fault
to the revised function. The fault, assertions, fixtures and mappings remain
unchanged. All authored counts await measured remote output and artifact audit.

## Delivery

Draft stacked PR, independent review and final exact-head remote acceptance
before READY. Do not merge or publish. Claude keeps main, release and sports
data lanes. Root source, seven stashes and other candidates remain untouched.
Final evidence goes in external Codex handoff and the two permitted root notes.
