import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { teamCompRecord, careerLeagueOf } from '@/lib/clubManager';
import type { CareerState, CMPlayer, CompBucket, CompStatLine } from '@/lib/clubManager';

interface StatsScreenProps {
  career: CareerState;
}

type View = 'all' | CompBucket;
type SortKey = 'goals' | 'assists' | 'rating' | 'apps' | 'cards';

interface Line {
  p: CMPlayer;
  apps: number;
  goals: number;
  assists: number;
  yellows: number;
  reds: number;
  ratingSum: number;
}

const VIEW_LABELS: { key: View; label: string }[] = [
  { key: 'all', label: 'All comps' },
  { key: 'league', label: 'League' },
  { key: 'cup', label: 'Cup' },
  { key: 'ucl', label: 'Europe' },
];

function lineFor(p: CMPlayer, view: View): Line {
  if (view === 'all') {
    return {
      p,
      apps: p.apps ?? 0,
      goals: p.seasonGoals,
      assists: p.seasonAssists,
      yellows: p.seasonYellows ?? 0,
      reds: p.seasonReds ?? 0,
      ratingSum: p.ratingSum ?? 0,
    };
  }
  const c: CompStatLine | undefined = p.comp?.[view];
  return {
    p,
    apps: c?.apps ?? 0,
    goals: c?.goals ?? 0,
    assists: c?.assists ?? 0,
    yellows: c?.yellows ?? 0,
    reds: c?.reds ?? 0,
    ratingSum: c?.ratingSum ?? 0,
  };
}

const avg = (l: Line): number => (l.apps > 0 ? l.ratingSum / l.apps : 0);

/**
 * Round 164, his CM-11 word for word: "team and player stats: per competition
 * and total goals, assists, cards, average game score". One screen: the
 * club's record by competition off the fixture log, the season's leaders,
 * and every player's full line, sortable, filterable by competition. The
 * numbers are the same objects the engine credits at full time, never a
 * second bookkeeping.
 */
