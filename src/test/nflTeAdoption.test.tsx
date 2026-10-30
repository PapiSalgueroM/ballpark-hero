import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import NflPage from '@/pages/PerfectSeasonNfl';
import { fetchSquad, NFL_SLOTS, type TeamSeasonEntry } from '@/lib/perfectSeasonNfl';
import { getDailyDateET, loadDailyAttempt, saveDailyAttempt, type SpinSquad, type SimResult } from '@/lib/perfectSeason';
import { simulateSeasonFair } from '@/lib/perfectSeasonExpansion';

type Row = Record<string, unknown>;
const evidence = vi.hoisted(() => ({
  weekly: [] as Row[], defense: [] as Row[],
  queries: [] as { table: string; columns: string; eq: [string, unknown][]; limit: number | null; single: boolean }[],
  indexCalls: [] as unknown[],
  loads: [] as { entry: TeamSeasonEntry; options: unknown; output: SpinSquad | null }[],
  simulations: [] as SimResult[],
  simulationArgs: [] as unknown[][],
  pickers: [] as { sport: string; passedDate: string | null; dayAtCreation: string; draws: { length: number; value: number }[] }[],
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from(table: string) {
    const call = { table, columns: '', eq: [] as [string, unknown][], limit: null as number | null, single: false };
    const query = {
      select(columns: string) { call.columns = columns; return query; },
      eq(column: string, value: unknown) { call.eq.push([column, value]); return query; },
      limit(value: number) { call.limit = value; return query; },
      maybeSingle() { call.single = true; return query; },
      then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
        if (!['nflfastr_player_stats', 'nfl_team_defense'].includes(table)) throw new Error('NFL_TE_ADOPTION_UNDECLARED_TABLE:' + table);
        const source = table === 'nflfastr_player_stats' ? evidence.weekly : evidence.defense;
        let rows = source.filter(row => call.eq.every(([key, value]) => String(row[key]) === String(value)));
        if (call.limit !== null) rows = rows.slice(0, call.limit);
        const columns = call.columns.split(',').map(value => value.trim());
        const projected = rows.map(row => Object.fromEntries(columns.map(key => [key, row[key]])));
        evidence.queries.push(structuredClone(call));
        return Promise.resolve({ data: call.single ? projected[0] ?? null : projected, error: null }).then(resolve, reject);
      },
    };
    return query;
  } },
}));
vi.mock('@/lib/perfectSeasonNfl', async original => {
  const actual = await original<typeof import('@/lib/perfectSeasonNfl')>();
  return { ...actual,
    fetchTeamSeasonIndex: async (options: unknown) => {
      evidence.indexCalls.push(structuredClone(options));
      return [{ abbr: 'NE', year: 2011, name: 'New England Patriots' }];
    },
    fetchSquad: async (entry: TeamSeasonEntry, options?: { legacyTeRating?: boolean }) => {
      const load = actual.fetchSquad as (entry: TeamSeasonEntry, options?: { legacyTeRating?: boolean }) => ReturnType<typeof actual.fetchSquad>;
      const output = await load(entry, options);
      evidence.loads.push({ entry: structuredClone(entry), options: structuredClone(options), output: structuredClone(output) });
      return output;
    },
  };
});

vi.mock('@/lib/perfectSeason', async original => {
  const actual = await original<typeof import('@/lib/perfectSeason')>();
  return { ...actual, makeDailyPicker: (sport: string, date?: string) => {
    const picker = actual.makeDailyPicker(sport, date);
    const record = { sport, passedDate: date ?? null, dayAtCreation: actual.getDailyDateET(), draws: [] as { length: number; value: number }[] };
    evidence.pickers.push(record);
    return (length: number) => { const value = picker(length); record.draws.push({ length, value }); return value; };
  } };
});

vi.mock('@/lib/perfectSeasonExpansion', async original => {
  const actual = await original<typeof import('@/lib/perfectSeasonExpansion')>();
  return { ...actual, simulateSeasonFair: (...args: Parameters<typeof actual.simulateSeasonFair>) => {
    const output = actual.simulateSeasonFair(...args); evidence.simulations.push(structuredClone(output)); evidence.simulationArgs.push(structuredClone(args)); return output;
  } };
});
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'TE QA guest' }));

