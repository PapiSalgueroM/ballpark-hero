# Club Manager shootout report qualification, 2026-10-27

Default shootouts now provide the existing match report with the penalty score and every recorded taker's scored, saved or missed kick. The engine preserves the original winner and global random stream, accepts only a complete matching shootout record from a bounded detached stream, and keeps explicit taker orders and old saves unchanged.

## Engine qualification

Application source33632bdfd48d418f31890fca12d802e768995ef0 passed run40450183759/a1. Evidence includes159 actual match state/random-stream preservation cases,10 effective output controls,7 focused cases,1 actual simulation-to-list rendering case,4 engine source faults,13 legacy controls, the real application type gate, build:seo,15 rebuilt-site readers and15 unchanged download caps. The complete app unit suite at this source passed9632 cases with58 skips (648 files passed,2 skipped). This full-suite result precedes the two display-class changes below.

The historical comparison retains raw reports and removes only validated new default kick detail plus the exact new score suffix. It is bound to immutable main b20ec6664df9d4c58d63ea0596791d33b2a3b8fc and needs Owner I's combined-target reconciliation.

## Display qualification

Wider automatic PR checks exposed two previously unreached default-shootout blocks aligned to the left. The display fix changes only two classes in ShootoutKicks.tsx: text-left becomes text-center and the player-name group gains justify-center. Scores, names, outcomes, report props and simulation results are held.

Source1c58b41e2cc956c2d5a793ec1ce7d6a715e36c32 (tree df3ed038ed6dcc2dd085191fb629f713c2fbfc80) passed run40468296993/a1/job122068956609:

- Real app types and12 focused cases across3 files passed.
- The unchanged original MatchScreen harness reached the actual Everton/Derby County and Ajax/Utrecht penalty fixtures. Baseline had exactly2 section4 failures, fixed had0, the two-class inverse restored exactly2, and the b20 engine with no default kick list passed. Captured fixture props were preserved and inverse HTML restored the original output.
- Seven effective MatchScreen controls and five effective LiveMatch controls passed their rejection/restoration checks. The separate old nooppsubs control refused its moved anchor before and after, with identical logs; no control credit is claimed for it.
- The real MatchReportCard mounted in a p-4 component frame with production CSS and fonts passed6 layouts at320/390/1280 and6 class inverses. Parent actually viewed4 selected screenshots, including the left-aligned control. An independent peer actually viewed the remaining3 screenshots. All7 views were readable with no visible overlap. Independent native admission28888bdeb91695e3d3d65120f4a380d4cbbf3b376839d32285fe7713cc80a82c confirms103 archive bodies,4265 selected source-manifest checks, all phase/fixture/inverse results,15 readers and unchanged caps.
- The scoped build, all15 rebuilt-site readers, all15 unchanged download caps and tracked-source holds passed. Generated output differed only in the sitemap generator comment date; no generated page or ledger adoption is included.

This browser proof covers the actual component frame. It does not claim the full Club Manager route, hook, navigation or persistence.

The final original artifact12718085541 is37996284bytes, SHA25609c7f28db860dfe686ff2ee4eceb9a0494eae0d8c725320f6a1d0c2999cc268d. It was acquired once; native body hashes preceded JSON admission. First attempt40466025200 failed before browser DOM navigation because the route fulfillment body used Uint8Array. The selected helper converts that same bundle to Buffer and adds request traces. Assertions, geometry thresholds, fixture props, product code and actual bundle bytes were held. That original failure is retained.

## Save-control correction and integration limits

The chain also includes the separately qualified Match Plans persistence negative-control repair. It changes only the stale save-control source anchor to the real saveCareer(c) line, with a true result substitute. Run40458115939 passed13 normal cases,34 physical source faults,35 integrity records and full tracked-source holds. No product hook behavior changed.

Six additional automatic PR workflows failed on the prior b32 head. Their originals and exact classifications are retained in the continuation handoff: old whole-source fences, historical fixture mismatches, a stale save-control anchor and the two real alignment failures above. The scoped fixes do not turn those frozen results into passes. A combined current-target gate is still required.

Owner I retains protected composition, main and publication. Historical reports are not rebuilt. Exhaustion retains the original winner without inventing kicks. No main merge, complete simulation/browser suite or live result is claimed.
