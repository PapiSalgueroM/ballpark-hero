import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Package, Trash2 } from 'lucide-react';
import { FlagImg } from '@/components/FlagImg';
import { GameNav } from '@/components/game/GameNav';
import { playerRating } from '@/lib/squadDeal';
import { TOTAL_PACKS, useMysteryBox } from '@/hooks/useMysteryBox';
import type { PackTier } from '@/lib/fetchPackPool';

const TIER_STYLE: Record<PackTier, { label: string; cls: string }> = {
  superstar: { label: 'SUPERSTAR', cls: 'border-purple-500 bg-purple-500/15 text-purple-400' },
  star: { label: 'Star', cls: 'border-gold bg-gold/10 text-gold' },
  quality: { label: 'Quality', cls: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-500' },
  squad: { label: 'Squad player', cls: 'border-border bg-card text-foreground' },
  fringe: { label: 'Fringe', cls: 'border-border bg-muted/40 text-muted-foreground' },
};

export function MysteryBoxBoard() {
  const {
    loading, formation, packIndex, current, revealed, squad, compatibleSlots,
    discards, finished, rating, filled, bestPull, openPack, place, discard, shareText,
  } = useMysteryBox();
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
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto h-6 w-40 animate-pulse rounded bg-muted" />
        <p className="mt-4 text-sm text-muted-foreground">Stacking today's boxes…</p>
      </div>
    );
  }

  if (squad.length === 0 && packIndex === 0 && !revealed && !finished && !current) {
    // pool failed entirely
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Packs opened
            </p>
            <p className="font-display text-3xl font-black text-foreground">
              {packIndex}<span className="text-base text-muted-foreground">/{TOTAL_PACKS}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">XI rating</p>
            <p className="font-display text-3xl font-black text-primary">{rating}</p>
            <p className="text-[10px] text-muted-foreground">{filled}/11 filled · {discards} binned</p>
          </div>
        </div>
      </div>

      {/* Finished */}
      {finished && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Final squad
          </p>
          <p className="mt-2 font-display text-6xl font-black text-primary">{rating}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filled}/11 filled{bestPull ? <> · best pull: <span className="font-semibold text-gold">{bestPull.name}</span></> : null}
          </p>
          <button
            onClick={copyShare}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Beat my pulls'}
          </button>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Same boxes for everyone today, the skill is what you keep.
          </p>
        </div>
      )}

      {/* Pack area */}
      {!finished && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-6 text-center">
          {!revealed ? (
            <>
              <Package className="mx-auto h-14 w-14 text-gold" />
              <p className="mt-2 text-sm text-muted-foreground">
                Pack {packIndex + 1} of {TOTAL_PACKS} is sealed.
              </p>
              <button
                onClick={openPack}
                className="mt-4 rounded-full bg-primary px-8 py-3 font-display text-lg font-black text-primary-foreground hover:opacity-90"
              >
                Open it
              </button>
            </>
          ) : current ? (
            <>
              <span className={`inline-block rounded-full border-2 px-4 py-1 text-xs font-black uppercase tracking-wider ${TIER_STYLE[current.tier].cls}`}>
                {TIER_STYLE[current.tier].label}
              </span>
              <div className="mt-3 flex items-center justify-center gap-2">
                <FlagImg name={current.nationality} size={22} />
                <p className="font-display text-2xl font-black text-foreground">{current.name}</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {current.club} · {current.position} · {current.age > 0 ? `${current.age}y` : '—'}
              </p>
              <p className="mt-2">
                <span className="font-display text-3xl font-black text-primary">{playerRating(current)}</span>
                <span className="ml-2 text-sm text-gold">€{current.marketValue}M</span>
              </p>

              {compatibleSlots.length > 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Tap a highlighted slot below to keep him, or bin him.
                </p>
              ) : (
                <p className="mt-3 text-xs text-destructive">
                  No compatible slot is open. Bin him to move on.
                </p>
              )}

              <button
                onClick={discard}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-5 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" /> Bin him
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* Squad list */}
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Your 4-3-3
      </p>
      <div className="mt-2 space-y-1.5">
        {formation.slots.map((slot, i) => {
          const p = squad[i];
          const highlight = !!current && compatibleSlots.includes(i);
          return (
            <button
              key={i}
              disabled={!highlight}
              onClick={() => place(i)}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-all ${
                highlight
                  ? 'border-gold bg-gold/10 animate-pulse cursor-pointer'
                  : p
                    ? 'border-primary/40 bg-card'
                    : 'border-border bg-card opacity-70'
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-10 shrink-0 text-[10px] font-bold text-muted-foreground">{slot.label}</span>
                {p ? (
                  <>
                    <FlagImg name={p.nationality} size={14} />
                    <span className="truncate text-sm font-medium text-foreground">{p.name}</span>
                  </>
                ) : (
                  <span className="text-sm italic text-muted-foreground">
                    {highlight ? 'place him here' : 'empty'}
                  </span>
                )}
              </span>
              {p && (
                <span className="ml-2 shrink-0 text-xs">
                  <span className="font-bold text-primary">{playerRating(p)}</span>
                  <span className="text-gold"> €{p.marketValue}M</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!finished && (
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          {TOTAL_PACKS - packIndex} packs left for {11 - filled} empty slots, you can only afford{' '}
          {Math.max(0, TOTAL_PACKS - packIndex - (11 - filled))} more bins.
        </p>
      )}

      <div className="mt-2 text-center">
        <Link to="/" className="text-xs text-muted-foreground hover:text-primary">
          See all games →
        </Link>
      </div>

      <GameNav currentPath="/mystery-box" />
    </div>
  );
}
