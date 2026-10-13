/* Reviewer (run lens), Round 1319: attribution probe for the three simUsSeasonCentre receipts.
   On the RUNNER only (it rewrites a committed record in the runner's checkout, and the request line
   restores it with git checkout in the same line). It moves the record's input blob of the two
   descriptors this round edited, and nothing else, to their blob on this head, so that a compare
   afterwards answers the question the exit 3 hides: do the season digests themselves hold?
   Usage: node .rc/x/rvrcpt.mjs <law|lay|seam> */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const FILES = { law: 'scripts/data/usSeasonLawDigest.json', lay: 'scripts/data/usSeasonLayDigest.json', seam: 'scripts/data/usSeasonSeamDigest.json' };
const which = process.argv[2];
const file = FILES[which];
if (!file) { console.error('usage: rvrcpt.mjs law|lay|seam'); process.exit(2); }
const OURS = ['src/lib/nbaCareerPreDraft.ts', 'src/lib/nflCareerPreDraft.ts'];
const blobOf = rel => {
  const body = Buffer.from(fs.readFileSync(rel, 'utf8').replace(/\r\n/g, '\n'), 'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${body.length}`), Buffer.from([0]), body])).digest('hex').slice(0, 12);
};
const rec = JSON.parse(fs.readFileSync(file, 'utf8'));
let changed = 0;
for (const p of OURS) {
  if (!(p in rec.inputs)) { console.error(`${p} is not an input of the ${which} record: refusing`); process.exit(2); }
  const now = blobOf(p);
  console.log(`${which}: ${p} record ${rec.inputs[p]} now ${now}`);
  if (rec.inputs[p] !== now) { rec.inputs[p] = now; changed += 1; }
}
if (!changed) { console.error('nothing moved: the probe changed nothing, refusing'); process.exit(2); }
fs.writeFileSync(file, JSON.stringify(rec, null, 2) + '\n');
console.log(`${which}: moved ${changed} input blob(s) of this round's descriptors to this head's; the digests are untouched`);
