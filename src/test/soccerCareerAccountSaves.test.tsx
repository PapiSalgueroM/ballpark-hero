import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SoccerCareerSlots from '@/components/soccer-career/SoccerCareerSlots';
import { FALLBACK_CLUBS, initCareer } from '@/lib/soccerCareerEngine';
import { serializeSoccerCareerSave, SOCCER_CAREER_SAVE_VERSION } from '@/lib/soccerCareerSave';

const mock = vi.hoisted(() => ({
  userId: 'account-alice' as string | null,
  read: vi.fn(), write: vi.fn(), remove: vi.fn(), restore: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mock.userId ? { id: mock.userId } : null, loading: false }) }));
vi.mock('@/components/auth/AuthModal', () => ({
  AuthModal: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div role="dialog" aria-label="Account sign in" /> : null,
}));
vi.mock('@/lib/soccerCareerAccount', () => ({
  readSoccerCareerAccountSaves: mock.read,
  writeSoccerCareerAccountSave: mock.write,
  deleteSoccerCareerAccountSave: mock.remove,
  restoreSoccerCareerAccountSave: mock.restore,
  readSoccerCareerAccountLocal: (key: string) => ({ raw: localStorage.getItem(key), summary: null }),
  summarizeAccountCareer: (raw: string) => {
    const { playerName, currentClub, age } = JSON.parse(raw);
    return { playerName, club: currentClub, age };
  },
}));

const slots = [
  { path: '/soccer-career', saveKey: 'soccerCareerSave' },
  { path: '/soccer-career?slot=2', saveKey: 'soccerCareerSave-slot-2' },
  { path: '/soccer-career?slot=3', saveKey: 'soccerCareerSave-slot-3' },
];
const key = slots[0].saveKey;
const stats = { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60, reflexes: 60 };
const savedAt = '2026-11-15T12:00:00.000Z';

const view = () => <MemoryRouter><SoccerCareerSlots slots={slots} backPath="/soccer-career" /></MemoryRouter>;
const career = (name: string, year = 2023) => serializeSoccerCareerSave(
  initCareer(name, 'England', 'ST', '2020-24', stats, 60, year, FALLBACK_CLUBS), SOCCER_CAREER_SAVE_VERSION,
);
const remote = (name: string, revision: string) => ({ slot: 1, revision, raw: career(name, 2021), savedAt });
const turnOn = () => fireEvent.click(screen.getByRole('button', { name: 'Account saves' }));
const dialog = (name: RegExp) => within(screen.getByRole('alertdialog', { name }));
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  mock.userId = 'account-alice';
  mock.read.mockResolvedValue([]);
});
afterEach(cleanup);

