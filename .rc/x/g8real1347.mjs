// Round 1347 review (run lens): drawG8 on the FOUR REAL era fields (ERA_UCL_FIELDS, their real associations),
// with the game's pots stood in by 400 keyed strength draws an era, with and without a holder. Measures what the
// unit file's crafted fields cannot: how often a real field is drawn with a clash, how long a draw takes, and
// whether every draw is legal. Exit 0 every draw legal, 1 an illegal draw, 2 could not run.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'g8real-'));
const out = path.join(work, 'b.mjs');
try {
  await build({ stdin: { contents: "export * as w from './src/lib/worldCompetition';\nexport { ERA_UCL_FIELDS } from './src/lib/clubManager';\nexport { keyedRng } from './src/lib/keyedRng';\n", resolveDir: ROOT, sourcefile: 'g8real.ts', loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', target: 'node20', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
} catch (e) { console.log(`g8real1347: cannot run: ${e.message}`); process.exit(2); }
const { w, ERA_UCL_FIELDS, keyedRng } = await import(pathToFileURL(out).href);
let illegal = 0;
for (const [eraId, year] of [['era2005', 2005], ['era2010', 2010], ['era2015', 2015], ['era2020', 2020]]) {
  const fieldRows = ERA_UCL_FIELDS[eraId];
  const rules = w.g8DrawRules(year);
  const clashHist = {}; let nulls = 0; let maxMs = 0; let total = 0;
  for (let seed = 1; seed <= 400; seed += 1) {
    const r = keyedRng(`str|${eraId}|${seed}`);
    const entrants = fieldRows.map(e => ({ club: e.name, str: Math.round((62 + r() * 28) * 10) / 10, assoc: e.country }));
    const holder = seed % 2 ? fieldRows[seed % fieldRows.length].name : undefined;
    const t0 = performance.now();
    const d = w.drawG8(entrants, seed, holder, rules);
    const ms = performance.now() - t0; maxMs = Math.max(maxMs, ms); total += ms;
    if (!d) { nulls += 1; continue; }
    clashHist[d.clashes] = (clashHist[d.clashes] ?? 0) + 1;
    const assoc = new Map(entrants.map(e => [e.club, e.assoc]));
    const order = [...entrants].sort((a, b) => Number(b.club === holder) - Number(a.club === holder) || b.str - a.str || (a.club < b.club ? -1 : a.club > b.club ? 1 : 0));
    const pot = new Map(order.map((e, i) => [e.club, Math.floor(i / 8)]));
    let counted = 0; let bad = '';
    for (let g = 0; g < 8; g += 1) {
      const grp = d.clubs.slice(g * 4, g * 4 + 4);
      if (grp.map(c => pot.get(c)).join(',') !== '0,1,2,3') bad = `group ${g} pots ${grp.map(c => pot.get(c)).join(',')}`;
      for (let i = 0; i < 4; i += 1) for (let j = i + 1; j < 4; j += 1) {
        const x = assoc.get(grp[i]); const y = assoc.get(grp[j]);
        if ((rules.assocApart && x === y) || rules.bans.some(([p, q]) => (p === x && q === y) || (p === y && q === x))) counted += 1;
      }
    }
    if (counted !== d.clashes) bad ||= `clashes reported ${d.clashes}, counted ${counted}`;
    if (new Set(d.clubs).size !== 32) bad ||= 'not 32 different clubs';
    if (bad) { illegal += 1; if (illegal < 6) console.log(`  ILLEGAL ${eraId} seed ${seed}: ${bad}`); }
  }
  const assocCount = {}; for (const e of fieldRows) assocCount[e.country] = (assocCount[e.country] ?? 0) + 1;
  const big = Object.entries(assocCount).filter(([, n]) => n >= 3).map(([c, n]) => `${c} ${n}`).join(', ');
  console.log(`  ${eraId}: ${fieldRows.length} clubs (${big}); bans ${JSON.stringify(rules.bans)}; clashes ${JSON.stringify(clashHist)}; null ${nulls}; mean ${(total / 400).toFixed(2)} ms, slowest ${maxMs.toFixed(1)} ms`);
}
console.log(`g8real1347: ${illegal === 0 ? 'every draw legal' : `${illegal} ILLEGAL draws`}`);
process.exit(illegal === 0 ? 0 : 1);
