# Owner Directives, 2026-08-29

Anthony's final directives, received 2026-08-29 night. These OVERRIDE any
conflicting recommendation in docs/MASTER-BUILD-SPEC-2026-08.md and bind both
lanes. The full text is below the line; the operational mapping first.

**What changes in practice:**

- FREE FOREVER is the business model: no subscriptions, no paid access, no
  pay-to-win, no paid anything user-facing. Revenue is ads and sponsors.
  The spec's mention of premium cosmetics/ad-free (section 133) is overridden.
- ADSENSE REVIEW IS LIVE ("Getting Ready", ads.txt authorized). Until the
  verdict: treat ads.txt, the verification code, canonicals, robots.txt,
  sitemap.xml, production routes, legal pages and navigation as FROZEN except
  for verified fixes. The 15 fences already guard all of these; the added rule
  is judgment: nothing structurally adventurous ships to production mid-review.
- SPONSOR-READY ARCHITECTURE is a new backlog arc: configurable sponsorship
  surfaces (presented-by slots on challenges, tournaments, hubs), admin
  configured, never hard-coded brands, clearly distinguished from gameplay.
  Fictional sponsors inside sims stay fictional per the legal rules.
- The high-risk approval list (deletions of major games, brand, business
  model, payments, domains, user data, auth, destructive migrations, big
  purchases, legal assumptions) matches the standing rule: ask Anthony first.
- The agents coordination files now exist under docs/agents/ as thin, stable
  contracts pointing at the board, which remains the single live task queue
  (creating a second live queue would rot; the board already carries id-like
  round numbers, owner, status, dependencies in prose).
- Metrics guide priority: Lovable analytics is the totals source (GA4
  undercounts, consent-gated). The flagship split already reflects it.

Everything else in the directives (engines not copies, provenance, cost
control, observability, backups, QA definition, growth loops) either already
runs under the standing rules or is on the board as claimable work; the
reconciliation of the master spec applies unchanged.

---

[The owner's directive text follows verbatim.]

1. DOUKNOWBALL MUST REMAIN FREE FOR USERS. The owner does not want to charge
users to access DoUKnowBall. Do not build subscriptions, paid game access,
premium career modes, paid save slots, pay-to-win mechanics, paid leaderboard
advantages, or required purchases. Core gameplay, career modes, simulations,
profiles, saves, leaderboards and normal social features remain free. The
business model: users play for free, corporations fund the platform, through
AdSense and programmatic advertising, direct corporate sponsorships, sponsored
games and tournaments, branded challenges, sport-hub sponsorships, advertising
partnerships, appropriate affiliate or commercial partnerships, and potential
B2B or licensing opportunities. Corporate integrations must never make the
site feel like a giant advertisement. Gameplay quality before ad density.

2. NO REAL-MONEY GAMBLING. No casino, deposits, withdrawals, wagering, sports
betting, or paid loot boxes. Virtual packs, cards, XP, cosmetics and
game-earned currencies are acceptable when they do not represent cash
gambling.

3. ADSENSE IS CURRENTLY UNDER REVIEW. Site review: Getting Ready; ads.txt:
Authorized. Do not destabilize production during review. Protect ads.txt, the
AdSense verification code, domain configuration, canonical tags, robots.txt,
sitemap.xml, production routes, legal pages, navigation. Large architecture
changes are developed and tested safely before production deployment.

4. THE GOOGLE INDEXING PROBLEM IS A P0 ISSUE. Classify every affected URL;
do not chase a zero. Important pages must be 200, crawlable, indexable,
self-canonical where appropriate, internally linked, in the sitemap where
appropriate, render accessible, uniquely titled and described, with useful
content. Distinguish technical fixes from actual Google index status.

5. PRODUCTION SAFETY. Do not use production as the testing environment. Use
branches or worktrees, staging previews, feature flags, backups, rollback
plans, migration testing. Every migration accounts for existing users and
saves. Never destroy old career or dynasty saves to simplify a schema change.

6. TWO CLAUDE AGENTS WORK IN PARALLEL. Parallel independent development, not
duplicated development. Each agent knows what it owns, what the other owns,
the high-risk shared files, current dependencies, what awaits integration.
Maintain docs/agents/AGENT_A.md, AGENT_B.md, HANDOFFS.md, CURRENT_WORK.md.
Separate branches or worktrees whenever possible; never competing edits to
the same major subsystem without deliberate coordination.

7. A SINGLE MASTER TASK QUEUE. Tasks carry id, priority, owner, status,
dependencies, affected subsystems, acceptance criteria. P0 bugs outrank
experimental new games.

8. BUILD ENGINES, NOT COPIES. One career engine, one management engine, one
competition engine, one draft engine, one conquest engine, one profile and
achievement system, configured per sport, never six unrelated copies.

9. SPORTS DATA MUST HAVE PROVENANCE. Source, fetch date, season, confidence,
licensing basis. No scraping random sites for convenience, no random athlete
photos, no assumed rights to logos or likenesses.

10. CONTROL THIRD-PARTY AND API COSTS. Estimate before introducing paid
calls; cache, batch; AI assists presentation, never replaces deterministic
game logic.

11. OBSERVABILITY IS REQUIRED. Frontend and backend errors, save failures,
import failures, live-score freshness, slow requests, database problems,
leaderboard anomalies, broken games, SEO regressions, all visible before a
user has to email about them.

12. BACKUPS. Database, saves, configuration, historical data, and tested
restoration. An untested backup is not proven.

13. SPONSOR-READY ARCHITECTURE. Reusable, tasteful, admin-configurable
sponsorship surfaces; no hard-coded brands; sponsorship clearly distinguished
from gameplay.

14. GROWTH FEATURES ARE PRODUCT FEATURES. Share, challenge, related games,
progression, leaderboards, returning-user loops. Do not depend solely on
Google.

15. CURRENT PRODUCT METRICS GUIDE PRIORITY. Use real analytics; do not spend
weeks on a game nobody plays while a high-traffic game has obvious
opportunities.

16. NO FEATURE IS COMPLETE UNTIL QA PASSES. Functional, data, desktop,
mobile, error states, save and refresh behavior; control feel and performance
for interactive games; long-running progression for simulations.

17. OWNER APPROVAL REQUIRED FOR HIGH-RISK CHANGES: deleting major games,
brand changes, business model changes, payments, domains, user data deletion,
auth replacement, destructive migrations, expensive services, major legal
assumptions. Present the proposal first.

18. THE FINAL BUSINESS PHILOSOPHY. The best free sports gaming platform on
the internet. Users should think "how the hell is all of this free?" The
answer is advertising, sponsors and corporate partnerships, not paywalls.
