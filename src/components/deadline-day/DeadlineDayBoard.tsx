import { useState } from 'react';
import { CalendarDays, ChevronLeft, Clock, RotateCcw, Shuffle } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { Input } from '@/components/ui/input';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { useDeadlineDay } from '@/hooks/useDeadlineDay';
import { hotSeatLeagues, hotSeatPool } from '@/lib/managerHotSeat';
import { money } from '@/lib/clubManager';
import { MAX_TERMS_YEARS, MIN_TERMS_YEARS, termsVerdict } from '@/lib/clubManagerDeals';
import { cn } from '@/lib/utils';
import {
  BUDGET_POINTS,
  DEADLINE_HOURS,
  NEEDS_POINTS,
  VALUE_POINTS,
  bidMeter,
  clockLabel,
  deskRead,
  hoursLeft,
  rivalOn,
  shareText,
  slotWord,
  termsMeter,
  termsWanted,
  type DealStatus,
  type DeadlineRun,
  type DeadlineTarget,
} from '@/lib/deadlineDay';

type Hook = ReturnType<typeof useDeadlineDay>;
type View = { kind: 'desk' } | { kind: 'deal'; i: number } | { kind: 'sales' };

const STATUS: Record<DealStatus, { label: string; tint: string }> = {
  idle: { label: 'On the list', tint: 'bg-muted text-muted-foreground' },
  talks: { label: 'In talks', tint: 'bg-amber-500/20 text-amber-700 dark:text-amber-300' },
  terms: { label: 'Terms', tint: 'bg-sky-500/20 text-sky-700 dark:text-sky-300' },
  signed: { label: 'Signed', tint: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
  gone: { label: 'Gone', tint: 'bg-red-500/20 text-red-700 dark:text-red-300' },
  collapsed: { label: 'Collapsed', tint: 'bg-red-500/20 text-red-700 dark:text-red-300' },
  walked: { label: 'Walked away', tint: 'bg-muted text-muted-foreground' },
};

const LIVE: DealStatus[] = ['idle', 'talks', 'terms'];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function Dots({ left, of }: { left: number; of: number }) {
  return (
    <span className="tracking-widest text-muted-foreground" aria-label={`${left} of ${of} left`}>
      {'●'.repeat(Math.max(0, left))}{'○'.repeat(Math.max(0, of - left))}
    </span>
  );
}

function Strip({ run }: { run: DeadlineRun }) {
  const filled = new Set(run.targets.filter(t => t.status === 'signed').map(t => t.need)).size;
  const left = hoursLeft(run);
  return (
    <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-card p-3 text-center" data-testid="deadline-strip">
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Clock</div>
        <div className="text-lg font-bold tabular-nums">{clockLabel(run.hour)}</div>
        <div className={cn('text-[11px]', left <= 3 ? 'font-semibold text-red-600 dark:text-red-400' : 'text-muted-foreground')}>{left} hour{left === 1 ? '' : 's'} left</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Budget</div>
        <div className="text-lg font-bold tabular-nums">{money(run.state.budget)}</div>
        <div className="text-[11px] text-muted-foreground">of {money(run.startBudget)}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Needs</div>
        <div className="text-lg font-bold tabular-nums">{filled} of {run.needs.length}</div>
        <div className="text-[11px] text-muted-foreground">filled</div>
      </div>
    </div>
  );
}

/** The one line a tile says about where a deal stands. */
function tileLine(run: DeadlineRun, t: DeadlineTarget, i: number): string {
  if (t.status === 'idle') {
    const d = deskRead(run, i);
    return d ? (d.exact ? `Desk: worth ${money(d.low)}` : `Desk: worth ${money(d.low)} to ${money(d.high)}`) : '';
  }
  if (t.status === 'talks' && t.neg) return `They want ${money(t.neg.theirAsk)}`;
  if (t.status === 'terms' && t.neg) return `Fee agreed at ${money(t.neg.agreedFee ?? 0)}, now his agent`;
  if (t.status === 'signed') return `Signed for ${money(t.fee ?? 0)}`;
  if (t.status === 'gone') return `Signed by ${t.lostTo ?? 'a rival'}`;
  return t.note;
}

function Desk({ run, onOpen, onSales, hook }: { run: DeadlineRun; onOpen: (i: number) => void; onSales: () => void; hook: Hook }) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const salesOpen = run.sales.filter(s => !s.done).length;
  return (
    <div className="space-y-3" data-testid="deadline-desk">
      {run.needs.map((need, ni) => {
        const filledBy = run.targets.find(t => t.need === ni && t.status === 'signed');
        return (
          <div key={ni} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-semibold capitalize">{slotWord(need.label)}</div>
              <div className="text-[11px] text-muted-foreground">{filledBy ? `Filled by ${filledBy.mp.name}` : `Needs a ${need.min} or better`}</div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {need.incumbent ? `Starting now: ${need.incumbent} (${need.incumbentRating})` : 'Nobody starts there now'}
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {run.targets.map((t, i) => {
                if (t.need !== ni) return null;
                const rival = LIVE.includes(t.status) ? rivalOn(t) : null;
                return (
                  <button key={t.mp.name} type="button" onClick={() => onOpen(i)} data-testid="deadline-target"
                    className={cn('min-h-[64px] rounded-md border px-2 py-2 text-left text-sm', LIVE.includes(t.status) ? 'border-border hover:border-primary' : 'border-border/50 opacity-80')}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-semibold">{t.mp.name}</span>
                      <span className="shrink-0 rounded bg-muted px-1 text-xs font-bold tabular-nums">{t.mp.rating}</span>
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">{t.mp.position}, {t.mp.age}, {t.mp.club}</div>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', STATUS[t.status].tint)}>{STATUS[t.status].label}</span>
                      {rival && <span className="truncate text-[10px] font-semibold text-red-600 dark:text-red-400">{rival.club} in</span>}
                    </div>
                    <div className="mt-1 truncate text-[11px] text-muted-foreground">{tileLine(run, t, i)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {run.sales.length > 0 && (
        <button type="button" onClick={onSales} className="flex min-h-[48px] w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left text-sm">
          <span className="font-semibold">Sell to raise money</span>
          <span className="text-xs text-muted-foreground">{salesOpen} offer{salesOpen === 1 ? '' : 's'} on the table</span>
        </button>
      )}

      <div className="rounded-lg border border-border bg-card p-3" data-testid="deadline-ticker">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary">The wire</div>
        <ul className="space-y-1 text-xs">
          {run.ticker.slice(0, 5).map((line, k) => (
            <li key={`${line.hour}-${k}`}><span className="tabular-nums text-muted-foreground">{clockLabel(line.hour)}</span> {line.text}</li>
          ))}
        </ul>
      </div>

      {confirmEnd ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-3 text-sm">
          <p>Shut the window now? Anything still in talks or at the terms table collapses.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirmEnd(false)} className="min-h-[44px] rounded-md border border-border px-3 py-2 font-semibold">Keep working</button>
            <button type="button" onClick={hook.finish} className="min-h-[44px] rounded-md bg-red-600 px-3 py-2 font-semibold text-white">Shut it</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirmEnd(true)} className="min-h-[44px] w-full rounded-md border border-border px-3 py-2 text-sm font-semibold text-muted-foreground">
          I am done, shut the window
        </button>
      )}
    </div>
  );
}

function FeeTable({ run, i, hook }: { run: DeadlineRun; i: number; hook: Hook }) {
  const t = run.targets[i];
  const neg = t.neg!;
  const rival = rivalOn(t);
  const desk = deskRead(run, i);
  const [text, setText] = useState('');
  const amt = Math.max(0, round1(parseFloat(text) || 0));
  const meter = amt > 0 ? bidMeter(run, i, amt) : null;
  const behind = !!rival && amt > 0 && amt <= rival.offer;
  const tooBig = amt > run.state.budget;
  const say = amt <= 0 ? 'Type a bid'
    : tooBig ? 'More than your budget'
    : behind ? `${rival!.club} are still ahead`
    : meter?.verdict === 'agreed' ? 'They will take this'
    : meter?.verdict === 'walkout' ? 'They will end the talks'
    : meter?.verdict === 'insulted' ? 'They will be insulted'
    : `${meter?.closeness ?? 0} of 100`;
  const bar = behind || tooBig || meter?.verdict === 'walkout' ? 'bg-red-500'
    : meter?.verdict === 'agreed' ? 'bg-emerald-500'
    : meter?.verdict === 'insulted' ? 'bg-amber-500' : 'bg-primary';
  const chip = (label: string, v: number) => (
    <button key={label} type="button" onClick={() => setText(String(round1(v)))}
      className="min-h-[40px] rounded-md border border-border px-2 py-1 text-xs font-semibold hover:border-primary">
      {label} {money(round1(v))}
    </button>
  );
  return (
    <div className="space-y-3" data-testid="deadline-fee-table">
      <div className="flex items-center justify-between text-sm">
        <span>Their ask: <span className="font-bold">{money(neg.theirAsk)}</span>{neg.myOffer !== null && <span className="text-muted-foreground">, your last {money(neg.myOffer)}</span>}</span>
        <span className="text-xs" title="Rounds they will keep talking. Every bid costs one, an insult costs two."><Dots left={neg.patience} of={5} /></span>
      </div>
      {desk && <div className="text-xs text-muted-foreground">Your desk says he is worth {desk.exact ? money(desk.low) : `${money(desk.low)} to ${money(desk.high)}`}.</div>}
      {rival && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {rival.club} are in at {money(rival.offer)}. Beat it or they close.
        </div>
      )}
      {neg.note && <p className="text-xs italic text-muted-foreground">"{neg.note}"</p>}
      <div className="space-y-1.5 rounded-md bg-muted p-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wide text-muted-foreground">How close you are</span>
          <span className="font-bold">{say}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-background" role="presentation">
          <div className={cn('h-full rounded-full', bar)} style={{ width: `${amt <= 0 ? 0 : Math.max(3, meter?.closeness ?? 0)}%` }} />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="deadline-bid" className="w-14 shrink-0 text-xs font-semibold text-muted-foreground">Your bid</label>
          <Input id="deadline-bid" type="number" inputMode="decimal" min={0} step={0.5} value={text} onChange={e => setText(e.target.value)}
            placeholder={String(round1(neg.theirAsk))} aria-label="Your bid in millions" className="h-10 flex-1" />
          <span className="text-xs text-muted-foreground">m</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {chip('Lowball', neg.theirAsk * 0.8)}
          {chip('Haggle', neg.theirAsk * 0.9)}
          {rival ? chip('Beat them', Math.max(rival.offer + 0.1, neg.theirAsk * 0.97)) : chip('Meet the ask', neg.theirAsk)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => hook.walk(i)} className="min-h-[48px] rounded-md border border-border px-3 py-2 text-sm font-semibold">Walk away</button>
        <button type="button" disabled={amt <= 0 || tooBig} onClick={() => { hook.bid(i, amt); setText(''); }}
          className="min-h-[48px] rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          Bid {amt > 0 ? money(amt) : ''} (1 hour)
        </button>
      </div>
    </div>
  );
}

function TermsTable({ run, i, hook }: { run: DeadlineRun; i: number; hook: Hook }) {
  const t = run.targets[i];
  const want = termsWanted(run, i)!;
  const fee = t.neg?.agreedFee ?? 0;
  const [years, setYears] = useState(want.years);
  const [wageText, setWageText] = useState(String(want.wage));
  const [bonusText, setBonusText] = useState(String(want.bonus));
  const wage = Math.max(1, Math.round(parseFloat(wageText) || 0));
  const bonus = Math.max(0, round1(parseFloat(bonusText) || 0));
  const offer = { years, wage, bonus, role: want.role };
  const close = termsMeter(run, i, offer) ?? 0;
  const verdict = termsVerdict(want, offer);
  const room = round1(run.state.budget - fee);
  const tooBig = bonus > room;
  const full = run.state.squad.length >= 30;
  const say = tooBig ? 'The bonus is more than you have'
    : verdict === 'agreed' ? 'He will sign this'
    : verdict === 'walkout' ? 'His agent will walk'
    : verdict === 'insulted' ? 'His agent will be insulted'
    : `${close} of 100`;
  return (
    <div className="space-y-3" data-testid="deadline-terms-table">
      <div className="flex items-center justify-between text-sm">
        <span>Fee agreed: <span className="font-bold">{money(fee)}</span></span>
        <span className="text-xs" title="Offers his agent will hear before walking."><Dots left={t.neg?.terms?.patience ?? 0} of={3} /></span>
      </div>
      <div className="rounded-md bg-muted px-2 py-1.5 text-xs">
        His agent wants <span className="font-semibold">{want.years} years at {want.wage}k a week</span> and a <span className="font-semibold">{money(want.bonus)}</span> signing bonus. The bonus comes out of the same budget as the fee.
      </div>
      {t.rival && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {t.rival.club} have put an offer to his agent. Leave him an hour and they could close.
        </div>
      )}
      {t.neg?.terms?.note && <p className="text-xs italic text-muted-foreground">"{t.neg.terms.note}"</p>}
      <div className="space-y-2 rounded-md bg-muted p-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wide text-muted-foreground">How close you are</span>
          <span className="font-bold">{say}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-background" role="presentation">
          <div className={cn('h-full rounded-full', tooBig || verdict === 'walkout' ? 'bg-red-500' : verdict === 'agreed' ? 'bg-emerald-500' : verdict === 'insulted' ? 'bg-amber-500' : 'bg-primary')}
            style={{ width: `${Math.max(3, close)}%` }} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-14 shrink-0 text-xs font-semibold text-muted-foreground">Length</span>
          {Array.from({ length: MAX_TERMS_YEARS - MIN_TERMS_YEARS + 1 }, (_, k) => MIN_TERMS_YEARS + k).map(y => (
            <button key={y} type="button" aria-pressed={years === y} onClick={() => setYears(y)}
              className={cn('min-h-[36px] min-w-[40px] rounded-md border px-2 text-xs font-semibold', years === y ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>
              {y}y
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="deadline-wage" className="w-14 shrink-0 text-xs font-semibold text-muted-foreground">Wage</label>
          <Input id="deadline-wage" type="number" inputMode="numeric" min={1} step={5} value={wageText} onChange={e => setWageText(e.target.value)} className="h-10 flex-1" />
          <span className="text-xs text-muted-foreground">k a week</span>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="deadline-bonus" className="w-14 shrink-0 text-xs font-semibold text-muted-foreground">Bonus</label>
          <Input id="deadline-bonus" type="number" inputMode="decimal" min={0} step={0.1} value={bonusText} onChange={e => setBonusText(e.target.value)} className="h-10 flex-1" />
          <span className="text-xs text-muted-foreground">m, {money(Math.max(0, room))} spare</span>
        </div>
        {full && <div className="text-xs text-red-600 dark:text-red-400">The squad is full at 30. Sell someone first.</div>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => hook.walk(i)} className="min-h-[48px] rounded-md border border-border px-3 py-2 text-sm font-semibold">Walk away</button>
        <button type="button" disabled={tooBig || full} onClick={() => hook.terms(i, { wage, years, bonus })}
          className="min-h-[48px] rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          Offer terms (1 hour)
        </button>
      </div>
    </div>
  );
}

function Deal({ run, i, hook, onBack }: { run: DeadlineRun; i: number; hook: Hook; onBack: () => void }) {
  const t = run.targets[i];
  const need = run.needs[t.need];
  const desk = deskRead(run, i);
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4" data-testid="deadline-deal">
      <button type="button" onClick={onBack} className="inline-flex min-h-[40px] items-center gap-1 rounded-md px-2 text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" />Back to the desk</button>
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xl font-bold">{t.mp.name}</div>
          <span className="rounded bg-muted px-2 py-0.5 text-sm font-bold tabular-nums">{t.mp.rating}</span>
        </div>
        <div className="text-xs text-muted-foreground">{t.mp.position}, age {t.mp.age}, at {t.mp.club}. For the {slotWord(need.label)} need ({need.min} or better).</div>
        <span className={cn('mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold', STATUS[t.status].tint)}>{STATUS[t.status].label}</span>
      </div>
      {t.note && <p className="text-sm">{t.note}</p>}

      {t.status === 'idle' && (
        <div className="space-y-2">
          {desk && <div className="text-sm text-muted-foreground">Your desk says he is worth {desk.exact ? money(desk.low) : `${money(desk.low)} to ${money(desk.high)}`}. Listed at {money(t.mp.price)}.</div>}
          <button type="button" onClick={() => hook.callClub(i)} className="min-h-[48px] w-full rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">
            Call {t.mp.club} (free)
          </button>
        </div>
      )}
      {t.status === 'talks' && t.neg && <FeeTable key={`fee-${i}-${t.neg.stage}`} run={run} i={i} hook={hook} />}
      {t.status === 'terms' && t.neg?.terms && <TermsTable key={`terms-${i}-${t.neg.terms.patience}`} run={run} i={i} hook={hook} />}
    </div>
  );
}

function Sales({ run, hook, onBack }: { run: DeadlineRun; hook: Hook; onBack: () => void }) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4" data-testid="deadline-sales">
      <button type="button" onClick={onBack} className="inline-flex min-h-[40px] items-center gap-1 rounded-md px-2 text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" />Back to the desk</button>
      <div>
        <div className="text-lg font-bold">Offers for your bench</div>
        <p className="text-xs text-muted-foreground">Clubs will take these men off your hands today at a deadline day price. Every sale takes an hour and the money goes straight into the budget.</p>
      </div>
      <div className="space-y-2">
        {run.sales.map((s, k) => (
          <div key={s.playerId} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{s.name} <span className="font-normal text-muted-foreground">{s.position}, {s.rating}, age {s.age}</span></div>
              <div className="truncate text-xs text-muted-foreground">{s.club} offer {money(s.offer)}</div>
            </div>
            {s.done ? (
              <span className="shrink-0 rounded bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Sold</span>
            ) : (
              <button type="button" onClick={() => hook.sell(k)} className="min-h-[44px] shrink-0 rounded-md border border-border px-3 text-sm font-semibold hover:border-primary">Sell (1 hour)</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Result({ run, hook }: { run: DeadlineRun; hook: Hook }) {
  const g = run.grade!;
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4" data-testid="deadline-grade">
      <div className="text-xs font-semibold uppercase tracking-wide text-primary">{run.state.clubName}, the window is shut</div>
      <div className="flex items-baseline gap-3">
        <div className="text-5xl font-bold">{g.letter}</div>
        <div className="text-lg font-semibold tabular-nums">{g.score} / 100</div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md bg-muted px-2 py-2"><div className="font-bold tabular-nums">{g.needsPts} / {NEEDS_POINTS}</div><div className="text-muted-foreground">{g.filled} of {g.needs} needs</div></div>
        <div className="rounded-md bg-muted px-2 py-2"><div className="font-bold tabular-nums">{g.valuePts} / {VALUE_POINTS}</div><div className="text-muted-foreground">value for money</div></div>
        <div className="rounded-md bg-muted px-2 py-2"><div className="font-bold tabular-nums">{g.budgetPts} / {BUDGET_POINTS}</div><div className="text-muted-foreground">{money(g.budgetLeft)} left</div></div>
      </div>
      <div className="space-y-1 text-sm">
        {run.needs.map((n, k) => (
          <div key={k} className="flex items-center justify-between gap-2">
            <span className="capitalize">{slotWord(n.label)}</span>
            <span className={g.filledBy[k] ? 'font-semibold' : 'text-muted-foreground'}>{g.filledBy[k] ?? 'not filled'}</span>
          </div>
        ))}
      </div>
      {g.signings.length > 0 && (
        <div className="rounded-md bg-muted p-2 text-xs">
          <div className="mb-1 font-semibold uppercase tracking-wide text-muted-foreground">Fees against what they were worth</div>
          <ul className="space-y-1">
            {g.signings.map(s => (
              <li key={s.name} className="flex justify-between gap-2">
                <span className="truncate">{s.name} ({s.rating})</span>
                <span className="shrink-0 tabular-nums">{money(s.fee)} for a {money(s.value)} player</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ShareButtons gameName="Deadline Day" gamePath="/deadline-day" score={`${g.letter}, ${g.score}/100`} customText={shareText(run)} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={hook.randomFree} className="min-h-[48px] rounded-md border border-border px-3 py-2 text-sm font-semibold"><RotateCcw className="mr-1 inline h-4 w-4" />New club</button>
        <button type="button" onClick={hook.backToMenu} className="min-h-[48px] rounded-md border border-border px-3 py-2 text-sm font-semibold">Menu</button>
      </div>
    </div>
  );
}

export default function DeadlineDayBoard() {
  const hook = useDeadlineDay();
  const { phase, run, daily, dailyDone, dailySaved, freeSaved, notice } = hook;
  const [view, setView] = useState<View>({ kind: 'desk' });
  const [league, setLeague] = useState('premier');
  const viewKey = view.kind === 'deal' ? `deal${view.i}` : view.kind;
  const revealRef = useRevealScroll<HTMLDivElement>(`${phase}:${viewKey}:${run?.actions.length ?? 0}:${notice ?? ''}`);
  const leagues = hotSeatLeagues();
  const clubsInLeague = hotSeatPool().filter(c => c.leagueId === league);
  const toDesk = () => { hook.clearNotice(); setView({ kind: 'desk' }); };
  const go = (fn: () => void) => { setView({ kind: 'desk' }); fn(); };

  return (
    <div className="space-y-3">
      {phase === 'menu' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4" data-no-prerender>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><CalendarDays className="h-4 w-4" />Today's deadline day</div>
            <div className="mt-1 text-lg font-bold">{daily.club}</div>
            <div className="text-xs text-muted-foreground">{daily.leagueName}. Same club, same needs and same budget for everyone today.</div>
            {dailyDone ? (
              <div className="mt-3 rounded-md bg-muted px-3 py-2 text-sm" data-testid="deadline-daily-done">
                <div className="font-semibold">Grade {dailyDone.letter}, {dailyDone.score} / 100</div>
                <div className="text-muted-foreground">{dailyDone.filled} of {dailyDone.needs} needs filled. Back tomorrow for a new club.</div>
              </div>
            ) : (
              <button type="button" onClick={() => go(hook.startDaily)} className="mt-3 min-h-[44px] w-full rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">
                {dailySaved ? 'Back on the phones' : 'Open today\'s window'}
              </button>
            )}
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">Free play</div>
            <div className="mt-1 text-lg font-bold">Any club, any time</div>
            <div className="text-xs text-muted-foreground">Pick a club or let us pick one. A new set of needs every time.</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => hook.setPhase('pick')} className="min-h-[44px] rounded-md border border-border px-3 py-2 text-sm font-semibold">Pick a club</button>
              <button type="button" onClick={() => go(hook.randomFree)} className="min-h-[44px] rounded-md border border-border px-3 py-2 text-sm font-semibold"><Shuffle className="mr-1 inline h-4 w-4" />Random</button>
            </div>
            {freeSaved && (
              <button type="button" onClick={() => go(hook.resumeFree)} className="mt-2 min-h-[44px] w-full rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary">
                Carry on at {freeSaved.setup.club}
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'pick' && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-3">
          <button type="button" onClick={() => hook.setPhase('menu')} className="inline-flex min-h-[40px] items-center gap-1 rounded-md px-2 text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" />Back</button>
          <label className="block text-xs font-semibold text-muted-foreground" htmlFor="deadline-league">League</label>
          <select id="deadline-league" value={league} onChange={e => setLeague(e.target.value)} className="min-h-[44px] w-full rounded-md border border-border bg-background px-3 text-sm">
            {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <div className="grid max-h-[50vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {clubsInLeague.map(c => (
              <button key={c.club} type="button" onClick={() => go(() => hook.startFree(c.club))} className="min-h-[44px] rounded-md border border-border px-2 py-2 text-left text-sm font-medium hover:border-primary">
                {c.club}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'loading' && (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground" role="status">
          Getting the phones ready...
        </div>
      )}

      <div ref={revealRef} className="space-y-3">
        {run && phase === 'play' && (
          <>
            <div className="flex items-center justify-between">
              <button type="button" onClick={hook.backToMenu} className="inline-flex min-h-[40px] items-center gap-1 rounded-md px-2 text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" />Menu</button>
              <span className="flex items-center gap-1 text-sm font-semibold"><Clock className="h-4 w-4" />{run.state.clubName}, shuts at {clockLabel(DEADLINE_HOURS)}</span>
            </div>
            <Strip run={run} />
            {notice && (
              <div role="status" className="flex items-start justify-between gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm" data-testid="deadline-notice">
                <span>{notice}</span>
                <button type="button" onClick={hook.clearNotice} className="shrink-0 font-bold text-muted-foreground" aria-label="Dismiss">x</button>
              </div>
            )}
            {view.kind === 'desk' && <Desk run={run} hook={hook} onOpen={i => { hook.clearNotice(); setView({ kind: 'deal', i }); }} onSales={() => { hook.clearNotice(); setView({ kind: 'sales' }); }} />}
            {view.kind === 'deal' && <Deal run={run} i={view.i} hook={hook} onBack={toDesk} />}
            {view.kind === 'sales' && <Sales run={run} hook={hook} onBack={toDesk} />}
          </>
        )}

        {run && phase === 'done' && run.grade && <Result run={run} hook={{ ...hook, randomFree: () => go(hook.randomFree), backToMenu: () => go(hook.backToMenu) }} />}
      </div>
    </div>
  );
}
