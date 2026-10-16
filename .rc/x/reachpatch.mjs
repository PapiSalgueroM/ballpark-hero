// Round 1334 fixer: a runner-only probe patch. Prints, per index pack, the three least dealt cards over the
// kit's section 10 drive, and optionally sets the soccer pack's goals spec max. Each edit must find its text once.
// Usage: node .rc/x/reachpatch.mjs [goalsMax]
import fs from 'node:fs';

const once = (file, from, to) => {
  let src = fs.readFileSync(file, 'utf8');
  const crlf = src.includes('\r\n');
  if (crlf) src = src.split('\r\n').join('\n');
  const hits = src.split(from).length - 1;
  if (hits !== 1) { console.error(`REACHPATCH: text found ${hits} times in ${file}, refusing`); process.exit(2); }
  src = src.replace(from, () => to);
  fs.writeFileSync(file, crlf ? src.split('\n').join('\r\n') : src);
};
const KIT = 'scripts/simEventDeck.mjs';
const anchor = '    const unreached = p.events.filter(e => !r.n[e.id]).map(e => e.id);';
once(KIT, anchor, anchor + '\n    console.log(`REACH ${k} ` + p.events.map(e => [e.id, r.n[e.id] ?? 0]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(x => x.join(":")).join(" ") + ` total ${r.total}`);');
const g = process.argv[2];
if (g) {
  once('src/data/soccerDeck/starter.ts', "goals: { kind: 'num', min: 0, max: 40, per: 'season' },", `goals: { kind: 'num', min: 0, max: ${Number(g)}, per: 'season' },`);
}
console.log(`REACHPATCH applied (goals max ${g || 'unchanged'})`);
