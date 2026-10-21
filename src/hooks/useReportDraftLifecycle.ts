import { useEffect, useRef, useState } from 'react';

type Submission = { revision: number };

export function useReportDraftLifecycle() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const revision = useRef(0);
  const pending = useRef<Submission | null>(null);
  const mounted = useRef(true);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      revision.current += 1;
      if (successTimer.current !== null) clearTimeout(successTimer.current);
      successTimer.current = null;
    };
  }, []);

  const markDraftChanged = () => {
    revision.current += 1;
    if (successTimer.current !== null) clearTimeout(successTimer.current);
    successTimer.current = null;
    setStatus(pending.current ? 'loading' : 'idle');
  };

  const changeOpen = (next: boolean) => {
    if (next === open) return;
    markDraftChanged();
    setOpen(next);
  };

  const beginSubmission = () => {
    if (pending.current) return null;
    const submission = { revision: revision.current };
    pending.current = submission;
    setStatus('loading');
    return submission;
  };

  const settleSubmission = (submission: Submission) => {
    if (pending.current !== submission) return false;
    pending.current = null;
    if (!mounted.current) return false;
    if (revision.current !== submission.revision) {
      setStatus('idle');
      return false;
    }
    return true;
  };

  const completeSubmission = (submission: Submission, resetDraft: () => void) => {
    if (!settleSubmission(submission)) return;
    setStatus('success');
    successTimer.current = setTimeout(() => {
      if (!mounted.current) return;
      if (revision.current !== submission.revision) return;
      successTimer.current = null;
      revision.current += 1;
      setOpen(false);
      setStatus('idle');
      resetDraft();
    }, 1500);
  };

  const failSubmission = (submission: Submission) => {
    if (settleSubmission(submission)) setStatus('error');
  };

  return { open, status, changeOpen, markDraftChanged, beginSubmission, completeSubmission, failSubmission };
}
