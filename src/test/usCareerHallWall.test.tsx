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
 *   C4b the same with another plaque already up: "the card stays" follows this career's plaque, never any plaque.
 *   C6  a corrupt wall: junk is replaced by the next plaque, a newer version is never written over, a bad
 *       plaque is dropped alone.
 *   C7  with no Hall bound (the parity replay's knob) the wall is never read, never written, never drawn.
 *   C8  no draw: the save's bytes and Math.random's count are the same press for press with the wall written,
 *       with the wall refused, and with no wall code at all (the module mocked inert).
 *   C8b the read draws nothing: a live career mounted with no Hall bound, with a bound Hall and no wall, and with
 *       a bound Hall and a full wall stored draws as often and leaves the same save bytes.
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
vi.mock('sonner', () => ({ toast: Object.assign(() => undefined, { success: () => undefined, error: () => undefined, info: () => undefined, message: () => undefined, dismiss: () => undefined }) }));
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
import { HallOfFameCard, hallHeadline } from '@/components/career/HallOfFameCard';
import UsCareerHallWall, { wallCount, wallJerseyLine } from '@/components/us-career/UsCareerHallWall';
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
    // The create screen offers the wall below Enter the draft, and the plaque says what the card said.
    const opener = await waitFor(() => { const el = document.querySelector<HTMLButtonElement>('[data-career-hall-wall-opener="create"]'); expect(el).not.toBeNull(); return el!; });
    expect(opener.textContent).toBe('🏛️ Hall wall (1)');
    expect(button('Enter the draft')!.compareDocumentPosition(opener) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(opener);
    const tile = await waitFor(() => { const el = document.querySelector<HTMLButtonElement>('[data-career-hall-wall-tile]'); expect(el).not.toBeNull(); return el!; });
    expect(tile.textContent).toContain(after.name);
    fireEvent.click(tile);
    await waitFor(() => expect(document.querySelector('[data-career-hall-wall-headline]')?.textContent).toBe(headline));
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

  /* The same refusal with another plaque already up (the reviewers' run lens, r1570-run-mut): "the card stays"
     must follow THIS career's plaque, never any plaque on the wall. */
  it('C4b: a refused wall write with another plaque already up: the prompt says the card goes, the opener reads 1', async () => {
    const other = hallWallEntry(sport, retiredCareer(sport, 1700))!;
    localStorage.setItem(wallKey(sport), JSON.stringify({ v: 1, entries: [{ ...other, key: 'stored-other', name: 'Stored Other' }] }));
    save(sport, retiredCareer(sport, 1571), null, 'retired');
    const real = Storage.prototype.setItem;
    let refused = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key.endsWith('-my-career-hall-v1')) { refused += 1; throw new DOMException('Controlled quota refusal', 'QuotaExceededError'); }
      real.call(this, key, value);
    });
    mountBoard(sport);
    await waitFor(() => expect(refused, 'the keep effect tried its write').toBeGreaterThan(0), { timeout: 15000 });
    await settle();
    await promptSays(label, 'New career', GONE);
    await promptSays(label, 'Start over', GONE);
    expect(readWall(sport).entries.map(e => e.key)).toEqual(['stored-other']);
    await restart('New career');
    await waitFor(() => expect(q('[data-career-hall-wall-opener="create"]')?.textContent).toBe('🏛️ Hall wall (1)'), { timeout: 15000 });
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
      /* The keep effect is the one reader of the wall after mount (the read effect reads while the mount's act
         runs), so a wall read after mountBoard returns is the positive sign that the keep effect ran. */
      const reads = vi.spyOn(Storage.prototype, 'getItem');
      const wallReads = () => reads.mock.calls.filter(([key]) => key === wallKey(sport)).length;
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
      const mounted = wallReads();
      await waitFor(() => expect(wallReads(), `${k.name}: the second visit's keep effect read the wall`).toBeGreaterThan(mounted));
      await settle();
      expect(writes.mock.calls, `${k.name}: a second visit writes nothing`).toEqual([]);
      expect(readWall(sport).entries.length).toBe(1);
      writes.mockRestore(); reads.mockRestore();
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
    /* One discarded press through first. Something outside the wall draws once the first time it runs in a
       process (r1570-fix8: run alone, the first arm counted 1 draw by the mount and the others 0; the wall's
       read, all the wall code that runs by then, draws nothing per C8b), so whichever arm ran first paid it and
       C8 was red when run alone (vitest -t "C8:", r1570-fix7) while green in the whole file. */
    await pressThrough(sport, 0, 'absent');
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

/* C8b: the wall's read draws nothing either. All three of C8's arms bind the Hall, so the board's read effect runs
   in each of them and a draw planted there would be equal in all three (the closing check's residual). Here the
   baseline binds no Hall (C7's knob), which a mount on a live season can compare against: before a career retires
   nothing else the Hall gates runs on the hub. Three mounts of the same live career, five seeds a sport: no Hall
   bound, a bound Hall with no wall stored, and a bound Hall with a full wall stored (the read then loads the rules
   and sanitizes it). Math.random's count and the save's bytes must agree, and both bound arms must have read. */
type ReadArm = 'unbound' | 'empty' | 'stored';
async function mountOnly(sport: UsCareerSport, seed: number, arm: ReadArm) {
  cleanup(); localStorage.clear(); vi.restoreAllMocks();
  const board: UsCareerSport = arm === 'unbound' ? { ...sport, hall: undefined } : sport;
  const { c, tq } = activeCareer(sport, 1580 + seed * 11);
  save(board, c, tq, 'season');
  if (arm === 'stored') storeWall(sport, plaques(sport, Array(12).fill('inducted'), 1590 + seed));
  let draws = 0;
  const rng = mulberry32(9100 + seed);
  vi.spyOn(Math, 'random').mockImplementation(() => { draws += 1; return rng(); });
  const reads = vi.spyOn(Storage.prototype, 'getItem');
  mountBoard(board);
  await waitFor(() => expect(button('Hang them up now'), 'the hub is up').toBeTruthy());
  await settle(); await settle();
  const wallReads = reads.mock.calls.filter(([key]) => String(key).endsWith('-my-career-hall-v1')).length;
  const out = { draws, bytes: localStorage.getItem(sport.saveKey), wallReads };
  cleanup();
  return out;
}
describe('C8b: the wall\'s read draws nothing and moves no save byte', () => {
  it.each(ROWS)('$label: five seeds, no Hall bound, a bound Hall with no wall and with a full wall', async ({ sport }) => {
    await mountOnly(sport, 0, 'unbound'); // discarded, so no arm pays a first run's draw (see C8)
    for (let seed = 0; seed < 5; seed += 1) {
      const unbound = await mountOnly(sport, seed, 'unbound');
      const empty = await mountOnly(sport, seed, 'empty');
      const stored = await mountOnly(sport, seed, 'stored');
      expect([empty.wallReads > 0, stored.wallReads > 0], `seed ${seed}: both bound arms read the wall`).toEqual([true, true]);
      expect(empty.bytes, `seed ${seed}: save bytes, no wall`).toBe(unbound.bytes);
      expect(stored.bytes, `seed ${seed}: save bytes, a full wall`).toBe(unbound.bytes);
      expect(empty.draws, `seed ${seed}: draws, no wall`).toBe(unbound.draws);
      expect(stored.draws, `seed ${seed}: draws, a full wall`).toBe(unbound.draws);
    }
  }, 120000);
});

/** Plaques for a stored wall: one engine career's plaque, copied under new keys and names with the given outcomes. */
function plaques(sport: UsCareerSport, outcomes: HallRecord['outcome'][], seed = 1590): HallWallEntry[] {
  const base = hallWallEntry(sport, retiredCareer(sport, seed))!;
  return outcomes.map((outcome, i) => ({ ...clone(base), key: `stored-${i}`, name: `Stored ${i}`, hall: { ...clone(base.hall), outcome } }));
}
const storeWall = (sport: UsCareerSport, entries: HallWallEntry[]) => localStorage.setItem(wallKey(sport), JSON.stringify({ v: 1, entries }));
const q = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const appear = <T extends Element = HTMLElement>(sel: string) => waitFor(() => { const el = q<T>(sel); expect(el, sel).not.toBeNull(); return el!; });
describe.each(ROWS)('$label: the wall screen', ({ label, sport }) => {
  it('C5: a full wall keeps 12, the new plaque goes up first and the oldest miss comes down (the oldest Hall of Famer only on a wall of them)', async () => {
    const I = 'inducted' as const, M = 'fellOff' as const;
    const mixed = plaques(sport, [I, I, I, M, I, I, I, M, I, I, M, I]);
    for (const [stored, gone] of [[mixed, 'stored-10'], [plaques(sport, Array(12).fill(I)), 'stored-11']] as const) {
      cleanup(); localStorage.clear();
      storeWall(sport, [...stored]);
      const { c, tq } = activeCareer(sport, 1577);
      save(sport, c, tq, 'season');
      mountBoard(sport);
      await press('Hang them up now');
      await press('Retire this player');
      await waitFor(() => expect(readSave(sport).phase).toBe('retired'));
      await waitFor(() => expect(readWall(sport).entries[0].key).toBe(wallKeyOf(readSave(sport).c, sport.hall!)));
      const keys = readWall(sport).entries.map(e => e.key);
      expect(keys.length).toBe(12);
      expect(keys.slice(1)).toEqual(stored.map(e => e.key).filter(k => k !== gone));
    }
  }, 60000);

  it('C10: focus, the "?" and the tap targets, from the create screen', async () => {
    storeWall(sport, plaques(sport, ['inducted', 'notOnBallot']));
    mountBoard(sport);
    const opener = await appear<HTMLButtonElement>('[data-career-hall-wall-opener="create"]');
    expect(opener.textContent).toBe('🏛️ Hall wall (2)');
    fireEvent.click(opener);
    const heading = await waitFor(() => { const h = within(document.body).getByRole('heading', { name: `Your ${label} Hall wall` }); return h; });
    expect(document.activeElement).toBe(heading);
    const help = within(document.body).getByRole('button', { name: 'How the Hall wall works' });
    expect(help).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(help);
    expect(help).toHaveAttribute('aria-expanded', 'true');
    const rules = document.getElementById(help.getAttribute('aria-controls')!)!;
    expect(rules.textContent).toContain(`Every player you retire in ${label} My Career goes up on this wall`);
    expect(rules.textContent).toContain('The wall holds 12.');
    expect(rules.textContent).toContain('Example: your wall holds 9 Hall of Famers and 3 who missed.');
    const tiles = [...document.querySelectorAll<HTMLButtonElement>('[data-career-hall-wall-tile]')];
    expect(tiles.map(t => t.textContent)).toEqual([expect.stringContaining('In the Hall'), expect.stringContaining('Never on the ballot')]);
    for (const el of [opener, help, ...tiles, button('Back')!]) expect(el.className).toMatch(/min-h-11/);
    // Opened from create, no career is missing from it: the retirement screen's honest line never shows here.
    expect(document.body.textContent).not.toContain('This browser did not keep the wall');
    // A tile's name and its Hall line wrap rather than cut (a name may run to 24 letters).
    for (const t of tiles) for (const line of t.querySelectorAll('span')) expect(line).not.toHaveClass('truncate');
    fireEvent.click(tiles[1]);
    await appear('[data-career-hall-wall-plaque]');
    // The tap asked for the plaque, so the rules fold away above it.
    expect(document.querySelector('[data-career-hall-wall-help]')).toBeNull();
    expect(help).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button('Back to the wall')!);
    await waitFor(() => expect(document.activeElement?.textContent).toContain('Stored 1'));
    fireEvent.click(button('Back')!);
    await waitFor(() => expect(document.activeElement).toBe(q('[data-career-hall-wall-opener="create"]')));
  }, 30000);

  it('C10: from the retirement screen the opener waits for the card, Back focuses it, and Start over on the wall lands on create', async () => {
    save(sport, retiredCareer(sport, 1578), null, 'retired');
    mountBoard(sport);
    const opener = await appear<HTMLButtonElement>('[data-career-hall-wall-opener="retired"]');
    expect(opener).toBeDisabled();
    await waitFor(() => expect(opener).toBeEnabled(), { timeout: 15000 });
    fireEvent.click(opener);
    await appear('[data-career-hall-wall-tile]');
    fireEvent.click(button('Back to retirement')!);
    await waitFor(() => expect(document.activeElement).toBe(q('[data-career-hall-wall-opener="retired"]')));
    fireEvent.click(q<HTMLButtonElement>('[data-career-hall-wall-opener="retired"]')!);
    await appear('[data-career-hall-wall]');
    await restart('Start over');
    expect(q('[data-career-hall-wall]')).toBeNull();
    expect((await appear('[data-career-hall-wall-opener="create"]')).textContent).toBe('🏛️ Hall wall (1)');
  }, 30000);

  it('C10: the wall says when this player is not on it, and when a newer version saved it', async () => {
    const real = Storage.prototype.setItem;
    const refuse = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key.endsWith('-my-career-hall-v1')) throw new DOMException('Controlled quota refusal', 'QuotaExceededError');
      real.call(this, key, value);
    });
    save(sport, retiredCareer(sport, 1579), null, 'retired');
    mountBoard(sport);
    const opener = await appear<HTMLButtonElement>('[data-career-hall-wall-opener="retired"]');
    await waitFor(() => expect(opener).toBeEnabled(), { timeout: 15000 });
    fireEvent.click(opener);
    await waitFor(() => expect(document.body.textContent).toContain('This browser did not keep the wall, so this player is not on it.'));
    expect(document.body.textContent).toContain('Nobody on the wall yet. Every player you retire goes up here.');
    cleanup(); refuse.mockRestore(); localStorage.clear();
    /* Nothing refused, and this player still not on the wall (his plaque never built, as for a key past the
       bound, or not built yet): the honest line is about a refusal, so it does not show. */
    wallSwitch.inert = true;
    try {
      save(sport, retiredCareer(sport, 1579), null, 'retired');
      mountBoard(sport);
      const quiet = await appear<HTMLButtonElement>('[data-career-hall-wall-opener="retired"]');
      await waitFor(() => expect(quiet).toBeEnabled(), { timeout: 15000 });
      await settle();
      fireEvent.click(quiet);
      await appear('[data-career-hall-wall]');
      await settle();
      expect(document.body.textContent).not.toContain('This browser did not keep the wall');
      expect(localStorage.getItem(wallKey(sport))).toBeNull();
    } finally { wallSwitch.inert = false; }
    cleanup(); localStorage.clear();
    localStorage.setItem(wallKey(sport), JSON.stringify({ v: 2, entries: [] }));
    save(sport, retiredCareer(sport, 1579), null, 'retired');
    mountBoard(sport);
    const again = await appear<HTMLButtonElement>('[data-career-hall-wall-opener="retired"]');
    await waitFor(() => expect(again).toBeEnabled(), { timeout: 15000 });
    fireEvent.click(again);
    await waitFor(() => expect(document.body.textContent).toContain('This wall was saved by a newer version of the site. Reload the page to see it.'));
  }, 40000);
});

