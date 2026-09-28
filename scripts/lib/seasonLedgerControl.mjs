/* Round 647: the negative controls for the season ledger, shared by
   scripts/simGmReload.mjs (the four front office boards under vitest),
   scripts/simCfbDynasty.mjs (the two dynasty boards under vitest, and the
   two college engines headless) and scripts/simSeasonLedger.mjs (all six
   engines headless).

   Each control writes a copy of src/lib/seasonLedger.ts with one rule put
   back the way a real version of it was, and refuses to run unless the
   anchor it rewrites is in the file EXACTLY ONCE and the rewrite changed
   the text, because a control that changed nothing, or changed the wrong
   one of two matches, is green for the wrong reason.

     double  appendSeason pushes a title season's row twice and no longer
             refuses a season already in the ledger: the 2026-09-19 audit's
             "the whole history again on every title", in ledger form.
     raw     scoreSeason reads the results and not the projection: the
             first version of this round, form plus ladder, which the review
             measured tracking the pick at 0.70 to 0.90.
     median  the bar sits at the projection's middle season instead of past
             its best: a season that does what its roster does pays, which
             is the second version's par of 50 in the fix's units.
     value   scoreSeason divides the value past the bar by the value left
             above it, instead of counting the projected seasons beaten: the
             headroom in points, which pays a favourite's lucky season a big
             share of a small headroom.
     flat    scoreSeason pays a small constant whatever happened: a score
             that no pick can move and no manager can either.
     wins    stageOf counts games won rather than the round reached: the
             first version's ladder, which paid a bye seed out in its first
             game less than a lower seed out in the same round.

   The copy imports nothing (the module is pure), so it loads from any
   folder. vitest reaches it through SEASON_LEDGER_MODULE (vitest.config.ts
   aliases @/lib/seasonLedger to it); a harness bundling the module headless
   imports the returned path directly. */
import fs from 'node:fs';
import path from 'node:path';

export const LEDGER_CONTROLS = ['double', 'raw', 'median', 'value', 'flat', 'wins'];

const APPEND_ANCHOR =
  "  if (ledger.some(x => x.season === r.season)) return { ledger, row: null };\n" +
  "  const row: SeasonRow = {\n";
const APPEND_TAIL = "  return { ledger: [...ledger, row], row };\n";
const SCORE_ANCHOR =
  "  const v = round4(value);\n" +
  "  if (v < top[0]) return 0;\n";
const BAR_ANCHOR = "export const BAR_SHARE = 0.95;\n";
const STAGE_ANCHOR =
  "  let stage = 0;\n" +
  "  for (const g of games) {\n" +
  "    if (g.home !== team && g.away !== team) continue;\n" +
  "    const r = roundOf(g.name);\n" +
  "    if (r > stage) stage = r;\n" +
  "  }\n" +
  "  return Math.min(stage, rounds);\n";

const REWRITES = {
  double: [[APPEND_ANCHOR, "  const row: SeasonRow = {\n"],
    [APPEND_TAIL, "  return { ledger: r.stage > r.rounds ? [...ledger, row, row] : [...ledger, row], row };\n"]],
  raw: [SCORE_ANCHOR, "  const v = round4(value);\n  return int(v, 0, SEASON_CEILING);\n"],
  median: [BAR_ANCHOR, "export const BAR_SHARE = 0.5;\n"],
  value: [SCORE_ANCHOR, "  const v = round4(value);\n  if (!(v > top[0])) return 0;\n  return int(SEASON_CEILING * (v - top[0]) / (SEASON_CEILING - top[0]), 0, SEASON_CEILING);\n"],
  flat: [SCORE_ANCHOR, "  const v = round4(value);\n  return v >= 0 ? 2 : 0;\n"],
  wins: [STAGE_ANCHOR,
    "  let stage = 0;\n" +
    "  for (const g of games) {\n" +
    "    if (g.home !== team && g.away !== team) continue;\n" +
    "    if (roundOf(g.name) < 1) continue;\n" +
    "    if (stage === 0) stage = 1;\n" +
    "    if (g.winner === team) stage += 1;\n" +
    "  }\n" +
    "  return Math.min(stage, rounds);\n"],
};

export const LEDGER_CONTROL_WORDS = {
  double: 'pushes a title season twice and refuses nothing',
  raw: 'scores the results and not the projection',
  median: 'puts the bar at the projection\'s middle season',
  value: 'pays the points past the bar over the points above it',
  flat: 'pays a small constant whatever happened',
  wins: 'reads the ladder by games won, not the round reached',
};

/**
 * Write the control copy into `dir` and return its absolute path. Throws
 * when the control is unknown, the anchor is not in the module exactly
 * once, or the rewrite changed nothing.
 */
export function writeLedgerControl(root, control, dir) {
  if (!LEDGER_CONTROLS.includes(control)) throw new Error(`${control} is not a season ledger control (${LEDGER_CONTROLS.join(', ')})`);
  const file = path.join(root, 'src', 'lib', 'seasonLedger.ts');
  /* Normalised on read: the anchors end lines with \n, which a CRLF checkout never matches. */
  const src = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
  /* One [anchor, rewrite] pair, or a list of them; every anchor exactly once. */
  const pairs = Array.isArray(REWRITES[control][0]) ? REWRITES[control] : [REWRITES[control]];
  let regressed = src;
  for (const [anchor, broken] of pairs) {
    const found = regressed.split(anchor).length - 1;
    if (found !== 1) throw new Error(`control "${control}" cannot run: its anchor is in src/lib/seasonLedger.ts ${found} times, not exactly once`);
    const next = regressed.replace(anchor, broken);
    if (next === regressed || (!broken.includes(anchor) && next.includes(anchor))) throw new Error(`control "${control}" cannot run: the rewrite changed nothing`);
    regressed = next;
  }
  if (regressed === src) throw new Error(`control "${control}" cannot run: the rewrite changed nothing`);
  if (/from '\.\.?\//.test(regressed) || /from '@\//.test(regressed)) throw new Error('control cannot run: seasonLedger.ts grew an import, and a copy in another folder cannot resolve it');
  fs.mkdirSync(dir, { recursive: true });
  const copy = path.join(dir, `seasonLedger.${control}.control.ts`);
  fs.writeFileSync(copy, regressed);
  return copy;
}
