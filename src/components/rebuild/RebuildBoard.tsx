import { useState } from 'react';
import { Check, Copy, RotateCcw, X } from 'lucide-react';
import { FlagImg } from '@/components/FlagImg';
import { GameNav } from '@/components/game/GameNav';
import { FORMATIONS, playerRating } from '@/lib/squadDeal';
import { useRebuild } from '@/hooks/useRebuild';
import type { ClubTier } from '@/lib/fetchRebuild';

const TIER_LABEL: Record<ClubTier, string> = {
  elite: 'Elite — barely any headroom',
  strong: 'Strong — needs a nudge',
  mid: 'Mid — real work to do',
  modest: 'Modest — everything to prove',
};

const TIER_STYLE: Record<ClubTier, string> = {
  elite: 'text-gold',
  strong: 'text-primary',
  mid: 'text-amber-500',
  modest: 'text-muted-foreground',
};

export function RebuildBoard() {
  const {
    phase, loading, clubs, club, squad, formation, setFormation,
    startingXi, startRating, currentRating, target, budget, sold, signed,
    activeSlot, setActiveSlot, candidates, search, setSearch,
    chooseClub, sell, sign, finish, reset, grade, shareText,
  } = useRebuild();
  const [copied, setCopied] = useState(false);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };

  if (loading && phase === 'pick-club') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto h-6 w-40 animate-pulse rounded bg-muted" />
        <p className="mt-4 text-sm text-muted-foreground">Loading clubs…</p>
      </div>
    );
  }

  // ---- Club picker ----
  if (phase === 'pick-club') {
    const byTier: Record<string, typeof clubs> = {};
    for (const c of clubs) (byTier[c.tier] ??= []).push(c);
    const order: ClubTier[] = ['elite', 'strong', 'mid', 'modest'];

    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-center font-display text-xl font-bold text-foreground">
          Pick a club to rebuild
        </p>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          You get €100M plus whatever you raise selling players.
        </p>

        {order.map(tier => (
          byTier[tier]?.length ? (
            <div key={tier} className="mt-6">
              <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${TIER_STYLE[tier]}`}>
                {TIER_LABEL[tier]}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {byTier[tier].map(c => (
                  <button
                    key={c.club}
                    onClick={() => chooseClub(c)}
                    className="rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/50"
                  >
                    <p className="truncate text-sm font-bold text-foreground">{c.club}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.squadSize} players · €{c.squadValueM}M
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null
        ))}

        <GameNav currentPath="/rebuild" />
      </div>
    );
  }

  if (!club) return null;

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto h-6 w-40 animate-pulse rounded bg-muted" />
        <p className="mt-4 text-sm text-muted-foreground">Loading {club.club}'s squad…</p>
      </div>
    );
  }

  // ---- Done ----
  if (phase === 'done') {
    const hit = currentRating >= target;
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {club.club}
          </p>
          <div className="mt-3 flex items-center justify-center gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground">Before</p>
              <p className="font-display text-4xl font-black text-muted-foreground">{startRating}</p>
            </div>
            <span className="text-2xl text-muted-foreground">→</span>
            <div>
              <p className="text-[11px] text-muted-foreground">After</p>
              <p className={`font-display text-5xl font-black ${hit ? 'text-emerald-500' : 'text-destructive'}`}>
                {currentRating}
              </p>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">target was {target}</p>
          <p className="mt-3 font-display text-2xl font-bold text-gold">{grade}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Sold {sold.length} · Signed {signed.length} · €{budget}M unspent
          </p>

          <div className="mt-5 flex justify-center gap-2">
            <button
              onClick={copyShare}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Share rebuild'}
            </button>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground"
            >
              <RotateCcw className="h-4 w-4" /> New club
            </button>
          </div>
        </div>
        <GameNav currentPath="/rebuild" />
      </div>
    );
  }

  // ---- Rebuilding ----
  const onTrack = currentRating >= target;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-black text-foreground">{club.club}</p>
            <p className="text-[11px] text-muted-foreground">
              {squad.length} players · €{budget}M to spend
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Rating / target</p>
            <p className={`font-display text-3xl font-black ${onTrack ? 'text-emerald-500' : 'text-foreground'}`}>
              {currentRating}
              <span className="text-base text-muted-foreground"> / {target}</span>
            </p>
            <p className="text-[10px] text-muted-foreground">started at {startRating}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <select
          value={formation.name}
          onChange={e => setFormation(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
        >
          {FORMATIONS.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
        </select>
        <button
          onClick={finish}
          className="ml-auto rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
        >
          Finish rebuild
        </button>
      </div>

      {/* XI */}
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Your XI — tap a slot to sign someone
      </p>
      <div className="mt-2 space-y-1.5">
        {formation.slots.map((slot, i) => {
          const p = startingXi[i];
          return (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => setActiveSlot(activeSlot === i ? null : i)}
                className={`flex flex-1 items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                  activeSlot === i ? 'border-gold bg-gold/10' : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-10 shrink-0 text-[10px] font-bold text-muted-foreground">
                    {slot.label}
                  </span>
                  {p ? (
                    <>
                      <FlagImg name={p.nationality} size={14} />
                      <span className="truncate text-sm font-medium text-foreground">{p.name}</span>
                    </>
                  ) : (
                    <span className="text-sm italic text-destructive">empty — sign someone</span>
                  )}
                </span>
                {p && (
                  <span className="ml-2 shrink-0 text-xs">
                    <span className="font-bold text-primary">{playerRating(p)}</span>
                    <span className="text-gold"> €{p.marketValue}M</span>
                  </span>
                )}
              </button>
              {p && (
                <button
                  onClick={() => sell(p)}
                  className="shrink-0 rounded-lg border border-destructive/40 px-2 py-2 text-[10px] font-bold text-destructive hover:bg-destructive/10"
                  title={`Sell ${p.name} for €${p.marketValue}M`}
                >
                  SELL
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Signing panel */}
      {activeSlot !== null && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display font-bold text-foreground">
              Sign a {formation.slots[activeSlot].label} — €{budget}M available
            </p>
            <button onClick={() => setActiveSlot(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or club…"
            className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <div className="max-h-56 space-y-1.5 overflow-y-auto">
            {candidates.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Nobody in this position fits in €{budget}M. Sell someone first.
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
                <span className="ml-2 shrink-0 text-right">
                  <span className="block text-sm font-bold text-primary">{playerRating(p)}</span>
                  <span className="block text-[10px] text-gold">€{p.marketValue}M</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(sold.length > 0 || signed.length > 0) && (
        <div className="mt-4 rounded-xl border border-border bg-card p-3 text-xs">
          {sold.length > 0 && (
            <p className="text-muted-foreground">
              <span className="font-semibold text-destructive">Out:</span>{' '}
              {sold.map(p => `${p.name} (€${p.marketValue}M)`).join(', ')}
            </p>
          )}
          {signed.length > 0 && (
            <p className="mt-1 text-muted-foreground">
              <span className="font-semibold text-emerald-500">In:</span>{' '}
              {signed.map(p => `${p.name} (€${p.marketValue}M)`).join(', ')}
            </p>
          )}
        </div>
      )}

      <GameNav currentPath="/rebuild" />
    </div>
  );
}
