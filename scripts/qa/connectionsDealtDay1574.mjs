/* Round 1574: which NHL Connections board is dealt on a day, and does the Round 1574 migration
   (supabase/migrations/20261030150000_round_1574_nhl_connections_tables.sql) rewrite it?

   The dealing is Round 1558's script, word for word (scripts/qa/connectionsDealtDay1558.mjs: dailyIndex over the
   valid rows in sort_order, the game's own rule); this points it at this round's migration. A saved daily guess
   keeps the groups it solved as they were saved, so apply on a day it says is clear:

     node scripts/qa/connectionsDealtDay1574.mjs nhl=<export.json> 2026-11-03 +40

   Before dealing, it reads the migration's row lines with the 1558 script's own pattern and stops (exit 1) unless
   it finds exactly the plan's rows (scripts/qa/usConnections1574Migration.mjs): a writer that changed the row line
   by one character would leave the 1558 script reading nothing and calling every day clear.
   DEALT_CONTROL=reshaped feeds it a copy of the migration whose row lines are reshaped: it must stop, never print
   a clear day.

   Boards 005 to 008 change only club labels ("Played for the Oilers (as of 2025-26)"): those are safe only once the
   release carrying Round 1567's matcher (6acba2488, src/lib/connectionsSolvedMatch.ts: a saved group matched by its
   label or its five names) is live, which APPLY-1574 proves first by a grep of the live chunk. So the safe default
   counts a relabel as a rewrite (DEALT_LABELS_ONLY_SAFE unset or anything but 1, fix-1574: a forgotten variable no
   longer calls a relabelled board's day clear); only after that grep does the lead run it with
   DEALT_LABELS_ONLY_SAFE=1. Exit 1 when any date deals a rewritten board. Reads only the export and the repo. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MIGRATION, plan } from './usConnections1574Migration.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let mig = MIGRATION;
if (process.env.DEALT_CONTROL === 'reshaped') {
  const text = fs.readFileSync(path.join(ROOT, MIGRATION), 'utf8');
  const shaped = text.replace(/^ {4}\('nhlconn-/gm, "    ( 'nhlconn-");
  if (shaped === text) { console.error('DEALT_CONTROL=reshaped: no row line to reshape, ABORTED'); process.exit(2); }
  mig = '.tmp-fx/dealt-reshaped-1574.sql';
  fs.mkdirSync(path.join(ROOT, '.tmp-fx'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, mig), shaped);
  console.log(`DEALT_CONTROL=reshaped: the row lines of ${MIGRATION} reshaped into ${mig}; this run must stop, never print a clear day`);
}
/* the 1558 script's own row pattern, word for word */
const ROW = /^\s*\('((?:bconn|nflconn|nhlconn)-[0-9]+)', '((?:[^']|'')*)', '((?:[^']|'')*)'\)/gm;
const read = new Set([...fs.readFileSync(path.join(ROOT, mig), 'utf8').matchAll(ROW)].map(x => x[1]));
const want = plan().map(r => r.id);
if (read.size !== want.length || want.some(id => !read.has(id))) {
  console.error(`STOP: the dealt day check reads ${read.size} rows of ${mig}, the plan rewrites ${want.length} (${want.filter(id => !read.has(id)).slice(0, 5).join(', ')}${want.length - read.size > 5 ? ', ...' : ''} unread): no day is called clear`);
  process.exit(1);
}
console.log(`the migration's ${read.size} rows read, as the plan has them`);
process.env.DEALT_MIGRATION = mig;
/* fails closed: a relabel is a rewrite unless the lead says 1, after the live chunk grep proves 1567's matcher live */
process.env.DEALT_LABELS_ONLY_SAFE = process.env.DEALT_LABELS_ONLY_SAFE === '1' ? '1' : '0';
console.log(process.env.DEALT_LABELS_ONLY_SAFE === '1'
  ? 'DEALT_LABELS_ONLY_SAFE=1: a relabel only board counts as safe (only once the live chunk grep proved Round 1567\'s matcher live)'
  : 'labels only boards count as rewritten (the safe default; DEALT_LABELS_ONLY_SAFE=1 only once the live chunk grep proved Round 1567\'s matcher live)');
await import('./connectionsDealtDay1558.mjs');
