// Round 1334 review: OLD SAVES with the deck LOADED (what Round 1504's players will meet).
// Saves are written by the BASE engine (git show e814c2de) over a fleet with a varied answer policy, snapshotted at
// every phase; each is loaded by the HEAD engine's save parser with the deck loaded and played two more seasons.
// Asserts: no throw; the parsed save equals the base JSON; every save after a step passes the head's save validator;
// morale finite 0..100, every statBoostNextSeason value finite and >= 0, integrityBonus finite; no log line with
// "undefined" or "NaN"; at most one deck card in a batch and only first. Prints the deck cards dealt and answered.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = process.cwd();
const REF = process.env.OLD_BASE || 'e814c2def671e07bd6163462dff8ab1230be2000';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'old1334-'));
const lf = t => t.split('\r\n').join('\n');
async function bundle(tag, ref, entry) {
  const plugin = { name: 'src', setup(b) { b.onLoad({ filter: /\.(ts|tsx)$/ }, a => {
    const rel = path.relative(ROOT, a.path).split(path.sep).join('/');
    if (!rel.startsWith('src/')) return undefined;
    const contents = ref ? lf(execFileSync('git', ['show', `${ref}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 })) : lf(fs.readFileSync(a.path, 'utf8'));
    return { contents, loader: rel.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(a.path) };
  }); } };
  const out = path.join(TMP, `${tag}.mjs`);
  await esbuild.build({ stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out,
    logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins: [plugin], define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' } });
  return import(pathToFileURL(out).href);
}
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), key: i => [...store.keys()][i] ?? null, get length() { return store.size; }, clear: () => store.clear() };
const B = (await bundle('base', REF, "export * as engine from './src/lib/soccerCareerEngine';")).engine;
const H = await bundle('head', null, "export * as engine from './src/lib/soccerCareerEngine'; export * as gate from './src/lib/soccerDeckGate'; export * as deck from './src/lib/soccerDeck'; export * as save from './src/lib/soccerCareerSave';");
H.gate.setSoccerDeckLoader(() => Promise.resolve(H.deck));
await H.gate.loadSoccerDeck();
if (!H.gate.soccerDeckReady()) { console.log('oldsaves1334: the deck did not load'); process.exit(2); }

const seeded = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const CODES = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
const ERAS = [['1990-94', 1990], ['2000-04', 2000], ['2010-14', 2010], ['2015-19', 2015], ['2020-24', 2020], ['2025', 2025]];
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const isDeck = id => typeof id === 'number' && id >= 700 && id <= 999;
function step(M, s, pick) {
  const clubs = M.FALLBACK_CLUBS;
  switch (s.phase) {
    case 'youth': return M.advanceYouthYear(s, clubs);
    case 'contract_offer': { const os_ = s.pendingOffers || []; const o = os_[Math.floor(pick() * os_.length)]; return o ? M.acceptOffer(s, o) : { ...s, phase: 'playing' }; }
    case 'playing': return M.advanceProSeason(s, clubs);
    case 'newspaper': return M.dismissNewspaper(s);
    case 'season_summary': return M.dismissSummary(s, clubs);
    case 'rehab_choice': return M.applyRehabChoice(s, Math.floor(pick() * 3));
    case 'random_events': { const e = s.pendingEvents?.[0]; return e ? M.applyEventChoice(s, Math.floor(pick() * e.choices.length), clubs) : { ...s, pendingEvents: [], phase: 'playing' }; }
    case 'moral_dilemma': return M.dismissMoralDilemma(s, clubs);
    case 'social_media_action': { let t = M.dismissSocialMediaPhase(s, clubs); if (t.phase === 'social_media_action') t = M.dismissSocialMediaPhase(t, clubs); return t; }
    case 'red_card_appeal_result': return M.dismissAppealResult(s, clubs);
    case 'international_debut': return M.dismissDebut(s, clubs);
    case 'world_cup': return M.dismissWorldCup(s, clubs);
    case 'rivalry_event': return M.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return M.dismissBallonDor(s, clubs);
    case 'transfer_window': { const sit = s.transferSituation; const go = pick() < 0.5;
      if (!sit || sit.type === 'no_interest') return M.stayAtClub(s);
      if (sit.type === 'one_offer' || sit.type === 'dream_club') return go ? M.acceptOffer(s, sit.offer) : M.stayAtClub(s);
      if (sit.type === 'bidding_war') return M.acceptOffer(s, go ? sit.offerA : sit.offerB ?? sit.offerA);
      if (sit.type === 'contract_expiry') { const o = (sit.offers || [])[0]; return o ? M.acceptOffer(s, o) : M.stayAtClub(s); }
      if (sit.type === 'request_result') return sit.offer && go ? M.acceptOffer(s, sit.offer) : M.stayAtClub(s);
      return M.stayAtClub(s); }
    case 'retirement_suggestion': return pick() < 0.5 ? M.acceptRetirementSuggestion(s) : (M.declineRetirementSuggestion ? M.declineRetirementSuggestion(s) : M.acceptRetirementSuggestion(s));
    default: return null;
  }
}

/* the base fleet: 120 careers, ten seasons, a save snapshotted every fifth step (every phase gets some) */
const FLEET = Number(process.env.OLD_FLEET || 120);
const snaps = [];
const realRandom = Math.random;
for (let seed = 0; seed < FLEET; seed++) {
  Math.random = seeded(1000 + seed);
  const pick = seeded(5000 + seed);
  const [era, year] = ERAS[seed % ERAS.length];
  const ovr = 45 + (seed % 30);
  let s = B.initCareer(`Old ${seed}`, 'England', CODES[seed % CODES.length], era, stats(ovr), ovr, year, B.FALLBACK_CLUBS, null);
  try {
    for (let g = 0, n = 0; g < 1500 && !s.retired; g++) {
      if (s.phase === 'playing' && s.seasons.length >= 10) break;
      const t = step(B, s, pick); if (!t) break; s = t; n++;
      if (n % 5 === 0) snaps.push({ seed, phase: s.phase, raw: JSON.stringify(s) });
    }
  } catch (e) { console.log(`base career ${seed} threw: ${e.message}`); }
}
Math.random = realRandom;
const phases = {};
for (const x of snaps) phases[x.phase] = (phases[x.phase] || 0) + 1;
console.log(`base fleet: ${FLEET} careers, ${snaps.length} saves snapshotted: ${Object.entries(phases).map(([k, v]) => `${k} ${v}`).join(', ')}`);

/* each base save loaded on the head with the deck loaded, two more seasons */
let fails = 0; const failOnce = new Map();
const fail = (k, m) => { fails++; failOnce.set(k, (failOnce.get(k) || 0) + 1); if (failOnce.get(k) <= 3) console.log(`FAIL ${m}`); };
let parsedDiff = 0, dealt = 0, answered = 0, steps = 0, batchesWithDeck = 0, deckNotFirst = 0, invalid = 0;
const seenCards = new Map();
for (let i = 0; i < snaps.length; i++) {
  const x = snaps[i];
  const parsed = H.save.parseSoccerCareerSave(x.raw);
  if (JSON.stringify(parsed) !== x.raw) parsedDiff++;
  if (!H.save.isSoccerCareerSave(parsed)) { fail('valid0', `save ${i} (career ${x.seed}, ${x.phase}) fails the head's validator as loaded`); continue; }
  Math.random = seeded(9000 + i);
  const pick = seeded(7000 + i);
  let s = parsed; const startSeasons = s.seasons.length;
  try {
    for (let g = 0; g < 400 && !s.retired; g++) {
      if (s.phase === 'playing' && s.seasons.length >= startSeasons + 2) break;
      const before = s;
      if (s.phase === 'random_events' && isDeck(s.pendingEvents?.[0]?.id)) answered++;
      const t = step(H, s, pick); if (!t) break; s = t; steps++;
      if (t.phase === 'random_events' && before.phase !== 'random_events') {
        const ids = (t.pendingEvents || []).map(e => e.id);
        const d = ids.filter(isDeck);
        if (d.length) { batchesWithDeck++; dealt += d.length; for (const id of d) seenCards.set(id, (seenCards.get(id) || 0) + 1); }
        if (d.length > 1 || (d.length === 1 && !isDeck(ids[0]))) { deckNotFirst++; fail('first', `save ${i}: batch ${ids.join(',')}`); }
      }
      if (!(Number.isFinite(s.morale) && s.morale >= 0 && s.morale <= 100)) fail('morale', `save ${i} (career ${x.seed}): morale ${s.morale} after ${before.phase}`);
      for (const [k, v] of Object.entries(s.statBoostNextSeason || {})) if (!(Number.isFinite(v) && v >= 0)) fail('boost', `save ${i}: statBoostNextSeason.${k} = ${v}`);
      if (s.integrityBonus !== undefined && !Number.isFinite(s.integrityBonus)) fail('integrity', `save ${i}: integrityBonus ${s.integrityBonus}`);
      const lastLine = String(s.events?.[s.events.length - 1] ?? '');
      if (/undefined|NaN/.test(lastLine)) fail('line', `save ${i}: log line "${lastLine.slice(0, 120)}"`);
      if (!H.save.isSoccerCareerSave(JSON.parse(H.save.serializeSoccerCareerSave(s)))) { invalid++; fail('valid', `save ${i}: the head's own save fails its validator at ${s.phase}`); }
    }
  } catch (e) { fail('throw', `save ${i} (career ${x.seed}, loaded at ${x.phase}) threw on the head with the deck loaded: ${e.stack?.split('\n').slice(0, 3).join(' / ')}`); }
}
Math.random = realRandom;
console.log(`head with the deck loaded: ${snaps.length} base saves played ${steps} steps; parsed JSON differs from the base's in ${parsedDiff}; batches holding a deck card ${batchesWithDeck}; deck cards dealt ${dealt}, answered ${answered}; ${seenCards.size} different cards seen`);
console.log(`oldsaves1334: ${fails === 0 ? 'green' : `${fails} failures (${[...failOnce.entries()].map(([k, v]) => `${k} ${v}`).join(', ')})`}`);
process.exit(fails === 0 && parsedDiff === 0 && dealt > 0 ? 0 : 1);
