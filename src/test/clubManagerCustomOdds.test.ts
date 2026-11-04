import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CareerState, Mentality } from '@/lib/clubManager';

type Engine = typeof import('@/lib/clubManager');
type Odds = { win: number; draw: number; loss: number };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
let draws: number[], next: () => number, restore: (() => void) | undefined;
const stream = (initial: number) => {
  let seed = initial;
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
};
function raw(name: string, observations: unknown) {
  if (!process.env.CM_CUSTOM_ODDS_RAW) return;
  mkdirSync(process.env.CM_CUSTOM_ODDS_RAW, { recursive: true });
  writeFileSync(join(process.env.CM_CUSTOM_ODDS_RAW, name + '.json'), JSON.stringify({ case: name,
    fixture: 'Fictional custom club, neutral talk/press and half-stable instructions. A stationary ninety-minute Poisson estimate, not full-match calibration after interventions.',
    observations }, null, 2) + '\n');
}
// Independent probability accumulation from the real kickoff rates, never from matchFacts or a shape-profile helper.
function stationaryOdds(mine: number, theirs: number): Odds {
  const probabilities = (lambda: number) => {
    const p = [Math.exp(-lambda)];
    for (let n = 1; n <= 9; n++) p.push(p[n - 1] * lambda / n);
    return p;
  };
  const a = probabilities(mine), b = probabilities(theirs);
  const sums = [0, 0, 0];
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) sums[i > j ? 0 : i === j ? 1 : 2] += a[i] * b[j];
  const total = sums.reduce((sum, value) => sum + value, 0), win = Math.round(100 * sums[0] / total);
  let draw = Math.round(100 * sums[1] / total), loss = 100 - win - draw;
  if (loss < 0) { draw += loss; loss = 0; }
  return { win, draw, loss };
}
async function fixture() {
  const E = await import('@/lib/clubManager');
  await import('@/lib/clubManagerTactics');
  const prior = E.engineRegistrations(); restore = () => E.restoreEngineRegistrations(prior);
  const c = E.startCareer('Shape Forecast Borough', E.DEFAULT_ERA_ID, {
    name: 'Shape Forecast Borough', stadium: 'Forecast Park', quality: 70, budgetTier: 'mid',
    leagueId: E.leagueOf('Auckland FC').id, replacedClub: 'Auckland FC',
    crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'SF' },
  });
  c.formationIndex = 0; c.mentality = 'balanced'; c.teamTalk = null;
  delete c.instructions; delete c.customShape; delete c.press;
  c.squad = c.squad.map(p => ({ ...p, fitness: 100, morale: 68, injuryWeeks: 0, suspendedMatches: 0 }));
  c.xiIds = E.autoPickXI(c.squad, E.FORMATIONS[0]);
  expect(c.xiIds.every(Boolean), 'SETUP a complete canonical eleven').toBe(true);
  const entry = c.calendar[c.week];
  expect(!!entry && !entry.night && E.entryInvolvesMe(c, entry) && !!E.fixtureFor(c, entry),
    'SETUP current entry is the actual ordinary match, without any skipped recovery week').toBe(true);
  return { E, c };
}
function shape(E: Engine, c: CareerState, kind: 'advanced' | 'deep' | 'preset') {
  return { v: 1 as const, formationIndex: c.formationIndex, points: E.FORMATIONS[c.formationIndex].slots.map((s, i) => ({
    x: kind === 'advanced' && i === 0 ? 90 : kind === 'deep' ? 50 + (s.x - 50) * 0.65 : s.x,
    y: kind === 'preset' ? s.y : kind === 'advanced' ? i === 0 ? 30 : Math.max(6, s.y - 26) : Math.min(94, s.y + (i === 0 ? 0 : 18)),
  })) };
}
function sample(E: Engine, input: CareerState) {
  const before = JSON.stringify(input), at = draws.length;
  const facts = E.matchFacts(input);
  const forecastDraws = draws.length - at;
  next = stream(3180031);
  const kicked = E.playNextEntry(input, { noCoach: true });
  expect(kicked.kind, 'SETUP real kickoff reaches halftime').toBe('halftime');
  expect(kicked.state.live, 'SETUP real first-half rate receipt').toBeTruthy();
  const live = kicked.state.live!;
  return { forecast: facts!.odds, expected: stationaryOdds(2 * live.lamMine, 2 * live.lamOpp),
    rates: { mine: live.lamMine, theirs: live.lamOpp }, forecastDraws,
    inputHeld: JSON.stringify(input) === before,
    samePreKickoffPlayers: JSON.stringify(input.squad.map(p => [p.id, p.rating, p.fitness, p.morale]))
      === JSON.stringify(kicked.state.squad.map(p => [p.id, p.rating, p.fitness, p.morale])),
    kickoffWeek: kicked.state.week, expectedWeek: input.week, actualXi: live.startXi,
    shape: input.customShape ?? null, mentality: input.mentality };
}
function held(samples: ReturnType<typeof sample>[]) {
  for (const row of samples) {
    expect(row.inputHeld, 'Forecast and kickoff preserve their source save').toBe(true);
    expect(row.forecastDraws, 'Forecast consumes no global randomness').toBe(0);
    expect(row.samePreKickoffPlayers, 'SETUP no hidden fitness or morale drift before kickoff').toBe(true);
    expect(row.kickoffWeek).toBe(row.expectedWeek);
  }
}

