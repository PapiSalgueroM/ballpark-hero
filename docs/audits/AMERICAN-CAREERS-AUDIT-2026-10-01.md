# American career audit

Audit only. Live entry: https://douknowball.com/assets/index-E8L0RxXO.js. SHA256 640820ed3b9ead81190861c4b061326a372e9c942067b3440d16e5e8cdea2e0b. All four contexts captured the same asset at start and end.

## Route correction

The paths /nba-career, /nfl-career, /baseball-career and /hockey-career are player-guessing games. Existing App routes and game registry identify the create-a-player simulations at the paths tested below.

## Coverage

- NBA: https://douknowball.com/nba-my-career, 390px phone. Six native seasons (2026, 2027, 2028, 2029, 2030, 2031), six offseason choices, second-season reload/resume, manual retirement, retired reload and New career. Raw saves held on both reloads; rapid Enter produced one season.
- NFL: https://douknowball.com/nfl-my-career,390px phone. Six native seasons (2026, 2027, 2028, 2029, 2030, 2031), six offseason choices, second-season reload/resume, manual retirement, retired reload and New career. Raw saves held on both reloads; rapid Enter produced one season.
- MLB: https://douknowball.com/mlb-my-career,390px phone. Six native seasons (2026, 2027, 2028, 2029, 2030, 2031), six offseason choices, second-season reload/resume, manual retirement, retired reload and New career. Raw saves held on both reloads; rapid Enter produced one season.
- NHL: https://douknowball.com/nhl-my-career,390px phone. Six native seasons (2026, 2027, 2028, 2029, 2030, 2031), six offseason choices, second-season reload/resume, manual retirement, retired reload and New career. Raw saves held on both reloads; rapid Enter produced one season.

24 full season decision cycles across four modes, not just initial renders. No runtime errors or HTTP error responses in accepted runs.
No verified defects found in this bounded progression flow.

## Recorded behavior and limits

- Destructive actions: Hang them up now immediately marks the save retired. New career immediately removes the one local save and opens creation. None of the four routes displays a browser or custom cancellation/confirmation dialog for these actions. Cancellation and confirmation cannot be exercised because the current UI does not implement them. This is recorded behavior, not counted as a broken promised feature or a verified defect.
- Creation input: Native text insertion is bounded to 24 characters. Whitespace names intentionally start with a nonempty default fictional name in all four modes. Blank names were not treated as an invalid-name failure because the implemented fallback is explicit.
- NBA initial live load did not mount within 25 seconds and showed only the skip link; a fresh sequential replay completed the same six-season flow successfully. Failed loading evidence is preserved as an audit limit, not a site defect.
- This is one generated prospect/default position and current era per sport, followed through six played seasons and the available manual retirement path. It does not prove natural age-based retirement, every position, historic eras, every event or all optional systems.
- Six real UI season cycles were completed before manual retirement. No engine, progression, clock, RNG, contract or stored-career injection was used.
- Native Space activates creation/decision/retirement/restart controls, pointer clicks play later seasons, and repeated native Enter tests first-season advancement. Full keyboard navigation/focus containment is not claimed.
- Every vendor request and non-GET request was blocked. Real scores, account changes, reports, signups, analytics and ad impressions were not submitted. Remote booking success is not credited.
- Only final new-creation document overflow was measured numerically; no exhaustive geometry/animation matrix is claimed.
- Optional Bank, shop, every inbox reply, free-agency combinations and coaching careers were not exhaustively played. Real-world roster/stat accuracy is outside this lane.

NBA initial loading timeout is preserved separately. The successful sequential retry is the accepted NBA flow.
All owned contexts and browsers are closed. No product edits, Git changes, account writes, impressions or analytics traffic.
