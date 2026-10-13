// Reviewer probe: summarise a scwalkr log (toast over a button, per audited screen).
import fs from 'node:fs';
const file = process.argv[2];
const log = JSON.parse(fs.readFileSync(file, 'utf8'));
const phases = {};
for (const s of log.steps || []) phases[s.phase] = (phases[s.phase] || 0) + 1;
console.log(`${log.tag} ${log.W}x${log.H}: ${log.steps?.length ?? 0} steps; phases ${JSON.stringify(phases)}`);
console.log(`audited screens ${log.auditCount ?? 0}; screens with a toast over a button ${log.toastHits ?? 0}`);
for (const h of (log.toastHitList || []).slice(0, 40)) {
  console.log(`  ${h.label}: ${h.covered.map(c => `"${c.text}" (y ${c.btnY}) under toast "${c.by}" (toast top ${c.toastY})`).join('; ')}`);
}
const pe = (log.pageErrors || []).length;
console.log(`page errors ${pe}; stuck ${(log.stuck || []).length}`);
if (pe) console.log(JSON.stringify(log.pageErrors.slice(0, 3)));
