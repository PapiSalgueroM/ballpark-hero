import { useCallback, useEffect, useState } from 'react';
import { Loader2, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { GameNav } from '@/components/game/GameNav';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET } from '@/lib/dateUtils';
import { markRestoredFinish } from '@/lib/restoredFinish';
import { fetchSquadPool, playerRating } from '@/lib/squadDeal';
import { Player } from '@/types/game';
import {
  GAUNTLET_ROUNDS, GauntletDraft as DraftShape, GauntletRun,
  buildDraft, dailyDraftSeed, loadDailyRun, runGauntlet, saveDailyRun, squadRatingOf,
} from '@/lib/gauntletDraft';

/**
 * Gauntlet Draft (Round 328), the last of the owner's three new game
 * requests: the draft mode. Eleven picks of five real players each, one per
 * slot of the drawn formation, then the finished XI runs a five round
 * knockout against escalating invented opposition. The card art is our own:
 * a band coloured frame, the rating big, nothing borrowed from anybody.
 * Every opponent club is invented on purpose, the players are real.
 */

type Phase = 'boot' | 'error' | 'setup' | 'drafting' | 'running' | 'done';
type Mode = 'daily' | 'unlimited';
const SLUG = 'gauntlet-draft';

/* The original card frame: colour keyed to the card's rating band. */
const bandClass = (r: number) =>
  r >= 86 ? 'from-amber-400/30 to-amber-600/10 border-amber-400/60'
  : r >= 78 ? 'from-violet-400/25 to-violet-600/10 border-violet-400/50'
  : r >= 70 ? 'from-sky-400/25 to-sky-600/10 border-sky-400/50'
  : 'from-zinc-400/20 to-zinc-600/10 border-zinc-500/50';

