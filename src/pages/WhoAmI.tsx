import { FlagImg } from '@/components/FlagImg';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, RotateCcw, Check, X, ArrowUp, ArrowDown } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { RulesGate } from '@/components/game/RulesGate';
import { GiveUpButton } from '@/components/game/GiveUpButton';
import PlayerAutocomplete from '@/components/game/PlayerAutocomplete';
import { SOCCER_MARKET_VALUE_SOURCE, normalizeName, type PlayerEntity } from '@/lib/playerSearch';
import { fmtCompactUsd } from '@/lib/dealPlayers';
import { recordCompletion, getCurrentPlayerName } from '@/lib/completions';
import {
  WhoAmIData,
  WhoAmIPlayer,
  WhoAmIDifficulty,
  GuessResult,
  buildWhoAmISecretPool,
  fetchWhoAmIPool,
  loadWhoAmIDifficulty,
  pickSecret,
  saveWhoAmIDifficulty,
  scoreGuess,
  whoAmIPlayerFromEntity,
  shortPosition,
  positionGroup,
} from '@/lib/whoAmI';

type Phase = 'boot' | 'error' | 'mode' | 'playing' | 'won' | 'lost';
type ChipState = 'hit' | 'near' | 'miss';

const scoreColor = (s: number) =>
  s >= 75 ? 'text-correct' : s >= 55 ? 'text-yellow-500' : s >= 35 ? 'text-orange-500' : 'text-destructive';

const scoreBarColor = (s: number) =>
  s >= 75 ? 'bg-correct' : s >= 55 ? 'bg-yellow-500' : s >= 35 ? 'bg-orange-500' : 'bg-destructive';

const emojiFor = (s: number) => (s >= 100 ? '🎯' : s >= 75 ? '🟩' : s >= 55 ? '🟨' : s >= 35 ? '🟧' : '🟥');

const chip = (key: string, state: ChipState, label: ReactNode, title?: string) => (
  <span
    key={key}
    title={title}
    className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap',
      state === 'hit' && 'bg-correct/10 border-correct/40 text-correct',
      state === 'near' && 'bg-yellow-500/10 border-yellow-500/40 text-yellow-500',
      state === 'miss' && 'bg-muted/50 border-border text-muted-foreground',
    )}
  >
    {label}
  </span>
);

