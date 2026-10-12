// Read only: list the failing rows simSoccerVeteranOffers recorded in its OUT folder. usage: node vetFails.mjs <OUT>
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
const OUT = process.argv[2];
const receipts = JSON.parse(gunzipSync(fs.readFileSync(path.join(OUT, 'observations.json.gz'))).toString('utf8'));
const arm = receipts.healthy;
if (!arm) { console.log('no healthy arm in receipts; arms: ' + Object.keys(receipts).join(',')); process.exit(1); }
for (const [group, g] of Object.entries(arm.groups || {})) {
  console.log(`group ${group}: ${g.passed} of ${g.assertions} passed, ${g.failures.length} failed`);
  for (const f of g.failures.slice(0, 12)) {
    let msg = '';
    try {
      const c = JSON.parse(gunzipSync(fs.readFileSync(path.join(OUT, 'objects', f.completeFailure + '.gz'))).toString('utf8'));
      const a = JSON.stringify(c.actual ?? null), e = JSON.stringify(c.expected ?? null);
      let i = 0; while (i < a.length && i < e.length && a[i] === e[i]) i++;
      msg = `${c.message?.split('\n')[0]} | first difference at char ${i}: actual ...${a.slice(Math.max(0, i - 120), i + 160)} | expected ...${e.slice(Math.max(0, i - 120), i + 160)}`;
    } catch (err) { msg = 'unreadable failure: ' + err.message; }
    console.log(`  FAIL ${f.id}: ${msg}`);
  }
}
