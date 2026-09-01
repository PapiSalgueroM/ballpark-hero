import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { RulesGate } from '@/components/game/RulesGate';
import { GiveUpButton } from '@/components/game/GiveUpButton';
import { GameNav } from '@/components/game/GameNav';
import PlayerAutocomplete from '@/components/game/PlayerAutocomplete';
import { normalizeName, type PlayerEntity } from '@/lib/playerSearch';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET } from '@/lib/dateUtils';
import { flagForClub } from '@/lib/careerLadder';
import {
  pickDailyPuzzle,
  pickUnlimitedPuzzle,
  isCorrectGuess,
  guessKey,
  hintForLevel,
  scoreForGuess,
  buildEmojiGrid,
  MAX_GUESSES,
  XI_ROSTER_NAMES,
  XI_SEARCH_OPTIONS,
  type ActivePuzzle,
  type HintLevel,
} from '@/lib/missingXi';

type PlayMode = 'daily' | 'unlimited';
type Phase = 'playing' | 'revealed';

/**
 * Missing XI: a famous, real starting lineup is shown on a simple pitch with
 * ONE player blanked out. The player names the missing man in up to 3
 * guesses, with an escalating hint after each miss. Hints never repeat what
 * the card already shows: club lineups hint nationality first, national-team
 * lineups hint the club at the time first, then the surname's first letter.
 * See src/lib/missingXi.ts for the full curated lineup data and scoring
 * writeup (each lineup's `source` field is an internal editor note and is
 * never rendered; player-facing flavor comes from BlankCandidate.fact).
 *
 * Structural template follows RarityRound.tsx: GameShell, ResultScreen,
 * RulesGate, useGameCompletion, and the same Daily/Unlimited toggle
 * convention. Every hook below lives above any conditional return, per the
 * site's React error #310 rule (TransferPathBoard's known bug class).
 */
