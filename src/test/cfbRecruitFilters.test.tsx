import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import CfbDynastyBoard from '@/components/cfb-dynasty/CfbDynastyBoard';
import * as engine from '@/lib/cfbDynasty';
import type { CfbRecruit, CfbState } from '@/lib/cfbDynasty';
import { recordCompletion } from '@/lib/completions';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'FixtureBaller' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const saveKey = 'cfb-dynasty-save-v1';
const highSchool: CfbRecruit[] = [
  { id: 'fixture-hs-five-quarterback', name: 'Fixture Twin Quarterback', pos: 'QB', stars: 5, grade: 88, trueOvr: 97, nilAsk: 44 },
  { id: 'fixture-hs-receiver', name: 'Fixture High Receiver', pos: 'WR', stars: 5, grade: 90, trueOvr: 96, nilAsk: 50 },
  { id: 'fixture-hs-four-quarterback', name: 'Fixture Twin Quarterback', pos: 'QB', stars: 4, grade: 82, trueOvr: 98, nilAsk: 35 },
  { id: 'fixture-hs-defender', name: 'Fixture High Defender', pos: 'DL', stars: 4, grade: 79, trueOvr: 95, nilAsk: 28 },
  { id: 'fixture-hs-three-quarterback', name: 'Fixture High Quarterback', pos: 'QB', stars: 3, grade: 67, trueOvr: 93, nilAsk: 20 },
];
const portal: CfbRecruit[] = [
  { id: 'fixture-portal-four-quarterback', name: 'Fixture Portal Quarterback', pos: 'QB', stars: 4, grade: 86, trueOvr: 86, nilAsk: 29 },
  { id: 'fixture-portal-defender', name: 'Fixture Portal Defender', pos: 'DL', stars: 4, grade: 85, trueOvr: 85, nilAsk: 31 },
  { id: 'fixture-portal-three-quarterback', name: 'Fixture Portal Quarterback', pos: 'QB', stars: 3, grade: 80, trueOvr: 80, nilAsk: 21 },
];
interface SavedClass { st: CfbState; phase: 'recruit'; recruits: CfbRecruit[]; portal: CfbRecruit[] }
function mount(recruits = highSchool, players = portal, nil = 100, depth = false) {
  const st = engine.initCfb(engine.CFB_SCHOOLS[0].id, () => 0.4, { depth });
  if (depth) engine.cfbOpenOffseason(st, () => 0.4);
  st.nil = nil;
  const saved: SavedClass = { st, phase: 'recruit', recruits, portal: players };
  localStorage.setItem(saveKey, JSON.stringify(saved));
  const original = localStorage.getItem(saveKey);
  return { ...render(<CfbDynastyBoard />), original, st };
}
const read = (): SavedClass => JSON.parse(localStorage.getItem(saveKey)!);
function filter(position: string, stars: string) {
  fireEvent.change(screen.getByRole('combobox', { name: 'Position' }), { target: { value: position } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Minimum stars' }), { target: { value: stars } });
}
const signingRows = () => screen.queryAllByRole('button', { name: /Sign$/ });
const expectCounts = (hs: number, hsTotal: number, transfers: number, portalTotal: number) => {
  expect(screen.getAllByRole('status').map(node => node.textContent)).toEqual([
    `Showing ${hs} of ${hsTotal} high school recruits`, `Showing ${transfers} of ${portalTotal} portal players`,
  ]);
};

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('CFB recruiting position and minimum-star targeting', () => {
  it('combines position and inclusive star threshold across both boards in source order', () => {
    mount();
    expectCounts(5, 5, 3, 3);
    expect(signingRows().map(node => node.textContent)).toEqual([
      '⭐⭐⭐⭐⭐ Fixture Twin QuarterbackQB · scouted 88 · asks 44 NILSign',
      '⭐⭐⭐⭐⭐ Fixture High ReceiverWR · scouted 90 · asks 50 NILSign',
      '⭐⭐⭐⭐ Fixture Twin QuarterbackQB · scouted 82 · asks 35 NILSign',
      '⭐⭐⭐⭐ Fixture High DefenderDL · scouted 79 · asks 28 NILSign',
      '⭐⭐⭐ Fixture High QuarterbackQB · scouted 67 · asks 20 NILSign',
      'Fixture Portal QuarterbackQB · 4⭐ · rated 86 · asks 29 NILSign',
      'Fixture Portal DefenderDL · 4⭐ · rated 85 · asks 31 NILSign',
      'Fixture Portal QuarterbackQB · 3⭐ · rated 80 · asks 21 NILSign',
    ]);
    const kept = screen.getByRole('button', { name: /Fixture Twin Quarterback QB · scouted 82/ });
    const position = screen.getByRole('combobox', { name: 'Position' }); position.focus();
    filter('QB', '');
    expect(screen.getByRole('button', { name: /Fixture Twin Quarterback QB · scouted 82/ })).toBe(kept);
    expect(document.activeElement).toBe(position);
    expectCounts(3, 5, 2, 3);
    filter('QB', '4');
    expectCounts(2, 5, 1, 3);
    expect(signingRows().map(node => node.textContent)).toEqual([
      '⭐⭐⭐⭐⭐ Fixture Twin QuarterbackQB · scouted 88 · asks 44 NILSign',
      '⭐⭐⭐⭐ Fixture Twin QuarterbackQB · scouted 82 · asks 35 NILSign',
      'Fixture Portal QuarterbackQB · 4⭐ · rated 86 · asks 29 NILSign',
    ]);
    filter('', '4');
    expectCounts(4, 5, 2, 3);
  });

  it('resets both no-match boards and restores every remaining row', () => {
    mount();
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeDisabled();
    filter('DL', '5');
    expectCounts(0, 5, 0, 3);
    expect(screen.getByText('No high school recruits match those filters.')).toBeVisible();
    expect(screen.getByText('No portal players match those filters.')).toBeVisible();
    expect(signingRows()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(screen.getByRole('combobox', { name: 'Position' })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Minimum stars' })).toHaveValue('');
    expectCounts(5, 5, 3, 3);
    expect(signingRows()).toHaveLength(8);
    expect(screen.queryByText('No high school recruits match those filters.')).toBeNull();
    expect(screen.queryByText('No portal players match those filters.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeDisabled();
  });

  it('reports depleted pools honestly even when selections are active', () => {
    mount([], []);
    filter('QB', '5');
    expectCounts(0, 0, 0, 0);
    expect(screen.getByText('No high school recruits left in this class.')).toBeVisible();
    expect(screen.getByText('No portal players left in this class.')).toBeVisible();
    expect(screen.queryByText('No high school recruits match those filters.')).toBeNull();
    expect(screen.queryByText('No portal players match those filters.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Close the class, run it back' })).toBeEnabled();
  });

  it('does not save, regenerate, mutate pools or expose hidden ability while filtering', () => {
    const { original, container, st } = mount(highSchool, portal, 100, true);
    expect(st.depth).toBe(1); expect(st.staffWindow).toBeDefined();
    expect(screen.getByText(/Coaching staff/)).toBeVisible();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const random = vi.spyOn(Math, 'random');
    const recruitClass = vi.spyOn(engine, 'cfbRecruitClass');
    const sign = vi.spyOn(engine, 'signRecruit');
    const portalPool = vi.spyOn(engine, 'cfbPortalPool');
    filter('QB', '4');
    filter('DL', '5');
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(setItem.mock.calls.length, 'Recruiting filters must make zero save writes').toBe(0);
    expect(random).not.toHaveBeenCalled();
    expect(recruitClass).not.toHaveBeenCalled();
    expect(portalPool).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled(); expect(recordCompletion).not.toHaveBeenCalled();
    expect(localStorage.getItem(saveKey)).toBe(original);
    expect(read().recruits).toEqual(highSchool);
    expect(read().portal).toEqual(portal);
    expect(container.textContent).toContain('scouted 67');
    expect(container.textContent).not.toMatch(/scouted (93|95|96|97|98)/);
    expect(container.textContent).not.toContain('trueOvr');
    expect(signingRows().map(node => node.textContent)).toContain('⭐⭐⭐⭐⭐ Fixture Twin QuarterbackQB · scouted 88 · asks 44 NILSign');
  });

  it('signs only the selected high school ID and pays the unchanged NIL cost', () => {
    const { st } = mount();
    const rosterBefore = st.teams[st.myTeam].players;
    filter('QB', '4');
    fireEvent.click(screen.getByRole('button', { name: /Fixture Twin Quarterback QB · scouted 82 · asks 35 NIL Sign/ }));
    const saved = read();
    expect(saved.st.nil).toBe(65);
    expect(saved.recruits.map(player => player.id)).toEqual(highSchool.filter(player => player.id !== 'fixture-hs-four-quarterback').map(player => player.id));
    expect(saved.portal).toEqual(portal);
    expect(saved.st.teams[st.myTeam].players.slice(0, rosterBefore.length)).toEqual(rosterBefore);
    expect(saved.st.teams[st.myTeam].players.at(-1)).toMatchObject({ name: 'Fixture Twin Quarterback', pos: 'QB', cls: 'FR', ovr: 98, stars: 4 });
    expect(screen.getByRole('button', { name: /Fixture Twin Quarterback QB · scouted 88/ })).toBeVisible();
    expectCounts(1, 4, 1, 3);
  });

  it('signs only the selected portal ID as a sophomore and removes the last filtered match', () => {
    const { st } = mount();
    filter('QB', '4');
    fireEvent.click(screen.getByRole('button', { name: /Fixture Portal Quarterback QB · 4⭐ · rated 86 · asks 29 NIL Sign/ }));
    const saved = read();
    expect(saved.st.nil).toBe(71);
    expect(saved.portal.map(player => player.id)).toEqual(['fixture-portal-defender', 'fixture-portal-three-quarterback']);
    expect(saved.recruits).toEqual(highSchool);
    expect(saved.st.teams[st.myTeam].players.at(-1)).toMatchObject({ name: 'Fixture Portal Quarterback', pos: 'QB', cls: 'SO', ovr: 86, stars: 4 });
    expectCounts(2, 5, 0, 2);
    expect(screen.getByRole('combobox', { name: 'Position' })).toHaveValue('QB');
    expect(screen.getByRole('combobox', { name: 'Minimum stars' })).toHaveValue('4');
    expect(screen.getByText('No portal players match those filters.')).toBeVisible();
    expect(screen.queryByText('No portal players left in this class.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(screen.getByRole('button', { name: /Fixture Portal Quarterback QB · 3⭐ · rated 80/ })).toBeVisible();
  });

  it('preserves the existing unaffordable-sign rejection with no saved roster or NIL change', () => {
    const { original } = mount(highSchool, portal, 20);
    filter('QB', '4');
    fireEvent.click(screen.getByRole('button', { name: /Fixture Twin Quarterback QB · scouted 82 · asks 35 NIL Sign/ }));
    expect(screen.getByText('❌ Not enough NIL for Fixture Twin Quarterback (asks 35).')).toBeInTheDocument();
    expect(localStorage.getItem(saveKey)).toBe(original);
    expectCounts(2, 5, 1, 3);
    expect(signingRows()).toHaveLength(3);
  });

  it('holds independent original signing and refusal effects without targeting', () => {
    const { st } = mount();
    const originalRoster = st.teams[st.myTeam].players;
    const reference = JSON.parse(JSON.stringify(st)) as CfbState;
    expect(engine.signRecruit(reference, highSchool[2], 'FR', () => 0.4)).toBe(true);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.4);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    fireEvent.click(screen.getByRole('button', { name: /Fixture Twin Quarterback QB · scouted 82 · asks 35 NIL Sign/ }));
    const committed = read(), actual = committed.st.teams[st.myTeam].players.at(-1)!;
    const expected = reference.teams[st.myTeam].players.at(-1)!;
    expect({ ...actual, id: expected.id }).toEqual(expected);
    expect(originalRoster.some(p => p.id === actual.id)).toBe(false);
    expected.id = actual.id;
    expect(committed.st).toEqual(reference);
    expect(committed.recruits).toEqual(highSchool.filter(p => p.id !== highSchool[2].id));
    expect(committed.portal).toEqual(portal); expect(committed.phase).toBe('recruit');
    expect(random).toHaveBeenCalledTimes(1); expect(write).toHaveBeenCalledTimes(1); expect(recordCompletion).not.toHaveBeenCalled();
    cleanup(); random.mockRestore(); write.mockRestore();
    const refused = mount(highSchool, portal, 20), refusedReference = JSON.parse(JSON.stringify(refused.st)) as CfbState;
    expect(engine.signRecruit(refusedReference, highSchool[2], 'FR', () => 0.4)).toBe(false);
    expect(refusedReference).toEqual(refused.st);
    const refusedRandom = vi.spyOn(Math, 'random'), refusedWrite = vi.spyOn(Storage.prototype, 'setItem');
    fireEvent.click(screen.getByRole('button', { name: /Fixture Twin Quarterback QB · scouted 82 · asks 35 NIL Sign/ }));
    expect(localStorage.getItem(saveKey)).toBe(refused.original);
    expect(refusedRandom).not.toHaveBeenCalled(); expect(refusedWrite).not.toHaveBeenCalled(); expect(recordCompletion).not.toHaveBeenCalled();
    expect(screen.getByText('❌ Not enough NIL for Fixture Twin Quarterback (asks 35).')).toBeInTheDocument();
  });
});
