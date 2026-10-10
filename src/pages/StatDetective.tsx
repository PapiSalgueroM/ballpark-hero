import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Loader2,
  RotateCcw,
  Check,
  X,
  Lock,
  Lightbulb,
  Fingerprint,
  Search,
} from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import {
  Difficulty,
  GuessFeedback,
  MysterySeason,
  PlayerProfile,
  StatDetectiveData,
  GUESS_LIMIT,
  RECORDED_PROFILE_SCOPE,
  STARS_MIN_RATING,
  DEEP_MIN_RATING,
  DEEP_MAX_RATING,
  buildShareGrid,
  careerSpan,
  decadeLabel,
  evaluateGuess,
  fetchStatDetectiveData,
  hintsFor,
  normalizeName,
  pickMystery,
  statChips,
  suggestProfiles,
} from '@/lib/statDetective';
import { recordCompletion, getCurrentPlayerName } from '@/lib/completions';
import motion from './StatDetective.module.css';

type Phase = 'boot' | 'error' | 'pick' | 'playing' | 'done';
type Feedback = { name: string; correct: boolean; clues: string[]; terminal: boolean };

const CLUE_RULES = 'Clues unlock after each of the first six misses when a career profile is available. Without that profile, they unlock after misses 2, 4, 5 and 6.';
const WORKED_EXAMPLE = 'Example: a Shared franchise chip means your guess played for the mystery team at some point. After a miss, read the new clue and try another name.';

const DIFF_META: Record<Difficulty, { label: string; blurb: string }> = {
  stars: {
    label: 'Stars',
    blurb: `Big names having big seasons. Season rating ${STARS_MIN_RATING} or higher.`,
  },
  deep: {
    label: 'Deep Cuts',
    blurb: `Starters, sixth men and cult heroes. Season rating ${DEEP_MIN_RATING} to ${DEEP_MAX_RATING}.`,
  },
};

