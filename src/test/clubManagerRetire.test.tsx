/**
 * Round 1343: the highest scoring game on the manager record, and retiring.
 * The record line is rendered from ManagerRecordLines, the one list the Manager
 * panel and the farewell share. The engine side is scripts/simCmRetire.mjs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor, fireEvent } from '@testing-library/react';
import { SAVE_KEY } from '@/lib/clubManager';
import { fenceKeyOf } from '@/lib/saveFence';
import { markLandOnHub } from '@/lib/clubManagerLanding';
import { activeSlot } from '@/lib/clubManagerSlots';
import RetireDoor, { ARM_MS } from '@/components/club-manager/RetireDoor';
import ManagerSlotsScreen from '@/components/club-manager/ManagerSlotsScreen';
import ClubManagerFarewell from '@/components/club-manager/ClubManagerFarewell';
import { useClubManager } from '@/hooks/useClubManager';
import { retireCareer } from '@/lib/clubManagerRetire';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(), getCurrentPlayerName: vi.fn(() => null) }));
import { ManagerRecordLines } from '@/components/club-manager/ClubManagerCareerPanel';
import type { CareerState, H2HEntry } from '@/lib/clubManager';
import type { ScoringGame } from '@/lib/clubManagerRecords';

const row = (opp: string, score: string, res: H2HEntry['res'], season = 1): H2HEntry => ({ opp, score, res, season, comp: 'league', home: true });
const career = (played: number, h2h: H2HEntry[], highestScoring?: ScoringGame | null): CareerState =>
  ({ h2h, careerStats: { played, wins: 0, draws: 0, losses: 0, ...(highestScoring !== undefined ? { highestScoring } : {}) } }) as unknown as CareerState;
const lines = (c: CareerState) => {
  const { container } = render(<ManagerRecordLines c={c} />);
  return {
    high: container.querySelector('[data-cm-highest-scoring]')?.textContent ?? null,
    missed: container.querySelector('[data-cm-highest-scoring-missed]')?.textContent ?? null,
  };
};
const DASHES = [0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212].map(n => String.fromCharCode(n));

describe('the record line', () => {
  it('prints a stored record with its word and season', () => {
    const l = lines(career(40, [], { opp: 'Leeds United', score: '5-4', res: 'W', season: 3, club: 'Everton', comp: 'Premier League' }));
    expect(l.high).toBe('⚽ Highest scoring game: 5-4 win vs Leeds United, Season 3');
    expect(l.missed).toBeNull();
  });
  it('reads a level score won or lost on penalties, and a plain draw', () => {
    expect(lines(career(9, [], { opp: 'Leeds United', score: '3-3', res: 'W', season: 2 })).high).toBe('⚽ Highest scoring game: 3-3 vs Leeds United, won on penalties, Season 2');
    expect(lines(career(9, [], { opp: 'Leeds United', score: '3-3', res: 'L', season: 2 })).high).toBe('⚽ Highest scoring game: 3-3 vs Leeds United, lost on penalties, Season 2');
    expect(lines(career(9, [], { opp: 'Leeds United', score: '4-4', res: 'D', season: 2 })).high).toBe('⚽ Highest scoring game: 4-4 draw vs Leeds United, Season 2');
    expect(lines(career(9, [], { opp: 'Leeds United', score: '2-5', res: 'L', season: 2 })).high).toBe('⚽ Highest scoring game: 2-5 loss vs Leeds United, Season 2');
  });
  it('gives no word when an old row contradicts its score (never "0-3 win")', () => {
    expect(lines(career(2, [row('Porto', '0-3', 'W', 4)])).high).toBe('⚽ Highest scoring game: 0-3 vs Porto, Season 4');
  });
  it('works an old save out from a whole book with no second line', () => {
    const l = lines(career(3, [row('A', '1-0', 'W'), row('B', '2-2', 'D', 2), row('C', '3-1', 'W', 2)]));
    expect(l.high).toBe('⚽ Highest scoring game: 2-2 draw vs B, Season 2');
    expect(l.missed).toBeNull();
  });
  it('says how many matches a trimmed book could not see, through formatNumber', () => {
    expect(lines(career(5, [row('A', '1-0', 'W'), row('B', '2-1', 'W')])).missed)
      .toBe('Counted from 2 of your 5 matches. Your save no longer keeps the scores of the other 3.');
    expect(lines(career(1380, [], { opp: 'B', score: '6-2', res: 'W', season: 9, missed: 1166 })).missed)
      .toBe('Counted from 214 of your 1,380 matches. Your save no longer keeps the scores of the other 1,166.');
  });
  it('prints nothing with no game: a new career, an empty book, a stored null', () => {
    expect(lines(career(0, [])).high).toBeNull();
    expect(lines(career(12, [])).high).toBeNull();
    expect(lines(career(2, [row('A', '9-0', 'W')], null)).high).toBeNull();
  });
  it('uses no dash of any kind', () => {
    const l = lines(career(5, [row('A', '1-0', 'W'), row('B', '3-3', 'W')]));
    for (const d of DASHES) expect(`${l.high}${l.missed}`).not.toContain(d);
  });
});

/* ---------------- retiring through the real hook ---------------- */
/* eslint-disable @typescript-eslint/no-explicit-any */
let api: any = null;
function Harness() {
  api = useClubManager();
  return null;
}
const onDisk = (key = SAVE_KEY): any => { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; };
async function start(club: string) {
  await waitFor(() => expect(api.phase).toBe('clubSelect'));
  act(() => api.chooseClub(club));
  act(() => api.confirmClub());
  expect(api.phase).toBe('hub');
}

