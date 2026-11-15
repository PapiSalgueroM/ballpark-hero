import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import AdminLogin from '@/pages/AdminLogin';
import AdminReports from '@/pages/AdminReports';

const db = vi.hoisted(() => ({
  getUser: vi.fn(),
  getRoles: vi.fn(),
  read: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  write: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: db.getUser, signInWithPassword: db.signIn, signOut: db.signOut },
    from: (table: string) => {
      if (table === 'user_roles') {
        return { select: () => ({ eq: () => ({ eq: db.getRoles }) }) };
      }
      const query = {
        order: () => query,
        range: (from: number, to: number) => db.read(from, to),
        then: (resolve: (page: unknown) => void) => Promise.resolve(db.read(0, 999)).then(resolve),
      };
      return {
        select: () => query,
        update: (patch: Record<string, unknown>) => ({
          eq: (_column: string, id: string) => ({ select: () => db.write(id, patch) }),
        }),
      };
    },
  },
}));

const defaults = {
  created_at: '2026-11-14T08:00:00Z',
  resolved: false,
  resolved_at: null,
  emailed: true,
  status: 'new',
  admin_note: null,
  fix_ref: null,
  game_context: {},
};
const contract = { ...defaults, id: 'club-1', game_type: 'Club Manager', description: 'Players left for free', priority: 'high', admin_note: 'Contract rollover', fix_ref: '#972', game_context: { round: 'Summer' } };
const fixture = { ...defaults, id: 'club-2', game_type: 'Club Manager', description: 'Blank match report', priority: 'critical', game_context: { screen: 'Summer' } };
const scoring = { ...defaults, id: 'career-1', game_type: 'Soccer Career', description: 'Cup scoring is too high', priority: null };
const archive = { ...defaults, id: '12345678-1234-4321-9876-123456789abc', game_type: 'Club Manager', description: 'Archived rollover report', priority: 'high', status: 'fixed', resolved: true };

function serve(rows: unknown[]) {
  db.read.mockImplementation((from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null }));
}

