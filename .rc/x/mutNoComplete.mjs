/* Runner only: copy simClubNamesakes.mjs with its completeness failure turned into an ok, run the copy under the
   forget control, and require exit 3 with "DID NOT FIRE" (an applied control that moved nothing must never print
   FIRED or green). Proves the m7 fix and that completeness is the one check that catches forget. */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const src = fs.readFileSync('scripts/simClubNamesakes.mjs', 'utf8');
const from = 'else fail(`Q3b strings the old rule reads as Arsenal';
if (src.split(from).length !== 2) { console.log('MUT nocomplete: anchor not found once, ABORTED'); process.exit(2); }
fs.writeFileSync('scripts/simClubNamesakesMutNC.mjs', src.replace(from, 'else ok(`Q3b strings the old rule reads as Arsenal'));
const r = spawnSync(process.execPath, ['scripts/simClubNamesakesMutNC.mjs'], { encoding: 'utf8', env: { ...process.env, SIM_NAMESAKE_CONTROL: 'forget' } });
fs.unlinkSync('scripts/simClubNamesakesMutNC.mjs');
const last = (r.stdout || '').trim().split('\n').pop();
console.log(`copy exit=${r.status} | ${last}`);
const good = r.status === 3 && /DID NOT FIRE: applied/.test(last) && !/simClubNamesakes: green/.test(r.stdout);
console.log(good ? 'MUT nocomplete: forget alone moves nothing else, and the control says DID NOT FIRE with exit 3' : 'MUT nocomplete: UNEXPECTED');
process.exit(good ? 0 : 1);
