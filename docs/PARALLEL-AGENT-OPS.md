# DoUKnowBall Parallel Claude Code Operating Instructions

Received from Anthony 2026-08-29, verbatim below the line, as the operating companion
to docs/MASTER-BUILD-SPEC-2026-08.md.

**How this maps onto the running system (read this first).** Most of these rules were
already live before the document arrived, under different names, and the mapping
matters so nobody rebuilds process that exists:

- The task board it asks for is `docs/WORKBOARD.md`. Claims there ARE the file
  ownership rule: a lane claims an item and pushes BEFORE building, and the other lane
  does not touch it. Round numbers are claimed the same way.
- The persistent instructions it asks for are `CLAUDE.md` (stack, standing rules,
  verification gates, legal lines) plus `docs/SHIP-PIPELINE.md` and
  `docs/PROJECT-STATE.md`.
- The DO NOT BREAK rule is enforced mechanically: tsc, the build, roughly 130 sim
  harnesses with negative controls, browser sweeps at four viewports, and the 15
  built-site fences that run on every rebuild. A round is not done until they pass.
- The regression-test-every-bug rule is the standing harness convention (every fix
  ships with a fence and a control that proves the fence can fire).
- The never-invent-data rule, the fail-closed validator rule, the no-gambling
  decision, the likeness and quote rules, and the ads and SEO honesty rules are all
  standing law in CLAUDE.md and docs/LEGAL_REVIEW.md.

**One deliberate deviation.** Section 3 recommends separate feature branches or
worktrees per agent. The two lanes instead work claims-first on `main`, because the
publish pipeline (Lovable builds `main`, a scheduled publisher deploys it every three
hours) and the cross-lane visibility of the board both depend on `main` moving.
Collisions are prevented by the claim protocol rather than by branch isolation, and
ninety-plus rounds in, the measured collision cost is a docs-file merge every few
pushes, resolved in seconds. Long-running risky arcs (the interactive engine, the
theme system) may still take a feature branch when their half-built state would break
`main`; that is a per-arc call, made on the board.

**The ownership split, codified (section 38, adapted to what each lane can reach):**

- DESKTOP LANE (this machine): platform and data. Supabase (schema, validation,
  provenance, edge functions), the ticker and its feeds, live-site verification,
  browser harness runs, publish duty, data pulls needing web verification, and the
  architecture documents.
- CLOUD LANE: flagship features and games. Club Manager and Soccer Career depth
  work, new games on existing engines, copy passes, UI reworks.
- Either lane may cross only through an explicit board claim, exactly as before.

---

DOUKNOWBALL — PARALLEL CLAUDE CODE OPERATING INSTRUCTIONS

The Master Build Specification is the product vision and requirements document.
This document adds the operating rules for implementing that vision safely and
efficiently with multiple Claude Code agents working in parallel.

1. THE MASTER SPEC IS THE NORTH STAR
Treat the Master Build Specification as the long-term product vision.
Do NOT attempt to implement every requirement simultaneously.
Determine dependencies and build in priority order.
The priorities are:
1. Data correctness
2. Shared architecture
3. User/account/profile infrastructure
4. Core game infrastructure
5. Club Manager
6. Soccer Career
7. Match/competition engines
8. Other sport simulations
9. Conquest/Draft/Card/Arcade engines
10. Social/multiplayer
11. Experimental games
Quality is more important than raw feature count.

2. MULTI-AGENT RULE
Multiple Claude Code agents may work on DoUKnowBall simultaneously.
NEVER assume another agent will automatically know what the other agent is doing.
Before editing: inspect current repository state; inspect recent commits; inspect
relevant documentation; inspect current branch/worktree; check whether another agent
owns the files/subsystem.
Do not modify files currently being actively changed by another agent unless
explicitly coordinated.

3. WORKTREE / BRANCH OWNERSHIP
Parallel agents should use separate git worktrees/branches whenever possible.
Do NOT have two agents independently committing competing implementations to the
same branch.
Every branch must: build; pass relevant tests; contain only related changes; have
descriptive commits.
(See the deviation note at the top of this file for how the two lanes actually
coordinate on main.)

