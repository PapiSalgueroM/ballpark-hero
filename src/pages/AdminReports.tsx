import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { LogOut, Loader2, Flag } from 'lucide-react';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import {
  ADMIN_ACCESS_RETRY_MESSAGE,
  ALL_GAMES,
  CRITICAL_EXAMPLES,
  FIX_REF_MAX,
  NOTE_MAX,
  REPORT_PRIORITIES,
  REPORT_STATUSES,
  gameCounts,
  hasTriageColumns,
  isClosed,
  linkedReportHash,
  matchesGame,
  matchesStatus,
  noteUpdate,
  priorityOf,
  sortForTriage,
  statusChoices,
  statusCounts,
  statusLabel,
  statusOf,
  statusUpdate,
  type ReportPriority,
  type ReportStatus,
  type StatusFilter,
} from '@/lib/reportTriage';

type Report = Tables<'question_reports'> & {
  // Provider acceptance recorded by the relay. Older and fallback rows may have no result.
  emailed?: boolean | null;
  /* Round 713: the triage columns. Absent until the migration is applied,
     which is why every read goes through statusOf and priorityOf. */
  status?: string | null;
  priority?: string | null;
  admin_note?: string | null;
  fix_ref?: string | null;
};

const SAVE_FIELDS = [
  { key: 'note', label: 'Note' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
] as const;
type SaveField = typeof SAVE_FIELDS[number]['key'];

const FILTERS: ReadonlyArray<{ key: StatusFilter; label: string }> = [
  { key: 'open', label: 'Open' },
  ...REPORT_STATUSES.map((s) => ({ key: s.key as StatusFilter, label: s.label })),
  { key: 'all', label: 'All' },
];

const PRIORITY_STYLE: Record<ReportPriority, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-destructive/15 text-destructive',
  medium: 'bg-primary/10 text-primary',
  low: 'bg-muted text-muted-foreground',
};

const EMAIL_STATES = {
  accepted: {
    option: 'Accepted',
    label: 'Email accepted',
    detail: 'The email provider accepted this report. Inbox delivery remains unverified.',
    className: 'bg-primary/10 text-primary',
  },
  unconfirmed: {
    option: 'Unconfirmed',
    label: 'Email unconfirmed',
    detail: 'Provider acceptance was not recorded for this report.',
    className: 'bg-destructive/10 text-destructive',
  },
  unknown: {
    option: 'Unknown',
    label: 'Email status unknown',
    detail: 'No email result was recorded for this report.',
    className: 'bg-muted text-muted-foreground',
  },
} as const;

const emailStatusOf = (emailed: Report['emailed']) =>
  emailed === true ? 'accepted' : emailed === false ? 'unconfirmed' : 'unknown';

const AdminReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ source: 'access' | 'reports'; message: string } | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('open');
  const [game, setGame] = useState<string>(ALL_GAMES);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [reportType, setReportType] = useState('all');
  const [emailStatusFilter, setEmailStatusFilter] = useState('all');
  const [drafts, setDrafts] = useState<Record<string, { note: string; fixRef: string }>>({});
  const [savingNotes, setSavingNotes] = useState(() => new Set<string>());
  const triageInFlight = useRef(new Set<string>());
  const [savingTriage, setSavingTriage] = useState(() => new Set<string>());
  const [messages, setMessages] = useState<Record<string, Partial<Record<SaveField, string>>>>({});
  const navigate = useNavigate();
  const reportHash = linkedReportHash(useLocation().hash);
  const reportId = reportHash.slice('#report='.length);
  const backToQueueRef = useRef<HTMLAnchorElement>(null);
  const activeFilterRef = useRef<HTMLButtonElement>(null);
  const priorityFilterRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    void fetchReports();
  }, []);

  useEffect(() => {
    if (reportId) backToQueueRef.current?.focus();
  }, [reportId]);

  const checkAuth = async () => {
    const login = { pathname: '/admin/login', hash: reportHash };
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError?.code === 'request_timeout' || isAuthRetryableFetchError(userError)) return 'retry';
    if (!user) {
      navigate(login);
      return 'denied';
    }
    const { data: roles, error: roleError } = await supabase
      .from('user_roles' as any)
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin') as any;
    if (roleError) return 'retry';
    if (!roles?.length) {
      await supabase.auth.signOut();
      navigate(login);
      return 'denied';
    }
    return 'allowed';
  };

  const fetchReports = async () => {
    setLoading(true);
    const access = await checkAuth();
    if (access === 'denied') return;
    if (access === 'retry') {
      setReports([]);
      setLoadError({ source: 'access', message: ADMIN_ACCESS_RETRY_MESSAGE });
      setLoading(false);
      return;
    }
    const { data, error } = await fetchAllRows<Report>((from, to) => supabase
      .from('question_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to));
    setLoadError(error ? {
      source: 'reports',
      message: `Could not load every report. ${typeof error === 'object' && 'message' in error ? String(error.message) : String(error)}`,
    } : null);
    setReports(data);
    setLoading(false);
  };

  const withColumns = hasTriageColumns(reports);
  const accessFailed = loadError?.source === 'access';

  const say = (id: string, field: SaveField, text: string) =>
    setMessages((prev) => ({ ...prev, [id]: { ...prev[id], [field]: text } }));

  /* One write path for every change. It asks for the row back, because an
     update RLS refuses is not an error to PostgREST, it is zero rows, and a
     screen that said "saved" over zero rows would be lying. */
  const save = async (report: Report, field: SaveField, patch: Record<string, unknown>, onSaved?: () => void): Promise<boolean> => {
    say(report.id, field, 'Saving...');
    const { data, error } = await supabase
      .from('question_reports' as any)
      .update(patch as any)
      .eq('id', report.id)
      .select('id') as any;
    if (error) {
      say(report.id, field, `Not saved: ${error.message}`);
      return false;
    }
    if (!data?.length) {
      say(report.id, field, 'Not saved: the database took nothing. Are you still signed in as admin?');
      return false;
    }
    onSaved?.();
    setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, ...patch } : r)));
    say(report.id, field, 'Saved');
    return true;
  };

  const saveTriage = async (report: Report, field: 'status' | 'priority', patch: Record<string, unknown>, onSaved: () => void) => {
    const key = report.id + ':' + field;
    // Hold the field before React rerenders so a second event cannot send another write.
    const pending = triageInFlight.current;
    if (pending.has(key)) return;
    pending.add(key);
    setSavingTriage(new Set(pending));
    try {
      await save(report, field, patch, onSaved);
    } finally {
      pending.delete(key);
      setSavingTriage(new Set(pending));
    }
  };

  const changeStatus = (report: Report, next: ReportStatus, control: HTMLSelectElement) => {
    const patch = statusUpdate(report, next, new Date().toISOString(), withColumns);
    return saveTriage(report, 'status', patch, () => {
      const activeFilter = activeFilterRef.current;
      if (!activeFilter || matchesStatus({ ...report, ...patch }, activeFilter.dataset.filter as StatusFilter)) return;
      toast.success(`Moved to ${statusLabel(next, withColumns)}`);
      if (document.activeElement === control) activeFilter.focus({ preventScroll: true });
    });
  };

  const changePriority = (report: Report, value: string, control: HTMLSelectElement) => {
    const priority = value || null;
    return saveTriage(report, 'priority', { priority }, () => {
      const activeFilter = priorityFilterRef.current;
      if (!activeFilter || activeFilter.value === 'all' || activeFilter.value !== (priorityOf(report) ?? 'unranked')
        || activeFilter.value === (priority ?? 'unranked')) return;
      const label = REPORT_PRIORITIES.find(option => option.key === priority)?.label;
      toast.success(label ? `Priority set to ${label}` : 'Priority cleared');
      if (document.activeElement === control) activeFilter.focus({ preventScroll: true });
    });
  };

  const draftOf = (report: Report) =>
    drafts[report.id] ?? { note: report.admin_note ?? '', fixRef: report.fix_ref ?? '' };

  const setDraft = (report: Report, next: { note: string; fixRef: string }) =>
    setDrafts((prev) => ({ ...prev, [report.id]: next }));

  const saveNote = async (report: Report, draft: { note: string; fixRef: string }) => {
    if (savingNotes.has(report.id)) return;
    const patch = noteUpdate(draft.note, draft.fixRef);
    setSavingNotes((prev) => new Set(prev).add(report.id));
    try {
      if (await save(report, 'note', patch)) {
        setDrafts((prev) => {
          const current = prev[report.id];
          if (current && (current.note !== draft.note || current.fixRef !== draft.fixRef)) return prev;
          return { ...prev, [report.id]: { note: patch.admin_note ?? '', fixRef: patch.fix_ref ?? '' } };
        });
      }
    } finally {
      setSavingNotes((prev) => {
        const next = new Set(prev);
        next.delete(report.id);
        return next;
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const matchingReports = useMemo(() => {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    return reports.filter((report) => {
      if (priorityFilter !== 'all' && (priorityOf(report) ?? 'unranked') !== priorityFilter) return false;
      if (reportType !== 'all' && report.description.startsWith('Idea:') !== (reportType === 'ideas')) return false;
      if (emailStatusFilter !== 'all' && emailStatusOf(report.emailed) !== emailStatusFilter) return false;
      if (words.length === 0) return true;
      const text = [
        report.description, report.game_type, report.id, report.admin_note, report.fix_ref, JSON.stringify(report.game_context),
      ].join(' ').toLowerCase();
      return words.every((word) => text.includes(word));
    });
  }, [reports, search, priorityFilter, reportType, emailStatusFilter]);
  const counts = statusCounts(matchingReports, game);
  const games = useMemo(() => gameCounts(reports), [reports]);
  const filtered = reportId
    ? reports.filter((r) => r.id === reportId)
    : sortForTriage(matchingReports.filter((r) => matchesGame(r, game) && matchesStatus(r, filter)));
  const visibleReportIds = new Set(filtered.map((report) => report.id));
  const hiddenSaveFailures = reports.flatMap((report) => {
    if (visibleReportIds.has(report.id)) return [];
    const failures = SAVE_FIELDS.flatMap(({ key, label }) => {
      const message = messages[report.id]?.[key];
      return message?.startsWith('Not saved') ? [{ label, message }] : [];
    });
    return failures.length ? [{ report, failures }] : [];
  });
  const critical = matchingReports.filter((r) => matchesGame(r, game) && priorityOf(r) === 'critical' && !isClosed(statusOf(r))).length;
  const filterLabel = FILTERS.find((f) => f.key === filter)?.label ?? '';
  const hasRefinement = Boolean(search.trim()) || priorityFilter !== 'all'
    || reportType !== 'all' || emailStatusFilter !== 'all';

  return (
    <>
    {/* Round 198: staff only, never a search result. */}
    <Helmet>
      <title>Bug reports | DoUKnowBall</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <main id="dukb-main" className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            Flagged Reports
          </h1>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-4 min-h-[36px] text-sm rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
        {reportId ? (
          <Link ref={backToQueueRef} to="/admin/reports" className="mb-3 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
            Back to report queue
          </Link>
        ) : !accessFailed && (
          <p className="text-sm text-muted-foreground mb-5" data-testid="triage-summary">
            {counts.open} open{game ? ` for ${game}` : ''}, {critical} critical still open. Critical means {CRITICAL_EXAMPLES}.
          </p>
        )}

        {!loading && !withColumns && !accessFailed && (
          <div className="mb-5 rounded-lg border border-border bg-secondary/60 p-3 text-sm text-foreground" data-testid="triage-pending">
            The status, priority and note columns are not in the database yet (migration
            20260930_round_713_report_triage.sql). Until it runs, the status box offers Open
            and Closed only, because those are the two the database can keep, and priority
            and notes are switched off.
          </div>
        )}
        {!loading && loadError && (
          <div className="mb-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <p role="alert">{loadError.message}</p>
            <button type="button" className="mt-2 min-h-11 rounded-lg bg-secondary px-3 text-foreground" onClick={() => void fetchReports()}>
              {accessFailed ? 'Retry access check' : 'Retry loading reports'}
            </button>
          </div>
        )}

        {!reportId && !accessFailed && <>
        <div className="mb-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="block text-xs font-medium text-muted-foreground">
            Search reports
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Description, game context, note or fix reference"
              className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
            />
          </label>
          <label className="block text-xs font-medium text-muted-foreground">
            Filter by priority
            <select
              ref={priorityFilterRef}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              disabled={!withColumns}
              className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground disabled:opacity-50"
            >
              <option value="all">Any priority</option>
              {REPORT_PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              <option value="unranked">Unranked</option>
            </select>
          </label>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
          {/* Game filter, busiest open queue first */}
          <label className="col-span-2 block min-w-0 text-xs font-medium text-muted-foreground sm:col-span-1">
            Game
            <select
              value={game}
              onChange={(e) => setGame(e.target.value)}
              className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
              data-testid="game-filter"
            >
              <option value={ALL_GAMES}>All games ({reports.length})</option>
              {games.map((g) => (
                <option key={g.game} value={g.game}>
                  {g.game} ({g.open} open of {g.total})
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0 text-xs font-medium text-muted-foreground">
            Report type
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
            >
              <option value="all">All report types</option>
              <option value="ideas">Ideas</option>
              <option value="other">Other reports</option>
            </select>
          </label>
          <label className="block min-w-0 text-xs font-medium text-muted-foreground">
            Email status
            <select
              value={emailStatusFilter}
              onChange={(e) => setEmailStatusFilter(e.target.value)}
              className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
            >
              <option value="all">Any status</option>
              {Object.entries(EMAIL_STATES).map(([key, { option }]) => <option key={key} value={key}>{option}</option>)}
            </select>
          </label>
        </div>

        {/* Status filter, with a count on every chip */}
        <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              ref={filter === f.key ? activeFilterRef : undefined}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              data-filter={f.key}
              className={cn(
                'px-3 min-h-[36px] rounded-full text-sm font-medium transition-all',
                filter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>
        </>}

        {!reportId && !accessFailed && !loading && (
          <div aria-live="polite">
            {hiddenSaveFailures.length > 0 && (
              <section aria-label="Report changes needing retry" className="mb-4 space-y-2">
                {hiddenSaveFailures.map(({ report, failures }) => (
                  <div key={report.id} className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm sm:flex sm:items-center sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <p id={`save-retry-${report.id}`} className="line-clamp-2 break-words font-medium">{report.description}</p>
                      {failures.map(({ label, message }) => (
                        <p key={label} className="break-words text-destructive"><span className="font-medium">{label}</span> · <span>{message}</span></p>
                      ))}
                    </div>
                    <Link
                      to={{ pathname: '/admin/reports', hash: `#report=${report.id}` }}
                      aria-describedby={`save-retry-${report.id}`}
                      className="inline-flex min-h-11 shrink-0 items-center font-medium text-primary hover:underline"
                    >
                      Open report to retry
                    </Link>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : loadError && reports.length === 0 ? null : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {reportId ? (
              <p>{loadError ? 'The linked report may be on a page that did not load.' : 'This report could not be found.'}</p>
            ) : hasRefinement ? (
              <>
                <p>No reports match these filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPriorityFilter('all');
                    setReportType('all');
                    setEmailStatusFilter('all');
                  }}
                  className="mt-2 min-h-11 rounded-lg bg-secondary px-3 text-sm text-foreground"
                >
                  Clear search and refinements
                </button>
              </>
            ) : <>No {filter === 'all' ? '' : `${filterLabel.toLowerCase()} `}reports{game ? ` for ${game}` : ''}.</>}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((report) => {
              const status = statusOf(report);
              const priority = priorityOf(report);
              const email = EMAIL_STATES[emailStatusOf(report.emailed)];
              const closed = isClosed(status);
              const draft = draftOf(report);
              const noteSaving = savingNotes.has(report.id);
              const statusSaving = savingTriage.has(report.id + ':status');
              const prioritySaving = savingTriage.has(report.id + ':priority');
              const unsavedNote = draft.note !== (report.admin_note ?? '') || draft.fixRef !== (report.fix_ref ?? '');
              const savedMessages = messages[report.id];
              const feedback = SAVE_FIELDS.map(({ key, label }) => ({
                label,
                message: key === 'note' && savedMessages?.note === 'Saved' && unsavedNote
                  ? 'Earlier changes saved. You have unsaved edits.' : savedMessages?.[key],
              }));
              return (
              <div
                key={report.id}
                data-report={report.id}
                className={cn(
                  'border rounded-xl p-4 transition-all',
                  closed
                    ? 'bg-card/50 border-border/50 opacity-80'
                    : 'bg-card border-border'
                )}
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {report.game_type}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-secondary text-foreground" data-testid="status-badge">
                    {statusLabel(status, withColumns)}
                  </span>
                  {priority && (
                    <span className={cn('text-xs px-2 py-0.5 rounded capitalize', PRIORITY_STYLE[priority])}>
                      {priority}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(report.created_at).toLocaleDateString()} {new Date(report.created_at).toLocaleTimeString()}
                  </span>
                  <span className={cn('text-xs px-2 py-0.5 rounded', email.className)} title={email.detail}>
                    {email.label}
                  </span>
                  {!reportId && (
                    <Link to={{ pathname: '/admin/reports', hash: `#report=${report.id}` }} className="inline-flex min-h-9 items-center px-1 text-xs font-medium text-primary hover:underline">
                      Open report
                    </Link>
                  )}
                </div>
                <p className="text-sm text-foreground break-words">{report.description}</p>
                {Object.keys(report.game_context || {}).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Game context
                    </summary>
                    <pre className="mt-1 text-xs bg-secondary rounded p-2 overflow-x-auto text-muted-foreground">
                      {JSON.stringify(report.game_context, null, 2)}
                    </pre>
                  </details>
                )}

                {/* Round 713: the workflow. Status and priority save on change;
                    the note and the fix reference save together. Keep pending selects
                    focusable so a filtered save can return focus to its filter. */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Status{statusSaving && <span aria-hidden="true"> · Saving…</span>}
                    <select
                      value={status}
                      aria-disabled={statusSaving || undefined}
                      onChange={(e) => changeStatus(report, e.target.value as ReportStatus, e.currentTarget)}
                      className="mt-1 block w-full min-h-[36px] rounded-lg border border-border bg-background px-2 text-sm text-foreground aria-disabled:opacity-50"
                      data-testid="status-select"
                    >
                      {/* Round 713 fix: before the migration only Open and
                          Closed can be kept, so only those are offered. */}
                      {statusChoices(withColumns).map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-muted-foreground">
                    Priority{prioritySaving && <span aria-hidden="true"> · Saving…</span>}
                    <select
                      value={priority ?? ''}
                      disabled={!withColumns}
                      aria-disabled={prioritySaving || undefined}
                      onChange={(e) => changePriority(report, e.target.value, e.currentTarget)}
                      className="mt-1 block w-full min-h-[36px] rounded-lg border border-border bg-background px-2 text-sm text-foreground disabled:opacity-50 aria-disabled:opacity-50"
                      data-testid="priority-select"
                    >
                      <option value="">Not ranked</option>
                      {REPORT_PRIORITIES.map((p) => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="mt-2 block text-xs font-medium text-muted-foreground">
                  Note
                  <textarea
                    value={draft.note}
                    maxLength={NOTE_MAX}
                    disabled={!withColumns}
                    onChange={(e) => setDraft(report, { ...draft, note: e.target.value })}
                    rows={2}
                    placeholder="What you found, who else hit it, anything worth remembering"
                    className="mt-1 block w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground placeholder:font-normal disabled:opacity-50"
                    data-testid="note-input"
                  />
                </label>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <label className="flex-1 min-w-[10rem] text-xs font-medium text-muted-foreground">
                    Fix reference
                    <input
                      value={draft.fixRef}
                      maxLength={FIX_REF_MAX}
                      disabled={!withColumns}
                      onChange={(e) => setDraft(report, { ...draft, fixRef: e.target.value })}
                      placeholder="Round, commit or PR"
                      className="mt-1 block w-full min-h-[36px] rounded-lg border border-border bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground placeholder:font-normal disabled:opacity-50"
                      data-testid="fixref-input"
                    />
                  </label>
                  <button
                    onClick={() => saveNote(report, draft)}
                    disabled={!withColumns || noteSaving}
                    className="min-h-[36px] px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                    data-testid="note-save"
                  >
                    Save note
                  </button>
                </div>
                {feedback.map(({ label, message }) => message && (
                  <p
                    key={label}
                    className={cn(
                      'mt-2 break-words text-xs',
                      message.startsWith('Not saved') ? 'text-destructive' : 'text-muted-foreground',
                      label !== 'Note' && message === 'Saving...' && 'sr-only',
                    )}
                    role="status"
                    aria-label={`${label} save`}
                  >
                    {label !== 'Note' && <span className="font-medium">{label} · </span>}
                    {message}
                  </p>
                ))}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
    </>
  );
};

export default AdminReports;
