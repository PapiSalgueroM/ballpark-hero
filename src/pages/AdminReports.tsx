import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Clock, LogOut, Loader2, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';

interface Report {
  id: string;
  game_type: string;
  game_context: Record<string, unknown>;
  description: string;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

const AdminReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
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
    const { data } = await supabase
      .from('question_reports' as any)
      .select('*')
      .order('created_at', { ascending: false }) as any;
    setReports(data || []);
    setLoading(false);
  };

  const toggleResolved = async (report: Report) => {
    const resolved = !report.resolved;
    await supabase
      .from('question_reports' as any)
      .update({
        resolved,
        resolved_at: resolved ? new Date().toISOString() : null,
      } as any)
      .eq('id', report.id);
    setReports((prev) =>
      prev.map((r) =>
        r.id === report.id
          ? { ...r, resolved, resolved_at: resolved ? new Date().toISOString() : null }
          : r
      )
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const filtered = reports.filter((r) => {
    if (filter === 'open') return !r.resolved;
    if (filter === 'resolved') return r.resolved;
    return true;
  });

  return (
    <>
    {/* Round 198: staff only, never a search result. */}
    <Helmet>
      <title>Bug reports | DoUKnowBall</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <main id="dukb-main" className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            Flagged Reports
          </h1>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['open', 'resolved', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium capitalize transition-all',
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {f} {f === 'open' ? `(${reports.filter((r) => !r.resolved).length})` : f === 'resolved' ? `(${reports.filter((r) => r.resolved).length})` : `(${reports.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No {filter === 'all' ? '' : filter} reports found.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((report) => (
              <div
                key={report.id}
                className={cn(
                  'border rounded-xl p-4 transition-all',
                  report.resolved
                    ? 'bg-card/50 border-border/50 opacity-70'
                    : 'bg-card border-border'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {report.game_type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString()} {new Date(report.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{report.description}</p>
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
                  </div>
                  <button
                    onClick={() => toggleResolved(report)}
                    className={cn(
                      'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      report.resolved
                        ? 'bg-correct/20 text-correct hover:bg-incorrect/20 hover:text-incorrect'
                        : 'bg-secondary text-muted-foreground hover:bg-correct/20 hover:text-correct'
                    )}
                    title={report.resolved ? 'Mark as unresolved' : 'Mark as resolved'}
                  >
                    {report.resolved ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        Resolved
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        Open
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
    </>
  );
};

export default AdminReports;
