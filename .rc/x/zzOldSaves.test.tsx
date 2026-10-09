/* Release AQ probe, never committed. Runs on the MERGED tree: every save made by origin/main and by Release AP
   (files .rc/x/saves-main.json and .rc/x/saves-ap.json, written by zzMakeSaves.test.ts on those trees) is
   loaded the way the page loads it, its old seasons are derived again and compared with what the tree that
   made the save derived, it is carried through one more season, and the page is mounted on it. */
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
import { deriveSeason, disagreements, tableAt } from '@/lib/season/core';
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
function fingerprint(career: CareerState): Record<string, any>[] {
  return career.seasons.filter((r: any) => r.type === 'playing').map((row: any) => {
    try {
      const ctx = buildSoccerSeasonCtx(career, clubs, row);
      const s = deriveSeason(SOCCER, row, ctx);
      if (!s) return { year: row.year, club: row.club, mode: ctx.mode, why: ctx.why, derived: false };
      const games = s.games.map((g: any) => `${g.home ? 'H' : 'A'}${g.us}-${g.them}${g.played ? 'p' : 'x'}${g.line?.goals ?? 0}`).join(' ');
      const table = s.mode === 'table' ? tableAt(s, s.rounds.length).map(t => `${s.labels[t.slot].name}:${t.pts}`).join(',') : '';
      return { year: row.year, club: row.club, mode: ctx.mode, why: ctx.why, derived: true, teams: s.teams, games, table, labels: s.labels.map(l => l.name).join(','), bad: disagreements(SOCCER, row, ctx, s) };
    } catch (e) { return { year: row.year, club: row.club, error: String((e as Error).message).slice(0, 160) }; }
  });
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

describe.each(['main', 'ap'])('probe: saves made by %s on the merged tree', label => {
  const file = path.resolve(process.cwd(), `.rc/x/saves-${label}.json`);
  const saves: { seed: number; phase: string; year: number; seasons: number; why: string; save: CareerState; fp: Record<string, any>[] }[] = JSON.parse(fs.readFileSync(file, 'utf8'));

  it('loads every save, derives its old seasons as before and plays one more season', () => {
    const problems: string[] = [];
    let rows = 0, same = 0, tableRows = 0, tableSame = 0, resultsRows = 0, resultsScoresSame = 0, relabelled = 0, modeMoved = 0, worldRows = 0, carried = 0;
    for (const [i, held] of saves.entries()) {
      const tag = `${label} save ${i} (seed ${held.seed}, ${held.phase}, ${held.year}, ${held.why})`;
      const text = JSON.stringify(held.save);
      if (!isSoccerCareerSave(JSON.parse(text))) { problems.push(`${tag}: the page's own check refuses it`); continue; }
      let loaded: CareerState;
      try { loaded = E.repairCareer(JSON.parse(text)); } catch (e) { problems.push(`${tag}: repairCareer threw ${(e as Error).message}`); continue; }
      if (JSON.stringify(loaded.seasons) !== JSON.stringify(held.save.seasons)) problems.push(`${tag}: loading changed a finished season row`);
      const now = fingerprint(loaded);
      if (now.length !== held.fp.length) problems.push(`${tag}: ${held.fp.length} playing rows before, ${now.length} now`);
      for (const [k, was] of held.fp.entries()) {
        const is = now[k];
        if (!is) continue;
        rows += 1;
        if (is.error || was.error) { problems.push(`${tag} ${was.year}: derive error now "${is.error ?? ''}" before "${was.error ?? ''}"`); continue; }
        if ((is.bad ?? []).length) problems.push(`${tag} ${was.year}: the merged tree disagrees with its own row: ${is.bad.slice(0, 2).join('; ')}`);
        if (was.derived !== is.derived || was.mode !== is.mode) { modeMoved += 1; problems.push(`${tag} ${was.year} ${was.club}: was ${was.derived ? was.mode : 'not derived'} (${was.why}), now ${is.derived ? is.mode : 'not derived'} (${is.why})`); continue; }
        if (!was.derived) { same += 1; continue; }
        if (was.mode === 'table') {
          tableRows += 1;
          if (was.table === is.table && was.games === is.games && was.labels === is.labels) { tableSame += 1; same += 1; }
          else problems.push(`${tag} ${was.year} ${was.club}: a TABLE season replays differently (${was.table === is.table ? 'table same' : 'table moved'}, ${was.games === is.games ? 'scores same' : 'scores moved'}, ${was.labels === is.labels ? 'names same' : 'names moved'})`);
        } else {
          resultsRows += 1;
          if (was.games === is.games) resultsScoresSame += 1; else problems.push(`${tag} ${was.year} ${was.club}: a results season's scores moved`);
          if (was.labels !== is.labels) relabelled += 1; else same += 1;
        }
      }
      /* one more season on the merged engine */
      if (loaded.retired) continue;
      Math.random = seeded(9000 + i);
      let s = loaded;
      const before = s.seasons.length;
      try {
        for (let guard = 0; guard < 600; guard++) {
          if (s.retired || (s.seasons.length > before && (s.phase === 'playing' || s.phase === 'youth'))) break;
          s = step(s);
        }
      } catch (e) { problems.push(`${tag}: the next season threw: ${(e as Error).message.slice(0, 200)}`); continue; }
      if (!s.retired && s.seasons.length === before) { problems.push(`${tag}: no new season landed (stuck on ${s.phase})`); continue; }
      carried += 1;
      const added = s.seasons.slice(before).filter((r: any) => r.type === 'playing');
      for (const row of added as any[]) {
        if (row.leagueWorld) worldRows += 1;
        const ctx = buildSoccerSeasonCtx(s, clubs, row);
        const d = deriveSeason(SOCCER, row, ctx);
        if (d) { const bad = disagreements(SOCCER, row, ctx, d); if (bad.length) problems.push(`${tag}: new row ${row.year} disagrees: ${bad.slice(0, 2).join('; ')}`); }
      }
      if (!isSoccerCareerSave(JSON.parse(JSON.stringify(s)))) problems.push(`${tag}: the save after one more season fails the page's check`);
      if (JSON.stringify(s.seasons.slice(0, before)) !== JSON.stringify(held.save.seasons)) problems.push(`${tag}: playing on rewrote an older season row`);
    }
    console.log(`[old saves] ${label}: ${saves.length} saves, ${rows} old playing rows derived again: ${same} identical, table rows ${tableSame}/${tableRows} identical, results rows ${resultsScoresSame}/${resultsRows} same scores of which ${relabelled} gained names, mode moved ${modeMoved}; ${carried} carried through one more season, ${worldRows} new rows hold a league world`);
    for (const p of problems.slice(0, 40)) console.log(`[old saves] PROBLEM ${p}`);
    console.log(`[old saves] ${label}: ${problems.length} problems`);
    expect(problems).toEqual([]);
  });

  it('mounts the page on every save', async () => {
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
        if (text.length < 200) problems.push(`${label} save ${i} (${held.phase}): the page drew ${text.length} characters`);
        if (/page broke|Something went wrong/i.test(text)) problems.push(`${label} save ${i} (${held.phase}): the page shows its error screen`);
        const back = localStorage.getItem(SAVE_KEY);
        if (!back || !isSoccerCareerSave(JSON.parse(back))) problems.push(`${label} save ${i} (${held.phase}): the save in storage after mounting fails the page's check`);
        else if (JSON.stringify(JSON.parse(back).seasons) !== JSON.stringify(held.save.seasons)) problems.push(`${label} save ${i} (${held.phase}): mounting rewrote a season row`);
        mounted += 1;
        view.unmount();
      } catch (e) { problems.push(`${label} save ${i} (${held.phase}): mount threw ${(e as Error).message.slice(0, 200)}`); }
      cleanup();
    }
    console.log(`[old saves] ${label}: page mounted on ${mounted}/${saves.length} saves, ${problems.length} problems`);
    for (const p of problems.slice(0, 20)) console.log(`[old saves] PROBLEM ${p}`);
    expect(problems).toEqual([]);
  });
});
