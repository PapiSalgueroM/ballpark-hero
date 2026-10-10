import fs from 'node:fs';
const f = 'career-programme-artifacts/native/report.json';
if (!fs.existsSync(f)) { console.log('no report.json (the walk stopped before writing it)'); process.exit(0); }
const r = JSON.parse(fs.readFileSync(f, 'utf8'));
for (const c of r.cases) {
  const id = c.id ?? c.name ?? '?';
  if (c.squadRestoration) console.log(id, 'ok=' + c.ok, 'squad before', JSON.stringify(c.squadRestoration.before), 'after', JSON.stringify(c.squadRestoration.after));
  else console.log(id, 'ok=' + c.ok, c.error ? String(c.error).slice(0, 160) : '');
}
console.log('checks', r.checks, 'cases', r.cases.length, 'ok', r.cases.filter(c => c.ok).length);
