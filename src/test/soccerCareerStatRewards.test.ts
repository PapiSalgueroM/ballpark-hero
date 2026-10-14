import { describe, expect, it, vi } from 'vitest';
import type { CareerState, RandomEvent } from '@/lib/soccerCareerEngine';
import { validChanceWheel } from '@/lib/careerChanceWheel';

const E = (process.env.SC_REWARDS_ENGINE ? await import(/* @vite-ignore */ process.env.SC_REWARDS_ENGINE)
  : await import('@/lib/soccerCareerEngine')) as typeof import('@/lib/soccerCareerEngine');
const L = (process.env.SC_REWARDS_LIFE ? await import(/* @vite-ignore */ process.env.SC_REWARDS_LIFE)
  : await import('@/lib/soccerCareerLife')) as typeof import('@/lib/soccerCareerLife');
const S = (process.env.SC_REWARDS_SAVE ? await import(/* @vite-ignore */ process.env.SC_REWARDS_SAVE)
  : await import('@/lib/soccerCareerSave')) as typeof import('@/lib/soccerCareerSave');
const C = (process.env.SC_REWARDS_CONTRACTS ? await import(/* @vite-ignore */ process.env.SC_REWARDS_CONTRACTS)
  : await import('@/lib/soccerCareerContracts')) as typeof import('@/lib/soccerCareerContracts');
