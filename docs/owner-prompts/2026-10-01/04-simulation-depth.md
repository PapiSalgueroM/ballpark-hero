Upgrade the selected DoUKnowBall simulation into a serious browser sports simulation.
The goal is not to make the interface look more complicated.
The goal is to make the underlying simulation deeper.
Use the design principles of successful sports franchise, career, management, and life simulation games while creating an original DoUKnowBall experience.
The player should feel like their decisions matter.

CORE LOOP
Define:
Start
Decision
Simulation
Result
Consequence
New information
Next decision
Progression
Season transition
Long-term objective
The loop must continue for many sessions without becoming repetitive.

GM MODE
Build a real organizational management system.
Include where appropriate:
team identity
owner expectations
budget
salary structure
contracts
free agency
trades
draft
scouting
prospects
player development
aging
retirement
injuries
depth chart
lineups
tactics
chemistry
morale
staff
training
facilities
fan interest
ticket revenue
sponsorship
media
team reputation
league standings
schedule
playoffs
offseason
draft classes
rival teams
AI-controlled teams
multiple seasons
team history
career history
achievements
job security
Every system must affect another system.
Example:
A bad contract should affect future flexibility.
A trade should affect chemistry, depth, performance, or finances.
A young prospect should require development.
An injury should alter the rotation.
A losing season should affect owner confidence.
A playoff run should affect revenue and expectations.
A successful young core should change future decision-making.

AI TEAM MANAGEMENT
Computer-controlled teams must make decisions.
They should:
evaluate rosters
identify weaknesses
sign free agents
make trades
draft players
develop prospects
respond to injuries
respond to standings
adjust priorities
change strategy
Do not make computer teams randomly move players around.

CAREER MODE
For player careers, include:
creation
background
position
attributes
development
training
contracts
agents
teams
relationships
rivalries
media
money
sponsorship
injuries
morale
reputation
career achievements
records
playoff performance
awards
retirement
legacy
Decisions must have different consequences.

LIFE SIMULATION
Use original systems inspired by life simulation games:
money
relationships
career opportunities
random events
risk
reputation
lifestyle
decisions
consequences
long-term goals
Do not create meaningless random events.
Every event should have a reason for appearing and should affect the player or organization.

SPORT-SPECIFIC DEPTH
Do not simply reskin one GM engine for every sport.
NBA should understand:
salary cap
roster construction
draft
play-in
playoffs
contracts
trade rules
player development
NFL should understand:
salary cap
draft
roster limits
contracts
free agency
trades
depth chart
schedule
playoffs
MLB should understand:
roster structure
payroll
free agency
trades
farm system
draft
162-game season
playoffs
NHL should understand:
salary cap
contracts
line combinations
goalies
trade deadline
playoffs
Soccer should understand:
transfers
contracts
squad registration
competitions
league tables
cups
continental competitions
youth development
international duty

DATA
Separate real sports data from simulation data.
Real players and real teams should come from structured datasets.
Generated prospects, future seasons, simulated salaries, generated events, and fictional players must be labeled internally as simulation data.
Do not overwrite real historical records with simulated outcomes.

ANIMATIONS
Add purposeful animation for:
trades
draft selections
contracts
injuries
player progression
standings
playoff advancement
season transitions
news
awards
championships
career milestones
financial changes
Animation must communicate state.

PERFORMANCE
Do not create an enormous browser simulation that causes slowdowns.
Use efficient data structures.
Avoid unnecessary rerenders.
Keep long-term saves compact.
Do not load thousands of records into the browser when only a small portion is needed.

SAVE SYSTEM
The player must be able to:
save
resume
restart
delete
continue
recover
Handle corrupted or outdated saves safely.

FINAL TEST
Play through an entire season.
Test:
best-case scenario
worst-case scenario
normal scenario
restart
refresh
mobile
desktop
multiple seasons
Do not call the game complete until a real end-to-end run works.
