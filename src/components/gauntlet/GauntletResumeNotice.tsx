export default function GauntletResumeNotice({ onRetry = () => window.location.reload() }: { onRetry?: () => void }) {
  return (
    <div role="status" className="rounded-xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground">
      <p>These offers don’t match your saved Daily. Your picks are still saved.</p>
      <button onClick={onRetry} className="mt-2 min-h-11 rounded-xl border border-border px-4 font-semibold text-foreground">
        Try again
      </button>
    </div>
  );
}
