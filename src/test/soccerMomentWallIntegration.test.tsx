import { useCallback, useState, isValidElement, type ComponentProps } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as E from '@/lib/soccerCareerEngine';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { deriveSeason, planMoments, type DerivedSeason, type Moment } from '@/lib/season/core';
import { SOCCER, buildSoccerSeasonCtx, type SoccerSeasonCtx } from '@/lib/season/soccer';
import {
  MOMENT_BOARD, MOMENT_HOW, momentRound, momentSeed, momentSetup,
  momentShotRng, packMomentInput, settleMoment,
} from '@/lib/season/soccerMoments';
import { WALL_SHOT_HOW, type WallShotSetup } from '@/lib/careerDrills';
import { ledgerOf, ledgerPut, readSeasonMoments } from '@/lib/season/momentsSave';
import { useSoccerMoments } from '@/components/soccer-career/useSoccerMoments';
import SoccerMomentBoard from '@/components/soccer-career/SoccerMomentBoard';
import { MomentHost, type CentreMoment, type CentreMoments, type MomentVerdict } from '@/components/season-centre/MomentHost';

interface Spot {
  career: CareerState; row: SeasonRecord; ctx: SoccerSeasonCtx;
  key: string; plan: DerivedSeason; offered: Moment[]; wall: Moment;
}
let spot: Spot;

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The existing own-goals test's passive engine path, stopped at a real offered wall moment.
function nextCareer(s: CareerState): CareerState | null {
  const clubs = E.FALLBACK_CLUBS;
  switch (s.phase as string) {
    case 'youth': return E.advanceYouthYear(s, clubs);
    case 'contract_offer': { const offers = s.pendingOffers || []; return offers.length ? E.acceptOffer(s, offers[0]) : { ...s, phase: 'playing' }; }
    case 'playing': return E.advanceProSeason(s, clubs);
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, clubs);
    case 'ballon_dor': return E.dismissBallonDor(s, clubs);
    case 'international_debut': return E.dismissDebut(s, clubs);
    case 'world_cup': return E.dismissWorldCup(s, clubs);
    case 'rivalry_event': return E.dismissRivalryEvent(s, clubs);
    case 'social_media_action': return E.dismissSocialMediaPhase(s, clubs);
    case 'moral_dilemma': return E.dismissMoralDilemma(s, clubs);
    case 'random_events': return s.pendingEvents?.[0] ? E.applyEventChoice(s, 0, clubs) : { ...s, pendingEvents: [], phase: 'playing' };
    case 'red_card_appeal_result': return E.dismissAppealResult(s, clubs);
    case 'rehab_choice': return E.applyRehabChoice(s, 0);
    case 'transfer_window': return E.stayAtClub(s);
    default: return null;
  }
}

function findSpot(): Spot {
  const originalRandom = Math.random;
  try {
    for (let seed = 0; seed < 6; seed += 1) {
      Math.random = seeded(1454 + seed * 7919);
      const o = 76 + seed;
      const ability = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o };
      let live: CareerState | null = E.initCareer('Moment rules fixture ' + seed, 'England', 'ST', '2010-14', ability, o, 2010, E.FALLBACK_CLUBS, null, 92);
      for (let step = 0; step < 160 && live && !live.retired; step += 1) {
        const oldSeasons = live.seasons.length;
        live = nextCareer(live);
        if (!live || live.seasons.length <= oldSeasons) continue;
        const career = JSON.parse(JSON.stringify(live)) as CareerState;
        const row = career.seasons[career.seasons.length - 1];
        if (!row || row.type !== 'playing' || row.apps <= 0) continue;
        const ctx = buildSoccerSeasonCtx(career, E.FALLBACK_CLUBS, row);
        const key = SOCCER.seasonKey(row, ctx);
        const plan = deriveSeason(SOCCER, row, ctx);
        if (!key || !plan) continue;
        const offered = planMoments(SOCCER, row, ctx, plan);
        const wall = offered.find(m => MOMENT_BOARD[m.kind as keyof typeof MOMENT_BOARD] === 'wallshot');
        if (wall && offered.length >= 2) return { career, row, ctx, key, plan, offered, wall };
      }
    }
  } finally { Math.random = originalRandom; }
  throw new Error('MOMENT_HOOK_REAL_WALL_FIXTURE_NOT_FOUND');
}

beforeAll(() => {
  spot = findSpot();
  expect(spot.career.seasonMoments, 'MOMENT_HOOK_REAL_FIXTURE_HAS_NO_LEDGER').toBeUndefined();
}, 120_000);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

