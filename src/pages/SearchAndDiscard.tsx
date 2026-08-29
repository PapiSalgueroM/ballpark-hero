import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { GameNav } from '@/components/game/GameNav';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { fetchSquadPool, playerRating } from '@/lib/squadDeal';
import { Player } from '@/types/game';
import {
  SD_FORMATION, SdSeason, SdState, applyKeep, cpuKeep, drawOffer, duelOver,
  emptySlots, newDuel, sdFits, settleSeason, squadRating,
} from '@/lib/searchDiscard';

/**
 * Search and Discard (Round 325). The owner's spec from the 08-28 review:
 * the squad building duel, draw and discard, settled in a season sim, with
 * pass and play. Two managers, one shared pool, the same 4-3-3 each. Your
 * search deals three players, you keep one into a compatible open slot, and
 * the other two leave the game for good, which is the whole tension: a
 * discard is a move AGAINST the other manager as much as a pass on a
 * player. Online rooms are out of scope per the review's own backend note.
 */

type Phase = 'boot' | 'error' | 'setup' | 'drafting' | 'settled';
type Mode = 'cpu' | 'pass';
const SLUG = 'search-and-discard';

export default function SearchAndDiscard() {
  const [phase, setPhase] = useState<Phase>('boot');
  const [pool, setPool] = useState<Player[]>([]);
  const [mode, setMode] = useState<Mode>('cpu');
  const [state, setState] = useState<SdState | null>(null);
  const [offer, setOffer] = useState<Player[] | null>(null);
  const [keepPick, setKeepPick] = useState<Player | null>(null);
  const [season, setSeason] = useState<SdSeason | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSquadPool('current')
      .then(p => {
        if (cancelled) return;
        if (p.length < 100) { setPhase('error'); return; }
        setPool(p);
        setPhase('setup');
      })
      .catch(() => { if (!cancelled) setPhase('error'); });
    return () => { cancelled = true; };
  }, []);

  const start = useCallback((m: Mode) => {
    const duel = newDuel(pool, Math.floor(Math.random() * 2147483645) + 1);
    setMode(m);
    setState(duel);
    setSeason(null);
    setKeepPick(null);
    setOffer(drawOffer(duel));
    setPhase('drafting');
  }, [pool]);

  const finishIfOver = useCallback((next: SdState) => {
    if (duelOver(next)) {
      setSeason(settleSeason(next.squads[0], next.squads[1]));
      setState(next);
      setOffer(null);
      setPhase('settled');
      return true;
    }
    return false;
  }, []);

  const humanKeep = (slotIndex: number) => {
    if (!state || !offer || !keepPick) return;
    if (state.squads[state.turn][slotIndex] !== null || !sdFits(keepPick, SD_FORMATION.slots[slotIndex])) return;
    const next = applyKeep(state, offer, keepPick, slotIndex);
    setKeepPick(null);
    if (finishIfOver(next)) return;
    setState(next);
    setOffer(drawOffer(next));
  };

  /* The CPU takes its whole turn a beat after it becomes the drafter, so a
     person can watch the keep land. */
  useEffect(() => {
    if (phase !== 'drafting' || mode !== 'cpu' || !state || !offer || state.turn !== 1) return;
    const t = setTimeout(() => {
      const { keep, slotIndex } = cpuKeep(state, offer);
      const next = applyKeep(state, offer, keep, slotIndex);
      if (finishIfOver(next)) return;
      setState(next);
      setOffer(drawOffer(next));
    }, 1100);
    return () => clearTimeout(t);
  }, [phase, mode, state, offer, finishIfOver]);

  const isDone = phase === 'settled';
  const myPoints = season?.points[0] ?? 0;
  const finalScore = Math.min(100, Math.round((myPoints / 114) * 100));
  const won = season?.winner === 0;
  useGameCompletion(SLUG, isDone, finalScore, won ? 1 : 0);

  const turnName = state ? (state.turn === 0 ? 'Manager A' : mode === 'cpu' ? 'The CPU' : 'Manager B') : '';
  const humanTurn = !!state && (mode === 'pass' || state.turn === 0);

  const SquadColumn = ({ side, label }: { side: 0 | 1; label: string }) => (
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 text-center">
        {label} · {state ? squadRating(state.squads[side]) : 0} OVR
      </p>
      <div className="space-y-1">
        {SD_FORMATION.slots.map((slot, i) => {
          const p = state?.squads[side][i] ?? null;
          const openForKeep = humanTurn && side === state?.turn && !p && keepPick !== null && sdFits(keepPick, slot);
          return (
            <button
              key={i}
              onClick={() => (openForKeep ? humanKeep(i) : undefined)}
              disabled={!openForKeep}
              className={cn(
                'w-full rounded-md border px-1.5 py-1 text-left flex items-baseline gap-1.5 transition-colors',
                p ? 'bg-correct/10 border-correct/40' : 'bg-card border-border',
                openForKeep && 'border-primary bg-primary/10 animate-pulse cursor-pointer',
              )}
            >
              <span className="text-[9px] font-bold text-muted-foreground w-7 shrink-0">{slot.label}</span>
              <span className="text-[11px] font-semibold text-foreground truncate">
                {p ? `${p.name} · ${playerRating(p)}` : openForKeep ? 'Put him here' : 'Open'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <PageSeo
        title="Search and Discard: The Squad Building Duel | DoUKnowBall"
        description="Two managers, one shared pool of real players. Search three, keep one into your 4-3-3, discard the rest from the whole game, then settle it in a simulated season. Play the CPU or pass and play."
        path="/search-and-discard"
      />
      <GameShell width="narrow" title="Search and Discard" emoji="🔎" subtitle="Keep one, bin two, and let the season decide.">
        {phase === 'boot' && (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load the player pool right now.</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold">
              Try again
            </button>
          </div>
        )}

        {phase === 'setup' && (
          <div className="space-y-4 max-w-sm mx-auto">
            <div className="rounded-xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground space-y-1.5">
              <p className="font-bold text-foreground">How to play</p>
              <p>Both managers build the same 4-3-3 from one shared pool of real players. On your turn you search three, keep exactly one into a compatible open slot, and the other two are discarded from the whole game.</p>
              <p>A discard is a weapon: a star you bin can never reach the other squad. Eleven keeps each, then both XIs play the same simulated 38 game season, derbies included, and the table settles it.</p>
            </div>
            <button onClick={() => start('cpu')} className="w-full rounded-xl border border-border bg-surface-1 p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <span className="block font-bold text-foreground">Versus the CPU</span>
              <span className="block text-xs text-muted-foreground mt-0.5">It keeps the best fit and guards its scarce slots</span>
            </button>
            <button onClick={() => start('pass')} className="w-full rounded-xl border border-border bg-surface-1 p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <span className="block font-bold text-foreground">Pass and play</span>
              <span className="block text-xs text-muted-foreground mt-0.5">Two people, one screen, alternating searches</span>
            </button>
          </div>
        )}

        {phase === 'drafting' && state && offer && (
          <div className="space-y-4">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Search className="inline w-3.5 h-3.5 mr-1" />
              {turnName}'s search · {emptySlots(state, state.turn).length} slot{emptySlots(state, state.turn).length === 1 ? '' : 's'} to fill
            </p>

            <div className="grid grid-cols-3 gap-2">
              {offer.map(p => {
                const fitsSomewhere = emptySlots(state, state.turn).some(i => sdFits(p, SD_FORMATION.slots[i]));
                const active = humanTurn && fitsSomewhere;
                return (
                  <button
                    key={p.name}
                    onClick={() => (active ? setKeepPick(keepPick === p ? null : p) : undefined)}
                    disabled={!active}
                    className={cn(
                      'rounded-xl border p-2 text-center transition-colors',
                      keepPick === p ? 'border-primary bg-primary/10' : 'border-border bg-surface-1',
                      active ? 'hover:border-primary/50' : 'opacity-60',
                    )}
                  >
                    <span className="block text-lg font-black text-primary">{playerRating(p)}</span>
                    <span className="block text-[11px] font-bold text-foreground leading-tight">{p.name}</span>
                    <span className="block text-[9px] text-muted-foreground mt-0.5">
                      {p.position} · {p.nationality}
                    </span>
                    <span className="block text-[9px] text-muted-foreground">{p.club} · {p.marketValue}M</span>
                    {!fitsSomewhere && <span className="block text-[9px] text-destructive mt-0.5">No open slot fits</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              {humanTurn
                ? keepPick
                  ? `Now tap the slot for ${keepPick.name}. The other two go in the bin for good.`
                  : 'Tap the player to keep. The other two leave the game forever.'
                : 'The CPU is choosing...'}
            </p>

            <div className="flex gap-3">
              <SquadColumn side={0} label="Manager A" />
              <SquadColumn side={1} label={mode === 'cpu' ? 'The CPU' : 'Manager B'} />
            </div>

            {state.discards.length > 0 && (
              <p className="text-center text-[10px] text-muted-foreground">
                <Trash2 className="inline w-3 h-3 mr-1" />
                Binned: {state.discards.slice(-6).map(p => p.name).join(', ')}{state.discards.length > 6 ? ` and ${state.discards.length - 6} more` : ''}
              </p>
            )}
          </div>
        )}

        {isDone && season && state && (
          <ResultScreen
            won={won}
            outcomeEmoji={won ? '🏆' : season.winner === -1 ? '🤝' : '🫠'}
            headline={won ? 'Your draft won the season!' : season.winner === -1 ? 'Dead level after 38 games' : 'Their draft took the title'}
            statLine={`You ${season.points[0]} pts (${season.ratings[0]} OVR) · ${mode === 'cpu' ? 'CPU' : 'Manager B'} ${season.points[1]} pts (${season.ratings[1]} OVR)`}
            funFact={season.headToHead}
            statRow={[{ label: 'Season score', value: finalScore }]}
            emojiGrid={`🔎 Search and Discard\n${won ? '🏆' : '🫠'} ${season.points[0]} pts vs ${season.points[1]} pts`}
            share={{ score: String(finalScore), gameName: 'Search and Discard', gamePath: '/search-and-discard' }}
            onPlayAgain={() => setPhase('setup')}
            playAgainLabel="New duel"
          >
            <div className="text-left text-sm text-muted-foreground space-y-1 my-4 py-3 px-4 rounded-xl bg-surface-2 border border-border/60">
              {season.story.map((line, i) => <p key={i}>{line}</p>)}
            </div>
          </ResultScreen>
        )}

        <AdBanner slot="1234567891" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType={SLUG} />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Search and Discard: The Squad Building Duel"
          description="Two managers, one shared pool of real footballers, the same 4-3-3 each. Search three players, keep one, discard two from the whole game, and settle the draft in a simulated 38 game season with head to head derbies. Versus the CPU or pass and play on one screen."
        />
        <GameNav />
      </GameShell>
    </>
  );
}
