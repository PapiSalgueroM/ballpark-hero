<!-- spec-part-header -->
> Part 22 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers D45 to D68. Index: `docs/spec/README.md`. previous `20-blueprint-simulation-and-club-manager.md`, next `22-blueprint-components-and-data.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
# D45. SPORTS HUBS

Every sport hub should contain:
1. Hero
2. Play Today
3. Live
4. Flagship games
5. Career/Manager
6. Conquest
7. Draft
8. Quick games
9. All games
10. FAQ/SEO content

---

# D46. GAME PAGE SEO TEMPLATE

Title:
"[Game Name] — Free [Sport] Game | DoUKnowBall"

Description:
"Play [Game Name], a free [sport] game on DoUKnowBall..."

H1:
Game name.

Content:
- short introduction;
- how to play;
- scoring;
- game area;
- related games.

Do not repeat the same generic paragraph across every game.

---

# D47. STRUCTURED DATA

Where appropriate, use valid structured data for:
- WebSite;
- BreadcrumbList;
- WebApplication/Game where supported;
- Article for genuine articles;
- FAQ only where page visibly contains the content and current search guidelines permit/use it.

Never mark up fake reviews or fake ratings.

---

# D48. INTERNAL LINKING

Every game page should link to:
- sport hub;
- related games;
- flagship game;
- career/manager game;
- daily games.

Every orphan page should be investigated.

---

# D49. PERFORMANCE BUDGET

Set budgets for:
- JavaScript shipped on homepage;
- image size;
- font count;
- API calls;
- layout shift;
- main-thread work.

Heavy engines should be dynamically imported.

---

# D50. GAME ENGINE CODE SPLIT

Example:
Homepage imports only:
- shared shell;
- profile preview;
- ticker;
- light game cards.

Opening Soccer Career loads:
- career engine;
- soccer data;
- career UI;
- animation assets.

Opening Club Manager loads:
- manager engine;
- competition engine;
- finance engine;
- transfer engine.

---

# D51. ACCESSIBILITY ACCEPTANCE

Each game must support:
- keyboard where logically possible;
- labels;
- focus;
- reduced motion;
- accessible errors;
- readable text;
- touch targets.

For fast reflex games, provide a non-reflex alternative only where feasible so the experience is not inaccessible by design.

---

# D52. MODERATION SYSTEM

User content requiring moderation:
- usernames;
- custom bios;
- team names;
- club names;
- chat/messages if later added;
- public league names;
- shared text.

Moderation layers:
1. local filter;
2. backend validation;
3. report queue;
4. admin override.

Avoid automatically censoring ordinary sports words just because a substring resembles profanity.

---

# D53. RESERVED NAMES

Protect names such as:
- admin;
- moderator;
- support;
- DoUKnowBall;
- system;
- official;
- verified.

Also protect obvious impersonation patterns.

---

# D54. FRIEND SYSTEM

Start with:
- friend request;
- accept;
- decline;
- remove;
- block.

Later:
- follow;
- mute;
- direct challenge.

Never expose private account information.

---

# D55. BLOCKING

Blocked users:
- cannot challenge;
- cannot follow;
- cannot send interactions;
- do not appear in friend surfaces.

---

# D56. NOTIFICATION SYSTEM

Types:
- streak reminder;
- challenge;
- friend request;
- achievement;
- dynasty event;
- transfer offer;
- career event.

Allow per-category preferences.

Do not spam.

---

# D57. SAVE UI

"My Saves" should show:
- game;
- save name;
- club/player;
- season;
- last played;
- progress;
- last result.

Actions:
- Continue;
- Rename;
- Duplicate;
- Archive;
- Delete.

Delete must require confirmation.

---

# D58. SAVE RECOVERY

For long-form sims:
- maintain last good state;
- atomic write;
- version number;
- backup state;
- rollback on corruption.

Never overwrite the previous good save until the new save validates.

---

# D59. GAME ROUTING

All game routes should be canonical.

Avoid duplicate routes:
- /game/name
- /games/name
- /play/name

Choose one canonical structure and redirect others.

---

# D60. ANALYTICS DASHBOARD

Admin metrics:
- DAU;
- WAU;
- MAU;
- games/user;
- session length;
- retention;
- completion;
- abandon;
- share rate;
- account conversion;
- save continuation;
- report rate;
- error rate.

Per game:
- starts;
- completions;
- average score;
- average time;
- repeat plays;
- retention.

---

# D61. FLAGSHIP GAME KPIs

Club Manager:
- save starts;
- saves continued;
- seasons completed;
- average save age;
- return rate.

Soccer Career:
- career starts;
- careers completed;
- average seasons;
- interactive drill completion.

Daily games:
- daily participants;
- next-day return;
- share rate.

---

# D62. GAME EXPERIMENTATION

A/B test:
- home page ordering;
- CTA text;
- game preview;
- instruction wording;
- result screen;
- share CTA.

Do not A/B test core scoring randomly on the same leaderboard season unless the experience is carefully segmented.

---

# D63. DESIGN SYSTEM

Define:
- typography;
- spacing;
- card radius;
- buttons;
- chips;
- tables;
- tabs;
- modal;
- tooltips;
- stat blocks;
- badges;
- status colors;
- animation timing.

Create reusable components rather than page-specific styles.

---

# D64. SPORTS VISUAL LANGUAGE

Use sport-specific accents:
- soccer;
- basketball;
- football;
- baseball;
- hockey;
- WNBA;
- college;
- racing;
- tennis;
- golf.

Keep the core brand consistent.

---

# D65. ICONOGRAPHY

Use a single icon family.

Do not mix unrelated icon styles.

Icons must have labels/tooltips when their meaning is not obvious.

---

# D66. TABLE DESIGN

Tables should:
- align numeric columns;
- keep headers clear;
- support horizontal scrolling on mobile;
- highlight relevant row;
- show current status;
- avoid excessive abbreviation.

---

# D67. MATCH CENTER MOBILE

Mobile layout:
- scoreboard;
- timeline;
- key stats;
- lineup;
- substitutions;
- tabs.

Avoid squeezing 20 columns onto a phone.

---

# D68. CLUB MANAGER MOBILE

Use:
- bottom navigation;
- sticky action area;
- expandable cards;
- tabs for dense data.

Do not simply shrink a desktop spreadsheet.

---
