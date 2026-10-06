import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ShareButtons from '@/components/game/ShareButtons';
import MmaBoutRecap from '@/components/fight-promoter/MmaBoutRecap';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { useMmaPromotion } from '@/hooks/useMmaPromotion';
import { DIVISIONS, MMA_VENUES, MMA_REST_COST, ratingOfMma, mmaRankings, legalMmaBout, validateMmaPlan, projectMmaEvent, mmaPromotionScore, type MmaFighter, type MmaBooking } from '@/lib/mmaPromotion';

const action = 'min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary';
const primary = `${action} bg-primary text-primary-foreground`;
const field = 'min-h-[44px] w-full min-w-0 rounded-lg border bg-background px-2 text-sm';
const dollars = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
type Panel = 'dashboard' | 'card' | 'matchup' | 'fighters' | 'rankings' | 'history';

function MmaRulesText() {
  return <div className="space-y-2 text-sm text-muted-foreground">
    <p>Run twelve events. Sign fighters for three fights, book up to three bouts per card, choose your venue and set your ticket price.</p>
    <p>Both fighters need a contract, the same division and enough recovery. A fighter can appear only once per card. Regular bouts last up to three rounds, title fights up to five.</p>
    <p>A title fight needs two of your division's top four. If there is a champion, they must defend. A champion without a contract leaves a vacant belt.</p>
    <p>A month off moves recovery forward and costs {dollars(MMA_REST_COST)}. The event estimate shows your expected gate and all costs before you commit.</p>
    <p>Your score out of 100 comes from reputation (50), profitable events (30) and held belts (20). Every fighter, record and result is fictional.</p>
    <p>Open Bout recap from an event receipt or Event history to compare saved totals and played rounds. Each takedown records 20 ground control units. Round points decide bouts that reach the final bell; an early finish ends the bout.</p>
    <p className="rounded-lg border bg-muted/30 p-3"><strong className="text-foreground">Example:</strong> two healthy light division fighters with contracts can contest the vacant title. The winner gets the belt, both use one contract fight, and recovery may stop an immediate rematch. Sign another contender or rest before booking again.</p>
  </div>;
}

function MmaRules() {
  return <Dialog><DialogTrigger asChild><button aria-label="MMA rules" className={`${action} min-w-[44px]`}>?</button></DialogTrigger><DialogContent className="max-h-[85vh] overflow-y-auto [&>button:last-child]:min-h-[44px] [&>button:last-child]:min-w-[44px]"><DialogHeader><DialogTitle>How to run an MMA promotion</DialogTitle></DialogHeader><MmaRulesText /></DialogContent></Dialog>;
}

