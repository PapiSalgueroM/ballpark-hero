<!-- spec-part-header -->
> Part 21 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers D21 to D44. Index: `docs/spec/README.md`. previous `19-blueprint-architecture.md`, next `21-blueprint-seo-and-frontend.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
# D21. WORLD SIMULATION

A management game world should advance:
- every fixture;
- transfers;
- injuries;
- player development;
- retirements;
- youth generation;
- staff changes;
- financial movement;
- board state;
- media events.

Not every team needs expensive detailed simulation. Use tiered simulation:
- user's club: detailed;
- major rivals: medium;
- distant leagues: simplified.

---

# D22. SIMULATION DETERMINISM

Where practical, use seeded randomness.

A seed should allow:
- reproducible debugging;
- replay;
- QA;
- bug reports.

Store:
- world seed;
- match seed;
- event seed.

---

# D23. MATCH SIMULATION MODEL

Inputs:
- team strength;
- player ratings;
- tactics;
- fatigue;
- injuries;
- morale;
- form;
- home advantage;
- weather if relevant and sourced;
- competition context.

Outputs:
- score;
- shots;
- shots on target;
- possession;
- corners;
- cards;
- fouls;
- substitutions;
- player ratings;
- event timeline.

Do not make every match a random coin flip.

---

# D24. EVENT PROBABILITY MODEL

An event probability should consider:
- time;
- score state;
- team strength;
- tactical state;
- fatigue;
- player role;
- recent event history.

Example:
A trailing team in the final 10 minutes should generally increase attacking risk if tactics allow it.

---

# D25. MATCH PRESENTATION ENGINE

Input:
MatchEvent.

Output:
- animation;
- commentary;
- stat update;
- scoreboard update;
- timeline entry;
- crowd effect.

One event should update all relevant UI in a predictable way.

---

# D26. MATCH EVENT TYPES

Soccer:
- kickoff
- pass
- shot
- goal
- save
- deflection
- corner
- throw-in
- foul
- yellow
- red
- offside
- penalty awarded
- penalty saved
- penalty scored
- substitution
- injury
- VAR
- halftime
- fulltime

NBA:
- possession
- three-pointer
- two-pointer
- free throw
- rebound
- assist
- steal
- block
- foul
- timeout
- substitution
- quarter end.

NFL:
- snap;
- run;
- pass;
- completion;
- incompletion;
- interception;
- sack;
- fumble;
- touchdown;
- field goal;
- punt;
- penalty;
- turnover;
- timeout;
- quarter/half/end.

MLB:
- pitch;
- ball;
- strike;
- foul;
- walk;
- hit;
- home run;
- stolen base;
- error;
- out;
- inning.

NHL:
- shot;
- goal;
- save;
- rebound;
- hit;
- penalty;
- power play;
- faceoff;
- period;
- overtime.

WNBA follows basketball event architecture with league-specific roster/schedule rules.

---

# D27. SOCCER MATCH ANIMATION V1

Do not attempt full freeform 3D.

Implement:
- 2D pitch;
- 22 player sprites/dots;
- role-based position anchors;
- dynamic movement between anchors;
- possession carrier;
- ball path;
- passing lines;
- shot trajectory;
- keeper animation;
- event-specific animations.

Player labels should not overlap permanently.
Allow tap/click for player details.

---

# D28. SOCCER MATCH ANIMATION V2

Add:
- contextual movement;
- overlap avoidance;
- defensive lines;
- attacking runs;
- pressing;
- counterattacks;
- set-piece layouts;
- corner routines.

---

# D29. SOCCER MATCH ANIMATION V3

Possible future:
- higher-fidelity character sprites;
- skeletal animation;
- richer camera;
- crowd;
- stadium effects;
- audio commentary.

Only build this once the simulation layer is solid.

---

# D30. CLUB MANAGER HOME SCREEN

Primary widgets:
- next fixture;
- league position;
- board confidence;
- fan confidence;
- player morale;
- transfer window status;
- injuries;
- finances;
- inbox;
- current objective;
- manager XP.

Quick actions:
- Squad
- Tactics
- Transfers
- Staff
- Academy
- Finances
- Competitions
- News
- Facilities

---

# D31. CLUB MANAGER INBOX

Inbox should be event-driven.

Message examples:
- player requests;
- contract requests;
- scout report;
- staff offer;
- board request;
- sponsor offer;
- injury update;
- transfer bid;
- media request;
- federation notice.

Each message can have actions.

---

# D32. CLUB MANAGER MESSAGE CONSEQUENCES

A response can change:
- player trust;
- staff trust;
- board;
- fans;
- media reputation;
- finances;
- morale;
- future event probability.

Store decision history.

---

# D33. CLUB MANAGER NEGOTIATION TIMER

Negotiations can have:
- patience;
- relationship;
- deadline;
- number of counters;
- walk-away threshold.

Do not make every negotiation fail after exactly the same number of turns.

---

# D34. CLUB MANAGER TRANSFER AI

Other clubs should consider:
- budget;
- squad need;
- age profile;
- player value;
- tactical fit;
- reputation;
- manager preference;
- rivalry;
- relationship;
- financial pressure.

---

# D35. CLUB MANAGER PLAYER VALUE MODEL

Suggested inputs:
- current ability;
- potential;
- age;
- contract length;
- position scarcity;
- recent performance;
- reputation;
- league level;
- market trend;
- demand;
- injuries.

The "market value" is a simulation estimate, not a guaranteed real price.

---

# D36. PLAYER CONTRACT SYSTEM

Fields:
- wages;
- contract years;
- signing bonus;
- appearance bonus;
- goal/assist bonus;
- clean-sheet bonus;
- trophy bonus;
- role;
- release clause;
- buyout;
- agent fee.

Players can be:
- satisfied;
- neutral;
- dissatisfied.

---

# D37. PLAYER MORALE SYSTEM

Inputs:
- minutes;
- starts;
- wages;
- form;
- manager relationship;
- role;
- team success;
- promises;
- injuries.

Outputs:
- morale;
- performance modifier where appropriate;
- transfer interest;
- conversation frequency.

Avoid huge hidden modifiers that users cannot understand.

---

# D38. FAN MODEL

Inputs:
- results;
- rivalries;
- ticket prices;
- transfer strategy;
- youth use;
- attacking style;
- trophies;
- controversial decisions;
- stadium investment.

Output:
- attendance;
- mood;
- social reaction;
- pressure.

---

# D39. BOARD MODEL

Inputs:
- results;
- finances;
- brand;
- objectives;
- facilities;
- transfers;
- long-term plan.

Output:
- confidence;
- patience;
- bonuses;
- warnings;
- sacking probability.

---

# D40. SACKING SYSTEM

Never randomly fire without a visible cause.

Show:
- current confidence;
- target;
- projected risk;
- trend.

Possible:
"Secure."
"Under review."
"At risk."
"Final warning."

---

# D41. MEDIA SYSTEM

Media content should be generated from real in-game events.

Types:
- breaking news;
- match preview;
- match report;
- rumors;
- transfer;
- injury;
- controversy;
- board pressure;
- award race;
- tactical analysis;
- fan reaction.

Each article references event IDs.

---

# D42. POLL SYSTEM

Polls should be interactive.

Examples:
"Should Barcelona sell Player X?"
"Who wins the Ballon d'Or?"
"Who should start?"

Show:
- vote percentage;
- number of votes;
- result;
- optional user prediction accuracy.

Avoid manipulative or inflammatory wording.

---

# D43. TICKER SOURCE OF TRUTH

Ticker reads from the live-event data domain.

Never use separate hardcoded arrays on different pages.

Pages can filter the same event stream.

---

# D44. LIVE TICKER FAILURE MODES

If live provider is delayed:
- show last updated time;
- don't display stale information as current;
- mark data as delayed where needed.

If no data:
"Live scores temporarily unavailable."

Do not invent a score.

---
