// Release AZ, Y1: take the guard out of src/lib/clubManager.ts in place (a runner checkout only), failing closed.
import fs from 'node:fs';
const file = 'src/lib/clubManager.ts';
const GUARD = '  if (worldSeedOf(state) === undefined) return state;\n';
const text = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
const n = text.split(GUARD).length - 1;
if (n !== 1) { console.error(`noguard: the guard is in ${file} ${n} times`); process.exit(2); }
fs.writeFileSync(file, text.replace(GUARD, ''));
console.log('noguard: the Y1 guard is out of src/lib/clubManager.ts');
