/* Reviewer's probe, never committed. Runs on the MERGED tree with saves the BASE engine made
   (.rc/x/rv-saves-base.json): the kinds of screen the builder's old save proof did not cover. */
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('@/lib/completions', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(), getCurrentPlayerName: () => 'Tester',
}));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined, loading: false }) }));
vi.mock('sonner', () => {
  const toast = Object.assign(() => undefined, { success: () => undefined, error: () => undefined, info: () => undefined, message: () => undefined });
  return { toast, Toaster: () => null };
});
vi.mock('@/integrations/supabase/client', () => {
  const chain = (): unknown => new Proxy(() => undefined, {
    get(_t, prop) {
      if (prop === 'then') return (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve({ data: [], error: null, count: 0 }).then(ok, bad);
      if (typeof prop === 'symbol') return undefined;
      return () => chain();
    },
    apply() { return chain(); },
  });
  const supabase = {
    from: () => chain(), rpc: () => chain(), functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    auth: { getSession: () => Promise.resolve({ data: { session: null } }), getUser: () => Promise.resolve({ data: { user: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }), removeChannel: () => undefined,
  };
  return { supabase, SUPABASE_URL: 'http://stub', SUPABASE_PUBLISHABLE_KEY: 'stub' };
});
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/game/PostGameStats', () => ({ default: () => null }));

import * as E from '@/lib/soccerCareerEngine';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { deriveSeason, disagreements } from '@/lib/season/core';
import { buildSoccerSeasonCtx, SOCCER } from '@/lib/season/soccer';
import { isSoccerCareerSave } from '@/lib/soccerCareerSave';
import SoccerCareer from '@/pages/SoccerCareer';

/* eslint-disable @typescript-eslint/no-explicit-any */
const clubs = E.FALLBACK_CLUBS;
const SAVE_KEY = 'soccerCareerSave';
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function step(s: CareerState): CareerState {
  switch (s.phase as string) {
    case 'youth': return E.advanceYouthYear(s, clubs);
    case 'playing': return E.advanceProSeason(s, clubs);
    case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? E.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; }
    case 'rehab_choice': return E.applyRehabChoice(s, 1);
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, clubs);
    case 'random_events': return s.pendingEvents?.[0] ? E.applyEventChoice(s, 0, clubs) : { ...s, pendingEvents: [], phase: 'playing' };
    case 'moral_dilemma': return s.pendingMoralDilemma ? E.applyMoralDilemmaChoice(s, 1) : E.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return E.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(s, clubs);
    case 'international_debut': return E.dismissDebut(s, clubs);
    case 'world_cup': return E.dismissWorldCup(s, clubs);
    case 'rivalry_event': return E.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return E.dismissBallonDor(s, clubs);
    case 'transfer_window': return (s.transferSituation as any)?.type === 'contract_expiry' ? E.signExtension(s) : E.stayAtClub(s);
    case 'retirement_suggestion': return E.declineRetirementSuggestion(s, clubs);
    default: throw new Error(`no move for ${s.phase}`);
  }
}
/** Carry a career to the end of its next finished season; says what stopped it. */
function playOn(start: CareerState, seed: number, seasons = 1): { s: CareerState; problem?: string } {
  Math.random = seeded(seed);
  let s = start;
  const before = s.seasons.length;
  try {
    for (let guard = 0; guard < 900; guard++) {
      if (s.retired || (s.seasons.length >= before + seasons && (s.phase === 'playing' || s.phase === 'youth'))) break;
      s = step(s);
    }
  } catch (e) { return { s, problem: `threw: ${(e as Error).message.slice(0, 220)}` }; }
  if (!s.retired && s.seasons.length < before + seasons) return { s, problem: `no new season landed (stuck on ${s.phase})` };
  for (const row of s.seasons.slice(before).filter((r: any) => r.type === 'playing') as any[]) {
    const ctx = buildSoccerSeasonCtx(s, clubs, row);
    const d = deriveSeason(SOCCER, row, ctx);
    if (d) { const bad = disagreements(SOCCER, row, ctx, d); if (bad.length) return { s, problem: `new row ${row.year} disagrees with its own Season Centre: ${bad.slice(0, 2).join('; ')}` }; }
  }
  if (!isSoccerCareerSave(JSON.parse(JSON.stringify(s)))) return { s, problem: 'the save after playing on fails the page check' };
  if (JSON.stringify(s.seasons.slice(0, before)) !== JSON.stringify(start.seasons)) return { s, problem: 'playing on rewrote an older season row' };
  return { s };
}
const tick = (ms = 20) => act(async () => { await new Promise(r => setTimeout(r, ms)); });
const realRandom = Math.random;

beforeEach(() => {
  localStorage.clear();
  try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* jsdom */ }
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  if (!('IntersectionObserver' in window)) vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } });
  if (!('ResizeObserver' in window)) vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  window.scrollTo = (() => undefined) as typeof window.scrollTo;
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); Math.random = realRandom; });
afterAll(async () => { await new Promise(r => setTimeout(r, 1500)); });

