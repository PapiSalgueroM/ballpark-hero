import type { MatchDevelopmentOverall } from '@/lib/careerSeasonRatings';

export function DevelopmentOverallLine({ report, unit }: { report: MatchDevelopmentOverall | null; unit: 'matchday' | 'game' }) {
  if (!report) return <p className="text-xs text-muted-foreground" data-match-development-overall>
    {unit === 'game' ? 'Season OVR unavailable for this fixture.' : 'Season OVR unavailable for this season.'}
  </p>;
  const { overall, change } = report;
  const movement = change === null ? (unit === 'game' ? 'Opening match' : 'Opening matchday')
    : change > 0 ? `Up ${change} from last ${unit}`
      : change < 0 ? `Down ${-change} from last ${unit}` : `No change from last ${unit}`;
  return <p className="text-xs text-muted-foreground" title="Estimated from saved development checkpoints" data-match-development-overall>
    Season OVR <strong className="tabular-nums text-foreground">{overall}</strong> · {movement}
  </p>;
}
