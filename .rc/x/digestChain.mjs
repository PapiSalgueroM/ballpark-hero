// Release AV scratch (sent to the runner as .rc/x/digestChain.mjs, never committed): the digest VALUES of several
// records of scripts/simUsSeasonCentre.mjs, read in order, link by link. A READING: it exits 0 unless a file is
// missing or unreadable, and its last line says which links moved a value.
// usage: node digestChain.mjs label=file label=file ...
import fs from 'node:fs';

const recs = process.argv.slice(2).map(arg => {
  const at = arg.indexOf('=');
  const label = arg.slice(0, at), file = arg.slice(at + 1);
  return { label, file, rec: JSON.parse(fs.readFileSync(file, 'utf8')) };
});
const KEYS = ['seasons', 'derived', 'season', 'careers'];
const moves = [];
for (let i = 1; i < recs.length; i += 1) {
  const a = recs[i - 1], b = recs[i];
  let n = 0;
  const diff = [];
  const sports = new Set([...Object.keys(a.rec.digests ?? {}), ...Object.keys(b.rec.digests ?? {})]);
  for (const sport of sports) {
    const sets = new Set([...Object.keys(a.rec.digests?.[sport] ?? {}), ...Object.keys(b.rec.digests?.[sport] ?? {})]);
    for (const set of sets) for (const k of KEYS) {
      n += 1;
      const x = a.rec.digests?.[sport]?.[set]?.[k], y = b.rec.digests?.[sport]?.[set]?.[k];
      if (x !== y) diff.push(`${sport} set ${set} ${k}`);
    }
  }
  for (const k of ['careers', 'strayDraws']) { n += 1; if (JSON.stringify(a.rec[k]) !== JSON.stringify(b.rec[k])) diff.push(`${k} ${JSON.stringify(a.rec[k])} to ${JSON.stringify(b.rec[k])}`); }
  const all = { ...(a.rec.inputs ?? {}), ...(a.rec.movedAtRecord ?? {}) };
  const allB = { ...(b.rec.inputs ?? {}), ...(b.rec.movedAtRecord ?? {}) };
  const files = [...new Set([...Object.keys(all), ...Object.keys(allB)])].sort();
  const changed = files.filter(f => all[f] !== allB[f]);
  console.log(`LINK ${a.label} -> ${b.label}: ${n} values, ${diff.length} differ; ${changed.length} bundled files differ of ${files.length}`);
  const bySport = {};
  for (const d of diff) { const [sport, , , k] = d.split(' '); const key = `${sport} ${k ?? ''}`.trim(); bySport[key] = (bySport[key] ?? 0) + 1; }
  if (diff.length) console.log(`   moved, counted over the seed sets: ${Object.entries(bySport).map(([k, v]) => `${k} x${v}`).join(', ')}`);
  for (const f of changed) console.log(`   file ${f}: ${all[f] ?? 'not bundled'} -> ${allB[f] ?? 'not bundled'}`);
  moves.push(`${a.label}->${b.label} ${diff.length}`);
}
for (const r of recs) console.log(`record ${r.label}: commit ${r.rec.commit}, round ${r.rec.round}, careers ${r.rec.careers}, stray draws ${r.rec.strayDraws}, ${Object.keys(r.rec.inputs ?? {}).length} inputs + ${Object.keys(r.rec.movedAtRecord ?? {}).length} moved`);
console.log(`digestChain: values that differ, link by link: ${moves.join('; ')}`);
