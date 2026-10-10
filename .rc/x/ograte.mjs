/* Round 1215 scratch probe for a runner, never committed: how often is a first half goal of a club's FIRST match an
   own goal, through the engine's own calls, and where on the clock? The browser walk met 6 in 49 (all before the
   19th minute) where the rule says one eligible goal in 32, so this asks the engine directly. Reads no network. */
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k) };
const out = path.join(os.tmpdir(), `cm-engine-${process.pid}.mjs`);
await build({ entryPoints: [path.resolve('src/lib/clubManager.ts')], bundle: true, platform: 'node', format: 'esm', outfile: out, alias: { '@': path.resolve('src') }, logLevel: 'error' });
const cm = await import(pathToFileURL(out).href);
const seeded = seed => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const N = Number(process.env.N || 1200);
const clubs = (process.env.CLUBS || 'Crystal Palace,Aston Villa,Real Madrid,Lyon,Ajax').split(',');
const native = Math.random;
for (const club of clubs) {
  const t = { matches: 0, goals: 0, eligible: 0, own: 0, early: 0, earlyOwn: 0, late: 0, lateOwn: 0, me: 0, meOwn: 0, opp: 0, oppOwn: 0 };
  for (let s = 1; s <= N; s++) {
    Math.random = seeded(s * 7919 + 13);
    let career;
    try { career = cm.startCareer(club); } catch (e) { console.log(`${club}: startCareer threw ${e.message}`); break; }
    let live = null;
    for (let guard = 0; guard < 80; guard++) {
      const next = cm.playNextEntry(career);
      career = next.state;
      if (next.kind === 'seasonOver' || career.sacked) break;
      if (next.kind === 'halftime' && career.live) { live = career.live; break; }
    }
    if (!live) continue;
    t.matches++;
    for (const [side, lines] of [['me', live.h1My ?? []], ['opp', live.h1Opp ?? []]]) for (const g of lines) {
      const own = !!g.og;
      const place = g.minute + (g.plus ?? 0);
      t.goals++; t[side]++;
      if (!g.penalty && !g.freeKick) t.eligible++;
      if (place <= 18) t.early++; else t.late++;
      if (own) { t.own++; t[side + 'Own']++; if (place <= 18) t.earlyOwn++; else t.lateOwn++; }
    }
  }
  Math.random = native;
  const one = (a, b) => (b ? `one in ${(a / b).toFixed(1)}` : 'none');
  console.log(`${club}: ${t.matches} first matches, ${t.goals} first half goals (${t.eligible} eligible), ${t.own} own goals, ${one(t.eligible, t.own)} eligible; up to the 18th minute ${t.earlyOwn} of ${t.early}, after it ${t.lateOwn} of ${t.late}; for me ${t.meOwn} of ${t.me}, against me ${t.oppOwn} of ${t.opp}`);
}
console.log('ograte: done');
