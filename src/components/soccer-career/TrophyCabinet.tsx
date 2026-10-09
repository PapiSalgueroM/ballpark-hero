import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { readMatchRating } from '@/lib/careerSeasonRatings';
import { cupChipLabel, readCupRun } from '@/lib/soccerCareerCup';
import { escapeCloses, focusDialogOnMount } from '@/lib/dialogA11y';
import { useBodyLock } from '@/components/season-centre/useBodyLock';
import { SeasonCupWinBlock } from './CupRunLines';

export type TrophyCategory = 'league' | 'domestic' | 'ucl' | 'club' | 'world' | 'continental' | 'ballon';

export const TROPHY_LABELS: Record<TrophyCategory, string> = {
  league: 'League titles', domestic: 'Domestic cups', ucl: 'European club titles',
  club: 'Club cups', world: 'World Cups', continental: 'Continental titles', ballon: "Ballon d'Or",
};

const TROPHY_FIELDS = {
  league: 'leagueTitle', domestic: 'domesticCup', ucl: 'championsLeague', club: 'clubCupTitle',
  world: 'worldCup', continental: 'continentalCup', ballon: 'ballonDor',
} as const;

/** One win per recorded season, just like the career's cabinet counts. */
export function trophyWins(career: Pick<CareerState, 'seasons'>, category: TrophyCategory): SeasonRecord[] {
  return (career.seasons ?? []).filter(row => {
    const trophy = row[TROPHY_FIELDS[category]];
    return Boolean(trophy);
  }).sort((a, b) => b.year - a.year);
}

function trophyName(row: SeasonRecord, category: TrophyCategory): string {
  if (category === 'domestic') return cupChipLabel(row) === 'Cup' ? 'Domestic cup' : cupChipLabel(row);
  if (category === 'club') return row.clubCupTitle!;
  if (category === 'continental') return row.tournament && row.tournament !== 'Continental' ? row.tournament : 'Continental title';
  return { league: 'League title', ucl: 'European club title', world: 'World Cup', ballon: "Ballon d'Or" }[category];
}

const seasonLabel = (row: SeasonRecord) => `${row.year}/${String(row.year + 1).slice(-2)}`;
const count = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= 0 ? String(value) : null;

function SavedNumber({ value }: { value: string | null }) {
  return value === null ? <span aria-label="not recorded">-</span> : <>{value}</>;
}

