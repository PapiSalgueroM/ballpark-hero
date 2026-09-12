import { useCallback, useEffect, useState, useRef } from 'react';
import { Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResultScreen } from '@/components/game/ResultScreen';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET } from '@/lib/dateUtils';
import { markRestoredFinish } from '@/lib/restoredFinish';
import {
  buildDraft, dailySeedFor, displayScore, matchLine, GauntletConfig, GauntletDraftResult,
  GauntletRun, loadDailyRun, runGauntlet, saveDailyRun, squadRatingOf,
} from '@/lib/gauntletEngine';

/**
 * Gauntlet Draft, the one board (Round 538).
 *
 * WHY THIS FILE EXISTS. Round 520 lifted the RULES into src/lib/gauntletEngine.ts
 * and then left two pages, NbaGauntletDraft.tsx and NflGauntletDraft.tsx, that
 * were 230 lines each and 184 lines IDENTICAL. That is the Round 426 mistake
 * CLAUDE.md names, where the same roster refill bug had to be fixed twice
 * because the CFB and CBB engines were two copies of one idea, and adding the
 * MLB board would have made it three copies. Everything that legitimately
 * differs between sports is now a field on GauntletConfig, and the pages are
 * four lines of SEO copy around this component. A player moving from one sport
 * to another finds the same game wearing a different sport, which is the rule.
 *
 * SOCCER IS NOT DRAWN BY THIS YET, on purpose. /gauntlet-draft fetches its pool
 * from the database, so it carries boot and error phases none of the static
 * pool sports need, and it draws a flag on every card. Its config already
 * carries every presentation field so the copy is written; folding it in means
 * teaching this component an async pool source and a card decoration, which is
 * a round of its own rather than a thing to sneak in beside four others.
 */

const COUNT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const countWord = (n: number) => COUNT_WORDS[n] ?? String(n);

type Phase = 'setup' | 'drafting' | 'running' | 'done';
type Mode = 'daily' | 'unlimited';

interface Props<P> {
  config: GauntletConfig<P>;
  /** The ad slot the page carries, kept on the page rather than here. */
  children?: React.ReactNode;
}

