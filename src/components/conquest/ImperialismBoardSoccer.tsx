import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Crown, Flag, Handshake, ListOrdered, RotateCcw, Swords } from 'lucide-react';
import ConquestMapSoccer from '@/components/conquest/ConquestMapSoccer';
import ShareButtons from '@/components/game/ShareButtons';
import { SOCCER_CLUBS, SOCCER_CLUB_MAP } from '@/data/conquestDataSoccer';
import { isLightColor } from '@/data/conquestData';
import {
  SOCCER_REGULAR_ROUNDS, SOCCER_PLAYOFF_LABELS,
  seedSoccerEmpires, soccerRandomPairings, resolveSoccerGame, soccerBuildHeadlines,
  soccerEmpireCounts, soccerLandlessClubs, soccerLandsOf, soccerPlayoffSeeds, soccerTotalConquest,
  soccerHomeWinProb, soccerClubLabel, soccerFinalScore, soccerPoints,
  soccerEmptyRecords, soccerApplyRecords, soccerRecordLabel, DRAW_BAND,
  type SoccerImpGame, type SoccerImpRoundResult, type SoccerImpRecords,
} from '@/lib/imperialismSoccer';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  dailyConquestRng, loadDailyResult, loadDailyStreak, saveDailyResult, dailyShareText,
  type ConquestDailyResult,
} from '@/lib/conquestDaily';
import { getTodayET } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

type Phase = 'pick' | 'preview' | 'recap' | 'done';

/** The three things a football result can be, which is the point of this one. */
const DRAW_PICK = 'DRAW';

interface BracketState {
  round: number;          // 0 QF, 1 SF, 2 Final
  alive: string[];
}

