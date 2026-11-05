import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const observed = vi.hoisted(() => {
  const originalRandom = Math.random;
  let state = 1;
  const draws: number[] = [];
  const calls: { name: string; args: unknown }[] = [];
  const managers: unknown[] = [];
  const customs: unknown[] = [];
  const pack = (value: unknown): unknown => {
    if (value === undefined) return { $type: 'undefined' };
    if (typeof value === 'number' && !Number.isFinite(value)) return { $type: 'number', value: String(value) };
    if (Array.isArray(value)) return value.map(pack);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, pack(item)]));
    return value;
  };
  Math.random = () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17; state >>>= 0;
    state ^= state << 5; state >>>= 0;
    const value = state / 4294967296;
    draws.push(value);
    return value;
  };
  const gate = () => {
    let open!: () => void;
    let refuse!: () => void;
    const promise = new Promise<void>((resolve, reject) => {
      open = resolve;
      refuse = () => reject(new Error('declared actual fixture import refusal'));
    });
    promise.catch(() => {});
    return { promise, open, refuse };
  };
  return {
    originalRandom, draws, calls, managers, customs, pack,
    reset(seed: number) { state = seed >>> 0; draws.length = 0; calls.length = 0; managers.length = 0; customs.length = 0; },
    state: () => state,
    era2010: gate(), laliga: gate(), seriea: gate(), eredivisie: gate(),
  };
});

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/lib/freshBuild', async original => ({ ...(await original<typeof import('@/lib/freshBuild')>()), reloadToRetryChunk: vi.fn(() => false) }));
vi.mock('@/data/clubManagerEra2010', async original => { await observed.era2010.promise; return original(); });
vi.mock('@/data/clubManagerLaLigaFixtures2026', async original => { await observed.laliga.promise; return original(); });
vi.mock('@/data/clubManagerSerieAFixtures2026', async original => { await observed.seriea.promise; return original(); });
vi.mock('@/data/clubManagerEredivisieFixtures2026', async original => { await observed.eredivisie.promise; return original(); });
vi.mock('@/hooks/useClubManager', async original => {
  const real = await original<typeof import('@/hooks/useClubManager')>();
  return { ...real, useClubManager: () => {
    const api = real.useClubManager();
    return { ...api,
      chooseClub: (...args: Parameters<typeof api.chooseClub>) => {
        observed.calls.push({ name: 'chooseClub', args: observed.pack(args) });
        return api.chooseClub(...args);
      },
      confirmClub: (...args: Parameters<typeof api.confirmClub>) => {
        observed.calls.push({ name: 'confirmClub', args: observed.pack(args) });
        return api.confirmClub(...args);
      },
      confirmCustomClub: (...args: Parameters<typeof api.confirmCustomClub>) => {
        observed.calls.push({ name: 'confirmCustomClub', args: observed.pack(args) });
        return api.confirmCustomClub(...args);
      },
    };
  } };
});
vi.mock('@/components/club-manager/ManagerForm', async original => {
  const real = await original<typeof import('@/components/club-manager/ManagerForm')>();
  const react = await import('react');
  const Wrapped = (props: Parameters<typeof real.ManagerForm>[0]) => react.createElement(real.ManagerForm, {
    ...props,
    onConfirm: (...args: Parameters<typeof props.onConfirm>) => {
      observed.managers.push(observed.pack(args));
      return props.onConfirm(...args);
    },
  });
  return { ...real, ManagerForm: Wrapped };
});
vi.mock('@/components/club-manager/CustomClubForm', async original => {
  const real = await original<typeof import('@/components/club-manager/CustomClubForm')>();
  const react = await import('react');
  const Wrapped = (props: Parameters<typeof real.CustomClubForm>[0]) => react.createElement(real.CustomClubForm, {
    ...props, onCreate: (spec: Parameters<typeof props.onCreate>[0]) => {
      observed.customs.push(observed.pack(spec));
      return props.onCreate(spec);
    },
  });
  return { ...real, CustomClubForm: Wrapped, default: Wrapped };
});

