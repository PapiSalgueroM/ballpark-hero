import { useState } from 'react';
import { Flag, Loader2, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { getTodayET } from '@/lib/dateUtils';

interface ReportQuestionProps {
  gameType: string;
  gameContext?: Record<string, unknown>;
}

const REPORT_REASONS = [
  'Wrong answer',
  'Outdated info',
  'Duplicate question',
  'Other',
];

const ReportQuestion = ({ gameType, gameContext = {} }: ReportQuestionProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async () => {
    if (!reason.trim() && !details.trim()) return;
    setStatus('loading');
    try {
      const description = [reason, details].filter(Boolean).join(': ');
      /* Round 390: game_context is the only context an investigation ever
         gets, and most pages send a field or two at best. The route and the
         Eastern date go on every report from here, so a daily can be re-run
         for the day it was reported; a page's own fields come last and win. */
      const context: Record<string, unknown> = {
        path: window.location.pathname,
        date: getTodayET(),
        ...gameContext,
      };
      // Preferred path: the report-relay edge function stores the report AND
      // emails it to the owner's inbox. If the function is unreachable, fall
      // back to the direct table insert so no report is ever lost.
      let delivered = false;
      try {
        const { data, error: fnError } = await supabase.functions.invoke('report-relay', {
          body: { game_type: gameType, game_context: context, description },
        });
        delivered = !fnError && (data as { ok?: boolean } | null)?.ok !== false;
      } catch {
        delivered = false;
      }
      if (!delivered) {
        const { error } = await supabase.from('question_reports' as any).insert({
          game_type: gameType,
          game_context: context,
          description,
        } as any);
        if (error) throw error;
      }
      setStatus('success');
      setTimeout(() => {
        setOpen(false);
        setStatus('idle');
        setReason('');
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
        /* Round 209: py-2, not py-1.5. The sweep measured 28px, two short of
           the 30 a thumb needs, on 63 pages. */
        className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        title="Report an issue"
      >
        <Flag className="w-3 h-3" />
        Report
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-destructive" />
              Report an Issue
            </DialogTitle>
            <DialogDescription>
              Help us fix wrong answers or outdated info.
            </DialogDescription>
          </DialogHeader>

          {status === 'success' ? (
            <div className="flex flex-col items-center gap-2 py-6 text-correct">
              <CheckCircle className="w-10 h-10" />
              <p className="font-semibold">Thanks for reporting!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Reason chips */}
              <div className="flex flex-wrap gap-2">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                      reason === r
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary text-secondary-foreground border-border hover:border-primary/50'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Details */}
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Add more details (optional)..."
                aria-label="Describe what is wrong with this question"
                rows={3}
                maxLength={500}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />

              {status === 'error' && (
                <p className="text-xs text-destructive">Something went wrong. Try again.</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={(!reason && !details.trim()) || status === 'loading'}
                className={cn(
                  'w-full py-2.5 rounded-xl font-semibold text-sm transition-all inline-flex items-center justify-center gap-2',
                  reason || details.trim()
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'bg-secondary text-muted-foreground cursor-not-allowed opacity-50'
                )}
              >
                {status === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Submit Report'
                )}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReportQuestion;