describe('retiring through the hook', { timeout: 120000 }, () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); api = null; });

  it('writes first, then opens the farewell, and the disk holds the retirement', async () => {
    const r = render(<Harness />);
    await start('Everton');
    let ok = false;
    act(() => { ok = api.retire(retireCareer); });
    expect(ok).toBe(true);
    expect(api.phase).toBe('retired');
    expect(onDisk().retired).toMatchObject({ when: 'midSeason', club: 'Everton', season: 1 });
    act(() => { ok = api.retire(retireCareer); });
    expect(ok).toBe(false);
    r.unmount();
  });

  it('a reload lands on the managers screen, never on hub, seasonEnd or sacked, and opening it shows the farewell', async () => {
    const first = render(<Harness />);
    await start('Everton');
    act(() => { api.retire(retireCareer); });
    first.unmount();
    render(<Harness />);
    await waitFor(() => expect(api.phase).toBe('resume'));
    expect(api.slots[0].summary?.retired).toBe(true);
    act(() => api.openSlot(1));
    expect(api.phase).toBe('retired');
    act(() => api.showSlots());
    act(() => api.resume());
    expect(api.phase).toBe('retired');
  });

  it('opens a retired career parked in another slot on its farewell, through the boot', async () => {
    render(<Harness />);
    await start('Everton');
    act(() => { api.retire(retireCareer); });
    act(() => api.startNew());
    await start('Lincoln City');
    expect(activeSlot()).toBe(2);
    act(() => api.showSlots());
    act(() => api.openSlot(1));
    await waitFor(() => expect(api.phase).toBe('retired'));
    expect(api.career.clubName).toBe('Everton');
  });

  it('lands a Hot Seat mark on the farewell, never on the hub', async () => {
    const first = render(<Harness />);
    await start('Everton');
    act(() => { api.retire(retireCareer); });
    first.unmount();
    markLandOnHub();
    render(<Harness />);
    await waitFor(() => expect(api.phase).toBe('retired'));
  });

  it('a write the fence refuses shows the notice and no farewell, and the disk is not retired', async () => {
    render(<Harness />);
    await start('Everton');
    const gen = Number(localStorage.getItem(fenceKeyOf(SAVE_KEY)) ?? '0');
    localStorage.setItem(fenceKeyOf(SAVE_KEY), String(gen + 7));
    let ok = true;
    act(() => { ok = api.retire(retireCareer); });
    expect(ok).toBe(false);
    expect(api.phase).toBe('hub');
    expect(api.saveMoved).toBe(true);
    expect(onDisk().retired).toBeUndefined();
  });
});

