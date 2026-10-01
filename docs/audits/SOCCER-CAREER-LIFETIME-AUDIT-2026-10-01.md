# Soccer retirement continuation review, 2026-10-01

**SIM-05, P1: Keep Playing loses the season already advanced by the retirement prompt.**

Actual URL: https://douknowball.com/soccer-career. Final published entry `/assets/index-E8L0RxXO.js`.

This is an independent read-only review of the parent agent's original native career receipts. The first run created a real unseeded age16 career and reached age25. The final run restored exactly that observed save in a new disposable browser, then made 175 additional native clicks to age45 retirement. No new game replay, engine probe, fabricated state or game modification was used for this review.

## Reproduction and result

1. Play until Next Season opens the retirement suggestion.
2. Choose Not Done Yet: Keep Playing.
3. Advance again and compare age with timeline rows.

At steps166 through173, four Next Season and Keep Playing pairs advanced age40 to44 while seasonCount stayed23. At step174, age45 forced retirement appended only a retired row, taking the count to24. Earlier identical prompt/decline pairs consumed ages33 and37. The final record contains no rows for ages33,37,41,42,43 or44.

The career begins at age16 in2025. Its final age45 row is dated2048 rather than2054, so the age and calendar have drifted by six years. Young Africans, the last club joined, has only the final retired row and no playing season in this trail.

Expected: declining the prompt continues the deferred season without spending a second age year. A deliberate skipped year should have an explicit timeline record and aligned calendar. Actual: the decline returns to playing but the next advance increments age again and can prompt again, so continuing silently consumes playable years.

## Cause and exclusions

`src/lib/soccerCareerEngine.ts:4720` increments age before retirement checks. Suggestion branches at4905 and4911 return before season generation at4915 and record append at5224. `declineRetirementSuggestion` at7672 only appends the decision event and changes phase to playing. The native callback at `src/pages/SoccerCareer.tsx:1011` delegates directly to it. The generated season year at engine3850 uses the last recorded year plus one, allowing calendar drift when age advances without a record.

This is not an injury-stat omission. Every missing age matches a retirement prompt followed by Keep Playing. The intentional age39 PED ban is present as a zero-appearance season and is excluded. Forced retirement at45 is also intentional; losing the intervening continuing seasons is the defect. The earlier Striker selector timeout and World Cup panel ping-pong were driver limitations, not findings.

P1 is suggested because it silently loses progression and season history in the flagship game's main career flow. Exact repeated-prompt timing is random; six losses were observed here, not asserted for every career. Specific missing salary, injury or match totals were not measured and are not claimed. No evidence supports treating these absent rows as an intended skipped season.

Evidence: `soccer-full-career-before-return.json`, `soccer-full-career-final.json` and `retirement-skip-review.json` in this directory. The JSON retains all six prompt/decline pairs, the late nine-action trail, calendar arithmetic, exact reviewed source lines and unchanged input hashes. No existing report or product file was altered.
