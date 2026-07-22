import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { GameNav } from '@/components/game/GameNav';
import PlayerAutocomplete from '@/components/game/PlayerAutocomplete';
import { normalizeName, type PlayerEntity } from '@/lib/playerSearch';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET } from '@/lib/dateUtils';
import {
  CATEGORIES,
  pickDailyCategories,
  pickRandomCategories,
  scoreRound,
  totalScore,
  buildEmojiGrid,
  roundSummaryLine,
  buildReveal,
  type RarityMode,
  type RarityCategory,
  type PoolEntry,
  type RoundResult,
} from '@/lib/rarityRound';
import { displayName } from '@/lib/playerSearch';

type PlayMode = 'daily' | 'unlimited';
type Phase = 'boot' | 'error' | 'loading-round' | 'playing' | 'revealed' | 'done';

/**
 * Rarity Round: Pointless-style rarity trivia ("Rarity Round" mode) with a
 * Fan-Favourites-style popularity mirror ("Crowd Says" mode). See
 * src/lib/rarityRound.ts for the full scoring writeup and verified category
 * pool sizes. 5 rounds per run; total score across rounds is the final
 * result, lower is better in Rarity Round, higher is better in Crowd Says.
 */
const RarityRound = () => {
  // Daily / Unlimited toggle, same convention as Footle (mode + switchMode).
  const [playMode, setPlayMode] = useState<PlayMode>('daily');
  // Rarity Round / Crowd Says toggle, the game's own mirror-mode axis.
  const [rarityMode, setRarityMode] = useState<RarityMode>('rarity');

  const [phase, setPhase] = useState<Phase>('boot');
  const [rounds, setRounds] = useState<RarityCategory[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [pool, setPool] = useState<PoolEntry[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);

  const [inputValue, setInputValue] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<PlayerEntity | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);

  const currentCategory = rounds[roundIndex];

  // Every hook lives above this point and none of them are conditional, per
  // the site's React error #310 rule (hooks must never sit below an early
  // return). The loading/error UI is decided entirely in the JSX below.

  const startRun = useCallback((nextPlayMode: PlayMode, nextRarityMode: RarityMode) => {
    setPlayMode(nextPlayMode);
    setRarityMode(nextRarityMode);
    const categories = nextPlayMode === 'daily' ? pickDailyCategories(CATEGORIES) : pickRandomCategories(CATEGORIES);
    if (!categories || categories.length === 0) {
      setPhase('error');
      return;
    }
    setRounds(categories);
    setRoundIndex(0);
    setResults([]);
    setInputValue('');
    setSelectedEntity(null);
    setErrorMsg('');
    setLastResult(null);
    setPhase('loading-round');
  }, []);

  // Boot the first run on mount (daily mode by default).
  useEffect(() => {
    startRun('daily', 'rarity');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch the pool for whichever round is now current.
  useEffect(() => {
    if (phase !== 'loading-round' || !currentCategory) return;
    let cancelled = false;
    currentCategory
      .fetchPool()
      .then(p => {
        if (cancelled) return;
        if (!p || p.length === 0) {
          setPhase('error');
          return;
        }
        setPool(p);
        setPhase('playing');
      })
      .catch(() => {
        if (!cancelled) setPhase('error');
      });
    return () => {
      cancelled = true;
    };
  }, [phase, currentCategory]);

  const switchPlayMode = (m: PlayMode) => {
    if (m === playMode) return;
    startRun(m, rarityMode);
  };

  const switchRarityMode = (m: RarityMode) => {
    if (m === rarityMode) return;
    // Changing the scoring mode mid-run would retroactively change the
    // meaning of already-scored rounds, so a mode switch always starts a
    // fresh run, mirroring how Footle's daily/unlimited toggle also resets.
    startRun(playMode, m);
  };

  const handleSelect = (entity: PlayerEntity) => {
    setSelectedEntity(entity);
    setInputValue(entity.name);
    setErrorMsg('');
  };

  const submitGuess = () => {
    if (!selectedEntity || !currentCategory || pool.length === 0) return;
    const key = normalizeName(selectedEntity.name);
    const match = pool.find(p => p.key === key);
    if (!match) {
      // Structurally this should be rare: PlayerAutocomplete's dropdown is
      // already filtered to the category (validateOnly=true, sourceConfig
      // scoped per category), so a pick that isn't in the scoring pool means
      // either the elite-100m category's broader autocomplete (documented in
      // rarityRound.ts) surfaced a sub-threshold player, or the two sources
      // disagree for some other data reason. Either way, reject it here
      // rather than letting an invalid answer score.
      setErrorMsg("That player doesn't count for this category. Try another.");
      return;
    }
    const points = scoreRound(match.rank, pool.length, rarityMode);
    const result: RoundResult = {
      categoryId: currentCategory.id,
      prompt: currentCategory.prompt,
      answerName: match.name,
      rank: match.rank,
      poolSize: pool.length,
      points,
    };
    setLastResult(result);
    setResults(r => [...r, result]);
    setPhase('revealed');
  };

  const nextRound = () => {
    const nextIndex = roundIndex + 1;
    if (nextIndex >= rounds.length) {
      setPhase('done');
      return;
    }
    setRoundIndex(nextIndex);
    setInputValue('');
    setSelectedEntity(null);
    setErrorMsg('');
    setLastResult(null);
    setPhase('loading-round');
  };

  const finalScore = useMemo(() => totalScore(results), [results]);
  const isComplete = phase === 'done';

  useGameCompletion('rarity-round', isComplete, finalScore, results.length);

  const emojiGrid = useMemo(() => buildEmojiGrid(results, rarityMode), [results, rarityMode]);

  const modeLabel = rarityMode === 'rarity' ? 'Rarity Round' : 'Crowd Says';
  const goalLine =
    rarityMode === 'rarity'
      ? 'Name a valid answer that as few people would think of as possible. Lower score wins.'
      : 'Name the most obvious, famous answer you can. Higher score wins.';

  const resultHeadline =
    rarityMode === 'rarity'
      ? finalScore === 0
        ? 'Goalless! A perfect run'
        : `You scored ${finalScore}`
      : `You scored ${finalScore}`;

  const resultStatLine =
    rarityMode === 'rarity'
      ? finalScore <= 100
        ? 'Elite obscurity. The scouts are stumped.'
        : finalScore <= 250
        ? 'Solid digging. A few crowd-pleasers snuck in.'
        : 'Everyone knew your answers. Try to go deeper next time.'
      : finalScore >= 400
      ? 'Maximum crowd-pleaser. Everyone would have said the same.'
      : finalScore >= 250
      ? 'Decent instincts on what is famous.'
      : 'You went too obscure for a game about being obvious.';

  const outcomeEmoji =
    rarityMode === 'rarity'
      ? finalScore === 0
        ? '🥅'
        : finalScore <= 100
        ? '🕵️'
        : finalScore <= 250
        ? '👀'
        : '📢'
      : finalScore >= 400
      ? '📣'
      : finalScore >= 250
      ? '🙂'
      : '🤔';

  return (
    <>
      <PageSeo
        title="Rarity Round | DoUKnowBall"
        description="Name a valid answer as obscure as possible, Pointless-style, or flip to Crowd Says and name the most famous answer you can. Five rounds, real soccer data, free to play."
        path="/rarity-round"
      />
      <GameShell
        width="narrow"
        title="RARITY ROUND"
        subtitle={goalLine}
        headerExtra={
          <>
            <HowToPlayPopover title="How to Play Rarity Round">
              <section>
                <h3 className="font-bold text-foreground mb-2">🎯 The idea</h3>
                <p className="text-muted-foreground">
                  Each round shows a category, like "Name a Ballon d'Or winner." Pick any real, valid
                  answer using the search box. You cannot submit a name that doesn't fit the category.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">🕵️ Rarity Round mode</h3>
                <p className="text-muted-foreground">
                  Score is based on how obscure your answer is within the category's full pool of valid
                  players. The more famous your pick, the more points you get, and points are bad. A
                  score of 0 across all 5 rounds is a perfect "Goalless" run.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">📢 Crowd Says mode</h3>
                <p className="text-muted-foreground">
                  The mirror image. Points are good here: name the most famous, most obvious answer you
                  can for the highest score.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">📅 Daily vs Unlimited</h3>
                <p className="text-muted-foreground">
                  Daily gives everyone the same 5 categories each day. Unlimited shuffles a fresh set of
                  5 every time you play.
                </p>
              </section>
            </HowToPlayPopover>

            {/* Daily / Unlimited toggle */}
            <div className="flex items-center justify-center gap-1 mt-6 bg-secondary rounded-full p-1 w-fit mx-auto">
              {(['daily', 'unlimited'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => switchPlayMode(m)}
                  className={cn(
                    'px-5 py-2 rounded-full text-sm font-semibold transition-all',
                    playMode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
                </button>
              ))}
            </div>

            {/* Rarity Round / Crowd Says toggle */}
            <div className="flex items-center justify-center gap-2 mt-3">
              {(['rarity', 'crowd'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => switchRarityMode(m)}
                  className={cn(
                    'px-5 py-2 rounded-full text-sm font-semibold transition-all',
                    rarityMode === m
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                  )}
                >
                  {m === 'rarity' ? '🕵️ Rarity Round' : '📢 Crowd Says'}
                </button>
              ))}
            </div>

            {playMode === 'daily' && (
              <p className="text-xs text-muted-foreground mt-3">Today's categories, {getTodayET()}. Same 5 for everyone.</p>
            )}
          </>
        }
      >
        {phase === 'boot' && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load Rarity Round right now.</p>
            <button
              onClick={() => startRun(playMode, rarityMode)}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold"
            >
              Try again
            </button>
          </div>
        )}

        {phase !== 'boot' && phase !== 'error' && phase !== 'done' && currentCategory && (
          <div className="space-y-5">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <span>
                Round {roundIndex + 1} of {rounds.length}
              </span>
              {results.length > 0 && (
                <span className="text-primary">
                  · {modeLabel} score so far: {totalScore(results)}
                </span>
              )}
            </div>

            <div className="bg-surface-1 border border-border rounded-2xl p-6 text-center">
              <p className="text-xl md:text-2xl font-display font-bold text-foreground mb-1">
                {currentCategory.prompt}
              </p>
              <p className="text-sm text-muted-foreground">{currentCategory.hint}</p>
            </div>

            {phase === 'loading-round' && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {phase === 'playing' && (
              <div className="space-y-3">
                <PlayerAutocomplete
                  value={inputValue}
                  onChange={v => {
                    setInputValue(v);
                    if (selectedEntity && normalizeName(v) !== normalizeName(selectedEntity.name)) {
                      setSelectedEntity(null);
                    }
                    setErrorMsg('');
                  }}
                  onSelect={handleSelect}
                  searchOptions={{ source: currentCategory.sourceConfig, minChars: 2, limit: 8 }}
                  placeholder="Search for a player..."
                  validateOnly
                  autoFocus
                />
                {errorMsg && <p className="text-sm text-destructive text-center">{errorMsg}</p>}
                <button
                  onClick={submitGuess}
                  disabled={!selectedEntity}
                  className="w-full py-3.5 min-h-[44px] bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Lock in answer
                </button>
              </div>
            )}

            {phase === 'revealed' && lastResult && (
              <div
                className={cn(
                  'bg-surface-1 border rounded-2xl p-6 text-center animate-pop-correct',
                  rarityMode === 'rarity'
                    ? lastResult.points <= 30
                      ? 'border-correct shadow-[0_0_24px_hsl(var(--success-glow))]'
                      : 'border-border'
                    : lastResult.points >= 70
                    ? 'border-correct shadow-[0_0_24px_hsl(var(--success-glow))]'
                    : 'border-border',
                )}
              >
                <p className="text-lg font-display font-bold text-foreground mb-1">{lastResult.answerName}</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Ranked {lastResult.rank} of {lastResult.poolSize} by fame in this category
                </p>
                <p className="text-3xl font-display font-bold text-primary mb-1">{lastResult.points}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-5">
                  {rarityMode === 'rarity' ? 'points (lower is better)' : 'points (higher is better)'}
                </p>

                {/* The board reveal. Pointless's actual payoff: what you SHOULD
                    have said. Its absence is why this game read as "you guess
                    one guy and you're done" (owner review 2026-07-06). */}
                {(() => {
                  const reveal = buildReveal(pool, rarityMode);
                  if (!reveal) return null;
                  const nailedIt = reveal.best.rank === lastResult.rank;
                  return (
                    <div className="mb-5 rounded-xl border border-border bg-background/60 p-4 text-left">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {nailedIt
                          ? 'Nobody could have done better'
                          : rarityMode === 'rarity'
                          ? 'The rarest answer was'
                          : 'The most popular answer was'}
                      </p>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-display text-base font-bold text-gold">
                          {displayName(reveal.best.name)}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-primary">
                          {reveal.bestPoints} pts
                        </span>
                      </div>
                      {reveal.alternatives.length > 0 && (
                        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                          Also there:{' '}
                          {reveal.alternatives.map(a => displayName(a.name)).join(', ')}
                        </p>
                      )}
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {reveal.poolSize} valid answers in this category.
                      </p>
                    </div>
                  );
                })()}

                <button
                  onClick={nextRound}
                  className="px-8 py-3 min-h-[44px] bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
                >
                  {roundIndex + 1 >= rounds.length ? 'See final score' : 'Next round'}
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'done' && (
          <div className="mt-4">
            <ResultScreen
              outcomeEmoji={outcomeEmoji}
              headline={resultHeadline}
              statLine={resultStatLine}
              statRow={[{ label: modeLabel, value: finalScore }]}
              emojiGrid={emojiGrid}
              share={{
                score: String(finalScore),
                gameName: `${modeLabel} - Rarity Round`,
                gamePath: '/rarity-round',
              }}
              onPlayAgain={() => startRun('unlimited', rarityMode)}
              playAgainLabel={playMode === 'daily' ? 'Play Unlimited' : 'New round'}
            >
              <div className="text-left text-sm text-muted-foreground space-y-1 my-4 py-3 px-4 rounded-xl bg-surface-2 border border-border/60">
                {results.map((r, i) => (
                  <p key={i}>{roundSummaryLine(r, rarityMode)}</p>
                ))}
              </div>
            </ResultScreen>
          </div>
        )}

        <AdBanner slot="1234567891" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="rarity-round" />
        </div>

        <GameSeoContent
          title="Rarity Round: Soccer Rarity Trivia"
          description="Pointless-style rarity trivia built on real soccer data. Name a valid answer to a category prompt, then see how obscure or how famous your pick was. Flip to Crowd Says for the popularity-scoring mirror mode."
          howToPlay={[
            'Read the category prompt.',
            'Search for and pick any real, valid answer.',
            'See how your pick ranks by fame within the category.',
            'Play all 5 rounds for a total score.',
          ]}
        />
        <GameNav />
      </GameShell>
    </>
  );
};

export default RarityRound;
