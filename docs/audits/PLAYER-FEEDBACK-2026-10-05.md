# Player feedback triage, 2026-10-05

Anthony supplied the reports in chat and explicitly requested coordination with
the active Claude lane. Ownership request is at the top of the shared root
WORKBOARD. Codex is building NBA planning in Round 1003. No career or Transfer
Path product edit has been claimed by Codex while Claude's ownership is pending.

## Soccer Career season ratings

The report asks for every season's performance rating in player history,
especially for CB/CDM careers where goals are less useful. This is a confirmed
display gap at accepted main650fd342: SeasonRecord.rating is already calculated
and saved, and the immediate season summary displays it. TimelineEntry omits
both rating and clean sheets from the saved season row.

Recommended first fix: show the stored average rating beside the existing
appearances/goals/assists for each played season, with clear labels and optional
saved-season details. Use the actual saved value. Old missing values and zero
sentinels from unplayed/youth/suspended seasons must say not recorded or no
appearances, rather than display a fabricated rating. There are no saved
individual club-match ratings to reconstruct. This needs no schema migration.

The position-balance question is separate. Build effects have defensive and
creative weights, but the base season-rating function credits clean sheets only
for GK and otherwise adds goal/assist bonuses. Any change to that calculation
needs measured comparisons by position. Do not disguise a balance change as a
history display fix.

References: src/pages/SoccerCareer.tsx TimelineEntry and SeasonSummaryCard;
src/lib/soccerCareerEngine.ts SeasonRecord, calcSeasonRating and
generateSeasonStats; src/lib/soccerCareerAttributes.ts careerBuildEffects.
Existing save-recovery and league-finish checks cover the surrounding behavior.

## Clubs and rivalries

The report requests more clubs in Brazil, Spain and England and explicitly says
per-season club rosters are unnecessary. The accepted bundled career catalog
has 190 clubs, including 8 Brazil, 10 Spain and 16 England entries. Additions need
verified identity and league/era eligibility, then the same existing club shape.
Historical squad views can remain absent where coverage does not exist.

The existing rival is a generated individual, with events and comparisons.
Generic derby stories and a rivalClub phone field do not amount to persistent
club-pair rivalries or a derby results history. Treat a team-rivalry feature as
separate designed work, preserving historical eligibility and existing saves.

A second player praises Soccer Career's recent fixes and polish. That supports
continuing the career work; it is feedback, not a measured retention statistic.

## Transfer Path context

The supplied context names /transfer-path, 2026-10-04, puzzle tpa-762, Alisson
Becker to Mikel Oyarzabal, classic rule, a chain containing only Alisson and
lastRejected null. No accompanying failure description was supplied. This shows
the reported starting state; it does not establish a rejected link or prove
the puzzle is unwinnable. Investigation remains read-only and must use saved
source data before considering a coordinated production read.
