/* Reviewer probe for PR 410: who takes my kicks in a DEFAULT shootout (no order set), against who the engine's own
   one draw leaned on (the assigned penalty taker, setPieces.penalties) and against the other side (best first). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSync } from 'esbuild';

const ROOT = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'o410-'));
const realRandom = Math.random;
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0, clear: () => {} };
const eng = path.join(tmp, 'eng.mjs');
buildSync({ stdin: { contents: 'export * from ' + JSON.stringify(path.join(ROOT, 'src/lib/clubManager.ts')) + ';', resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'esm', platform: 'node', outfile: eng, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const cm = await import(pathToFileURL(eng).href);
function seeded(seed, fn) {
  let a = seed | 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = realRandom; }
}
const grp = p => (p === 'GK' ? 'GK' : /B$|^CB|^LB|^RB|WB/.test(p) ? 'DEF' : /M$|^CM|^DM|^AM|^LM|^RM/.test(p) ? 'MID' : 'ATT');
const T = { pens: 0, assigned: 0, assignedKicked: 0, assignedFirst5: 0, firstFiveMine: {}, firstFiveTheirs: {}, myTop5InFirst5: 0, myFirst5: 0, examples: [] };
for (const club of ['Real Madrid', 'Manchester City', 'Bayern Munich']) {
  let cup;
  try {
    cup = seeded(782002, () => {
      let s = cm.startCareer(club);
      const target = s.calendar.findIndex(e => e.type === 'cup');
      for (let g = 0; s.week < target && g < 60; g++) { const o = cm.playNextEntry(s, { skipHalftime: true, untilWeek: target }); s = o.state; if (o.kind === 'reached') break; }
      return s;
    });
  } catch (e) { console.log(club + ': setup threw ' + e.message); continue; }
  const sp = cup.setPieces?.penalties ?? null;
  const assignedName = sp ? cup.squad.find(p => p.id === sp)?.name : null;
  console.log(club + ': assigned penalty taker ' + (assignedName ?? 'none') + ' (' + (sp ? cup.squad.find(p => p.id === sp)?.position + ' ' + cup.squad.find(p => p.id === sp)?.rating : '-') + ')');
  for (let seed = 1; seed <= 400; seed++) {
    const o = seeded(seed, () => cm.playNextEntry(JSON.parse(JSON.stringify(cup)), { skipHalftime: true }));
    const r = o.report;
    if (!r || r.decidedBy !== 'pens' || !r.shootout) continue;
    T.pens++;
    const mine = r.shootout.kicks.filter(k => k.side === 'me').map(k => k.taker);
    const theirs = r.shootout.kicks.filter(k => k.side === 'opp');
    const byName = n => cup.squad.find(p => p.name === n);
    const finished = (r.detail?.myRatings ?? []).map(x => x.name);
    if (assignedName && mine.length) {
      const onAtEnd = !(r.detail?.subs ?? []).some(s => s.off === assignedName) && !(r.detail?.cards ?? []).some(c => c.kind === 'red' && c.name === assignedName) && finished.includes(assignedName);
      if (onAtEnd) { T.assigned++; if (mine.includes(assignedName)) T.assignedKicked++; if (mine.slice(0, 5).includes(assignedName)) T.assignedFirst5++; }
    }
    for (const n of mine.slice(0, 5)) { const g = grp(byName(n)?.position ?? '?'); T.firstFiveMine[g] = (T.firstFiveMine[g] || 0) + 1; }
    const oppRoster = cm.oppRosterFor ? null : null;
    for (const k of theirs.slice(0, 5)) T.firstFiveTheirs[k.taker] = (T.firstFiveTheirs[k.taker] || 0) + 0;
    const order = [...new Set(r.shootout.kicks.filter(k => k.side === 'me').map(k => k.taker))];
    const rated = order.map(n => ({ n, r: byName(n)?.rating ?? 0 })).sort((a, b) => b.r - a.r).slice(0, 5).map(x => x.n);
    for (const n of mine.slice(0, 5)) { T.myFirst5++; if (rated.includes(n)) T.myTop5InFirst5++; }
    if (T.examples.length < 4) T.examples.push(club + ' seed ' + seed + ' ' + r.shootout.mine + '-' + r.shootout.theirs + ': ' + order.map(n => n + ' (' + (byName(n)?.position ?? '?') + ' ' + (byName(n)?.rating ?? '?') + ')').join(', '));
  }
}
delete T.firstFiveTheirs;
console.log(JSON.stringify(T, null, 1).slice(0, 3000));
console.log('ORDER410: ' + T.pens + ' default shootouts; assigned penalty taker on at the whistle in ' + T.assigned + ', kicked in ' + T.assignedKicked + ', in the first five in ' + T.assignedFirst5 + '; my first-five kicks by group ' + JSON.stringify(T.firstFiveMine) + '; first-five kicks by a top-five rated taker ' + T.myTop5InFirst5 + '/' + T.myFirst5);
