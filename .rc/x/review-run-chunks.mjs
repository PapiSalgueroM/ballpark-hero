// Review of Round 1325: compare the engine chunks of two builds (argv[2] base dist, argv[3] head dist).
// Prints each engine chunk's name on both sides, byte sizes, and whether the bytes are equal once every
// hashed chunk name inside them is replaced by a placeholder. Also counts how many chunk names differ.
import fs from 'node:fs';
import path from 'node:path';
const [bd, hd] = process.argv.slice(2).map(d => path.join(d, 'assets'));
const files = d => fs.readdirSync(d).filter(f => f.endsWith('.js'));
const B = files(bd), H = files(hd);
const norm = s => s.replace(/([A-Za-z0-9_$.]+)-[A-Za-z0-9_-]{8}\.(js|css)/g, '$1-HASH.$2');
const hs = new Set(H);
console.log(`base ${B.length} js chunks, head ${H.length}, same name on both: ${B.filter(f => hs.has(f)).length}`);
let bad = 0;
for (const prefix of ['clubManager-', 'managerHotSeat-', 'deadlineDay-', 'clubManagerEras-', 'useClubManager-']) {
  const b = B.filter(f => f.startsWith(prefix)), h = H.filter(f => f.startsWith(prefix));
  if (!b.length && !h.length) { console.log(`${prefix}*: none on either side`); continue; }
  for (let i = 0; i < Math.max(b.length, h.length); i++) {
    const bf = b[i], hf = h[i];
    if (!bf || !hf) { console.log(`${prefix}: only ${bf || hf}`); bad++; continue; }
    const bb = fs.readFileSync(path.join(bd, bf), 'utf8'), hb = fs.readFileSync(path.join(hd, hf), 'utf8');
    const eq = norm(bb) === norm(hb);
    if (!eq) bad++;
    console.log(`${prefix}: base ${bf} ${bb.length} bytes, head ${hf} ${hb.length} bytes, names ${bf === hf ? 'SAME' : 'differ'}, bytes ${bb === hb ? 'identical' : eq ? 'equal once hashed names are set aside' : 'DIFFERENT'}`);
  }
}
console.log(bad ? `CHUNKS: ${bad} engine chunk(s) differ` : 'CHUNKS: every engine chunk equal once hashed names are set aside');
process.exit(bad ? 1 : 0);
