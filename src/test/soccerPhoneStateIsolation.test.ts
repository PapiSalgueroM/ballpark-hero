import { afterAll, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import type { CareerState } from '@/lib/soccerCareerEngine';
import type { PhoneThread, WorldSeason } from '@/lib/soccerPhone';

const E = (process.env.PHONE_ISOLATION_ENGINE ? await import(/* @vite-ignore */ process.env.PHONE_ISOLATION_ENGINE)
  : await import('@/lib/soccerCareerEngine')) as typeof import('@/lib/soccerCareerEngine');
const P = (process.env.PHONE_ISOLATION_PHONE ? await import(/* @vite-ignore */ process.env.PHONE_ISOLATION_PHONE)
  : await import('@/lib/soccerPhone')) as typeof import('@/lib/soccerPhone');
const S = (process.env.PHONE_ISOLATION_SAVE ? await import(/* @vite-ignore */ process.env.PHONE_ISOLATION_SAVE)
  : await import('@/lib/soccerCareerSave')) as typeof import('@/lib/soccerCareerSave');
const copy = <T,>(value: T): T => structuredClone(value);
type Observation = { before: CareerState; after: CareerState; inputAfter: CareerState; draws: number[]; result?: unknown };
const observations: Record<string, Observation> = {};
function retain() {
  if (process.env.PHONE_ISOLATION_RAW) writeFileSync(process.env.PHONE_ISOLATION_RAW, JSON.stringify(observations, null, 2));
}
afterAll(retain);
function draws<T>(action: () => T): { value: T; draws: number[] } {
  const values: number[] = [], random = vi.spyOn(Math, 'random').mockImplementation(() => { values.push(0.9); return 0.9; });
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-16T16:00:00Z'));
  try { return { value: action(), draws: values }; } finally { random.mockRestore(); clock.mockRestore(); }
}
function observe(label: string, input: CareerState, action: () => CareerState, result?: () => unknown) {
  expect(observations[label], 'every raw action has a unique label').toBeUndefined();
  const before = copy(input), actual = draws(action);
  const row: Observation = { before, after: copy(actual.value), inputAfter: copy(input), draws: actual.draws };
  if (result) row.result = copy(result());
  observations[label] = row; retain();
  return { value: actual.value, row };
}
function initial(year = 2026): CareerState {
  return draws(() => {
    const stats = { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 80 };
    const state = E.initCareer('Phone Isolation Fixture', 'England', 'CM', 'modern', stats, 80, 2020, E.FALLBACK_CLUBS, null, 94);
    // Prepared playing context, not a claim about how often this phone state occurs.
    return E.repairCareer(JSON.parse(JSON.stringify({ ...state, age: year - 1996, phase: 'playing', retired: false,
      personality: 'iceman', agentId: 'self', seasons: [{ ...state.seasons[0], year, age: year - 1996, type: 'playing',
        apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7, injury: null, injuryWeeks: 0, injurySevere: false }],
      karma: 50, morale: 50, popularity: 50, events: ['Prepared fictional phone isolation context'], phoneInbox: [],
      phone: { threads: [], feed: [], world: null, clubs: {}, rivalClub: null, seed: 1, offers: 0, perksTaken: 0,
        bYear: year, bK: 0, bP: 0, bM: 0 } })));
  }).value;
}
function mum(state: CareerState): PhoneThread {
  const thread = state.phone?.threads.find(row => row.c === 'mum');
  expect(thread, 'the actual public opener must create Mum').toBeDefined();
  return thread!;
}
function caps(state: CareerState) {
  const phone = state.phone!;
  expect(phone.threads.length).toBeLessThanOrEqual(8); expect(phone.feed.length).toBeLessThanOrEqual(12);
  expect(phone.perksTaken).toBeLessThanOrEqual(6); expect(Object.keys(phone.clubs).length).toBeLessThanOrEqual(28);
  for (const thread of phone.threads) {
    expect(thread.lines.length).toBeLessThanOrEqual(6); expect(thread.seen.length).toBeLessThanOrEqual(8);
  }
}
function meters(state: CareerState) { return [state.karma, state.morale, state.popularity]; }
function budget(state: CareerState) { return [state.phone?.bYear, state.phone?.bK, state.phone?.bP, state.phone?.bM]; }
function contactIndex(state: CareerState, id: string) {
  const index = P.starterConvos(state, 'mum', 'pro').findIndex(row => row.id === id);
  expect(index, 'the real Contacts API must offer the requested conversation').toBeGreaterThanOrEqual(0);
  return index;
}
function setupAction(state: CareerState, id: string, choice: number, label: string): CareerState {
  // Explicit working copies keep fixture acquisition independent of the alias under test.
  const working = copy(state), actual = observe(label, working, () => E.answerPhoneText(working, id, choice));
  expect(actual.row.draws).toEqual([]); expect(actual.value).not.toBe(working); caps(actual.value);
  return actual.value;
}
function opened(label: string, year = 2026): CareerState {
  const state = initial(year);
  return setupAction(state, 'open:mum', contactIndex(state, 'mum_proud'), label + '-open');
}
function completed(label: string): CareerState {
  let state = opened(label);
  for (let i = 0; i < 3; i++) state = setupAction(state, 'th_mum', 0, label + '-reply' + i);
  expect(mum(state).pending).toBeNull(); expect(meters(state)).toEqual([54, 56, 50]);
  expect(budget(state)).toEqual([2026, 4, 0, 6]);
  return state;
}

describe('Soccer phone state isolation', () => {
  it('phone isolation missing: reading a legacy thread leaves the complete career unchanged', () => {
    const state = opened('read'), legacy = mum(state) as Partial<PhoneThread>;
    // An old supported thread can lack repair metadata while retaining its actual conversation.
    delete legacy.cold; delete legacy.seen; delete legacy.lastReplyYear;
    const actual = observe('read', state, () => ({ ...state, phone: P.ensurePhone(state) }));
    expect(mum(actual.value).cold).toBe(0); expect(mum(actual.value).seen).toEqual([]);
    expect(mum(actual.value).lastReplyYear).toBeNull(); expect(mum(actual.value).pending).toEqual(mum(actual.row.before).pending);
    expect(mum(actual.value).lines).toEqual(mum(actual.row.before).lines);
    expect(budget(actual.value)).toEqual([2026, 0, 0, 0]); expect(actual.row.draws).toEqual([]); caps(actual.value);
    expect(isDeepStrictEqual(actual.row.before, actual.row.inputAfter), 'PHONE_ISOLATION_READ: a phone read mutated the complete prior career').toBe(true);
  });
  it('phone isolation missing: a public reply leaves the previous career unchanged', () => {
    const state = opened('reply'), actual = observe('reply', state, () => E.answerPhoneText(state, 'th_mum', 0));
    expect(actual.value).not.toBe(state); expect(meters(actual.value)).toEqual([54, 53, 50]);
    expect(budget(actual.value)).toEqual([2026, 4, 0, 3]); expect(mum(actual.value).rel).toBe(59);
    expect(mum(actual.value).pending).toEqual({ kind: 'convo', convo: 'mum_proud', beat: 1 });
    expect(mum(actual.value).lines).toHaveLength(5); expect(mum(actual.value).lastReplyYear).toBe(2026);
    expect(actual.value.events).toEqual([...actual.row.before.events, '📱 Mum: Send something for nan.']);
    expect(actual.row.draws).toEqual([]); caps(actual.value);
    expect(isDeepStrictEqual(actual.row.before, actual.row.inputAfter), 'PHONE_ISOLATION_REPLY: a public reply mutated the complete prior career').toBe(true);
  });
  it('phone isolation missing: reopening a contact leaves the previous career unchanged', () => {
    const state = completed('open'), index = contactIndex(state, 'mum_checkin');
    const actual = observe('open', state, () => E.answerPhoneText(state, 'open:mum', index));
    expect(actual.value).not.toBe(state); expect(mum(actual.value).pending).toEqual({ kind: 'convo', convo: 'mum_checkin', beat: 0 });
    expect(mum(actual.value).seen).toEqual(['mum_proud', 'mum_checkin']); expect(mum(actual.value).lines).toHaveLength(6);
    expect(meters(actual.value)).toEqual([54, 56, 50]); expect(budget(actual.value)).toEqual([2026, 4, 0, 6]);
    expect(actual.value.events).toEqual(actual.row.before.events); expect(actual.row.draws).toEqual([]); caps(actual.value);
    expect(isDeepStrictEqual(actual.row.before, actual.row.inputAfter), 'PHONE_ISOLATION_OPEN: reopening a contact mutated the complete prior career').toBe(true);
  });
  it('phone isolation missing: a season tick leaves the previous phone unchanged', () => {
    const state = opened('tick', 2025);
    // Prepared next-season context keeps the genuine unanswered public conversation from 2025.
    state.age = 30; state.seasons[state.seasons.length - 1]!.year = 2026; state.seasons[state.seasons.length - 1]!.age = 30;
    const working = { ...state }, actual = observe('tick', state, () => { P.phoneSeasonTick(working, 'pro'); return working; });
    const thread = mum(actual.value);
    expect([thread.rel, thread.cold, thread.waiting]).toEqual([36, 1, 2026]); expect(thread.lines).toHaveLength(3);
    expect(thread.lines[2].y).toBe(2026); expect(thread.pending).toEqual({ kind: 'convo', convo: 'mum_proud', beat: 0 });
    expect(meters(actual.value)).toEqual([50, 47, 50]); expect(budget(actual.value)).toEqual([2025, 0, 0, 0]);
    expect(actual.value.phone!.seed).not.toBe(actual.row.before.phone!.seed); expect(actual.row.draws).toEqual([]); caps(actual.value);
    expect(isDeepStrictEqual(actual.row.before, actual.row.inputAfter), 'PHONE_ISOLATION_TICK: a season tick mutated the complete prior career').toBe(true);
  });
  it('phone isolation missing: a world tick leaves the previous clubs map unchanged', () => {
    const state = initial(), working = { ...state }; let world: WorldSeason;
    // Future names and transfers are produced by the actual simulation, not inserted into the fixture.
    const actual = observe('world', state, () => {
      world = P.worldSeasonTick(working, { year: 2042, playerLeagueTitle: false, playerUcl: false }); return working;
    }, () => world);
    expect(actual.value.phone!.world).toEqual(world!); expect(world!.year).toBe(2042);
    expect(Object.keys(actual.value.phone!.clubs).length).toBeGreaterThan(0); expect(world!.moves.length).toBeGreaterThan(0);
    for (const move of world!.moves) {
      expect(move.from).not.toBe(move.to); expect(actual.value.phone!.clubs[move.who]).toBe(move.to);
    }
    expect(actual.row.draws.length).toBeGreaterThan(0); expect(actual.row.draws.every(value => value === 0.9)).toBe(true);
    expect(budget(actual.value)).toEqual([2026, 0, 0, 0]); caps(actual.value);
    expect(isDeepStrictEqual(actual.row.before, actual.row.inputAfter), 'PHONE_ISOLATION_WORLD: a world tick mutated the complete prior career').toBe(true);
  });
  it('phone isolation preservation: spent allowances survive real replies and JSON reload', () => {
    let state = completed('budgets'), serialized = '';
    const input = copy(state), reloaded = observe('budgets-reload', input, () => {
      serialized = S.serializeSoccerCareerSave(input); const parsed = S.parseSoccerCareerSave(serialized);
      expect(parsed && S.isSoccerCareerSave(parsed), 'actual save parser must accept its serialized career').toBe(true);
      return E.repairCareer(parsed as CareerState);
    }, () => ({ serialized }));
    expect(reloaded.row.inputAfter).toEqual(reloaded.row.before); expect(reloaded.row.draws).toEqual([]);
    state = reloaded.value; expect(budget(state)).toEqual([2026, 4, 0, 6]);
    state = setupAction(state, 'open:mum', contactIndex(state, 'mum_checkin'), 'budgets-open-checkin');
    state = setupAction(state, 'th_mum', 0, 'budgets-reply-checkin');
    expect(meters(state)).toEqual([54, 56, 50]); expect(budget(state)).toEqual([2026, 4, 0, 6]);
    expect(mum(state).pending).toEqual({ kind: 'convo', convo: 'mum_checkin', beat: 1 });
    expect(state.phone!.perksTaken).toBe(0); caps(state);
  });
  it('phone isolation preservation: invalid public phone actions remain unchanged', () => {
    const state = opened('invalid');
    for (const [label, id, choice] of [['invalid-contact', 'open:missing', 0], ['invalid-thread', 'th_missing', 0],
      ['invalid-choice', 'th_mum', 99]] as const) {
      const actual = observe(label, state, () => E.answerPhoneText(state, id, choice));
      expect(actual.value).toBe(state); expect(actual.row.after).toEqual(actual.row.before);
      expect(actual.row.inputAfter).toEqual(actual.row.before); expect(actual.row.draws).toEqual([]);
    }
  });
});