const entries = [{ abbr: 'NE', year: 2011, name: 'New England Patriots' }, { abbr: 'KC', year: 2022, name: 'Kansas City Chiefs' }];
type LegacyOutcomes = { squads: SpinSquad[]; calls: typeof evidence.queries };
let legacy: LegacyOutcomes;
const hash = (body: Buffer) => createHash('sha256').update(body).digest('hex');
const fixture = (name: string, expected: string) => {
  const body = fs.readFileSync(path.join(process.cwd(), 'scripts/qa/fixtures/nfl-te', name));
  expect(hash(body), 'NFL_TE_ADOPTION_SETUP_FROZEN_FIXTURE').toBe(expected); return JSON.parse(body.toString('utf8'));
};
beforeAll(() => {
  evidence.weekly = fixture('weekly.json', '9bc1dff6891a20eef77beb63eb0dc29b6f1db3d20414b9ef90b1a19e2cd84075').rows;
  evidence.defense = fixture('defense.json', '6b32f514a29d128ad07aa4c9f0a9ca8a46a9f8a0f05513902fcb134c2a91a1c2').rows;
  legacy = fixture('legacy-outcomes.json', '729290561f5465f5d2fc2f1f1f03bb5c9bfd1f0230b0c58b481711563fcf3560');
  expect(evidence.weekly).toHaveLength(355); expect(evidence.defense).toHaveLength(2);
});
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  evidence.queries = []; evidence.indexCalls = []; evidence.loads = []; evidence.simulations = []; evidence.simulationArgs = []; evidence.pickers = [];
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
const load = fetchSquad as (entry: TeamSeasonEntry, options?: { legacyTeRating?: boolean }) => ReturnType<typeof fetchSquad>;
const tick = (ms = 10) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const mount = (time: string) => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(time));
  return render(<HelmetProvider><MemoryRouter initialEntries={['/perfect-season-nfl']}><NflPage /></MemoryRouter></HelmetProvider>);
};
async function choose(mode: 'Classic' | 'Daily') {
  fireEvent.click(screen.getByText(mode, { exact: true }).closest('button')!); await tick();
}
async function spin() {
  fireEvent.click(screen.getByRole('button', { name: /^(Spin the wheel|Next spin)$/ })); await tick(1600);
  const loaded = evidence.loads.at(-1)?.output;
  expect(loaded, 'NFL_TE_ADOPTION_SETUP_REAL_SQUAD').toBeTruthy();
  return loaded!;
}
function gronk(squad: SpinSquad) {
  const player = squad.players.find(p => p.name === 'Rob Gronkowski');
  expect(player, 'NFL_TE_ADOPTION_SETUP_REAL_ANCHOR').toBeTruthy(); return player!;
}
function cardRating(expected: number, marker: string) {
  const name = screen.getByText('Rob Gronkowski', { exact: true }), card = name.closest('button');
  expect(card, 'NFL_TE_ADOPTION_SETUP_REAL_CARD').not.toBeNull();
  expect(card!.querySelector('span')?.textContent, marker).toBe(String(expected));
}
async function finishLegacyDaily(checkLegacy = true) {
  const used = new Set<string>();
  for (const slot of NFL_SLOTS) {
    const squad = await spin();
    if (checkLegacy) expect(gronk(squad).rating, 'NFL_TE_DAILY_SAVE_LEGACY_CURVE').toBe(90);
    const player = squad.players.filter(p => p.eligible.includes(slot.key) && !used.has(p.name)).sort((a, b) => b.rating - a.rating)[0];
    expect(player, 'NFL_TE_ADOPTION_SETUP_FILLABLE_SLOT').toBeTruthy(); used.add(player.name);
    const buttons = screen.getAllByText(player.name, { exact: true }).map(el => el.closest('button')).filter(Boolean) as HTMLButtonElement[];
    const button = buttons.find(el => !el.disabled);
    expect(button, 'NFL_TE_ADOPTION_SETUP_REAL_PICK').toBeTruthy(); fireEvent.click(button!); await tick();
    const assign = screen.queryByRole('button', { name: slot.key, exact: true });
    if (assign) { fireEvent.click(assign); await tick(); }
  }
  expect(evidence.simulations).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Skip to result', exact: true })); await tick();
  return evidence.simulations[0];
}

