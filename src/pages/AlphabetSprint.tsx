import { FlagImg } from '@/components/FlagImg';
import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Play, RotateCcw, SkipForward } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { fetchWhoAmIPool } from '@/lib/whoAmI';
import { recordCompletion, getCurrentPlayerName } from '@/lib/completions';

import {
  MODES,
  DEFAULT_MODE,
  STREAK_BONUS_EVERY,
  SprintModeId,
  SprintPlayer,
  modeById,
  buildSprintPool,
  playableLetters,
  drawLetter,
  resolveSprintGuess,
  pointsFor,
  distinctLettersNamed,
  sprintTier,
  SPRINT_TIER_LABEL,
  SPRINT_TIER_EMOJI,
} from '@/lib/alphabetSprint';

type Phase = 'boot' | 'error' | 'idle' | 'running' | 'done';

const BEST_KEY = 'alphabet_sprint_best_v1';

type BestMap = Record<SprintModeId, number>;

function loadBest(): BestMap {
  try {
    const raw = JSON.parse(localStorage.getItem(BEST_KEY) || '{}') as Partial<BestMap>;
    return {
      relaxed: Number(raw.relaxed) || 0,
      classic: Number(raw.classic) || 0,
      insane: Number(raw.insane) || 0,
    };
  } catch {
    return { relaxed: 0, classic: 0, insane: 0 };
  }
}