const WhoAmI = () => {
  const [phase, setPhase] = useState<Phase>('boot');
  const [data, setData] = useState<WhoAmIData | null>(null);
  const [budget, setBudget] = useState(25);
  const [secret, setSecret] = useState<WhoAmIPlayer | null>(null);
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [guessInput, setGuessInput] = useState('');

  // #40: prominence tier for the secret pick, remembered across sessions.
  // This game has no separate daily mode, so the tier applies to every round.
  const [difficulty, setDifficulty] = useState<WhoAmIDifficulty>(loadWhoAmIDifficulty);
  const changeDifficulty = useCallback((next: WhoAmIDifficulty) => {
    setDifficulty(next);
    saveWhoAmIDifficulty(next);
  }, []);

  const boot = useCallback(async () => {
    setPhase('boot');
    const d = await fetchWhoAmIPool();
    if (!d) {
      setPhase('error');
      return;
    }
    setData(d);
    setPhase('mode');
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  const guessedNames = useMemo(
    () => new Set(guesses.map(g => normalizeName(g.player.name))),
    [guesses],
  );

  const sortedGuesses = useMemo(
    () => [...guesses].sort((a, b) => b.breakdown.score - a.breakdown.score),
    [guesses],
  );

  const startGame = (guessBudget: number) => {
    if (!data) return;
    setBudget(guessBudget);
    setSecret(prev => pickSecret(buildWhoAmISecretPool(difficulty, data.pool), prev?.name));
    setGuesses([]);
    setGuessInput('');
    setPhase('playing');
  };

  // #196: guesses now come from the site-wide PlayerAutocomplete against the
  // full soccer player pool (thousands of players, including Ronaldo, Messi
  // and anyone else, not just the 400-player curated boot pool). See the
  // WIDE-POOL GUESSING note in src/lib/whoAmI.ts for the full root cause and
  // fix writeup. The secret itself is still drawn from the curated pool, so
  // this only widens what you're ALLOWED to guess, not what the answer can be.
  const submitGuess = (entity: PlayerEntity) => {
    if (phase !== 'playing' || !data || !secret) return;
    if (guessedNames.has(normalizeName(entity.name))) return;
    const p = whoAmIPlayerFromEntity(entity);
    const breakdown = scoreGuess(p, secret, data.clubHistory);
    const next = [...guesses, { player: p, breakdown }];
    setGuesses(next);
    setGuessInput('');
    if (breakdown.isExact) {
      setPhase('won');
    } else if (next.length >= budget) {
      setPhase('lost');
    }
  };

  // Give Up: reveals the secret player and ends the round at 0 guesses
  // remaining, reusing the same "lost" result screen (which already shows
  // revealCard with the answer) rather than a separate code path.
  const giveUp = () => {
    if (phase !== 'playing') return;
    setPhase('lost');
  };

  /* Round 299, the scoring audit: this page never recorded a play, so a
     finished round earned no streak day and no played-today credit. The end
     moment is the phase landing on 'won' or 'lost' (out of guesses and Give
     Up both end on 'lost'). Once per round: the ref re-arms only when a new
     round enters 'playing', so mount, the mode screen and re-renders of the
     result screen never record. No score on purpose: the number this game
     shows is guesses used, where lower is better, and the leaderboard ranks
     by max score, so it would reward the worst detective. */
  const recordedRef = useRef(false);
  useEffect(() => {
    if (phase === 'playing') {
      recordedRef.current = false;
      return;
    }
    if ((phase !== 'won' && phase !== 'lost') || recordedRef.current) return;
    recordedRef.current = true;
    recordCompletion('/who-am-i', undefined, getCurrentPlayerName());
  }, [phase]);

  const lastGuess = guesses.length > 0 ? guesses[guesses.length - 1] : null;
  const bestScore = sortedGuesses.length > 0 ? sortedGuesses[0].breakdown.score : 0;
  const guessesLeft = budget - guesses.length;
  const won = phase === 'won';

  const emojiBar = guesses.map(g => emojiFor(g.breakdown.score)).join('');
  const emojiGrid = `🕵️ Who Am I? ${won ? `${guesses.length}` : 'X'}/${budget}\n${emojiBar}`;

  const guessRow = (g: GuessResult, highlight = false) => {
    const b = g.breakdown;
    const p = g.player;
    const valueClose = Math.abs(b.valueLogDiff) <= 0.04; // within roughly 10 percent
    const valueNear = Math.abs(b.valueLogDiff) <= 0.2; // within roughly 1.6x
    return (
      <div
        key={p.name}
        className={cn('bg-card border rounded-xl p-3', highlight ? 'border-primary/60' : 'border-border')}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <FlagImg name={p.nationality} size={20} />
          <span className="font-semibold text-foreground text-sm truncate flex-1">{p.name}</span>
          <span className={cn('font-bold font-display text-lg', scoreColor(b.score))}>{b.score}</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-2">
          <div
            className={cn('h-full rounded-full', scoreBarColor(b.score))}
            style={{ width: `${Math.max(4, Math.min(100, b.score))}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {chip(
            'nat',
            b.natMatch ? 'hit' : 'miss',
            <>
              {b.natMatch ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Nation
            </>,
            b.natMatch ? 'Same nationality as the secret player' : 'Different nationality',
          )}
          {chip(
            'pos',
            b.posExactMatch ? 'hit' : b.posGroupMatch ? 'near' : 'miss',
            <>
              {b.posExactMatch ? (
                <Check className="w-3 h-3" />
              ) : b.posGroupMatch ? null : (
                <X className="w-3 h-3" />
              )}
              {shortPosition(p.position)}
              {b.posExactMatch ? '' : b.posGroupMatch ? ` (${positionGroup(p.position)} fits)` : ''}
            </>,
            b.posExactMatch
              ? 'Exact same position'
              : b.posGroupMatch
              ? 'Same position group, not the exact role'
              : 'Different position group',
          )}
          {chip(
            'club',
            b.sameClub ? 'hit' : b.sharedClubPast ? 'near' : 'miss',
            <>
              {b.sameClub ? <Check className="w-3 h-3" /> : b.sharedClubPast ? null : <X className="w-3 h-3" />}
              {b.sameClub ? 'Same club' : b.sharedClubPast ? 'Past club link' : 'Club'}
            </>,
            b.sameClub
              ? 'Plays for the same club right now'
              : b.sharedClubPast
              ? 'They shared a club at some point in their careers'
              : 'No club in common',
          )}
          {/* Round 315: a guess with no current row (whoAmIPlayerFromEntity's
              retired path) carries age 0 and value 0 as scoring sentinels, and
              this used to render them literally: Anthony guessed Rodri while
              his 2026 row was missing and read "Age 0, $0". The chips now say
              what the zero means instead of printing it. */}
          {chip(
            'age',
            p.age === 0 ? 'miss' : b.ageDiff === 0 ? 'hit' : Math.abs(b.ageDiff) <= 3 ? 'near' : 'miss',
            p.age === 0 ? (
              <>No current age<X className="w-3 h-3" /></>
            ) : (
              <>
                Age {p.age}
                {b.ageDiff === 0 ? (
                  <Check className="w-3 h-3" />
                ) : b.ageDiff > 0 ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                )}
              </>
            ),
            p.age === 0
              ? 'No current season listing for this player, so age cannot be compared'
              : b.ageDiff === 0
              ? 'Same age as the secret player'
              : b.ageDiff > 0
              ? 'The secret player is older'
              : 'The secret player is younger',
          )}
          {chip(
            'value',
            p.value === 0 ? 'miss' : valueClose ? 'hit' : valueNear ? 'near' : 'miss',
            p.value === 0 ? (
              <>No listed value<X className="w-3 h-3" /></>
            ) : (
              <>
                {fmtCompactUsd(p.value)}
                {valueClose ? (
                  <Check className="w-3 h-3" />
                ) : b.valueLogDiff > 0 ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                )}
              </>
            ),
            p.value === 0
              ? 'No current market value on file for this player'
              : valueClose
              ? 'Almost identical market value'
              : b.valueLogDiff > 0
              ? 'The secret player is worth more'
              : 'The secret player is worth less',
          )}
        </div>
      </div>
    );
  };

  const revealCard = secret ? (
    <div className="bg-secondary/40 border border-border rounded-xl p-4 mb-4">
      <div className="mb-1"><FlagImg name={secret.nationality} size={40} /></div>
      <div className="text-xl font-bold text-foreground">{secret.name}</div>
      <div className="text-sm text-muted-foreground mb-3">{secret.club}</div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-card border border-border rounded-lg p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Position</div>
          <div className="font-bold text-foreground text-sm">{shortPosition(secret.position)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Age</div>
          <div className="font-bold text-foreground text-sm">{secret.age}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Value</div>
          <div className="font-bold text-primary text-sm">{fmtCompactUsd(secret.value)}</div>
        </div>
      </div>
    </div>
  ) : null;

  const endButtons = (
    <div className="flex flex-wrap justify-center gap-3 mt-4">
      <button
        onClick={() => startGame(budget)}
        className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
      >
        <RotateCcw className="w-4 h-4" /> Play again
      </button>
      <button
        onClick={() => setPhase('mode')}
        className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-foreground rounded-full font-semibold hover:bg-secondary/70 transition-colors"
      >
        Switch mode
      </button>
    </div>
  );

  return (
    <main id="dukb-main" className="min-h-screen bg-background">
      {/* Round 335: this page draws its own rules control, so the navbar
          does not add a second one. */}
      <GameNavbar help="none" />
      <PageSeo
        title="Who Am I? Secret Footballer Guessing Game | DoUKnowBall"
        description="Guess the secret footballer. Every guess returns a similarity score from 0 to 100 plus clues on nationality, position, club, age and market value. Find him in as few guesses as you can."
        path="/who-am-i"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <header className="relative text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-[0.08em] text-primary font-display mb-1">
            WHO AM I?
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            One secret footballer. Every guess tells you how close you are. Find him before your guesses run out.
          </p>
          <RulesGate title="How to Play Who Am I?">
            <p className="text-muted-foreground text-center">
              We pick one secret footballer. You try to name him. Every guess you make gets scored so you know
              if you are getting warmer or colder.
            </p>

            <section>
              <h3 className="font-bold text-foreground mb-2">🔎 What the score means</h3>
              <p className="text-muted-foreground">
                Every guess gets a similarity score from 0 to 100. It compares your guess to the secret player on
                nationality, position, club, age and market value. The higher the number, the closer your guess is
                to the real answer. A score of 100 means you found him.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-foreground mb-2">🏷️ Reading the clue chips</h3>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>🟩 <span className="text-foreground">Green chip:</span> that clue matches the secret player exactly</li>
                <li>🟨 <span className="text-foreground">Yellow chip:</span> close, but not an exact match (same position group, or a club they used to share)</li>
                <li>⬜ <span className="text-foreground">Gray chip:</span> no match on that clue</li>
                <li>🔼🔽 <span className="text-foreground">Arrows</span> on age and value show whether the secret player is older/younger or worth more/less than your guess</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-foreground mb-2">⌨️ Making a guess</h3>
              <p className="text-muted-foreground">
                Type any player's name, at least 2 letters, and pick them from the list. You can guess absolutely
                any soccer player, so try big names first: Ronaldo, Messi, Mbappe, anyone you can think of.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-foreground mb-2">🏆 How to win</h3>
              <p className="text-muted-foreground">
                Name the secret player before you run out of guesses. Casual mode gives you 25 tries, Expert gives
                you only 10. Use the score and the chips to narrow it down each time.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-foreground mb-2">⚙️ How famous is the secret player?</h3>
              <p className="text-muted-foreground">
                Easy picks the secret player from the most famous third of the pool. Hard picks from the least
                famous third. Normal uses the full pool. Change this from the mode screen before you start.
              </p>
            </section>
          </RulesGate>
        </header>

        {phase === 'boot' && (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Scouting the player pool...</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load the player pool right now.</p>
            <button
              onClick={boot}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold"
            >
              Try again
            </button>
          </div>
        )}

        {phase === 'mode' && (
          <div className="max-w-md mx-auto">
            <div className="bg-card border border-border rounded-2xl p-5 mb-4 text-sm text-muted-foreground text-center">
              <p className="text-foreground font-semibold mb-1">A secret star is hiding. Sniff him out.</p>
              <p>
                Tap the <span className="text-primary font-semibold">?</span> above for the full rules, or just
                dive in.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => startGame(25)}
                className="bg-card border border-border hover:border-primary/60 rounded-2xl p-5 text-center transition-colors"
              >
                <div className="text-2xl mb-1">🧢</div>
                <div className="font-bold text-foreground">Casual</div>
                <div className="text-xs text-muted-foreground">25 guesses</div>
              </button>
              <button
                onClick={() => startGame(10)}
                className="bg-card border border-border hover:border-primary/60 rounded-2xl p-5 text-center transition-colors"
              >
                <div className="text-2xl mb-1">🎯</div>
                <div className="font-bold text-foreground">Expert</div>
                <div className="text-xs text-muted-foreground">10 guesses</div>
              </button>
            </div>

            {/* #40: difficulty tiers by peak market value. Easy = most famous
                third of the secret pool, Hard = least famous third, Normal =
                the full 200-player secret pool. */}
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">How famous is the secret player?</p>
              <div className="flex items-center justify-center gap-2">
                {(['easy', 'normal', 'hard'] as WhoAmIDifficulty[]).map(d => (
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
            </div>
          </div>
        )}

        {phase === 'playing' && secret && (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span>
                Guess <span className="text-foreground font-bold">{guesses.length + 1}</span> of {budget}
              </span>
              {bestScore > 0 && (
                <span>
                  Hottest so far <span className={cn('font-bold', scoreColor(bestScore))}>{bestScore}</span>
                </span>
              )}
              <span className={cn('font-semibold', guessesLeft <= 3 ? 'text-destructive' : 'text-foreground')}>
                {guessesLeft} left
              </span>
            </div>

            <div className="mb-4">
              <PlayerAutocomplete
                value={guessInput}
                onChange={setGuessInput}
                onSelect={submitGuess}
                searchOptions={{
                  source: SOCCER_MARKET_VALUE_SOURCE,
                  minChars: 2,
                  limit: 8,
                  exclude: guessedNames,
                }}
                placeholder="Type any player's name (2+ letters)"
                validateOnly
                autoFocus
              />
            </div>

            <div className="flex justify-center mb-4">
              <GiveUpButton onGiveUp={giveUp} />
            </div>

            {guesses.length === 0 && (
              <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground text-center">
                Open with any big name. The score and the clue chips will point you toward the secret player.
              </div>
            )}

            {lastGuess && (
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Last guess</div>
                {guessRow(lastGuess, true)}
              </div>
            )}

            {sortedGuesses.length > 1 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                  All guesses, hottest first
                </div>
                <div className="space-y-2">{sortedGuesses.map(g => guessRow(g))}</div>
              </div>
            )}
          </>
        )}

        {(phase === 'won' || phase === 'lost') && secret && (
          <>
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <div className="text-4xl mb-2">{won ? '🕵️' : '🫥'}</div>
              <h2 className="text-2xl font-bold text-primary font-display mb-1">
                {won
                  ? `Found him in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}`
                  : 'Out of guesses'}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {won
                  ? guesses.length <= 3
                    ? 'Elite scouting. The agent fees are in the mail.'
                    : guesses.length <= 8
                    ? 'Proper detective work.'
                    : 'Got there in the end. That counts.'
                  : 'The secret player slipped through. Here he is.'}
              </p>
              {revealCard}
              <pre className="text-sm tracking-wide whitespace-pre-wrap mb-2 font-sans">{emojiGrid}</pre>
              <ShareButtons
                score={won ? String(guesses.length) : 'X'}
                gameName="Who Am I?"
                gamePath="/who-am-i"
                emojiGrid={emojiGrid}
              />
              {endButtons}
            </div>

            {sortedGuesses.length > 0 && (
              <div className="mt-5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                  Your guesses, hottest first
                </div>
                <div className="space-y-2">{sortedGuesses.map(g => guessRow(g))}</div>
              </div>
            )}
          </>
        )}

        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="who-am-i" />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Who Am I? The Secret Footballer Game"
          description="Guess the secret footballer. You can search any soccer player, big name or obscure, and every guess gets a similarity score from 0 to 100 built on nationality, position, club, age and market value. Score gets higher the closer you are. 100 means you found him."
          howToPlay={[
            'A secret footballer is picked from around 200 current stars.',
            'Type at least two letters and pick any real player, from anywhere in the game, to guess.',
            'Each guess gets a 0 to 100 similarity score plus clue chips for nationality, position, club, age and value.',
            'Arrows show whether the secret player is older or younger, worth more or worth less.',
            'Find him before your guesses run out. Casual gives you 25, Expert only 10.',
          ]}
          examples={[
            'Guessing a PSG forward when the secret player is a PSG forward can score in the high 80s.',
            'A goalkeeper guess against a secret striker from another country lands near 10. Change direction fast.',
          ]}
        />
        <GameNav />
      </div>
    </main>
  );
};

export default WhoAmI;
