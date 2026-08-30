<!-- spec-part-header -->
> Part 17 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers 152 to 159. Index: `docs/spec/README.md`. previous `15-new-game-ideas.md`, next `17-roadmap-and-quality-bar.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
# 152. GAME DISCOVERY / RECOMMENDATION ENGINE

Use user behavior:
- favorite sports;
- games played;
- difficulty success;
- completion;
- session length.

Recommend:
- similar;
- new;
- deeper;
- easier;
- competitive.

Don't recommend only what they've already played.

---

# 153. HOMEPAGE PERSONALIZATION

Logged-out:
- general popular/daily/live.

Logged-in:
- continue;
- favorite sport;
- friends;
- streak;
- recommended;
- saved careers.

---

# 154. DATA REFRESH PIPELINE

Per sport:
- schedule refresh;
- roster refresh;
- standings refresh;
- player status refresh;
- historical refresh.

Log:
- fetched;
- changed;
- rejected;
- verified.

Never silently overwrite.

---

# 155. HISTORICAL FOOTBALL DATABASE

For each season:
- clubs;
- leagues;
- competitions;
- managers;
- squads;
- player histories;
- competition format;
- qualification;
- transfers;
- ratings.

Historical modes must be internally consistent.

---

# 156. CURRENT SPORTS DATABASE

For current season:
- schedules;
- rosters;
- standings;
- stats;
- injuries if data source supports;
- transactions;
- competition context.

---

# 157. SCHEDULING

Use a server-side authoritative clock.

Daily reset should not rely entirely on browser timezone.

Define:
- reset time;
- timezone;
- grace behavior.

---

# 158. OBSERVABILITY

Monitor:
- page errors;
- API errors;
- data import failure;
- game crash;
- save failure;
- ticker stale time;
- slow page;
- score anomaly;
- report volume.

Alerts:
- critical failures;
- widespread game failure;
- data mismatch.

---

# 159. RELEASE PROCESS

For major game:
1. design;
2. data;
3. implementation;
4. internal QA;
5. mobile QA;
6. accessibility;
7. SEO;
8. analytics;
9. performance;
10. release;
11. monitor;
12. iterate.

Never ship an untested "prototype" as if it were a finished game.

---
