import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from '@/components/layout/Header';

const auth = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, loading: false, ...auth }),
}));
vi.mock('@/lib/authProviders', () => ({
  OAUTH_PROVIDERS: { google: false, apple: false },
  ANY_OAUTH_ENABLED: false,
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { resetPasswordForEmail: auth.resetPasswordForEmail } },
}));
vi.mock('@/hooks/useStreaks', () => ({ useStreaks: () => ({ globalCurrentStreak: 0 }) }));
vi.mock('@/components/layout/ThemeToggle', () => ({ ThemeToggle: () => null }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  expect(auth.signIn).not.toHaveBeenCalled();
  expect(auth.signUp).not.toHaveBeenCalled();
  expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
});

function renderHeader() {
  return render(<MemoryRouter><Header /></MemoryRouter>);
}

async function openFrom(name: 'Log In' | 'Sign Up') {
  const opener = screen.getByRole('button', { name });
  opener.focus();
  fireEvent.click(opener);
  const dialog = await screen.findByRole('dialog');
  await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
  expect(screen.getByRole('textbox', { name: 'Email' })).toHaveFocus();
  return { opener, dialog };
}

describe('account dialog returns to its exact opener', () => {
  for (const name of ['Log In', 'Sign Up'] as const) {
    for (const close of ['Escape', 'Close'] as const) {
      it(`${name} returns focus after ${close}`, async () => {
        renderHeader();
        const { opener, dialog } = await openFrom(name);
        if (close === 'Escape') fireEvent.keyDown(dialog, { key: 'Escape' });
        else fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        await waitFor(() => expect(opener).toHaveFocus());
        expect(screen.getByRole('button', { name })).toBe(opener);
      });
    }
  }

  it('uses the latest opener after a login, signup and login sequence', async () => {
    renderHeader();
    for (const name of ['Log In', 'Sign Up', 'Log In'] as const) {
      const { opener, dialog } = await openFrom(name);
      const other = screen.getByRole('button', { name: name === 'Log In' ? 'Sign Up' : 'Log In', hidden: true });
      fireEvent.keyDown(dialog, { key: 'Escape' });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await waitFor(() => expect(opener).toHaveFocus());
      expect(other).not.toHaveFocus();
    }
  });

  it('keeps the original opener when the player changes tabs inside the dialog', async () => {
    renderHeader();
    const { opener } = await openFrom('Log In');
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Join DoUKnowBall');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('keeps focus inside the open dialog and preserves form validation', async () => {
    renderHeader();
    const { opener, dialog } = await openFrom('Log In');
    opener.focus();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(dialog).toHaveTextContent('Email is required');
    expect(dialog).toHaveTextContent('Password is required');
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('explains that guest points, streaks and leaderboard entries count', async () => {
    renderHeader();
    const { dialog } = await openFrom('Sign Up');
    expect(dialog).toHaveAccessibleDescription(/Guests earn points, build streaks and appear on the leaderboard too/);
    expect(dialog).toHaveAccessibleDescription(/Create a free account for your profile and saved scores/);
    expect(dialog).not.toHaveTextContent(/only count once you have an account/);
  });
});
