/* cmpBoard.mjs (fixer scratch, Round 1103, never committed): what moved between two US board fixtures, by sport. */
import fs from 'node:fs';
const [a, b] = process.argv.slice(2).map(p => JSON.parse(fs.readFileSync(p, 'utf8')));
const J = x => JSON.stringify(x);
console.log(`header before: ${a.header.recordedFrom}`);
console.log(`header after:  ${b.header.recordedFrom}`);
for (const sport of Object.keys(b.sports)) {
  const x = a.sports[sport]; const y = b.sports[sport];
  if (J(x) === J(y)) { console.log(`\n${sport}: BYTE EQUAL (path ${y.path.length} steps, ${Object.keys(y.saves).length} fixed saves, every screen)`); continue; }
  console.log(`\n${sport}: MOVED. path ${x.path.length} -> ${y.path.length} steps; coverage ${J(x.coverage) === J(y.coverage) ? 'same' : `${J(x.coverage)} -> ${J(y.coverage)}`}; first paint ${J(x.ssrCreate) === J(y.ssrCreate) ? 'same' : 'moved'}`);
  const n = Math.min(x.path.length, y.path.length);
  let firstAny = -1; let firstSave = -1; let firstAction = -1;
  const kinds = { action: 0, save: 0, markupOnly: 0, textOnly: 0 };
  const early = [];
  for (let i = 0; i < n; i++) {
    const p = x.path[i]; const q = y.path[i];
    if (J(p) === J(q)) continue;
    if (firstAny < 0) firstAny = i;
    if (p.a !== q.a) { kinds.action++; if (firstAction < 0) firstAction = i; }
    if (p.s !== q.s) { kinds.save++; if (firstSave < 0) firstSave = i; }
    else if (p.m !== q.m) kinds.markupOnly++;
    else if (p.t !== q.t) kinds.textOnly++;
    if (early.length < 6) early.push(`  step ${i} [${q.p}, season ${q.n}] ${p.a !== q.a ? `action "${p.a.slice(0, 70)}" -> "${q.a.slice(0, 70)}"` : `action "${q.a.slice(0, 70)}"`}; save ${p.s === q.s ? 'same' : 'moved'}; markup ${p.m === q.m ? 'same' : 'moved'}; save fields moved: ${Object.keys(q.d).filter(k => p.d[k] !== q.d[k]).slice(0, 10).join(', ') || 'none'}\n      text was: ${p.t.slice(0, 170)}\n      text now: ${q.t.slice(0, 170)}`);
  }
  console.log(`  first step that differs ${firstAny}; first save that differs ${firstSave}; first action label that differs ${firstAction}`);
  console.log(`  of the first ${n} steps: ${kinds.save} differ in the save, ${kinds.markupOnly} in the markup only, ${kinds.textOnly} in the text excerpt only, ${kinds.action} in the action label`);
  const beforeSave = []; for (let i = 0; i < (firstSave < 0 ? n : firstSave); i++) if (J(x.path[i]) !== J(y.path[i])) beforeSave.push(i);
  console.log(`  steps that differ before the first save does: ${beforeSave.join(', ') || 'none'}`);
  for (const e of early) console.log(e);
  const saves = Object.keys(y.saves).filter(k => x.saves[k] !== y.saves[k]);
  console.log(`  fixed saves that moved: ${saves.length} of ${Object.keys(y.saves).length} (${saves.join(', ') || 'none'})`);
  const screens = Object.keys(y.screens).map(k => { const u = x.screens[k] ?? []; const v = y.screens[k]; let d = Math.abs(u.length - v.length); for (let i = 0; i < Math.min(u.length, v.length); i++) if (J(u[i]) !== J(v[i])) d++; return `${k} ${d}/${v.length}`; });
  console.log(`  screen steps that moved, by fixed save: ${screens.join(', ')}`);
}
