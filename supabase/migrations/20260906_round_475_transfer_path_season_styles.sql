-- Round 475: Transfer Path now links the two season styles the career table writes for one
-- club (calendar years like 2011 and split seasons like 2010-2011), so five puzzles' stored
-- minimum or hint stopped matching the search. Every value below was written by
-- scripts/genTransferPathHints.mjs into 20260826_transfer_path_hints_temporal.sql, which holds
-- all 902 rows; this file is the five of them that moved in this round, copied out so the live
-- table could be brought level without replaying 902 updates. The mode columns
-- (20260905_round_460_transfer_path_mode_hints.sql) did not move: every club where the two
-- styles meet sits outside Europe, and no active pair's shortest path runs through one.
-- To re-derive: run the generator and take the rows it changes. Never edit a hint by hand.
begin;
update public.transfer_path_puzzles set min_steps = 2, hint = 'One middle man does it. He was at Real Madrid with Arjen Robben and at Santos with Neymar.' where puzzle_id = 'tpa-66';
update public.transfer_path_puzzles set min_steps = 2, hint = 'One middle man does it. He was at LAFC with Hugo Lloris and at Chelsea with Thiago Silva.' where puzzle_id = 'tpa-101';
update public.transfer_path_puzzles set min_steps = 3, hint = 'Two middle men at least. The first was at Arsenal with Bukayo Saka; the last was at LAFC with Hugo Lloris.' where puzzle_id = 'tpa-276';
update public.transfer_path_puzzles set min_steps = 3, hint = 'Two middle men at least. The first was at Chelsea with Frank Lampard; the last was at LAFC with Hugo Lloris.' where puzzle_id = 'tpa-855';
update public.transfer_path_puzzles set min_steps = 2, hint = 'One middle man does it. He was at New York City FC with Andrea Pirlo and at Atlético Madrid with Diego Costa.' where puzzle_id = 'tpa-905';
commit;
