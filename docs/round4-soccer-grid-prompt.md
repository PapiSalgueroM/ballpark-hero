# Round 4 — SoccerGrid Batch 2A: Generation Prompt + Tracking Doc
Date: 2026-05-26

## Status
- Batch 2A target: **15 puzzles** (sg-016 through sg-030)
- Batch 2A current approved count: **15 / 15 ✅ COMPLETE**
- Migration applied: `20260526000005_soccer_grid_puzzles_batch2a.sql` — Supabase confirmed COUNT(*) = 30
- Next action: Batch 2B (sg-031 through sg-050, 20 puzzles) — unblocked at 100% pass rate

---

## Generation Prompt Template

Copy everything between the triple-dashes below and paste into a separate Claude.ai chat.
Before each run, fill in the two bracketed sections: **PUZZLE TYPES FOR THIS RUN** and **ALREADY APPROVED IN THIS BATCH**.

---

```
SOCCER GRID PUZZLE GENERATION

You are generating new puzzles for a daily sports trivia game called Soccer Grid. The game shows
a 3×3 grid. Players name a soccer/football player who satisfies BOTH the row attribute AND the
column attribute for each cell.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each puzzle has:
- puzzle_id: "sg-NNN" (I will specify the ID range for this run)
- rows: exactly 3 attributes (the row headers)
- cols: exactly 3 attributes (the column headers)

Each attribute:
- label: display text shown to users (see conventions below)
- type: MUST be one of exactly 8 values:
    club | nationality | league | award | position | champions_league | world_cup | misc

Label conventions (follow exactly):
- club        → "Played for [Club Name]"
- nationality → "[Nationality adjective]"  (e.g. "Brazilian", "Colombian", "Belgian")
- league      → "Played in [League Name]"  (e.g. "Played in Eredivisie", "Played in Primeira Liga")
- position    → use ONLY these four exact strings:
                  "Forward (FWD)"  |  "Midfielder (MID)"  |  "Defender (DEF)"  |  "Goalkeeper (GK)"
- champions_league → "Champions League Winner"
- world_cup        → "World Cup Winner"
- award       → "Golden Boot Winner"  OR  "Ballon d'Or Winner"  OR  "Europa League Winner"
- misc        → "Over 100 International Caps"  |  "Copa América Winner"  |  "UEFA Euro Winner"
                "African Cup of Nations Winner"  |  "Played in Saudi Pro League"  |  other milestones

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY: CELL VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For EVERY puzzle you generate, you MUST produce a 3×3 cell validation table.
For each of the 9 cells (row × col intersection), name AT LEAST 1 real player who satisfies
BOTH attributes.

Rules:
- The player must have actually played for the club, hold the nationality, played in the league,
  or won the award — no guesses.
- If you cannot name any player for a cell → mark it "DEAD CELL" → do NOT include that puzzle
  → propose a replacement attribute instead.
- If you can name only 1 player for a cell → mark it "MARGINAL (1 only): [name]" so the
  reviewer can decide.
- Aim for cells where 3–15 players satisfy both attributes (not 0, not 100+).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXISTING PUZZLES — DO NOT DUPLICATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The following 15 puzzles already exist. No new puzzle may:
(a) repeat an identical 6-attribute set (order doesn't matter across rows+cols combined), OR
(b) share 3 or more attributes with any of these puzzles (order-insensitive).

sg-001 rows: Played for Barcelona, Played for Real Madrid, Played for Manchester United
       cols: Forward (FWD), Champions League Winner, World Cup Winner

sg-002 rows: Played for Chelsea, Played for AC Milan, Played for Bayern Munich
       cols: Midfielder (MID), Played in Premier League, Golden Boot Winner

sg-003 rows: Played for Liverpool, Played for Juventus, Played for PSG
       cols: Defender (DEF), Played in La Liga, Over 100 International Caps

sg-004 rows: Played for Arsenal, Played for Inter Milan, Played for Manchester City
       cols: Forward (FWD), Played in Serie A, Champions League Winner

sg-005 rows: Played for Atletico Madrid, Played for Borussia Dortmund, Played for Tottenham
       cols: Goalkeeper (GK), World Cup Winner, Played in Bundesliga

sg-006 rows: Brazilian, French, Argentine
       cols: Played for Real Madrid, Champions League Winner, Played in Ligue 1

sg-007 rows: Played for Roma, Played for Napoli, Played for AC Milan
       cols: Forward (FWD), Played in Serie A, Over 100 International Caps

sg-008 rows: Played for Barcelona, Played for Chelsea, Played for Bayern Munich
       cols: Midfielder (MID), World Cup Winner, Played in Premier League

sg-009 rows: German, Spanish, Italian
       cols: Defender (DEF), Champions League Winner, World Cup Winner

sg-010 rows: Played for Manchester City, Played for Liverpool, Played for Real Madrid
       cols: Forward (FWD), Played in La Liga, Golden Boot Winner

sg-011 rows: Played for PSG, Played for Juventus, Played for Arsenal
       cols: Midfielder (MID), Played in Ligue 1, Over 100 International Caps

sg-012 rows: Played for Tottenham, Played for Inter Milan, Played for Borussia Dortmund
       cols: Goalkeeper (GK), Champions League Winner, Played in Bundesliga

sg-013 rows: Portuguese, Dutch, English
       cols: Forward (FWD), Played in Premier League, Champions League Winner

sg-014 rows: Played for Barcelona, Played for Manchester United, Played for AC Milan
       cols: Defender (DEF), World Cup Winner, Played in Serie A

sg-015 rows: Played for Real Madrid, Played for Chelsea, Played for Liverpool
       cols: Played in MLS, Champions League Winner, Over 100 International Caps

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALREADY APPROVED IN THIS BATCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[PASTE PREVIOUSLY APPROVED PUZZLES HERE BEFORE RUNNING — same format as the existing puzzles
above. Leave blank on Run 1.]

Apply the same 3+ attribute overlap rule against these too.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONSTRAINTS FOR THIS BATCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ATTRIBUTE CAPS (track across all puzzles you generate in this session):
- "Champions League Winner": max 2 total across all 5 puzzles in this run
- "World Cup Winner": max 2 total across all 5 puzzles in this run
- "Forward (FWD)": max 2 total across all 5 puzzles in this run
- "Played for Real Madrid" (row OR col): max 1 total across all 5 puzzles in this run

NEW ATTRIBUTES TO INTRODUCE — prioritize using these (not required in every puzzle, but aim
for variety across the batch):
- Ballon d'Or Winner (type: award)
- Europa League Winner (type: award)
- Copa América Winner (type: misc)
- UEFA Euro Winner (type: misc)
- African Cup of Nations Winner (type: misc)
- Played in Eredivisie (type: league)
- Played in Primeira Liga (type: league)
- Played in Süper Lig (type: league)
- Played in Saudi Pro League (type: league)

NEW CLUBS TO PRIORITIZE (not yet used in existing 15 puzzles):
High priority: Ajax, Porto, Benfica, Sevilla, Lyon, Marseille, Galatasaray, Boca Juniors,
               River Plate, Flamengo
Medium priority: Bayer Leverkusen, Lazio, Fiorentina, Sporting CP, PSV, Feyenoord, Celtic,
                 Inter Miami

NEW NATIONALITIES TO PRIORITIZE (not yet used in existing 15 puzzles):
High priority: Colombian, Uruguayan, Belgian, Croatian, Senegalese, Ivorian, Polish
Medium priority: Norwegian, Welsh, Egyptian, Cameroonian, Moroccan, Serbian, Japanese,
                 South Korean

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PUZZLE TYPES FOR THIS RUN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[FILL IN BEFORE EACH RUN — copy the appropriate line from the run schedule below:]

Run 1: 3 three-club-rows + 1 three-nationality-rows + 1 mixed-rows  (IDs: sg-016 to sg-020)
Run 2: 3 three-club-rows + 1 three-nationality-rows + 1 achievement-heavy  (IDs: sg-021 to sg-025)
Run 3: 2 three-club-rows + 1 three-nationality-rows + 1 mixed-rows + 1 achievement-heavy  (IDs: sg-026 to sg-030)

Row type definitions:
- three-club-rows: all 3 row attributes are clubs
- three-nationality-rows: all 3 row attributes are nationalities
- mixed-rows: 2 clubs + 1 nationality, OR 2 nationalities + 1 club, OR similar mix
- achievement-heavy: 0 position cols — all 3 cols are leagues, awards, or achievement misc

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For each puzzle, output:

1. PUZZLE [puzzle_id]
   rows:
     [row 1 label]  (type: [type])
     [row 2 label]  (type: [type])
     [row 3 label]  (type: [type])
   cols:
     [col 1 label]  (type: [type])
     [col 2 label]  (type: [type])
     [col 3 label]  (type: [type])

2. CELL VALIDATION TABLE:
   Format as a labeled grid. Rows = row attributes. Columns = col attributes.
   Each cell: player name(s), or DEAD CELL, or MARGINAL (1 only): [name].

3. NEAR-DUPLICATE CHECK: list any attributes shared with existing puzzles (must be ≤2 overlaps
   with any single existing puzzle).

Generate [N] puzzles now.
```

