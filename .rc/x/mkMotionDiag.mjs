// A measuring copy of scripts/playSeasonCentreMotion.mjs for one question (never committed): in the B1i case that is
// red on Release AW, do the two tables that arrive 150 ms apart hold the SAME order? If they do, the component starts
// no second flight (same keys are the same table, by its own rule) and the check is measuring the first flight's
// start. The copy only ADDS facts to what the check reads and prints; it changes no assertion.
import fs from 'node:fs';
const src = 'scripts/playSeasonCentreMotion.mjs', out = 'scripts/zzSeasonMotionDiag.mjs';
let t = fs.readFileSync(src, 'utf8');
const swaps = [
  ['        return { flying: flying.length, mid, first, target };',
    "        const ord = n => S2.tables[n].map(r => r.club).join('|');\n        return { flying: flying.length, mid, first, target, same12: ord(kk) === ord(kk + 1), same23: ord(kk + 1) === ord(kk + 2), secondAnims: first.anims };"],
  ['      cut.n += 1;',
    "      cut.n += 1;\n      console.log(`   DIAG B1i ${L.id} ${S.tag} from ${k}: table ${k} to ${k + 1} same order ${got.same12}; table ${k + 1} to ${k + 2} same order ${got.same23}; animations at the second table's first frame ${got.secondAnims}; in the air before it ${got.flying}`);"],
];
for (const [from, to] of swaps) {
  const n = t.split(from).length - 1;
  if (n !== 1) { console.error(`DIAG CANNOT BE MADE: ${JSON.stringify(from.slice(0, 60))} is there ${n} times`); process.exit(3); }
  t = t.replace(from, () => to);
}
fs.writeFileSync(out, t);
console.log('diagnostic copy written:', out);
