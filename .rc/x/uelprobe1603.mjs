/* Reviewer probe for Round 1603 on a tree merged with Round 1593 (runner only, never committed): does a Europa
   League deciding second leg get judged by the tie through the one judgedByTie, with no second copy?
   Run from the merged tree's root. Two engines from it: HEAD, and OLD (judgedByTie forced false). Clubs that earn a
   Europa League place play two seasons on HEAD; every season two Europa League second leg (tie.leg 2, through set)
   is replayed from its pre match save on fresh HEAD and OLD instances with the same dice:
     record  the night (log score and res, form, totals) is the same on both;
     tie     HEAD logs `tie` exactly where night and tie differ, OLD never;
     react   where they differ the board and the squad's morale move the tie's way against OLD; where they agree
             board and morale are OLD's.
   Exit 0 green, 1 red, 2 could not run (no Europa League deciding leg met). */
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const JUDGE = "  return state.matchRules !== 'base' && state.tieRules !== 'night' && tie?.leg === 2 && typeof tie.through === 'boolean';";
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'uelprobe-'));
async function bundle(name, patch) {
  const entry = path.join(work, `${name}.entry.ts`);
  fs.writeFileSync(entry, `export * as cm from ${JSON.stringify(path.join(ROOT, 'src/lib/clubManager.ts'))};\n`);
  const out = path.join(work, `${name}.cjs`);
  let used = false;
  const plugin = { name: 'p', setup(b) { if (!patch) return; b.onLoad({ filter: /clubManager\.ts$/ }, async a => {
    if (!a.path.split(path.sep).join('/').endsWith('/src/lib/clubManager.ts')) return undefined;
    let src = (await fs.promises.readFile(a.path, 'utf8')).split('\r\n').join('\n');
    if (src.split(JUDGE).length !== 2) { console.log('uelprobe could not run: JUDGE line not found once'); process.exit(2); }
    used = true; return { contents: src.replace(JUDGE, () => '  return false;'), loader: 'ts' }; }); } };
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') }, plugins: [plugin] });
  if (patch && !used) { console.log('uelprobe could not run: patch unused'); process.exit(2); }
  return out;
}
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear(), key: () => null, get length() { return store.size; } };
Date.now = () => 1793000000000;
const req = createRequire(import.meta.url);
let copies = 0;
async function fresh(file) {
  const copy = file.replace(/\.cjs$/, `.${copies++}.cjs`);
  fs.copyFileSync(file, copy); const m = req(copy); delete req.cache[req.resolve(copy)]; fs.unlinkSync(copy);
  await m.cm.ensureAllEraRosters(); return m;
}
const headFile = await bundle('head', false);
const oldFile = await bundle('old', true);
function keyOf(...parts) { let h = 2166136261 >>> 0; for (const ch of parts.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function withStream(seed, fn) {
  let a = seed | 0; const prev = Math.random;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = prev; }
}
const J = v => JSON.stringify(v);
const OPTS = { skipHalftime: true, noCoach: true };
const step = (m, s, seed) => withStream(seed, () => m.cm.playNextEntry(structuredClone(s), OPTS));
const moraleGap = (a, b) => { const was = new Map(b.squad.map(p => [p.id, p.morale])); const d = a.squad.filter(p => was.has(p.id)).map(p => p.morale - was.get(p.id)); return d.length ? d.reduce((x, y) => x + y, 0) / d.length : 0; };
const recordOf = r => J([(r.state.resultLog ?? []).map(e => { const { tie, ...rest } = e; return rest; }), r.state.form, r.state.careerStats, r.report.won, r.report.drawn, r.report.homeGoals, r.report.awayGoals, r.report.tie]);

const FLEET = (process.env.UEL_FLEET || 'Aston Villa,Lazio,Lyon,Real Sociedad,Eintracht Frankfurt,Braga,Rangers,AZ Alkmaar,Real Betis').split(',');
const SEEDS = (process.env.UEL_SEEDS || '1,2').split(',').map(Number);
const bad = { record: [], tie: [], agree: [], react: [] };
const n = { participants: 0, uelNights: 0, legs: 0, differ: 0 };
for (const club of FLEET) for (const sd of SEEDS) {
  const tag = `${club} seed ${sd}`;
  const W = await fresh(headFile);
  let s = withStream(keyOf(tag, 'start'), () => W.cm.startCareer(club, 'now'));
  let k = 0, over = false;
  for (let i = 0; i < 300 && !over; i++) { const r = step(W, s, keyOf(tag, k++)); s = r.state; over = r.kind === 'seasonOver'; }
  if (!over) { console.log(`  ${tag}: season one did not end`); continue; }
  s = withStream(keyOf(tag, 'finish'), () => W.cm.finishSeason(s).state);
  s = withStream(keyOf(tag, 'roll'), () => W.cm.startNextSeason(s));
  const plays = (s.calendar ?? []).some(e => e.type === 'uel');
  if (plays) n.participants += 1;
  let legsHere = 0;
  over = false;
  for (let i = 0; i < 300 && !over && plays; i++) {
    const e = s.calendar?.[s.week];
    const seed = keyOf(tag, 's2', k++);
    const pre = e?.type === 'uel' ? structuredClone(s) : null;
    const r = step(W, s, seed);
    if (pre) n.uelNights += 1;
    const t = r.report?.tie;
    if (pre && t && t.leg === 2 && typeof t.through === 'boolean') {
      legsHere += 1; n.legs += 1;
      const H = await fresh(headFile), O = await fresh(oldFile);
      const rH = step(H, pre, seed), rO = step(O, pre, seed);
      const night = rH.report.won ? 'W' : rH.report.drawn ? 'D' : 'L', tie = rH.report.tie.through ? 'W' : 'L';
      const where = `${tag} week ${pre.week} night ${night} tie ${tie} (${rH.report.decidedBy})`;
      if (recordOf(rH) !== recordOf(rO)) bad.record.push(where);
      const lastH = rH.state.resultLog.at(-1), lastO = rO.state.resultLog.at(-1);
      if ('tie' in lastO || (night !== tie ? lastH.tie !== tie : 'tie' in lastH)) bad.tie.push(`${where}: HEAD ${lastH.tie ?? '-'} OLD ${lastO.tie ?? '-'}`);
      const dB = rH.state.boardConfidence - rO.state.boardConfidence, dM = moraleGap(rH.state, rO.state);
      if (night === tie) { if (dB !== 0 || dM !== 0) bad.agree.push(where); }
      else {
        n.differ += 1;
        const okB = tie === 'W' ? (dB > 0 || rH.state.boardConfidence === 100) : (dB < 0 || rH.state.boardConfidence === 0);
        const okM = tie === 'W' ? dM > 0 : dM < 0;
        if (!okB || !okM) bad.react.push(`${where}: board ${dB.toFixed(2)} morale ${dM.toFixed(2)}`);
        console.log(`   differing: ${where}, board ${dB.toFixed(2)}, morale ${dM.toFixed(2)}, HEAD logs tie ${lastH.tie}`);
      }
    }
    s = r.state; over = r.kind === 'seasonOver';
  }
  console.log(`  ${tag}: ${plays ? `Europa League, ${legsHere} deciding legs` : 'no Europa League'}`);
}
console.log(`participants ${n.participants}, Europa League nights ${n.uelNights}, deciding legs ${n.legs}, differing ${n.differ}`);
if (!n.legs) { console.log('uelprobe could not run: no Europa League deciding leg met'); process.exit(2); }
let red = 0;
for (const [name, list] of Object.entries(bad)) { if (list.length) red += 1; console.log(`${list.length ? 'FAIL' : 'ok  '} ${name}${list.length ? ` (${list.length}: ${list.slice(0, 3).join('; ')})` : ''}`); }
console.log(`uelprobe ${red ? 'RED' : 'GREEN'}: ${4 - red} of 4 green (${n.legs} legs, ${n.differ} differing)`);
process.exit(red ? 1 : 0);
