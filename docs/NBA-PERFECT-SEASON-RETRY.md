# NBA Perfect Season retry

This branch addresses a recovery defect found while investigating the category-only report dated 2026-10-11. That report gives no description or progressed game state, so it does not establish the cause of the visitor's bug.

The current error button reloads the document and loses the in-memory draft. The proposed button retries the failed operation in place, retaining picks and mode. A failed reroll keeps its allowance until a usable squad arrives. Starting another mode clears the old index so a failed archive load retries that load instead of spinning the previous mode's wheel.

The change does not alter player data, ratings, eligibility, daily seeds or the season simulation. Tests use explicitly fictional transport fixtures and call the real 82-game simulation.

Verification is remote only. Five component cases cover archive recovery, retained picks, failed rerolls, the two-reroll limit and normal completion. Original-page and targeted removal controls run before the healthy cases. Two built-page journeys at 390 and 1280 pixels exercise the retry and retain original screenshots, document identity, requests and served-file references. Types, existing result tests, the full SEO build and all 15 generated-output readers are also required.

Current status: source preparation, no remote pass or live claim. The release owner retains integration, merge and publication. The complete check results and qualifications belong in the pull request before integration.