export default function GauntletBoard<P>({ config, children }: Props<P>) {
  const todayStr = useRef(getTodayET()).current;
  const [phase, setPhase] = useState<Phase>('setup');
  const [mode, setMode] = useState<Mode>('daily');
  const [draft, setDraft] = useState<GauntletDraftResult<P> | null>(null);
  const [pickIndex, setPickIndex] = useState(0);
  const [squad, setSquad] = useState<(P | null)[]>([]);
  const [run, setRun] = useState<GauntletRun | null>(null);
  const [shownMatches, setShownMatches] = useState(0);

  const slots = config.formations[0].slots.length;
  const noun = config.squadNoun;

  const bandClass = (r: number) =>
    r >= config.tierFloors[0] ? 'from-amber-400/30 to-amber-600/10 border-amber-400/60'
    : r >= config.tierFloors[1] ? 'from-violet-400/25 to-violet-600/10 border-violet-400/50'
    : r >= config.tierFloors[2] ? 'from-sky-400/25 to-sky-600/10 border-sky-400/50'
    : 'from-zinc-400/20 to-zinc-600/10 border-zinc-500/50';

  const start = useCallback((m: Mode) => {
    if (m === 'daily') {
      const saved = loadDailyRun(config, todayStr);
      if (saved) {
        markRestoredFinish(config.gameId);
        setMode('daily');
        setDraft(null);
        setRun(saved);
        setShownMatches(saved.matches.length);
        setPhase('done');
        return;
      }
    }
    const seed = m === 'daily' ? dailySeedFor(config, todayStr) : Math.floor(Math.random() * 2147483645) + 1;
    const d = buildDraft(config, seed);
    setMode(m);
    setDraft(d);
    setPickIndex(0);
    setSquad(new Array<P | null>(d.formation.slots.length).fill(null));
    setRun(null);
    setShownMatches(0);
    setPhase('drafting');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, todayStr]);

  const keep = (p: P) => {
    if (!draft || phase !== 'drafting') return;
    const next = [...squad];
    next[pickIndex] = p;
    setSquad(next);
    if (pickIndex + 1 >= draft.picks.length) {
      const result = runGauntlet(config, next);
      if (mode === 'daily') saveDailyRun(config, todayStr, result);
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
  useGameCompletion(config.gameId, run !== null, run?.score ?? 0, run?.roundsCleared ?? 0);

  const pick = draft && phase === 'drafting' ? draft.picks[pickIndex] : null;
  const dailyDone = phase === 'setup' && loadDailyRun(config, todayStr) !== null;
  const ladderLow = config.rounds[0].rating;
  const ladderHigh = config.rounds[config.rounds.length - 1].rating;

  return (
    <>
      {phase === 'setup' && (
        <div className="space-y-4 max-w-sm mx-auto">
          <div className="rounded-xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground space-y-1.5">
            <p className="font-bold text-foreground">How to play</p>
            <p>For each of the {countWord(slots)} {config.slotsPhrase} you get five real players who fit it, spread from a star to a bargain, and you keep exactly one.</p>
            <p>Then your {noun} runs the gauntlet: five knockout rounds against opposition rated {ladderLow} up to {ladderHigh}. A level game goes to {config.tiebreak.phrase}.</p>
            <p>The run is decided by the {noun} you drafted: the same {noun} always runs the same gauntlet. 16 points a round survived, the trophy lands exactly 100.</p>
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
              const r = config.ratingOf(p);
              return (
                <button
                  key={config.nameOf(p)}
                  onClick={() => keep(p)}
                  className={cn(
                    'rounded-xl border bg-gradient-to-b p-3 text-center transition-transform hover:scale-[1.03] active:scale-[0.98]',
                    bandClass(r),
                  )}
                >
                  <span className="block text-2xl font-black text-foreground">{r}</span>
                  <span className="block text-[8px] font-bold uppercase tracking-widest text-muted-foreground">{config.positionOf(p)}</span>
                  <span className="block text-xs font-bold text-foreground leading-tight mt-1">{config.nameOf(p)}</span>
                  <span className="block text-[9px] text-muted-foreground mt-0.5">{config.subtitleOf(p)}</span>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-border bg-surface-1 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 text-center">
              Your {noun} so far · {squadRatingOf(config, squad)} OVR
            </p>
            <div className="flex flex-wrap gap-1 justify-center">
              {draft.formation.slots.map((slot, i) => (
                <span key={i} className={cn(
                  'px-1.5 py-0.5 rounded text-[9px] font-semibold',
                  squad[i] ? 'bg-correct/15 text-foreground' : i === pickIndex ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 text-muted-foreground',
                )}>
                  {slot.label}{squad[i] ? ` ${config.nameOf(squad[i]!).split(' ').slice(-1)[0]}` : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === 'running' && run && (
        <div className="space-y-3 max-w-sm mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Swords className="inline w-4 h-4 mr-1" /> The gauntlet · your {noun} rates {run.rating}
          </p>
          {run.matches.slice(0, shownMatches).map((m, i) => {
            const s = displayScore(config, m);
            return (
              <div key={i} className={cn('rounded-xl border p-3 text-center animate-fade-in', m.won ? 'border-correct/50 bg-correct/10' : 'border-destructive/50 bg-destructive/10')}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{m.round.name} · they rate {m.round.rating}</p>
                <p className="text-lg font-black text-foreground">{s.mine} - {s.theirs} <span className="text-sm font-semibold text-muted-foreground">v {m.round.opp}</span></p>
                {m.wonOnPens !== null && <p className="text-xs text-muted-foreground">{m.wonOnPens ? config.tiebreak.won : config.tiebreak.lost}</p>}
              </div>
            );
          })}
        </div>
      )}

      {isDone && run && (
        <ResultScreen
          won={run.champion}
          outcomeEmoji={run.champion ? '🏆' : run.roundsCleared >= 3 ? '🥈' : '🫠'}
          headline={run.champion ? 'Champions! The gauntlet is run!' : `Out at ${run.matches[run.matches.length - 1]?.round.name ?? 'the start'}`}
          statLine={`${run.roundsCleared} of ${config.rounds.length} rounds survived with a ${run.rating} rated ${noun}`}
          statRow={[{ label: 'Score', value: run.score }]}
          emojiGrid={[`${config.emoji} ${config.gameName}: ${run.score} pts`, ...run.matches.map(m => `${m.won ? '🟩' : '🟥'} ${matchLine(config, m)}`)].join('\n')}
          share={{ score: String(run.score), gameName: config.gameName, gamePath: config.gamePath }}
          onPlayAgain={() => setPhase('setup')}
          playAgainLabel={mode === 'daily' ? 'Back to modes' : 'New draft'}
          playNext={mode === 'daily' ? <p className="text-sm text-muted-foreground">Come back tomorrow for a new draft.</p> : undefined}
        >
          <div className="text-left text-sm text-muted-foreground space-y-1 my-4 py-3 px-4 rounded-xl bg-surface-2 border border-border/60">
            {run.matches.map((m, i) => <p key={i}>{matchLine(config, m)}</p>)}
          </div>
        </ResultScreen>
      )}

      {children}
    </>
  );
}