function controller(initial: CareerState) {
  return renderHook(() => {
    const [career, setCareer] = useState(initial);
    const onCareer = useCallback((fn: (previous: CareerState) => CareerState) => setCareer(fn), []);
    const ledger = readSeasonMoments(career.seasonMoments);
    const entriesKey = JSON.stringify(ledgerOf(ledger, spot.key));
    const model = useSoccerMoments({
      career, row: spot.row, ctx: spot.ctx, plan: spot.plan, key: spot.key,
      offered: spot.offered, entriesKey, banked: ledger?.key === spot.key && ledger.banked === 1,
      onCareer,
    });
    return { career, setCareer, model, entriesKey };
  });
}

function modelOf(value: CentreMoments | null): CentreMoments {
  if (!value) throw new Error('MOMENT_HOOK_REAL_MODEL_REQUIRED');
  return value;
}
function wallOf(model: CentreMoments): CentreMoment {
  const wall = model.list.find(m => m.md === spot.wall.md && m.id === spot.wall.id);
  if (!wall) throw new Error('MOMENT_HOOK_REAL_WALL_OFFER_REQUIRED');
  return wall;
}
function nodeOf(model: CentreMoments, moment: CentreMoment, done: (input: number[]) => void) {
  const node = model.board(moment, done);
  if (!isValidElement<ComponentProps<typeof SoccerMomentBoard>>(node)) throw new Error('MOMENT_HOOK_REAL_BOARD_ELEMENT_REQUIRED');
  expect(node.type, 'MOMENT_HOOK_ACTUAL_BOARD_COMPONENT').toBe(SoccerMomentBoard);
  return node;
}
function shotContext() {
  const seed = momentSeed(spot.key, spot.wall.md, spot.wall.id);
  const round = momentRound(spot.wall.stakes);
  const legacy = momentSetup('wallshot', seed, round) as WallShotSetup;
  return { seed, round, legacy };
}
function withoutLedger(career: CareerState) {
  const copy = { ...career };
  delete copy.seasonMoments;
  return copy;
}
function entryOf(career: CareerState) {
  const entry = ledgerOf(career.seasonMoments, spot.key).find(e => e[0] === spot.wall.md && e[1] === spot.wall.id);
  if (!entry) throw new Error('MOMENT_HOOK_ACTUAL_ENTRY_REQUIRED');
  return entry;
}
async function mountBoard(node: ReturnType<typeof nodeOf>) {
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(<MemoryRouter>{node}</MemoryRouter>);
    await Promise.resolve();
  });
  return view;
}
function playKeyboardShot(view: ReturnType<typeof render>) {
  fireEvent.click(view.getByRole('button', { name: 'Start' }));
  for (let i = 0; i < 13; i += 1) fireEvent.keyDown(window, { key: 'ArrowRight' });
  fireEvent.keyDown(window, { key: 'ArrowUp' });
  fireEvent.keyDown(window, { key: ' ' });
  act(() => { vi.advanceTimersByTime(1000); });
}

