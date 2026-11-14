import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  NRL_WORLD_CUP_2026_KNOCKOUT_VENUES, NRL_WORLD_CUP_2026_OPENING_SQUADS, NRL_WORLD_CUP_2026_POOL_FIXTURES,
  type NrlWorldCupNation,
} from '@/data/nrlWorldCup2026';
import { useSaveFenceWatch } from '@/hooks/useSaveFenceWatch';
import { nrlCanPlayRole, NRL_TACTICS, NRL_UTILITY_RATING_COST, type NrlTactic } from '@/lib/nrlManager';
import {
  advanceNrlWorldCup, createNrlWorldCup, nrlWorldCupCanPickLineup, nrlWorldCupMatchday, nrlWorldCupResults, nrlWorldCupRotation, readNrlWorldCupSave,
  type NrlWorldCupLineup, type NrlWorldCupRun,
} from '@/lib/nrlWorldCup';
import { holdPendingSave, safeSetItem } from '@/lib/safeStorage';
import { saveFence } from '@/lib/saveFence';

const SAVE_KEY = 'nrl-world-cup-save-v1';
const nationNames: Record<NrlWorldCupNation, string> = {
  australia: 'Australia', 'new-zealand': 'New Zealand', fiji: 'Fiji', 'cook-islands': 'Cook Islands',
  england: 'England', samoa: 'Samoa', lebanon: 'Lebanon', tonga: 'Tonga', 'papua-new-guinea': 'Papua New Guinea', france: 'France',
};
const nations = Object.keys(nationNames) as NrlWorldCupNation[];
const tacticNames: Record<NrlTactic, string> = { balanced: 'Balanced', attack: 'Attack', defense: 'Defence' };
const stages = ['pool round 1', 'pool round 2', 'pool round 3', 'semifinals', 'final'];
const selectClass = 'min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const dateFormat = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const showDate = (date: string) => dateFormat.format(new Date(`${date}T12:00:00Z`));
type Report = ReturnType<typeof nrlWorldCupResults>;

function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return { raw, run: readNrlWorldCupSave(raw) };
  } catch {
    return { raw: null, run: null };
  }
}

function CupFixtures({ report }: { report: Report | null }) {
  const fixtures = [
    ...NRL_WORLD_CUP_2026_POOL_FIXTURES.map(fixture => ({ ...fixture, label: `Pool round ${fixture.round}` })),
    ...NRL_WORLD_CUP_2026_KNOCKOUT_VENUES.map((fixture, index) => ({
      ...fixture, id: index < 2 ? `2026-semifinal-${index + 1}` : '2026-final',
      label: index < 2 ? `Semifinal ${index + 1}` : 'Final', home: undefined, away: undefined,
    })),
  ];
  const scores = [...(report?.poolMatches ?? []), ...(report?.semifinals ?? []), ...(report?.final ? [report.final] : [])];
  return (
    <details className="rounded-md border border-border px-3">
      <summary className="min-h-11 cursor-pointer py-2.5 font-semibold">Fixtures and results</summary>
      <ol className="divide-y divide-border">
        {fixtures.map(({ id, date, venue, home, away, label }) => {
          const result = scores.find(score => score.id === id);
          return <li key={id} className="py-2.5 text-sm">
            <p className="font-semibold">{result ? `${nationNames[result.home]} ${result.homeScore}–${result.awayScore} ${nationNames[result.away]}`
              : home && away ? `${nationNames[home]} vs ${nationNames[away]}` : label}
              {result?.goldenPoint && <span className="ml-2 text-xs font-normal text-muted-foreground">Golden Point</span>}
            </p>
            <p className="text-muted-foreground">{showDate(date)} · {venue}</p>
          </li>;
        })}
      </ol>
    </details>
  );
}

