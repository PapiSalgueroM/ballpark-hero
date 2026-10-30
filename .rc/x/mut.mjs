// Reviewer mutation (run lens, 1587), sent as an extra file, never committed. Usage: node .rc/x/mut.mjs <A|B|C|D|G|J>
// Applies ONE small plausible mutation to a generator in the runner's checkout, after asserting its anchor exists
// exactly once (exit 2, ABORTED, otherwise). The request line restores with git checkout in the same line.
import fs from 'node:fs';
const M = {
  A: ['scripts/qa/genClubNamesakes1587.mjs', "export const NAMESAKE = 'Arsenal de Sarandí';", "export const NAMESAKE = 'Arsenal Sarandí';", 'stale constant: the stored name the payload writes'],
  B: ['scripts/qa/genArsenalLedger1587.mjs', 'trip.has(r.id) || inNet(r)', 'trip.has(r.id)', 'dropped filter: the roster net'],
  C: ['scripts/qa/genClubNamesakes1587.mjs', 'r.year >= s.first_year && r.year <= s.last_year', 'r.year >= s.first_year && r.year < s.last_year', 'off by one: a stint span loses its last year'],
  D: ['scripts/qa/genArsenalLedger1587.mjs', 'x.b - cur.lastB >= 3', 'x.b - cur.lastB >= 2', 'stale constant: a birth year jump of 2 splits a man'],
  G: ['scripts/lib/arsenalGuard1587.mjs', "coalesce(${a}.position, '~'), coalesce(round(${a}.market_value_usd)", "coalesce(round(${a}.market_value_usd)", 'dropped column: position out of the SQL market guard'],
  J: ['scripts/qa/genClubNamesakes1587.mjs', "const sarMen = ledger.men.filter((m) => m.verdict === 'sarandi');", "const sarMen = ledger.men.filter((m) => m.verdict !== 'pending');", 'swapped filter: london men in the market payload'],
};
const k = process.argv[2];
const m = M[k];
if (!m) { console.log(`unknown mutation ${k}, ABORTED`); process.exit(2); }
const [file, from, to, what] = m;
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`mutation ${k}: anchor found ${n} times in ${file}, ABORTED`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`mutation ${k} APPLIED (${what}) in ${file}`);
