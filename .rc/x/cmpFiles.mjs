/* Round 1210, second fix pass. Never committed: sent to a runner as .rc/x/cmpFiles.mjs.
   Compares two lists written by footleFiles.mjs. A built file is named <stem>-<eight character hash>.js and
   the hash moves whenever the file or a file it names moves, so the comparison is by stem: for every stem
   the number of files and the gzipped bytes on each side, and only the stems that differ are printed.
   Usage: node .rc/x/cmpFiles.mjs <branch label> <base label>     exit 0 always (it reports, it does not judge) */
import fs from 'node:fs';
import path from 'node:path';

const [a, b] = process.argv.slice(2);
if (!a || !b) { console.error('usage: cmpFiles.mjs <branch label> <base label>'); process.exit(2); }
const HASH = new RegExp('-[A-Za-z0-9_-]{8}[.]js$');
function read(label) {
  const text = fs.readFileSync(`/tmp/${label}.txt`, 'utf-8');
  const byStem = new Map();
  let total = 0; let count = 0;
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#') || line.startsWith('late ')) continue;
    const [file, size] = line.split(' ');
    const stem = file.replace(HASH, '');
    const cur = byStem.get(stem) ?? { files: 0, bytes: 0, names: [] };
    cur.files += 1; cur.bytes += Number(size); cur.names.push(file);
    byStem.set(stem, cur);
    total += Number(size); count += 1;
  }
  return { byStem, total, count };
}
const A = read(a); const B = read(b);
const out = [];
out.push(`${a}: ${A.count} files, ${(A.total / 1024).toFixed(1)}K gzipped. ${b}: ${B.count} files, ${(B.total / 1024).toFixed(1)}K gzipped. Difference ${A.total - B.total} bytes (${((A.total - B.total) / 1024).toFixed(2)}K).`);
const stems = [...new Set([...A.byStem.keys(), ...B.byStem.keys()])].sort();
let same = 0; let explained = 0;
for (const s of stems) {
  const x = A.byStem.get(s); const y = B.byStem.get(s);
  if (x && y && x.files === y.files && x.bytes === y.bytes) { same += 1; continue; }
  const d = (x?.bytes ?? 0) - (y?.bytes ?? 0);
  explained += d;
  if (x && !y) out.push(`ONLY ON ${a}: ${x.names.join(', ')} ${x.bytes} bytes (${(x.bytes / 1024).toFixed(2)}K)`);
  else if (!x && y) out.push(`ONLY ON ${b}: ${y.names.join(', ')} ${y.bytes} bytes (${(y.bytes / 1024).toFixed(2)}K)`);
  else out.push(`MOVED: ${s} ${y.files} file(s) ${y.bytes} bytes on ${b}, ${x.files} file(s) ${x.bytes} bytes on ${a}: ${d >= 0 ? '+' : ''}${d} bytes`);
}
out.push(`${same} of ${stems.length} stems weigh the same on both sides; the lines above add up to ${explained} bytes.`);
const text = out.join('\n') + '\n';
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, `cmp-${a}-${b}.txt`), text);
console.log(text.trimEnd());
