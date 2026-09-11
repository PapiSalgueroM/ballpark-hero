import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Crown, Flag, RotateCcw, Swords } from 'lucide-react';
import ConquestRegionMap, { type ConquestBattleView } from '@/components/conquest/ConquestRegionMap';
import ConquestScenePlayer, { useScenePlayer } from '@/components/conquest/ConquestScenePlayer';
import ConquestWheel from '@/components/conquest/ConquestWheel';
import ConquestTimeline from '@/components/conquest/ConquestTimeline';
import ConquestStandingsStrip from '@/components/conquest/ConquestStandingsStrip';
import { ImperialismHowToPlay } from '@/components/conquest/ImperialismHowToPlay';
import { CelebrationStyles, ConfettiBurst } from '@/components/club-manager/Celebration';
import ShareButtons from '@/components/game/ShareButtons';
import type { ConquestMapSport } from '@/lib/conquestMapLook';
import { bboxArea, pathBoundingBox } from '@/lib/conquestMapGeometry';
import { arrowAngle, buildScenes, wheelSpec } from '@/lib/conquestScenes';
import {
  empireCounts, landlessTeams, statesOf, homeWinProb, teamLabel, recordLabel, regionNoun,
  type ImperialismSport, type ImperialismTeam, type ImperialismGameSpec,
} from '@/lib/imperialismEngine';
import {
  startRun, playRound, continueRun, runScore, roundLabel as labelOfRound,
  featuredPairing, restoreDailyRun, dailyRunRecord, seasonRecords, type ConquestRun,
} from '@/lib/conquestRun';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import {
  dailyConquestRng, saveDailyRun, loadDailyResult, loadDailyStreak, saveDailyResult, dailyShareText,
  type ConquestDailyResult,
} from '@/lib/conquestDaily';
import { getTodayET } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

/**
 * ONE imperialism board, and the sport is injected.
 *
 * Round 459 built it for soccer out of four copies of one screen. Round 476
 * moved the other four sports onto it as data (src/data/conquestSports.ts)
 * and deleted ImperialismBoard.tsx, ImperialismBoardNba.tsx,
 * ImperialismBoardMlb.tsx and ImperialismBoardNhl.tsx, so /conquest,
 * /conquest-nba, /conquest-mlb, /conquest-nhl and /soccer-conquest are all
 * this file. A player moving from the MLB version to the soccer one finds
 * the same game wearing different clubs.
 *
 * Round 476 also closed the daily exploit that made the move worth doing
 * first. The season is seeded from the date, so a player who reloaded on the
 * last matchday was dealt the identical season back with every result known
 * and could call all of them right, for about ninety percent of the cap, on
 * all five routes. The run is now recorded AS IT GOES: the club plus every
 * call, written after the pick and after every settled round, replayed on
 * mount by src/lib/conquestRun.ts. The calls already made are locked, so a
 * reload returns the player to the recap they were reading and nothing more.
 *
 * Round 529 made the map the stage. A settled round no longer lands as a
 * list of result lines: it plays as scenes on the map (the wheel, the
 * matchup card, the camera, the score at its final value, the takeover
 * wave), with Teams Remaining and a timeline under it, and the season ends
 * on a Conquest Complete banner with the four season records. All of it is
 * presentation over run.rounds and run.history: the engine, the rules, the
 * daily log and the completion id are exactly Round 476's. A reload shows
 * the recap directly rather than replaying the scenes.
 */

interface Props {
  sport: ImperialismSport;
  map: ConquestMapSport;
  game: ImperialismGameSpec;
  /** The page's "?" opens the imperialism help; the board opens it once, before the first run on the route. */
  helpOpen?: boolean;
  onHelpOpenChange?: (open: boolean) => void;
}

