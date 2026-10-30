// Reviewer control (run lens, 1587), sent as an extra file, never committed. Usage: node .rc/x/freshctl.mjs <mode>
// Writes a "fresh" Q2/Q3 pair under /tmp with the 10-29 basenames (so only the CONTENT differs), runs the two apply
// checks of APPLY-1587 steps 2 and 3, and prints each exit code. The line exits 0 when both exits are what the mode
// expects, 1 otherwise, and its last line says EXPECTED or UNEXPECTED.
//   same      byte identical copies                           ledger 0, payload 0
//   valuechg  one payload row's value +1,000,000, h recomputed  ledger 0, payload 1 (the table moved)
//   sarnew    a new 2026 row for a sarandi man, h computed      ledger 1 (a row appeared for a judged man)
//   nonatnew  a new row with an empty nationality, h computed   ledger 1 (the tripwire takes empty nationality)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { marketHash } from '../../scripts/lib/arsenalGuard1587.mjs';

const mode = process.argv[2];
const D = 'scripts/data/clubNamesakes1584';
const Q2 = JSON.parse(fs.readFileSync(`${D}/arsenalMarket-2026-10-29.json`, 'utf8'));
const L = JSON.parse(fs.readFileSync(`${D}/arsenalLedger.json`, 'utf8'));
const sar = L.men.filter((m) => m.verdict === 'sarandi');
const dir = `/tmp/fresh-${mode}-${Date.now()}`;
fs.mkdirSync(dir, { recursive: true });
let q2 = Q2.map((r) => ({ ...r }));
let want;
if (mode === 'same') want = [0, 0];
else if (mode === 'valuechg') {
  const id = sar[0].rows[0];
  const r = q2.find((x) => x.id === id);
  if (!r) { console.log('ABORTED: no row'); process.exit(2); }
  r.market_value_usd = Number(r.market_value_usd) + 1000000; r.h = marketHash(r);
  console.log(`valuechg: ${r.player_name} ${r.year} id ${id} value +1,000,000`);
  want = [0, 1];
} else if (mode === 'sarnew') {
  const base = q2.find((x) => x.id === sar[0].rows[0]);
  const r = { ...base, id: 99999995, year: base.year + 1, age: base.age == null ? null : base.age + 1 };
  r.h = marketHash(r); q2.push(r);
  console.log(`sarnew: a ${r.year} row for ${r.player_name}`);
  want = [1, null];
} else if (mode === 'nonatnew') {
  const base = q2.find((x) => x.nationality === 'England');
  const r = { ...base, id: 99999996, player_name: 'Nadie Sinpais', name_folded: 'nadie sinpais', nationality: '' };
  r.h = marketHash(r); q2.push(r);
  console.log('nonatnew: a row with an empty nationality');
  want = [1, null];
} else { console.log('ABORTED: unknown mode'); process.exit(2); }
fs.copyFileSync(`${D}/arsenalStints-2026-10-29.json`, `${dir}/arsenalStints-2026-10-29.json`);
fs.writeFileSync(`${dir}/arsenalMarket-2026-10-29.json`, JSON.stringify(q2));
const run = (args) => { const r = spawnSync('node', args, { encoding: 'utf8' }); console.log((r.stdout + r.stderr).trim().split('\n').slice(-3).join('\n')); return r.status; };
const e1 = run(['scripts/qa/genArsenalLedger1587.mjs', '--market', `${dir}/arsenalMarket-2026-10-29.json`, '--check']);
const e2 = want[1] == null ? null : run(['scripts/qa/genClubNamesakes1587.mjs', '--market', `${dir}/arsenalMarket-2026-10-29.json`, '--stints', `${dir}/arsenalStints-2026-10-29.json`, '--check']);
const good = e1 === want[0] && (want[1] == null || e2 === want[1]);
console.log(`${mode}: ledger exit ${e1} (want ${want[0]}), payload exit ${e2} (want ${want[1]}): ${good ? 'EXPECTED' : 'UNEXPECTED'}`);
process.exit(good ? 0 : 1);
