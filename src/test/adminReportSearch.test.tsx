import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { Toaster } from 'sonner';
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
        <Toaster />
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

  it('combines report type and email status with search and the active queue', async () => {
    const acceptedIdea = { ...contract, id: 'idea-accepted', description: 'Idea: Add cup fixtures' };
    const pendingIdea = { ...contract, id: 'idea-pending', description: 'Idea: Add cup tables', emailed: false };
    const pendingBug = { ...contract, id: 'bug-pending', description: 'Bug: Idea: panel will not open', emailed: false };
    const fixedIdea = { ...archive, description: 'Idea: Add a cup history tab' };
    serve([contract, acceptedIdea, pendingIdea, pendingBug, fixedIdea, scoring]);
    openQueue();
    await screen.findByText(acceptedIdea.description);
    const game = screen.getByRole('combobox', { name: 'Game' });
    const type = screen.getByRole('combobox', { name: 'Report type' });
    const email = screen.getByRole('combobox', { name: 'Email status' });
    const priority = screen.getByRole('combobox', { name: 'Filter by priority' });
    const search = screen.getByRole('searchbox', { name: 'Search reports' });
    const status = within(screen.getByRole('group', { name: 'Filter by status' }));

    fireEvent.change(game, { target: { value: 'Club Manager' } });
    fireEvent.change(type, { target: { value: 'ideas' } });
    expect(status.getByRole('button', { name: 'Open (2)' })).toBeVisible();
    expect(status.getByRole('button', { name: 'Fixed (1)' })).toBeVisible();
    expect(screen.queryByText(pendingBug.description)).not.toBeInTheDocument();
    fireEvent.change(email, { target: { value: 'unconfirmed' } });
    fireEvent.change(priority, { target: { value: 'high' } });
    fireEvent.change(search, { target: { value: 'cup tables' } });
    expect(screen.getByText(pendingIdea.description)).toBeVisible();
    expect(screen.queryByText(acceptedIdea.description)).not.toBeInTheDocument();
    expect(status.getByRole('button', { name: 'All (1)' })).toBeVisible();

    fireEvent.change(email, { target: { value: 'unknown' } });
    expect(screen.getByText('No reports match these filters.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search and refinements' }));
    expect(game).toHaveValue('Club Manager');
    expect(type).toHaveValue('all');
    expect(email).toHaveValue('all');
    expect(priority).toHaveValue('all');
    expect(search).toHaveValue('');
    expect(status.getByRole('button', { name: 'Open (4)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText(scoring.description)).not.toBeInTheDocument();

    fireEvent.change(type, { target: { value: 'other' } });
    fireEvent.change(email, { target: { value: 'unconfirmed' } });
    expect(screen.getByText(pendingBug.description)).toBeVisible();
    expect(screen.queryByText(pendingIdea.description)).not.toBeInTheDocument();
  });

  it('distinguishes provider acceptance, unconfirmed email and unknown results', async () => {
    const unconfirmed = { ...fixture, emailed: false };
    const unknown = { ...scoring, emailed: null };
    const missing = { ...scoring, id: 'missing', description: 'Old report', emailed: undefined };
    serve([contract, unconfirmed, unknown, missing]);
    openQueue();
    await screen.findByText(contract.description);
    const label = (description: string, text: string) => within(
      screen.getByText(description).closest('[data-report]') as HTMLElement,
    ).getByText(text);
    expect(label(contract.description, 'Email accepted'))
      .toHaveAttribute('title', expect.stringMatching(/inbox delivery remains unverified/i));
    expect(label(unconfirmed.description, 'Email unconfirmed'))
      .toHaveAttribute('title', expect.stringMatching(/provider acceptance was not recorded/i));
    expect(label(unknown.description, 'Email status unknown')).toBeVisible();
    expect(label(missing.description, 'Email status unknown')).toBeVisible();

    const email = screen.getByRole('combobox', { name: 'Email status' });
    fireEvent.change(email, { target: { value: 'unknown' } });
    expect(screen.getByText(unknown.description)).toBeVisible();
    expect(screen.getByText(missing.description)).toBeVisible();
    expect(screen.queryByText(unconfirmed.description)).not.toBeInTheDocument();
    fireEvent.change(email, { target: { value: 'accepted' } });
    expect(screen.getByText(contract.description)).toBeVisible();
    expect(screen.queryByText(unknown.description)).not.toBeInTheDocument();
  });

  it('confirms a status move after the report leaves the queue and keeps keyboard focus', async () => {
    openQueue();
    const report = await screen.findByText(contract.description);
    const select = within(report.closest('[data-report]') as HTMLElement).getByRole('combobox', { name: 'Status' });
    select.focus();
    fireEvent.change(select, { target: { value: 'fixed' } });
    await waitFor(() => expect(screen.queryByText(contract.description)).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Open (2)' })).toHaveFocus();
    expect(await screen.findByText('Moved to Fixed')).toBeVisible();
  });

  it('respects focus moved to another control while a status change saves', async () => {
    let release: () => void = () => {};
    db.write.mockImplementationOnce((id: string) => new Promise(resolve => {
      release = () => resolve({ data: [{ id }], error: null });
    }));
    openQueue();
    const report = await screen.findByText(contract.description);
    const select = within(report.closest('[data-report]') as HTMLElement).getByRole('combobox', { name: 'Status' });
    select.focus();
    fireEvent.change(select, { target: { value: 'fixed' } });
    const search = screen.getByRole('searchbox', { name: 'Search reports' });
    search.focus();
    await act(async () => release());
    expect(screen.queryByText(contract.description)).not.toBeInTheDocument();
    expect(search).toHaveFocus();
  });

  it('confirms a priority change after the report leaves the active priority filter', async () => {
    openQueue();
    const report = await screen.findByText(contract.description);
    const filter = screen.getByRole('combobox', { name: 'Filter by priority' });
    fireEvent.change(filter, { target: { value: 'high' } });
    const select = within(report.closest('[data-report]') as HTMLElement).getByRole('combobox', { name: 'Priority' });
    select.focus();
    fireEvent.change(select, { target: { value: 'critical' } });

    await waitFor(() => expect(screen.queryByText(contract.description)).not.toBeInTheDocument());
    expect(filter).toHaveFocus();
    expect(await screen.findByText('Priority set to Critical')).toBeVisible();
    expect(db.write).toHaveBeenCalledWith(contract.id, { priority: 'critical' });
    fireEvent.change(filter, { target: { value: 'critical' } });
    expect(within(screen.getByText(contract.description).closest('[data-report]') as HTMLElement)
      .getByRole('combobox', { name: 'Priority' })).toHaveValue('critical');
  });

  it('keeps focus where the reviewer moved it while a priority change saves', async () => {
    let release: () => void = () => {};
    db.write.mockImplementationOnce((id: string) => new Promise(resolve => {
      release = () => resolve({ data: [{ id }], error: null });
    }));
    openQueue();
    const report = await screen.findByText(contract.description);
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by priority' }), { target: { value: 'high' } });
    const select = within(report.closest('[data-report]') as HTMLElement).getByRole('combobox', { name: 'Priority' });
    select.focus();
    fireEvent.change(select, { target: { value: '' } });
    const search = screen.getByRole('searchbox', { name: 'Search reports' });
    search.focus();
    await act(async () => release());

    expect(screen.queryByText(contract.description)).not.toBeInTheDocument();
    expect(search).toHaveFocus();
    expect(await screen.findByText('Priority cleared')).toBeVisible();
  });

  it.each([
    { field: 'status' as const, label: 'Status', first: 'investigating', second: 'confirmed' },
    { field: 'priority' as const, label: 'Priority', first: 'medium', second: 'low' },
  ])('blocks an overlapping $field change and reopens after the save', async ({ field, label, first, second }) => {
    let durable = { ...contract };
    const commits: Array<() => void> = [];
    db.read.mockImplementation(() => ({ data: [durable], error: null }));
    db.write.mockImplementation((id: string, patch: Record<string, unknown>) => new Promise(resolve => {
      commits.push(() => {
        durable = { ...durable, ...patch };
        resolve({ data: [{ id }], error: null });
      });
    }));

    const view = openQueue();
    const card = within((await screen.findByText(contract.description)).closest('[data-report]') as HTMLElement);
    const control = card.getByRole('combobox', { name: label });
    control.focus();
    fireEvent.change(control, { target: { value: first } });
    fireEvent.change(control, { target: { value: second } });

    expect(commits).toHaveLength(1);
    expect(control).toHaveAttribute('aria-disabled', 'true');
    expect(control).toHaveFocus();
    expect(card.getByText(/Saving…/)).toBeVisible();
    expect(durable[field]).toBe(contract[field]);

    await act(async () => commits[0]());
    expect(control).toHaveValue(first);
    expect(control).not.toHaveAttribute('aria-disabled', 'true');
    fireEvent.change(control, { target: { value: second } });
    expect(commits).toHaveLength(2);
    await act(async () => commits[1]());
    expect(control).toHaveValue(second);
    expect(durable[field]).toBe(second);

    view.unmount();
    openQueue();
    const reloaded = within((await screen.findByText(contract.description)).closest('[data-report]') as HTMLElement);
    expect(reloaded.getByRole('combobox', { name: label })).toHaveValue(second);
  });

  it('keeps the other field, other reports and note drafts available during a status save', async () => {
    let resolveStatus: () => void = () => {};
    db.write.mockImplementationOnce((id: string) => new Promise(resolve => {
      resolveStatus = () => resolve({ data: [{ id }], error: null });
    }));
    openQueue();
    const card = within((await screen.findByText(contract.description)).closest('[data-report]') as HTMLElement);
    const other = within(screen.getByText(fixture.description).closest('[data-report]') as HTMLElement);
    const status = card.getByRole('combobox', { name: 'Status' });
    const priority = card.getByRole('combobox', { name: 'Priority' });
    const otherStatus = other.getByRole('combobox', { name: 'Status' });
    const note = card.getByRole('textbox', { name: 'Note' });

    fireEvent.change(status, { target: { value: 'investigating' } });
    fireEvent.change(priority, { target: { value: 'low' } });
    fireEvent.change(otherStatus, { target: { value: 'confirmed' } });
    fireEvent.change(note, { target: { value: 'Draft during triage' } });
    fireEvent.click(card.getByRole('button', { name: 'Save note' }));

    await waitFor(() => expect(priority).toHaveValue('low'));
    expect(otherStatus).toHaveValue('confirmed');
    expect(note).toHaveValue('Draft during triage');
    expect(status).toHaveAttribute('aria-disabled', 'true');
    expect(card.getByText(/Saving…/)).toBeVisible();
    expect(db.write).toHaveBeenNthCalledWith(2, contract.id, { priority: 'low' });
    expect(db.write).toHaveBeenNthCalledWith(3, fixture.id, { status: 'confirmed', resolved: false, resolved_at: null });
    expect(db.write).toHaveBeenNthCalledWith(4, contract.id, { admin_note: 'Draft during triage', fix_ref: '#972' });

    await act(async () => resolveStatus());
    expect(status).toHaveValue('investigating');
    expect(priority).toHaveValue('low');
    expect(note).toHaveValue('Draft during triage');
  });

  it.each([
    { field: 'status' as const, label: 'Status', next: 'investigating', failed: 'note' },
    { field: 'priority' as const, label: 'Priority', next: 'low', failed: 'note' },
    { field: 'status' as const, label: 'Status', next: 'investigating', failed: 'triage' },
    { field: 'priority' as const, label: 'Priority', next: 'low', failed: 'triage' },
  ])('preserves $failed save feedback when a note and $field save overlap', async ({ field, label, next, failed }) => {
    type WriteResult = { data: { id: string }[] | null; error: { message: string } | null };
    let settleNote: (result: WriteResult) => void = () => {};
    let settleTriage: (result: WriteResult) => void = () => {};
    db.write
      .mockImplementationOnce(() => new Promise<WriteResult>(resolve => { settleNote = resolve; }))
      .mockImplementationOnce(() => new Promise<WriteResult>(resolve => { settleTriage = resolve; }));
    openQueue();
    const card = within((await screen.findByText(contract.description)).closest('[data-report]') as HTMLElement);
    const note = card.getByRole('textbox', { name: 'Note' });
    const save = card.getByRole('button', { name: 'Save note' });
    const triage = card.getByRole('combobox', { name: label });
    const notePatch = { admin_note: 'An investigation note', fix_ref: '#972' };
    const triagePatch = field === 'status' ? { status: next, resolved: false, resolved_at: null } : { priority: next };

    fireEvent.change(note, { target: { value: notePatch.admin_note } });
    fireEvent.click(save);
    fireEvent.change(triage, { target: { value: next } });
    expect(db.write.mock.calls).toEqual([[contract.id, notePatch], [contract.id, triagePatch]]);
    expect(save).toBeDisabled();
    expect(triage).toHaveAttribute('aria-disabled', 'true');

    const failure = { data: null, error: { message: 'Write unavailable' } };
    const success = { data: [{ id: contract.id }], error: null };
    await act(async () => (failed === 'note' ? settleNote : settleTriage)(failure));
    const errorText = 'Not saved: Write unavailable';
    const errorWhilePending = Boolean(card.queryByText(errorText));
    await act(async () => (failed === 'note' ? settleTriage : settleNote)(success));

    expect(card.getByText(errorText)).toBeVisible();
    expect(errorWhilePending).toBe(true);
    expect(note).toHaveValue(notePatch.admin_note);
    expect(save).toBeEnabled();
    expect(triage).not.toHaveAttribute('aria-disabled', 'true');
    expect(triage).toHaveValue(failed === 'note' ? next : contract[field]);
    if (failed === 'note') fireEvent.click(save);
    else fireEvent.change(triage, { target: { value: next } });
    await waitFor(() => {
      expect(save).toBeEnabled();
      expect(triage).toHaveValue(next);
      expect(card.queryByText(errorText)).not.toBeInTheDocument();
    });
    expect(db.write.mock.calls).toEqual([
      [contract.id, notePatch], [contract.id, triagePatch], [contract.id, failed === 'note' ? notePatch : triagePatch],
    ]);
  });

  it.each([
    { reason: 'zero rows', response: { data: [], error: null } },
    { reason: 'a write error', response: { data: null, error: { message: 'Unavailable' } } },
  ])('reopens a priority change after $reason', async ({ response }) => {
    db.write.mockResolvedValueOnce(response);
    openQueue();
    const card = within((await screen.findByText(contract.description)).closest('[data-report]') as HTMLElement);
    const priority = card.getByRole('combobox', { name: 'Priority' });
    fireEvent.change(priority, { target: { value: 'low' } });
    expect(priority).toHaveAttribute('aria-disabled', 'true');
    await waitFor(() => expect(card.getByRole('status')).toHaveTextContent('Not saved'));

    expect(priority).toHaveValue('high');
    expect(priority).not.toHaveAttribute('aria-disabled', 'true');
    fireEvent.change(priority, { target: { value: 'low' } });
    await waitFor(() => expect(priority).toHaveValue('low'));
    expect(db.write.mock.calls).toEqual([[contract.id, { priority: 'low' }], [contract.id, { priority: 'low' }]]);
  });
  it.each([
    { field: 'status', triageFirst: true },
    { field: 'status', triageFirst: false },
    { field: 'priority', triageFirst: true },
    { field: 'priority', triageFirst: false },
  ] as const)('keeps a failed note reachable when $field hides the report (triage first: $triageFirst)', async ({ field, triageFirst }) => {
    const report = { ...contract, id: 'aaaaaaaa-1234-4321-9876-123456789abc' };
    serve([report]);
    type WriteResult = { data: { id: string }[] | null; error: { message: string } | null };
    let settleNote: (result: WriteResult) => void = () => {};
    let settleTriage: (result: WriteResult) => void = () => {};
    db.write
      .mockImplementationOnce(() => new Promise<WriteResult>(resolve => { settleNote = resolve; }))
      .mockImplementationOnce(() => new Promise<WriteResult>(resolve => { settleTriage = resolve; }));

    openQueue();
    const card = within((await screen.findByText(report.description)).closest('[data-report]') as HTMLElement);
    const select = card.getByRole('combobox', { name: field === 'status' ? 'Status' : 'Priority' });
    const priorityFilter = screen.getByRole('combobox', { name: 'Filter by priority' });
    if (field === 'priority') fireEvent.change(priorityFilter, { target: { value: 'high' } });

    const notePatch = { admin_note: 'Follow up with the roster owner', fix_ref: '#999' };
    fireEvent.change(card.getByRole('textbox', { name: 'Note' }), { target: { value: notePatch.admin_note } });
    fireEvent.change(card.getByRole('textbox', { name: 'Fix reference' }), { target: { value: notePatch.fix_ref } });
    fireEvent.click(card.getByRole('button', { name: 'Save note' }));
    select.focus();
    fireEvent.change(select, { target: { value: field === 'status' ? 'fixed' : 'low' } });

    const failed = { data: null, error: { message: 'Note temporarily unavailable' } };
    const saved = { data: [{ id: report.id }], error: null };
    const errorText = 'Not saved: Note temporarily unavailable';
    const receiptRegion = () => screen.queryByRole('region', { name: 'Report changes needing retry' });
    if (!triageFirst) {
      await act(async () => settleNote(failed));
      expect(card.getByText(errorText)).toBeVisible();
      expect(receiptRegion()).not.toBeInTheDocument();
    }

    await act(async () => settleTriage(saved));
    expect(await screen.findByText(field === 'status' ? 'Moved to Fixed' : 'Priority set to Low')).toBeVisible();
    expect(screen.queryByTestId('note-input')).not.toBeInTheDocument();
    expect(field === 'status' ? screen.getByRole('button', { name: 'Open (0)' }) : priorityFilter).toHaveFocus();
    if (triageFirst) {
      expect(receiptRegion()).not.toBeInTheDocument();
      await act(async () => settleNote(failed));
    }

    const notice = receiptRegion();
    expect(notice).toBeInTheDocument();
    const retryLink = within(notice!).getByRole('link', { name: 'Open report to retry' });
    expect(within(notice!).getByText(errorText)).toBeVisible();
    expect(retryLink).toHaveAttribute('href', `/admin/reports#report=${report.id}`);
    fireEvent.click(retryLink);
    const back = await screen.findByRole('link', { name: 'Back to report queue' });
    expect(back).toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'Note' })).toHaveValue(notePatch.admin_note);
    expect(screen.getByRole('textbox', { name: 'Fix reference' })).toHaveValue(notePatch.fix_ref);
    expect(screen.getByText(errorText)).toBeVisible();
    expect(db.write).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    await waitFor(() => expect(screen.getByRole('status', { name: 'Note save' })).toHaveTextContent(/^Saved$/));
    expect(db.write.mock.calls).toEqual([
      [report.id, notePatch],
      [report.id, field === 'status' ? { status: 'fixed', resolved: true, resolved_at: expect.any(String) } : { priority: 'low' }],
      [report.id, notePatch],
    ]);

    fireEvent.click(back);
    expect(await screen.findByRole('searchbox', { name: 'Search reports' })).toBeVisible();
    expect(receiptRegion()).not.toBeInTheDocument();
    expect(screen.queryByTestId('note-input')).not.toBeInTheDocument();
    if (field === 'status') expect(screen.getByRole('button', { name: 'Open (0)' })).toHaveAttribute('aria-pressed', 'true');
    else expect(screen.getByRole('combobox', { name: 'Filter by priority' })).toHaveValue('high');
  });

  it.each([
    { hiddenBy: 'Status', failureFirst: false },
    { hiddenBy: 'Priority', failureFirst: true },
  ])('keeps the failed triage field reachable when $hiddenBy hides the report', async ({ hiddenBy, failureFirst }) => {
    const report = { ...contract, id: 'aaaaaaaa-1234-4321-9876-123456789abc' };
    const failedField = hiddenBy === 'Status' ? 'Priority' : 'Status';
    const statusPatch = { status: 'fixed', resolved: true, resolved_at: expect.any(String) };
    const priorityPatch = { priority: 'low' };
    type WriteResult = { data: { id: string }[] | null; error: { message: string } | null };
    let settleStatus: (result: WriteResult) => void = () => {};
    let settlePriority: (result: WriteResult) => void = () => {};
    db.write
      .mockImplementationOnce(() => new Promise<WriteResult>(resolve => { settleStatus = resolve; }))
      .mockImplementationOnce(() => new Promise<WriteResult>(resolve => { settlePriority = resolve; }));
    serve([report]);
    openQueue();
    await screen.findByText(report.description);
    if (hiddenBy === 'Priority') {
      fireEvent.change(screen.getByRole('combobox', { name: 'Filter by priority' }), { target: { value: 'high' } });
    }
    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'fixed' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Priority' }), { target: { value: 'low' } });

    const settleHidden = hiddenBy === 'Status' ? settleStatus : settlePriority;
    const settleFailed = hiddenBy === 'Status' ? settlePriority : settleStatus;
    const hide = () => settleHidden({ data: [{ id: report.id }], error: null });
    const fail = () => settleFailed({ data: null, error: { message: 'Triage temporarily unavailable' } });
    if (failureFirst) await act(async () => fail());
    await act(async () => hide());
    expect(screen.queryByTestId('status-select')).not.toBeInTheDocument();
    if (!failureFirst) await act(async () => fail());

    const notice = await screen.findByRole('region', { name: 'Report changes needing retry' });
    expect(within(notice).getByText(failedField)).toBeVisible();
    expect(within(notice).getByText('Not saved: Triage temporarily unavailable')).toBeVisible();
    fireEvent.click(within(notice).getByRole('link', { name: 'Open report to retry' }));
    const field = screen.getByRole('combobox', { name: failedField });
    const value = failedField === 'Status' ? 'fixed' : 'low';
    expect(field).toHaveValue(failedField === 'Status' ? 'new' : 'high');
    fireEvent.change(field, { target: { value } });
    await waitFor(() => expect(field).toHaveValue(value));
    expect(db.write.mock.calls).toEqual([
      [report.id, statusPatch], [report.id, priorityPatch], [report.id, failedField === 'Status' ? statusPatch : priorityPatch],
    ]);
    fireEvent.click(screen.getByRole('link', { name: 'Back to report queue' }));
    expect(screen.queryByRole('region', { name: 'Report changes needing retry' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('status-select')).not.toBeInTheDocument();
  });

  it('keeps newer note and fix-reference drafts while an earlier save completes', async () => {
    let release: () => void = () => {};
    db.write.mockImplementationOnce((id: string) => new Promise(resolve => {
      release = () => resolve({ data: [{ id }], error: null });
    }));
    openQueue();
    const report = await screen.findByText(contract.description);
    const card = within(report.closest('[data-report]') as HTMLElement);
    const note = card.getByRole('textbox', { name: 'Note' });
    const reference = card.getByRole('textbox', { name: 'Fix reference' });
    const save = card.getByRole('button', { name: 'Save note' });
    fireEvent.change(note, { target: { value: '  First draft  ' } });
    fireEvent.change(reference, { target: { value: '  #978  ' } });
    fireEvent.click(save);
    expect(card.getByRole('status')).toHaveTextContent('Saving...');
    expect(save).toBeDisabled();
    expect(db.write).toHaveBeenNthCalledWith(1, contract.id, { admin_note: 'First draft', fix_ref: '#978' });

    fireEvent.change(note, { target: { value: '  Latest draft  ' } });
    fireEvent.change(reference, { target: { value: '  #979  ' } });
    await act(async () => release());
    expect(note).toHaveValue('  Latest draft  ');
    expect(reference).toHaveValue('  #979  ');
    expect(card.getByRole('status')).toHaveTextContent('unsaved edits');
    expect(save).toBeEnabled();

    fireEvent.click(save);
    expect(db.write).toHaveBeenNthCalledWith(2, contract.id, { admin_note: 'Latest draft', fix_ref: '#979' });
    await waitFor(() => expect(note).toHaveValue('Latest draft'));
    expect(reference).toHaveValue('#979');
    expect(card.getByRole('status')).toHaveTextContent(/^Saved$/);
  });

  it('keeps a refused note available for retry', async () => {
    db.write.mockResolvedValueOnce({ data: [], error: null });
    openQueue();
    const report = await screen.findByText(contract.description);
    const card = within(report.closest('[data-report]') as HTMLElement);
    const note = card.getByRole('textbox', { name: 'Note' });
    const save = card.getByRole('button', { name: 'Save note' });
    fireEvent.change(note, { target: { value: '  Keep this draft  ' } });
    fireEvent.click(save);
    await waitFor(() => expect(card.getByRole('status')).toHaveTextContent('Not saved'));
    expect(save).toBeEnabled();
    expect(note).toHaveValue('  Keep this draft  ');

    fireEvent.click(save);
    await waitFor(() => expect(note).toHaveValue('Keep this draft'));
    expect(db.write).toHaveBeenCalledTimes(2);
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
