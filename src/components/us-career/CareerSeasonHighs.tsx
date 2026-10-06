import { useEffect, useRef, useState } from 'react';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';
import { seasonHighs } from '@/lib/usCareerSeasonReview';
import { cn } from '@/lib/utils';

const control = 'min-h-[44px] min-w-0 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
const recordedYear = (year: number) => Number.isFinite(year) ? String(year) : 'Year not recorded';

export default function CareerSeasonHighs({ career, sport, onBack, onReview }: {
  career: UsCareerCore; sport: UsCareerSport; onBack: () => void; onReview: (index: number) => void;
}) {
  const highs = seasonHighs(career, sport);
  const [metric, setMetric] = useState(0);
  const [picked, setPicked] = useState(highs[0].indices[0]);
  const high = highs[metric];
  const index = high.indices.includes(picked) ? picked : high.indices[0];
  const season = career.seasons[index];
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, []);

  return <section data-career-season-highs="" className="space-y-3" aria-labelledby="career-season-highs-title">
    <button data-season-highs-back="" onClick={onBack} className={control}>Back to seasons</button>
    <div><h2 ref={title} id="career-season-highs-title" tabIndex={-1} className="font-display text-xl font-bold">Season highs</h2>
      <p className="mt-1 text-sm text-muted-foreground">Your best saved numbers. Suspended seasons are left out.</p></div>
    <div role="group" aria-label="Choose a season high" className="grid grid-cols-3 gap-2">
      {highs.map((item, chosen) => <button key={item.label} data-season-highs-stat={item.label} aria-pressed={chosen === metric}
        onClick={() => { setMetric(chosen); setPicked(item.indices[0]); }}
        className={cn(control, 'p-2 text-left text-xs', chosen === metric && 'border-primary bg-primary text-primary-foreground')}>
        <span className="block break-words">{item.label}</span><span className="mt-1 block break-words text-base font-bold">{item.value}</span>
      </button>)}
    </div>
    <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
      <div><h3 className="text-sm text-muted-foreground">{high.label} high</h3>
        <p data-season-highs-value="" className="mt-1 text-2xl font-bold tabular-nums">{high.value}</p></div>
      {season ? <>
        <p className="text-sm text-muted-foreground">{high.indices.length === 1 ? 'Set in one saved season.' : `${high.indices.length} seasons share this high. Pick one to review.`}</p>
        <label className="block space-y-1 text-xs font-semibold"><span>High season</span>
          <select aria-label="High season" value={index} onChange={event => setPicked(Number(event.target.value))} className={cn(control, 'w-full')}>
            {high.indices.map(savedIndex => <option key={savedIndex} value={savedIndex}>{recordedYear(career.seasons[savedIndex].year)} (#{savedIndex + 1})</option>)}
          </select>
        </label>
        <p className="break-words text-sm">{season.team ? sport.teamLabelOf(season.team, career.eraId) : 'Team not recorded'}</p>
        <button data-season-highs-review="" onClick={() => onReview(index)} className={cn(control, 'w-full border-primary bg-primary text-primary-foreground')}>Open season</button>
      </> : <p className="text-sm text-muted-foreground">No saved number for this stat yet.</p>}
    </div>
  </section>;
}
