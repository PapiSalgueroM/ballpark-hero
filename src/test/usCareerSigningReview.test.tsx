import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), dismiss: vi.fn(), message: vi.fn(), info: vi.fn(), warning: vi.fn(), loading: vi.fn() } }));

import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import FreeAgencyPanel from '@/components/us-career/FreeAgencyPanel';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import { openMarketFreeAgency } from '@/lib/usCareerMarket';
import type { FaWindow } from '@/lib/usCareerFreeAgency';
import type { UsCareerSport } from '@/lib/usCareerSport';

const REVIEW_SPORTS = [NBA_CAREER_SPORT, NFL_CAREER_SPORT];
const LEGACY_SPORTS = [MLB_CAREER_SPORT, NHL_CAREER_SPORT];
type View = ReturnType<typeof render>;

function raw(name: string, value: unknown) {
  const dir = process.env.US_CAREER_SIGNING_REVIEW_RAW;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, name + '.json'), JSON.stringify({ schema: 1, ...value as object }, null, 2) + '\n');
}

function fixture(sport: UsCareerSport) {
  const pos = sport.create.defaultPos;
  const c = sport.startCareer('Contract Review', pos, sport.create.archetypes[pos][0], () => 0.6, defaultAppearance(), 'now');
  c.contractYears = 0;
  c.ovr = 85;
  c.role = 'starter';
  const talk = openMarketFreeAgency(c, sport.slug, sport.buildFaWindow(c, 80, () => 0.6));
  if (talk.kind !== 'freeagency' || !talk.window.offers[1] || talk.window.offers[1].gone) throw new Error('Fixture needs a live outside offer');
  const frame = { c, phase: 'freeagency', teamQuality: 80, coach: null, contractTalk: talk };
  return { sport, frame, window: talk.window, offer: structuredClone(talk.window.offers[1]), bytes: JSON.stringify(frame) };
}

function mount(sport: UsCareerSport) {
  return render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
}

function sign(view: View, index = 1) {
  const card = view.container.querySelector<HTMLElement>(`[data-fa-offer="${index}"]`);
  if (!card) throw new Error('Actual offer card is missing');
  return within(card).getByRole('button', { name: 'Sign' });
}

function observeWrites() {
  const writes: { key: string; value: string }[] = [];
  const actual = Storage.prototype.setItem;
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
    writes.push({ key, value });
    return actual.call(this, key, value);
  });
  return { writes, spy };
}

