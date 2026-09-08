import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
/* Round 194: the nationality filter, CM-7's last open line. Per-world maps
   so a 2010 name never wears a 2026 flag. */
import { nationalityOf } from '@/data/playerNationalities';
import { FlagImg } from '@/components/FlagImg';
import { groupByConfederation } from '@/lib/confederationGroups';
import { Input } from '@/components/ui/input';
import { Newspaper, ArrowDownToLine, ArrowUpFromLine, Handshake, Zap, TrendingUp } from 'lucide-react';
import { money, sellValue, releaseClauseOf, loanEligible, loanFeeOf, activeLoans, loanOutFee, canLeaveSquad, dealPackageValue, leagueOf } from '@/lib/clubManager';
import type { CareerState, CMPlayer, MarketPlayer, TransferStatus, DealExtras } from '@/lib/clubManager';
/* Round 506: the deal desk. The screen reads the SAME verdict and the SAME
   meter the engine judges with, so what the bar says while you are typing and
   what happens when you press send can never disagree. */
import {
  MAX_TERMS_YEARS, MIN_TERMS_YEARS, dealCloseness, offerVerdict, termsCloseness,
  termsVerdict, valuationLine, wageRoom, wageRoomLine,
} from '@/lib/clubManagerDeals';
import type { PersonalTerms } from '@/lib/clubManagerDeals';
import { ROLE_INFO, ROLE_LADDER, wageBill, wageCapFrom } from '@/lib/clubManager';
import type { SquadRole } from '@/lib/clubManager';
import type { Position } from '@/types/game';
import { ratingTint, MadeUpTag } from '@/components/club-manager/SquadScreen';

type PosFilter = 'ALL' | 'GK' | 'DEF' | 'MID' | 'ATT';

const POS_GROUPS: Record<Exclude<PosFilter, 'ALL'>, Position[]> = {
  GK: ['GK'],
  DEF: ['CB', 'LB', 'RB', 'LWB', 'RWB'],
  MID: ['CDM', 'CM', 'CAM', 'LM', 'RM'],
  ATT: ['LW', 'RW', 'ST', 'CF'],
};

/* Round 161: his ask, filters that go all the way down: "age range... what
   league... what price... search by name or position not just attack but
   left and right wing and such". Exact positions, age bands, price bands,
   the selling club's league, and a sort. */
const EXACT_POSITIONS: Position[] = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF'];
const AGE_BANDS = [
  { id: 'any', label: 'Any age', lo: 0, hi: 99 },
  { id: 'u21', label: 'U21', lo: 0, hi: 21 },
  { id: 'u24', label: 'U24', lo: 0, hi: 24 },
  { id: 'u28', label: 'U28', lo: 0, hi: 28 },
  { id: 'vets', label: '29 plus', lo: 29, hi: 99 },
] as const;
const PRICE_BANDS = [
  { id: 'any', label: 'Any price', max: Infinity },
  { id: 'p10', label: 'Under 10m', max: 10 },
  { id: 'p25', label: 'Under 25m', max: 25 },
  { id: 'p60', label: 'Under 60m', max: 60 },
] as const;
type SortKey = 'rating' | 'value' | 'young' | 'cheap';

interface TransferScreenProps {
  career: CareerState;
  market: MarketPlayer[];
  /* Round 71: the market grew a brain. */
  onNegotiate: (mp: MarketPlayer) => void;
  onOffer: (amount: number, extras?: DealExtras) => void;
  onWalk: () => void;
  onDismissNegotiation: () => void;
  onClause: (mp: MarketPlayer) => void;
  onLoan: (mp: MarketPlayer) => void;
  onAcceptBid: (playerId: string) => void;
  onRejectBid: (playerId: string) => void;
  /* Round 94: the transfer-status controls. */
  onSetStatus: (playerId: string, status: TransferStatus | null) => void;
  onLoanOut: (playerId: string) => void;
  /* Round 506: the personal terms table, and the two loan figures. */
  onProposeTerms: (terms: PersonalTerms) => void;
  onBuyLoanee: (playerId: string) => void;
  onEndLoanEarly: (playerId: string) => void;
}

/** Round 94: the three things you can tell the world about a player. */
const STATUS_META: Record<TransferStatus, { short: string; tint: string; blurb: string }> = {
  listed: {
    short: 'Listed',
    tint: 'bg-gold text-background border-gold',
    blurb: 'Clubs will come in for him, but they know you want him gone.',
  },
  loanListed: {
    short: 'Loan',
    tint: 'bg-sky-500 text-black border-sky-500',
    blurb: 'Available on loan. He plays elsewhere all season and comes back better.',
  },
  blocked: {
    short: 'Blocked',
    tint: 'bg-red-600 text-white border-red-600',
    blurb: 'Not for sale. No bid will ever reach your desk.',
  },
};

