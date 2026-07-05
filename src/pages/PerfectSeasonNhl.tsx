import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { RotateCcw, Loader2, FastForward, Dices, Trophy, Lock, EyeOff, CalendarClock } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import {
  DraftablePlayer, SpinSquad, SimResult, GameMode,
  teamOverall, simulateSeason, randomSeed, ratingTier, squadFillsAny,
  GAME_MODE_LABELS, GAME_MODE_BLURBS, HIDDEN_RATING_DISPLAY, isRatingHidden,
  getDailyDateET, makeDailyPicker, loadDailyAttempt, saveDailyAttempt,
  msUntilNextDailyET, formatCountdown, DailyAttemptRecord,
} from '@/lib/perfectSeason';
import {
  NHL_SLOTS, NHL_GAMES, TeamEraIndexEntry,
  fetchTeamEraIndex, fetchSquad,
} from '@/lib/perfectSeasonNhl';
import {
  PerfectSeasonTheme, getDailyTheme, applyTheme, buildVerificationLine, themesForSport,
} from '@/lib/perfectSeasonThemes';

const SPORT_KEY = 'nhl';

type Phase = 'mode-select' | 'daily-locked' | 'boot' | 'error' | 'spin' | 'spinning' | 'draft' | 'sim' | 'done';

const MAX_REROLLS = 2;

const TIER_CLASSES: Record<string, string> = {
  elite: 'bg-correct/20 text-correct border-correct/40',
  great: 'bg-primary/15 text-primary border-primary/40',
  good: 'bg-secondary text-foreground border-border',
  meh: 'bg-secondary/50 text-muted-foreground border-border',
};

const MODE_ICONS: Record<GameMode, typeof Dices> = {
  classic: Dices,
  hard: EyeOff,
  daily: CalendarClock,
};

