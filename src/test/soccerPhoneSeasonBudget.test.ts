import { afterAll, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import type { CareerState } from '@/lib/soccerCareerEngine';
import type { PhoneState } from '@/lib/soccerPhone';

const E = (process.env.PHONE_BUDGET_ENGINE ? await import(/* @vite-ignore */ process.env.PHONE_BUDGET_ENGINE)
  : await import('@/lib/soccerCareerEngine')) as typeof import('@/lib/soccerCareerEngine');
const P = (process.env.PHONE_BUDGET_PHONE ? await import(/* @vite-ignore */ process.env.PHONE_BUDGET_PHONE)
  : await import('@/lib/soccerPhone')) as typeof import('@/lib/soccerPhone');
const S = (process.env.PHONE_BUDGET_SAVE ? await import(/* @vite-ignore */ process.env.PHONE_BUDGET_SAVE)
  : await import('@/lib/soccerCareerSave')) as typeof import('@/lib/soccerCareerSave');
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const year = (state: CareerState) => state.seasons[state.seasons.length - 1]!.year;
const fields = ['bYear', 'bK', 'bP', 'bM'] as const;
const observations: Record<string, unknown> = {};
afterAll(() => { if (process.env.PHONE_BUDGET_RAW) writeFileSync(process.env.PHONE_BUDGET_RAW, JSON.stringify(observations, null, 2)); });
function draws<T>(action: () => T): { value: T; draws: number[] } {
  const values: number[] = [], random = vi.spyOn(Math, 'random').mockImplementation(() => { values.push(0.9); return 0.9; });
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-16T16:00:00Z'));
  try { return { value: action(), draws: values }; } finally { random.mockRestore(); clock.mockRestore(); }
}
function initial(): CareerState {
  return draws(() => {
    const stats = { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 80 };
    const state = E.initCareer('Phone Budget Fixture', 'England', 'CM', 'modern', stats, 80, 2020, E.FALLBACK_CLUBS, null, 94);
    return E.repairCareer(json({ ...state, age: 30, phase: 'playing', retired: false, personality: 'iceman', agentId: 'self',
      seasons: [{ ...state.seasons[0], year: 2026, age: 30, type: 'playing', apps: 24, leagueApps: 20,
        goals: 4, assists: 6, rating: 7, injury: null, injuryWeeks: 0, injurySevere: false }],
      karma: 50, morale: 50, popularity: 50, events: ['Prepared fictional phone budget context'],
      phoneInbox: [], phone: { threads: [], feed: [], world: null, clubs: {}, rivalClub: null, seed: 1, offers: 0, perksTaken: 0 } }));
  }).value;
}
function act(state: CareerState, id: string, choice: number, label: string): CareerState {
  // Public replies retain a preexisting shallow thread alias. Each call uses an explicit working copy.
  const before = json(state), working = json(state), result = draws(() => E.answerPhoneText(working, id, choice));
  observations[label] = { before, after: json(result.value), draws: result.draws, id, choice };
  expect(json(state)).toEqual(before); expect(result.draws).toEqual([]);
  return result.value;
}
function opened(convo: string, label: string): CareerState {
  const state = initial(), definition = P.CONVOS.find(row => row.id === convo)!;
  expect(definition, 'actual source conversation must exist').toBeDefined();
  const options = P.starterConvos(state, definition.contact, 'pro'), index = options.findIndex(row => row.id === convo);
  expect(index, 'actual Contacts API must offer the chosen conversation').toBeGreaterThanOrEqual(0);
  return act(state, 'open:' + definition.contact, index, label + '-open');
}
function sequence(convo: string, choices: number[], label: string, reload = false): CareerState {
  let state = opened(convo, label);
  const contact = P.CONVOS.find(row => row.id === convo)!.contact;
  for (let i = 0; i < choices.length; i++) {
    state = act(state, 'th_' + contact, choices[i], label + '-reply' + i);
    if (reload && i === 0) {
      const serialized = S.serializeSoccerCareerSave(state), parsed = S.parseSoccerCareerSave(serialized);
      expect(parsed && S.isSoccerCareerSave(parsed)).toBe(true);
      const result = draws(() => E.repairCareer(parsed as CareerState));
      observations[label + '-reload'] = { before: json(state), after: json(result.value), draws: result.draws };
      expect(result.draws).toEqual([]); state = result.value;
    }
  }
  return state;
}
function repair(state: CareerState, label: string): PhoneState {
  const before = json(state), result = draws(() => P.ensurePhone(state));
  observations[label] = { before, after: { ...json(state), phone: json(result.value) }, draws: result.draws };
  expect(json(state)).toEqual(before); expect(result.draws).toEqual([]);
  return result.value;
}

describe('Soccer phone season budgets', () => {
  it('phone budget missing: repair retains every valid optional counter', () => {
    const results = [
      { bYear: 2026, bK: 0, bP: 0, bM: 0 }, { bYear: 0, bK: 2.5, bP: 0.75, bM: 5.5 },
      { bYear: 2026.5, bK: 4, bP: 1, bM: 6 }, { bYear: -1, bK: 8, bP: 3, bM: 9 },
    ].map((budget, i) => {
      const state = initial(); state.phone = { ...state.phone!, ...budget };
      const result = repair(state, 'valid-' + i);
      return fields.every(key => Object.is(result[key], budget[key]));
    });
    expect(results.every(Boolean), 'PHONE_BUDGET_REPAIR: valid saved budget fields were lost').toBe(true);
  });
  it('phone budget missing: repeated actual replies share the four point karma allowance', () => {
    const state = sequence('mum_proud', [0, 0, 0], 'karma');
    expect(state.karma === 54, 'PHONE_BUDGET_KARMA: repeated replies exceeded the saved season allowance').toBe(true);
  });
  it('phone budget missing: repeated actual replies share the six point direct morale allowance', () => {
    const state = sequence('mum_proud', [0, 0, 0], 'morale');
    expect(state.morale === 56, 'PHONE_BUDGET_MORALE: repeated replies exceeded the saved season allowance').toBe(true);
  });
  it('phone budget missing: repeated actual replies share the one point popularity allowance', () => {
    const state = sequence('journo_column2', [2, 1], 'popularity');
    expect(state.popularity === 51, 'PHONE_BUDGET_POPULARITY: repeated replies exceeded the saved season allowance').toBe(true);
  });
  it('phone budget missing: opening another contact retains already spent allowances', () => {
    const completed = sequence('mum_proud', [0, 0, 0], 'contact'), after = act(completed, 'open:dad', 0, 'contact-next');
    expect(after.phone?.bYear === year(after) && after.phone.bK === 4 && after.phone.bM === 6,
      'PHONE_BUDGET_CONTACT: opening a contact erased the saved season allowance').toBe(true);
  });
  it('phone budget missing: actual save reload retains the remaining reply allowances', () => {
    const state = sequence('mum_proud', [0, 0, 0], 'reload', true);
    expect(state.karma === 54 && state.morale === 56,
      'PHONE_BUDGET_RELOAD: reloaded replies exceeded the saved season allowance').toBe(true);
  });
  it('phone budget missing: real replies honor zero fractional exhausted and excess spent values', () => {
    const results: boolean[] = [];
    for (const [i, used] of [{ bK: 0, bP: 0, bM: 0 }, { bK: 2.5, bP: 0.75, bM: 5.5 },
      { bK: 4, bP: 1, bM: 6 }, { bK: 8, bP: 3, bM: 9 }].entries()) {
      const mum = opened('mum_proud', 'remaining-mum-' + i); mum.phone = { ...mum.phone!, ...used, bYear: year(mum) };
      const afterMum = act(mum, 'th_mum', 0, 'remaining-mum-reply-' + i);
      results.push(afterMum.karma === 50 + Math.min(4, Math.max(0, 4 - used.bK))
        && afterMum.morale === 50 + Math.min(3, Math.max(0, 6 - used.bM)));
      const journo = opened('journo_column2', 'remaining-journo-' + i); journo.phone = { ...journo.phone!, ...used, bYear: year(journo) };
      const first = act(journo, 'th_journo', 2, 'remaining-journo-first-' + i);
      const second = act(first, 'th_journo', 1, 'remaining-journo-second-' + i);
      // Both real choices spend negative karma, with the same absolute allowance as positive replies.
      results.push(second.karma === 50 - Math.min(8, Math.max(0, 4 - used.bK))
        && second.popularity === 50 + Math.min(7, Math.max(0, 1 - used.bP)));
    }
    expect(results.every(Boolean), 'PHONE_BUDGET_REMAINING: real replies ignored already spent or signed allowance').toBe(true);
  });
  it('phone budget preservation: missing and malformed fields stay undefined without coercion', () => {
    const state = initial(), legacy = repair(state, 'invalid-absent');
    expect(fields.every(key => legacy[key] === undefined)).toBe(true);
    for (const key of fields) for (const [i, value] of [undefined, null, '3', NaN, Infinity, -Infinity,
      ...(key === 'bYear' ? [] : [-1])].entries()) {
      const input = initial(); input.phone = { ...input.phone!, [key]: value } as unknown as PhoneState;
      expect(repair(input, 'invalid-' + key + '-' + i)[key]).toBeUndefined();
    }
  });
  it('phone budget preservation: a new saved season resets the original first reply allowance', () => {
    const state = opened('mum_proud', 'season');
    state.phone = { ...state.phone!, bYear: year(state) - 1, bK: 8, bP: 3, bM: 9 };
    const after = act(state, 'th_mum', 0, 'season-reply');
    expect([after.karma, after.morale, after.popularity]).toEqual([54, 53, 50]);
    expect([after.phone?.bYear, after.phone?.bK, after.phone?.bP, after.phone?.bM]).toEqual([year(state), 4, 0, 3]);
  });
  it('phone budget preservation: a save without budget fields keeps its original first conversation reply', () => {
    const before = opened('mum_proud', 'legacy'), after = act(before, 'th_mum', 0, 'legacy-reply');
    expect([after.karma, after.morale, after.popularity]).toEqual([54, 53, 50]);
    expect(after.phone?.threads[0].pending).toEqual({ kind: 'convo', convo: 'mum_proud', beat: 1 });
    expect(after.phone?.threads[0].rel).toBe(59);
    expect(after.phone?.perksTaken).toBe(0); expect(after.statBoostNextSeason).toEqual(before.statBoostNextSeason);
    expect(after.events).toEqual([...before.events, '📱 Mum: Send something for nan.']);
  });
  it('phone budget preservation: reading leaves the complete input and global RNG untouched', () => {
    const state = opened('mum_proud', 'read'); state.phone = { ...state.phone!, bYear: year(state), bK: 4, bP: 1, bM: 6 };
    const before = JSON.stringify(state); repair(state, 'read-first'); repair(state, 'read-again');
    expect(JSON.stringify(state)).toBe(before);
  });
  it('phone budget preservation: invalid public contact thread and reply remain no ops', () => {
    const state = opened('mum_proud', 'noop');
    for (const [id, choice] of [['open:missing', 0], ['th_missing', 0], ['th_mum', 99]] as const) {
      const before = json(state), working = json(state), result = draws(() => E.answerPhoneText(working, id, choice));
      observations['noop-' + id] = { before, after: json(result.value), draws: result.draws, id, choice };
      expect(result.value).toBe(working); expect(json(result.value)).toEqual(before); expect(result.draws).toEqual([]);
    }
  });
});
