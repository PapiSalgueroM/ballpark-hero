import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, X } from 'lucide-react';
import { FlagImg } from '@/components/FlagImg';
import { GameNav } from '@/components/game/GameNav';
import { TIERS, useTierList, type Tier } from '@/hooks/useTierList';

const TIER_STYLE: Record<Tier, string> = {
  S: 'bg-red-500/85 text-white',
  A: 'bg-orange-500/85 text-white',
  B: 'bg-amber-400/85 text-black',
  C: 'bg-lime-500/85 text-black',
  D: 'bg-sky-500/85 text-white',
};

export function TierListBoard() {
  const {
    loading, players, placements, selected, crowd, allPlaced, submitted,
    select, place, clear, submit, shareText,
  } = useTierList();
  const [copied, setCopied] = useState(false);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked, text is on screen */ }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto h-6 w-40 animate-pulse rounded bg-muted" />
        <p className="mt-4 text-sm text-muted-foreground">Loading today's players…</p>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Couldn't load today's players. Try again shortly.</p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to all games →
        </Link>
      </div>
    );
  }

  const unplaced = players.filter(p => !placements[p.name]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <p className="mb-4 text-center text-sm text-muted-foreground">
        {submitted
          ? "Your list is locked in, here's how the crowd ranked them."
          : selected
            ? 'Now tap a tier to place them.'
            : 'Tap a player, then tap a tier.'}
      </p>

      {/* Tier rows */}
      <div className="space-y-2">
        {TIERS.map(tier => {
          const inTier = players.filter(p => placements[p.name] === tier);
          return (
            <div key={tier} className="flex overflow-hidden rounded-xl border border-border">
              <button
                disabled={!selected || submitted}
                onClick={() => selected && place(selected, tier)}
                className={`flex w-14 shrink-0 items-center justify-center font-display text-2xl font-black transition-opacity ${TIER_STYLE[tier]} ${
                  selected && !submitted ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                }`}
              >
                {tier}
              </button>
              <div className="flex min-h-[60px] flex-1 flex-wrap items-center gap-1.5 bg-card p-2">
                {inTier.map(p => (
                  <button
                    key={p.name}
                    onClick={() => !submitted && clear(p.name)}
                    className="group flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1 text-xs"
                  >
                    <FlagImg name={p.nationality} size={14} />
                    <span className="font-medium text-foreground">{p.name}</span>
                    {!submitted && (
                      <X className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                    {submitted && crowd[p.name]?.tier && (
                      <span className="text-[10px] text-muted-foreground">
                        crowd: {crowd[p.name].tier}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bench */}
      {unplaced.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            To rank ({unplaced.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {unplaced.map(p => (
              <button
                key={p.name}
                onClick={() => select(selected === p.name ? null : p.name)}
                className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm transition-colors ${
                  selected === p.name
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                <FlagImg name={p.nationality} size={16} />
                <span className="font-medium text-foreground">{p.name}</span>
                <span className="text-xs text-muted-foreground">€{p.valueMillions}M</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {allPlaced && !submitted && (
        <button
          onClick={submit}
          className="mt-6 w-full rounded-full bg-primary py-3 font-display font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Lock in my tier list
        </button>
      )}

      {submitted && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Locked in
          </p>
          <div className="mt-3 space-y-1 text-left text-sm">
            {players.map(p => {
              const mine = placements[p.name];
              const c = crowd[p.name];
              const agree = c?.tier && c.tier === mine;
              return (
                <div key={p.name} className="flex items-center justify-between">
                  <span className="flex min-w-0 items-center gap-2">
                    <FlagImg name={p.nationality} size={14} />
                    <span className="truncate text-foreground">{p.name}</span>
                  </span>
                  <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                    you: <span className="font-bold text-foreground">{mine}</span>
                    {c && c.total > 0 ? (
                      <>
                        {' '}· crowd: <span className={agree ? 'text-primary' : 'text-destructive'}>{c.tier}</span>
                        <span className="text-[10px]"> ({c.total})</span>
                      </>
                    ) : (
                      <> · first to rank</>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <button
            onClick={copyShare}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Share my tier list'}
          </button>
        </div>
      )}

      <GameNav currentPath="/tier-list" />
    </div>
  );
}
