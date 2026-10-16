// Release BF join: print a walk report's issues (first 600 characters each) and copy the report into $RC_OUT.
import fs from 'node:fs';
import path from 'node:path';
const file = process.argv[2];
if (!fs.existsSync(file)) { console.log('issues: no report at ' + file); process.exit(0); }
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log('issues: status=' + r.status + ' checks=' + r.checks + ' failures=' + r.failures + ' setup=' + r.setupFailures);
for (const issue of (r.issues || []).slice(0, 12)) console.log('ISSUE ' + String(issue).replace(/\s+/g, ' ').slice(0, 600));
for (const row of (r.cases || []).filter(c => (c.issues || []).length).slice(0, 6)) console.log('CASE ' + (row.id || '') + ': ' + JSON.stringify(row.issues).slice(0, 600));
if (process.env.RC_OUT) { fs.mkdirSync(process.env.RC_OUT, { recursive: true }); fs.copyFileSync(file, path.join(process.env.RC_OUT, path.basename(path.dirname(path.dirname(file))) + '-report.json')); }
