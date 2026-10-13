# Round 1328 notes: the Club Manager hub lands on the club

Branch r1328-cm-hub-landing, base origin/main 8fea14e2 (Release AY plus the board commit). Kept current at every
push; the closing report is C:/Users/antho/dukb-handoff/2026-10-10/results-g/finish-1328.md.

## What changed
- src/hooks/useArrivalTop.ts (new): a layout effect that puts a new screen's top in the readable strip before
  the first paint, instantly, with useRevealScroll's own readable test (GAP, MIN_LEAD, topInset and
  bottomInset are now exported from useRevealScroll.ts; nothing else in that file moved). The hub root carries
  it, keyed 'hub' while the hub phase is drawn, so every entry into the hub lands once and nothing inside it
  moves the page.
- CalendarScreen.tsx: the day strip no longer pulls itself into view; it keeps its place under the grid and is
  sticky to the foot of the screen, clearing the cookie banner (bannerClearance, the desks' rule). Strip lines
  12px, Sim to and the month arrows 44px. The intensity buttons print Light, Normal and Double (INTENSITY_INFO);
  the calendar keeps its blurbs (POLICY_BLURB).
- TrainingScreen.tsx: the intensity label and its line at 12px, nothing else.
- ClubManager.tsx: the "?" is 44 by 44 and sits 8px further into its corner; the header's first row keeps
  px-12; the season pill and the mid season badge at 12px; the badge says "the games before you arrived were
  simulated" (never the word run-in); Managers, Club home and both meter buttons 44px; the meters' lazy slot
  holds 52px; HubTile's value and line wrap, the line at 12px; five long lines shortened; the Inbox, League,
  Finances and Manager tiles read from src/lib/clubManagerHubLines.ts; the team step's Board wants line wraps
  whole at 12px.
- src/lib/clubManagerHubLines.ts (new, pure): inboxTile, recordLine, leagueTileValue, kittyChange.
- Readers moved with the words: calendarCurrentDate.test.tsx line 47, playClubManager.mjs line 532 (its own
  commit, merge-tree clean against origin/release-bb-gate), simMidSeasonStart.mjs line 237.
- scripts/playCmHubLanding.mjs (new walk): sections A to F and five controls.

## Base results (8fea14e2, remote checks rc1328-b0s and rc1328-b0w)
- Every sim in decision 8 green, tsc 0, vitest 0.
- Walks: playCmRealFixtures needs simCmRealFixtures run first (green 3 of 3 on base once it is); playNationJob
  red on base (it presses text=Premier League, which hits the page title sentence; the same slip Round 1304
  fixed in playEra2005); playClubManager SHALLOW (the known coin toss); every other walk green.
- playCmHubLanding on base: A red on all seven starts (scrollY 1743, 1794, 2118, 1276, 1276, 1826, 2231 on the
  first hub frame), B red (the page moved on day taps, the old names).

## Owed (decision 2d), not this round
- ManagerForm.tsx says "It is a simulated run-in, not the real one" for an Autumn or New year takeover; and
  simMidSeasonStart line 220 anchors on it.
- INTENSITY_INFO.light.desc (clubManager.ts) says "nobody gets any better" while developmentRate gives Light a
  0.78 growth multiplier; the Training screen prints the first, the calendar's blurb says slowest growth.
