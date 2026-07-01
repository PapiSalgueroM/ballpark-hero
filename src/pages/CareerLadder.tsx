import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Loader2, Lock, RotateCcw } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import {
  CareerPlayer,
  CareerStint,
  MAX_GUESSES,
  MIN_STINTS,
  REVEAL_PENALTY,
  WRONG_GUESS_PENALTY,
  careerScore,
  fetchCareerPool,
  flagForNationality,
  fmtMarketValue,
  normalizeName,
} from '@/lib/careerLadder';

type Phase = 'boot' | 'error' | 'playing' | 'won' | 'lost';

function stintStats(s: CareerStint): string {
  const bits: string[] = [];
  if (s.appearances != null) bits.push(`${s.appearances} apps`);
  if (s.goals != null) bits.push(`${s.goals} G`);
  if (s.assists != null) bits.push(`${s.assists} A`);
  return bits.join(' · ');
}

const CareerLadder = () => {
  // Every hook sits above any conditional rendering. This component has no
  // early returns at all, so the hook count can never change between renders
  // (the React error #310 trap that bit TransferPathBoard).
  const [phase, setPhase] = useState<Phase>('boot');
  const [pool, setPool] = useState<CareerPlayer[]>([]);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [player, setPlayer] = useState<CareerPlayer | null>(null);
  const [revealed, setRevealed] = useState(1);
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [finalScore, setFinalScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  const startRound = useCallback((available: CareerPlayer[], used: string[]) => {
    const eligible = available.filter(p => p.seasons.length >= MIN_STINTS);
    if (eligible.length === 0) {
      setPhase('error');
      return;
    }
    let fresh = eligible.filter(p => !used.includes(p.id));
    let carriedUsed = used;
    if (fresh.length === 0) {
      // Pool exhausted: start excluding repeats from scratch.
      fresh = eligible;
      carriedUsed = [];
    }
    const pick = fresh[Math.floor(Math.random() * fresh.length)];
    setUsedIds([...carriedUsed, pick.id]);
    setPlayer(pick);
    setRevealed(1);
    setWrongGuesses([]);
    setInput('');
    setFinalScore(0);
    setPhase('playing');
  }, []);

  const boot = useCallback(async () => {
    setPhase('boot');
    const data = await fetchCareerPool();
    if (!data || data.filter(p => p.seasons.length >= MIN_STINTS).length < 10) {
      setPhase('error');
      return;
    }
    setPool(data);
    startRound(data, []);
  }, [startRound]);

  useEffect(() => { boot(); }, [boot]);

  const allNames = useMemo(() => pool.map(p => p.name), [pool]);

  const ended = phase === 'won' || phase === 'lost';
  const total = player ? player.seasons.length : 0;
  const shown = player ? (ended ? total : Math.min(revealed, total)) : 0;
  const visibleStints = player ? player.seasons.slice(0, shown) : [];
  const hiddenCount = total - shown;
  const flagUnlocked = player !== null && revealed * 2 >= total;
  const guessesLeft = MAX_GUESSES - wrongGuesses.length;
  const potential = careerScore(Math.max(1, Math.min(revealed, total)), wrongGuesses.length);

  const query = normalizeName(input);
  const wrongNorms = wrongGuesses.map(normalizeName);
  const suggestions =
    phase === 'playing' && query.length >= 2
      ? allNames
          .filter(n => {
            const norm = normalizeName(n);
            return norm.includes(query) && !wrongNorms.includes(norm);
          })
          .slice(0, 8)
      : [];

  const handleGuess = (name: string) => {
    if (phase !== 'playing' || !player) return;
    setInput('');
    const norm = normalizeName(name);
    if (wrongNorms.includes(norm)) return;
    if (norm === normalizeName(player.name)) {
      const score = careerScore(Math.min(revealed, total), wrongGuesses.length);
      setFinalScore(score);
      setBestScore(b => Math.max(b, score));
      setPhase('won');
      return;
    }
    const nextWrong = [...wrongGuesses, name];
    setWrongGuesses(nextWrong);
    if (nextWrong.length >= MAX_GUESSES) {
      setPhase('lost');
    } else {
      setRevealed(r => Math.min(total, r + 1));
    }
  };

  // Only a suggestion pick or an exact full-name match can ever submit, so an
  // invalid guess is impossible.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.length < 2) return;
    const exact = allNames.find(n => normalizeName(n) === query);
    if (exact) handleGuess(exact);
  };

  const revealNext = () => {
    if (phase !== 'playing' || revealed >= total) return;
    setRevealed(r => Math.min(total, r + 1));
  };

  const cluesUsed = Math.max(1, Math.min(revealed, total));
  const emojiGrid =
    phase === 'won'
      ? `🪜 got it in ${cluesUsed} ${cluesUsed === 1 ? 'clue' : 'clues'} · ${finalScore} pts`
      : `🪜 stumped after ${MAX_GUESSES} guesses`;

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="Career Ladder: Guess the Footballer | DoUKnowBall"
        description="A mystery footballer's career appears one stint at a time. Name the player within 6 guesses. Fewer clues means more points. Free and unlimited."
        path="/career-ladder"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-[0.08em] text-primary font-display mb-1">
            CAREER LADDER
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            One career, revealed stint by stint. Name the player before the ladder runs out.
          </p>
          {bestScore > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Session best <span className="text-primary font-bold">{bestScore} pts</span>
            </p>
          )}
        </header>

        {phase === 'boot' && (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load the career data right now.</p>
            <button onClick={boot} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold">
              Try again
            </button>
          </div>
        )}

        {(phase === 'playing' || ended) && player && (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span>
                Stints <span className="text-primary font-bold">{shown}</span> / {total}
              </span>
              {phase === 'playing' && (
                <span>
                  Worth <span className="text-primary font-bold">{potential} pts</span>
                </span>
              )}
              <span>
                Guesses left{' '}
                <span className={cn('font-bold', guessesLeft <= 2 ? 'text-destructive' : 'text-primary')}>
                  {guessesLeft}
                </span>
              </span>
            </div>

            <div className="space-y-2 mb-4">
              {visibleStints.map((s, i) => (
                <div
                  key={`${s.sortOrder}-${i}`}
                  className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
                >
                  <span className="text-[10px] font-bold text-primary w-6 shrink-0">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground text-sm truncate">{s.club}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {s.season}
                      {stintStats(s) ? ` · ${stintStats(s)}` : ''}
                    </div>
                  </div>
                  {fmtMarketValue(s.marketValue) !== '' && (
                    <span className="text-xs font-bold text-primary shrink-0">{fmtMarketValue(s.marketValue)}</span>
                  )}
                </div>
              ))}
              {hiddenCount > 0 && (
                <div className="flex items-center justify-center gap-2 border border-dashed border-border rounded-xl px-4 py-3 text-xs text-muted-foreground">
                  <Lock className="w-3.5 h-3.5" />
                  {hiddenCount} more {hiddenCount === 1 ? 'stint' : 'stints'} still hidden
                </div>
              )}
            </div>

            {phase === 'playing' && flagUnlocked && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-4">
                Nationality hint
                <span className="text-2xl leading-none">{flagForNationality(player.nationality)}</span>
              </div>
            )}

            {phase === 'playing' && (
              <div className="space-y-2">
                <form onSubmit={handleSubmit} className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Who is it? Type at least 2 letters..."
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-border bg-card shadow-lg z-20 max-h-48 overflow-y-auto">
                      {suggestions.map(name => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleGuess(name)}
                          className="w-full text-left px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors border-b border-border last:border-0"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </form>
                <p className="text-[10px] text-center text-muted-foreground">
                  Pick a name from the list to lock in a guess. Wrong guesses cost {WRONG_GUESS_PENALTY} pts and reveal the next stint.
                </p>
                {wrongGuesses.length > 0 && (
                  <p className="text-xs text-destructive text-center">
                    Not {wrongGuesses.join(', not ')}
                  </p>
                )}
                <button
                  onClick={revealNext}
                  disabled={revealed >= total}
                  className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-4 h-4" />
                  {revealed >= total
                    ? 'The whole career is on the board'
                    : `Reveal next stint · costs ${REVEAL_PENALTY} pts`}
                </button>
              </div>
            )}

            {ended && (
              <div className="bg-card border border-border rounded-2xl p-6 text-center mt-2">
                <div className="text-4xl mb-2">{phase === 'won' ? '🪜' : '🙈'}</div>
                <h2
                  className={cn(
                    'text-2xl font-bold font-display mb-3',
                    phase === 'won' ? 'text-correct' : 'text-destructive',
                  )}
                >
                  {phase === 'won' ? 'You know ball' : 'Out of guesses'}
                </h2>

                <div className="bg-secondary rounded-xl px-4 py-3 inline-flex items-center gap-3 mb-3">
                  <span className="text-3xl">{flagForNationality(player.nationality)}</span>
                  <span className="text-left">
                    <span className="block font-bold text-foreground">{player.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {player.position} · {player.nationality} · {total} stints
                    </span>
                  </span>
                </div>

                {phase === 'won' ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-1">
                      Named after {cluesUsed} {cluesUsed === 1 ? 'clue' : 'clues'} and{' '}
                      {wrongGuesses.length} wrong {wrongGuesses.length === 1 ? 'guess' : 'guesses'}.
                    </p>
                    <p className="text-3xl font-bold text-primary font-display mb-3">{finalScore} pts</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mb-3">
                    The full ladder is above. It happens to the best of us.
                  </p>
                )}

                <ShareButtons
                  score={phase === 'won' ? `${finalScore} pts` : '0 pts'}
                  gameName="Career Ladder"
                  gamePath="/career-ladder"
                  emojiGrid={emojiGrid}
                />
                <button
                  onClick={() => startRound(pool, usedIds)}
                  className="mt-4 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
                >
                  <RotateCcw className="w-4 h-4" /> Next player
                </button>
              </div>
            )}
          </>
        )}

        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion
            gameType="career-ladder"
            gameContext={player ? { playerId: player.id, playerName: player.name } : {}}
          />
        </div>

        <GameSeoContent
          title="Career Ladder: Guess the Footballer from Their Career"
          description="Every round hides a real footballer behind their career ladder. You start with a single early stint, just a club, a season and a stat line, and work out who climbed it. The fewer clues you need, the bigger your score."
          howToPlay={[
            'A mystery player starts with only their earliest career stint showing.',
            'Type at least 2 letters and pick a name from the list. You get 6 guesses.',
            'Every wrong guess reveals the next stint. You can also reveal one on purpose.',
            'A nationality flag hint appears once half the career is on the board.',
            'Start from 1000 points. Extra stints cost 150, wrong guesses cost 100, and the floor is 100.',
          ]}
          examples={[
            'A teenager scoring at Palmeiras before a move to Madrid narrows things down fast.',
            'Six straight seasons at Ajax and then Chelsea? That is basically a signed confession.',
          ]}
        />
        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

export default CareerLadder;