function openQueue(entry = '/admin/reports') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/login" element={<AdminLogin />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe('admin report queue', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    db.getUser.mockResolvedValue({ data: { user: { id: 'fixture-admin' } } });
    db.getRoles.mockResolvedValue({ data: [{ role: 'admin' }] });
    db.signOut.mockResolvedValue({});
    db.write.mockImplementation((id: string) => Promise.resolve({ data: [{ id }], error: null }));
    serve([contract, fixture, scoring, archive]);
  });

  it('combines saved report search, priority, game and status and counts the same queue', async () => {
    openQueue();
    await screen.findByText('Players left for free');
    const search = screen.getByRole('searchbox', { name: 'Search reports' });
    const status = within(screen.getByRole('group', { name: 'Filter by status' }));
    const priority = screen.getByRole('combobox', { name: 'Filter by priority' });

    fireEvent.change(screen.getByRole('combobox', { name: 'Game' }), { target: { value: 'Club Manager' } });
    fireEvent.change(search, { target: { value: '  SUMMER  ' } });
    expect(status.getByRole('button', { name: 'Open (2)' })).toBeVisible();
    fireEvent.change(priority, { target: { value: 'high' } });
    expect(status.getByRole('button', { name: 'Open (1)' })).toBeVisible();
    expect(screen.queryByText('Blank match report')).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: '  ROLLover   #972   summer ' } });
    expect(screen.getByText('Players left for free')).toBeVisible();
    expect(status.getByRole('button', { name: 'All (1)' })).toBeVisible();
    const record = screen.getByText('Players left for free').closest('[data-report]') as HTMLElement;
    fireEvent.change(within(record).getByRole('combobox', { name: 'Status' }), { target: { value: 'fixed' } });
    await waitFor(() => expect(status.getByRole('button', { name: 'Open (0)' })).toBeVisible());
    expect(db.write).toHaveBeenCalledWith('club-1', expect.objectContaining({ status: 'fixed', resolved: true }));
    fireEvent.click(status.getByRole('button', { name: 'Fixed (1)' }));
    expect(screen.getByText('Players left for free')).toBeVisible();
  });

  it('finds an older report beyond the first request and supports unranked reports', async () => {
    const newer = Array.from({ length: 1000 }, (_, i) => ({ ...archive, id: `closed-${i}` }));
    serve([...newer, scoring]);
    openQueue();
    await screen.findByText('Cup scoring is too high');
    expect(db.read.mock.calls).toEqual([[0, 999], [1000, 1999]]);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search reports' }), { target: { value: 'cup scoring' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by priority' }), { target: { value: 'unranked' } });
    expect(screen.getByRole('button', { name: 'All (1)' })).toBeVisible();
    expect(screen.getByText('Cup scoring is too high')).toBeVisible();
  });

  it('identifies a partial queue and can retry the missing page', async () => {
    const newer = Array.from({ length: 1000 }, (_, i) => ({ ...archive, id: `closed-${i}` }));
    db.read.mockImplementation((from: number) => from === 0
      ? { data: newer, error: null }
      : { data: null, error: { message: 'The report service timed out.' } });
    openQueue();
    expect(await screen.findByRole('alert', {}, { timeout: 2500 })).toHaveTextContent('Could not load every report.');
    expect(screen.getByRole('button', { name: 'All (1000)' })).toBeVisible();
    serve([...newer, scoring]);
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading reports' }));
    expect(await screen.findByText('Cup scoring is too high')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('waits for the admin role before reading the report queue', async () => {
    db.getRoles.mockResolvedValue({ data: [] });
    openQueue();
    expect(await screen.findByRole('heading', { name: 'Admin Login' })).toBeVisible();
    expect(db.read).not.toHaveBeenCalled();
    expect(db.signOut).toHaveBeenCalledTimes(1);
  });

  it.each(['identity', 'identity timeout', 'role'])('can retry a temporary %s check on a linked report', async (part) => {
    if (part === 'identity') {
      db.getUser.mockResolvedValueOnce({ data: { user: null }, error: new AuthRetryableFetchError('Unavailable', 503) });
    } else if (part === 'identity timeout') {
      db.getUser.mockResolvedValueOnce({ data: { user: null }, error: new AuthApiError('Timed out', 504, 'request_timeout') });
    } else {
      db.getRoles.mockResolvedValueOnce({ data: null, error: { message: 'Unavailable' } });
    }
    openQueue(`/admin/reports#report=${archive.id}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not verify admin access.');
    expect(db.read).not.toHaveBeenCalled();
    expect(db.signOut).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry access check' }));
    expect(await screen.findByText(archive.description)).toBeVisible();
  });

  it('keeps report data out of view when a retry cannot verify access', async () => {
    const rows = [contract, ...Array.from({ length: 999 }, (_, i) => ({ ...archive, id: `closed-${i}` }))];
    db.read.mockImplementation((from: number) => from === 0
      ? { data: rows, error: null }
      : { data: null, error: { message: 'A report page timed out.' } });
    openQueue();
    expect(await screen.findByText(contract.description, {}, { timeout: 2500 })).toBeVisible();
    const previousReads = db.read.mock.calls.length;
    db.getRoles.mockResolvedValueOnce({ data: null, error: { message: 'Unavailable' } });
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading reports' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not verify admin access.');
    expect(screen.queryByText(contract.description)).not.toBeInTheDocument();
    expect(db.read).toHaveBeenCalledTimes(previousReads);
    expect(db.signOut).not.toHaveBeenCalled();
  });

  it('opens a fixed report directly and keeps it visible when its status changes', async () => {
    openQueue(`/admin/reports#report=${archive.id}`);
    const report = await screen.findByText(archive.description);
    expect(screen.queryByText(contract.description)).not.toBeInTheDocument();
    const card = report.closest('[data-report]') as HTMLElement;
    fireEvent.change(within(card).getByRole('combobox', { name: 'Status' }), { target: { value: 'investigating' } });
    await waitFor(() => expect(db.write).toHaveBeenCalledWith(archive.id, expect.objectContaining({ status: 'investigating' })));
    expect(report).toBeVisible();
    fireEvent.click(screen.getByRole('link', { name: 'Back to report queue' }));
    expect(await screen.findByText(contract.description)).toBeVisible();
  });

  it('offers a report link in the queue', async () => {
    openQueue();
    await screen.findByText(contract.description);
    fireEvent.click(screen.getByRole('button', { name: 'Fixed (1)' }));
    const card = screen.getByText(archive.description).closest('[data-report]') as HTMLElement;
    const link = within(card).getByRole('link', { name: 'Open report' });
    expect(link).toHaveAttribute('href', `/admin/reports#report=${archive.id}`);
    fireEvent.click(link);
    expect(screen.getByRole('link', { name: 'Back to report queue' })).toHaveFocus();
  });

  it('distinguishes a missing linked report', async () => {
    serve([contract]);
    openQueue(`/admin/reports#report=${archive.id}`);
    expect(await screen.findByText('This report could not be found.')).toBeVisible();
  });

  it('ignores a malformed report reference', async () => {
    openQueue('/admin/reports#report=https://example.com');
    expect(await screen.findByText(contract.description)).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Back to report queue' })).not.toBeInTheDocument();
  });

  it('returns to a linked report after admin sign-in without reading it as a guest', async () => {
    db.getUser.mockResolvedValueOnce({ data: { user: null } });
    db.signIn.mockResolvedValue({ error: null });
    openQueue(`/admin/reports#report=${archive.id}`);
    expect(await screen.findByRole('heading', { name: 'Admin Login' })).toBeVisible();
    expect(db.read).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'owner@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'fixture-only' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByText(archive.description)).toBeVisible();
    expect(screen.queryByText(contract.description)).not.toBeInTheDocument();
  });

  it('can retry a failed role check after sign-in without losing the report link', async () => {
    db.signIn.mockResolvedValue({ error: null });
    db.getRoles.mockResolvedValueOnce({ data: null, error: { message: 'Unavailable' } });
    openQueue(`/admin/login#report=${archive.id}`);
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'owner@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'fixture-only' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not verify admin access.');
    expect(db.signOut).not.toHaveBeenCalled();
    expect(db.read).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByText(archive.description)).toBeVisible();
  });
});