const StatDetective = () => {
  const [phase, setPhase] = useState<Phase>('boot');
  const [data, setData] = useState<StatDetectiveData | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('stars');
  const [mystery, setMystery] = useState<MysterySeason | null>(null);
  const [guesses, setGuesses] = useState<GuessFeedback[]>([]);
  const [won, setWon] = useState(false);
  const [query, setQuery] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const focusRequest = useRef<'search' | 'result' | null>(null);
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useLayoutEffect(() => {
    const target = focusRequest.current === 'result' ? resultRef.current : focusRequest.current === 'search' ? searchRef.current : null;
    if (!target) return;
    focusRequest.current = null;
    target.focus({ preventScroll: true });
  }, [phase, guesses.length, mystery?.key]);

  const boot = useCallback(async () => {
    setPhase('boot');
    try {
      const d = await fetchStatDetectiveData();
      if (!d) {
        setPhase('error');
        return;
      }
      setData(d);
      setPhase('pick');
    } catch {
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  const startRound = useCallback(
    (diff: Difficulty) => {
      if (!data) return;
      const m = pickMystery(data.pools[diff], lastKeyRef.current ?? undefined);
      if (!m) {
        setPhase('error');
        return;
      }
      lastKeyRef.current = m.key;
      setDifficulty(diff);
      setMystery(m);
      setGuesses([]);
      setWon(false);
      setQuery('');
      setFeedback(null);
      focusRequest.current = 'search';
      setPhase('playing');
    },
    [data]
  );

  const guessedKeys = useMemo(() => new Set(guesses.map(g => normalizeName(g.name))), [guesses]);

  const suggestions = useMemo(
    () => (phase === 'playing' && data ? suggestProfiles(data.profiles, query, guessedKeys) : []),
    [phase, data, query, guessedKeys]
  );

  const submitGuess = (p: PlayerProfile) => {
    if (phase !== 'playing' || !mystery) return;
    if (guessedKeys.has(normalizeName(p.name))) return;
    const fb = evaluateGuess(p, mystery);
    const next = [...guesses, fb];
    const profile = data?.profiles.find(pr => normalizeName(pr.name) === normalizeName(mystery.player));
    const beforeMisses = guesses.filter(g => !g.isCorrect).length;
    const knownClues = hintsFor(mystery, beforeMisses, profile);
    const newClues = hintsFor(mystery, beforeMisses + (fb.isCorrect ? 0 : 1), profile)
      .filter(hint => !knownClues.some(known => known.label === hint.label)).map(hint => hint.label);
    const terminal = fb.isCorrect || next.length >= GUESS_LIMIT;
    setGuesses(next);
    setQuery('');
    setFeedback({ name: fb.name, correct: fb.isCorrect, clues: newClues, terminal });
    focusRequest.current = terminal ? 'result' : 'search';
    if (fb.isCorrect) {
      setWon(true);
      setPhase('done');
    } else if (next.length >= GUESS_LIMIT) {
      setWon(false);
      setPhase('done');
    }
  };

  /* Round 299, the scoring audit: this page never recorded a play, so a
     closed case earned no streak day, no played-today credit and no points.
     A round ends when submitGuess moves the phase to done, won or not. The
     ref arms on each new round (phase back to playing) so New case can
     record again, and fires exactly once per round. No score on purpose:
     the result shown is a guess count out of eight where lower is better,
     and a loss has no number at all, so a raw guess count would rank
     backwards in the max-scored leaderboard. */
  const completionRef = useRef(false);
  useEffect(() => {
    if (phase === 'playing') completionRef.current = false;
    if (phase !== 'done' || completionRef.current) return;
    completionRef.current = true;
    recordCompletion('/stat-detective', undefined, getCurrentPlayerName());
  }, [phase]);

  const misses = guesses.filter(g => !g.isCorrect).length;
  const mysteryProfile = useMemo(
    () => (mystery && data ? data.profiles.find(pr => normalizeName(pr.name) === normalizeName(mystery.player)) : undefined),
    [mystery, data],
  );
  const hints = mystery ? hintsFor(mystery, misses, mysteryProfile) : [];
  const upcomingHint = mystery ? Array.from({ length: GUESS_LIMIT - misses }, (_, index) => misses + index + 1)
    .find(count => hintsFor(mystery, count, mysteryProfile).length > hints.length) ?? null : null;
  const chips = mystery ? statChips(mystery) : [];
  const score = `${won ? guesses.length : 'X'}/${GUESS_LIMIT} (${DIFF_META[difficulty].label})`;
  const emojiGrid = buildShareGrid(guesses);

  const feedbackChip = (tone: 'good' | 'mid' | 'off', icon: ReactNode, text: string) => (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border',
        tone === 'good' && 'text-correct border-correct/50 bg-correct/10',
        tone === 'mid' && 'text-primary border-primary/50 bg-primary/10',
        tone === 'off' && 'text-muted-foreground border-border bg-secondary'
      )}
    >
      {icon}
      {text}
    </span>
  );

  return (
    <main id="dukb-main" className="min-h-screen bg-background">
      <GameNavbar />
      <div className="relative z-10 mx-auto w-full max-w-4xl">
        <HowToPlayPopover title="Stat Detective rules" className="min-h-[44px] min-w-[44px]">
          <p>Study the era, position and per 36 minute stat line. Type at least two letters and pick a player. You have eight guesses.</p>
          <p>A miss tells you whether your guess shares a franchise with the mystery player.</p>
          <p>{CLUE_RULES}</p>
          <p>{RECORDED_PROFILE_SCOPE}</p>
          <p>{WORKED_EXAMPLE}</p>
        </HowToPlayPopover>
      </div>
      <PageSeo
        title="Stat Detective NBA: Guess the Player from the Stat Line | DoUKnowBall"
        description="A real NBA season with the name removed: era, position and per 36 numbers. Crack the case in eight guesses with feedback clues after every miss. Free, no sign-up."
        path="/stat-detective"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-[0.08em] text-primary font-display mb-1">
            STAT DETECTIVE
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            One anonymized NBA season. Eight guesses. Name the player.
          </p>
        </header>

        {phase === 'boot' && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't open the case files right now.</p>
            <button onClick={boot} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold">
              Try again
            </button>
          </div>
        )}

        {phase === 'pick' && data && (
          <>
          <div className="bg-card border border-border rounded-2xl p-4 mb-4 text-sm text-muted-foreground space-y-2">
            <p>Study the stat line, then type at least two letters and pick a player. You have eight guesses.</p>
            <p>{CLUE_RULES}</p>
            <p>{RECORDED_PROFILE_SCOPE}</p>
            <p>{WORKED_EXAMPLE}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(['stars', 'deep'] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => startRound(d)}
                className="bg-card border border-border rounded-2xl p-5 text-left hover:border-primary/60 transition-colors"
              >
                <div className="font-bold text-primary font-display text-xl mb-1">{DIFF_META[d].label}</div>
                <p className="text-sm text-muted-foreground mb-2">{DIFF_META[d].blurb}</p>
                <p className="text-xs text-muted-foreground">
                  {data.pools[d].length.toLocaleString()} case files
                </p>
              </button>
            ))}
          </div>
          </>
        )}

        {(phase === 'playing' || phase === 'done') && mystery && (
          <>
            <div className="bg-card border border-border rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Fingerprint className="w-3.5 h-3.5" />
                  Case file · {DIFF_META[difficulty].label}
                </div>
                <div className="text-xs text-muted-foreground">
                  Guesses <span className="text-primary font-bold">{guesses.length}</span>/{GUESS_LIMIT}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold">
                  Era: {decadeLabel(mystery.decade)}
                </span>
                <span className="px-3 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold">
                  Position: {mystery.position}
                </span>
              </div>

              <div className="flex gap-2 mb-3">
                {chips.map(c => (
                  <div key={c.label} className="flex-1 min-w-0 bg-secondary rounded-xl py-3 text-center">
                    <div className="text-lg md:text-2xl font-bold font-display text-foreground">{c.value}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Per 36 minutes, from season totals over {Math.round(mystery.minutes).toLocaleString()} minutes played.
                {mystery.stl == null && ' Steals and blocks were not tracked in this era.'}
              </p>
            </div>

            {(hints.length > 0 || (phase === 'playing' && upcomingHint != null)) && (
              <div className="bg-card border border-border rounded-2xl p-4 mb-4">
                <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Clues
                </div>
                {mysteryProfile && <p data-stat-profile-scope className="text-xs text-muted-foreground mb-2">{RECORDED_PROFILE_SCOPE}</p>}
                {hints.map(h => (
                  <p key={h.label} data-stat-clue={h.label} data-stat-feedback={feedback?.clues.includes(h.label) ? 'clue' : undefined}
                    className={cn('text-sm text-foreground', motion.text, feedback?.clues.includes(h.label) && motion.clue)}>
                    {h.label}: <span className="font-bold text-primary">{h.value}</span>
                  </p>
                ))}
                {phase === 'playing' && upcomingHint != null && (
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
                    <Lock className="w-3 h-3" />
                    Next clue unlocks after miss {upcomingHint}
                  </p>
                )}
              </div>
            )}

            {phase === 'playing' && (
              <div className="relative mb-4" onFocus={() => setInputFocused(true)} onBlur={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setInputFocused(false);
              }}>
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && suggestions.length > 0) {
                        e.preventDefault();
                        submitGuess(suggestions[0]);
                      }
                    }}
                    placeholder="Who is it? Type 2+ letters..."
                    aria-label="Guess the mystery player"
                    className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {inputFocused && suggestions.length > 0 && (
                  <ul className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl overflow-hidden shadow-lg">
                    {suggestions.map(p => (
                      <li key={p.name}>
                        <button
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => submitGuess(p)}
                          className={cn('w-full text-left px-4 py-2.5 hover:bg-secondary transition-colors', motion.option)}
                        >
                          <span className="font-semibold text-foreground">{p.name}</span>
                          <span title="Career span, season end years" className="text-xs text-muted-foreground ml-2">{careerSpan(p)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {guesses.length > 0 && (
              <div className="space-y-2 mb-4" role="log" aria-label="Guesses" aria-live="polite" aria-relevant="additions">
                {[...guesses].reverse().map((g, i) => (
                  <div
                    key={g.name}
                    data-stat-guess={g.name}
                    data-stat-feedback={feedback?.name === g.name ? (feedback.correct ? 'correct' : 'wrong') : undefined}
                    className={cn(
                      'bg-card border rounded-xl px-4 py-3',
                      g.isCorrect ? 'border-correct' : 'border-border',
                      feedback?.name === g.name && (feedback.correct ? motion.correct : motion.wrong)
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={cn('font-bold text-foreground', motion.text)}>{g.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">#{guesses.length - i}</span>
                    </div>
                    {g.isCorrect ? (
                      <div>{feedbackChip('good', <Check className="w-3 h-3" />, 'That is the player')}</div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {/* Era and position feedback removed: the case file already shows the
                            mystery's era and position, so those chips only repeated known info
                            (owner feedback). Franchise overlap is a real, non-given clue, kept. */}
                        {g.sharedFranchise
                          ? feedbackChip('good', <Check className="w-3 h-3" />, 'Shared franchise')
                          : feedbackChip('off', <X className="w-3 h-3" />, 'No shared franchise')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {phase === 'done' && (
              <div ref={resultRef} role="group" aria-labelledby="stat-detective-result" tabIndex={-1}
                data-stat-result={won ? 'won' : 'lost'} data-stat-feedback={feedback?.terminal ? 'result' : undefined}
                className={cn('bg-card border border-border rounded-2xl p-6 text-center mt-2', motion.resultCard, feedback?.terminal && motion.result)}>
                <h2
                  id="stat-detective-result"
                  className={cn(
                    'text-2xl font-bold font-display mb-1',
                    won ? 'text-correct' : 'text-destructive'
                  )}
                >
                  {won ? 'Case closed' : 'The trail went cold'}
                </h2>
                <p className="text-lg font-bold text-primary mb-0.5">{mystery.player}</p>
                <p className="text-sm text-muted-foreground mb-3">
                  {mystery.season} · {mystery.teamName} · {mystery.position}
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  {won
                    ? guesses.length <= 2
                      ? 'Elite detective work.'
                      : guesses.length <= 5
                      ? 'Solid sleuthing.'
                      : 'Cracked it with the case about to close.'
                    : 'Eight guesses, no name. It happens to the best detectives.'}
                </p>
                {emojiGrid && <pre className="text-sm tracking-wide whitespace-pre-wrap mb-2">{emojiGrid}</pre>}
                <ShareButtons
                  score={score}
                  gameName="Stat Detective (NBA)"
                  gamePath="/stat-detective"
                  emojiGrid={emojiGrid}
                />
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  <button
                    onClick={() => startRound(difficulty)}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
                  >
                    <RotateCcw className="w-4 h-4" /> New case
                  </button>
                  <button
                    onClick={() => setPhase('pick')}
                    className="px-6 py-3 bg-secondary text-foreground rounded-full font-semibold hover:bg-secondary/70 transition-colors"
                  >
                    Switch difficulty
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="stat-detective" gameContext={{
            puzzleId: mystery?.key ?? null, player: mystery?.player ?? null,
            season: mystery?.season ?? null, team: mystery?.team ?? null,
            difficulty, phase, guesses: guesses.map(guess => guess.name),
            profileScope: 'career-span-every-season-on-file',
            recordedSeasons: mysteryProfile ? careerSpan(mysteryProfile) : null,
          }} />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Stat Detective: Guess the NBA Player from an Anonymized Stat Line"
          description="Every case file is a real NBA season pulled from the record books, stripped down to its era, position and per 36 minute numbers. Read the line, work the clues and name the player within eight guesses. Each miss tells you whether your guess shares a franchise with the mystery player, and extra clues unlock as the misses pile up. Play Stars mode for famous seasons or Deep Cuts for the connoisseur pool."
          howToPlay={[
            'Pick a difficulty: Stars for famous seasons, Deep Cuts for rotation players.',
            'Study the case file: decade, position and the per 36 minute stat line.',
            'Type 2 or more letters and pick a player from the suggestions.',
            'Wrong guesses tell you whether the player shares a franchise with the mystery player.',
            CLUE_RULES,
            RECORDED_PROFILE_SCOPE,
          ]}
          examples={[
            'A 1980s point guard with 11 assists per 36 narrows things down fast.',
            'Shared franchise means your guess played for the mystery team at some point.',
          ]}
        />
        <GameNav />
      </div>
    </main>
  );
};

export default StatDetective;