const file = path.resolve(process.cwd(), '.rc/x/rv-saves-base.json');
const saves: { seed: number; kind: string; year: number; seasons: number; save: CareerState }[] = JSON.parse(fs.readFileSync(file, 'utf8'));
const fresh = (i: number): CareerState => JSON.parse(JSON.stringify(saves[i].save));

describe('reviewer probe: base saves of the uncovered kinds on the merged tree', () => {
  it('every save loads and plays two more seasons', () => {
    const problems: string[] = [];
    let carried = 0, dugout = 0, worldRows = 0;
    for (const [i, held] of saves.entries()) {
      const tag = `save ${i} (seed ${held.seed}, ${held.kind}, ${held.year})`;
      if (!isSoccerCareerSave(fresh(i))) { problems.push(`${tag}: the page's own check refuses it`); continue; }
      let loaded: CareerState;
      try { loaded = E.repairCareer(fresh(i)); } catch (e) { problems.push(`${tag}: repairCareer threw ${(e as Error).message}`); continue; }
      if (JSON.stringify(loaded.seasons) !== JSON.stringify(held.save.seasons)) problems.push(`${tag}: loading changed a finished season row`);
      if (held.kind.startsWith('dugout')) {
        try {
          let s = loaded; Math.random = seeded(6000 + i);
          for (let k = 0; k < 3; k++) s = E.advanceManagerSeason(s, clubs);
          dugout += 1;
          if (!isSoccerCareerSave(JSON.parse(JSON.stringify(s)))) problems.push(`${tag}: the dugout save after three seasons fails the page check`);
          console.log(`[rv old] ${tag}: three more dugout seasons, phase ${s.phase}, leagueWorld ${(s as any).leagueWorld ? 'held' : 'none'}, ${JSON.stringify(s).length} bytes`);
        } catch (e) { problems.push(`${tag}: the dugout threw ${(e as Error).message.slice(0, 200)}`); }
        continue;
      }
      if (loaded.retired) continue;
      const r = playOn(loaded, 4000 + i, 2);
      if (r.problem) { problems.push(`${tag}: ${r.problem}`); continue; }
      carried += 1;
      worldRows += r.s.seasons.slice(held.save.seasons.length).filter((x: any) => x.leagueWorld).length;
    }
    console.log(`[rv old] ${saves.length} base saves, ${carried} carried two seasons, ${dugout} dugout saves carried, ${worldRows} new rows hold a league world, ${problems.length} problems`);
    for (const p of problems.slice(0, 40)) console.log(`[rv old] PROBLEM ${p}`);
    expect(problems).toEqual([]);
  });

  it('a frozen out card saved by the base still offers every choice it offered', () => {
    const problems: string[] = [];
    for (const [i, held] of saves.entries()) {
      if (!held.kind.startsWith('transfer_window:frozen_out')) continue;
      const tag = `save ${i} (${held.kind})`;
      const sit: any = held.save.transferSituation;
      const loaded = E.repairCareer(fresh(i));
      if ((loaded.transferSituation as any)?.type !== 'frozen_out') problems.push(`${tag}: loading turned the card into ${(loaded.transferSituation as any)?.type}`);
      if (loaded.currentClub !== held.save.currentClub) problems.push(`${tag}: loading moved him from ${held.save.currentClub} to ${loaded.currentClub}`);
      if (sit.mode !== 'released') {
        const stay = E.stayAtClub(E.repairCareer(fresh(i)));
        if (stay.phase !== 'playing' || stay.currentClub !== held.save.currentClub) problems.push(`${tag}: refusing to leave gives phase ${stay.phase} at ${stay.currentClub}`);
        const r = playOn(stay, 5000 + i, 1);
        if (r.problem) problems.push(`${tag}: after refusing, ${r.problem}`);
      }
      for (const [k, offer] of (sit.offers as any[]).entries()) {
        let moved: CareerState;
        try { moved = offer.isLoan ? E.acceptLoan(E.repairCareer(fresh(i)), offer) : E.acceptOffer(E.repairCareer(fresh(i)), offer); }
        catch (e) { problems.push(`${tag}: offer ${k} threw ${(e as Error).message.slice(0, 160)}`); continue; }
        if (moved.currentClub !== offer.club.name) problems.push(`${tag}: offer ${k} to ${offer.club.name} left him at ${moved.currentClub}`);
        const r = playOn(moved, 5100 + i * 10 + k, 1);
        if (r.problem) problems.push(`${tag}: after offer ${k}, ${r.problem}`);
      }
      console.log(`[rv old] ${tag}: ${sit.offers.length} offers (${sit.offers.map((o: any) => `${o.club.name}${o.isLoan ? ' loan' : ''}`).join(', ')}), every choice played on`);
    }
    for (const p of problems) console.log(`[rv old] PROBLEM ${p}`);
    expect(problems).toEqual([]);
  });

  it('an appeal result saved by the base: a rejected appeal now costs games, an upheld one does not', () => {
    const problems: string[] = [];
    for (const [i, held] of saves.entries()) {
      const tag = `save ${i} (${held.kind})`;
      const res: any = held.save.pendingAppealResult;
      if (held.kind === 'red_card_appeal_result') {
        const after = E.dismissAppealResult(E.repairCareer(fresh(i)), clubs) as any;
        const want = res.success ? undefined : res.banLength;
        if (after.pendingSuspensionMatches !== want) problems.push(`${tag}: appeal ${res.success ? 'upheld' : 'rejected'} (${res.banLength}), queued ${after.pendingSuspensionMatches}`);
        const r = playOn(after, 5300 + i, 1);
        if (r.problem) { problems.push(`${tag}: ${r.problem}`); continue; }
        const row: any = r.s.seasons.filter((x: any) => x.type === 'playing').at(-1);
        const owed = (r.s as any).pendingSuspensionMatches ?? 0;
        console.log(`[rv old] ${tag}: appeal ${res.success ? 'upheld' : `rejected, ban ${res.banLength}`}; queued ${after.pendingSuspensionMatches ?? 0}; next season ${row.year} apps ${row.apps}, league apps ${row.leagueApps}, served ${row.suspensionMatches ?? 0}, still owed ${owed}`);
        if (!res.success && (row.suspensionMatches ?? 0) + owed !== res.banLength) problems.push(`${tag}: served ${row.suspensionMatches ?? 0} plus owed ${owed} is not the ban of ${res.banLength}`);
      }
      if (held.kind === 'random_events:appeal_waiting') {
        const r = playOn(E.repairCareer(fresh(i)), 5400 + i, 1);
        if (r.problem) { problems.push(`${tag}: ${r.problem}`); continue; }
        console.log(`[rv old] ${tag}: base left an appeal (${res.success ? 'upheld' : `rejected, ban ${res.banLength}`}) behind ${held.save.pendingEvents.length} cards; a season later the result is ${r.s.pendingAppealResult ? 'STILL WAITING, never shown' : 'gone'}, owed ${(r.s as any).pendingSuspensionMatches ?? 0}`);
      }
    }
    for (const p of problems) console.log(`[rv old] PROBLEM ${p}`);
    expect(problems).toEqual([]);
  });

  it('the page mounts on every base save and keeps it', async () => {
    const problems: string[] = [];
    let mounted = 0;
    for (const [i, held] of saves.entries()) {
      localStorage.clear();
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem(SAVE_KEY, JSON.stringify(held.save));
      Math.random = seeded(7000 + i);
      try {
        const view = render(<HelmetProvider><MemoryRouter><SoccerCareer /></MemoryRouter></HelmetProvider>);
        await tick(40);
        const text = view.container.textContent ?? '';
        if (text.length < 200) problems.push(`save ${i} (${held.kind}): the page drew ${text.length} characters`);
        if (/page broke|Something went wrong/i.test(text)) problems.push(`save ${i} (${held.kind}): the page shows its error screen`);
        const back = localStorage.getItem(SAVE_KEY);
        if (!back || !isSoccerCareerSave(JSON.parse(back))) problems.push(`save ${i} (${held.kind}): the save in storage after mounting fails the page's check`);
        else {
          const now = JSON.parse(back);
          if (JSON.stringify(now.seasons) !== JSON.stringify(held.save.seasons)) problems.push(`save ${i} (${held.kind}): mounting rewrote a season row`);
          if (now.currentClub !== held.save.currentClub || now.phase !== held.save.phase) problems.push(`save ${i} (${held.kind}): mounting moved him (${held.save.currentClub}/${held.save.phase} to ${now.currentClub}/${now.phase})`);
        }
        if (held.kind.startsWith('transfer_window:frozen_out')) {
          const sit: any = held.save.transferSituation;
          const missing = (sit.offers as any[]).filter(o => !text.includes(o.club.name)).map(o => o.club.name);
          const buttons = [...view.container.querySelectorAll('button')].map(b => (b.textContent ?? '').replace(/\s+/g, ' ').trim()).filter(t => /stay|refus|accept|sign|join|loan|fight/i.test(t)).slice(0, 8);
          console.log(`[rv old] save ${i} (${held.kind}) on the page: club move card ${view.container.querySelector('[data-club-move]') ? 'SHOWN' : 'not shown'}, offers named ${sit.offers.length - missing.length}/${sit.offers.length}, buttons: ${buttons.join(' / ')}`);
          if (missing.length) problems.push(`save ${i} (${held.kind}): the card does not name ${missing.join(', ')}`);
        }
        mounted += 1;
        view.unmount();
      } catch (e) { problems.push(`save ${i} (${held.kind}): mount threw ${(e as Error).message.slice(0, 200)}`); }
      cleanup();
    }
    console.log(`[rv old] page mounted on ${mounted}/${saves.length} base saves, ${problems.length} problems`);
    for (const p of problems.slice(0, 20)) console.log(`[rv old] PROBLEM ${p}`);
    expect(problems).toEqual([]);
  });
});
