/* The adversarial review's M3 and M4 on Round 674, as negative controls for
   the six season boards' engine rows. Shared by scripts/simGmReload.mjs (the
   four front offices) and scripts/simCfbDynasty.mjs (the two dynasties, on
   the boards and headless).

   The engine rows compare a closed season's ledger row with what the engine
   kept. The first version compared the round with stageOf, the function the
   boards build the row with, and played one season per board: CFB's was a
   12-0 title, NFL's missed the playoffs, MLB's went out in round one. So
   neither of these regressions turned a row red:

     stageplus  (M3) stageOf pays every playoff team that did not win the
                title one round more than it reached: a season lost in round
                r is recorded, and paid, as round r + 1.
     regwins    (M4) cfbRegularRecord counts the losses as wins: a 7-5 season
                is recorded 12-0.

   Each writes a copy of the one module into `dir` and returns its path,
   refusing to run unless its anchor is in the file exactly once, as text and
   as code with the comments stripped, and the rewrite changed the text.
   These live here and not in scripts/lib/seasonLedgerControl.mjs because
   that file's LEDGER_CONTROLS list is every control scripts/simSeasonLedger.mjs
   runs headless, and M3 is a claim about the boards' rows, which that harness
   does not read. */
import fs from 'node:fs';
import path from 'node:path';
import { stripComments } from './readSource.mjs';

const REWRITES = {
  stageplus: {
    file: 'src/lib/seasonLedger.ts',
    anchor: '  return Math.min(stage, rounds);\n',
    to: '  return stage > 0 ? Math.min(stage, rounds) + 1 : 0;\n',
    words: 'reads every playoff team that did not win the title one round further than it reached',
  },
  regwins: {
    file: 'src/lib/cfbDynasty.ts',
    anchor: '  return { wins, games: wins + losses };\n',
    to: '  return { wins: wins + losses, games: wins + losses };\n',
    words: 'counts every regular season loss as a win, so a 7-5 season is recorded 12-0',
  },
};

export const ENGINE_ROW_CONTROLS = Object.keys(REWRITES);
export const engineRowControlWords = name => REWRITES[name].words;
export const engineRowControlFile = name => REWRITES[name].file;

export function writeEngineRowControl(root, name, dir) {
  const c = REWRITES[name];
  if (!c) throw new Error(`${name} is not an engine row control (${ENGINE_ROW_CONTROLS.join(', ')})`);
  const src = fs.readFileSync(path.join(root, c.file), 'utf8').split('\r\n').join('\n');
  const count = (hay, needle) => hay.split(needle).length - 1;
  if (count(src, c.anchor) !== 1) throw new Error(`control "${name}" cannot run: ${c.file} holds its anchor ${count(src, c.anchor)} times, not exactly once`);
  if (count(stripComments(src), c.anchor) !== 1) throw new Error(`control "${name}" cannot run: the anchor in ${c.file} is not in its code exactly once`);
  /* A copy in another folder cannot resolve ./sibling: point it at @/lib,
     which vitest's alias and the bundles' esbuild alias both resolve. */
  const copy = src.replace(c.anchor, c.to).replace(/from '\.\/([^']+)'/g, (_, rel) => `from '@/lib/${rel}'`);
  if (copy === src || copy.includes(c.anchor)) throw new Error(`control "${name}" cannot run: the rewrite changed nothing`);
  if (/from '\.\.?\//.test(copy)) throw new Error(`control "${name}" cannot run: ${c.file} has a relative import the copy cannot point back at src`);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${path.basename(c.file, '.ts')}.${name}.control.ts`);
  fs.writeFileSync(out, copy);
  return out;
}
