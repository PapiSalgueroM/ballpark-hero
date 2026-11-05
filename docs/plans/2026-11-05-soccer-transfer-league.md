# Preferred league in Soccer Career transfer briefs

SC-11 partially calls for an agent brief with acceptable leagues. This slice adds one optional league to the existing priority and projected appearance minimum. It creates no new league, real sports fact, random-call site or contract promise.

Base: main1acb33005073be70ba5aae0285ece5537f390f9a. The canonical master remains DoUKnowBall_Game_Expansion_Masterplan.txt, 444117 bytes, SHA256 fda0f7eef07d41f2ba91e89dff3542fef98cd3bd9aabcbe02f70b649797d357a. The existing historical-entry PR504 owns different files and stays separate.

1. Capture original behavior with real constructor/search/acceptance/codec and mounted AgentBrief tests. Verify named missing-feature AssertionErrors and preservation passes remotely before implementation.
2. Add optional preferredLeague to the existing v1 brief. Undefined setter/draft arguments preserve the held selection; null means Any; malformed saved values are preserved and refused. Derive options from eligible next-season clubs, then intersect league, appearance minimum and existing priority. An unavailable league remains visible with zero matches and cannot consume a request or draw. Validate a saved offered club against the selected league.
3. Add one accessible draft dropdown, saved summary, unavailable explanation and worked help example. Existing Back, Escape, focus and no-write preview behavior remain.
4. Prove fixed/original/restored outcomes and actual changed-source controls for filtering, empty refusal and mismatched receipts. Run proper app types and existing transfer suites. Build normally, retain current caps and all rebuilt-output readers, then inspect the actual route at 320/390/1280 with offline fixtures.

Production surface: soccerCareerTransferBrief.ts, AgentBrief.tsx, and the engine preview signature plus early empty-pool guard. Page, save codec, data, coefficients and dependencies stay held. Permanent regression source is soccerTransferLeaguePreference.test.tsx. Temporary workflows and controllers do not belong in the final application PR.

Review focus: exact legacy Any state/draw equality; league before level ranking; home as intersection; invalid and unavailable values fail closed; saved result cannot point off-league. These are explicit test cases. Current broader suite/historical transfer-harness failures must be reported rather than treated as passing. Publication belongs to the release owner after combined source/budget qualification.

Status: claimed, original-first qualification being prepared. No implementation or runtime credit yet.