const keys = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'] as const;
type Boundary = Pick<CareerState, typeof keys[number] | 'statBoostNextSeason'>;
const observed = globalThis as typeof globalThis & { __SC_REWARDS_BOUNDARIES?: Boundary[] };
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const year = (state: CareerState) => state.seasons[state.seasons.length - 1]!.year;
const clamp = (value: number) => Math.max(0, Math.min(100, value));
function draws<T>(input: number | (() => number), action: () => T): { result: T; values: number[] } {
  const values: number[] = [], spy = vi.spyOn(Math, 'random').mockImplementation(() => {
    const value = typeof input === 'number' ? input : input(); values.push(value); return value;
  });
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-13T16:00:00Z'));
  try { return { result: action(), values }; } finally { spy.mockRestore(); clock.mockRestore(); }
}
function restore(state: CareerState): CareerState {
  const serialized = json(state); expect(S.isSoccerCareerSave(serialized)).toBe(true);
  const repaired = E.repairCareer(serialized); expect(S.isSoccerCareerSave(repaired)).toBe(true); return repaired;
}
function context(id = 218): CareerState {
  return restore(draws(0.9, () => {
    const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
    const base = E.initCareer(`Stat Reward Fixture ${id}`, 'England', 'CM', '2020s', stats, 70, 2020, E.FALLBACK_CLUBS, null, 90);
    const club = E.FALLBACK_CLUBS[0];
    const persona = id === 211 ? 'showman' : id === 213 ? 'iceman' : id === 214 || id === 215 ? 'hothead'
      : id === 217 ? 'professor' : 'enigma';
    return { ...base, age: 23, phase: 'playing', retired: false, personality: persona, agentId: id === 205 ? 'cousin' : 'self',
      currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color,
      currentLeague: club.league, contractYearsLeft: 4, weeklyWage: 10000, netWorth: 10, morale: 65,
      popularity: 40, socialMediaFollowers: 1, integrityBonus: 5, sponsorBonus: 0.2, marketValue: 4,
      seasons: [{ ...base.seasons[0], year: 2026, age: 23, club: club.name, clubCountry: club.country, clubTier: club.tier,
        type: 'playing', apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7, injury: null, injuryWeeks: 0, injurySevere: false }],
      lifeFlags: {}, eventLastFired: {}, pendingEvents: [], seriousInjuries: [],
      statBoostNextSeason: { physical: 2, reflexes: 3 }, events: ['Prepared fictional stat reward context'] } as CareerState;
  }).result);
}
function card(state: CareerState, id: number): RandomEvent {
  const matches = draws(0.1, () => L.getLifeEvents(state).filter(event => event.id === id)).result;
  expect(matches, 'original source card must exist').toHaveLength(1); return matches[0];
}
function waiting(state: CareerState, id = 218): CareerState {
  const event = card(state, id), sentinel = draws(0.99, () => E.getAllEvents(state).find(item => item.id === 220)).result;
  expect(sentinel).toBeDefined();
  // Prepared nonterminal continuation; the first card and its functions are actual catalog output.
  return restore({ ...state, phase: 'random_events', pendingEvents: [event, sentinel!],
    eventLastFired: { ...state.eventLastFired, [String(id)]: year(state), '7777': year(state) - 4 } });
}
function answer(before: CareerState, choice = 0, roll = 0.1): { result: CareerState; values: number[] } {
  const catalog = draws(0.99, () => E.getAllEvents(before));
  let ordinal = 0;
  const wheel = before.pendingEvents[0].id === 218 && choice === 0 || before.pendingEvents[0].id === 219 && choice === 0;
  const run = draws(() => ordinal++ < catalog.values.length ? 0.99 : roll,
    () => E.applyEventChoice(before, choice, E.FALLBACK_CLUBS));
  expect(run.values).toEqual([...catalog.values, ...(wheel ? [roll] : [])]); return run;
}
function additive(queue: CareerState['statBoostNextSeason']): CareerState['statBoostNextSeason'] {
  return { ...queue, pace: (queue.pace ?? 0) + 1, shooting: (queue.shooting ?? 0) + 1,
    passing: (queue.passing ?? 0) + 1, dribbling: (queue.dribbling ?? 0) + 1,
    defending: (queue.defending ?? 0) + 1, physical: (queue.physical ?? 0) + 1, reflexes: (queue.reflexes ?? 0) + 1 };
}
function literal(before: CareerState, after: CareerState, changes: Partial<CareerState>, line: string): void {
  const expected = { ...json(before), ...changes, lastEventId: before.pendingEvents[0].id,
    pendingEvents: json(before.pendingEvents.slice(1)), phase: 'random_events' as const, events: [...before.events, line] };
  expected.overall = E.calcOverall(expected, expected.position);
  expect(json(after)).toEqual(expected);
  expect(after.eventLastFired?.['7777']).toBe(year(before) - 4);
  expect(after.eventLastFired?.[String(before.pendingEvents[0].id)]).toBe(year(before));
  expect(after.pendingEvents.map(event => event.id)).toEqual([220]);
  expect(json(restore(restore(after)))).toEqual(json(after));
}
function monastery(before: CareerState, after: CareerState, choice: number, roll: number): void {
  if (choice === 1) {
    literal(before, after, { morale: clamp(before.morale + 3) }, '🔔 Lasted a week at the monastery. The card they sent is on your fridge'); return;
  }
  const hit = roll < 0.6, queue = hit ? additive(before.statBoostNextSeason) : before.statBoostNextSeason;
  if (hit) expect(JSON.stringify(after.statBoostNextSeason) === JSON.stringify(queue),
    'stat reward additive queue lost an earned delta').toBe(true);
  expect(validChanceWheel(after.chanceWheel)).toBe(true);
  literal(before, after, { statBoostNextSeason: json(queue), ...(hit ? {} : { pace: Math.max(20, Math.min(99, before.pace - 1)) }),
    chanceWheel: { title: 'The Monastery Offseason', chance: 0.6, roll, hit: 'Sharper after the retreat', miss: 'Pace drops by 1', result: hit, seen: false } },
  hit ? '⛰️ Came back from the monastery visibly sharper. Spooky' : '⛰️ The monastery taught you inner peace and excellent soup. Pace -1');
}
const vectors: { name: string; queue: CareerState['statBoostNextSeason'] }[] = [
  { name: 'positive', queue: { pace: 2, shooting: 3, passing: 4, dribbling: 5, defending: 6, physical: 7, reflexes: 8 } },
  { name: 'negative', queue: { pace: -2, shooting: -3, passing: -4, dribbling: -5, defending: -6, physical: -7, reflexes: -8 } },
  { name: 'zero and absent', queue: { pace: 0, shooting: 0, reflexes: 0 } },
];
// Direct unit runs compile the same read-only consumer checkpoint as the remote helper.
async function boundaryEngine(): Promise<typeof E> {
  if (process.env.SC_REWARDS_ENGINE) return E;
  const fs = await import('node:fs/promises'), path = await import('node:path');
  /* Release BF join: in the suite's jsdom environment esbuild refuses to start (its check that an encoded string is an
     instance of this realm's Uint8Array fails), so a plain run of the whole suite went red here. For the build the
     encoder hands back bytes made by this realm's Uint8Array, and the environment's encoder is put back after. The
     remote proof sets SC_REWARDS_ENGINE and never reaches this. */
  const util = await import('node:util'), suiteEncoder = globalThis.TextEncoder;
  class RealmEncoder { readonly encoding = 'utf-8'; encode(input = '') { return new Uint8Array(new util.TextEncoder().encode(input)); } }
  globalThis.TextEncoder = RealmEncoder as unknown as typeof TextEncoder;
  try {
  const esbuild = await import('esbuild'), url = await import('node:url');
  const source = path.join(process.cwd(), 'src/lib/soccerCareerEngine.ts'), original = await fs.readFile(source, 'utf8');
  const anchor = '  s.statBoostNextSeason = {};'; expect(original.split(anchor)).toHaveLength(2);
  const changed = original.replace(anchor, `${anchor}\n  if (Array.isArray(globalThis.__SC_REWARDS_BOUNDARIES)) globalThis.__SC_REWARDS_BOUNDARIES.push({ pace: s.pace, shooting: s.shooting, passing: s.passing, dribbling: s.dribbling, defending: s.defending, physical: s.physical, reflexes: s.reflexes, statBoostNextSeason: { ...s.statBoostNextSeason } });`);
  expect(changed).not.toBe(original);
  /* Release BF join: vitest only loads a module from inside the project, so the build goes to the ignored /tmp/ folder of
     the checkout rather than the system temp folder (there the import failed with "Failed to load url"). */
  await fs.mkdir(path.join(process.cwd(), 'tmp'), { recursive: true });
  const tmp = await fs.mkdtemp(path.join(process.cwd(), 'tmp', 'career-stat-boundary-unit-'));
  await fs.writeFile(path.join(tmp, 'engine.original.ts'), original); await fs.writeFile(path.join(tmp, 'engine.observed.ts'), changed);
  await esbuild.build({ entryPoints: [source], outfile: path.join(tmp, 'engine.mjs'), bundle: true, format: 'esm', platform: 'node',
    alias: { '@': path.join(process.cwd(), 'src') }, logLevel: 'error', plugins: [{ name: 'stat-boundary-read-only', setup(build) {
      build.onLoad({ filter: /soccerCareerEngine\.ts$/ }, args => args.path === source
        ? { contents: changed, loader: 'ts', resolveDir: path.dirname(source) } : undefined);
    } }] });
  const engine = await import(/* @vite-ignore */ url.pathToFileURL(path.join(tmp, 'engine.mjs')).href) as typeof E;
  console.log(`Retained actual stat-boundary unit sources: ${tmp}`); return engine;
  } finally { globalThis.TextEncoder = suiteEncoder; }
}

