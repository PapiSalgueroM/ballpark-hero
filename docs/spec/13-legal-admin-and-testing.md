<!-- spec-part-header -->
> Part 14 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers 119 to 131. Index: `docs/spec/README.md`. previous `12-puzzle-games-and-data-rules.md`, next `14-economy-and-events.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
# 119. LEGAL / RIGHTS SAFEGUARDS

Do not guarantee "we can't get sued." The engineering goal is risk reduction and compliance.

Rules:
- use data/assets only with a lawful basis or appropriate license;
- maintain source/provenance;
- do not imply league affiliation;
- use disclaimers where necessary;
- avoid unlicensed athlete likenesses;
- do not copy competitor code;
- do not copy competitor's exact UI;
- use original branding/art;
- do not publish defamatory claims;
- have legal counsel review commercial expansion where appropriate.

For generated athlete personas, clearly distinguish fictional users/players from real athletes.

---

# 120. PLAYER LIKENESS / AVATAR STRATEGY

Preferred:
- stylized fictional avatars;
- licensed images where available;
- public-domain/appropriately licensed assets;
- clearly transformative original UI.

Do not generate an image that implies a real athlete endorses DoUKnowBall.

---

# 121. AI USAGE POLICY

AI can be used for:
- code assistance;
- draft copy;
- news wording from verified facts;
- puzzle generation;
- QA;
- data conflict detection;
- content moderation support.

AI must not be the ultimate authority for:
- score;
- player identity;
- official stat;
- current team;
- historical rules;
- final match result.

Those come from deterministic data/services.

---

# 122. ADMIN CONSOLE

Admin needs:
- reports;
- users;
- usernames;
- games;
- puzzle pool;
- data errors;
- leaderboard anomalies;
- flagged content;
- source status;
- data refresh status;
- live ticker status;
- failed data imports;
- analytics.

---

# 123. REPORT ISSUE ADMIN WORKFLOW

Statuses:
- New
- Investigating
- Confirmed
- Fixed
- Not a bug
- Duplicate
- Won't fix

Priority:
- Critical
- High
- Medium
- Low

Critical examples:
- wrong score;
- leaderboard corruption;
- save loss;
- security issue;
- broken game for everyone.

---

# 124. TESTING STRATEGY

Every major system needs:
### Unit tests
rules/calculations.

### Integration tests
database/API/game submission.

### E2E
real user flows.

### Visual regression
UI.

### Data validation
sport records.

### Load tests
ticker/leaderboards.

---

# 125. CORE ACCEPTANCE TESTS

## Profile
- streak accurate;
- badges accurate;
- recent games accurate;
- best scores accurate;
- world rank accurate.

## Leaderboard
- duplicate points prevented;
- safe names;
- correct sorting;
- correct daily reset.

## Ticker
- upcoming event appears;
- live score updates;
- final state appears;
- stale status handled.

## Saves
- save;
- logout;
- login elsewhere;
- load same world;
- no corruption.

## Club Manager
- transfer negotiation;
- player contract;
- staff hire/fire;
- board objective;
- fan reaction;
- facility upgrade;
- competition table;
- historical rules.

---

# 126. PERFORMANCE ACCEPTANCE

Critical pages should:
- load quickly;
- avoid blocking the main thread;
- lazy-load heavy game engines;
- show progress during unavoidable loading;
- never sit on blank screen.

A user should understand the page is loading within moments.

---

# 127. ERROR HANDLING

Never show:
- raw stack traces;
- database errors;
- undefined;
- NaN;
- null;
- age 0 due to parsing;
- missing-player blank state.

Show:
"Something went wrong. Your progress was not lost."
where appropriate.

Log details privately.

---

# 128. SAVE SYSTEM

Long-form games should support:
- autosave;
- manual save;
- multiple saves;
- cloud save;
- local recovery;
- save versioning;
- migration.

When migrating old saves:
- use version numbers;
- write migration scripts;
- never overwrite without backup.

---

# 129. OFFLINE / CONNECTION RESILIENCE

For lightweight games:
- cache puzzle;
- permit short offline session where safe;
- queue result;
- resolve conflict server-side.

For live games:
- show connection status;
- prevent double submission.

---

# 130. SECURITY

Protect:
- user IDs;
- admin routes;
- reports;
- email;
- authentication;
- save data.

Never trust client-submitted:
- score;
- username;
- leaderboard points;
- card ownership;
- currency;
- achievement state.

Server validates.

---

# 131. ANTI-CHEAT

Potential signals:
- impossible completion time;
- repeated submissions;
- manipulated timestamps;
- impossible score;
- client tampering;
- multiple attempts on daily puzzle.

Do not automatically ban solely on one signal.
Flag for review.

---
