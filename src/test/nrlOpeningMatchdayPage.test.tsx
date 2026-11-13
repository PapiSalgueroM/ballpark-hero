import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNrlCareer, createNrlOpeningMatchdayCareer, readNrlCareerSave, type NrlCareerState } from '@/lib/nrlCareer';
import { NRL_OPENING_MATCHDAY_2026 } from '@/data/nrlOpeningMatchday2026';
import { NRL_SAVE_KEY } from '@/lib/nrlManager';
import { createSaveFence, fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

const chunks = vi.hoisted(() => ({ load: vi.fn(), reload: vi.fn(() => false) }));
vi.mock('@/lib/nrlCareer', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/nrlCareer')>(),
  loadNrlOpeningMatchdayCareer: chunks.load,
}));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/freshBuild', () => ({ reloadToRetryChunk: chunks.reload }));

const page = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
const toggle = () => screen.getByRole('checkbox', { name: /2026 opening matchday names/i });
const manage = () => screen.getByRole('button', { name: 'Manage Brisbane Broncos' });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const raw = () => localStorage.getItem(NRL_SAVE_KEY);

beforeEach(() => {
  chunks.load.mockReset();
  chunks.load.mockImplementation(async (clubId: string, seed: number, board: boolean) =>
    createNrlOpeningMatchdayCareer(clubId, seed, NRL_OPENING_MATCHDAY_2026, board));
  chunks.reload.mockClear();
});

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('NRL opening matchday chooser', () => {
  it('loads no names until an opted-in club start and labels the saved mixed roster', async () => {
    page();
    fireEvent.click(toggle());
    click(/2026 17 clubs/);
    expect(toggle()).toBeChecked();
    expect(chunks.load).not.toHaveBeenCalled();
    expect(raw()).toBeNull();
    fireEvent.click(manage());
    await waitFor(() => expect(readNrlCareerSave(raw())?.openingRoster).toBe('matchday-2026'));
    expect(chunks.load).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/2026 opening matchday snapshot/)).toBeVisible();
    click('Squad');
    expect(screen.getByLabelText('Fullback')).toHaveValue('nrl-real-510216');
    expect(screen.getByText(/editable game assignments/i)).toBeVisible();
  });

  it('never loads the named option on generated 2026 or a new 2027 start', () => {
    const first = page();
    fireEvent.click(manage());
    expect(readNrlCareerSave(raw())).not.toHaveProperty('openingRoster');
    first.unmount();
    localStorage.clear();
    page();
    fireEvent.click(toggle());
    click(/2027 Perth Bears/);
    expect(screen.queryByRole('checkbox', { name: /2026 opening matchday names/i })).toBeNull();
    click('Manage Perth Bears');
    expect(readNrlCareerSave(raw())?.season.clubId).toBe('bears');
    expect(readNrlCareerSave(raw())).not.toHaveProperty('openingRoster');
    expect(chunks.load).not.toHaveBeenCalled();
  });

  it('offers confirmed Perth signings only for a new 2027 Perth career and resumes the saved selection', async () => {
    const first = page();
    expect(screen.queryByRole('checkbox', { name: /Perth Bears confirmed signings/i })).toBeNull();
    click(/2027 Perth Bears/);
    const signings = screen.getByRole('checkbox', { name: /Perth Bears confirmed signings/i });
    expect(signings).not.toBeChecked();
    fireEvent.click(signings);
    click('Manage Perth Bears');
    await waitFor(() => expect(readNrlCareerSave(raw())?.openingRoster).toBe('perth-signings-2027'));
    expect(screen.getByText(/2027 Perth Bears signings snapshot/)).toBeVisible();
    click('Squad');
    expect(within(screen.getByLabelText('Halfback')).getByRole('option', { name: /Toby Sexton/ })).toBeInTheDocument();
    const saved = raw();
    first.unmount();
    page();
    expect(screen.getByText(/2027 Perth Bears signings snapshot/)).toBeVisible();
    expect(raw()).toBe(saved);
    expect(chunks.load).not.toHaveBeenCalled();
  });

  it('keeps a different 2027 club generated even with the Perth option selected', () => {
    page();
    click(/2027 Perth Bears/);
    fireEvent.click(screen.getByRole('checkbox', { name: /Perth Bears confirmed signings/i }));
    fireEvent.click(manage());
    expect(readNrlCareerSave(raw())).toEqual(expect.objectContaining({ openingYear: 2027 }));
    expect(readNrlCareerSave(raw())).not.toHaveProperty('openingRoster');
  });

  it('cannot replace a career which another tab writes while the named chunk is loading', async () => {
    let ready: (value: NrlCareerState) => void;
    chunks.load.mockImplementation(() => new Promise(resolve => { ready = resolve; }));
    page();
    fireEvent.click(toggle());
    fireEvent.click(manage());
    await screen.findByText('Loading the 2026 matchday names...');
    expect(manage()).toBeDisabled();
    const other = JSON.stringify(createNrlCareer('storm', 17));
    localStorage.setItem(NRL_SAVE_KEY, other);
    const payload = createNrlOpeningMatchdayCareer('broncos', 16, NRL_OPENING_MATCHDAY_2026);
    await act(async () => { ready(payload); });
    expect(raw()).toBe(other);
    expect(screen.getByRole('button', { name: 'Reload your season' })).toBeVisible();
  });

  it('discards an outstanding roster request when opening Career saves', async () => {
    let ready: (value: NrlCareerState) => void;
    chunks.load.mockImplementation(() => new Promise(resolve => { ready = resolve; }));
    page();
    fireEvent.click(toggle());
    fireEvent.click(manage());
    await screen.findByText('Loading the 2026 matchday names...');
    click('Career saves');
    expect(screen.getByRole('heading', { name: 'Career saves' })).toBeVisible();
    const payload = createNrlOpeningMatchdayCareer('broncos', 16, NRL_OPENING_MATCHDAY_2026);
    await act(async () => { ready(payload); });
    expect(raw()).toBeNull();
  });

  it('discards an outstanding roster request after leaving and reopening the route', async () => {
    let ready: (value: NrlCareerState) => void;
    chunks.load.mockImplementation(() => new Promise(resolve => { ready = resolve; }));
    const first = page();
    fireEvent.click(toggle());
    fireEvent.click(manage());
    await screen.findByText('Loading the 2026 matchday names...');
    first.unmount();
    page();
    expect(toggle()).not.toBeChecked();
    const payload = createNrlOpeningMatchdayCareer('broncos', 16, NRL_OPENING_MATCHDAY_2026);
    await act(async () => { ready(payload); });
    expect(raw()).toBeNull();
    expect(manage()).toBeEnabled();
  });

  it('refuses a late named start when another tab has opened and cleared the empty slot', async () => {
    let ready: (value: NrlCareerState) => void;
    chunks.load.mockImplementation(() => new Promise(resolve => { ready = resolve; }));
    page();
    fireEvent.click(toggle());
    fireEvent.click(manage());
    await screen.findByText('Loading the 2026 matchday names...');
    const other = createSaveFence(localStorage);
    other.adopt(NRL_SAVE_KEY);
    expect(other.write(NRL_SAVE_KEY, () => {
      localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(createNrlCareer('storm', 17)));
      return true;
    })).toBe('written');
    expect(other.write(NRL_SAVE_KEY, () => {
      localStorage.removeItem(NRL_SAVE_KEY);
      return true;
    })).toBe('written');
    const payload = createNrlOpeningMatchdayCareer('broncos', 16, NRL_OPENING_MATCHDAY_2026);
    await act(async () => { ready(payload); });
    expect(raw()).toBeNull();
    expect(localStorage.getItem(fenceKeyOf(NRL_SAVE_KEY))).toBe('2');
    expect(screen.getByRole('button', { name: 'Reload your season' })).toBeVisible();
  });

  it('leaves the slot untouched after a chunk failure and can start generated or request a reload', async () => {
    chunks.load.mockRejectedValue(new TypeError('Failed to fetch dynamically imported module'));
    page();
    fireEvent.click(toggle());
    fireEvent.click(manage());
    await screen.findByText(/Could not load the 2026 matchday names/);
    expect(raw()).toBeNull();
    click('Reload to try names again');
    expect(chunks.reload).toHaveBeenCalledOnce();
    expect(screen.getByText(/Reconnect or finish saving/)).toBeVisible();
    fireEvent.click(toggle());
    fireEvent.click(manage());
    expect(readNrlCareerSave(raw())).not.toHaveProperty('openingRoster');
  });

  it('preserves the opted-in career after quota refusal and uses the existing save retry', async () => {
    const set = Storage.prototype.setItem;
    let blocked = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (name, value) {
      if (name === NRL_SAVE_KEY && blocked) throw new DOMException('Quota full', 'QuotaExceededError');
      set.call(this, name, value);
    });
    page();
    fireEvent.click(toggle());
    fireEvent.click(manage());
    await screen.findByRole('button', { name: 'Retry save' });
    expect(raw()).toBeNull();
    blocked = false;
    click('Retry save');
    expect(readNrlCareerSave(raw())?.openingRoster).toBe('matchday-2026');
    expect(chunks.load).toHaveBeenCalledOnce();
  });
});
