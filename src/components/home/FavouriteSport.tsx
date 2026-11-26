import { SPORT_NAME, type SportKey } from '@/data/homeFront';

export const browseSportName = (sport: SportKey) => (sport === 'world' ? 'World & Olympic' : SPORT_NAME[sport]);

export function FavouriteSport({ sports, value, onPick }: {
  sports: readonly SportKey[];
  value: SportKey | null;
  onPick: (sport: SportKey | null) => void;
}) {
  return (
    <label data-home-fav-sport="" className="flex min-w-0 max-w-full items-center gap-2">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">Show first</span>
      <select
        value={value ?? ''}
        onChange={event => onPick((event.currentTarget.value || null) as SportKey | null)}
        className="min-h-11 min-w-0 rounded-lg border border-border bg-surface-1 px-2 text-sm text-foreground focus-visible:outline-primary"
      >
        <option value="">Default order</option>
        {sports.map(sport => <option key={sport} value={sport}>{browseSportName(sport)}</option>)}
      </select>
    </label>
  );
}
