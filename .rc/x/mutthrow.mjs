// Round 1556 probe (never committed): make the NBA host's hand back throw the moment it acts, so a harness that
// still passes proves the hand back never acted on its stream (that stream is the engine's summer exactly).
// Run from a worktree root: node <path>/mutthrow.mjs
import fs from 'node:fs';
const f = 'src/lib/gmContractsHostNba.ts';
const s = fs.readFileSync(f, 'utf8');
const anchor = '  if (notes.some(n => n.endsWith(`${h.man.name} retires.`))) return;\n';
if (!s.includes(anchor) || s.split(anchor).length !== 2) { console.error('mutthrow: anchor missing or repeated, nothing changed'); process.exit(3); }
const out = s.replace(anchor, anchor + '  throw new Error(`HANDBACK ACTED on ${h.man.name} at ${h.club}`);\n');
if (out === s) { console.error('mutthrow: changed nothing'); process.exit(3); }
fs.writeFileSync(f, out);
console.log('mutthrow: the hand back now throws when it acts');
