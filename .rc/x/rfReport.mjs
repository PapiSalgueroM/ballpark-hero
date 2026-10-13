// Prints each journey's id, passed flag and the first lines of its error from playCmRealFixtures' report.json.
import fs from 'node:fs';
const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const c of r.cases) {
  console.log(`${c.id} passed=${!!c.passed}`);
  if (c.error) console.log('  ' + c.error.split('\n').slice(0, 6).join('\n  ').slice(0, 1500));
  if (c.errors?.length) console.log('  page errors: ' + c.errors.slice(0, 3).join(' | ').slice(0, 600));
  if (c.captureDiagnostics) for (const [k, v] of Object.entries(c.captureDiagnostics)) if (!v.passed) console.log(`  capture ${k} failed, last frame ${JSON.stringify(v.frames.at(-1)).slice(0, 900)}`);
}
