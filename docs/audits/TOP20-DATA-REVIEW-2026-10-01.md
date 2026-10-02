# Top20 flagged sports records for review

These20 records are examples from the230-row structural corruption backlog.
They are20 actual stored records, not20 distinct root causes or20 fully
verified replacement records. Retrieval: October1,2026. All230 annotated
records, current fields, reasons, review status and candidate sources are in
`evidence847/data-review-rows.json`. The full source comparisons and consumer
limits are in `DATA-QUALITY-AUDIT-2026-10-01.md`.

The 230-record union consists of 69 NHL and 161 MLB records. MLB first-year
annotations follow the original SQL format/lower-bound criterion, which
matched 147 records. The original TEXT year comparison matched 53 records;
only 9 of those are numerically reversed spans, while 44 have malformed short
first-year strings. Reversal annotations use the numeric comparison. These
counts overlap and are not additional records. Bridwell's unresolved GP and
final year are excluded from proposed correct fields, not proposed as NULL.

| Rank | Dataset/player | Current suspicious fields | Why invalid | Correct information/status | Action |
| --- | --- | --- | --- | --- | --- |
| 1 | public.nhl_player_stats: Bobby Robins | Start 3; GP 33; G 3; A 0; P 0 | Malformed first season; P != G + A | GP3; start2014-15; G0/A0/P0, official NHL plus Hockey Reference | Flag pending reviewed source/import correction |
| 2 | public.mlb_batting_stats: Al Bridwell | 1252..1905; H 457; 2B 935; 3B 95; HR 32; TB 90 | Invalid first year; TB identity fails | Start1905; H1064/2B95/3B32/HR2/TB1229; GP/final year unresolved | Flag pending reviewed source/import correction |
| 3 | public.nhl_player_stats: Tyson Gross | Start 2025-26; GP 1; G 0; A 1; P -2 | P != G + A; Negative points | Unknown historical replacement; verify every affected field with two sources | Flag pending reviewed source/import correction |
| 4 | public.nhl_player_stats: Aku Raty | Start 1; GP 22; G 1; A 0; P 1 | Malformed first season | Unknown historical replacement; verify every affected field with two sources | Flag pending reviewed source/import correction |
| 5 | public.nhl_player_stats: Andre Petersson | Start 1; GP 21; G 1; A 0; P 0 | Malformed first season; P != G + A | Unknown historical replacement; verify every affected field with two sources | Flag pending reviewed source/import correction |
| 6 | public.nhl_player_stats: Anton Klementyev | Start 1; GP 19; G 1; A 0; P 0 | Malformed first season; P != G + A | Unknown historical replacement; verify every affected field with two sources | Flag pending reviewed source/import correction |
| 7 | public.nhl_player_stats: Brandon Baddock | Start 1; GP 26; G 1; A 0; P 0 | Malformed first season; P != G + A | Unknown historical replacement; verify every affected field with two sources | Flag pending reviewed source/import correction |
| 8 | public.nhl_player_stats: Brandon Scanlin | Start 1; GP 24; G 1; A 0; P 0 | Malformed first season; P != G + A | Unknown historical replacement; verify every affected field with two sources | Flag pending reviewed source/import correction |
| 9 | public.nhl_player_stats: Brendan Ranford | Start 1; GP 22; G 1; A 0; P 0 | Malformed first season; P != G + A | Unknown historical replacement; verify every affected field with two sources | Flag pending reviewed source/import correction |
| 10 | public.nhl_player_stats: Cameron Butler | Start 1; GP 21; G 1; A 0; P 0 | Malformed first season; P != G + A | Unknown historical replacement; verify every affected field with two sources | Flag pending reviewed source/import correction |
| 11 | public.nhl_player_stats: Carl Sneep | Start 1; GP 24; G 1; A 0; P 1 | Malformed first season | Unknown historical replacement; verify every affected field with two sources | Flag pending reviewed source/import correction |
| 12 | public.mlb_batting_stats: Art Devlin | 1313..1904; H 603; 2B 954; 3B 164; HR 57; TB 109 | Invalid first year; TB identity fails | Unknown historical replacement; verify every affected field with two sources | Flag pending reviewed source/import correction |
| 13 | public.mlb_batting_stats: Art Fletcher | 1533..1909; H 684; 2B 1187; 3B 238; HR 77; TB 100 | Invalid first year; TB identity fails | Unknown historical replacement; verify every affected field with two sources | Flag pending reviewed source/import correction |
| 14 | public.mlb_batting_stats: Beals Becker | 876..1908; H 368; 2B 561; 3B 114; HR 43; TB 113 | Invalid first year; TB identity fails | Unknown historical replacement; verify every affected field with two sources | Flag pending reviewed source/import correction |
| 15 | public.mlb_batting_stats: Benny Kauff | 859..1912; H 521; 2B 686; 3B 169; HR 57; TB 149 | Invalid first year; TB identity fails | Unknown historical replacement; verify every affected field with two sources | Flag pending reviewed source/import correction |
| 16 | public.mlb_batting_stats: Bill Bergen | 947..1901; H 138; 2B 448; 3B 45; HR 21; TB 21 | Invalid first year; TB identity fails | Unknown historical replacement; verify every affected field with two sources | Flag pending reviewed source/import correction |
| 17 | public.mlb_batting_stats: Bill Bradley | 1426..1900; H 728; 2B 1047; 3B 269; HR 83; TB 107 | Invalid first year; TB identity fails | Unknown historical replacement; verify every affected field with two sources | Flag pending reviewed source/import correction |
| 18 | public.mlb_batting_stats: Bill Coughlin | 1043..1901; H 479; 2B 783; 3B 133; HR 38; TB 88 | Invalid first year; TB identity fails | Unknown historical replacement; verify every affected field with two sources | Flag pending reviewed source/import correction |
| 19 | public.mlb_batting_stats: Bill Dahlen | 1336..1900; H 606; 2B 909; 3B 188; HR 50; TB 96 | Invalid first year; TB identity fails | Unknown historical replacement; verify every affected field with two sources | Flag pending reviewed source/import correction |
| 20 | public.mlb_batting_stats: Bill Hinchman | 908..1905; H 364; 2B 576; 3B 128; HR 69; TB 118 | Invalid first year; TB identity fails | Unknown historical replacement; verify every affected field with two sources | Flag pending reviewed source/import correction |

The separate visible Lundqvist points46 versus27 issue is DQ03; it should be
reviewed ahead of low-impact table-only examples. Bo Nix is a source conflict,
not a confirmed wrong-record replacement. Undated MLB team conflicts and
incomplete career lists are metadata flags. Do not guess a correct field by
rearranging columns, or overwrite unverified values with realistic-looking
numbers. No production data changed.
