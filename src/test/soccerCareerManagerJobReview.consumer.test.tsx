import React, { type ComponentType } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as E from '@/lib/soccerCareerEngine';
import { serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import type { CareerState, ClubData, ManagerState } from '@/lib/soccerCareerEngine';

type Props = {
  manager: ManagerState; career: CareerState; clubs: ClubData[];
  onAdvance: () => void; onEnd: () => void; onAcceptOffer?: (index: number) => void;
  reviewMode?: boolean; onReviewModeChange?: (enabled: boolean) => void;
};
let observed: {
  ManagerPanel: ComponentType<Props>;
  advanceManagerSeason: typeof E.advanceManagerSeason;
  loadManagerMarket: typeof E.loadManagerMarket;
};
let dispose: (() => void) | undefined;
beforeAll(async () => {
  let file = process.env.SC_MANAGER_REVIEW_OBSERVER;
  if (!file) {
    const { buildSoccerManagerJobReviewObserver } = await import('../../scripts/qa/buildSoccerManagerJobReviewObserver.mjs');
    const built = await buildSoccerManagerJobReviewObserver();
    file = built.file; dispose = built.dispose;
  }
  observed = createRequire(import.meta.url)(file);
  if (typeof observed.ManagerPanel !== 'function' || typeof observed.advanceManagerSeason !== 'function') {
    throw new Error('Actual existing ManagerPanel and its canonical engine import are required');
  }
  await Promise.all([E.loadManagerMarket(), observed.loadManagerMarket()]);
}, 60_000);
afterAll(() => { dispose?.(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function seeded<T>(seed: number, action: () => T) {
  const random = Math.random, now = Date.now, draws: number[] = [];
  let n = seed >>> 0;
  const draw = () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  Math.random = () => { const value = draw(); draws.push(value); return value; };
  Date.now = () => 1791586800000;
  try { const value = action(); const next = draw(); return { value, draws, next }; }
  finally { Math.random = random; Date.now = now; }
}
function manager(): CareerState {
  const packet = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const saved = packet.saves.find((entry: { id: string }) => entry.id === 'ere');
  if (!saved?.state) throw new Error('Existing complete recorded career ere is required');
  const input = structuredClone(saved.state) as CareerState;
  const retired = seeded(901, () => E.manualRetire({ ...input, phase: 'playing', retired: false, age: 34 })).value;
  const career = seeded(902, () => E.choosePostRetirement(retired, 'manager', E.FALLBACK_CLUBS)).value;
  const club = E.FALLBACK_CLUBS.find(row => row.name === 'Malmo FF');
  if (!club || !career.managerState) throw new Error('Existing actual tier-three club and canonical manager entry are required');
  career.managerState = { ...career.managerState, club: club.name, clubTier: club.tier, league: club.league,
    season: 2, trophies: 1, promotions: 2, seasonResults: [] };
  return career;
}
function mount(career: CareerState, onAcceptOffer?: Props['onAcceptOffer'], onReviewModeChange = vi.fn()) {
  const Panel = observed.ManagerPanel;
  render(<Panel career={career} manager={career.managerState!} clubs={E.FALLBACK_CLUBS}
    onAdvance={vi.fn()} onEnd={vi.fn()} onAcceptOffer={onAcceptOffer}
    reviewMode={false} onReviewModeChange={onReviewModeChange} />);
  return onReviewModeChange;
}
function retain(name: string, value: unknown) {
  if (!process.env.SC_MANAGER_REVIEW_CASE_OUT) return;
  const out = resolve(process.env.SC_MANAGER_REVIEW_CASE_OUT);
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, name + '.json'), JSON.stringify(value, null, 2));
}
function newPoach(before: CareerState, after: CareerState) {
  const a = before.managerState!, b = after.managerState!, row = b.seasonResults[b.seasonResults.length - 1];
  return !a.unemployed && !b.unemployed && b.club !== a.club && b.clubTier < a.clubTier
    && b.promotions === a.promotions && b.departure === 'poached' && b.season === a.season + 1
    && b.seasonResults.length === a.seasonResults.length + 1 && row.club === a.club
    && row.year === b.season && (row.playerPos === 3 || row.playerPos === 4);
}
describe('actual existing Soccer Career manager consumers', () => {
  it('employed manager can opt into reviewing earned job moves', () => {
    const career = manager(), before = serializeSoccerCareerSave(career), change = mount(career);
    const toggle = screen.queryByRole('button', { name: 'Review job moves' });
    expect(toggle, 'MISSING_MANAGER_REVIEW_MODE_CONTROL').not.toBeNull();
    fireEvent.click(toggle!);
    expect(change).toHaveBeenCalledTimes(1); expect(change).toHaveBeenCalledWith(true);
    expect(serializeSoccerCareerSave(career)).toBe(before);
  });
  it('employed manager can reopen job move rules without advancing', async () => {
    const career = manager(), before = serializeSoccerCareerSave(career), change = mount(career);
    const help = screen.queryByRole('button', { name: 'Job move rules' });
    expect(help, 'MISSING_MANAGER_REVIEW_RULES_CONTROL').not.toBeNull();
    fireEvent.click(help!);
    expect(await screen.findByRole('heading', { name: 'Review job moves' })).toBeTruthy();
    expect(change).not.toHaveBeenCalled();
    expect(serializeSoccerCareerSave(career)).toBe(before);
  });
  it('canonical default manager seasons preserve complete state save and random stream', () => {
    const input = manager(), before = structuredClone(input), raw = serializeSoccerCareerSave(input);
    let witness: { seed: number; value: CareerState; draws: number[]; next: number } | undefined;
    for (let seed = 1; seed <= 2048; seed++) {
      const run = seeded(seed, () => E.advanceManagerSeason(structuredClone(input), E.FALLBACK_CLUBS));
      if (newPoach(input, run.value)) { witness = { seed, ...run }; break; }
    }
    expect(witness, 'A genuine structurally earned canonical poach witness exists').toBeDefined();
    const seeds = [...Array.from({ length: 32 }, (_, index) => 8000 + index), witness!.seed];
    const results: unknown[] = [];
    for (const seed of seeds) {
      const expected = seeded(seed, () => E.advanceManagerSeason(structuredClone(input), E.FALLBACK_CLUBS));
      const actual = seeded(seed, () => observed.advanceManagerSeason(structuredClone(input), E.FALLBACK_CLUBS));
      expect(actual.value).toStrictEqual(expected.value);
      expect(serializeSoccerCareerSave(actual.value)).toBe(serializeSoccerCareerSave(expected.value));
      expect(actual.draws).toEqual(expected.draws);
      expect(actual.next).toBe(expected.next);
      expect(actual.draws.length).toBeGreaterThan(0);
      results.push({ seed, expected, actual, expectedSave: serializeSoccerCareerSave(expected.value), actualSave: serializeSoccerCareerSave(actual.value) });
    }
    expect(input).toStrictEqual(before); expect(serializeSoccerCareerSave(input)).toBe(raw);
    expect(newPoach(input, witness!.value)).toBe(true);
    retain('canonical-default-pairs', { input, inputSave: raw, pairs: results, witnessSeed: witness!.seed });
  }, 60_000);
  it('existing unemployed job acceptance preserves complete state save and zero draws', () => {
    const input = manager();
    input.managerState = { ...input.managerState!, unemployed: true, seasonsOut: 1, departure: 'sacked' };
    for (let seed = 1; seed <= 64 && !input.managerState.offers?.length; seed++) {
      seeded(seed, () => E.refreshManagerOffers(input, input.managerState!));
    }
    expect(input.managerState.offers!.length).toBeGreaterThan(0);
    const before = structuredClone(input), raw = serializeSoccerCareerSave(input);
    const expected = seeded(711, () => E.acceptManagerOffer(structuredClone(input), 0));
    let committed: CareerState | undefined;
    const accept = vi.fn((index: number) => { committed = E.acceptManagerOffer(input, index); });
    mount(input, accept);
    const button = screen.getByText(input.managerState.offers![0].club, { exact: true }).closest('button');
    expect(button).not.toBeNull();
    const actual = seeded(711, () => { fireEvent.click(button!); return committed; });
    expect(accept).toHaveBeenCalledTimes(1); expect(accept).toHaveBeenCalledWith(0);
    expect(actual.value).toStrictEqual(expected.value);
    expect(serializeSoccerCareerSave(actual.value!)).toBe(serializeSoccerCareerSave(expected.value));
    expect(actual.draws).toEqual(expected.draws); expect(actual.draws).toHaveLength(0); expect(actual.next).toBe(expected.next);
    expect(input).toStrictEqual(before); expect(serializeSoccerCareerSave(input)).toBe(raw);
    retain('ordinary-offer-acceptance', { input, expected, actual, expectedSave: serializeSoccerCareerSave(expected.value), actualSave: serializeSoccerCareerSave(actual.value!) });
  });
});