4. FILE OWNERSHIP
Before starting a major task, define ownership.
If a shared file must be modified by both agents: coordinate; merge deliberately; do
not overwrite the other agent's changes.
Shared high-risk files include: global layout; package manifest; database schema;
routing; central types; shared styles; sports data schemas; global configuration.

5. NEVER START A GIANT TASK BLINDLY
Before implementing a major system: inspect existing implementation; identify what
already works; identify what is broken; identify reusable code; identify duplicate
code; identify dependencies; write a short implementation plan; then implement.
Do not rewrite the entire app merely because the current code is imperfect.

6. NO MASSIVE UNNECESSARY REWRITES
A rewrite must have a reason. Prefer: incremental refactor; adapter layer; shared
utility; migration; gradual replacement.
Do not delete a working system until the replacement is tested.

7. EVERY CHANGE MUST PRESERVE EXISTING FUNCTIONALITY
Before modifying a shared component: identify all consumers; identify all routes;
identify all games using it; run relevant tests. After modification: test all
important consumers.

8. BUILD SHARED SYSTEMS BEFORE DUPLICATING THEM
If two games require player search, country flags, scoring, player cards,
leaderboards, saves, match events, or negotiations, build a shared engine or
component. Do NOT make PlayerSearchV1, V2, V3 unless the behavior is genuinely
different.

9. SOURCE OF TRUTH RULE
There must be one canonical source for players, teams, leagues, seasons,
competitions, current rosters, historical rosters, player positions, and player
metadata. Game code must consume that source. Never create a private copy of player
data inside an individual game.

10. CURRENT DATA VS HISTORICAL DATA
These must be separated. A current-data update must never silently modify an old
historical save.

11. NEVER INVENT SPORTS DATA
If a real-world value is unknown: investigate; use a verified source; mark
uncertain; or gracefully omit. Do not invent stats, player values, historical
lineups, competition rules, schedules, scores, quotes, or injuries. AI-generated
prose may summarize verified simulation or data events, but it must not become the
source of truth.

12. LIVE DATA RULE
If a page says LIVE the score must come from an actual live-data source. If
information is delayed, say so. If data is unavailable, say it is unavailable.
Never fabricate a live score.

13. SIMULATION RULE
Simulation results must be generated by deterministic game logic. AI may write
commentary, headlines, and explanations. AI must not decide who won, how many
goals, the final score, or a player's actual stat line. The simulation engine
decides those things.

14. SCORE SECURITY RULE
Never trust the browser's claimed score, XP, currency, leaderboard points,
achievement state, or card ownership. Validate on the server.

15. SAVE SECURITY RULE
Long-form simulations must autosave, use versioning, validate new state, keep
previous good state, and recover from write failure. Never replace a known-good
save with an unvalidated state.

16. GAME QUALITY RULE
Do not create placeholder games. A production game must have an objective,
instructions, working controls, scoring, a result, restart, error handling, a
loading state, mobile support, report issue, analytics, and appropriate leaderboard
behavior. A screen with buttons that do nothing is NOT a completed feature.

17. FLAGSHIP-FIRST RULE
When choosing between creating a brand new small game and improving a flagship
game, prefer the flagship. Priority flagship examples: Club Manager, Soccer Career,
NBA Front Office, CFB Dynasty, interactive soccer, Conquest, NBA Stat Line.

18. GAME COUNT IS NOT THE KPI
Optimize for retention, repeat plays, completion, session length, games per
session, social sharing, and saved-world continuation, not for how many games
exist.

19. PRODUCT CONSISTENCY
Every game should use the same shared header, ticker, help, report issue, player
card, team card, score and result components, profile linkage, and leaderboard
logic where relevant.

20. BEFORE ADDING A NEW GAME
Ask: is it meaningfully different; can an existing engine power it; does it have
replay value; does it increase depth; does it increase retention; does it create a
new acquisition or search opportunity; does it justify its maintenance cost. If
not: merge, rework, or reject.

21. DO NOT SACRIFICE DATA QUALITY FOR SPEED
Fast wrong data is worse than slow correct data. Every new sport or game should
pass data validation before release.