type Preview = { id: number; choice: number; clauses: RegExp[]; changes: Partial<CareerState>; line: string };
const previews: Preview[] = [
  { id: 205, choice: 0, clauses: [/Followers \+400k/, /Morale -3/], changes: { socialMediaFollowers: 1.4, morale: 62 }, line: '📱 Ricky leaked your contract. The memes were incredible' },
  { id: 205, choice: 1, clauses: [/Represent yourself/, /Morale -5/], changes: { agentId: 'self', morale: 60 }, line: '🚪 Fired Cousin Ricky. Thanksgiving will be tense' },
  { id: 211, choice: 1, clauses: [/Integrity \+4/, /Popularity \+4/], changes: { integrityBonus: 9, popularity: 44 }, line: '❤️ Kept the celebration free for every playground on earth' },
  { id: 213, choice: 0, clauses: [/Followers \+500k/, /Popularity -2/], changes: { socialMediaFollowers: 1.5, popularity: 38 }, line: '🎤 The all-yes interview became a meme format' },
  { id: 214, choice: 1, clauses: [/Integrity \+2/, /Followers \+300k/], changes: { integrityBonus: 7, socialMediaFollowers: 1.3 }, line: '🥶 The tunnel stare went viral. Scarier than shouting' },
  { id: 215, choice: 1, clauses: [/Integrity \+3/, /Morale \+3/], changes: { integrityBonus: 8, morale: 68 }, line: '🛒 Bought the kit man a top of the line cart. All good' },
  { id: 217, choice: 0, clauses: [/Popularity \+4/, /Morale -3 now/, /^(?!.*issue two)/], changes: { popularity: 44, morale: 62 }, line: '✍️ Your tactics column is a hit. The gaffer underlines things in red' },
  { id: 218, choice: 0, clauses: [/60%: all 7 skills \+1 queued for next season/, /normal growth/, /99 cap/, /40%: Pace -1 now/], changes: {}, line: '' },
  { id: 219, choice: 0, clauses: [/Followers \+800k/, /50%: Popularity \+6/, /50%: Popularity -3/], changes: { socialMediaFollowers: 1.8, popularity: 46 }, line: '🦇 The cape era is beloved. Fans wear them to matches' },
];

