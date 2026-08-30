<!-- spec-part-header -->
> Part 27 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers D131 to D145. Index: `docs/spec/README.md`. previous `25-blueprint-profile-social-and-safety.md`, next `27-blueprint-rules-and-milestones.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
# D131. GAME DESIGN SCORECARD

Before shipping:
- Fun
- Clarity
- Depth
- Replayability
- Data accuracy
- Performance
- Mobile
- Accessibility
- Social potential
- SEO value
- Monetization compatibility

Score each 1–5.
A game should not ship if critical categories are below threshold unless explicitly experimental.

---

# D132. FEATURE REVIEW

Every proposed feature gets:
- user value;
- technical complexity;
- reusable benefit;
- risk;
- priority.

Prioritize high-value reusable infrastructure.

---

# D133. BUG PRIORITY

P0:
- data corruption;
- lost saves;
- security;
- wrong results globally;
- payment issue if introduced.

P1:
- major game broken;
- leaderboard broken;
- ticker wrong;
- competition wrong.

P2:
- game-specific bug;
- visual bug;
- minor scoring edge case.

P3:
- polish.

---

# D134. QA TEST MATRIX FOR GAMES

Test:
- first visit;
- returning user;
- logged out;
- logged in;
- mobile;
- desktop;
- slow connection;
- refresh;
- tab close;
- duplicate click;
- back button;
- invalid input;
- max input;
- empty input;
- edge-case answer;
- data source unavailable.

---

# D135. QA TEST MATRIX FOR SIMULATIONS

Test:
- new save;
- load;
- advance one day;
- advance week;
- advance season;
- transfer window open;
- transfer window closed;
- contract expiry;
- injury;
- retirement;
- promotion;
- relegation;
- cup advancement;
- user firing;
- staff firing;
- financial deficit;
- negative budget;
- corrupted state recovery.

---

# D136. QA TEST MATRIX FOR HISTORICAL MODES

Test representative:
- 2000s;
- 2010s;
- 2020s;
- current.

Verify:
- clubs;
- rosters;
- rules;
- competition;
- managers;
- transfers;
- schedule.

---

# D137. QA TEST MATRIX FOR LEADERBOARDS

Test:
- tie;
- same score;
- duplicate result;
- replay;
- midnight;
- timezone;
- invalid score;
- blocked user;
- renamed user;
- deleted user.

---

# D138. QA TEST MATRIX FOR TICKER

Test:
- upcoming;
- live;
- halftime;
- final;
- postponed;
- cancelled;
- overtime;
- extra time;
- delayed data;
- provider outage.

---

# D139. QA TEST MATRIX FOR ADS

Test:
- ad loading;
- no ad;
- slow ad;
- mobile;
- gameplay;
- result screen.

Verify:
- no overlap;
- no accidental click path;
- no ad-looking-like-game-control;
- no pop-up blocking gameplay.

---

# D140. QA TEST MATRIX FOR SEO

For each indexable page:
- title;
- description;
- H1;
- canonical;
- robots;
- sitemap;
- internal links;
- render;
- content;
- no duplicate issue.

---

# D141. RELEASE NOTES

Every meaningful release should include:
- what changed;
- games affected;
- data changes;
- bug fixes;
- known issues.

The public What's New page should become a polished changelog rather than an unstructured dump.

---

# D142. OWNER ADMIN DASHBOARD — DAILY VIEW

Show:
- site health;
- active users;
- games today;
- live events;
- error rate;
- report queue;
- data freshness;
- save errors;
- leaderboard anomalies.

---

# D143. OWNER DASHBOARD — GAME VIEW

For each game:
- starts;
- finishes;
- completion rate;
- average time;
- share rate;
- error rate;
- reports;
- most common report reason;
- data freshness.

---

# D144. OWNER DASHBOARD — DATA VIEW

Show:
- imports today;
- failures;
- conflicts;
- stale data;
- invalid records;
- last successful update by sport.

---

# D145. OWNER DASHBOARD — MONETIZATION VIEW

Where applicable:
- impressions;
- page RPM;
- session RPM;
- revenue;
- ad viewability;
- ad error rate.

Do not display sensitive ad data to ordinary users.

---
