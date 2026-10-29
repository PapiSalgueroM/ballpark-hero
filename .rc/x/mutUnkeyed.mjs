// Round 1559 probe (never committed): a copy of simGmCareer.mjs without section 9's extra market read for a passed man,
// to show that the unkeyed control's count on the head (615) differs from BASE's (580) only by the Math.random draws
// that read takes under the control. Writes scripts/simGmCareerMut1559.mjs beside the original (same ROOT).
import fs from 'node:fs';
const src = fs.readFileSync('scripts/simGmCareer.mjs', 'utf8').replaceAll('\r\n', '\n');
const anchor = "          else if (H.hostMarket(host, lg, sitOut(t.pass.seat), label).state === 'closed') P9.closedNext++;\n";
const n = src.split(anchor).length - 1;
if (n !== 1) { console.log('mutUnkeyed ABORT: anchor found ' + n + ' times'); process.exit(2); }
fs.writeFileSync('scripts/simGmCareerMut1559.mjs', src.replace(anchor, ''));
console.log('mutUnkeyed: anchor removed once, scripts/simGmCareerMut1559.mjs written');
