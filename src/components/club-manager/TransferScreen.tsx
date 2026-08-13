import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Newspaper, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { money, sellValue } from '@/lib/clubManager';
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
  onBuy: (mp: MarketPlayer) => void;
  onSell: (playerId: string) => void;
}

/** Buy/sell hub, shown inside the transfers tab. */
export function TransferScreen({ career, market, onBuy, onSell }: TransferScreenProps) {
  const [filter, setFilter] = useState<PosFilter>('ALL');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');

  const windowOpen = career.transferWindow !== null;

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

  const gkCount = career.squad.filter(p => p.position === 'GK').length;
  const canSell = (p: CMPlayer) =>
    windowOpen && career.squad.length > 14 && !(p.position === 'GK' && gkCount <= 1);

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
            {windowOpen ? 'Closes when you play your next match' : 'Reopens in January / next summer'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget</div>
          <div className="text-lg font-bold font-display text-gold">{money(career.budget)}</div>
        </div>
      </div>

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

      {windowOpen ? (
        <>
          {/* Buy / Sell toggle */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setMode('buy')}
              className={cn('rounded-lg border py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all',
                mode === 'buy' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:border-primary')}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" /> Buy players
            </button>
            <button
              onClick={() => setMode('sell')}
              className={cn('rounded-lg border py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all',
                mode === 'sell' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:border-primary')}
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" /> Sell players
            </button>
          </div>

          {mode === 'buy' && (
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
                  const affordable = m.price <= career.budget && career.squad.length < 30;
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
                      <button
                        onClick={() => onBuy(m)}
                        disabled={!affordable}
                        className={cn('shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all min-w-[64px]',
                          affordable ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed')}
                      >
                        {money(m.price)}
                      </button>
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
          )}

          {mode === 'sell' && (
            <div className="bg-card border border-border rounded-xl p-2 max-h-96 overflow-y-auto">
              {sellable.map(p => (
                <div key={p.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                  <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.position}</span>
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-xs truncate', p.isYouth ? 'text-muted-foreground italic' : 'text-foreground')}>{p.name}</div>
                    <div className="text-[9px] text-muted-foreground">{p.age}y · {p.seasonGoals}g {p.seasonAssists}a</div>
                  </div>
                  <span className={cn('text-sm font-bold font-display', ratingTint(p.rating))}>{p.rating}</span>
                  <button
                    onClick={() => onSell(p.id)}
                    disabled={!canSell(p)}
                    className={cn('shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all min-w-[64px]',
                      canSell(p) ? 'bg-destructive text-destructive-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed')}
                  >
                    +{money(sellValue(p))}
                  </button>
                </div>
              ))}
              {career.squad.length <= 14 && (
                <p className="text-[10px] text-yellow-400 px-1 py-2">Squad at minimum size (14). You can't sell anyone else.</p>
              )}
            </div>
          )}
        </>
      ) : (
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
              <span className="text-muted-foreground ml-1">({money(t.fee)})</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default TransferScreen;
