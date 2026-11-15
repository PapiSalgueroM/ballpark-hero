import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminReports from '@/pages/AdminReports';

const db = vi.hoisted(() => ({
  getUser: vi.fn(),
  getRoles: vi.fn(),
  read: vi.fn(),
  signOut: vi.fn(),
  write: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: db.getUser, signOut: db.signOut },
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
const archive = { ...defaults, id: 'club-3', game_type: 'Club Manager', description: 'Archived rollover report', priority: 'high', status: 'fixed', resolved: true };

function serve(rows: unknown[]) {
  db.read.mockImplementation((from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null }));
}

function openQueue() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/admin/reports']}>
        <Routes>
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/login" element={<h1>Admin sign in</h1>} />
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
    expect(await screen.findByRole('heading', { name: 'Admin sign in' })).toBeVisible();
    expect(db.read).not.toHaveBeenCalled();
  });
});
