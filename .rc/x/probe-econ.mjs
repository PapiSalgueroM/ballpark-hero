// Review probe for PR 415: whole careers under a contract policy, on any tree.
// node probe-econ.mjs <root> <label> <policy> <seed0> <n>
// policies: cash, loyal, staycash, stayloyal, tease, shady
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const [root, label, policy, seed0s, ns] = process.argv.slice(2);
const ROOT = path.resolve(root);
const src = f => path.join(ROOT, 'src', f).replaceAll('\\', '/');
const hasL = fs.existsSync(src('lib/soccerCareerLoyalty.ts'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rv415-' + label + '-'));
const entry = path.join(tmp, 'entry.mjs');
fs.writeFileSync(entry, `globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * as E from '${src('lib/soccerCareerEngine.ts')}';
export * as P from '${src('lib/soccerCareerProgramme.ts')}';
export * as S from '${src('lib/soccerCareerSave.ts')}';
${hasL ? `export * as L from '${src('lib/soccerCareerLoyalty.ts')}'; export * as R from '${src('lib/soccerOfferReview.ts')}';` : ''}
`);
const out = path.join(tmp, 'b.mjs');
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': '{}' },
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" } });
const { E, P, S, L, R } = await import(pathToFileURL(out).href);
const clubs = E.FALLBACK_CLUBS;
function seedRandom(n) {
  let seed = n | 0;
  Math.random = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
Date.now = () => 1790000000000;
const NATIONS = ['England', 'Brazil', 'France', 'Japan', 'Nigeria', 'Argentina', 'Morocco', 'Norway'];
const POS = ['ST', 'CAM', 'CM', 'CB', 'GK', 'LW', 'RB', 'CDM'];
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const loyalPol = ['loyal', 'stayloyal', 'tease', 'shady'].includes(policy);
const stayer = policy.startsWith('stay');
const agg = { careers: 0, te: [], nw: [], fees: [], deals: 0, paid: 0, paidEuros: 0, forfeit: {}, paidEvents: 0,
  stuck: 0, stuckEx: null, blockedNoPending: 0, blockedEx: null, staleBlocked: 0, staleEx: null, maxSave: 0, maxLedger: 0,
  wage30: [], ext: [], per: [], expiryEx: [], unfinished: 0, errors: 0, errEx: null, digest: createHash('sha256') };
const wantMove = (s, o) => o && !o.isLoan && (o.isDreamClub || o.club.tier < s.currentClubTier || o.wage > s.weeklyWage * 1.25);
function visible(s) {
  const t = s.transferSituation; if (!t) return [];
  if (['one_offer', 'dream_club'].includes(t.type)) return [t.offer];
  if (t.type === 'request_result') return t.offer ? [t.offer] : [];
  if (t.type === 'bidding_war') return [t.offerA, t.offerB];
  if (t.type === 'contract_expiry' || t.type === 'frozen_out') return t.offers;
  return [];
}
function audit(s) {
  if (!L) return;
  const led = L.readLoyalty(s); if (!led) return;
  for (const o of visible(s)) {
    if (o.isLoan) continue;
    const rv = R.buildSoccerOfferReview(s, o);
    if (!rv.loyaltyBlocked) continue;
    if (!led.pending) { agg.blockedNoPending++; agg.blockedEx ??= { age: s.age, type: s.transferSituation.type, club: o.club }; }
    else if (led.pending.club === o.club.name) { agg.staleBlocked++; agg.staleEx ??= { age: s.age, type: s.transferSituation.type, club: o.club.name, pendingFirstYear: led.pending.firstYear, last: s.seasons.at(-1).year }; }
  }
}
function accept(s, o) {
  let x = s;
  if (loyalPol) x = P.chooseProgramme(x, 'loyalty', 'loyalty');
  const n = E.acceptOffer(x, o);
  if (n === x) { agg.stuck++; agg.stuckEx ??= { age: s.age, phase: s.phase, type: s.transferSituation?.type, club: o.club, ledger: s.loyaltyContracts }; return E.stayAtClub(x); }
  return n;
}
function tw(s) {
  audit(s);
  const t = s.transferSituation;
  if (!t) return E.stayAtClub(s);
  const offers = visible(s), perm = offers.filter(o => !o.isLoan);
  if (t.type === 'frozen_out') {
    if (perm.length) return accept(s, perm[0]);
    const loan = offers.find(o => o.isLoan); if (loan) return E.acceptLoan(s, loan);
    return E.stayAtClub(s);
  }
  if (t.type === 'contract_expiry') {
    if (!stayer && wantMove(s, perm[0])) return accept(s, perm[0]);
    if (policy === 'tease' && perm[0]) s = P.chooseProgramme(s, 'loyalty', 'loyalty');
    const ext = E.signExtension(s);
    const paid = s.loyaltyContracts?.deals?.find(d => d.status === 'paid' && d.club === s.currentClub && d.lastYear === s.seasons.at(-1).year);
    if (paid && agg.ext.length < 400) agg.ext.push({ age: s.age, base: paid.baseWeeklyWage, cut: s.weeklyWage, ext: ext.weeklyWage, years: ext.contractYearsLeft });
    return ext;
  }
  const o = perm[0];
  if (!stayer && wantMove(s, o)) return accept(s, o);
  if (policy === 'tease' && o) s = P.chooseProgramme(s, 'loyalty', 'loyalty');
  return E.stayAtClub(s);
}
function step(s) {
  switch (s.phase) {
    case 'youth': return E.advanceYouthYear(s, clubs);
    case 'contract_offer': { const o = s.pendingOffers || []; if (!o.length) return { ...s, phase: 'playing' };
      return accept(s, o.find(x => x.isHomegrown) || o[0]); }
    case 'playing': if (s.age === 30) agg.wage30.push(s.weeklyWage); return E.advanceProSeason(s, clubs);
    case 'retirement_suggestion': return E.acceptRetirementSuggestion(s);
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, clubs);
    case 'random_events': if (!s.pendingEvents?.[0]) return { ...s, pendingEvents: [], phase: 'playing' }; return E.applyEventChoice(s, 0, clubs);
    case 'moral_dilemma': if (policy === 'shady' && s.pendingMoralDilemma) return E.applyMoralDilemmaChoice(s, 0); return E.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return E.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(s, clubs);
    case 'international_debut': return E.dismissDebut(s, clubs);
    case 'world_cup': return E.dismissWorldCup(s, clubs);
    case 'rivalry_event': return E.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return E.dismissBallonDor(s, clubs);
    case 'rehab_choice': return E.applyRehabChoice(s, policy === 'shady' ? 0 : 1);
    case 'transfer_window': return tw(s);
    default: throw new Error('unhandled phase ' + s.phase);
  }
}
const seed0 = Number(seed0s), n = Number(ns);
for (let c = 0; c < n; c++) {
  try {
    seedRandom(seed0 + c * 7919);
    const ovr = 50 + (c % 25);
    let s = E.initCareer('Probe ' + c, NATIONS[c % 8], POS[c % 8], '2020s', stats(ovr), ovr, 2025, clubs, null);
    let g = 0;
    while (!s.retired && g++ < 1200) {
      const prev = s; s = step(s);
      if (s.loyaltyContracts) agg.maxLedger = Math.max(agg.maxLedger, JSON.stringify(s.loyaltyContracts).length);
      const was = prev.loyaltyContracts?.deals?.find(d => d.status === 'active');
      const now = was && s.loyaltyContracts?.deals?.find(d => d.id === was.id);
      if (now && now.status === 'forfeited' && (now.reason === 'expiry' || now.reason === 'gap') && agg.expiryEx.length < 12) agg.expiryEx.push({ c, reason: now.reason, phase: prev.phase,
        sit: prev.transferSituation && (prev.transferSituation.type + '/' + (prev.transferSituation.mode || '')), cylBefore: prev.contractYearsLeft, cylAfter: s.contractYearsLeft,
        deal: { years: was.years, completed: now.completed, firstYear: was.firstYear, lastYear: now.lastYear }, rows: s.seasons.slice(-3).map(r => [r.year, r.club, r.onLoanFrom || '', r.type, r.apps]), events: s.events.slice(-4).map(e => String(e).slice(0, 90)) });
    }
    if (!s.retired) { agg.unfinished++; continue; }
    agg.careers++; agg.per.push([c, s.totalEarnings]); agg.te.push(s.totalEarnings); agg.nw.push(s.netWorth); agg.fees.push(s.agentFeesPaid || 0);
    agg.maxSave = Math.max(agg.maxSave, S.serializeSoccerCareerSave(s).length);
    agg.paidEvents += s.events.filter(e => String(e).startsWith('Loyalty contract completed')).length;
    for (const d of s.loyaltyContracts?.deals || []) { agg.deals++; if (d.status === 'paid') { agg.paid++; agg.paidEuros += d.paidEuros; } else agg.forfeit[d.reason || d.status] = (agg.forfeit[d.reason || d.status] || 0) + 1; }
    agg.digest.update(JSON.stringify(s));
  } catch (e) { agg.errors++; agg.errEx ??= String(e.stack || e).slice(0, 300); }
}
const mean = a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(3) : null;
const med = a => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
console.log(JSON.stringify({ stuckEx: agg.stuckEx, blockedEx: agg.blockedEx, staleEx: agg.staleEx, errEx: agg.errEx }).slice(0, 1500));
console.log(`RESULT ${label} ${policy} n=${n} careers=${agg.careers} unfinished=${agg.unfinished} errors=${agg.errors} meanTE=${mean(agg.te)} medTE=${med(agg.te)} meanNW=${mean(agg.nw)} meanFees=${mean(agg.fees)} wage30=${mean(agg.wage30)} deals=${agg.deals} paid=${agg.paid} paidEvents=${agg.paidEvents} paidEurosM=${(agg.paidEuros / 1e6).toFixed(2)} forfeit=${JSON.stringify(agg.forfeit)} stuck=${agg.stuck} blockedNoPending=${agg.blockedNoPending} staleBlocked=${agg.staleBlocked} maxSave=${agg.maxSave} maxLedger=${agg.maxLedger} digest=${agg.digest.digest('hex').slice(0, 16)}`);
fs.rmSync(tmp, { recursive: true, force: true });
if (process.env.DUMP) {
  console.log('PER ' + JSON.stringify(agg.per));
  const e = agg.ext;
  console.log('EXT n=' + e.length + ' sample=' + JSON.stringify(e.slice(0, 4)) + ' meanExtOverCut=' + mean(e.map(x => x.ext / x.cut)) + ' meanExtOverBase=' + mean(e.map(x => x.ext / x.base)));
}
if (process.env.DUMP) for (const x of agg.expiryEx) console.log('EXPIRY ' + JSON.stringify(x));
