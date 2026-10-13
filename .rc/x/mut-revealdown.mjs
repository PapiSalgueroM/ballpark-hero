// Round 1309 walk control `revealdown` (the closing check's copy: under sm in the bracket the reveal now aligns the
// wrapper's end, and the back chip's row is above the box under sm): the reveal put back as Round 1307 shipped it FROM
// sm UP (the wrapper that starts at the box, aligned to its top), with everything under sm left as it is, so the walk's
// point 12 must go red and nothing else. Each string must be in the board exactly once, or this refuses.
import fs from 'node:fs';
const FILE = 'src/components/front-office/FrontOfficeBoard.tsx';
let src = fs.readFileSync(FILE, 'utf8');
const swaps = [
  ["    wideAtLoad ? { block: 'end' } : inBracket ? { block: 'end' } : undefined,\n", "    wideAtLoad ? undefined : inBracket ? { block: 'end' } : undefined,\n"],
  ['<div ref={wideAtLoad ? undefined : revealRef} className="space-y-3">', '<div ref={revealRef} className="space-y-3">'],
  ['{wideAtLoad && !bracketRow && <div ref={revealRef} aria-hidden', '{false && <div aria-hidden'],
  ['{wideAtLoad && <div ref={revealRef} aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px" data-reveal-edge />}', ''],
];
src = src.split('\r\n').join('\n');
for (const [from, to] of swaps) {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`mut-revealdown: "${from.trim()}" is in the board ${n} times, not once: refusing`); process.exit(2); }
  src = src.replace(from, () => to);
}
fs.writeFileSync(FILE, src);
console.log('mut-revealdown: from sm up the reveal is the box wrapper, top aligned; under sm as built');
