import { useState } from 'react';
import { Bug, Loader2, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

/**
 * Sitewide "Report a bug" (owner Aug 12 2026: "add a button in which people
 * can report bugs or wrong info or whatever"). Lives in the Footer so it is
 * reachable from every page that renders one (home, every GameShell game,
 * profile, and so on).
 *
 * Delivery reuses the exact plumbing ReportQuestion already proved out:
 * report-relay edge function first (stores the report AND emails
 * douknowball1@gmail.com), direct question_reports insert as the fallback so
 * a report is never lost. The current page path rides along in game_context
 * so reports say where they happened without the player typing it.
 */

/* Round 316, his review: "add way more to the report an issue like incorrect
   answer or blah blah blah". Wrong answer gets its own chip because it is the
   report he files most. */
const REPORT_KINDS = [
  'Wrong answer',
  'Bug',
  'Wrong info',
  'Idea',
  'Other',
];

export function ReportSiteIssue() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async () => {
    if (!details.trim() && !kind) return;
    setStatus('loading');
    const description = [kind, details.trim()].filter(Boolean).join(': ');
    const context = {
      path: typeof window !== 'undefined' ? window.location.pathname : '',
      source: 'footer-report-button',
    };
    try {
      let delivered = false;
      try {
        const { data, error: fnError } = await supabase.functions.invoke('report-relay', {
          body: { game_type: 'site', game_context: context, description },
        });
        delivered = !fnError && (data as { ok?: boolean } | null)?.ok !== false;
      } catch {
        delivered = false;
      }
      if (!delivered) {
        const { error } = await supabase.from('question_reports' as any).insert({
          game_type: 'site',
          game_context: context,
          description,
        } as any);
        if (error) throw error;
      }
      setStatus('success');
      setTimeout(() => {
        setOpen(false);
        setStatus('idle');
        setKind('');
        setDetails('');
      }, 1500);
    } catch {
      setStatus('error');
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        /* Round 209: padded so the footer report link is a real target. */
        className="inline-flex items-center gap-1 px-2 py-2 underline transition-colors hover:text-foreground"
        title="Report a bug or wrong info"
      >
        <Bug className="w-3 h-3" />
        Report a bug
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-destructive" />
              Report a bug
            </DialogTitle>
            <DialogDescription>
              Spotted a bug, wrong info, or got an idea? It goes straight to the owner.
            </DialogDescription>
          </DialogHeader>

          {status === 'success' ? (
            <div className="flex flex-col items-center gap-2 py-6 text-correct">
              <CheckCircle className="w-10 h-10" />
              <p className="font-semibold">Got it, thank you!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {REPORT_KINDS.map((k) => (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                      kind === k
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary text-secondary-foreground border-border hover:border-primary/50'
                    )}
                  >
                    {k}
                  </button>
                ))}
              </div>

              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="What happened? Which game, which player, what went wrong..."
                aria-label="Describe the problem"
                rows={3}
                maxLength={500}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />

              {status === 'error' && (
                <p className="text-xs text-destructive">Something went wrong. Try again.</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={(!kind && !details.trim()) || status === 'loading'}
                className={cn(
                  'w-full py-2.5 rounded-xl font-semibold text-sm transition-all inline-flex items-center justify-center gap-2',
                  kind || details.trim()
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'bg-secondary text-muted-foreground cursor-not-allowed opacity-50'
                )}
              >
                {status === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Send report'
                )}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ReportSiteIssue;
