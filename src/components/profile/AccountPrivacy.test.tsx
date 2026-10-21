import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AccountPrivacy from './AccountPrivacy';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(), signOut: vi.fn().mockResolvedValue({ error: null }),
  getSession: vi.fn(),
  cacheDisplayName: vi.fn(),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://example.test', SUPABASE_PUBLISHABLE_KEY: 'public-key',
  supabase: { auth: { getSession: mocks.getSession, signOut: mocks.signOut } },
}));
vi.mock('@/lib/completions', () => ({ cacheDisplayName: mocks.cacheDisplayName }));

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'account-token', user: { id: A } } }, error: null });
});
afterEach(() => { vi.unstubAllGlobals(); });
function fillDelete() {
  fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
  fireEvent.change(screen.getByLabelText('Type DELETE MY ACCOUNT'), { target: { value: 'DELETE MY ACCOUNT' } });
  fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'my-password' } });
}

describe('account privacy controls', () => {
  it('requires typed confirmation and current password before submitting a delete request', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(<AccountPrivacy />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    expect(screen.getByRole('button', { name: 'Permanently delete account' })).toBeDisabled();
    expect(screen.getByLabelText('Current password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Current password')).toBeRequired();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('uses only the current token and clears the password even when the server refuses deletion', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: 'manual_required' }), { status: 409 }));
    vi.stubGlobal('fetch', fetchSpy);
    localStorage.setItem('keep-guest-career', 'saved');
    render(<AccountPrivacy />);
    fillDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Permanently delete account' }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({ action: 'delete', confirmation: 'DELETE MY ACCOUNT', password: 'my-password' });
    expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBe('Bearer account-token');
    expect(screen.getByLabelText('Current password')).toHaveValue('');
    expect(await screen.findByRole('alert')).toHaveTextContent('contact');
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(localStorage.getItem('keep-guest-career')).toBe('saved');
  });
  it('confirms deletion with a user-controlled sign-out step and preserves guest saves', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, deleted: true }), { status: 200 })));
    localStorage.setItem('keep-guest-career', 'saved');
    render(<AccountPrivacy />);
    fillDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Permanently delete account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your account was deleted');
    expect(screen.getByRole('alert')).toHaveTextContent('Log Out');
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.cacheDisplayName).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(localStorage.getItem('keep-guest-career')).toBe('saved');
  });
  it('does not claim deletion after a dropped response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    render(<AccountPrivacy />);
    fillDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Permanently delete account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('confirm');
    expect(screen.getByLabelText('Current password')).toHaveValue('');
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
  it('does not sign out B or clear its cache when an A deletion response arrives after account switching', async () => {
    let finish!: (response: Response) => void;
    const fetchSpy = vi.fn().mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; }));
    vi.stubGlobal('fetch', fetchSpy);
    render(<AccountPrivacy />);
    fillDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Permanently delete account' }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledOnce());
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'b-token', user: { id: B } } }, error: null });
    finish(new Response(JSON.stringify({ ok: true, deleted: true }), { status: 200 }));
    expect(await screen.findByRole('alert')).toHaveTextContent('sign-in changed');
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.cacheDisplayName).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it('does not download A data when its response arrives during a B session', async () => {
    let finish!: (response: Response) => void;
    const fetchSpy = vi.fn().mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; }));
    const createObjectURL = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
    render(<AccountPrivacy />);
    fireEvent.click(screen.getByRole('button', { name: 'Download account data' }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledOnce());
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'b-token', user: { id: B } } }, error: null });
    finish(new Response(JSON.stringify({ ok: true, export: { account: { id: A }, data: {} } }), { status: 200 }));
    expect(await screen.findByRole('alert')).toHaveTextContent('sign-in changed');
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
