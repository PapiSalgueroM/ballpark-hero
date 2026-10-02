Audit the DoUKnowBall sports database as a data-quality project.
Do not modify gameplay code.
Find incorrect, incomplete, duplicated, outdated, contradictory, or impossible sports data.

AUDIT:
Players
Teams
Leagues
Seasons
Transfers
Rosters
Statistics
Awards
Championships
Playoff results
Historical franchise names
Player aliases
Positions
Career histories
Retirement dates
Draft information
Contracts
Records

For every suspicious record determine:
What the database currently says.
What the correct information should be.
Why the current record is suspicious.
What source can verify the correct information.
What season or date applies.
Whether the data should be changed, removed, or flagged.

NEVER replace missing information with a guess.
NEVER generate realistic-looking numbers.
NEVER use an AI answer as the sole authority for a historical statistic.

BUILD VALIDATION CHECKS
Create automated tests for:
duplicate players
duplicate teams
impossible player-team combinations
impossible dates
impossible career paths
invalid seasons
invalid championships
missing required fields
duplicate aliases
contradictory records
invalid positions
future records incorrectly appearing as historical records

For data that changes over time, store the season or date associated with the record.

For each major dataset, maintain:
source
source URL or reference
retrieval date
season
last verified date
validation status

At the end, produce:
CRITICAL DATA ERRORS
HIGH PRIORITY ERRORS
MEDIUM PRIORITY ERRORS
MISSING DATA
VALIDATED DATA
VALIDATION TESTS ADDED

Do not change production data until the changes are reviewed.
