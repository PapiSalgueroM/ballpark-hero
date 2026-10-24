import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Flag } from 'lucide-react';
import { reloadToRetryChunk } from '@/lib/freshBuild';
import type { ReportQuestionFormProps } from './ReportQuestionForm';

type ReportForm = ComponentType<ReportQuestionFormProps>;

const ReportQuestion = (props: Omit<ReportQuestionFormProps, 'initiallyOpen'>) => {
  const [Form, setForm] = useState<ReportForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState('');
  const pending = useRef<object | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => () => { pending.current = null; }, []);

  const load = () => {
    if (pending.current) return;
    const token = {};
    pending.current = token;
    setLoading(true);
    setFailed('');
    import('./ReportQuestionForm').then(
      module => {
        if (pending.current !== token) return;
        pending.current = null;
        setLoading(false);
        setForm(() => module.default);
      },
      () => {
        if (pending.current !== token) return;
        pending.current = null;
        setLoading(false);
        setFailed('The report form could not load. Refresh the page to try again.');
      },
    );
  };

  const cancel = () => {
    pending.current = null;
    setForm(null);
    setLoading(false);
    setFailed('');
    trigger.current?.focus({ preventScroll: true });
  };

  if (Form) return <Form {...props} initiallyOpen />;

  return (
    <span
      className="inline-flex flex-wrap items-center justify-center gap-2"
      onKeyDown={event => {
        if (event.key === 'Escape' && (loading || failed)) {
          event.preventDefault();
          cancel();
        }
      }}
    >
      <button
        ref={trigger}
        onClick={load}
        aria-busy={loading || undefined}
        /* Round 209: py-2, not py-1.5. The sweep measured 28px, two short of
           the 30 a thumb needs, on 63 pages. */
        className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        title="Report a problem"
      >
        <Flag className="w-3 h-3" />
        Report a problem
      </button>
      {loading && <span role="status">Loading report form...</span>}
      {failed && <span role="alert">{failed}</span>}
      {failed && (
        <button
          type="button"
          onClick={() => {
            if (!reloadToRetryChunk()) {
              setFailed('The page could not refresh. Check your connection and any waiting save, then try again.');
            }
          }}
          className="min-h-11 min-w-11 underline hover:text-foreground"
        >
          Refresh page
        </button>
      )}
      {(loading || failed) && (
        <button type="button" onClick={cancel} className="min-h-11 min-w-11 underline hover:text-foreground">
          Cancel
        </button>
      )}
    </span>
  );
};

export default ReportQuestion;
