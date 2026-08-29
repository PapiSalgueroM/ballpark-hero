import { useState, useRef, useEffect } from 'react';
import { useOlympics } from '@/hooks/useOlympics';
import OlympicsHowToPlay from '@/components/olympics/OlympicsHowToPlay';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import { ChevronDown, Award } from 'lucide-react';
import { FlagFromEmoji } from '@/components/FlagImg';
import { cn } from '@/lib/utils';

const EMOJI_TO_COUNTRY: Record<string, string> = {
  '🇺🇸': 'USA', '🇦🇷': 'Argentina', '🇯🇲': 'Jamaica', '🇷🇸': 'Serbia',
  '🇰🇷': 'South Korea', '🇮🇹': 'Italy', '🇫🇷': 'France', '🇬🇧': 'England',
  '🇩🇪': 'Germany', '🇧🇷': 'Brazil', '🇪🇸': 'Spain', '🇳🇱': 'Netherlands',
  '🇯🇵': 'Japan', '🇨🇦': 'Canada', '🇦🇺': 'Australia', '🇨🇳': 'China',
  '🇷🇺': 'Russia', '🇸🇪': 'Sweden', '🇳🇴': 'Norway', '🇨🇿': 'Czech Republic',
  '🇺🇦': 'Ukraine', '🇷🇴': 'Romania', '🇫🇮': 'Finland', '🇨🇺': 'Cuba',
  '🇱🇨': 'Saint Lucia', '🇰🇪': 'Kenya',
};