export default function ImperialismBoardSoccer() {
  const [phase, setPhase] = useState<Phase>('pick');
  const [favorite, setFavorite] = useState<string | null>(null);
  const [owners, setOwners] = useState<Record<string, string>>({});
  const [round, setRound] = useState(1);
  const [bracket, setBracket] = useState<BracketState | null>(null);
  const [pairings, setPairings] = useState<[string, string][]>([]);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [predictionHits, setPredictionHits] = useState(0);
  const [predictionTotal, setPredictionTotal] = useState(0);
  const [lastRound, setLastRound] = useState<SoccerImpRoundResult | null>(null);
  const [champion, setChampion] = useState<string | null>(null);
  const [madePlayoffs, setMadePlayoffs] = useState(false);
  const [records, setRecords] = useState<SoccerImpRecords>({});
  const [showStandings, setShowStandings] = useState(false);

  const [dailyDone, setDailyDone] = useState<ConquestDailyResult | null>(() => loadDailyResult('soccer'));
  const [dailyStreak, setDailyStreak] = useState(() => loadDailyStreak('soccer'));
  const [mode, setMode] = useState<'daily' | 'free'>(() => (loadDailyResult('soccer') ? 'free' : 'daily'));
  const rngRef = useRef<() => number>(Math.random);
  const dailySaved = useRef(false);

  const counts = useMemo(() => soccerEmpireCounts(owners), [owners]);
  const total = Object.keys(owners).length;
  const landless = useMemo(() => soccerLandlessClubs(owners), [owners]);
  const inPlayoffs = bracket !== null;

  const featured = useMemo(() => {
    if (!pairings.length) return null;
    const mine = favorite ? pairings.find(([h, a]) => h === favorite || a === favorite) : undefined;
    if (mine) return mine;
    return [...pairings].sort(
      (p, q) =>
        (counts.get(q[0])! + counts.get(q[1])!) - (counts.get(p[0])! + counts.get(p[1])!),
    )[0];
  }, [pairings, favorite, counts]);

  const score = useMemo(
    () => (favorite ? soccerFinalScore(favorite, owners, predictionHits, champion, madePlayoffs) : 0),
    [favorite, owners, predictionHits, champion, madePlayoffs],
  );

  useGameCompletion('conquest-soccer-imperialism', phase === 'done', score, favorite ? soccerLandsOf(owners, favorite).length : 0);

  useEffect(() => {
    if (phase !== 'done' || mode !== 'daily' || !champion || !favorite || dailySaved.current || dailyDone) return;
    dailySaved.current = true;
    const result: ConquestDailyResult = {
      date: getTodayET(),
      team: favorite,
      score,
      empire: soccerLandsOf(owners, favorite).length,
      calls: predictionHits,
      callsTotal: predictionTotal,
      champion,
      championWasYou: champion === favorite,
    };
    const s = saveDailyResult('soccer', result);
    setDailyDone(result);
    setDailyStreak(s);
  }, [phase, mode, champion, favorite, score, owners, predictionHits, predictionTotal, dailyDone]);

  const rollPairings = (br: BracketState | null) => {
    if (br) {
      const seeds = br.alive;
      const pairs: [string, string][] = [];
      for (let i = 0; i < seeds.length / 2; i++) {
        pairs.push([seeds[i], seeds[seeds.length - 1 - i]]);
      }
      setPairings(pairs);
    } else {
      setPairings(soccerRandomPairings(rngRef.current));
    }
    setPrediction(null);
  };

  const start = (clubId: string) => {
    rngRef.current = mode === 'daily' ? dailyConquestRng('soccer') : Math.random;
    dailySaved.current = false;
    setFavorite(clubId);
    setOwners(seedSoccerEmpires());
    setRound(1);
    setBracket(null);
    setChampion(null);
    setMadePlayoffs(false);
    setPredictionHits(0);
    setPredictionTotal(0);
    setLastRound(null);
    setRecords(soccerEmptyRecords());
    setShowStandings(false);
    setPhase('preview');
    setPairings(soccerRandomPairings(rngRef.current));
    setPrediction(null);
  };

  const playRound = () => {
    const next = { ...owners };
    const games: SoccerImpGame[] = [];
    for (const [h, a] of pairings) {
      games.push(resolveSoccerGame(h, a, next, rngRef.current, records, inPlayoffs));
    }
    const nextRecords = soccerApplyRecords(records, games);
    setRecords(nextRecords);

    if (featured && prediction) {
      const fg = games.find(g => (g.home === featured[0] && g.away === featured[1]) || (g.home === featured[1] && g.away === featured[0]));
      setPredictionTotal(t => t + 1);
      const called = fg && (prediction === DRAW_PICK ? fg.drawn : fg.winner === prediction);
      if (called) setPredictionHits(h => h + 1);
    }

    const label = inPlayoffs ? SOCCER_PLAYOFF_LABELS[bracket!.round] : `Matchday ${round}`;
    setLastRound({ round, label, games, headlines: soccerBuildHeadlines(games, next, nextRecords) });
    setOwners(next);

    if (inPlayoffs) {
      // A knockout never draws, so every tie yields a winner to advance.
      const winners = games.map(g => g.winner!).filter(Boolean);
      if (bracket!.round >= 2 || winners.length === 1) {
        setChampion(winners[0]);
        setPhase('recap');
        return;
      }
      setBracket({ round: bracket!.round + 1, alive: winners });
      setPhase('recap');
      return;
    }

    const wiped = soccerTotalConquest(next);
    if (wiped) {
      setChampion(wiped);
      setPhase('recap');
      return;
    }

    if (round >= SOCCER_REGULAR_ROUNDS) {
      const seeds = soccerPlayoffSeeds(next, nextRecords);
      setMadePlayoffs(favorite !== null && seeds.includes(favorite));
      setBracket({ round: 0, alive: seeds });
    } else {
      setRound(r => r + 1);
    }
    setPhase('recap');
  };

  const continueOn = () => {
    if (champion) { setPhase('done'); return; }
    rollPairings(bracket);
    setPhase('preview');
  };

  const reset = () => {
    setPhase('pick');
    setFavorite(null);
    setOwners({});
    setPairings([]);
    setLastRound(null);
    setBracket(null);
    setChampion(null);
  };

  const chip = (clubId: string, extra?: string) => {
    const c = SOCCER_CLUB_MAP.get(clubId);
    if (!c) return null;
    return (
      <span
        className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', extra)}
        style={{ background: c.color, color: isLightColor(c.color) ? '#111' : '#fff' }}
      >
        {c.name}
      </span>
    );
  };

  /* ---------------- pick screen ---------------- */
  if (phase === 'pick') {
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
              You rode {soccerClubLabel(dailyDone.team)} to {dailyDone.empire} countr{dailyDone.empire === 1 ? 'y' : 'ies'} and called {dailyDone.calls}/{dailyDone.callsTotal} ties.
              {dailyDone.championWasYou ? ' Your club took the whole world.' : ` ${soccerClubLabel(dailyDone.champion)} took the world.`}
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
                gameName="Soccer Conquest"
                gamePath="/conquest-soccer"
                score={`${dailyDone.score} pts`}
                customText={dailyShareText('Soccer Conquest', '/conquest-soccer', dailyDone, dailyStreak, soccerClubLabel(dailyDone.champion), soccerClubLabel(dailyDone.team))}
              />
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">A fresh world drops at midnight Eastern.</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="font-display text-lg font-bold text-foreground">Pick your club</p>
              <p className="mt-1 text-xs text-muted-foreground">
                One club per country, 32 of them, and all 173 countries on earth belong to somebody
                from kickoff. Win and you take the loser's ENTIRE empire. Lose and you hand yours over.
                A draw moves nothing at all, so the giants of Europe start hemmed in with a country
                each while one club can open holding half of west Africa.
              </p>
              {mode === 'daily' && (
                <p className="mt-2 text-[11px] font-semibold text-gold">
                  🗓️ Daily Challenge: every player gets today's exact fixtures and results. Pick the right empire, call the ties, post your score. One scored run per day.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {SOCCER_CLUBS.map(c => (
                <button
                  key={c.id}
                  onClick={() => start(c.id)}
                  className="rounded-lg border border-border bg-card px-2 py-2 text-left transition-all hover:scale-[1.02] hover:border-primary/60"
                >
                  <span className="block h-1.5 w-full rounded-full" style={{ background: c.color }} />
                  <span className="mt-1.5 block truncate text-xs font-bold text-foreground">{c.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{c.country} · {c.overall} OVR</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  const myLands = favorite ? soccerLandsOf(owners, favorite).length : 0;
  // The engine rolls once and calls anything within DRAW_BAND of the win
  // probability level, so the three outcomes are exactly the three slices of
  // [0,1) that split at pHome +/- the band. Shown exactly rather than
  // approximated, because the player is betting on these numbers.
  const pHome = featured ? soccerHomeWinProb(featured[0], featured[1]) : 0.5;
  const band = inPlayoffs ? 0 : DRAW_BAND;
  const drawLo = Math.max(pHome - band, 0);
  const drawHi = Math.min(pHome + band, 1);
  const pWinHome = drawLo;
  const pWinAway = 1 - drawHi;
  const pDraw = drawHi - drawLo;

  return (
    <div className="space-y-4">
      {/* status bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-full border border-border bg-card px-3 py-1 font-bold text-foreground">
          {inPlayoffs ? SOCCER_PLAYOFF_LABELS[bracket!.round] : `Matchday ${round}/${SOCCER_REGULAR_ROUNDS}`}
        </span>
        {favorite && chip(favorite)}
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
          Your empire: <b className={myLands === 0 ? 'text-destructive' : 'text-primary'}>{myLands}</b>/{total}
        </span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
          Calls: <b className="text-gold">{predictionHits}</b>/{predictionTotal}
        </span>
      </div>

      <ConquestMapSoccer
        territories={owners}
        favorite={favorite}
        spotlight={phase === 'recap' && featured ? featured : null}
      />

      {landless.length > 0 && (
        <p className="text-center text-[11px] text-muted-foreground">
          🏴 Wiped off the map but still dangerous: {landless.map(soccerClubLabel).join(', ')}
        </p>
      )}

      {/* standings */}
      <div className="text-center">
        <button
          onClick={() => setShowStandings(s => !s)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ListOrdered className="h-3.5 w-3.5" /> {showStandings ? 'Hide table' : 'Table'}
        </button>
      </div>
      {showStandings && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="grid max-h-64 grid-cols-1 gap-0.5 overflow-y-auto sm:grid-cols-2">
            {SOCCER_CLUBS
              .map(c => c.id)
              .sort((a, b) =>
                (counts.get(b)! - counts.get(a)!) ||
                (soccerPoints(records[b]) - soccerPoints(records[a])))
              .map((cid, i) => (
                <div
                  key={cid}
                  className={cn(
                    'flex items-center justify-between rounded px-2 py-1 text-[11px]',
                    cid === favorite ? 'bg-gold/10 border border-gold/40' : i < 8 ? 'bg-background' : 'bg-background/50',
                  )}
                >
                  <span className={cn('truncate', i < 8 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                    {i + 1}. {soccerClubLabel(cid)}
                  </span>
                  <span className="ml-2 shrink-0 text-muted-foreground">
                    {counts.get(cid)} · {soccerRecordLabel(records[cid])} · {soccerPoints(records[cid])}pts
                    {(records[cid]?.streak ?? 0) >= 3 ? ' 🔥' : (records[cid]?.streak ?? 0) <= -3 ? ' 🧊' : ''}
                  </span>
                </div>
              ))}
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            Top 8 reach the knockouts: countries held first, then points (three for a win, one for a draw).
          </p>
        </div>
      )}

      {/* preview: three-way call + play */}
      {phase === 'preview' && featured && (
        <div className="rounded-2xl border border-gold/40 bg-card p-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gold">
            <Swords className="mr-1 inline h-3.5 w-3.5" />
            {favorite && (featured[0] === favorite || featured[1] === favorite) ? 'Your tie this matchday. Call it.' : 'Tie of the matchday. Call it.'}
          </p>
          <div className="mt-3 flex items-stretch justify-center gap-2">
            {[featured[0], featured[1]].map((cid, i) => {
              const c = SOCCER_CLUB_MAP.get(cid)!;
              const win = i === 0 ? pWinHome : pWinAway;
              return (
                <button
                  key={cid}
                  onClick={() => setPrediction(cid)}
                  className={cn(
                    'flex-1 max-w-[200px] rounded-xl border-2 px-3 py-3 transition-all',
                    prediction === cid ? 'border-gold bg-gold/10 scale-[1.02]' : 'border-border bg-background hover:border-primary/50',
                  )}
                >
                  <span className="block h-1.5 w-full rounded-full" style={{ background: c.color }} />
                  <span className="mt-1.5 block truncate text-sm font-bold text-foreground">{c.name}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {counts.get(cid)} countr{counts.get(cid) === 1 ? 'y' : 'ies'} · {Math.round(Math.max(0, win) * 100)}% to win
                  </span>
                </button>
              );
            })}
          </div>
          {!inPlayoffs && (
            <button
              onClick={() => setPrediction(DRAW_PICK)}
              className={cn(
                'mt-2 inline-flex w-full max-w-[410px] items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all',
                prediction === DRAW_PICK ? 'border-gold bg-gold/10 text-foreground' : 'border-border bg-background text-muted-foreground hover:border-primary/50',
              )}
            >
              <Handshake className="h-4 w-4" />
              Draw, nothing moves
              <span className="text-[10px] font-normal">{Math.round(pDraw * 100)}%</span>
            </button>
          )}
          <button
            onClick={playRound}
            disabled={!prediction}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            <Flag className="h-4 w-4" /> Play {inPlayoffs ? SOCCER_PLAYOFF_LABELS[bracket!.round] : `Matchday ${round}`}
          </button>
          {!prediction && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Call it first. +25 score per correct call{inPlayoffs ? '' : ', and the draw counts'}.
            </p>
          )}
        </div>
      )}

      {/* recap */}
      {phase === 'recap' && lastRound && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-center text-sm font-bold text-foreground">{lastRound.label} results</p>
          <div className="mt-2 space-y-1">
            {lastRound.headlines.map((h, i) => (
              <p key={i} className="text-center text-xs text-muted-foreground">{h}</p>
            ))}
          </div>
          <div className="mt-3 grid max-h-48 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {lastRound.games.map((g, i) => {
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
                    {soccerClubLabel(g.home)} {g.homeGoals}
                  </span>
                  <span className="px-1 text-muted-foreground/60">·</span>
                  <span className={cn('truncate', g.winner === g.away ? 'font-bold text-foreground' : 'text-muted-foreground')}>
                    {g.awayGoals} {soccerClubLabel(g.away)}
                  </span>
                  <span className="ml-1 shrink-0 text-gold">
                    {g.drawn ? '=' : g.swing > 0 ? `+${g.swing}` : ''}{g.penalties ? ' pens' : ''}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-center">
            <button
              onClick={continueOn}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              {champion ? 'See the final map' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {/* done */}
      {phase === 'done' && champion && (
        <div className="rounded-2xl border border-gold/50 bg-card p-5 text-center">
          <Crown className="mx-auto h-10 w-10 text-gold" />
          <p className="mt-2 font-display text-2xl font-black text-foreground">
            {soccerClubLabel(champion)} rule the world
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {champion === favorite
              ? 'Your club. Your planet. Absolute scenes.'
              : favorite && myLands > 0
                ? `Your ${soccerClubLabel(favorite)} held ${myLands} countr${myLands === 1 ? 'y' : 'ies'} to the end.`
                : 'Your club finished wiped off the map. Brutal format.'}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm">
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Empire <b className="text-primary">{myLands}</b></span>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Calls <b className="text-gold">{predictionHits}/{predictionTotal}</b></span>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Score <b className="text-gold">{score}</b></span>
            {mode === 'daily' && dailyStreak >= 2 && (
              <span className="rounded-full border border-border bg-background px-3 py-1.5">Streak <b className="text-gold">🔥{dailyStreak}</b></span>
            )}
          </div>
          {mode === 'daily' && (
            <p className="mt-2 text-[11px] text-muted-foreground">🗓️ Daily done. A fresh world drops at midnight Eastern.</p>
          )}
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => { if (mode === 'daily') setMode('free'); reset(); }}
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground"
            >
              <RotateCcw className="h-4 w-4" /> {mode === 'daily' ? 'Free play' : 'New world'}
            </button>
            <ShareButtons
              gameName="Soccer Conquest"
              gamePath="/conquest-soccer"
              score={`${score} pts`}
              customText={mode === 'daily' && dailyDone
                ? dailyShareText('Soccer Conquest', '/conquest-soccer', dailyDone, dailyStreak, soccerClubLabel(champion), favorite ? soccerClubLabel(favorite) : 'club')
                : `Soccer Conquest 🌍 ${soccerClubLabel(champion)} took the whole world. My ${favorite ? soccerClubLabel(favorite) : 'club'} finished with ${myLands} countries and I called ${predictionHits}/${predictionTotal} ties. Score ${score}. douknowball.com/conquest-soccer`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