---

## QC Checklist

Apply per 5-puzzle run before adding candidates to the tracking table.

### Structural validation
- [ ] Exactly 3 rows and 3 cols per puzzle
- [ ] Each attribute has `label` (non-empty string) and `type`
- [ ] `type` is one of the 8 valid values: `club` `nationality` `league` `award` `position` `champions_league` `world_cup` `misc`
- [ ] Label follows exact format convention: `"Played for X"` for club, `"[Adjective]"` for nationality, `"Played in X"` for league, exact strings for position
- [ ] `puzzle_id` is in the correct range for this run (sg-016 through sg-030 for batch 2A)

### Cell validation
- [ ] All 9 cells have ≥1 named player (zero DEAD CELLs)
- [ ] MARGINAL cells (1 player only) flagged — acceptable if the single answer is a well-known player; reject if obscure
- [ ] No cell has a trivially obvious answer pool — signals the attribute pair is too broad (100+ valid players)

### Near-duplicate check
- [ ] Attributes shared with each existing sg-001 through sg-015: ≤2 per puzzle (order-insensitive across rows+cols)
- [ ] Attributes shared with other candidates in the same run: ≤2

### Attribute cap check (running tally — see cap tracker below)
- [ ] Champions League Winner total in batch 2A ≤ 2
- [ ] World Cup Winner total in batch 2A ≤ 3
- [ ] Forward (FWD) total in batch 2A ≤ 4
- [ ] Played for Real Madrid (row or col) total in batch 2A ≤ 1

