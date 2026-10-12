// Reviewer facts-screens-weight, Release AZ. Never committed. Reads three sweepWeight outputs (base, head, stub)
// and prints every route whose weight moved between base and head, with the stub beside it.
import fs from 'node:fs';
const parse = file => {
  const rows = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s+(\/\S*)\s+(\d+)K gz over\s+(\d+) files \(budget (\d+)K, ([\d.]+)K to the tenth\)/);
    if (m && !rows.has(m[1])) rows.set(m[1], { kb: Number(m[5]), files: Number(m[3]), budget: Number(m[4]) });
  }
  return rows;
};
const [base, head, stub] = process.argv.slice(2).map(parse);
console.log(`rows: base ${base.size}, head ${head.size}, stub ${stub.size}`);
let moved = 0;
for (const [route, h] of head) {
  const b = base.get(route), s = stub.get(route);
  if (!b) { console.log(`  ${route}: not in the base output`); continue; }
  const d = Math.round((h.kb - b.kb) * 10) / 10;
  const lz = s ? Math.round((h.kb - s.kb) * 10) / 10 : null;
  if (Math.abs(d) >= 0.1 || (lz !== null && Math.abs(lz) >= 0.1) || h.kb > h.budget) {
    moved += 1;
    console.log(`  ${route.padEnd(22)} base ${b.kb.toFixed(1)}K  head ${h.kb.toFixed(1)}K (${d >= 0 ? '+' : ''}${d.toFixed(1)})  stub ${s ? s.kb.toFixed(1) + 'K' : 'n/a'}  lz-string ${lz === null ? 'n/a' : (lz >= 0 ? '+' : '') + lz.toFixed(1)}K  budget ${h.budget}K${h.kb > h.budget ? '  OVER' : ''}  files ${b.files}/${h.files}`);
  }
}
console.log(`weightCompare: ${moved} rows moved or over budget`);