function SeasonTotals({ row, international = false }: { row: SeasonRecord; international?: boolean }) {
  const apps = international ? row.intApps : row.apps;
  const rating = international
    ? (apps > 0 && Number.isFinite(row.intRating) && row.intRating >= 3 && row.intRating <= 10 ? row.intRating : null)
    : readMatchRating(row);
  const stats = [
    { label: 'Apps', value: count(apps) },
    { label: 'Goals', value: count(international ? row.intGoals : row.goals) },
    { label: 'Assists', value: count(international ? row.intAssists : row.assists) },
    { label: 'Rating', value: rating === null ? null : rating.toFixed(1) },
  ];
  return (
    <section aria-label={international ? 'International season totals' : 'Club season totals'}>
      <h4 className="mb-2 text-xs font-bold">{international ? 'International season totals' : 'Club season totals'}</h4>
      <dl className="grid grid-cols-2 gap-2">
        {stats.map(stat => (
          <div key={stat.label} className="rounded-lg bg-muted/30 p-2 text-center">
            <dt className="text-[10px] text-muted-foreground">{stat.label}</dt>
            <dd className="text-sm font-black tabular-nums"><SavedNumber value={stat.value} /></dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function TrophyCabinet({ career, category, onClose }: {
  career: CareerState; category: TrophyCategory; onClose: () => void;
}) {
  const [picked, setPicked] = useState<SeasonRecord | null>(null);
  const [help, setHelp] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const helpButton = useRef<HTMLButtonElement>(null);
  const lastPicked = useRef<SeasonRecord | null>(null);
  const wasHelp = useRef(false);
  const returnFocus = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const wins = trophyWins(career, category);
  useBodyLock();
  useEffect(() => () => { returnFocus.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (content.current) content.current.scrollTop = 0;
    if (picked && !help) detailHeading.current?.focus({ preventScroll: true });
    else if (!picked && !help && lastPicked.current) {
      const row = lastPicked.current;
      const tile = [...(content.current?.querySelectorAll<HTMLButtonElement>('[data-trophy-win]') ?? [])]
        .find(button => button.dataset.trophyWin === String(row.year) && button.getAttribute('aria-label') === `View ${trophyName(row, category)}, ${seasonLabel(row)}, ${row.club}`);
      tile?.focus({ preventScroll: true });
    } else if (!help && wasHelp.current) helpButton.current?.focus({ preventScroll: true });
    lastPicked.current = picked;
    wasHelp.current = help;
  }, [picked, help, category]);

  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    escapeCloses(onClose)(event);
    if (event.key === 'Escape') { event.preventDefault(); return; }
    if (event.key !== 'Tab') return;
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === detailHeading.current)) {
      event.preventDefault(); first?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" onClick={onClose} data-trophy-cabinet>
      <div role="dialog" aria-modal="true" aria-label={TROPHY_LABELS[category]} tabIndex={-1} ref={focusDialogOnMount}
        onKeyDown={keyboard} onClick={event => event.stopPropagation()}
        className="flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl outline-none">
        <div className="flex shrink-0 items-center gap-2 border-b border-border p-3">
          <button type="button" onClick={onClose} data-trophy-back="career" className="min-h-11 rounded-lg bg-muted/30 px-3 text-xs font-bold">‹ Back</button>
          <h2 className="min-w-0 flex-1 text-sm font-black">{TROPHY_LABELS[category]}</h2>
          <button ref={helpButton} type="button" onClick={() => setHelp(value => !value)} aria-label="Trophy cabinet help" aria-expanded={help}
            className="h-11 w-11 shrink-0 rounded-lg border border-border font-bold">?</button>
        </div>
        <div ref={content} className="min-h-0 overflow-y-auto p-4">
          {help ? (
            <div className="space-y-3 text-xs leading-relaxed" data-trophy-help>
              <p>Pick a trophy, then a winning season. Back returns to your career.</p>
              <p>Only wins in your saved seasons count. An award listed elsewhere does not add a second trophy.</p>
              <p>The numbers are season totals, not just the cup games. International totals stay separate from your club totals. A dash means the save did not record that number.</p>
              <p>Example: a season with one league title and one domestic cup appears once in each category. It is two trophies from the same season.</p>
              <button type="button" onClick={() => setHelp(false)} data-trophy-help-back className="min-h-11 rounded-lg border border-border px-3 font-bold">Back to wins</button>
            </div>
          ) : picked ? (
            <div className="space-y-3" data-trophy-detail={picked.year}>
              <button type="button" onClick={() => setPicked(null)} data-trophy-back="wins" data-trophy-all-wins className="min-h-11 rounded-lg border border-border px-3 text-xs font-bold">‹ All wins</button>
              <div>
                <h3 ref={detailHeading} tabIndex={-1} className="text-base font-black outline-none">{trophyName(picked, category)}</h3>
                <p className="text-xs text-muted-foreground">{seasonLabel(picked)} · {picked.club}</p>
                {(category === 'world' || category === 'continental') && <p className="text-xs font-semibold">Won with {career.nationality}</p>}
                {picked.onLoanFrom && <p className="text-xs text-muted-foreground">On loan from {picked.onLoanFrom}</p>}
              </div>
              {(category === 'world' || category === 'continental') && <SeasonTotals row={picked} international />}
              <SeasonTotals row={picked} />
              <p className="text-[10px] text-muted-foreground">These are the saved season totals, across all competitions.</p>
              {category === 'domestic' && (readCupRun(picked)
                ? <SeasonCupWinBlock season={picked} />
                : <p className="text-xs text-muted-foreground">Cup match details were not kept in this save.</p>)}
            </div>
          ) : (
            <div className="space-y-3">
              {wins.length > 0 && <p className="text-xs text-muted-foreground">{wins.length} {wins.length === 1 ? 'win' : 'wins'}. Pick a season to see what you did.</p>}
              {wins.length === 0 ? <p className="text-sm">No wins recorded here yet.</p> : (
                <div className="grid grid-cols-2 gap-2" data-trophy-wins>
                  {wins.map((row, index) => (
                    <button key={`${row.year}|${row.club}|${index}`} type="button" onClick={() => setPicked(row)} data-trophy-win={row.year}
                      aria-label={`View ${trophyName(row, category)}, ${seasonLabel(row)}, ${row.club}`}
                      className="min-h-16 min-w-0 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-left hover:bg-amber-500/20">
                      <span className="block text-sm font-black tabular-nums">{seasonLabel(row)}</span>
                      <span className="block break-words text-[11px]">{row.club}</span>
                      <span className="block break-words text-[10px] text-muted-foreground">{trophyName(row, category)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
