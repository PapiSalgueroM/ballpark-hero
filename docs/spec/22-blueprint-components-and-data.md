<!-- spec-part-header -->
> Part 23 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers D69 to D83. Index: `docs/spec/README.md`. previous `21-blueprint-seo-and-frontend.md`, next `23-blueprint-careers.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
# D69. PLAYER PROFILE COMPONENT

Common player card:
- avatar/image;
- name;
- team;
- position;
- age;
- rating;
- status;
- country;
- quick stats.

Click opens details.

Used everywhere.

---

# D70. TEAM PROFILE COMPONENT

Common team card:
- crest;
- name;
- country;
- league;
- record;
- current form;
- key players.

---

# D71. FLAG COMPONENT

One reusable CountryFlag component.
Inputs:
- country code;
- country name;
- size;
- show name;
- accessibility text.

Never reimplement flags differently per page.

---

# D72. PLAYER POSITION COMPATIBILITY

Store:
- primary position;
- secondary positions;
- historic positions;
- strict/permissive mode.

Strict games use primary/verified secondary.
Permissive fantasy games may allow configurable compatibility.

---

# D73. PLAYER ELIGIBILITY

Eligibility must be computed from:
- sport;
- era;
- team;
- position;
- activity status;
- game-specific restrictions.

This avoids stale or impossible options.

---

# D74. CURRENT-ERA ROSTER POLICY

Games using current rosters must have:
- refresh date;
- source version;
- effective date.

Historical games should never pull current roster accidentally.

---

# D75. SPORTS DATA FALLBACKS

If data missing:
- use cached verified data;
- show stale marker where appropriate;
- do not replace with made-up data.

---

# D76. COMPETITION RULE TEST SUITE

Test:
- number of teams;
- number of rounds;
- qualification;
- tiebreakers;
- home/away;
- knockout;
- advancement;
- elimination.

Create fixture-based test files for known historical seasons.

---

# D77. FOOTBALL COMPETITION EXAMPLES

At minimum, verify representative:
- old Champions League group format;
- modern Champions League league phase;
- Europa League group era;
- modern Europa league phase;
- domestic league;
- domestic cup;
- promotion/relegation;
- two-legged knockout.

---

# D78. FOOTBALL SUPER-LEAGUE / CUSTOM LEAGUE

Custom mode should let users:
- move clubs between competitions;
- set competition size;
- set schedule;
- set points;
- set qualification;
- set relegation;
- choose cup;
- choose transfer rules.

God mode should allow:
- free transfers;
- edited rosters;
- custom league structure;
- custom money.

---

# D79. ERA SELECTOR

UI:
- Current
- Historical
- Custom

Historical selector:
- 2000s
- 2010s
- 2020s
- specific season.

Warn:
"Data depth varies by era."

Never silently substitute current data.

---

# D80. CLUB MANAGER ACADEMY LOOP

1. Scout region.
2. Generate prospects.
3. View ranges.
4. Invite.
5. Evaluate.
6. Sign.
7. Develop.
8. Promote/loan/sell.
9. Track growth.

Potential should be a range until enough scouting is performed.

---

# D81. YOUTH GENERATION

Generated fictional prospects should:
- have unique IDs;
- have generated names;
- have age;
- position;
- personality;
- ability range;
- potential range;
- development traits.

Never imply a generated player is a real person.

---

# D82. STAFF MARKET

At season/month boundaries:
- staff can receive offers;
- free agents enter pool;
- salaries update;
- reputation changes.

---

# D83. MANAGER MARKET

Managers have:
- reputation;
- tactical preferences;
- salary expectations;
- club preferences;
- career history.

AI clubs hire managers based on fit.

---