### Factual spot-check (~3–4 cells per run, ~9–12 cells total across batch 2A)
- [ ] Pick the least-familiar or most specific claims to verify
- [ ] Always verify MARGINAL cells — the single named player must actually be valid
- [ ] Verify against Wikipedia career history, Transfermarkt, or equivalent
- [ ] Log each spot-checked cell and result in the tracking table notes column
- [ ] If a spot-checked cell fails → reject that puzzle → note failure type for template diagnosis

---

## Acceptance Criteria — Batch 2A

### Pass thresholds (evaluated after all 15 candidates reviewed)

| Pass rate | Action |
|---|---|
| **≥70% (≥11 of 15 pass QC)** | ✅ Proceed to Batch 2B |
| **50–69% (8–10 of 15 pass)** | Identify failure pattern → revise prompt template → regenerate failed candidates → re-evaluate before proceeding to 2B |
| **<50% (<8 of 15 pass)** | 🛑 STOP — fundamental issue with prompt or cell validation assumptions; full framework review required before any more generation |

### Stop-on-failure rule (applied per run of 5)
If a single run of 5 produces >30% rework (>1.5 puzzles need rework, i.e., 2 or more fail), treat as a batch failure signal. Do not start the next run until the failure pattern is identified and the prompt is revised.

### Failure pattern taxonomy (use to diagnose which part of the prompt to fix)
| Failure type | Diagnosis | Fix |
|---|---|---|
| Dead cells | Cell validation instruction too weak | Strengthen "DEAD CELL" definition; add example |
| Near-duplicate violations | Existing puzzle list not being followed | Reformat existing puzzles more prominently |
| Cap violations | Caps not being tracked by the model | Add "RUNNING TALLY" output field to format |
| Factual errors | Claude.ai wrong about career facts | Add explicit examples of known-valid players per new attribute |
| Too-broad cells | Caps not preventing trivial combos | Tighten cap constraints; add "avoid trivially easy cells" instruction |

