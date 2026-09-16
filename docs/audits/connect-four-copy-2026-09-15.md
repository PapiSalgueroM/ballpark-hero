# Soccer Connect 4 description correction

Base: `a96ed002809ed78d3a9bb19a9e66a77cfbb634e8`.
Isolated branch: `codex/connect-four-copy`.

The description in `src/pages/FootballConnect4.tsx` said the soccer puzzle used
draft classes. The actual `FOOTBALL_CONNECT4_BOARDS` in
`src/types/footballConnect4.ts` include clubs, nationalities and achievements.
The instructions require a player matching both row and column criteria, with
four connected squares needed to win. The replacement describes those rules.

Only that description changes. No real-player examples, game logic, data,
validation, scoring or saves change. The existing snapshot still contains the
old sentence; regenerate it through the normal release pipeline. No saved HTML
was edited by hand, and no build or network request was run for this patch.

A bounded case-insensitive source search for `draft class` across game pages,
game-content modules, the registry and SEO components checks for the same
mismatch elsewhere. Its remaining matches concern American football,
basketball, baseball or hockey; no additional soccer description mismatch was
found.

This is a supported copy correction, not an explanation for Google's indexing
or AdSense decisions. No indexing request was submitted. Snapshot regeneration
and normal release verification remain pending the next release.
