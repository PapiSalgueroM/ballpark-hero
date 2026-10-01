import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import CbbDynastyBoard from '@/components/cbb-dynasty/CbbDynastyBoard';
import * as engine from '@/lib/cbbDynasty';
import type { CbbRecruit, CbbState } from '@/lib/cbbDynasty';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const saveKey = 'cbb-dynasty-save-v1';
const highSchool: CbbRecruit[] = [
  { id: 'fixture-hs-five-guard', name: 'Fixture Twin Guard', pos: 'PG', stars: 5, grade: 88, trueOvr: 97, nilAsk: 44 },
  { id: 'fixture-hs-wing', name: 'Fixture High Wing', pos: 'SG', stars: 5, grade: 90, trueOvr: 96, nilAsk: 50 },
  { id: 'fixture-hs-four-guard', name: 'Fixture Twin Guard', pos: 'PG', stars: 4, grade: 82, trueOvr: 98, nilAsk: 35 },
  { id: 'fixture-hs-center', name: 'Fixture High Center', pos: 'C', stars: 4, grade: 79, trueOvr: 95, nilAsk: 28 },
  { id: 'fixture-hs-three-guard', name: 'Fixture High Guard', pos: 'PG', stars: 3, grade: 67, trueOvr: 93, nilAsk: 20 },
];
const portal: CbbRecruit[] = [
  { id: 'fixture-portal-four-guard', name: 'Fixture Portal Guard', pos: 'PG', stars: 4, grade: 86, trueOvr: 86, nilAsk: 29 },
  { id: 'fixture-portal-center', name: 'Fixture Portal Center', pos: 'C', stars: 4, grade: 85, trueOvr: 85, nilAsk: 31 },
  { id: 'fixture-portal-three-guard', name: 'Fixture Portal Guard', pos: 'PG', stars: 3, grade: 80, trueOvr: 80, nilAsk: 21 },
];
interface SavedClass { st: CbbState; phase: 'recruit'; recruits: CbbRecruit[]; portal: CbbRecruit[] }
function mount(recruits = highSchool, players = portal, nil = 100) {
  const st = engine.initCbb(engine.CBB_SCHOOLS[0].id, () => 0.4);
  st.nil = nil;
  const saved: SavedClass = { st, phase: 'recruit', recruits, portal: players };
  localStorage.setItem(saveKey, JSON.stringify(saved));
  const original = localStorage.getItem(saveKey);
  return { ...render(<CbbDynastyBoard />), original, st };
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

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('CBB recruiting position and minimum-star targeting', () => {
  it('combines position and inclusive star threshold across both boards in source order', () => {
    mount();
    expectCounts(5, 5, 3, 3);
    expect(signingRows().map(node => node.textContent)).toEqual([
      '⭐⭐⭐⭐⭐ Fixture Twin GuardPG · scouted 88 · asks 44 NILSign',
      '⭐⭐⭐⭐⭐ Fixture High WingSG · scouted 90 · asks 50 NILSign',
      '⭐⭐⭐⭐ Fixture Twin GuardPG · scouted 82 · asks 35 NILSign',
      '⭐⭐⭐⭐ Fixture High CenterC · scouted 79 · asks 28 NILSign',
      '⭐⭐⭐ Fixture High GuardPG · scouted 67 · asks 20 NILSign',
      '⭐⭐⭐⭐ Fixture Portal GuardPG · rated 86 · asks 29 NILSign',
      '⭐⭐⭐⭐ Fixture Portal CenterC · rated 85 · asks 31 NILSign',
      '⭐⭐⭐ Fixture Portal GuardPG · rated 80 · asks 21 NILSign',
    ]);
    filter('PG', '');
    expectCounts(3, 5, 2, 3);
    filter('PG', '4');
    expectCounts(2, 5, 1, 3);
    expect(signingRows().map(node => node.textContent)).toEqual([
      '⭐⭐⭐⭐⭐ Fixture Twin GuardPG · scouted 88 · asks 44 NILSign',
      '⭐⭐⭐⭐ Fixture Twin GuardPG · scouted 82 · asks 35 NILSign',
      '⭐⭐⭐⭐ Fixture Portal GuardPG · rated 86 · asks 29 NILSign',
    ]);
    filter('', '4');
    expectCounts(4, 5, 2, 3);
  });

  it('resets both no-match boards and restores every remaining row', () => {
    mount();
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeDisabled();
    filter('C', '5');
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
    filter('PG', '5');
    expectCounts(0, 0, 0, 0);
    expect(screen.getByText('No high school recruits left in this class.')).toBeVisible();
    expect(screen.getByText('No portal players left in this class.')).toBeVisible();
    expect(screen.queryByText('No high school recruits match those filters.')).toBeNull();
    expect(screen.queryByText('No portal players match those filters.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Close the class, run it back' })).toBeEnabled();
  });

  it('does not save, regenerate, mutate pools or expose hidden ability while filtering', () => {
    const { original, container } = mount();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const random = vi.spyOn(Math, 'random');
    const recruitClass = vi.spyOn(engine, 'cbbRecruitClass');
    const portalPool = vi.spyOn(engine, 'cbbPortalPool');
    filter('PG', '4');
    filter('C', '5');
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(setItem.mock.calls.length, 'Recruiting filters must make zero save writes').toBe(0);
    expect(random).not.toHaveBeenCalled();
    expect(recruitClass).not.toHaveBeenCalled();
    expect(portalPool).not.toHaveBeenCalled();
    expect(localStorage.getItem(saveKey)).toBe(original);
    expect(read().recruits).toEqual(highSchool);
    expect(read().portal).toEqual(portal);
    expect(container.textContent).toContain('scouted 67');
    expect(container.textContent).not.toMatch(/scouted (93|95|96|97|98)/);
    expect(container.textContent).not.toContain('trueOvr');
    expect(signingRows().map(node => node.textContent)).toContain('⭐⭐⭐⭐⭐ Fixture Twin GuardPG · scouted 88 · asks 44 NILSign');
  });

  it('signs only the selected high school ID and pays the unchanged NIL cost', () => {
    const { st } = mount();
    const rosterBefore = st.teams[st.myTeam].players;
    filter('PG', '4');
    fireEvent.click(screen.getByRole('button', { name: /Fixture Twin Guard PG · scouted 82 · asks 35 NIL Sign/ }));
    const saved = read();
    expect(saved.st.nil).toBe(65);
    expect(saved.recruits.map(player => player.id)).toEqual(highSchool.filter(player => player.id !== 'fixture-hs-four-guard').map(player => player.id));
    expect(saved.portal).toEqual(portal);
    expect(saved.st.teams[st.myTeam].players.slice(0, rosterBefore.length)).toEqual(rosterBefore);
    expect(saved.st.teams[st.myTeam].players.at(-1)).toMatchObject({ name: 'Fixture Twin Guard', pos: 'PG', cls: 'FR', ovr: 98, stars: 4 });
    expect(screen.getByRole('button', { name: /Fixture Twin Guard PG · scouted 88/ })).toBeVisible();
    expectCounts(1, 4, 1, 3);
  });

  it('signs only the selected portal ID as a sophomore and removes the last filtered match', () => {
    const { st } = mount();
    filter('PG', '4');
    fireEvent.click(screen.getByRole('button', { name: /Fixture Portal Guard PG · rated 86 · asks 29 NIL Sign/ }));
    const saved = read();
    expect(saved.st.nil).toBe(71);
    expect(saved.portal.map(player => player.id)).toEqual(['fixture-portal-center', 'fixture-portal-three-guard']);
    expect(saved.recruits).toEqual(highSchool);
    expect(saved.st.teams[st.myTeam].players.at(-1)).toMatchObject({ name: 'Fixture Portal Guard', pos: 'PG', cls: 'SO', ovr: 86, stars: 4 });
    expectCounts(2, 5, 0, 2);
    expect(screen.getByRole('combobox', { name: 'Position' })).toHaveValue('PG');
    expect(screen.getByRole('combobox', { name: 'Minimum stars' })).toHaveValue('4');
    expect(screen.getByText('No portal players match those filters.')).toBeVisible();
    expect(screen.queryByText('No portal players left in this class.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(screen.getByRole('button', { name: /Fixture Portal Guard PG · rated 80/ })).toBeVisible();
  });

  it('preserves the existing unaffordable-sign rejection with no saved roster or NIL change', () => {
    const { original } = mount(highSchool, portal, 20);
    filter('PG', '4');
    fireEvent.click(screen.getByRole('button', { name: /Fixture Twin Guard PG · scouted 82 · asks 35 NIL Sign/ }));
    expect(screen.getByText('❌ Not enough NIL for Fixture Twin Guard (asks 35).')).toBeInTheDocument();
    expect(localStorage.getItem(saveKey)).toBe(original);
    expectCounts(2, 5, 1, 3);
    expect(signingRows()).toHaveLength(3);
  });
});
