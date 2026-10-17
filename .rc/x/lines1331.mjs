// Round 1340 (never committed): Round 1331's lines byte for byte. Each named line of the base is found, whole and
// in order, as a run of lines in the head's file. Exit 1 if any is missing.
import { execFileSync } from 'node:child_process';
const BASE = process.argv[2] || 'd8aaa4cb';
const show = (ref, f) => execFileSync('git', ['show', `${ref}:${f}`], { encoding: 'utf8', maxBuffer: 64 << 20 }).replaceAll('\r\n', '\n').split('\n');
const spans = {
  'src/components/club-manager/LiveSimScreen.tsx': [[6, 6], [1180, 1182], [1456, 1460], [1940, 1950], [1985, 1995]],
  'src/components/club-manager/HalftimeScreen.tsx': [[4, 4], [55, 56], [120, 128]],
};
let bad = 0;
for (const [file, list] of Object.entries(spans)) {
  const base = show(BASE, file), head = show('HEAD', file).join('\n');
  for (const [a, b] of list) {
    const run = base.slice(a - 1, b).join('\n');
    const ok = head.includes(run);
    if (!ok) bad += 1;
    console.log(`${ok ? 'kept ' : 'MOVED'} ${file.split('/').pop()} ${a}-${b}: ${base[a - 1].trim().slice(0, 70)}`);
  }
}
console.log(bad ? `lines1331: RED, ${bad} spans changed` : 'lines1331: green, every Round 1331 span is in the head byte for byte');
process.exit(bad ? 1 : 0);
