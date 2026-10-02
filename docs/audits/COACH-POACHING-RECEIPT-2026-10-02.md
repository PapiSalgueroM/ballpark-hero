# Shared US coaching poaching repair, Round888

Affected routes: `/nfl-my-career`, `/nba-my-career`, `/mlb-my-career` and
`/nhl-my-career`, in their existing coaching continuation.

The actual engine awarded `poached` reputation before checking whether a new
chair existed. The supported NBA fixture starts a fictional player through
the real constructor, role assignment, six playing seasons and retirement,
then plays coaching seasons. Seed4/year2063 finishes49-33 in Oklahoma City,
with a conference semifinal exit. No new vacancy exists and the same chair
continues, but the original engine changed departure to `poached`, raising
standing from88 to100. This is a simulation reputation defect, not a claim
about a real player's career.

`usCoachCareer.ts` now records the completed season's ordinary departure and
assigns poaching credit only inside the existing actual-target branch. No
random call, job/season/save field, vacancy rule or UI changes. Previously
earned poaching credit remains, as before. Existing saves with phantom credit
are not rewritten by this repair.

Proof:

- Original focused suite: one verified failure and eleven held outcomes.
  Repaired suite:12/12. Ten full transitions compare against an independently
  captured original engine and exact random tapes, with only the reproduced
  departure corrected. Six genuine transfers retain their exact new chair,
  notes, season, credit and random consumption.
- Effective copied controls: phantom1fail/11held, withheld new credit4/8,
  extra random draw6/6. All12 cases execute, no pending/unhandled cases. The
  initial credit-control expectation of six failures was rejected and retained:
  two fixtures already had earned credit, so withholding new credit cannot
  change them. All six original transfer assertions remain unchanged.
- Existing `simUsCoachCareer.mjs` runs400 careers per sport and stays green.
  Source-anchor guard reports572/572. No existing assertions or thresholds
  changed.
- Clean isolated gate from6b898d9e with only these three owned source files:
  real app type0, `npm run build`0, all15 built-site fences and final focused
  poaching harness green. This gate excludes paused drafts and all pending
  NBA/NFL changes.

Permanent proof: `src/lib/usCoachPoaching.test.ts` and
`scripts/simUsCoachPoaching.mjs`. Evidence:
`%TEMP%/dukb-coach888-proof-2026-10-02/verified-summary.json` and
`%TEMP%/dukb-888-offline-gate-2026-10-02`.
The original engine SHA256 is
`e607f294869072f78f63433bfda86f018b845443a6cb580b58c3fd5f3d955879`.
Controls verify executable unique anchors, CRLF compatibility and held raw
source bytes, and remove only their owned temporary copies.

Limit: pure engine/save proof, not a native coaching UI playthrough, data
accuracy audit, production save migration or live deployment. No desktop,
Supabase or live requests. Claude owns publication.887/889 remain in progress.
