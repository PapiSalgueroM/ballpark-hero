// Review probe for Round 1522: does the report's "Conceded on the break" or "Goals from wide" count goals the same
// report's timeline marks as a penalty, a direct free kick or an own goal? Counts matches where EVERY goal of a side
// is one of those and the tactics block still credits one of them to the break or to wide play.
import '../../scripts/lib/offlineTransport.cjs';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-sp-'));
const entry = path.join(work, 'entry.ts');
const at = f => JSON.stringify(path.join(ROOT, `src/lib/${f}.ts`).split(path.sep).join('/'));
fs.writeFileSync(entry, `export * as cm from ${at('clubManager')};\nexport * as tac from ${at('clubManagerTactics')};\n`);
const out = path.join(work, 'bundle.cjs');
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
  alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')],
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
Date.now = () => 1791547200000;
const req = createRequire(import.meta.url);
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const special = e => !!(e.penalty || e.freeKick || e.og);
let matches = 0, oppSet = 0, oppSetBreak = 0, mySet = 0, mySetWide = 0, setGoalsOpp = 0, allGoalsOpp = 0, example = null;
for (const club of ['Brentford', 'Arsenal', 'Hull City', 'Torino', 'Real Madrid', 'Malaga']) for (let seed = 0; seed < 4; seed++) {
  delete req.cache[req.resolve(out)];
  store.clear();
  const { cm } = req(out);
  const real = Math.random;
  Math.random = seeded(seed * 7919 + club.length);
  try {
    let s = cm.startCareer(club);
    s = { ...s, startOptions: { ...(s.startOptions ?? {}), noSack: 1 } };
    s = cm.setInstructions(s, { press: 1, tempo: 0, width: 1, line: 1 }) ?? s;
    for (let g = 0; g < 160; g++) {
      const r = cm.playNextEntry(s, { skipHalftime: true });
      s = r.state;
      const d = r.report?.detail;
      if (r.kind === 'match' && d?.tactics) {
        matches += 1;
        const goals = d.timeline.filter(e => e.kind === 'goal');
        const opp = goals.filter(e => e.side === 'opp'), mine = goals.filter(e => e.side === 'me');
        allGoalsOpp += opp.length; setGoalsOpp += opp.filter(special).length;
        if (opp.length && opp.every(special)) { oppSet += 1; if (d.tactics.stats.breakConceded > 0) { oppSetBreak += 1; example ??= { club, week: s.week, opp: opp.map(e => ({ m: e.minute, pen: !!e.penalty, fk: !!e.freeKick, og: !!e.og })), stats: d.tactics.stats }; } }
        if (mine.length && mine.every(special)) { mySet += 1; if (d.tactics.stats.wideGoals > 0) mySetWide += 1; }
      }
      if (r.kind === 'seasonOver') break;
    }
  } finally { Math.random = real; }
}
console.log(`matches with a tactics block: ${matches}; their goals ${allGoalsOpp}, of which penalty, free kick or own goal ${setGoalsOpp}`);
console.log(`matches where every goal against was a penalty, free kick or own goal: ${oppSet}; of those the block still says some came on the break: ${oppSetBreak}`);
console.log(`matches where every goal of mine was a penalty, free kick or own goal: ${mySet}; of those the block still says some came from wide: ${mySetWide}`);
if (example) console.log(`example: ${JSON.stringify(example)}`);
console.log(`setpiece probe: done (${oppSetBreak + mySetWide} contradicted reports in ${matches})`);
