/**
 * Round 538: two live player reports on Club Manager, filed 2026-09-13 through
 * the site's own report button.
 *
 *   "Manager career doesnt save if you leave the website"
 *   "the players duplicate if you buy them and it doesnt save like player
 *    career does sometimes"
 *
 * This file renders the REAL hook and the REAL live match viewer, wired exactly
 * as src/pages/ClubManager.tsx wires them, and measures both.
 *
 * ONE OF HIM. slug(name) is not injective, so an id built from a name is not
 * unique. foldSpecialLatin folds the Polish barred l onto a plain l and the NFD
 * pass strips the acute, and two pairs in the shipped market land on one
 * string: the Atalanta midfielder and the Fenerbahce keeper (two different
 * men) both on sign-ederson-s1, and the two Hertha BSC rows that are one man
 * spelled twice both on p-michal-karbownik. Two squad members under one id are
 * two rows drawn under one React key, and every lookup in the engine is
 * find(p => p.id === id), which resolves to the first of the pair: the second
 * man cannot be picked, a set piece job handed to him lands on the first, and
 * selling either runs squad.filter(x => x.id !== playerId) and takes both.
 *
 * LEAVING THE SITE. The hook persists from an effect keyed on the career
 * object, which covers everything done while the page is up. It cannot write a
 * change decided at the moment the page goes: a setCareer from a pagehide
 * listener or an unmount cleanup never commits, so the effect never runs.
 * Round 543 added exactly such a handler to the viewer for the clock, for the
 * case its own comment names ("tapping Back, or the DoUKnowBall logo, or any
 * nav link"), and on the shipped code it did nothing in that case: the viewer
 * on screen in the 19th minute, the save at minute 0, still 0 after the route
 * unmounted. It worked only when the viewer alone unmounted and the page
 * stayed, which is the one case it was not written for.
 *
 * scripts/simClubManagerSave.mjs runs this file and carries the negative
 * controls. CM_HOOK points it at a copy of the hook with the Round 538 write
 * taken back out.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { LiveSimScreen } from '@/components/club-manager/LiveSimScreen';
import { CM_ROSTERS, CM_PARTIAL } from '@/data/clubManagerRosters';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
}));

const hookPath = process.env.CM_HOOK;
const { useClubManager } = hookPath
  ? await import(/* @vite-ignore */ hookPath)
  : await import('@/hooks/useClubManager');

const KEY = 'dukb-club-manager-save';
/* A club with a full roster, so a season is a real one. */
const CLUB: string = Object.keys(CM_ROSTERS).find(k => !CM_PARTIAL.includes(k)) ?? Object.keys(CM_ROSTERS)[0];
/* eslint-disable @typescript-eslint/no-explicit-any */

let api: any = null;

/** The page's own wiring of the viewer, ClubManager.tsx from line 621 down. */
function Harness() {
  const g = useClubManager();
  api = g;
  const c = g.career;
  /* Every hook above this line, none below it: this file's own game has had a
     React error 310 from exactly that mistake. */
  if (c && c.live && (g.phase === 'halftime' || g.phase === 'matchResult')) {
    return (
      <LiveSimScreen
        career={c}
        live={c.live}
        report={g.phase === 'matchResult' ? g.report : null}
        clubColor="#ffffff"
        onSub={g.subAtHalftime}
        onShape={g.shapeAtHalftime}
        onTalk={g.halftimeTalk}
        onSecondHalf={g.secondHalf}
        onStartSecondHalf={g.startSecondHalfLive}
        onChange={g.changeAt}
        onMark={g.markMinute}
        onExit={() => { /* watch mode off, the page stays */ }}
      />
    );
  }
  return <div data-testid="cm-no-live" />;
}

const disk = (): any => { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; };
const duplicateIds = (squad: any[]): string[][] => {
  const byId = new Map<string, string[]>();
  for (const p of squad) {
    if (!byId.has(p.id)) byId.set(p.id, []);
    byId.get(p.id)!.push(`${p.name} (${p.position})`);
  }
  return [...byId.entries()].filter(([, who]) => who.length > 1).map(([id, who]) => [id, ...who]);
};
/* jsdom gives the viewer a real requestAnimationFrame only under fake timers we
   drive ourselves, and the timers have to be installed BEFORE the first render:
   the viewer schedules its first frame on mount, and a frame scheduled with the
   real rAF is never picked up by a fake clock installed afterwards. */
const FAKE = ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] as any;

beforeEach(() => { localStorage.clear(); api = null; });
afterEach(() => { vi.useRealTimers(); });

async function booted(club = CLUB) {
  vi.useFakeTimers({ toFake: FAKE });
  const r = render(<Harness />);
  await act(async () => { vi.advanceTimersByTime(10); });
  expect(api.phase).toBe('clubSelect');
  act(() => api.chooseClub(club));
  act(() => api.confirmClub());
  expect(api.phase).toBe('hub');
  return r;
}

