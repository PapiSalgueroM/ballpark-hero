/* Round 1593 (runner only, sent as .rc/x/mutPlayOff.mjs): drop my own club's Europa League opt in from the tree,
   with scripts/lib/worldUelPlay.mjs's PLAY_EDITS, so a harness can measure the round with the participant off. The
   request line restores src with git checkout afterwards. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = process.cwd();
const { PLAY_EDITS } = await import(pathToFileURL(path.join(ROOT, 'scripts', 'lib', 'worldUelPlay.mjs')).href);
for (const e of PLAY_EDITS) {
  const file = path.join(ROOT, e.file);
  const text = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
  const n = text.split(e.from).length - 1;
  if (n !== 1) { console.log(`mutPlayOff: the line stands ${n} times in ${e.file}, it must be exactly once`); process.exit(2); }
  fs.writeFileSync(file, text.replace(e.from, e.to));
  console.log(`mutPlayOff: ${e.file} edited (the opt in dropped)`);
}
