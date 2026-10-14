import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CareerState } from '@/lib/clubManager';
import type { ClockPoint } from '@/lib/clubManagerClock';
const E = (process.env.CM_HT_CORE ? await import(/* @vite-ignore */ process.env.CM_HT_CORE)
  : await import('@/lib/clubManager')) as typeof import('@/lib/clubManager');
const R = (process.env.CM_HT_READER ? await import(/* @vite-ignore */ process.env.CM_HT_READER)
  : await import('@/lib/clubManagerLiveLineups')) as typeof import('@/lib/clubManagerLiveLineups');
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const NOW = '2026-10-14T00:00:00Z';
let base: CareerState | undefined;
afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); vi.useRealTimers(); });
function actual(): CareerState {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(NOW));
  if (!base) {
    const draws: number[] = [], random = vi.spyOn(Math, 'random').mockImplementation(() => { draws.push(.6); return .6; });
    try {
      let state = E.startCareer('Aston Villa'), attempts = 0;
      while (!state.live && attempts++ < 8) state = E.playNextEntry(state).state;
      expect(state.live).toBeTruthy(); expect(state.live!.startXi).toHaveLength(11); expect(state.live!.oppXi).toHaveLength(11);
      base = copy(state); console.log('CM_HT_READER_ACTUAL:' + JSON.stringify({ clock: NOW, draws, attempts, state: base }));
    } finally { random.mockRestore(); }
  }
  return copy(base);
}
function legal<T>(action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockReturnValue(.6);
  try { return action(); } finally { random.mockRestore(); }
}
function fictional(): CareerState {
  const state = actual(), live = state.live!;
  state.squad.forEach((player, index) => {
    const slot = live.startXi.indexOf(player.id);
    player.name = slot < 0 ? 'Fixture Home bench ' + index : 'Fixture Home ' + (slot + 1); player.generated = true;
  });
  live.oppXi!.forEach((player, index) => { player.n = 'Fixture Away ' + (index + 1); player.g = true; });
  (live.oppBench ?? []).forEach((player, index) => { player.n = 'Fixture Away bench ' + index; player.g = true; });
  live.h1My = [{ id: live.startXi[8], name: 'Fixture Home 9', minute: 12 },
    { id: live.startXi[7], name: 'Fixture Home 8', minute: 20, og: { n: 'Fixture Away 2', g: true } }];
  live.h1Opp = [{ name: 'Fixture Away 9', minute: 18 }, { name: 'Fixture Home 2', minute: 28, og: true, drawn: 'Fixture Away 8' }];
  live.h2My = []; live.h2Opp = []; live.h1Cards = []; live.h2Cards = []; live.h1OppCards = []; live.h2OppCards = [];
  live.h1Injuries = []; live.h2Injuries = []; live.subs = []; live.oppSubs = [];
  live.myGoals = 2; live.oppGoals = 2;
  return state;
}
function read(state: CareerState, point: ClockPoint) {
  const held = JSON.stringify(state), random = vi.spyOn(Math, 'random').mockReturnValue(.5), clock = vi.spyOn(Date, 'now');
  let value: ReturnType<typeof R.liveLineupsAt>;
  try {
    value = R.liveLineupsAt(state, point);
    expect(random.mock.calls.length === 0, 'live lineup reader consumed match RNG').toBe(true);
    expect(clock.mock.calls.length === 0, 'live lineup reader read an external clock').toBe(true);
    expect(JSON.stringify(state) === held, 'live lineup reader changed its complete input').toBe(true);
  } finally { random.mockRestore(); clock.mockRestore(); }
  return value!;
}
function guard(actualValue: unknown, expected: unknown, cause: string) {
  expect(JSON.stringify(actualValue) === JSON.stringify(expected), cause).toBe(true);
  expect(actualValue).toEqual(expected);
}
const byName = (view: ReturnType<typeof read>, side: 'me' | 'opp', name: string) => view[side].rows.find(row => row.name === name)!;
const grades = (view: ReturnType<typeof read>) => ({
  score: view.score,
  home9: byName(view, 'me', 'Fixture Home 9').grade,
  home8: byName(view, 'me', 'Fixture Home 8').grade,
  away9: byName(view, 'opp', 'Fixture Away 9').grade,
  away2: byName(view, 'opp', 'Fixture Away 2').grade,
});

