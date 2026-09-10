import { useCallback, useEffect, useState, useRef } from 'react';
import { Swords } from 'lucide-react';
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
import { NBA_GAUNTLET_CONFIG, NBA_GAUNTLET_ROUNDS } from '@/lib/gauntletDraftNba';
import { NbaPoolPlayer } from '@/data/nbaPerfectLineupPool';
import {
  buildDraft, dailySeedFor, GauntletDraftResult, GauntletRun,
  loadDailyRun, runGauntlet, saveDailyRun, squadRatingOf,
} from '@/lib/gauntletEngine';

/**
 * Gauntlet Draft: NBA (Round 520). Same game as /gauntlet-draft, wearing the
 * NBA's own pool, positions and ladder through the generic engine in
 * src/lib/gauntletEngine.ts: five picks of five real players each, one per
 * starting five slot, then the finished five runs the same five round
 * knockout shape. See src/lib/gauntletDraftNba.ts for where the pool, the
 * shape and the ladder come from.
 */

type Phase = 'setup' | 'drafting' | 'running' | 'done';
type Mode = 'daily' | 'unlimited';
const SLUG = 'nba-gauntlet-draft';

const bandClass = (r: number) =>
  r >= 96 ? 'from-amber-400/30 to-amber-600/10 border-amber-400/60'
  : r >= 92 ? 'from-violet-400/25 to-violet-600/10 border-violet-400/50'
  : r >= 88 ? 'from-sky-400/25 to-sky-600/10 border-sky-400/50'
  : 'from-zinc-400/20 to-zinc-600/10 border-zinc-500/50';

