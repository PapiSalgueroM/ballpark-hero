/* The read review's item for the lead: does confidenceLabel's body leaving the engine chunk explain the 144 bytes
   playCmTablesFit PART 2 case E saw between the base's and the head's save key chunk? Prints, never asserts. */
import fs from 'node:fs';
import path from 'node:path';
const [headDist, baseDist] = process.argv.slice(2);
const FN = /function [\w$]+\([\w$]+\)\{return [\w$]+>=80\?"Untouchable":[^}]*"Dead man walking"\}/;
function look(dist) {
  const dir = path.join(dist, 'assets');
  const hits = fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8')])
    .filter(([, t]) => t.includes('dukb-club-manager-save'));
  return hits.map(([f, t]) => ({ f, bytes: Buffer.byteLength(t), dead: t.split('Dead man walking').length - 1, fn: FN.exec(t)?.[0] ?? null }));
}
const head = look(headDist);
const base = look(baseDist);
for (const [name, rows] of [['head', head], ['base', base]]) {
  for (const r of rows) console.log(`${name}: ${r.f} ${r.bytes} B, "Dead man walking" ${r.dead} times, confidenceLabel ${r.fn ? `${Buffer.byteLength(r.fn)} B: ${r.fn}` : 'absent'}`);
}
const big = rows => rows.slice().sort((a, b) => b.bytes - a.bytes)[0];
const h = big(head), b = big(base);
if (h && b) {
  const fnBytes = b.fn ? Buffer.byteLength(b.fn) : 0;
  console.log(`chunkProof: base ${b.bytes} B minus confidenceLabel ${fnBytes} B = ${b.bytes - fnBytes} B against the head's ${h.bytes} B (difference ${b.bytes - h.bytes} B, ${b.bytes - fnBytes - h.bytes} B left unexplained)`);
} else console.log('chunkProof: no chunk with the save key in one of the builds');
