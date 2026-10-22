// Weight probe for Round 1554: gzip bytes of a page chunk and of its static import closure, two builds side by side.
// Usage: node weight.mjs <distBase> <distBranch> src/pages/CfbDynasty.tsx src/pages/CbbDynasty.tsx ...
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const [baseDist, branchDist, ...pages] = process.argv.slice(2);
function load(dist) {
  for (const p of ['.vite/manifest.json', 'manifest.json']) {
    const f = path.join(dist, p);
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  }
  throw new Error(`no manifest in ${dist}`);
}
const gz = (dist, file) => zlib.gzipSync(fs.readFileSync(path.join(dist, file)), { level: 9 }).length;
function measure(dist, page) {
  const man = load(dist);
  const entry = man[page];
  if (!entry) return null;
  const seen = new Set();
  const walk = k => { if (seen.has(k)) return; seen.add(k); for (const i of man[k]?.imports ?? []) walk(i); };
  walk(page);
  let closure = 0;
  for (const k of seen) closure += gz(dist, man[k].file);
  return { chunk: gz(dist, entry.file), closure, files: seen.size };
}
const rows = [];
for (const page of pages) {
  const a = measure(baseDist, page);
  const b = measure(branchDist, page);
  rows.push({ page, base: a, branch: b, chunkDelta: a && b ? b.chunk - a.chunk : null, closureDelta: a && b ? b.closure - a.closure : null });
}
for (const r of rows) {
  console.log(`${r.page}: page chunk ${r.base?.chunk} -> ${r.branch?.chunk} B gz (${r.chunkDelta >= 0 ? '+' : ''}${r.chunkDelta}); static closure ${r.base?.closure} (${r.base?.files} files) -> ${r.branch?.closure} (${r.branch?.files} files) B gz (${r.closureDelta >= 0 ? '+' : ''}${r.closureDelta})`);
}
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'weight.json'), JSON.stringify(rows, null, 2));
