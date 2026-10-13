// Reviewer probe, Round 1327 (runner only, .rc/x/rvOldSaves1327.mjs). Saves written by the BASE engine at every step
// of a fleet of careers, loaded on this engine (JSON, repairCareer) and stepped once under the same seed as the base:
// (1) repairCareer gives the same save on both; (2) the next step agrees except where the deck, the paper or a card
// this round rewrote runs; the parting steps are listed by phase and, for a card, by whether its apply changed.
import '../../scripts/lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = process.cwd();
const BASE_SHA = 'c9c77ebab727b9bd624459388e33b6579538e4ca';
const N = Number(process.argv[2] || 120);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rvold-'));
async function bundle(tag, ref) {
  const plugin = { name: 'rv-src', setup(b) {
    b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      if (!rel.startsWith('src/')) return undefined;
      const source = ref ? execFileSync('git', ['show', `${ref}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }) : fs.readFileSync(args.path, 'utf8');
      return { contents: source.replace(/\r\n/g, '\n'), loader: rel.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
    });
  } };
  const out = path.join(TMP, `${tag}.mjs`);
  await esbuild.build({ stdin: { contents: "export * as engine from './src/lib/soccerCareerEngine';", resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins: [plugin],
    define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' } });
  return (await import(pathToFileURL(out).href)).engine;
}
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), key: () => null, get length() { return store.size; }, clear: () => store.clear() };
const seeded = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const withSeed = (seed, fn) => { const r = Math.random; Math.random = seeded(seed); try { return fn(); } finally { Math.random = r; } };
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const copy = v => JSON.parse(JSON.stringify(v));
function step(M, s, seed) {
  const clubs = M.FALLBACK_CLUBS;
  switch (s.phase) {
    case 'youth': return M.advanceYouthYear(s, clubs);
    case 'contract_offer': return s.pendingOffers?.length ? M.acceptOffer(s, s.pendingOffers.find(o => !o.isLoan) || s.pendingOffers[0]) : { ...s, phase: 'playing' };
    case 'playing': return M.advanceProSeason(s, clubs);
    case 'newspaper': return M.dismissNewspaper(s);
    case 'season_summary': return M.dismissSummary(s, clubs);
    case 'rehab_choice': return M.applyRehabChoice(s, seed % 3);
    case 'random_events': return s.pendingEvents?.length ? M.applyEventChoice(s, (seed + s.pendingEvents[0].id + s.seasons.length) % s.pendingEvents[0].choices.length, clubs) : { ...s, phase: 'playing' };
    case 'moral_dilemma': return M.dismissMoralDilemma(s, clubs);
    case 'social_media_action': { const t = M.dismissSocialMediaPhase(s, clubs); return t.phase === 'social_media_action' ? M.dismissSocialMediaPhase(t, clubs) : t; }
    case 'red_card_appeal_result': return M.dismissAppealResult(s, clubs);
    case 'international_debut': return M.dismissDebut(s, clubs);
    case 'world_cup': return M.dismissWorldCup(s, clubs);
    case 'rivalry_event': return M.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return M.dismissBallonDor(s, clubs);
    case 'transfer_window': { const sit = s.transferSituation; if (sit?.type === 'contract_expiry') return M.signExtension(s); if (sit?.type === 'one_offer' && seed % 2) return M.acceptOffer(s, sit.offer); return M.stayAtClub(s); }
    case 'retirement_suggestion': return M.acceptRetirementSuggestion(s);
    default: return null;
  }
}
const B = await bundle('base', BASE_SHA);
const E = await bundle('head', null);
const changedApply = (id, st) => {
  try {
    const a = B.getAllEvents(st).find(e => e.id === id), b = E.getAllEvents(st).find(e => e.id === id);
    return !a || !b || a.choices.some((c, i) => String(c.apply) !== String(b.choices[i]?.apply));
  } catch { return 'unknown'; }
};
let saves = 0, repairDiff = 0, stepEqual = 0, threw = 0;
const parts = new Map();
const unexplained = [];
for (let i = 0; i < N; i += 1) {
  const seed = 31000 + i;
  let s = withSeed(seed, () => B.initCareer(`Old ${i}`, ['England', 'Brazil', 'Spain', 'Ghana'][i % 4], ['ST', 'CM', 'CB', 'GK', 'LW'][i % 5], '2020s', stats(45 + (i % 30)), 45 + (i % 30), 2020, B.FALLBACK_CLUBS, null));
  for (let k = 0; k < 160 && s && !s.retired; k += 1) {
    const saved = JSON.parse(JSON.stringify(s));
    saves += 1;
    const rb = withSeed(seed * 1000 + k, () => B.repairCareer(copy(saved)));
    let re;
    try { re = withSeed(seed * 1000 + k, () => E.repairCareer(copy(saved))); } catch (err) { threw += 1; unexplained.push(`repair threw ${err.message}`); break; }
    if (JSON.stringify(rb) !== JSON.stringify(re)) repairDiff += 1;
    const nb = withSeed(seed * 7 + k, () => step(B, copy(saved), seed));
    let ne;
    try { ne = withSeed(seed * 7 + k, () => step(E, copy(saved), seed)); } catch (err) { threw += 1; unexplained.push(`${saved.phase} threw ${err.message}`); break; }
    if (JSON.stringify(nb) === JSON.stringify(ne)) stepEqual += 1;
    else {
      const card = saved.phase === 'random_events' ? saved.pendingEvents?.[0]?.id : null;
      const key = card != null ? `random_events card ${card} (apply changed: ${card > 40 ? 'not inline' : changedApply(card, copy(saved))})` : saved.phase;
      parts.set(key, (parts.get(key) || 0) + 1);
    }
    s = nb;
  }
}
console.log(`${N} base careers, ${saves} base saves loaded here: repairCareer differs on ${repairDiff}, ${threw} threw; next step equal on ${stepEqual}`);
console.log('steps that part from the base, by phase:');
for (const [k, v] of [...parts.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${v}  ${k}`);
for (const u of unexplained.slice(0, 10)) console.log(`   UNEXPLAINED ${u}`);
console.log(`rvOldSaves1327: done (${repairDiff + threw} hard problems)`);
process.exit(repairDiff + threw ? 1 : 0);