describe('NFL tight-end adoption adapter', () => {
  it('explicit legacy loading preserves original squads, statistics and queries', async () => {
    const squads = await Promise.all(entries.map(entry => load(entry, { legacyTeRating: true })));
    expect(squads).toEqual(legacy.squads); expect(evidence.queries).toEqual(legacy.calls);
  });
  it('calibrates only tight-end ratings through the real default adapter', async () => {
    const old = await Promise.all(entries.map(entry => load(entry, { legacyTeRating: true })));
    expect(old, 'NFL_TE_ADOPTION_SETUP_LEGACY_CONTROL').toEqual(legacy.squads);
    evidence.queries = [];
    const current = await Promise.all(entries.map(entry => load(entry)));
    const expectedRatings: Record<string, number> = { 'Rob Gronkowski': 99, 'Aaron Hernandez': 91, 'Travis Kelce': 99, 'Noah Gray': 53 };
    for (const squad of current) {
      expect(squad, 'NFL_TE_ADOPTION_SETUP_REAL_SQUAD').toBeTruthy();
      const previous = legacy.squads.find(s => s.squadId === squad!.squadId)!;
      for (const player of squad!.players) {
        const prior = previous.players.find(p => p.playerId === player.playerId)!;
        if (prior.eligible.includes('TE')) {
          expect(player.rating, 'NFL_TE_ADOPTION_CURVE_MISSING').toBe(expectedRatings[player.name]);
          expect({ ...player, rating: prior.rating }).toEqual(prior);
        } else expect(player).toEqual(prior);
      }
    }
    expect(evidence.queries).toEqual(legacy.calls);
  });
});

