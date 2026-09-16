import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ticket, Building2, Trophy, RotateCcw, Plus, X, Flame } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { cn } from '@/lib/utils';
import { Confetti } from '@/components/soccer-career/CareerFx';
import { STYLES, weightById, ratingOf, type Fighter } from '@/lib/fightCareer';
import {
  newPromoter, runShow, promoterVerdict, appealOf, purseFor, legalMatch,
  drawOf, weightOf, expectedAttendance, VENUES, venueById,
  type PromoterState, type ShowResult, type Booking,
} from '@/lib/fightPromoter';

type Phase = 'setup' | 'hub' | 'result' | 'closed';

const SAVE_KEY = 'fight-promoter-save-v1';

export default function FightPromoterBoard() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [st, setSt] = useState<PromoterState | null>(null);
  const [name, setName] = useState('');
  const [venueId, setVenueId] = useState('hall');
  const [priceK, setPriceK] = useState(220);
  const [card, setCard] = useState<Booking[]>([]);
  const [picking, setPicking] = useState<string | null>(null);
  const [result, setResult] = useState<ShowResult | null>(null);

  const revealRef = useRevealScroll<HTMLDivElement>(`${phase}:${st?.show ?? 0}:${card.length}`);
  const verdict = useMemo(() => (st ? promoterVerdict(st) : null), [st]);
  useGameCompletion('fight-promoter', !!st?.closed, verdict?.score ?? 0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as { st: PromoterState };
      if (!s?.st?.name) return;
      setSt(s.st);
      setPhase(s.st.closed ? 'closed' : 'hub');
    } catch { /* a fresh promotion is the right fallback */ }
  }, []);

  const persist = useCallback((next: PromoterState, ph: Phase) => {
    setSt(next);
    setPhase(ph);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ st: next })); } catch { /* ignore */ }
  }, []);

  const reset = () => {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    setSt(null); setPhase('setup'); setCard([]); setResult(null); setPicking(null);
  };

  if (phase === 'setup' || !st) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Name the promotion</label>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={28}
            placeholder="Leave it blank and it is Small Hall Promotions"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            You book the room, make the fights and pay the purses. Feeding a known man somebody who cannot live
            with him sells tickets tonight. Making the fight people actually want is what gets your name on a
            bigger building.
          </p>
        </div>
        <button onClick={() => persist(newPromoter(name), 'hub')}
          className="min-h-[48px] w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground">
          Book your first room
        </button>
      </div>
    );
  }

  const inCard = new Set(card.flatMap(b => [b.aId, b.bId]));
  const price = priceK / 1e6;
  const venue = venueById(venueId);
  const plan = { venueId, ticketPrice: price, bookings: card };
  const projected = card.length ? expectedAttendance(st, plan) : 0;
  const projectedGate = Math.round(projected * price * 1000) / 1000;
  const projectedPurses = card.reduce((s, b) => {
    const a = st.pool.find(f => f.id === b.aId);
    const c = st.pool.find(f => f.id === b.bId);
    return a && c ? s + purseFor(a, c, b.title) : s;
  }, 0);

  const Header = (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold">{st.name}</h2>
          <p className="text-xs text-muted-foreground">Show {st.show}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn('text-sm font-bold tabular-nums', st.money < 0.02 ? 'text-destructive' : 'text-primary')}>
            {st.money.toFixed(3)}m
          </p>
          <p className="text-xs text-muted-foreground">name {st.reputation.toFixed(0)} of 100</p>
        </div>
      </div>
    </div>
  );

  if (phase === 'closed' && verdict) {
    return (
      <div className="space-y-4" ref={revealRef}>
        {Header}
        <div className="rounded-lg border bg-card p-4 text-center">
          <Trophy className="mx-auto mb-2 h-7 w-7 text-amber-500" />
          <p className="text-xs uppercase tracking-wide text-muted-foreground">How you are remembered</p>
          <p className="text-2xl font-bold text-primary">{verdict.tier}</p>
          <p className="mb-3 text-sm text-muted-foreground">{verdict.score} out of 100</p>
          <ul className="space-y-1 text-left text-sm text-muted-foreground">
            {verdict.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
        <ShareButtons gameName="Fight Promoter" gamePath="/fight-promoter"
          score={`${verdict.tier}, ${verdict.score}/100`}
          customText={`${st.name} put on ${st.history.length} shows and finished as ${verdict.tier}.`} />
        <button onClick={reset} className="min-h-[48px] w-full rounded-md border px-4 py-3 font-semibold">
          <RotateCcw className="mr-2 inline h-4 w-4" />Start again
        </button>
      </div>
    );
  }

  if (phase === 'result' && result) {
    const full = Math.max(0, Math.min(100, Math.round((result.attendance / result.venue.capacity) * 100)));
    const soldOut = full >= 99;
    return (
      <div className="space-y-4" ref={revealRef}>
        {Header}
        <div className={cn('relative overflow-hidden rounded-lg border p-4 text-center',
          result.profit >= 0 ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-destructive/60 bg-destructive/10')}>
          {/* Round 630: a sell out is the promoter's knockout, so it gets the
              gold. A show that merely made money gets the smaller burst, and a
              loss gets nothing. */}
          {result.profit >= 0 && (
            <Confetti pieces={soldOut ? 46 : 26} gold={soldOut} />
          )}
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{result.venue.name}</p>
          <p key={result.attendance} className="animate-count-pop text-2xl font-bold">{result.attendance.toLocaleString()} in</p>
          {/* The house filling is this game's condition bar: the number alone
              does not tell you whether 3,100 was a triumph or an empty room,
              and the capacity is what decides that. */}
          <div className="mx-auto mt-2 max-w-xs">
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out',
                full >= 90 ? 'bg-amber-500' : full >= 55 ? 'bg-emerald-500' : 'bg-muted-foreground/60')}
                style={{ width: `${full}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {full}% of {result.venue.capacity.toLocaleString()}{soldOut ? ', sold out' : ''}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            gate {result.gate.toFixed(3)}m, purses {result.purses.toFixed(3)}m, room {result.rent.toFixed(3)}m
          </p>
          <p className={cn('mt-1 text-lg font-bold', result.profit >= 0 ? 'text-emerald-500' : 'text-destructive')}>
            {result.profit >= 0 ? 'Profit' : 'Loss'} {Math.abs(result.profit).toFixed(3)}m
          </p>
          <p className={cn('mt-1 text-xs', result.repDelta >= 0 ? 'text-amber-500' : 'text-destructive')}>
            {result.repDelta >= 0 ? '+' : ''}{result.repDelta.toFixed(1)} to your name
          </p>
        </div>
        <div className="space-y-2">
          {result.bouts.map((b, i) => (
            <div key={i} className="rounded-md border bg-card p-3 text-xs">
              <div className="flex items-center justify-between font-semibold">
                <span className="truncate">{b.a.name} vs {b.b.name}</span>
                <span className="shrink-0 pl-2">{b.result.method}</span>
              </div>
              <p className="text-muted-foreground">
                {b.result.winner === 'draw' ? 'Drawn' : `${b.result.winner === 'player' ? b.a.name : b.b.name} wins`}
                {b.result.method === 'KO' || b.result.method === 'TKO' ? ` in round ${b.result.endedRound}` : ''}
                , cards {b.result.playerCard} to {b.result.oppCard}
              </p>
              <p className={cn('font-medium', b.quality >= 70 ? 'text-amber-500' : b.quality < 35 ? 'text-muted-foreground' : '')}>
                {b.quality >= 78 ? <><Flame className="mr-1 inline h-3 w-3" />A fight people will talk about.</>
                  : b.quality >= 55 ? 'A decent fight.'
                    : b.quality >= 35 ? 'Nobody complained, nobody remembers.'
                      : 'One way traffic. The room went quiet.'}
              </p>
            </div>
          ))}
        </div>
        <button onClick={() => { setResult(null); setCard([]); setPhase(st.closed ? 'closed' : 'hub'); }}
          className="min-h-[48px] w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground">
          {st.closed ? 'See how you are remembered' : 'Plan the next show'}
        </button>
      </div>
    );
  }

  /* ── the hub: build the card ── */
  const FighterRow = ({ f, onPick, disabled }: { f: Fighter; onPick?: () => void; disabled?: boolean }) => (
    <button disabled={disabled} onClick={onPick}
      className={cn('w-full rounded-md border p-2 text-left text-xs transition',
        disabled ? 'opacity-35' : 'hover:border-primary')}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold">{f.name}</span>
        <span className="shrink-0 text-muted-foreground">draw {drawOf(f).toFixed(0)}</span>
      </div>
      <span className="block text-[11px] text-muted-foreground">
        {weightById(weightOf(f)).label} · {STYLES.find(s => s.id === f.style)?.label} · {f.wins}-{f.losses} · rating {ratingOf(f)}
        {f.damage >= 40 ? ` · carrying ${f.damage.toFixed(0)} damage` : ''}
      </span>
    </button>
  );

  return (
    <div className="space-y-4" ref={revealRef}>
      {Header}

      <div className="rounded-lg border bg-card p-4">
        <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Building2 className="h-3 w-3" />The room
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {VENUES.map(v => {
            const locked = v.needs > st.reputation;
            const tooDear = v.rent > st.money;
            return (
              <button key={v.id} disabled={locked || tooDear} onClick={() => setVenueId(v.id)}
                className={cn('min-h-[52px] rounded-md border px-2 py-1.5 text-left text-[11px] transition',
                  venueId === v.id ? 'border-primary bg-primary/10' : 'hover:bg-muted',
                  (locked || tooDear) && 'opacity-40')}>
                <span className="block font-semibold">{v.name}</span>
                <span className="block text-muted-foreground">
                  {v.capacity.toLocaleString()} · {v.rent.toFixed(3)}m
                  {locked ? ` · needs ${v.needs}` : tooDear ? ' · cannot afford' : ''}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <label className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Ticket className="h-3 w-3" />Ticket price</span>
            <span className="tabular-nums">{priceK} a seat</span>
          </label>
          <input type="range" min={60} max={600} step={10} value={priceK}
            onChange={e => setPriceK(Number(e.target.value))}
            className="mt-1 h-6 w-full" />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Tonight's card</p>
        {card.length === 0 && <p className="text-sm text-muted-foreground">Nothing booked yet.</p>}
        <div className="space-y-1.5">
          {card.map((b, i) => {
            const a = st.pool.find(f => f.id === b.aId);
            const c = st.pool.find(f => f.id === b.bId);
            if (!a || !c) return null;
            return (
              <div key={i} className="flex items-center justify-between gap-2 rounded-md border p-2 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{a.name} vs {c.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    appeal {appealOf(a, c, false).toFixed(0)} · purse {purseFor(a, c, false).toFixed(3)}m
                    {Math.abs(ratingOf(a) - ratingOf(c)) > 12 ? ' · one sided' : ' · a real fight'}
                  </p>
                </div>
                <button onClick={() => setCard(card.filter((_, j) => j !== i))}
                  className="h-8 w-8 shrink-0 rounded-md border"><X className="mx-auto h-3 w-3" /></button>
              </div>
            );
          })}
        </div>
        {card.length > 0 && (
          <div className="mt-2 border-t pt-2 text-xs text-muted-foreground">
            <p>Projected house {projected.toLocaleString()} of {venue.capacity.toLocaleString()}</p>
            <p>
              Gate {projectedGate.toFixed(3)}m, purses from {projectedPurses.toFixed(3)}m, room {venue.rent.toFixed(3)}m.
              The men take the greater of their guarantee or 58% of the door.
            </p>
          </div>
        )}
        <button
          disabled={!card.length}
          onClick={() => {
            const r = runShow(st, plan);
            if (!r) return;
            setResult(r.result);
            persist(r.state, 'result');
          }}
          className="mt-3 min-h-[48px] w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-40">
          Put the show on
        </button>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Who will work for you</p>
        {!picking && (
          <div className="space-y-1.5">
            {st.pool.map(f => (
              <FighterRow key={f.id} f={f} disabled={inCard.has(f.id)} onPick={() => setPicking(f.id)} />
            ))}
          </div>
        )}
        {picking && (() => {
          const a = st.pool.find(f => f.id === picking);
          if (!a) return null;
          const foes = st.pool.filter(f => !inCard.has(f.id) && legalMatch(a, f));
          return (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Who do you put in with {a.name}?</p>
              {foes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nobody at his weight is free. Everyone has to make the weight, and nobody carrying 80 damage gets a licence.
                </p>
              )}
              <div className="space-y-1.5">
                {foes.map(f => (
                  <button key={f.id}
                    onClick={() => { setCard([...card, { aId: a.id, bId: f.id, rounds: 8, title: false }]); setPicking(null); }}
                    className="w-full rounded-md border p-2 text-left text-xs hover:border-primary">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">{f.name}</span>
                      <span className="shrink-0 text-primary">appeal {appealOf(a, f, false).toFixed(0)}</span>
                    </div>
                    <span className="block text-[11px] text-muted-foreground">
                      rating {ratingOf(f)} against his {ratingOf(a)} ·
                      {Math.abs(ratingOf(a) - ratingOf(f)) > 12 ? ' he cannot live with him' : ' nobody could split them'}
                      {' '}· purse {purseFor(a, f, false).toFixed(3)}m
                    </span>
                  </button>
                ))}
              </div>
              <button onClick={() => setPicking(null)}
                className="min-h-[40px] w-full rounded-md border px-3 py-1.5 text-xs text-muted-foreground">
                <Plus className="mr-1 inline h-3 w-3 rotate-45" />Pick somebody else
              </button>
            </div>
          );
        })()}
      </div>

      {st.log.length > 0 && (
        <div className="rounded-lg border bg-card p-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">The book</p>
          <div className="max-h-36 space-y-1 overflow-y-auto text-[11px] text-muted-foreground">
            {st.log.slice(0, 16).map((l, i) => <p key={i}>{l}</p>)}
          </div>
        </div>
      )}

      <button onClick={reset} className="min-h-[44px] w-full rounded-md border px-4 py-2 text-sm text-muted-foreground">
        Close the promotion and start again
      </button>
    </div>
  );
}
