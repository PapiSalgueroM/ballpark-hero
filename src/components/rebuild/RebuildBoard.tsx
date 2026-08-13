import { useState } from 'react';
import { Check, Copy, RotateCcw, X } from 'lucide-react';
import { FlagImg } from '@/components/FlagImg';
import { GameNav } from '@/components/game/GameNav';
import { FORMATIONS, playerRating } from '@/lib/squadDeal';
import { nextRaise, TIER_BUDGET } from '@/lib/rebuildDeck';
import { useRebuild } from '@/hooks/useRebuild';
import type { ClubTier } from '@/lib/fetchRebuild';
import { useRevealScroll } from '@/hooks/useRevealScroll';

const TIER_LABEL: Record<ClubTier, string> = {
  elite: 'Elite, barely any headroom',
  strong: 'Strong, needs a nudge',
  mid: 'Mid, real work to do',
  modest: 'Modest, everything to prove',
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
    chooseClub, sign, finish, reset, grade, shareText,
    baseBudget,
    fortuneDeck, flippedFortune, flippedIndex, flipFortune, confirmFortune,
    cuts, cutsValue, toggleCut, lockCuts,
    coachOptions, keepCoach, coach, pickCoach,
    objectives, finLog, penalties, rivals, rivalsLoading,
    war, raiseWar, walkAway, overpaid, season,
  } = useRebuild();
  // Round 61: the owner's no scroll rule. Every phase change (fortune, cuts,
  // market, results) pulls the new screen into view instead of leaving the
  // player looking at the old one.
  const revealRef = useRevealScroll<HTMLDivElement>(phase);
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
          Box2box rules: bigger clubs hand you a bigger war chest, then you flip a fortune card,
          commit your sales before the market opens, and answer to the board.
        </p>

        {order.map(tier => (
          byTier[tier]?.length ? (
            <div key={tier} className="mt-6">
              <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${TIER_STYLE[tier]}`}>
                {TIER_LABEL[tier]} · €{TIER_BUDGET[tier]}M budget
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

  // ---- Coach hire (box2box step, owner 2026-08-05) ----
  if (phase === 'pick-coach') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-center font-display text-xl font-bold text-foreground">
          First call: the dugout
        </p>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Keep your caretaker for free, or spend transfer money on a real one.
          A better coach lifts your final squad rating.
        </p>

        <div className="mt-5 grid gap-2">
          {[...coachOptions, keepCoach].map(c => (
            <button
              key={c.id}
              onClick={() => pickCoach(c)}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="text-2xl">{c.emoji}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-foreground">{c.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{c.desc}</span>
                </span>
              </span>
              <span className="ml-3 shrink-0 text-right">
                <span className="block text-sm font-bold text-primary">+{c.bonus} rating</span>
                <span className="block text-[11px] text-gold">{c.cost === 0 ? 'Free' : `€${c.cost}M`}</span>
              </span>
            </button>
          ))}
        </div>

        {objectives.length > 0 && (
          <div className="mt-6 rounded-xl border border-gold/40 bg-gold/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">
              📋 The board's demands (miss one and they sell a player)
            </p>
            <ul className="mt-2 space-y-1">
              {objectives.map(o => (
                <li key={o.objective.id} className="text-sm text-foreground">
                  {o.objective.emoji} {o.objective.text}
                </li>
              ))}
            </ul>
          </div>
        )}
        <GameNav currentPath="/rebuild" />
      </div>
    );
  }

  // ---- Fortune card flip (Round 51, box2box: pick one of ten) ----
  if (phase === 'fortune') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-center font-display text-xl font-bold text-foreground">
          The board hands you ten envelopes
        </p>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          One holds a takeover. One holds a lawsuit. Flip exactly one card and live with it.
        </p>
        <div className="mt-5 grid grid-cols-5 gap-2">
          {fortuneDeck.map((card, i) => {
            const isFlipped = flippedIndex === i;
            return (
              <button
                key={card.id}
                onClick={() => flipFortune(i)}
                disabled={!!flippedFortune}
                className={`aspect-[3/4] rounded-xl border-2 text-2xl font-black transition-all duration-300 ${
                  isFlipped
                    ? 'scale-110 border-gold bg-gold/15'
                    : flippedFortune
                      ? 'border-border bg-card opacity-40'
                      : 'border-border bg-card hover:scale-105 hover:border-gold/60'
                }`}
              >
                {isFlipped ? card.emoji : '❓'}
              </button>
            );
          })}
        </div>
        {flippedFortune && (
          <div className="mt-5 rounded-2xl border border-gold/40 bg-card p-5 text-center animate-in fade-in zoom-in-90 duration-500">
            <div className="text-4xl">{flippedFortune.emoji}</div>
            <p className="mt-1 font-display text-xl font-black text-foreground">{flippedFortune.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{flippedFortune.text}</p>
            <p className={`mt-2 font-display text-3xl font-black ${flippedFortune.delta >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
              {flippedFortune.delta >= 0 ? '+' : ''}€{flippedFortune.delta}M
            </p>
            <button
              onClick={confirmFortune}
              className="mt-4 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              To the squad decisions
            </button>
          </div>
        )}
        <GameNav currentPath="/rebuild" />
      </div>
    );
  }

  // ---- Keep/sell commitment (Round 51, box2box: commit before the market opens) ----
  if (phase === 'cuts') {
    const sorted = [...squad].sort((a, b) => b.marketValue - a.marketValue);
    const fundsNow = baseBudget + (flippedFortune?.delta ?? 0) - (coach?.cost ?? 0);
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-center font-display text-xl font-bold text-foreground">
          Commit your sales. Right now.
        </p>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Box2box rules: you decide who goes BEFORE you see a single transfer target.
          Once the market opens, nobody else leaves.
        </p>
        <div className="sticky top-2 z-10 mt-4 flex items-center justify-between gap-2 rounded-xl border border-gold/40 bg-card/95 px-4 py-2.5 backdrop-blur">
          <span className="text-xs text-muted-foreground">
            €{fundsNow}M<b className="text-emerald-500"> + €{cutsValue}M</b> from {cuts.length} sale{cuts.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={lockCuts}
            className="shrink-0 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            Lock it. Open the market
          </button>
        </div>
        <div className="mt-3 space-y-1.5">
          {sorted.map(p => {
            const out = cuts.includes(p.name);
            return (
              <button
                key={p.name}
                onClick={() => toggleCut(p)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                  out ? 'border-destructive/60 bg-destructive/10' : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FlagImg name={p.nationality} size={14} />
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-medium ${out ? 'text-destructive line-through' : 'text-foreground'}`}>
                      {p.name}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {p.position} · age {p.age || '?'} · rated {playerRating(p)}
                    </span>
                  </span>
                </span>
                <span
                  className={`ml-2 shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                    out ? 'border-destructive/60 text-destructive' : 'border-border text-muted-foreground'
                  }`}
                >
                  {out ? `SELLING €${p.marketValue}M` : 'KEEP'}
                </span>
              </button>
            );
          })}
        </div>
        <GameNav currentPath="/rebuild" />
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
            Coach: {coach?.name ?? 'Caretaker'} · Sold {sold.length} · Signed {signed.length} · €{budget}M unspent
          </p>

          {penalties.length > 0 && (
            <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-destructive">Board reckoning</p>
              {penalties.map((p, i) => (
                <p key={i} className="mt-1 text-xs text-muted-foreground">{p}</p>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-xl border border-border bg-background p-3 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              🏁 The other managers' windows
            </p>
            {rivalsLoading && (
              <p className="mt-2 text-xs text-muted-foreground">The rivals are finishing their paperwork...</p>
            )}
            {rivals && rivals.length > 0 && (
              <div className="mt-2 space-y-2">
                {[{ name: 'You', emoji: '🫵', club: { club: club.club }, startRating, finalRating: currentRating, signings: signed.map(s => s.name) }, ...rivals]
                  .sort((a, b) => b.finalRating - a.finalRating)
                  .map((r, i) => (
                    <div key={r.name} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${r.name === 'You' ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                      <span className="flex min-w-0 items-center gap-2 text-sm">
                        <span className="font-bold text-muted-foreground">#{i + 1}</span>
                        <span>{r.emoji}</span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-foreground">{r.name}</span>
                          <span className="block truncate text-[10px] text-muted-foreground">
                            {r.club.club}{r.signings.length ? ` · signed ${r.signings.slice(0, 2).join(', ')}${r.signings.length > 2 ? '...' : ''}` : ''}
                          </span>
                        </span>
                      </span>
                      <span className="ml-2 shrink-0 font-display text-xl font-black text-foreground">{r.finalRating}</span>
                    </div>
                  ))}
              </div>
            )}
            {!rivalsLoading && (!rivals || rivals.length === 0) && (
              <p className="mt-2 text-xs text-muted-foreground">The rivals ghosted this window.</p>
            )}
          </div>

          {/* Season sim (owner 2026-08-05: full season with stats) */}
          {season && (
            <div className="mt-4 rounded-xl border border-border bg-background p-3 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">📅 The season, simulated</p>
              <p className="mt-1 text-sm font-bold text-foreground">{season.headline}</p>
              <div className="mt-2 overflow-hidden rounded-lg border border-border">
                <div className="grid grid-cols-[1.2rem_1fr_1.6rem_1.6rem_1.6rem_2rem_2rem] gap-x-1 bg-card px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">
                  <span>#</span><span>Club</span><span>W</span><span>D</span><span>L</span><span>GD</span><span>Pts</span>
                </div>
                {season.table.map((r, i) => (
                  <div
                    key={r.name}
                    className={`grid grid-cols-[1.2rem_1fr_1.6rem_1.6rem_1.6rem_2rem_2rem] gap-x-1 border-t border-border/40 px-2 py-1 text-xs ${
                      r.isYou ? 'bg-primary/10 font-bold text-primary' : 'text-foreground'
                    }`}
                  >
                    <span>{i + 1}</span>
                    <span className="truncate">{r.emoji} {r.isYou || r.isRival ? `${r.name} · ${r.clubName}` : r.clubName}</span>
                    <span>{r.w}</span><span>{r.d}</span><span>{r.l}</span>
                    <span>{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</span>
                    <span>{r.pts}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 space-y-1">
                {season.highlights.map((h, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{h}</p>
                ))}
              </div>
              <div className="mt-2 space-y-0.5 text-xs text-foreground">
                {season.goldenBoot && (
                  <p>👟 Golden Boot: <b>{season.goldenBoot.player}</b> ({season.goldenBoot.team}), {season.goldenBoot.goals} goals</p>
                )}
                {season.yourTopScorer && season.goldenBoot?.player !== season.yourTopScorer.player && (
                  <p>⚽ Your top scorer: <b>{season.yourTopScorer.player}</b>, {season.yourTopScorer.goals} goals</p>
                )}
                {season.yourAssistKing && (
                  <p>🎯 Your assist king: <b>{season.yourAssistKing.player}</b>, {season.yourAssistKing.assists} assists</p>
                )}
              </div>
            </div>
          )}

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

      {/* Board objectives, live checklist */}
      {objectives.length > 0 && (
        <div className="mt-3 rounded-xl border border-gold/40 bg-gold/5 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gold">📋 Board demands</p>
          {objectives.map(o => (
            <p key={o.objective.id} className={`mt-1 text-xs ${o.met ? 'text-emerald-500' : 'text-muted-foreground'}`}>
              {o.met ? '✅' : '⬜'} {o.objective.text}
            </p>
          ))}
        </div>
      )}

      {/* Money news feed */}
      {finLog.length > 0 && (
        <div className="mt-3 rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">💸 Money news</p>
          {finLog.slice(-3).map((ev, i) => (
            <p key={i} className="mt-1 text-xs text-muted-foreground">
              {ev.emoji} {ev.text}{' '}
              <span className={ev.delta >= 0 ? 'font-bold text-emerald-500' : 'font-bold text-destructive'}>
                {ev.delta >= 0 ? '+' : ''}€{ev.delta}M
              </span>
            </p>
          ))}
        </div>
      )}

      {/* Pitch view (owner 2026-08-05: "like a pitch and ur formation... not just a list") */}
      <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-emerald-900/60 bg-gradient-to-b from-emerald-950/70 to-emerald-900/40">
        <div className="absolute inset-x-0 top-1/2 h-px bg-emerald-500/20" />
        <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-500/20" />
        {formation.slots.map((slot, i) => {
          const p = startingXi[i];
          const last = p ? p.name.split(' ').slice(-1)[0] : null;
          return (
            <button
              key={i}
              onClick={() => setActiveSlot(activeSlot === i ? null : i)}
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border px-1.5 py-1 text-center transition-all ${
                activeSlot === i
                  ? 'z-10 scale-110 border-gold bg-gold/20'
                  : p ? 'border-emerald-500/40 bg-background/85 hover:border-primary' : 'border-destructive/60 bg-destructive/20'
              }`}
            >
              <span className="block text-[8px] font-bold uppercase text-muted-foreground">{slot.label}</span>
              <span className="block max-w-[64px] truncate text-[10px] font-semibold text-foreground">
                {last ?? 'EMPTY'}
              </span>
              {p && <span className="block text-[9px] font-bold text-primary">{playerRating(p)}</span>}
            </button>
          );
        })}
      </div>

      {/* XI */}
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Your XI, tap a slot (pitch or list) to sign someone
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
                    <span className="text-sm italic text-destructive">empty, sign someone</span>
                  )}
                </span>
                {p && (
                  <span className="ml-2 shrink-0 text-xs">
                    <span className="font-bold text-primary">{playerRating(p)}</span>
                    <span className="text-gold"> €{p.marketValue}M</span>
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Signing panel */}
      {activeSlot !== null && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display font-bold text-foreground">
              Sign a {formation.slots[activeSlot].label}, €{budget}M available
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
                Nobody in this position fits in €{budget}M. Your sales are locked, so aim lower or free up money elsewhere.
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
          {overpaid > 0 && (
            <p className="mt-1 text-muted-foreground">
              <span className="font-semibold text-gold">War premiums:</span> €{overpaid}M over market value
            </p>
          )}
        </div>
      )}

      {/* Live bidding war (owner 2026-08-05: rivals hijack deals in real time) */}
      {war && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gold/50 bg-card p-5 shadow-2xl">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-gold">⚔️ Bidding war</p>
            <p className="mt-2 text-center font-display text-2xl font-black text-foreground">{war.player.name}</p>
            <p className="text-center text-xs text-muted-foreground">
              {war.player.club} · rated {playerRating(war.player)} · market value €{war.player.marketValue}M
            </p>
            <p className="mt-3 text-center font-display text-4xl font-black text-gold">€{war.price}M</p>
            <p className="text-center text-xs font-semibold text-muted-foreground">
              {war.outcome === 'won' ? '✅ DEAL DONE'
                : war.outcome === 'lost' ? '❌ DEAL LOST'
                : war.thinking ? `${war.rival.emoji} ${war.rival.name} is thinking…`
                : war.leader === 'you' ? 'Your bid leads'
                : `${war.rival.emoji} ${war.rival.name} leads`}
            </p>
            <div className="mt-3 max-h-32 space-y-1 overflow-y-auto rounded-lg border border-border bg-background p-2">
              {[...war.log].reverse().map((l, i) => (
                <p key={i} className={`text-xs ${i === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{l}</p>
              ))}
            </div>
            {war.outcome === 'live' && (
              <>
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    onClick={raiseWar}
                    disabled={war.thinking || war.leader === 'you' || nextRaise(war.price) > budget}
                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40"
                  >
                    Bid €{nextRaise(war.price)}M
                  </button>
                  <button
                    onClick={walkAway}
                    disabled={war.thinking || war.leader === 'you'}
                    className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground disabled:opacity-40"
                  >
                    Walk away
                  </button>
                </div>
                {war.leader === 'rival' && !war.thinking && nextRaise(war.price) > budget && (
                  <p className="mt-2 text-center text-[11px] text-destructive">
                    You cannot afford the next bid. Walk, or lose him anyway.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <GameNav currentPath="/rebuild" />
    </div>
  );
}
