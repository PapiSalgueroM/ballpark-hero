import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { CareerState, CMPlayer, TrainingPlan } from '@/lib/clubManager';

type Modules = {
  cm: typeof import('@/lib/clubManager');
  fac: typeof import('@/lib/clubManagerFacilities');
  staff: typeof import('@/lib/clubManagerStaff');
};
type Exposure = { v: 1; club: string; season: number; counts: number[] };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const PLANS: TrainingPlan[] = ['light', 'normal', 'double'].flatMap(intensity =>
  ['firstTeam', 'balanced', 'youth'].map(focus => ({ intensity, focus } as TrainingPlan)));
const LIGHT: TrainingPlan = { intensity: 'light', focus: 'firstTeam' };
const DOUBLE: TrainingPlan = { intensity: 'double', focus: 'youth' };
function stream(initial: number) {
  let seed = initial;
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
async function observe<T>(seed: number, body: (m: Modules) => T) {
  vi.resetModules();
  const draws: number[] = [], next = stream(seed);
  const random = vi.spyOn(Math, 'random').mockImplementation(() => { const n = next(); draws.push(n); return n; });
  const now = vi.spyOn(Date, 'now').mockReturnValue(1793743200000);
  try {
    const cm = await import('@/lib/clubManager');
    const fac = await import('@/lib/clubManagerFacilities');
    const staff = await import('@/lib/clubManagerStaff');
    return { value: copy(body({ cm, fac, staff })), draws, nextDraw: next() };
  } finally { random.mockRestore(); now.mockRestore(); }
}
function scene(m: Modules): CareerState {
  const c = m.cm.startCareer('Training Receipt Club', m.cm.DEFAULT_ERA_ID, {
    name: 'Training Receipt Club', stadium: 'Receipt Park',
    leagueId: m.cm.leagueOf('Auckland FC').id, replacedClub: 'Auckland FC',
    budgetTier: 'mid', quality: 70,
    crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'TRC' },
  });
  m.cm.ensureAcademy(c);
  c.academy!.coaching = 8; c.academy!.facilities = 8;
  m.fac.ensureFacilities(c).trainingGround = 1;
  const staff = m.staff.ensureStaff(c);
  staff.attack = null; staff.defence = null; staff.goalkeeping = null;
  c.budget = 1000; c.wageCap = 100000;
  // Synthetic young regulars keep expiry, retirement and potential caps out of the growth oracle.
  c.squad = c.squad.map(p => ({ ...p, age: 20, rating: 70, potential: 80,
    apps: 30, contractYears: 5, fitness: 50, injuryWeeks: 2 }));
  return c;
}
function exposure(c: CareerState, counts: number[]): Exposure {
  return { v: 1, club: c.clubName, season: c.season, counts: [...counts] };
}
function put(p: CMPlayer, value: unknown) { Object.assign(p, { trainingExposure: value }); }
function history(p: CMPlayer): unknown { return (p as CMPlayer & { trainingExposure?: unknown }).trainingExposure; }
function withoutHistory<T>(value: T): T {
  const result = copy(value);
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (!Array.isArray(node)) delete (node as Record<string, unknown>).trainingExposure;
    for (const child of Object.values(node)) visit(child);
  };
  visit(result); return result;
}
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function raw(name: string, value: unknown) {
  if (!process.env.CM_TRAINING_EXPOSURE_RAW) return;
  mkdirSync(process.env.CM_TRAINING_EXPOSURE_RAW, { recursive: true });
  writeFileSync(join(process.env.CM_TRAINING_EXPOSURE_RAW, name + '.json'), JSON.stringify(value, null, 2) + '\n');
}
function windowScene(c: CareerState): CareerState {
  const index = c.calendar.findIndex(entry => entry.type === 'window');
  expect(index, 'SETUP real generated calendar has a January window').toBeGreaterThanOrEqual(0);
  c.week = index; return c;
}
function step(m: Modules, c: CareerState): CareerState {
  const result = m.cm.playNextEntry(c, { skipHalftime: true, noCoach: true, untilWeek: c.week + 1 });
  expect(result.state.week, 'SETUP real calendar entry advanced').toBe(c.week + 1);
  return result.state;
}
async function summer(input: CareerState, seed: number, club?: string) {
  return observe(seed, m => {
    const c = copy(input);
    m.cm.registerLeagueOverrides(c.leagueOverrides ?? null);
    m.cm.registerCustomClub(c.customClub ?? null, c.eraId);
    return m.cm.startNextSeason(c, club);
  });
}
const player = (c: CareerState, id: string) => {
  const p = c.squad.find(row => row.id === id);
  expect(p, 'SETUP young contracted fixture player remains in squad').toBeTruthy();
  return p!;
};
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe('Club Manager recorded training exposure', () => {
  it('records the charged policy once per player and never charges a skipped night', async () => {
    const run = await observe(3101, m => {
      const c = windowScene(scene(m)); c.training = LIGHT;
      const before = copy(c), id = c.squad[0].id;
      const charged = step(m, c);
      const night = copy(charged), at = night.week;
      night.calendar.splice(at, 0, { type: 'oneOff', round: 0, night: { k: 'dsc', n: 999 } });
      const nightBefore = copy(night), afterNight = step(m, night);
      return { id, before, charged, nightBefore, afterNight };
    });
    const r = run.value, p = player(r.charged, r.id);
    expect(r.before.squad[0].fitness).toBe(50);
    expect(p.fitness).toBe(98); expect(p.injuryWeeks).toBe(1);
    expect(r.before.squad.every(row => history(row) === undefined)).toBe(true);
    expect(r.afterNight.squad).toStrictEqual(r.nightBefore.squad);
    raw('charged-week', { ...r, draws: run.draws, nextDraw: run.nextDraw });
    expect(history(p), 'CM_TRAINING_CHARGED_POLICY').toStrictEqual(exposure(r.charged, [1, 0, 0, 0, 0, 0, 0, 0, 0]));
    for (const row of r.charged.squad) expect(history(row), 'CM_TRAINING_CHARGED_POLICY')
      .toStrictEqual(exposure(r.charged, [1, 0, 0, 0, 0, 0, 0, 0, 0]));
  });

  it('uses the charged season instead of a last-week switch at the real summer rollover', async () => {
    const season = await observe(3102, m => {
      let c = scene(m);
      const id = c.squad[0].id, expected = Array(9).fill(0) as number[];
      let calls = 0;
      while (c.week < c.calendar.length && calls++ < 180) {
        const last = c.calendar.reduce((n, entry, i) => entry.night ? n : i, -1);
        const plan = c.week >= last ? DOUBLE : LIGHT;
        c = m.cm.setTrainingPlan(c, plan);
        const from = c.week, calendar = copy(c.calendar);
        c = step(m, c);
        for (let i = from; i < c.week; i++) if (!calendar[i].night) expected[plan === DOUBLE ? 8 : 0]++;
      }
      expect(c.week, 'SETUP complete actual season').toBe(c.calendar.length);
      expect(expected[0], 'SETUP more than three charged light weeks').toBeGreaterThan(3);
      expect(expected[8], 'SETUP final charged week alone uses double/youth').toBe(1);
      c = m.cm.finishSeason(c).state;
      const p = player(c, id);
      Object.assign(p, { age: 20, rating: 70, potential: 80, apps: 30, contractYears: 5 });
      c = m.cm.setTransferStatus(c, id, 'blocked');
      const legacy = copy(c); delete (player(legacy, id) as CMPlayer & { trainingExposure?: unknown }).trainingExposure;
      return { c, legacy, id, expected };
    });
    const { c, legacy, id, expected } = season.value;
    const recorded = await summer(c, 7102), finalPlanOnly = await summer(legacy, 7102);
    const actual = player(recorded.value, id), old = player(finalPlanOnly.value, id);
    raw('late-flip', { id, expected, actualHistory: history(player(c, id)), currentPlan: c.training,
      recorded: actual, finalPlanOnly: old, draws: recorded.draws, nextDraw: recorded.nextDraw,
      referenceDraws: finalPlanOnly.draws, referenceNextDraw: finalPlanOnly.nextDraw,
      seasonDraws: season.draws, seasonNextDraw: season.nextDraw });
    expect(recorded.draws).toStrictEqual(finalPlanOnly.draws);
    expect(recorded.nextDraw).toBe(finalPlanOnly.nextDraw);
    expect(actual.rating, 'CM_TRAINING_LATE_FLIP_SUMMER').toBeLessThan(old.rating);
    expect(history(player(c, id)), 'CM_TRAINING_LATE_FLIP_SUMMER').toStrictEqual(exposure(c, expected));
    expect(history(actual), 'CM_TRAINING_LATE_FLIP_SUMMER').toBeUndefined();
  }, 120000);

  it('preserves all nine constant-plan annual states and complete random tapes', async () => {
    const fixture = await observe(3103, m => {
      const c = scene(m);
      const rates = PLANS.map((plan, index) => {
        const selected = { ...c, training: plan }, p = copy(c.squad[0]);
        const counts = Array(9).fill(0) as number[]; counts[index] = 17;
        put(p, exposure(c, counts));
        return [m.cm.developmentRate(c.squad[0], selected), m.cm.developmentRate(p, selected)];
      });
      return { c, rates };
    }), rows = [];
    for (const [plain, recorded] of fixture.value.rates) expect(recorded).toBe(plain);
    for (let index = 0; index < PLANS.length; index++) {
      const plain = copy(fixture.value.c); plain.training = PLANS[index];
      const recorded = copy(plain), counts = Array(9).fill(0) as number[]; counts[index] = 17;
      for (const p of recorded.squad) put(p, exposure(recorded, counts));
      const a = await summer(plain, 7103 + index), b = await summer(recorded, 7103 + index);
      rows.push({ plan: PLANS[index], plain: digest(withoutHistory(a.value)), recorded: digest(withoutHistory(b.value)),
        plainDraws: a.draws, recordedDraws: b.draws, plainNext: a.nextDraw, recordedNext: b.nextDraw });
      expect(withoutHistory(b.value)).toStrictEqual(withoutHistory(a.value));
      expect(b.draws).toStrictEqual(a.draws); expect(b.nextDraw).toBe(a.nextDraw);
    }
    raw('constant-plans', { rates: fixture.value.rates, rows });
  }, 120000);

  it('applies the literal mixed-policy mean while keeping the current-plan forecast unchanged', async () => {
    const fixture = await observe(3104, m => {
      const c = scene(m); c.training = DOUBLE;
      const id = c.squad[0].id, p = player(c, id);
      put(p, exposure(c, [3, 0, 0, 0, 0, 0, 0, 0, 1]));
      return { c, id, forecast: m.cm.developmentRate(p, c) };
    });
    const { c, id, forecast } = fixture.value;
    const reference = copy(c);
    delete (player(reference, id) as CMPlayer & { trainingExposure?: unknown }).trainingExposure;
    const a = await summer(reference, 7104), b = await summer(c, 7104);
    // Both careers retain Double/youth. Its literal 2.6 rate maps base drifts 1/2/3 to gains 3/5/8.
    // Only this player's recorded history differs, rather than changing the whole squad's standing plan.
    const referenceGain = player(a.value, id).rating - 70;
    const baseDrift = referenceGain === 3 ? 1 : referenceGain === 5 ? 2 : referenceGain === 8 ? 3 : null;
    const expected = baseDrift === null ? null : 70 + Math.round(baseDrift * 1.45819856);
    raw('mixed-mean', { forecast, counts: [3, 0, 0, 0, 0, 0, 0, 0, 1], baseDrift, referenceGain,
      literalRate: 1.45819856, expected, actual: player(b.value, id), reference: player(a.value, id),
      referencePlan: reference.training, recordedPlan: c.training, referenceDraws: a.draws, draws: b.draws,
      referenceNextDraw: a.nextDraw, nextDraw: b.nextDraw });
    expect([3, 5, 8]).toContain(referenceGain); expect(forecast).toBe(2.6);
    expect(b.draws).toStrictEqual(a.draws); expect(b.nextDraw).toBe(a.nextDraw);
    expect(player(b.value, id).rating, 'CM_TRAINING_MIXED_MEAN').toBe(expected);
  });

  it('keeps observations through real save/load and starts the next season with no inherited weeks', async () => {
    const run = await observe(3105, m => {
      const c = windowScene(scene(m)), id = c.squad[0].id;
      c.training = { intensity: 'normal', focus: 'balanced' };
      put(player(c, id), exposure(c, [2, 0, 0, 0, 0, 0, 0, 0, 0]));
      localStorage.clear();
      expect(m.cm.saveCareer(c), 'SETUP real writer acknowledges save').toBe(true);
      const loaded = m.cm.loadCareer();
      expect(loaded, 'SETUP real reader opens known career').toBeTruthy();
      expect(history(player(loaded!, id))).toStrictEqual(history(player(c, id)));
      const next = step(m, loaded!);
      return { before: c, next, id };
    });
    const rolled = await summer(run.value.next, 7105);
    const fresh = await observe(8105, m => {
      const c = copy(rolled.value);
      m.cm.registerLeagueOverrides(c.leagueOverrides ?? null);
      m.cm.registerCustomClub(c.customClub ?? null, c.eraId);
      return step(m, windowScene(c));
    });
    const { before, next, id } = run.value, after = player(fresh.value, id);
    expect(fresh.value.season).toBe(before.season + 1);
    expect(fresh.value.clubName).toBe(before.clubName);
    raw('reload-rollover', { id, saved: history(player(before, id)), advanced: history(player(next, id)),
      summer: history(player(rolled.value, id)), nextSeason: history(after),
      tickDraws: run.draws, summerDraws: rolled.draws, freshDraws: fresh.draws });
    expect(history(player(next, id)), 'CM_TRAINING_RELOAD_ROLLOVER')
      .toStrictEqual(exposure(next, [2, 0, 0, 0, 1, 0, 0, 0, 0]));
    expect(history(player(rolled.value, id)), 'CM_TRAINING_RELOAD_ROLLOVER').toBeUndefined();
    expect(history(after), 'CM_TRAINING_RELOAD_ROLLOVER')
      .toStrictEqual(exposure(fresh.value, [0, 0, 0, 0, 1, 0, 0, 0, 0]));
  });

  it('starts new signings and incoming loans at their own first charged week', async () => {
    const run = await observe(3106, m => {
      let c = windowScene(scene(m)); c.training = { intensity: 'normal', focus: 'balanced' };
      const incumbent = c.squad[0].id;
      for (const p of c.squad) put(p, exposure(c, [0, 0, 0, 0, 2, 0, 0, 0, 0]));
      const market = { name: 'Fictional Training Arrival', club: 'Everton', position: 'CM' as const,
        age: 20, rating: 60, value: 1, price: 1, generated: true, nation: 'New Zealand' };
      const signed = m.cm.buyPlayer(c, market);
      expect(signed, 'SETUP actual permanent signing accepted').toBeTruthy(); c = signed!;
      const loaned = m.cm.loanIn(c, { ...market, name: 'Fictional Training Loanee' });
      expect(loaned, 'SETUP actual incoming loan accepted').toBeTruthy(); c = loaned!;
      const arrivals = c.squad.filter(p => p.name === market.name || p.name === 'Fictional Training Loanee');
      expect(arrivals).toHaveLength(2); expect(arrivals.some(p => p.onLoan)).toBe(true);
      expect(arrivals.map(p => history(p))).toStrictEqual([undefined, undefined]);
      const after = step(m, c);
      return { before: c, after, incumbent, arrivals: arrivals.map(p => p.id) };
    });
    const { before, after, incumbent, arrivals } = run.value;
    raw('arrivals', { incumbent, arrivals, before: before.squad.map(p => ({ id: p.id, history: history(p) })),
      after: after.squad.map(p => ({ id: p.id, history: history(p) })), draws: run.draws, nextDraw: run.nextDraw });
    expect(history(player(after, incumbent)), 'CM_TRAINING_PLAYER_OWNERSHIP')
      .toStrictEqual(exposure(after, [0, 0, 0, 0, 3, 0, 0, 0, 0]));
    for (const id of arrivals) expect(history(player(after, id)), 'CM_TRAINING_PLAYER_OWNERSHIP')
      .toStrictEqual(exposure(after, [0, 0, 0, 0, 1, 0, 0, 0, 0]));
  });

  it('freezes a loaned-out player while absent and resumes only his own count on recall', async () => {
    const run = await observe(3107, m => {
      let c = windowScene(scene(m)); c.training = LIGHT;
      const p = c.squad.find(row => row.position !== 'GK' && m.cm.canLeaveSquad(c, row))!;
      expect(p, 'SETUP legal young outbound loanee').toBeTruthy();
      put(p, exposure(c, [2, 0, 0, 0, 0, 0, 0, 0, 0]));
      const out = m.cm.loanOutPlayer(c, p.id, 'Everton', 0);
      expect(out, 'SETUP actual loan-out accepted').toBeTruthy();
      c = step(m, out!);
      const frozen = copy(c.loanedOut!.find(row => row.player.id === p.id)!.player);
      expect(history(frozen)).toStrictEqual(history(p));
      expect(c.squad.some(row => row.id === p.id)).toBe(false);
      const recalled = m.cm.recallLoanedPlayer(c, p.id);
      expect(recalled, 'SETUP actual recall accepted').toBeTruthy();
      const back = recalled!.squad.find(row => row.name === p.name)!;
      expect(back, 'SETUP exact player came home').toBeTruthy();
      expect(history(back)).toStrictEqual(history(p));
      const after = step(m, recalled!);
      return { frozen, back: copy(back), after: player(after, back.id), club: after.clubName, season: after.season };
    });
    raw('outbound-loan', { ...run.value, draws: run.draws, nextDraw: run.nextDraw });
    expect(history(run.value.after), 'CM_TRAINING_LOAN_ABSENCE').toStrictEqual({
      v: 1, club: run.value.club, season: run.value.season, counts: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    });
  });

  it('does not carry a previous employer or previous season into a new charged week', async () => {
    const fixture = await observe(3108, m => {
      const c = scene(m);
      for (const p of c.squad) put(p, exposure(c, [20, 0, 0, 0, 0, 0, 0, 0, 0]));
      return c;
    });
    const moved = await summer(fixture.value, 7108, 'Everton');
    expect(moved.value.clubName, 'SETUP actual summer job move').toBe('Everton');
    expect(moved.value.squad.every(p => history(p) === undefined)).toBe(true);
    const run = await observe(8108, m => {
      const c = copy(moved.value);
      m.cm.registerLeagueOverrides(c.leagueOverrides ?? null);
      m.cm.registerCustomClub(null, c.eraId);
      c.training = { intensity: 'normal', focus: 'balanced' };
      const id = c.squad[0].id;
      // A valid old receipt is inactive even if a player object travels between clubs.
      put(player(c, id), { v: 1, club: fixture.value.clubName, season: fixture.value.season,
        counts: [20, 0, 0, 0, 0, 0, 0, 0, 0] });
      const second = c.squad[1].id;
      put(player(c, second), { v: 1, club: c.clubName, season: c.season - 1,
        counts: [20, 0, 0, 0, 0, 0, 0, 0, 0] });
      const after = step(m, windowScene(c));
      return { after, id, second };
    });
    raw('club-season', { oldClub: fixture.value.clubName, club: run.value.after.clubName,
      season: run.value.after.season, players: [run.value.id, run.value.second].map(id => player(run.value.after, id)),
      moveDraws: moved.draws, tickDraws: run.draws });
    for (const id of [run.value.id, run.value.second]) expect(history(player(run.value.after, id)), 'CM_TRAINING_SCOPE_RESET')
      .toStrictEqual(exposure(run.value.after, [0, 0, 0, 0, 1, 0, 0, 0, 0]));
  });

  it('keeps missing, empty and unsupported history readable with no invented past observations', async () => {
    const run = await observe(3109, m => {
      const base = scene(m), rows = [];
      const bad: unknown[] = [null, 'unknown', { v: 2, club: base.clubName, season: base.season, counts: Array(9).fill(9) },
        { v: 1, club: base.clubName, season: base.season, counts: [-1, 0, 0, 0, 0, 0, 0, 0, 0] },
        { v: 1, club: base.clubName, season: base.season, counts: [0.5, 0, 0, 0, 0, 0, 0, 0, 0] },
        { v: 1, club: base.clubName, season: base.season, counts: [1] }];
      for (const value of bad) {
        const c = windowScene(copy(base)), id = c.squad[0].id;
        put(player(c, id), value);
        localStorage.clear(); expect(m.cm.saveCareer(c)).toBe(true);
        const loaded = m.cm.loadCareer(); expect(loaded).toBeTruthy();
        expect(loaded!.clubName).toBe(c.clubName); expect(loaded!.season).toBe(c.season);
        expect(history(player(loaded!, id))).toStrictEqual(value);
        const after = step(m, loaded!);
        expect(history(player(after, id))).toStrictEqual(value);
        rows.push({ value, loaded: history(player(loaded!, id)), after: history(player(after, id)),
          forecast: m.cm.developmentRate(player(after, id), after) });
      }
      return rows;
    });
    // Missing/empty metadata has exactly the legacy current-plan summer, not guessed earlier weeks.
    const fixture = await observe(4109, m => scene(m));
    const empty = copy(fixture.value);
    for (const p of empty.squad) put(p, exposure(empty, Array(9).fill(0)));
    const a = await summer(fixture.value, 7109), b = await summer(empty, 7109);
    expect(withoutHistory(b.value)).toStrictEqual(withoutHistory(a.value));
    expect(b.draws).toStrictEqual(a.draws); expect(b.nextDraw).toBe(a.nextDraw);
    raw('legacy-hostile', { hostile: run.value, missing: digest(withoutHistory(a.value)), empty: digest(withoutHistory(b.value)),
      missingDraws: a.draws, emptyDraws: b.draws, nextDraw: b.nextDraw });
  }, 120000);
});
