# NHL roster-limit recovery

Affected URL: `/nhl-front-office`.

Two accepted pick trades, four actual draft selections and the existing
offseason can leave Boston with 17 players. The simulation limit is 15.
The pre-fix Board still enabled Play Round 1 and advanced with all 17.
This was reproduced from actual engine actions, without fabricated player
ratings, salaries or a roster-count override.

Seven narrow Board changes add the actual roster overage, a working Open
roster button, a disabled Play button and a matching handler guard. A
player must use the existing waiver confirmation before returning to play.
The warning changes from two cuts to one cut, then disappears at 15.
Open roster, Waive, Keep and both confirmation buttons have 44px minimum
height. Actual release, dead-money, re-sign and contributor logic is held.

The four source outcomes cover 17-player feedback, refusal without save or
RNG consumption, two real waivers with dead money and refresh recovery,
and an ordinary playable roster against the unchanged engine baseline.
The exact physically captured pre-fix Board rejects three cases and holds
the ordinary case. Five effective controls remove the handler guard,
disable binding, correct count, roster callback and actual release. Each
rejects its exact expected cases. All seven modes execute 28 cases.

The final harness pins immutable pre968 commit `75c57949`. Only that
reference literal changed after the accepted candidate proofs. Applied
Board SHA-256 is `d5508ec9b5d39dd1d9fbbe0e1222c25761e6432f35c1de68ea8234c21f885317`.
Independent review verified exact candidate, test and unchanged engine
bytes and the physically committed reference. No historical sports data
or CPU roster policy changes are included. Contributor proof covers the
automatic selection; manual preferences are not separately tested here.

The real app type check and build pass. All 17 built, search and guide
checks pass, along with seven of eight related NHL test families. The
shared 36-case NFL/NHL save suite remains unresolved: three bounded
attempts reached its original 120-second process deadline. No partial
test run is counted as a pass.

A separate diagnostic retained all 36 results: 13 passed and 23 failed,
with test deadline stack traces. It also showed 11 workers for one file.
The harness now requests one worker and no file parallelism. Its cases,
assertions, controls, per-test limits and 120-second deadline are held.
That attempt also timed out. The worker change reduces process demand;
it has not been demonstrated to resolve the save-suite failure.

Three private browser paths at 1440px desktop keyboard, 390px touch and
320px touch with reduced motion pass 352 checks and 12 screenshots.
They cover 17 to 16 to 15 players, cancellation, actual waiver costs,
exact refresh saves and the resumed next round against the real engine.
All 33 user actions use native keyboard or touch. Three extra direct
React callback probes test refusal and are reported separately.
No console errors, outside requests or horizontal overflow were observed.
The owned browser, contexts and loopback host were closed afterward.

Earlier failed search timing, rating test deadline and native selector
setup attempts remain uncredited. The first two passed unchanged replays;
the selector correction changed only the disposable browser driver.

This commit is a tested implementation checkpoint. Final release
acceptance still requires the shared save gate and pinned pre-fix replay.
Claude owns the merged-tree release gate and publication. Publication
and AdSense approval are not claimed.

Evidence held locally:

- TEMP/dukb-nhl-roster-limit-scout-2026-10-02/verified-report.json
- TEMP/dukb-nhl968-proof-rMev25/verified-summary.json
- TEMP/dukb-nhl968-parent-gate-2026-10-02/input-receipt.json
- TEMP/dukb-drafts939966967-clean-gate-2026-10-02/pre968-acceptance-snapshot

This is a simulated roster-management recovery path. It does not prove a
full native season, complete management depth, historical data accuracy,
financial balance or behavior on the published website.
