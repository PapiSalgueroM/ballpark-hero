// What the results layout walk measured, case by case (runner only; writes a small JSON and up to four images into $RC_OUT).
import fs from 'node:fs';
import path from 'node:path';
const dir = 'soccer-results-layout-artifacts/native', out = process.env.RC_OUT, tag = process.argv[2] || 'run';
if (!fs.existsSync(path.join(dir, 'report.json'))) { console.log('no report.json: the walk stopped before any case'); process.exit(0); }
const report = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));
const rows = report.cases.map(c => ({ id: c.id, ok: c.ok, checks: c.checks.length, failedGroups: c.failedGroups,
  failed: c.checks.filter(v => !v.ok).slice(0, 8).map(v => `${v.group}: ${v.label}`),
  error: c.error ? String(c.error).split('\n').slice(0, 2).join(' | ') : null,
  utilities: (c.phaseLayouts ?? []).map(p => ({ name: p.name, align: p.align, phase: p.phase, disjoint: p.disjoint, painted: p.painted,
    positions: p.utilityRects.map(u => `${u.label}:${u.position}@${Math.round(u.x)},${Math.round(u.y)} ${Math.round(u.width)}x${Math.round(u.height)}`),
    targets: p.targets.map(t => `${Math.round(t.x ?? t.left ?? 0)},${Math.round(t.y ?? t.top ?? 0)} ${Math.round(t.width ?? 0)}x${Math.round(t.height ?? 0)}`) })) }));
fs.writeFileSync(path.join(out, `layout-${tag}.json`), JSON.stringify({ controls: report.controls.map(c => ({ id: c.id, failedGroups: c.failedGroups, expectedGroups: c.expectedGroups })), rows }, null, 2));
let n = 0;
for (const f of fs.readdirSync(dir)) if (n < 4 && (f.endsWith('-failure.png') || f.endsWith('summary-Continue-bottom.png'))) { fs.copyFileSync(path.join(dir, f), path.join(out, `${tag}-${f}`)); n++; }
for (const r of rows) console.log(`${r.id}: ok=${r.ok} checks=${r.checks} failed=${r.failed.length}${r.failed.length ? ' first: ' + r.failed[0] : ''}${r.error ? ' error: ' + r.error.slice(0, 160) : ''}`);
