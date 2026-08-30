<!-- spec-part-header -->
> Part 28 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers D146 to D163. Index: `docs/spec/README.md`. previous `26-blueprint-quality-and-qa.md`, next `28-appendices-e-to-q.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
# D146. PRODUCT DEVELOPMENT RULE

Whenever a bug is discovered in one game and the pattern could exist elsewhere:
- fix the root shared component;
- add a regression test;
- audit sibling games.

Example:
If one game has wrong country flag rendering, inspect the shared flag component rather than patching only one page.

---

# D147. PRODUCT DEVELOPMENT RULE — NO FAKE DEPTH

Do not add:
- meaningless menus;
- decorative attributes;
- buttons that do nothing;
- fake simulations;
- fake negotiations;
- fake statistics.

Every feature must affect the world or be clearly cosmetic.

---

# D148. PRODUCT DEVELOPMENT RULE — EXPLAIN CONSEQUENCES

If user action changes:
- morale;
- finance;
- tactics;
- board;
- fans;
- reputation;

show enough feedback that the user can understand the cause.

---

# D149. PRODUCT DEVELOPMENT RULE — PLAYER AGENCY

When practical, allow:
- multiple solutions;
- custom strategies;
- different routes to success.

Do not make every management mode a single correct path.

---

# D150. PRODUCT DEVELOPMENT RULE — FAIL FOR A REASON

If a deal fails:
show:
- value too low;
- player not interested;
- budget insufficient;
- role unacceptable;
- club refuses.

Don't simply say:
"Rejected."

---

# D151. PRODUCT DEVELOPMENT RULE — DIFFICULTY

Difficulty can modify:
- information certainty;
- opponent intelligence;
- time;
- budget;
- injury;
- simulation volatility.

Don't simply lower the score multiplier.

---

# D152. PRODUCT DEVELOPMENT RULE — NEVER PUNISH REFRESH

A normal browser refresh should not:
- delete save;
- change daily puzzle;
- duplicate result;
- reset account.

---

# D153. PRODUCT DEVELOPMENT RULE — SERVER TIME

Critical timing uses server UTC time:
- daily reset;
- transfer windows;
- auctions;
- room timers;
- idle rewards.

---

# D154. PRODUCT DEVELOPMENT RULE — MOBILE FIRST FOR GAMES

For interactive games:
- test touch early;
- use larger hitboxes;
- avoid hover dependency;
- account for browser safe areas;
- prevent accidental page scrolling during gestures.

---

# D155. PRODUCT DEVELOPMENT RULE — ACCESSIBILITY FIRST

Do accessibility while building the component, not after launch.

---

# D156. PRODUCT DEVELOPMENT RULE — TEST THE HAPPY PATH AND THE WEIRD PATH

For every feature ask:
- What happens when everything works?
- What happens when data is missing?
- What happens when user clicks twice?
- What happens when they leave?
- What happens when they return?
- What happens when the season changes?
- What happens when the source changes?

---

# D157. FIRST IMPLEMENTATION MILESTONE

The first milestone should produce a stable platform shell:

- shared header;
- ticker;
- footer;
- accounts;
- profiles;
- leaderboard;
- achievements;
- reports;
- game registry;
- data validation;
- analytics;
- SEO framework.

It should not require building another game.

---

# D158. SECOND IMPLEMENTATION MILESTONE

Upgrade Club Manager.

Success means:
- player/team data correct;
- historical save;
- transfers;
- contracts;
- staff;
- board;
- finance;
- competition;
- tactics;
- match center;
- save/load.

---

# D159. THIRD IMPLEMENTATION MILESTONE

Upgrade Soccer Career.

---

# D160. FOURTH IMPLEMENTATION MILESTONE

Create shared Conquest, Draft, Card and Interactive Arcade engines.

---

# D161. FIFTH IMPLEMENTATION MILESTONE

Expand into:
- WNBA;
- other sports;
- multiplayer;
- Sports Empire;
- Tower Defense;
- Sports Party.

---

# D162. SIXTH IMPLEMENTATION MILESTONE

Personalization and social:
- friends;
- challenges;
- private leagues;
- seasonal events;
- Hall of Fame.

---

# D163. FINAL PRODUCT QUALITY GATE

Before calling the platform "mature":
- no widespread data errors;
- no recurring save corruption;
- no major leaderboard abuse;
- live ticker reliable;
- all active games have help/report/scoring;
- flagship simulations have real depth;
- mobile is first-class;
- SEO pages are useful;
- ads don't interfere with gameplay;
- moderation works;
- admin tools work;
- observability works.

---
