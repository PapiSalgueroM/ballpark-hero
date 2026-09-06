/* ─── Round 469: the money app, drawn once for every American career ───────

   The rules are careerMoney.ts, the same engine Soccer Career's phone runs
   on. This is the screen for a career that has no phone frame: the Bank box
   on the hub opens it, and inside it the tile rule holds all the way down.
   Account, Market, Cards and the shop are four tabs, the market opens one
   asset at a time with a back button, and every number on it is read from
   the engine on every render, never kept here.

   Sport neutral on purpose: it takes the host save, the sport descriptor and
   the shop the sport already draws, so the NBA, NHL and MLB careers can open
   the same screen the day their engines bind careerMoney.ts. Nothing in this
   file names a sport. */
import { useState, type ReactNode } from 'react';
import type { MoneyAction, MoneyHost, MoneySport } from '@/lib/careerMoney';
import {
  ASSETS, ensureMoney, bankSummary, holdingValue, unrealised, priceRead, lastMove,
  spendable, fmtMoney, cardCap, cardStatus,
  MAX_LEDGER, PAR, SAVINGS_RATE, CARD_WIN, CARD_PAYS, CARD_MAX, CARD_SHUT,
} from '@/lib/careerMoney';
import { cn } from '@/lib/utils';

type Tab = 'account' | 'market' | 'cards' | 'shop';

function Chip({ label, onClick, disabled, tone }: { label: string; onClick: () => void; disabled?: boolean; tone?: 'sell' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex-1 rounded-xl px-1 py-2 text-[11px] font-black transition-colors',
        disabled
          ? 'bg-secondary text-muted-foreground/50'
          : tone === 'sell'
            ? 'border border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-300'
            : 'border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20',
      )}
    >
      {label}
    </button>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-black text-foreground', tone)}>{value}</span>
    </div>
  );
}

/** Eight seasons of price, drawn small. */
function Spark({ points, up }: { points: number[]; up: boolean }) {
  if (points.length < 2) {
    return <div className="flex h-14 items-center justify-center text-[10px] text-muted-foreground">No history yet. Come back after a season.</div>;
  }
  const lo = Math.min(...points), hi = Math.max(...points);
  const span = Math.max(hi - lo, 1);
  const w = 260, h = 54;
  const d = points
    .map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - lo) / span) * (h - 6) - 3}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" aria-hidden="true">
      <polyline points={d} fill="none" strokeWidth="2" className={up ? 'stroke-emerald-500' : 'stroke-red-500'} />
    </svg>
  );
}

