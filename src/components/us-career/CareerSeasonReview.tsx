import { useEffect, useRef, useState } from 'react';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/formatNumber';
import CareerSeasonComparison from '@/components/us-career/CareerSeasonComparison';
import CareerSeasonHighs from '@/components/us-career/CareerSeasonHighs';

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const recorded = (value: unknown) => finite(value) ? String(value) : 'Not recorded';
function difference(value: unknown, prior: unknown, hasPrior: boolean) {
  if (!hasPrior) return 'No earlier season';
  if (!finite(value) || !finite(prior)) return 'Change not recorded';
  const change = value - prior;
  return change === 0 ? 'Unchanged' : `${formatNumber(Math.abs(change))} ${change > 0 ? 'higher' : 'lower'}`;
}
const tabs = ['Overview', 'Regular season', 'Postseason'] as const;
type Tab = typeof tabs[number];

export default function CareerSeasonReview({ career, sport, onBack, backLabel }: {
  career: UsCareerCore;
  sport: UsCareerSport;
  onBack: () => void;
  backLabel: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('Overview');
  const [comparing, setComparing] = useState(false);
  const [highs, setHighs] = useState(false);
  const compareButton = useRef<HTMLButtonElement>(null);
  const highsButton = useRef<HTMLButtonElement>(null);
  const returnCompare = useRef(false);
  const returnHighs = useRef(false);
  const lastSelected = useRef(Math.max(0, career.seasons.length - 1));
  const picker = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const area = useRevealScroll<HTMLDivElement>(`${selected}:${tab}:${comparing}:${highs}`, { enabled: comparing || highs || selected !== null || career.seasons.length === 0, skipFirst: false });
  const pickedTile = useRevealScroll<HTMLButtonElement>(selected, { enabled: selected === null, skipFirst: false });
  const season = selected === null ? undefined : career.seasons[selected];
  const previous = selected !== null && selected > 0 ? career.seasons[selected - 1] : undefined;
  const detail = season ? sport.reviewStats(season, career.pos) : null;

  useEffect(() => {
    if (comparing || highs) return;
    if (returnCompare.current) { returnCompare.current = false; compareButton.current?.focus({ preventScroll: true }); return; }
    if (returnHighs.current) { returnHighs.current = false; highsButton.current?.focus({ preventScroll: true }); return; }
    if (selected !== null) title.current?.focus({ preventScroll: true });
    else (picker.current?.querySelector<HTMLButtonElement>(`[data-season-tile="${lastSelected.current}"]`) ?? back.current)?.focus({ preventScroll: true });
  }, [selected, comparing, highs]);

  const choose = (index: number) => {
    lastSelected.current = index;
    setTab('Overview');
    setSelected(index);
  };
  const control = 'min-h-[44px] rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

  if (highs) return <div ref={area} data-career-season-review="" data-no-prerender="" className="mx-auto max-w-lg">
    <CareerSeasonHighs career={career} sport={sport} onBack={() => { returnHighs.current = true; setHighs(false); }} onReview={index => { setHighs(false); choose(index); }} />
  </div>;

  if (comparing) return <div ref={area} data-career-season-review="" data-no-prerender="" className="mx-auto max-w-lg">
    <CareerSeasonComparison career={career} sport={sport} onBack={() => { returnCompare.current = true; setComparing(false); }} />
  </div>;

  return <div ref={area} data-career-season-review="" data-no-prerender="" className="mx-auto max-w-lg space-y-3">
    <button ref={back} onClick={season ? () => setSelected(null) : onBack} className={control}>{season ? 'Back to seasons' : backLabel}</button>
    {!season || !detail ? <>
      <div><h2 className="font-display text-xl font-bold">Career Log</h2><p className="mt-1 text-sm text-muted-foreground">Pick a year to review your saved season. No extra season is played.</p></div>
      {career.seasons.length >= 1 && <div className="flex flex-wrap gap-2">
        <button ref={highsButton} data-season-highs-open="" onClick={() => setHighs(true)} className={control}>Season highs</button>
        {career.seasons.length >= 2 && <button ref={compareButton} data-season-compare-open="" onClick={() => setComparing(true)} className={control}>Compare seasons</button>}
      </div>}
      {career.seasons.length === 0 ? <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">No seasons on the books yet. Go play one.</p>
        : <div ref={picker} role="group" aria-label="Choose a season" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {career.seasons.map((saved, index) => ({ saved, index })).reverse().map(({ saved, index }) => <button key={index} ref={index === lastSelected.current ? pickedTile : null} data-season-tile={index}
            aria-label={`Review ${finite(saved.year) ? saved.year : index + 1} season`} onClick={() => choose(index)} className={cn(control, 'min-w-0 p-3 text-left')}>
            <span className="block text-lg font-bold text-primary">{recorded(saved.year)}</span>
            <span className="mt-1 block break-words text-xs">{saved.team ? sport.teamLabelOf(saved.team, career.eraId) : 'Team not recorded'}</span>
          </button>)}
        </div>}
    </> : <section data-season-review={selected} aria-labelledby="career-season-title" className="overflow-hidden rounded-2xl border border-primary/30 bg-card">
      <div className="border-b border-border bg-primary/10 p-3">
        <h2 ref={title} tabIndex={-1} id="career-season-title" className="font-display text-xl font-bold">{recorded(season.year)} season</h2>
        <p className="mt-1 break-words text-sm">{season.team ? sport.teamLabelOf(season.team, career.eraId) : 'Team not recorded'} · {career.pos}</p>
      </div>
      <div role="group" aria-label="Season details" className="grid grid-cols-3 gap-1 border-b border-border p-2">
        {tabs.map(value => <button key={value} aria-pressed={tab === value} data-season-tab={value} onClick={() => setTab(value)}
          className={cn(control, 'px-1 text-xs', tab === value && 'border-primary bg-primary text-primary-foreground')}>{value}</button>)}
      </div>
      <div className="space-y-3 p-3">
        {tab === 'Overview' ? <>
          <p className="text-xs text-muted-foreground">{previous ? `Changes compared with your ${recorded(previous.year)} season.` : 'Your first recorded season.'}</p>
          <dl className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-secondary/50 p-3"><dt className="text-xs text-muted-foreground">Season OVR</dt><dd data-season-ovr="" className="text-xl font-bold">{recorded(season.ovr)}</dd><dd data-season-ovr-change="" className="mt-1 text-xs">{difference(season.ovr, previous?.ovr, !!previous)}</dd></div>
            <div className="rounded-xl bg-secondary/50 p-3"><dt className="text-xs text-muted-foreground">{detail.gamesLabel}</dt><dd data-season-games="" className="text-xl font-bold">{formatNumber(recorded(season.games))}</dd><dd data-season-games-change="" className="mt-1 text-xs">{difference(season.games, previous?.games, !!previous)}</dd></div>
            <div className="rounded-xl bg-secondary/50 p-3"><dt className="text-xs text-muted-foreground">Age that season</dt><dd data-season-age="" className="font-semibold">{recorded(season.age)}</dd></div>
            <div className="rounded-xl bg-secondary/50 p-3"><dt className="text-xs text-muted-foreground">Season salary</dt><dd data-season-pay="" className="break-words font-semibold">{finite(season.salary) ? `$${formatNumber(season.salary)}M` : 'Not recorded'}</dd></div>
          </dl>
          <div><h3 className="text-xs font-semibold text-muted-foreground">Team result</h3><p data-season-result="" className="mt-1 break-words text-sm font-semibold">{season.teamResult || 'Not recorded'}</p></div>
          <div><h3 className="text-xs font-semibold text-muted-foreground">Awards</h3><p data-season-awards="" className="mt-1 break-words text-sm">{Array.isArray(season.awards) ? season.awards.length ? season.awards.join(', ') : 'No awards that season' : 'Not recorded'}</p></div>
        </> : <>
          <h3 className="text-sm font-semibold">{tab} performance</h3>
          <dl className="grid grid-cols-2 gap-2">
            {(tab === 'Regular season' ? detail.regular : detail.postseason).map(stat => <div key={stat.label} data-season-stat={stat.label} className={cn('min-w-0 rounded-xl bg-secondary/50 p-3', stat.label === 'Performance' || stat.label === 'Season' || stat.label === 'Postseason' ? 'col-span-2' : '')}>
              <dt className="text-xs text-muted-foreground">{stat.label}</dt><dd className="mt-1 break-words text-sm font-semibold">{stat.value}</dd>
            </div>)}
          </dl>
          <p className="text-xs text-muted-foreground">These are the numbers kept in your save. Older saves may not have every field.</p>
        </>}
      </div>
    </section>}
  </div>;
}
