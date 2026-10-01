# Shared product and live render audit

Read-only audit on 2026-10-01. Live entry `/assets/index-Bj5VrkKR.js`, SHA256 `6eced98c8c90fd858df03d786ad4d821044e4849abd2b0bc5376bee437a55051`. Replays also used root's clean 4930 baseline 8542bf83. Draft 842 copy was excluded.

Coverage: 170 live sitemap pages plus 4 utility/fallback routes, all 174 mounted at 320 x 844. No observed horizontal overflow, page exceptions or loaded-asset 404. No sitemap noindex, duplicate descriptions or malformed raw JSON-LD found. Ad/analytics attempts and all unapproved non-GET methods were blocked before transmission.

## P2: Skip to main content has no destination on 19 routes

URL: https://douknowball.com/free-kick

Steps: Load /free-kick at 320px with Essential only. Focus the first Skip to main content link and press Enter. Press Tab and inspect focus.

Expected: Enter moves keyboard focus to the main content landmark.

Actual: No #dukb-main exists. Enter adds the hash but leaves focus on the skip link. Next Tab goes to the DoUKnowBall nav link. The same native path on /footle focuses MAIN#dukb-main.

Possible cause: App.tsx mounts a global href="#dukb-main", but these bespoke pages do not assign that ID to their main content.

Evidence: shared-coverage-final.json, shared-verified.json, shared-skip-live-free-kick.png.

17 public game routes, reset-password and the tested404 route. Only free-kick was keyboard replayed; target absence was measured on all 19.

## P2: Closing account dialogs loses the keyboard opener

URL: https://douknowball.com/

Steps: Open Log In from the header. Press Escape and wait 400ms for the dialog to unmount. Repeat with Sign Up.

Expected: Closing returns focus to the connected Log In or Sign Up button that opened the dialog.

Actual: Both dialogs unmount, but document.activeElement becomes BODY instead of the opener. Footle help closes back onto its How to play control in the independent comparison.

Possible cause: Header controls open AuthModal manually and AuthModal does not retain an opener or use a DialogTrigger return-focus target.

Evidence: shared-verified.json.

## P2: Signup incorrectly says guest points and rank do not count

URL: https://douknowball.com/

Steps: Visit while signed out. Open Sign Up in the header. Compare its description with /leaderboard while still signed out.

Expected: Account copy accurately distinguishes guest play and local progress from account-linked storage.

Actual: Signup says "Streaks, points and world rank only count once you have an account." The live guest leaderboard instead explains that no account is needed and shows a generated guest handle. recordCompletion books the guest row and local streak before checking for an authenticated session.

Possible cause: AuthModal description predates the guest-first completion and streak implementation.

Evidence: shared-verified.json, shared-controls.json, shared-signup-live.png.

No score was submitted. The accounting claim is corroborated by the actual helper source and live signed-out leaderboard wording.

## P3: Visible cookie choices cannot receive Tab focus while initial help is open

URL: https://douknowball.com/footle

Steps: Use a fresh browser context with no cookie choice and open /footle. Press Tab 12 times and Shift+Tab 6 times. Dismiss help with Escape and observe the pending banner and next keyboard stops.

Expected: The visible cookie choice controls can be reached and operated from the keyboard in the initial page state.

Actual: Every tested Tab and Shift+Tab cycles between Let's Play and Close inside the help modal. Neither cookie button receives focus although both are pointer-hit-testable and not aria-hidden. After closing help, focus returns to game controls while the pending banner remains; it does not take focus again.

Possible cause: The cookie region is a sibling portal outside the modal focus trap. Its initial focus is superseded by the help dialog; the aria-hidden/pointer workaround does not make it part of the trap.

Evidence: shared-replays.json, shared-verified.json, shared-controls.json.

Escape closes the help, after which the banner remains available further along the normal tab order. This is a keyboard usability defect, not a proven Google consent-policy breach.

## Healthy observations and limits

- Native ArrowDown/Enter opens an actual result; footer Search Games clears the URL query and field.
- Today, 7 Days, 30 Days and All-Time loaded through allowed actual read-only RPCs; no 500 observed.
- Undecided/Essential only: no vendor attempts or ad slots. Accept on Footle: exactly one GA attempt, one AdSense attempt, one manual slot and one queued ad with nonpersonalized flag 1. Cookie choices reload plus Essential only removes scripts/slots/queue.
- Profile,reset,search and404 have no deliberate ad slot or AdSense script with stored Accept.
- All 170 sitemap pages have one raw and mounted canonical, no applicable noindex and no observed duplicate descriptions. All raw JSON-LD scripts parse.
- All 174 actual mounted pages had 0px horizontal overflow, no pageerror and no observed asset 404.

- Initial coverage blocked all non-GET methods except verified read-only global_leaderboard/global_rank RPCs. That also blocked the read-only most_played_today RPC on home; it is not classified as a mutation or site failure. No home popularity claim is credited.
- Four first-pass DOMContentLoaded timeouts were healthy on sequential commit-ready retry. Two wrong-case TEMP locators were corrected and replayed. None is a defect.
- Ad and analytics scripts were aborted before network transmission. Their attempted loads were counted. Actual ad rendering, account settings,regional CMP behavior and Google approval are not verified.
- No account credentials, score, report, signup or reset-email submission. No games played to completion in this lane.
- Unknown path returns 200 before React, then removes canonical and sets noindex. This known host fallback behavior is recorded rather than mislabeled as an indexable 404.
- The signed-out /profile redirect to home is intentional and is not a canonical mismatch defect.
- Raw home explanatory copy differs from the React catalog. The mounted home still has substantial original content; a word-count or difference alone is not a verified low-value-content violation.

All owned browser contexts and browsers closed. No server, repository, database, account or publication changes. Full per-route evidence is in shared-coverage-final.json.

