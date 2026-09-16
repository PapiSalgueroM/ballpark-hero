import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Trash2, Volume2, VolumeX } from 'lucide-react';
import { FlagImg } from '@/components/FlagImg';
import { GameNav } from '@/components/game/GameNav';
import { HoloCard } from '@/components/mystery-box/HoloCard';
import { PackSpinWheel } from '@/components/mystery-box/PackSpinWheel';
import { playPackCue, readMutePref, writeMutePref } from '@/lib/mysteryBoxAudio';
import { CARD_REVEAL_MS } from '@/lib/mysteryBoxWheel';
import { playerRating } from '@/lib/squadDeal';
import { TOTAL_PACKS, useMysteryBox } from '@/hooks/useMysteryBox';

type OpenPhase = 'idle' | 'spinning' | 'walkout' | 'shown';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && !!window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function MysteryBoxBoard() {
  const {
    loading, formation, packIndex, upcoming, current, revealed, squad, compatibleSlots,
    discards, finished, rating, filled, bestPull, openPack, place, discard, shareText,
  } = useMysteryBox();
  const [copied, setCopied] = useState(false);
  const [phase, setPhase] = useState<OpenPhase>(() => (revealed ? 'shown' : 'idle'));
  const [muted, setMuted] = useState(() => readMutePref());
  const [burst, setBurst] = useState(false);
  const revealTimer = useRef<number>(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    setPhase(revealed ? 'shown' : 'idle');
    setBurst(false);
    window.clearTimeout(revealTimer.current);
  }, [packIndex]);

  useEffect(() => () => window.clearTimeout(revealTimer.current), []);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };

  const showCard = useCallback((instant: boolean) => {
    if (!upcoming) return;
    openPack();
    window.clearTimeout(revealTimer.current);
    if (instant || prefersReducedMotion()) {
      setBurst(false);
      setPhase('shown');
      return;
    }
    setBurst(true);
    setPhase('walkout');
    revealTimer.current = window.setTimeout(() => {
      setPhase('shown');
    }, CARD_REVEAL_MS + 180);
  }, [upcoming, openPack]);

  const startSpin = useCallback(() => {
    if (!upcoming || phase !== 'idle') return;
    playPackCue('start', muted);
    if (prefersReducedMotion()) {
      showCard(true);
      return;
    }
    setPhase('spinning');
  }, [upcoming, phase, muted, showCard]);

  const skipAnimation = useCallback(() => {
    playPackCue('stop', true);
    showCard(true);
  }, [showCard]);

  const onWheelLanded = useCallback(() => {
    if (phaseRef.current !== 'spinning') return;
    playPackCue('stop', muted);
    showCard(false);
  }, [muted, showCard]);

  const toggleMute = () => {
    setMuted(m => {
      const next = !m;
      writeMutePref(next);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl overflow-x-hidden px-4 py-16 text-center">
        <div className="mx-auto h-6 w-40 animate-pulse rounded bg-muted" />
        <p className="mt-4 text-sm text-muted-foreground">Stacking today's boxes…</p>
      </div>
    );
  }

  if (squad.length === 0 && packIndex === 0 && !revealed && !finished && !upcoming) {
    return (
      <div className="mx-auto max-w-2xl overflow-x-hidden px-4 py-16 text-center">
        <p className="text-3xl">📦</p>
        <p className="mt-2 font-display text-lg font-bold text-foreground">The packs did not arrive</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The player pool could not be loaded. It is usually a connection blip.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="tap-target mt-4 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground hover:opacity-90"
        >
          Try again
        </button>
      </div>
    );
  }

  const player = current ?? upcoming;
  const animating = phase === 'spinning' || phase === 'walkout';

  return (
    <div className="mx-auto max-w-2xl overflow-x-hidden px-4 py-6">
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
            type="button"
            onClick={copyShare}
            className="tap-target mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Beat my pulls'}
          </button>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Same boxes for everyone today, the skill is what you keep.
          </p>
        </div>
      )}

      {!finished && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-center sm:p-6">
          {(phase === 'idle' || phase === 'spinning') && upcoming && (
            <>
              <PackSpinWheel
                targetTier={upcoming.tier}
                packIndex={packIndex}
                spinning={phase === 'spinning'}
                muted={muted}
                onLanded={onWheelLanded}
              />
              <p className="mt-2 text-sm text-muted-foreground">
                Pack {packIndex + 1} of {TOTAL_PACKS} is sealed.
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {phase === 'idle' && (
                  <button
                    type="button"
                    onClick={startSpin}
                    className="tap-target min-w-[44px] rounded-full bg-primary px-8 font-display text-lg font-black text-primary-foreground hover:opacity-90"
                  >
                    Spin
                  </button>
                )}
                <button
                  type="button"
                  onClick={skipAnimation}
                  className="tap-target min-w-[44px] rounded-full border border-border px-5 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  Skip animation
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-pressed={muted}
                  aria-label={muted ? 'Unmute wheel sounds' : 'Mute wheel sounds'}
                  className="tap-target inline-flex min-w-[44px] items-center justify-center rounded-full border border-border px-3 text-muted-foreground hover:text-foreground"
                >
                  {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
              </div>
            </>
          )}

          {(phase === 'walkout' || phase === 'shown') && player && (
            <>
              <HoloCard
                player={player}
                flipped
                instant={phase === 'shown' && !burst}
                burst={burst}
                seed={packIndex + player.name.length}
              />
              {animating && (
                <button
                  type="button"
                  onClick={skipAnimation}
                  className="tap-target mt-3 min-w-[44px] rounded-full border border-border px-5 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  Skip animation
                </button>
              )}
              {phase === 'shown' && (
                <>
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
                    type="button"
                    onClick={discard}
                    className="tap-target mt-3 inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-5 text-sm font-semibold text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" /> Bin him
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Your 4-3-3
      </p>
      <div className="mt-2 space-y-1.5">
        {formation.slots.map((slot, i) => {
          const p = squad[i];
          const highlight = phase === 'shown' && !!current && compatibleSlots.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={!highlight}
              onClick={() => place(i)}
              className={`flex min-h-[44px] w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-all ${
                highlight
                  ? 'cursor-pointer animate-pulse border-gold bg-gold/10'
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
        <Link to="/" className="tap-target inline-flex items-center rounded-full px-4 text-xs text-muted-foreground hover:text-primary">
          See all games →
        </Link>
      </div>

      <GameNav currentPath="/mystery-box" />
    </div>
  );
}
