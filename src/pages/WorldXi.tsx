import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Play, RotateCcw, Timer, Trophy, Shuffle, Sparkles } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { StatTile } from '@/components/game/StatTile';
import { FORMATIONS, Formation } from '@/lib/squadDeal';
import { flagFor, shortName, fmtCompactUsd } from '@/lib/dealPlayers';
import {
  WxPlayer,
  WorldXiData,
  TimerMode,
  TIMER_MODES,
  fetchWorldXiPool,
  drawCountries,
  suggestCountryPlayers,
  fitsSlot,
  allowedLabel,
  wrongPositionMessage,
  displayCountry,
  shuffle,
  respinSlotCountry,
  simulateWorldXiSeason,
  SeasonReport,
  ordinal,
} from '@/lib/worldXi';
import { computeChemistry, formatChemistry } from '@/lib/chemistry';
import { SlotReel } from '@/components/world-xi/SlotReel';

type Phase = 'boot' | 'error' | 'setup' | 'playing' | 'won' | 'lost';

// Slot-machine reel durations. The reel decelerates like a real machine, so it
// needs enough runway to read as a spin; timed modes get a shorter one so the
// clock is not eaten by animation (11 reveals per run).
const SPIN_MS = 1500;
const SPIN_MS_TIMED = 1000;

