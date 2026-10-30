# Build Your XI same-side wingback rating proposal

Status: outside-only source proposal. All tests, controls, type checks and sims are UNRUN.

## Source finding

Immutable source is b20ec6664df9d4c58d63ea0596791d33b2a3b8fc. The actual pick gate already admits primary LB at LWB and primary RB at RWB through fitsAllowed. The scoring path is LineupBuilder -> lineupFitSlots -> xiFitBreakdown -> seasonAdjust -> simulateWorldXiSeason. The shared gradeFit sees those two combinations as family and FIT_PENALTY charges2 on that man, averaged across the XI. The same breakdown also labels the player out of place in the page tile. The raw normalizer already recognizes fullback and wingback spellings. No roster addition is needed for this scoring correction, and no live roster query was made.

## Narrow proposal

Change only src/lib/xiFit.ts, scripts/simBuildYourXiFit.mjs and new src/test/xiWingbackFit.test.ts. In xiFitBreakdown, return natural for exactly primary LB at role LWB or primary RB at role RWB. Keep the shared grade call and its old nofit source-control anchor unchanged for every other case. Correct the local fit comment and the one existing harness expected-grade seam to state that Build Your XI exception.

Do not broaden SLOT_ALLOWED_BY_ROLE. Its family expansion could also lower opposite-side costs if LB/RB were inserted into shared allowed lists. positionFit.ts, Club Manager, World XI, hook admission/history, all positions and raw data remain byte-held. Chemistry, balance, simulation and prices for all other grades are unchanged. This packet proves the source delta, not a complete runtime matrix.

## Test first and meaningful controls

The six-case test source was physically frozen before these proposal candidates. It imports actual functions and formation data without mocks, structural DTO casts or a new helper module. Literal loop arrays have explicit TypeScript narrowing assertions. Two positive cases use both actual wingback formations and require0 per-man cost, natural grade and0 roleFit in the season adjustment. Other cases use literal expectations for opposite-side costs, wide-forward boundaries, goalkeepers despite history, existing verified-history acceptance, missing positions, empty slots, nonmutation and unchanged shared admission/grade behavior. This is focused boundary coverage, not every position pair.

Source inspection predicts the two owned markers XI_LEFT_BACK_AT_LWB and XI_RIGHT_BACK_AT_RWB against the old product. No actual RED has been observed. Root must first run the frozen tests against unchanged source, require owned AssertionErrors rather than setup/import failures, then independently review and qualify a separate source fix.

Two proposed source faults each remove exactly one new natural-fit line. Their real changed full-body SHA/Git and positioned inverse are frozen. Later native healthy/changed/restored processes must prove actual0/1/0, the intended owned marker, the other side preserved and exact source restoration. Those outcomes are UNRUN predictions.

The existing simBuildYourXiFit must still run its original controls, prices, measured thresholds, old-report behavior and World XI240-squad digest. Only its one expected-grade seam is adapted. No old threshold or digest is retaken by this proposal.

## Ownership and next qualification

Read-only WORKBOARD search found Root's existing XI page/hook lanes and no separate xiFit-specific active lease. That is not a grant to modify the shared position core. Root is preparing an explicit narrow wingback grading claim before any remote adoption. Owner I keeps protected shared football integration, main merge and publication.

All source is outside the checkout with exclusive fresh writes, full readbacks, bounded leaves and both protected index pins held. No application/parser/compiler/test/browser/Git execution, DB read/write, CI action, dependency change or remote source mutation occurred.