describe('Soccer moment wall rule hook and board integration', () => {
  it('claims new rule two before the actual five-defender shot, then reloads the exact settled entry as spent', async () => {
    const live = controller(spot.career);
    const offered = wallOf(modelOf(live.result.current.model));
    expect(offered.taken).toBeNull();
    expect(offered.how, 'MOMENT_HOOK_NEW_HOW').toBe(WALL_SHOT_HOW);
    await act(async () => { await modelOf(live.result.current.model).preload(offered); });
    expect(live.result.current.career, 'MOMENT_HOOK_PRELOAD_READ_ONLY').toEqual(spot.career);
    act(() => { modelOf(live.result.current.model).use(offered); });
    expect(live.result.current.career.seasonMoments?.wallShotRules, 'MOMENT_HOOK_ATOMIC_RULE_TWO').toBe(2);
    expect(entryOf(live.result.current.career), 'MOMENT_HOOK_USED_BEFORE_BOARD').toEqual([spot.wall.md, spot.wall.id, -1]);
    expect(withoutLedger(live.result.current.career), 'MOMENT_HOOK_CLAIM_ONLY_LEDGER').toEqual(withoutLedger(spot.career));
    let reported: MomentVerdict | null = null;
    const node = nodeOf(modelOf(live.result.current.model), offered, input => {
      reported = modelOf(live.result.current.model).settle(offered, input);
    });
    expect(node.props.wallShotRules, 'MOMENT_HOOK_BOARD_PINNED_RULE').toBe(2);
    const context = shotContext();
    const actualStream = node.props.rng();
    const legacyStream = momentShotRng(spot.key, spot.wall.md, spot.wall.id, context.legacy);
    expect(Array.from({ length: 8 }, () => actualStream()), 'MOMENT_HOOK_LEGACY_STREAM_IDENTITY').toEqual(Array.from({ length: 8 }, () => legacyStream()));
    const view = await mountBoard(node);
    expect(view.container.querySelectorAll('[data-wall-defender]').length, 'MOMENT_HOOK_REAL_FIVE_DEFENDERS').toBe(5);
    expect(view.container.querySelector('[data-drill-board]')?.getAttribute('data-wall-shot-rules')).toBe('2');
    playKeyboardShot(view);
    const packed = packMomentInput([0.78, 0.85, 0.65, 0]);
    const expected = settleMoment('wallshot', { ...context.legacy, wallShotRules: 2 }, packed, momentShotRng(spot.key, spot.wall.md, spot.wall.id, context.legacy));
    expect(reported, 'MOMENT_HOOK_ACTUAL_PACKED_VERDICT').toMatchObject({ made: expected.won, stars: expected.stars, verdict: expected.verdict });
    expect(entryOf(live.result.current.career), 'MOMENT_HOOK_ACTUAL_PACKED_ENTRY').toEqual([spot.wall.md, spot.wall.id, expected.stars, ...packed]);
    const saved = JSON.stringify(live.result.current.career);
    view.unmount();
    live.unmount();
    const restored = controller(JSON.parse(saved) as CareerState);
    const model = modelOf(restored.result.current.model);
    const taken = wallOf(model);
    expect(taken.taken, 'MOMENT_HOOK_RELOADED_STARS').toEqual({ stars: expected.stars, made: expected.stars >= 1 });
    const host = render(<MomentHost moment={taken} moments={model} scoreLine="Saved moment" reduced onDone={() => {}} />);
    expect(host.container.querySelector('[data-moment-spent]'), 'MOMENT_HOOK_RELOADED_SPENT_HOST').not.toBeNull();
    expect(host.container.querySelector('[data-moment-take]'), 'MOMENT_HOOK_RELOADED_NO_SECOND_ATTEMPT').toBeNull();
    expect(JSON.stringify(restored.result.current.career), 'MOMENT_HOOK_RELOAD_RAW_HELD').toBe(saved);
  });

  it('keeps an existing unmarked season on the actual legacy board and exact legacy settlement', async () => {
    const other = spot.offered.find(m => m !== spot.wall)!;
    const legacyLedger = ledgerPut(null, spot.key, other.md, other.id, 1, [0.2]);
    const live = controller({ ...spot.career, seasonMoments: legacyLedger });
    const offered = wallOf(modelOf(live.result.current.model));
    expect(offered.how, 'MOMENT_HOOK_LEGACY_HOW').toBe(MOMENT_HOW.wallshot);
    await act(async () => { await modelOf(live.result.current.model).preload(offered); });
    act(() => { modelOf(live.result.current.model).use(offered); });
    expect(live.result.current.career.seasonMoments?.wallShotRules, 'MOMENT_HOOK_LEGACY_NOT_UPGRADED').toBeUndefined();
    const node = nodeOf(modelOf(live.result.current.model), offered, input => { modelOf(live.result.current.model).settle(offered, input); });
    expect(node.props.wallShotRules, 'MOMENT_HOOK_LEGACY_RULE_PROP').toBe(1);
    const view = await mountBoard(node);
    expect(view.container.querySelectorAll('[data-drill-player="wall"]').length, 'MOMENT_HOOK_REAL_LEGACY_WALL').toBeGreaterThan(5);
    expect(view.container.querySelectorAll('[data-wall-defender]').length).toBe(0);
    playKeyboardShot(view);
    const context = shotContext();
    const packed = packMomentInput([0.78, 0.85, 0.65, 0]);
    const expected = settleMoment('wallshot', context.legacy, packed, momentShotRng(spot.key, spot.wall.md, spot.wall.id, context.legacy));
    expect(entryOf(live.result.current.career), 'MOMENT_HOOK_LEGACY_EXACT_SETTLE').toEqual([spot.wall.md, spot.wall.id, expected.stars, ...packed]);
    expect(live.result.current.career.seasonMoments?.wallShotRules).toBeUndefined();
    expect(ledgerOf(live.result.current.career.seasonMoments, spot.key).find(e => e[0] === other.md && e[1] === other.id)).toEqual(legacyLedger.m[0]);
    const restored = readSeasonMoments(JSON.parse(JSON.stringify(live.result.current.career.seasonMoments)));
    expect(restored, 'MOMENT_HOOK_LEGACY_RELOAD_EXACT').toEqual(live.result.current.career.seasonMoments);
  });

  it('retains an unsupported future ledger and its taken result while refusing new play', async () => {
    const held = { ...ledgerPut(null, spot.key, spot.wall.md, spot.wall.id, 2, [0.2]), wallShotRules: 65536 };
    const initial = { ...spot.career, seasonMoments: held };
    const live = controller(initial);
    const model = modelOf(live.result.current.model);
    expect(model.list.map(m => [m.md, m.id]), 'MOMENT_HOOK_FUTURE_TAKEN_ONLY').toEqual([[spot.wall.md, spot.wall.id]]);
    expect(wallOf(model).taken, 'MOMENT_HOOK_FUTURE_STARS_RETAINED').toEqual({ stars: 2, made: true });
    expect(model.review.join(' '), 'MOMENT_HOOK_FUTURE_EXPLANATION').toContain('unsupported version');
    const other = spot.offered.find(m => m !== spot.wall)!;
    const request = { ...wallOf(model), md: other.md, id: other.id, taken: null };
    await expect(model.preload(request), 'MOMENT_HOOK_FUTURE_PRELOAD_REFUSED').rejects.toThrow('moment unavailable');
    expect(model.board(request, () => {}), 'MOMENT_HOOK_FUTURE_NO_BOARD').toBeNull();
    act(() => { model.use(request); });
    let verdict: MomentVerdict | null = null;
    act(() => { verdict = model.settle(request, [0.78, 0.85, 0.65, 0]); });
    expect(verdict, 'MOMENT_HOOK_FUTURE_NO_RESULT').toEqual({ made: false, stars: 0, verdict: '', after: '', wonMatch: false });
    expect(live.result.current.career, 'MOMENT_HOOK_FUTURE_CAREER_HELD').toEqual(initial);
    expect(JSON.stringify(live.result.current.career.seasonMoments), 'MOMENT_HOOK_FUTURE_LEDGER_RAW_HELD').toBe(JSON.stringify(held));
    expect(localStorage.length, 'MOMENT_HOOK_FUTURE_NO_DAILY_ATTEMPT').toBe(0);
    // Banking stored earned stars remains the unchanged consumer's policy.
  });

  it('recomputes the actual model when only the saved marker changes and entries stay identical', () => {
    const initial = { ...spot.career, seasonMoments: { v: 1 as const, key: spot.key, m: [], wallShotRules: 2 } };
    const live = controller(initial);
    const first = modelOf(live.result.current.model);
    const entriesKey = live.result.current.entriesKey;
    expect(wallOf(first).how).toBe(WALL_SHOT_HOW);
    act(() => { live.result.current.setCareer(previous => ({ ...previous, seasonMoments: { ...previous.seasonMoments!, wallShotRules: 1 } })); });
    const legacy = modelOf(live.result.current.model);
    expect(live.result.current.entriesKey, 'MOMENT_HOOK_MARKER_ONLY_SAME_ENTRIES').toBe(entriesKey);
    expect(legacy, 'MOMENT_HOOK_MARKER_ONLY_REBUILT').not.toBe(first);
    expect(wallOf(legacy).how, 'MOMENT_HOOK_MARKER_ONLY_LEGACY_HOW').toBe(MOMENT_HOW.wallshot);
    expect(nodeOf(legacy, wallOf(legacy), () => {}).props.wallShotRules, 'MOMENT_HOOK_MARKER_ONLY_LEGACY_BOARD').toBe(1);
    act(() => { live.result.current.setCareer(previous => ({ ...previous, seasonMoments: { ...previous.seasonMoments!, wallShotRules: 65536 } })); });
    const future = modelOf(live.result.current.model);
    expect(live.result.current.entriesKey).toBe(entriesKey);
    expect(future.list, 'MOMENT_HOOK_MARKER_ONLY_FUTURE_NO_UNTAKEN').toEqual([]);
    expect(future.review.join(' ')).toContain('unsupported version');
    act(() => { live.result.current.setCareer(previous => ({ ...previous, seasonMoments: { ...previous.seasonMoments!, wallShotRules: 2 } })); });
    const current = modelOf(live.result.current.model);
    expect(wallOf(current).how, 'MOMENT_HOOK_MARKER_ONLY_MODERN_RESTORED').toBe(WALL_SHOT_HOW);
    expect(nodeOf(current, wallOf(current), () => {}).props.wallShotRules).toBe(2);
  });

  it('does not let captured supported callbacks overwrite a newer actual rule marker', () => {
    const live = controller(spot.career);
    const captured = modelOf(live.result.current.model);
    const offered = wallOf(captured);
    for (const wallShotRules of [1, 65536]) {
      const held = { ...spot.career, seasonMoments: { v: 1 as const, key: spot.key, m: [], wallShotRules } };
      act(() => { live.result.current.setCareer(held); });
      act(() => { captured.use(offered); });
      expect(live.result.current.career, 'MOMENT_HOOK_STALE_CLAIM_HELD').toEqual(held);
      const used = { ...held, seasonMoments: ledgerPut(held.seasonMoments, spot.key, spot.wall.md, spot.wall.id, -1, []) };
      act(() => { live.result.current.setCareer(used); });
      act(() => { captured.settle(offered, [0.78, 0.85, 0.65, 0]); });
      expect(live.result.current.career, 'MOMENT_HOOK_STALE_SETTLEMENT_HELD').toEqual(used);
    }
  });
});
