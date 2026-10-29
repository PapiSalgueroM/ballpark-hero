export default function UsCareerSaveNotice({ operation, onRetry }: {
  operation: 'write' | 'remove'; onRetry: () => void;
}) {
  /* Round 1568 (closing check): it sticks to the top as the page scrolls, and while the site's bar sticks there too
     (data-site-chrome, 44 px at layer 50 since Round 1451) it sticks just under the bar, not under it. Where the
     bar does not stick, it keeps top 0. */
  return (
    <div role="alert" data-us-career-save-error data-save-operation={operation}
      className="sticky top-0 [body:has([data-site-chrome].sticky)_&]:top-11 z-40 mb-3 rounded-xl border border-destructive/50 bg-card p-3 text-xs leading-relaxed">
      <p>{operation === 'remove'
        ? 'Your reset has not been saved. This device may still load the previous career. Stay on this page and retry, or create a new player to replace it.'
        : 'Your latest progress has not been saved. Stay on this page and try again.'}</p>
      <button onClick={onRetry} className="mt-2 min-h-11 min-w-11 rounded-lg border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary">
        Retry save
      </button>
    </div>
  );
}
