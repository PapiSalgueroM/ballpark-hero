/* Release AT: VAR ships dark (src/lib/clubManagerVarLive.ts, CM_VAR_LIVE = false).
 *
 * The browser walk scripts/playCmVar.mjs drives the real page and expects the page to ask the engine for
 * reviews, so it can only run against a build made with the switch on. This script turns the switch on or
 * off IN A SCRATCH CHECKOUT (a CI runner), never in a tree somebody commits from:
 *
 *   node scripts/qa/cmVarLit.mjs on  && node_modules/.bin/vite build && node scripts/playCmVar.mjs; s=$?;
 *   node scripts/qa/cmVarLit.mjs off; exit $s
 *
 * It refuses to run unless the switch line is in the file exactly once, in the state it expects to leave,
 * so a renamed or moved switch stops the walk loudly, not a walk that quietly tests a dark build.
 * `status` prints the state and changes nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = path.join(ROOT, 'src/lib/clubManagerVarLive.ts');
const line = value => `export const CM_VAR_LIVE: boolean = ${value};`;

export function cmVarLiveState() {
  const source = fs.readFileSync(FILE, 'utf8');
  const on = source.split(line('true')).length - 1;
  const off = source.split(line('false')).length - 1;
  if (on + off !== 1) throw new Error(`cmVarLit: the switch line must be in src/lib/clubManagerVarLive.ts exactly once, found ${on + off}`);
  return on === 1 ? 'on' : 'off';
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const want = process.argv[2];
  const now = cmVarLiveState();
  if (want === 'status') {
    console.log(`cmVarLit: CM_VAR_LIVE is ${now}`);
  } else if (want === 'on' || want === 'off') {
    if (now === want) {
      console.log(`cmVarLit: CM_VAR_LIVE is already ${want}, nothing changed`);
    } else {
      const source = fs.readFileSync(FILE, 'utf8');
      fs.writeFileSync(FILE, source.replace(line(now === 'on' ? 'true' : 'false'), line(want === 'on' ? 'true' : 'false')));
      if (cmVarLiveState() !== want) throw new Error('cmVarLit: the switch did not move');
      console.log(`cmVarLit: CM_VAR_LIVE turned ${want} in this checkout. Never commit it on from here.`);
    }
  } else {
    console.error('cmVarLit: say on, off or status');
    process.exit(2);
  }
}