/* ---------------- the door ---------------- */
describe('the retire door', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  const door = (onRetire: () => boolean) => render(
    <RetireDoor door="👋 Retire from management" title="Retire now?" lines={['Your season stops here.']} keep="Keep managing" confirm="Yes, retire" onRetire={onRetire} />,
  );
  const q = (c: HTMLElement, sel: string) => c.querySelector(sel) as HTMLElement | null;

  it('two clicks 50 ms apart on the door do not retire', () => {
    const onRetire = vi.fn(() => true);
    const { container } = door(onRetire);
    fireEvent.click(q(container, '[data-cm-retire-door]')!);
    act(() => { vi.advanceTimersByTime(50); });
    const yes = q(container, '[data-cm-retire-yes]')!;
    fireEvent.pointerDown(yes);
    fireEvent.click(yes);
    expect(onRetire).not.toHaveBeenCalled();
    expect(yes.getAttribute('aria-disabled')).toBe('true');
  });

  it('Yes does nothing before it arms and retires after', () => {
    const onRetire = vi.fn(() => true);
    const { container } = door(onRetire);
    fireEvent.click(q(container, '[data-cm-retire-door]')!);
    act(() => { vi.advanceTimersByTime(ARM_MS - 10); });
    fireEvent.click(q(container, '[data-cm-retire-yes]')!);
    expect(onRetire).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(20); });
    expect(q(container, '[data-cm-retire-yes]')!.getAttribute('aria-disabled')).toBe('false');
    fireEvent.pointerDown(q(container, '[data-cm-retire-yes]')!);
    fireEvent.click(q(container, '[data-cm-retire-yes]')!);
    expect(onRetire).toHaveBeenCalledTimes(1);
  });

  it('ignores a click whose pointer went down before it armed', () => {
    const onRetire = vi.fn(() => true);
    const { container } = door(onRetire);
    fireEvent.click(q(container, '[data-cm-retire-door]')!);
    const yes = q(container, '[data-cm-retire-yes]')!;
    fireEvent.pointerDown(yes);
    act(() => { vi.advanceTimersByTime(ARM_MS + 100); });
    fireEvent.click(yes);
    expect(onRetire).not.toHaveBeenCalled();
  });

  it('Keep managing and Escape put the door back, with the focus on Keep while it is open', () => {
    const { container } = door(() => true);
    fireEvent.click(q(container, '[data-cm-retire-door]')!);
    expect(document.activeElement?.hasAttribute('data-cm-retire-keep')).toBe(true);
    fireEvent.click(q(container, '[data-cm-retire-keep]')!);
    expect(q(container, '[data-cm-retire-door]')).not.toBeNull();
    fireEvent.click(q(container, '[data-cm-retire-door]')!);
    fireEvent.keyDown(q(container, '[data-cm-retire-confirm]')!, { key: 'Escape' });
    expect(q(container, '[data-cm-retire-door]')).not.toBeNull();
  });
});

