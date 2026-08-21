import { useState } from 'react';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import ShareButtons from '@/components/game/ShareButtons';
import { Button } from '@/components/ui/button';
import { Bomb, CalendarDays, Heart, Infinity as InfinityIcon, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  buildRun, daySeed, maxRunScore,
  CLEAR_BONUS, LIVES_PER_ROUND, POINTS_PER_FIND, ROUNDS_PER_RUN,
  type MinefieldRound,
} from '@/lib/minefield';

type GameMode = 'daily' | 'unlimited';
type Phase = 'intro' | 'playing' | 'roundEnd' | 'done';

const Minefield = () => {
  const [gameMode, setGameMode] = useState<GameMode>('daily');
  const [phase, setPhase] = useState<Phase>('intro');
  const [rounds, setRounds] = useState<MinefieldRound[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [lives, setLives] = useState(LIVES_PER_ROUND);
  const [score, setScore] = useState(0);
  const [roundsWon, setRoundsWon] = useState(0);
  const [lastMine, setLastMine] = useState<string | null>(null);
  const [roundWon, setRoundWon] = useState(false);
  const [revealDone, setRevealDone] = useState(false);

  // Daily completion fires once the whole 3-board run is finished.
  useGameCompletion('minefield', phase === 'done' && gameMode === 'daily', score, roundsWon);

  const round: MinefieldRound | undefined = rounds[roundIdx];
  const totalCorrect = round ? round.tiles.filter(t => !t.isMine).length : 0;
  const mineCount = round ? round.tiles.length - totalCorrect : 0;
  const foundCount = round ? picked.filter(i => !round.tiles[i].isMine).length : 0;
  const maxScore = rounds.length > 0 ? maxRunScore(rounds) : 0;

  const start = (gm: GameMode) => {
    setGameMode(gm);
    setRounds(buildRun(gm === 'daily' ? daySeed() : undefined));
    setRoundIdx(0);
    setPicked([]);
    setLives(LIVES_PER_ROUND);
    setScore(0);
    setRoundsWon(0);
    setLastMine(null);
    setRoundWon(false);
    setRevealDone(false);
    setPhase('playing');
  };

  const finishRound = (won: boolean, tileCount: number) => {
    setRoundWon(won);
    if (won) {
      setRoundsWon(n => n + 1);
      setScore(s => s + CLEAR_BONUS);
    }
    setPhase('roundEnd');
    setRevealDone(false);
    window.setTimeout(() => setRevealDone(true), tileCount * 70 + 600);
  };

  const clickTile = (i: number) => {
    if (phase !== 'playing' || !round || picked.includes(i)) return;
    const tile = round.tiles[i];
    const nextPicked = [...picked, i];
    setPicked(nextPicked);
    if (tile.isMine) {
      setLastMine(tile.name);
      const nextLives = lives - 1;
      setLives(nextLives);
      if (nextLives <= 0) finishRound(false, round.tiles.length);
    } else {
      setScore(s => s + POINTS_PER_FIND);
      const allFound = round.tiles.every((t, j) => t.isMine || nextPicked.includes(j));
      if (allFound) finishRound(true, round.tiles.length);
    }
  };

  const nextBoard = () => {
    if (roundIdx + 1 >= rounds.length) {
      setPhase('done');
      return;
    }
    setRoundIdx(roundIdx + 1);
    setPicked([]);
    setLives(LIVES_PER_ROUND);
    setLastMine(null);
    setRoundWon(false);
    setRevealDone(false);
    setPhase('playing');
  };

  return (
    <>
      <PageSeo
        title="Minefield - Dodge the Fakes | DoUKnowBall"
        description="A category, a board of names. Click everyone who truly belongs - but a few tiles are mines that don't belong at all. Two lives per board, three boards per run, new daily challenge every day."
        path="/minefield"
      />
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, hsl(222 35% 8%) 0%, hsl(0 35% 8%) 60%, hsl(222 30% 6%) 100%)' }}>
        <GameNavbar />
        <main id="dukb-main" className="flex-1 flex flex-col items-center px-4 py-6 sm:py-10">
          <div className="w-full max-w-3xl mx-auto space-y-5 text-center">

            {phase === 'intro' && (
              <>
                <div className="flex items-center justify-center text-primary">
                  <Bomb className="w-10 h-10 sm:w-14 sm:h-14" />
                </div>
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
                  Mine<span className="text-primary">field</span>
                </h1>
                <p className="text-base sm:text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
                  One category, a board of names. Click <b>everyone who belongs</b>,
                  but a few tiles are mines that don't belong at all.
                  {' '}{LIVES_PER_ROUND} lives per board, {ROUNDS_PER_RUN} boards per run.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button size="lg" className="text-lg px-8 py-6 font-bold" onClick={() => start('daily')}>
                    <CalendarDays className="w-5 h-5 mr-2" /> Daily Boards
                  </Button>
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6 font-bold" onClick={() => start('unlimited')}>
                    <InfinityIcon className="w-5 h-5 mr-2" /> Unlimited
                  </Button>
                </div>
              </>
            )}

            {(phase === 'playing' || phase === 'roundEnd') && round && (
              <>
                <div className="inline-flex flex-col items-center gap-1 px-5 py-3 rounded-2xl bg-card/70 border border-border max-w-xl">
                  <span className="text-sm sm:text-base font-extrabold text-foreground">{round.category.title}</span>
                  <span className="text-[11px] sm:text-xs text-muted-foreground">{round.category.hint}</span>
                </div>

                {/* status row */}
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs sm:text-sm font-semibold text-muted-foreground">
                  <span>Board {roundIdx + 1}/{ROUNDS_PER_RUN}</span>
                  <span className="flex items-center gap-1">
                    {Array.from({ length: LIVES_PER_ROUND }).map((_, i) => (
                      <Heart key={i} className={cn('w-4 h-4 sm:w-5 sm:h-5', i < lives ? 'text-red-400 fill-red-400' : 'text-muted-foreground/30')} />
                    ))}
                  </span>
                  <span>{foundCount}/{totalCorrect} found</span>
                  <span>💣 {mineCount} mines hidden</span>
                  <span className="text-primary font-bold">{score} pts</span>
                </div>

                {phase === 'playing' && lastMine && (
                  <div className="text-sm font-bold text-red-300 animate-in fade-in slide-in-from-top-1">
                    💥 {lastMine} was a mine, {lives} {lives === 1 ? 'life' : 'lives'} left!
                  </div>
                )}

                {/* the board */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {round.tiles.map((tile, i) => {
                    const isPicked = picked.includes(i);
                    const revealed = phase === 'roundEnd' && !isPicked;
                    return (
                      <button
                        key={`${roundIdx}-${i}`}
                        disabled={phase !== 'playing' || isPicked}
                        onClick={() => clickTile(i)}
                        style={revealed ? { animationDelay: `${i * 70}ms`, animationFillMode: 'backwards' } : undefined}
                        className={cn(
                          'rounded-xl border px-2 py-3 sm:py-4 min-h-[3.25rem] text-xs sm:text-sm font-bold leading-snug break-words transition-all',
                          phase === 'playing' && !isPicked && 'border-border bg-card/70 text-foreground hover:border-primary/60 hover:bg-primary/10 cursor-pointer',
                          isPicked && !tile.isMine && 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300',
                          isPicked && tile.isMine && 'border-red-500/70 bg-red-500/20 text-red-300 animate-in zoom-in-50',
                          revealed && !tile.isMine && 'animate-in fade-in zoom-in-95 border-emerald-500/30 bg-emerald-500/5 text-emerald-200/70',
                          revealed && tile.isMine && 'animate-in fade-in zoom-in-95 border-red-500/40 bg-red-500/10 text-red-300/80',
                        )}
                      >
                        {isPicked && tile.isMine && '💥 '}
                        {revealed && tile.isMine && '💣 '}
                        {tile.name}
                        {isPicked && !tile.isMine && ' ✓'}
                      </button>
                    );
                  })}
                </div>

                {/* round-end panel */}
                {phase === 'roundEnd' && revealDone && (
                  <div className="rounded-2xl border border-primary/40 bg-card/80 p-5 max-w-sm mx-auto space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    {roundWon ? (
                      <p className="text-xl font-black text-emerald-300">Board cleared! +{CLEAR_BONUS} bonus 🎉</p>
                    ) : (
                      <p className="text-xl font-black text-red-300">💥 BOOM. Out of lives</p>
                    )}
                    <p className="text-sm text-muted-foreground font-semibold">
                      {foundCount}/{totalCorrect} found · the full board is revealed above
                    </p>
                    <Button size="lg" className="w-full font-bold" onClick={nextBoard}>
                      {roundIdx + 1 < rounds.length ? 'Next board →' : 'See final score'}
                    </Button>
                  </div>
                )}
              </>
            )}

            {phase === 'done' && (
              <div className="rounded-2xl border border-primary/40 bg-card/80 p-6 max-w-sm mx-auto space-y-3 animate-in fade-in zoom-in-95">
                <Bomb className="w-8 h-8 text-primary mx-auto" />
                <p className="text-4xl font-black text-primary">{score} pts</p>
                <p className="text-sm text-muted-foreground font-semibold">
                  {roundsWon}/{ROUNDS_PER_RUN} boards cleared · max was {maxScore}
                  {roundsWon === ROUNDS_PER_RUN ? ' · FLAWLESS SWEEP 🔥' : ''}
                </p>
                <ShareButtons
                  gameName="Minefield"
                  gamePath="/minefield"
                  score={`${score} pts (${roundsWon}/${ROUNDS_PER_RUN} boards)`}
                  customText={`💣 Minefield: ${score} pts, ${roundsWon}/${ROUNDS_PER_RUN} boards cleared without blowing up. Dodge the fakes at douknowball.com/minefield`}
                />
                <Button size="lg" variant="outline" className="w-full font-bold" onClick={() => start('unlimited')}>
                  <RotateCcw className="w-4 h-4 mr-2" /> {gameMode === 'daily' ? 'Keep going (unlimited)' : 'New boards'}
                </Button>
              </div>
            )}
          </div>
        </main>

        <GameSeoContent
          pageHasOwnH1
          title="Minefield: Click Everyone Who Belongs | DoUKnowBall"
          description="The minefield quiz: every board shows a sports category and a wall of names. Most really belong - Ballon d'Or winners, Super Bowl champions, the 3,000-hit club - but the mines hiding among them explode on contact. Clear three boards with two lives each, daily and unlimited."
          howToPlay={[
            'Read the category, then click every tile you believe truly belongs to it.',
            `Correct picks turn green (+${POINTS_PER_FIND} pts). Mines explode and cost a life - ${LIVES_PER_ROUND} lives per board.`,
            `Find all correct tiles to clear the board for a +${CLEAR_BONUS} bonus. ${ROUNDS_PER_RUN} boards per run, and the daily run is the same for everyone.`,
          ]}
          examples={[
            'Premier League champions: Blackburn yes... but is Newcastle a trap?',
            "Champions League winners: Aston Villa looks like a mine. It isn't (1982).",
            'MLB 500-home-run club: Lou Gehrig stopped at 493. Boom.',
            'Clear all three boards without a scratch for the flawless sweep',
          ]}
        />
      </div>
    </>
  );
};

export default Minefield;
