// Release BJ triage probe (not a gate): prints evidence from a walk's own artifact folder.
//   node .rc/x/diagBJ.mjs deck <dir> [nameFilter]   every JSON under <dir> whose name matches: the summer deck card ids
//                                                  (700 to 999) in any pendingEvents it holds, by top level key
//   node .rc/x/diagBJ.mjs diff <dir> <nameFilter>   the first differences written by the walk for that step
//   node .rc/x/diagBJ.mjs cmrf <report.json>        playCmRealFixtures' cases: id, passed, the first lines of the error
import fs from 'node:fs';
import path from 'node:path';

const [mode, target, filter = ''] = process.argv.slice(2);
const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
const deckIds = (v, out = []) => {
  if (Array.isArray(v)) v.forEach(x => deckIds(x, out));
  else if (v && typeof v === 'object') {
    if (Array.isArray(v.pendingEvents)) for (const e of v.pendingEvents) if (typeof e?.id === 'number' && e.id >= 700 && e.id <= 999) out.push(e.id);
    for (const [k, x] of Object.entries(v)) if (k !== 'pendingEvents') deckIds(x, out);
  }
  return out;
};
if (mode === 'deck') {
  const files = walk(target).filter(f => f.endsWith('.json') && path.basename(f).includes(filter));
  let shown = 0, withDeck = 0;
  for (const f of files) {
    let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    const parts = j && typeof j === 'object' && !Array.isArray(j) ? Object.entries(j).map(([k, v]) => [k, [...new Set(deckIds({ [k]: v }))]]).filter(([, ids]) => ids.length) : [];
    if (!parts.length) continue;
    withDeck += 1;
    if (shown++ < 25) console.log(`deck ${path.basename(f)}: ${parts.map(([k, ids]) => `${k} [${ids.join(',')}]`).join('; ')}`);
  }
  console.log(`diagBJ deck: ${files.length} files read, ${withDeck} hold a summer deck card`);
} else if (mode === 'diff') {
  const files = walk(target).filter(f => path.basename(f).includes(filter));
  for (const f of files.slice(0, 12)) {
    const text = fs.readFileSync(f, 'utf8');
    console.log(`file ${path.basename(f)} (${text.length} bytes): ${text.replace(/\s+/g, ' ').slice(0, f.endsWith('-diff.json') ? 1800 : 300)}`);
  }
  console.log(`diagBJ diff: ${files.length} files match ${filter}`);
} else if (mode === 'cmrf') {
  const r = JSON.parse(fs.readFileSync(target, 'utf8'));
  for (const c of r.cases || []) console.log(`case ${c.id ?? c.kind ?? '?'} passed=${!!c.passed} ${c.error ? 'error: ' + String(c.error).split('\n').slice(0, 6).join(' | ').slice(0, 900) : ''}`);
  console.log(`diagBJ cmrf: ${(r.cases || []).length} cases, controls ${JSON.stringify(r.controls)}`);
} else if (mode === 'labels') {
  const r = JSON.parse(fs.readFileSync(target, 'utf8'));
  for (const j of r.journeys || []) console.log(`journey ${j.width} ${j.status} ${j.error ? String(j.error.message).slice(0, 500) + ' | ' + String(j.error.stack || '').split('\n').slice(1, 3).join(' ').slice(0, 300) : ''}`);
  console.log(`diagBJ labels: status ${r.status}${r.error ? ', ' + String(r.error.message).slice(0, 300) : ''}`);
} else { console.log('usage: diagBJ.mjs deck|diff|cmrf|labels ...'); process.exit(2); }
