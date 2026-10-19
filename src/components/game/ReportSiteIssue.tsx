import { useRef, useState } from 'react';
import { Bug, Loader2, CheckCircle } from 'lucide-react';
import { REPORT_KINDS_SITEWIDE } from '@/components/game/reportKinds';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { buildReportContext } from '@/lib/reportContext';
import { useReportDraftLifecycle } from '@/hooks/useReportDraftLifecycle';

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

/* Round 446: one shared list, see reportKinds.ts. Round 316 built this
   set for his review; it lives in one place now so the two buttons cannot
   drift apart again. */
const REPORT_KINDS = REPORT_KINDS_SITEWIDE;

export function ReportSiteIssue() {
  // Release BA: a plain button opens the form, so Radix has no trigger to give
  // focus back to on close. Hand it back here.
  const trigger = useRef<HTMLButtonElement>(null);
  const [kind, setKind] = useState('');
  const [details, setDetails] = useState('');
  const { open, status, changeOpen, markDraftChanged, beginSubmission, completeSubmission, failSubmission } = useReportDraftLifecycle();

  const handleSubmit = async () => {
    const text = details.trim();
    if (!text || status === 'loading') return;
    const submission = beginSubmission();
    if (!submission) return;
    const description = [kind, text].filter(Boolean).join(': ');
    const context = buildReportContext({}, 'footer-report-button');
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
      completeSubmission(submission, () => {
        setKind('');
        setDetails('');
      });
    } catch {
      failSubmission(submission);
    }
  };

  return (
    <>
      <button
        ref={trigger}
        onClick={() => changeOpen(true)}
        /* Round 209: padded so the footer report link is a real target. */
        className="inline-flex items-center gap-1 px-2 py-2 underline transition-colors hover:text-foreground"
        title="Report a problem"
      >
        <Bug className="w-3 h-3" />
        Report a problem
      </button>

      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent
          className="max-w-sm"
          onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-destructive" />
              Report a problem
            </DialogTitle>
            <DialogDescription>
              Tell us what you did and what happened. Limited game and browser details are attached to help us reproduce it.
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
                    onClick={() => {
                      if (kind !== k) markDraftChanged();
                      setKind(k);
                    }}
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
                onChange={(e) => {
                  if (details !== e.target.value) markDraftChanged();
                  setDetails(e.target.value);
                }}
                placeholder="What did you do, what happened, and what did you expect?"
                aria-label="Describe the problem"
                required
                rows={3}
                maxLength={500}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />

              {status === 'error' && (
                <p className="text-xs text-destructive">Something went wrong. Try again.</p>
              )}

              <button
                onClick={handleSubmit}
                aria-label="Send report"
                disabled={!details.trim() || status === 'loading'}
                className={cn(
                  'w-full py-2.5 rounded-xl font-semibold text-sm transition-all inline-flex items-center justify-center gap-2',
                  details.trim()
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
