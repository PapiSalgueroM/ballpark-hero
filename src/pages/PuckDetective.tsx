import { FlagFromEmoji } from '@/components/FlagImg';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Loader2, Check, X, Minus, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { RulesGate } from '@/components/game/RulesGate';
import { GiveUpButton } from '@/components/game/GiveUpButton';
import { GameNav } from '@/components/game/GameNav';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import { NHL_PLAYER_SOURCE, normalizeName, type PlayerEntity } from '@/lib/playerSearch';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  GUESS_LIMIT,
  MatchTier,
  NumericDirection,
  PuckDetectivePlayer,
  PuckDifficulty,
  PuckGuess,
  buildPuckPool,
  buildShareGrid,
  countryFlag,
  countryLabel,
  evaluateGuess,
  fetchPuckDetectivePool,
  isCorrectGuess,
  loadPuckDifficulty,
  pickDailyMystery,
  pickRandomMystery,
  positionLabel,
  savePuckDifficulty,
  teamLabel,
} from '@/lib/puckDetective';

type Phase = 'boot' | 'error' | 'playing' | 'done';
type Mode = 'daily' | 'unlimited';

// Sentinel puzzle array. useDailyPuzzle only needs todayStr from this hook;
// the actual mystery player is derived from the live pool via pickDailyMystery.
const SENTINEL_PUZZLES = [{ id: 'puck-detective-daily' }];

type StoredGuess = { playerId: number };

const BEST_KEY = 'puck-detective-best-v1';