function observeDraws() {
  const tape: number[] = [];
  const spy = vi.spyOn(Math, 'random').mockImplementation(() => { tape.push(0.4); return 0.4; });
  return { tape, spy };
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2032-07-01T12:00:00.000Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.6);
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener: vi.fn(), removeListener: vi.fn() })));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('US free agency signing review', () => {
  it('NBA and NFL review and Back preserve the complete saved career without signing or drawing', () => {
    const inputs = REVIEW_SPORTS.map(fixture);
    const rows = inputs.map(input => {
      localStorage.setItem(input.sport.saveKey, input.bytes);
      const writes = observeWrites(), draws = observeDraws(), camp = vi.spyOn(input.sport, 'campBattle');
      const view = mount(input.sport);
      fireEvent.click(sign(view));
      const opening = { bytes: localStorage.getItem(input.sport.saveKey), writes: [...writes.writes], tape: [...draws.tape], campCalls: camp.mock.calls.length };
      const back = within(view.baseElement).queryByRole('button', { name: 'Back to offers' });
      const reviewText = view.baseElement.querySelector('[data-fa-sign-review]')?.textContent ?? null;
      if (back) fireEvent.click(back);
      const row = { sport: input.sport.slug, before: input.bytes, offer: input.offer, opening, reviewText, backAvailable: !!back,
        afterBack: { bytes: localStorage.getItem(input.sport.saveKey), writes: [...writes.writes], tape: [...draws.tape], campCalls: camp.mock.calls.length },
        inputHeld: input.bytes === JSON.stringify(input.frame) };
      view.unmount(); writes.spy.mockRestore(); draws.spy.mockRestore(); camp.mockRestore();
      return row;
    });
    raw('review-back', { rows });
    for (const row of rows) {
      expect(row.opening.bytes, 'US_FA_REVIEW_READ_ONLY').toBe(row.before);
      expect(row.opening.writes).toEqual([]); expect(row.opening.tape).toEqual([]); expect(row.opening.campCalls).toBe(0);
      expect(row.backAvailable).toBe(true);
      expect(row.reviewText).toContain(row.offer.label);
      expect(row.reviewText).toContain(`$${row.offer.salary}M`);
      expect(row.reviewText).toContain(String(row.offer.years));
      expect(row.reviewText).toContain(String(row.offer.quality));
      expect(row.afterBack.bytes).toBe(row.before);
      expect(row.afterBack.writes).toEqual([]); expect(row.afterBack.tape).toEqual([]); expect(row.afterBack.campCalls).toBe(0);
      expect(row.inputHeld).toBe(true);
    }
  });

  it('refuses replaced withdrawn missing and mutated quotes instead of signing a reused offer index', () => {
    const input = fixture(NBA_CAREER_SPORT);
    const mutations: [string, (w: FaWindow) => FaWindow][] = [
      ['new-window', w => structuredClone(w)],
      ['refreshed-window-same-offer', w => ({ ...w })],
      ['replaced-offer-same-terms', w => { w.offers[1] = { ...w.offers[1] }; return w; }],
      ['reused-index', w => { [w.offers[1], w.offers[2]] = [w.offers[2], w.offers[1]]; return w; }],
      ['salary', w => { w.offers[1].salary += 1; return w; }],
      ['years', w => { w.offers[1].years = w.offers[1].years === 5 ? 4 : 5; return w; }],
      ['quality', w => { w.offers[1].quality -= 1; return w; }],
      ['label', w => { w.offers[1].label += ' updated'; return w; }],
      ['withdrawn', w => { w.offers[1].gone = true; w.offers[1].pushed = true; return w; }],
      ['missing', w => { w.offers.splice(1); return w; }],
    ];
    if (!input.window.offers[2]) throw new Error('Fixture needs two outside offers for index reuse');
    const rows = mutations.map(([kind, mutate]) => {
      const w = structuredClone(input.window), onSign = vi.fn(), onPush = vi.fn();
      const writes = observeWrites(), draws = observeDraws();
      const props = { sportNoun: 'franchise', talkLine: null, onSign, onPush, reviewSigning: true };
      const view = render(<FreeAgencyPanel window={w} {...props} />);
      fireEvent.click(sign(view));
      const callsAtReview = onSign.mock.calls.map(args => [...args]);
      const next = mutate(w), nextBefore = structuredClone(next);
      view.rerender(<FreeAgencyPanel window={next} {...props} />);
      const confirm = within(view.baseElement).queryByRole('button', { name: 'Confirm signing' });
      if (confirm) fireEvent.click(confirm);
      const row = { kind, callsAtReview, calls: onSign.mock.calls.map(args => [...args]), pushes: onPush.mock.calls.length,
        writes: [...writes.writes], tape: [...draws.tape], inputHeld: JSON.stringify(next) === JSON.stringify(nextBefore) };
      view.unmount(); writes.spy.mockRestore(); draws.spy.mockRestore();
      return row;
    });
    raw('stale-quotes', { rows });
    for (const row of rows) {
      expect(row.calls, 'US_FA_STALE_QUOTE_REFUSED').toEqual([]);
      expect(row.callsAtReview).toEqual([]); expect(row.pushes).toBe(0);
      expect(row.writes).toEqual([]); expect(row.tape).toEqual([]); expect(row.inputHeld).toBe(true);
    }
  });

  it('NBA and NFL Confirm commit exactly the original full signing result and draw tape once', () => {
    const inputs = REVIEW_SPORTS.map(fixture);
    const observations: { sport: string; before: string; opening: string | null; hadConfirm: boolean; campCalls: number; writes: { key: string; value: string }[]; offer: typeof inputs[number]['offer'] }[] = [];
    const signedResults: { sport: string; saved: unknown; tape: number[] }[] = [];
    for (const input of inputs) {
      localStorage.setItem(input.sport.saveKey, input.bytes);
      const writes = observeWrites(), draws = observeDraws(), camp = vi.spyOn(input.sport, 'campBattle');
      const view = mount(input.sport);
      fireEvent.click(sign(view));
      const opening = localStorage.getItem(input.sport.saveKey);
      const confirm = within(view.baseElement).queryByRole('button', { name: 'Confirm signing' });
      if (confirm) act(() => { fireEvent.click(confirm); fireEvent.click(confirm); });
      signedResults.push({ sport: input.sport.slug, saved: JSON.parse(localStorage.getItem(input.sport.saveKey) ?? 'null'), tape: [...draws.tape] });
      observations.push({ sport: input.sport.slug, before: input.bytes, opening, hadConfirm: !!confirm,
        campCalls: camp.mock.calls.length, writes: [...writes.writes], offer: input.offer });
      view.unmount(); writes.spy.mockRestore(); draws.spy.mockRestore(); camp.mockRestore();
    }
    raw('confirm-once', { observations, signedResults });
    for (let i = 0; i < observations.length; i++) {
      const row = observations[i], result = signedResults[i].saved as typeof inputs[number]['frame'];
      expect(row.opening, 'US_FA_CONFIRM_REQUIRED').toBe(row.before);
      expect(row.hadConfirm).toBe(true); expect(row.campCalls).toBe(1); expect(row.writes).toHaveLength(1);
      expect(row.writes[0].key).toBe(inputs[i].sport.saveKey);
      expect(row.writes[0].value).toBe(JSON.stringify(signedResults[i].saved));
      expect(result.phase).toBe('season'); expect(result.teamQuality).toBe(row.offer.quality);
      expect(result.c.team).toBe(row.offer.team); expect(result.c.salary).toBe(row.offer.salary); expect(result.c.contractYears).toBe(row.offer.years);
      expect(result.c.fanbase).toBe(40); expect(result.c.morale).toBe(Math.min(100, inputs[i].frame.c.morale + 6));
      expect(result.c.seasons).toEqual(inputs[i].frame.c.seasons); expect(result.c.earnings).toBe(inputs[i].frame.c.earnings);
    }
  });

  it('default panel and MLB and NHL boards preserve immediate signing with the original index', () => {
    const inputs = LEGACY_SPORTS.map(fixture), w = structuredClone(inputs[0].window), onSign = vi.fn(), onPush = vi.fn();
    const panel = render(<FreeAgencyPanel window={w} sportNoun="club" talkLine={null} onSign={onSign} onPush={onPush} />);
    fireEvent.click(sign(panel));
    const defaultCalls = onSign.mock.calls.map(args => [...args]);
    const defaultReview = !!panel.container.querySelector('[data-fa-sign-review]');
    panel.unmount();
    const rows = inputs.map(input => {
      localStorage.setItem(input.sport.saveKey, input.bytes);
      const writes = observeWrites(), camp = vi.spyOn(input.sport, 'campBattle'), draws = observeDraws();
      const view = mount(input.sport);
      fireEvent.click(sign(view));
      const saved = JSON.parse(localStorage.getItem(input.sport.saveKey) ?? 'null');
      const row = { sport: input.sport.slug, saved, tape: [...draws.tape], writes: [...writes.writes], campCalls: camp.mock.calls.length,
        review: !!view.container.querySelector('[data-fa-sign-review]'), offer: input.offer };
      view.unmount(); writes.spy.mockRestore(); camp.mockRestore(); draws.spy.mockRestore();
      return row;
    });
    raw('legacy-immediate', { defaultCalls, defaultReview, rows });
    expect(defaultCalls).toEqual([[1]]); expect(defaultReview).toBe(false); expect(onPush).not.toHaveBeenCalled();
    for (const row of rows) {
      expect(row.review).toBe(false); expect(row.writes).toHaveLength(1); expect(row.campCalls).toBe(1);
      expect(row.saved.phase).toBe('season'); expect(row.saved.c.team).toBe(row.offer.team);
      expect(row.saved.c.salary).toBe(row.offer.salary); expect(row.saved.c.contractYears).toBe(row.offer.years);
    }
  });
});
