import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GameHelp } from '@/components/game/GameHelp';

const seenKey = 'rules-gate-seen:/nba-my-career';

function mountGuide() {
  return render(<MemoryRouter initialEntries={['/nba-my-career']}><GameHelp firstVisit /></MemoryRouter>);
}

beforeEach(() => localStorage.removeItem(seenKey));
afterEach(cleanup);

describe('shared game guide at entry', () => {
  it('focuses the heading before the instructions and returns to the opener when dismissed', async () => {
    mountGuide();
    const dialog = await screen.findByRole('dialog', { name: 'How to play' });
    const title = within(dialog).getByRole('heading', { name: 'How to play' });
    await waitFor(() => expect(title).toHaveFocus());
    expect(localStorage.getItem(seenKey)).toBeNull();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(screen.getByRole('button', { name: 'How to play' })).toHaveFocus());
    expect(localStorage.getItem(seenKey)).toBe('1');
  });

  it('keeps both dismissal controls outside the keyboard-scrollable guide', async () => {
    mountGuide();
    const dialog = await screen.findByRole('dialog', { name: 'How to play' });
    const instructions = within(dialog).getByRole('region', { name: 'Game instructions' });
    expect(instructions).toHaveAttribute('tabindex', '0');
    const content = within(instructions);
    expect(content.getByRole('heading', { name: 'The steps' })).toBeVisible();
    expect(content.getByRole('heading', { name: 'The rules' })).toBeVisible();
    expect(content.getByRole('heading', { name: 'A worked example' })).toBeVisible();

    const dismiss = within(dialog).getByRole('button', { name: "Let's Play!" });
    expect(instructions).not.toContainElement(dismiss);
    expect(instructions).not.toContainElement(within(dialog).getByRole('button', { name: 'Close' }));
    fireEvent.click(dismiss);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(localStorage.getItem(seenKey)).toBe('1');
  });
});
