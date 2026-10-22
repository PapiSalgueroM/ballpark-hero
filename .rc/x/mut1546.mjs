// Review mutations for Round 1546 (never committed). Usage: node .rc/x/mut1546.mjs <name>
// Applies one small plausible mutation to the checkout it runs in. Exits 7 when its
// anchor is missing, so a mutation that changes nothing can never read as a harness
// that missed it. The request line restores the tree with git checkout.
import fs from 'node:fs';

const M = {
  gate1: ['src/lib/fightCareer.ts', 'export const RETIRE_MIN_FIGHTS = 10;', 'export const RETIRE_MIN_FIGHTS = 1;'],
  gate5: ['src/lib/fightCareer.ts', 'export const RETIRE_MIN_FIGHTS = 10;', 'export const RETIRE_MIN_FIGHTS = 5;'],
  nolift: ['src/lib/fightCareer.ts',
    '  if (!storedOk && (stored !== undefined || top > 0)) book.nextFighterNo = Math.max(top + 1, FIRST_FIGHTER_NO);\n', ''],
  keyseed: ['src/lib/fightCareer.ts',
    'key: `${st.seed >>> 0}:${st.fightNo}:${f.wins}-${f.losses}-${f.draws}:${f.kos}:${st.earnings}`,',
    'key: `${st.seed >>> 0}`,'],
  keepevent: ['src/lib/fightCareerLifeFlow.ts', '  next.life.pendingRivalryEvent = null;\n  return next;', '  return next;'],
  prospectcopy: ['src/lib/fightGym.ts', '  next.prospects = prospectsFor(next);', '  next.prospects = prospectsFor({ ...next });'],
  poolcopy: ['src/lib/fightPromoter.ts', '  next.pool = refreshPool(next);', '  next.pool = refreshPool({ ...next });'],
  weightignored: ['src/lib/fightCareer.ts',
    '  if (f.weight !== undefined && WEIGHT_CLASSES.some(w => w.id === f.weight)) return f.weight;\n', ''],
  keepoffers: ['src/lib/fightCareer.ts', "    retiredBy: 'choice',\n    offers: [],\n", "    retiredBy: 'choice',\n"],
  drawid: ['src/lib/fightCareer.ts', '  return { id: id ?? drawnId(drawn), ...drawn };',
    '  const extra = rng();\n  return { id: id ?? `${drawnId(drawn)}${extra}`, ...drawn };'],
  chosenonly: ['src/lib/fightCareer.ts', '  if (!st.retired) return list;\n  const entry = pastFighterOf(st);',
    "  if (st.retiredBy !== 'choice') return list;\n  const entry = pastFighterOf(st);"],
};

const name = process.argv[2];
const m = M[name];
if (!m) { console.log(`MUTATION ${name} UNKNOWN`); process.exit(7); }
const [file, anchor, repl] = m;
const src = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const n = src.split(anchor).length - 1;
if (n !== 1) { console.log(`MUTATION ${name} ANCHOR FOUND ${n} TIMES in ${file}, NOT APPLIED`); process.exit(7); }
fs.writeFileSync(file, src.replace(anchor, repl));
console.log(`MUTATION ${name} APPLIED to ${file}`);
