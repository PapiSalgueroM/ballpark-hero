/* Round 1215 proof: turns a dump of the walk into the plain stored save it carries (what localStorage holds). */
import fs from 'node:fs';
const [from, to] = process.argv.slice(2);
const envelope = JSON.parse(fs.readFileSync(from, 'utf8'));
if (envelope.liveFitSave !== 1 || typeof envelope.raw !== 'string') { console.error('not a dump of the walk'); process.exit(2); }
fs.writeFileSync(to, envelope.raw);
const career = JSON.parse(envelope.raw);
console.log(`plain save written: ${to}, ${Buffer.byteLength(envelope.raw)} bytes, ${career.clubName} v ${career.live.opponent}, dumped for ${JSON.stringify(envelope.target)}`);