export default function NbaGauntletDraft() {
  const todayStr = useRef(getTodayET()).current;
  const [phase, setPhase] = useState<Phase>('setup');
  const [mode, setMode] = useState<Mode>('daily');
  const [draft, setDraft] = useState<GauntletDraftResult<NbaPoolPlayer> | null>(null);
  const [pickIndex, setPickIndex] = useState(0);
  const [squad, setSquad] = useState<(NbaPoolPlayer | null)[]>([]);
  const [run, setRun] = useState<GauntletRun | null>(null);
  const [shownMatches, setShownMatches] = useState(0);

  const start = useCallback((m: Mode) => {
    if (m === 'daily') {
      const saved = loadDailyRun(NBA_GAUNTLET_CONFIG, todayStr);
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
    const seed = m === 'daily' ? dailySeedFor(NBA_GAUNTLET_CONFIG, todayStr) : Math.floor(Math.random() * 2147483645) + 1;
    const d = buildDraft(NBA_GAUNTLET_CONFIG, seed);
    setMode(m);
    setDraft(d);
    setPickIndex(0);
    setSquad(new Array<NbaPoolPlayer | null>(d.formation.slots.length).fill(null));
    setRun(null);
    setShownMatches(0);
    setPhase('drafting');
  }, []);

  const keep = (p: NbaPoolPlayer) => {
    if (!draft || phase !== 'drafting') return;
    const next = [...squad];
    next[pickIndex] = p;
    setSquad(next);
    if (pickIndex + 1 >= draft.picks.length) {
      const result = runGauntlet(NBA_GAUNTLET_CONFIG, next);
      if (mode === 'daily') saveDailyRun(NBA_GAUNTLET_CONFIG, todayStr, result);
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
  useGameCompletion(SLUG, run !== null, run?.score ?? 0, run?.roundsCleared ?? 0);

  const pick = draft && phase === 'drafting' ? draft.picks[pickIndex] : null;
  const dailyDone = phase === 'setup' && loadDailyRun(NBA_GAUNTLET_CONFIG, todayStr) !== null;

  const matchLine = (m: GauntletRun['matches'][number]) =>
    `${m.round.name}: ${m.yourGoals}-${m.theirGoals} v ${m.round.opp}` +
    (m.wonOnPens !== null ? (m.wonOnPens ? ', won in a shootout' : ', lost in a shootout') : '');

  return (
    <>
      <PageSeo
        title="Gauntlet Draft: NBA, Pick Five, Survive Five | DoUKnowBall"
        description="The NBA draft mode: five picks of five real players each, one per starting five slot, then your five runs a five round knockout against ever stronger opposition. One shared daily draft, an unlimited mode, and the same five always runs the same gauntlet."
        path="/nba-gauntlet-draft"
      />
      <GameShell width="narrow" title="Gauntlet Draft: NBA" emoji="⚔️" subtitle="Pick your five, five cards at a time, then survive the cup.">
        {phase === 'setup' && (
          <div className="space-y-4 max-w-sm mx-auto">
            <div className="rounded-xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground space-y-1.5">
              <p className="font-bold text-foreground">How to play</p>
              <p>For each of the five starting five slots you get five real players who fit it, spread from a star to a bargain, and you keep exactly one.</p>
              <p>Then your five runs the gauntlet: five knockout rounds against opposition rated 85 up to 101. A level game goes to extra time, then a shootout.</p>
              <p>The run is decided by the five you drafted: the same five always runs the same gauntlet. 16 points a round survived, the trophy lands exactly 100.</p>
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
              Pick {pickIndex + 1} of {draft.picks.length} · the {pick.slot.label}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {pick.choices.map(p => {
                const r = NBA_GAUNTLET_CONFIG.ratingOf(p);
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
                    <span className="block text-[8px] font-bold uppercase tracking-widest text-muted-foreground">{p.pos}</span>
                    <span className="block text-xs font-bold text-foreground leading-tight mt-1">{p.name}</span>
                    <span className="block text-[9px] text-muted-foreground mt-0.5">{p.team} · {p.era}</span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 text-center">
                Your five so far · {squadRatingOf(NBA_GAUNTLET_CONFIG, squad)} OVR
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
              <Swords className="inline w-4 h-4 mr-1" /> The gauntlet · your five rates {run.rating}
            </p>
            {run.matches.slice(0, shownMatches).map((m, i) => (
              <div key={i} className={cn('rounded-xl border p-3 text-center animate-fade-in', m.won ? 'border-correct/50 bg-correct/10' : 'border-destructive/50 bg-destructive/10')}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{m.round.name} · they rate {m.round.rating}</p>
                <p className="text-lg font-black text-foreground">{m.yourGoals} - {m.theirGoals} <span className="text-sm font-semibold text-muted-foreground">v {m.round.opp}</span></p>
                {m.wonOnPens !== null && <p className="text-xs text-muted-foreground">{m.wonOnPens ? 'Won in a shootout' : 'Lost in a shootout'}</p>}
              </div>
            ))}
          </div>
        )}

        {isDone && run && (
          <ResultScreen
            won={run.champion}
            outcomeEmoji={run.champion ? '🏆' : run.roundsCleared >= 3 ? '🥈' : '🫠'}
            headline={run.champion ? 'Champions! The gauntlet is run!' : `Out at ${run.matches[run.matches.length - 1]?.round.name ?? 'the start'}`}
            statLine={`${run.roundsCleared} of ${NBA_GAUNTLET_ROUNDS.length} rounds survived with a ${run.rating} rated five`}
            statRow={[{ label: 'Score', value: run.score }]}
            emojiGrid={[`⚔️ Gauntlet Draft NBA: ${run.score} pts`, ...run.matches.map(m => `${m.won ? '🟩' : '🟥'} ${matchLine(m)}`)].join('\n')}
            share={{ score: String(run.score), gameName: 'Gauntlet Draft: NBA', gamePath: '/nba-gauntlet-draft' }}
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
          title="Gauntlet Draft: NBA, Pick Five, Survive Five"
          description="The NBA draft mode: each of the five starting five slots deals five real players from a star to a bargain, you keep one per slot, and the finished five runs a five round knockout against ever stronger invented opposition. One shared daily draft, unlimited redrafts, and a fully deterministic cup run so the draft is the game."
        />
        <GameNav />
      </GameShell>
    </>
  );
}
