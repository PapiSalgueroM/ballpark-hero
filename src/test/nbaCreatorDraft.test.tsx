import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import NbaMyCareer from '@/pages/NbaMyCareer';

vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));

const careerKey = 'nba-my-career-save-v1';
const draftKey = 'dukb-nba-career-creator-v1';
const mount = () => render(<MemoryRouter initialEntries={['/nba-my-career']}><NbaMyCareer /></MemoryRouter>);
const name = () => screen.getByRole('textbox', { name: 'Your player name' });
const button = (label: string | RegExp) => screen.getByRole('button', { name: label });

function customize(container: HTMLElement) {
  fireEvent.change(name(), { target: { value: 'Fixture Center' } });
  fireEvent.click(button(/2003-04 throwback/));
  fireEvent.click(button(/^C$/));
  fireEvent.click(button(/Defensive Anchor/));
  const appearance = within(container.querySelector<HTMLElement>('[data-career-appearance="nba"]')!);
  fireEvent.click(appearance.getByRole('button', { name: /Hair/ }));
  fireEvent.click(appearance.getByRole('button', { name: 'Curls' }));
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it.each([
  ['Play your road to the draft', 'prospect'],
  ['Enter the draft', 'season'],
] as const)('restores the creator and hands the same player to %s', async (launch, phase) => {
  const first = mount();
  customize(first.container);
  expect(localStorage.getItem(careerKey)).toBeNull();
  first.unmount();
  const reopened = mount();
  expect(name()).toHaveValue('Fixture Center');
  const restored = JSON.parse(localStorage.getItem(draftKey)!);
  expect(restored).toMatchObject({ nameInput: 'Fixture Center', eraId: 'y2004', pos: 'C', archetypeId: 'anchor', appearance: { hairstyle: 'curls' } });
  fireEvent.click(button(launch));
  await waitFor(() => expect(localStorage.getItem(careerKey)).not.toBeNull(), { timeout: 10000 });
  const raw = localStorage.getItem(careerKey)!;
  const save = JSON.parse(raw);
  expect(save.phase).toBe(phase);
  expect(save.c ?? save.prospect).toMatchObject({
    name: 'Fixture Center', eraId: 'y2004', pos: 'C', appearance: { hairstyle: 'curls' },
  });
  expect(save.c?.archetype.id ?? save.prospect.archetypeId).toBe('anchor');
  expect(localStorage.getItem(draftKey)).toBeNull();
  reopened.unmount();
  mount();
  await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Your player name' })).toBeNull());
  expect(localStorage.getItem(careerKey)).toBe(raw);
}, 15000);

it('keeps the setup when career storage refuses the first attempt and clears it on Retry', async () => {
  const view = mount();
  customize(view.container);
  const initial = localStorage.getItem(draftKey);
  expect(initial).not.toBeNull();
  const set = Storage.prototype.setItem;
  let refused = true;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (key === careerKey && refused) throw new DOMException('Fixture refusal', 'QuotaExceededError');
    return set.call(this, key, value);
  });
  fireEvent.click(button('Play your road to the draft'));
  const retry = await screen.findByRole('button', { name: 'Retry save' });
  expect(localStorage.getItem(careerKey)).toBeNull();
  expect(localStorage.getItem(draftKey)).toBe(initial);
  refused = false;
  fireEvent.click(retry);
  expect(JSON.parse(localStorage.getItem(careerKey)!).prospect.name).toBe('Fixture Center');
  expect(localStorage.getItem(draftKey)).toBeNull();
});

it('ignores damaged creator data and replaces it after an edit', () => {
  localStorage.setItem(draftKey, JSON.stringify({ nameInput: 'bad', pos: 'toString' }));
  mount();
  expect(name()).toHaveValue('');
  fireEvent.change(name(), { target: { value: 'New Setup' } });
  expect(JSON.parse(localStorage.getItem(draftKey)!)).toMatchObject({ nameInput: 'New Setup', pos: 'PG', archetypeId: 'pointgod' });
  expect(localStorage.getItem(careerKey)).toBeNull();
});