/* Every honours label the four bindings give, as one of it reads on a plaque. A label not in this table fails
   below, so a new label is a decision, never a silent "1 Somethings". */
const ONE: Record<string, string> = {
  rings: '1 ring', Cups: '1 Cup', MVPs: '1 MVP', DPOYs: '1 DPOY', 'All-Pros': '1 All-Pro', 'in other awards': '1 in other awards',
  'All-NBA nods': '1 All-NBA nod', 'All-Star nods': '1 All-Star nod', 'MVP or Cy Young awards': '1 MVP or Cy Young award',
  'Major awards': '1 Major award', 'Conn Smythes': '1 Conn Smythe',
};
describe('Round 1570: the plaque says the jersey and its counts in the card\'s own words', () => {
  it.each(ROWS)('$label', ({ sport }) => {
    // The counts: one ring or Cup and one of each honour read singular on the plaque, two read plural.
    const c = retiredCareer(sport, 1595), base = hallWallEntry(sport, c)!;
    const labels = [sport.ringsLabel, ...sport.honours(c).map(h => h.label)];
    for (const l of labels) expect(Object.keys(ONE), `${sport.label}: a label with no singular stated`).toContain(l);
    for (const n of [1, 2]) {
      const e: HallWallEntry = { ...clone(base), rings: n, honours: sport.honours(c).map(h => ({ label: h.label, n })) };
      render(<UsCareerHallWall sport={sport} wall={{ entries: [e], writable: true }} from="create" plaque={e.key} missing={false}
        onOpen={() => undefined} onClosePlaque={() => undefined} onBack={() => undefined} />);
      // Whole lines, not substrings: "1 ring" is inside "1 rings".
      const lines = new Set([...document.querySelectorAll('[data-career-hall-wall-plaque] p, [data-career-hall-wall-plaque] li')].map(el => el.textContent));
      for (const l of labels) expect([...lines], `${sport.label} ${n} ${l}`).toContain(n === 1 ? ONE[l] : `2 ${l}`);
      expect(wallCount(n, sport.ringsLabel)).toBe(n === 1 ? ONE[sport.ringsLabel] : `2 ${sport.ringsLabel}`);
      cleanup();
    }
    const rec: HallRecord = { ...hallRecordFor(sport.hall!, retiredCareer(sport, 1595)), jersey: { team: 'XYZ', seasons: 7, teamName: 'Fixture Club' } };
    const one: HallRecord = { ...rec, jersey: { team: 'XYZ', seasons: 1 } };
    for (const r of [rec, one]) {
      render(<HallOfFameCard record={r} rules={sport.hall!.rules} onSpeech={() => undefined} onDismiss={() => undefined} />);
      const said = [...document.querySelectorAll('p')].find(p => p.textContent?.startsWith('👕'))?.textContent;
      expect(said).toBe(wallJerseyLine(r.jersey!));
      cleanup();
    }
  });
});