describe('Club Manager: one of him', () => {
  it('two real players whose names slug to one string stay two men', async () => {
    await booted('Real Madrid');
    /* Both are real and both are in the shipped market: Ederson of Atalanta
       (CM) and Ederson of Fenerbahce (GK). Neither may be dropped. */
    const pair = api.market.filter((m: any) => m.name === 'Éderson' || m.name === 'Ederson');
    expect(pair.length).toBe(2);
    console.log('  the pair:', pair.map((m: any) => `${m.name} ${m.position} @${m.club} ${m.price}`).join(' | '));
    const before = api.career.squad.length;
    for (const mp of pair) act(() => api.buy(mp));
    const squad = api.career.squad;
    expect(squad.length).toBe(before + 2);
    console.log('  squad', before, '->', squad.length, 'duplicate ids:', JSON.stringify(duplicateIds(squad)));
    expect(duplicateIds(squad)).toEqual([]);
    /* And on disk, which is what the next visit reads. */
    expect(duplicateIds(disk().squad)).toEqual([]);
  }, 120000);

  it('no club starts a career with two players under one id', async () => {
    /* Hertha BSC carried the same man twice in the roster data, LB and RB,
       same age, same value, same rating, one spelling with the barred l. */
    for (const club of ['Hertha BSC', CLUB, 'Real Madrid']) {
      await booted(club);
      const dupes = duplicateIds(api.career.squad);
      console.log(`  ${club}: ${api.career.squad.length} players, duplicate ids: ${JSON.stringify(dupes)}`);
      expect(dupes).toEqual([]);
      act(() => api.startNew());
    }
  }, 120000);
});

describe('Club Manager: the save', () => {
  it('every transition is on disk, and a reload loses nothing', async () => {
    await booted();
    const steps: [string, () => void][] = [
      ['a shape', () => api.setFormationIndex(2)],
      ['a mentality', () => api.setMentality('attacking')],
      ['an XI change', () => api.setXiSlot(3, api.career.squad[15].id)],
      ['a training plan', () => api.setTraining({ intensity: 'hard', focus: 'fitness' })],
      ['a squad role', () => api.setRole(api.career.squad[4].id, 'rotation')],
      ['a transfer status', () => api.setStatus(api.career.squad[20].id, 'listed')],
      ['a signing', () => api.buy(api.market.find((m: any) => m.price <= api.career.budget))],
      ['kick off', () => api.play()],
      ['the second half', () => api.secondHalf()],
      ['leaving the report', () => api.continueFromReport()],
      ['a quick sim', () => api.quickPlay()],
      ['leaving that report', () => api.continueFromReport()],
      ['a run of weeks', () => api.simToWeek(api.career.week + 6)],
      ['leaving that report too', () => api.continueFromReport()],
    ];
    for (const [label, fn] of steps) {
      act(fn);
      const mem = JSON.stringify(api.career);
      expect(localStorage.getItem(KEY), `${label} is not on disk`).toBe(mem);
      console.log(`  ${label}: on disk, ${mem.length} bytes, week ${api.career.week}`);
    }
    /* And what comes back is what went in: the repairs on the way in are a
       fixed point on a save this engine wrote. */
    const memAtEnd = JSON.stringify(api.career);
    const { loadCareer } = await import('@/lib/clubManager');
    const back = loadCareer();
    expect(back).toBeTruthy();
    expect(JSON.stringify(back)).toBe(memAtEnd);
    console.log(`  reloaded: identical, ${memAtEnd.length} bytes`);
  }, 180000);

  it('leaving the site mid match keeps the clock where it stood', async () => {
    const r = await booted();
    let guard = 0;
    while (api.phase !== 'halftime' && guard++ < 20) act(() => api.play());
    expect(api.career.live).toBeTruthy();
    /* Twenty seconds of the viewer's own clock at its default speed. */
    act(() => { vi.advanceTimersByTime(20000); });
    const shown = /LIVE (\d+)'/.exec(r.container.textContent || '');
    const onScreen = shown ? Number(shown[1]) : 0;
    expect(onScreen, 'the viewer never got going, so this proves nothing').toBeGreaterThan(10);
    expect(onScreen).toBeLessThan(45);
    /* The mark is never on a tick, so the save is still behind the screen. */
    console.log(`  on screen ${onScreen}', save at ${disk()?.live?.minute ?? 0}'`);
    /* Leaving: Back, the logo, a nav link, or the tab closing. The whole route
       unmounts and the hook goes with it. */
    act(() => { r.unmount(); });
    const saved = disk()?.live?.minute ?? 0;
    console.log(`  after leaving, save at ${saved}'`);
    expect(saved, 'the half will be replayed from the start').toBeGreaterThanOrEqual(onScreen - 1);
  }, 180000);

  it('leaving only the viewer, with the page still up, keeps it too', async () => {
    /* The case Round 543 did cover, kept as the pair to the one above: if this
       one went red the fix would be worse than the defect. */
    const r = await booted();
    let guard = 0;
    while (api.phase !== 'halftime' && guard++ < 20) act(() => api.play());
    act(() => { vi.advanceTimersByTime(20000); });
    const shown = /LIVE (\d+)'/.exec(r.container.textContent || '');
    const onScreen = shown ? Number(shown[1]) : 0;
    expect(onScreen).toBeGreaterThan(10);
    act(() => { api.secondHalf(); });     /* the viewer unmounts, the page stays */
    console.log(`  on screen ${onScreen}', page still up, the match finished at week ${disk()?.week} and the save matches memory`);
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(api.career));
    r.unmount();
  }, 180000);

  it('Start Fresh is not undone by leaving straight afterwards', async () => {
    const r = await booted();
    expect(disk()).toBeTruthy();
    act(() => api.startNew());
    expect(localStorage.getItem(KEY)).toBeNull();
    act(() => { r.unmount(); });
    console.log('  after Start Fresh and leaving, the slot is', localStorage.getItem(KEY) === null ? 'empty' : 'NOT empty');
    expect(localStorage.getItem(KEY)).toBeNull();
  }, 120000);
});