export function StatsScreen({ career }: StatsScreenProps) {
  const [view, setView] = useState<View>('all');
  const [sortKey, setSortKey] = useState<SortKey>('goals');

  const cupName = careerLeagueOf(career).cupName;
  const team = useMemo(() => teamCompRecord(career, cupName), [career, cupName]);
  const inEurope = career.uclGroup !== null || !!career.uclKoRound;

  const lines = useMemo(() => {
    const built = career.squad.map(p => lineFor(p, view)).filter(l => l.apps > 0 || view === 'all');
    const key = (l: Line): number =>
      sortKey === 'goals' ? l.goals
      : sortKey === 'assists' ? l.assists
      : sortKey === 'apps' ? l.apps
      : sortKey === 'cards' ? l.yellows + l.reds * 2
      : avg(l);
    return built.sort((a, b) => key(b) - key(a) || b.goals - a.goals || a.p.name.localeCompare(b.p.name));
  }, [career.squad, view, sortKey]);

  const played = lines.filter(l => l.apps > 0);
  const topScorer = [...played].sort((a, b) => b.goals - a.goals)[0];
  const topAssister = [...played].sort((a, b) => b.assists - a.assists)[0];
  const bestRated = played.filter(l => l.apps >= 3).sort((a, b) => avg(b) - avg(a))[0];
  const mostBooked = [...played].sort((a, b) => (b.yellows + b.reds * 2) - (a.yellows + a.reds * 2))[0];

  /* An old save only splits matches played since the splits existed. Say so
     rather than letting a half empty Europe tab read like a bug. */
  const splitsPartial = career.squad.some(p => {
    const total = (p.comp?.league?.apps ?? 0) + (p.comp?.cup?.apps ?? 0) + (p.comp?.ucl?.apps ?? 0);
    return (p.apps ?? 0) > total;
  });

  const teamLine = team[view];
  const headerBtn = (k: SortKey, label: string) => (
    <button
      onClick={() => setSortKey(k)}
      className={cn('text-center font-bold uppercase tracking-wide', sortKey === k ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-2">
      {/* Competition filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {VIEW_LABELS.filter(v => v.key !== 'ucl' || inEurope).map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={cn(
              'shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all',
              view === v.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground hover:border-primary',
            )}
          >
            {v.key === 'cup' ? cupName : v.label}
          </button>
        ))}
      </div>

      {/* Team record in this view */}
      <div className="bg-card border border-border rounded-2xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
          📊 {career.clubName} · {view === 'all' ? 'all competitions' : view === 'ucl' ? 'Champions League' : view === 'cup' ? cupName : 'league'}
        </div>
        {teamLine.p === 0 ? (
          <p className="text-xs text-muted-foreground">No matches in this competition yet this season.</p>
        ) : (
          <div className="grid grid-cols-5 gap-2 text-center">
            <div><div className="text-sm font-bold font-display text-foreground">{teamLine.p}</div><div className="text-[9px] text-muted-foreground">Played</div></div>
            <div><div className="text-sm font-bold font-display text-emerald-400">{teamLine.w}W {teamLine.d}D {teamLine.l}L</div><div className="text-[9px] text-muted-foreground">Record</div></div>
            <div><div className="text-sm font-bold font-display text-foreground">{teamLine.gf}</div><div className="text-[9px] text-muted-foreground">Scored</div></div>
            <div><div className="text-sm font-bold font-display text-foreground">{teamLine.ga}</div><div className="text-[9px] text-muted-foreground">Conceded</div></div>
            <div><div className={cn('text-sm font-bold font-display', teamLine.gf - teamLine.ga > 0 ? 'text-emerald-400' : teamLine.gf - teamLine.ga < 0 ? 'text-red-400' : 'text-foreground')}>{teamLine.gf - teamLine.ga > 0 ? '+' : ''}{teamLine.gf - teamLine.ga}</div><div className="text-[9px] text-muted-foreground">Diff</div></div>
          </div>
        )}
      </div>

      {/* Leaders */}
      {played.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {topScorer && topScorer.goals > 0 && (
            <div className="bg-card border border-border rounded-xl p-2">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">⚽ Top scorer</div>
              <div className="text-xs font-bold text-foreground truncate">{topScorer.p.name}</div>
              <div className="text-[10px] text-muted-foreground">{topScorer.goals} goal{topScorer.goals === 1 ? '' : 's'}</div>
            </div>
          )}
          {topAssister && topAssister.assists > 0 && (
            <div className="bg-card border border-border rounded-xl p-2">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">🅰️ Most assists</div>
              <div className="text-xs font-bold text-foreground truncate">{topAssister.p.name}</div>
              <div className="text-[10px] text-muted-foreground">{topAssister.assists} assist{topAssister.assists === 1 ? '' : 's'}</div>
            </div>
          )}
          {bestRated && (
            <div className="bg-card border border-border rounded-xl p-2">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">⭐ Best rated</div>
              <div className="text-xs font-bold text-foreground truncate">{bestRated.p.name}</div>
              <div className="text-[10px] text-muted-foreground">{avg(bestRated).toFixed(2)} avg, {bestRated.apps} apps</div>
            </div>
          )}
          {mostBooked && mostBooked.yellows + mostBooked.reds > 0 && (
            <div className="bg-card border border-border rounded-xl p-2">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">🟨 Most carded</div>
              <div className="text-xs font-bold text-foreground truncate">{mostBooked.p.name}</div>
              <div className="text-[10px] text-muted-foreground">{mostBooked.yellows}Y {mostBooked.reds}R</div>
            </div>
          )}
        </div>
      )}

      {/* Full table */}
      <div className="bg-card border border-border rounded-2xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Every player · tap a column to sort</div>
        <div className="grid grid-cols-[1fr_2rem_1.6rem_1.6rem_1.6rem_1.6rem_2.4rem] gap-x-1 text-[10px] pb-1 border-b border-border/60">
          <span className="text-muted-foreground uppercase tracking-wide">Player</span>
          {headerBtn('apps', 'Apps')}
          {headerBtn('goals', 'G')}
          {headerBtn('assists', 'A')}
          {headerBtn('cards', 'Y/R')}
          <span className="text-center font-bold uppercase tracking-wide text-muted-foreground">CS</span>
          {headerBtn('rating', 'Avg')}
        </div>
        {lines.map(l => (
          <div key={l.p.id} className="grid grid-cols-[1fr_2rem_1.6rem_1.6rem_1.6rem_1.6rem_2.4rem] gap-x-1 items-center text-xs py-1 border-b border-border/30 last:border-0">
            <span className="truncate text-foreground">{l.p.name} <span className="text-[9px] text-muted-foreground">{l.p.position}</span></span>
            <span className="text-center text-muted-foreground">{l.apps}</span>
            <span className={cn('text-center', l.goals > 0 ? 'text-foreground font-semibold' : 'text-muted-foreground')}>{l.goals}</span>
            <span className={cn('text-center', l.assists > 0 ? 'text-foreground font-semibold' : 'text-muted-foreground')}>{l.assists}</span>
            <span className="text-center text-muted-foreground">{l.yellows}{l.reds > 0 ? `/${l.reds}` : ''}</span>
            <span className="text-center text-muted-foreground">{view === 'all' ? (l.p.cleanSheets ?? 0) : '·'}</span>
            <span className={cn('text-right font-bold', avg(l) >= 7.2 ? 'text-emerald-400' : avg(l) > 0 ? 'text-foreground' : 'text-muted-foreground')}>
              {l.apps > 0 ? avg(l).toFixed(2) : '·'}
            </span>
          </div>
        ))}
      </div>

      {splitsPartial && view !== 'all' && (
        <p className="text-[9px] text-muted-foreground px-1">
          Competition splits count from this update forward. The All comps view has the full season.
        </p>
      )}
    </div>
  );
}

export default StatsScreen;
