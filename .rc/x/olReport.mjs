// Prints what simSoccerOpponentLabels' report says about each control arm and the current arm's failing checks.
import fs from 'node:fs';
const file = 'career-opponent-labels-artifacts/proof/report.json';
if (!fs.existsSync(file)) { console.log('no report.json'); process.exit(1); }
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const c of r.controls ?? []) console.log('control', c.arm, 'actual', JSON.stringify(c.actualFailures).slice(0, 500), 'expected', JSON.stringify(c.expected));
const walk = (node, trail, out) => {
  if (Array.isArray(node)) node.forEach((x, i) => walk(x, `${trail}[${i}]`, out));
  else if (node && typeof node === 'object') {
    if (node.ok === false && node.id) out.push(`${trail}: ${node.id}: ${String(node.error).slice(0, 400)}`);
    for (const [k, v] of Object.entries(node)) walk(v, `${trail}.${k}`, out);
  }
};
const out = [];
walk(r, 'report', out);
console.log(`${out.length} failing checks in the report`);
for (const line of out.slice(0, 12)) console.log(line);
