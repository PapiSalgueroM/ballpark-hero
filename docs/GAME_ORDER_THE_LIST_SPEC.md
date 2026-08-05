# Step 4 spec — "Rank 'Em" (Order the List / Factle)

Status: **DATA VERIFIED, NOT YET BUILT.** The Lovable preview build is stuck
(see task/blocker note in the session summary) so no new game code can be
built, deployed, or play-tested right now. This spec captures the hard part —
the concept and the end-to-end DB verification — so the game can be implemented
and shipped quickly (and play-tested) the moment the build pipeline is fixed.

## Why this concept

From `docs/GAME_BACKLOG.md`: **"Order the List (Factle)"** — rank 5 items in the
correct order by a stat; a wrong order ends the run. It is:
- **Deterministic** — the answer is a fixed ranking from DB career totals, so it
  needs NO AI validator (safe given the Gemini answer-check is quota-exhausted).
- **Well-supported by the existing DB** — `nba_player_stats` and
  `nhl_player_stats` hold clean career totals (points/assists/rebounds/threes,
  goals). Verified live on 2026-07-22 (queries below).
- **Distinct from Timeline** — Timeline orders by year only; this orders by any
  counting stat.

## Mechanic (mirror the Missing-game pattern)

- Show 5 shuffled players + a stat prompt ("Most career points → fewest").
- User arranges them top→bottom (click-to-place or drag). One submission.
- Reveal: show each player's true value; mark each slot correct/incorrect;
  score by number of slots in the exact right position (5/5 = perfect), OR a
  Factle-style "streak until first wrong". Recommend **slots-correct scoring**
  (0–5) so a near-miss still feels rewarding.
- **Daily** (ET date-seed into the round list, sitewide convention) + **Unlimited**
  (random round). Same GameShell + ShareButtons + SEO block as other games.

## CRITICAL data caveat (found during verification — do NOT skip)

`nhl_player_stats` **truncates careers that began before ~1967-68**. Confirmed:
Gordie Howe shows 349 pts / 152 goals (real: 1,850 / 801); Phil Esposito shows
1,416 pts (real: 1,590 — missing his 1963-67 Chicago years). Marcel Dionne
(debut 1971-72) and everyone later match reality exactly.
**Rule: only use players with `year_from >= '1971-72'` in NHL ranking rounds.**
`nba_player_stats` looks complete back to at least Magic Johnson (10,141 assists,
matches reality) — but re-verify any pre-1980 NBA player before use.

Every value below was pulled from Supabase and ordering confirmed strictly
distinct (no ties). Store `value` per item so the reveal never invents a number.

## Verified starter rounds (ready to paste into `src/lib/orderTheList.ts`)

Round 1 — NBA, "Most career points":
1. Kobe Bryant — 33,643
2. Dirk Nowitzki — 31,560
3. Shaquille O'Neal — 28,596
4. Carmelo Anthony — 28,289   (Shaq vs Melo = the trap, 307 apart)
5. Allen Iverson — 24,368

Round 2 — NBA, "Most career assists":
1. John Stockton — 15,806
2. Chris Paul — 12,552
3. Jason Kidd — 12,091
4. Steve Nash — 10,335
5. Magic Johnson — 10,141   (Nash > Magic by 194 — safe gap; do NOT use Mark
   Jackson here: 10,334, only 1 behind Nash — too fragile)

Round 3 — NBA, "Most career 3-pointers made":
1. Stephen Curry — 4,242
2. James Harden — 3,388
3. Ray Allen — 2,973
4. Klay Thompson — 2,895
5. Reggie Miller — 2,560

Round 4 — NHL, "Most career points" (all debut >= 1971-72):
1. Wayne Gretzky — 2,857
2. Jaromír Jágr — 1,921
3. Mark Messier — 1,887   (Jágr vs Messier = 34 apart, the trap)
4. Ron Francis — 1,798
5. Mario Lemieux — 1,723

Round 5 — NHL, "Most career goals" (all debut >= 1971-72):
1. Alex Ovechkin — 928
2. Wayne Gretzky — 894   (the record he passed — the trap)
3. Jaromír Jágr — 766
4. Brett Hull — 741
5. Steve Yzerman — 692

More rounds are cheap to add with the same query shape, e.g.:
`select player_name, trb from nba_player_stats where player_name in (...) order by trb desc;`
(rebounds), NHL assists, per-team leader boards, etc. Aim for ~12–15 rounds so
the daily rotation doesn't repeat inside two weeks.

## Implementation checklist (post-unblock)

1. `src/lib/orderTheList.ts` — `Round { id, sport, prompt, statLabel, items:[{name, value}] }`
   with the verified rounds; `getDailyRound()` (dateSeed) + `getRandomRound()`;
   scoring helper (count exact-position slots). Store items pre-sorted or sort
   at load; never rely on memory for `value`.
2. `src/hooks/useOrderTheList.ts` — mirror `useMissingEleven`/career hooks.
   **Gotcha (CLAUDE.md):** keep every hook above any early `return` (the React
   #310 bug that hit TransferPathBoard). No conditional returns before hooks.
3. `src/pages/OrderTheList.tsx` — GameShell + Daily/Unlimited toggle + placement
   UI + reveal + ShareButtons + `GameSeoContent`.
4. Register in `src/data/gameRegistry.ts` (pick category/emoji, `daily:true`,
   `isNew:true`) and add the route in `src/App.tsx`.
5. Ship via a new COMMIT_ROUND*.bat (tsc gate → explicit `git add` → commit →
   `git pull --rebase --autostash` → push), then publish, then **play-test the
   live daily + unlimited** before calling it done.

No DB writes and no edge functions are needed — the rounds are static verified
data, exactly like Missing Five/Nine/Eleven.
