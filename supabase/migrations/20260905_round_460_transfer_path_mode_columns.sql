-- Round 460: Transfer Path's special rules (active players only, Europe only).
-- Each rule is a filter on the search graph, so the minimum and the hint for a
-- pair differ per rule. Both are DERIVED by scripts/genTransferPathHints.mjs
-- under the rule's own filter (src/lib/transferPathModes.ts, the file the page
-- searches through) and written by 20260905_round_460_transfer_path_mode_hints.sql.
-- Nothing in these columns is typed by hand. A null minimum means the pair has
-- no path under that rule; the page then offers a puzzle that does, never a
-- hint into a refusal (Round 294's failure). The pair constraints keep a
-- minimum and its hint null together, so a half written row cannot ship.
alter table public.transfer_path_puzzles
  add column if not exists active_min_steps smallint,
  add column if not exists active_hint text,
  add column if not exists europe_min_steps smallint,
  add column if not exists europe_hint text;

alter table public.transfer_path_puzzles
  add constraint transfer_path_puzzles_active_pair
    check ((active_min_steps is null) = (active_hint is null)),
  add constraint transfer_path_puzzles_europe_pair
    check ((europe_min_steps is null) = (europe_hint is null));
