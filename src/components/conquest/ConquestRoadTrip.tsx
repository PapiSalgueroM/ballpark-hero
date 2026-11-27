import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Route } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ConquestRegionMap from '@/components/conquest/ConquestRegionMap';
import type { ConquestMapSport } from '@/lib/conquestMapLook';
import { teamLabel, type ImperialismSport } from '@/lib/imperialismEngine';
import { safeLocalStorage } from '@/lib/safeStorage';
import { readTrip, tripChoices, tripNetwork, tripOdds, tripRules, TRIP_DATES, TRIP_TARGET, type TripAction, type TripLeague, type TripRun } from '@/lib/conquestRoadTrip';

const button = 'min-h-11 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:border-primary focus-visible:outline-primary';
const primary = 'min-h-11 rounded-lg bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50';
function subscribe(update: () => void) {
  window.addEventListener('storage', update);
  window.addEventListener('dukb-road-trip', update);
  return () => { window.removeEventListener('storage', update); window.removeEventListener('dukb-road-trip', update); };
}

export function ConquestRoadTrip({ sport, map, league }: { sport: ImperialismSport; map: ConquestMapSport; league: TripLeague }) {
  const key = 'dukb-road-trip-' + league + '-v1';
  const read = () => safeLocalStorage.getItem(key);
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const graph = useMemo(() => tripNetwork(sport, map), [sport, map]);
  const teams = useMemo(() => [...graph].filter(([, rivals]) => rivals.size).map(([id]) => id).sort((a, b) => teamLabel(sport, a).localeCompare(teamLabel(sport, b))), [graph, sport]);
  const saved = useMemo(() => readTrip(sport, league, graph, raw), [sport, league, graph, raw]);
  const [team, setTeam] = useState(teams[0]);
  const [open, setOpen] = useState(false);
  const [choosingTeam, setChoosingTeam] = useState(false);
  const [pick, setPick] = useState<{ raw: string | null; to: string } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [showMap, setShowMap] = useState(false);
  const name = (id: string) => teamLabel(sport, id);
  const rules = tripRules[league];
  const board = saved?.board;
  const run = saved?.run;
  const finished = board && (board.wins === TRIP_TARGET || board.log.length === TRIP_DATES);
  const rivals = board ? tripChoices(graph, board) : [];
  const target = pick && pick.raw === raw && rivals.includes(pick.to) ? pick.to : null;
  const write = (value: TripRun) => {
    const commit = () => {
      if (read() === raw) safeLocalStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new Event('dukb-road-trip'));
    };
    if (navigator.locks) void navigator.locks.request(key, commit).catch(commit);
    else commit();
    setPick(null);
  };
  const act = (to: string, call: TripAction['call']) => {
    if (run) write({ ...run, turns: [...run.turns, { to, call }] });
  };
  const chance = (to: string, boost: boolean) => Math.round(100 * tripOdds(sport, league, run!.team, to, boost)) + '%';
  const rulesText = <p>Win in three different rival territories in five dates. Each game moves you to that rival's territory, even on a loss. Your next opponent must share its border. A travel day uses one date to revisit an earlier stop and refill your supply. For example, win twice and you can spend date three returning to a stop with an easier opponent.</p>;

  return <Dialog open={open} onOpenChange={value => { setOpen(value); setChoosingTeam(false); setPick(null); setShowMap(false); }}>
    <DialogTrigger asChild><button ref={trigger} className="mb-3 flex w-full items-center gap-3 rounded-xl border border-primary/40 bg-card p-4 text-left hover:border-primary">
      <Route aria-hidden="true" className="h-6 w-6 shrink-0 text-primary" />
      <span className="min-w-0"><strong className="block">{finished ? 'Review road trip' : run ? 'Resume road trip' : 'Play road trip'}</strong>
      <span className="text-xs text-muted-foreground">Choose the next border. Bring home three road wins.</span></span>
    </button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto" onCloseAutoFocus={e => { e.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
      <DialogHeader><DialogTitle>{league.toUpperCase()} Road Trip</DialogTitle><DialogDescription>Three away wins. Five dates. One route across the map.</DialogDescription></DialogHeader>
      {!run || !board || choosingTeam ? <>
        <div className="space-y-2 text-sm">{rulesText}<p className="text-muted-foreground">{rules.hint}</p></div>
        <label className="grid gap-1 text-sm font-semibold">Home team
          <select value={team} onChange={e => setTeam(e.target.value)} className="w-full rounded-lg border bg-background p-3">{teams.map(id => <option value={id} key={id}>{name(id)}</option>)}</select>
        </label>
        <p className="text-xs text-muted-foreground">Teams with home territory can host a departure. This trip saves on this device.</p>
        <button className={primary} onClick={() => { write({ team, seed: Math.floor(Math.random() * 0x100000000), turns: [] }); setChoosingTeam(false); }}>Start road trip</button>
      </> : <>
        <section aria-label="Trip standings" aria-live="polite" className="rounded-xl border bg-muted/50 p-3">
          <p className="text-sm font-semibold">{name(run.team)} · {board.wins}/{TRIP_TARGET} road wins</p>
          <h3 className="font-display text-lg font-bold">{board.wins === TRIP_TARGET ? 'Road trip won' : finished ? 'End of the road' : 'Date ' + (board.log.length + 1) + ' of ' + TRIP_DATES}</h3>
          <p className="text-sm">Current stop: {name(board.at)} · {rules.resource}: {board.supply}/{rules.capacity}</p>
        </section>
        {board.log.length > 0 && <ol aria-label="Trip scorecard" className="space-y-1 text-sm">
          {board.log.map(({ action, won, score }, i) => <li key={i} className="rounded-lg border px-2 py-1.5"><strong>{i + 1}. {action.call === 'travel' ? 'Travel day' : won ? 'Win' : 'Loss'}</strong> · {name(action.to)} {score && '(' + score + ')'}{action.call !== 'travel' && <span className="block text-xs text-muted-foreground">{action.call === 'boost' ? rules.play : rules.normal}</span>}</li>)}
        </ol>}
        {!finished && (!target ? <>
          <h4 className="text-sm font-bold">Choose your next opponent</h4>
          {rivals.length === 0 && <p className="text-sm">You've played every rival on this border. Travel back to find another route.</p>}
          <div className="grid gap-2 sm:grid-cols-2">{rivals.map(to => {
            const next = tripChoices(graph, { ...board, at: to, stops: [...board.stops, to] }).length;
            return <button className={button + ' text-left'} key={to} onClick={() => setPick({ to, raw })}><strong>{name(to)}</strong><span className="block text-xs font-normal text-muted-foreground">{chance(to, false)} base win chance · {next} onward {next === 1 ? 'rival' : 'rivals'}</span></button>;
          })}</div>
          {board.stops.length > 1 && <details className="text-sm"><summary className="cursor-pointer py-2 font-semibold">Take a travel day</summary>
            <p className="mb-2 text-muted-foreground">Use this date to return to an earlier stop with a full supply.</p>
            <div className="flex flex-wrap gap-2">{board.stops.filter(id => id !== board.at).map(id => <button key={id} className={button} onClick={() => act(id, 'travel')}>Return to {name(id)}</button>)}</div>
          </details>}
        </> : <section className="grid gap-2" aria-label="Game plan">
          <h4 className="font-bold">Away at {name(target)}</h4><p className="text-sm text-muted-foreground">{rules.hint} Win chances top out at 97%.</p>
          <button className={button} onClick={() => act(target, 'regular')}>{rules.normal} · {chance(target, false)}</button>
          <button className={primary} disabled={!board.supply} onClick={() => act(target, 'boost')}>{rules.play} · {chance(target, true)}</button>
          <button className={button} onClick={() => setPick(null)}>Change destination</button>
        </section>)}
        {finished && <div className="grid gap-2 sm:grid-cols-2"><button className={primary} onClick={() => write({ ...run, turns: [] })}>Replay the same draw</button>
          <button className={button} onClick={() => { setTeam(run.team); setChoosingTeam(true); }}>New road trip</button></div>}
        <button className={button} aria-expanded={showMap} onClick={() => setShowMap(!showMap)}>{showMap ? 'Hide territory map' : 'View territory map'}</button>
        {showMap && <ConquestRegionMap sport={map} owners={sport.seed()} highlightTeam={target ?? board.at} showLegend={false} />}
        <details className="space-y-2 text-sm text-muted-foreground"><summary className="cursor-pointer py-1 font-semibold">Rules and example</summary>{rulesText}<p>{rules.hint}</p></details>
      </>}
      <button className={button} onClick={() => setOpen(false)}>Back to Conquest</button>
    </DialogContent>
  </Dialog>;
}