22. REGRESSION TEST EVERY BUG
Whenever a bug is fixed: fix it; add a regression test; audit sibling systems for
the same class of bug.

23. PERFORMANCE RULE
Do not load every game engine on the homepage. Use dynamic imports, lazy loading,
code splitting, caching, and image optimization. Heavy simulation and animation
code should only load when needed.

24. MOBILE IS FIRST-CLASS
Do not finish desktop and make mobile work later. Test mobile during
implementation. Touch targets must be large enough. Critical gameplay must never
depend only on hover.

25. ACCESSIBILITY IS FIRST-CLASS
Every shared component should be accessible by default.

26. SEO RULE
Only create indexable pages that provide genuine user value.

27. ADS RULE
Never compromise gameplay for ads. No ads over controls, no deceptive play
buttons, no ads directly beside high-frequency controls, no ads that look like
game UI.

28. LEGAL / RIGHTS RULE
Do not assume a disclaimer automatically grants legal protection. Use licensed
assets, appropriately licensed data and images, original art, original UI, and
fictional sponsors where appropriate. Never present fabricated quotes or behavior
as real statements from real athletes.

29. NO CASH GAMBLING
No wagering, deposits, withdrawals, cash prizes based on gambling, or casino
systems. Safe virtual reward systems are acceptable: cards, packs, XP, cosmetics,
achievements, virtual currency.

30. ADMIN VISIBILITY
Every new system should have enough logging and admin observability to diagnose
errors, reports, data problems, user problems, save failures, and scoring
anomalies.

31. DOCUMENT MAJOR ARCHITECTURAL DECISIONS
When implementing something important, document why, the alternatives, the chosen
approach, the migration plan, and the effects on other games.

32. DEFINITION OF COMPLETE
Complete means: works, tested, integrated, responsive, accessible, accurate,
observable, error-handled, documented where needed. Not: compiles, renders, button
exists.

33. HANDOFF BETWEEN CLAUDE AGENTS
When one agent finishes a major task it must leave clean git history, tests, a
short implementation summary, files changed, migrations, known issues, and
integration notes. The next agent must read those notes before changing related
systems. (Here: the round's commit message, the board's Done entry, and the
PROJECT-STATE change log entry ARE that handoff.)

34. NEVER HIDE KNOWN PROBLEMS
If something is incomplete, say so. Do not mark a feature complete while leaving
placeholder logic, fake data, disabled buttons, or broken edge cases.

35. TESTING BEFORE MERGE
Before merging: typecheck, lint, unit tests, integration tests, build, relevant
end to end, inspect critical pages. For major games: test a new save, save,
refresh, reload, advance, edge case, end state.

36. MERGE RULE
Never merge a large feature without confirming it builds, does not break unrelated
games, database migrations are safe, and old saves and routes remain compatible
where required.

37. THE TWO-AGENT PRIORITY
The objective of two Claude Code subscriptions is not to make two agents randomly
code twice as much. It is to parallelize independent work while maintaining one
coherent architecture. A perfect split is more valuable than two agents touching
the same files.

38. RECOMMENDED INITIAL PARALLEL SPLIT
Agent A, platform: data architecture, validation, profiles, username, leaderboard,
streaks, achievements, report system, ticker, global layout, SEO, analytics,
saves. Agent B, flagship game: Club Manager, competition UI, transfer system,
finances, staff, tactics, match center. Later: A takes Soccer Career and the
career engine, B takes the match and competition engines; then A takes Conquest,
Draft and Cards while B takes the interactive arcade. Avoid overlapping files.
(The codified lane split at the top of this file is this section, adapted to what
each lane can reach.)

39. SECONDARY PARALLELIZATION
As section 38's later phases.

40. FINAL RULE
Do not measure progress by lines of code. Measure by working features, retained
functionality, fewer bugs, deeper games, faster pages, more accurate data, better
UX, higher retention.

Never optimize for how much code you can write. Optimize for how much of
DoUKnowBall becomes genuinely better, more reliable, more connected, and more fun.
