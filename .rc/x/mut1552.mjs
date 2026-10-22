// Reviewer mutation applier for Round 1552. Usage: node .rc/x/mut1552.mjs <id>
// Each mutation asserts its target string is present before it edits, so a mutation that
// changes nothing aborts (exit 3) instead of reading as a green harness.
import fs from 'node:fs';
const BANK = 'src/lib/triviaQuestionBank.ts';
const GAP = 'src/lib/clearWinner.ts';
const M = {
  // off by one at the cutover: the first one answer date is dealt under the old rules
  cutover: [BANK, 'return dateStr < ONE_ANSWER_FROM ? LEGACY : ONE_ANSWER;', 'return dateStr <= ONE_ANSWER_FROM ? LEGACY : ONE_ANSWER;'],
  // the clear winner is checked against the fourth instead of the second
  fourth: [BANK, 'clearlyAhead(sorted[0].market_value_usd, sorted[1].market_value_usd)', 'clearlyAhead(sorted[0].market_value_usd, sorted[3].market_value_usd)'],
  // position distractors drawn from the band before the namesake filter
  posopts: [BANK, 'const others = band.filter((p) => p.position && p.position !== correct.position', 'const others = bandForDifficulty(pool, difficulty).filter((p) => p.position && p.position !== correct.position'],
  // the non club labels still offered as wrong clubs (subject filter kept)
  distract: [BANK, 'new Set(pool.map((p) => p.club).filter((c): c is string => isClub(c) && c !== correct.club))', 'new Set(pool.map((p) => p.club).filter((c): c is string => !!c && c !== correct.club))'],
  // a tidy up that applies the non club rule under LEGACY too (would re-deal old dailies)
  legacyclub: [BANK, "const isClub = (c: string | null): c is string => !!c && !(rules.oneAnswer && NOT_A_CLUB.has(c));", "const isClub = (c: string | null): c is string => !!c && !NOT_A_CLUB.has(c);"],
  // the gap predicate loosened to any lead at all while the constant stays 1.04
  loose: [GAP, 'hi / lo >= MIN_RATIO', 'hi > lo'],
  // worth the most retries draw on the UNFILTERED band
  worthband: [BANK, 'const band = askableBand(pool, difficulty, rules);\n  const unique = firstOfEachName(band);', 'const band = bandForDifficulty(pool, difficulty);\n  const unique = firstOfEachName(band);'],
};
const id = process.argv[2];
if (!M[id]) { console.error(`MUTATION ${id} UNKNOWN`); process.exit(3); }
const [file, from, to] = M[id];
const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
if (!src.includes(from)) { console.error(`MUTATION ${id} TARGET MISSING in ${file}: ${from}`); process.exit(3); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`MUTATION ${id} APPLIED to ${file}`);