describe('NFL Daily tight-end activation', () => {
  it('keeps Daily legacy before the activation ET date', async () => {
    mount('2026-11-02T04:59:50Z'); expect(getDailyDateET()).toBe('2026-11-01');
    await choose('Daily'); const squad = await spin();
    expect(gronk(squad).rating, 'NFL_TE_DAILY_BEFORE_CUTOFF').toBe(90); cardRating(90, 'NFL_TE_DAILY_BEFORE_CUTOFF');
    expect(evidence.indexCalls).toEqual([{ oldWheel: false }]);
  });
  it('activates the calibrated curve at the first eligible ET date', async () => {
    mount('2026-11-02T05:00:00Z'); expect(getDailyDateET()).toBe('2026-11-02');
    await choose('Daily'); const squad = await spin();
    expect(gronk(squad).rating, 'NFL_TE_DAILY_BOUNDARY').toBe(99); cardRating(99, 'NFL_TE_DAILY_BOUNDARY');
    expect(evidence.indexCalls).toEqual([{ oldWheel: false }]);
  });
  it('uses the calibrated Classic curve before the Daily cutoff', async () => {
    mount('2026-11-01T17:00:00Z'); await choose('Classic'); const squad = await spin();
    expect(gronk(squad).rating, 'NFL_TE_CLASSIC_CURVE').toBe(99); cardRating(99, 'NFL_TE_CLASSIC_CURVE');
    expect(evidence.indexCalls).toEqual([{ oldWheel: false }]);
  });
  it('keeps a mounted Daily legacy across ET midnight', async () => {
    mount('2026-11-02T04:59:50Z'); await choose('Daily'); const first = await spin();
    expect(gronk(first).rating, 'NFL_TE_DAILY_MOUNT_PIN').toBe(90);
    vi.setSystemTime(new Date('2026-11-02T05:00:01Z')); expect(getDailyDateET()).toBe('2026-11-02');
    fireEvent.click(screen.getByRole('button', { name: 'Reroll (2 left)', exact: true })); await tick(1600);
    expect(evidence.loads).toHaveLength(2);
    expect(gronk(evidence.loads[1].output!).rating, 'NFL_TE_DAILY_MOUNT_PIN').toBe(90);
    cardRating(90, 'NFL_TE_DAILY_MOUNT_PIN');
  });
  it('saves a Daily finished after midnight under its pinned ET date', async () => {
    mount('2026-11-02T04:59:50Z'); await choose('Daily');
    vi.setSystemTime(new Date('2026-11-02T05:00:01Z'));
    const result = await finishLegacyDaily(), saved = loadDailyAttempt('nfl', '2026-11-01');
    expect(saved, 'NFL_TE_DAILY_SAVE_DATE').not.toBeNull(); expect(saved!.date).toBe('2026-11-01');
    expect(saved!.v).toBe(1); expect(saved!.sim).toEqual(result); expect(saved!.spins).toBe(8);
    expect(loadDailyAttempt('nfl', '2026-11-02'), 'NFL_TE_DAILY_SAVE_DATE').toBeNull();
    expect(Object.keys(saved!).sort()).toEqual(['date', 'overall', 'sim', 'spins', 'teamNames', 'v']);
    expect(evidence.loads).toHaveLength(8);
  });

  it('pins draws, simulation seed and date when Daily is entered after ET midnight', async () => {
    mount('2026-11-02T04:59:50Z'); expect(getDailyDateET()).toBe('2026-11-01');
    vi.setSystemTime(new Date('2026-11-02T05:00:01Z')); expect(getDailyDateET()).toBe('2026-11-02');
    const actual = await vi.importActual<typeof import('@/lib/perfectSeason')>('@/lib/perfectSeason');
    const mounted = actual.makeDailyPicker('nfl', '2026-11-01'), newer = actual.makeDailyPicker('nfl', '2026-11-02');
    const lengths = [...Array(8).fill(1), 2 ** 31];
    const expectedDraws = lengths.map(length => ({ length, value: mounted(length) }));
    const newerDraws = lengths.map(length => ({ length, value: newer(length) }));
    expect(expectedDraws.at(-1)!.value, 'NFL_TE_ADOPTION_SETUP_DISTINCT_DAILY_SEEDS').not.toBe(newerDraws.at(-1)!.value);
    await choose('Daily'); const result = await finishLegacyDaily(false);
    expect(evidence.pickers).toHaveLength(1); expect(evidence.simulationArgs).toHaveLength(1);
    expect(evidence.simulationArgs[0][3], 'NFL_TE_DAILY_ENTRY_DATE_PIN').toBe(expectedDraws.at(-1)!.value);
    expect(evidence.pickers[0].draws, 'NFL_TE_DAILY_ENTRY_DATE_PIN').toEqual(expectedDraws);
    expect(evidence.pickers[0].passedDate).toBe('2026-11-01'); expect(evidence.pickers[0].dayAtCreation).toBe('2026-11-02');
    expect(gronk(evidence.loads[0].output!).rating, 'NFL_TE_DAILY_ENTRY_CURVE').toBe(90);
    const saved = loadDailyAttempt('nfl', '2026-11-01');
    expect(saved!.date).toBe('2026-11-01'); expect(saved!.sim).toEqual(result); expect(saved!.v).toBe(1);
    expect(loadDailyAttempt('nfl', '2026-11-02')).toBeNull();
  });

  it.each(['2026-11-01', '2026-11-02'])('reopens the %s saved result without fetching or recomputing', async date => {
    const sim = simulateSeasonFair('nfl', 75, 17, 20261101);
    saveDailyAttempt('nfl', { date, sim, overall: 75, spins: 8, teamNames: Array(8).fill('2011 New England Patriots') });
    const key = 'perfect-season-nfl-daily-' + date, bytes = localStorage.getItem(key);
    evidence.simulations = [];
    mount(date + 'T17:00:00Z'); await choose('Daily');
    expect(screen.getByRole('heading', { name: "Today's daily is done" })).toBeVisible();
    expect(evidence.loads).toEqual([]); expect(evidence.indexCalls).toEqual([]); expect(evidence.simulations).toEqual([]);
    expect(localStorage.getItem(key), 'NFL_TE_DAILY_STORED_RECORD_CHANGED').toBe(bytes);
    expect(loadDailyAttempt('nfl', date)!.sim).toEqual(sim);
    expect(screen.getByText(/^Team overall 75 · drafted in 8 spins$/)).toBeVisible();
  });
});

