/* The fixer's mutations for Round 1211 (run on the runner only, never committed).
   node .rc/x/mut2.mjs <name>: applies ONE named mutation to a source file,
   refusing (exit 9) unless every anchor is in the file exactly once.
   These change the facts the fix pass added; each must turn the plain harness red. */
import { readFileSync, writeFileSync } from 'node:fs';

const MLB = 'src/data/usSeasonLedgerMlb.ts';
const NHL = 'src/data/usSeasonLedgerNhl.ts';
const M = {
  /* T: the division split of 2025 and 2026 is eight and five (still 13). */
  T: [[MLB, 'homeOrAway: [7, 6], series: null, homeTotal: 26 }', 'homeOrAway: [8, 5], series: null, homeTotal: 26 }']],
  /* U: 27 division games at home in 2025 and 2026. */
  U: [[MLB, 'homeOrAway: [7, 6], series: null, homeTotal: 26 }', 'homeOrAway: [7, 6], series: null, homeTotal: 27 }']],
  /* V: the NHL playoff block starts a season early. */
  V: [[NHL, '  from: 2013,\n  clubs: 16,', '  from: 2012,\n  clubs: 16,']],
  /* W: the loser of a game past sixty minutes keeps no point. */
  W: [[NHL, 'loserGetsAPoint: true, playoffPeriodMinutes: 20', 'loserGetsAPoint: false, playoffPeriodMinutes: 20']],
  /* X: 33 league games at home in 2023 and 2024. */
  X: [[MLB, 'league: { sixGames: 6, sevenGames: 4, total: 64, homeTotal: 32 }', 'league: { sixGames: 6, sevenGames: 4, total: 64, homeTotal: 33 }']],
  /* Y: the wrong modified tournament. */
  Y: [[NHL, '  modified: [2019, 2020],', '  modified: [2019, 2021],']],
  /* Z: the 2026 rival pairs lean on one source. */
  Z: [[MLB, "export const MLB_RIVALS_2026_SRC: readonly string[] = ['ticketmaster-2026', 'cbs-2026-rivalry', 'bref-schedule'];", "export const MLB_RIVALS_2026_SRC: readonly string[] = ['ticketmaster-2026'];"]],
  /* AA: the 2025 and 2026 home numbers lean on the report of the 2023 format again. */
  AA: [[MLB, "homeSrc: ['ticketmaster-2026', 'bref-schedule'],", "homeSrc: ['ticketmaster-2026', 'espn-2023-format'],"]],
  /* AB: the 2004 to 2011 window claims a wild card round and names none. */
  AB: [[MLB, '{ from: 2004, to: 2011, round: null, clubs: 8, series: null, wildCard: false }', '{ from: 2004, to: 2011, round: null, clubs: 8, series: null, wildCard: true }']],
  /* AC: the domain of the league's site back in a shipped file. */
  AC: [[NHL, "tried: 'The league\\'s own \"Playoff Format\" page does not say who meets in the Final.',", "tried: 'NHL.com does not say who meets in the Final.',"]],
};

const name = process.argv[2];
if (process.env.DRY === '1') {
  for (const [k, edits] of Object.entries(M)) for (const [file, from] of edits) {
    const text = readFileSync(file, 'utf8').split('\r\n').join('\n');
    console.log(k, file.split('/').pop(), text.split(from).length - 1);
  }
  process.exit(0);
}
const edits = M[name];
if (!edits) { console.log(`MUT ABORT: no mutation named ${name}`); process.exit(9); }
for (const [file, from, to] of edits) {
  const text = readFileSync(file, 'utf8');
  const n = text.split(from).length - 1;
  if (n !== 1) { console.log(`MUT ABORT ${name}: the anchor is in ${file} ${n} times, wanted exactly once: ${from}`); process.exit(9); }
  writeFileSync(file, text.replace(from, to));
}
console.log(`MUT ${name} APPLIED: ${edits.length} edit(s)`);