/** The run plus the rng that dealt it. They move together or the replay lies. */
interface Session {
  run: ConquestRun;
  rng: () => number;
  /** The round just settled in THIS session, for the scenes. Null after a reload or after Continue, so the recap shows directly. */
  settled: { featured: [string, string] | null; call: string } | null;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Each team's home region, derived from the sport's opening map and nothing
 * else (no sport carries stadium coordinates the shared map can read). A
 * team that opens with one region is at home there. A team that opens with
 * several is at home in the region with the most opening neighbours inside
 * its own empire, the one deepest inside it, which on a nearest stadium
 * split is the region around the stadium far more often than not; a tie
 * goes to the larger region. An invader that opens landless has no ring.
 */
function deriveHomeRegions(sport: ImperialismSport, map: ConquestMapSport): Record<string, string> {
  const seed = sport.seed();
  const area = new Map(map.regions.map(r => [r.id, bboxArea(pathBoundingBox(r.path))]));
  const out: Record<string, string> = {};
  for (const team of sport.teams) {
    const held = Object.keys(seed).filter(r => seed[r] === team.id && area.has(r));
    if (held.length === 0) continue;
    let best = held[0];
    let bestScore = -1;
    for (const r of held) {
      const inside = (map.adjacency[r] ?? []).filter(n => seed[n] === team.id).length;
      const score = inside * 1e6 + (area.get(r) ?? 0);
      if (score > bestScore) { bestScore = score; best = r; }
    }
    out[team.id] = best;
  }
  return out;
}

export default function ImperialismBoardShared({ sport, map, game, helpOpen = false, onHelpOpenChange }: Props) {
  /* Round 428 part two: TODAY IS PINNED AT MOUNT and threaded into every
     conquestDaily call, so the rng that deals the map, the record read on
     mount and the record written at the end all name the same day. */
  const todayStr = useRef(getTodayET()).current;
  /* The whole season in one value, with the rng that dealt it. Restoring in
     the initialiser means a reloaded daily is already in place before the
     first paint, and useGameCompletion never sees a false finish. */
  const [session, setSession] = useState<Session | null>(() => {
    const restored = restoreDailyRun(sport, todayStr);
    return restored ? { ...restored, settled: null } : null;
  });
  const [prediction, setPrediction] = useState<string | null>(null);

  // Round 50: the Daily Challenge. Same seeded season for every player
  // (fixtures AND results), one scored run per ET day, streaks, share line.
  const [dailyDone, setDailyDone] = useState<ConquestDailyResult | null>(() => loadDailyResult(sport.key, todayStr));
  const [dailyStreak, setDailyStreak] = useState(() => loadDailyStreak(sport.key, todayStr));
  const [mode, setMode] = useState<'daily' | 'free'>(() => (loadDailyResult(sport.key, todayStr) ? 'free' : 'daily'));
  const dailySaved = useRef(false);

  /* Round 529: the stage's own state. Deterministic initialisers only. */
  const [highlightTeam, setHighlightTeam] = useState<string | null>(null);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const [scenesDone, setScenesDone] = useState(false);
  const [reducedMotion] = useState(prefersReducedMotion);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(max-width: 639px)');
    const on = () => setNarrow(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, []);

  const run = session?.run ?? null;
  const phase = run?.phase ?? 'pick';
  const favorite = run?.favorite ?? null;
  const owners = useMemo(() => run?.owners ?? {}, [run]);
  const records = run?.records ?? {};
  const picksMade = run?.picks.length ?? 0;

  const colorOf = useMemo(() => {
    const m = new Map(map.teams.map(t => [t.id, t.color]));
    return (id: string) => m.get(id) ?? '#888888';
  }, [map]);
  const groups = useMemo(() => {
    const m = new Map<string, ImperialismTeam[]>();
    for (const t of sport.teams) {
      const g = t.group ?? '';
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(t);
    }
    return [...m.entries()];
  }, [sport]);
  const homeRegions = useMemo(() => deriveHomeRegions(sport, map), [sport, map]);
  const regionArea = useMemo(() => new Map(map.regions.map(r => [r.id, { area: bboxArea(pathBoundingBox(r.path)), x: r.labelX, y: r.labelY }])), [map]);

  const label = (id: string) => teamLabel(sport, id);
  const counts = useMemo(() => empireCounts(sport, owners), [sport, owners]);
  const total = Object.keys(owners).length;
  const landless = useMemo(() => landlessTeams(sport, owners), [sport, owners]);
  const inPlayoffs = run?.bracket != null;
  const roundLabel = run ? labelOfRound(sport, run) : '';

  const featured = useMemo(() => (run ? featuredPairing(sport, run) : null), [sport, run]);
  const score = run ? runScore(run) : 0;

  /* Round 529: the round just settled, as scenes. Empty after a reload or
     once Continue has been pressed, so the recap shows directly. */
  const settled = session?.settled ?? null;
  const scenes = useMemo(
    () => (run && settled && run.rounds.length > 0 ? buildScenes(run, run.rounds.length - 1, settled.featured, settled.call) : []),
    [run, settled],
  );
  const player = useScenePlayer(scenes, map, { reducedMotion, onDone: () => setScenesDone(true) });
  const { play: playScenes } = player;
  useEffect(() => {
    if (scenes.length === 0) return;
    setScenesDone(false);
    setScrubIndex(null);
    playScenes();
  }, [scenes, playScenes]);
  const sceneActive = scenes.length > 0 && !scenesDone;
  const featuredScene = useMemo(() => scenes.find(s => s.featured) ?? null, [scenes]);
  const wheel = useMemo(() => (featuredScene ? wheelSpec(sport, map, featuredScene.game.home) : null), [sport, map, featuredScene]);
  /* The needle points from the label point of the attacker's largest region
     to the defender's, on the map the scene opens on. */
  const arrowDeg = useMemo(() => {
    if (!featuredScene) return null;
    const anchor = (teamId: string) => {
      let best: { area: number; x: number; y: number } | null = null;
      for (const r of Object.keys(featuredScene.before)) {
        if (featuredScene.before[r] !== teamId) continue;
        const g = regionArea.get(r);
        if (g && (!best || g.area > best.area)) best = g;
      }
      return best;
    };
    const a = anchor(featuredScene.game.home);
    const d = anchor(featuredScene.game.away);
    return a && d ? arrowAngle(a, d) : null;
  }, [featuredScene, regionArea]);
  const showWheel = sceneActive && !!wheel && !!player.scene?.featured && player.cursor.beat === 'card';

  /* What the stage shows: the scrubbed map while the timeline is held, the
     scene's frame while a round plays out (and its closing frame until
     Continue, so the last wave finishes), else the live map. */
  const scrubbing = run !== null && scrubIndex !== null && scrubIndex >= 0 && scrubIndex < run.history.length - 1;
  const stageOwners = scrubbing ? run.history[scrubIndex] : scenes.length > 0 ? player.frame.owners : owners;
  const pendingBattle: ConquestBattleView | null = featured && phase === 'preview'
    ? { attacker: featured[0], defender: featured[1], stage: 'pending' }
    : null;
  const stageBattle = scrubbing ? null : scenes.length > 0 ? player.frame.battle : pendingBattle;
  const stageTakeover = scrubbing || scenes.length === 0 ? null : player.frame.takeover;
  const stageFocus = scrubbing || !sceneActive ? null : player.frame.focusRegions;
  const seasonBook = useMemo(() => (run ? seasonRecords(sport, run) : []), [sport, run]);
  const timelineLabels = useMemo(() => {
    if (!run) return ['Start'];
    const labels = ['Start', ...run.rounds.map(r => r.label)];
    if (run.champion && labels.length > 1) labels[labels.length - 1] = 'Final';
    return labels;
  }, [run]);

  useGameCompletion(game.gameId, phase === 'done', score, favorite ? statesOf(owners, favorite).length : 0);

  /* Round 476: the call card sits under the map, the wiped-out line, the
     standings toggle and, in the recap, a list of every game. Measured on a
     390 by 844 phone before this: the first thing to press after picking a
     club was off the bottom of the screen. The reveal ref puts each new step
     back in view without moving the page when it is already readable.
     Round 529: the scene player mounts inside this same ref, and its key does
     not change from one scene to the next, so a new scene never moves the
     page. */
  const revealRef = useRevealScroll<HTMLDivElement>(`${phase}-${picksMade}`);

  // Lock in the daily result the moment the season ends.
  useEffect(() => {
    if (!run || phase !== 'done' || mode !== 'daily' || !run.champion || dailySaved.current || dailyDone) return;
    dailySaved.current = true;
    const result: ConquestDailyResult = {
      date: todayStr,
      team: run.favorite,
      score,
      empire: statesOf(run.owners, run.favorite).length,
      calls: run.hits,
      callsTotal: run.picks.length,
      champion: run.champion,
      championWasYou: run.champion === run.favorite,
    };
    const s = saveDailyResult(sport.key, result, todayStr, run.picks);
    setDailyDone(result);
    setDailyStreak(s);
  }, [run, phase, mode, score, dailyDone, sport.key, todayStr]);

  /* Round 529: the help opens once per route before the first run, under a
     key shaped like the arcade's, and the page's "?" reopens it. */
  const openHelp = useRef(onHelpOpenChange);
  openHelp.current = onHelpOpenChange;
  useEffect(() => {
    if (!openHelp.current) return;
    const key = `${game.gameId}-how-to-play-seen`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, 'true');
    } catch {
      return;
    }
    openHelp.current(true);
  }, [game.gameId]);

  const start = (teamId: string) => {
    const rng = mode === 'daily' ? dailyConquestRng(sport.key, todayStr) : Math.random;
    dailySaved.current = false;
    /* The club goes down before the first ball is kicked: it is half of what
       replays the run, and a reload between the pick and the first call must
       come back to the same club. */
    const opened = startRun(sport, teamId, rng);
    if (mode === 'daily') saveDailyRun(sport.key, dailyRunRecord(opened), todayStr);
    setSession({ run: opened, rng, settled: null });
    setPrediction(null);
    setHighlightTeam(null);
    setScrubIndex(null);
    setScenesDone(false);
  };

  const play = () => {
    if (!session || !prediction) return;
    const featuredNow = featuredPairing(sport, session.run);
    const next = playRound(sport, session.run, prediction, session.rng);
    /* Written in the same breath as the roll. Writing it on Continue instead
       would let a player read the result, reload, and call it again knowing
       the answer, which is the whole defect. */
    if (mode === 'daily') saveDailyRun(sport.key, dailyRunRecord(next), todayStr);
    setSession({ run: next, rng: session.rng, settled: { featured: featuredNow, call: prediction } });
    setPrediction(null);
    setHighlightTeam(null);
    setScrubIndex(null);
  };

  const continueOn = () => {
    if (!session) return;
    setSession({ run: continueRun(sport, session.run, session.rng), rng: session.rng, settled: null });
    setPrediction(null);
  };

  const reset = () => {
    setSession(null);
    setPrediction(null);
    setHighlightTeam(null);
    setScrubIndex(null);
    setScenesDone(false);
  };

  const regionCountLabel = (n: number) => `${n} ${regionNoun(sport, n)}`;
  /* "club" on the soccer map, "team" on the four US maps. */
  const teamNoun = sport.teamNoun ?? 'club';

  const help = (
    <ImperialismHowToPlay open={helpOpen} onOpenChange={onHelpOpenChange ?? (() => {})} sport={sport} game={game} />
  );

  /* ---------------- pick screen ---------------- */
  if (!run) {
    const playedToday = mode === 'daily' && dailyDone;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2">
          {(['daily', 'free'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold transition-all',
                mode === m ? 'border-gold bg-gold/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {m === 'daily'
                ? (<><CalendarDays className="h-3.5 w-3.5" /> Daily Challenge{dailyStreak >= 2 ? ` · 🔥${dailyStreak}` : ''}</>)
                : 'Free Play'}
            </button>
          ))}
        </div>
        {playedToday ? (
          <div className="rounded-2xl border border-gold/40 bg-card p-5 text-center animate-in fade-in zoom-in-95 duration-300">
            <p className="font-display text-lg font-bold text-foreground">Today's Conquest is in the books</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You rode {label(dailyDone.team)} to {regionCountLabel(dailyDone.empire)} and called {dailyDone.calls}/{dailyDone.callsTotal} games.
              {dailyDone.championWasYou ? ' Your empire took the whole map.' : ` ${label(dailyDone.champion)} took the map.`}
            </p>
            <div className="mt-3 flex items-center justify-center gap-3 text-sm">
              <span className="rounded-full border border-border bg-background px-3 py-1.5">Score <b className="text-gold">{dailyDone.score}</b></span>
              {dailyStreak >= 2 && (
                <span className="rounded-full border border-border bg-background px-3 py-1.5">Streak <b className="text-gold">🔥{dailyStreak}</b></span>
              )}
            </div>
            <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => setMode('free')}
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground"
              >
                <RotateCcw className="h-4 w-4" /> Free play instead
              </button>
              <ShareButtons
                gameName={game.name}
                gamePath={game.path}
                score={`${dailyDone.score} pts`}
                customText={dailyShareText(game.name, game.path, dailyDone, dailyStreak, label(dailyDone.champion), label(dailyDone.team))}
              />
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">A fresh map drops at midnight Eastern.</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="font-display text-lg font-bold text-foreground">Pick your {teamNoun}</p>
              <p className="mt-1 text-xs text-muted-foreground">{game.pitch}</p>
              {mode === 'daily' && (
                <p className="mt-2 text-[11px] font-semibold text-gold">
                  🗓️ Daily Challenge: every player gets today's exact fixtures and results. Pick the right empire, call the games, post your score. One scored run per day, and it picks up where you left off if you close the tab.
                </p>
              )}
            </div>
            {groups.map(([groupName, teams]) => (
              <div key={groupName || 'all'}>
                {groupName && (
                  <p className="mb-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{groupName}</p>
                )}
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {teams.map(t => (
                    <button
                      key={t.id}
                      onClick={() => start(t.id)}
                      className="rounded-lg border border-border bg-card px-2 py-2 text-left transition-all hover:scale-[1.02] hover:border-primary/60"
                    >
                      <span className="block h-1.5 w-full rounded-full" style={{ background: colorOf(t.id) }} />
                      <span className="mt-1.5 block truncate text-xs font-bold text-foreground">{t.city ? `${t.city} ${t.name}` : t.name}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">{t.sub ?? `${t.overall} OVR`}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
        {help}
      </div>
    );
  }

  const myStates = favorite ? statesOf(owners, favorite).length : 0;
  const toLive = () => setScrubIndex(null);

  return (
    <div className="space-y-3">
      <p data-conquest-status className="text-center text-[11px] text-muted-foreground">
        <b className="text-foreground">{inPlayoffs ? roundLabel : `${sport.roundNoun} ${run.round} of ${sport.regularRounds}`}</b>
        {favorite && (
          <>
            {' · '}
            <span className="font-semibold" style={{ color: colorOf(favorite) }}>{label(favorite)}</span>
            {' '}<b className={myStates === 0 ? 'text-destructive' : 'text-primary'}>{myStates}</b>/{total} {regionNoun(sport, total)}
          </>
        )}
        {' · Calls '}<b className="text-gold">{run.hits}</b>/{run.picks.length}
      </p>

      {/* Round 529: the map is the stage. Edge to edge on a phone, 760px on
          desktop, the wheel over it while the featured game is drawn. */}
      <div
        data-conquest-stage
        className="relative -mx-4 w-[calc(100%+2rem)] overflow-hidden sm:mx-auto sm:w-full sm:max-w-[760px] sm:rounded-2xl sm:border sm:border-border md:-mx-[60px] md:w-[760px] md:max-w-none"
      >
        <ConquestRegionMap
          sport={map}
          owners={stageOwners}
          battle={stageBattle}
          takeover={stageTakeover}
          focusRegions={stageFocus}
          homeRegions={homeRegions}
          highlightTeam={highlightTeam}
          labelStyle="caps"
          size="stage"
          showLegend={false}
        />
        {showWheel && wheel && (
          <div data-conquest-wheel-overlay className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0f1a]/75">
            <ConquestWheel spec={wheel} spinning arrowDeg={arrowDeg} reducedMotion={reducedMotion} />
          </div>
        )}
        {scrubbing && (
          <span data-conquest-scrub-label className="pointer-events-none absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-bold text-foreground">
            {timelineLabels[scrubIndex ?? 0]}
          </span>
        )}
      </div>

      <ConquestStandingsStrip
        sport={sport}
        map={map}
        owners={scrubbing ? stageOwners : owners}
        records={records}
        favorite={favorite}
        highlightTeam={highlightTeam}
        onHighlight={setHighlightTeam}
        compact={narrow}
      />

      {/* Release brings the map back to now: the scrubbed map is a peek. */}
      <div onPointerUp={toLive} onPointerCancel={toLive} onKeyUp={toLive} onTouchEnd={toLive}>
        <ConquestTimeline
          labels={timelineLabels}
          index={scrubIndex ?? run.history.length - 1}
          onChange={setScrubIndex}
          disabled={sceneActive}
        />
      </div>

      {landless.length > 0 && !sceneActive && (
        <p className="text-center text-[11px] text-muted-foreground">
          🏴 Wiped out but still dangerous: {landless.length > 12
            ? `${landless.slice(0, 12).map(label).join(', ')} and ${landless.length - 12} more`
            : landless.map(label).join(', ')}
        </p>
      )}

      {/* the step to press: kept in view on a phone by the reveal ref */}
      <div ref={revealRef}>
        {/* preview: prediction + play */}
        {phase === 'preview' && featured && (
          <div data-conquest-call className="rounded-2xl border border-gold/40 bg-card p-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gold">
              <Swords className="mr-1 inline h-3.5 w-3.5" />
              {roundLabel}: {favorite && (featured[0] === favorite || featured[1] === favorite) ? 'your game. Call it.' : `game of the ${sport.roundNoun.toLowerCase()}. Call it.`}
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              {[featured[0], featured[1]].map((tid, i) => {
                const p = i === 0 ? homeWinProb(sport, featured[0], featured[1]) : 1 - homeWinProb(sport, featured[0], featured[1]);
                return (
                  <button
                    key={tid}
                    data-conquest-pick={tid}
                    onClick={() => setPrediction(tid)}
                    className={cn(
                      'flex-1 max-w-[220px] rounded-xl border-2 px-3 py-3 transition-all',
                      prediction === tid ? 'border-gold bg-gold/10 scale-[1.02]' : 'border-border bg-background hover:border-primary/50',
                    )}
                  >
                    <span className="block h-1.5 w-full rounded-full" style={{ background: colorOf(tid) }} />
                    <span className="mt-1.5 block truncate text-sm font-bold text-foreground">{label(tid)}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {regionCountLabel(counts.get(tid) ?? 0)} · {recordLabel(records[tid])} · {Math.round(p * 100)}% to win
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              data-conquest-play
              onClick={play}
              disabled={!prediction}
              className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40 sm:w-auto"
            >
              <Flag className="h-4 w-4" /> Play {roundLabel}
            </button>
            {!prediction && <p className="mt-2 text-[10px] text-muted-foreground">Pick a winner first. +25 score per correct call.</p>}
          </div>
        )}

        {/* the round plays out, one game at a time */}
        {phase === 'recap' && sceneActive && favorite && (
          <ConquestScenePlayer
            sport={sport}
            map={map}
            scenes={scenes}
            cursor={player.cursor}
            records={records}
            favorite={favorite}
            wheel={wheel}
            arrowDeg={arrowDeg}
            onSkip={player.skip}
          />
        )}

        {/* recap, once the scenes have played (or straight away after a reload) */}
        {phase === 'recap' && !sceneActive && run.lastRound && (
          <div data-conquest-recap className="rounded-2xl border border-border bg-card p-4">
            <p className="text-center text-sm font-bold text-foreground">{run.lastRound.label} results</p>
            <div className="mt-2 space-y-1">
              {run.lastRound.headlines.map((h, i) => (
                <p key={i} className="text-center text-xs text-muted-foreground">{h}</p>
              ))}
            </div>
            <div className="mt-3 grid max-h-48 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
              {run.lastRound.games.map((g, i) => {
                const involved = favorite && (g.home === favorite || g.away === favorite);
                const loser = g.winner === g.home ? g.away : g.home;
                const winnerScore = g.winner === g.home ? g.homeScore : g.awayScore;
                const loserScore = g.winner === g.home ? g.awayScore : g.homeScore;
                return (
                  <p
                    key={i}
                    data-recap-line
                    className={cn(
                      'rounded-lg border px-2 py-1 text-[11px]',
                      involved ? 'border-gold/60 bg-gold/5' : 'border-border/60 bg-background',
                    )}
                  >
                    <b className="text-foreground">{label(g.winner)}</b>
                    <span className="text-muted-foreground"> {winnerScore} to {loserScore} {label(loser)}{g.overtime ? ` (${sport.score.tieBreakLabel})` : ''}</span>
                    {g.swing > 0 && <span className="text-gold">, +{g.swing} {regionNoun(sport, g.swing)}</span>}
                  </p>
                );
              })}
            </div>
            <div className="mt-3 text-center">
              <button
                data-conquest-continue
                onClick={continueOn}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 sm:w-auto"
              >
                {run.champion ? 'See the final map' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* done: Conquest Complete */}
        {phase === 'done' && run.champion && (
          <div data-conquest-complete className="relative overflow-hidden rounded-2xl border border-gold/50 bg-card p-5 text-center">
            <CelebrationStyles />
            <ConfettiBurst seed={run.picks.length} />
            <span data-crown className="cm-slam mx-auto block w-fit">
              <Crown className="h-10 w-10 text-gold" />
            </span>
            <p className="cm-slam mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gold" style={{ animationDelay: '120ms' }}>Conquest Complete</p>
            <p className="cm-rise font-display text-2xl font-black text-foreground" style={{ animationDelay: '260ms' }}>
              {label(run.champion)} rule the map
            </p>
            <p className="cm-rise mt-1 text-sm text-muted-foreground" style={{ animationDelay: '360ms' }}>
              {run.champion === favorite
                ? 'Your empire. Your dynasty. Absolute scenes.'
                : favorite && myStates > 0
                  ? `Your ${label(favorite)} held ${regionCountLabel(myStates)} to the end.`
                  : `Your ${teamNoun} ended the season wiped off the map. Brutal format.`}
            </p>
            <div className="cm-rise mt-3 flex flex-wrap items-center justify-center gap-2 text-sm" style={{ animationDelay: '460ms' }}>
              <span className="rounded-full border border-border bg-background px-3 py-1.5">Empire <b className="text-primary">{myStates}</b></span>
              <span className="rounded-full border border-border bg-background px-3 py-1.5">Calls <b className="text-gold">{run.hits}/{run.picks.length}</b></span>
              <span className="rounded-full border border-border bg-background px-3 py-1.5">Score <b className="text-gold">{score}</b></span>
              {mode === 'daily' && dailyStreak >= 2 && (
                <span className="rounded-full border border-border bg-background px-3 py-1.5">Streak <b className="text-gold">🔥{dailyStreak}</b></span>
              )}
            </div>
            <div data-season-records className="cm-rise mt-4 grid grid-cols-1 gap-1.5 text-left sm:grid-cols-2" style={{ animationDelay: '560ms' }}>
              {seasonBook.map(r => (
                <div
                  key={r.key}
                  data-record={r.key}
                  data-team={r.teamId ?? ''}
                  data-value={r.value}
                  className="rounded-xl border border-border bg-background px-3 py-2"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{r.title}</p>
                  {r.teamId ? (
                    <p className="mt-0.5 text-xs text-foreground">
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: colorOf(r.teamId) }} />
                      {r.detail}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted-foreground">Nobody this season.</p>
                  )}
                </div>
              ))}
            </div>
            {mode === 'daily' && (
              <p className="mt-2 text-[11px] text-muted-foreground">🗓️ Daily done. A fresh map drops at midnight Eastern.</p>
            )}
            <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => { if (mode === 'daily') setMode('free'); reset(); }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground"
              >
                <RotateCcw className="h-4 w-4" /> {mode === 'daily' ? 'Free play' : 'New season'}
              </button>
              <ShareButtons
                gameName={game.name}
                gamePath={game.path}
                score={`${score} pts`}
                customText={mode === 'daily' && dailyDone
                  ? dailyShareText(game.name, game.path, dailyDone, dailyStreak, label(run.champion), favorite ? label(favorite) : teamNoun)
                  : `${game.name} 🗺️ ${label(run.champion)} took the whole map. My ${favorite ? label(favorite) : teamNoun} finished with ${regionCountLabel(myStates)} and I called ${run.hits}/${run.picks.length} games. Score ${score}. douknowball.com${game.path}`}
              />
            </div>
          </div>
        )}
      </div>
      {help}
    </div>
  );
}
