// Review of Round 1538 (run lens): apply one small mutation to the source tree on the runner. The caller restores
// with git checkout in the same line. Each needle must be present exactly once, or this exits 2 (the mutation did
// not apply, so the result means nothing).
import fs from 'node:fs';

const MOD = 'src/lib/usCareerAnnualBenefits.ts';
const MUTS = {
  // a stale constant: the brand answers stop paying in the era's money
  noscale: [MOD, '  const fee = Math.round(amount * moneyScale * 10) / 10;\n', '  const fee = Math.round(amount * 10) / 10;\n'],
  // an off by one: the maintenance branch starts a year late
  ageoff: [MOD, '  if (cc.age >= maintenanceAge) {', '  if (cc.age > maintenanceAge) {'],
  // a plausible rewrite of the ceiling: clamps down a rating that already sits above the ceiling
  clampdown: [MOD, '  cc.ovr = raiseWithinPotential(cc.ovr, cc.pot, up);\n', '  cc.ovr = Math.min(Math.min(99, cc.pot), cc.ovr + up);\n'],
  // critic 6: the earnings total rounded again
  earnround: [MOD, '  c.earnings += fee;\n', '  c.earnings = Math.round((c.earnings + fee) * 10) / 10;\n'],
  // a typo in one flat amount: the exhibition button says 900k and 0.8M lands
  corramt: ['src/lib/nbaCareerCorruption.ts', 'const paid = bankUsCareerFee(cc, 0.9, 1); return `You played it straight', 'const paid = bankUsCareerFee(cc, 0.8, 1); return `You played it straight'],
  // the fallback without the take home share (a save that has no Cash yet)
  // controls for the old save probe: the old pot + 1 rider in the helper, and the helper's Cash line removed
  potplus: [MOD, '  cc.ovr = raiseWithinPotential(cc.ovr, cc.pot, up);\n', '  cc.ovr = Math.min(cc.pot + 1, cc.ovr + up);\n'],
  nobank: [MOD, '  c.netWorth = Math.round((prior + fee) * 10000) / 10000;\n', ''],
  nofallback: [MOD,'  const prior = c.netWorth ?? Math.round(c.earnings * 0.45 * 10) / 10;\n', '  const prior = c.netWorth ?? 0;\n'],
};
const id = process.argv[2];
const m = MUTS[id];
if (!m) { console.log(`mut1538: unknown mutation ${id}`); process.exit(2); }
const [file, from, to] = m;
const text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const n = text.split(from).length - 1;
if (n !== 1) { console.log(`mut1538: ${id} needle found ${n} times in ${file}, not applied`); process.exit(2); }
fs.writeFileSync(file, text.replace(from, () => to));
console.log(`mut1538: ${id} applied to ${file}`);
