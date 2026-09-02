import { useState, useMemo, useCallback } from 'react';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { RulesGate } from '@/components/game/RulesGate';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { golfLegends, guessableGolfers, type GolfLegend } from '@/data/golfLegends';
import { foldSpecialLatin } from '@/lib/nameFold';
import { cn } from '@/lib/utils';

/**
 * Guess The Golfer - second game in the Golf tab (owner 2026-08-05). A major
 * champion hides behind six clues that unlock one at a time. Same clue-game
 * conventions as Guess The F1 Driver / Tennis Player: daily plus unlimited,
 * fewer clues means more points.
 */

const MAX_GUESSES = 6;
const BASE_SCORE = 600;
const CLUE_COST = 100;

type Phase = 'playing' | 'won' | 'lost';
type GuessAction = { t: 'guess'; name: string } | { t: 'won' } | { t: 'give' };

function norm(s: string): string {
  return foldSpecialLatin(
    (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(),
  );
}

function clueList(g: GolfLegend): string[] {
  const initials = g.name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase())
    .filter(Boolean)
    .join('.');
  return [
    `Won majors between ${g.firstWin} and ${g.lastWin}`,
    `Nationality: ${g.nationality}`,
    `Career majors: ${g.majors}`,
    `Has won: ${g.tournaments.join(', ')}`,
    `Initials: ${initials}.`,
    `First name: ${g.name.split(' ')[0]}`,
  ];
}

