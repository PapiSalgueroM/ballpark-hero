import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NbaMyCareer from '@/pages/NbaMyCareer';

const board = vi.hoisted(() => ({ loads: 0 }));
vi.mock('@/components/nba-my-career/NbaMyCareerBoard', async importOriginal => {
  board.loads += 1;
  return importOriginal();
});
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const key = 'nba-my-career-save-v1';
afterEach(() => {
  cleanup();
  localStorage.removeItem(key);
  vi.restoreAllMocks();
});

describe('NBA My Career cold creation', () => {
  it('keeps the existing draft fields usable before loading the season board', async () => {
    render(<NbaMyCareer />);
    const name = screen.getByRole('textbox', { name: 'Your player name' });
    expect(board.loads).toBe(0);
    fireEvent.change(name, { target: { value: 'Casey Grant' } });
    fireEvent.click(screen.getByRole('button', { name: /2003-04 throwback/ }));
    fireEvent.click(screen.getByRole('button', { name: /^C$/ }));
    fireEvent.click(screen.getByRole('button', { name: /Paint Beast/ }));
    expect(board.loads).toBe(0);
    expect(localStorage.getItem(key)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Enter the draft' }));
    expect(screen.getByText('Opening the draft…')).toBeVisible();
    await waitFor(() => {
      const raw = localStorage.getItem(key);
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!).c).toMatchObject({
        name: 'Casey Grant', pos: 'C', eraId: 'y2004', archetype: { id: 'paintbeast' },
      });
    }, { timeout: 7000 });
    expect(board.loads).toBe(1);
  }, 10000);
});
