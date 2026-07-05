import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Timer, Flag, Loader2, ListChecks } from 'lucide-react';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import {
  ListPuzzleDef, LIST_PUZZLES, OFFLINE_PUZZLE,
  loadPuzzleAnswers, buildAliasMap, normalize,
  listQuizTier, LIST_QUIZ_TIER_LABEL, LIST_QUIZ_TIER_EMOJI,
} from '@/lib/listQuiz';

type Phase = 'pick' | 'loading' | 'playing' | 'done';

const TIMED_SECONDS = 180;

const ListQuiz = () => {
  const [phase, setPhase] = useState<Phase>('pick');
  const [puzzle, setPuzzle] = useState<ListPuzzleDef | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [found, setFound] = useState<boolean[]>([]);
  const [aliasMap, setAliasMap] = useState<Map<string, number>>(new Map());
  const [input, setInput] = useState('');
  const [flash, setFlash] = useState<'hit' | 'dupe' | 'miss' | null>(null);
  const [timed, setTimed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TIMED_SECONDS);
  const [gaveUp, setGaveUp] = useState(false);
  const [loadFailedId, setLoadFailedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const foundCount = found.filter(Boolean).length;
  const total = answers.length;

  const startPuzzle = useCallback(async (def: ListPuzzleDef, useTimer: boolean) => {
    setPhase('loading');
    setLoadFailedId(null);
    let list = await loadPuzzleAnswers(def);
    let chosen = def;
    if (!list && def.id !== OFFLINE_PUZZLE.id) {
      // Database unreachable: offer the built-in list so the page still plays
      list = await loadPuzzleAnswers(OFFLINE_PUZZLE);
      chosen = OFFLINE_PUZZLE;
      if (list) setLoadFailedId(def.id);
    }
    if (!list) {
      setLoadFailedId(def.id);
      setPhase('pick');
      return;
    }
    setPuzzle(chosen);
    setAnswers(list);
    setFound(new Array(list.length).fill(false));
    setAliasMap(buildAliasMap(list));
    setInput('');
    setGaveUp(false);
    setTimed(useTimer);
    setSecondsLeft(TIMED_SECONDS);
    setPhase('playing');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // countdown
  useEffect(() => {
    if (phase !== 'playing' || !timed) return;
    if (secondsLeft <= 0) {
      setPhase('done');
      return;
    }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timed, secondsLeft]);

  // all found
  useEffect(() => {
    if (phase === 'playing' && total > 0 && foundCount === total) setPhase('done');
  }, [phase, foundCount, total]);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  const setFlashFor = (f: 'hit' | 'dupe' | 'miss') => {
    setFlash(f);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 700);
  };

  const submit = () => {
    const guess = normalize(input);
    if (!guess || guess.length < 3) return;
    const idx = aliasMap.get(guess);
    if (idx == null) {
      setFlashFor('miss');
      return;
    }
    if (found[idx]) {
      setFlashFor('dupe');
      setInput('');
      return;
    }
    setFound(prev => prev.map((f, i) => (i === idx ? true : f)));
    setInput('');
    setFlashFor('hit');
  };

  const giveUp = () => {
    setGaveUp(true);
    setPhase('done');
  };

  const backToPicker = () => {
    setPhase('pick');
    setPuzzle(null);
  };

  const pct = total > 0 ? Math.round((foundCount / total) * 100) : 0;
  const tier = listQuizTier(pct);
  const tierLine = tier ? `${LIST_QUIZ_TIER_EMOJI[tier]} ${LIST_QUIZ_TIER_LABEL[tier]}` : null;
  const emojiGrid = puzzle
    ? `${puzzle.emoji} ${puzzle.title}\n📝 ${foundCount}/${total} (${pct}%)${tierLine ? ` ${tierLine}` : ''}${timed ? ' ⏱️' : ''}`
    : '';

  const sports = useMemo(() => {
    const order: string[] = [];
    for (const p of LIST_PUZZLES) if (!order.includes(p.sport)) order.push(p.sport);
    return order;
  }, []);

  const fmtClock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <>
      <PageSeo
        title="List Quiz: Name Them All | DoUKnowBall"
        description="How many can you name? Champions, MVPs, and legends across NFL, NBA, MLB, NHL, soccer, F1 and more. Free list quizzes with no sign-up."
        path="/list-quiz"
      />
      <GameShell
        width="wide"
        title="NAME THEM ALL"
        subtitle="Pick a list and start typing. Surnames and team nicknames count, spelling slips are forgiven."
      >
        {phase === 'pick' && (
          <>
            <div className="space-y-6 max-w-2xl mx-auto">
              {sports.map(sport => (
                <div key={sport}>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">{sport}</h2>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {LIST_PUZZLES.filter(p => p.sport === sport).map(p => (
                      <div
                        key={p.id}
                        className="bg-card border border-border rounded-xl p-4 hover:border-primary transition-colors"
                      >
                        <div className="font-semibold text-foreground mb-0.5">{p.emoji} {p.title}</div>
                        <div className="text-xs text-muted-foreground mb-3">{p.blurb}</div>
                        {loadFailedId === p.id && (
                          <div className="text-xs text-destructive mb-2">Couldn't load this list right now.</div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => startPuzzle(p, false)}
                            className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                          >
                            Relaxed
                          </button>
                          <button
                            onClick={() => startPuzzle(p, true)}
                            className="flex-1 px-3 py-1.5 bg-secondary text-foreground rounded-lg text-sm font-semibold hover:bg-secondary/70 transition-colors inline-flex items-center justify-center gap-1"
                          >
                            <Timer className="w-3.5 h-3.5" /> 3:00
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {phase === 'loading' && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {(phase === 'playing' || phase === 'done') && puzzle && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-2xl p-5 md:p-6 mb-4">
              <div className="flex items-center justify-between gap-3 mb-1">
                <h2 className="font-bold text-foreground">{puzzle.emoji} {puzzle.title}</h2>
                {timed && phase === 'playing' && (
                  <span className={cn(
                    'font-mono font-bold text-lg',
                    secondsLeft <= 30 ? 'text-destructive' : 'text-primary'
                  )}>
                    {fmtClock(secondsLeft)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-4">{puzzle.blurb}</p>

              <div className="w-full bg-secondary/50 rounded-full h-2.5 mb-1">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mb-4">
                <span className="text-primary font-semibold">{foundCount}</span> of {total} found
              </div>

              {phase === 'playing' && (
                <>
                  <form
                    onSubmit={e => { e.preventDefault(); submit(); }}
                    className="flex gap-2"
                  >
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder="Type a name…"
                      autoCapitalize="words"
                      autoComplete="off"
                      autoCorrect="off"
                      className={cn(
                        'flex-1 px-4 py-3 rounded-xl bg-background border text-foreground text-center font-semibold outline-none transition-colors',
                        flash === 'hit' && 'border-correct ring-1 ring-correct',
                        flash === 'miss' && 'border-destructive ring-1 ring-destructive',
                        flash === 'dupe' && 'border-yellow-500 ring-1 ring-yellow-500',
                        !flash && 'border-border focus:border-primary'
                      )}
                    />
                    <button
                      type="submit"
                      className="px-5 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity"
                    >
                      Guess
                    </button>
                  </form>
                  <div className="min-h-[20px] text-center text-xs mt-2">
                    {flash === 'dupe' && <span className="text-yellow-500 font-semibold">Already found that one</span>}
                    {flash === 'miss' && <span className="text-destructive font-semibold">Not on the list (or needs the full name)</span>}
                  </div>
                  <div className="flex justify-center mt-2">
                    <button
                      onClick={giveUp}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Flag className="w-3.5 h-3.5" /> Give up and reveal
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-6">
              {answers.map((a, i) => {
                const show = found[i] || phase === 'done';
                return (
                  <div
                    key={i}
                    className={cn(
                      'px-2 py-1.5 rounded-md text-xs sm:text-sm text-center font-medium border truncate',
                      found[i]
                        ? 'bg-correct/15 border-correct/40 text-foreground'
                        : phase === 'done'
                        ? 'bg-destructive/10 border-destructive/30 text-muted-foreground'
                        : 'bg-secondary/40 border-border text-muted-foreground/30'
                    )}
                    title={show ? a : undefined}
                  >
                    {show ? a : '· · ·'}
                  </div>
                );
              })}
            </div>

            {phase === 'done' && (
              <div className="mb-6">
                <ResultScreen
                  won={tier ? true : pct > 0 ? undefined : false}
                  outcomeEmoji={tier === 'gold' ? '🏆' : tier === 'silver' ? '🎉' : tier === 'bronze' ? '👏' : '📚'}
                  headline={tier ? `${LIST_QUIZ_TIER_EMOJI[tier]} ${LIST_QUIZ_TIER_LABEL[tier]}: ${foundCount} of ${total} (${pct}%)` : `You named ${foundCount} of ${total} (${pct}%)`}
                  statLine={
                    tier === 'gold'
                      ? 'Every single one. Take a bow.'
                      : tier === 'silver'
                      ? 'Silver tier. That is a strong list, just a few short of perfect.'
                      : tier === 'bronze'
                      ? 'Bronze tier. Solid recall, come back and push for Silver.'
                      : gaveUp
                      ? 'The ones you missed are shown above. Every list gets easier with practice.'
                      : timed && secondsLeft <= 0
                      ? 'Time! The rest are shown above. Every list gets easier with practice.'
                      : 'The full list is shown above. Every list gets easier with practice.'
                  }
                  emojiGrid={emojiGrid}
                  share={{
                    score: tier ? `${foundCount}/${total} (${LIST_QUIZ_TIER_LABEL[tier]})` : `${foundCount}/${total}`,
                    gameName: 'Name Them All',
                    gamePath: '/list-quiz',
                  }}
                  onPlayAgain={() => puzzle && startPuzzle(puzzle, timed)}
                  playAgainLabel="Retry"
                  playNext={
                    <button
                      onClick={backToPicker}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-secondary text-foreground rounded-full font-semibold hover:bg-secondary/70 transition-colors"
                    >
                      <ListChecks className="w-4 h-4" /> More lists
                    </button>
                  }
                />
              </div>
            )}
          </div>
        )}

        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="list-quiz" />
        </div>

        <GameSeoContent
          title="Name Them All: Sports List Quizzes"
          description="Sporcle-style recall quizzes built on real records: champions, MVPs and title winners across ten sports. Play relaxed or race a three minute clock."
          howToPlay={[
            'Pick a list, like every Super Bowl MVP or every F1 world champion.',
            'Type names into the box. Surnames and team nicknames are accepted when they are unique.',
            'Fill in as many blanks as you can, in relaxed mode or against the clock.',
            'Give up any time to reveal what you missed, then share your score.',
          ]}
          examples={[
            'Typing "packers" counts for the Green Bay Packers.',
            'If two champions share a surname, spell out the full name.',
          ]}
        />
        <GameNav />
      </GameShell>
    </>
  );
};

export default ListQuiz;
