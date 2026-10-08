// Reviewer probe, never committed: print the short facts of each goal flight arm report.
const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'tycoon-goal-flight-artifacts', 'native');
if (!fs.existsSync(dir)) { console.log('GFREPORT no native folder'); process.exit(0); }
for (const arm of fs.readdirSync(dir)) {
  const file = path.join(dir, arm, 'report.json');
  if (!fs.existsSync(file)) { console.log('GFREPORT', arm, 'no report.json'); continue; }
  const r = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = {
    arm,
    complete: r.complete,
    runtimeError: r.runtimeError ? { name: r.runtimeError.name, message: String(r.runtimeError.message).slice(0, 1500) } : null,
    sourceHoldError: r.sourceHoldError ? String(r.sourceHoldError.message).slice(0, 800) : null,
    failures: (r.failures || []).slice(0, 12).map(f => ({ name: f.name, type: f.type, message: String(f.message || '').slice(0, 300) })),
    cases: (r.cases || []).map(c => ({ id: c.id || c.name, checks: (c.checks || []).length, failed: (c.checks || []).filter(k => !k.pass).map(k => k.name) })),
  };
  console.log('GFREPORT ' + JSON.stringify(out, null, 1).slice(0, 6000));
}
