import { useMemo, useState, useSyncExternalStore } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ConquestRegionMap from '@/components/conquest/ConquestRegionMap';
import { SOCCER_CLUB_MAP, SOCCER_CLUBS, SOCCER_CONQUEST_MAP, SOCCER_LEAGUE_OF, SOCCER_REGIONS } from '@/data/soccerConquest';
import { safeLocalStorage } from '@/lib/safeStorage';
import { contestFront, frontierBoard, FRONTIER_KEY, LAND_GOAL, MATCH_LIMIT, readFrontier, type FrontierRun } from '@/lib/soccerFrontier';

const changed = 'soccer-frontier-changed';
const read = () => safeLocalStorage.getItem(FRONTIER_KEY);
function subscribe(update: () => void) {
  const storage = (e: StorageEvent) => { if (!e.key || e.key === FRONTIER_KEY) update(); };
  window.addEventListener('storage', storage);
  window.addEventListener(changed, update);
  return () => { window.removeEventListener('storage', storage); window.removeEventListener(changed, update); };
}
const clubName = (id: string) => SOCCER_CLUB_MAP.get(id)!.name;
const button = 'rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted';
const primary = 'rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground';

export function SoccerFrontier() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const run = useMemo(() => readFrontier(raw), [raw]);
  const board = useMemo(() => run && frontierBoard(run), [run]);
  const previous = useMemo(() => run?.previous && frontierBoard({ ...run, games: run.previous }), [run]);
  const [open, setOpen] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [club, setClub] = useState(SOCCER_CLUBS[0].id);
  const [mapOpen, setMapOpen] = useState(false);

  const write = (next: FrontierRun) => {
    if (read() === raw) safeLocalStorage.setItem(FRONTIER_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(changed));
  };
  const start = () => {
    const draw = Math.floor(Math.random() * 0x100000000);
    write({ club, seed: draw === run?.seed ? (draw + 1) >>> 0 : draw, games: [] });
    setChoosing(false);
    setMapOpen(false);
  };

  return <>
    <div className="mb-3 text-center"><button className={button} onClick={() => { setChoosing(false); setOpen(true); }}>
      {board?.finished ? 'Review frontier campaign' : run ? 'Resume frontier campaign' : 'Play frontier campaign'}
    </button></div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Frontier campaign</DialogTitle>
          <DialogDescription>Capture {LAND_GOAL} extra regions in up to {MATCH_LIMIT} away matches. A defeat costs your entire empire.</DialogDescription>
        </DialogHeader>
        {(!run || !board || choosing) ? <>
          <label className="grid gap-1 text-sm font-semibold">Starting club
            <select className="w-full rounded-lg border border-border bg-background px-2 py-3" value={club} onChange={e => setClub(e.target.value)}>
              {Object.values(SOCCER_LEAGUE_OF).map(league => <optgroup key={league} label={league}>
                {SOCCER_CLUBS.filter(c => c.league === league).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>)}
            </select>
          </label>
          <button className={primary} onClick={start}>Start frontier campaign</button>
        </> : <>
          <div className="space-y-1 rounded-lg bg-muted p-3 text-sm" aria-live="polite">
            <h3 className="font-display text-lg font-bold">{clubName(run.club)}</h3>
            <p>{board.regions.length} regions held · {run.games.length} of {MATCH_LIMIT} matches played</p>
            <strong>{board.won ? 'Campaign won! Territory target reached.' : !board.regions.length ? 'Eliminated. Your empire was captured.'
              : board.finished ? 'Campaign over. Three matches played before reaching the target.' : 'Capture ' + (LAND_GOAL - board.gained) + ' more to win.'}</strong>
          </div>
          {previous && run.previous && <section aria-label="Previous run on this draw" className="rounded-lg border border-border p-2 text-sm">
            <h4 className="font-semibold">Previous run · {previous.won ? 'Campaign won' : previous.regions.length ? 'Out of matches' : 'Eliminated'}</h4>
            <p className="text-xs text-muted-foreground">{run.previous.map(g => clubName(g.home)).join(' → ')} · {previous.regions.length} regions held at the finish</p>
          </section>}
          {run.games.length > 0 && <ol aria-label="Campaign results" className="space-y-1 text-sm">
            {run.games.map((g, i) => <li key={i} className="rounded-lg border border-border p-2">
              <strong>Match {i + 1} · {g.winner === run.club ? 'Win' : 'Loss'} · {g.awayScore} to {g.homeScore}{g.overtime ? ' (decided on penalties)' : ''}</strong><br />
              {clubName(g.winner)} took {g.swing} {g.swing === 1 ? 'region' : 'regions'} from {clubName(g.winner === run.club ? g.home : run.club)}.
              <details>
                <summary className="cursor-pointer py-2 text-xs font-semibold">Territory after match {i + 1}</summary>
                <ul className="space-y-1 text-xs">{g.flipped.map(id => <li key={id}>
                  {SOCCER_REGIONS.find(r => r.id === id)?.name} · now held by {clubName(board.owners[id])}
                </li>)}</ul>
              </details>
            </li>)}
          </ol>}
          {!board.finished && <>
            <div className="text-sm">
              <h4 className="font-bold">{board.ferry ? 'Choose a ferry landing' : 'Choose a border rival'}</h4>
              <p className="text-muted-foreground">{board.ferry ? 'You have no land border. You can sail to one of the three closest empires on this map.' :
                'Win to take their land. New borders can put more rivals within reach.'}</p>
            </div>
            <div className="grid gap-2">{board.fronts.map(front => <button key={front.id}
              aria-label={'Challenge ' + clubName(front.id)} className="rounded-lg border border-border px-3 py-2 text-left hover:border-primary focus-visible:outline-primary"
              onClick={() => { const next = contestFront(run, front.id); if (next) write(next); }}>
              <span className="flex items-center justify-between gap-2 text-sm"><strong>{clubName(front.id)}</strong><span>{Math.round(front.chance * 100)}% win chance</span></span>
              <span className="text-xs text-muted-foreground">{front.regions} {front.regions === 1 ? 'region' : 'regions'} at stake · {front.opens} new {front.opens === 1 ? 'rival' : 'rivals'} within reach on a win</span>
            </button>)}</div>
          </>}
          <button className={button} aria-expanded={mapOpen} onClick={() => setMapOpen(!mapOpen)}>{mapOpen ? 'Hide territory map' : 'View territory map'}</button>
          {mapOpen && <ConquestRegionMap sport={SOCCER_CONQUEST_MAP} owners={board.owners} highlightTeam={run.club} showLegend={false} />}
          {board.finished && <>
            <button className={primary} onClick={() => {
              write({ club: run.club, seed: run.seed, previous: run.games, games: [] });
              setMapOpen(false);
            }}>Replay the same draw</button>
            <p className="text-xs text-muted-foreground">Same club and match rolls. Try a different border and compare your route.</p>
            <button className={button} onClick={() => { setClub(run.club); setChoosing(true); }}>Play another campaign</button>
          </>}
        </>}
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer py-1 font-semibold">Rules and example</summary>
          <p>Each turn offers up to three rivals bordering your land. The hosts defend with the same club strength and momentum as Soccer Conquest. Only your match moves the borders. Take a three-region empire and one more region wins the campaign. Running out of matches ends it. This campaign saves on this device and earns no daily points.</p>
        </details>
        <button className={button} onClick={() => setOpen(false)}>Back to Soccer Conquest</button>
      </DialogContent>
    </Dialog>
  </>;
}
