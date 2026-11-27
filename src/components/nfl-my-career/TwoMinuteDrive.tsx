import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { safeLocalStorage, safeSetItem } from '@/lib/safeStorage';
import { calls, defense, drives, driveStep, fieldGoalYards, fieldPosition, gameClock, kickoff, looks, plays, replayDrive, type Action, type DriveScenario } from '@/lib/twoMinuteDrive';

const button = 'min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold hover:border-primary focus-visible:ring-2 focus-visible:ring-primary';
type Card = { actions: Action[]; best: Action[] | null };
const key = (s: DriveScenario) => 'dukb-two-minute-v1:' + s.id;

function read(s: DriveScenario): Card {
  try {
    const data = JSON.parse(safeLocalStorage.getItem(key(s)) || '{}');
    return {
      actions: Array.isArray(data.actions) && replayDrive(s, data.actions) ? data.actions : [],
      best: Array.isArray(data.best) && replayDrive(s, data.best)?.verdict === 'win' ? data.best : null,
    };
  } catch { return { actions: [], best: null }; }
}

function DriveRoom({ scenario, onBack }: { scenario: DriveScenario; onBack: () => void }) {
  const [card, setCard] = useState(() => read(scenario));
  const [help, setHelp] = useState(false);
  const [saveNote, setSaveNote] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  const d = replayDrive(scenario, card.actions) ?? kickoff(scenario);
  const best = card.best && replayDrive(scenario, card.best);
  function commit(actions: Action[]) {
    const stored = read(scenario);
    if (JSON.stringify(stored.actions) !== JSON.stringify(card.actions) && !saveNote.startsWith('This visit')) {
      setCard(stored);
      setSaveNote('This drive changed in another tab. Its latest play is on the field.');
      return;
    }
    const next = replayDrive(scenario, actions);
    if (!next) return;
    let bestActions = stored.best ?? card.best;
    const priorBest = bestActions && replayDrive(scenario, bestActions);
    if (next.verdict === 'win' && (!priorBest || next.seconds > priorBest.seconds)) bestActions = actions;
    const update = { actions, best: bestActions };
    setCard(update);
    setSaveNote(safeSetItem(key(scenario), JSON.stringify(update)) ? '' : 'This visit keeps your drive. Browser storage is unavailable.');
  }
  const snap = (action: Action) => { if (driveStep(scenario, d, action)) commit([...card.actions, action]); };
  const down = ['1st', '2nd', '3rd', '4th'][d.down - 1];
  const distance = d.line === 100 ? 'goal' : d.line - d.spot;

  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <button type="button" className={button} onClick={onBack}>All drives</button>
      <button type="button" aria-label="Drive rules" aria-expanded={help} className={button} onClick={() => setHelp(!help)}>?</button>
    </div>
    {help && <DriveRules />}
    <h3 ref={heading} tabIndex={-1} className="text-xl font-black">{scenario.name}</h3>
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <strong className="font-mono text-2xl tabular-nums">{gameClock(d.seconds)}</strong>
        <span className="text-sm">Down {scenario.deficit} points at kickoff</span>
        <span className="text-sm">{d.timeouts} {d.timeouts === 1 ? 'timeout' : 'timeouts'}</span>
      </div>
      <div aria-hidden="true" className="relative my-2 h-14 overflow-hidden rounded-md border-2 border-emerald-200/80 bg-emerald-900">
        <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0, transparent calc(10% - 1px), #86b8a0 calc(10% - 1px), #86b8a0 10%)' }} />
        <span className="absolute inset-y-0 w-1 -translate-x-1/2 bg-yellow-300" style={{ left: 'min(calc(100% - 2px), ' + d.line + '%)' }} />
        <span className="absolute inset-y-0 w-0.5 bg-white motion-safe:transition-[left]" style={{ left: 'clamp(0.6rem, ' + d.spot + '%, calc(100% - 0.6rem))' }}>
          <span className="absolute top-1/2 h-3 w-5 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-[70%] border-2 border-white bg-amber-800" />
        </span>
      </div>
      <p className="text-sm font-semibold">{fieldPosition(d.spot)}{!d.verdict && ' · ' + down + ' and ' + distance + ' · ' + (d.running ? 'Clock running' : 'Clock stopped')}</p>
    </div>
    {d.recap && <p className="rounded-lg border-l-4 border-primary bg-muted p-2 text-sm" role="status">{d.recap}</p>}
    {d.verdict ? <section className="space-y-2">
      <h4 className="text-lg font-black">{d.verdict === 'win' ? 'Drive won' : d.verdict === 'tie' ? 'Overtime forced' : 'Drive lost'}</h4>
      {best && <p className="text-sm">Best win with {gameClock(best.seconds)} left.</p>}
      <button className={button} type="button" onClick={() => commit([])}>Replay this drive</button>
    </section> : <>
      <div><h4 className="font-bold">Pre-snap read</h4><p className="text-sm">{looks[defense(scenario, d)]}</p>
        {d.repeats >= 2 && <p className="text-xs text-muted-foreground">They adjusted after two calls of the same play.</p>}</div>
      <div className="grid grid-cols-2 gap-2">{calls.map(call => <button type="button" key={call} className={button + ' text-left'} onClick={() => snap(call)}>
        <span className="block">{plays[call].name}</span><span className="block text-xs font-normal text-muted-foreground">{plays[call].cue} {plays[call].time}s.</span>
      </button>)}</div>
      {d.running && <div><p className="mb-1 text-xs">Eight seconds to line up. A spike takes three seconds and a down.</p>
        <div className="flex flex-wrap gap-2">{d.timeouts > 0 && <button className={button} type="button" onClick={() => snap('timeout')}>Call timeout</button>}
          <button className={button} type="button" onClick={() => snap('spike')}>Spike the ball</button></div></div>}
      {fieldGoalYards(d) <= 55 && <button className={button} type="button" onClick={() => snap('kick')}>Kick from {fieldGoalYards(d)} yards for {scenario.deficit > 3 ? 'three points' : scenario.deficit === 3 ? 'overtime' : 'the win'}</button>}
    </>}
    {saveNote && <p role="status" className="text-xs">{saveNote}</p>}
  </div>;
}

