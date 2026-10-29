/**
 * Round 1570: the Hall wall on the shared US career board, in all four sports.
 *
 *   C1  a career retired through the board goes up on its sport's wall: one v1 plaque for this career, whose
 *       record is what the Hall card shows.
 *   C2  both restart prompts of that retired career say the card stays on the Hall wall; confirming clears the
 *       save and leaves the wall's bytes alone.
 *   C3  an old retired save of every class (the parity fixture's, a V1 recording, a 1301 recording), mounted
 *       cold: its save is never written, its plaque is what its card told him, a second visit writes nothing.
 *   C4  a refused wall write: nothing breaks, the prompt keeps 1569's "goes too", which is then true.
 *   C6  a corrupt wall: junk is replaced by the next plaque, a newer version is never written over, a bad
 *       plaque is dropped alone.
 *   C7  with no Hall bound (the parity replay's knob) the wall is never read, never written, never drawn.
 *   C8  no draw: the save's bytes and Math.random's count are the same press for press with the wall written,
 *       with the wall refused, and with no wall code at all (the module mocked inert).
 *   C9  a refused retirement SAVE holds the plaque back until the save's own Retry lands.
 * Mounted in StrictMode under a MemoryRouter, as usCareerSaveRetry.test.tsx mounts the board.
 */
import { StrictMode, type ComponentType } from 'react';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));
/* C8's comparison arm has no wall code at all: with the switch on, hallWallEntry gives null, so the keep
   effect stops before it reads, builds, writes or could draw anything. Off, the module is the real one. */
const wallSwitch = vi.hoisted(() => ({ inert: false }));
vi.mock('@/lib/usCareerHallWall', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/usCareerHallWall')>();
  return { ...real, hallWallEntry: ((...args: Parameters<typeof real.hallWallEntry>) => (wallSwitch.inert ? null : real.hallWallEntry(...args))) as typeof real.hallWallEntry };
});

import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import { pendingTalk } from '@/lib/usCareerRetirementFlow';
import { hallRecordFor, type HallRecord } from '@/lib/careerHallOfFame';
import { hallHeadline } from '@/components/career/HallOfFameCard';
import { hallWallEntry, hallWallKey, wallKeyOf, type HallWallEntry } from '@/lib/usCareerHallWall';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';

const ROWS: { label: string; sport: UsCareerSport }[] = [
  { label: 'NFL', sport: NFL_CAREER_SPORT }, { label: 'NBA', sport: NBA_CAREER_SPORT },
  { label: 'MLB', sport: MLB_CAREER_SPORT }, { label: 'NHL', sport: NHL_CAREER_SPORT },
];
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
/** Six seasons in (so the hub has Hang them up now), outside the talk rule and the hard stop, with a salt as
 *  every career since Round 1038 has. */
function activeCareer(sport: UsCareerSport, seed: number): { c: UsCareerCore; tq: number } {
  for (let s = seed; s < seed + 300; s += 1) {
    const rng = mulberry32(s);
    const pos = sport.create.defaultPos;
    const c = sport.startCareer(`Wall ${sport.label} ${s}`, pos, sport.create.archetypes[pos][0], rng, defaultAppearance(), 'now');
    c.summerSalt = `wall${s}`;
    let tq = sport.rollTeamQuality(null, rng);
    sport.assignRole(c, tq, rng);
    for (let y = 0; y < 6; y += 1) { sport.campBattle(c, tq, rng); sport.simSeason(c, tq, rng); sport.progress(c, rng); tq = sport.rollTeamQuality(tq, rng); }
    c.pendingRivalryEvent = null; c.pendingRivalryChoice = null; c.suspendedSeasons = 0; c.contractYears = 3;
    delete c.summer;
    if (c.retired || sport.shouldRetire(c) || pendingTalk(c, sport.hall)) continue;
    return { c, tq };
  }
  throw new Error(`${sport.label}: no active career outside the talk rule in 300 seeds`);
}
/** The same, retired as it stands (a save the board would open on the retirement screen). */
function retiredCareer(sport: UsCareerSport, seed: number): UsCareerCore {
  const { c } = activeCareer(sport, seed);
  c.retired = true;
  return c;
}
const save = (sport: UsCareerSport, c: UsCareerCore, tq: number | null, phase: string) =>
  localStorage.setItem(sport.saveKey, JSON.stringify({ c, phase, teamQuality: tq, coach: null }));
