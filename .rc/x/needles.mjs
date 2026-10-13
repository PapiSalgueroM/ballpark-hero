// Round 1319 probe: every control needle of simCareerPreDraft.mjs and the engine needles of
// simUsCareerProspect.mjs occurs EXACTLY ONCE in its file (CRLF folded). Never committed.
import fs from 'node:fs';
const read = f => fs.readFileSync(f, 'utf-8').replace(/\r\n/g, '\n');
const h = read('scripts/simCareerPreDraft.mjs');
const start = h.indexOf('const CONTROLS = {');
const end = h.indexOf('\n};', start);
const CONTROLS = Function(`return ${h.slice(start + 'const CONTROLS = '.length, end + 2)}`)();
let bad = 0;
const count = (src, needle) => src.split(needle).length - 1;
for (const [name, [file, needle]] of Object.entries(CONTROLS)) {
  const n = count(read(file), needle);
  if (n !== 1) { bad += 1; console.log(`simCareerPreDraft ${name}: ${n} in ${file}`); }
}
const p = read('scripts/simUsCareerProspect.mjs');
const ENGINE = read('src/lib/careerPreDraft.ts');
for (const needle of ['s.stock += e.stock ?? 0;', 'if (!card || !option || !Number.isInteger(optionIndex)) return prev;',
  'const move = preDraftShowcaseMove(s.stock, SHOWCASE_DELTAS[approach][grade]);\n    s.stock += move;', "if (s.phase === 'done' && s.draft) {"]) {
  if (!p.includes(needle.split('\n')[0])) { bad += 1; console.log(`not in simUsCareerProspect: ${needle}`); }
  const n = count(ENGINE, needle);
  if (n !== 1) { bad += 1; console.log(`prospect needle ${JSON.stringify(needle)}: ${n} in the engine`); }
}
console.log(`needles: ${Object.keys(CONTROLS).length} controls checked, ${bad} not exactly once`);
process.exit(bad ? 1 : 0);
