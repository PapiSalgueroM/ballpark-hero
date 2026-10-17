# Round1399: full-season completion test headroom

Status: source candidate. Actual remote results pending.

Frozen source: a5b0e7675068525235883124a9947f656061a752 on release-bi-gate. This source includes the real1508 old-career adoption merge and the joined1081 manifest retake. It does not include root's urgent308, account loading or guides by assumption.

finish-BIJ.md section8 and section10 item9 documented a specific inherited check failure. The unchanged full-season hook test hits Vitest's default5000ms limit under20busy Node workers, while its assertions pass with300000ms. Its shorter match test passes. This is an allocation for an integration test that plays a full season, not evidence of a new gameplay failure.

The only existing-source change is the full-season test's explicit300_000ms argument in src/hooks/useClubManager.test.ts. All assertions, both titles, the800step guard, real hook imports and existing six-control harness remain whole. The single-match test keeps its default timeout. No application, engine, calendar, competition, data, provider, dependency or route-budget bytes change.

The remote proof must observe the exact original/fixed/restored existing tests under one persistent cohort of20busy Node workers. Full JSON reports must distinguish the original season timeout from an assertion or setup error and preserve the passing match test. Three fixed arms must pass both tests. The existing harness and all six controls must still reject their declared regressions. A direct copy of its exact match regression must fail both cases on assertions. No new test oracle, retry or broad timeout option is introduced.

All application runtime remains on GitHub Actions. Actual types, serial build and every required rebuilt-site reader run separately. Generated output belongs to the actual remote source and will be retained as evidence, without copying frozen outputs onto the active release. A successful narrow QA proof will not qualify the full release or publish any packet.

Actual Claude I retains source selection, joined gates, active SoccerCareer/core/tournaments, main and publication. Root makes no local-runtime, browser, production-data or live claim.