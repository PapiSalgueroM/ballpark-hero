/* Round 1567: which Baseball, NFL and NHL Connections board is dealt on a day, and does the Round 1567 migration
   (supabase/migrations/20261029120000_round_1567_us_connections_gray.sql) rewrite it?

   The dealing is Round 1558's script, word for word (scripts/qa/connectionsDealtDay1558.mjs: dailyIndex over the
   valid rows in sort_order, the game's own rule); this only points it at this round's migration. A saved daily
   guess keeps the groups it solved as they were saved, so apply on a day it says is clear for all three:

     node scripts/qa/connectionsDealtDay1567.mjs baseball=<export.json>,nfl=<export.json>,nhl=<export.json> 2026-11-03
     node scripts/qa/connectionsDealtDay1567.mjs file 2026-10-29 +40     (the files the game falls back to)

   Exit 1 when any date deals a board the migration rewrites. Reads only the exports and the repo. */
process.env.DEALT_MIGRATION = 'supabase/migrations/20261029120000_round_1567_us_connections_gray.sql';
/* every NFL and NHL board and 14 baseball boards change only a club label ("as of"): those cannot strand a tile */
process.env.DEALT_LABELS_ONLY_SAFE = '1';
await import('./connectionsDealtDay1558.mjs');
