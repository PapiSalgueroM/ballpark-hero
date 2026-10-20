/* Fix-1514: no en or em dash on any line added since the given commit, nor in any commit message since it. The two
   characters are built from their code points, so this file holds neither. Control: DASH_CONTROL=1 adds a line
   holding one and must exit 1. */
import { execSync } from 'node:child_process';
const base = process.argv[2];
const bad = new RegExp('[' + String.fromCharCode(0x2013) + String.fromCharCode(0x2014) + ']');
let diff = execSync(`git diff ${base} HEAD`, { encoding: 'utf8', maxBuffer: 1 << 28 });
if (process.env.DASH_CONTROL) diff += '\n+control ' + String.fromCharCode(0x2014) + '\n';
const lines = diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++') && bad.test(l));
const msgs = execSync(`git log ${base}..HEAD --format=%B`, { encoding: 'utf8' }).split('\n').filter(l => bad.test(l));
console.log(`dashscan: ${lines.length} added lines and ${msgs.length} commit message lines with a dash since ${base}`);
process.exit(lines.length || msgs.length ? 1 : 0);
