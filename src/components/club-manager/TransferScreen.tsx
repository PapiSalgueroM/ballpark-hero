import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Newspaper, ArrowDownToLine, ArrowUpFromLine, Handshake, Zap, TrendingUp } from 'lucide-react';
import { money, sellValue, releaseClauseOf, loanEligible, loanFeeOf, activeLoans } from '@/lib/clubManager';
import type { CareerState, CMPlayer, MarketPlayer } from '@/lib/clubManager';
import type { Position } from '@/types/game';
import { ratingTint } from '@/components/club-manager/SquadScreen';

type PosFilter = 'ALL' | 'GK' | 'DEF' | 'MID' | 'ATT';

const POS_GROUPS: Record<Exclude<PosFilter, 'ALL'>, Position[]> = {
  GK: ['GK'],
  DEF: ['CB', 'LB', 'RB', 'LWB', 'RWB'],
  MID: ['CDM', 'CM', 'CAM', 'LM', 'RM'],
  ATT: ['LW', 'RW', 'ST', 'CF'],
};

interface TransferScreenProps {
  career: CareerState;
  market: MarketPlayer[];
  onSell: (playerId: string) => void;
  /* Round 71: the market grew a brain. */
  onNegotiate: (mp: MarketPlayer) => void;
  onOffer: (amount: number) => void;
  onWalk: () => void;
  onDismissNegotiation: () => void;
  onClause: (mp: MarketPlayer) => void;
  onLoan: (mp: MarketPlayer) => void;
  onAcceptBid: (playerId: string) => void;
  onRejectBid: (playerId: string) => void;
}