function CupTable({ title, rows }: { title: string; rows: Report['tables']['A'] }) {
  return (
    <table className="w-full table-fixed text-left text-sm tabular-nums">
      <caption className="pb-1 text-left font-semibold">{title}</caption>
      <thead><tr className="border-b border-border text-xs text-muted-foreground">
        <th scope="col" className="pb-1">Nation</th>
        <th scope="col" className="w-10 pb-1 text-right" aria-label="Played">P</th>
        <th scope="col" className="w-10 pb-1 text-right" aria-label="Points difference">Diff</th>
        <th scope="col" className="w-10 pb-1 text-right" aria-label="Points">Pts</th>
      </tr></thead>
      <tbody>{rows.map(({ nation, played, points, scored, conceded }, index) => (
        <tr key={nation} className="border-b border-border last:border-0">
          <th scope="row" className="break-words py-1.5 font-medium">{index + 1}. {nationNames[nation]}</th>
          <td className="text-right">{played}</td>
          <td className="text-right">{scored - conceded}</td>
          <td className="text-right font-semibold">{points}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}

function stageSummary(run: NrlWorldCupRun, report: Report) {
  if (report.champion) return `${nationNames[report.champion]} win the World Cup.`;
  const step = run.tactics.length;
  if (step === 3 && ![...report.tables.A.slice(0, 2), ...report.tables.BC.slice(0, 2)].some(row => row.nation === run.nation)) {
    return `${nationNames[run.nation]} are out in the pool stage. You can finish the tournament.`;
  }
  if (step === 4) {
    const loss = report.semifinals.find(match => (match.home === run.nation || match.away === run.nation) && match.winner !== run.nation);
    if (loss) return `${nationNames[run.nation]} are out in the semifinals. You can play the final.`;
    if (report.semifinals.some(match => match.winner === run.nation)) return `${nationNames[run.nation]} reach the final.`;
  }
  const match = report.poolMatches.slice(-5).find(({ home, away }) => home === run.nation || away === run.nation);
  if (match) return `${nationNames[match.home]} ${match.homeScore}–${match.awayScore} ${nationNames[match.away]}${match.goldenPoint ? ' in Golden Point' : ''}.`;
  return 'Ready for pool round 1.';
}

function lineupSummary(nation: NrlWorldCupNation, choice: NrlWorldCupLineup) {
  const { change, bench } = nrlWorldCupMatchday(nation, choice);
  return [
    change && `${change.reserve.name} starts at ${change.starter.role} and ${change.starter.name} moves to the bench.`,
    choice.firstReserve !== undefined && `${bench[0].name} has first interchange priority.`,
  ].filter(Boolean).join(' ');
}

function MatchdayLineup({ nation, choice, disabled, onChange }: {
  nation: NrlWorldCupNation; choice: NrlWorldCupLineup; disabled: boolean; onChange: (choice: NrlWorldCupLineup) => void;
}) {
  const opening = nrlWorldCupMatchday(nation);
  const { change, bench } = nrlWorldCupMatchday(nation, { swap: choice.swap, target: choice.target });
  const summary = lineupSummary(nation, choice);
  const rotation = nrlWorldCupRotation(nation, choice);
  const rotationNames = rotation.map(player => player.name).join(', ');
  return (
    <details className="rounded-md border border-border px-3">
      <summary className="min-h-11 cursor-pointer py-2.5 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Set matchday lineup
      </summary>
      <div className="space-y-2 pb-3">
        <p className="text-sm text-muted-foreground">Choose any reserve and the starter they replace. You can also set first interchange priority for this match.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="min-w-0 space-y-1 text-sm font-semibold">
            <span>Starter and reserve swap</span>
            <select className={selectClass} value={choice.swap ?? ''} disabled={disabled} onChange={event => onChange({
              swap: event.target.value ? Number(event.target.value) : undefined,
            })}>
              <option value="">Keep opening starters</option>
              {opening.bench.map(({ id, name, role }, index) => <option key={id} value={index}>
                {name} · {role}
              </option>)}
            </select>
          </label>
          {change && (
            <label className="min-w-0 space-y-1 text-sm font-semibold">
              <span>Starting player to replace</span>
              <select className={selectClass} value={opening.starters.indexOf(change.starter)} disabled={disabled}
                onChange={event => onChange({ swap: choice.swap, target: Number(event.target.value) })}>
                {opening.starters.map(({ id, name, role }, index) => <option key={id} value={index}>
                  {name} · {role}{nrlCanPlayRole(change.reserve, role) ? '' : ' (out of position)'}
                </option>)}
              </select>
            </label>
          )}
          <label className="min-w-0 space-y-1 text-sm font-semibold">
            <span>First interchange priority</span>
            <select className={selectClass} value={choice.firstReserve ?? ''} disabled={disabled} onChange={event => onChange({
              ...choice, firstReserve: event.target.value ? Number(event.target.value) : undefined,
            })}>
              <option value="">Keep current bench order</option>
              {bench.slice(1).map(({ id, name, role }, index) => <option key={id} value={index + 1}>{name} · {role}</option>)}
            </select>
          </label>
        </div>
        <div aria-live="polite">
          {summary && <p className="text-sm">{summary}</p>}
          {change && !nrlCanPlayRole(change.reserve, change.starter.role) && (
            <p className="text-sm text-muted-foreground">Playing out of position lowers {change.reserve.name}’s effective rating by {NRL_UTILITY_RATING_COST} OVR.</p>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Planned rotation: {rotationNames}.</p>
      </div>
    </details>
  );
}

interface Appointment {
  run: NrlWorldCupRun | null;
  stale: boolean;
  locked: boolean;
  saveFailed: boolean;
  saveTooLarge: boolean;
  onStart: (nation: NrlWorldCupNation) => boolean;
  onPlay: (previous: NrlWorldCupRun, next: NrlWorldCupRun) => boolean;
  onRetry: () => void;
}

export default function NrlWorldCup({ onBack, appointment }: { onBack: () => void; appointment?: Appointment }) {
  if (!appointment) return <StandaloneWorldCup onBack={onBack} />;
  const unreadable = Boolean(appointment.run && !readNrlWorldCupSave(JSON.stringify(appointment.run)));
  return <WorldCupCampaign {...appointment} run={unreadable ? null : appointment.run} unreadable={unreadable} onBack={onBack} appointment />;
}

function StandaloneWorldCup({ onBack }: { onBack: () => void }) {
  const [initial] = useState(readSave);
  const [run, setRun] = useState(initial.run);
  const [unreadable, setUnreadable] = useState(initial.raw !== null && initial.run === null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [changed, setChanged] = useState(false);
  const current = useRef(run);
  const committed = useRef(initial.raw);
  const { moved } = useSaveFenceWatch(SAVE_KEY);
  const stale = changed || moved;

  useEffect(() => {
    saveFence.adopt(SAVE_KEY);
    return () => saveFence.release(SAVE_KEY);
  }, []);

  const save = useCallback((next: NrlWorldCupRun) => {
    try {
      if (localStorage.getItem(SAVE_KEY) !== committed.current) {
        setChanged(true);
        return 'moved';
      }
    } catch { /* The fenced write below handles unavailable storage. */ }
    const raw = JSON.stringify(next);
    const outcome = saveFence.write(SAVE_KEY, () => safeSetItem(SAVE_KEY, raw));
    if (outcome === 'moved') {
      setChanged(true);
      return outcome;
    }
    if (outcome === 'written') committed.current = raw;
    setSaveFailed(outcome === 'failed');
    current.current = next;
    setRun(next);
    return outcome;
  }, []);

  useEffect(() => {
    if (!saveFailed || stale) return;
    return holdPendingSave(() => current.current !== null && save(current.current) === 'written');
  }, [save, saveFailed, stale]);

  function leave() {
    if (saveFailed && !stale && current.current && save(current.current) !== 'written') return;
    onBack();
  }

  function start(nation: NrlWorldCupNation) {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    if (save(createNrlWorldCup(seed, nation)) === 'moved') return false;
    setUnreadable(false);
    return true;
  }

  return <WorldCupCampaign run={run} unreadable={unreadable} stale={stale} locked={false} saveFailed={saveFailed} saveTooLarge={false}
    onBack={leave} onStart={start} onPlay={(previous, next) => current.current === previous && save(next) !== 'moved'}
    onRetry={() => { if (current.current) save(current.current); }} />;
}

function WorldCupCampaign({ run, unreadable, stale, locked, saveFailed, saveTooLarge, onBack, onStart, onPlay, onRetry, appointment }: Appointment & {
  unreadable: boolean; onBack: () => void; appointment?: true;
}) {
  const [nation, setNation] = useState<NrlWorldCupNation>(run?.nation ?? 'australia');
  const [tactic, setTactic] = useState<NrlTactic>('balanced');
  const [lineup, setLineup] = useState<NrlWorldCupLineup>({});
  const [restart, setRestart] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const disabled = stale || locked;
  const report = run ? nrlWorldCupResults(run) : null;
  const step = run?.tactics.length ?? 0;
  const canPickLineup = Boolean(run && report && nrlWorldCupCanPickLineup(run, step + 1, report));

  useEffect(() => { heading.current?.focus(); }, []);

  function start() {
    if (!onStart(nation)) return;
    setRestart(false);
    setTactic('balanced');
    setLineup({});
  }

  function play() {
    if (!run) return;
    const choice = lineup.swap !== undefined || lineup.firstReserve !== undefined ? lineup : undefined;
    const next = advanceNrlWorldCup(run, step + 1, tactic, choice);
    if (next === run || !onPlay(run, next)) return;
    setLineup({});
    if (step === stages.length - 1) status.current?.focus();
  }

  return (
    <section aria-labelledby="nrl-world-cup-title" className="space-y-4 rounded-xl border border-border bg-card p-3 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="nrl-world-cup-title" ref={heading} tabIndex={-1} className="font-display text-xl font-bold outline-none sm:text-2xl">
          {appointment ? '2026 World Cup national appointment' : '2026 Rugby League World Cup'}
        </h2>
        <Button type="button" size="lg" variant="outline" className="px-3" onClick={onBack}>Back to club manager</Button>
      </div>
      <p className="text-sm text-muted-foreground">Coach one of ten men’s national teams through the published 2026 fixtures. The game uses each nation’s opening squad, with optional matchday changes and simulated ratings and results.</p>
      {appointment && <p className="text-sm text-muted-foreground">This appointment saves in your club career. You can return between rounds and keep it when you change clubs or start another season.</p>}
      {stale && <p className="rounded-md border border-border p-2 text-sm" role="status">{appointment
        ? 'This career changed in another tab. Return to the club manager and reload your season.' : 'The World Cup changed in another tab. Go back and open it again to load the newer run.'}</p>}
      {locked && !stale && step < stages.length && <p className="text-sm text-muted-foreground">The appointment is currently read-only.</p>}
      {saveTooLarge && !stale && <p className="rounded-md border border-border p-2 text-sm" role="status">This career reached the save size limit. Your last saved progress is still in this slot.</p>}
      {saveFailed && !stale && <div className="rounded-md border border-border p-2 text-sm" role="status">
        <p>Progress is still in this tab. Retry before leaving.</p>
        <Button type="button" size="lg" variant="outline" className="mt-2 px-3" onClick={onRetry}>Retry World Cup save</Button>
      </div>}
      {unreadable && <p className="text-sm text-muted-foreground">{appointment
        ? 'The appointment could not be read. Your club career is still available.' : 'The saved run could not be read. Starting a new World Cup replaces it.'}</p>}
      {(!run || restart) && !(unreadable && appointment) && <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="min-w-0 space-y-1 text-sm font-semibold">
          <span>Coach a nation</span>
          <select className={selectClass} value={nation} disabled={disabled} onChange={event => setNation(event.target.value as NrlWorldCupNation)}>
            {nations.map(id => <option key={id} value={id}>{nationNames[id]}</option>)}
          </select>
        </label>
        <Button type="button" size="lg" disabled={disabled} onClick={start}>{appointment ? 'Accept national appointment' : 'Start World Cup'}</Button>
        {restart && <p className="text-sm text-muted-foreground">Starting replaces the previous tournament in this browser.</p>}
      </div>}
      {run && report && !restart && <div className="space-y-3">
        <p className="font-semibold">Coaching {nationNames[run.nation]}</p>
        <p ref={status} tabIndex={-1} aria-live="polite" className="text-sm font-semibold" role={stale || saveFailed ? undefined : 'status'}>{stageSummary(run, report)}</p>
        {canPickLineup && <MatchdayLineup key={step} nation={run.nation} choice={lineup} disabled={disabled} onChange={setLineup} />}
        {step < stages.length ? (
          <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="min-w-0 space-y-1 text-sm font-semibold">
              <span>World Cup tactic</span>
              <select className={selectClass} value={tactic} disabled={disabled} onChange={event => setTactic(event.target.value as NrlTactic)}>
                {NRL_TACTICS.map(id => <option key={id} value={id}>{tacticNames[id]}</option>)}
              </select>
            </label>
            <Button type="button" size="lg" disabled={disabled} onClick={play}>Play {stages[step]}</Button>
          </div>
        ) : !appointment && <Button type="button" size="lg" variant="outline" disabled={stale || saveFailed} onClick={() => setRestart(true)}>New World Cup</Button>}
        {run.lineups && <ul className="space-y-1 text-sm" aria-label="Saved matchday changes">
          {Object.entries(run.lineups).map(([stage, change]) => change && <li key={stage} className="break-words">
            <span className="font-semibold">{stages[Number(stage) - 1]} </span>{lineupSummary(run.nation, change)}
          </li>)}
        </ul>}
        <details className="rounded-md border border-border px-3">
          <summary className="min-h-11 cursor-pointer py-2.5 font-semibold">{nationNames[run.nation]} opening squad</summary>
          <ol className="grid gap-x-4 gap-y-1 pb-3 text-sm sm:grid-cols-2">
            {NRL_WORLD_CUP_2026_OPENING_SQUADS[run.nation].map(({ id, jersey, name }, index) => (
              <li key={id} className="min-w-0 break-words">{jersey}. {name}{index >= 13 && <span className="ml-1 text-xs text-muted-foreground">{index < 17 ? 'Interchange' : 'Reserve'}</span>}</li>
            ))}
          </ol>
        </details>
        <div className="grid gap-4 sm:grid-cols-2">
          <CupTable title="Pool A" rows={report.tables.A} />
          <CupTable title="Pools B and C" rows={report.tables.BC} />
        </div>
        <p className="text-xs text-muted-foreground">Two teams advance from each table. Across pools, head-to-head breaks ties. If a tie is still unresolved, the game uses points difference, points scored and draw order. The game assigns qualifiers to the published semifinal venues.</p>
      </div>}
      <CupFixtures report={report} />
    </section>
  );
}