const MissingXi = () => {
  const [playMode, setPlayMode] = useState<PlayMode>('daily');
  const [puzzle, setPuzzle] = useState<ActivePuzzle | null>(null);
  const [phase, setPhase] = useState<Phase>('playing');
  const [guessesUsed, setGuessesUsed] = useState(0);
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [finalScore, setFinalScore] = useState(0);
  const [won, setWon] = useState(false);

  const [inputValue, setInputValue] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<PlayerEntity | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Every hook lives above this point and none of them are conditional, per
  // the site's React error #310 rule (the loading/error UI, if any, is
  // decided entirely in the JSX below, not via an early return above a hook).

  const hintLevel = Math.min(guessesUsed, MAX_GUESSES) as HintLevel;

  const startRun = useCallback((nextMode: PlayMode) => {
    setPlayMode(nextMode);
    const next = nextMode === 'daily' ? pickDailyPuzzle() : pickUnlimitedPuzzle();
    setPuzzle(next);
    setPhase('playing');
    setGuessesUsed(0);
    setWrongGuesses([]);
    setFinalScore(0);
    setWon(false);
    setInputValue('');
    setSelectedEntity(null);
    setErrorMsg('');
  }, []);

  // Boot the first run on mount (daily mode by default).
  useEffect(() => {
    startRun('daily');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchPlayMode = (m: PlayMode) => {
    if (m === playMode) return;
    startRun(m);
  };

  const handleSelect = (entity: PlayerEntity) => {
    setSelectedEntity(entity);
    setInputValue(entity.name);
    setErrorMsg('');
  };

  const submitGuess = () => {
    if (!selectedEntity || !puzzle || phase !== 'playing') return;

    const nextGuessNumber = guessesUsed + 1;

    if (isCorrectGuess(selectedEntity.name, puzzle.candidate)) {
      const points = scoreForGuess(nextGuessNumber);
      setFinalScore(points);
      setWon(true);
      setGuessesUsed(nextGuessNumber);
      setPhase('revealed');
      return;
    }

    // Wrong guess: only counts if it's a real, different player. Guarding
    // against re-submitting the exact same wrong name twice in a row so a
    // slow double-click can't burn two guesses on one mistake.
    // Round 383: keyed through guessKey so the database's spelling and the
    // lineup's spelling of one man count as the same try.
    if (wrongGuesses.some(w => guessKey(w, puzzle.lineup) === guessKey(selectedEntity.name, puzzle.lineup))) {
      setErrorMsg('You already tried that name.');
      return;
    }

    setWrongGuesses(w => [...w, selectedEntity.name]);
    setGuessesUsed(nextGuessNumber);
    setInputValue('');
    setSelectedEntity(null);
    setErrorMsg('');

    if (nextGuessNumber >= MAX_GUESSES) {
      setFinalScore(0);
      setWon(false);
      setPhase('revealed');
    }
  };

  // Give Up: reveals the missing player and ends the round at 0, without
  // burning a guess slot (guessesUsed stays as-is so the stat line reads
  // honestly rather than claiming guesses that were never made).
  const giveUp = () => {
    if (phase !== 'playing') return;
    setFinalScore(0);
    setWon(false);
    setPhase('revealed');
  };

  const isComplete = phase === 'revealed';

  useGameCompletion('missing-xi', isComplete, finalScore, won ? 1 : 0);

  const emojiGrid = useMemo(() => {
    if (!puzzle) return '';
    return buildEmojiGrid(guessesUsed, won, puzzle.lineup);
  }, [puzzle, guessesUsed, won]);

  const currentHint = puzzle ? hintForLevel(hintLevel, puzzle.candidate, puzzle.lineup) : null;

  const resultHeadline = won
    ? finalScore === 100
      ? 'First guess! Perfect recall.'
      : 'Nice work, you found him.'
    : 'Missed it this time.';

  const outcomeEmoji = won ? (finalScore === 100 ? '⭐' : finalScore >= 70 ? '✅' : '🟢') : '❌';

  return (
    <>
      <PageSeo
        title="Missing XI | DoUKnowBall"
        description="A famous real starting lineup with one player blanked out. Name the missing man in 3 guesses or fewer. Daily puzzle plus an Unlimited archive of Champions League finals, World Cup finals and iconic title deciders."
        path="/missing-xi"
      />
      <GameShell help="none"
        width="wide"
        title="MISSING XI"
        subtitle="One player is missing from this famous lineup. Name him in 3 guesses."
        headerExtra={
          <>
            <RulesGate title="How to Play Missing XI">
              <section>
                <h3 className="font-bold text-foreground mb-2">⚽ The idea</h3>
                <p className="text-muted-foreground">
                  Every puzzle is a real starting XI from a famous match: a Champions League final, a World Cup
                  final, a Euros final, or an iconic league title decider. One player's tile shows "?" instead of
                  a name. Everyone else on the pitch is shown correctly.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">🔍 Guessing</h3>
                <p className="text-muted-foreground">
                  Search for the missing player by name. You get 3 guesses. Every wrong guess unlocks a new hint,
                  and hints never repeat what the card already tells you: for a club lineup you get the player's
                  nationality, for a national-team lineup you get the club they played for at the time. After
                  that, the first letter of their surname, then how many letters it has.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">🏆 Scoring</h3>
                <p className="text-muted-foreground">
                  100 points on your 1st guess, 70 on your 2nd, 40 on your 3rd. Miss all 3 and you score 0, with
                  the answer revealed.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">📅 Daily vs Unlimited</h3>
                <p className="text-muted-foreground">
                  Daily gives everyone the same lineup and the same blanked player each day. Unlimited pulls a
                  fresh lineup from the archive every time you play.
                </p>
              </section>
            </RulesGate>

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

            {playMode === 'daily' && (
              <p className="text-xs text-muted-foreground mt-3">Today's lineup, {getTodayET()}. Same puzzle for everyone.</p>
            )}
          </>
        }
      >
        {!puzzle && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {puzzle && (
          <div className="space-y-5">
            <div className="bg-surface-1 border border-border rounded-2xl p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {puzzle.lineup.competition}
              </p>
              <p className="text-xl md:text-2xl font-display font-bold text-foreground mb-1">
                {puzzle.lineup.dateLabel}
              </p>
              {/* Round 319, owner review ("flags or club colors for the two
                  sides"): each side's country flag rides the score line, in
                  the order the line itself names them. flagForClub returns ''
                  for an unknown club, so a miss skips the flag rather than
                  showing a wrong one. */}
              {(() => {
                const { team, opponent, scoreLine } = puzzle.lineup;
                const teamFirst = scoreLine.toLowerCase().startsWith(team.toLowerCase());
                const leftFlag = flagForClub(teamFirst ? team : opponent);
                const rightFlag = flagForClub(teamFirst ? opponent : team);
                return (
                  <p className="text-sm text-muted-foreground mb-1">
                    {leftFlag && <span className="mr-1.5">{leftFlag}</span>}
                    {scoreLine}
                    {rightFlag && <span className="ml-1.5">{rightFlag}</span>}
                  </p>
                );
              })()}
              <p className="text-xs text-muted-foreground">
                {puzzle.lineup.venue} · {puzzle.lineup.formationLabel} · Showing {puzzle.lineup.team}'s XI
              </p>
            </div>

            <MissingXiPitch puzzle={puzzle} revealed={phase === 'revealed'} />

            {phase === 'playing' && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  <span>
                    Guess {guessesUsed + 1} of {MAX_GUESSES}
                  </span>
                </div>

                {currentHint && (
                  <div className="bg-surface-2 border border-border/60 rounded-xl px-4 py-3 text-center animate-in fade-in">
                    <p className="text-sm font-semibold text-primary">💡 {currentHint}</p>
                  </div>
                )}

                {wrongGuesses.length > 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    Already tried: {wrongGuesses.join(', ')}
                  </p>
                )}

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
                  searchOptions={XI_SEARCH_OPTIONS}
                  localNames={XI_ROSTER_NAMES}
                  placeholder={`Who's the missing ${puzzle.lineup.slots[puzzle.candidate.slotIndex].position}?`}
                  validateOnly
                  autoFocus
                />
                {errorMsg && <p className="text-sm text-destructive text-center">{errorMsg}</p>}
                <button
                  onClick={submitGuess}
                  disabled={!selectedEntity}
                  className="w-full py-3.5 min-h-[44px] bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Lock in guess
                </button>
                <div className="flex justify-center">
                  <GiveUpButton onGiveUp={giveUp} />
                </div>
              </div>
            )}

            {phase === 'revealed' && (
              <div className="mt-4">
                <ResultScreen
                  won={won}
                  outcomeEmoji={outcomeEmoji}
                  headline={resultHeadline}
                  statLine={
                    <>
                      {won
                        ? `${puzzle.candidate.name} was the missing ${puzzle.lineup.slots[puzzle.candidate.slotIndex].position}. Solved in ${guessesUsed}/${MAX_GUESSES} guesses.`
                        : `The missing player was ${puzzle.candidate.name} (${puzzle.lineup.slots[puzzle.candidate.slotIndex].position}).`}
                      {/* One hand-verified flavor fact, only when the puzzle data
                          carries one. Never sources/citations, never invented. */}
                      {puzzle.candidate.fact && (
                        <span className="block text-muted-foreground text-sm mt-1">
                          💡 {puzzle.candidate.fact}
                        </span>
                      )}
                    </>
                  }
                  statRow={[{ label: 'Score', value: finalScore }]}
                  emojiGrid={emojiGrid}
                  share={{
                    score: String(finalScore),
                    gameName: `Missing XI - ${puzzle.lineup.dateLabel}`,
                    gamePath: '/missing-xi',
                  }}
                  onPlayAgain={() => startRun('unlimited')}
                  playAgainLabel={playMode === 'daily' ? 'Play Unlimited' : 'New Lineup'}
                />
              </div>
            )}
          </div>
        )}

        <AdBanner slot="1234567892" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="missing-xi" />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Missing XI: Guess the Famous Lineup's Missing Player"
          description="A real, famous starting XI from soccer history with one player blanked out. Name the missing man with escalating hints that never repeat what the card already shows. Champions League finals, World Cup finals, Euros finals and iconic title deciders."
          howToPlay={[
            'Read the match details and look at the pitch.',
            'One tile shows a position with no name.',
            'Search for and guess the missing player.',
            'Use the hints that unlock after each wrong guess.',
          ]}
        />
        <GameNav />
      </GameShell>
    </>
  );
};

/**
 * Renders the XI on a simple text-only pitch, reusing the same {x, y}
 * percentage-based absolute-positioning approach FORMATIONS uses in
 * squadDeal.ts (y=90 near the goalkeeper's own goal, y=16-24 in the
 * attacking third), so a shared pitch-layout convention exists across the
 * two games even though missingXi.ts defines its own slot type. No logos,
 * crests or photos: name tiles and flags-as-text only, matching the
 * sitewide no-IP-risk convention.
 */
function MissingXiPitch({ puzzle, revealed }: { puzzle: ActivePuzzle; revealed: boolean }) {
  const { lineup, candidate } = puzzle;
  return (
    <div className="relative w-full aspect-[3/4] max-w-md mx-auto rounded-2xl border-2 border-correct/40 bg-gradient-to-b from-correct/10 to-correct/5 overflow-hidden">
      {/* Simple pitch markings, purely decorative, no crests/logos. */}
      <div className="absolute inset-x-0 top-1/2 border-t border-correct/20" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-correct/20" />
      <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-1/2 h-[12%] border border-b-0 border-correct/20" />
      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-1/2 h-[12%] border border-t-0 border-correct/20" />

      {lineup.slots.map((slot, i) => {
        const isBlank = i === candidate.slotIndex;
        /* Round 319, owner review: bubbles overlapped. A fixed 26% tile is
           wider than the 18% gap between three centre backs, so neighbours
           in the same row painted over each other. The width now comes from
           the row itself: never wider than the nearest same-row neighbour's
           distance, with a floor so a name still fits. */
        const rowMates = lineup.slots.filter((s, j) => j !== i && Math.abs(s.y - slot.y) < 8);
        const minGap = rowMates.reduce((m, s) => Math.min(m, Math.abs(s.x - slot.x)), 100);
        const widthPct = Math.min(26, Math.max(15, minGap - 1));
        return (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5"
            style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${widthPct}%` }}
          >
            <div
              className={cn(
                'relative w-full rounded-lg px-1.5 py-1 text-center border shadow-sm',
                isBlank
                  ? revealed
                    ? 'bg-primary/20 border-primary animate-pop-correct'
                    : 'bg-destructive/10 border-destructive/50'
                  : 'bg-card border-border',
              )}
            >
              {/* Round 251: the pulse used to sit on the whole tile, which
                  dimmed the text with it (the contrast sweep measured the
                  position tag at 3.36 mid-pulse). The attention pulse now
                  lives on a background layer; the words hold still. */}
              {isBlank && !revealed && (
                <span aria-hidden="true" className="absolute inset-0 rounded-lg bg-destructive/15 animate-pulse pointer-events-none" />
              )}
              <p
                className={cn(
                  'text-[10px] md:text-xs font-bold leading-tight truncate',
                  isBlank && !revealed ? 'text-destructive' : 'text-foreground',
                )}
              >
                {isBlank ? (revealed ? candidate.name : '?') : slot.name}
              </p>
              {/* Round 215: the slot chips sit on the pitch tint, not on a
                  card, and the muted grey measured 3.97 there. One shade up
                  clears the bar on every slot state. */}
              <p className="text-[9px] md:text-[10px] text-[hsl(215,15%,68%)] uppercase tracking-wide">
                {slot.position}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MissingXi;
