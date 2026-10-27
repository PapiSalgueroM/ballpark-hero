# Soccer Career coaching start, design and test contract

Source-only next round. Main is still b20ec6664df9d4c58d63ea0596791d33b2a3b8fc (Root verified22:49). Owned page overlays use I12c1b2cd001f9309a31a887e5c432ca63c373852; current qualified Loyalty application is unchanged by final d272 QA/docs. No product body is authored here.

Two grounded options:
1. Selected: an optional first-manager-club chooser linked to recorded coaching coursework. This adds a concrete destination decision and connects an existing late-playing choice to retirement without tuning the season engine.
2. Later: a saved manager-season remit. The current ManagerPanel mainly shows results/job offers and advance/end actions. A remit would add recurring decisions, but requires new consequences and balance work in advanceManagerSeason. Keep it out of this round.

Life270 starts coursework. Life630 sets lifeFlags.coachingBadges=3 after either reviewing match analysis or finishing a youth-session plan; this is not proof of a licence. Values1/2/4 mean started/declined/left. Existing skill/integrity rewards and both events remain unchanged. Source Life592170d7967162d9967e3cf13e22333afb840732:941-967. Existing generated mentorship is already persistent and is not another system to add.

The existing Become a Manager action stays byte-for-byte and keeps its usual starter pool. choosePostRetirement(prev,choice,clubs,ownerClub?) at I Engine8786-8843 filters tier>=3 and picks once. pick at2583 consumes one Math.random call. Tier means club strength/level, not division: tier3 includes solid domestic clubs and generated tier4 clubs exist in multiple divisions. No division, pay, licence, stronger-job or predicted-success claim will be added.

The optional button is Use coaching coursework in both RetirementCeremonyCard (I Page2985-3090) and direct PostRetirementCard (3093-3112). It opens one small lazy chooser with Back and existing club-name/country/club-level facts. At most a small deterministic shortlist from the same current eligible starter pool is shown. Existing season-aware league presentation owns any league caption. No factual vacancy or interview quote is invented. The decision changes the actual starting club and its existing simulation context; no wage, reputation or match bonus is granted.

Eligibility: retired===true; phase retirement_ceremony or post_retirement; no existing managerState or previously chosen manager career; a plain lifeFlags object with exact numeric coachingBadges===3. Absent/malformed optional data only removes the extra route and never blocks the ordinary manager action. No old-save migration, new ledger or automatic job improvement. The resulting existing ManagerState persists the selected club.

Proposed new pure API:
- coachingStartChoices(current:CareerState,clubs:readonly ClubData[]):readonly CoachingStartQuote[]
- startCoachingAppointment(current:CareerState,clubs:readonly ClubData[],request:CoachingStartQuote):CareerState
Quotes bind current first-entry identity/phase/coursework and a unique current ClubData.id plus its actual offered fields. Recompute membership at accept. Resolve the actual current club from the supplied current pool; do not trust request club data. Invalid/stale/empty/duplicate/ambiguous requests return the same state and consume zero draws.
A valid accept delegates to canonical choosePostRetirement(current,"manager",[resolvedClub]). This keeps the existing one draw and all league/year initialization. New helper/panel only, no engine edit.

The chooser preloads loadManagerMarket in its mounted effect; Start stays disabled until ready and Back cleanup stops continuation. No deferred domain mutation. The new synchronous page callback reads current state through setCareer(current=>validatedStart(...)); never copy the old handler's captured-career-after-await pattern. Tests must cover save replacement while loading, Back/release and repeat taps. The original handlePostRetirement at I Page1343-1353 remains unchanged.

First QA packet:4 actual-source consumer cases, no new product/helper import. A remote esbuild observer appends only exports for the two real retirement cards to the actual qualified page, retains that full observer body/metafile and runs RTL in existing Vitest. Two reviewed-course cases require the new button to open the chooser. Actual old cards should fail only at that missing behavior. Two ordinary-manager cases invoke the canonical existing engine and require full typed/raw state, input purity, one draw and exact next draw. Expected baseline:2 owned RED,2 preservation PASS. Missing imports, collection/setup errors or other failures give no RED credit.

Before product: Root runs/adopts this exact baseline evidence. Then author pure helper tests for strict eligibility/current lookup/no mutation/draw0 invalids/singleton full initialization/save reload, and UI tests for ready/back/stale-save/doubletap/focus. Physical source faults must defeat those guards with independent preservation and actual restored reruns. Current default first-entry/save/RNG comparisons remain exact. Real app types, scoped build, all15 readers/caps and actual retirement UI widths remain owed before feature qualification.

New source claims after baseline: src/lib/soccerCareerCoachingStart.ts; src/components/soccer-career/CoachingStartChooser.tsx; focused new tests/sim; literal Page callback and two card hunks only. Page belongs to I/current Loyalty and may intersect J, so compose against actual target, never replace it. No engine, Life, Programme, Phone, sports data, score or other product change.
