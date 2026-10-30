// Runner only: applies one review mutation to the checkout, after asserting its anchor is there exactly once.
// A: the stored name constant 'Arsenal de Sarandí' becomes 'Arsenal Sarandí' (review minor 2, mutation mA).
// B: the roster net dropped from buildLedger (review minor 3, mutation mB).
import fs from 'node:fs';
const which = process.argv[2];
const M = {
  A: ['scripts/qa/genArsenalLedger1587.mjs', "export const NAMESAKE = 'Arsenal de Sarandí';", "export const NAMESAKE = 'Arsenal Sarandí';"],
  B: ['scripts/qa/genArsenalLedger1587.mjs', 'market.filter((r) => trip.has(r.id) || inNet(r))', 'market.filter((r) => trip.has(r.id))'],
};
const m = M[which];
if (!m) { console.log('unknown mutation ' + which); process.exit(2); }
const text = fs.readFileSync(m[0], 'utf8');
if (text.split(m[1]).length !== 2) { console.log(`mutation ${which}: anchor not in ${m[0]} exactly once, ABORTED`); process.exit(2); }
fs.writeFileSync(m[0], text.replace(m[1], m[2]));
console.log(`mutation ${which} applied to ${m[0]}`);