const AlphabetSprint = () => {
  const [phase, setPhase] = useState<Phase>('boot');
  const [pool, setPool] = useState<SprintPlayer[]>([]);
  const [playable, setPlayable] = useState<Set<string>>(() => new Set<string>());
  const [modeId, setModeId] = useState<SprintModeId>(DEFAULT_MODE);
  const [timeLeft, setTimeLeft] = useState(0);
  const [letter, setLetter] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [used, setUsed] = useState<Set<string>>(() => new Set<string>());
  const [named, setNamed] = useState<SprintPlayer[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastGain, setLastGain] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [best, setBest] = useState<BestMap>(() => loadBest());
  const inputRef = useRef<HTMLInputElement>(null);

  const boot = useCallback(async () => {
    setPhase('boot');
    const data = await fetchWhoAmIPool();
    const sprintPool = data ? buildSprintPool(data.pool) : [];
    if (sprintPool.length < 50) {
      setPhase('error');
      return;
    }
    setPool(sprintPool);
    setPlayable(playableLetters(sprintPool));
    setPhase('idle');
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  // The one countdown interval: created when a run starts, cleared when it ends.
  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(() => {
      setTimeLeft(t => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // Time up: close the run and persist a new personal best for this mode.
  useEffect(() => {
    if (phase !== 'running' || timeLeft > 0) return;
    setPhase('done');
    if (score > best[modeId]) {
      const next = { ...best, [modeId]: score };
      setBest(next);
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(next));
      } catch {
        /* private mode */
      }
    }
  }, [phase, timeLeft, score, best, modeId]);

  // Keep the box focused whenever a new letter lands.
  useEffect(() => {
    if (phase === 'running') inputRef.current?.focus();
  }, [phase, letter]);

  /* Round 299, the scoring audit: this page never recorded a play, so a
     finished sprint earned no streak day and no played-today credit. The end
     moment is the phase landing on 'done', which only happens when the clock
     hits zero (pool exhaustion also zeroes the clock). Once per run: the ref
     re-arms only when a new run enters 'running', so mount, the mode screen
     and result re-renders never record. Score is the run's points total, the
     same number the result headline and the share line show. */
  const recordedRef = useRef(false);
  useEffect(() => {
    if (phase === 'running') {
      recordedRef.current = false;
      return;
    }
    if (phase !== 'done' || recordedRef.current) return;
    recordedRef.current = true;
    recordCompletion('/alphabet-sprint', score, getCurrentPlayerName());
  }, [phase, score]);

  const start = (id: SprintModeId) => {
    const empty = new Set<string>();
    const first = drawLetter(pool, empty, playable, null);
    if (!first) return;
    setModeId(id);
    setUsed(empty);
    setNamed([]);
    setScore(0);
    setStreak(0);
    setLastGain(null);
    setFeedback(null);
    setInput('');
    setLetter(first);
    setTimeLeft(modeById(id).seconds);
    setPhase('running');
  };

  const pick = (p: SprintPlayer) => {
    if (phase !== 'running' || !letter || timeLeft <= 0) return;
    const nextUsed = new Set(used);
    nextUsed.add(p.name);
    const nextStreak = streak + 1;
    const gain = pointsFor(nextStreak);
    setUsed(nextUsed);
    setNamed(list => [...list, p]);
    setStreak(nextStreak);
    setScore(s => s + gain);
    setLastGain(gain);
    setFeedback(null);
    setInput('');
    const next = drawLetter(pool, nextUsed, playable, letter);
    if (next) setLetter(next);
    else setTimeLeft(0); // whole pool exhausted, which ends the run
  };

  const skip = () => {
    if (phase !== 'running' || !letter || timeLeft <= 0) return;
    setStreak(0);
    setLastGain(null);
    setFeedback(null);
    setInput('');
    const next = drawLetter(pool, used, playable, letter);
    if (next) setLetter(next);
    inputRef.current?.focus();
  };

  // Free-typed submission (owner: "they can just put two letters and the
  // suggestion gives them the answer; make them spell out the name"). There is
  // no autocomplete during play anymore: the typed text resolves only on
  // submit, via resolveSprintGuess (full name, or a bare surname when it is
  // unambiguous). Ambiguity asks for the full name WITHOUT listing candidates.
  const submit = () => {
    if (phase !== 'running' || !letter || timeLeft <= 0) return;
    if (input.trim().length < 2) return;
    const outcome = resolveSprintGuess(pool, letter, input, used);
    if (outcome.kind === 'hit') {
      pick(outcome.player);
    } else if (outcome.kind === 'ambiguous') {
      setFeedback('Which one? Type the full name.');
    } else {
      setFeedback(`That doesn't match an unused "${letter}" surname. Check the spelling or skip.`);
    }
  };

  const mode = modeById(modeId);
  const isNewBest = score > 0 && score >= best[modeId];
  const timePct = mode.seconds > 0 ? Math.max(0, Math.min(100, (timeLeft / mode.seconds) * 100)) : 0;
  const lettersNamed = distinctLettersNamed(named);
  const tier = sprintTier(lettersNamed, playable.size);
  const tierLine = tier ? `${SPRINT_TIER_EMOJI[tier]} ${SPRINT_TIER_LABEL[tier]}` : null;
  const emojiGrid = `🔠 Alphabet Sprint ${mode.label}: ${score} pts, ${named.length} players in ${mode.seconds}s${tierLine ? ` ${tierLine}` : ''}${isNewBest ? ' 🏅 new best' : ''}`;

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <main id="dukb-main" className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="Alphabet Sprint | DoUKnowBall"
        description="A letter appears, you name a real footballer whose surname starts with it. 60 seconds, streak bonuses, no repeats. How many can you rattle off?"
        path="/alphabet-sprint"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-[0.08em] text-primary font-display mb-1">
            ALPHABET SPRINT
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            A letter drops, you name a player whose surname starts with it. Beat the clock.
          </p>
          {best[modeId] > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Best ({mode.label}) <span className="text-primary font-bold">{best[modeId]}</span>
            </p>
          )}
        </header>

        {phase === 'boot' && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load the player pool right now.</p>
            <button onClick={boot} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold">
              Try again
            </button>
          </div>
        )}

        {phase === 'idle' && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-center font-bold text-foreground mb-1">Pick your pace</h2>
            <p className="text-center text-xs text-muted-foreground mb-4">
              +1 per player, +1 bonus every {STREAK_BONUS_EVERY} in a row. Skips only cost time, but they restart the streak.
            </p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setModeId(m.id)}
                  className={cn(
                    'rounded-xl border p-3 text-center transition-colors',
                    m.id === modeId ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/40'
                  )}
                >
                  <div className="font-bold text-foreground">{m.label}</div>
                  <div className="text-2xl font-bold text-primary font-display">{m.seconds}s</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{m.tagline}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Best <span className="text-primary font-semibold">{best[m.id]}</span>
                  </div>
                </button>
              ))}
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 mb-5 max-w-sm mx-auto list-disc list-inside">
              <li>Spell the player's name and hit Enter. No suggestions. You have to know it.</li>
              <li>A bare surname works if only one player fits; otherwise type the full name.</li>
              <li>Surname counts, so Kylian Mbappe answers M, not K.</li>
              <li>Each player can only be used once per run.</li>
              <li>Rare letters with too few players never come up.</li>
            </ul>
            <div className="flex justify-center">
              <button
                onClick={() => start(modeId)}
                className="inline-flex items-center gap-2 px-10 py-3.5 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
              >
                <Play className="w-5 h-5" /> Start {mode.seconds}s run
              </button>
            </div>
          </div>
        )}

        {phase === 'running' && letter && (
          <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
            <div className="flex items-center justify-between mb-2 text-sm">
              <div className={cn('font-bold font-display text-2xl', timeLeft <= 10 ? 'text-destructive' : 'text-foreground')}>
                {timeLeft}s
              </div>
              <div className="text-muted-foreground">
                Streak <span className="text-foreground font-bold">{streak}</span>
              </div>
              <div className="font-bold text-2xl text-primary font-display">
                {score}
                {lastGain !== null && (
                  <span className="text-xs align-top ml-1 text-correct font-semibold">+{lastGain}</span>
                )}
              </div>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-5">
              <div
                className={cn('h-full rounded-full transition-all duration-1000 ease-linear', timeLeft <= 10 ? 'bg-destructive' : 'bg-primary')}
                style={{ width: `${timePct}%` }}
              />
            </div>

            <div className="text-center mb-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Surname starts with</div>
              <div className="text-7xl md:text-8xl font-bold text-primary font-display leading-none">{letter}</div>
            </div>

            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  setFeedback(null);
                }}
                onKeyDown={onInputKeyDown}
                placeholder={`Spell out a "${letter}" surname player...`}
                aria-label="Type a player surname"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground/60 focus:border-primary"
              />
              <button
                type="button"
                onClick={submit}
                disabled={input.trim().length < 2}
                className="shrink-0 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
            {feedback && (
              <p className="mt-2 text-xs text-muted-foreground text-center">{feedback}</p>
            )}

            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">{named.length} named</span>
              <button
                onClick={skip}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-foreground rounded-full font-semibold text-sm hover:bg-secondary/70 transition-colors"
              >
                <SkipForward className="w-4 h-4" /> Skip letter
              </button>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <div className="text-4xl mb-2">
              {tier === 'gold' ? '🥇' : tier === 'silver' ? '🥈' : tier === 'bronze' ? '🥉' : score >= 6 ? '👏' : '🐢'}
            </div>
            <h2 className="text-2xl font-bold text-primary font-display mb-1">
              {tier ? `${SPRINT_TIER_EMOJI[tier]} ${SPRINT_TIER_LABEL[tier]}: ${score} pts` : `${score} pts in ${mode.seconds}s`}
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              {named.length} player{named.length === 1 ? '' : 's'} named across {lettersNamed} letter{lettersNamed === 1 ? '' : 's'} on {mode.label}.{' '}
              {tier === 'gold'
                ? 'Every playable letter covered. The alphabet fears you.'
                : tier === 'silver'
                ? 'Silver tier. That is strong letter coverage, push for gold next run.'
                : tier === 'bronze'
                ? 'Bronze tier. Solid spread across the alphabet, keep going.'
                : isNewBest
                ? 'New personal best. The alphabet fears you.'
                : best[modeId] > 0
                ? `Your best is ${best[modeId]}. One more go?`
                : 'Everyone starts somewhere.'}
            </p>

            {named.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                {named.map(p => (
                  <span
                    key={p.name}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-xs text-foreground"
                  >
                    <FlagImg name={p.nationality} size={16} /> {p.name}
                  </span>
                ))}
              </div>
            )}

            <pre className="text-sm tracking-wide whitespace-pre-wrap mb-2">{emojiGrid}</pre>
            <ShareButtons
              score={tier ? `${score} (${SPRINT_TIER_LABEL[tier]})` : String(score)}
              gameName="Alphabet Sprint"
              gamePath="/alphabet-sprint"
              emojiGrid={emojiGrid}
            />
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              <button
                onClick={() => start(modeId)}
                className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="w-4 h-4" /> Run it back
              </button>
              <button
                onClick={() => setPhase('idle')}
                className="inline-flex items-center gap-2 px-8 py-3 bg-secondary text-foreground rounded-full font-semibold hover:bg-secondary/70 transition-colors"
              >
                Change pace
              </button>
            </div>
          </div>
        )}

        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="alphabet-sprint" />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Alphabet Sprint: Name a Footballer for Every Letter"
          description="A quickfire football trivia race. Random letters appear, weighted by how many real players carry them, and you name anyone whose surname starts with the letter before the clock runs out. Streak bonuses reward five in a row, skips are free but reset the streak, and every player can only be used once per run."
          howToPlay={[
            'Pick a pace: Relaxed 75s, Classic 45s or Insane 20s.',
            'A big letter appears. Spell out a player whose surname starts with it and press Enter.',
            'A bare surname is accepted when it can only mean one player; if not, type the full name.',
            'Each pick is +1, with +1 bonus on every 5th in a row. Skips cost nothing but time.',
            'Every player can only be named once per run. Best score per mode is saved on this device.',
          ]}
          examples={[
            'Letter M? Mbappe, Messi and Modric are all fair game.',
            'Letters like Q, X and Z never come up, because almost nobody has them.',
          ]}
        />
        <GameNav />
      </div>
    </main>
  );
};

export default AlphabetSprint;