/* Release BU (the lead's L3, the 1570 x 1557 seam): a loaded NBA save whose international block the repair
   changes. The sport's intl face is held behind a gate the test opens, and its repair is planted to change a
   field the plaque reads, so the unrepaired plaque and the repaired one differ. Without the board's hold the
   keep effect writes the unrepaired plaque while the repair is pending and replaces it after (two writes). */
describe('Release BU: a loaded NBA save waits for its international repair before its plaque goes up', () => {
  it('writes the wall once, after the repair, and never the unrepaired plaque', async () => {
    const real = NBA_CAREER_SPORT.intl!;
    let open!: () => void;
    const gate = new Promise<void>(resolve => { open = resolve; });
    const REPAIRED = 'Repaired Plaque Name';
    const sport: typeof NBA_CAREER_SPORT = {
      ...NBA_CAREER_SPORT,
      intl: {
        ...real,
        load: async () => {
          await gate;
          const face = await real.load();
          return { ...face, repairOnLoad: c => { face.repairOnLoad(c); c.name = REPAIRED; return true; } };
        },
      },
    };
    const c = retiredCareer(NBA_CAREER_SPORT, 1571);
    c.intl = { v: 1, summers: [] };
    const unrepaired = c.name;
    expect(unrepaired).not.toBe(REPAIRED);
    localStorage.setItem(sport.saveKey, JSON.stringify({ c, phase: 'retired', teamQuality: 80, coach: null }));
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const wallWrites = () => writes.mock.calls.filter(([key]) => key === wallKey(sport))
      .map(([, value]) => JSON.parse(String(value)) as { entries: HallWallEntry[] });
    mountBoard(sport);
    await settle();
    /* The wall module loads in a tick: a board without the hold has written the unrepaired plaque by now. */
    await act(async () => { await import('@/lib/usCareerHallWall'); });
    await settle(); await settle();
    expect(wallWrites(), 'nothing goes up while the repair is pending').toEqual([]);
    await act(async () => { open(); await gate; await new Promise(resolve => setTimeout(resolve, 50)); });
    await waitFor(() => expect(wallWrites().length).toBeGreaterThan(0));
    await settle();
    const got = wallWrites();
    expect(got.length, 'the wall is written once').toBe(1);
    expect(got[0].entries.map(e => e.name)).toEqual([REPAIRED]);
    expect(JSON.stringify(got), 'the unrepaired plaque never went up').not.toContain(unrepaired);
    writes.mockRestore();
  }, 30000);
});
