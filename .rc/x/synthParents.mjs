// Round 1340 (never committed): the two packet harnesses pin a whole source file to "the parent plus this packet".
// Their parent is "the tree without this packet" (their own comments). This tree edits HalftimeScreen.tsx and
// LiveSimScreen.tsx, so no existing commit is that tree. This builds it: HEAD with only the packet's own spans taken
// back out (read from the harness itself), as a commit object whose working tree is never touched.
// Usage: node .rc/x/synthParents.mjs  ->  prints "<halftime parent sha> <pitch parent sha>"
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const git = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 << 20, ...opts }).trim();
const lf = s => s.replaceAll('\r\n', '\n');
/** A file as HEAD holds it, byte for byte (no trim: the harnesses compare whole files). */
const raw = file => execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8', maxBuffer: 64 << 20 });
const once = (text, from, to, what) => {
  const n = text.split(from).length - 1;
  if (n !== 1) { console.error(`synthParents: ${what}: the span is in the file ${n} times, not once`); process.exit(2); }
  return text.replace(from, () => to);
};

function literalAfter(file, marker, close) {
  const src = fs.readFileSync(file, 'utf8');
  const at = src.indexOf(marker);
  if (at < 0) { console.error(`synthParents: no "${marker}" in ${file}`); process.exit(2); }
  const start = at + marker.length;
  const end = src.indexOf(close, start);
  return new Function(`return ${src.slice(start, end + close.length - 1)}`)();
}

function commitWith(file, text, label) {
  const idx = path.join(os.tmpdir(), `synth-${label}-${process.pid}.idx`);
  const env = { ...process.env, GIT_INDEX_FILE: idx };
  git(['read-tree', 'HEAD'], { env });
  const blob = git(['hash-object', '-w', '--stdin'], { input: text });
  git(['update-index', '--cacheinfo', `100644,${blob},${file}`], { env });
  const tree = git(['write-tree'], { env });
  fs.rmSync(idx, { force: true });
  return git(['-c', 'user.name=rc', '-c', 'user.email=rc@example.invalid', 'commit-tree', tree, '-p', 'HEAD', '-m', `synthetic parent: HEAD without the ${label} packet`]);
}

/* Halftime: HEAD's HalftimeScreen.tsx with the four spans of simManagerHalftimeLineups.mjs taken back out. */
const HT = 'src/components/club-manager/HalftimeScreen.tsx';
const spans = literalAfter('scripts/simManagerHalftimeLineups.mjs', 'const spans = ', '\n  ];');
let ht = lf(raw(HT));
for (const [anchor, replacement] of [...spans].reverse()) ht = once(ht, replacement, anchor, `halftime span "${anchor.trim().slice(0, 40)}"`);
const htParent = commitWith(HT, ht, 'halftime');

/* Pitch restart: HEAD's motion.tsx with FIXED put back to OLD, as simPitchRestartContinuity.mjs's inverse does. */
const MOTION = 'src/components/pitch-motion/motion.tsx';
const OLD = literalAfter('scripts/simPitchRestartContinuity.mjs', 'const OLD = ', ";\n");
const FIXED = literalAfter('scripts/simPitchRestartContinuity.mjs', 'const FIXED = ', ";\n");
const motion = once(lf(raw(MOTION)), FIXED, OLD, 'the motion span');
const pitchParent = commitWith(MOTION, motion, 'pitch');
console.log(`${htParent} ${pitchParent}`);
