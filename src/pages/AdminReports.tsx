import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Loader2, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';
import {
  ALL_GAMES,
  CRITICAL_EXAMPLES,
  FIX_REF_MAX,
  NOTE_MAX,
  REPORT_PRIORITIES,
  REPORT_STATUSES,
  gameCounts,
  hasTriageColumns,
  isClosed,
  matchesGame,
  matchesStatus,
  noteUpdate,
  priorityOf,
  sortForTriage,
  statusCounts,
  statusLabel,
  statusOf,
  statusUpdate,
  type ReportPriority,
  type ReportStatus,
  type StatusFilter,
} from '@/lib/reportTriage';

interface Report {
  id: string;
  game_type: string;
  game_context: Record<string, unknown>;
  description: string;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  /* Round 446: did the relay get a confirmed email delivery for this one?
     null on every row written before that round, which is honest: unknown,
     not false. */
  emailed: boolean | null;
  /* Round 713: the triage columns. Absent until the migration is applied,
     which is why every read goes through statusOf and priorityOf. */
  status?: string | null;
  priority?: string | null;
  admin_note?: string | null;
  fix_ref?: string | null;
}

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

const AdminReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('open');
  const [game, setGame] = useState<string>(ALL_GAMES);
  const [drafts, setDrafts] = useState<Record<string, { note: string; fixRef: string }>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchReports();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/admin/login');
      return;
    }
    const { data: roles } = await supabase
      .from('user_roles' as any)
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin') as any;
    if (!roles?.length) {
      await supabase.auth.signOut();
      navigate('/admin/login');
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('question_reports' as any)
      .select('*')
      .order('created_at', { ascending: false }) as any;
    setLoadError(error ? error.message : null);
    setReports(data || []);
    setLoading(false);
  };

  const withColumns = hasTriageColumns(reports);

  const say = (id: string, text: string) => setMessages((prev) => ({ ...prev, [id]: text }));

  /* One write path for every change. It asks for the row back, because an
     update RLS refuses is not an error to PostgREST, it is zero rows, and a
     screen that said "saved" over zero rows would be lying. */
  const save = async (report: Report, patch: Record<string, unknown>) => {
    say(report.id, 'Saving...');
    const { data, error } = await supabase
      .from('question_reports' as any)
      .update(patch as any)
      .eq('id', report.id)
      .select('id') as any;
    if (error) {
      say(report.id, `Not saved: ${error.message}`);
      return;
    }
    if (!data?.length) {
      say(report.id, 'Not saved: the database took nothing. Are you still signed in as admin?');
      return;
    }
    setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, ...patch } : r)));
    say(report.id, 'Saved');
  };

  const changeStatus = (report: Report, next: ReportStatus) =>
    save(report, statusUpdate(report, next, new Date().toISOString(), withColumns));

  const changePriority = (report: Report, value: string) =>
    save(report, { priority: value || null });

  const draftOf = (report: Report) =>
    drafts[report.id] ?? { note: report.admin_note ?? '', fixRef: report.fix_ref ?? '' };

  const setDraft = (report: Report, next: { note: string; fixRef: string }) =>
    setDrafts((prev) => ({ ...prev, [report.id]: next }));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const counts = statusCounts(reports, game);
  const games = gameCounts(reports);
  const filtered = sortForTriage(reports.filter((r) => matchesGame(r, game) && matchesStatus(r, filter)));
  const critical = reports.filter((r) => priorityOf(r) === 'critical' && !isClosed(statusOf(r))).length;
  const filterLabel = FILTERS.find((f) => f.key === filter)?.label ?? '';

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
        <p className="text-sm text-muted-foreground mb-5" data-testid="triage-summary">
          {counts.open} open{game ? ` for ${game}` : ''}, {critical} critical still open. Critical means {CRITICAL_EXAMPLES}.
        </p>

        {!loading && !withColumns && (
          <div className="mb-5 rounded-lg border border-border bg-secondary/60 p-3 text-sm text-foreground" data-testid="triage-pending">
            The status, priority and note columns are not in the database yet (migration
            20260930_round_713_report_triage.sql). Until it runs, a status saves as open or
            closed only, and priority and notes are switched off.
          </div>
        )}
        {loadError && (
          <div className="mb-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Could not load reports: {loadError}
          </div>
        )}

        {/* Game filter, busiest open queue first */}
        <label className="block mb-3 text-xs font-medium text-muted-foreground">
          Game
          <select
            value={game}
            onChange={(e) => setGame(e.target.value)}
            className="mt-1 block w-full sm:w-80 min-h-[36px] rounded-lg border border-border bg-card px-3 text-sm text-foreground"
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

        {/* Status filter, with a count on every chip */}
        <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f.key}
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

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No {filter === 'all' ? '' : `${filterLabel.toLowerCase()} `}reports{game ? ` for ${game}` : ''}.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((report) => {
              const status = statusOf(report);
              const priority = priorityOf(report);
              const closed = isClosed(status);
              const draft = draftOf(report);
              const message = messages[report.id];
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
                    {statusLabel(status)}
                  </span>
                  {priority && (
                    <span className={cn('text-xs px-2 py-0.5 rounded capitalize', PRIORITY_STYLE[priority])}>
                      {priority}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(report.created_at).toLocaleDateString()} {new Date(report.created_at).toLocaleTimeString()}
                  </span>
                  {/* Round 446: whether this one reached the inbox, which
                      is the half of "where do these go" that nothing used
                      to record. */}
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded",
                      report.emailed === true && "bg-primary/10 text-primary",
                      report.emailed === false && "bg-destructive/10 text-destructive",
                      report.emailed === null && "bg-muted text-muted-foreground",
                    )}
                    title={
                      report.emailed === true ? "The relay confirmed delivery to douknowball1@gmail.com"
                        : report.emailed === false ? "The relay tried and the mail provider did not confirm delivery. The inbox may still need its one time activation."
                        : "Filed before Round 446 started recording delivery, so this is genuinely unknown"
                    }
                  >
                    {report.emailed === true ? "emailed" : report.emailed === false ? "not emailed" : "delivery unknown"}
                  </span>
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
                    the note and the fix reference save together. */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Status
                    <select
                      value={status}
                      onChange={(e) => changeStatus(report, e.target.value as ReportStatus)}
                      className="mt-1 block w-full min-h-[36px] rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                      data-testid="status-select"
                    >
                      {REPORT_STATUSES.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-muted-foreground">
                    Priority
                    <select
                      value={priority ?? ''}
                      disabled={!withColumns}
                      onChange={(e) => changePriority(report, e.target.value)}
                      className="mt-1 block w-full min-h-[36px] rounded-lg border border-border bg-background px-2 text-sm text-foreground disabled:opacity-50"
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
                    className="mt-1 block w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground disabled:opacity-50"
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
                      className="mt-1 block w-full min-h-[36px] rounded-lg border border-border bg-background px-2 text-sm text-foreground disabled:opacity-50"
                      data-testid="fixref-input"
                    />
                  </label>
                  <button
                    onClick={() => save(report, noteUpdate(draft.note, draft.fixRef))}
                    disabled={!withColumns}
                    className="min-h-[36px] px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                    data-testid="note-save"
                  >
                    Save note
                  </button>
                </div>
                {message && (
                  <p
                    className={cn('mt-2 text-xs', message.startsWith('Not saved') ? 'text-destructive' : 'text-muted-foreground')}
                    role="status"
                  >
                    {message}
                  </p>
                )}
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