const GuessTheGolfer = () => {
  const [mode, setMode] = useState<'daily' | 'unlimited'>('daily');

  // ---- Daily ----------------------------------------------------------------
  const {
    puzzle: dailyGolfer,
    guesses: dailyActions,
    addGuess: addDailyAction,
  } = useDailyPuzzle<GolfLegend, GuessAction>({
    gameSlug: 'guess-the-golfer',
    puzzles: guessableGolfers,
    getPuzzleId: (g) => g.name,
    maxGuesses: 999,
    isWon: (a) => a.some((x) => x.t === 'won'),
    isLost: (a) => a.some((x) => x.t === 'give') || a.filter((x) => x.t === 'guess').length >= MAX_GUESSES,
    deserializeGuesses: (raw) => raw as GuessAction[],
  });

  const dailyWrong = useMemo(
    () => dailyActions.filter((a): a is { t: 'guess'; name: string } => a.t === 'guess').map((a) => a.name),
    [dailyActions],
  );
  const dailyWon = dailyActions.some((a) => a.t === 'won');
  const dailyPhase: Phase = dailyWon ? 'won' : dailyWrong.length >= MAX_GUESSES ? 'lost' : 'playing';

  // ---- Unlimited ------------------------------------------------------------
  const [unIndex, setUnIndex] = useState(() => Math.floor(Math.random() * guessableGolfers.length));
  const [unWrong, setUnWrong] = useState<string[]>([]);
  const [unPhase, setUnPhase] = useState<Phase>('playing');
  const unGolfer = guessableGolfers[unIndex % guessableGolfers.length];

  const golfer = mode === 'daily' ? dailyGolfer : unGolfer;
  const wrongGuesses = mode === 'daily' ? dailyWrong : unWrong;
  const phase: Phase = mode === 'daily' ? dailyPhase : unPhase;

  const cluesShown = Math.min(1 + wrongGuesses.length, MAX_GUESSES);
  const score = phase === 'won' ? Math.max(CLUE_COST, BASE_SCORE - (cluesShown - 1) * CLUE_COST) : 0;

  useGameCompletion('guess-the-golfer', mode === 'daily' && dailyPhase !== 'playing', dailyPhase === 'won' ? score : 0, dailyPhase === 'won' ? 1 : 0);

  // ---- Input + suggestions --------------------------------------------------
  const [input, setInput] = useState('');
  const suggestions = useMemo(() => {
    const q = norm(input);
    if (q.length < 2) return [];
    return golfLegends
      .filter((g) => norm(g.name).includes(q) && !wrongGuesses.includes(g.name))
      .slice(0, 6);
  }, [input, wrongGuesses]);

  const submitGuess = useCallback(
    (name: string) => {
      if (!golfer || phase !== 'playing') return;
      setInput('');
      if (norm(name) === norm(golfer.name)) {
        if (mode === 'daily') addDailyAction({ t: 'won' });
        else setUnPhase('won');
        return;
      }
      if (mode === 'daily') addDailyAction({ t: 'guess', name });
      else {
        const next = [...unWrong, name];
        setUnWrong(next);
        if (next.length >= MAX_GUESSES) setUnPhase('lost');
      }
    },
    [golfer, phase, mode, addDailyAction, unWrong],
  );

  const nextUnlimited = useCallback(() => {
    setUnIndex((i) => (i + 1 + Math.floor(Math.random() * (guessableGolfers.length - 1))) % guessableGolfers.length);
    setUnWrong([]);
    setUnPhase('playing');
    setInput('');
  }, []);

  const clues = golfer ? clueList(golfer) : [];

  return (
    <>
      <PageSeo
        title="Guess The Golfer - Daily Golf Trivia | DoUKnowBall"
        description="A mystery major champion hides behind six clues. Nail the golfer in as few clues as you can. New puzzle every day plus unlimited mode."
        path="/guess-the-golfer"
      />
      <GameShell help="none"
        width="narrow"
        title="⛳ GUESS THE GOLFER"
        subtitle="A major champion is hiding. Fewer clues, more points."
        headerExtra={
          <div className="relative">
            <div className="flex items-center justify-center gap-2 mt-3">
              <button
                onClick={() => setMode('daily')}
                className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all',
                  mode === 'daily' ? 'bg-primary text-primary-foreground border-primary/40' : 'bg-secondary text-muted-foreground border-border')}
              >Daily</button>
              <button
                onClick={() => setMode('unlimited')}
                className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all',
                  mode === 'unlimited' ? 'bg-primary text-primary-foreground border-primary/40' : 'bg-secondary text-muted-foreground border-border')}
              >Unlimited</button>
            </div>
            <RulesGate title="How to Play Guess The Golfer">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>A real major champion is hidden. You start with one clue: the years they were winning majors.</p>
                <p>Every wrong guess unlocks the next clue: nationality, career major count, which majors they won, initials, then their first name.</p>
                <p>Six wrong guesses and the round is over. The fewer clues you need, the higher your score (600 max, minus 100 per extra clue).</p>
                <p>Example: "Won majors between 1997 and 2019, United States, 15 majors" - that one's Tiger.</p>
              </div>
            </RulesGate>
          </div>
        }
      >
        {golfer && phase === 'playing' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {clues.slice(0, cluesShown).map((clue, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <span className="text-[10px] font-bold text-primary shrink-0">CLUE {i + 1}</span>
                  <span className="text-sm text-foreground">{clue}</span>
                </div>
              ))}
              {cluesShown < MAX_GUESSES && (
                <p className="text-[11px] text-muted-foreground text-center">
                  {MAX_GUESSES - cluesShown} more {MAX_GUESSES - cluesShown === 1 ? 'clue' : 'clues'} locked. Wrong guesses unlock them.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && suggestions.length > 0) submitGuess(suggestions[0].name);
                }}
                placeholder="Type a golfer's name..."
                aria-label="Guess the golfer"
                className="w-full px-4 py-3 rounded-xl bg-secondary/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {suggestions.length > 0 && (
                <div className="rounded-xl border border-border bg-card divide-y divide-border/50 overflow-hidden">
                  {suggestions.map((g) => (
                    <button
                      key={g.name}
                      onClick={() => submitGuess(g.name)}
                      className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-secondary/40 transition-colors"
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {wrongGuesses.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {wrongGuesses.map((w) => (
                  <span key={w} className="text-xs px-2.5 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/30 line-through">
                    {w}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {golfer && phase !== 'playing' && (
          <ResultScreen
            won={phase === 'won'}
            outcomeEmoji={phase === 'won' ? '🏆' : '⛳'}
            headline={phase === 'won' ? `It was ${golfer.name}!` : `It was ${golfer.name}`}
            statLine={
              phase === 'won'
                ? <span className="text-2xl font-display font-bold text-primary">{score} pts</span>
                : <span className="text-sm text-muted-foreground">{golfer.majors} majors, {golfer.firstWin}-{golfer.lastWin}</span>
            }
            funFact={`${golfer.nationality} · won the ${golfer.tournaments.join(', ')}`}
            emojiGrid={phase === 'won' ? `⛳ got it in ${cluesShown} ${cluesShown === 1 ? 'clue' : 'clues'}` : '⛳ stumped today'}
            share={{
              score: phase === 'won' ? `${score} pts in ${cluesShown} clues` : 'stumped',
              gameName: 'Guess The Golfer',
              gamePath: '/guess-the-golfer',
            }}
            onPlayAgain={mode === 'unlimited' ? nextUnlimited : undefined}
            playAgainLabel="Next Golfer"
            playNext={mode === 'daily' ? <p className="text-sm text-muted-foreground">New golfer tomorrow. Try Unlimited for more right now.</p> : undefined}
          />
        )}

        <GameSeoContent
          pageHasOwnH1
          title="Guess The Golfer | DoUKnowBall"
          description="Six clues stand between you and a mystery major champion: era, nationality, major count, which majors, initials, first name. How few do you need?"
          howToPlay={[
            'One clue shows at the start: the years they were winning majors',
            'Each wrong guess unlocks the next clue',
            'Six wrong guesses ends the round',
            'Score starts at 600 and drops 100 per extra clue you need',
            'Daily puzzle is the same for everyone; Unlimited deals fresh golfers',
          ]}
          examples={[
            'Won majors 2011 to 2026, Northern Ireland: McIlroy before clue three',
            'South Africa with 9 majors is Gary Player',
            '11 majors but never the Masters: Walter Hagen',
          ]}
        />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="guess-the-golfer" gameContext={{ mode }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default GuessTheGolfer;