beforeEach(() => {
  draws = []; next = stream(0x3180031); restore = undefined;
  vi.spyOn(Math, 'random').mockImplementation(() => { const n = next(); draws.push(n); return n; });
  vi.spyOn(Date, 'now').mockReturnValue(1793815200000);
  localStorage.clear(); sessionStorage.clear();
});
afterEach(() => { restore?.(); vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); });

describe('Club Manager custom shape forecasts', () => {
  it('accounts for custom coordinates in the pre-match chance estimate', async () => {
    const { E, c } = await fixture(), rows = [];
    for (const mentality of ['defensive', 'balanced', 'attacking'] as Mentality[]) {
      for (const kind of ['advanced', 'deep'] as const) {
        const state = { ...copy(c), mentality };
        state.customShape = shape(E, state, kind);
        rows.push({ kind, ...sample(E, state) });
      }
    }
    raw('geometry', rows); held(rows);
    expect(rows.map(r => r.forecast), 'CM_CUSTOM_ODDS_GEOMETRY').toEqual(rows.map(r => r.expected));
  });

  it('keeps saved custom plan instructions duties and coordinates in the forecast after reload and apply', async () => {
    const { E, c } = await fixture(), M = await import('@/lib/clubManagerMatchPlans');
    const { saveFence } = await import('@/lib/saveFence');
    c.customShape = shape(E, c, 'advanced');
    c.instructions = { press: -1, tempo: 1, width: 1, line: -1 };
    const duty = E.setDuty(c, 1, 'attackingFullBack'); expect(duty, 'SETUP valid canonical fullback duty').toBeTruthy();
    const saved = M.saveMatchPlan(duty!, 0, 'Forward shape');
    const changed = { ...copy(saved), mentality: 'defensive' as const };
    delete changed.customShape; delete changed.instructions; delete changed.xiDuties;
    saveFence.release(E.SAVE_KEY); expect(E.saveCareer(changed), 'SETUP actual writer accepts the named plan').toBe(true);
    const loaded = E.loadCareer()!;
    const disk = localStorage.getItem(E.SAVE_KEY), at = draws.length;
    const preview = M.previewMatchPlan(loaded, 0)!, applied = M.applyMatchPlan(loaded, 0);
    const current = E.matchFacts(loaded), previewFacts = E.matchFacts(preview.state), appliedFacts = E.matchFacts(applied);
    const previewDraws = draws.length - at;
    const outcome = sample(E, applied);
    raw('saved-plan', { current: current!.odds, preview: previewFacts!.odds, applied: appliedFacts!.odds,
      outcome, previewDraws, diskHeld: localStorage.getItem(E.SAVE_KEY) === disk,
      savedShape: saved.customShape, appliedShape: applied.customShape, instructions: applied.instructions, duties: applied.xiDuties });
    held([outcome]);
    expect(localStorage.getItem(E.SAVE_KEY), 'Preview and pure apply never write a save').toBe(disk);
    expect(previewDraws).toBe(0);
    expect(applied.customShape).toStrictEqual(saved.customShape);
    expect(applied.instructions).toStrictEqual(c.instructions); expect(applied.xiDuties).toStrictEqual(duty!.xiDuties);
    expect(previewFacts!.odds).toEqual(appliedFacts!.odds);
    expect(appliedFacts!.odds, 'CM_CUSTOM_ODDS_SAVED_PLAN').toEqual(outcome.expected);
    saveFence.release(E.SAVE_KEY);
  });

  it('preserves preset and exact-preset-coordinate estimates with zero draws', async () => {
    const { E, c } = await fixture(), rows = [];
    for (const mentality of ['defensive', 'balanced', 'attacking'] as Mentality[]) {
      const preset = { ...copy(c), mentality };
      const exact = { ...copy(preset), customShape: shape(E, preset, 'preset') };
      rows.push({ preset: sample(E, preset), exact: sample(E, exact) });
    }
    raw('preset', rows); held(rows.flatMap(r => [r.preset, r.exact]));
    for (const row of rows) {
      expect(row.preset.forecast).toEqual(row.preset.expected);
      expect(row.exact.forecast).toEqual(row.preset.forecast);
      expect(row.exact.rates).toEqual(row.preset.rates);
    }
  });

  it('keeps unsupported or malformed geometry unchanged while using the existing fallback estimate', async () => {
    const { E, c } = await fixture(), valid = shape(E, c, 'advanced');
    const invalid = [{ ...copy(valid), v: 99 }, { ...copy(valid), extra: true },
      { ...copy(valid), points: valid.points.map((p, i) => i === 0 ? { x: 95, y: p.y } : p) }];
    const original = JSON.stringify(invalid), at = draws.length;
    const baseline = E.matchFacts(c)!.odds;
    const actual = invalid.map(customShape => E.matchFacts(Object.assign(copy(c), { customShape }))!.odds);
    raw('fallback', { baseline, actual, original, after: JSON.stringify(invalid), drawDelta: draws.length - at });
    expect(actual).toEqual([baseline, baseline, baseline]);
    expect(JSON.stringify(invalid)).toBe(original); expect(draws.length - at).toBe(0);
  });
});
