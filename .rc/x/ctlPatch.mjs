/* Runner only, never committed: patch a copy of the tree for one of playCmBoardVerdict's controls, every
   anchor asserted first. Usage: node ctlPatch.mjs <tree> <noconfirm|nofate> */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const [tree, control] = process.argv.slice(2);
const file = path.join(tree, 'src/components/club-manager/ClubManagerSeasonSummary.tsx');
let t = readFileSync(file, 'utf8');
const P = {
  noconfirm: ['onClick={() => setAsking({ season: sm.season, club: o.club })}', 'onClick={() => g.nextSeason(o.club)}'],
  nofate: ['            {sm.fate && (', '            {false && sm.fate && ('],
}[control];
if (!P) { console.log(`unknown control ${control}`); process.exit(2); }
const n = t.split(P[0]).length - 1;
if (n !== 1) { console.log(`control ${control}: anchor found ${n} times; could not run`); process.exit(2); }
writeFileSync(file, t.replace(P[0], P[1]));
console.log(`control ${control}: patched ${file}`);
