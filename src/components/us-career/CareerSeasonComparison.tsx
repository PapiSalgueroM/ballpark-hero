import { useEffect, useRef, useState } from 'react';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';
import type { CareerReviewStat } from '@/lib/usCareerSeasonReview';
import { cn } from '@/lib/utils';

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const recorded = (value: unknown) => finite(value) ? String(value) : 'Not recorded';
const control = 'min-h-[44px] min-w-0 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
const tabs = ['Overview', 'Regular season'] as const;

function delta(first: CareerReviewStat, second: CareerReviewStat, money: boolean) {
  const a = first.numeric?.raw, b = second.numeric?.raw;
  if (!finite(a) || !finite(b)) return 'Not recorded';
  const digits = second.numeric?.digits ?? first.numeric?.digits;
  const change = Number((b - a).toFixed(digits ?? 6));
  const amount = digits === undefined ? String(Math.abs(change)) : Math.abs(change).toFixed(digits);
  return `${change > 0 ? '+' : change < 0 ? '-' : ''}${money ? '$' : ''}${amount}${money ? 'M' : ''}`;
}

export default function CareerSeasonComparison({ career, sport, onBack }: {
  career: UsCareerCore; sport: UsCareerSport; onBack: () => void;
}) {
  const [first, setFirst] = useState(career.seasons.length - 2);
  const [second, setSecond] = useState(career.seasons.length - 1);
  const [tab, setTab] = useState<typeof tabs[number]>('Overview');
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, []);
  const seasons = [career.seasons[first], career.seasons[second]];
  const details = seasons.map(season => sport.reviewStats(season, career.pos));
  const overview = seasons.map((season, index) => [
    { label: 'Season OVR', value: recorded(season.ovr), numeric: { raw: season.ovr } },
    { label: details[index].gamesLabel, value: recorded(season.games), numeric: { raw: season.games } },
    { label: 'Age that season', value: recorded(season.age), numeric: { raw: season.age } },
    { label: 'Season salary', value: finite(season.salary) ? `$${season.salary}M` : 'Not recorded', numeric: { raw: season.salary } },
  ]);
  const sides = tab === 'Overview' ? overview : details.map(detail => detail.regularValues.filter(stat => stat.numeric));
  const labels = [...new Set(sides.flat().map(stat => stat.label))];
  const choices = career.seasons.map((season, index) => ({ season, index })).reverse();
  const suspended = tab === 'Regular season' && seasons.some(season => season.teamResult === 'SUSPENDED');

  return <section data-career-season-comparison="" className="space-y-3" aria-labelledby="career-season-compare-title">
    <button data-season-compare-back="" onClick={onBack} className={control}>Back to seasons</button>
    <div><h2 ref={title} id="career-season-compare-title" data-season-compare-title="" tabIndex={-1} className="font-display text-xl font-bold">Compare seasons</h2>
      <p className="mt-1 text-sm text-muted-foreground">Change shows the second season minus the first.</p></div>
    <div className="grid grid-cols-2 gap-2">
      {[{ label: 'First season', value: first, other: second, set: setFirst, side: 'first' }, { label: 'Second season', value: second, other: first, set: setSecond, side: 'second' }].map(({ label, value, other, set, side }) => <label key={side} className="min-w-0 space-y-1 text-xs font-semibold">
        <span>{label}</span>
        <select aria-label={label} data-season-compare-first={side === 'first' ? '' : undefined} data-season-compare-second={side === 'second' ? '' : undefined}
          value={value} onChange={event => set(Number(event.target.value))} className={cn(control, 'w-full')}>
          {choices.filter(choice => choice.index !== other).map(({ season, index }) => <option key={index} value={index}>{recorded(season.year)} (#{index + 1})</option>)}
        </select>
        <span className="block break-words font-normal text-muted-foreground">{career.seasons[value].team ? sport.teamLabelOf(career.seasons[value].team, career.eraId) : 'Team not recorded'}</span>
      </label>)}
    </div>
    <div role="group" aria-label="Comparison details" className="grid grid-cols-2 gap-2">
      {tabs.map(value => <button key={value} data-season-compare-tab={value} aria-pressed={tab === value} onClick={() => setTab(value)}
        className={cn(control, tab === value && 'border-primary bg-primary text-primary-foreground')}>{value}</button>)}
    </div>
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="grid grid-cols-3 gap-2 pb-2 text-center text-xs text-muted-foreground"><span>First season</span><span>Second season</span><span>Change</span></div>
      <dl className="space-y-2">
        {labels.map(label => {
          const stats = sides.map(side => side.find(stat => stat.label === label) ?? { label, value: 'Not recorded' });
          return <div key={label} data-season-compare-stat={label} className="rounded-xl bg-secondary/50 p-2">
            <dt className="mb-1 text-xs text-muted-foreground">{label}</dt>
            <div className="grid grid-cols-3 gap-2 text-center text-sm font-semibold tabular-nums">
              <dd data-compare-first="" className="min-w-0 break-words">{tab === 'Regular season' && seasons[0].teamResult === 'SUSPENDED' ? 'Not played' : stats[0].value}</dd>
              <dd data-compare-second="" className="min-w-0 break-words">{tab === 'Regular season' && seasons[1].teamResult === 'SUSPENDED' ? 'Not played' : stats[1].value}</dd>
              <dd data-compare-delta="" className="min-w-0 break-words">{suspended ? 'Not played' : delta(stats[0], stats[1], label === 'Season salary')}</dd>
            </div>
          </div>;
        })}
      </dl>
      {labels.length === 0 && <p className="text-sm text-muted-foreground">No recorded numbers to compare for this position.</p>}
    </div>
  </section>;
}
