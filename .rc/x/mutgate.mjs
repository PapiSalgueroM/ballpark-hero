// Round 1334 fixer: one gate mutation per run of the starter pack, applied to the runner's checkout only.
// Each moves one bound of a gated card one step (or drops a gate), so the card's words can be false.
// Usage: node .rc/x/mutgate.mjs <name>. Each edit must find its text exactly once, or it exits 2.
import fs from 'node:fs';

const PACK = 'src/data/soccerDeck/starter.ts';
const name = process.argv[2];
const M = {
  injgate: ["when: [{ fact: 'injuryWeeks', op: '>=', value: 8 }],", "when: [{ fact: 'injuryWeeks', op: '>=', value: 1 }],"],
  capgate: ["when: [{ fact: 'capped', op: '==', value: true }],", 'when: [],'],
  y709: ["{ fact: 'yellows', op: '>=', value: 7 }", "{ fact: 'yellows', op: '>=', value: 6 }"],
  a710: ["{ fact: 'age', op: '>=', value: 26 }", "{ fact: 'age', op: '>=', value: 25 }"],
  g714: ["{ fact: 'goals', op: '>=', value: 4 }", "{ fact: 'goals', op: '>=', value: 3 }"],
  g719: ["{ fact: 'goals', op: '<=', value: 3 }", "{ fact: 'goals', op: '<=', value: 4 }"],
  a719: ["{ fact: 'apps', op: '>=', value: 15 }", "{ fact: 'apps', op: '>=', value: 14 }"],
  a722: ["{ fact: 'age', op: '>=', value: 31 }", "{ fact: 'age', op: '>=', value: 30 }"],
  i726up: ["when: [{ fact: 'injuryWeeks', op: '>=', value: 8 }],", "when: [{ fact: 'injuryWeeks', op: '>=', value: 9 }],"],
  t727: ["{ fact: 'tier', op: '<', value: 2 }", "{ fact: 'tier', op: '<', value: 3 }"],
  a727: ["{ fact: 'age', op: '<=', value: 22 }", "{ fact: 'age', op: '<=', value: 23 }"],
};
if (!M[name]) { console.error(`MUT: unknown mutation ${name}`); process.exit(2); }
const [from, to] = M[name];
const src = fs.readFileSync(PACK, 'utf8');
const hits = src.split(from).length - 1;
if (hits !== 1) { console.error(`MUT ${name}: text found ${hits} times in ${PACK}, refusing`); process.exit(2); }
fs.writeFileSync(PACK, src.replace(from, () => to));
console.log(`MUT ${name}: applied`);
