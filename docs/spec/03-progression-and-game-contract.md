<!-- spec-part-header -->
> Part 4 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers 14 to 19. Index: `docs/spec/README.md`. previous `02-platform-shell.md`, next `04-analytics-seo-and-ads.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
# 14. BALL IQ

Use Ball IQ as the global sports-knowledge identity.

Do not let raw points from long simulations overwhelm quick trivia.

Maintain:
- game-specific score;
- XP;
- normalized skill rating;
- global Ball IQ.

Potential categories:
- Soccer IQ
- NBA IQ
- NFL IQ
- MLB IQ
- NHL IQ
- WNBA IQ
- College IQ
- General Sports IQ

Ball IQ should be based on validated performance across appropriate games.

---

# 15. STREAK SYSTEM

Requirements:
- one canonical streak source;
- exact timezone definition;
- daily cutoff;
- late-arriving score handling;
- missed-day logic;
- timezone edge cases;
- no duplicate scoring from refresh;
- account migration safety.

Display:
- current streak;
- longest streak;
- streak history.

Test:
- play before midnight;
- play after midnight;
- daylight saving transitions;
- multiple tabs;
- offline then reconnect;
- duplicate submissions.

---

# 16. ACHIEVEMENT SYSTEM

Build a generic achievement framework.

Achievement examples:
- First Game
- First Win
- 7-Day Streak
- 30-Day Streak
- 100-Day Streak
- 1,000 Games
- Rare Answer
- #1 in a Game
- #1 in a Sport
- World Top 100
- First Championship
- Three Championships
- Career Hall of Fame
- Dynasty Champion
- Complete All Soccer Dailies
- Play 10 Sports
- Beat the Boss
- Perfect Game

Achievements should have:
- ID
- title
- description
- icon
- trigger condition
- XP
- rarity
- hidden/visible state
- unlock date.

---

# 17. GLOBAL GAME CONTRACT

Every game must implement:

- unique game ID;
- name;
- sport(s);
- category;
- difficulty;
- daily support;
- unlimited support if applicable;
- how-to-play;
- scoring rules;
- results;
- leaderboard contribution;
- report issue;
- analytics events;
- mobile responsiveness;
- keyboard support where relevant;
- loading state;
- error state;
- restart;
- share result;
- related games;
- SEO metadata.

Every game must expose:
- startGame();
- submitAction();
- finishGame();
- calculateScore();
- validateResult();
- recordResult();
- getShareText();
- getGameStats().

Do not invent separate incompatible patterns for every game.

---

# 18. GAME HELP / QUESTION MARK SYSTEM

Every game gets a consistent:
- "How to Play" button;
- question-mark icon;
- Objective;
- Controls;
- Scoring;
- Daily/Unlimited explanation;
- examples;
- special rules;
- accessibility instructions.

Never make users infer how Rarity, Auction, Bingo, Draft, etc. work.

---

# 19. REPORT ISSUE SYSTEM

Every game must have a working Report Issue button.

Options:
- Incorrect answer
- Incorrect player
- Incorrect team
- Incorrect stat
- Incorrect position
- Incorrect league
- Incorrect historical data
- Bug
- Visual/UI issue
- Gameplay issue
- Typo
- Too easy
- Too difficult
- Suggest a feature
- Other

Optional text box.

Automatically attach:
- user/session ID where permitted;
- game ID;
- puzzle ID;
- game version;
- route;
- timestamp;
- device/browser;
- relevant answer state;
- relevant data IDs.

Admin system:
- inbox;
- filter by game;
- status;
- priority;
- assign;
- comments;
- mark verified;
- fix reference;
- analytics dashboard.

The feature must actually deliver usable reports to the operator/admin backend. A button that only says "thanks" without storing the issue is unacceptable.

---
