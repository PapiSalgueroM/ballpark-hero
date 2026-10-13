// Probe (never committed): what the size diagnostic's digest expansion control saw, pair by pair.
//   node .rc/x/diagSummary.mjs <MANAGER_SIZE_DIAGNOSTICS folder>
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
const dir = path.join(process.argv[2], 'digest-expansion-control');
for (const name of ['healthy', 'fault']) {
  const file = path.join(dir, `${name}-observations.json.gz`);
  if (!fs.existsSync(file)) { console.log(`${name}: no file`); continue; }
  const o = JSON.parse(gunzipSync(fs.readFileSync(file)).toString('utf8'));
  console.log(`${name}: total ${o.total}, same ${o.same}`);
}
const inputs = path.join(process.argv[2], 'current', 'simClubManagerSlots.mjs');
const manifest = path.join(inputs, 'observer.json');
if (fs.existsSync(manifest)) {
  const m = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  const seasons = m.rows.filter(r => r.kind === 'season');
  const reps = {};
  for (const r of seasons) for (const st of r.states ?? []) if (st) { const k = `${st.roster?.representation}`; reps[k] = (reps[k] ?? 0) + 1; }
  console.log('current slots season frames:', seasons.length, 'ledger representations:', JSON.stringify(reps));
  const sample = seasons.slice(-6).map(r => (r.states ?? []).map(st => st ? `${st.club} s${st.season} ${st.roster?.representation} n${st.roster?.count}` : '-').join(' | '));
  for (const line of sample) console.log('  ', line);
}
