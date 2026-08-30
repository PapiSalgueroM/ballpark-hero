<!-- spec-part-header -->
> Part 3 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers 9 to 13. Index: `docs/spec/README.md`. previous `01-data-model-and-quality.md`, next `03-progression-and-game-contract.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
# 9. LIVE SPORTS TICKER

## 9.1 Goal

The ticker should feel like a compact ESPN/FutMob-style live sports strip.

States:
- Upcoming
- Starting soon
- Live
- Halftime/intermission
- Delayed/postponed
- Final
- Cancelled

Examples:

Upcoming:
"FC Barcelona vs Real Madrid — 3:00 PM"

Live:
"LIVE 62' — Barcelona 1–0 Real Madrid"

Halftime:
"HT — Barcelona 1–0 Real Madrid"

Final:
"FINAL — Barcelona 2–1 Real Madrid"

## 9.2 Ticker requirements

Support:
- sport icons;
- league labels;
- team names;
- team logos if legally/technically appropriate;
- score;
- current period;
- clock;
- game status;
- upcoming start time;
- final score;
- clickable game center;
- user's followed teams;
- filtering;
- automatic refresh;
- graceful stale-data behavior.

Do not rely on manually written fixtures.

## 9.3 Data architecture

Event:
- event_id
- sport
- league
- season
- home_team
- away_team
- start_time
- status
- period
- clock
- home_score
- away_score
- venue
- data_provider
- last_updated

## 9.4 Ticker priority

Personalize:
1. user's favorite teams;
2. live events;
3. starting soon;
4. major events;
5. selected sport;
6. general upcoming events.

---

# 10. GLOBAL SITE LAYOUT

Every page should use a shared shell.

Structure:
1. Top ticker
2. Header/navigation
3. Breadcrumb where useful
4. Page content
5. Game/help/report components
6. Related games
7. Safe ad position
8. Global footer

Game pages must not independently render another global footer.

This prevents duplicate-footer bugs.

Shared shell components:
- AppShell
- Header
- SportsTicker
- Breadcrumbs
- MainContent
- GlobalFooter
- AdSlot
- ReportIssueButton
- HelpButton
- ProfileMenu

---

# 11. HOME PAGE

The home page should not show 100+ games as if they are equally important.

Primary sections:

## PLAY TODAY
Today's recommended games.

## CONTINUE PLAYING
Unfinished long-form games and saves.

## LIVE NOW
Live sports ticker/events.

## WITH FRIENDS
Challenges and multiplayer.

## CAREERS & DYNASTIES
Long-form games.

## POPULAR
Flagship games.

## NEW
Recently shipped games.

## BY SPORT
Sport hubs.

## YOUR PROFILE SUMMARY
Streak, Ball IQ, rank, achievements.

The headline should be concise.

Recommended direction:
"100+ free games across every sport."

Do not put a long legal statement in the main marketing headline. Put legal/disclaimer language in the appropriate legal/footer location.

---

# 12. USER IDENTITY SYSTEM

## 12.1 Default username

New accounts receive a random safe username, Kahoot-inspired.

Examples:
- ClutchStriker27
- SilentGoalie44
- BallWizard18
- FastBreak92

Username generation:
- deterministic collision checking;
- safe word dictionary;
- no offensive combinations;
- no protected public-figure impersonation;
- no sexual/violent terminology;
- no slurs.

## 12.2 Custom username

Allow later customization after:
- profanity/slur filtering;
- impersonation checks;
- reserved-name checking;
- duplicate handling.

If an unacceptable name is later reported:
- temporarily hide it;
- generate a replacement;
- notify the user.

---

# 13. PROFILE SYSTEM

Profile should show:

### Header
- avatar
- username
- level
- Ball IQ
- favorite sports
- title/badge

### Today
- current streak
- played today
- world rank
- daily score

### Lifetime
- games played
- games won
- total XP
- best score
- best finish
- most-played game
- favorite sport

### Recent
- recently played games
- result
- score
- time/date

### Achievements
- badges
- trophy cabinet

### Career
- active player careers
- retired careers
- career records

### Management
- current saves
- championships
- manager level
- front-office history

### Conquest
- territories won
- best campaign

### Social
- friends
- rivals
- challenges

All displayed values must be derived from source-of-truth records. Never calculate "streak" separately on each page.

---
