import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import recorded from '../../scripts/data/careerLeagueWorldSaves1100.json';
import SquadSheet from '@/components/soccer-career/SquadSheet';
import { squadView, type SquadView } from '@/lib/soccerClubSquad';
import type { CareerState } from '@/lib/soccerCareerEngine';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'http://stub', SUPABASE_PUBLISHABLE_KEY: 'stub' }));

function fixture(year: number, overall = 85): CareerState {
  const career = JSON.parse(JSON.stringify(recorded.saves.find(row => row.id === 'ere')!.state)) as CareerState;
  Object.assign(career, { phase: 'playing', retired: false, currentClub: 'Arsenal', currentClubCountry: 'England', currentClubTier: 1, position: 'CM', overall });
  career.seasons[career.seasons.length - 1].year = year - 1;
  return career;
}
const players = (view: SquadView) => [...view.eleven.ATT, ...view.eleven.MID, ...view.eleven.DEF, ...view.eleven.GK];
function mount(career: CareerState, initialScreen: 'home' | 'eleven' = 'eleven') {
  const view = squadView(career);
  if (!view) throw new Error('Expected an actual squad view');
  const before = JSON.stringify({ career, view }), onClose = vi.fn();
  const rendered = render(<SquadSheet career={career} view={view} onClose={onClose} initialScreen={initialScreen} />);
  return { ...rendered, view, before, onClose };
}
function assertFacts(root: HTMLElement, view: SquadView) {
  const cells = [...root.querySelectorAll<HTMLElement>('[data-squad-xi] [data-squad-man]')];
  expect(cells).toHaveLength(11);
  const expected = players(view);
  cells.forEach((cell, index) => {
    const man = expected[index];
    expect(cell.getAttribute('aria-label')).toBe(`${man.name}, ${man.pos}, rating ${man.ovr}`);
    expect(cell.querySelector('[data-squad-cell-position]')?.textContent).toMatch(new RegExp(`^${man.pos}( ©)?$`));
    expect(cell.querySelector('[data-squad-cell-rating]')?.textContent).toBe(String(man.ovr));
    if (!man.role) expect(cell.querySelector('[data-squad-cell-name]')?.textContent).toBe(man.name);
    expect(cell.dataset.squadCellSource).toBe(man.me ? 'you' : man.role ? 'role' : man.id !== undefined ? 'generated' : 'real');
  });
  expect(root.querySelector('[data-squad-xi-line]')).toHaveTextContent('On our ratings');
}
beforeEach(() => { vi.spyOn(Math, 'random'); vi.spyOn(Storage.prototype, 'setItem'); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('club Starting 11 names positions and ratings', () => {
  it.each([2022, 2026, 2038])('shows every full name and exact existing position and rating in the %i squad', year => {
    const career = fixture(year), v = mount(career);
    assertFacts(v.container, v.view);
    expect(screen.getByRole('heading', { name: 'Starting 11 on our ratings' })).toBeInTheDocument();
    expect(JSON.stringify({ career, view: v.view })).toBe(v.before);
    expect(Math.random).not.toHaveBeenCalled(); expect(Storage.prototype.setItem).not.toHaveBeenCalled();
  });

  it('leaves unsupported historical names as roles instead of borrowing later real or generated players', () => {
    const career = fixture(1990), v = mount(career);
    expect(v.view.source).toBe('roles'); assertFacts(v.container, v.view);
    expect(screen.getByText('There is no checked historical squad for this club and season. Missing teammate names stay as roles.')).toBeInTheDocument();
    const cells = [...v.container.querySelectorAll('[data-squad-xi] [data-squad-man]')];
    for (const [index, man] of players(v.view).entries()) {
      if (man.me) continue;
      expect(man.role).toBeTruthy(); expect(cells[index].querySelector('[data-squad-cell-name]')).toBeNull();
      expect(cells[index].querySelector('[data-squad-role-cell]')).toBeInTheDocument();
    }
    expect(v.container.querySelector('[data-squad-cell-source="generated"]')).toBeNull();
    expect(JSON.stringify({ career, view: v.view })).toBe(v.before);
  });

  it('labels future teammates as generated while preserving the separately marked real carried players', () => {
    const career = fixture(2026), v = mount(career);
    expect(v.view.source).toBe('invented'); expect(v.view.carried).toBeGreaterThan(0);
    expect(v.container.querySelector('[data-squad-xi-scope]')).toHaveTextContent('Generated teammates are fictional players in your career. Players marked REAL come from the last checked squad.');
    for (const cell of v.container.querySelectorAll('[data-squad-cell-source="generated"]')) expect(cell.querySelector('[data-squad-real]')).toBeNull();
    for (const cell of v.container.querySelectorAll('[data-squad-cell-source="real"]')) expect(cell.querySelector('[data-squad-real]')).toHaveTextContent('REAL');
  });

  it('offers an explicit Starting 11 control and keeps Back and reopened rules available', () => {
    const career = fixture(2038), v = mount(career, 'home');
    const open = screen.getByRole('button', { name: 'Starting 11' });
    expect(open).toHaveClass('min-h-[56px]'); fireEvent.click(open); assertFacts(v.container, v.view);
    fireEvent.click(screen.getByRole('button', { name: 'How the squad works' }));
    expect(screen.getByText("The eleven is the highest rated keeper, four defenders, three midfielders and three forwards on our ratings. It is a picture of the squad, not the manager's team sheet.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Worked examples' }));
    expect(v.container.querySelector('[data-squad-screen="examples"]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '← Back' }));
    expect(screen.getByRole('button', { name: 'Starting 11' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '← Back to your career' })); expect(v.onClose).toHaveBeenCalledOnce();
    expect(JSON.stringify({ career, view: v.view })).toBe(v.before); expect(Storage.prototype.setItem).not.toHaveBeenCalled();
  });

  it('keeps the users full name and captain marker tied to the actual selected player', () => {
    const career = fixture(2038, 99); career.isClubCaptain = true;
    const v = mount(career), cell = v.container.querySelector('[data-squad-xi] [data-squad-man="me"]');
    expect(v.view.inElevenOnRating).toBe(true); expect(cell).not.toBeNull();
    expect(cell?.querySelector('[data-squad-cell-name]')?.textContent).toBe(career.playerName);
    expect(cell?.querySelector('[data-squad-cell-position]')?.textContent).toBe(`${career.position} ©`);
    expect(cell?.querySelector('[data-squad-cell-rating]')?.textContent).toBe(String(Math.round(career.overall)));
    expect(JSON.stringify({ career, view: v.view })).toBe(v.before);
  });

  it('does not force a low-rated user into the displayed eleven', () => {
    const career = fixture(2022, 40), v = mount(career);
    expect(v.view.inElevenOnRating).toBe(false); assertFacts(v.container, v.view);
    expect(v.container.querySelector('[data-squad-xi] [data-squad-man="me"]')).toBeNull();
    expect(v.container.querySelector('[data-squad-xi-line]')).toHaveTextContent('in ahead of you');
  });

  it('Escape returns to the squad tiles then closes without changing any recorded squad fact', () => {
    const career = fixture(2022), v = mount(career);
    const dialog = screen.getByRole('dialog', { name: 'Squad' });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(within(dialog).getByRole('button', { name: 'Starting 11' })).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: 'Escape' }); expect(v.onClose).toHaveBeenCalledOnce();
    expect(JSON.stringify({ career, view: v.view })).toBe(v.before); expect(Math.random).not.toHaveBeenCalled(); expect(Storage.prototype.setItem).not.toHaveBeenCalled();
  });
});