### Partial-pass handling

If batch 2A produces fewer than 15 approved puzzles after all 3 runs (e.g., 11 pass, 4 fail), the options are:

**(a) Run 4 — regenerate failed puzzles with revised constraints** *(preferred if failure patterns are diagnosable)*
**(b) Commit batch 2A with fewer than 15 puzzles** (e.g., 11) and add the deficit to batch 2B's count — migration adjusted to match
**(c) Stop and revise the prompt template** before any more generation

**Default behavior:** Option (a) unless the failure rate is so high (<50%) that the stop-on-failure rule fires. Commit only when the batch hits the target count (15) OR when option (b) is explicitly chosen with the migration adjusted to match.

---

## Batch 2A Tracking Table

Updated after each run. Status values: `pending` / `approved` / `rejected` / `approved-marginal`

| puzzle_id | rows summary | cols summary | run # | status | notes |
|---|---|---|---|---|---|
| sg-016 | Ajax / Porto / Benfica | Premier League / FWD / CL Winner | 1 | approved | |
| sg-017 | Sevilla / Marseille / Galatasaray | Premier League / FWD / French | 1 | approved | |
| sg-018 | Bayer Leverkusen / Lazio / Sporting CP | MID / Premier League / CL Winner | 1 | approved | |
| sg-019 | Colombian / Uruguayan / Chilean | Barcelona / Premier League / Copa América Winner | 1 | approved | |
| sg-020 | Boca Juniors / River Plate / Croatian | Serie A / MID / La Liga | 1 | approved | |
| sg-021 | Fiorentina / Valencia / Villarreal | Argentine / La Liga / MID | 2 | approved | Argentine used as col (previously row in sg-006) |
| sg-022 | Celtic / PSV / Feyenoord | DEF / Premier League / Dutch | 2 | approved | Dutch used as col (previously row in sg-013) |
| sg-023 | Lyon / Monaco / Lille | DEF / Ligue 1 / Serie A | 2 | approved | |
| sg-024 | Belgian / Polish / Norwegian | Borussia Dortmund / Ligue 1 / GK | 2 | approved | |
| sg-025 | Man United / Bayern Munich / Juventus | Ballon d'Or Winner / WC Winner / 100 Caps | 2 | approved | First use of Ballon d'Or Winner |
| sg-026 | Newcastle / Everton / West Ham | Eredivisie / DEF / Serie A | 3 | approved | First use of Eredivisie |
| sg-027 | Eintracht Frankfurt / Schalke / Beşiktaş | Premier League / Süper Lig / MID | 3 | approved | First use of Süper Lig; ş/ü UTF-8 verified |
| sg-028 | Senegalese / Ivorian / Cameroonian | AFCON Winner / Ligue 1 / Chelsea | 3 | approved | First use of African Cup of Nations Winner |
| sg-029 | Real Madrid / Bayern Munich / Inter Milan | WC Winner / UEFA Euro Winner / Europa League Winner | 3 | approved | First use of UEFA Euro Winner + Europa League Winner |
| sg-030 | Liverpool / Chelsea / Man City | Saudi Pro League / GK / Brazilian | 3 | approved | First use of Saudi Pro League; Brazilian used as col |

