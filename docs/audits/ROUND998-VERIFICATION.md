# Round998 verification and publication handoff

2026-10-03. Rugby League challenge is verified in PR113, ready for integration.
It is not merged or live. Publish and verify the already accepted Round997
Shot lab before adding another unpublished feature to main.

PR: https://github.com/PapiSalgueroM/ballpark-hero/pull/113

Tested head: 31ce1b24c6d709a7bdd04516eb3d9f2392e34064.
Remote run: https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/37122811601
Job:111202126568. The PR merge checkout was
f372f2df41928e093517330220cca71879e91f2f. Both commits have identical tree
1b4b0dd9bc2ca20844a1ff833a891bd148eafc70.

## Visible result

Champ or Not now offers a dedicated Rugby League mode with ten alternating
premiership and Dally M claims, a factual worked example, explicit winner
reveals, category scores and replay. The original Daily and Unlimited hook
stays mounted; switching away and back retains pending decisions. The challenge
has no leaderboard or completion reward and no durable save. History is bounded
through 2025. Missing banks produce a retry state. A two-line scheduler guard
also prevents the original game freezing when only one competition loads.

The first green run did not establish acceptable phone layout. Visual review
found intro and claim context above the viewport after action-only scrolling.
The final active header is smaller, and reveal targets cover complete content.
The final screenshots show the example with Start and each claim with its
winner and Next at 320px and 390px. Desktop dark/light views, results, rules and
replay were also inspected independently. No remaining visual blocker was found.

## Accepted evidence

- Real application type check and production build passed remotely.
- 15 normal model/mounted cases passed, with zero failures or skips.
- 16 copied-source controls each produced exactly one intended assertion
  failure, two independent legacy passes and 12 intentional skips. No runner,
  import or timeout faults earned credit. Eight source/fixture inputs were held
  byte for byte. The finite one-bank wrong-count control failed promptly.
- Both original compatibility gates passed: Champ reveal and scoped no-double
  completion recording. All 17 built readers passed.
- Five native profiles passed:320x780 touch/reduced motion,390x844 touch,
  1440x1000 keyboard,390px missing-bank recovery and1440px light theme.
- Three full runs each returned7/10, with4/5 premiership and3/5 medal results.
  There were31 independently checked claims, including7 shared-winner claims,
  plus3 replay answers,117 positive visibility checks,42 width checks and21
  screenshots. Zero page/console/asset errors, horizontal overflow, protected
  storage writes or score-write attempts were recorded.
- Two native320 scroll controls reproduced the old hidden-context problem:
  intro scroll0 to657 and claim scroll0 to534. Each changed actual geometry,
  failed the exact content visibility assertion, restored scroll0 and passed
  a fresh positive check. These are geometry controls, separate from the16
  source controls. All82 external requests were fulfilled locally in QA.

Coverage uses a two-source-checked historical fixture and existing production
loaders. This is not a production database completeness audit. No production
database probes or changes, local runtime gates, indexing submissions or
AdSense work were performed. Fixture provenance and the design contract are in
the PR's docs/audits/ROUND998-RUGBY-LEAGUE-CHALLENGE.md.

Final artifact11273433102,1847684 bytes, was downloaded and SHA256-verified:
492d2e90eacbbbe4729f426914bbf0a9379d6c181d852f1c00b7f628fcbf8b0e.
Local evidence: C:/Users/antho/AppData/Local/Temp/dukb-rugby998-ci-2026-10-03/31ce1b24/evidence.
User preview: C:/Users/antho/.codex/visualizations/2026/10/03/01a10028-7165-70b1-90e1-1946dd227be4/rugby-league-preview998.png.

## Remaining publication blocker

The existing Lovable project still opened an empty Publish panel after a fresh
reload. Preview and revision history did not initialize. No final publish action
was sent. The direct Lovable plugin was suggested, but it has not been connected
in this chat, and the page exposes no WebMCP publishing action. Do not describe
either997 or998 as live without a host success receipt and public verification.

Keep codex/rugby-league-challenge-998 and its existing worktree for integration
after997 publishes. Claude retains Release Z/988 and separate manager lanes.
Root held drafts and seven stashes are outside this round. Next free999 remains
unclaimed.