export default function MmaPromotionBoard() {
  const game = useMmaPromotion();
  const { state, plan, view, result, notice } = game;
  const [name, setName] = useState('');
  const [panel, setPanel] = useState<Panel>('dashboard');
  const [division, setDivision] = useState('light');
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');
  const [title, setTitle] = useState(false);
  const [market, setMarket] = useState(false);
  const [fighterId, setFighterId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [listPage, setListPage] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [recapIndex, setRecapIndex] = useState<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<Panel>('card');
  const tiles = useRef<Partial<Record<Panel, HTMLButtonElement | null>>>({});
  const recapOpeners = useRef<Record<number, HTMLButtonElement | null>>({});
  const returnToBout = useRef<number | null>(null);
  const recap = view === 'result' && result && recapIndex !== null ? result.bouts[recapIndex] : null;
  const active = !state ? 'setup' : recap ? 'recap' : view === 'dashboard' ? panel : view;
  const reveal = useRevealScroll<HTMLDivElement>(active);
  useGameCompletion('fight-promoter', !!state?.closed && state.history.length > 0, state ? mmaPromotionScore(state) : 0);
  useEffect(() => {
    if (active === 'dashboard') tiles.current[opener.current]?.focus({ preventScroll: true });
    else if (active === 'result' && returnToBout.current !== null) {
      recapOpeners.current[returnToBout.current]?.focus({ preventScroll: true });
      returnToBout.current = null;
    }
    else if (active !== 'setup') heading.current?.focus({ preventScroll: true });
  }, [active]);

  const open = (next: Panel) => {
    opener.current = next;
    setPanel(next);
    setFighterId(null);
    setListPage(0);
  };
  const back = () => { game.back(); setPanel('dashboard'); setFighterId(null); };
  const backToEvent = () => { returnToBout.current = recapIndex; setRecapIndex(null); };
  const rules = <MmaRules />;
  const feedback = notice ? <p role="status" className="rounded-lg border px-3 py-2 text-sm">{notice}</p> : null;

  if (!state) return <div data-mma-screen="setup" className="space-y-3" ref={reveal}>
    <div className="flex items-center justify-between"><h2 className="text-lg font-display font-bold">Build your MMA organization</h2>{rules}</div>
    <div className="space-y-2 text-sm text-muted-foreground"><p>Build a fictional MMA promotion across twelve events. Sign three fight contracts, book up to three bouts per card, then pick a venue and ticket price.</p><p>Match healthy fighters in the same division. Title bouts need two of your top four, including the champion if there is one. You pay the purses and venue; the gate comes back to your business.</p><p className="rounded-lg border bg-muted/30 p-2"><strong className="text-foreground">Example:</strong> book two healthy light division fighters for the vacant title. The winner takes the belt. Both use a contract fight and need recovery before their next booking.</p></div>
    <p className="text-sm text-muted-foreground">After an event, open Bout recap to compare its saved rounds. Find older cards in Event history. Each takedown records 20 ground control units.</p>
    <label className="block text-sm">Promotion name<input aria-label="Promotion name" className={`${field} mt-1`} maxLength={28} value={name} onChange={e => setName(e.target.value)} placeholder="Cagehouse Promotions" /></label>
    {feedback}
    <button className={`${primary} w-full`} onClick={() => game.start(name)}>Start promotion</button>
  </div>;

  const fById = (id: string) => state.fighters.find(f => f.id === id);
  const fighterName = (id: string) => fById(id)?.name ?? 'Unknown fighter';
  const used = new Set(plan.bookings.flatMap(b => [b.aId, b.bId]));
  const eligible = state.fighters.filter(f => f.division === division && f.contract > 0 && f.recoveryUntil <= state.month && !used.has(f.id));
  const booking: MmaBooking = { aId, bId, title };
  const bookingError = legalMmaBout(state, booking);
  const planError = validateMmaPlan(state, plan);
  const projection = projectMmaEvent(state, plan);
  const selectedFighter = fighterId ? fById(fighterId) : null;
  const divisionControls = <div className="grid grid-cols-3 gap-2" role="group" aria-label="Division">
    {DIVISIONS.map(d => <button key={d.id} className={`${action} ${division === d.id ? 'border-primary bg-primary/10' : ''}`} aria-pressed={division === d.id} onClick={() => { setDivision(d.id); setAId(''); setBId(''); setTitle(false); setFighterId(null); setListPage(0); }}>{d.label}</button>)}
  </div>;
  const fighterSummary = (f: MmaFighter) => <><span className="block truncate font-semibold">{f.name}</span><span className="block text-xs text-muted-foreground">{f.wins}-{f.losses}, {f.style}, rating {ratingOfMma(f)}</span></>;
  const roster = state.fighters.filter(f => f.division === division && (market ? f.contract === 0 : f.contract > 0));
  const rankings = mmaRankings(state, division as MmaFighter['division']);
  const pages = (count: number) => count > 4 ? <div className="flex items-center justify-between gap-2"><button className={action} disabled={listPage === 0} onClick={() => setListPage(listPage - 1)}>Previous fighters</button><span className="text-xs">{listPage + 1}/{Math.ceil(count / 4)}</span><button className={action} disabled={(listPage + 1) * 4 >= count} onClick={() => setListPage(listPage + 1)}>Next fighters</button></div> : null;
  const titleLabel = active === 'dashboard' ? 'Promotion desk' : active === 'card' ? 'Book card' : active === 'matchup' ? 'Choose your matchup' : active === 'fighters' ? 'Fighters' : active === 'rankings' ? 'Rankings and belts' : active === 'history' ? 'Event history' : active === 'closed' ? 'Your promotion legacy' : active === 'recap' ? 'Bout recap' : 'Event receipt';

  return <div data-mma-screen={active} className="space-y-3" ref={reveal}>
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><p className="truncate font-display font-bold">{state.name}</p><p className="text-xs text-muted-foreground">Month {state.month}, event {Math.min(state.event, 12)}/12</p></div>
        <div className="shrink-0 text-right"><p data-mma-cash="" className="font-bold tabular-nums">{dollars(state.cash)}</p><p className="text-xs text-muted-foreground">Reputation {state.reputation}/100</p></div>
      </div>
    </div>
    <div className="flex items-center justify-between gap-2">
      {active !== 'dashboard' && active !== 'closed' && <button aria-label={active === 'recap' ? 'Back to event' : active === 'matchup' ? 'Back to card' : 'Back to dashboard'} className={`${action} shrink-0`} onClick={active === 'recap' ? backToEvent : active === 'matchup' ? () => setPanel('card') : back}>Back</button>}
      <h2 ref={heading} tabIndex={-1} className="text-lg font-display font-bold outline-none">{titleLabel}</h2>{rules}
    </div>
    {feedback}

    {active === 'dashboard' && <>
      <div className="grid grid-cols-2 gap-2">
        {([['card', 'Book card', `${plan.bookings.length} of 3 bouts booked`], ['fighters', 'Fighters', 'Sign, renew and check recovery'], ['rankings', 'Rankings', 'Pick your next title challenger'], ['history', 'Event history', `${state.history.length} saved receipts`]] as const).map(([next, label, detail]) => <button key={next} ref={node => { tiles.current[next] = node; }} aria-label={label} className={`${action} min-h-[88px] bg-card text-left`} onClick={() => open(next)}><span className="block font-display font-bold">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{detail}</span></button>)}
      </div>
      <p className="text-xs text-muted-foreground">Close fights build reputation. Known fighters sell seats.</p>
      <button className={`${action} w-full`} onClick={game.rest}>Rest a month ({dollars(MMA_REST_COST)})</button>
      <p className="text-xs text-muted-foreground">A month off heals your roster. Booked bouts stay saved.</p>
    </>}

    {active === 'card' && <>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">Venue<select aria-label="Venue" className={`${field} mt-1`} value={plan.venueId} onChange={e => game.setPlan({ ...plan, venueId: e.target.value })}>{MMA_VENUES.map(v => <option key={v.id} value={v.id} disabled={state.reputation < v.needs}>{v.name}{state.reputation < v.needs ? ` (needs ${v.needs})` : ''}</option>)}</select></label>
        <label className="text-sm">Ticket price<select aria-label="Ticket price" className={`${field} mt-1`} value={plan.ticketPrice} onChange={e => game.setPlan({ ...plan, ticketPrice: Number(e.target.value) })}>{[25, 50, 80].map(price => <option key={price} value={price}>{dollars(price)}</option>)}</select></label>
      </div>
      <div className="space-y-2">
        {plan.bookings.map((b, i) => <div key={`${b.aId}:${b.bId}`} data-mma-booking="" className="flex items-center justify-between gap-2 rounded-lg border bg-card px-2 py-1"><div className="min-w-0 text-sm"><p className="truncate font-semibold">{fighterName(b.aId)} vs {fighterName(b.bId)}</p><p className="text-xs text-muted-foreground">{b.title ? 'Title fight, 5 rounds' : '3 rounds'}{i === 0 ? ', main event' : ''}</p></div><button aria-label={`Remove bout ${i + 1}`} className={`${action} shrink-0`} onClick={() => game.removeBout(i)}>Remove</button></div>)}
        {plan.bookings.length === 0 && <p className="rounded-lg border p-3 text-sm text-muted-foreground">Choose two fighters to start your card.</p>}
      </div>
      {plan.bookings.length < 3 && <button className={`${action} w-full`} onClick={() => { setAId(''); setBId(''); setTitle(false); setPanel('matchup'); }}>Choose fighters</button>}
      {projection && <div className="rounded-lg border bg-muted/30 p-3 text-xs" aria-label="Event estimate"><p>{projection.attendance} expected seats, gate {dollars(projection.gate)}</p><p>Purses {dollars(projection.purses)}, venue {dollars(projection.rent)}</p><p className="mt-1 font-semibold">Estimated {projection.profit >= 0 ? 'profit' : 'loss'} {dollars(Math.abs(projection.profit))}</p></div>}
      {planError && <p className="text-xs text-muted-foreground">{planError}</p>}
      <button className={`${primary} w-full`} disabled={!!planError} onClick={game.runEvent}>Run event</button>
    </>}

    {active === 'matchup' && <>
      {divisionControls}
      <div className="grid grid-cols-2 gap-2">
        <label className="min-w-0 text-sm">Blue corner<select aria-label="Blue corner" className={`${field} mt-1`} value={aId} onChange={e => { setAId(e.target.value); setBId(''); }}><option value="">Choose fighter</option>{eligible.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
        <label className="min-w-0 text-sm">Red corner<select aria-label="Red corner" className={`${field} mt-1`} value={bId} onChange={e => setBId(e.target.value)}><option value="">Choose opponent</option>{eligible.filter(f => f.id !== aId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
      </div>
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border">
        {[aId, bId].map((id, i) => <div key={i} className={`${i === 0 ? 'border-l-4 border-blue-500' : 'border-r-4 border-rose-500 text-right'} bg-card p-3 text-sm`}><p className="mb-2 text-xs text-muted-foreground">{i === 0 ? 'Blue corner' : 'Red corner'}</p>{fById(id) ? fighterSummary(fById(id)!) : <p className="text-muted-foreground">Your next contender</p>}</div>)}
      </div>
      <label className="flex min-h-[44px] items-center gap-3 rounded-lg border px-3 text-sm"><input type="checkbox" checked={title} onChange={e => setTitle(e.target.checked)} aria-label="Title fight" />Title fight</label>
      <p className="text-xs text-muted-foreground">{aId && bId ? bookingError ?? (title ? 'Eligible title matchup, 5 rounds.' : 'Ready to book, 3 rounds.') : eligible.length < 2 ? 'You need two healthy contracted fighters here. Sign a fighter or rest a month.' : 'Pick two available fighters from the same division.'}</p>
      <button className={`${primary} w-full`} disabled={!!bookingError} onClick={() => { game.book(booking); setPanel('card'); }}>Add bout</button>
    </>}

    {active === 'fighters' && <>
      {divisionControls}
      {selectedFighter ? <div data-mma-fighter={selectedFighter.id} className="space-y-3 rounded-xl border bg-card p-3">
        <div>{fighterSummary(selectedFighter)}</div>
        <p className="text-sm">Striking {selectedFighter.striking}, grappling {selectedFighter.grappling}, cardio {selectedFighter.cardio}</p>
        <p className="text-sm">{selectedFighter.contract} contract fights left. Purse {dollars(selectedFighter.purse)} per appearance.</p>
        <p className="text-sm">{selectedFighter.recoveryUntil > state.month ? `Recovering until month ${selectedFighter.recoveryUntil}.` : 'Healthy and available.'}</p>
        <button className={`${primary} w-full`} disabled={selectedFighter.contract > 1 || selectedFighter.signingBonus > state.cash || state.closed} onClick={() => { game.sign(selectedFighter.id); setListPage(0); }}>{selectedFighter.contract > 0 ? 'Renew 3 fights' : 'Sign 3 fights'} ({dollars(selectedFighter.signingBonus)})</button>
        <button className={`${action} w-full`} onClick={() => setFighterId(null)}>Back to fighters</button>
      </div> : <>
        <div className="grid grid-cols-2 gap-2"><button className={action} aria-pressed={!market} onClick={() => { setMarket(false); setListPage(0); }}>Signed fighters</button><button className={action} aria-pressed={market} onClick={() => { setMarket(true); setListPage(0); }}>Free agents</button></div>
        <div className="grid grid-cols-2 gap-2">{roster.slice(listPage * 4, listPage * 4 + 4).map(f => <button key={f.id} data-mma-fighter={f.id} className={`${action} w-full min-w-0 bg-card text-left`} onClick={() => setFighterId(f.id)}>{fighterSummary(f)}<span className="block text-xs text-muted-foreground">{f.contract > 0 ? `${f.contract} fights left` : `Sign for ${dollars(f.signingBonus)}`}{f.recoveryUntil > state.month ? ', recovering' : ''}</span></button>)}</div>
        {pages(roster.length)}
        {!state.fighters.some(f => f.division === division && (market ? f.contract === 0 : f.contract > 0)) && <p className="text-sm text-muted-foreground">Nobody in this list. Check the other roster tab.</p>}
      </>}
    </>}

    {active === 'rankings' && <>
      {divisionControls}
      <p className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm font-semibold">{state.champions[division as keyof typeof state.champions] ? `Champion: ${fighterName(state.champions[division as keyof typeof state.champions]!)}` : 'Vacant belt. Book a title fight between two of the top four.'}</p>
      <ol start={listPage * 4 + 1} className="space-y-2">{rankings.slice(listPage * 4, listPage * 4 + 4).map((f, i) => <li key={f.id} className="flex items-center gap-3 rounded-lg border bg-card p-2 text-sm"><span className="w-5 shrink-0 font-bold">{listPage * 4 + i + 1}</span><div className="min-w-0 flex-1">{fighterSummary(f)}</div><span className="shrink-0 text-xs text-muted-foreground">{f.rankingPoints} pts</span></li>)}</ol>
      {pages(rankings.length)}
    </>}

    {active === 'history' && <>
      {state.history.length === 0 ? <p className="rounded-lg border p-3 text-sm text-muted-foreground">Run your first card to see its results here.</p> : <>
        {[...state.history].reverse().slice(historyPage * 4, historyPage * 4 + 4).map(h => <button key={h.event} aria-label={`View event ${h.event}`} className={`${action} w-full bg-card text-left`} onClick={() => game.openResult(state.history.indexOf(h))}><span className="block font-semibold">Event {h.event}, month {h.month}</span><span className="block text-xs text-muted-foreground">{h.attendance} seats, {h.profit >= 0 ? 'profit' : 'loss'} {dollars(Math.abs(h.profit))}</span></button>)}
        <div className="flex items-center justify-between gap-2"><button className={action} disabled={historyPage === 0} onClick={() => setHistoryPage(historyPage - 1)}>Newer events</button><button className={action} disabled={(historyPage + 1) * 4 >= state.history.length} onClick={() => setHistoryPage(historyPage + 1)}>Older events</button></div>
      </>}
    </>}

    {active === 'result' && result && <div data-mma-receipt={result.event} className="space-y-2">
      <div className="rounded-xl border bg-card p-3 text-sm"><p className="font-semibold">Event {result.event}, {result.attendance} seats</p><p>Gate <span data-mma-receipt-value="gate" data-value={result.gate}>{dollars(result.gate)}</span>, purses <span data-mma-receipt-value="purses" data-value={result.purses}>{dollars(result.purses)}</span>, venue <span data-mma-receipt-value="rent" data-value={result.rent}>{dollars(result.rent)}</span></p><p className="mt-1 font-bold">{result.profit >= 0 ? 'Profit' : 'Loss'} <span data-mma-receipt-value="profit" data-value={result.profit}>{dollars(Math.abs(result.profit))}</span></p><p className="text-xs text-muted-foreground">Reputation {result.repDelta >= 0 ? '+' : ''}{result.repDelta}</p></div>
      {result.bouts.map((b, i) => <div key={`${b.aId}:${b.bId}`} data-mma-bout-winner={b.winnerId} className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm"><div className="min-w-0 flex-1"><p className="font-semibold">{fighterName(b.winnerId)} wins</p><p className="text-xs text-muted-foreground">{fighterName(b.aId)} vs {fighterName(b.bId)}</p><p>{b.method}, round {b.round}/{b.scheduledRounds}{b.title ? ', title fight' : ''}</p></div><button ref={node => { recapOpeners.current[i] = node; }} aria-label={`View bout ${i + 1} recap`} className={`${action} shrink-0 px-2 text-xs`} onClick={() => setRecapIndex(i)}>Bout recap</button></div>)}
      <button className={`${primary} w-full`} onClick={back}>{state.closed ? 'See legacy score' : 'Plan next event'}</button>
    </div>}

    {active === 'recap' && recap && result && <MmaBoutRecap key={`${result.event}:${recap.aId}:${recap.bId}`} bout={recap} aName={fighterName(recap.aId)} bName={fighterName(recap.bId)} event={result.event} />}

    {active === 'closed' && <div className="space-y-3 rounded-xl border bg-card p-4 text-center">
      <p className="text-3xl font-display font-bold">{mmaPromotionScore(state)} / 100</p>
      <p className="text-sm">{state.history.length} events, {state.history.filter(h => h.profit > 0).length} profitable. Reputation {state.reputation}/100.</p>
      <p className="text-sm text-muted-foreground">{state.history.length < 12 ? `You closed the promotion after ${state.history.length} events.` : 'Twelve events are in the books. Your organization has its story.'}</p>
      <ShareButtons gameName="MMA Fight Promoter" gamePath="/fight-promoter" score={`${mmaPromotionScore(state)}/100`} />
      <button className={`${action} w-full`} onClick={() => game.openResult(state.history.length - 1)} disabled={!state.history.length}>Review last event</button>
    </div>}
    {(active === 'dashboard' || active === 'closed') && <div className="grid grid-cols-2 gap-2">
      {active === 'dashboard' && (state.history.length > 0 || state.cash < MMA_VENUES[0].rent) && (confirmEnd ? <div className="col-span-2 space-y-2 rounded-lg border p-3"><p className="text-sm">Close the organization and take your current legacy score?</p><div className="flex gap-2"><button className={`${action} flex-1`} onClick={() => { game.endPromotion(); setConfirmEnd(false); }}>Yes, close promotion</button><button className={`${action} flex-1`} onClick={() => setConfirmEnd(false)}>Keep running</button></div></div> : <button className={action} onClick={() => setConfirmEnd(true)}>End promotion</button>)}
      {confirmReset ? <div role="alertdialog" aria-label="Start a new MMA promotion" className="col-span-2 space-y-2 rounded-lg border border-destructive/50 p-3"><p className="text-sm">Start a new MMA promotion? This replaces this mode's save.</p><div className="flex gap-2"><button className={`${action} flex-1`} onClick={() => { game.reset(); setPanel('dashboard'); setConfirmReset(false); setConfirmEnd(false); }}>Yes, start over</button><button className={`${action} flex-1`} onClick={() => setConfirmReset(false)}>Keep promotion</button></div></div> : <button className={`${action} text-muted-foreground`} onClick={() => setConfirmReset(true)}>Start over</button>}
    </div>}
  </div>;
}
