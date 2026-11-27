import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { ALL_GAMES } from '@/data/gameRegistry';
import { sportOf } from '@/data/homeFront';
import { GameNav } from './GameNav';

afterEach(cleanup);

function show(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><GameNav /></MemoryRouter>);
}

function picks() {
  return within(screen.getByRole('region', { name: 'Play Next' })).getAllByRole('link')
    .map(link => link.getAttribute('href')).filter((path): path is string => !!path && path !== '/');
}

describe('Play Next', () => {
  it('opens on the daily mixed picks and deals other games without navigating', () => {
    show('/soccer-career/');
    const original = picks();
    expect(original).toHaveLength(3);
    expect(new Set(original.map(sportOf)).size).toBe(3);
    fireEvent.click(screen.getByRole('button', { name: 'New picks' }));
    expect(picks()).toHaveLength(3);
    expect(picks().every(path => !original.includes(path) && path !== '/soccer-career')).toBe(true);
    expect(screen.getByRole('status')).toHaveTextContent(/\S/);
    fireEvent.click(screen.getByRole('button', { name: 'Soccer' }));
    expect(picks().every(path => sportOf(path) === 'soccer' && path !== '/soccer-career')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Across sports' }));
    expect(picks()).toEqual(original);
  });

  it('offers daily games and cycles through the whole pool without duplicate cards', () => {
    show('/club-manager');
    const daily = screen.getByRole('button', { name: 'Daily games' });
    fireEvent.click(daily);
    expect(daily).toHaveAttribute('aria-pressed', 'true');
    const expected = ALL_GAMES.filter(g => g.daily && g.path !== '/club-manager').map(g => g.path);
    const seen = new Set<string>();
    for (let i = 0; i < Math.ceil(expected.length / 3); i++) {
      const hand = picks();
      expect(new Set(hand).size).toBe(3);
      hand.forEach(path => seen.add(path));
      fireEvent.click(screen.getByRole('button', { name: 'New picks' }));
    }
    expect(seen).toEqual(new Set(expected));
  });

  it('omits empty sport filters and leaves protected game links in place', () => {
    show('/example-page');
    expect(screen.queryByRole('button', { name: 'World games' })).toBeNull();
    for (const link of screen.getAllByRole('link')) expect(link).toHaveAttribute('data-google-vignette', 'false');
  });
});
