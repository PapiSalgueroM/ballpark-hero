import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { SiteMenu } from '@/components/layout/SiteMenu';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

function Host() {
  const location = useLocation();
  return <><SiteMenu /><output data-testid="location">{location.pathname}</output></>;
}
function mount() {
  render(<MemoryRouter initialEntries={['/soccer']}><Host /></MemoryRouter>);
}
async function open() {
  const trigger = screen.getByRole('button', { name: 'Open site menu' });
  trigger.focus();
  fireEvent.click(trigger);
  return within(await screen.findByRole('dialog', { name: 'Menu' }));
}
async function close() {
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument());
}
function savedLinks() {
  const region = screen.queryByRole('region', { name: 'Saved games' });
  expect(region, 'SAVED_MENU_REGION_REQUIRED').not.toBeNull();
  return within(region!).getAllByRole('link');
}

describe('saved games in the actual site menu', () => {
  it('keeps the existing navigation and no empty saved section for a new visitor', async () => {
    localStorage.setItem('unrelated-preference', 'yes');
    mount();
    const menu = await open();
    expect(screen.queryByRole('region', { name: 'Saved games' })).not.toBeInTheDocument();
    expect(menu.getAllByRole('link')).toHaveLength(17);
    expect(localStorage.getItem('unrelated-preference')).toBe('yes');
  });

  it('links only catalogue saves without parsing, displaying or changing their contents', async () => {
    const soccer = '{"currentClub":"private-club-marker"}';
    const nba = '{invalid-json';
    localStorage.setItem('soccerCareerSave', soccer);
    localStorage.setItem('nba-my-career-save-v1', nba);
    localStorage.setItem('unlisted-game-save', '{}');
    mount();
    await open();
    expect(savedLinks().map(link => link.getAttribute('href')))
      .toEqual(['/soccer-career', '/nba-my-career']);
    expect(screen.getByText('Saved in this browser')).toBeVisible();
    expect(screen.queryByText(/private-club-marker|invalid-json/)).not.toBeInTheDocument();
    expect(localStorage.getItem('soccerCareerSave')).toBe(soccer);
    expect(localStorage.getItem('nba-my-career-save-v1')).toBe(nba);
    expect(localStorage.getItem('unlisted-game-save')).toBe('{}');
  });

  it('discovers added saves and removes deleted shortcuts the next time the menu opens', async () => {
    mount();
    await open();
    expect(screen.queryByRole('region', { name: 'Saved games' })).not.toBeInTheDocument();
    await close();
    localStorage.setItem('soccerCareerSave', '{}');
    await open();
    expect(savedLinks().map(link => link.getAttribute('href'))).toEqual(['/soccer-career']);
    await close();
    localStorage.removeItem('soccerCareerSave');
    localStorage.setItem('nba-my-career-save-v1', '{}');
    await open();
    expect(savedLinks().map(link => link.getAttribute('href'))).toEqual(['/nba-my-career']);
    await close();
    localStorage.removeItem('nba-my-career-save-v1');
    await open();
    expect(screen.queryByRole('region', { name: 'Saved games' })).not.toBeInTheDocument();
  });

  it('still opens normal navigation when the browser blocks access to storage', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    mount();
    const menu = await open();
    expect(screen.queryByRole('region', { name: 'Saved games' })).not.toBeInTheDocument();
    expect(menu.getByRole('link', { name: 'Search Games' })).toHaveAttribute('href', '/search');
    expect(menu.getAllByRole('link')).toHaveLength(17);
  });

  it('navigates from a saved shortcut, closes, returns focus and preserves the save', async () => {
    const raw = '{"currentClub":"private-club-marker","age":21}';
    localStorage.setItem('soccerCareerSave', raw);
    mount();
    await open();
    fireEvent.click(savedLinks()[0]);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument());
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/soccer-career$/);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open site menu' })).toHaveFocus());
    expect(localStorage.getItem('soccerCareerSave')).toBe(raw);
    await open();
    expect(savedLinks()[0]).toHaveAttribute('aria-current', 'page');
  });
});
