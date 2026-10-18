// Round 1509 attribution for harnesses that compare this tree with main (never committed). Patches a throwaway
// checkout of HEAD:
//   off     the round's four opens of the followed Europa League taken out (the same four edits as simWorldEuro's
//           section 2 arm UEL_OFF: the start, the rollover, the job move's carry, the load repair)
//   holder  the Europa League holder line reverted (scripts/lib/worldUelHolder1509.mjs)
//   board   the European rung line reverted (same file)
// Usage: node offAttr.mjs <tree> off[,holder[,board]]. Every edit fails closed: its anchor must stand exactly once.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [tree, modeArg] = process.argv.slice(2);
const modes = new Set((modeArg || '').split(',').filter(Boolean));
const CM = 'src/lib/clubManager.ts';
const CAL = 'src/lib/clubManagerCalendar.ts';
const UEL_OFF = [
  { file: CM, from: "    openWorldComp(state, 'uel', worldCompField(state, 'uel', null), null);\n", to: '' },
  { file: CM, from: "    openWorldComp(state, 'uel', worldCompField(state, 'uel', tables, null, watchCup), null);\n", to: "    setWorldComp(state, 'uel', null);\n" },
  { file: CAL, from: "  carryWorldComp(career, joined, 'uel');\n", to: '' },
  { file: CM, from: "    repairWorldComp(parsed, 'uel');\n", to: '' },
];
const lib = await import(pathToFileURL(path.join(tree, 'scripts/lib/worldUelHolder1509.mjs')).href);
const edits = [];
if (modes.has('off')) edits.push(...UEL_OFF);
if (modes.has('holder')) edits.push(lib.UEL_HOLDER_EDIT);
if (modes.has('board')) edits.push(lib.EURO_BOARD_EDIT);
const texts = new Map();
for (const e of edits) {
  const f = path.join(tree, e.file);
  const src = texts.get(f) ?? fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
  const n = src.split(e.from).length - 1;
  if (n !== 1) { console.error(`offAttr: an anchor of ${e.file} stands ${n} times: ${JSON.stringify(e.from.slice(0, 80))}`); process.exit(2); }
  texts.set(f, src.replace(e.from, e.to));
}
for (const [f, t] of texts) fs.writeFileSync(f, t);
console.log(`offAttr: ${tree} patched with ${[...modes].join(', ') || 'nothing'} (${edits.length} edits)`);