const readSave = (sport: UsCareerSport) => JSON.parse(localStorage.getItem(sport.saveKey)!) as { c: UsCareerCore; phase: string };
const wallKey = (sport: UsCareerSport) => hallWallKey(sport.slug);
const readWall = (sport: UsCareerSport) => JSON.parse(localStorage.getItem(wallKey(sport))!) as { v: number; entries: HallWallEntry[] };
const mountBoard = (sport: UsCareerSport, Board: ComponentType<{ sport: UsCareerSport }> = UsCareerBoard) =>
  render(<StrictMode><MemoryRouter><Board sport={sport} /></MemoryRouter></StrictMode>);
const button = (name: string | RegExp) => [...document.querySelectorAll('button')]
  .find(b => (typeof name === 'string' ? b.textContent?.trim() === name || b.textContent?.includes(name) : name.test(b.textContent ?? '')));
const press = async (name: string | RegExp) => {
  await waitFor(() => expect(button(name), `no button ${String(name)}`).toBeTruthy());
  fireEvent.click(button(name)!);
};
const dialogSays = async (opener: string) => {
  await press(opener);
  return waitFor(() => within(document.body).getByRole('alertdialog', { name: 'Start a new career?' }));
};
const KEPT = ' The Hall of Fame card stays on your Hall wall.';
const GONE = ' The Hall of Fame card goes too.';
const words = (label: string, hall: string) => `This deletes your saved ${label} player and coaching career on this device.${hall} You cannot undo this.`;
async function promptSays(label: string, opener: string, hall: string) {
  const dialog = await dialogSays(opener);
  expect(dialog).toHaveAccessibleDescription(words(label, hall));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Keep this career' }));
  await waitFor(() => expect(within(document.body).queryByRole('alertdialog')).toBeNull());
}
async function restart(opener: string) {
  const dialog = await dialogSays(opener);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Start new career' }));
  await waitFor(() => expect(button('Enter the draft')).toBeTruthy());
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(1570));
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe.each(ROWS)('$label: the Hall wall on the board', ({ label, sport }) => {
  it('C1 and C2: a career retired through the board goes up on the wall, and a restart keeps it there', async () => {
    const { c, tq } = activeCareer(sport, 1570);
    save(sport, c, tq, 'season');
    mountBoard(sport);
    await press('Hang them up now');
    await press('Retire this player');
    await waitFor(() => expect(readSave(sport).phase).toBe('retired'));
    await waitFor(() => expect(localStorage.getItem(wallKey(sport))).not.toBeNull());
    const after = readSave(sport).c;
    const wall = readWall(sport);
    expect(wall.v).toBe(1);
    expect(wall.entries.map(e => e.key)).toEqual([wallKeyOf(after, sport.hall!)]);
    expect(wall.entries[0].hall).toEqual(hallRecordFor(sport.hall!, after));
    expect(wall.entries[0]).toEqual(hallWallEntry(sport, after));
    // The card on the retirement screen and the plaque say the same thing.
    const headline = hallHeadline(wall.entries[0].hall, sport.hall!.rules);
    await waitFor(() => expect(document.body.textContent).toContain(headline), { timeout: 15000 });
    // C2: both restart prompts of the retired career say the card stays; confirming leaves the wall alone.
    const bytes = localStorage.getItem(wallKey(sport));
    await promptSays(label, 'New career', KEPT);
    await promptSays(label, 'Start over', KEPT);
    await restart('New career');
    expect(localStorage.getItem(sport.saveKey)).toBeNull();
    expect(localStorage.getItem(wallKey(sport))).toBe(bytes);
  }, 30000);

  it('C4: a refused wall write breaks nothing, and the prompt keeps saying the card goes', async () => {
    save(sport, retiredCareer(sport, 1571), null, 'retired');
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key.endsWith('-my-career-hall-v1')) throw new DOMException('Controlled quota refusal', 'QuotaExceededError');
      real.call(this, key, value);
    });
    mountBoard(sport);
    await promptSays(label, 'New career', GONE);
    await promptSays(label, 'Start over', GONE);
    expect(localStorage.getItem(wallKey(sport))).toBeNull();
    await restart('New career');
    expect(localStorage.getItem(sport.saveKey)).toBeNull();
    expect(document.querySelector('[data-career-hall-wall-opener]')).toBeNull();
  }, 30000);

  it('C7: with no Hall bound (the parity replay) the wall is never read, written or drawn', async () => {
    const plain: UsCareerSport = { ...sport, hall: undefined };
    const reads = vi.spyOn(Storage.prototype, 'getItem');
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const { c, tq } = activeCareer(sport, 1572);
    save(plain, c, tq, 'season');
    mountBoard(plain);
    await press('Hang them up now');
    await press('Retire this player');
    await waitFor(() => expect(readSave(plain).phase).toBe('retired'));
    await restart('New career');
    const wallCalls = (spy: typeof reads | typeof writes) => spy.mock.calls.filter(([key]) => String(key).endsWith('-my-career-hall-v1'));
    expect(wallCalls(reads)).toEqual([]);
    expect(wallCalls(writes)).toEqual([]);
    expect(document.querySelector('[data-career-hall-wall-opener]')).toBeNull();
    expect(Object.keys(localStorage).filter(k => k.endsWith('-my-career-hall-v1'))).toEqual([]);
  }, 30000);
});

