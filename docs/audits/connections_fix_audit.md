# Audit — Connections (special cases 4.2 + 4.3)

**Run:** overnight staging 2026-05-29. **Nothing regenerated to live. Quarantined batch stays quarantined.**

---

## 4.2 — Root cause of the 115 broken Connections puzzles

**The `TOURNAMENT_TO_NATIONALITY` dict in `docs/scripts/autopilot-all-games.py` is NOT the bug** — its keys→values are internally consistent ("WC 2022 Argentina winners" → "Argentina", etc.).

**The real bug is in the DATA:** `docs/data/soccer-data.json` → `tournament_winners`. Each tournament key is paired with the **wrong nation's squad** (the generator then labels those players "Played for <key's nation>", producing unsolvable groups). Identified by inspecting the player names in each list:

| Key in soccer-data.json (claims winner) | Players actually listed are… | Correct? |
|---|---|---|
| `WC 2022 Argentina winners` | **Ecuador** (Galíndez, Hincapié, Estupiñán, Enner Valencia, Caicedo, Plata) | ❌ wrong nation |
| `WC 2018 France winners` | **Egypt** (El Hadary, Elmohamady, Hegazi, Morsy, Gaber) | ❌ |
| `Euro 2024 Spain winners` | **Germany** (Neuer, Rüdiger, Raum, Tah) | ❌ |
| `Euro 2020 Italy winners` | **Switzerland** (Sommer, Mbabu, Widmer, Elvedi) | ❌ |
| `Copa America 2024 Argentina winners` | **Argentina** (Armani, Martínez Quarta, Tagliafico, Montiel) | ✅ correct |
| `Copa America 2021 Argentina winners` | **Venezuela** (Faríñez, Ferraresi, Villanueva, Chancellor) | ❌ |
| `AFCON 2023 Ivory Coast winners` | **Ivory Coast** (Fofana, Diomande, Konan, Seri) | ✅ correct |
| `AFCON 2021 Senegal winners` | **Burkina Faso** (Sawadogo, Ouattara, Traoré) | ❌ |

So 6 of 8 tournament rosters are mislabeled. (The master brief guessed "Venezuela" for the Argentina-WC slot; it's actually **Ecuador** for WC 2022 — Venezuela is the Copa-2021 slot. Verified against the data, not assumed.)

### Corrected mapping (relabel each roster by its TRUE nationality)
Do **not** trust the "winner" keys. The safe correction is to drop the tournament-winner framing and label each existing roster by the nationality its players actually share:
```
Ecuador squad      -> "Played for Ecuador"        (NOT Argentina)
Egypt squad        -> "Played for Egypt"          (NOT France)
Germany squad      -> "Played for Germany"        (NOT Spain)
Switzerland squad  -> "Played for Switzerland"    (NOT Italy)
Argentina squad    -> "Played for Argentina"      (already correct)
Venezuela squad    -> "Played for Venezuela"      (NOT Argentina)
Ivory Coast squad  -> "Played for Ivory Coast"    (already correct)
Burkina Faso squad -> "Played for Burkina Faso"   (NOT Senegal)
```
The "Won <tournament>" (insane) categories are wrong for the same reason and must be dropped or re-derived. **Recommended real fix:** re-key `tournament_winners` in `soccer-data.json` so each list sits under its true nation, then re-verify each player's nationality before any regeneration.

### 5 sample CORRECTED puzzle groups (for fact-check — not shipped)
Built from the real players in the data, relabeled to the true nationality:
1. **Played for Ecuador:** Piero Hincapié, Pervis Estupiñán, Moisés Caicedo, Enner Valencia
2. **Played for Egypt:** Essam El Hadary, Ahmed Elmohamady, Ahmed Hegazi, Omar Gaber
3. **Played for Germany:** Manuel Neuer, Antonio Rüdiger, David Raum, Jonathan Tah
4. **Played for Switzerland:** Yann Sommer, Kevin Mbabu, Silvan Widmer, Nico Elvedi
5. **Played for Venezuela:** Wuilker Faríñez, Nahuel Ferraresi, Mikel Villanueva, Jhon Chancellor

Each must still be human-verified (player → nationality) before any puzzle is built. The quarantined `_DO_NOT_APPLY_..._.bak` migration is unaffected and must not be applied.

---

## 4.3 — The 30 "good" Connections puzzles (puzzle-156 → 185)

**Result of repo-wide search (`puzzle-156`, `puzzle-170`, `puzzle-185`): NONE EXIST.**
The highest connections puzzle present anywhere in the repo is **puzzle-155**, in both:
- `src/data/connectionsPuzzles.ts`
- `supabase/migrations/20260526000004_connections_puzzles.sql`

Puzzles **156–185 are absent from every `.sql`, `.json`, and `.ts` file.** They were approved in chat across Runs 1–6 but never written to disk. **They need reconstruction from chat history or regeneration — I did not fabricate them.** This matches the live state (connections_puzzles live max = puzzle-155).
