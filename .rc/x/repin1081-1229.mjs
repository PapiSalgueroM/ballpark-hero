/* Round 1229, fix pass 2: take the Round 1081 manifest pin of src/lib/clubManager.ts again.
   Run from the repo root AFTER every round that edits the engine file is merged:
     node repin1081.mjs            writes the pin and prints old and new
     node repin1081.mjs --dry      prints what it would write, writes nothing
   It hashes the file the way scripts/simManagerAppealIsolation.mjs does (textHash: utf8, CRLF read as LF),
   and replaces the one pinned string in place so the manifest keeps its formatting. */
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const manifestFile = 'scripts/fixtures/managerAppealIsolation1081/manifest.json';
const engineFile = 'src/lib/clubManager.ts';
const dry = process.argv.includes('--dry');
const raw = fs.readFileSync(manifestFile, 'utf8');
const manifest = JSON.parse(raw);
const old = manifest.unchangedSource && manifest.unchangedSource[engineFile];
if (typeof old !== 'string' || old.length !== 64) { console.error(`repin1081: no pin for ${engineFile} in ${manifestFile}`); process.exit(2); }
if (raw.split(old).length !== 2) { console.error('repin1081: the pinned string is not in the manifest exactly once'); process.exit(2); }
const now = createHash('sha256').update(fs.readFileSync(engineFile, 'utf8').replaceAll('\r\n', '\n')).digest('hex');
if (now === old) { console.log(`repin1081: the pin already follows the file (${now})`); process.exit(0); }
if (!dry) fs.writeFileSync(manifestFile, raw.replace(old, now));
console.log(`repin1081: ${dry ? 'would move' : 'moved'} the pin of ${engineFile} from ${old} to ${now}`);
