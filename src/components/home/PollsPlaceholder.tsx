/**
 * Round 659: the polls section while it is not there yet, the same heading
 * and the same two card boxes the real polls fill. PollOfTheDay shows it
 * while its questions load, and the home page shows it before the poll code
 * itself has been fetched, so the section holds one height from first paint
 * to last and nothing under it ever moves.
 */
export function PollsHeading() {
  return (
    <h2 id="home-polls" className="mb-3 flex items-center gap-2.5 text-lg font-display font-bold text-foreground">
      <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold/15 text-base ring-1 ring-inset ring-gold/30">🗳️</span>
      Polls of the day
    </h2>
  );
}

export function PollSkeleton() {
  return (
    <div aria-hidden="true" data-poll-skeleton="" className="rounded-xl border border-border bg-surface-1 p-4">
      <div className="mb-3 h-5 w-3/4 rounded bg-muted/60" />
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-[42px] rounded-lg bg-surface-2" />)}
      </div>
    </div>
  );
}

export function PollsPlaceholder() {
  return (
    <section aria-labelledby="home-polls" aria-busy="true">
      <PollsHeading />
      <div className="grid gap-3 md:grid-cols-2">
        <PollSkeleton />
        <PollSkeleton />
      </div>
    </section>
  );
}
