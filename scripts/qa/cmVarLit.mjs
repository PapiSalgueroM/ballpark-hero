/* Release AT: VAR ships dark (src/lib/clubManagerVarLive.ts, CM_VAR_LIVE = false).
 *
 * The browser walk scripts/playCmVar.mjs drives the real page and expects the page to ask the engine for
 * reviews, so it can only run against a build made with the switch on. This script turns the switch on or
 * off IN A SCRATCH CHECKOUT (a CI runner), never in a tree somebody commits from:
 *
 *   node scripts/qa/cmVarLit.mjs on goal && node_modules/.bin/vite build && node scripts/playCmVar.mjs; s=$?;
 *   node scripts/qa/cmVarLit.mjs off; exit $s
 *
 * Round 1303: the KIND of review is data too (CM_VAR_KINDS in the generated src/data/clubManagerVarRates.ts),
 * and while the rates ledger holds a kind the generated list leaves it out, so the switch alone lights nothing.
 * `on` therefore takes the kinds to stage: `on goal` is the game with the goal kind alone (what a ruling on owed
 * goals-level would light), `on all` stages every kind the engine plays (the whole walk, penalties by review
 * included), and a bare `on` turns the switch only and leaves the list as the ledger has it. `off` puts the
 * switch back and writes the list the ledgers give (scripts/genCmVarRates.mjs), so the tree is as committed.
 *
 * It refuses to run unless the switch line and the kinds line are each in their file exactly once, so a renamed
 * or moved switch stops the walk loudly, not a walk that quietly tests a dark build.
 * `status` prints the state and changes nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = path.join(ROOT, 'src/lib/clubManagerVarLive.ts');
const RATES = path.join(ROOT, 'src/data/clubManagerVarRates.ts');
const line = value => `export const CM_VAR_LIVE: boolean = ${value};`;
const ALL_KINDS = ['goal', 'penalty'];
const KINDS_LINE = /^export const CM_VAR_KINDS: readonly \('goal' \| 'penalty'\)\[\] = \[([^\]]*)\];$/m;
const kindsLine = kinds => `export const CM_VAR_KINDS: readonly ('goal' | 'penalty')[] = [${kinds.map(k => `'${k}'`).join(', ')}];`;

export function cmVarLiveState() {
  const source = fs.readFileSync(FILE, 'utf8');
  const on = source.split(line('true')).length - 1;
  const off = source.split(line('false')).length - 1;
  if (on + off !== 1) throw new Error(`cmVarLit: the switch line must be in src/lib/clubManagerVarLive.ts exactly once, found ${on + off}`);
  return on === 1 ? 'on' : 'off';
}

/** The kinds of review the checkout's generated list hands the game, as it stands on disk. */
export function cmVarStagedKinds() {
  const source = fs.readFileSync(RATES, 'utf8');
  if (source.split('export const CM_VAR_KINDS').length - 1 !== 1) throw new Error('cmVarLit: the CM_VAR_KINDS line must be in src/data/clubManagerVarRates.ts exactly once');
  const found = KINDS_LINE.exec(source);
  if (!found) throw new Error('cmVarLit: the CM_VAR_KINDS line of src/data/clubManagerVarRates.ts does not read as a list of kinds');
  return [...found[1].matchAll(/'([a-z]+)'/g)].map(m => m[1]);
}
function stageKinds(kinds) {
  cmVarStagedKinds();
  const source = fs.readFileSync(RATES, 'utf8');
  fs.writeFileSync(RATES, source.replace(KINDS_LINE, kindsLine(kinds)));
  if (JSON.stringify(cmVarStagedKinds()) !== JSON.stringify(kinds)) throw new Error('cmVarLit: the kinds line did not move');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const want = process.argv[2], kindArg = process.argv[3];
  const now = cmVarLiveState();
  if (want === 'status') {
    console.log(`cmVarLit: CM_VAR_LIVE is ${now}, the game is handed ${cmVarStagedKinds().join(' and ') || 'no kind of review'}`);
  } else if (want === 'on' || want === 'off') {
    if (kindArg !== undefined && !(want === 'on' && [...ALL_KINDS, 'all'].includes(kindArg))) { console.error('cmVarLit: after on, say goal, penalty or all (or nothing, to leave the kinds as the ledger has them)'); process.exit(2); }
    if (now === want) {
      console.log(`cmVarLit: CM_VAR_LIVE is already ${want}`);
    } else {
      const source = fs.readFileSync(FILE, 'utf8');
      fs.writeFileSync(FILE, source.replace(line(now === 'on' ? 'true' : 'false'), line(want === 'on' ? 'true' : 'false')));
      if (cmVarLiveState() !== want) throw new Error('cmVarLit: the switch did not move');
      console.log(`cmVarLit: CM_VAR_LIVE turned ${want} in this checkout. Never commit it on from here.`);
    }
    if (want === 'on' && kindArg) {
      stageKinds(kindArg === 'all' ? ALL_KINDS : [kindArg]);
      console.log(`cmVarLit: the game is handed ${cmVarStagedKinds().join(' and ')} in this checkout. Never commit that list from here: the ledger writes it.`);
    }
    if (want === 'off') {
      /* The list the ledgers give, through the generator's own arithmetic, so the tree is as committed. */
      const { derive } = await import('../genCmVarRates.mjs');
      const played = derive().played;
      if (JSON.stringify(cmVarStagedKinds()) !== JSON.stringify(played)) { stageKinds(played); console.log(`cmVarLit: the kinds list is the ledger's again (${played.join(' and ') || 'no kind'}).`); }
    }
  } else {
    console.error('cmVarLit: say on [goal|penalty|all], off or status');
    process.exit(2);
  }
}
