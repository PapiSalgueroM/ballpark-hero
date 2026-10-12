// Round 1318 runner review: one mutation applied to a tree (never committed; sent as .rc/x/rvmut.mjs).
// Usage: node rvmut.mjs <ID> <root>. Each engine edit must match exactly once in the engine. The same text is also
// replaced in scripts/lib/careerAwardsNight1172.mjs (its inverse rows quote the engine), so the harnesses that train
// the round out of the engine still build their original arm, and a red is about behaviour, not a missing anchor.
import fs from 'node:fs';
import path from 'node:path';

const [ID, ROOT = '.'] = process.argv.slice(2);
const ENGINE = 'src/lib/soccerCareerEngine.ts', SAVE = 'src/lib/soccerCareerSave.ts', ROWS = 'scripts/lib/careerAwardsNight1172.mjs';
const M = {
  C1: { why: 'control: the save module refuses a junk pool again (PR234 shape)', file: SAVE, rows: false, edits: [[
    '  if (!record(value)) return false;\n',
    '  if (!record(value)) return false;\n  if (value.generatedBallonPool !== undefined && (!record(value.generatedBallonPool) || value.generatedBallonPool.version !== 1 || !Array.isArray(value.generatedBallonPool.entries))) return false;\n']] },
  C2: { why: 'control: calculateBallonDor trusts any saved pool', file: ENGINE, rows: false, edits: [[
    'const previousPool = isGeneratedBallonPool(state.generatedBallonPool, year - 1) ? state.generatedBallonPool : undefined;',
    'const previousPool = (state.generatedBallonPool ?? undefined) as GeneratedBallonPool | undefined;']] },
  C3: { why: 'control: correction 12 removed (a clashing saved rival stays and is skipped)', file: ENGINE, rows: false, edits: [[
    '    if (entry && usedNames.has(entry.name)) { entry.retiredYear = year; entry = undefined; }\n', '']] },
  X1: { why: 'probe control: one extra draw per generated call', file: ENGINE, rows: false, edits: [[
    '    const entryAge = rand(19, 28);\n', '    const entryAge = rand(19, 28); Math.random();\n']] },
  M1: { why: 'off by one: the strict read reads the pool against this year', file: ENGINE, rows: true, edits: [[
    'isGeneratedBallonPool(state.generatedBallonPool, year - 1)', 'isGeneratedBallonPool(state.generatedBallonPool, year)']] },
  M2: { why: 'stale constant: the reader refuses an entry age of 28 (the draw is 19 to 28)', file: ENGINE, rows: true, edits: [[
    'entry.entryAge < 19 || entry.entryAge > 28', 'entry.entryAge < 19 || entry.entryAge > 27']] },
  M3: { why: 'dropped update: the carried pool keeps its old year', file: ENGINE, rows: true, edits: [[
    '      ...previousPool, year,\n', '      ...previousPool,\n']] },
  M4: { why: 'swapped argument: a new face is named against this year only, not the whole pool', file: ENGINE, rows: true, edits: [[
    'generateContender(reserved, seed, entryAge)', 'generateContender(usedNames, seed, entryAge)']] },
  M5: { why: 'stale constant, consistent: rivals retire at 38 (copy and reader agree)', file: ENGINE, rows: true, edits: [
    ['entry.entryAge + year - entry.firstYear >= 37 ? entry.firstYear + 37 - entry.entryAge', 'entry.entryAge + year - entry.firstYear >= 38 ? entry.firstYear + 38 - entry.entryAge'],
    ['entry.entryAge + poolYear - entry.firstYear >= 37 || activeSlots.has(slot)', 'entry.entryAge + poolYear - entry.firstYear >= 38 || activeSlots.has(slot)'],
    ['entry.retiredYear > entry.firstYear + 37 - entry.entryAge) return false', 'entry.retiredYear > entry.firstYear + 38 - entry.entryAge) return false']] },
};
const m = M[ID];
if (!m) { console.log(`MUTATION ${ID} ABORTED: unknown id`); process.exit(2); }
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
let src = read(m.file), rows = read(ROWS), harness = read('scripts/simSoccerAwardGenerations.mjs'), rowHits = 0, harnessHits = 0;
for (const [from, to] of m.edits) {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.log(`MUTATION ${ID} ABORTED: anchor found ${n} times in ${m.file}: ${from.slice(0, 70)}`); process.exit(2); }
  src = src.replace(from, () => to);
  if (m.rows) {
    const esc = JSON.stringify(from).slice(1, -1), escTo = JSON.stringify(to).slice(1, -1);
    rowHits += rows.split(esc).length - 1; rows = rows.split(esc).join(escTo);
    harnessHits += harness.split(from).length - 1; harness = harness.split(from).join(to);
  }
}
fs.writeFileSync(path.join(ROOT, m.file), src);
if (m.rows) { fs.writeFileSync(path.join(ROOT, ROWS), rows); fs.writeFileSync(path.join(ROOT, 'scripts/simSoccerAwardGenerations.mjs'), harness); }
console.log(`MUTATION ${ID} APPLIED: ${m.why} (${m.file}; anchor rows rewritten ${rowHits}, harness anchors rewritten ${harnessHits})`);
