# Rarity Round crowd panel ownership

The crowd panel can receive a previous category's answers after Next round. The current result and score are committed before the crowd read. This round scopes the fix to which response may populate the visible crowd panel.

## Reproduce on the original Page

- Use the real Daily category picker, pool ranker, autocomplete, Lock in answer and Next round. Freeze the date and intercept the SDK with fictional players in two distinct position categories.
- Hold both crowd responses. Deliver the old response while the new one is pending. Verify the new result and subtotal, then deliver the new response and retain the normal panel.
- Repeat with the new response first. Verify its rows and counts, then deliver the old response and check that the new panel remains the same.
- Require the two exact ownership failures on the original Page and preserve complete request, result and panel evidence before any Page change.

## Qualify the fix

- Invalidate obsolete reveal ownership on public round transitions. Preserve accepted answers, ranks, scores, normalization and the existing request and persistence shapes.
- Run the same test bytes on fixed, original and restored source. Verify the full build, applicable readers, route limits and local Chromium journeys before the clean source and build comparison.
- Open a draft only after the independent evidence and exact product file review. Keep merge and publish held.

The candidate is based on draft PR536 at `b74ad1c3f44582c04d64ffe34f10541185423475`. [Active entry preflight](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/42364767384)