describe('Soccer Career account saves', () => {
  it('keeps the browser chooser usable before the player opens optional account saves', async () => {
    render(view());
    expect(screen.getByRole('link', { name: 'New career in slot 1' })).toBeVisible();
    expect(mock.read).not.toHaveBeenCalled();
    turnOn();
    expect(await screen.findAllByText('No account copy')).toHaveLength(3);
    expect(mock.read).toHaveBeenCalledWith('account-alice');
    expect(mock.write).not.toHaveBeenCalled();
    click('Back to browser saves');
    expect(screen.getByRole('link', { name: 'New career in slot 1' })).toBeVisible();
  });

  it('offers the site sign-in form before reading any account data', async () => {
    mock.userId = null;
    render(view());
    turnOn();
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('dialog', { name: 'Account sign in' })).toBeVisible();
    expect(mock.read).not.toHaveBeenCalled();
  });

  it('compares both copies and keeps the browser career after a failed upload', async () => {
    const browser = career('Browser Forward');
    const cloud = remote('Account Forward', 'cloud-one');
    localStorage.setItem(key, browser);
    mock.read.mockResolvedValue([cloud]);
    mock.write.mockResolvedValue('failed');
    render(view());
    turnOn();
    expect(await screen.findByText('Account Forward')).toBeVisible();
    expect(screen.getByText('Browser Forward')).toBeVisible();
    click('Save slot 1 to account');
    const confirmation = dialog(/save slot 1 to your account/i);
    expect(confirmation.getByText(/replace the account copy/i)).toBeVisible();
    expect(confirmation.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(mock.write).not.toHaveBeenCalled();
    fireEvent.click(confirmation.getByRole('button', { name: 'Save to account' }));
    expect(await screen.findByText(/could not confirm the account save/i)).toBeVisible();
    expect(mock.write).toHaveBeenCalledExactlyOnceWith('account-alice', 1, cloud.revision, browser);
    expect(localStorage.getItem(key)).toBe(browser);
    expect(screen.getByText('Account Forward')).toBeVisible();
  });

  it('rejects a local change during upload confirmation before sending any write', async () => {
    localStorage.setItem(key, career('Browser Forward'));
    render(view());
    turnOn();
    fireEvent.click(await screen.findByRole('button', { name: 'Save slot 1 to account' }));
    const newer = career('Other Tab Forward');
    localStorage.setItem(key, newer);
    fireEvent.click(dialog(/save slot 1 to your account/i).getByRole('button', { name: 'Save to account' }));
    expect(await screen.findByText(/your browser save changed/i)).toBeVisible();
    expect(mock.write).not.toHaveBeenCalled();
    expect(localStorage.getItem(key)).toBe(newer);
  });

  it('keeps both copies available when another device updates the account revision first', async () => {
    const local = career('Browser Forward');
    const old = remote('Old Account Forward', 'first-revision');
    localStorage.setItem(key, local);
    mock.read.mockResolvedValueOnce([old]).mockResolvedValue([remote('Other Device Forward', 'second-revision')]);
    mock.write.mockResolvedValue('changed');
    render(view());
    turnOn();
    fireEvent.click(await screen.findByRole('button', { name: 'Save slot 1 to account' }));
    fireEvent.click(dialog(/save slot 1 to your account/i).getByRole('button', { name: 'Save to account' }));
    expect(await screen.findByText(/your account save changed/i)).toBeVisible();
    expect(await screen.findByText('Other Device Forward')).toBeVisible();
    expect(screen.getByText('Browser Forward')).toBeVisible();
    expect(mock.write).toHaveBeenCalledExactlyOnceWith('account-alice', 1, old.revision, local);
    expect(localStorage.getItem(key)).toBe(local);
  });

  it('checks the current account revision before applying a download or touching local storage', async () => {
    const local = career('Browser Forward');
    const latest = remote('New Account Forward', 'second-revision');
    localStorage.setItem(key, local);
    mock.read.mockResolvedValueOnce([remote('Old Account Forward', 'first-revision')]).mockResolvedValue([latest]);
    mock.restore.mockImplementation((_key, _expected, raw) => {
      localStorage.setItem(key, raw);
      return 'restored';
    });
    render(view());
    turnOn();
    fireEvent.click(await screen.findByRole('button', { name: 'Use account save in slot 1' }));
    fireEvent.click(dialog(/use the account save in slot 1/i).getByRole('button', { name: 'Use account save' }));
    expect(await screen.findByText(/your account save changed/i)).toBeVisible();
    expect(mock.restore).not.toHaveBeenCalled();
    expect(localStorage.getItem(key)).toBe(local);

    click('Use account save in slot 1');
    const confirmation = dialog(/use the account save in slot 1/i);
    expect(confirmation.getByText(/kept as a recovery copy/i)).toBeVisible();
    expect(confirmation.getByText(/retirement score stays off the public leaderboard/i)).toBeVisible();
    fireEvent.click(confirmation.getByRole('button', { name: 'Use account save' }));
    expect(await screen.findByText('Account save restored in slot 1.')).toBeVisible();
    expect(mock.restore).toHaveBeenCalledExactlyOnceWith(key, local, latest.raw);
  });

  it('drops an in-flight restore when the signed-in account changes', async () => {
    const cloud = remote('Alice Account Forward', 'alice-revision');
    let resolve: (rows: ReturnType<typeof remote>[]) => void;
    mock.read.mockResolvedValueOnce([cloud]).mockReturnValueOnce(new Promise(done => { resolve = done; })).mockResolvedValue([]);
    const mounted = render(view());
    turnOn();
    fireEvent.click(await screen.findByRole('button', { name: 'Use account save in slot 1' }));
    fireEvent.click(dialog(/use the account save in slot 1/i).getByRole('button', { name: 'Use account save' }));
    await waitFor(() => expect(mock.read).toHaveBeenCalledTimes(2));

    mock.userId = 'account-bob';
    mounted.rerender(view());
    expect(screen.queryByText('Alice Account Forward')).toBeNull();
    await act(async () => { resolve([cloud]); });
    expect(mock.read).toHaveBeenLastCalledWith('account-bob');
    expect(mock.restore).not.toHaveBeenCalled();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('removes only the explicitly confirmed account revision and leaves the browser career', async () => {
    const local = career('Browser Forward');
    const cloud = remote('Account Forward', 'cloud-revision');
    localStorage.setItem(key, local);
    mock.read.mockResolvedValueOnce([cloud]).mockResolvedValue([]);
    mock.remove.mockResolvedValue('removed');
    render(view());
    turnOn();
    const opener = await screen.findByRole('button', { name: 'Remove account copy for slot 1' });
    fireEvent.click(opener);
    fireEvent.click(dialog(/remove the account copy for slot 1/i).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(opener).toHaveFocus());
    expect(mock.remove).not.toHaveBeenCalled();
    fireEvent.click(opener);
    fireEvent.click(dialog(/remove the account copy for slot 1/i).getByRole('button', { name: 'Remove account copy' }));
    expect(await screen.findByText('Account copy removed for slot 1.')).toBeVisible();
    expect(mock.remove).toHaveBeenCalledExactlyOnceWith('account-alice', 1, cloud.revision);
    expect(localStorage.getItem(key)).toBe(local);
  });

  it('keeps browser saves available when account saves cannot be loaded', async () => {
    localStorage.setItem(key, career('Browser Forward'));
    mock.read.mockRejectedValue(new Error('Account saves unavailable'));
    render(view());
    turnOn();
    expect(await screen.findByText(/could not load account saves/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Save slot 1 to account' })).toBeNull();
    click('Back to browser saves');
    expect(screen.getByRole('link', { name: 'Resume slot 1' })).toBeVisible();
  });
});
