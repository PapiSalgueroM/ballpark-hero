# Round 1312 notes: the NHL season facts read twice

Written by the builder of Round 1312 on 2026-10-12. Branch r1312-nhl-week-data, base origin/main b6eb78e7.

This round changes nothing a player sees. It reads the facts the NHL week by week view (Round 1315) will
print, writes what each page literally says into scripts/data/usSeasonSources1312.json, and only then a block of
src/data/usSeasonLedgerNhl.ts, held by scripts/simUsSeasonLedger.mjs.

## Step 1: the harness reads two receipts files

scripts/simUsSeasonLedger.mjs now reads scripts/data/usSeasonSources1211.json and
scripts/data/usSeasonSources1312.json. Each file carries its own reading day and every receipt in it must carry
that day (R3, control readday). A key lives in exactly one file (R6, control keytwice). Every receipt a ledger
cites must be of a day that ledger names. The dash check (D1) reads both files and these notes.
