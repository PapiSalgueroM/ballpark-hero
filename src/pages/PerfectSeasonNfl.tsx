import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { RotateCcw, Loader2, FastForward, Dices, Trophy } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import {
  DraftablePlayer, SpinSquad, SimResult,
  teamOverall, simulateSeason, randomSeed, ratingTier, squadFillsAny,
} from '@/lib/perfectSeason';
import {
  NFL_SLOTS, NFL_GAMES, NFL_OVERALL_ADJUST, TeamSeasonEntry,
  fetchTeamSeasonIndex, fetchSquad,
} from '@/lib/perfectSeasonNfl';

type Phase = 'boot' | 'error' | 'spin' | 'spinning' | 'draft' | 'sim' | 'done';

const MAX_REROLLS = 2;

const TIER_CLASSES: Record<string, string> = {
  elite: 'bg-correct/20 text-correct border-correct/40',
  great: 'bg-primary/15 text-primary border-primary/40',
  good: 'bg-secondary text-foreground border-border',
  meh: 'bg-secondary/50 text-muted-foreground border-border',
};

const PerfectSeasonNfl = () => {
  const [phase, setPhase] = useState<Phase>('boot');
  const [index, setIndex] = useState<TeamSeasonEntry[]>([]);
  const [squad, setSquad] = useState<SpinSquad | null>(null);
  const [wheelText, setWheelText] = useState('');
  const [picks, setPicks] = useState<Record<string, DraftablePlayer | null>>(
    () => Object.fromEntries(NFL_SLOTS.map(s => [s.key, null]))
  );
  const [usedNames, setUsedNames] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<DraftablePlayer | null>(null);
  const [rerolls, setRerolls] = useState(MAX_REROLLS);
  const [spins, setSpins] = useState(0);
  const [sim, setSim] = useState<SimResult | null>(null);
  const [revealed, setRevealed] = useState(0);
  const wheelTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const simTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const openSlots = useMemo(
    () => NFL_SLOTS.filter(s => !picks[s.key]).map(s => s.key),
    [picks]
  );
  const overall = useMemo(() => teamOverall(NFL_SLOTS, picks), [picks]);
  const draftDone = openSlots.length === 0;

  useEffect(() => {
    let alive = true;
    (async () => {
      const idx = await fetchTeamSeasonIndex();
      if (!alive) return;
      if (idx) {
        setIndex(idx);
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
  }, []);

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
      setWheelText(`${e.year} ${e.name}`);
    }, 70);

    let found: { entry: TeamSeasonEntry; squad: SpinSquad } | null = null;
    for (let attempt = 0; attempt < 6 && !found; attempt++) {
      const entry = index[Math.floor(Math.random() * index.length)];
      const sq = await fetchSquad(entry);
      if (sq && squadFillsAny(sq, NFL_SLOTS.filter(s => !picks[s.key]).map(s => s.key), usedNames)) {
        found = { entry, squad: sq };
      }
    }

    if (wheelTimer.current) clearInterval(wheelTimer.current);
    if (!found) {
      setPhase('error');
      return;
    }
    setWheelText(`${found.squad.year} ${found.squad.teamName}`);
    setSquad(found.squad);
    setSpins(s => s + 1);
    setPhase('draft');
  }, [index, picks, usedNames, rerolls]);

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

  // Auto-start the sim once the lineup is complete. The shared curve is tuned
  // for long seasons, so 17 games sims run with a lowered effective overall.
  useEffect(() => {
    if (!draftDone || phase === 'sim' || phase === 'done' || sim) return;
    const result = simulateSeason(overall + NFL_OVERALL_ADJUST, NFL_GAMES, randomSeed());
    setSim(result);
    setRevealed(0);
    setPhase('sim');
  }, [draftDone, overall, phase, sim]);

  // Progressive reveal, one game at a time
  useEffect(() => {
    if (phase !== 'sim' || !sim) return;
    if (revealed >= NFL_GAMES) {
      setPhase('done');
      return;
    }
    simTimer.current = setInterval(() => {
      setRevealed(r => Math.min(NFL_GAMES, r + 1));
    }, 220);
    return () => { if (simTimer.current) clearInterval(simTimer.current); };
  }, [phase, sim, revealed >= NFL_GAMES]);

  const skipSim = () => setRevealed(NFL_GAMES);

  const restart = () => {
    setPicks(Object.fromEntries(NFL_SLOTS.map(s => [s.key, null])));
    setUsedNames(new Set());
    setSelected(null);
    setSquad(null);
    setSim(null);
    setRevealed(0);
    setRerolls(MAX_REROLLS);
    setSpins(0);
    setPhase('spin');
  };

  const winsSoFar = sim ? sim.games.slice(0, revealed).filter(Boolean).length : 0;
  const lossesSoFar = revealed - winsSoFar;
  // sim.overall holds the adjusted value, so show the drafted overall instead
  const ovrDisplay = Math.round(overall);

  const emojiGrid = sim
    ? sim.perfect
      ? `🏈🏆 17-0 PERFECT SEASON\nTeam overall ${ovrDisplay} · ${spins} spins`
      : `🏈 ${sim.wins}-${sim.losses} season\nTeam overall ${ovrDisplay} · ${spins} spins`
    : '';

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="17-0: Perfect Season Football | DoUKnowBall"
        description="Spin across NFL history, draft a cross-era offense, and simulate a 17 game season. Can you go 17-0? Free to play."
        path="/perfect-season-nfl"
      />
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.08em] text-primary font-display mb-1">
            17-0
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            Spin the wheel of NFL history, draft one player per stop, and chase the perfect season.
          </p>
        </header>

        {phase === 'boot' && (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't reach the football archives.</p>
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
                          <span className={cn('px-2 py-0.5 rounded-md border text-sm font-bold shrink-0', TIER_CLASSES[ratingTier(p.rating)])}>
                            {p.rating}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="font-semibold text-foreground block truncate">{p.name}</span>
                            <span className="text-xs text-muted-foreground">{p.detail}</span>
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
                <h2 className="font-bold text-foreground text-sm uppercase tracking-wider">Your offense</h2>
                {overall > 0 && (
                  <span className="text-sm font-bold text-primary">{Math.round(overall)} OVR</span>
                )}
              </div>
              <div className="space-y-1">
                {NFL_SLOTS.map(s => {
                  const p = picks[s.key];
                  return (
                    <div key={s.key} className="flex items-center gap-2 text-sm">
                      <span className="w-10 text-[11px] font-bold text-muted-foreground">{s.key}</span>
                      {p ? (
                        <>
                          <span className="flex-1 truncate font-medium text-foreground">{p.name}</span>
                          <span className={cn('px-1.5 rounded text-xs font-bold border', TIER_CLASSES[ratingTier(p.rating)])}>{p.rating}</span>
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
                  : 'Offense complete!'}
              </p>
            </aside>
          </div>
        )}

        {(phase === 'sim' || phase === 'done') && sim && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-2xl p-6 text-center mb-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                {phase === 'sim' ? `Game ${revealed} of ${NFL_GAMES}` : 'Final record'}
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

            <div className="grid gap-1.5 mb-6" style={{ gridTemplateColumns: 'repeat(17, minmax(0, 1fr))' }}>
              {Array.from({ length: NFL_GAMES }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'aspect-square rounded-md transition-colors',
                    i < revealed
                      ? sim.games[i] ? 'bg-correct' : 'bg-destructive'
                      : 'bg-secondary/40'
                  )}
                />
              ))}
            </div>

            {phase === 'done' && (
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <div className="text-5xl mb-2">{sim.perfect ? '🏆' : sim.wins >= 15 ? '😤' : sim.wins >= 12 ? '🔥' : '📉'}</div>
                <h2 className="text-2xl font-bold text-primary font-display mb-1">
                  {sim.perfect
                    ? 'PERFECT SEASON!'
                    : sim.wins >= 15
                    ? `So close. ${sim.losses} bad Sunday${sim.losses === 1 ? '' : 's'}.`
                    : sim.wins >= 12
                    ? 'A contender, but not perfect.'
                    : 'The wheel giveth, the wheel taketh.'}
                </h2>
                <p className="text-sm text-muted-foreground mb-3">
                  Team overall {ovrDisplay} · drafted in {spins} spin{spins === 1 ? '' : 's'}
                </p>
                {sim.perfect && (
                  <p className="text-sm text-correct font-semibold mb-2 inline-flex items-center gap-1.5">
                    <Trophy className="w-4 h-4" /> Share this. Nobody will believe you.
                  </p>
                )}
                <pre className="text-sm tracking-wide whitespace-pre-wrap mb-2">{emojiGrid}</pre>
                <ShareButtons
                  score={`${sim.wins}-${sim.losses}`}
                  gameName="17-0 Perfect Season"
                  gamePath="/perfect-season-nfl"
                  emojiGrid={emojiGrid}
                />
                <button
                  onClick={restart}
                  className="mt-4 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
                >
                  <RotateCcw className="w-4 h-4" /> Run it back
                </button>
              </div>
            )}
          </div>
        )}

        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="perfect-season-nfl" />
        </div>

        <GameSeoContent
          title="17-0: The Perfect Season Challenge (NFL)"
          description="Draft an offense across the modern NFL. The wheel decides which team-season you draft from, one player per spin, no repeats. Then the sim decides your fate over 17 games."
          howToPlay={[
            'Spin the wheel. It lands on a real NFL team and season from 1999 to today.',
            'Draft one player from that squad into an open slot. Ratings come from their real stats that year.',
            'Repeat until all 6 slots are filled: quarterback, running back, two receivers, tight end, and a flex.',
            'Simulate the 17 game season. Better offenses win more, but 17-0 takes serious luck.',
            'Two rerolls per run if a spin gives you nothing you like.',
          ]}
          examples={[
            'A 99 rated 2007 Randy Moss can catch passes from a 99 rated 2013 Peyton Manning.',
            'Going 16-1 hurts more than going 10-7. That is the point.',
          ]}
        />
        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

export default PerfectSeasonNfl;
