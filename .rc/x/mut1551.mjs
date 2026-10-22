// Review mutation script for Round 1551 (never committed). Usage: node .rc/x/mut1551.mjs <name>
// Each mutation asserts its anchor exists exactly once before editing, so a mutation that changes nothing aborts (exit 3).
import fs from 'node:fs';
const MUTS = {
  // off by one: the day a season counts from is held out too
  ge: [['src/lib/seasonCalendar.ts', 'return !from || today >= from;', 'return !from || today > from;']],
  // swapped argument: the competition key instead of the table
  key: [['src/lib/champOrNot.ts', 'seasonCounts(def.table, year, today)', 'seasonCounts(def.key, year, today)']],
  // dropped filter in Who'd They Beat only
  whod: [['src/lib/whodTheyBeat.ts', '    if (!seasonCounts(def.table, year, today)) continue;\n', '']],
  // stale constant: the counts from date is already past when the rows land (release slipped)
  past: [['src/lib/seasonCalendar.ts', "const AU_2026_FROM = { 2026: '2026-11-01' };", "const AU_2026_FROM = { 2026: '2026-10-20' };"]],
  // stale constant: a counts from date before the finals were even played
  early: [['src/lib/seasonCalendar.ts', "const AU_2026_FROM = { 2026: '2026-11-01' };", "const AU_2026_FROM = { 2026: '2026-08-10' };"]],
  // data path: the NRL insert writes a name variant the roll does not use
  sqlname: [['supabase/migrations/20261022120000_round_1551_2026_season_rows.sql',
    "VALUES (2026, 'Sydney Roosters', 'NRL');", "VALUES (2026, 'Roosters', 'NRL');"]],
  // main without this round: no migration evidence, AU held through 2025, no counts from
  mainstate: [
    ['src/lib/seasonCalendar.ts', "heldThrough: 2026, countsFrom: AU_2026_FROM, recordSlug: 'afl-premiers'", "heldThrough: 2025, recordSlug: 'afl-premiers'"],
    ['src/lib/seasonCalendar.ts', "heldThrough: 2026, countsFrom: AU_2026_FROM, recordSlug: 'nrl-premiers'", "heldThrough: 2025, recordSlug: 'nrl-premiers'"],
    ['src/lib/seasonCalendar.ts', "heldThrough: 2026, countsFrom: AU_2026_FROM, recordSlug: 'brownlow-medal-winners'", "heldThrough: 2025, recordSlug: 'brownlow-medal-winners'"],
    ['src/lib/seasonCalendar.ts', "heldThrough: 2026, countsFrom: AU_2026_FROM, recordSlug: 'dally-m-medal-winners'", "heldThrough: 2025, recordSlug: 'dally-m-medal-winners'"],
  ],
};
const name = process.argv[2];
const list = MUTS[name];
if (!list) { console.error(`mut1551: unknown mutation ${name}, ABORTED`); process.exit(3); }
for (const [file, from, to] of list) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const n = text.split(from).length - 1;
  if (n !== 1) { console.error(`mut1551 ${name}: anchor found ${n} times in ${file}, ABORTED`); process.exit(3); }
  fs.writeFileSync(file, text.replace(from, to));
  console.log(`mut1551 ${name}: applied in ${file}`);
}
if (name === 'mainstate') {
  fs.unlinkSync('supabase/migrations/20261022120000_round_1551_2026_season_rows.sql');
  console.log('mut1551 mainstate: migration removed');
}
