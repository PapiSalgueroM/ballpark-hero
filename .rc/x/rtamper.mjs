/* Reviewer (run lens), Round 1215: three files made from one real dump, to see the guards of LIVE_FIT_SAVE fire.
   usage: node .rc/x/rtamper.mjs <dump> <out folder> */
import fs from 'node:fs';
import path from 'node:path';
const [from, out] = process.argv.slice(2);
const envelope = JSON.parse(fs.readFileSync(from, 'utf8'));
if (envelope.liveFitSave !== 1 || typeof envelope.raw !== 'string' || !envelope.target) { console.error('not a dump of the walk'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
/* 1: the digest is another match's */
fs.writeFileSync(path.join(out, 'tamper-digest.json'), JSON.stringify({ ...envelope, digest: '00000000' }));
/* 2: the goal is a minute later than any goal of the half */
fs.writeFileSync(path.join(out, 'tamper-target.json'), JSON.stringify({ ...envelope, target: { ...envelope.target, minute: envelope.target.minute + 1, place: envelope.target.place + 1 } }));
/* 3: a plain stored save with no match in flight */
const career = JSON.parse(envelope.raw);
delete career.live;
fs.writeFileSync(path.join(out, 'tamper-nolive.json'), JSON.stringify(career));
/* 4: a hand made envelope the way the notes tell Round 1216 to write one: no digest, a target of four fields */
fs.writeFileSync(path.join(out, 'handmade.json'), JSON.stringify({ liveFitSave: 1, raw: envelope.raw, target: { minute: envelope.target.minute, plus: envelope.target.plus, side: envelope.target.side, name: envelope.target.name } }));
console.log(`four files written into ${out} from a dump for ${JSON.stringify(envelope.target)} with digest ${envelope.digest}`);
