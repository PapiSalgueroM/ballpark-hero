import { useRef, useState } from 'react';
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
import { buildReportContext } from '@/lib/reportContext';
import { REPORT_KINDS_QUESTION } from '@/components/game/reportKinds';

interface ReportQuestionProps {
  gameType: string;
  gameContext?: Record<string, unknown>;
  /** Release BA: a page that asks no questions passes REPORT_KINDS_SITEWIDE, so it
   *  offers no Duplicate question chip. Defaults to the per question list. */
  kinds?: readonly string[];
}

/* Round 446: one shared list, see reportKinds.ts for why. */
const REPORT_REASONS = REPORT_KINDS_QUESTION;

const ReportQuestion = ({ gameType, gameContext = {}, kinds = REPORT_REASONS }: ReportQuestionProps) => {
  const [open, setOpen] = useState(false);
  // Release BA: the form opens from a plain button, not a DialogTrigger, so
  // Radix has no trigger to give focus back to on close. Hand it back here.
  const trigger = useRef<HTMLButtonElement>(null);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async () => {
    const text = details.trim();
    if (!text || status === 'loading') return;
    setStatus('loading');
    try {
      const description = [reason, text].filter(Boolean).join(': ');
      const context = buildReportContext(gameContext);
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
        ref={trigger}
        onClick={() => setOpen(true)}
        /* Round 209: py-2, not py-1.5. The sweep measured 28px, two short of
           the 30 a thumb needs, on 63 pages. */
        className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        title="Report a problem"
      >
        <Flag className="w-3 h-3" />
        Report a problem
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-sm"
          onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-destructive" />
              Report a problem
            </DialogTitle>
            <DialogDescription>
              Tell us what you did and what happened. Limited game and browser details are attached to help us reproduce it.
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
                {kinds.map((r) => (
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
