/* Negative controls for probe410: edit src/lib/clubManager.ts in the runner checkout. Usage: node mut410.mjs <m1|m2> */
import fs from 'node:fs';
const file = 'src/lib/clubManager.ts';
const src = fs.readFileSync(file, 'utf8');
const M = {
  m1: ['if ((detail.mine > detail.theirs) === won && last?.mine === detail.mine', 'if (last?.mine === detail.mine'],
  m2: ['const random = keyedRng(`cm-shootout|${roll}`);', 'const random = Math.random;'],
};
const [from, to] = M[process.argv[2]] || [];
if (!from || !src.includes(from)) { console.error('MUTATION ANCHOR MISSING ' + process.argv[2]); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log('mutation ' + process.argv[2] + ' applied');
