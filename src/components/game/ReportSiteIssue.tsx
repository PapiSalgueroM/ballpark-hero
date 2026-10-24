import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Bug } from 'lucide-react';
import { reloadToRetryChunk } from '@/lib/freshBuild';

type ReportForm = ComponentType<{ initiallyOpen?: boolean }>;

export function ReportSiteIssue() {
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
    import('./ReportSiteIssueForm').then(
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

  if (Form) return <Form initiallyOpen />;

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
        /* Round 209: padded so the footer report link is a real target. */
        className="inline-flex items-center gap-1 px-2 py-2 underline transition-colors hover:text-foreground"
        title="Report a problem"
      >
        <Bug className="w-3 h-3" />
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
}

export default ReportSiteIssue;