export default function GauntletDraft() {
  const [phase, setPhase] = useState<Phase>('boot');
  const [pool, setPool] = useState<Player[]>([]);
  const [mode, setMode] = useState<Mode>('daily');
  const [draft, setDraft] = useState<DraftShape | null>(null);
  const [pickIndex, setPickIndex] = useState(0);
  const [squad, setSquad] = useState<(Player | null)[]>([]);
  const [run, setRun] = useState<GauntletRun | null>(null);
  const [shownMatches, setShownMatches] = useState(0);

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
    if (m === 'daily') {
      /* Round 428: a run already in the books comes back as it was, instead
         of the same draft being dealt again with the cup known. This restore
         runs in a click handler after mount, exactly the false to true
         transition useGameCompletion records, so it says what it is first. */
      const saved = loadDailyRun(getTodayET());
      if (saved) {
        markRestoredFinish(SLUG);
        setMode('daily');
        setDraft(null);
        setRun(saved);
        setShownMatches(saved.matches.length);
        setPhase('done');
        return;
      }
    }
    const seed = m === 'daily' ? dailyDraftSeed(getTodayET()) : Math.floor(Math.random() * 2147483645) + 1;
    const d = buildDraft(pool, seed);
    setMode(m);
    setDraft(d);
    setPickIndex(0);
    setSquad(new Array<Player | null>(d.formation.slots.length).fill(null));
    setRun(null);
    setShownMatches(0);
    setPhase('drafting');
  }, [pool]);

  const keep = (p: Player) => {
    if (!draft || phase !== 'drafting') return;
    const next = [...squad];
    next[pickIndex] = p;
    setSquad(next);
    if (pickIndex + 1 >= draft.picks.length) {
      const result = runGauntlet(next);
      if (mode === 'daily') saveDailyRun(getTodayET(), result);
      setRun(result);
      setPhase('running');
      return;
    }
    setPickIndex(i => i + 1);
  };

  /* The run reveals a match at a time so the cup feels like a cup. */
  useEffect(() => {
    if (phase !== 'running' || !run) return;
    if (shownMatches >= run.matches.length) {
      const t = setTimeout(() => setPhase('done'), 900);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShownMatches(n => n + 1), 1000);
    return () => clearTimeout(t);
  }, [phase, run, shownMatches]);

  const isDone = phase === 'done';
  useGameCompletion(SLUG, isDone, run?.score ?? 0, run?.roundsCleared ?? 0);

  const pick = draft && phase === 'drafting' ? draft.picks[pickIndex] : null;
  const dailyDone = phase === 'setup' && loadDailyRun(getTodayET()) !== null;

  const matchLine = (m: GauntletRun['matches'][number]) =>
    `${m.round.name}: ${m.yourGoals}-${m.theirGoals} v ${m.round.opp}` +
    (m.wonOnPens !== null ? (m.wonOnPens ? ', won on pens' : ', lost on pens') : '');

  return (
    <>
      <PageSeo
        title="Gauntlet Draft: Pick Five, Survive Five | DoUKnowBall"
        description="The draft mode: eleven picks of five real players each, one per position, then your XI runs a five round knockout against ever stronger opposition. One shared daily draft, an unlimited mode, and the same squad always runs the same gauntlet."
        path="/gauntlet-draft"
      />
      <GameShell width="narrow" title="Gauntlet Draft" emoji="⚔️" subtitle="Pick your XI five cards at a time, then survive the cup.">
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
              <p>A formation is drawn. For each of its eleven slots you get five real players who fit it, spread from a star to a bargain, and you keep exactly one.</p>
              <p>Then your XI runs the gauntlet: five knockout rounds against opposition rated 70 up to 89. Level after ninety goes to extra time, then pens.</p>
              <p>The run is decided by the squad you drafted: the same XI always runs the same gauntlet. 16 points a round survived, the trophy lands exactly 100.</p>
            </div>
            <button onClick={() => start('daily')} className="w-full rounded-xl border border-border bg-surface-1 p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <span className="block font-bold text-foreground">Daily gauntlet</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{dailyDone ? "Today's draft is done. See how the cup went" : 'The same five card choices for everyone today'}</span>
            </button>
            <button onClick={() => start('unlimited')} className="w-full rounded-xl border border-border bg-surface-1 p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <span className="block font-bold text-foreground">Unlimited</span>
              <span className="block text-xs text-muted-foreground mt-0.5">A fresh draft every run</span>
            </button>
          </div>
        )}

        {phase === 'drafting' && draft && pick && (
          <div className="space-y-4">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pick {pickIndex + 1} of {draft.picks.length} · the {pick.slot.label} · {draft.formation.name}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {pick.choices.map(p => {
                const r = playerRating(p);
                return (
                  <button
                    key={p.name}
                    onClick={() => keep(p)}
                    className={cn(
                      'rounded-xl border bg-gradient-to-b p-3 text-center transition-transform hover:scale-[1.03] active:scale-[0.98]',
                      bandClass(r),
                    )}
                  >
                    <span className="block text-2xl font-black text-foreground">{r}</span>
                    <span className="block text-[8px] font-bold uppercase tracking-widest text-muted-foreground">{p.position}</span>
                    <span className="block text-xs font-bold text-foreground leading-tight mt-1">{p.name}</span>
                    <span className="block text-[9px] text-muted-foreground mt-0.5">{p.club}</span>
                    <span className="block text-[9px] text-muted-foreground">{p.nationality} · {p.marketValue}M</span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 text-center">
                Your XI so far · {squadRatingOf(squad)} OVR
              </p>
              <div className="flex flex-wrap gap-1 justify-center">
                {draft.formation.slots.map((slot, i) => (
                  <span key={i} className={cn(
                    'px-1.5 py-0.5 rounded text-[9px] font-semibold',
                    squad[i] ? 'bg-correct/15 text-foreground' : i === pickIndex ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 text-muted-foreground',
                  )}>
                    {slot.label}{squad[i] ? ` ${squad[i]!.name.split(' ').slice(-1)[0]}` : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === 'running' && run && (
          <div className="space-y-3 max-w-sm mx-auto">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Swords className="inline w-4 h-4 mr-1" /> The gauntlet · your XI rates {run.rating}
            </p>
            {run.matches.slice(0, shownMatches).map((m, i) => (
              <div key={i} className={cn('rounded-xl border p-3 text-center animate-fade-in', m.won ? 'border-correct/50 bg-correct/10' : 'border-destructive/50 bg-destructive/10')}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{m.round.name} · they rate {m.round.rating}</p>
                <p className="text-lg font-black text-foreground">{m.yourGoals} - {m.theirGoals} <span className="text-sm font-semibold text-muted-foreground">v {m.round.opp}</span></p>
                {m.wonOnPens !== null && <p className="text-xs text-muted-foreground">{m.wonOnPens ? 'Won on penalties' : 'Lost on penalties'}</p>}
              </div>
            ))}
          </div>
        )}

        {isDone && run && (
          <ResultScreen
            won={run.champion}
            outcomeEmoji={run.champion ? '🏆' : run.roundsCleared >= 3 ? '🥈' : '🫠'}
            headline={run.champion ? 'Champions! The gauntlet is run!' : `Out at ${run.matches[run.matches.length - 1]?.round.name ?? 'the start'}`}
            statLine={`${run.roundsCleared} of ${GAUNTLET_ROUNDS.length} rounds survived with a ${run.rating} rated XI`}
            statRow={[{ label: 'Score', value: run.score }]}
            emojiGrid={[`⚔️ Gauntlet Draft: ${run.score} pts`, ...run.matches.map(m => `${m.won ? '🟩' : '🟥'} ${matchLine(m)}`)].join('\n')}
            share={{ score: String(run.score), gameName: 'Gauntlet Draft', gamePath: '/gauntlet-draft' }}
            onPlayAgain={() => setPhase('setup')}
            playAgainLabel={mode === 'daily' ? 'Back to modes' : 'New draft'}
            playNext={mode === 'daily' ? <p className="text-sm text-muted-foreground">Come back tomorrow for a new draft.</p> : undefined}
          >
            <div className="text-left text-sm text-muted-foreground space-y-1 my-4 py-3 px-4 rounded-xl bg-surface-2 border border-border/60">
              {run.matches.map((m, i) => <p key={i}>{matchLine(m)}</p>)}
            </div>
          </ResultScreen>
        )}

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType={SLUG} />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Gauntlet Draft: Pick Five, Survive Five"
          description="The draft mode: a formation is drawn, each of its eleven slots deals five real players from a star to a bargain, you keep one per slot, and the finished XI runs a five round knockout against ever stronger invented opposition. One shared daily draft, unlimited redrafts, and a fully deterministic cup run so the draft is the game."
        />
        <GameNav />
      </GameShell>
    </>
  );
}