vi.useFakeTimers({ toFake: ['Date'] });
vi.setSystemTime(new Date('2026-11-05T12:00:00Z'));
const { default: ClubManager } = await import('@/pages/ClubManager');
const cm = await import('@/lib/clubManager');
const eras = await import('@/lib/clubManagerEras');
const { useClubManager } = await import('@/hooks/useClubManager');
const { swapClubs } = await import('@/lib/clubManagerWorldEdit');
const importDraws = [...observed.draws];
const KEY = cm.SAVE_KEY;
const U = { $type: 'undefined' };
const realFetch = globalThis.fetch;
const fetches: unknown[] = [];
const output = process.env.CM_TEAM_PICKER_OUT;
if (!output || !path.isAbsolute(output)) throw new Error('CM_TEAM_PICKER_OUT must be absolute');
fs.mkdirSync(output, { recursive: true });
let snapshots: unknown[] = [];
let testSeed = 0;
const storage = () => ({
  local: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
  session: Object.fromEntries(Object.keys(sessionStorage).sort().map(key => [key, sessionStorage.getItem(key)])),
});
function take(label: string, value: unknown = null) {
  const raw = localStorage.getItem(KEY);
  const row = {
    label, value: observed.pack(value), raw, saved: raw === null ? null : JSON.parse(raw),
    storage: storage(), dom: document.body.innerHTML, text: document.body.textContent ?? '',
    calls: observed.pack(observed.calls), managers: observed.pack(observed.managers), customs: observed.pack(observed.customs),
    globalAt: observed.draws.length, rngState: observed.state(),
  };
  snapshots.push(row);
  return row;
}
function write(file: string, value: unknown) {
  const bytes = Buffer.from(JSON.stringify({ importDraws, seed: testSeed, draws: observed.draws, frames: snapshots, value: observed.pack(value), fetches }), 'utf8');
  if (bytes.length > 44 * 1024 * 1024) throw new Error('CM_TEAM_PICKER_RAW_DECODED_BOUND');
  const gz = gzipSync(bytes);
  if (gz.length > 12 * 1024 * 1024) throw new Error('CM_TEAM_PICKER_RAW_STORED_BOUND');
  fs.writeFileSync(path.join(output!, file + '.json.gz'), gz);
}
async function clickText(text: string | RegExp) {
  const item = await screen.findByText(text, typeof text === 'string' ? { exact: true } : {}, { timeout: 30000 });
  const button = item.closest('button');
  if (!button) throw new Error('actual text has no button: ' + String(text));
  fireEvent.click(button);
}
async function mount() {
  const view = render(<MemoryRouter initialEntries={['/club-manager']}><ClubManager /></MemoryRouter>);
  await screen.findByText('2026-27', { exact: true }, { timeout: 30000 });
  take('actual initial picker');
  return view;
}
async function era(id: string) {
  const def = eras.CM_ERAS.find(row => row.id === id);
  if (!def) throw new Error('unknown original era');
  await clickText(def.label);
  await screen.findByText('England', { exact: true }, { timeout: 30000 });
  take('actual era ' + id);
}
const rowButtons = () => Array.from(document.querySelectorAll('[data-cm-board-wants]')).map(row => {
  const button = row.closest('button');
  if (!button) throw new Error('board demand is outside team button');
  return button;
});
function teamRows() {
  return rowButtons().map(button => ({
    text: button.textContent, html: button.innerHTML, className: button.className,
    flags: Array.from(button.querySelectorAll('img')).map(img => ({ alt: img.alt, src: img.getAttribute('src') })),
    colors: Array.from(button.querySelectorAll<HTMLElement>('[style]')).map(node => node.getAttribute('style')),
    demand: button.querySelector('[data-cm-board-wants]')?.textContent,
    demandTitle: button.querySelector('[data-cm-board-wants] [title]')?.getAttribute('title'),
    partial: Array.from(button.querySelectorAll('[title]')).filter(node => node.getAttribute('title')?.includes('part of this squad')).map(node => ({ text: node.textContent, title: node.getAttribute('title') })),
  }));
}
async function visitLeague(name: string) {
  await clickText(name);
  await waitFor(() => expect(rowButtons().length).toBeGreaterThan(0), { timeout: 30000 });
  return take('actual Team ' + name, teamRows());
}
async function chooseNamed(name: string) {
  const found = rowButtons().filter(button => Array.from(button.querySelectorAll('span')).some(span => span.textContent === name));
  expect(found).toHaveLength(1);
  fireEvent.click(found[0]);
  take('actual choose ' + name);
}
async function finish(skip: boolean, expectedClub: string) {
  if (skip) await clickText('Skip: just manage');
  else {
    fireEvent.change(screen.getByLabelText('Manager name'), { target: { value: 'Sam Calloway' } });
    await clickText('Hard');
    await clickText('Take the job');
  }
  await waitFor(() => expect(localStorage.getItem(KEY)).not.toBeNull(), { timeout: 30000 });
  const frame = take('actual real career persisted ' + expectedClub);
  expect(frame.saved.clubName).toBe(expectedClub);
  return frame;
}
async function reloadAuthentic(raw: string, label: string) {
  cleanup();
  localStorage.setItem(KEY, raw);
  const before = storage();
  const view = renderHook(() => useClubManager());
  await waitFor(() => expect(view.result.current.career).not.toBeNull(), { timeout: 30000 });
  const loaded = take(label, { inputRaw: raw, inputStorage: before, career: view.result.current.career, phase: view.result.current.phase });
  expect(view.result.current.career!.clubName).toBe(JSON.parse(raw).clubName);
  expect(view.result.current.career!.squad).toEqual(JSON.parse(raw).squad);
  view.unmount();
  return loaded;
}
beforeEach(() => {
  cleanup(); cm.registerCustomClub(null); cm.registerLeagueOverrides(null);
  localStorage.clear(); sessionStorage.clear();
  snapshots = []; fetches.length = 0;
  testSeed += 1; observed.reset(7000 + testSeed);
  globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
    fetches.push(observed.pack(args));
    return Promise.reject(new Error('no network in CM picker original test'));
  }) as typeof fetch;
});
afterEach(() => {
  const file = ['current', 'historical-fixtures', 'edited-world', 'custom-manager', 'cold-delivery'][testSeed - 1];
  if (file && !fs.existsSync(path.join(output!, file + '.json.gz'))) write(file, { incomplete: true });
  cleanup(); cm.registerCustomClub(null); cm.registerLeagueOverrides(null); globalThis.fetch = realFetch;
});
afterAll(() => { Math.random = observed.originalRandom; vi.useRealTimers(); });