function loadBestStreak(): number {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

function tierChipClasses(tier: MatchTier): string {
  if (tier === 'exact') return 'text-correct border-correct/50 bg-correct/10';
  if (tier === 'close') return 'text-amber-500 border-amber-500/50 bg-amber-500/10';
  return 'text-muted-foreground border-border bg-secondary';
}

function tierIcon(tier: MatchTier) {
  if (tier === 'exact') return <Check className="w-3.5 h-3.5" />;
  if (tier === 'close') return <Minus className="w-3.5 h-3.5" />;
  return <X className="w-3.5 h-3.5" />;
}

function directionIcon(dir: NumericDirection) {
  if (dir === 'match') return <Check className="w-3.5 h-3.5" />;
  if (dir === 'higher') return <ArrowUp className="w-3.5 h-3.5" />;
  return <ArrowDown className="w-3.5 h-3.5" />;
}

function directionClasses(dir: NumericDirection): string {
  if (dir === 'match') return 'text-correct border-correct/50 bg-correct/10';
  return 'text-amber-500 border-amber-500/50 bg-amber-500/10';
}

const PuckDetective = () => {
  const [phase, setPhase] = useState<Phase>('boot');
  const [pool, setPool] = useState<PuckDetectivePlayer[] | null>(null);
  const [mode, setMode] = useState<Mode>('daily');

  const boot = useCallback(async () => {
    setPhase('boot');
    const p = await fetchPuckDetectivePool();
    if (!p) {
      setPhase('error');
      return;
    }
    setPool(p);
    setPhase('playing');
  }, []);

  useEffect(() => { boot(); }, [boot]);

  // --- Daily mode: date-seeded mystery, persisted guesses -------------------
  const {
    guesses: dailyStored,
    addGuess: addDailyStored,
    gameStatus: rawDailyStatus,
    isLoading: dailyLoading,
    todayStr,
  } = useDailyPuzzle<{ id: string }, StoredGuess>({
    gameSlug: 'puck-detective',
    puzzles: SENTINEL_PUZZLES,
    maxGuesses: GUESS_LIMIT,
    isWon: (g, _puzzle) => g.length > 0 && dailyMysteryRef.current != null &&
      g[g.length - 1].playerId === dailyMysteryRef.current.playerId,
    deserializeGuesses: (raw) => raw as StoredGuess[],
  });

  // dailyMysteryRef lets isWon (called synchronously inside useDailyPuzzle's
  // addGuess) see the current mystery without adding it to any dependency
  // array. The mystery itself never changes once the pool has loaded for
  // a given ET date, so a ref is safe and avoids a circular hook dependency.
  // Kept in sync via an effect (not written inside the useMemo body below) so
  // the memo itself stays a pure computation.
  const dailyMysteryRef = useRef<PuckDetectivePlayer | null>(null);
  const dailyMystery = useMemo(() => {
    if (!pool) return null;
    return pickDailyMystery(pool);
  }, [pool, todayStr]);

  useEffect(() => {
    dailyMysteryRef.current = dailyMystery;
  }, [dailyMystery]);

  // Give Up (daily): useDailyPuzzle has no native "force lose" call, and
  // reset() would clear progress instead of ending it, so a small sibling
  // localStorage flag (keyed the same way as the hook's own per-day storage)
  // marks the day as given-up without touching the guess log itself. Read
  // once per todayStr change, same pattern as the hook's own storageKey.
  const dailyGiveUpKey = `puck-detective-giveup-${todayStr}`;
  const [dailyGaveUp, setDailyGaveUp] = useState(() => {
    try { return localStorage.getItem(dailyGiveUpKey) === '1'; } catch { return false; }
  });
  const giveUpDaily = useCallback(() => {
    setDailyGaveUp(true);
    try { localStorage.setItem(dailyGiveUpKey, '1'); } catch { /* private mode */ }
  }, [dailyGiveUpKey]);

  // --- Unlimited mode: local state, fresh mystery per round ------------------
  const [unlimitedMystery, setUnlimitedMystery] = useState<PuckDetectivePlayer | null>(null);
  const [unlimitedGuesses, setUnlimitedGuesses] = useState<StoredGuess[]>([]);
  const [unlimitedStatus, setUnlimitedStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(() => loadBestStreak());

  // #40: unlimited-only difficulty tier, remembered across sessions. Daily
  // mode always uses the full pool untouched.
  const [difficulty, setDifficulty] = useState<PuckDifficulty>(loadPuckDifficulty);

  const startUnlimitedRound = useCallback(() => {
    if (!pool) return;
    const source = buildPuckPool(difficulty, pool);
    const next = pickRandomMystery(source, unlimitedMystery?.playerId);
    setUnlimitedMystery(next);
    setUnlimitedGuesses([]);
    setUnlimitedStatus('playing');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, difficulty]);

  useEffect(() => {
    if (pool && mode === 'unlimited' && !unlimitedMystery) startUnlimitedRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, mode]);

  const switchMode = useCallback((m: Mode) => {
    setMode(m);
    if (m === 'unlimited' && pool && !unlimitedMystery) startUnlimitedRound();
  }, [pool, unlimitedMystery, startUnlimitedRound]);

  // #40: changing tier only applies in unlimited mode and starts a fresh
  // round (mirrors Career Quiz's changeDifficulty convention).
  const changeDifficulty = useCallback((next: PuckDifficulty) => {
    if (mode !== 'unlimited' || !pool) return;
    setDifficulty((prev) => {
      if (prev === next) return prev;
      savePuckDifficulty(next);
      const nextPool = buildPuckPool(next, pool);
      setUnlimitedMystery(pickRandomMystery(nextPool));
      setUnlimitedGuesses([]);
      setUnlimitedStatus('playing');
      return next;
    });
  }, [mode, pool]);

  // --- Derived active state ---------------------------------------------------
  const mystery = mode === 'daily' ? dailyMystery : unlimitedMystery;
  const storedGuesses = mode === 'daily' ? dailyStored : unlimitedGuesses;
  const gameStatus = mode === 'daily'
    ? (dailyGaveUp ? 'lost' : rawDailyStatus === 'playing' ? 'playing' : rawDailyStatus)
    : unlimitedStatus;

  // Give Up: reveals the mystery player and ends the round at 0, without
  // recording a fake guess in the guess log.
  const giveUp = useCallback(() => {
    if (gameStatus !== 'playing') return;
    if (mode === 'daily') {
      giveUpDaily();
    } else {
      setUnlimitedStatus('lost');
    }
  }, [gameStatus, mode, giveUpDaily]);

  const byId = useMemo(() => {
    const m = new Map<number, PuckDetectivePlayer>();
    (pool ?? []).forEach((p) => m.set(p.playerId, p));
    return m;
  }, [pool]);

  const guesses: PuckGuess[] = useMemo(() => {
    if (!mystery) return [];
    return storedGuesses
      .map((sg) => byId.get(sg.playerId))
      .filter((p): p is PuckDetectivePlayer => Boolean(p))
      .map((player) => ({
        player,
        feedback: evaluateGuess(player, mystery),
        isCorrect: isCorrectGuess(player, mystery),
      }));
  }, [storedGuesses, byId, mystery]);

  const won = gameStatus === 'won';
  const guessedIds = useMemo(() => new Set(storedGuesses.map((g) => g.playerId)), [storedGuesses]);

  // --- Submit a guess ----------------------------------------------------------
  const [query, setQuery] = useState('');

  const submitGuess = useCallback((entity: PlayerEntity) => {
    if (gameStatus !== 'playing' || !mystery) return;
    // NHL_PLAYER_SOURCE doesn't carry player_id in metaColumns, so match by
    // normalized full name against the deduped pool instead. Every pool
    // entry's `name` came from the same full_name column NHL_PLAYER_SOURCE
    // reads, so an exact (case-sensitive, already-trimmed) match is reliable.
    const match = (pool ?? []).find((p) => p.name === entity.rawName || p.name === entity.name);
    if (!match) return;
    if (guessedIds.has(match.playerId)) { setQuery(''); return; }

    const correct = isCorrectGuess(match, mystery);
    setQuery('');

    if (mode === 'daily') {
      addDailyStored({ playerId: match.playerId });
    } else {
      const next = [...unlimitedGuesses, { playerId: match.playerId }];
      setUnlimitedGuesses(next);
      if (correct) {
        setUnlimitedStatus('won');
      } else if (next.length >= GUESS_LIMIT) {
        setUnlimitedStatus('lost');
      }
    }
  }, [gameStatus, mystery, pool, guessedIds, mode, addDailyStored, unlimitedGuesses]);

  // Unlimited streak tracking: bump on win, reset on loss, only when the
  // round just resolved (guards against re-firing on every render).
  const lastResolvedRef = useRef<'playing' | 'won' | 'lost'>('playing');
  useEffect(() => {
    if (mode !== 'unlimited') return;
    if (unlimitedStatus === lastResolvedRef.current) return;
    lastResolvedRef.current = unlimitedStatus;
    if (unlimitedStatus === 'won') {
      setStreak((s) => {
        const next = s + 1;
        if (next > best) {
          setBest(next);
          try { localStorage.setItem(BEST_KEY, String(next)); } catch { /* private mode */ }
        }
        return next;
      });
    } else if (unlimitedStatus === 'lost') {
      setStreak(0);
    }
  }, [unlimitedStatus, mode, best]);

  useEffect(() => {
    lastResolvedRef.current = 'playing';
  }, [unlimitedMystery]);

  useGameCompletion('puck-detective', mode === 'daily' && (dailyGaveUp || rawDailyStatus !== 'playing'), won ? (GUESS_LIMIT - guesses.length + 1) * 10 : 0);

  const isLoading = phase === 'boot' || (mode === 'daily' && dailyLoading);
  const emojiGrid = mystery ? buildShareGrid(guesses) : '';

  return (
    <>
      <PageSeo
        title="Puck Detective: Guess the NHL Player | DoUKnowBall"
        description="Guess the mystery NHL skater in 8 tries. Every guess reveals team, position, nationality, age and jersey number clues with directional arrows. Free daily and unlimited modes."
        path="/puck-detective"
      />
      <GameShell
        width="narrow"
        emoji="🏒"
        title="PUCK DETECTIVE"
        subtitle="Guess the mystery NHL player in 8 tries. Every guess reveals attribute clues."
        headerExtra={
          <>
            <RulesGate title="How to Play Puck Detective">
              <p className="text-muted-foreground text-center">
                A secret NHL player is picked every day. Guess who it is.
              </p>
              <section>
                <h3 className="font-bold text-foreground mb-2">Rules</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Type a player name and pick them from the list</li>
                  <li>Each guess shows how close you are on 5 attributes</li>
                  <li>You have 8 guesses to find the mystery player</li>
                </ul>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">Reading the Clues</h3>
                <ul className="space-y-1.5 text-muted-foreground">
                  <li><span className="text-correct font-semibold">Green check:</span> exact match</li>
                  <li><span className="text-amber-500 font-semibold">Yellow dash:</span> same position group (forward, defense or goalie)</li>
                  <li><span className="text-muted-foreground font-semibold">Gray X:</span> no match</li>
                  <li><span className="text-amber-500 font-semibold">Arrow up or down:</span> the mystery player's age or jersey number is higher or lower than your guess</li>
                </ul>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">Modes</h3>
                <p className="text-muted-foreground">
                  Daily gives everyone the same player and saves your progress. Unlimited lets you play as many rounds as you want and tracks your win streak.
                </p>
              </section>
              <p className="text-muted-foreground text-center">A new daily player drops every day at midnight.</p>
            </RulesGate>

            <div className="flex items-center justify-center gap-2 mt-4">
              {(['daily', 'unlimited'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-semibold transition-all',
                    mode === m ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                  )}
                >
                  {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
                </button>
              ))}
            </div>

            {/* #40: difficulty tiers, unlimited mode only. Easy = high-scoring
                skaters by career points, Hard = low-scoring skaters plus
                goalies (no career points stat), Normal = full pool. */}
            {mode === 'unlimited' && (
              <div className="flex items-center justify-center gap-2 mt-3">
                {(['easy', 'normal', 'hard'] as PuckDifficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => changeDifficulty(d)}
                    className={cn(
                      'px-6 py-2 rounded-full text-sm font-semibold transition-all capitalize',
                      difficulty === d
                        ? d === 'easy'
                          ? 'bg-correct text-correct-foreground'
                          : d === 'hard'
                            ? 'bg-destructive text-destructive-foreground'
                            : 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            {mode === 'unlimited' && (
              <p className="text-xs text-muted-foreground mt-2">
                Streak <span className="text-primary font-bold">{streak}</span>
                {best > 0 && <> · Best <span className="text-primary font-bold">{best}</span></>}
              </p>
            )}
          </>
        }
      >
        {isLoading && (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load the NHL roster right now.</p>
            <button onClick={boot} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold">
              Try again
            </button>
          </div>
        )}

        {!isLoading && phase === 'playing' && mystery && (
          <>
            <div className="text-center mb-4">
              <span className="text-xs text-muted-foreground">
                Guesses <span className="text-primary font-bold">{guesses.length}</span>/{GUESS_LIMIT}
              </span>
            </div>

            {gameStatus === 'playing' && (
              <div className="mb-6">
                <PlayerAutocomplete
                  value={query}
                  onChange={setQuery}
                  onSelect={submitGuess}
                  searchOptions={{
                    source: NHL_PLAYER_SOURCE,
                    exclude: new Set(guesses.map((g) => normalizeName(g.player.name))),
                  }}
                  placeholder="Guess an NHL player..."
                  validateOnly
                  autoFocus
                />
                <div className="flex justify-center mt-3">
                  <GiveUpButton onGiveUp={giveUp} />
                </div>
              </div>
            )}

            {guesses.length > 0 && (
              <div className="space-y-2 mb-4">
                {[...guesses].reverse().map((g, i) => (
                  <div
                    key={`${g.player.playerId}-${i}`}
                    className={cn(
                      'bg-card border rounded-xl px-4 py-3',
                      g.isCorrect ? 'border-correct' : 'border-border',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-bold text-foreground truncate">{g.player.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">#{guesses.length - i}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border', tierChipClasses(g.feedback.team))}>
                        {tierIcon(g.feedback.team)} {teamLabel(g.player.team)}
                      </span>
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border', tierChipClasses(g.feedback.position))}>
                        {tierIcon(g.feedback.position)} {positionLabel(g.player.position)}
                      </span>
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border', tierChipClasses(g.feedback.country))}>
                        {tierIcon(g.feedback.country)} <FlagFromEmoji emoji={countryFlag(g.player.country)} size={14} /> {countryLabel(g.player.country)}
                      </span>
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border', directionClasses(g.feedback.ageDirection))}>
                        {directionIcon(g.feedback.ageDirection)} Age {g.player.age}
                      </span>
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border', directionClasses(g.feedback.jerseyDirection))}>
                        {directionIcon(g.feedback.jerseyDirection)} #{g.player.jerseyNumber ?? '?'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {gameStatus !== 'playing' && (
              <div className="mt-4">
                <ResultScreen
                  won={won}
                  outcomeEmoji={won ? '🏒' : '🥅'}
                  headline={won ? 'Case closed!' : 'Out of guesses'}
                  statLine={
                    won
                      ? <>You found <span className="font-bold text-primary">{mystery.name}</span> in {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}</>
                      : <>The player was <span className="font-bold text-primary">{mystery.name}</span></>
                  }
                  statRow={mode === 'unlimited' ? [
                    { label: 'Streak', value: streak },
                    { label: 'Best', value: best },
                  ] : undefined}
                  emojiGrid={emojiGrid || '⬜'}
                  share={{
                    score: won ? `${guesses.length}/${GUESS_LIMIT}` : `X/${GUESS_LIMIT}`,
                    gameName: 'Puck Detective',
                    gamePath: '/puck-detective',
                  }}
                  onPlayAgain={mode === 'unlimited' ? startUnlimitedRound : undefined}
                  playAgainLabel="New player"
                  playNext={mode === 'daily' ? <p className="text-sm text-muted-foreground">Come back tomorrow for a new mystery player!</p> : undefined}
                />
              </div>
            )}
          </>
        )}

        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="puck-detective" />
        </div>

        <GameSeoContent
          title="Puck Detective: Guess the NHL Player in 8 Tries"
          description="Guess the mystery NHL player in 8 tries. Every guess compares team, position, nationality, age and jersey number against the secret player, with directional arrows on the numeric clues. Play the daily challenge or unlimited mode."
          howToPlay={[
            'Type a player name and pick them from the suggestions.',
            'Each guess shows feedback on team, position, nationality, age and jersey number.',
            'Green means an exact match, yellow means close, gray means no match.',
            'Arrows on age and jersey number point toward the mystery player\'s value.',
            'Solve it within 8 guesses.',
          ]}
          examples={[
            'A green position with a yellow team means you have the right role on the wrong roster.',
            'An up arrow on age means the mystery player is older than your guess.',
          ]}
        />
        <GameNav />
      </GameShell>
    </>
  );
};

export default PuckDetective;
