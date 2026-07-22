import { useState } from 'react';
import { Check, Copy, RotateCcw, X } from 'lucide-react';
import { FlagImg } from '@/components/FlagImg';
import { GameNav } from '@/components/game/GameNav';
import { FORMATIONS, TOPICS, playerRating } from '@/lib/squadDeal';
import { BUDGET, useBudgetBuilder } from '@/hooks/useBudgetBuilder';

export function BudgetBuilderBoard() {
  const {
    loading, formation, setFormation, topic, setTopic,
    squad, activeSlot, setActiveSlot, candidates, search, setSearch,
    spent, remaining, filled, complete, teamRating, sign, release, reset, shareText,
  } = useBudgetBuilder();
  const [copied, setCopied] = useState(false);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mx-auto h-6 w-40 animate-pulse rounded bg-muted" />
        <p className="mt-4 text-sm text-muted-foreground">Loading the market…</p>
      </div>
    );
  }

  const pct = Math.max(0, Math.min(100, (spent / BUDGET) * 100));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Budget bar */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Remaining
            </p>
            <p
              className={`font-display text-3xl font-black ${
                remaining < 0 ? 'text-destructive' : 'text-gold'
              }`}
            >
              €{remaining}M
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {filled}/{formation.slots.length} signed
            </p>
            {filled > 0 && (
              <p className="font-display text-2xl font-black text-primary">{teamRating}</p>
            )}
            {filled > 0 && <p className="text-[10px] text-muted-foreground">team rating</p>}
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all ${remaining < 0 ? 'bg-destructive' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Spent €{spent}M of €{BUDGET}M
        </p>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          value={formation.name}
          onChange={e => setFormation(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
        >
          {FORMATIONS.map(f => (
            <option key={f.name} value={f.name}>{f.name}</option>
          ))}
        </select>
        <select
          value={topic}
          onChange={e => setTopic(e.target.value as typeof topic)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
        >
          {TOPICS.map(t => (
            <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
          ))}
        </select>
        <button
          onClick={reset}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      {/* Pitch */}
      <div className="relative mt-4 aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-emerald-900/40 to-emerald-950/60 sm:aspect-[4/3]">
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
        <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />

        {formation.slots.map((slot, i) => {
          const p = squad[i];
          const isActive = activeSlot === i;
          return (
            <button
              key={i}
              onClick={() => setActiveSlot(isActive ? null : i)}
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              className={`absolute w-[19%] -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 px-1 py-1.5 text-center transition-all ${
                isActive
                  ? 'border-gold bg-gold/20 scale-105'
                  : p
                    ? 'border-primary/60 bg-background/90'
                    : 'border-white/25 bg-background/50 hover:border-white/50'
              }`}
            >
              {p ? (
                <>
                  <div className="flex items-center justify-center gap-1">
                    <FlagImg name={p.nationality} size={12} />
                    <span className="truncate text-[10px] font-bold text-foreground">
                      {p.name.split(' ').slice(-1)[0]}
                    </span>
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {playerRating(p)} · €{p.marketValue}M
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[10px] font-bold text-white/70">{slot.label}</div>
                  <div className="text-[9px] text-white/40">tap</div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Picker */}
      {activeSlot !== null && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display font-bold text-foreground">
              Sign a {formation.slots[activeSlot].label}
            </p>
            <button onClick={() => setActiveSlot(null)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or club…"
            className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          {squad[activeSlot] && (
            <button
              onClick={() => { release(activeSlot); setActiveSlot(null); }}
              className="mb-3 w-full rounded-lg border border-destructive/40 py-2 text-xs font-semibold text-destructive"
            >
              Release {squad[activeSlot]!.name} (+€{squad[activeSlot]!.marketValue}M)
            </button>
          )}
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {candidates.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Nobody in this position fits in €{remaining}M. Release someone, or pick cheaper.
              </p>
            )}
            {candidates.map(p => (
              <button
                key={p.name}
                onClick={() => sign(p)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left hover:border-primary/50"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FlagImg name={p.nationality} size={14} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{p.name}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">{p.club}</span>
                  </span>
                </span>
                <span className="ml-3 shrink-0 text-right">
                  <span className="block text-sm font-bold text-primary">{playerRating(p)}</span>
                  <span className="block text-[10px] text-gold">€{p.marketValue}M</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Done */}
      {complete && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Squad complete
          </p>
          <p className="mt-2 font-display text-5xl font-black text-primary">{teamRating}</p>
          <p className="text-sm text-muted-foreground">
            team rating · €{spent}M spent · €{remaining}M left over
          </p>
          <button
            onClick={copyShare}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Share my XI'}
          </button>
        </div>
      )}

      <GameNav currentPath="/budget-builder" />
    </div>
  );
}