/** Buy/sell/news hub, shown inside the transfers tab. */
export function TransferScreen({
  career, market, onSell,
  onNegotiate, onOffer, onWalk, onDismissNegotiation, onClause, onLoan,
  onAcceptBid, onRejectBid,
}: TransferScreenProps) {
  const [filter, setFilter] = useState<PosFilter>('ALL');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'buy' | 'sell' | 'news'>('buy');
  const [newsSort, setNewsSort] = useState<'recent' | 'fee'>('recent');

  const windowOpen = career.transferWindow !== null;
  const neg = career.negotiation ?? null;
  const bids = career.incomingBids ?? [];
  const log = career.transferLog ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return market
      .filter(m => filter === 'ALL' || POS_GROUPS[filter].includes(m.position))
      .filter(m => !q || m.name.toLowerCase().includes(q) || m.club.toLowerCase().includes(q))
      .slice(0, 50);
  }, [market, filter, query]);

  const sellable = useMemo(
    () => [...career.squad].sort((a, b) => b.rating - a.rating),
    [career.squad],
  );

  const news = useMemo(() => {
    const items = [...log].reverse();
    if (newsSort === 'fee') items.sort((a, b) => b.fee - a.fee);
    return items.slice(0, 50);
  }, [log, newsSort]);

  const gkCount = career.squad.filter(p => p.position === 'GK').length;
  const canSell = (p: CMPlayer) =>
    windowOpen && career.squad.length > 14 && !(p.position === 'GK' && gkCount <= 1);
  const loansUsed = activeLoans(career);

  const offerBtn = (label: string, amount: number, tone: 'safe' | 'risky' | 'close' = 'safe') => (
    <button
      key={label}
      onClick={() => onOffer(Math.round(amount * 10) / 10)}
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
            {windowOpen ? `Closes when you play your next match · loans used ${loansUsed}/2` : 'Reopens in January / next summer'}
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
              {neg.status === 'open' ? 'Negotiating' : neg.status === 'agreed' ? 'DEAL DONE' : neg.status === 'hijacked' ? 'HIJACKED' : 'DEAL COLLAPSED'}: {neg.player.name}
            </div>
            <span className={cn('text-sm font-bold font-display', ratingTint(neg.player.rating))}>{neg.player.rating}</span>
          </div>
          <div className="text-[10px] text-muted-foreground mb-1.5">
            {neg.player.club} · {neg.player.position} · {neg.player.age}y · worth {money(neg.player.value ?? neg.player.price)}
          </div>

          {neg.status === 'open' && (
            <>
              <div className="flex items-center gap-3 text-[11px] mb-1">
                <span className="text-foreground">Their ask: <span className="font-bold text-gold">{money(neg.theirAsk)}</span></span>
                {neg.myOffer !== null && <span className="text-muted-foreground">Your last: {money(neg.myOffer)}</span>}
                <span className="text-muted-foreground ml-auto" title="Seller patience">
                  {'●'.repeat(Math.max(0, neg.patience))}{'○'.repeat(Math.max(0, 3 - neg.patience))}
                </span>
              </div>
              {neg.rivalBidder && neg.rivalOffer !== null && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[10px] text-red-400 font-bold mb-1.5">
                  ⚔️ Bidding war: {neg.rivalBidder} at {money(neg.rivalOffer)}
                </div>
              )}
              <p className="text-[11px] italic text-muted-foreground mb-2">"{neg.note}"</p>
              <div className="flex flex-wrap gap-1.5">
                {offerBtn('Lowball', neg.theirAsk * 0.72, 'risky')}
                {offerBtn('Haggle', neg.theirAsk * 0.88)}
                {neg.myOffer !== null && offerBtn('Split it', (neg.theirAsk + neg.myOffer) / 2)}
                {neg.rivalBidder && neg.rivalOffer !== null
                  ? offerBtn('Beat rival', Math.max(neg.rivalOffer * 1.06, neg.theirAsk * 0.97), 'close')
                  : offerBtn('Meet ask', neg.theirAsk, 'close')}
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
            <Newspaper className="w-3 h-3" /> Window headlines
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
          <div className="flex gap-1.5">
            {(['ALL', 'GK', 'DEF', 'MID', 'ATT'] as PosFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn('px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all',
                  filter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary')}
              >
                {f}
              </button>
            ))}
          </div>
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search player or club…"
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
                    <div className="text-xs text-foreground truncate">{m.name}</div>
                    <div className="text-[9px] text-muted-foreground truncate">
                      {m.club} · {m.age}y{m.value !== undefined ? <> · worth {money(m.value)}</> : null}
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
                          title={`Season loan for ${money(loanFeeOf(m))}`}
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
                  <div key={b.playerId} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 text-xs text-foreground truncate">
                      <span className="font-bold">{b.club}</span> bid <span className="font-bold text-gold">{money(b.offer)}</span> for {b.playerName}
                      {b.status === 'improved' && <span className="text-[9px] text-emerald-400 ml-1">(improved, final)</span>}
                    </div>
                    <button
                      onClick={() => onAcceptBid(b.playerId)}
                      disabled={blocked}
                      title={blocked ? 'Squad rules block this sale right now' : 'Accept the bid'}
                      className={cn('shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all',
                        !blocked ? 'bg-emerald-600 text-white hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed')}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => onRejectBid(b.playerId)}
                      className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-secondary text-foreground hover:bg-secondary/70 transition-all"
                    >
                      Reject
                    </button>
                  </div>
                );
              })}
              <p className="text-[9px] text-muted-foreground">Reject and they might come back higher, once. Players sometimes sulk when you block a move.</p>
            </div>
          )}

          {windowOpen ? (
            <div className="bg-card border border-border rounded-xl p-2 max-h-96 overflow-y-auto">
              {sellable.map(p => (
                <div key={p.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                  <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.position}</span>
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-xs truncate', p.isYouth ? 'text-muted-foreground italic' : 'text-foreground')}>
                      {p.name}{p.onLoan && <span className="text-[9px] text-muted-foreground ml-1">(on loan)</span>}
                    </div>
                    <div className="text-[9px] text-muted-foreground">{p.age}y · {p.seasonGoals}g {p.seasonAssists}a</div>
                  </div>
                  <span className={cn('text-sm font-bold font-display', ratingTint(p.rating))}>{p.rating}</span>
                  <button
                    onClick={() => onSell(p.id)}
                    disabled={!canSell(p) || !!p.onLoan}
                    className={cn('shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all min-w-[64px]',
                      canSell(p) && !p.onLoan ? 'bg-destructive text-destructive-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed')}
                  >
                    +{money(sellValue(p))}
                  </button>
                </div>
              ))}
              {career.squad.length <= 14 && (
                <p className="text-[10px] text-yellow-400 px-1 py-2">Squad at minimum size (14). You can't sell anyone else.</p>
              )}
            </div>
          ) : (
            <ClosedWindowBusiness career={career} />
          )}
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
