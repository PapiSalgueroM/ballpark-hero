import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountMenuProps } from '@/components/layout/AccountMenu';

const spies = vi.hoisted(() => ({
  user: null as null | { id: string; email: string },
  profile: null as null | { display_name: string; username: string },
  signOut: vi.fn(), navigate: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: spies.user, profile: spies.profile, loading: false, signOut: spies.signOut }) }));
vi.mock('react-router-dom', async original => ({ ...await original<typeof import('react-router-dom')>(), useNavigate: () => spies.navigate }));
vi.mock('@/hooks/useRoutePath', () => ({ useRoutePath: () => '/' }));
vi.mock('@/hooks/useStreaks', () => ({ useStreaks: () => ({ globalCurrentStreak: 0 }) }));
vi.mock('@/components/layout/Logo', () => ({ LogoMark: () => null }));
vi.mock('@/components/layout/ThemeToggle', () => ({ ThemeToggle: () => null }));
vi.mock('@/components/game/SoundToggle', () => ({ SoundToggle: () => null }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/lib/authProviders', () => ({ OAUTH_PROVIDERS: { google: false } }));
vi.mock('@/lib/googlePaused', () => ({ isGoogleOnlyAccount: () => true }));
let Header: typeof import('@/components/layout/Header').Header;
let resolveMenu: () => void;
let rejectMenu: (reason: Error) => void;
const imported = vi.fn();
function LoadedMenu(props: AccountMenuProps) {
  return <div role="region" aria-label="Loaded account menu">
    <button aria-label="Account menu">{props.initial}</button>
    <p>{props.displayName} {props.email} {props.username}</p>
    {props.offerPassword && <a href="/reset-password">Set a password</a>}
    <button onClick={props.onSignOut}>Log Out</button>
  </div>;
}
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks();
  spies.user = { id: 'fictional-a', email: 'a@example.test' };
  spies.profile = { display_name: 'Avery', username: 'avery' };
  spies.signOut.mockResolvedValue(undefined);
  const pending = new Promise<void>((resolve, reject) => { resolveMenu = resolve; rejectMenu = reject; });
  vi.doMock('@/components/layout/AccountMenu', async () => { imported(); await pending; return { AccountMenu: LoadedMenu }; });
  ({ Header } = await import('@/components/layout/Header'));
});
afterEach(async () => { cleanup(); await act(async () => { resolveMenu(); }); vi.doUnmock('@/components/layout/AccountMenu'); });
const mount = () => render(<MemoryRouter><Header /></MemoryRouter>);

describe('member account menu loads only for a signed-in player', () => {
  it('does not import the member menu for a guest', async () => {
    spies.user = null; spies.profile = null; mount();
    await act(async () => {});
    expect(imported).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Log In', exact: true })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Account menu' })).toBeNull();
  });
  it('keeps the account button disabled and announces the pending menu', async () => {
    mount(); await waitFor(() => expect(imported).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Account menu' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Account menu' })).toHaveTextContent('A');
    expect(screen.getByRole('status')).toHaveTextContent('Loading account menu');
    expect(screen.queryByRole('region', { name: 'Loaded account menu' })).toBeNull();
  });
  it('contains an import failure in a local alert', async () => {
    mount(); await waitFor(() => expect(imported).toHaveBeenCalledTimes(1));
    await act(async () => { rejectMenu(new Error('Fixture member chunk failed')); });
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeNull());
    expect(screen.getByRole('alert')).toHaveTextContent('Account menu could not load');
    expect(screen.getByRole('link', { name: 'DoUKnowBall', exact: true })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Loaded account menu' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Log Out', exact: true })).toBeEnabled();
  });
  it('keeps Log Out working when the member chunk fails', async () => {
    mount(); await waitFor(() => expect(imported).toHaveBeenCalledTimes(1));
    await act(async () => { rejectMenu(new Error('Fixture member chunk failed')); });
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Log Out', exact: true }));
    await waitFor(() => expect(spies.signOut).toHaveBeenCalledTimes(1));
    expect(spies.navigate).toHaveBeenCalledWith('/');
  });
  it('passes the current identity and account actions to the loaded menu', async () => {
    const view = mount(); await waitFor(() => expect(imported).toHaveBeenCalledTimes(1));
    await act(async () => { resolveMenu(); });
    await screen.findByRole('region', { name: 'Loaded account menu' });
    expect(screen.getByRole('button', { name: 'Account menu' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Account menu' })).toHaveTextContent('A');
    expect(screen.getByRole('region', { name: 'Loaded account menu' })).toHaveTextContent('Avery a@example.test avery');
    expect(screen.getByRole('link', { name: 'Set a password' })).toHaveAttribute('href', '/reset-password');
    spies.profile = { display_name: 'Blair', username: 'blair' };
    view.rerender(<MemoryRouter><Header /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Account menu' })).toHaveTextContent('B');
    expect(screen.getByRole('region', { name: 'Loaded account menu' })).toHaveTextContent('Blair a@example.test blair');
    expect(imported).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Log Out', exact: true }));
    await waitFor(() => expect(spies.signOut).toHaveBeenCalledTimes(1));
    expect(spies.navigate).toHaveBeenCalledWith('/');
  });
});