**Batch 2A result:** 15 / 15 approved &nbsp;|&nbsp; Pass rate: **100%** &nbsp;|&nbsp; Decision: **Proceed to Batch 2B**

---

## Running Attribute Cap Tallies

Updated as each puzzle is approved. Hard limits are for the full 35-puzzle expansion (batch 2A + 2B combined). Batch 2A budgets are the per-batch allocations.

| Attribute | Batch 2A approved | Batch 2A budget | Full-35 limit | Remaining for 2B |
|---|---|---|---|---|
| Champions League Winner | **2** (sg-016, sg-018) | ≤ 2 ✅ | ≤ 5 | 3 |
| World Cup Winner | **2** (sg-025, sg-029) | ≤ 3 ✅ | ≤ 6 | 4 |
| Forward (FWD) | **2** (sg-016, sg-017) | ≤ 4 ✅ | ≤ 8 | 6 |
| Played for Real Madrid (row or col) | **1** (sg-029 row) | ≤ 1 ✅ | ≤ 2 | 1 |
| Ballon d'Or Winner | **1** (sg-025) | 1–2 ✅ | 2–4 | 1–3 |
| Europa League Winner | **1** (sg-029) | 1 ✅ | 1–3 | 0–2 |
| Copa América Winner | **1** (sg-019) | 1 ✅ | 1–2 | 0–1 |
| UEFA Euro Winner | **1** (sg-029) | 0–1 ✅ | 1–2 | 0–1 |
| African Cup of Nations Winner | **1** (sg-028) | 0–1 ✅ | 1–2 | 0–1 |
| Played in Eredivisie | **1** (sg-026) | 1–2 ✅ | 2–3 | 1–2 |
| Played in Primeira Liga | **0** ⚠️ not introduced | 1 | 1–2 | 1–2 (must add in 2B) |
| Played in Süper Lig | **1** (sg-027) | 0–1 ✅ | 1 | **0 — AT FULL CAP** |
| Played in Saudi Pro League | **1** (sg-030) | 0–1 ✅ | 1 | **0 — AT FULL CAP** |

---

## New Club/Nationality Coverage Log

Track which new clubs and nationalities have been introduced. Update as puzzles are approved.

**New clubs introduced (target: cover most high-priority clubs across all 35):**
- [x] Ajax (sg-016)
- [x] Porto (sg-016)
- [x] Benfica (sg-016)
- [x] Sevilla (sg-017)
- [x] Lyon (sg-023)
- [x] Marseille (sg-017)
- [x] Galatasaray (sg-017)
- [x] Boca Juniors (sg-020)
- [x] River Plate (sg-020)
- [ ] Flamengo — not yet introduced, candidate for Batch 2B
- [x] Bayer Leverkusen (sg-018)
- [x] Lazio (sg-018)
- [x] Fiorentina (sg-021)
- [x] Sporting CP (sg-018)
- [x] PSV (sg-022)
- [x] Feyenoord (sg-022)
- [x] Celtic (sg-022)
- [ ] Inter Miami — not yet introduced, candidate for Batch 2B

Additional clubs introduced (not in original checklist): Valencia (sg-021), Villarreal (sg-021), Monaco (sg-023), Lille (sg-023), Newcastle (sg-026), Everton (sg-026), West Ham (sg-026), Eintracht Frankfurt (sg-027), Schalke (sg-027), Beşiktaş (sg-027)

**New nationalities introduced (target: cover most high-priority nationalities across all 35):**
- [x] Colombian (sg-019)
- [x] Uruguayan (sg-019)
- [x] Belgian (sg-024)
- [x] Croatian (sg-020)
- [x] Senegalese (sg-028)
- [x] Ivorian (sg-028)
- [x] Polish (sg-024)
- [x] Norwegian (sg-024)
- [ ] Welsh — not yet introduced, candidate for Batch 2B
- [ ] Egyptian — not yet introduced, candidate for Batch 2B
- [x] Cameroonian (sg-028)
- [ ] Moroccan — not yet introduced, candidate for Batch 2B
- [ ] Serbian — not yet introduced, candidate for Batch 2B
- [ ] Japanese — not yet introduced, candidate for Batch 2B
- [ ] South Korean — not yet introduced, candidate for Batch 2B

