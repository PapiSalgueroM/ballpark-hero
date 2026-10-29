// Review probe for Round 1565 (run lens), applied on the runner only and restored by the request line.
// Holds the 38 boards Round 1565 rewrote to the ledger's own "rebuilt" rule (every group on a rebuilt board is checked
// and every member confirmed), to measure how much of what the round rewrote nothing judges.
import fs from 'node:fs';
const L = 'scripts/data/connectionsVerified2026-10/ledger.json';
const mig = fs.readFileSync('supabase/migrations/20261029120000_round_1565_connections_live.sql', 'utf8');
const ids = [...mig.matchAll(/^ {4}\('([a-z]+-[0-9-]+)', '/gm)].map(m => m[1]);
if (ids.length !== 38) { console.log(`PROBE ABORTED: ${ids.length} ids`); process.exit(3); }
const j = JSON.parse(fs.readFileSync(L, 'utf8'));
const before = j.rebuilt.length;
j.rebuilt = [...new Set([...j.rebuilt, ...ids])];
fs.writeFileSync(L, JSON.stringify(j, null, 2));
console.log(`PROBE rebuilt38: ledger.rebuilt ${before} -> ${j.rebuilt.length}`);