export default function Olympics() {
  const {
    mode,
    switchMode,
    athlete,
    clueLevel,
    visibleClues,
    totalClues,
    status,
    score,
    guessInput,
    setGuessInput,
    submitGuess,
    revealNextClue,
    giveUp,
    wrongGuess,
    shareText,
    athleteNames,
    isLoading,
    resetGame,
  } = useOlympics();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = guessInput.trim().length >= 2
    ? athleteNames.filter((n) => n.toLowerCase().includes(guessInput.toLowerCase()))
    : [];

  const handleSelect = (name: string) => {
    setGuessInput(name);
    setShowSuggestions(false);
    submitGuess(name);
    setGuessInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guessInput.trim()) {
      submitGuess(guessInput);
      setGuessInput('');
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isGameOver = status !== 'playing';

  return (
    <>
      <PageSeo
        title="The Medal Games - Olympic Athlete Trivia | DoUKnowBall"
        description="Guess the mystery Olympic athlete from progressive clues about their career at the Games. Daily challenge."
        path="/olympics"
      />
      <GameShell
        /* Round 348: this page passes its own labelled rules button through
           headerExtra, so the shell must not add a second one. */
        help="none"
        width="narrow"
        title="The Medal Games"
        emoji="🏆"
        subtitle="Guess the athlete from progressive clues"
        headerExtra={<OlympicsHowToPlay />}
      >
        {/* Daily / Unlimited toggle */}
        <div className="flex items-center justify-center gap-1 mb-6 bg-secondary rounded-full p-1 w-fit mx-auto">
          {(['daily', 'unlimited'] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={cn(
                'px-5 py-1.5 rounded-full text-sm font-semibold transition-all',
                mode === m
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
            </button>
          ))}
        </div>

        {/* Loading guard */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <p className="text-muted-foreground text-sm animate-pulse">Loading today's puzzle…</p>
          </div>
        ) : (
          <>
            {/* Score bar */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
              <span>Clue {Math.min(clueLevel + 1, totalClues)} / {totalClues}</span>
              <span className="text-[hsl(43,85%,55%)] font-bold">
                {status === 'playing'
                  ? `${[1000, 850, 700, 550, 400, 250, 100][Math.min(clueLevel, 6)]} pts available`
                  : status === 'guessed'
                    ? `Score: ${score}`
                    : 'Game Over'}
              </span>
            </div>

            {/* Clues */}
            <div className="space-y-3 mb-6">
              {visibleClues.map((clue, i) => (
                <div
                  key={clue.label}
                  className="rounded-xl border border-[hsl(43,85%,55%)/0.2] bg-card p-4 animate-cell-reveal"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-[hsl(43,85%,55%)] mb-1">
                    {clue.label}
                  </div>
                  <div className="text-foreground text-sm">
                    {clue.label === 'Country'
                      ? <span className="inline-flex items-center gap-1"><FlagFromEmoji emoji={clue.value} size={18} />{EMOJI_TO_COUNTRY[clue.value] || ''}</span>
                      : clue.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Game Over */}
            {isGameOver && (
              <div className="mb-6">
                <ResultScreen
                  won={status === 'guessed'}
                  outcomeEmoji={<Award className="w-10 h-10 text-[hsl(43,85%,55%)] mx-auto" />}
                  headline={athlete.name}
                  statLine={
                    <span className="inline-flex items-center justify-center gap-1">
                      {athlete.sport}, <FlagFromEmoji emoji={athlete.country} size={16} /> {EMOJI_TO_COUNTRY[athlete.country] || ''}
                    </span>
                  }
                  funFact={`${athlete.gamesYear} ${athlete.hostCity}`}
                  statRow={[{
                    label: 'Result',
                    value: status === 'guessed' ? `Score: ${score} 🏅` : 'Better luck tomorrow!',
                  }]}
                  emojiGrid={shareText}
                  share={{
                    score: String(score),
                    gameName: 'The Medal Games',
                    gamePath: '/olympics',
                  }}
                  onPlayAgain={mode === 'unlimited' ? resetGame : undefined}
                  playNext={mode === 'daily' ? <p className="text-sm text-muted-foreground">Come back tomorrow for a new puzzle!</p> : undefined}
                />
              </div>
            )}

            {/* Controls */}
            {!isGameOver && (
              <div className="space-y-3 mb-6">
                <form onSubmit={handleSubmit} className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={guessInput}
                    onChange={(e) => { setGuessInput(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Type athlete name..."
                    aria-label="Type athlete name"
                    className={`w-full px-4 py-3 rounded-xl bg-card border ${wrongGuess ? 'border-destructive' : 'border-border'} text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(43,85%,55%)/0.5]`}
                  />
                  {showSuggestions && filtered.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl bg-card border border-border shadow-lg overflow-hidden">
                      {filtered.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleSelect(name)}
                          className="block w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </form>
                <div className="flex gap-3">
                  {clueLevel < totalClues - 1 && (
                    <button
                      onClick={revealNextClue}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-secondary/80 transition-all"
                    >
                      <ChevronDown className="w-4 h-4" />
                      Next Clue
                    </button>
                  )}
                  {clueLevel > 0 && !showGiveUpConfirm && (
                    <button
                      onClick={() => setShowGiveUpConfirm(true)}
                      className="text-sm text-muted-foreground hover:text-destructive transition-colors px-4 py-3"
                    >
                      🏳️ Give Up
                    </button>
                  )}
                </div>
                {showGiveUpConfirm && (
                  <div className="text-center space-y-2 p-3 rounded-xl border border-destructive/20 bg-card">
                    <p className="text-sm text-muted-foreground">Are you sure? You'll reveal the answer and score 0 points.</p>
                    <div className="flex justify-center gap-3">
                      <button onClick={() => { giveUp(); setShowGiveUpConfirm(false); }} className="px-4 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-colors">
                        Yes, Give Up
                      </button>
                      <button onClick={() => setShowGiveUpConfirm(false)} className="px-4 py-1.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-accent transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <GameSeoContent
          pageHasOwnH1
          title="Olympic Athlete Trivia | DoUKnowBall"
          description="Guess the mystery Olympic athlete from progressive clues about their sport, medal count, nationality, and iconic moments. Covers Summer and Winter Games."
          howToPlay={[
            'Clues are revealed one at a time about the mystery Olympic athlete: sport, medals, era, and country.',
            'Submit your guess when you think you know who it is. Fewer clues means more points.',
            'Give up to reveal the answer if you\'re stuck. A new athlete is featured daily.',
          ]}
          examples={[
            'Usain Bolt: Track & Field, Jamaica, 8 Gold Medals, 100m/200m',
            'Michael Phelps: Swimming, USA, 23 Gold Medals, Most Decorated Olympian',
            'Simone Biles: Gymnastics, USA, 7 Gold Medals, GOAT of gymnastics',
            'Nadia Comăneci: Gymnastics, Romania, First Perfect 10, 1976 Montreal',
            'Carl Lewis: Track & Field, USA, 9 Gold, Long Jump & 100m',
            'Marit Bjørgen: Cross-Country Skiing, Norway, 8 Gold, Winter Games legend',
          ]}
        />

        <AdBanner slot="1234567901" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="olympics" gameContext={{ athleteName: athlete.name }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
}
