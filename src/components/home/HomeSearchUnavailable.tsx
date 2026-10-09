import { reloadToRetryChunk } from '@/lib/freshBuild';

export default function HomeSearchUnavailable({ onBack }: { onBack: () => void }) {
  return (
    <section role="alert" data-home-search-unavailable className="rounded-xl border border-border bg-card p-4 text-sm">
      <h2 className="font-semibold">Search could not load</h2>
      <p className="mt-1 text-muted-foreground">Your games are still here. Go back to browse, or reload to try search again.</p>
      <p className="mt-1 text-muted-foreground">If you are offline, reconnect before reloading.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onBack} className="min-h-11 min-w-11 rounded-lg border border-border px-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          Back to games
        </button>
        <button type="button" onClick={() => reloadToRetryChunk()} className="min-h-11 min-w-11 rounded-lg border border-border px-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          Reload page
        </button>
      </div>
    </section>
  );
}
