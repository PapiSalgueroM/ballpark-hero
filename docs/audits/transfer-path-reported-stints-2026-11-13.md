# Transfer Path reported 2024-25 and 2025-26 teammate links

The 13 November 2026 public read found 253 players, 3,640 season rows and 885 puzzle rows. It confirmed that Endrick already has Real Madrid 2024-25 and that Dani Carvajal, Alexander Isak and Virgil van Dijk each lack the season at issue. The 20 bundled fallback puzzles use the same affected career coverage. The older draft changes at `452175519` and `3a635bffb` proposed changes to shared career statistics. This audit uses club membership only.

## Liverpool

Isak and Van Dijk both started for Liverpool against Atletico Madrid on 17 September 2025. The `tpa-771` chain of Mikel Oyarzabal, Alexander Isak, Virgil van Dijk and Trent Alexander-Arnold has three links. The new Liverpool 2025-26 memberships are limited to Everyday and Europe. All current stored minima and hints in those modes remain valid. All 20 fallback rows and the immutable generator outputs retain their exact bytes. [Liverpool lineup](https://www.liverpoolfc.com/news/confirmed-liverpool-line-v-atletico-madrid-1) and [UEFA full-time report](https://www.uefa.com/newsfiles/UCL/2026/2045911_FR.pdf).

Report `b8d1d865-e764-4746-b5b5-bc917c985f2b` remains partial. Applying the Liverpool memberships in Active also shortens four existing minima. The table shows the current stored live value and the new graph result. The original Active live snapshot already has 59 individual hint diagnostics, including baseline disagreements on `tpa-275` and `tpa-846`. Any later Active update should re-read the live table, account for those pre-existing differences and qualify the actual puzzle revisions together with the graph.

| Puzzle | Stored Active minimum | With Liverpool membership |
| --- | --- | --- |
| `tpa-207` | 5 | 3 |
| `tpa-275` | 5 | 3 |
| `tpa-470` | 6 | 3 |
| `tpa-846` | 7 | 4 |

## Real Madrid

Carvajal and Endrick played for Real Madrid against Stuttgart on 17 September 2024. The full 2024-25 membership restores the reported `tpa-781` link but would shorten the following existing live minima. Reports `18445d32-814a-4ce2-bad5-f62a9681698e` and `af8f0322-24ae-4e83-9ebb-c86ee297d8a6` remain pending a coordinated graph and puzzle update. [Real Madrid lineup](https://www.realmadrid.com/en-US/news/football/first-team/latest-news/once-inicial-del-real-madrid-contra-el-stuttgart-17-09-2024) and [UEFA appearance report](https://www.uefa.com/newsfiles/UCL/2025/2042038_SPS.pdf).

| Puzzle | Required minimum update | Replacement hint or route |
| --- | --- | --- |
| `tpa-679`, Carvajal to Estevao | Everyday 3 to 2. Europe has no path. | Endrick bridges Real Madrid and Palmeiras. |
| `tpa-730`, Carvajal to Kylian Mbappe | Everyday and Europe 2 to 1. | Direct link. They were at Real Madrid together. |
| `tpa-902`, Carvajal to Endrick | Everyday and Europe 2 to 1. | Direct link. They were at Real Madrid together. |

Re-derive all 885 live rows and 20 fallback rows against the proposed graph before staging the exact affected puzzle cells. Existing Career Ladder clues, season statistics and Active identity evidence stay outside that update. All reads for this audit used public GET or SELECT.
