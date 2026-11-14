import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));

const careerKey = 'nfl-my-career-save-v1';
const draftKey = 'dukb-nfl-career-creator-v1';
const name = () => screen.getByRole('textbox', { name: 'Your player name' });
const button = (label: string | RegExp) => screen.getByRole('button', { name: label });
const mount = () => render(<NflMyCareerBoard />);

function edit(container: HTMLElement) {
  fireEvent.change(name(), { target: { value: 'Fixture Receiver' } });
  fireEvent.click(button(/2005 throwback/));
  fireEvent.click(button(/^WR$/));
  fireEvent.click(button(/Alpha X/));
  const appearance = within(container.querySelector<HTMLElement>('[data-career-appearance="nfl"]')!);
  fireEvent.click(appearance.getByRole('button', { name: /Hair/ }));
  fireEvent.click(appearance.getByRole('button', { name: 'Curls' }));
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('restores setup through reload and Back to player, then starts the selected career', () => {
  const first = mount();
  edit(first.container);
  expect(localStorage.getItem(careerKey)).toBeNull();
  first.unmount();

  const second = mount();
  expect(name()).toHaveValue('Fixture Receiver');
  const expected = { nameInput: 'Fixture Receiver', pos: 'WR', eraId: 'y2005',
    archetypeId: 'alpha', appearance: { hairstyle: 'curls' } };
  expect(JSON.parse(localStorage.getItem(draftKey)!)).toMatchObject(expected);
  fireEvent.click(button('Play your road to the draft'));
  const career = localStorage.getItem(careerKey)!;
  expect(JSON.parse(career)).toMatchObject({ phase: 'prospect', prospect: {
    name: 'Fixture Receiver', pos: 'WR', eraId: 'y2005', archetypeId: 'alpha', appearance: { hairstyle: 'curls' },
  } });
  expect(localStorage.getItem(draftKey)).toBeNull();
  second.unmount();

  const spy = vi.spyOn(Storage.prototype, 'setItem');
  const third = mount();
  expect(button(/Back to player/)).toBeVisible();
  expect(spy.mock.calls.filter(([key]) => key === draftKey || key === careerKey)).toEqual([]);
  expect(localStorage.getItem(careerKey)).toBe(career);
  fireEvent.click(button(/Back to player/));
  expect(name()).toHaveValue('Fixture Receiver');
  expect(localStorage.getItem(careerKey)).toBeNull();
  expect(JSON.parse(localStorage.getItem(draftKey)!)).toMatchObject(expected);
  third.unmount();

  mount();
  expect(name()).toHaveValue('Fixture Receiver');
  fireEvent.click(button('Enter the draft'));
  const starter = JSON.parse(localStorage.getItem(careerKey)!);
  expect(starter).toMatchObject({ phase: 'season', c: { name: 'Fixture Receiver', pos: 'WR', eraId: 'y2005',
    archetype: { id: 'alpha' }, appearance: { hairstyle: 'curls' } } });
  expect(localStorage.getItem(draftKey)).toBeNull();
});

it('keeps the saved prospect recoverable until returning setup can be written', () => {
  const view = mount();
  edit(view.container);
  fireEvent.click(button('Play your road to the draft'));
  const prospect = localStorage.getItem(careerKey);
  const set = Storage.prototype.setItem;
  let refuse = true;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (key === draftKey && refuse) throw new DOMException('Fixture refusal', 'QuotaExceededError');
    return set.call(this, key, value);
  });
  fireEvent.click(button(/Back to player/));
  expect(screen.getByRole('alert')).toHaveTextContent('Your setup could not be saved.');
  expect(localStorage.getItem(careerKey)).toBe(prospect);
  expect(localStorage.getItem(draftKey)).toBeNull();
  refuse = false;
  fireEvent.click(button(/Back to player/));
  expect(name()).toHaveValue('Fixture Receiver');
  expect(localStorage.getItem(careerKey)).toBeNull();
  expect(JSON.parse(localStorage.getItem(draftKey)!)).toMatchObject({ nameInput: 'Fixture Receiver' });
});

it.each([
  { sport: 'mlb', Board: MlbMyCareerBoard, era: /2004 throwback/, eraId: 'y2004', pos: 'SS',
    archetype: /Slugging Shortstop/, archetypeId: 'slugging' },
  { sport: 'nhl', Board: NhlMyCareerBoard, era: /2006-07 throwback/, eraId: 'y2006', pos: 'D',
    archetype: /Complete Defenseman/, archetypeId: 'complete' },
])('keeps $sport setup through reload and the prospect handoff without touching other sport drafts', ({
  sport, Board, era, eraId, pos, archetype, archetypeId,
}) => {
  const activeKey = sport + '-my-career-save-v1';
  const setupKey = 'dukb-' + sport + '-career-creator-v1';
  const elsewhere = ['nba', 'nfl', sport === 'mlb' ? 'nhl' : 'mlb'].map(other => 'dukb-' + other + '-career-creator-v1');
  elsewhere.forEach(key => localStorage.setItem(key, 'held'));
  const first = render(<Board />);
  fireEvent.change(name(), { target: { value: 'Fixture Player' } });
  fireEvent.click(button(era));
  fireEvent.click(button(new RegExp('^' + pos + '$')));
  fireEvent.click(button(archetype));
  const appearance = within(first.container.querySelector<HTMLElement>(`[data-career-appearance="${sport}"]`)!);
  fireEvent.click(appearance.getByRole('button', { name: /Hair/ }));
  fireEvent.click(appearance.getByRole('button', { name: 'Curls' }));
  expect(localStorage.getItem(activeKey)).toBeNull();
  first.unmount();

  const second = render(<Board />);
  const setup = { nameInput: 'Fixture Player', pos, eraId, archetypeId, appearance: { hairstyle: 'curls' } };
  expect(name()).toHaveValue(setup.nameInput);
  expect(JSON.parse(localStorage.getItem(setupKey)!)).toMatchObject(setup);
  fireEvent.click(button('Play your road to the draft'));
  const prospect = localStorage.getItem(activeKey);
  expect(JSON.parse(prospect!)).toMatchObject({ phase: 'prospect', prospect: {
    name: setup.nameInput, pos, eraId, archetypeId, appearance: { hairstyle: 'curls' },
  } });
  expect(localStorage.getItem(setupKey)).toBeNull();
  second.unmount();

  const spy = vi.spyOn(Storage.prototype, 'setItem');
  const third = render(<Board />);
  expect(button('Back to player')).toBeInTheDocument();
  expect(spy.mock.calls.filter(([key]) => key === activeKey || key === setupKey)).toEqual([]);
  expect(localStorage.getItem(activeKey)).toBe(prospect);
  fireEvent.click(button('Back to player'));
  expect(localStorage.getItem(activeKey)).toBeNull();
  expect(JSON.parse(localStorage.getItem(setupKey)!)).toMatchObject(setup);
  third.unmount();

  render(<Board />);
  expect(name()).toHaveValue(setup.nameInput);
  fireEvent.click(button('Enter the draft'));
  expect(JSON.parse(localStorage.getItem(activeKey)!)).toMatchObject({ phase: 'season', c: {
    name: setup.nameInput, pos, eraId, archetype: { id: archetypeId }, appearance: { hairstyle: 'curls' },
  } });
  expect(localStorage.getItem(setupKey)).toBeNull();
  expect(elsewhere.map(key => localStorage.getItem(key))).toEqual(['held', 'held', 'held']);
});