describe('Club Manager Team picker original acceptance', () => {
  it('holds the complete current picker, selection callbacks and real saved start', async () => {
    const grids: unknown[] = [];
    await mount(); await era('now');
    for (const nation of cm.NATIONS) {
      await clickText(nation.name);
      take('actual leagues ' + nation.name);
      for (const id of nation.leagueIds) {
        const league = cm.REAL_LEAGUES.find(row => row.id === id);
        if (!league) continue;
        const frame = await visitLeague(league.name);
        const expected = cm.playableClubs(id).map(row => row.name);
        const actual = rowButtons().map(button => expected.find(name => Array.from(button.querySelectorAll('span')).some(span => span.textContent === name)));
        expect(actual).toEqual(expected);
        grids.push({ id, nation: nation.name, names: actual, frame });
        expect(localStorage.getItem(KEY)).toBeNull();
        await clickText(league.name);
        expect(screen.queryByText('Take the job', { exact: true })).toBeNull();
      }
      await clickText('All nations');
    }
    await clickText('England'); await visitLeague('Premier League');
    const names = cm.playableClubs('premier').map(row => row.name);
    await chooseNamed(names[0]); await clickText('Premier League');
    const afterBack = take('Back clears pending selection');
    expect(observed.calls.at(-1)).toEqual({ name: 'chooseClub', args: [''] });
    await visitLeague('Premier League');
    await chooseNamed(names.at(-1)!);
    await clickText('Take the job');
    take('actual Manager before skip');
    const saved = await finish(true, names.at(-1)!);
    expect(observed.managers.at(-1)).toEqual([null, U, U]);
    expect(observed.calls.filter(row => row.name === 'confirmClub').at(-1)?.args).toEqual(['now', U, U, null, U]);
    const reloaded = await reloadAuthentic(saved.raw!, 'reload actual current save');
    write('current', { grids, afterBack, saved, reloaded });
    expect(grids).toHaveLength(27);
    expect(grids.reduce<number>((sum: number, row: unknown) => sum + (row as { names: unknown[] }).names.length, 0)).toBe(454);
    expect(fetches).toEqual([]);
  }, 360000);

  it('holds all four era grids and the actual fixture wait, retry and cancellation paths', async () => {
    const historic: unknown[] = [];
    let historicalRaw: string | null = null;
    for (const def of eras.CM_ERAS.filter(row => eras.isHistoricEra(row.id))) {
      cleanup(); localStorage.clear(); sessionStorage.clear();
      await mount(); await era(def.id);
      const nations = cm.NATIONS.filter(nation => eras.eraLeaguesFor(def.id, nation).length > 0);
      if (def.id === 'era2010') {
        await clickText('England');
        await screen.findByText(/Loading the 2010-11 squads/, {}, { timeout: 30000 });
        take('2010 real era import held');
        expect(rowButtons()).toHaveLength(0);
        observed.era2010.open();
        await screen.findAllByText(/Strongest sides:/, {}, { timeout: 30000 });
        await clickText('All nations');
      }
      const grids: unknown[] = [];
      for (const nation of nations) {
        await clickText(nation.name);
        await screen.findAllByText(/Strongest sides:/, {}, { timeout: 30000 });
        for (const league of eras.eraLeaguesFor(def.id, nation)) {
          const frame = await visitLeague(league.name);
          const expected = eras.eraPlayableClubs(def.id, league.id).map(row => row.name);
          expect(rowButtons().map(button => expected.find(name => Array.from(button.querySelectorAll('span')).some(span => span.textContent === name)))).toEqual(expected);
          grids.push({ id: league.id, frame, names: expected });
          await clickText(league.name);
        }
        await clickText('All nations');
      }
      historic.push({ id: def.id, grids });
      if (def.id === 'era2010') {
        await clickText('Spain'); await visitLeague('La Liga'); await chooseNamed('Barcelona');
        await clickText('Take the job');
        const saved = await finish(true, 'Barcelona');
        historicalRaw = saved.raw;
        expect(observed.calls.filter(row => row.name === 'confirmClub').at(-1)?.args).toEqual(['era2010', U, U, null, U]);
        await reloadAuthentic(saved.raw!, 'reload actual historical save');
      }
    }
    cleanup(); localStorage.clear(); sessionStorage.clear();
    const wait = renderHook(() => useClubManager());
    await waitFor(() => expect(wait.result.current.phase).toBe('clubSelect'));
    act(() => wait.result.current.chooseClub('Barcelona', 'now'));
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    act(() => wait.result.current.confirmClub('now'));
    const noDrawAt = observed.draws.length;
    const waiting = take('real fixture wait starts', wait.result.current.startWait);
    expect(wait.result.current.career).toBeNull();
    act(() => vi.advanceTimersByTime(8000));
    const failed = take('real fixture timeout asks', wait.result.current.startWait);
    expect(wait.result.current.startWait?.failed).toBe(true);
    expect(observed.draws.length).toBe(noDrawAt);
    act(() => wait.result.current.retryStart());
    take('real retry waits again', wait.result.current.startWait);
    expect(wait.result.current.startWait?.failed).toBe(false);
    observed.laliga.open();
    await act(async () => { await (await import('@/lib/clubManagerFixtures')).ensureRealLeagueFixtures('laliga-2026-27-v1'); });
    vi.useRealTimers(); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-05T12:00:00Z'));
    await waitFor(() => expect(wait.result.current.career).not.toBeNull(), { timeout: 30000 });
    const released = take('real loaded fixtures start', wait.result.current.career);
    expect(wait.result.current.career!.realLeagueFixtures).toBe('laliga-2026-27-v1');
    wait.unmount();
    localStorage.clear(); sessionStorage.clear();
    const cancelled = renderHook(() => useClubManager());
    await waitFor(() => expect(cancelled.result.current.phase).toBe('clubSelect'));
    act(() => cancelled.result.current.chooseClub('Juventus', 'now'));
    act(() => cancelled.result.current.confirmClub('now'));
    take('real second league waits before cancellation', cancelled.result.current.startWait);
    const cancelDrawAt = observed.draws.length;
    cancelled.unmount(); observed.seriea.open();
    await act(async () => { await (await import('@/lib/clubManagerFixtures')).ensureRealLeagueFixtures('seriea-2026-27-v1'); });
    const afterCancel = take('real unmounted wait cannot start');
    expect(observed.draws.length).toBe(cancelDrawAt);
    expect(localStorage.getItem(KEY)).toBeNull();
    const refused = renderHook(() => useClubManager());
    await waitFor(() => expect(refused.result.current.phase).toBe('clubSelect'));
    act(() => refused.result.current.chooseClub('Ajax', 'now'));
    act(() => refused.result.current.confirmClub('now'));
    observed.eredivisie.refuse();
    await waitFor(() => expect(refused.result.current.startWait?.failed).toBe(true));
    const refusal = take('real refused list keeps career empty', refused.result.current.startWait);
    expect(refused.result.current.career).toBeNull();
    act(() => refused.result.current.startWithoutList());
    await waitFor(() => expect(refused.result.current.career).not.toBeNull(), { timeout: 30000 });
    const explicit = take('explicit generated-fixture choice', refused.result.current.career);
    expect(refused.result.current.career!.realLeagueFixtures).toBeUndefined();
    refused.unmount();
    write('historical-fixtures', { historic, historicalRaw, waiting, failed, released, afterCancel, refusal, explicit });
    expect(historic).toHaveLength(4);
    expect(fetches).toEqual([]);
  }, 360000);

  it('holds the real edited-world grid, callbacks and complete saved career', async () => {
    await mount(); await era('now');
    fireEvent.click(await screen.findByTestId('cm-world-editor-tile', {}, { timeout: 30000 }));
    fireEvent.click(await screen.findByLabelText('Move Celtic', {}, { timeout: 30000 }));
    fireEvent.click(await screen.findByLabelText('Swap Celtic with Brentford', {}, { timeout: 30000 }));
    await clickText('Play this world (2 moved)');
    await clickText('England'); const grid = await visitLeague('Premier League');
    expect(rowButtons().some(button => button.textContent?.includes('Brentford'))).toBe(false);
    expect(screen.getByText(/Reset the world editor to found one/)).toBeTruthy();
    await chooseNamed('Celtic');
    const celtic = rowButtons().find(button => button.textContent?.includes('Celtic'))!;
    expect(celtic.textContent).toMatch(/stay up|avoid relegation/i);
    await clickText('Premier League'); await visitLeague('Premier League'); await chooseNamed('Celtic');
    await clickText('Take the job');
    await clickText('Celtic');
    const back = take('real Manager Back returns edited Team', teamRows());
    await clickText('Take the job'); const saved = await finish(true, 'Celtic');
    expect(saved.saved.leagueOverrides).toEqual(swapClubs(null, 'Celtic', 'Brentford'));
    expect(observed.managers.at(-1)).toEqual([null, U, U]);
    expect(observed.calls.filter(row => row.name === 'confirmClub').at(-1)?.args).toEqual(['now', U, U, observed.pack(swapClubs(null, 'Celtic', 'Brentford')), U]);
    const reloaded = await reloadAuthentic(saved.raw!, 'reload actual edited-world save');
    write('edited-world', { grid, back, saved, reloaded });
    expect(fetches).toEqual([]);
  }, 180000);

  it('holds Custom and Manager Back, exact null conversion and authentic save reloads', async () => {
    const children: unknown[] = [];
    for (const configured of [false, true]) {
      cleanup(); cm.registerCustomClub(null); cm.registerLeagueOverrides(null); localStorage.clear(); sessionStorage.clear();
      await mount(); await era('now'); await clickText('England'); await visitLeague('Premier League');
      await clickText('Create your own club');
      take('real Custom before Back');
      await clickText('Premier League');
      expect(rowButtons().length).toBeGreaterThan(0);
      await clickText('Create your own club');
      fireEvent.change(screen.getByLabelText('Club name'), { target: { value: configured ? 'Boundary Borough' : 'Boundary Athletic' } });
      fireEvent.change(screen.getByLabelText('Stadium'), { target: { value: 'Boundary Ground' } });
      await clickText('Found the club');
      take('actual custom Manager before Back');
      const name = configured ? 'Boundary Borough' : 'Boundary Athletic';
      await clickText(name);
      expect(screen.getByLabelText('Club name')).toBeTruthy();
      fireEvent.change(screen.getByLabelText('Club name'), { target: { value: name } });
      fireEvent.change(screen.getByLabelText('Stadium'), { target: { value: 'Boundary Ground' } });
      await clickText('Found the club');
      const saved = await finish(!configured, name);
      const confirm = observed.calls.filter(row => row.name === 'confirmCustomClub').at(-1)!;
      const emitted = observed.managers.at(-1) as unknown[];
      expect((confirm.args as unknown[])[2]).toEqual(configured ? emitted[0] : U);
      expect((confirm.args as unknown[])[3]).toEqual(emitted[1]);
      expect((confirm.args as unknown[])[4]).toEqual(emitted[2]);
      if (!configured) expect(emitted).toEqual([null, U, U]);
      else expect(saved.saved.manager.name).toBe('Sam Calloway');
      expect(saved.saved.customClub.name).toBe(name);
      const reloaded = await reloadAuthentic(saved.raw!, 'reload authentic custom child ' + String(configured));
      children.push({ configured, saved, confirm, managerArgs: emitted, customSpecs: [...observed.customs], reloaded });
    }
    write('custom-manager', { children });
    expect(children).toHaveLength(2);
    expect(fetches).toEqual([]);
  }, 360000);

  it('keeps executable Team rendering off the actual initial served path until League selection', () => {
    const file = process.env.CM_TEAM_PICKER_BUILD_REPORT;
    if (!file || !path.isAbsolute(file)) throw new Error('CM_TEAM_PICKER_BUILD_REPORT must name the actual built probe');
    const probe = JSON.parse(fs.readFileSync(file, 'utf8'));
    take('actual authenticated built body receipt', probe);
    write('cold-delivery', probe);
    expect(probe.status, 'Actual completed UI/body probe is required').toBe('MEASURED_ACTUAL_UI_AND_BODIES');
    expect(probe.teamRows.length).toBeGreaterThan(0);
    expect(probe.teamBodies.length).toBe(1);
    expect(probe.initialTeamBodies, 'CM_TEAM_PICKER_COLD_DELIVERY').toEqual([]);
  });
});
