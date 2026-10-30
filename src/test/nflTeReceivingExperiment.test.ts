import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fetchSquad } from '@/lib/perfectSeasonNfl';

type Row = Record<string, unknown>;
const api = vi.hoisted(() => ({ weekly: [] as Row[], defense: [] as Row[], calls: [] as { table: string; columns: string; eq: [string, unknown][]; limit: number | null; single: boolean }[] }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from(table: string) {
    const call = { table, columns: '', eq: [] as [string, unknown][], limit: null as number | null, single: false };
    const query = {
      select(columns: string) { call.columns = columns; return query; },
      eq(column: string, value: unknown) { call.eq.push([column, value]); return query; },
      limit(value: number) { call.limit = value; return query; },
      maybeSingle() { call.single = true; return query; },
      then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
        if (!['nflfastr_player_stats', 'nfl_team_defense'].includes(table)) throw new Error('NFL_TE_UNDECLARED_TABLE:' + table);
        const source = table === 'nflfastr_player_stats' ? api.weekly : api.defense;
        let rows = source.filter(row => call.eq.every(([key, value]) => String(row[key]) === String(value)));
        if (call.limit !== null) rows = rows.slice(0, call.limit);
        const columns = call.columns.split(',').map(value => value.trim());
        const projected = rows.map(row => Object.fromEntries(columns.map(key => [key, row[key]])));
        api.calls.push(structuredClone(call));
        return Promise.resolve({ data: call.single ? projected[0] ?? null : projected, error: null }).then(resolve, reject);
      },
    };
    return query;
  } },
}));
const entries = [{ abbr: 'NE', year: 2011, name: 'New England Patriots' }, { abbr: 'KC', year: 2022, name: 'Kansas City Chiefs' }];
let squads: NonNullable<Awaited<ReturnType<typeof fetchSquad>>>[];
const gain = Number(process.env.NFL_TE_EXPECTED_GAIN);
const candidate = process.env.NFL_TE_EXPECTED_POLICY === 'candidate';
const curveMarker = candidate ? 'NFL_TE_POSITION_CURVE_MISSING' : 'NFL_TE_BASELINE_PATH';
const card = (team: string, name: string) => squads.find(squad => squad.squadId.startsWith(team + '-'))!.players.find(player => player.name === name)!;
function expectedTe(year: number, yards: number, touchdowns: number, games: number) {
  const mult = year <= 2003 ? 1.05 : year <= 2009 ? 1.03 : year <= 2017 ? 1 : 0.98;
  return Math.round(Math.max(40, Math.min(99, (42.5 + gain * (0.42 * yards / games + 12 * touchdowns / games)) * mult)));
}
beforeAll(async () => {
  expect(Number.isFinite(gain) && gain >= 1, 'NFL_TE_SETUP_EXPECTED_GAIN').toBe(true);
  for (const [file, target] of [['weekly.json', 'weekly'], ['defense.json', 'defense']] as const) {
    const document = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts/qa/fixtures/nfl-te', file), 'utf8'));
    expect(document.readOnly, 'NFL_TE_SETUP_SNAPSHOT_PROVENANCE').toBe(true);
    api[target] = document.rows;
  }
  expect(api.weekly, 'NFL_TE_SETUP_WEEKLY_COUNT').toHaveLength(355);
  expect(api.defense, 'NFL_TE_SETUP_DEFENSE_COUNT').toHaveLength(2);
  const loaded = await Promise.all(entries.map(entry => fetchSquad(entry)));
  expect(loaded.every(Boolean), 'NFL_TE_SETUP_ACTUAL_SQUADS').toBe(true);
  squads = loaded as typeof squads;
  expect(process.env.NFL_TE_OUTCOME_FILE, 'NFL_TE_SETUP_OUTCOME_PATH').toBeTruthy();
  fs.writeFileSync(process.env.NFL_TE_OUTCOME_FILE!, JSON.stringify({ squads, calls: api.calls }, null, 2) + '\n', { flag: 'wx' });
});
describe('NFL tight-end receiving experiment', () => {
  it('reads the real tight-end anchors through the actual squad adapter', () => {
    expect(card('NE', 'Rob Gronkowski').rating, curveMarker).toBe(expectedTe(2011, 1327, 17, 16));
    expect(card('KC', 'Travis Kelce').rating, curveMarker).toBe(expectedTe(2022, 1338, 12, 17));
    expect(card('NE', 'Rob Gronkowski').eligible).toEqual(['TE', 'FLEX']);
    expect(card('KC', 'Travis Kelce').eligible).toEqual(['TE', 'FLEX']);
  });
  it('keeps representative wide receivers on their unchanged ratings', () => {
    expect(card('NE', 'Wes Welker').rating).toBe(90);
    expect(card('NE', 'Deion Branch').rating).toBe(68);
    expect(card('KC', 'JuJu Smith-Schuster').rating).toBe(68);
    expect(card('KC', 'Marquez Valdes-Scantling').rating).toBe(60);
  });
  it('loads the actual other positions and the two retained defense units', () => {
    for (const squad of squads) for (const slot of ['QB', 'RB', 'DEF', 'HC']) {
      expect(squad.players.some(player => player.eligible.includes(slot)), 'NFL_TE_OTHER_POSITION_PRESENT:' + slot).toBe(true);
    }
    expect(squads[0].players.find(player => player.eligible.includes('DEF'))!.rating).toBe(44);
    expect(squads[1].players.find(player => player.eligible.includes('DEF'))!.rating).toBe(69);
  });
  it('retains the actual statistic lines and source query boundaries', () => {
    expect(card('NE', 'Rob Gronkowski').detail).toBe('90 rec · 1327 yds · 17 TD');
    expect(card('KC', 'Travis Kelce').detail).toBe('110 rec · 1338 yds · 12 TD');
    const stats = api.calls.filter(call => call.table === 'nflfastr_player_stats');
    expect(stats).toHaveLength(2);
    for (const [index, call] of stats.entries()) {
      expect(call.eq).toEqual([['season', String(entries[index].year)], ['recent_team', entries[index].abbr], ['season_type', 'REG']]);
      expect(call.limit).toBe(400);
      expect(call.columns).toBe('player_id, player_display_name, player_name, position_group, week, attempts, passing_yards, passing_tds, interceptions, carries, rushing_yards, rushing_tds, receptions, receiving_yards, receiving_tds');
    }
    expect(api.calls.filter(call => call.table === 'nfl_team_defense')).toHaveLength(2);
  });
});
