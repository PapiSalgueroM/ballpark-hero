# Rarity-Score & "Did You Know" Audit (TASK 3)

Two discovery/virality systems audited across the grid and career/guess games:
- **Rarity score** — rewards obscure-but-correct answers (pick-rate tiers).
- **"Did you know"** — a fact surfaced on a correct answer (teaches, drives the "cheat code" share).

## Rarity score

| Game | Rarity system? | Notes |
|---|---|---|
| Football Grid | ✅ Full | 8-tier badge (Unicorn→Bronze) bucketed by real pick-rate %; `rarityScore` aggregate. |
| Soccer Grid | ✅ Full | Same 8-tier `RarityBadge` (🦄 Unicorn, 🔥 Phoenix, 💎 Diamond, ✦ Emerald, ♦ Ruby, ★ Gold, ◈ Silver, ◉ Bronze). |
| College Grid | ✅ Yes | Per-cell rarity % + aggregate `rarityScore` (`useCollegeGrid`). |
| Career Path (soccer), NFL Career, Baseball Career, Hockey Career | ❌ None | See analysis below. |

**Analysis — why career games have no rarity:** rarity here means "what % of players gave this
answer," which requires server-side tracking of the **distribution of guesses** per puzzle. The
grid games have this because each cell logs selections to `*_grid_selections` tables via their
validate edge functions. The career games are single-answer "guess the player" games with no
per-answer selection logging, so a pick-rate rarity isn't computable without new Supabase tables
+ edge logging. **Recommended (logged, not built):** if desired, add a `career_path_guesses`
table + logging to compute "X% of players also guessed this" — needs Supabase, so it would go to
`docs/ANTHONY_TODO.md`. Not a natural/cheap fit; lower priority than facts.

## "Did you know" facts

| Game | Fact on correct answer? | Source |
|---|---|---|
| Guess The College | ✅ Already shown | `currentCollege.funFact` rendered on win (GuessTheCollege.tsx:217). |
| Guess The NFL Team, Guess The Club, HoF or Bust, Score Predictor, Shirt Number | ✅ Yes | Each board surfaces a fact/`funFact` field from its puzzle data. |
| **Career Path (soccer)** | ➕ **Added this session** | No fact field existed, but `careerPlayers[].career` has season-by-season clubs + market values. Now derives a "Did you know?" line on the reveal (distinct clubs + peak valuation) — no new data, no locked-hook change. |
| NFL Career, Baseball Career, Hockey Career | ❌ Gap (derivable) | Same pattern as soccer Career Path applies if their player data carries clubs/teams + a metric. Recommended follow-up: replicate the derived-fact block per game (each has a different data shape/hook; do attended or in a focused pass). |

## Implemented this session
- **Career Path (`/career`)**: derived "💡 Did you know?" on the reveal screen (won or lost),
  computed from the answer's existing career data. Surgical page-only change; the locked
  `useCareerGame` hook is untouched (read-only use of `targetPlayer`).

## Not done / follow-ups
- Replicate the derived "did you know" on NFL/Baseball/Hockey Career (needs per-game data-shape
  checks; safe but not done here to keep this change verifiable and small).
- Pick-rate rarity for career games would need Supabase guess-logging — log to ANTHONY_TODO only
  if you want it; it's a heavier lift than the fact layer and a weaker fit.
- The new **Perfect Lineup** game already embodies the discovery layer through its
  randomized league/nationality constraints (surfacing obscure real players); a per-pick fact
  popup is a natural future add.
