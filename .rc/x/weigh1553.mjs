// Weigh the built chunks this round touches: the Connections data chunk and the What's New chunk.
// node .rc/x/weigh1553.mjs <label>
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const label = process.argv[2] ?? 'build';
const dir = path.join(process.cwd(), 'dist', 'assets');
const marks = { connectionsData: "puzzle-250", whatsNew: 'The running log of what changed around here' };
const out = [];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
  const text = fs.readFileSync(path.join(dir, f));
  const s = text.toString('utf8');
  for (const [k, m] of Object.entries(marks)) if (s.includes(m)) out.push(`${label} ${k} ${f} raw=${text.length} gzip=${zlib.gzipSync(text, { level: 9 }).length}`);
}
const line = out.join('\n') || `${label}: no chunk carries the markers`;
console.log(line);
if (process.env.RC_OUT) fs.appendFileSync(path.join(process.env.RC_OUT, 'weight1553.txt'), line + '\n');