const PerfectSeasonNhl = () => {
  const [mode, setMode] = useState<GameMode>('classic');
  const [phase, setPhase] = useState<Phase>('mode-select');
  const [lockedAttempt, setLockedAttempt] = useState<DailyAttemptRecord | null>(null);
  const [index, setIndex] = useState<TeamEraIndexEntry[]>([]);
  const [squad, setSquad] = useState<SpinSquad | null>(null);
  const [wheelText, setWheelText] = useState('');
  const [picks, setPicks] = useState<Record<string, DraftablePlayer | null>>(
    () => Object.fromEntries(NHL_SLOTS.map(s => [s.key, null]))
  );
  const [usedNames, setUsedNames] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<DraftablePlayer | null>(null);
  const [rerolls, setRerolls] = useState(MAX_REROLLS);
  const [spins, setSpins] = useState(0);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [sim, setSim] = useState<SimResult | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [countdown, setCountdown] = useState('');
  const [dailyTheme, setDailyTheme] = useState<PerfectSeasonTheme | null>(null);
  const wheelTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const simTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const dailyPicker = useRef<((len: number) => number) | null>(null);
  const dailySaved = useRef(false);

  const openSlots = useMemo(
    () => NHL_SLOTS.filter(s => !picks[s.key]).map(s => s.key),
    [picks]
  );
  const overall = useMemo(() => teamOverall(NHL_SLOTS, picks), [picks]);
  const draftDone = openSlots.length === 0;
  const ratingsHidden = isRatingHidden(mode, phase === 'done');

  // Countdown ticks while the daily result (or lock screen) is showing.
  useEffect(() => {
    if (mode !== 'daily' || (phase !== 'done' && phase !== 'daily-locked')) {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      return;
    }
    setCountdown(formatCountdown(msUntilNextDailyET()));
    countdownTimer.current = setInterval(() => {
      setCountdown(formatCountdown(msUntilNextDailyET()));
    }, 1000);
    return () => { if (countdownTimer.current) clearInterval(countdownTimer.current); };
  }, [mode, phase]);

  const pickIndex = useCallback((len: number) => {
    if (mode === 'daily' && dailyPicker.current) return dailyPicker.current(len);
    return Math.floor(Math.random() * len);
  }, [mode]);

  const chooseMode = (m: GameMode) => {
    setMode(m);
    if (m === 'daily') {
      const existing = loadDailyAttempt(SPORT_KEY);
      if (existing) {
        setLockedAttempt(existing);
        setPhase('daily-locked');
        return;
      }
      dailyPicker.current = makeDailyPicker(SPORT_KEY);
    }
    setPhase('boot');
  };

  useEffect(() => {
    if (phase !== 'boot') return;
    let alive = true;
    (async () => {
      const idx = await fetchTeamEraIndex();
      if (!alive) return;
      if (idx) {
        if (mode === 'daily') {
          const theme = getDailyTheme(SPORT_KEY, getDailyDateET(), idx);
          setDailyTheme(theme);
          setIndex(applyTheme(idx, theme));
        } else {
          setIndex(idx);
        }
        setPhase('spin');
      } else {
        setPhase('error');
      }
    })();
    return () => {
      alive = false;
      if (wheelTimer.current) clearInterval(wheelTimer.current);
      if (simTimer.current) clearInterval(simTimer.current);
    };
  }, [phase, mode]);

  const spin = useCallback(async (isReroll: boolean) => {
    if (index.length === 0) return;
    if (isReroll) {
      if (rerolls <= 0) return;
      setRerolls(r => r - 1);
    }
    setPhase('spinning');
    setSelected(null);
    setSquad(null);

    // Slot machine flavor while we fetch
    if (wheelTimer.current) clearInterval(wheelTimer.current);
    wheelTimer.current = setInterval(() => {
      const e = index[Math.floor(Math.random() * index.length)];
      setWheelText(`${e.teamName} (${e.eraLabel})`);
    }, 70);

    let found: { entry: TeamEraIndexEntry; squad: SpinSquad } | null = null;
    for (let attempt = 0; attempt < 6 && !found; attempt++) {
      const entry = index[pickIndex(index.length)];
      const sq = await fetchSquad(entry);
      if (sq && squadFillsAny(sq, NHL_SLOTS.filter(s => !picks[s.key]).map(s => s.key), usedNames)) {
        found = { entry, squad: sq };
      }
    }

    if (wheelTimer.current) clearInterval(wheelTimer.current);
    if (!found) {
      setPhase('error');
      return;
    }
    setWheelText(found.squad.teamName);
    setSquad(found.squad);
    setSpins(s => s + 1);
    setTeamNames(t => [...t, found!.squad.teamName]);
    setPhase('draft');
  }, [index, picks, usedNames, rerolls, pickIndex]);

  const canDraft = useCallback(
    (p: DraftablePlayer) => !usedNames.has(p.name) && p.eligible.some(e => openSlots.includes(e)),
    [usedNames, openSlots]
  );

  const assign = (p: DraftablePlayer, slotKey: string) => {
    if (!openSlots.includes(slotKey) || !p.eligible.includes(slotKey)) return;
    setPicks(prev => ({ ...prev, [slotKey]: p }));
    setUsedNames(prev => new Set(prev).add(p.name));
    setSelected(null);
    setSquad(null);
    setPhase('spin');
  };

  const clickPlayer = (p: DraftablePlayer) => {
    if (!canDraft(p)) return;
    const options = p.eligible.filter(e => openSlots.includes(e));
    if (options.length === 1) {
      assign(p, options[0]);
    } else {
      setSelected(prev => (prev?.playerId === p.playerId ? null : p));
    }
  };

  // Auto-start the sim once the lineup is complete
  useEffect(() => {
    if (!draftDone || phase === 'sim' || phase === 'done' || sim) return;
    const seed = mode === 'daily' && dailyPicker.current
      ? Math.floor(dailyPicker.current(2 ** 31))
      : randomSeed();
    const result = simulateSeason(overall, NHL_GAMES, seed);
    setSim(result);
    setRevealed(0);
    setPhase('sim');
  }, [draftDone, overall, phase, sim, mode]);

  // Progressive reveal
  useEffect(() => {
    if (phase !== 'sim' || !sim) return;
    if (revealed >= NHL_GAMES) {
      setPhase('done');
      return;
    }
    simTimer.current = setInterval(() => {
      setRevealed(r => Math.min(NHL_GAMES, r + 1));
    }, 30);
    return () => { if (simTimer.current) clearInterval(simTimer.current); };
  }, [phase, sim, revealed >= NHL_GAMES]);

  // Lock in the daily attempt exactly once, right when the result lands.
  useEffect(() => {
    if (mode !== 'daily' || phase !== 'done' || !sim || dailySaved.current) return;
    dailySaved.current = true;
    saveDailyAttempt(SPORT_KEY, {
      date: getDailyDateET(),
      sim,
      overall: Math.round(overall),
      spins,
      teamNames,
      themeId: dailyTheme?.id,
    });
  }, [mode, phase, sim, overall, spins, teamNames, dailyTheme]);

  const skipSim = () => setRevealed(NHL_GAMES);

  const restart = () => {
    setPicks(Object.fromEntries(NHL_SLOTS.map(s => [s.key, null])));
    setUsedNames(new Set());
    setSelected(null);
    setSquad(null);
    setSim(null);
    setRevealed(0);
    setRerolls(MAX_REROLLS);
    setSpins(0);
    setTeamNames([]);
    setPhase('spin');
  };

  const backToModes = () => {
    dailySaved.current = false;
    setLockedAttempt(null);
    setDailyTheme(null);
    restart();
    setPhase('mode-select');
  };

  const winsSoFar = sim ? sim.games.slice(0, revealed).filter(Boolean).length : 0;
  const lossesSoFar = revealed - winsSoFar;

  // Resolve the locked attempt's theme by id for the "today's daily is done"
  // recap, since that screen loads from localStorage rather than the live
  // dailyTheme state (which is only set after a fresh boot fetch).
  const lockedTheme = lockedAttempt?.themeId
    ? themesForSport(SPORT_KEY).find(t => t.id === lockedAttempt.themeId) ?? null
    : null;

  const dailyTag = mode === 'daily' ? `Daily · ${getDailyDateET()}\n` : '';
  const verificationLine = mode === 'daily' && sim
    ? `\n${buildVerificationLine(SPORT_KEY, getDailyDateET(), dailyTheme?.id ?? null, sim.wins, sim.losses)}`
    : '';

  const emojiGrid = sim
    ? sim.perfect
      ? `🏒🏆 82-0 PERFECT SEASON\n${dailyTag}Team overall ${sim.overall} · ${spins} spins${verificationLine}`
      : `🏒 ${sim.wins}-${sim.losses} season\n${dailyTag}Team overall ${sim.overall} · ${spins} spins${verificationLine}`
    : '';

  const lockedVerificationLine = lockedAttempt
    ? `\n${buildVerificationLine(SPORT_KEY, lockedAttempt.date, lockedAttempt.themeId ?? null, lockedAttempt.sim.wins, lockedAttempt.sim.losses)}`
    : '';

  const lockedEmojiGrid = lockedAttempt
    ? lockedAttempt.sim.perfect
      ? `🏒🏆 82-0 PERFECT SEASON\nDaily · ${lockedAttempt.date}\nTeam overall ${lockedAttempt.overall} · ${lockedAttempt.spins} spins${lockedVerificationLine}`
      : `🏒 ${lockedAttempt.sim.wins}-${lockedAttempt.sim.losses} season\nDaily · ${lockedAttempt.date}\nTeam overall ${lockedAttempt.overall} · ${lockedAttempt.spins} spins${lockedVerificationLine}`
    : '';

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="82-0: Perfect Season Hockey | DoUKnowBall"
        description="Spin across hockey history, draft a cross-era lineup, and simulate an 82 game season. Can you go 82-0? Free to play."
        path="/perfect-season-nhl"
      />
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.08em] text-primary font-display mb-1">
            82-0
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            Spin the wheel of hockey history, draft one player per stop, and chase the perfect season.
          </p>
          {phase !== 'mode-select' && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-secondary text-muted-foreground font-semibold uppercase tracking-wider">
              {(() => { const Icon = MODE_ICONS[mode]; return <Icon className="w-3.5 h-3.5" />; })()}
              {GAME_MODE_LABELS[mode]} mode
            </div>
          )}
          {mode === 'daily' && phase !== 'mode-select' && (dailyTheme || lockedTheme) && (
            <div className="mt-3 max-w-md mx-auto rounded-xl border border-primary/30 bg-primary/5 px-4 py-2">
              <div className="text-xs font-bold uppercase tracking-wider text-primary">
                Today's theme: {(dailyTheme ?? lockedTheme)!.label}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{(dailyTheme ?? lockedTheme)!.description}</p>
            </div>
          )}
        </header>

        {phase === 'mode-select' && (
          <div className="grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {(['classic', 'hard', 'daily'] as GameMode[]).map(m => {
              const Icon = MODE_ICONS[m];
              return (
                <button
                  key={m}
                  onClick={() => chooseMode(m)}
                  className="bg-card border border-border rounded-2xl p-4 text-left hover:border-primary transition-colors"
                >
                  <Icon className="w-6 h-6 text-primary mb-2" />
                  <div className="font-bold text-foreground mb-1">{GAME_MODE_LABELS[m]}</div>
                  <p className="text-xs text-muted-foreground">{GAME_MODE_BLURBS[m]}</p>
                </button>
              );
            })}
          </div>
        )}

        {phase === 'daily-locked' && lockedAttempt && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-2xl p-6 text-center mb-4">
              <Lock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <h2 className="text-xl font-bold text-foreground mb-1">Today's daily is done</h2>
              <p className="text-sm text-muted-foreground mb-4">
                One attempt per day. Here's how it went.
              </p>
              <div className="text-5xl font-bold font-display mb-2">
                <span className="text-correct">{lockedAttempt.sim.wins}</span>
                <span className="text-muted-foreground">-</span>
                <span className={lockedAttempt.sim.losses > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                  {lockedAttempt.sim.losses}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Team overall {lockedAttempt.overall} · drafted in {lockedAttempt.spins} spin{lockedAttempt.spins === 1 ? '' : 's'}
              </p>
              <pre className="text-sm tracking-wide whitespace-pre-wrap mb-3">{lockedEmojiGrid}</pre>
              <ShareButtons
                score={`${lockedAttempt.sim.wins}-${lockedAttempt.sim.losses}`}
                gameName="82-0 Perfect Season (Daily)"
                gamePath="/perfect-season-nhl"
                emojiGrid={lockedEmojiGrid}
              />
              {countdown && (
                <p className="text-xs text-muted-foreground mt-4">
                  Next daily puzzle in <span className="font-mono font-semibold text-foreground">{countdown}</span>
                </p>
              )}
              <button
                onClick={backToModes}
                className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-secondary text-foreground rounded-full font-semibold hover:bg-secondary/70"
              >
                Play Classic or Hard instead
              </button>
            </div>
          </div>
        )}

        {phase === 'boot' && (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't reach the hockey archives.</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold">
              Try again
            </button>
          </div>
        )}

        {(phase === 'spin' || phase === 'spinning' || phase === 'draft') && (
          <div className="grid md:grid-cols-[1fr_260px] gap-5">
            <div>
              <div className="bg-card border border-border rounded-2xl p-5 mb-4 text-center">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  {phase === 'draft' ? 'You landed on' : 'Team wheel'}
                </div>
                <div className={cn(
                  'text-xl md:text-2xl font-bold font-display min-h-[32px]',
                  phase === 'spinning' ? 'text-muted-foreground animate-pulse' : 'text-primary'
                )}>
                  {wheelText || '· · ·'}
                </div>
                {phase === 'spin' && (
                  <button
                    onClick={() => spin(false)}
                    className="mt-4 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold hover:opacity-90 transition-opacity"
                  >
                    <Dices className="w-5 h-5" /> {spins === 0 ? 'Spin the wheel' : 'Next spin'}
                  </button>
                )}
                {phase === 'draft' && (
                  <div className="mt-3 flex items-center justify-center gap-3">
                    <span className="text-xs text-muted-foreground">Draft one player below</span>
                    <button
                      onClick={() => spin(true)}
                      disabled={rerolls <= 0}
                      className={cn(
                        'text-xs px-3 py-1 rounded-full border transition-colors',
                        rerolls > 0
                          ? 'border-border text-muted-foreground hover:text-foreground hover:border-primary'
                          : 'border-border text-muted-foreground/40 cursor-not-allowed'
                      )}
                    >
                      Reroll ({rerolls} left)
                    </button>
                  </div>
                )}
              </div>

              {phase === 'draft' && squad && (
                <div className="space-y-1.5">
                  {squad.players.map(p => {
                    const draftable = canDraft(p);
                    const isSelected = selected?.playerId === p.playerId;
                    const options = p.eligible.filter(e => openSlots.includes(e));
                    return (
                      <div key={p.playerId}>
                        <button
                          onClick={() => clickPlayer(p)}
                          disabled={!draftable}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all',
                            draftable
                              ? 'bg-card border-border hover:border-primary'
                              : 'bg-secondary/30 border-border opacity-45 cursor-not-allowed',
                            isSelected && 'border-primary ring-1 ring-primary'
                          )}
                        >
                          <span className={cn(
                            'px-2 py-0.5 rounded-md border text-sm font-bold shrink-0',
                            ratingsHidden ? 'bg-secondary/50 text-muted-foreground border-border' : TIER_CLASSES[ratingTier(p.rating)]
                          )}>
                            {ratingsHidden ? HIDDEN_RATING_DISPLAY : p.rating}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="font-semibold text-foreground block truncate">{p.name}</span>
                            <span className="text-xs text-muted-foreground">{ratingsHidden ? 'Rating hidden until the sim ends' : p.detail}</span>
                          </span>
                          <span className="flex gap-1 shrink-0">
                            {p.eligible.map(e => (
                              <span
                                key={e}
                                className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded border',
                                  openSlots.includes(e)
                                    ? 'border-primary/50 text-primary'
                                    : 'border-border text-muted-foreground/50 line-through'
                                )}
                              >
                                {e}
                              </span>
                            ))}
                          </span>
                        </button>
                        {isSelected && options.length > 1 && (
                          <div className="flex flex-wrap gap-1.5 px-3 py-2">
                            <span className="text-xs text-muted-foreground self-center">Slot:</span>
                            {options.map(o => (
                              <button
                                key={o}
                                onClick={() => assign(p, o)}
                                className="text-xs px-3 py-1 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90"
                              >
                                {o}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <aside className="bg-card border border-border rounded-2xl p-4 h-fit md:sticky md:top-20">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-bold text-foreground text-sm uppercase tracking-wider">Your lineup</h2>
                {overall > 0 && (
                  <span className="text-sm font-bold text-primary">{ratingsHidden ? HIDDEN_RATING_DISPLAY : Math.round(overall)} OVR</span>
                )}
              </div>
              <div className="space-y-1">
                {NHL_SLOTS.map(s => {
                  const p = picks[s.key];
                  return (
                    <div key={s.key} className="flex items-center gap-2 text-sm">
                      <span className="w-8 text-[11px] font-bold text-muted-foreground">{s.key}</span>
                      {p ? (
                        <>
                          <span className="flex-1 truncate font-medium text-foreground">{p.name}</span>
                          <span className={cn(
                            'px-1.5 rounded text-xs font-bold border',
                            ratingsHidden ? 'bg-secondary/50 text-muted-foreground border-border' : TIER_CLASSES[ratingTier(p.rating)]
                          )}>
                            {ratingsHidden ? HIDDEN_RATING_DISPLAY : p.rating}
                          </span>
                        </>
                      ) : (
                        <span className="flex-1 text-muted-foreground/40">empty</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                {openSlots.length > 0
                  ? `${openSlots.length} slot${openSlots.length === 1 ? '' : 's'} to fill`
                  : 'Lineup complete!'}
              </p>
            </aside>
          </div>
        )}

        {(phase === 'sim' || phase === 'done') && sim && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-2xl p-6 text-center mb-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                {phase === 'sim' ? `Game ${revealed} of ${NHL_GAMES}` : 'Final record'}
              </div>
              <div className="text-5xl font-bold font-display mb-2">
                <span className="text-correct">{phase === 'done' ? sim.wins : winsSoFar}</span>
                <span className="text-muted-foreground">-</span>
                <span className={cn((phase === 'done' ? sim.losses : lossesSoFar) > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                  {phase === 'done' ? sim.losses : lossesSoFar}
                </span>
              </div>
              {phase === 'sim' && (
                <button
                  onClick={skipSim}
                  className="inline-flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full bg-secondary text-foreground font-semibold hover:bg-secondary/70"
                >
                  <FastForward className="w-3.5 h-3.5" /> Skip to result
                </button>
              )}
            </div>

            <div className="grid gap-1 mb-6" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
              {Array.from({ length: NHL_GAMES }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'aspect-square rounded-sm transition-colors',
                    i < revealed
                      ? sim.games[i] ? 'bg-correct' : 'bg-destructive'
                      : 'bg-secondary/40'
                  )}
                />
              ))}
            </div>

            {phase === 'done' && (
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <div className="text-5xl mb-2">{sim.perfect ? '🏆' : sim.wins >= 78 ? '😤' : sim.wins >= 55 ? '🔥' : '📉'}</div>
                <h2 className="text-2xl font-bold text-primary font-display mb-1">
                  {sim.perfect
                    ? 'PERFECT SEASON!'
                    : sim.wins >= 78
                    ? `So close. ${sim.losses} bad night${sim.losses === 1 ? '' : 's'}.`
                    : sim.wins >= 55
                    ? 'A juggernaut, but not perfect.'
                    : 'The wheel giveth, the wheel taketh.'}
                </h2>
                <p className="text-sm text-muted-foreground mb-3">
                  {mode === 'daily' && `Daily · ${getDailyDateET()} · `}
                  Team overall {sim.overall} · drafted in {spins} spin{spins === 1 ? '' : 's'}
                </p>
                {sim.perfect && (
                  <p className="text-sm text-correct font-semibold mb-2 inline-flex items-center gap-1.5">
                    <Trophy className="w-4 h-4" /> Share this. Nobody will believe you.
                  </p>
                )}
                <pre className="text-sm tracking-wide whitespace-pre-wrap mb-2">{emojiGrid}</pre>
                <ShareButtons
                  score={`${sim.wins}-${sim.losses}`}
                  gameName={mode === 'daily' ? '82-0 Perfect Season (Daily)' : '82-0 Perfect Season'}
                  gamePath="/perfect-season-nhl"
                  emojiGrid={emojiGrid}
                />
                {mode === 'daily' ? (
                  <>
                    {countdown && (
                      <p className="text-xs text-muted-foreground mt-4">
                        Next daily puzzle in <span className="font-mono font-semibold text-foreground">{countdown}</span>
                      </p>
                    )}
                    <button
                      onClick={backToModes}
                      className="mt-3 inline-flex items-center gap-2 px-8 py-3 bg-secondary text-foreground rounded-full font-semibold hover:bg-secondary/70"
                    >
                      Play Classic or Hard
                    </button>
                  </>
                ) : (
                  <button
                    onClick={restart}
                    className="mt-4 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
                  >
                    <RotateCcw className="w-4 h-4" /> Run it back
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="perfect-season-nhl" />
        </div>

        <GameSeoContent
          title="82-0: The Perfect Season Challenge"
          description="Draft across every era of NHL history. The wheel decides which franchise and decade you draft from, one player per spin, no repeats. Then the sim decides your fate over 82 games."
          howToPlay={[
            'Spin the wheel. It lands on a real NHL franchise and one decade of its history.',
            'Draft one player from that squad into an open lineup slot. Skater ratings come from real career scoring, goalie ratings from draft pedigree.',
            'Repeat until all 6 slots are filled: a center, both wings, two defensemen, and a goalie.',
            'Simulate the 82 game season. Better lineups win more, but perfection takes luck.',
            'Two rerolls per run if a spin gives you nothing you like.',
          ]}
          examples={[
            'A 99 rated legend from the 1980s Oilers can center a line with a 2020s sniper.',
            'Going 79-3 hurts more than going 50-32. That is the point.',
          ]}
        />
        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

export default PerfectSeasonNhl;