export function MoneyApp<S extends MoneyHost>({ host, sport, incomeLine, onMoney, shop }: {
  host: S;
  sport: MoneySport<S>;
  /** "$22M a year, 2 years left on the deal", written by the sport. */
  incomeLine: string;
  onMoney: (a: MoneyAction) => void;
  /** The sport's own shop, drawn by the sport. */
  shop: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>('account');
  const [asset, setAsset] = useState<string | null>(null);
  const fmt = (v: number) => fmtMoney(v, sport.currency);
  const bank = bankSummary(host, sport);
  const free = spendable(host);
  const m = ensureMoney(host, sport);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'account', label: '🏦 Account' },
    { key: 'market', label: '📈 Market' },
    { key: 'cards', label: '🃏 Cards' },
    { key: 'shop', label: '🛒 Shop' },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-3 text-center">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Everything you have</p>
        <p className="text-2xl font-black text-gold">{fmt(bank.total)}</p>
        <p className="text-[10px] text-muted-foreground">{incomeLine}</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-secondary p-2"><div className="text-[13px] font-black text-foreground">{fmt(bank.cash)}</div><div className="text-[9px] text-muted-foreground">in the account</div></div>
          <div className="rounded-xl bg-secondary p-2"><div className="text-[13px] font-black text-emerald-500">{fmt(bank.vault)}</div><div className="text-[9px] text-muted-foreground">savings</div></div>
          <div className="rounded-xl bg-secondary p-2"><div className="text-[13px] font-black text-primary">{fmt(bank.invested)}</div><div className="text-[9px] text-muted-foreground">invested</div></div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setAsset(null); }}
            className={cn(
              /* py-2, not py-1.5: measured at 390 by 844 these four came out
                 87 by 29px, a shade under the 30px floor every tap target on
                 this site is held to, and they are the only way between the
                 app's four screens. */
              'rounded-lg px-1 py-2 text-[11px] font-bold transition-all',
              tab === t.key ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'account' && (
        <div className="space-y-2.5">
          <div className="space-y-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-foreground">💵 Savings</span>
              <span className="text-[10px] font-bold text-emerald-500">pays {Math.round(SAVINGS_RATE * 1000) / 10}% a season, never loses</span>
            </div>
            <p className="text-[10px] leading-snug text-muted-foreground">Boring, safe, and better than leaving it in the account doing nothing.</p>
            <div className="flex gap-1.5">
              <Chip label="Save 25%" disabled={free < 0.2} onClick={() => onMoney({ t: 'deposit', amount: free * 0.25 })} />
              <Chip label="Save half" disabled={free < 0.1} onClick={() => onMoney({ t: 'deposit', amount: free * 0.5 })} />
              <Chip label="Save it all" disabled={free < 0.05} onClick={() => onMoney({ t: 'deposit', amount: free })} />
            </div>
            <div className="flex gap-1.5">
              <Chip tone="sell" label="Take out half" disabled={bank.vault < 0.02} onClick={() => onMoney({ t: 'withdraw', amount: bank.vault * 0.5 })} />
              <Chip tone="sell" label="Take it all out" disabled={bank.vault < 0.01} onClick={() => onMoney({ t: 'withdraw', amount: bank.vault })} />
            </div>
          </div>

          <div className="space-y-1 rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[11px] font-black text-foreground">📄 Statement</span>
              <span className="text-[9px] text-muted-foreground">last {MAX_LEDGER} only</span>
            </div>
            {bank.entries.length === 0 ? (
              <p className="py-3 text-center text-[10px] text-muted-foreground">Nothing yet. Save something or buy something.</p>
            ) : (
              bank.entries.map((e, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border/50 py-1 text-[11px] last:border-0">
                  <span className="min-w-0 truncate text-foreground/80">{e.t}</span>
                  <span className="flex shrink-0 items-center gap-2 pl-2">
                    <span className="text-[9px] text-muted-foreground">{e.y}</span>
                    <span className={cn('font-black', e.a >= 0 ? 'text-emerald-500' : 'text-foreground/70')}>{e.a >= 0 ? '+' : ''}{fmt(e.a)}</span>
                  </span>
                </div>
              ))
            )}
            <p className="pt-1.5 text-[9px] text-muted-foreground">Older lines drop off so your save does not grow forever.</p>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-secondary p-2.5 text-[10px]">
            <span className="text-muted-foreground">Made on investments</span>
            <span><span className="font-black text-emerald-500">{fmt(bank.won)}</span> <span className="text-muted-foreground">/</span> <span className="font-black text-red-500">{fmt(bank.lost)}</span> <span className="text-muted-foreground">lost</span></span>
          </div>
        </div>
      )}

      {tab === 'market' && asset === null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-muted-foreground">You have {fmt(free)} to put in</span>
            <span className="text-[10px] text-muted-foreground">holding {fmt(bank.invested)}</span>
          </div>
          {ASSETS.map(a => {
            const read = priceRead(m, a.id);
            const move = lastMove(m, a.id);
            const held = holdingValue(m, a.id);
            return (
              <button
                key={a.id}
                onClick={() => setAsset(a.id)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/60"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl leading-none">{a.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-black text-foreground">{a.name}</span>
                      <span className="shrink-0 text-xs font-black text-foreground">{Math.round(m.price[a.id])}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className={cn('truncate text-[10px]', read.tone === 'text-white/60' ? 'text-muted-foreground' : read.tone)}>{read.label}</span>
                      <span className={cn('shrink-0 text-[10px] font-bold', move > 0 ? 'text-emerald-500' : move < 0 ? 'text-red-500' : 'text-muted-foreground')}>
                        {move > 0 ? '+' : ''}{move}%
                      </span>
                    </span>
                  </span>
                </div>
                {held > 0 && (
                  <div className="pl-8 pt-1 text-[10px] text-primary">you hold {fmt(held)}, {unrealised(m, a.id) >= 0 ? 'up' : 'down'} {fmt(Math.abs(unrealised(m, a.id)))}</div>
                )}
              </button>
            );
          })}
          <p className="px-2 pt-1 text-center text-[9px] text-muted-foreground">
            Prices move every season whether you look or not. Cheap can get cheaper. There is a 1% fee each way.
          </p>
        </div>
      )}

      {tab === 'market' && asset !== null && (() => {
        const def = ASSETS.find(a => a.id === asset);
        if (!def) return null;
        const read = priceRead(m, def.id);
        const move = lastMove(m, def.id);
        const held = holdingValue(m, def.id);
        const pnl = unrealised(m, def.id);
        const hist = m.hist[def.id] ?? [];
        const riskWord = def.risk === 'steady' ? 'Steady' : def.risk === 'bumpy' ? 'Bumpy' : 'Wild';
        const riskTone = def.risk === 'steady' ? 'text-emerald-500' : def.risk === 'bumpy' ? 'text-amber-500' : 'text-red-500';
        return (
          <div className="space-y-2.5">
            <button onClick={() => setAsset(null)} className="text-[11px] font-bold text-primary">‹ Market</button>
            <div className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-black leading-none text-foreground">{Math.round(m.price[def.id])}</div>
                  <div className={cn('text-[10px] font-bold', move > 0 ? 'text-emerald-500' : move < 0 ? 'text-red-500' : 'text-muted-foreground')}>
                    {move > 0 ? '+' : ''}{move}% last season
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn('text-[11px] font-black', riskTone)}>{def.emoji} {def.name} · {riskWord}</div>
                  <div className="text-[9px] text-muted-foreground">started at {PAR}</div>
                </div>
              </div>
              <Spark points={hist} up={move >= 0} />
              <div className={cn('text-center text-[11px] font-bold', read.tone === 'text-white/60' ? 'text-muted-foreground' : read.tone)}>{read.label}</div>
            </div>
            <p className="px-1 text-[10px] leading-snug text-muted-foreground">{def.blurb}</p>
            <div className="space-y-0.5 rounded-2xl border border-border bg-card p-3">
              <Row label="You have to spend" value={fmt(free)} />
              <Row label="You are holding" value={fmt(held)} tone={held > 0 ? 'text-primary' : 'text-muted-foreground'} />
              {held > 0 && <Row label="Against what you paid" value={`${pnl >= 0 ? '+' : ''}${fmt(pnl)}`} tone={pnl >= 0 ? 'text-emerald-500' : 'text-red-500'} />}
            </div>
            <div className="space-y-1.5">
              <div className="px-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Buy</div>
              <div className="flex gap-1.5">
                <Chip label="10%" disabled={free < 0.5} onClick={() => onMoney({ t: 'buy', id: def.id, amount: free * 0.1 })} />
                <Chip label="25%" disabled={free < 0.2} onClick={() => onMoney({ t: 'buy', id: def.id, amount: free * 0.25 })} />
                <Chip label="Half" disabled={free < 0.1} onClick={() => onMoney({ t: 'buy', id: def.id, amount: free * 0.5 })} />
                <Chip label="The lot" disabled={free < 0.05} onClick={() => onMoney({ t: 'buy', id: def.id, amount: free })} />
              </div>
              <div className="px-0.5 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sell</div>
              <div className="flex gap-1.5">
                <Chip tone="sell" label="A quarter" disabled={held <= 0.02} onClick={() => onMoney({ t: 'sell', id: def.id, frac: 0.25 })} />
                <Chip tone="sell" label="Half" disabled={held <= 0.02} onClick={() => onMoney({ t: 'sell', id: def.id, frac: 0.5 })} />
                <Chip tone="sell" label="All of it" disabled={held <= 0.01} onClick={() => onMoney({ t: 'sell', id: def.id, frac: 1 })} />
              </div>
            </div>
          </div>
        );
      })()}

      {tab === 'cards' && (() => {
        const cap = cardCap(host, sport);
        const status = cardStatus(host, sport);
        const w = sport.words.cards;
        return (
          <div className="space-y-2.5">
            <div className="space-y-1.5 rounded-2xl border border-border bg-card p-3">
              <p className="text-[11px] font-black text-foreground">🃏 Cards {w.where}</p>
              <p className="text-[10px] leading-snug text-muted-foreground">
                One sitting a season. You win {Math.round(CARD_WIN * 100)}% of hands and a win pays {CARD_PAYS}x the stake, which means over time this costs money. The most you can ever put in is {fmt(CARD_MAX)}, and once you are {fmt(CARD_SHUT)} down for your career {w.crew} stop dealing you in for good.
              </p>
              <Row label="Career result at cards" value={`${m.cNet >= 0 ? '+' : ''}${fmt(m.cNet)}`} tone={m.cNet >= 0 ? 'text-emerald-500' : 'text-red-500'} />
              <Row label="Sittings" value={String(m.cPlays)} />
            </div>
            {status.open ? (
              <div className="flex gap-1.5">
                <Chip label={`Sit in for ${fmt(Math.max(0.01, cap * 0.5))}`} disabled={cap < 0.02} onClick={() => onMoney({ t: 'cards', stake: cap * 0.5 })} />
                <Chip label={`Sit in for ${fmt(cap)}`} disabled={cap < 0.01} onClick={() => onMoney({ t: 'cards', stake: cap })} />
              </div>
            ) : (
              <p className="rounded-xl bg-secondary p-2.5 text-center text-[10px] text-muted-foreground">{status.why}</p>
            )}
          </div>
        );
      })()}

      {tab === 'shop' && shop}
    </div>
  );
}

export default MoneyApp;