Additional nationality: Chilean (sg-019, not in original list but valid addition)

Previously-seen nationalities used as col attributes for the first time: Argentine (sg-021), Dutch (sg-022), Brazilian (sg-030)

---

## Migration Plan

**Batch 2A file:** `supabase/migrations/20260526000005_soccer_grid_puzzles_batch2a.sql`

Rules:
- INSERT only — table already exists, no DDL
- Plain string literals for JSONB columns — no `::jsonb` explicit casts (lesson from Session 1g)
- No `ON CONFLICT` clause (lesson from Session 1g)
- sort_order: sg-016 = 15, sg-017 = 16, … sg-030 = 29
- Apply manually via Supabase SQL Editor
- Verify: `SELECT COUNT(*) FROM soccer_grid_puzzles` → expect 30 after apply

**Batch 2B file (planned):** `supabase/migrations/20260526000006_soccer_grid_puzzles_batch2b.sql`
- IDs: sg-031 through sg-050, sort_order 30–49
- Only written after Batch 2A passes QC (≥70% acceptance rate)

---

## Edge Function Note

The `soccer-grid-validate` function sends `rowAttribute` and `colAttribute` as raw label strings to Gemini 2.5 Flash (knowledge cutoff: March 2026). New attribute labels (Ballon d'Or Winner, Played in Eredivisie, Copa América Winner, etc.) work without any code change — Gemini interprets them via natural language.

**Label wording must be unambiguous.** The AI validator has no hardcoded lookup for new attributes; it uses general knowledge. Clearly worded labels like `"Played in Eredivisie"` and `"Copa América Winner"` are safe. Ambiguous labels like `"Top scorer"` or `"Major trophy winner"` would produce inconsistent results — avoid them.

**Pre-existing quirk:** `"Played in MLS"` uses `type: "misc"` in sg-015 (inconsistent with other league attributes). Do NOT fix this in a new migration (would require an UPDATE). All new league attributes use `type: "league"`.

---

## Lessons Learned

- **Prompt template issues:** None. Template performed well across all 3 runs. No reformatting needed for Batch 2B.
- **Most common failure mode:** None — 15/15 pass rate. No dead cells, no near-duplicates, no cap violations caught in QC.
- **Attribute combinations to avoid in Batch 2B:** Süper Lig and Saudi Pro League are at their full-35 cap (1/1 each) — do NOT reuse. Played in Primeira Liga was skipped entirely in Batch 2A — must be introduced in Batch 2B.
- **New attributes that worked well:** All new attributes (Ballon d'Or Winner, Copa América Winner, UEFA Euro Winner, African Cup of Nations Winner, Europa League Winner, Eredivisie, Süper Lig, Saudi Pro League) introduced cleanly with no validator issues.
- **New attributes that caused problems:** None.
- **Factual errors caught in spot-check:** None flagged.
- **Batch 2A final pass rate:** 15 / 15 (100%)
- **Decision on Batch 2B:** ✅ Unblocked. Target: sg-031 through sg-050 (20 puzzles). Priorities: introduce Flamengo, Inter Miami, Primeira Liga, Welsh, Japanese, South Korean, Moroccan; add second Eredivisie puzzle; continue adding Ballon d'Or Winner (1–3 remaining budget).
- **File write issue (critical lesson for future sessions):** The Write tool (Claude Code) mangled the absolute Windows path `C:\Users\antho\ballpark-hero\supabase\migrations\...` into a single filename string at the repo root, producing a 0-byte garbage file (`Usersanthoballpark-herosupabasemigrations...sql`). The actual migration file was subsequently written correctly via Bash heredoc with relative path. **Rule going forward: use Bash heredoc for migration files, always verify with `wc -c` immediately after creation, and treat any Write tool output as unverified until byte count is confirmed non-zero.**
