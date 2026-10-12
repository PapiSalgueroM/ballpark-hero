// Round 1314 reviewer (run lens): a copy of playClubManager whose board doctoring writes a field the game never
// reads, so the edit is LOST while the save is still there. The new "proven landed" check must turn it into a
// BROKEN finding ("the doctored board did not land"). Run the copy with PLAY_CM_SEED=1542433760.
import fs from 'node:fs';

const src = fs.readFileSync('scripts/playClubManager.mjs', 'utf8').split('\r\n').join('\n');
const from = '    c.boardConfidence = v;\n';
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`mkDocLost: the doctoring line was found ${n} time(s)`); process.exit(3); }
fs.writeFileSync('scripts/playClubManagerDocLost.mjs', src.replace(from, '    c.boardConfidenceLost = v;\n'));
console.log('mkDocLost: scripts/playClubManagerDocLost.mjs written, its doctoring writes boardConfidenceLost');