describe('Live lineup semantic reader', () => {
  it('live lineup reader: actual starting sides keep slot identities and OVR', () => {
    const state = actual(), view = read(state, { minute: 0, plus: 0 });
    guard({ score: view.score, mine: view.me.rows.map(row => [row.name, row.ovr, row.started, row.grade, row.gradeReason]),
      theirs: view.opp.rows.map(row => [row.name, row.ovr, row.started, row.grade, row.gradeReason]) },
    { score: { me: 0, opp: 0 }, mine: state.live!.startXi.map(id => { const player = state.squad.find(p => p.id === id)!;
      return [player.name, player.rating, true, null, 'not-played']; }),
    theirs: state.live!.oppXi!.map(player => [player.n, player.r, true, null, 'not-played']) },
    'actual live starting identities or OVR changed');
    expect(R.liveLineupsAt({ ...state, live: null }, { minute: 45, plus: 0 })).toBeNull();
  });
  it('live lineup reader: a level played side starts at6.4 and a not-entered player has NR', () => {
    const state = fictional(), view = read(state, { minute: 1, plus: 0 });
    guard({ score: view.score, grades: [...view.me.rows, ...view.opp.rows].map(row => row.grade) },
      { score: { me: 0, opp: 0 }, grades: Array(22).fill(6.4) }, 'neutral provisional grade or NR is false');
    const zero = read(state, { minute: 0, plus: 0 });
    expect([...zero.me.rows, ...zero.opp.rows].every(row => row.grade === null && row.gradeReason === 'not-played')).toBe(true);
  });
  it('live lineup reader: a recorded goal changes only its scorer and current team base', () => {
    const state = fictional();
    guard(grades(read(state, { minute: 13, plus: 0 })),
      { score: { me: 1, opp: 0 }, home9: 7.9, home8: 7, away9: 5.7, away2: 5.7 }, 'recorded live goal grade is false');
    state.live!.h1My = [6, 8, 9, 10, 12].map(minute => ({ minute, id: state.live!.startXi[8], name: 'Fixture Home 9' }));
    expect(byName(read(state, { minute: 13, plus: 0 }), 'me', 'Fixture Home 9').grade).toBe(10);
  });
  it('live lineup reader: an equalizer restores the draw base on both sides', () => {
    guard(grades(read(fictional(), { minute: 19, plus: 0 })),
      { score: { me: 1, opp: 1 }, home9: 7.3, home8: 6.4, away9: 7.3, away2: 6.4 }, 'live equalizer grade is false');
  });
  it('live lineup reader: both own-goal representations change score without scorer credit', () => {
    const state = fictional();
    guard(grades(read(state, { minute: 21, plus: 0 })),
      { score: { me: 2, opp: 1 }, home9: 7.9, home8: 7, away9: 6.6, away2: 5.7 }, 'live own goal was falsely credited to a player');
    guard(grades(read(state, { minute: 29, plus: 0 })),
      { score: { me: 2, opp: 2 }, home9: 7.3, home8: 6.4, away9: 7.3, away2: 6.4 }, 'live own goal was falsely credited to a player');
    expect(byName(read(state, { minute: 29, plus: 0 }), 'me', 'Fixture Home 2').grade).toBe(6.4);
  });
  it('live lineup reader: future lines and assist metadata cannot change an earlier view', () => {
    const state = fictional(), wanted = read(state, { minute: 19, plus: 0 }), changed = copy(state), live = changed.live!;
    live.h2My!.push({ id: live.startXi[8], name: 'Fixture Home 9', minute: 60 });
    live.h2Opp!.push({ name: 'Fixture Away 9', minute: 61, assist: 'Fixture Away 2' });
    live.h1Opp![0].assist = 'Fixture Away 2'; live.myGoals = 9; live.oppGoals = 8;
    live.oppBench![0].n = 'Fixture Away 9'; live.oppSubs!.push({ off: 'Fixture Away 8', on: 'Fixture Away 9', minute: 70 });
    live.h2Cards!.push({ id: live.startXi[1], name: 'Fixture Home 2', minute: 71, kind: 'red' });
    live.h2Injuries!.push({ id: live.startXi[2], name: 'Fixture Home 3', minute: 72, weeks: 2 });
    guard(read(changed, { minute: 19, plus: 0 }), wanted, 'live lineup reader leaked future or assist information');
  });
  it('live lineup reader: explicit added-time cutoffs apply to every timed line', () => {
    const state = fictional(), live = state.live!, bench = state.squad.find(player => !live.startXi.includes(player.id))!;
    live.h1My = [{ id: live.startXi[8], name: 'Fixture Home 9', minute: 45, plus: 2 }]; live.h1Opp = [];
    live.subs = [{ off: 'Fixture Home 8', on: bench.name, offId: live.startXi[7], onId: bench.id, minute: 45, plus: 2 }];
    live.h1Cards = [{ id: live.startXi[2], name: 'Fixture Home 3', minute: 45, plus: 1, kind: 'yellow' },
      { id: live.startXi[3], name: 'Fixture Home 4', minute: 45, plus: 2, kind: 'red' }];
    live.h1Injuries = [{ id: live.startXi[4], name: 'Fixture Home 5', minute: 45, plus: 2, weeks: 2 }];
    live.h1OppCards = [{ name: 'Fixture Away 3', minute: 45, plus: 2, kind: 'yellow' }];
    const before = read(state, { minute: 45, plus: 1 }), after = read(state, { minute: 45, plus: 2 });
    guard({ score: before.score, grade: byName(before, 'me', 'Fixture Home 9').grade, rows: before.me.rows.length,
      yellow: byName(before, 'me', 'Fixture Home 3').yellows, red: byName(before, 'me', 'Fixture Home 4').redAt,
      injury: byName(before, 'me', 'Fixture Home 5').injuredAt, oppYellow: byName(before, 'opp', 'Fixture Away 3').yellows },
    { score: { me: 0, opp: 0 }, grade: 6.4, rows: 11, yellow: 1, red: null, injury: null, oppYellow: 0 },
    'live lineup reader crossed the added-time cutoff');
    expect(after.score).toEqual({ me: 1, opp: 0 }); expect(byName(after, 'me', 'Fixture Home 9').grade).toBe(7.9);
    expect(byName(after, 'me', 'Fixture Home 4').redAt).toEqual({ minute: 45, plus: 2 });
    expect(byName(after, 'me', 'Fixture Home 5').injuredAt).toEqual({ minute: 45, plus: 2 });
    expect(after.me.rows[11].onAt).toEqual({ minute: 45, plus: 2 }); expect(after.me.rows[11].gradeReason).toBe('not-played');
  });
  it('live lineup reader: an actual own substitution keeps its starter and entered row clocks', () => {
    const state = actual(), outId = state.live!.startXi.find(id => state.squad.find(p => p.id === id)?.position !== 'GK')!;
    const bench = E.benchFor(state, outId)[0]; expect(bench).toBeTruthy();
    const changed = legal(() => E.changeLive(state, 20, { kind: 'sub', outId, inId: bench.id }))!;
    expect(changed).toBeTruthy();
    const before = read(changed, { minute: 19, plus: 0 }), at = read(changed, { minute: 20, plus: 0 });
    guard({ beforeRows: before.me.rows.length, originalNames: at.me.rows.slice(0, 11).map(row => row.name),
      off: at.me.rows.find(row => row.name === state.squad.find(p => p.id === outId)!.name)!.offAt,
      on: at.me.rows[11]?.onAt, name: at.me.rows[11]?.name, grade: at.me.rows[11]?.grade, reason: at.me.rows[11]?.gradeReason },
    { beforeRows: 11, originalNames: state.live!.startXi.map(id => state.squad.find(p => p.id === id)!.name),
      off: { minute: 20 }, on: { minute: 20 }, name: bench.name, grade: null, reason: 'not-played' },
    'actual own substitution identity or time is false');
    const restart = legal(() => E.makeHalftimeSub(state, outId, bench.id))!;
    expect(read(restart, { minute: 45, plus: restart.live!.added?.h1 ?? 0 }).me.rows).toHaveLength(11);
  });
  it('live lineup reader: opposition substitutions use only the saved entered bench snapshot', () => {
    const state = legal(() => E.startSecondHalf(actual()))!;
    const first = state.live!.oppSubs?.[0]; expect(first, 'actual second half must record a named opposition substitution').toBeTruthy();
    const at = { minute: first!.minute, plus: first!.plus ?? 0 }, before = read(state, { minute: first!.minute - 1, plus: 0 }), now = read(state, at);
    const source = state.live!.oppBench!.find(player => player.n === first!.on)!;
    guard({ before: before.opp.rows.map(row => row.name), firstEleven: now.opp.rows.slice(0, 11).map(row => row.name),
      added: now.opp.rows.find(row => !row.started && row.name === source.n)?.ovr,
      off: now.opp.rows.find(row => row.name === first!.off)?.offAt },
    { before: state.live!.oppXi!.map(player => player.n), firstEleven: state.live!.oppXi!.map(player => player.n),
      added: source.r, off: { minute: first!.minute, ...(first!.plus !== undefined ? { plus: first!.plus } : {}) } },
    'opposition substitution lost its saved identity');
  });
  it('live lineup reader: played cards and injuries preserve their actual status clocks', () => {
    const state = fictional(), live = state.live!;
    live.h1Cards = [{ id: live.startXi[2], name: 'Fixture Home 3', kind: 'yellow', minute: 18 },
      { id: live.startXi[3], name: 'Fixture Home 4', kind: 'red', minute: 18 }];
    live.h1Injuries = [{ id: live.startXi[4], name: 'Fixture Home 5', minute: 18, weeks: 2 }];
    live.h1OppCards = [{ name: 'Fixture Away 3', kind: 'red', minute: 18 }];
    const before = read(state, { minute: 17, plus: 0 }), at = read(state, { minute: 18, plus: 0 });
    guard({ yellow: byName(before, 'me', 'Fixture Home 3').yellows, red: byName(before, 'me', 'Fixture Home 4').redAt,
      injury: byName(before, 'me', 'Fixture Home 5').injuredAt, oppRed: byName(before, 'opp', 'Fixture Away 3').redAt },
    { yellow: 0, red: null, injury: null, oppRed: null }, 'live card or injury status crossed its cutoff');
    expect(byName(at, 'me', 'Fixture Home 3').yellows).toBe(1);
    expect(byName(at, 'me', 'Fixture Home 4').redAt).toEqual({ minute: 18 });
    expect(byName(at, 'me', 'Fixture Home 5').injuredAt).toEqual({ minute: 18 });
    expect(byName(at, 'opp', 'Fixture Away 3').redAt).toEqual({ minute: 18 });
  });
  it('live lineup reader: missing and ambiguous opponent history stays honestly unavailable', () => {
    const missing = fictional(); delete missing.live!.h1My;
    const unknown = read(missing, { minute: 29, plus: 0 });
    guard({ score: unknown.score, grades: [...unknown.me.rows, ...unknown.opp.rows].map(row => [row.grade, row.gradeReason]) },
      { score: null, grades: Array.from({ length: 22 }, () => [null, 'unavailable']) }, 'missing or ambiguous live identity was fabricated');
    const thin = fictional(); delete thin.live!.oppXi;
    expect(read(thin, { minute: 29, plus: 0 }).opp).toEqual({ club: thin.live!.opponent, available: false, rows: [] });
    const duplicate = fictional(), live = duplicate.live!; live.oppBench![0].n = 'Fixture Away 9';
    live.oppSubs = [{ off: 'Fixture Away 8', on: 'Fixture Away 9', minute: 18 }];
    const rows = read(duplicate, { minute: 29, plus: 0 }).opp.rows.filter(row => row.name === 'Fixture Away 9');
    expect(rows).toHaveLength(2); expect(rows.every(row => row.grade === null && row.gradeReason === 'unavailable' && row.yellows === null)).toBe(true);
  });
  it('live lineup reader: JSON reload and reading preserve complete state and final settlement inputs', async () => {
    const state = actual(), raw = JSON.stringify(state), initial = read(state, { minute: 45, plus: state.live!.added?.h1 ?? 0 });
    guard(read(JSON.parse(raw) as CareerState, { minute: 45, plus: state.live!.added?.h1 ?? 0 }), initial,
      'live lineup display changed the saved match or final settlement');
    vi.resetModules(); const withReader = process.env.CM_HT_RESUME_A
      ? await import(/* @vite-ignore */ process.env.CM_HT_RESUME_A) : await import('@/lib/clubManager');
    vi.resetModules(); const withoutReader = process.env.CM_HT_RESUME_B
      ? await import(/* @vite-ignore */ process.env.CM_HT_RESUME_B) : await import('@/lib/clubManager');
    read(state, { minute: 45, plus: state.live!.added?.h1 ?? 0 });
    const values: number[] = [], random = vi.spyOn(Math, 'random').mockImplementation(() => { values.push(.6); return .6; });
    let first: ReturnType<typeof E.resumeMatch>;
    try { first = withReader.resumeMatch(copy(state)); }
    finally { random.mockRestore(); }
    let ordinal = 0; const replay = vi.spyOn(Math, 'random').mockImplementation(() => {
      expect(ordinal).toBeLessThan(values.length); return values[ordinal++];
    });
    let second: ReturnType<typeof E.resumeMatch>;
    try { second = withoutReader.resumeMatch(copy(state)); } finally { replay.mockRestore(); }
    expect(ordinal).toBe(values.length); expect(values.length).toBeGreaterThan(0);
    expect(second!).toEqual(first!); expect(JSON.stringify(state)).toBe(raw);
    console.log('CM_HT_READER_SETTLEMENT:' + JSON.stringify({ clock: NOW, inputs: values, consumed: ordinal, before: state, withReader: first!, withoutReader: second! }));
  });
});
