import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Crown, Flag, ListOrdered, RotateCcw, Swords } from 'lucide-react';
import ConquestRegionMap, { useOwnerTakeover, type ConquestBattleView } from '@/components/conquest/ConquestRegionMap';
import ShareButtons from '@/components/game/ShareButtons';
import { isLightHex, type ConquestMapSport } from '@/lib/conquestMapLook';
import {
  empireCounts, landlessTeams, statesOf, homeWinProb, teamLabel, recordLabel, regionNoun,
  type ImperialismSport, type ImperialismTeam, type ImperialismGameSpec,
} from '@/lib/imperialismEngine';
import {
  startRun, playRound, continueRun, runScore, roundLabel as labelOfRound,
  featuredPairing, featuredResult, restoreDailyRun, dailyRunRecord, type ConquestRun,
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
 */

interface Props {
  sport: ImperialismSport;
  map: ConquestMapSport;
  game: ImperialismGameSpec;
}

/** The run plus the rng that dealt it. They move together or the replay lies. */
interface Session {
  run: ConquestRun;
  rng: () => number;
}

export default function ImperialismBoardShared({ sport, map, game }: Props) {
  /* Round 428 part two: TODAY IS PINNED AT MOUNT and threaded into every
     conquestDaily call, so the rng that deals the map, the record read on
     mount and the record written at the end all name the same day. */
  const todayStr = useRef(getTodayET()).current;
  /* The whole season in one value, with the rng that dealt it. Restoring in
     the initialiser means a reloaded daily is already in place before the
     first paint, and useGameCompletion never sees a false finish. */
  const [session, setSession] = useState<Session | null>(() => restoreDailyRun(sport, todayStr));
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showStandings, setShowStandings] = useState(false);

  // Round 50: the Daily Challenge. Same seeded season for every player
  // (fixtures AND results), one scored run per ET day, streaks, share line.
  const [dailyDone, setDailyDone] = useState<ConquestDailyResult | null>(() => loadDailyResult(sport.key, todayStr));
  const [dailyStreak, setDailyStreak] = useState(() => loadDailyStreak(sport.key, todayStr));
  const [mode, setMode] = useState<'daily' | 'free'>(() => (loadDailyResult(sport.key, todayStr) ? 'free' : 'daily'));
  const dailySaved = useRef(false);

  const run = session?.run ?? null;
  const phase = run?.phase ?? 'pick';
  const favorite = run?.favorite ?? null;
  const owners = useMemo(() => run?.owners ?? {}, [run]);
  const records = run?.records ?? {};
  const picksMade = run?.picks.length ?? 0;

  const teamById = useMemo(() => new Map(sport.teams.map(t => [t.id, t])), [sport]);
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

  const label = (id: string) => teamLabel(sport, id);
  const counts = useMemo(() => empireCounts(sport, owners), [sport, owners]);
  const total = Object.keys(owners).length;
  const landless = useMemo(() => landlessTeams(sport, owners), [sport, owners]);
  const inPlayoffs = run?.bracket != null;
  const roundLabel = run ? labelOfRound(sport, run) : '';

  const featured = useMemo(() => (run ? featuredPairing(sport, run) : null), [sport, run]);
  const score = run ? runScore(run) : 0;

  // Round 457: the shared map reads the takeover off the ownership change and
  // spotlights the featured game before the roll and its result after.
  const takeover = useOwnerTakeover(owners, phase !== 'pick');
  const featuredGame = run ? featuredResult(run, featured) : undefined;
  const battleView: ConquestBattleView | null = featured && (phase === 'preview' || phase === 'recap')
    ? {
        attacker: featured[0],
        defender: featured[1],
        stage: phase === 'preview' ? 'pending' : 'resolved',
        winner: phase === 'recap' ? featuredGame?.winner ?? null : null,
      }
    : null;

  useGameCompletion(game.gameId, phase === 'done', score, favorite ? statesOf(owners, favorite).length : 0);

  /* Round 476: the call card sits under the map, the wiped-out line, the
     standings toggle and, in the recap, a list of every game. Measured on a
     390 by 844 phone before this: the first thing to press after picking a
     club was off the bottom of the screen. The reveal ref puts each new step
     back in view without moving the page when it is already readable. */
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

  const start = (teamId: string) => {
    const rng = mode === 'daily' ? dailyConquestRng(sport.key, todayStr) : Math.random;
    dailySaved.current = false;
    /* The club goes down before the first ball is kicked: it is half of what
       replays the run, and a reload between the pick and the first call must
       come back to the same club. */
    const opened = startRun(sport, teamId, rng);
    if (mode === 'daily') saveDailyRun(sport.key, dailyRunRecord(opened), todayStr);
    setSession({ run: opened, rng });
    setPrediction(null);
    setShowStandings(false);
  };

  const play = () => {
    if (!session || !prediction) return;
    const next = playRound(sport, session.run, prediction, session.rng);
    /* Written in the same breath as the roll. Writing it on Continue instead
       would let a player read the result, reload, and call it again knowing
       the answer, which is the whole defect. */
    if (mode === 'daily') saveDailyRun(sport.key, dailyRunRecord(next), todayStr);
    setSession({ run: next, rng: session.rng });
    setPrediction(null);
  };

  const continueOn = () => {
    if (!session) return;
    setSession({ run: continueRun(sport, session.run, session.rng), rng: session.rng });
    setPrediction(null);
  };

  const reset = () => {
    setSession(null);
    setPrediction(null);
  };

  const chip = (teamId: string, extra?: string) => {
    const t = teamById.get(teamId);
    if (!t) return null;
    const color = colorOf(teamId);
    return (
      <span
        className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', extra)}
        style={{ background: color, color: isLightHex(color) ? '#111' : '#fff' }}
      >
        {label(teamId)}
      </span>
    );
  };

  const regionCountLabel = (n: number) => `${n} ${regionNoun(sport, n)}`;
  /* "club" on the soccer map, "team" on the four US maps. */
  const teamNoun = sport.teamNoun ?? 'club';

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
      </div>
    );
  }

  const myStates = favorite ? statesOf(owners, favorite).length : 0;

  return (
    <div className="space-y-4">
      {/* status bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-full border border-border bg-card px-3 py-1 font-bold text-foreground">
          {inPlayoffs ? roundLabel : `${sport.roundNoun} ${run.round}/${sport.regularRounds}`}
        </span>
        {favorite && chip(favorite)}
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
          Your empire: <b className={myStates === 0 ? 'text-destructive' : 'text-primary'}>{myStates}</b>/{total}
        </span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
          Picks: <b className="text-gold">{run.hits}</b>/{run.picks.length}
        </span>
      </div>

      {/* map, capped on wide screens so a tall cartogram does not fill the page */}
      <div className="mx-auto w-full max-w-[560px]">
        <ConquestRegionMap sport={map} owners={owners} battle={battleView} takeover={takeover} />
      </div>

      {landless.length > 0 && (
        <p className="text-center text-[11px] text-muted-foreground">
          🏴 Wiped out but still dangerous: {landless.length > 12
            ? `${landless.slice(0, 12).map(label).join(', ')} and ${landless.length - 12} more`
            : landless.map(label).join(', ')}
        </p>
      )}

      {/* standings */}
      <div className="text-center">
        <button
          onClick={() => setShowStandings(s => !s)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ListOrdered className="h-3.5 w-3.5" /> {showStandings ? 'Hide standings' : 'Standings'}
        </button>
      </div>
      {showStandings && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="grid max-h-64 grid-cols-1 gap-0.5 overflow-y-auto sm:grid-cols-2">
            {sport.teams
              .map(t => t.id)
              .sort((a, b) =>
                (counts.get(b)! - counts.get(a)!) ||
                ((records[b]?.w ?? 0) - (records[a]?.w ?? 0)))
              .map((tid, i) => (
                <div
                  key={tid}
                  className={cn(
                    'flex items-center justify-between rounded px-2 py-1 text-[11px]',
                    tid === favorite ? 'bg-gold/10 border border-gold/40' : i < 8 ? 'bg-background' : 'bg-background/50',
                  )}
                >
                  <span className={cn('truncate', i < 8 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                    {i + 1}. {label(tid)}
                  </span>
                  <span className="ml-2 shrink-0 text-muted-foreground">
                    {counts.get(tid)} {sport.regionShort ?? sport.regionNoun.slice(0, 2)} · {recordLabel(records[tid])}
                    {(records[tid]?.streak ?? 0) >= 3 ? ' 🔥' : (records[tid]?.streak ?? 0) <= -3 ? ' 🧊' : ''}
                  </span>
                </div>
              ))}
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">Top 8 make the playoffs: {regionNoun(sport, 2)} first, record breaks ties.</p>
        </div>
      )}

      {/* the step to press: kept in view on a phone by the reveal ref */}
      <div ref={revealRef}>
        {/* preview: prediction + play */}
        {phase === 'preview' && featured && (
          <div className="rounded-2xl border border-gold/40 bg-card p-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gold">
              <Swords className="mr-1 inline h-3.5 w-3.5" />
              {favorite && (featured[0] === favorite || featured[1] === favorite) ? `Your game this ${sport.roundNoun.toLowerCase()}. Call it.` : `Game of the ${sport.roundNoun.toLowerCase()}. Call it.`}
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              {[featured[0], featured[1]].map((tid, i) => {
                const p = i === 0 ? homeWinProb(sport, featured[0], featured[1]) : 1 - homeWinProb(sport, featured[0], featured[1]);
                return (
                  <button
                    key={tid}
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
              onClick={play}
              disabled={!prediction}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              <Flag className="h-4 w-4" /> Play {roundLabel}
            </button>
            {!prediction && <p className="mt-2 text-[10px] text-muted-foreground">Pick a winner first. +25 score per correct call.</p>}
          </div>
        )}

        {/* recap */}
        {phase === 'recap' && run.lastRound && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-center text-sm font-bold text-foreground">{run.lastRound.label} results</p>
            <div className="mt-2 space-y-1">
              {run.lastRound.headlines.map((h, i) => (
                <p key={i} className="text-center text-xs text-muted-foreground">{h}</p>
              ))}
            </div>
            <div className="mt-3 grid max-h-48 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
              {run.lastRound.games.map((g, i) => {
                const involved = favorite && (g.home === favorite || g.away === favorite);
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center justify-between rounded-lg border px-2 py-1 text-[11px]',
                      involved ? 'border-gold/60 bg-gold/5' : 'border-border/60 bg-background',
                    )}
                  >
                    <span className={cn('truncate', g.winner === g.home ? 'font-bold text-foreground' : 'text-muted-foreground')}>
                      {label(g.home)} {g.homeScore}
                    </span>
                    <span className="px-1 text-muted-foreground/60">·</span>
                    <span className={cn('truncate', g.winner === g.away ? 'font-bold text-foreground' : 'text-muted-foreground')}>
                      {g.awayScore} {label(g.away)}
                    </span>
                    <span className="ml-1 shrink-0 text-gold">{g.swing > 0 ? `+${g.swing}` : ''}{g.overtime ? ` ${sport.score.tieBreakLabel}` : ''}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-center">
              <button
                onClick={continueOn}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                {run.champion ? 'See the final map' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* done */}
        {phase === 'done' && run.champion && (
          <div className="rounded-2xl border border-gold/50 bg-card p-5 text-center">
            <Crown className="mx-auto h-10 w-10 text-gold" />
            <p className="mt-2 font-display text-2xl font-black text-foreground">
              {label(run.champion)} rule the map
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {run.champion === favorite
                ? 'Your empire. Your dynasty. Absolute scenes.'
                : favorite && myStates > 0
                  ? `Your ${label(favorite)} held ${regionCountLabel(myStates)} to the end.`
                  : `Your ${teamNoun} ended the season wiped off the map. Brutal format.`}
            </p>
            <div className="mt-3 flex items-center justify-center gap-3 text-sm">
              <span className="rounded-full border border-border bg-background px-3 py-1.5">Empire <b className="text-primary">{myStates}</b></span>
              <span className="rounded-full border border-border bg-background px-3 py-1.5">Calls <b className="text-gold">{run.hits}/{run.picks.length}</b></span>
              <span className="rounded-full border border-border bg-background px-3 py-1.5">Score <b className="text-gold">{score}</b></span>
              {mode === 'daily' && dailyStreak >= 2 && (
                <span className="rounded-full border border-border bg-background px-3 py-1.5">Streak <b className="text-gold">🔥{dailyStreak}</b></span>
              )}
            </div>
            {mode === 'daily' && (
              <p className="mt-2 text-[11px] text-muted-foreground">🗓️ Daily done. A fresh map drops at midnight Eastern.</p>
            )}
            <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => { if (mode === 'daily') setMode('free'); reset(); }}
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground"
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
    </div>
  );
}