function DriveRules() {
  return <div className="space-y-1 rounded-lg bg-muted p-3 text-sm">
    <p>You get one possession. Reach the end zone, or kick if three points will do. Your kicker makes it from 55 yards or closer. A score ends the challenge.</p>
    <p>Read the defense before each snap. For example, a slip screen gains 18 yards against a blitz but stays in bounds. Spend a timeout if you need those eight seconds back on the next snap.</p>
    <p>Gain ten for a fresh set of downs. A play snapped before zero can finish. Each drive keeps your win with the most time left.</p>
  </div>;
}

export function TwoMinuteDriveBoard() {
  const [scenario, setScenario] = useState<DriveScenario | null>(null);
  const returnTo = useRef<string | null>(null);
  useEffect(() => {
    if (!scenario && returnTo.current) {
      document.getElementById('two-minute-' + returnTo.current)?.focus({ preventScroll: true });
      returnTo.current = null;
    }
  }, [scenario]);
  if (scenario) return <DriveRoom key={scenario.id} scenario={scenario} onBack={() => { returnTo.current = scenario.id; setScenario(null); }} />;
  return <div className="space-y-3">
    <DriveRules />
    <div className="grid gap-2">{drives.map(s => {
      const card = read(s), last = replayDrive(s, card.actions);
      return <button type="button" id={'two-minute-' + s.id} className={button + ' text-left'} key={s.id} onClick={() => setScenario(s)}>
        <span className="flex items-baseline justify-between gap-2"><strong>{s.name}</strong><span className="font-mono">{gameClock(s.seconds)}</span></span>
        <span className="block text-xs font-normal">{fieldPosition(s.spot)} · Down {s.deficit} · {s.timeouts} {s.timeouts === 1 ? 'timeout' : 'timeouts'}{card.best ? ' · Won' : ''}{card.actions.length && !last?.verdict ? ' · Resume' : ''}</span>
      </button>;
    })}</div>
  </div>;
}

export default function TwoMinuteDrive() {
  return <Dialog>
    <DialogTrigger asChild><button type="button" className="mb-3 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2 text-left hover:border-primary">
      <span><strong className="block text-sm">Two-Minute Drive</strong><span className="block text-xs text-muted-foreground">Call the final possession in four clock challenges.</span></span><span aria-hidden="true">→</span>
    </button></DialogTrigger>
    <DialogContent className="max-h-[88dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl p-4 sm:p-5">
      <DialogTitle className="pr-10">Two-Minute Drive</DialogTitle>
      <DialogDescription>Win a drive with a touchdown or a field goal. Practice saves separately from your career.</DialogDescription>
      <TwoMinuteDriveBoard />
    </DialogContent>
  </Dialog>;
}
