// Read only probe (critic's correction 3): every `from` of the inverse files, counted in the file it names on this head.
// usage (from the worktree): node .tmp-fx/probeAnchors.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = process.cwd();
const imp = rel => import(pathToFileURL(path.join(ROOT, rel)).href);
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\r\n').join('\n');
const rows = [];
const { SOCCER_TRAIN_PATCHES } = await imp('scripts/lib/soccerTrain1178.mjs');
for (const p of SOCCER_TRAIN_PATCHES) rows.push({ list: 'train1178', file: p.file, from: p.from });
const nextTen = await imp('scripts/lib/careerNextTenAttribution1197.mjs');
for (const p of nextTen.nextTenPatches(['wheel', 'opening', 'ground'])) rows.push({ list: 'nextTen1197', file: p.file, from: p.from });
const vet = await imp('scripts/lib/careerVeteranPay1262.mjs');
for (const p of vet.veteranPayPatches()) rows.push({ list: 'veteranPay1262', file: p.file, from: p.from });
let bad = 0;
for (const r of rows) {
  const n = fs.existsSync(path.join(ROOT, r.file)) ? read(r.file).split(r.from).length - 1 : -1;
  if (n !== 1) { bad++; console.log(`BAD count=${n} ${r.list} ${r.file} ${JSON.stringify(r.from.slice(0, 90))}`); }
}
// The two inverse files that export functions, not lists: run them on the real engine and let them throw.
const ENGINE = 'src/lib/soccerCareerEngine.ts';
for (const [rel, fn] of [['scripts/lib/careerDevelopmentAttribution1185.mjs', 'inverseCareerDevelopment'], ['scripts/lib/careerStoryRoleAttribution1190.mjs', 'inverseCareerStoryRole']]) {
  try { const m = await imp(rel); const out = m[fn](read(ENGINE), []); console.log(`${fn}: applies to the engine (${out === read(ENGINE) ? 'NO CHANGE' : 'changed'})`); }
  catch (e) { bad++; console.log(`BAD ${fn}: ${String(e.message).slice(0, 200)}`); }
}
console.log(`anchors: ${rows.length} listed, ${bad} bad`);
process.exit(bad ? 1 : 0);