describe('Soccer Career stat rewards and truthful Life previews', () => {
  for (const vector of vectors) it(`stat rewards missing: ${vector.name} queued bonuses survive the actual hit`, () => {
    const before = waiting({ ...context(), statBoostNextSeason: vector.queue }), held = json(before);
    const after = answer(before).result; monastery(before, after, 0, 0.1); expect(json(before)).toEqual(held);
  });
  for (const vector of vectors) it(`stat rewards preservation: ${vector.name} queued bonuses survive the actual miss`, () => {
    const before = waiting({ ...context(), statBoostNextSeason: vector.queue }), held = json(before);
    monastery(before, answer(before, 0, 0.99).result, 0, 0.99); expect(json(before)).toEqual(held);
  });
  it('stat rewards preservation: leaving holds every queued bonus', () => {
    const before = waiting({ ...context(), statBoostNextSeason: vectors[1].queue }), held = json(before);
    monastery(before, answer(before, 1).result, 1, 0.1); expect(json(before)).toEqual(held);
  });
  it('stat rewards preservation: a wrong personality still skips the saved card', () => {
    const before = restore({ ...waiting(context()), personality: 'iceman' }), held = json(before), expected = json(before);
    expected.lastEventId = 218; expected.pendingEvents = expected.pendingEvents.slice(1); delete expected.eventLastFired!['218'];
    const after = draws(0.99, () => E.applyEventChoice(before, 0, E.FALLBACK_CLUBS)).result;
    expect(json(after)).toEqual(expected); expect(json(before)).toEqual(held);
  });
  it('stat rewards preservation: the original lookup and single wheel draw stay intact', () => {
    for (const roll of [0.1, 0.6, 0.99]) {
      const before = waiting(context()), read = draws(0.99, () => L.getLifeEvents(before));
      expect(read.values).toEqual([0.99, 0.99]);
      const after = answer(before, 0, roll).result;
      expect(after.chanceWheel?.roll).toBe(roll); expect(after.chanceWheel?.result).toBe(roll < 0.6);
      expect(after.chanceWheel?.chance).toBe(0.6); expect(validChanceWheel(after.chanceWheel)).toBe(true);
    }
  });
  it('stat rewards missing: earned bonuses reach the actual next-season boundary once', async () => {
    const before = waiting({ ...context(), pace: 99, shooting: 20, passing: 98, dribbling: 50, defending: 70, physical: 97, reflexes: 20,
      statBoostNextSeason: { pace: 2, shooting: -8, passing: 2, physical: 2, reflexes: 3 } });
    const earned = answer(before).result, consumer = await boundaryEngine();
    observed.__SC_REWARDS_BOUNDARIES = [];
    try {
      // Prepare a legal consumer phase. This is not a fully played UI phase transition.
      const firstInput = restore({ ...earned, phase: 'playing', pendingEvents: [], loan: null });
      const first = draws(0.9, () => consumer.advanceProSeason(firstInput, E.FALLBACK_CLUBS)).result;
      expect(observed.__SC_REWARDS_BOUNDARIES).toHaveLength(1);
      const expected = { pace: 99, shooting: 20, passing: 99, dribbling: 51, defending: 71, physical: 99, reflexes: 24, statBoostNextSeason: {} };
      expect(JSON.stringify(observed.__SC_REWARDS_BOUNDARIES[0]) === JSON.stringify(expected),
        'stat reward boundary lost the additive queued bonuses').toBe(true);
      expect(first.statBoostNextSeason).toEqual({}); expect(year(first)).toBe(year(earned) + 1);
      const secondInput = restore({ ...first, phase: 'playing', pendingEvents: [], loan: null });
      const nextExpected = { pace: secondInput.pace, shooting: secondInput.shooting, passing: secondInput.passing,
        dribbling: secondInput.dribbling, defending: secondInput.defending, physical: secondInput.physical,
        reflexes: secondInput.reflexes, statBoostNextSeason: {} };
      const second = draws(0.9, () => consumer.advanceProSeason(secondInput, E.FALLBACK_CLUBS)).result;
      expect(observed.__SC_REWARDS_BOUNDARIES).toHaveLength(2); expect(observed.__SC_REWARDS_BOUNDARIES[1]).toEqual(nextExpected);
      expect(second.statBoostNextSeason).toEqual({}); expect(year(second)).toBe(year(first) + 1);
    } finally { delete observed.__SC_REWARDS_BOUNDARIES; }
  });
  it('stat rewards preservation: loaded choice inputs remain immutable', () => {
    for (const choice of [0, 1]) for (const roll of [0.1, 0.99]) {
      const before = waiting(context()), held = JSON.stringify(before);
      expect(typeof before.pendingEvents[0].choices[choice].apply).toBe('undefined');
      answer(before, choice, roll); expect(JSON.stringify(before)).toBe(held);
    }
  });
  it('stat rewards preservation: original prerequisite offer and cooldown remain intact', () => {
    const fresh = context();
    for (const [value, present] of [[0.499999, true], [0.5, false]] as const) {
      let ordinal = 0;
      const run = draws(() => ordinal++ === 0 ? value : 0.99, () => L.getLifeEvents(fresh));
      expect(run.values).toEqual([value, 0.99]); expect(run.result.some(event => event.id === 218)).toBe(present);
    }
    expect(draws(0.1, () => L.getLifeEvents({ ...fresh, personality: 'iceman' }).some(event => event.id === 218)).result).toBe(false);
    const queued = waiting(fresh), event = queued.pendingEvents[0];
    expect(E.eventCooldown(event)).toBe(2); expect(E.isEventOnCooldown(queued, event, year(queued) + 2)).toBe(true);
    expect(E.isEventOnCooldown(queued, event, year(queued) + 3)).toBe(false);
  });
  for (const preview of previews) it(`stat preview missing: ${preview.id} choice${preview.choice} shows the actual effect`, () => {
    const state = context(preview.id), actual = card(state, preview.id).choices[preview.choice];
    expect(preview.clauses.every(clause => clause.test(actual.consequence)),
      'current Life preview omits an actual effect clause').toBe(true);
    const stale = 'Old saved words without the numeric effects', held = JSON.stringify(state);
    const refreshed = C.soccerEventChoiceConsequence(state, preview.id, preview.choice, stale);
    expect(preview.clauses.every(clause => clause.test(refreshed)),
      'legacy saved Life preview still omits an actual effect clause').toBe(true);
    expect(stale).toBe('Old saved words without the numeric effects'); expect(JSON.stringify(state)).toBe(held);
    expect(C.soccerEventChoiceConsequence(state, 9999, 0, stale)).toBe(stale);
    const before = waiting(state, preview.id), roll = preview.id === 218 ? 0.99 : 0.1, after = answer(before, preview.choice, roll).result;
    if (preview.id === 218) monastery(before, after, 0, 0.99);
    else literal(before, after, { ...preview.changes, ...(preview.id === 219 ? { chanceWheel: {
      title: 'The Cape Era', chance: 0.5, roll: 0.1, hit: 'The cape is loved', miss: 'The cape divides opinion', result: true, seen: false } } : {}) }, preview.line);
  });
});