const fixtureJson = (rel: string) => JSON.parse(readFileSync(path.resolve(process.cwd(), rel), 'utf8'));
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
describe.each(ROWS)('$label: old saves and broken walls', ({ label, sport }) => {
  it('C3: an old retired save of every class goes up as its card told him, and its save is never written', async () => {
    const slug = sport.slug;
    const v1 = fixtureJson('src/test/fixtures/careerHallV1.json').sports[slug][0] as { save: UsCareerCore; hall: HallRecord };
    const r1301 = (fixtureJson('src/test/fixtures/careerHallSaves1301.json').recordings[0].sports[slug] as { kind: string; save: UsCareerCore; hall: HallRecord }[])
      .find(row => row.kind !== 'open')!;
    const wrap = (c: UsCareerCore) => JSON.stringify({ c, phase: 'retired', teamQuality: 80, coach: null });
    const classes: { name: string; raw: string; told: (got: HallRecord, c: UsCareerCore) => void }[] = [
      { name: 'parity fixture', raw: fixtureJson('scripts/data/usBoardFixture.json').sports[slug].saves.retired, told: (got, c) => expect(got).toEqual(hallRecordFor(sport.hall!, c)) },
      { name: 'V1', raw: wrap(v1.save), told: got => expect(got).toEqual(v1.hall) },
      { name: '1301', raw: wrap(r1301.save), told: (got, c) => {
        const { weighs: _w, ...rest } = got, { weighs: _t, ...told } = r1301.hall;
        expect(rest).toEqual(told);
        expect(got).toEqual(hallRecordFor(sport.hall!, c));
      } },
    ];
    for (const k of classes) {
      cleanup(); localStorage.clear();
      localStorage.setItem(sport.saveKey, k.raw);
      const writes = vi.spyOn(Storage.prototype, 'setItem');
      mountBoard(sport);
      await waitFor(() => expect(localStorage.getItem(wallKey(sport)), k.name).not.toBeNull());
      await settle();
      const c = JSON.parse(k.raw).c as UsCareerCore;
      expect(localStorage.getItem(sport.saveKey), `${k.name}: the save is never written`).toBe(k.raw);
      expect(writes.mock.calls.map(([key]) => key), k.name).toEqual([wallKey(sport)]);
      const wall = readWall(sport);
      expect(wall.entries.map(e => e.key), k.name).toEqual([wallKeyOf(c, sport.hall!)]);
      k.told(wall.entries[0].hall, c);
      cleanup(); writes.mockClear();
      mountBoard(sport);
      await settle();
      expect(writes.mock.calls, `${k.name}: a second visit writes nothing`).toEqual([]);
      expect(readWall(sport).entries.length).toBe(1);
      writes.mockRestore();
    }
  }, 60000);

  it('C6: junk is replaced, a newer version is never written over, a bad plaque is dropped alone', async () => {
    const c = retiredCareer(sport, 1573), other = hallWallEntry(sport, retiredCareer(sport, 1700))!;
    const mine = wallKeyOf(c, sport.hall!);
    expect(other.key).not.toBe(mine);
    localStorage.setItem(wallKey(sport), '{not json');
    save(sport, c, null, 'retired');
    mountBoard(sport);
    await waitFor(() => expect(localStorage.getItem(wallKey(sport))).not.toBe('{not json'));
    expect(readWall(sport)).toMatchObject({ v: 1, entries: [{ key: mine }] });
    cleanup(); localStorage.clear();
    const newer = JSON.stringify({ v: 2, entries: [{ any: 'thing' }] });
    localStorage.setItem(wallKey(sport), newer);
    save(sport, c, null, 'retired');
    mountBoard(sport);
    await settle();
    await promptSays(label, 'New career', GONE);
    expect(localStorage.getItem(wallKey(sport))).toBe(newer);
    cleanup(); localStorage.clear();
    localStorage.setItem(wallKey(sport), JSON.stringify({ v: 1, entries: [{ ...clone(other), key: 'bad', from: 'soon' }, other] }));
    save(sport, c, null, 'retired');
    mountBoard(sport);
    await waitFor(() => expect(readWall(sport).entries.map(e => e.key)).toEqual([mine, other.key]));
    expect(readWall(sport).entries[1]).toEqual(other);
  }, 60000);

  it('C9: a refused retirement save holds the plaque back until the save\'s own Retry lands', async () => {
    const { c, tq } = activeCareer(sport, 1575);
    save(sport, c, tq, 'season');
    let refusing = false;
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (refusing && key === sport.saveKey) throw new DOMException('Controlled quota refusal', 'QuotaExceededError');
      real.call(this, key, value);
    });
    mountBoard(sport);
    refusing = true;
    await press('Hang them up now');
    await press('Retire this player');
    await waitFor(() => expect(document.querySelector('[data-us-career-save-error]')).not.toBeNull());
    await settle();
    expect(readSave(sport).phase).toBe('season');
    expect(localStorage.getItem(wallKey(sport))).toBeNull();
    refusing = false;
    await press('Retry save');
    await waitFor(() => expect(readSave(sport).phase).toBe('retired'));
    await waitFor(() => expect(localStorage.getItem(wallKey(sport))).not.toBeNull());
    expect(readWall(sport).entries.map(e => e.key)).toEqual([wallKeyOf(readSave(sport).c, sport.hall!)]);
  }, 30000);
});

