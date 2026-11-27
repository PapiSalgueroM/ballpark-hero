import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { TicketCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { safeLocalStorage } from '@/lib/safeStorage';
import {
  arrivals,
  gateFixtures,
  gateForecast,
  gateKey,
  gateNames,
  gateStep,
  neighbor,
  readGateRun,
  type GateCall,
  type GateMove,
  type GateRun,
} from '@/lib/stadiumGateControl';

const read = () => safeLocalStorage.getItem(gateKey);
function subscribe(update: () => void) {
  window.addEventListener('storage', update);
  window.addEventListener(gateKey, update);
  return () => {
    window.removeEventListener('storage', update);
    window.removeEventListener(gateKey, update);
  };
}
const button =
  'min-h-11 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:border-primary focus-visible:outline-primary';
const primary = button + ' bg-primary text-primary-foreground';
const sides = [
  'col-start-2 row-start-1',
  'col-start-3 row-start-2',
  'col-start-2 row-start-3',
  'col-start-1 row-start-2',
];
const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function WaveList({ draw, night }: { draw: number; night: number }) {
  return (
    <table className="w-full text-center text-xs tabular-nums">
      <caption className="pb-1 text-left font-semibold">{gateFixtures[night].name} arrivals</caption>
      <thead>
        <tr>
          {['Wave', ...gateNames].map(s => (
            <th key={s} scope="col" className="py-1">
              {s}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {gateFixtures[night].waves.map((_, i) => (
          <tr key={i} className="border-t">
            <th scope="row" className="py-1">
              {i + 1}
            </th>
            {arrivals(draw, night, i).map((n, j) => (
              <td key={j}>{n}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
const rules = (
  <div className="space-y-2 text-sm text-muted-foreground">
    <p>
      Seat the target crowd at three home fixtures. Fans arrive in four waves per match. Each gate normally admits
      four people a wave. Anyone left in line waits there until the next wave. At kickoff the gates close.
    </p>
    <p>
      Tap a gate. Add a scanner there for three extra admissions, or send up to four waiting fans above that gate's
      capacity to a neighboring gate before it scans. With ten at North and nobody at East, scanning at North seats
      seven. Directing four East seats eight.
    </p>
    <p>
      Between matches, fit one permanent turnstile for one more admission per wave at that gate. Once per season,
      you can hold kickoff on wave four to seat up to two extra people at each gate.
    </p>
  </div>
);

export default function StadiumGateControl() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const saved = useMemo(() => readGateRun(raw), [raw]);
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<{ raw: string | null; gate: number; call: GateCall; late: boolean } | null>(
    null,
  );
  const trigger = useRef<HTMLButtonElement>(null);
  const stage = useRef<HTMLHeadingElement>(null);
  const state = saved?.state,
    run = saved?.run;
  const selected = plan && plan.raw === raw ? plan : { raw, gate: 0, call: 'scan' as GateCall, late: false };
  const quote =
    state?.phase === 'wave' && run
      ? gateForecast(run.draw, state, selected.gate, selected.call, selected.late)
      : null;
  const contracts = state?.receipts.filter(row => row.seated >= row.target).length ?? 0;
  useEffect(() => {
    if (open) stage.current?.focus({ preventScroll: true });
  }, [open, raw]);
  const store = (next: GateRun) => {
    const commit = () => {
      if (read() === raw) safeLocalStorage.setItem(gateKey, JSON.stringify(next));
      window.dispatchEvent(new Event(gateKey));
    };
    if (navigator.locks) void navigator.locks.request(gateKey, commit).catch(commit);
    else commit();
  };
  const act = (move: GateMove) => {
    if (state && run && gateStep(run.draw, state, move)) store({ ...run, moves: [...run.moves, move] });
  };
  const fresh = () =>
    store({
      draw: run ? (run.draw + 1 + Math.floor(Math.random() * 63)) % 64 : Math.floor(Math.random() * 64),
      moves: [],
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          ref={trigger}
          type="button"
          className={button + ' my-3 flex w-full items-center gap-3 bg-muted/40 text-left'}
        >
          <TicketCheck className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong className="block">
              {state?.phase === 'done' ? 'Review Gate Control' : run ? 'Resume Gate Control' : 'Play Gate Control'}
            </strong>
            <span className="block text-xs font-normal text-muted-foreground">
              Run four entrances through the rush before kickoff.
            </span>
          </span>
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto rounded-xl p-4 sm:p-5"
        onCloseAutoFocus={e => {
          e.preventDefault();
          trigger.current?.focus({ preventScroll: true });
        }}
      >
        <DialogHeader>
          <DialogTitle>Gate Control</DialogTitle>
          <DialogDescription>
            Three home matches. Four entrances. Get the crowd in before kickoff.
          </DialogDescription>
        </DialogHeader>
        {!state || !run ? (
          <>
            {rules}
            <button className={primary} onClick={fresh}>
              Open the turnstiles
            </button>
          </>
        ) : (
          <>
            <div className="rounded-xl border bg-muted/40 p-3" aria-live="polite">
              <h3 ref={stage} tabIndex={-1} className="font-display text-lg font-bold">
                {state.phase === 'done'
                  ? 'Season complete'
                  : state.phase === 'build'
                    ? 'Between matches'
                    : gateFixtures[state.night].name + ' · Wave ' + (state.wave + 1) + ' of 4'}
              </h3>
              <p className="text-sm tabular-nums">
                {state.phase === 'wave'
                  ? state.seated + ' seated · target ' + gateFixtures[state.night].target
                  : contracts + ' of 3 crowd targets met'}{' '}
                · {state.usedLate ? 'Kickoff hold spent' : 'One kickoff hold available'}
              </p>
              {state.last && (
                <p
                  key={run.moves.length}
                  className="mt-1 text-xs text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1"
                >
                  {gateNames[state.last.gate]}{' '}
                  {state.last.call === 'scan'
                    ? 'scanner'
                    : 'sign to ' + gateNames[neighbor(state.last.gate, state.last.call)]}
                  {state.last.call !== 'scan' && ' moved ' + state.last.diverted} · {state.last.admitted} admitted
                  that wave{state.last.lateFans > 0 && ', including ' + state.last.lateFans + ' during the hold'}.
                </p>
              )}
            </div>
            {quote && (
              <>
                <div
                  role="group"
                  aria-label="Stadium gates"
                  data-game-play-area
                  className="relative grid grid-cols-3 grid-rows-3 gap-1 rounded-xl border border-emerald-700/50 bg-emerald-950 p-2 text-white"
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none relative col-start-2 row-start-2 mx-1 rounded border border-white/60 bg-emerald-800"
                  >
                    <span className="absolute inset-y-0 left-1/2 border-l border-white/50" />
                    <span className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60" />
                  </div>
                  {gateNames.map((name, i) => (
                    <button
                      key={name}
                      aria-label={name + ' gate'}
                      aria-pressed={selected.gate === i}
                      onClick={() => setPlan({ ...selected, gate: i })}
                      className={
                        sides[i] +
                        ' min-h-14 rounded-lg border px-1 text-center text-xs focus-visible:outline-white ' +
                        (selected.gate === i
                          ? 'border-amber-300 bg-amber-100 text-amber-950'
                          : 'border-emerald-600 bg-emerald-900 text-white')
                      }
                    >
                      <strong className="block">{name}</strong>
                      <span className="block tabular-nums">{quote.waiting[i]} waiting</span>
                      <span className="block text-[10px]">Scans {state.capacity[i]}</span>
                      <span
                        aria-hidden="true"
                        className="mx-auto mb-1 mt-0.5 block h-1 w-3/4 overflow-hidden rounded-full bg-black/25"
                      >
                        <span
                          className="block h-full origin-left bg-current motion-safe:transition-transform"
                          style={{
                            transform: 'scaleX(' + Math.min(1, quote.waiting[i] / state.capacity[i]) + ')',
                          }}
                        />
                      </span>
                    </button>
                  ))}
                </div>
                <fieldset className="grid gap-1">
                  <legend className="mb-1 text-sm font-bold">Crew at {gateNames[selected.gate]}</legend>
                  {(['scan', 'left', 'right'] as const).map(call => (
                    <button
                      type="button"
                      key={call}
                      aria-pressed={selected.call === call}
                      onClick={() => setPlan({ ...selected, call })}
                      className={
                        button + ' text-left ' + (selected.call === call ? 'border-primary bg-primary/10' : '')
                      }
                    >
                      {call === 'scan'
                        ? 'Add scanner here'
                        : 'Send overflow to ' + gateNames[neighbor(selected.gate, call)]}
                    </button>
                  ))}
                </fieldset>
                {state.wave === 3 && !state.usedLate && (
                  <label className="flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.late}
                      onChange={e => setPlan({ ...selected, late: e.target.checked })}
                    />
                    Hold kickoff this match
                  </label>
                )}
                <p className="text-sm" aria-live="polite">
                  <strong>{quote.admitted} would get in.</strong>{' '}
                  {quote.queue.map((n, i) => gateNames[i] + ' ' + n).join(' · ')}{' '}
                  {state.wave === 3 ? 'left outside at kickoff.' : 'left in line.'}
                </p>
                <button
                  className={primary}
                  onClick={() => act({ gate: selected.gate, call: selected.call, late: selected.late })}
                >
                  Run wave {state.wave + 1}
                </button>
                <details className="text-sm">
                  <summary className="min-h-11 cursor-pointer py-2 font-semibold">Arrival schedule</summary>
                  <WaveList draw={run.draw} night={state.night} />
                </details>
              </>
            )}
            {state.phase === 'build' && (
              <>
                <p className="text-sm">
                  Fit a permanent turnstile before the {gateFixtures[state.night + 1].name.toLowerCase()}. Check
                  where the next crowds arrive first.
                </p>
                <WaveList draw={run.draw} night={state.night + 1} />
                <div className="grid grid-cols-2 gap-2">
                  {gateNames.map((name, i) => (
                    <button key={i} className={button} onClick={() => act({ upgrade: i })}>
                      Upgrade {name}
                      <span className="block text-xs font-normal">
                        {state.capacity[i]} to {state.capacity[i] + 1} per wave
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {state.receipts.length > 0 && (
              <ol aria-label="Matchday receipts" className="space-y-1 text-sm">
                {state.receipts.map((row, i) => (
                  <li key={i} className="rounded-lg border p-2">
                    <strong>
                      {gateFixtures[i].name} · {row.seated >= row.target ? 'Target met' : 'Missed target'}
                    </strong>
                    <br />
                    {row.seated} seated of {row.target} needed · {total(row.queue)} left outside
                  </li>
                ))}
              </ol>
            )}
            {state.phase === 'done' && (
              <div className="grid gap-2 sm:grid-cols-2">
                <button className={primary} onClick={() => store({ draw: run.draw, moves: [] })}>
                  Replay this schedule
                </button>
                <button className={button} onClick={fresh}>
                  Draw a new schedule
                </button>
              </div>
            )}
            <details className="text-sm">
              <summary className="min-h-11 cursor-pointer py-2 font-semibold">Rules and example</summary>
              {rules}
            </details>
          </>
        )}
        <button className={button} onClick={() => setOpen(false)}>
          Back to Matchday Director
        </button>
      </DialogContent>
    </Dialog>
  );
}
