import { useEffect, useState } from 'react';
import { Check, Copy, RotateCcw } from 'lucide-react';
import { FlagImg } from '@/components/FlagImg';
import { GameNav } from '@/components/game/GameNav';
import { FORMATIONS, playerRating } from '@/lib/squadDeal';
import { nextRaise, OVERDRAFT_LIMIT, REBUILD_PRESETS, TIER_BUDGET, PERK_LABEL, type PerkKind } from '@/lib/rebuildDeck';
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

const PERK_KINDS: PerkKind[] = ['rescout', 'discount', 'noWar'];

function potLine(delta: number): string {
  if (delta > 0) return `€${delta}M into the pot`;
  if (delta < 0) return `€${-delta}M out of the pot`;
  return 'No change to the pot';
}

export function RebuildBoard() {
  const {
    phase, loading, clubs, club, preset, setPreset, chooseClub, reset,
    run,
    startingXi, startRating, currentRating, target, budget, spendCeiling, finalFunds, objectives, grade, shareText,
    managerReading, offerPrice, canRedeal,
    pickFinance, toManager, hireManager, keepManager, setFormation,
    spinning, spin, keepSpun, sellSpun, takeReplacement, promoteBench, takeForty, redealSpun,
    thinking, raiseWar, walkAway,
    finish, rivals, rivalsLoading, season,
  } = useRebuild();
  // Round 61: the owner's no scroll rule. Every phase change (envelopes, spin,
  // results) pulls the new screen into view instead of leaving the player
  // looking at the old one.
  const revealRef = useRevealScroll<HTMLDivElement>(phase);
  const [copied, setCopied] = useState(false);

  // Round 333: while the wheel spins, the highlight cycles the unresolved
  // shirts so the reveal reads as a draw, not a jump cut.
  const [flash, setFlash] = useState<number | null>(null);
  const slotCount = run?.formation.slots.length ?? 0;
  const decided = run?.decided;
  useEffect(() => {
    if (!spinning || !decided) { setFlash(null); return; }
    const open = Array.from({ length: slotCount }, (_, i) => i).filter(i => !(i in decided));
    if (open.length === 0) return;
    let k = 0;
    const t = window.setInterval(() => { k += 1; setFlash(open[k % open.length]); }, 110);
    return () => window.clearInterval(t);
  }, [spinning, slotCount, decided]);

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
  if (phase === 'pick-club' || !run) {
    const byTier: Record<string, typeof clubs> = {};
    for (const c of clubs) (byTier[c.tier] ??= []).push(c);
    const order: ClubTier[] = ['elite', 'strong', 'mid', 'modest'];

    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-center font-display text-xl font-bold text-foreground">
          Pick a club to rebuild
        </p>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Bigger clubs hand you a bigger pot. Two envelopes land first, then you spin for one
          shirt at a time: keep the man you draw or sell him for good, and answer to the board
          at the end.
        </p>

        <div className="mt-4 rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Market restriction, locked once you pick a club
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {REBUILD_PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={`rounded-lg border px-2 py-2 text-left transition-colors ${
                  preset === p.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                }`}
              >
                <span className="block text-xs font-bold text-foreground">{p.label}</span>
                <span className="block text-[10px] text-muted-foreground">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {order.map(tier => (
          byTier[tier]?.length ? (
            <div key={tier} className="mt-6">
              <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${TIER_STYLE[tier]}`}>
                {TIER_LABEL[tier]} · €{TIER_BUDGET[tier]}M pot
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

  // ---- The two envelopes (Round 456) ----
  if (phase === 'envelopes') {
    const board = run.board;
    const card = run.financeCard;
    return (
      <div ref={revealRef} className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-center font-display text-xl font-bold text-foreground">
          Two envelopes on the desk
        </p>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          The board's is open already. The finance one is yours to pick, and you pick it blind.
        </p>

        <div className="mt-5 rounded-2xl border border-gold/40 bg-gold/5 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gold">From the board</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl">{board.emoji}</span>
            <p className="font-display text-lg font-black text-foreground">{board.title}</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{board.text}</p>
          <p className={`mt-2 text-sm font-bold ${board.delta > 0 ? 'text-emerald-500' : board.delta < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {potLine(board.delta)}
          </p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-gold">
            The demands. Each miss draws a punishment card
          </p>
          <ul className="mt-1 space-y-1">
            {board.demands.map(o => (
              <li key={o.id} className="text-sm text-foreground">{o.emoji} {o.text}</li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            From the finance department: pick one of {run.financeDeck.length}
          </p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {run.financeDeck.map((c, i) => {
              const isFlipped = run.financeIndex === i;
              return (
                <button
                  key={c.id}
                  onClick={() => pickFinance(i)}
                  disabled={!!card}
                  aria-label={isFlipped ? c.title : `Envelope ${i + 1}`}
                  className={`aspect-[3/4] rounded-xl border-2 text-2xl font-black transition-all duration-300 ${
                    isFlipped
                      ? 'scale-110 border-gold bg-gold/15'
                      : card
                        ? 'border-border bg-card opacity-40'
                        : 'border-border bg-card hover:scale-105 hover:border-gold/60'
                  }`}
                >
                  {isFlipped ? c.emoji : '✉️'}
                </button>
              );
            })}
          </div>
          {card && (
            <div className="mt-4 rounded-2xl border border-gold/40 bg-background p-4 text-center animate-in fade-in zoom-in-90 duration-500">
              <div className="text-4xl">{card.emoji}</div>
              <p className="mt-1 font-display text-xl font-black text-foreground">{card.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{card.text}</p>
              {card.perk ? (
                <p className="mt-2 font-display text-2xl font-black text-primary">{PERK_LABEL[card.perk].emoji} {PERK_LABEL[card.perk].short}</p>
              ) : (
                <p className={`mt-2 font-display text-3xl font-black ${card.delta >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {card.delta >= 0 ? '+' : ''}€{card.delta}M
                </p>
              )}
              <button
                onClick={toManager}
                className="mt-4 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                Now hire a manager
              </button>
            </div>
          )}
        </div>
        <GameNav currentPath="/rebuild" />
      </div>
    );
  }

  // ---- The manager ----
  if (phase === 'manager') {
    return (
      <div ref={revealRef} className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-center font-display text-xl font-bold text-foreground">
          Pick your manager
        </p>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Keep the man you have for free, or pay for one of three. Each gets more out of one
          kind of player, and the number beside each name is what your XI reads with him in
          charge today. €{budget}M in the pot.
        </p>

        <div className="mt-5 grid gap-2">
          {[...run.managerOptions, keepManager].map(m => (
            <button
              key={m.id}
              onClick={() => hireManager(m)}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="text-2xl">{m.emoji}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-foreground">{m.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{m.line}</span>
                </span>
              </span>
              <span className="ml-3 shrink-0 text-right">
                <span className="block text-sm font-bold text-primary">XI reads {managerReading(m)}</span>
                <span className="block text-[11px] text-gold">{m.cost === 0 ? 'Free' : `€${m.cost}M`}</span>
              </span>
            </button>
          ))}
        </div>

        {objectives.length > 0 && (
          <div className="mt-6 rounded-xl border border-gold/40 bg-gold/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">
              📋 The board's demands (each miss draws a punishment card)
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

  // ---- Done ----
  if (phase === 'done') {
    const hit = currentRating >= target;
    const penalties = run.reckoning?.notes ?? [];
    return (
      <div ref={revealRef} className="mx-auto max-w-2xl px-4 py-8">
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
            Manager: {run.manager?.name ?? keepManager.name} · Sold {run.sold.length} · Signed {run.signed.length} · €{Math.abs(finalFunds)}M {finalFunds < 0 ? 'in debt' : 'left'}
          </p>

          {penalties.length > 0 && (
            <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-destructive">What the board did</p>
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
              <p className="mt-2 text-xs text-muted-foreground">The rivals are still doing their deals...</p>
            )}
            {rivals && rivals.length > 0 && (
              <div className="mt-2 space-y-2">
                {[{ name: 'You', emoji: '🫵', club: { club: club.club }, startRating, finalRating: currentRating, signings: run.signed.map(s => s.name) }, ...rivals]
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
              <p className="mt-2 text-xs text-muted-foreground">The rivals sat this window out.</p>
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
                  <p>🎯 Your top assister: <b>{season.yourAssistKing.player}</b>, {season.yourAssistKing.assists} assists</p>
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

  // ---- The spin loop (Round 333: the owner's core loop) ----
  const { formation, spun, deal, war, sold, signed, overpaid, post, perks, settledCount } = run;
  const onTrack = currentRating >= target;
  const incumbent = spun !== null ? startingXi[spun] : null;
  const spentAllSpins = settledCount >= formation.slots.length;
  const heldPerks = PERK_KINDS.filter(k => perks[k] > 0);

  return (
    <div ref={revealRef} className="mx-auto max-w-2xl px-4 py-6">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-black text-foreground">{club.club}</p>
            <p className={`text-[11px] ${budget < 0 ? 'font-bold text-destructive' : 'text-muted-foreground'}`}>
              {budget < 0 ? `€${-budget}M IN DEBT` : `€${budget}M to spend`} · overdraft to €{OVERDRAFT_LIMIT}M
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
        {settledCount === 0 && spun === null && !spinning && (
          <select
            value={formation.name}
            onChange={e => setFormation(e.target.value)}
            aria-label="Choose formation"
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
          >
            {FORMATIONS.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
          </select>
        )}
        <span className="text-xs font-semibold text-muted-foreground">
          {settledCount} of {formation.slots.length} shirts settled
        </span>
        {!spentAllSpins && (
          <button
            onClick={spin}
            disabled={spinning || spun !== null || !!war}
            className="ml-auto rounded-full bg-primary px-6 py-2 text-sm font-black tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            {spinning ? 'SPINNING…' : 'SPIN'}
          </button>
        )}
        {spentAllSpins && (
          <button
            onClick={finish}
            disabled={!!war}
            className="ml-auto rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            Final whistle
          </button>
        )}
      </div>

      {/* Board demands, live checklist */}
      {objectives.length > 0 && (
        <div className="mt-3 rounded-xl border border-gold/40 bg-gold/5 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gold">📋 Board demands, each miss draws a punishment card</p>
          {objectives.map(o => (
            <p key={o.objective.id} className={`mt-1 text-xs ${o.met ? 'text-emerald-500' : 'text-muted-foreground'}`}>
              {o.met ? '✅' : '⬜'} {o.objective.text}
            </p>
          ))}
        </div>
      )}

      {/* Perks in hand */}
      {heldPerks.length > 0 && (
        <div className="mt-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">In your pocket</p>
          {heldPerks.map(k => (
            <p key={k} className="mt-1 text-xs text-foreground">
              {PERK_LABEL[k].emoji} <span className="font-semibold">{PERK_LABEL[k].short}{perks[k] > 1 ? ` x${perks[k]}` : ''}</span>
              <span className="text-muted-foreground">: {PERK_LABEL[k].long}</span>
            </p>
          ))}
        </div>
      )}

      {/* Envelopes that arrived as you went */}
      {post.length > 0 && (
        <div className="mt-3 rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">✉️ In the post</p>
          {post.slice(-3).map((ev, i) => (
            <p key={i} className="mt-1 text-xs text-muted-foreground">
              {ev.emoji} {ev.text}{' '}
              {ev.perk ? (
                <span className="font-bold text-primary">{PERK_LABEL[ev.perk].short}</span>
              ) : (
                <span className={ev.delta >= 0 ? 'font-bold text-emerald-500' : 'font-bold text-destructive'}>
                  {ev.delta >= 0 ? '+' : ''}€{ev.delta}M
                </span>
              )}
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
          const isSettled = i in run.decided;
          const isSpun = spun === i;
          const isFlash = flash === i;
          return (
            <div
              key={i}
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border px-1.5 py-1 text-center transition-all ${
                isSpun ? 'z-10 scale-110 border-gold bg-gold/25'
                : isFlash ? 'z-10 scale-105 border-gold bg-gold/15'
                : isSettled ? 'border-emerald-400/70 bg-emerald-500/15'
                : p ? 'border-emerald-500/40 bg-background/85' : 'border-border bg-background/60'
              }`}
            >
              <span className="block text-[8px] font-bold uppercase text-muted-foreground">{slot.label}</span>
              <span className="block max-w-[64px] truncate text-[10px] font-semibold text-foreground">
                {last ?? (isSpun ? 'OPEN' : isSettled ? '40 overall' : 'EMPTY')}
              </span>
              {p && <span className="block text-[9px] font-bold text-primary">{playerRating(p)}</span>}
              {!p && isSettled && <span className="block text-[9px] font-bold text-muted-foreground">40</span>}
              {isSettled && <span className="block text-[8px] font-bold text-emerald-400">✓</span>}
            </div>
          );
        })}
      </div>

      {/* The drawn shirt: keep him or sell him, and selling is final */}
      {spun !== null && !deal && incumbent && (
        <div className="mt-4 rounded-2xl border border-gold/50 bg-card p-4 animate-in fade-in zoom-in-95 duration-300">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-gold">
            The wheel lands on {formation.slots[spun].label}
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <FlagImg name={incumbent.nationality} size={16} />
            <p className="font-display text-xl font-black text-foreground">{incumbent.name}</p>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            rated {playerRating(incumbent)} · worth €{incumbent.marketValue}M · age {incumbent.age || '?'}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={keepSpun}
              className="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-6 py-2.5 text-sm font-bold text-emerald-500 hover:bg-emerald-500/20"
            >
              KEEP HIM
            </button>
            <button
              onClick={sellSpun}
              className="rounded-full border border-destructive/60 bg-destructive/10 px-6 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/20"
            >
              SELL, €{incumbent.marketValue}M
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Selling is final. The scouts bring three prices, the bench is free, and a 40 overall is always there.
          </p>
        </div>
      )}

      {/* The replacement deal: three priced men, the free bench, the 40 overall */}
      {spun !== null && deal && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {incumbent ? `Fill the ${formation.slots[spun].label} shirt` : `The ${formation.slots[spun].label} shirt was already empty, fill it`}
          </p>
          {deal.offers.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gold">
                The scouts' three{perks.discount > 0 ? ', 20% off the one you take' : ''}
              </p>
              {deal.offers.map(p => {
                const price = offerPrice(p);
                const affordable = price <= spendCeiling;
                return (
                  <button
                    key={p.name}
                    onClick={() => takeReplacement(p)}
                    disabled={!affordable || !!war}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left hover:border-primary/50 disabled:opacity-40"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FlagImg name={p.nationality} size={14} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">{p.name}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{p.club} · age {p.age || '?'}</span>
                      </span>
                    </span>
                    <span className="ml-2 shrink-0 text-right">
                      <span className="block text-sm font-bold text-primary">{playerRating(p)}</span>
                      <span className="block text-[10px] text-gold">
                        {price < p.marketValue && <span className="mr-1 text-muted-foreground line-through">€{p.marketValue}M</span>}
                        €{price}M
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {deal.bench.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">Promote from your own squad, free</p>
              {deal.bench.map(p => (
                <button
                  key={p.name}
                  onClick={() => promoteBench(p)}
                  disabled={!!war}
                  className="flex w-full items-center justify-between rounded-lg border border-emerald-500/30 bg-background px-3 py-2 text-left hover:border-emerald-500/60 disabled:opacity-40"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FlagImg name={p.nationality} size={14} />
                    <span className="truncate text-sm font-medium text-foreground">{p.name}</span>
                  </span>
                  <span className="ml-2 shrink-0 text-right">
                    <span className="block text-sm font-bold text-primary">{playerRating(p)}</span>
                    <span className="block text-[10px] text-emerald-500">Free</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {canRedeal && (
            <div className="mt-3 text-center">
              <p className="text-xs text-muted-foreground">
                {perks.rescout > 0 ? 'You have a fresh list in your pocket.' : 'Nobody on the list is gettable with the money left.'}
              </p>
              <button
                onClick={redealSpun}
                className="mt-2 rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground hover:border-primary/50"
              >
                Ask the scouts for a new list
              </button>
            </div>
          )}
          <button
            onClick={takeForty}
            disabled={!!war}
            className="mt-3 w-full rounded-lg border border-border/60 px-3 py-2 text-center text-[11px] text-muted-foreground hover:border-destructive/40 hover:text-destructive disabled:opacity-40"
          >
            Take a 40 overall for this shirt
          </button>
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
              <span className="font-semibold text-gold">Paid over value in wars:</span> €{overpaid}M
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
                : thinking ? `${run.rivalPlans[war.rivalIdx].emoji} ${run.rivalPlans[war.rivalIdx].name} is thinking…`
                : war.leader === 'you' ? 'Your bid leads'
                : `${run.rivalPlans[war.rivalIdx].emoji} ${run.rivalPlans[war.rivalIdx].name} leads`}
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
                    disabled={thinking || war.leader === 'you' || nextRaise(war.price) > spendCeiling}
                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40"
                  >
                    Bid €{nextRaise(war.price)}M
                  </button>
                  <button
                    onClick={walkAway}
                    disabled={thinking || war.leader === 'you'}
                    className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground disabled:opacity-40"
                  >
                    Walk away
                  </button>
                </div>
                {war.leader === 'rival' && !thinking && nextRaise(war.price) > spendCeiling && (
                  <p className="mt-2 text-center text-[11px] text-destructive">
                    Even the overdraft cannot cover the next bid. Walk, or lose him anyway.
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
