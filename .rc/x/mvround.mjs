// Mutation (never committed): move the harness on as the next round on this record would, in a COPY
// (scripts/xMoved-<tag>.mjs) so lines running side by side never share a file. PREV becomes the
// checked out head (the record as this round closes it); the round number moves to 9999 (ROUNDS gains
// 9999 on the fixed code, ROUND becomes 9999 on the old code). Run from the root of the tree.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const tag = process.argv[2] || 'a';
let src = fs.readFileSync('scripts/simBingoClubCounts.mjs', 'utf8');
const head = execSync('git rev-parse --short=9 HEAD', { encoding: 'utf8' }).trim();
const prev = "const PREV = '32baab916';";
if (!src.includes(prev)) { console.log('mvround: PREV anchor missing, abort'); process.exit(4); }
src = src.replace(prev, `const PREV = '${head}';`);
let how;
if (src.includes('const ROUNDS = [1576];')) { src = src.replace('const ROUNDS = [1576];', 'const ROUNDS = [1576, 9999];'); how = 'ROUNDS appended'; }
else if (src.includes('const ROUND = 1576;')) { src = src.replace('const ROUND = 1576;', 'const ROUND = 9999;'); how = 'ROUND moved'; }
else { console.log('mvround: ROUND anchor missing, abort'); process.exit(4); }
fs.writeFileSync(`scripts/xMoved-${tag}.mjs`, src);
console.log(`mvround: PREV ${head}, round 9999 (${how}), wrote scripts/xMoved-${tag}.mjs`);
