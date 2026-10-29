// Review probe for PR 415: saves written by the LIVE release with an offer pending, loaded by base 12c and head.
// node probe-oldsave.mjs <mainRoot> <baseRoot> <headRoot> <seed0> <n>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const [mainRoot, baseRoot, headRoot, seed0s, ns] = process.argv.slice(2);
async function load(root, tag) {
  const R0 = path.resolve(root), src = f => path.join(R0, 'src', f).replaceAll('\\', '/');
  const hasL = fs.existsSync(src('lib/soccerCareerLoyalty.ts'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rv415os-' + tag + '-')), entry = path.join(tmp, 'e.mjs'), out = path.join(tmp, 'b.mjs');
  fs.writeFileSync(entry, `globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * as E from '${src('lib/soccerCareerEngine.ts')}'; export * as P from '${src('lib/soccerCareerProgramme.ts')}';
export * as S from '${src('lib/soccerCareerSave.ts')}'; export * as R from '${src('lib/soccerOfferReview.ts')}';
${hasL ? `export * as L from '${src('lib/soccerCareerLoyalty.ts')}';` : ''}`);
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(R0, 'src') }, define: { 'import.meta.env': '{}' },
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" } });
  return import(pathToFileURL(out).href);
}
const M = await load(mainRoot, 'main'), B = await load(baseRoot, 'base'), H = await load(headRoot, 'head');
function seedRandom(n) {
  let seed = n | 0;
  Math.random = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
Date.now = () => 1790000000000;
const NATIONS = ['England', 'Brazil', 'France', 'Japan', 'Nigeria', 'Argentina', 'Morocco', 'Norway'];
const POS = ['ST', 'CAM', 'CM', 'CB', 'GK', 'LW', 'RB', 'CDM'];
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
function visible(s) {
  if (s.phase === 'contract_offer') return s.pendingOffers || [];
  const t = s.transferSituation; if (!t) return [];
  if (['one_offer', 'dream_club'].includes(t.type)) return [t.offer];
  if (t.type === 'request_result') return t.offer ? [t.offer] : [];
  if (t.type === 'bidding_war') return [t.offerA, t.offerB];
  if (t.type === 'contract_expiry' || t.type === 'frozen_out') return t.offers;
  return [];
}
function step(K, s) {
  const E = K.E, clubs = E.FALLBACK_CLUBS;
  switch (s.phase) {
    case 'youth': return E.advanceYouthYear(s, clubs);
    case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? E.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; }
    case 'playing': return E.advanceProSeason(s, clubs);
    case 'retirement_suggestion': return E.acceptRetirementSuggestion(s);
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, clubs);
    case 'random_events': if (!s.pendingEvents?.[0]) return { ...s, pendingEvents: [], phase: 'playing' }; return E.applyEventChoice(s, 0, clubs);
    case 'moral_dilemma': return E.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return E.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(s, clubs);
    case 'international_debut': return E.dismissDebut(s, clubs);
    case 'world_cup': return E.dismissWorldCup(s, clubs);
    case 'rivalry_event': return E.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return E.dismissBallonDor(s, clubs);
    case 'rehab_choice': return E.applyRehabChoice(s, 1);
    case 'transfer_window': return s.transferSituation?.type === 'contract_expiry' ? E.signExtension(s) : E.stayAtClub(s);
    default: throw new Error('unhandled phase ' + s.phase);
  }
}
function finish(K, s) { let g = 0; while (!s.retired && g++ < 1200) s = step(K, s); if (!s.retired) throw new Error('unfinished ' + s.phase); return s; }
const r = { snaps: 0, cashEqual: 0, cashDiff: 0, diffEx: null, loyalQuoted: 0, loyalSigned: 0, loyalWageOk: 0, loyalRoundTrip: 0,
  loyalFinished: 0, reviewBlocked: 0, tileMissing: 0, errors: 0, errEx: null, maxSaveHead: 0, maxSaveMain: 0 };
const n = Number(ns), seed0 = Number(seed0s);
for (let c = 0; c < n; c++) {
  try {
    seedRandom(seed0 + c * 104729);
    const ovr = 52 + (c % 22);
    let s = M.E.initCareer('Old ' + c, NATIONS[c % 8], POS[c % 8], '2020s', stats(ovr), ovr, 2025, M.E.FALLBACK_CLUBS, null);
    const snaps = []; let g = 0;
    while (!s.retired && g++ < 1200 && snaps.length < 2) {
      const perm = visible(s).filter(o => o && !o.isLoan);
      if ((s.phase === 'contract_offer' || s.phase === 'transfer_window') && perm.length && (snaps.length === 0 ? true : s.phase === 'transfer_window'))
        snaps.push({ raw: M.S.serializeSoccerCareerSave(s), idx: visible(s).indexOf(perm[0]) });
      s = step(M, s);
    }
    for (const snap of snaps) {
      r.snaps++; r.maxSaveMain = Math.max(r.maxSaveMain, snap.raw.length);
      const run = (K, loyal) => {
        const loaded = K.E.repairCareer(K.S.parseSoccerCareerSave(snap.raw));
        const offer = visible(loaded)[snap.idx];
        seedRandom(7 + c);
        let x = loaded;
        if (loyal) x = K.P.chooseProgramme(x, 'loyalty', 'loyalty');
        const rv = K.R.buildSoccerOfferReview(x, offer);
        const signed = K.E.acceptOffer(x, offer);
        return { loaded, offer, x, rv, signed };
      };
      const b = run(B, false); seedRandom(99 + c); const bf = finish(B, b.signed);
      const h = run(H, false); seedRandom(99 + c); const hf = finish(H, h.signed);
      if (h.rv.loyaltyBlocked) r.reviewBlocked++;
      if (!H.P.programmeOptions(h.loaded).some(v => v.id === 'loyalty')) r.tileMissing++;
      const bj = JSON.stringify(bf), hj = JSON.stringify(hf);
      if (bj === hj) r.cashEqual++; else { r.cashDiff++; if (!r.diffEx) { const i = [...bj].findIndex((ch, k) => ch !== hj[k]); r.diffEx = { c, at: i, base: bj.slice(i - 80, i + 80), head: hj.slice(i - 80, i + 80) }; } }
      const l = run(H, true);
      if (l.x.loyaltyContracts?.pending) r.loyalQuoted++;
      const deal = l.signed.loyaltyContracts?.deals?.at(-1);
      if (deal?.status === 'active') {
        r.loyalSigned++;
        if (l.signed.weeklyWage === deal.weeklyWage && deal.weeklyWage === Math.round(deal.baseWeeklyWage * 0.9)) r.loyalWageOk++;
        const raw = H.S.serializeSoccerCareerSave(l.signed); r.maxSaveHead = Math.max(r.maxSaveHead, raw.length);
        const back = H.E.repairCareer(H.S.parseSoccerCareerSave(raw));
        if (JSON.stringify(back.loyaltyContracts) === JSON.stringify(l.signed.loyaltyContracts)) r.loyalRoundTrip++;
        seedRandom(99 + c); const lf = finish(H, back); if (lf.retired) r.loyalFinished++;
      }
    }
  } catch (e) { r.errors++; r.errEx ??= String(e.stack || e).slice(0, 400); }
}
console.log(JSON.stringify({ diffEx: r.diffEx, errEx: r.errEx }).slice(0, 1500));
const { diffEx, errEx, ...rest } = r;
console.log('RESULT oldsave ' + JSON.stringify(rest));
