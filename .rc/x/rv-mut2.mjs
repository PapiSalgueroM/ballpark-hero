// Reviewer (runner lens) mutation tool, batch 2, Round 1104. Runs on the GitHub runner's checkout only.
// node .rc/x/rv-mut2.mjs <name>   applies one mutation, refusing unless its needle is in the file exactly once.
import fs from 'node:fs';

const M = {
  // the floor itself is gone (the cover stays)
  floorgone: [['src/lib/usCareerBank.ts', '  c.netWorth = floorBank(c.netWorth ?? 0);\n  return lines;', '  c.netWorth = c.netWorth ?? 0;\n  return lines;']],
  // a card answer is no longer settled
  cardraw: [['src/lib/usCareerBank.ts', '        return withLines(line, settleBank(c, money));', '        return line;']],
  // the playoff line alone goes back to tenths
  posacktenths: [['src/lib/nflMyCareer.ts', 'const sk = Math.max(0, Math.round((3 + (pf - 62) * 0.35) * per * 2) / 2);', 'const sk = Math.max(0, Math.round((3 + (pf - 62) * 0.35) * per * 10) / 10);']],
  // the linebacker line alone goes back to tenths
  lbtenths: [['src/lib/nflMyCareer.ts', 'line.sacks = Math.max(0, Math.round(((form - 66) * 0.18 + rng() * 3) * g * 2) / 2);', 'line.sacks = Math.max(0, Math.round(((form - 66) * 0.18 + rng() * 3) * g * 10) / 10);']],
  // the tight end cap alone is gone
  tecapoff: [['src/lib/nflMyCareer.ts', 'line.recYds = Math.min(NFL_TE_YDS_CAP, Math.round((line.rec ?? 0) * (9 + rng() * 3.5)));', 'line.recYds = Math.round((line.rec ?? 0) * (9 + rng() * 3.5));']],
  // the receptions cap alone is gone (the yards cap stays)
  wrreccapoff: [['src/lib/nflMyCareer.ts', 'line.rec = Math.min(NFL_WR_REC_CAP, Math.round((28 + (form - 62) * 2.5 + rng() * 14) * g));', 'line.rec = Math.round((28 + (form - 62) * 2.5 + rng() * 14) * g);']],
  // a stale constant: the throwback pays half of today, not 0.32
  scale05: [['src/data/nflRookieScale.ts', "heldAs: { of: 'now', scale: 0.32 },", "heldAs: { of: 'now', scale: 0.5 },"]],
  // a wrong table value: the first pick's total is ten million too high in both sources
  pick1row: [['src/data/nflRookieScale.ts', 'row(1, 57_271_500, 58_191_906)', 'row(1, 67_271_500, 68_191_906)']],
  // a wrong table value in a later round: round two's last pick doubled
  round2last: [['src/data/nflRookieScale.ts', 'lastPick: 64, lastTotal: 7_880_000, years: 4 }', 'lastPick: 64, lastTotal: 12_880_000, years: 4 }']],
  // the founder card is dealt at 1M again
  foundergate: [['src/lib/nflCareerLifeB.ts', "if (yrs >= 2 && nw >= 1.5 && flag(c, 'b_tech') === 0) {", "if (yrs >= 2 && nw >= 1 && flag(c, 'b_tech') === 0) {"]],
  // Brand work stops reaching the bank
  brandnobank: [['src/lib/nflMyCareer.ts', 'cc.earnings += fee; cc.netWorth = Math.round((bank + fee) * 10) / 10; return', 'cc.earnings += fee; void bank; return']],
  // the All Star snub is dealt to an honoured man again
  snubgate: [['src/lib/nbaCareerLifeB.ts', "if (yrs >= 3 && c.ovr >= 80 && last.awards.length === 0 && flag(c, 'nb_snub') === 0) {", "if (yrs >= 3 && c.ovr >= 80 && flag(c, 'nb_snub') === 0) {"]],
  // a man with no contract can ask for a trade again
  nocontractgate: [['src/lib/nflMyCareer.ts', 'if (c.morale < 55 && c.contractYears > 0) {', 'if (c.morale < 55) {']],
  // the two readers in nflCareerLoop.ts go back to a hard 17 (batch 1 found nothing red; more checks here)
  loop17: [
    ['src/lib/nflCareerLoop.ts', 'fullSeasons: c.seasons.filter(s => s.games >= nflSeasonLength(s.year)).length', 'fullSeasons: c.seasons.filter(s => s.games >= 17 + 0 * nflSeasonLength(s.year)).length'],
    ['src/lib/nflCareerLoop.ts', 'Math.max(0, nflSeasonLength(line.year) - line.games)', 'Math.max(0, 17 - line.games)'],
  ],
  // the three receipts in deck A say 17 games again? not a mutation of a rule; skipped.
};

const name = process.argv[2];
if (name === '--dry') {
  let bad = 0;
  for (const [k, l] of Object.entries(M)) for (const [file, needle] of l) {
    const n = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split(needle).length - 1;
    if (n !== 1) bad += 1;
    console.log(`${n === 1 ? 'ok ' : 'BAD'} ${k} ${file} x${n}`);
  }
  process.exit(bad ? 3 : 0);
}
const list = M[name];
if (!list) { console.error(`rv-mut2: no mutation named ${name}`); process.exit(2); }
for (const [file, needle, next] of list) {
  const raw = fs.readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  const text = raw.replace(/\r\n/g, '\n');
  const n = text.split(needle).length - 1;
  if (n !== 1) { console.error(`rv-mut2 ${name}: needle found ${n} times in ${file}, refusing:\n  ${needle}`); process.exit(3); }
  const out = text.replace(needle, () => next);
  fs.writeFileSync(file, crlf ? out.replace(/\n/g, '\r\n') : out);
  console.log(`rv-mut2 ${name}: mutated ${file}`);
}
