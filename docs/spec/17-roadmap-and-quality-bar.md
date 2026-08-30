<!-- spec-part-header -->
> Part 18 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers 160 to 178. Index: `docs/spec/README.md`. previous `16-discovery-and-data-operations.md`, next `18-appendices-a-to-c.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
# 160. PRODUCT PRIORITY MATRIX

## P0 — Fix immediately
- data correctness;
- account/profile correctness;
- leaderboard correctness;
- ticker;
- duplicate footer;
- report issue;
- global help component;
- save integrity;
- broken tables/competitions;
- position validation;
- wrong team/league mapping;
- performance bottlenecks.

## P1 — Flagship depth
- Club Manager 2.0;
- Soccer Career 2.0;
- competition engine;
- match center;
- universal manager engine;
- cloud saves.

## P2 — Platform expansion
- Conquest 2.0;
- universal Draft;
- Sports Bingo;
- card engine;
- interactive arcade engine;
- WNBA games.

## P3 — Social
- friend system;
- challenges;
- private rooms;
- leagues;
- tournaments.

## P4 — Experimental
- tower defense;
- Sports Party;
- giant Sports Empire;
- futuristic worlds.

---

# 161. 90-DAY BUILD TARGET

## Weeks 1–2
Audit repository and data.

## Weeks 2–4
Fix:
- profile;
- leaderboard;
- ticker;
- footer;
- report system;
- game help.

## Weeks 3–6
Central data validation.

## Weeks 5–10
Club Manager infrastructure overhaul.

## Weeks 7–12
Cloud save + competition engine + match center groundwork.

Do not simultaneously start 10 giant games.

---

# 162. 6-MONTH TARGET

Ship:
- Club Manager 2.0;
- Soccer Career major overhaul;
- WNBA game family;
- Conquest engine;
- universal Draft;
- share cards;
- achievements;
- social challenges.

---

# 163. 12-MONTH TARGET

Aim for:
- unified profile;
- deep career systems;
- multiplayer leagues;
- interactive arcade engine;
- Sports Empire;
- tower defense prototype;
- large seasonal competitions;
- native/PWA polish if justified by user behavior.

---

# 164. "GREATEST WEBSITE EVER" QUALITY BAR

A feature is not done because:
- code compiles;
- page loads;
- button exists.

A feature is done when:
- it is fun;
- it is understandable;
- it is correct;
- it is responsive;
- it is accessible;
- it is fast;
- it is tested;
- it is measurable;
- it integrates with the platform;
- it does not create regressions.

---

# 165. DEFINITION OF DONE — GAME

A game is complete only if:
- objective is clear;
- rules are accurate;
- controls are reliable;
- data is validated;
- scoring is deterministic;
- result is stored;
- profile updates;
- leaderboard contribution works;
- mobile works;
- accessibility works;
- help exists;
- report issue exists;
- share exists where appropriate;
- loading/error states work;
- QA passes;
- analytics fire;
- SEO is configured if indexable.

---

# 166. DEFINITION OF DONE — SIMULATION

Additionally:
- save/load works;
- state versioning exists;
- season advancement works;
- schedules correct;
- standings correct;
- contracts work;
- transfers work;
- injuries work;
- news reflects facts;
- board/fan/player systems interact;
- financials balance;
- historical mode uses correct rules;
- simulations do not produce impossible state.

---

# 167. DEFINITION OF DONE — INTERACTIVE GAME

Additionally:
- controls tested on keyboard;
- touch;
- mouse;
- player movement;
- collision;
- animation;
- scoring;
- fail/retry;
- difficulty;
- frame rate;
- input latency;
- pause;
- reduced motion;
- audio optional/mutable.

---

# 168. REGRESSION TEST LIST

Before every major release:
- home;
- ticker;
- login;
- logout;
- profile;
- leaderboard;
- daily game;
- one game from each engine;
- Club Manager;
- Soccer Career;
- mobile;
- ads;
- footer;
- SEO metadata;
- save/load.

---

# 169. PRODUCT PHILOSOPHY

The platform should feel like:
- sports-first;
- playful;
- fast;
- competitive;
- data-rich;
- slightly chaotic/fun;
- deep when desired.

It should not feel like:
- a spreadsheet pretending to be a game;
- a casino;
- a content farm;
- a cluttered quiz directory;
- a slow stats database.

---

# 170. COMPETITOR INSPIRATION RULE

Study:
- FIFA / EA Sports for management depth and familiar concepts;
- NBA 2K for presentation, media, social, career framing;
- Madden for franchise architecture;
- Football Manager for management depth;
- FutMob for information architecture and live match presentation;
- Score! Hero for swipe-based football interaction;
- Sporcle for game breadth;
- Immaculate Grid for daily/social puzzle behavior;
- Coolmath Games for simple interactive browser-game controls;
- Sports Star Idle for idle/upgrade inspiration.

But:
- do not copy source code;
- do not reproduce copyrighted assets;
- do not clone exact UI;
- do not copy content word-for-word;
- use inspiration to create original systems.

---

# 171. EXTERNAL-FACT VERIFICATION RULE

When the game depends on real-world rules, current schedules, league size, competition format, expansion, or current player/team status:
- verify against authoritative/current sources;
- timestamp the verification;
- preserve historical versions.

Example: UEFA's current 2026/27 Champions League league phase has 36 clubs, 8 opponents per club, and four pots of nine; that should come from versioned competition data, not a permanent hard-coded assumption. citeturn913377search2turn913377search6

Example: UEFA explicitly notes the newer 36-team league phase replaced the former eight-group 32-team format. Historical seasons therefore require separate rule versions. citeturn913377search5

Example: the WNBA has announced a 50-game regular season beginning in 2027, so WNBA schedule logic must be season-configurable. citeturn913377search0

---

# 172. GOOGLE / ADS / SEARCH RULE OF THUMB

The product must provide real user value first.

Google states that scaled content created primarily to manipulate rankings without meaningful user value can violate its spam policies. citeturn913377search1

Google also cautions that ads near game controls can create accidental clicks and that game pages must be designed so users can navigate to the game without being tricked into clicking ads. citeturn913377search12turn913377search13

Therefore:
- never build SEO spam farms;
- never put ads beside repeated high-frequency controls;
- never disguise ads as navigation;
- never prioritize ad clicks over the game.

---

# 173. THE META-GAME

Ultimately every product should connect to:

## Your DoUKnowBall Identity

Metrics:
- Ball IQ;
- sport IQ;
- XP;
- level;
- streak;
- achievements;
- trophies;
- rankings;
- careers;
- dynasties;
- conquest;
- cards;
- friends;
- records.

The platform should remember the user.

---

# 174. THE "SPORTS LIFE" LOOP

Target ideal loop:

Google/social discovery
→ quick game
→ score
→ profile
→ leaderboard
→ friend challenge
→ deeper game
→ account
→ save
→ achievement
→ return tomorrow
→ longer-term career
→ share story
→ invite friend
→ repeat.

---

# 175. THE BIGGEST PRODUCT OPPORTUNITY

Do not optimize solely for:
- number of games.

Optimize for:
- retained users;
- daily active users;
- session length;
- games per user;
- save continuation;
- challenge participation;
- share rate;
- account creation;
- week-4 retention.

The question is:
"Why does this person come back tomorrow?"

---

# 176. GAME PORTFOLIO STRATEGY

Maintain tiers.

### S-tier
Flagship, polished, marketing focus.

### A-tier
Strong acquisition/retention.

### B-tier
Supporting variety/SEO.

### Experimental
Cheap tests.

Every quarter:
- promote;
- maintain;
- rework;
- retire.

---

# 177. FINAL VISION

DoUKnowBall should eventually feel like a combination of:

- daily sports puzzle platform;
- browser arcade;
- sports social network;
- career simulator;
- franchise management simulator;
- fantasy/draft platform;
- sports card collection;
- conquest game;
- sports data/live-score hub.

The user should be able to enter for 60 seconds and stay for hours.

---

# 178. FINAL INSTRUCTION TO CLAUDE CODE

Do not attempt to "finish this document" by blindly implementing every feature at once.

Instead:

1. Inspect the repository.
2. Build a dependency graph.
3. Identify existing reusable components.
4. Create a prioritized implementation plan.
5. Fix P0 infrastructure/data issues first.
6. Create shared engines.
7. Rebuild Club Manager as the flagship proof of the architecture.
8. Generalize the successful systems to other sports.
9. Add interactive gameplay after the shared platform is stable.
10. Add social/multiplayer after identity and save systems are reliable.
11. Keep everything tested and data-validated.

When you encounter an ambiguity:
- choose the most maintainable interpretation;
- prefer data-driven and configurable architecture;
- do not ask the operator to manually configure something that can be derived safely;
- do not fabricate data;
- document the decision.

When you implement a feature:
- implement it fully enough to be useful;
- do not ship fake UI;
- do not add buttons that do nothing;
- do not hide known broken behavior.

The objective is not to produce the longest codebase.

The objective is to produce the best sports gaming product.

---
