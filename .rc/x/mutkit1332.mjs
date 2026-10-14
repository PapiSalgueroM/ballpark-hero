// Round 1332 review (never committed): the kit's own FX_CONDUCT fleet (section 12), with ONE change: a desk
// answers its open cards only in the first week of a season (just after the roles change hands), the way a
// player who leaves cards open would, instead of the week each card lands. Nothing else in the kit moves.
//   node .rc/x/mutkit1332.mjs
import fs from 'node:fs';

const FILE = 'scripts/simEventDeck.mjs';
const from = `      for (const m of openOf(s)) {
        const i = Math.floor(ar() * m.choices.length);
        const e = byId.get(m.defId);`;
const to = `      for (const m of openOf(s)) {
        if (t % 20 !== 0) continue; /* review: answers wait for the season's first week */
        const i = Math.floor(ar() * m.choices.length);
        const e = byId.get(m.defId);`;
const src = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`the fleet's answer loop is in the kit ${n} times, not once, refusing`); process.exit(2); }
fs.writeFileSync(FILE, src.replace(from, to));
console.log('the kit fleet now answers in the first week of each season only');