const WorldXi = () => {
  const [phase, setPhase] = useState<Phase>('boot');
  const [data, setData] = useState<WorldXiData | null>(null);
  const [formation, setFormation] = useState<Formation>(FORMATIONS[0]);
  const [timerMode, setTimerMode] = useState<TimerMode>(TIMER_MODES[0]);
  const [countries, setCountries] = useState<string[]>([]); // country per slot index
  const [playOrder, setPlayOrder] = useState<number[]>([]); // shuffled slot indices
  const [step, setStep] = useState(0);
  const [filled, setFilled] = useState<(WxPlayer | null)[]>([]);
  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spinKey, setSpinKey] = useState(0); // bumping this starts a SlotReel spin
  const [reelGlimpse, setReelGlimpse] = useState<string>(''); // country under the payline mid-spin
  const [seasonReport, setSeasonReport] = useState<SeasonReport | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevStepRef = useRef<number>(-1);
  const reducedMotionRef = useRef<boolean>(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  const boot = useCallback(async () => {
    setPhase('boot');
    try {
      const pool = await fetchWorldXiPool();
      if (!pool) {
        setPhase('error');
        return;
      }
      setData(pool);
      setPhase('setup');
    } catch {
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  const start = useCallback(() => {
    if (!data) return;
    const drawn = drawCountries(formation, data);
    if (!drawn) {
      setFeedback('Could not build a fair draw for that formation. Try another one.');
      return;
    }
    setCountries(drawn);
    setPlayOrder(shuffle(formation.slots.map((_, i) => i)));
    setFilled(new Array<WxPlayer | null>(formation.slots.length).fill(null));
    setStep(0);
    setQuery('');
    setFeedback(null);
    setTimeLeft(timerMode.seconds);
    prevStepRef.current = -1; // so the first slot of a replay spins too
    setPhase('playing');
  }, [data, formation, timerMode]);

  // Countdown tick (only in timed modes while playing).
  useEffect(() => {
    if (phase !== 'playing' || timerMode.seconds === 0) return;
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [phase, timerMode]);

  // Out of time ends the run.
  useEffect(() => {
    if (phase === 'playing' && timerMode.seconds > 0 && timeLeft <= 0) setPhase('lost');
  }, [phase, timerMode, timeLeft]);

  // Keep the input focused as slots advance.
  useEffect(() => {
    if (phase === 'playing') inputRef.current?.focus();
  }, [phase, step]);

  // Slot-machine reveal: whenever a new slot comes up during play, run the
  // SlotReel (a real decelerating reel, not a flicker) before the nation
  // locks in. Skipped entirely under prefers-reduced-motion: the spin never
  // starts and the slot just shows its landed values immediately.
  useEffect(() => {
    if (phase !== 'playing' || step === prevStepRef.current) return;
    prevStepRef.current = step;
    if (reducedMotionRef.current) {
      setSpinning(false);
      return;
    }
    setSpinning(true);
    setSpinKey(k => k + 1);
  }, [phase, step]);

  // Reset the season report whenever a new run starts.
  useEffect(() => {
    if (phase === 'playing') setSeasonReport(null);
  }, [phase]);

  const slotIndex = phase === 'playing' && step < playOrder.length ? playOrder[step] : -1;
  const slot = slotIndex >= 0 ? formation.slots[slotIndex] : null;
  const country = slotIndex >= 0 ? countries[slotIndex] : '';

  const usedNames = useMemo(
    () => new Set(filled.filter((p): p is WxPlayer => p !== null).map(p => p.name)),
    [filled],
  );
  const suggestions = useMemo(
    () => (data && slot && country ? suggestCountryPlayers(data, country, query, usedNames) : []),
    [data, slot, country, query, usedNames],
  );

  const filledCount = filled.filter(Boolean).length;
  const timedOut = timerMode.seconds > 0 && timeLeft <= 0;

  const pick = (p: WxPlayer) => {
    if (phase !== 'playing' || !slot || slotIndex < 0) return;
    if (!fitsSlot(p, slot)) {
      setFeedback(wrongPositionMessage(p, slot));
      return;
    }
    const next = [...filled];
    next[slotIndex] = p;
    setFilled(next);
    setQuery('');
    setFeedback(null);
    if (step + 1 >= playOrder.length) setPhase('won');
    else setStep(s => s + 1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault();
      pick(suggestions[0]);
    }
  };

  const playAgain = () => {
    setCountries([]);
    setPlayOrder([]);
    setFilled([]);
    setStep(0);
    setQuery('');
    setFeedback(null);
    setSeasonReport(null);
    setPhase('setup');
  };

  // Unlimited nation respins: rerolls only the current slot's country, any
  // number of times, before a player is picked for it. No penalty, no cap.
  // Every respin runs the same slot-machine reel as the initial reveal.
  const respin = () => {
    if (phase !== 'playing' || !data || slotIndex < 0 || spinning) return;
    const next = respinSlotCountry(formation, data, slotIndex, countries);
    if (next === countries[slotIndex]) return;
    const updated = [...countries];
    updated[slotIndex] = next;
    setCountries(updated);
    setQuery('');
    setFeedback(null);
    if (reducedMotionRef.current) return;
    setSpinning(true);
    setSpinKey(k => k + 1);
  };

  const simulateSeason = () => {
    const players = filled.filter((p): p is WxPlayer => p !== null);
    if (players.length === 0) return;
    setSeasonReport(simulateWorldXiSeason(players, formation.name));
  };

  const squadValue = filled.reduce((sum, p) => sum + (p ? p.value : 0), 0);
  const chemistry = useMemo(
    () =>
      computeChemistry(
        filled
          .filter((p): p is WxPlayer => p !== null)
          .map(p => ({ name: p.name, club: p.club, nationality: p.country })),
      ),
    [filled],
  );
  const flagRow = countries.map(c => flagFor(c)).join('');
  const emojiGrid = [
    `🌍 World XI ${formation.name}${timerMode.seconds > 0 ? ' ⏱️ ' + timerMode.label : ''}`,
    flagRow,
    `${filledCount}/11 nations covered`,
  ].join('\n');

  const pitchView = (
    <div
      className="relative w-full max-w-md mx-auto rounded-2xl border border-border overflow-hidden"
      style={{ aspectRatio: '3 / 4', background: 'linear-gradient(to top, hsl(var(--secondary)) 0%, hsl(var(--card)) 100%)' }}
    >
      <div className="absolute inset-x-0 top-1/2 h-px bg-border/40" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-border/40" />
      {formation.slots.map((s, i) => {
        const p = filled[i] ?? null;
        const isActive = phase === 'playing' && i === slotIndex;
        return (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: s.x + '%', top: s.y + '%' }}
          >
            <div
              className={cn(
                'w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 transition-all',
                p || isActive ? 'text-base' : 'text-[9px] font-bold',
                p
                  ? 'bg-primary text-primary-foreground border-primary'
                  : isActive
                  ? 'bg-accent border-primary animate-pulse'
                  : 'bg-card border-border text-muted-foreground',
                isActive && spinning && 'animate-slot-spin',
              )}
            >
              {p
                ? flagFor(p.country)
                : isActive
                ? flagFor(spinning && reelGlimpse ? reelGlimpse : country)
                : s.label}
            </div>
            <span className="mt-0.5 text-[9px] font-semibold text-foreground/80 max-w-[64px] truncate text-center">
              {p ? shortName(p.name) : isActive ? '?' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="World XI: Build a Squad From 11 Random Nations | DoUKnowBall"
        description="Pick a formation, draw 11 random countries, and name a real footballer from each nation who fits the position. Optional 90 or 60 second timer. Free, no sign-up."
        path="/world-xi"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-[0.08em] text-primary font-display mb-1">
            WORLD XI
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Eleven random nations, one squad. Name a player from each country who fits the slot.
          </p>
        </header>

        {phase === 'boot' && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load the player database right now.</p>
            <button onClick={boot} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold">
              Try again
            </button>
          </div>
        )}

        {phase === 'setup' && data && (
          <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Formation</h2>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {FORMATIONS.map(f => (
                <button
                  key={f.name}
                  onClick={() => setFormation(f)}
                  className={cn(
                    'px-2 py-2.5 rounded-xl border font-bold text-sm transition-all',
                    formation.name === f.name
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary/40 text-foreground border-border hover:border-primary/40',
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>

            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Timer</h2>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {TIMER_MODES.map(m => (
                <button
                  key={m.key}
                  onClick={() => setTimerMode(m)}
                  className={cn(
                    'px-2 py-2.5 rounded-xl border transition-all',
                    timerMode.key === m.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary/40 text-foreground border-border hover:border-primary/40',
                  )}
                >
                  <span className="block font-bold text-sm">{m.label}</span>
                  <span className={cn('block text-[10px]', timerMode.key === m.key ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                    {m.hint}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center mb-4">
              {data.countries.length} nations are in the draw. Each of your 11 slots gets a different one.
            </p>
            {feedback && <p className="text-destructive text-sm text-center mb-3">{feedback}</p>}
            <button
              onClick={start}
              className="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-full font-bold hover:opacity-90 transition-opacity"
            >
              <Play className="w-4 h-4" /> Draw my 11 nations
            </button>
          </div>
        )}

        {phase === 'playing' && slot && country && (
          <>
            <div className="flex items-center justify-between mb-3 text-sm">
              <span className="text-muted-foreground">
                Filled <span className="text-primary font-bold">{filledCount}</span>/11
              </span>
              {timerMode.seconds > 0 && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 font-bold',
                    timeLeft <= 10 ? 'text-destructive' : 'text-primary',
                  )}
                >
                  <Timer className="w-4 h-4" /> {Math.max(0, timeLeft)}s
                </span>
              )}
              <button onClick={() => setPhase('lost')} className="text-xs text-muted-foreground underline hover:text-foreground">
                Give up
              </button>
            </div>

            {pitchView}

            <div className="bg-card border border-border rounded-2xl p-5 mt-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Slot {step + 1} of 11 · {slot.label}
              </div>
              <SlotReel
                spinKey={spinKey}
                target={country}
                pool={data?.countries ?? []}
                rowHeight={40}
                durationMs={timerMode.seconds > 0 ? SPIN_MS_TIMED : SPIN_MS}
                instant={reducedMotionRef.current}
                onSettled={() => setSpinning(false)}
                onTick={c => setReelGlimpse(c)}
                renderItem={c => (
                  <span className="text-xl font-bold text-foreground whitespace-nowrap">
                    {flagFor(c)} {displayCountry(c)}
                  </span>
                )}
                className="mb-2"
              />
              <p className="text-xs text-muted-foreground mb-3">
                {spinning
                  ? 'Spinning the nations...'
                  : `Name a player from ${displayCountry(country)} who can play ${slot.label}. Accepts ${allowedLabel(slot)}.`}
              </p>

              <button
                type="button"
                onClick={respin}
                disabled={spinning}
                className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-secondary/40 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-accent transition-all disabled:opacity-50"
                title="Reroll this slot's nation as many times as you like, no penalty"
              >
                <Shuffle className="w-3.5 h-3.5" /> Respin nation
              </button>

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setFeedback(null);
                }}
                onKeyDown={onKeyDown}
                placeholder="Type a player's name..."
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={spinning}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-primary disabled:opacity-60"
              />

              {suggestions.length > 0 && (
                <div className="mt-2 rounded-xl border border-border overflow-hidden max-h-64 overflow-y-auto">
                  {suggestions.map(p => {
                    const fits = fitsSlot(p, slot);
                    return (
                      <button
                        key={p.name}
                        onClick={() => pick(p)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left bg-background hover:bg-accent transition-colors border-b border-border/50 last:border-b-0"
                      >
                        <span
                          className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 w-11 text-center',
                            fits ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground',
                          )}
                        >
                          {p.position}
                        </span>
                        <span className="font-semibold text-sm text-foreground truncate min-w-0 flex-1">{p.name}</span>
                        <span className="text-xs text-muted-foreground truncate shrink-0 max-w-[35%] ml-auto">{p.club}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {feedback && <p className="text-destructive text-sm mt-2">{feedback}</p>}
              {!feedback && query.trim().length >= 2 && suggestions.length === 0 && (
                <p className="text-muted-foreground text-sm mt-2">
                  Nobody from {displayCountry(country)} matches that. Only players from {displayCountry(country)} can
                  fill this slot, so try another name.
                </p>
              )}
              {!feedback && query.trim().length < 2 && (
                <p className="text-muted-foreground/70 text-xs mt-2">Type 2 or more letters to search. Picks lock in, so choose well.</p>
              )}
            </div>
          </>
        )}

        {(phase === 'won' || phase === 'lost') && (
          <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">{phase === 'won' ? '🏆' : timedOut ? '⏱️' : '🏳️'}</div>
              <h2 className="text-2xl font-bold text-primary font-display mb-1 inline-flex items-center gap-2">
                {phase === 'won' && <Trophy className="w-6 h-6" />}
                {phase === 'won' ? 'World XI complete!' : timedOut ? 'Full time!' : 'Squad abandoned'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {phase === 'won'
                  ? `All 11 nations covered in a ${formation.name}. Squad value ${fmtCompactUsd(squadValue)}.`
                  : `You filled ${filledCount} of 11 slots. ${timedOut ? 'The clock won this one.' : 'The draw lives to fight another day.'}`}
              </p>
            </div>

            {pitchView}

            {chemistry.totalBonus > 0 && (
              <div className="mt-4 text-center">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-surface-2 text-gold text-sm font-semibold">
                  {formatChemistry(chemistry)}
                </span>
              </div>
            )}

            <div className="mt-4 grid gap-1.5">
              {formation.slots.map((s, i) => {
                const p = filled[i];
                return (
                  <div key={i} className="flex items-center gap-2 text-sm bg-background/60 border border-border/50 rounded-lg px-3 py-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground w-8 shrink-0">{s.label}</span>
                    <span className="shrink-0">{countries[i] ? flagFor(countries[i]) : '🌍'}</span>
                    {p ? (
                      <>
                        <span className="font-semibold text-foreground truncate min-w-0 flex-1">{p.name}</span>
                        <span className="text-xs text-muted-foreground truncate shrink-0 max-w-[35%] ml-auto">{p.club}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground italic truncate min-w-0">Unfilled ({displayCountry(countries[i] ?? '')})</span>
                    )}
                  </div>
                );
              })}
            </div>

            {phase === 'won' && !seasonReport && (
              <div className="text-center mt-4">
                <button
                  onClick={simulateSeason}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-primary text-primary font-bold hover:bg-primary hover:text-primary-foreground transition-all"
                >
                  <Sparkles className="w-4 h-4" /> Simulate Season
                </button>
                <p className="text-xs text-muted-foreground mt-2">
                  See how far this XI would go over a full league season.
                </p>
              </div>
            )}

            {phase === 'won' && seasonReport && (
              <div className="mt-5 rounded-2xl border border-primary/30 bg-surface-1 p-5">
                <div className="text-center mb-4">
                  <div className="text-3xl mb-1">📋</div>
                  <h3 className="text-lg font-bold text-primary font-display">Season Report</h3>
                  <p className="text-xs text-muted-foreground">
                    A simulated season for your {formation.name} World XI.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  <StatTile label="Squad Rating" value={`${seasonReport.squadRating}/100`} state="correct" />
                  <StatTile
                    label="League Finish"
                    value={`${ordinal(seasonReport.tablePosition)} / 20`}
                    state={seasonReport.tablePosition <= 4 ? 'correct' : seasonReport.tablePosition <= 10 ? 'close' : 'incorrect'}
                  />
                  <StatTile label="Points" value={seasonReport.points} state="pending" />
                  <StatTile
                    label="Trophies"
                    value={seasonReport.trophies.length > 0 ? seasonReport.trophies.length : '0'}
                    state={seasonReport.trophies.length > 0 ? 'correct' : 'incorrect'}
                  />
                </div>

                <div className="grid gap-1.5 text-sm">
                  {seasonReport.narrative.map((line, i) => (
                    <p key={i} className="bg-background/60 border border-border/50 rounded-lg px-3 py-2 text-foreground/90">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center mt-4">
              <pre className="text-sm tracking-wide whitespace-pre-wrap mb-2">{emojiGrid}</pre>
              <ShareButtons
                score={
                  seasonReport
                    ? `${seasonReport.squadRating}/100, ${ordinal(seasonReport.tablePosition)} place`
                    : `${filledCount}/11`
                }
                gameName="World XI"
                gamePath="/world-xi"
                emojiGrid={
                  seasonReport
                    ? `${emojiGrid}\nSeason sim: rated ${seasonReport.squadRating}/100, finished ${ordinal(seasonReport.tablePosition)}`
                    : emojiGrid
                }
              />
              <button
                onClick={playAgain}
                className="mt-4 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="w-4 h-4" /> Play again
              </button>
            </div>
          </div>
        )}

        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="world-xi" />
        </div>

        <GameSeoContent
          title="World XI: The Build-a-XI Football Trivia Game"
          description="A formation, 11 random nations, and your football knowledge. For every country drawn you must name a real player of that nationality who fits the position, from goalkeepers to strikers. Fill all 11 slots to complete your World XI, with optional 90 and 60 second timer modes."
          howToPlay={[
            'Pick a formation and an optional timer.',
            'Eleven countries are drawn at random, one per slot, revealed in random order.',
            'For each country, type and select a real player of that nationality who can play the slot.',
            'Wrong position or wrong country picks are rejected. Fill all 11 to win.',
          ]}
          examples={[
            'Brazil in goal? Alisson, Ederson and 29 other Brazilian keepers count.',
            'Wingers count on both flanks: Raphinha fits a right-wing or a left-wing slot.',
          ]}
        />
        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

export default WorldXi;
