# Round 1340 notes: Club Manager match day screens

Branch r1340-cm-matchday, started from d8aaa4cb (release-bi-gate after part one, by the lead's base override).
The brief is C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1340.md. This file is kept current at every push.

## Steps

- a1. src/lib/cmMatchDisplay.ts with the order helpers only (myClubFirst, inFixtureOrder, mineFirstOfReport) and
  src/lib/cmMatchDisplay.test.ts. No caller yet.
- a2. The report and the timeline. MatchReportCard: StatBar and StatsBlock take mineFirst; the scorer columns, the
  stats header, the balance of play row, the momentum legend (each name keeps its arrow), the shots row and the best
  columns are built once per side and drawn in the scoreline's order (new side attributes data-cm-scorer-col,
  data-cm-legend, data-cm-shots, data-cm-best; every old attribute rides with its element). The board word is
  boardMeter's band in the meter's tone class, and under No sacking the header's own words below the edge, through
  the new optional noSack prop that ClubManager.tsx passes as noSackFrom(g.career) !== null. MatchTimeline: a
  mineFirst prop, the header and both columns in that order, every entry wraps (no truncate), the name span carries
  data-cm-tl-name, the mark rides at the end of the name's last line, the toggle is 44 px, the chevron has
  motion-reduce:transition-none. New src/test/cmReportBoardWord.test.tsx. Repoints: simMatchScreen section 2 (the
  first possession number is the home side's share) and its bareposs anchor (the them and ragged anchors still
  match as they were), simCmMatchCentre statBars (by attribute inside each bar), managerScorerMarks (finds the name by
  data-cm-tl-name). New scripts/simCmMatchDay.mjs sections 1, 2, 3 and 7 with controls neutralaway, oldorder,
  truncate and homeflip.
- confidenceLabel (src/lib/clubManager.ts) has no caller in src after a2. It is dead code; the export stays, because
  clubManager.ts is not this round's file.

## Positional readers (critic correction 1's grep, run before a2 on d8aaa4cb)

`grep -rnE "POSSESSION|cm-live-score|cm-stat-n|cm-live-stat=" scripts src/test` plus the literal score regexes found:
scripts/simMatchScreen.mjs 403 (POSSESSION, repointed in a2), scripts/simCmMatchCentre.mjs 216 (statBars, a2) and
224 (liveCells, a3), src/test/clubManagerVarScreen.test.tsx 151 (a3), src/test/liveSimMotion.test.tsx 163, 1409 and
1792 (a3), src/test/pitchOwnGoal.test.tsx 687 (a3), scripts/playClubManager.mjs 495 (a3), scripts/playLiveMatchFit.mjs
404, 678, 1275 and 1286 (read by attribute or as a change of text: no edit). scripts/simClubManagerMeters.mjs 499 reads
the league table's goals pair, not a match screen.
