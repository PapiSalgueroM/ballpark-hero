// Skeptic probe for finding BS-sc415-1 (PR 415). Never committed; sent to the runner as .rc/x and copied into src/test there.
import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import * as E from '@/lib/soccerCareerEngine';
import * as L from '@/lib/soccerCareerLoyalty';
import { agentWageMult } from '@/lib/soccerCareerLife';
import type { CareerState, ContractOffer } from '@/lib/soccerCareerEngine';

const log = (...a: unknown[]) => console.log('VF', ...a.map(x => typeof x === 'string' ? x : JSON.stringify(x)));
function seedRandom(n: number) {
  let seed = n | 0;
  Math.random = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
Date.now = () => 1790000000000;

const offer3: ContractOffer = {
  club: { id: 'vf-fixture', name: 'VF Fixture Club', country: 'Fixture Country', league: 'Fixture League', color: '#123456', tier: 3 },
  wage: 10000, contractYears: 3, transferFee: 0,
};
function fixture(): CareerState {
  const packet = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const state = structuredClone(packet.saves.find((e: { id: string }) => e.id === 'ere').state) as CareerState;
  delete state.agentId;
  state.phase = 'contract_offer'; state.retired = false; state.loan = null; state.age = 24;
  state.currentClub = 'Previous Fixture Club'; state.weeklyWage = 8000;
  state.pendingOffers = [structuredClone(offer3)]; state.transferSituation = null;
  state.netWorth = 2; state.totalEarnings = 3; state.events = [];
  return state;
}
// One recorded season at the current club, ticked the way the engine ticks it (contract year first, then the ledger).
function season(s: CareerState): CareerState {
  const last = s.seasons[s.seasons.length - 1];
  const row = { ...last, year: last.year + 1, age: last.age + 1, club: s.currentClub, type: 'playing', onLoanFrom: undefined } as typeof last;
  const next = { ...s, age: s.age + 1, seasons: [...s.seasons, row], contractYearsLeft: Math.max(0, s.contractYearsLeft - 1) };
  return L.settleLoyaltySeason(next, row) as CareerState;
}
const deal = (s: CareerState) => L.readLoyalty(s)?.deals.at(-1);

describe('BS-sc415-1 mechanism at the PR head', () => {
  it('extension and renewal read the cut wage, and payout never restores it', () => {
    seedRandom(4151);
    const loyal0 = E.acceptOffer(L.chooseLoyalty(fixture(), offer3, 10000, 'loyalty'), offer3);
    seedRandom(4151);
    const cash0 = E.acceptOffer(fixture(), offer3);
    log('signing wage loyal/cash', loyal0.weeklyWage, cash0.weeklyWage, 'deal', deal(loyal0));
    const loyal2 = season(season(loyal0)), cash2 = season(season(cash0));
    log('after two seasons: contractYearsLeft', loyal2.contractYearsLeft, 'deal', deal(loyal2)?.status, deal(loyal2)?.completed);
    seedRandom(7); const le = E.signExtension(loyal2);
    seedRandom(7); const ce = E.signExtension(cash2);
    log('extension wage loyal/cash', le.weeklyWage, ce.weeklyWage, 'years', le.contractYearsLeft, ce.contractYearsLeft, 'deal after ext', deal(le)?.status);
    const lp = season(le), cp = season(ce);
    log('after season three: deal', deal(lp)?.status, deal(lp)?.paidEuros, 'wage loyal/cash', lp.weeklyWage, cp.weeklyWage,
      'netWorth gain from payout', +(lp.netWorth - le.netWorth).toFixed(6));
    // Renewal route: the deal runs its full term without an extension, contract hits zero, player stays.
    const lr3 = season(season(season(loyal0))), cr3 = season(season(season(cash0)));
    const lr = E.stayAtClub(lr3), cr = E.stayAtClub(cr3);
    log('renewal route: deal', deal(lr3)?.status, 'contractYearsLeft', lr3.contractYearsLeft, 'renewed wage loyal/cash', lr.weeklyWage, cr.weeklyWage);
    // A second extension later keeps compounding the cut.
    const l2 = E.signExtension({ ...season(season(lp)), contractYearsLeft: 1 }), c2 = E.signExtension({ ...season(season(cp)), contractYearsLeft: 1 });
    log('second extension loyal/cash', l2.weeklyWage, c2.weeklyWage, 'ratio', +(l2.weeklyWage / c2.weeklyWage).toFixed(4));
    expect(loyal0.weeklyWage).toBe(9000);
    expect(cash0.weeklyWage).toBe(10000);
    expect(deal(le)?.status).toBe('active');
    expect(le.weeklyWage).toBe(Math.round(9000 * 1.15));
    expect(ce.weeklyWage).toBe(11500);
    expect(deal(lp)?.status).toBe('paid');
    expect(lp.weeklyWage).toBe(10350);
    expect(lr.weeklyWage).toBe(9000);
    expect(cr.weeklyWage).toBe(10000);
  });
});

// Whole careers through the real engine loop. A stayer never asks to leave: he signs the first offer, signs every extension
// the club offers, stays in every other window, and only moves when the club forces him out (frozen_out).
// cash: never takes loyalty. loyal: takes loyalty on every permanent signing. anchor: as loyal, but every extension or
// renewal at a club whose loyalty deal still carries its cut wage is quoted from that deal's uncut base wage (the fix sketch).
type Policy = 'cash' | 'loyal' | 'anchor';
const clubs = E.FALLBACK_CLUBS;
const NATIONS = ['England', 'Brazil', 'France', 'Japan', 'Nigeria', 'Argentina', 'Morocco', 'Norway'];
const POS = ['ST', 'CAM', 'CM', 'CB', 'GK', 'LW', 'RB', 'CDM'];
function offersOf(s: CareerState): ContractOffer[] {
  const t = s.transferSituation as Record<string, unknown> | null;
  if (!t) return [];
  if (t.type === 'one_offer' || t.type === 'dream_club' || t.type === 'request_result') return t.offer ? [t.offer as ContractOffer] : [];
  if (t.type === 'bidding_war') return [t.offerA, t.offerB] as ContractOffer[];
  if (t.type === 'contract_expiry' || t.type === 'frozen_out') return (t.offers as ContractOffer[]) ?? [];
  return [];
}
function uncut(s: CareerState): CareerState {
  const d = L.readLoyalty(s)?.deals.filter(x => x.club === s.currentClub).at(-1);
  return d && d.weeklyWage === s.weeklyWage ? { ...s, weeklyWage: d.baseWeeklyWage } : s;
}
function run(c: number, policy: Policy) {
  seedRandom(900001 + c * 7919);
  const ovr = 50 + (c % 25);
  let s = E.initCareer('VF ' + c, NATIONS[c % 8], POS[c % 8], '2020s',
    { pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, reflexes: ovr }, ovr, 2025, clubs, null);
  const ext: { cut: number; ext: number; base: number }[] = [];
  let wage30 = 0, g = 0;
  const sign = (x: CareerState, o: ContractOffer) => {
    let y = x;
    if (policy !== 'cash' && !o.isLoan) y = L.chooseLoyalty(y, o, Math.round(o.wage * agentWageMult(y.agentId)), 'loyalty');
    const n = E.acceptOffer(y, o);
    return n === y ? E.stayAtClub(y) : n;
  };
  const stay = (x: CareerState) => policy === 'anchor' && x.contractYearsLeft <= 0 ? E.stayAtClub(uncut(x)) : E.stayAtClub(x);
  while (!s.retired && g++ < 1500) {
    switch (s.phase) {
      case 'youth': s = E.advanceYouthYear(s, clubs); break;
      case 'contract_offer': { const o = s.pendingOffers ?? []; s = o.length ? sign(s, o.find(x => x.isHomegrown) ?? o[0]) : { ...s, phase: 'playing' }; break; }
      case 'playing': if (s.age === 30 && !wage30) wage30 = s.weeklyWage; s = E.advanceProSeason(s, clubs); break;
      case 'retirement_suggestion': s = E.acceptRetirementSuggestion(s); break;
      case 'newspaper': s = E.dismissNewspaper(s); break;
      case 'season_summary': s = E.dismissSummary(s, clubs); break;
      case 'random_events': s = s.pendingEvents?.[0] ? E.applyEventChoice(s, 0, clubs) : { ...s, pendingEvents: [], phase: 'playing' }; break;
      case 'moral_dilemma': s = E.dismissMoralDilemma(s, clubs); break;
      case 'social_media_action': s = E.dismissSocialMediaPhase(s, clubs); break;
      case 'red_card_appeal_result': s = E.dismissAppealResult(s, clubs); break;
      case 'international_debut': s = E.dismissDebut(s, clubs); break;
      case 'world_cup': s = E.dismissWorldCup(s, clubs); break;
      case 'rivalry_event': s = E.dismissRivalryEvent(s, clubs); break;
      case 'ballon_dor': s = E.dismissBallonDor(s, clubs); break;
      case 'rehab_choice': s = E.applyRehabChoice(s, 1); break;
      case 'transfer_window': {
        const t = s.transferSituation as { type?: string } | null, offers = offersOf(s), perm = offers.filter(o => !o.isLoan);
        if (t?.type === 'frozen_out') {
          const loan = offers.find(o => o.isLoan);
          s = perm.length ? sign(s, perm[0]) : loan ? E.acceptLoan(s, loan) : stay(s);
        } else if (t?.type === 'contract_expiry') {
          const active = L.readLoyalty(s)?.deals.find(d => d.status === 'active' && d.club === s.currentClub);
          const x = policy === 'anchor' ? uncut(s) : s;
          const n = E.signExtension(x);
          if (active && ext.length < 50) ext.push({ cut: s.weeklyWage, ext: n.weeklyWage, base: active.baseWeeklyWage });
          s = n;
        } else s = stay(s);
        break;
      }
      default: throw new Error('unhandled phase ' + s.phase);
    }
  }
  const deals = L.readLoyalty(s)?.deals ?? [];
  return { retired: s.retired, te: s.totalEarnings, wage30, ext, deals: deals.length,
    paid: deals.filter(d => d.status === 'paid').length, forfeits: deals.filter(d => d.status === 'forfeited').length };
}
describe('BS-sc415-1 whole careers at the PR head', () => {
  it('pairs cash, loyal and anchor stayers on the same seeds', () => {
    const seed0 = Number(process.env.VF_SEED0 ?? 0), n = Number(process.env.VF_N ?? 0);
    if (!n) return;
    const rows: unknown[] = [];
    for (let c = seed0; c < seed0 + n; c++) rows.push({ c, cash: run(c, 'cash'), loyal: run(c, 'loyal'), anchor: run(c, 'anchor') });
    const out = process.env.RC_OUT || resolve(process.cwd(), '.tmp-fx');
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'vf-careers-' + seed0 + '.json'), JSON.stringify(rows));
    log('ROWS', rows.length);
    type R = ReturnType<typeof run>;
    const typed = rows as { c: number; cash: R; loyal: R; anchor: R }[];
    for (const k of ['loyal', 'anchor'] as const) {
      const all = typed.filter(r => r.cash.retired && r[k].retired);
      const clean = all.filter(r => r[k].deals > 0 && r[k].forfeits === 0);
      const sum = (set: typeof all) => {
        const d = set.map(r => r[k].te - r.cash.te), p = set.map(r => (r[k].te - r.cash.te) / r.cash.te);
        return { n: set.length, worse: d.filter(x => x < 0).length, better: d.filter(x => x > 0).length,
          meanDiffM: +(d.reduce((a, b) => a + b, 0) / Math.max(1, d.length)).toFixed(3),
          meanPct: +(100 * p.reduce((a, b) => a + b, 0) / Math.max(1, p.length)).toFixed(2) };
      };
      const ex = all.flatMap(r => r[k].ext);
      log('SUMMARY', k, 'vs cash', { all: sum(all), everyDealPaid: sum(clean),
        deals: all.reduce((a, r) => a + r[k].deals, 0), paid: all.reduce((a, r) => a + r[k].paid, 0),
        extWhileActive: ex.length, meanExtOverCut: +(ex.reduce((a, x) => a + x.ext / x.cut, 0) / Math.max(1, ex.length)).toFixed(4),
        meanExtOverBase: +(ex.reduce((a, x) => a + x.ext / x.base, 0) / Math.max(1, ex.length)).toFixed(4),
        wage30: Math.round(all.reduce((a, r) => a + r[k].wage30, 0) / Math.max(1, all.length)),
        wage30cash: Math.round(all.reduce((a, r) => a + r.cash.wage30, 0) / Math.max(1, all.length)) });
    }
  }, 900000);
});
