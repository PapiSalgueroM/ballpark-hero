import { readUsSeasonRating, type UsSeasonRating } from '@/lib/usInSeasonRating';

export default function SeasonRating({ rating }: { rating?: UsSeasonRating }) {
  const saved = readUsSeasonRating(rating);
  if (!saved) return null;

  return (
    <section data-us-season-rating aria-label="Rating through the season" className="mt-3 rounded-xl border border-border bg-background p-3 text-left">
      <h3 className="text-sm font-bold">Rating through the season</h3>
      <p className="mt-1 text-xs text-muted-foreground">Your overall at each stage of this simulated season.</p>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-xs sm:grid-cols-5">
        <div><dt className="text-muted-foreground">Opening</dt><dd className="font-bold tabular-nums">{saved.opening}</dd></div>
        {saved.checkpoints.map(([game, ovr], index) => (
          <div key={index}><dt className="text-muted-foreground">{index === 3 ? 'Finish' : `Game ${game}`}</dt><dd className="font-bold tabular-nums">{ovr}</dd></div>
        ))}
      </dl>
    </section>
  );
}
