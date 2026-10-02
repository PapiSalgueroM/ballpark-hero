# MLB rating inputs903, 2026-10-02

Accepted scope: source preparation only. No ratings, gameplay, current
roster, database or browser save changes. No new statistics enter the app.
One official publisher lineage is retained, not independent verification.

Four requests completed once each, without retries, redirects or per-player
requests. The official URLs retain regular season, all-player, MLB scope:

| Season | Group | Rows | Official source |
|---|---|---:|---|
| 2024 | Hitting | 742 | [MLB Stats API](https://statsapi.mlb.com/api/v1/stats?stats=season&group=hitting&season=2024&sportId=1&gameType=R&playerPool=ALL&limit=5000) |
| 2024 | Pitching | 855 | [MLB Stats API](https://statsapi.mlb.com/api/v1/stats?stats=season&group=pitching&season=2024&sportId=1&gameType=R&playerPool=ALL&limit=5000) |
| 2025 | Hitting | 765 | [MLB Stats API](https://statsapi.mlb.com/api/v1/stats?stats=season&group=hitting&season=2025&sportId=1&gameType=R&playerPool=ALL&limit=5000) |
| 2025 | Pitching | 873 | [MLB Stats API](https://statsapi.mlb.com/api/v1/stats?stats=season&group=pitching&season=2025&sportId=1&gameType=R&playerPool=ALL&limit=5000) |

Retrieved 2026-10-02 between21:44:55.987Z and21:44:56.798Z. Responses
echo season, group and season-stat type; the regular-season URL filter is
not independently echoed by every row. Preserve that limitation.

The compact script checkpoint matches all3,235 raw rows and21,580 retained
fields. Batting retains opportunities and OPS; pitching retains games,
starts, outs, homers, walks, strikeouts and saves. It omits unused rate
strings rather than fabricating values for zero-outs pitchers.

Current780 selected players join by numeric MLB ID. The two Max Muncy and
two Jose Fermin identities stay separate.2024 has584 relevant matches and
196 missing rows;2025 has683 matches and97 missing rows. Missing stays
missing.59 and40 dated pitching-role differences are explicit. Those role
buckets are model categories based on usage, not corrections to real
historical positions. Nine existing acquisition/source files remained raw
byte identical during extraction; six canonical current inputs are pinned
by normalized hashes in the validator.

Arithmetic checks found no unexplained discrepancy in total bases,
average, slugging, on-base percentage, outs, ERA, WHIP or the three per-nine
rates. The first unrounded OPS comparison flagged318 rows; all318 equal
the official displayed OBP plus displayed SLG. All1,507 displayed OPS
values match that sum. The initial flags and rounding explanation remain
in the receipt. Ten unavailable rate strings for two zero-outs pitchers
remain in the raw evidence. This does not independently verify statistics.

The first validator allowed caller-edited finite OPS or a changed current
file when its checksum was changed alongside it. Both physical bypasses
were reproduced before the repair. Independent constants now pin four
compact table hashes and six current source hashes. The same edits are
refused. A checksum is an integrity check, not a second factual source.

Final proof:15/15 normal outcomes and21 effective copied controls. All15
cases run per control, with exact intended failure sets and four independent
baselines held. Invalid-field fixtures reseal only disposable helper copies
so individual field guards can be exercised. Production has no reseal
option. Temporary copies are cleaned within the verified TEMP prefix.

The first parent gate correctly found the existing pitcher Ty Madden's
name in the new checkpoint. The existing exact-person allowance now also
covers that one data file, using the already recorded two-source identity.
The file is still scanned. The person control catches all20 alternate
spellings across its four allowed files, with zero unrelated findings.

Parent isolated gate: real app TypeScript check, build,903 source harness,
existing MLB roster harness and rival-name guard passed. No app or derived
snapshot files changed. All twelve paused drafts and seven stashes held.

Evidence on this machine:

- TEMP/dukb-mlb903-source-2026-10-02/verified-summary.json
- TEMP/dukb-mlb903-source-2026-10-02/raw-extraction-proof.json
- TEMP/dukb-mlb903-source-2026-10-02/manifest.json and four raw responses
- TEMP/dukb-mlb903-clean-gate-2026-10-02/verified-summary.json

Final raw SHA256:

| File | SHA256 |
|---|---|
| scripts/data/mlbOpeningRatingInputs2026.json | a640453126c0576b2bbed25fd1b3d5e4902a2a4d9087676cb60d38e948c21b3f |
| scripts/lib/mlbOpeningRatingInputs.mjs | 9469efdcf494e6d3f6afd10b51d84aacb4a0c8f26364b8d95e7f72bd5717127b |
| scripts/simMlbOpeningRatingInputs.mjs | 4f287b0df95e1dae42ad78360ba208609afb7a57b0aff82d2c9119fc8b6d7f72 |

Next: separately review a multiyear production-proxy model and four-season
future-contract economy before binding anything. Whole-player ability,
defense, baserunning and independently verified historical data remain
outside this checkpoint. Google review readiness is not determined here.
