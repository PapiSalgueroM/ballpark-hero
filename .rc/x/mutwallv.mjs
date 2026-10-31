// Release BU triage D1: negative controls for simSaveKeeper section 0's version check after the Hall wall filter.
// Runs ON THE RUNNER only, inside a scratch worktree. node .rc/x/mutwallv.mjs <directv|spreadv> <dir>
// Exits 2 if the anchor is not there exactly once.
import fs from 'node:fs';
import path from 'node:path';
const BOARD = 'src/components/us-career/UsCareerBoard.tsx';
const ANCHOR = 'saveValue(JSON.stringify({ c, phase: ph, teamQuality: tq, coach: coachRef.current,';
const M = {
  // the save itself grows a direct version number: the literal stops fitting the fixture, section 0 red
  directv: 'saveValue(JSON.stringify({ v: 1, c, phase: ph, teamQuality: tq, coach: coachRef.current,',
  // the save grows a version number through a spread: the literal still fits, so the version check must catch it
  spreadv: 'saveValue(JSON.stringify({ ...({ v: 1 }), c, phase: ph, teamQuality: tq, coach: coachRef.current,',
};
const [name, dir] = process.argv.slice(2);
if (!M[name]) { console.log(`MUT ${name} unknown`); process.exit(2); }
const file = path.join(dir, BOARD);
const text = fs.readFileSync(file, 'utf8');
const n = text.split(ANCHOR).length - 1;
if (n !== 1) { console.log(`MUT ${name} ABORT: anchor found ${n} times in ${BOARD}`); process.exit(2); }
fs.writeFileSync(file, text.replace(ANCHOR, M[name]));
console.log(`MUT ${name} applied to ${BOARD}`);