/* ---------------- the farewell and the tile ---------------- */
describe('the farewell', { timeout: 120000 }, () => {
  const retiredCareer = (): CareerState => ({
    clubName: 'Everton', season: 7, week: 22, calendar: new Array(40).fill({ type: 'league' }),
    manager: { name: 'Sam Calloway' },
    history: [1, 2, 3, 4, 5, 6].map(season => ({ season, club: 'Everton', position: 5, points: 60, trophies: [] })),
    trophies: [{ name: 'League Title', emoji: '🏆', season: 4 }, { name: 'FA Cup', emoji: '🏅', season: 5 }],
    h2h: [row('Leeds United', '5-4', 'W', 3)],
    careerStats: { played: 1, wins: 1, draws: 0, losses: 0, clubsManaged: ['Everton'] },
    nationJob: null,
    retired: { season: 7, worldSeason: '2032-33', when: 'midSeason', club: 'Everton', week: 22, position: 9, played: 22, points: 30 },
  }) as unknown as CareerState;

  it('says the moment with the week the managers screen printed, and opens each tile in place with a Back', () => {
    const g = { startNew: vi.fn(), showSlots: vi.fn() };
    const { container } = render(<ClubManagerFarewell c={retiredCareer()} g={g as any} />);
    expect(container.querySelector('[data-cm-farewell-moment]')?.textContent).toBe('Left Everton in week 23 of Season 7, 9th after 22 league games');
    expect(container.textContent).toContain('Farewell, Sam Calloway');
    for (const key of ['clubs', 'cabinet', 'records']) {
      fireEvent.click(container.querySelector(`[data-cm-farewell-tile="${key}"]`)!);
      expect(container.querySelector(`[data-cm-farewell-open="${key}"]`)).not.toBeNull();
      fireEvent.click(container.querySelector('[data-cm-farewell-back]')!);
      expect(container.querySelector(`[data-cm-farewell-tile="${key}"]`)).not.toBeNull();
    }
    fireEvent.click(container.querySelector('[data-cm-farewell-tile="records"]')!);
    expect(container.querySelector('[data-cm-highest-scoring]')?.textContent).toBe('⚽ Highest scoring game: 5-4 win vs Leeds United, Season 3');
    fireEvent.click(container.querySelector('[data-cm-farewell-back]')!);
    fireEvent.click(container.querySelector('[data-cm-farewell-tile="clubs"]')!);
    expect(container.querySelector('[data-cm-farewell-open="clubs"]')?.textContent).toContain('Everton: Seasons 1, 2, 3, 4, 5, 6, Season 7 left unfinished');
    fireEvent.click(container.querySelector('[data-testid="cm-show-slots-retired"]')!);
    expect(g.showSlots).toHaveBeenCalledTimes(1);
    for (const d of DASHES) expect(container.textContent).not.toContain(d);
  });

  it('reads a Skip career and the other two moments', () => {
    const g = { startNew: vi.fn(), showSlots: vi.fn() };
    const skip = { ...retiredCareer(), manager: undefined, retired: { season: 7, worldSeason: '2032-33', when: 'seasonEnd', club: 'Everton' } } as unknown as CareerState;
    const a = render(<ClubManagerFarewell c={skip} g={g as any} />);
    expect(a.container.textContent).toContain("You've retired");
    expect(a.container.querySelector('[data-cm-farewell-moment]')?.textContent).toBe('Retired after Season 7 at Everton');
    a.unmount();
    const out = { ...skip, retired: { season: 8, worldSeason: '2033-34', when: 'outOfWork', club: 'Everton' } } as unknown as CareerState;
    const b = render(<ClubManagerFarewell c={out} g={g as any} />);
    expect(b.container.querySelector('[data-cm-farewell-moment]')?.textContent).toBe('Retired while out of work, last in charge of Everton');
  });

  it('the managers screen says retired and offers the farewell on that tile only', () => {
    const summary = (club: string, retired: boolean) => ({
      managerName: null, clubName: club, season: 7, worldSeason: '2032-33', trophies: 2, eraId: null, eraLabel: '2026-27', historic: false, sacked: false,
      ...(retired ? { retired: true as const } : {}),
    });
    const onContinue = vi.fn();
    const { container } = render(
      <ManagerSlotsScreen
        slots={[{ slot: 1, active: true, summary: summary('Everton', true), damaged: false }, { slot: 2, active: false, summary: summary('Leeds United', false), damaged: false }, { slot: 3, active: false, summary: null, damaged: false }] as any}
        activeDetail={null} note={null} onContinue={onContinue} onNew={vi.fn()} onDelete={vi.fn()}
      />,
    );
    expect(container.textContent).toContain('👋 retired');
    const opens = [...container.querySelectorAll('[data-cm-slot-open]')].map(b => b.textContent);
    expect(opens).toEqual(['See the farewell', 'Resume Career']);
    fireEvent.click(container.querySelector('[data-cm-slot-open="farewell"]')!);
    expect(onContinue).toHaveBeenCalledWith(1);
  });
});
