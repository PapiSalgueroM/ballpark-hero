// Round 1331 fix, runner only (never committed): the attribution leg of the dailies' re-record (a5541fe8).
// Usage from a tree root: node mutDailiesBase.mjs [rules|digests|both]
//   rules    every Hot Seat daily plays the base match rules (rulesOf answers 'base' for a daily)
//   digests  the five cutover dates' recordings go back to Release AS's (c9af2ca7, d31a907e, e233082a,
//            7ef7837d, 2784bbcb), the values a5541fe8 replaced
// Then `node scripts/simDailyDeals.mjs --print --verify` says whether the tree deals exactly the recording.
// With both, it must: the rule is the one input that moved those five dates.
import { readFileSync, writeFileSync } from 'node:fs';

const mode = process.argv[2] ?? 'both';
function rep(file, from, to) {
  const text = readFileSync(file, 'utf8');
  const n = text.split(from).length - 1;
  if (n !== 1) { console.log(`mutDailiesBase ABORT: anchor found ${n} times in ${file}: ${from}`); process.exit(2); }
  writeFileSync(file, text.replace(from, to));
}
if (mode === 'rules' || mode === 'both') {
  rep('src/lib/managerHotSeat.ts', "  if (setup.daily) return setup.daily < HOT_SEAT_RULES_FROM ? 'base' : undefined;", "  if (setup.daily) return 'base';");
}
if (mode === 'digests' || mode === 'both') {
  const back = [
    ['2026-10-27', '0400c7b1a2d756911454', 'c9af2ca70b2ea9ce4f3e'],
    ['2026-11-14', '67cb2096bdc45751340e', 'd31a907e262a745a4246'],
    ['2027-01-19', 'b33b5b04a41504ec5f53', 'e233082a22176e8e1cd8'],
    ['2027-01-30', '9b6451735725f9ce1ba8', '7ef7837d86a8088ad0fe'],
    ['2027-02-06', '75a43fcbf0106a1f29e3', '2784bbcba11e0777c580'],
  ];
  for (const [date, now, was] of back) rep('scripts/simDailyDeals.mjs', `'${date}': '${now}'`, `'${date}': '${was}'`);
}
console.log(`mutDailiesBase ${mode} applied`);
