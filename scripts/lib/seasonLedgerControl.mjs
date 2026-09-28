/* Round 647: the negative controls for the season ledger, shared by
   scripts/simSeasonLedger.mjs (the six boards under vitest, and the module
   headless) and scripts/simCfbDynasty.mjs (the two college engines headless).

   Each control writes a copy of src/lib/seasonLedger.ts with one rule put
   back the way the audit found it, and refuses to run if the anchor it
   rewrites is not in the file, because a control that changed nothing is
   green for the wrong reason.

     double  appendSeason pushes a title season's row twice and no longer
             refuses a season already in the ledger: the 2026-09-19 audit's
             "the whole history again on every title", in ledger form.
     pick    scoreSeason adds a term read from the team's own name, so two
             teams with the same results score differently: "score on which
             team was picked".

   The copy imports nothing (the module is pure), so it loads from any
   folder. vitest reaches it through SEASON_LEDGER_MODULE (vitest.config.ts
   aliases @/lib/seasonLedger to it); a harness bundling the module headless
   imports the returned path directly. */
import fs from 'node:fs';
import path from 'node:path';

export const LEDGER_CONTROLS = ['double', 'pick'];

const DOUBLE_ANCHOR =
  "  if (ledger.some(x => x.season === r.season)) return { ledger, row: null };\n" +
  "  const row: SeasonRow = { ...r, score: scoreSeason(r) };\n" +
  "  return { ledger: [...ledger, row], row };\n";
const DOUBLE_BROKEN =
  "  const row: SeasonRow = { ...r, score: scoreSeason(r) };\n" +
  "  return { ledger: r.wonTitle ? [...ledger, row, row] : [...ledger, row], row };\n";

const PICK_ANCHOR =
  "  const playoffs = PLAYOFF_POINTS[playoffLevel(r)];\n" +
  "  return int(form + playoffs, 0, SEASON_CEILING);\n";
const PICK_BROKEN =
  "  const playoffs = PLAYOFF_POINTS[playoffLevel(r)];\n" +
  "  const pick = String(r.team).split('').reduce((n, ch) => n + ch.charCodeAt(0), 0) % 7;\n" +
  "  return int(form + playoffs + pick, 0, SEASON_CEILING);\n";

/**
 * Write the control copy into `dir` and return its absolute path. Throws
 * when the control is unknown or the module is not in the shape the control
 * rewrites.
 */
export function writeLedgerControl(root, control, dir) {
  if (!LEDGER_CONTROLS.includes(control)) throw new Error(`${control} is not a season ledger control (${LEDGER_CONTROLS.join(', ')})`);
  const file = path.join(root, 'src', 'lib', 'seasonLedger.ts');
  /* Normalised on read: the anchors end lines with \n, which a CRLF checkout never matches. */
  const src = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
  const [anchor, broken] = control === 'double' ? [DOUBLE_ANCHOR, DOUBLE_BROKEN] : [PICK_ANCHOR, PICK_BROKEN];
  if (!src.includes(anchor)) throw new Error(`control "${control}" cannot run: src/lib/seasonLedger.ts is not in the shape this control rewrites`);
  const regressed = src.replace(anchor, broken);
  if (regressed === src) throw new Error(`control "${control}" cannot run: the rewrite changed nothing`);
  if (/from '\.\.?\//.test(regressed) || /from '@\//.test(regressed)) throw new Error('control cannot run: seasonLedger.ts grew an import, and a copy in another folder cannot resolve it');
  fs.mkdirSync(dir, { recursive: true });
  const copy = path.join(dir, `seasonLedger.${control}.control.ts`);
  fs.writeFileSync(copy, regressed);
  return copy;
}
