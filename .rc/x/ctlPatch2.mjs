/* Runner only, never committed: patch a copy of the tree for one of playCmBoardVerdict's controls, every
   anchor asserted first. Usage: node ctlPatch2.mjs <tree> <noconfirm|nofate|rise> */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const [tree, control] = process.argv.slice(2);
const file = path.join(tree, 'src/components/club-manager/ClubManagerSeasonSummary.tsx');
let t = readFileSync(file, 'utf8');
const P = {
  noconfirm: [['onClick={() => setAsking({ season: sm.season, club: o.club })}', 'onClick={() => g.nextSeason(o.club)}']],
  nofate: [['            {sm.fate && (', '            {false && sm.fate && (']],
  rise: [["backedIn !== sm.season && 'cm-rise')}", "'cm-rise')}"],
    ['style={backedIn === sm.season ? undefined : { animationDelay: revealDelay(i) }}', 'style={{ animationDelay: revealDelay(i) }}']],
}[control];
if (!P) { console.log(`unknown control ${control}`); process.exit(2); }
for (const [from, to] of P) {
  const n = t.split(from).length - 1;
  if (n !== 1) { console.log(`control ${control}: anchor found ${n} times; could not run`); process.exit(2); }
  t = t.replace(from, to);
}
writeFileSync(file, t);
console.log(`control ${control}: patched ${file}`);