/* C8: the wall draws nothing. Five seeds a sport, an engine built career six seasons in, pressed through the real
   board: Hang them up now, Retire this player, New career, Start new career, Enter the draft. Three arms: the wall
   written, the wall refused, and no wall code at all. The save's bytes and Math.random's count must agree press
   for press. (No season is played through the board here: before a career retires the keep effect returns at
   its first line and the read effect is one storage read, and C7 proves the replay's path never meets even that.) */
type Arm = 'written' | 'refused' | 'absent';
async function pressThrough(sport: UsCareerSport, seed: number, arm: Arm) {
  cleanup(); localStorage.clear(); vi.restoreAllMocks();
  wallSwitch.inert = arm === 'absent';
  let draws = 0;
  const rng = mulberry32(9000 + seed);
  vi.spyOn(Math, 'random').mockImplementation(() => { draws += 1; return rng(); });
  if (arm === 'refused') {
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key.endsWith('-my-career-hall-v1')) throw new DOMException('Controlled quota refusal', 'QuotaExceededError');
      real.call(this, key, value);
    });
  }
  const { c, tq } = activeCareer(sport, 1580 + seed * 11);
  save(sport, c, tq, 'season');
  const saves: (string | null)[] = [], counts: number[] = [];
  const mark = async () => { await settle(); saves.push(localStorage.getItem(sport.saveKey)); counts.push(draws); };
  mountBoard(sport); await mark();
  await press('Hang them up now'); await mark();
  await press('Retire this player');
  await waitFor(() => expect(readSave(sport).phase).toBe('retired')); await mark();
  const dialog = await dialogSays('New career'); await mark();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Start new career' }));
  await waitFor(() => expect(button('Enter the draft')).toBeTruthy()); await mark();
  await press('Enter the draft');
  await waitFor(() => expect(localStorage.getItem(sport.saveKey)).not.toBeNull()); await mark();
  const wall = localStorage.getItem(wallKey(sport));
  cleanup(); wallSwitch.inert = false;
  return { saves, counts, wall };
}
describe('C8: the wall draws nothing and moves no save byte', () => {
  it.each(ROWS)('$label: five seeds, the wall written, refused and absent, press for press', async ({ sport }) => {
    for (let seed = 0; seed < 5; seed += 1) {
      const written = await pressThrough(sport, seed, 'written');
      const refused = await pressThrough(sport, seed, 'refused');
      const absent = await pressThrough(sport, seed, 'absent');
      expect(written.wall, `seed ${seed}: the written arm kept a plaque`).not.toBeNull();
      expect([refused.wall, absent.wall], `seed ${seed}: the other arms kept none`).toEqual([null, null]);
      expect(refused.saves, `seed ${seed}: save bytes, refused`).toEqual(written.saves);
      expect(absent.saves, `seed ${seed}: save bytes, absent`).toEqual(written.saves);
      expect(refused.counts, `seed ${seed}: draws, refused`).toEqual(written.counts);
      expect(absent.counts, `seed ${seed}: draws, absent`).toEqual(written.counts);
    }
  }, 180000);
});