/** Buy/sell/news hub, shown inside the transfers tab. */
export function TransferScreen({
  career, market,
  onNegotiate, onOffer, onWalk, onDismissNegotiation, onClause, onLoan,
  onAcceptBid, onRejectBid, onSetStatus, onLoanOut,
  onProposeTerms, onBuyLoanee, onEndLoanEarly,
}: TransferScreenProps) {
  const [filter, setFilter] = useState<PosFilter>('ALL');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'buy' | 'sell' | 'news'>('buy');
  const [newsSort, setNewsSort] = useState<'recent' | 'fee'>('recent');
  /* Round 161: the deep filters. */
  const [posExact, setPosExact] = useState<'any' | Position>('any');
  const [ageBand, setAgeBand] = useState<(typeof AGE_BANDS)[number]['id']>('any');
  const [priceBand, setPriceBand] = useState<(typeof PRICE_BANDS)[number]['id']>('any');
  const [leaguePick, setLeaguePick] = useState('any');
  const [natPick, setNatPick] = useState('any');
  const [sortKey, setSortKey] = useState<SortKey>('rating');
  /* Round 161: the deal structure being offered right now. */
  const [addOn, setAddOn] = useState(0);
  const [sellOnPct, setSellOnPct] = useState(0);
  const [swapId, setSwapId] = useState<string | null>(null);
  /* Round 506: his "YOU type the bid". The presets below still fire straight
     off, because the browser walk clicks them and they are a good shortcut,
     but the number in this box is the one the meter is reading. */
  const [bid, setBid] = useState('');
  /* Round 506: the personal terms you are putting to him. Null until the fee
     is agreed, then seeded from what his agent opened with. */
  const [terms, setTerms] = useState<PersonalTerms | null>(null);
  /* Round 507 fix: the wage box holds TEXT while you are typing in it. It held
     a number clamped with Math.max(1, ...), so backspacing to empty snapped the
     controlled value to 1 with the cursor after it, and the next keystroke
     produced 180 out of an intended 80. The bid box above never had this
     because it keeps its own string, which is the shape copied here. */
  const [wageText, setWageText] = useState('');

  const windowOpen = career.transferWindow !== null;
  const neg = career.negotiation ?? null;
  const bids = career.incomingBids ?? [];
  const log = career.transferLog ?? [];

  /* A fresh negotiation starts with a clean structure. */
  const negName = neg?.player.name ?? null;
  useEffect(() => {
    setAddOn(0);
    setSellOnPct(0);
    setSwapId(null);
    setBid('');
    setTerms(null);
  }, [negName]);

  /* Round 506: when the clubs shake hands his agent puts an opening sheet on
     the table, and that sheet is what the panel starts from. Keyed on the
     phase and on what he is currently asking for, so his counter moves the
     sliders under you the way a counter should. */
  const wantKey = neg?.phase === 'terms' && neg.terms
    ? `${neg.terms.want.years}:${neg.terms.want.wage}:${neg.terms.want.bonus}:${neg.terms.want.role}`
    : '';
  useEffect(() => {
    if (!wantKey) return;
    const want = career.negotiation?.terms?.want;
    if (want) { setTerms({ ...want }); setWageText(String(want.wage)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantKey]);

  const marketLeagues = useMemo(() => {
    const names = new Set<string>();
    for (const m of market) names.add(leagueOf(m.club).name);
    return [...names].sort();
  }, [market]);

  /* Round 194: every nationality actually present in THIS world's market,
     busiest first, so the dropdown never offers a nation with no players.
     Era markets automatically offer era nations only. */
  const marketNations = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of market) {
      const nat = nationalityOf(career.eraId, m.name);
      if (nat) counts.set(nat, (counts.get(nat) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [market, career.eraId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const age = AGE_BANDS.find(b => b.id === ageBand) ?? AGE_BANDS[0];
    const price = PRICE_BANDS.find(b => b.id === priceBand) ?? PRICE_BANDS[0];
    const list = market
      .filter(m => filter === 'ALL' || POS_GROUPS[filter].includes(m.position))
      .filter(m => posExact === 'any' || m.position === posExact)
      .filter(m => m.age >= age.lo && m.age <= age.hi)
      .filter(m => m.price <= price.max)
      .filter(m => leaguePick === 'any' || leagueOf(m.club).name === leaguePick)
      .filter(m => natPick === 'any' || nationalityOf(career.eraId, m.name) === natPick)
      .filter(m => !q || m.name.toLowerCase().includes(q) || m.club.toLowerCase().includes(q));
    const sorted = [...list];
    if (sortKey === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    else if (sortKey === 'value') sorted.sort((a, b) => (b.value ?? b.price) - (a.value ?? a.price));
    else if (sortKey === 'young') sorted.sort((a, b) => a.age - b.age || b.rating - a.rating);
    else sorted.sort((a, b) => a.price - b.price || b.rating - a.rating);
    return sorted.slice(0, 50);
  }, [market, filter, posExact, ageBand, priceBand, leaguePick, natPick, sortKey, query, career.eraId]);

  const sellable = useMemo(
    () => [...career.squad].sort((a, b) => b.rating - a.rating),
    [career.squad],
  );

  const news = useMemo(() => {
    const items = [...log].reverse();
    if (newsSort === 'fee') items.sort((a, b) => b.fee - a.fee);
    return items.slice(0, 50);
  }, [log, newsSort]);

  const canSell = (p: CMPlayer) => windowOpen && canLeaveSquad(career, p);
  const loansUsed = activeLoans(career);
  const out = career.loanedOut ?? [];

  /* Round 161: the structure travels with every offer button. */
  const dealExtras: DealExtras | undefined =
    addOn > 0 || sellOnPct > 0 || swapId
      ? { addOn: addOn || undefined, sellOnPct: sellOnPct || undefined, swapId: swapId ?? undefined }
      : undefined;
  const structureBonus = neg && neg.status === 'open'
    ? dealPackageValue(career, neg.theirAsk, 0, dealExtras)
    : 0;

  /* Round 506: the closeness meter, read off the same two functions the
     engine judges with. It reads the whole PACKAGE rather than the cash, so
     adding a sell-on visibly moves the bar. */
  const typedBid = Math.max(0, Math.round((parseFloat(bid) || 0) * 10) / 10);
  const typedPackage = neg && neg.status === 'open' && neg.phase !== 'terms'
    ? dealPackageValue(career, neg.theirAsk, typedBid, dealExtras)
    : 0;
  const typedCloseness = neg && neg.status === 'open' && neg.phase !== 'terms'
    ? dealCloseness(typedPackage, neg.theirAsk)
    : 0;
  const typedVerdict = neg && neg.status === 'open' && neg.phase !== 'terms'
    ? offerVerdict(typedPackage, neg.theirAsk)
    : 'counter';
  /* Round 507 fix: makeOffer runs the beat the rival check BEFORE it asks
     offerVerdict, and returns early when the package does not beat the rival's
     cash. The meter only read offerVerdict, so with a rival ahead it could sit
     on emerald saying "They will take this" about an offer the engine was
     about to refuse, with a 30 percent chance of losing the player outright for
     dithering. The screen has to know about the rival too. */
  const behindRival = !!neg && neg.status === 'open' && neg.phase !== 'terms'
    && !!neg.rivalBidder && neg.rivalOffer !== null && typedBid > 0
    && typedPackage <= neg.rivalOffer;
  const bidTooBig = typedBid > career.budget;

  /* Round 506: what his side would say to the sheet on the table right now. */
  const want = neg?.phase === 'terms' ? neg.terms?.want ?? null : null;
  const termsClose = want && terms ? termsCloseness(want, terms) : 0;
  /* Round 506: the two tables must speak one language. The first draft of this
     panel only ever said "He will sign this" or a number, so a player who had
     learned the fee meter's five words got two on the second table and was
     never warned he was about to insult the agent, even though termsVerdict
     computes exactly that. The browser walk found it. */
  const termsSay = want && terms ? termsVerdict(want, terms) : 'counter';
  const signOnRoom = neg?.phase === 'terms'
    ? Math.round((career.budget - (neg.agreedFee ?? 0)) * 10) / 10
    : 0;
  /* Round 507 fix: falling back to a cap of 0 was this file inventing a breach.
     wageCap is optional and is only filled by ensureContracts, which loadCareer
     does NOT call, so a save opened straight onto the transfer tab had no cap
     and every wage read as over the ceiling. Every other reader in the repo
     falls back to wageCapFrom(bill), and so does this one now. */
  const bill = Math.round(wageBill(career));
  const room = terms ? wageRoom(bill, career.wageCap ?? wageCapFrom(bill), terms.wage) : null;
  const roomLine = room ? wageRoomLine(room) : '';

  const offerBtn = (label: string, amount: number, tone: 'safe' | 'risky' | 'close' = 'safe') => (
    <button
      key={label}
      onClick={() => onOffer(Math.round(amount * 10) / 10, dealExtras)}
      className={cn(
        'px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all',
        tone === 'close' && 'bg-primary text-primary-foreground border-primary hover:opacity-90',
        tone === 'safe' && 'bg-card border-border text-foreground hover:border-primary',
        tone === 'risky' && 'bg-card border-yellow-500/40 text-yellow-400 hover:border-yellow-400',
      )}
    >
      {label} · {money(Math.round(amount * 10) / 10)}
    </button>
  );

  const swapPool = useMemo(
    () => [...career.squad]
      .filter(p => canLeaveSquad(career, p))
      .sort((a, b) => sellValue(b) - sellValue(a))
      .slice(0, 10),
    [career],
  );

  return (
    <div className="space-y-4">
      {/* Window status + budget */}
      <div className={cn(
        'rounded-xl border p-3 flex items-center justify-between',
        windowOpen ? 'border-primary/40 bg-primary/10' : 'border-border bg-card',
      )}>
        <div>
          <div className="text-xs font-bold text-foreground">
            {windowOpen
              ? career.transferWindow === 'summer' ? '☀️ Summer window OPEN' : '❄️ January window OPEN'
              : '🔒 Transfer window closed'}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {windowOpen
              ? `${(career.windowWeeksLeft ?? 1) <= 1 ? 'DEADLINE: shuts after your next match' : `${career.windowWeeksLeft} match weeks until the deadline`} · offers can arrive any week · loans used ${loansUsed}/2`
              : 'Reopens in January / next summer'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget</div>
          <div className="text-lg font-bold font-display text-gold">{money(career.budget)}</div>
        </div>
      </div>

      {/* Round 71: live negotiation table */}
      {neg && (
        <div className={cn(
          'rounded-xl border p-3',
          neg.status === 'agreed' ? 'border-emerald-500/50 bg-emerald-500/10'
            : neg.status === 'open' ? 'border-gold/50 bg-gold/5'
            : 'border-red-500/40 bg-red-500/5',
        )}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Handshake className="w-3.5 h-3.5" />
              {neg.status === 'open'
                ? (neg.phase === 'terms' ? 'Personal terms' : 'Negotiating')
                : neg.status === 'agreed' ? 'DEAL DONE' : neg.status === 'hijacked' ? 'HIJACKED' : 'DEAL COLLAPSED'}: {neg.player.name}
            </div>
            <span className={cn('text-sm font-bold font-display', ratingTint(neg.player.rating))}>{neg.player.rating}</span>
          </div>
          <div className="text-[10px] text-muted-foreground mb-1.5">
            {neg.player.club} · {neg.player.position} · {neg.player.age}y · {valuationLine(career, neg.player)}
          </div>

          {neg.status === 'open' && neg.phase !== 'terms' && (
            <>
              <div className="flex items-center gap-3 text-[11px] mb-1">
                <span className="text-foreground">Their ask: <span className="font-bold text-gold">{money(neg.theirAsk)}</span></span>
                {neg.myOffer !== null && <span className="text-muted-foreground">Your last: {money(neg.myOffer)}</span>}
                <span className="text-muted-foreground ml-auto" title="Rounds they will keep talking. Every offer costs one, an insult costs two.">
                  {'●'.repeat(Math.max(0, neg.patience))}{'○'.repeat(Math.max(0, 5 - neg.patience))}
                </span>
              </div>
              {neg.rivalBidder && neg.rivalOffer !== null && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[10px] text-red-400 font-bold mb-1.5">
                  ⚔️ Bidding war: {neg.rivalBidder} at {money(neg.rivalOffer)}
                </div>
              )}
              <p className="text-[11px] italic text-muted-foreground mb-2">"{neg.note}"</p>

              {/* Round 161: structure the deal. His words: "true negations not
                  just 3 buttons that say haggle... add ons and u can swap
                  players plus money". Everything below rides on top of
                  whichever cash button you press. */}
              <div className="rounded-lg border border-border/60 bg-background/40 p-2 mb-2 space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider w-14 shrink-0">Add-ons</span>
                  {[0, 2, 5, 10].map(a => (
                    <button
                      key={a}
                      onClick={() => setAddOn(a)}
                      className={cn('px-2 py-0.5 rounded text-[9px] font-bold border transition-all',
                        addOn === a ? 'bg-primary/15 border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary/50')}
                    >
                      {a === 0 ? 'None' : money(a)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider w-14 shrink-0">Sell-on</span>
                  {[0, 10, 20, 30].map(s => (
                    <button
                      key={s}
                      onClick={() => setSellOnPct(s)}
                      className={cn('px-2 py-0.5 rounded text-[9px] font-bold border transition-all',
                        sellOnPct === s ? 'bg-primary/15 border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary/50')}
                    >
                      {s === 0 ? 'None' : `${s}%`}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider w-14 shrink-0">Swap</span>
                  <select
                    value={swapId ?? ''}
                    onChange={e => setSwapId(e.target.value || null)}
                    className="flex-1 bg-secondary border border-border rounded px-1.5 py-1 text-[10px] text-foreground"
                    aria-label="Part exchange player"
                  >
                    <option value="">No part exchange</option>
                    {swapPool.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.rating}, {money(sellValue(p))})</option>
                    ))}
                  </select>
                </div>
                {structureBonus > 0 && (
                  <div className="text-[9px] text-muted-foreground">
                    This structure reads like <span className="text-gold font-bold">{money(structureBonus)}</span> to them, on top of whatever cash you press below. Add-ons cost real money in later summers; a sell-on takes its cut when you resell him.
                  </div>
                )}
              </div>

              {/* Round 506: his "YOU type the bid", with the closeness meter
                  above it. The bar reads the whole package, so pressing a
                  sell-on chip moves it without a penny changing hands, and it
                  is the engine's own dealCloseness rather than a second
                  opinion written for the screen. */}
              <div className="rounded-lg border border-border/60 bg-background/40 p-2 mb-2 space-y-1.5" data-deal-desk>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider">How close you are</span>
                  <span className={cn('text-[10px] font-bold',
                    behindRival ? 'text-red-400'
                      : typedVerdict === 'agreed' ? 'text-emerald-400'
                      : typedVerdict === 'walkout' ? 'text-red-400'
                      : typedVerdict === 'insulted' ? 'text-yellow-400' : 'text-foreground',
                  )}>
                    {typedBid <= 0 ? 'Name your price'
                      : behindRival ? `${neg.rivalBidder} are still ahead`
                      : typedVerdict === 'agreed' ? 'They will take this'
                      : typedVerdict === 'walkout' ? 'They will end the talks'
                      : typedVerdict === 'insulted' ? 'They will be insulted'
                      : `${typedCloseness} of 100`}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden" role="presentation">
                  <div
                    className={cn('h-full rounded-full transition-all',
                      behindRival ? 'bg-red-500'
                        : typedVerdict === 'agreed' ? 'bg-emerald-500'
                        : typedVerdict === 'walkout' ? 'bg-red-500'
                        : typedVerdict === 'insulted' ? 'bg-yellow-500' : 'bg-primary',
                    )}
                    style={{ width: `${typedBid <= 0 ? 0 : Math.max(3, typedCloseness)}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider w-14 shrink-0">Your bid</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.5}
                    value={bid}
                    onChange={e => setBid(e.target.value)}
                    placeholder={`${Math.round(neg.theirAsk * 10) / 10}`}
                    aria-label="Your bid in millions"
                    className="h-7 flex-1 text-[11px]"
                  />
                  <span className="text-[9px] text-muted-foreground">m</span>
                  <button
                    onClick={() => { onOffer(typedBid, dealExtras); setBid(''); }}
                    disabled={typedBid <= 0 || bidTooBig}
                    className={cn('px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all',
                      typedBid > 0 && !bidTooBig
                        ? 'bg-primary text-primary-foreground border-primary hover:opacity-90'
                        : 'bg-card border-border text-muted-foreground opacity-50 cursor-not-allowed')}
                  >
                    Offer it
                  </button>
                </div>
                {bidTooBig && (
                  <div className="text-[9px] text-red-400">
                    That is more than the {money(career.budget)} you have.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {offerBtn('Lowball', neg.theirAsk * 0.72, 'risky')}
                {offerBtn('Haggle', neg.theirAsk * 0.88)}
                {neg.myOffer !== null && offerBtn('Split it', (neg.theirAsk + neg.myOffer) / 2)}
                {neg.rivalBidder && neg.rivalOffer !== null
                  ? offerBtn('Beat rival', Math.max(neg.rivalOffer * 1.06 - structureBonus, neg.theirAsk * 0.97 - structureBonus), 'close')
                  : offerBtn('Meet ask', Math.max(0.1, neg.theirAsk - structureBonus), 'close')}
                <button
                  onClick={onWalk}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-border bg-card text-muted-foreground hover:text-foreground transition-all"
                >
                  Walk away
                </button>
              </div>
            </>
          )}

          {/* Round 506: the second table. His "then personal terms: length,
              wages, add ons, role promises, everything". A fee being agreed
              used to sign the player on a hard coded four year deal at a wage
              the manager was never shown. The rung you pick here goes into
              Round 127's ladder, so if you then leave him out he knows. */}
          {neg.status === 'open' && neg.phase === 'terms' && want && terms && (
            <>
              <p className="text-[11px] italic text-muted-foreground mb-2">"{neg.terms?.note}"</p>
              <div className="flex items-center gap-3 text-[11px] mb-1.5">
                <span className="text-foreground">Fee agreed: <span className="font-bold text-gold">{money(neg.agreedFee ?? 0)}</span></span>
                <span className="text-muted-foreground ml-auto" title="Rounds his agent will keep talking.">
                  {'●'.repeat(Math.max(0, neg.terms?.patience ?? 0))}{'○'.repeat(Math.max(0, 3 - (neg.terms?.patience ?? 0)))}
                </span>
              </div>

              <div className="rounded-lg border border-border/60 bg-background/40 p-2 mb-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider">He is asking</span>
                  <span className="text-[10px] text-foreground font-bold">
                    {want.years}y · {want.wage}k/w · {money(want.bonus)} on · {ROLE_INFO[want.role].label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider w-14 shrink-0">Length</span>
                  {Array.from({ length: MAX_TERMS_YEARS - MIN_TERMS_YEARS + 1 }, (_, i) => MIN_TERMS_YEARS + i).map(y => (
                    <button
                      key={y}
                      onClick={() => setTerms({ ...terms, years: y })}
                      className={cn('px-2 py-0.5 rounded text-[9px] font-bold border transition-all',
                        terms.years === y ? 'bg-primary/15 border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary/50')}
                    >
                      {y}y
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider w-14 shrink-0">Wage</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={5}
                    value={wageText}
                    onChange={e => {
                      const raw = e.target.value;
                      setWageText(raw);
                      const n = Math.round(parseFloat(raw));
                      if (Number.isFinite(n) && n >= 1) setTerms({ ...terms, wage: n });
                    }}
                    onBlur={() => setWageText(String(terms.wage))}
                    aria-label="Weekly wage in thousands"
                    className="h-7 flex-1 text-[11px]"
                  />
                  <span className="text-[9px] text-muted-foreground">k/w</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider w-14 shrink-0">Signing on</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.5}
                    value={terms.bonus}
                    onChange={e => setTerms({ ...terms, bonus: Math.max(0, Math.round((parseFloat(e.target.value) || 0) * 10) / 10) })}
                    aria-label="Signing bonus in millions"
                    className="h-7 flex-1 text-[11px]"
                  />
                  <span className="text-[9px] text-muted-foreground">m</span>
                </div>

                <div className="flex items-start gap-1.5 flex-wrap">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider w-14 shrink-0 pt-0.5">Role</span>
                  <div className="flex flex-wrap gap-1 flex-1">
                    {(ROLE_LADDER as SquadRole[]).map(r => (
                      <button
                        key={r}
                        onClick={() => setTerms({ ...terms, role: r })}
                        title={ROLE_INFO[r].promise}
                        className={cn('px-2 py-0.5 rounded text-[9px] font-bold border transition-all',
                          terms.role === r ? 'bg-primary/15 border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary/50')}
                      >
                        {ROLE_INFO[r].emoji} {ROLE_INFO[r].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {ROLE_INFO[terms.role].promise} Going back on it later costs you six weeks of his wage a rung.
                </div>

                {terms.bonus > signOnRoom && (
                  <div className="text-[9px] text-red-400">
                    The fee and this bonus come to more than the budget. You have {money(Math.max(0, signOnRoom))} left after the fee.
                  </div>
                )}
                {roomLine !== '' && <div className="text-[9px] text-yellow-400">{roomLine}</div>}
              </div>

              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">How he reads it</span>
                <span className={cn('text-[10px] font-bold',
                  termsSay === 'agreed' ? 'text-emerald-400'
                    : termsSay === 'walkout' ? 'text-red-400'
                    : termsSay === 'insulted' ? 'text-yellow-400' : 'text-foreground',
                )}>
                  {termsSay === 'agreed' ? 'He will sign this'
                    : termsSay === 'walkout' ? 'His agent will end the meeting'
                    : termsSay === 'insulted' ? 'He will be insulted'
                    : `${termsClose} of 100`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-2" role="presentation">
                <div
                  className={cn('h-full rounded-full transition-all',
                    termsSay === 'agreed' ? 'bg-emerald-500'
                      : termsSay === 'walkout' ? 'bg-red-500'
                      : termsSay === 'insulted' ? 'bg-yellow-500' : 'bg-primary',
                  )}
                  style={{ width: `${Math.max(3, termsClose)}%` }}
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => onProposeTerms(terms)}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-primary text-primary-foreground border border-primary hover:opacity-90 transition-all"
                >
                  Put it to him
                </button>
                <button
                  onClick={() => setTerms({ ...want })}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-border bg-card text-foreground hover:border-primary transition-all"
                >
                  Give him what he wants
                </button>
                <button
                  onClick={onWalk}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-border bg-card text-muted-foreground hover:text-foreground transition-all"
                >
                  Walk away
                </button>
              </div>
            </>
          )}

          {neg.status !== 'open' && (
            <>
              <p className="text-[11px] italic text-muted-foreground mb-2">"{neg.note}"</p>
              <button
                onClick={onDismissNegotiation}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-secondary text-foreground hover:bg-secondary/70 transition-all"
              >
                {neg.status === 'agreed' ? 'Back to the market' : 'Close'}
              </button>
            </>
          )}
        </div>
      )}

      {/* AI headlines */}
      {career.aiHeadlines.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Newspaper className="w-3 h-3" /> Around the league
          </div>
          {career.aiHeadlines.map((h, i) => (
            <p key={i} className="text-xs text-foreground py-0.5">📰 {h}</p>
          ))}
        </div>
      )}

      {/* Mode toggle */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => setMode('buy')}
          className={cn('rounded-lg border py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all',
            mode === 'buy' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:border-primary')}
        >
          <ArrowDownToLine className="w-3.5 h-3.5" /> Buy
        </button>
        <button
          onClick={() => setMode('sell')}
          className={cn('rounded-lg border py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all',
            mode === 'sell' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:border-primary')}
        >
          <ArrowUpFromLine className="w-3.5 h-3.5" /> Sell
          {bids.length > 0 && <span className="ml-0.5 text-[9px] bg-gold text-background rounded-full px-1.5 py-0.5 font-bold">{bids.length}</span>}
        </button>
        <button
          onClick={() => setMode('news')}
          className={cn('rounded-lg border py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all',
            mode === 'news' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:border-primary')}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Latest
        </button>
      </div>

      {mode === 'buy' && (windowOpen ? (
        <div className="space-y-2">
          <div className="flex gap-1.5 flex-wrap items-center">
            {(['ALL', 'GK', 'DEF', 'MID', 'ATT'] as PosFilter[]).map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPosExact('any'); }}
                className={cn('px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all',
                  filter === f && posExact === 'any' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary')}
              >
                {f}
              </button>
            ))}
            {/* Round 161: exact positions, "not just attack but left and
                right wing and such". Picking one overrides the group chip. */}
            <select
              value={posExact}
              onChange={e => { setPosExact(e.target.value as 'any' | Position); if (e.target.value !== 'any') setFilter('ALL'); }}
              className="bg-card border border-border rounded-full px-2 py-1 text-[10px] font-bold text-foreground"
              aria-label="Exact position"
            >
              <option value="any">Exact position…</option>
              {EXACT_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            <select
              value={ageBand}
              onChange={e => setAgeBand(e.target.value as (typeof AGE_BANDS)[number]['id'])}
              className="bg-card border border-border rounded-lg px-2 py-1.5 text-[10px] font-bold text-foreground"
              aria-label="Age range"
            >
              {AGE_BANDS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            <select
              value={priceBand}
              onChange={e => setPriceBand(e.target.value as (typeof PRICE_BANDS)[number]['id'])}
              className="bg-card border border-border rounded-lg px-2 py-1.5 text-[10px] font-bold text-foreground"
              aria-label="Price range"
            >
              {PRICE_BANDS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            <select
              value={leaguePick}
              onChange={e => setLeaguePick(e.target.value)}
              className="bg-card border border-border rounded-lg px-2 py-1.5 text-[10px] font-bold text-foreground"
              aria-label="Selling league"
            >
              <option value="any">Any league</option>
              {marketLeagues.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select
              value={natPick}
              onChange={e => setNatPick(e.target.value)}
              className="bg-card border border-border rounded-lg px-2 py-1.5 text-[10px] font-bold text-foreground"
              aria-label="Nationality"
              data-nat-filter
            >
              <option value="any">Any nation</option>
              {/* Round 453: up to 132 nations in one dropdown, so each sits
                  under its confederation, busiest first inside the group. */}
              {groupByConfederation(marketNations, ([nat]) => nat).map(g => (
                <optgroup key={g.conf} label={g.label}>
                  {g.items.map(([nat, n]) => <option key={nat} value={nat}>{nat} ({n})</option>)}
                </optgroup>
              ))}
            </select>
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="bg-card border border-border rounded-lg px-2 py-1.5 text-[10px] font-bold text-foreground"
              aria-label="Sort players"
            >
              <option value="rating">Best first</option>
              <option value="value">Priciest first</option>
              <option value="young">Youngest first</option>
              <option value="cheap">Cheapest first</option>
            </select>
          </div>
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search player or club…"
            aria-label="Search player or club"
            className="bg-card border-border text-sm"
          />
          <div className="bg-card border border-border rounded-xl p-2 max-h-96 overflow-y-auto">
            {filtered.map(m => {
              const clause = releaseClauseOf(m, career.season);
              const canLoan = loanEligible(career, m) && loansUsed < 2;
              const negBusy = !!(neg && neg.status === 'open');
              const cold = (career.coldNames ?? []).includes(m.name);
              return (
                <div key={m.name} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                  <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{m.position}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {/* Round 194: his real nationality's flag, from this
                          world's own map. Made-up players honestly get none. */}
                      {(() => { const nat = nationalityOf(career.eraId, m.name); return nat ? <FlagImg name={nat} size={14} /> : null; })()}
                      <span className="text-xs text-foreground truncate">{m.name}</span>
                      {/* Round 132: you are about to spend real money on him, so
                          you get told whether he is a real person. */}
                      {m.generated && <MadeUpTag />}
                    </div>
                    <div className="text-[9px] text-muted-foreground truncate">
                      {/* Round 506: your recruitment desk's read, not the
                          number off the table. A weak lead scout gives you a
                          wide band and a good one gives you a figure. */}
                      {m.club} · {m.age}y{m.value !== undefined ? <> · {valuationLine(career, m)}</> : null}
                    </div>
                  </div>
                  <span className={cn('text-sm font-bold font-display', ratingTint(m.rating))}>{m.rating}</span>
                  <div className="shrink-0 flex flex-col gap-1 items-stretch">
                    <button
                      onClick={() => onNegotiate(m)}
                      disabled={negBusy || cold}
                      title={cold ? 'They walked away from you this window' : 'Open talks'}
                      className={cn('px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all min-w-[72px]',
                        !negBusy && !cold ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed')}
                    >
                      {cold ? 'Cold' : <>Talk · {money(m.price)}</>}
                    </button>
                    <div className="flex gap-1">
                      {clause !== null && (
                        <button
                          onClick={() => onClause(m)}
                          disabled={clause > career.budget}
                          title={`Release clause: pay ${money(clause)} and the deal is instant`}
                          className={cn('flex-1 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all inline-flex items-center justify-center gap-0.5',
                            clause <= career.budget ? 'border-gold/50 text-gold hover:bg-gold/10' : 'border-border text-muted-foreground cursor-not-allowed')}
                        >
                          <Zap className="w-2.5 h-2.5" />{money(clause)}
                        </button>
                      )}
                      {canLoan && (
                        <button
                          onClick={() => onLoan(m)}
                          disabled={loanFeeOf(m) > career.budget}
                          title={`Season loan for ${money(loanFeeOf(m))}, with an option to buy and a release figure agreed up front`}
                          className={cn('flex-1 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all',
                            loanFeeOf(m) <= career.budget ? 'border-border text-muted-foreground hover:text-foreground hover:border-primary' : 'border-border text-muted-foreground/50 cursor-not-allowed')}
                        >
                          Loan {money(loanFeeOf(m))}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No players match your search.</p>
            )}
          </div>
          {career.squad.length >= 30 && (
            <p className="text-[10px] text-yellow-400">Squad is full (30). Sell before you buy.</p>
          )}
        </div>
      ) : (
        <ClosedWindowBusiness career={career} />
      ))}

      {mode === 'sell' && (
        <div className="space-y-2">
          {/* Round 71: incoming bids for my players */}
          {windowOpen && bids.length > 0 && (
            <div className="bg-card border border-gold/40 rounded-xl p-3 space-y-2">
              <div className="text-[10px] text-gold uppercase tracking-wider font-bold">📥 Bids on the table</div>
              {bids.map(b => {
                const p = career.squad.find(x => x.id === b.playerId);
                const blocked = !p || !canSell(p);
                return (
                  <div key={b.playerId} className={cn('flex items-center gap-2', b.clauseMet && 'rounded-lg border border-red-500/40 bg-red-500/5 px-2 py-1.5')}>
                    <div className="flex-1 min-w-0 text-xs text-foreground">
                      <div className="truncate">
                        <span className="font-bold">{b.club}</span>
                        {b.clauseMet ? ' trigger the ' : b.loan ? ' want ' : ' bid '}
                        <span className="font-bold text-gold">{money(b.offer)}</span>
                        {b.clauseMet ? ' release clause in ' : b.loan ? ' to take ' : ' for '}{b.playerName}
                        {b.clauseMet ? "'s contract" : ''}
                        {b.loan && <span className="text-[9px] text-sky-400 ml-1">(season loan)</span>}
                        {b.status === 'improved' && <span className="text-[9px] text-emerald-400 ml-1">(improved, final)</span>}
                      </div>
                      {/* Round 193: a met clause is not a negotiation. */}
                      {b.clauseMet && (
                        <div className="text-[9px] text-red-400 truncate">You signed this exit door at his renewal. It cannot be rejected, and it executes itself on deadline day.</div>
                      )}
                      {b.rival && (
                        <div className="text-[9px] text-emerald-400 truncate">
                          {b.rival} are in the race too, which is why the number is that high.
                        </div>
                      )}
                      {b.fromListing && !b.rival && (
                        <div className="text-[9px] text-muted-foreground truncate">They know he is listed, so this is a market price.</div>
                      )}
                    </div>
                    <button
                      onClick={() => onAcceptBid(b.playerId)}
                      disabled={blocked}
                      title={blocked ? 'Squad rules block this sale right now' : b.clauseMet ? 'Shake his hand now instead of on deadline day' : 'Accept the bid'}
                      className={cn('shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all',
                        !blocked ? 'bg-emerald-600 text-black hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed')}
                    >
                      {b.clauseMet ? 'Let him go' : 'Accept'}
                    </button>
                    {!b.clauseMet && (
                      <button
                        onClick={() => onRejectBid(b.playerId)}
                        className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-secondary text-foreground hover:bg-secondary/70 transition-all"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                );
              })}
              <p className="text-[9px] text-muted-foreground">Reject and they might come back higher, once. Players sometimes sulk when you block a move.</p>
            </div>
          )}

          {/* Round 94: who is currently out on loan */}
          {out.length > 0 && (
            <div className="bg-card border border-sky-500/30 rounded-xl p-3 space-y-1">
              <div className="text-[10px] text-sky-400 uppercase tracking-wider font-bold">🔄 Out on loan</div>
              {out.map(l => (
                <div key={l.player.id} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 min-w-0 truncate text-foreground">
                    <span className="font-bold">{l.player.name}</span>
                    <span className="text-muted-foreground"> at {l.club}</span>
                  </span>
                  <span className={cn('font-bold font-display', ratingTint(l.player.rating))}>{l.player.rating}</span>
                </div>
              ))}
              <p className="text-[9px] text-muted-foreground">
                Back in the summer. Under 25s come home with a rating bump from playing every week.
              </p>
            </div>
          )}

          {/* Round 99: found by playing it. This whole list used to be hidden
              whenever the window was shut, and the window shuts the moment you
              play a match, so a player who taps Play Match straight away never
              saw the transfer list, loan list or block controls at all. Telling
              your club a player is available is an instruction, not a deal, so
              it works any time. Only the money moves need an open window. */}
          <div className="bg-card border border-border rounded-xl p-2 max-h-[28rem] overflow-y-auto">
              <p className="text-[9px] text-muted-foreground px-1 pb-1.5 border-b border-border/40">
                {windowOpen
                  ? 'Nobody sells a player over the counter. Transfer list him and clubs will come to you with offers, sometimes two of them fighting over the same man, and the bids land in Incoming above.'
                  : 'The window is shut, so nobody moves today. You can still tell the club who is available, who is off limits and who you want out on loan, and it will be waiting when it reopens.'}
              </p>
              {sellable.map(p => {
                const st = p.transferStatus;
                const free = canSell(p);
                const pill = (key: TransferStatus, label: string) => (
                  <button
                    key={key}
                    onClick={() => onSetStatus(p.id, st === key ? null : key)}
                    disabled={!!p.onLoan}
                    title={STATUS_META[key].blurb}
                    className={cn(
                      'px-2 py-1 rounded-md text-[9px] font-bold border transition-all',
                      p.onLoan ? 'bg-secondary border-border text-muted-foreground cursor-not-allowed'
                        : st === key ? STATUS_META[key].tint
                        : 'bg-card border-border text-muted-foreground hover:border-primary',
                    )}
                  >
                    {label}
                  </button>
                );
                return (
                  <div key={p.id} className="py-2 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.position}</span>
                      <div className="flex-1 min-w-0">
                        <div className={cn('text-xs truncate', p.isYouth ? 'text-muted-foreground italic' : 'text-foreground')}>
                          {p.name}
                          {p.generated && <MadeUpTag className="ml-1" />}
                          {p.onLoan && <span className="text-[9px] text-muted-foreground ml-1">(borrowed)</span>}
                          {st && <span className={cn('text-[8px] font-bold rounded px-1 ml-1 border', STATUS_META[st].tint)}>{STATUS_META[st].short}</span>}
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                          {p.age}y · {p.seasonGoals}g {p.seasonAssists}a · worth {money(sellValue(p))}
                          {/* Round 161: the clause his old club took travels with him. */}
                          {p.sellOnOwed && (
                            <span className="text-gold"> · {p.sellOnOwed.pct}% sell-on owed to {p.sellOnOwed.club}</span>
                          )}
                        </div>
                      </div>
                      <span className={cn('text-sm font-bold font-display', ratingTint(p.rating))}>{p.rating}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 pl-11 flex-wrap">
                      {/* Round 506: a borrowed man is not for sale and cannot be
                          listed, so his line carries the two figures agreed when
                          he arrived instead of three pills that all refuse. */}
                      {p.onLoan ? (
                        <>
                          <span className="text-[9px] text-muted-foreground">
                            On loan from {p.loanFrom ?? 'his club'}
                          </span>
                          {p.loanOptionFee !== undefined && (
                            <button
                              onClick={() => onBuyLoanee(p.id)}
                              disabled={!windowOpen || p.loanOptionFee > career.budget}
                              title={windowOpen
                                ? `Buy him outright at the figure agreed when he arrived, ${money(p.loanOptionFee)}`
                                : 'The option can only be taken up while a window is open'}
                              className={cn('px-2 py-1 rounded-md text-[9px] font-bold border transition-all',
                                windowOpen && p.loanOptionFee <= career.budget
                                  ? 'bg-card border-emerald-500/50 text-emerald-400 hover:border-emerald-400'
                                  : 'bg-secondary border-border text-muted-foreground cursor-not-allowed')}
                            >
                              Buy him · {money(p.loanOptionFee)}
                            </button>
                          )}
                          {p.loanBreakFee !== undefined && (
                            <button
                              onClick={() => onEndLoanEarly(p.id)}
                              disabled={!windowOpen || p.loanBreakFee > career.budget}
                              title={windowOpen
                                ? `Send him back early. The release figure agreed when he arrived is ${money(p.loanBreakFee)}`
                                : 'The loan can only be ended while a window is open'}
                              className={cn('px-2 py-1 rounded-md text-[9px] font-bold border transition-all',
                                windowOpen && p.loanBreakFee <= career.budget
                                  ? 'bg-card border-border text-muted-foreground hover:text-foreground'
                                  : 'bg-secondary border-border text-muted-foreground cursor-not-allowed')}
                            >
                              Send him back · {money(p.loanBreakFee)}
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                      {pill('listed', 'Transfer list')}
                      {pill('loanListed', 'Loan list')}
                      {pill('blocked', 'Not for sale')}
                      <button
                        onClick={() => onLoanOut(p.id)}
                        disabled={!free}
                        title={free ? 'Send him out on loan for the rest of the season' : 'Squad rules block this right now'}
                        className={cn('px-2 py-1 rounded-md text-[9px] font-bold border transition-all',
                          free ? 'bg-card border-sky-500/50 text-sky-400 hover:border-sky-400'
                            : 'bg-secondary border-border text-muted-foreground cursor-not-allowed')}
                      >
                        Loan out now +{money(loanOutFee(p))}
                      </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {career.squad.length <= 14 && (
                <p className="text-[10px] text-yellow-400 px-1 py-2">Squad at minimum size (14). Nobody else can leave.</p>
              )}
          </div>
          {!windowOpen && <ClosedWindowBusiness career={career} />}
        </div>
      )}

      {mode === 'news' && (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <button
              onClick={() => setNewsSort('recent')}
              className={cn('px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all',
                newsSort === 'recent' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary')}
            >
              Most recent
            </button>
            <button
              onClick={() => setNewsSort('fee')}
              className={cn('px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all',
                newsSort === 'fee' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary')}
            >
              Biggest fees
            </button>
          </div>
          <div className="bg-card border border-border rounded-xl p-2 max-h-96 overflow-y-auto">
            {news.map((n, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0 text-xs">
                <span className="shrink-0 text-[9px] text-muted-foreground w-8">S{n.season}</span>
                <div className="flex-1 min-w-0 text-foreground truncate">
                  <span className="font-bold">{n.name}</span>
                  <span className="text-muted-foreground"> · {n.from} to {n.to}</span>
                  {n.loan && <span className="text-[9px] text-muted-foreground ml-1">(loan)</span>}
                </div>
                <span className="shrink-0 font-bold text-gold">{money(n.fee)}</span>
              </div>
            ))}
            {news.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No transfers yet. Open a window and make some noise.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** This season's in/out list, shown when the window is shut. */
function ClosedWindowBusiness({ career }: { career: CareerState }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-xs font-bold text-foreground mb-2">This season's business</div>
      {career.seasonSignings.length === 0 && (
        <p className="text-xs text-muted-foreground">No transfers yet this season.</p>
      )}
      {career.seasonSignings.map((t, i) => (
        <p key={i} className="text-xs py-0.5">
          {t.dir === 'in'
            ? <span className="text-emerald-400">IN&nbsp;&nbsp;</span>
            : <span className="text-red-400">OUT</span>}
          <span className="text-foreground ml-2">{t.name}</span>
          <span className="text-muted-foreground ml-1">({money(t.fee)}{t.loan ? ', loan' : ''})</span>
        </p>
      ))}
    </div>
  );
}

export default TransferScreen;
