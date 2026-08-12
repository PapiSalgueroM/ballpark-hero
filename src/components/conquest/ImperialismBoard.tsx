import { useMemo, useState } from 'react';
import { Crown, Flag, ListOrdered, RotateCcw, Swords } from 'lucide-react';
import ConquestMap from '@/components/conquest/ConquestMap';
import ShareButtons from '@/components/game/ShareButtons';
import { NFL_TEAMS, TEAM_MAP, isLightColor } from '@/data/conquestData';
import {
  REGULAR_WEEKS, PLAYOFF_LABELS,
  seedEmpires, randomPairings, resolveGame, buildHeadlines,
  empireCounts, landlessTeams, statesOf, playoffSeeds, totalConquest,
  homeWinProb, teamLabel, finalScore,
  emptyRecords, applyRecords, recordLabel,
  type ImpGame, type ImpWeekResult, type ImpRecords,
} from '@/lib/imperialism';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { cn } from '@/lib/utils';

type Phase = 'pick' | 'preview' | 'recap' | 'done';

interface BracketState {
  round: number;          // 0 QF, 1 SF, 2 Final
  alive: string[];        // teams still in the playoff
}

export default function ImperialismBoard() {
  const [phase, setPhase] = useState<Phase>('pick');
  const [favorite, setFavorite] = useState<string | null>(null);
  const [owners, setOwners] = useState<Record<string, string>>({});
  const [week, setWeek] = useState(1);
  const [bracket, setBracket] = useState<BracketState | null>(null);
  const [pairings, setPairings] = useState<[string, string][]>([]);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [predictionHits, setPredictionHits] = useState(0);
  const [predictionTotal, setPredictionTotal] = useState(0);
  const [lastWeek, setLastWeek] = useState<ImpWeekResult | null>(null);
  const [champion, setChampion] = useState<string | null>(null);
  const [madePlayoffs, setMadePlayoffs] = useState(false);
  const [records, setRecords] = useState<ImpRecords>({});
  const [showStandings, setShowStandings] = useState(false);

  const counts = useMemo(() => empireCounts(owners), [owners]);
  const total = Object.keys(owners).length;
  const landless = useMemo(() => landlessTeams(owners), [owners]);
  const inPlayoffs = bracket !== null;

  /** The game the user predicts: their team's game, else the biggest clash. */
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
    () => (favorite ? finalScore(favorite, owners, predictionHits, champion, madePlayoffs) : 0),
    [favorite, owners, predictionHits, champion, madePlayoffs],
  );

  useGameCompletion('conquest-imperialism', phase === 'done', score, favorite ? statesOf(owners, favorite).length : 0);

  const rollPairings = (br: BracketState | null) => {
    if (br) {
      const seeds = br.alive;
      const pairs: [string, string][] = [];
      for (let i = 0; i < seeds.length / 2; i++) {
        pairs.push([seeds[i], seeds[seeds.length - 1 - i]]);
      }
      setPairings(pairs);
    } else {
      setPairings(randomPairings(NFL_TEAMS.map(t => t.id)));
    }
    setPrediction(null);
  };

  const start = (teamId: string) => {
    const seeded = seedEmpires();
    setFavorite(teamId);
    setOwners(seeded);
    setWeek(1);
    setBracket(null);
    setChampion(null);
    setMadePlayoffs(false);
    setPredictionHits(0);
    setPredictionTotal(0);
    setLastWeek(null);
    setRecords(emptyRecords(NFL_TEAMS.map(t => t.id)));
    setShowStandings(false);
    setPhase('preview');
    setPairings(randomPairings(NFL_TEAMS.map(t => t.id)));
    setPrediction(null);
  };

  const playWeek = () => {
    const next = { ...owners };
    const games: ImpGame[] = [];
    for (const [h, a] of pairings) {
      games.push(resolveGame(h, a, next));
    }
    const nextRecords = applyRecords(records, games);
    setRecords(nextRecords);

    // prediction bookkeeping on the featured game
    if (featured && prediction) {
      const fg = games.find(g => (g.home === featured[0] && g.away === featured[1]) || (g.home === featured[1] && g.away === featured[0]));
      setPredictionTotal(t => t + 1);
      if (fg && fg.winner === prediction) setPredictionHits(h => h + 1);
    }

    const label = inPlayoffs ? PLAYOFF_LABELS[bracket!.round] : `Week ${week}`;
    setLastWeek({ week, label, games, headlines: buildHeadlines(games, next, nextRecords) });
    setOwners(next);

    // advance season state
    if (inPlayoffs) {
      const winners = games.map(g => g.winner);
      if (bracket!.round >= 2 || winners.length === 1) {
        setChampion(winners[0]);
        setPhase('recap');
        return;
      }
      const nb = { round: bracket!.round + 1, alive: winners };
      setBracket(nb);
      setPhase('recap');
      return;
    }

    const wiped = totalConquest(next);
    if (wiped) {
      setChampion(wiped);
      setPhase('recap');
      return;
    }

    if (week >= REGULAR_WEEKS) {
      const seeds = playoffSeeds(next, nextRecords);
      setMadePlayoffs(favorite !== null && seeds.includes(favorite));
      setBracket({ round: 0, alive: seeds });
    } else {
      setWeek(w => w + 1);
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
    setLastWeek(null);
    setBracket(null);
    setChampion(null);
  };

  const chip = (teamId: string, extra?: string) => {
    const t = TEAM_MAP.get(teamId);
    if (!t) return null;
    return (
      <span
        className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', extra)}
        style={{ background: t.color, color: isLightColor(t.color) ? '#111' : '#fff' }}
      >
        {t.city} {t.name}
      </span>
    );
  };

  /* ---------------- pick screen ---------------- */
  if (phase === 'pick') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-lg font-bold text-foreground">Pick your team</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The map starts as a true imperialism split: every territory belongs to its nearest stadium.
            Every week, winners conquer the loser's ENTIRE empire. Wiped-out teams keep playing, and one
            win takes it all back. Ride your team to the end, call their games, and pray.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {NFL_TEAMS.map(t => (
            <button
              key={t.id}
              onClick={() => start(t.id)}
              className="rounded-lg border border-border bg-card px-2 py-2 text-left transition-all hover:scale-[1.02] hover:border-primary/60"
            >
              <span className="block h-1.5 w-full rounded-full" style={{ background: t.color }} />
              <span className="mt-1.5 block truncate text-xs font-bold text-foreground">{t.city}</span>
              <span className="block truncate text-[10px] text-muted-foreground">{t.name} · {t.overall} OVR</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const myStates = favorite ? statesOf(owners, favorite).length : 0;

  return (
    <div className="space-y-4">
      {/* status bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-full border border-border bg-card px-3 py-1 font-bold text-foreground">
          {inPlayoffs ? PLAYOFF_LABELS[bracket!.round] : `Week ${week}/${REGULAR_WEEKS}`}
        </span>
        {favorite && chip(favorite)}
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
          Your empire: <b className={myStates === 0 ? 'text-destructive' : 'text-primary'}>{myStates}</b>/{total}
        </span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
          Picks: <b className="text-gold">{predictionHits}</b>/{predictionTotal}
        </span>
      </div>

      {/* map */}
      <ConquestMap
        territories={owners}
        attackingTeam={phase === 'recap' && featured ? featured[0] : null}
        defendingTeam={phase === 'recap' && featured ? featured[1] : null}
        phase={phase === 'recap' ? 'battle' : 'ready'}
        powerupStates={new Set()}
        invincibleTeams={new Set()}
        territoryStolenState={null}
      />

      {landless.length > 0 && (
        <p className="text-center text-[11px] text-muted-foreground">
          🏴 Wiped out but still dangerous: {landless.map(teamLabel).join(', ')}
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
            {NFL_TEAMS
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
                    {i + 1}. {teamLabel(tid)}
                  </span>
                  <span className="ml-2 shrink-0 text-muted-foreground">
                    {counts.get(tid)} st · {recordLabel(records[tid])}
                    {(records[tid]?.streak ?? 0) >= 3 ? ' 🔥' : (records[tid]?.streak ?? 0) <= -3 ? ' 🧊' : ''}
                  </span>
                </div>
              ))}
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">Top 8 make the playoffs: territories first, record breaks ties.</p>
        </div>
      )}

      {/* preview: prediction + play */}
      {phase === 'preview' && featured && (
        <div className="rounded-2xl border border-gold/40 bg-card p-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gold">
            <Swords className="mr-1 inline h-3.5 w-3.5" />
            {favorite && (featured[0] === favorite || featured[1] === favorite) ? 'Your game this week. Call it.' : 'Game of the week. Call it.'}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            {[featured[0], featured[1]].map((tid, i) => {
              const t = TEAM_MAP.get(tid)!;
              const p = i === 0 ? homeWinProb(featured[0], featured[1]) : 1 - homeWinProb(featured[0], featured[1]);
              return (
                <button
                  key={tid}
                  onClick={() => setPrediction(tid)}
                  className={cn(
                    'flex-1 max-w-[220px] rounded-xl border-2 px-3 py-3 transition-all',
                    prediction === tid ? 'border-gold bg-gold/10 scale-[1.02]' : 'border-border bg-background hover:border-primary/50',
                  )}
                >
                  <span className="block h-1.5 w-full rounded-full" style={{ background: t.color }} />
                  <span className="mt-1.5 block truncate text-sm font-bold text-foreground">{t.city} {t.name}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {counts.get(tid)} state{counts.get(tid) === 1 ? '' : 's'} · {recordLabel(records[tid])} · {Math.round(p * 100)}% to win
                  </span>
                </button>
              );
            })}
          </div>
          <button
            onClick={playWeek}
            disabled={!prediction}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            <Flag className="h-4 w-4" /> Play {inPlayoffs ? PLAYOFF_LABELS[bracket!.round] : `Week ${week}`}
          </button>
          {!prediction && <p className="mt-2 text-[10px] text-muted-foreground">Pick a winner first. +25 score per correct call.</p>}
        </div>
      )}

      {/* recap */}
      {phase === 'recap' && lastWeek && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-center text-sm font-bold text-foreground">{lastWeek.label} results</p>
          <div className="mt-2 space-y-1">
            {lastWeek.headlines.map((h, i) => (
              <p key={i} className="text-center text-xs text-muted-foreground">{h}</p>
            ))}
          </div>
          <div className="mt-3 grid max-h-48 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {lastWeek.games.map((g, i) => {
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
                    {teamLabel(g.home)} {g.homeScore}
                  </span>
                  <span className="px-1 text-muted-foreground/60">·</span>
                  <span className={cn('truncate', g.winner === g.away ? 'font-bold text-foreground' : 'text-muted-foreground')}>
                    {g.awayScore} {teamLabel(g.away)}
                  </span>
                  <span className="ml-1 shrink-0 text-gold">{g.swing > 0 ? `+${g.swing}` : ''}{g.overtime ? ' OT' : ''}</span>
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
            {teamLabel(champion)} rule the map
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {champion === favorite
              ? 'Your empire. Your dynasty. Absolute scenes.'
              : favorite && myStates > 0
                ? `Your ${teamLabel(favorite)} held ${myStates} state${myStates === 1 ? '' : 's'} to the end.`
                : 'Your team ended the season wiped off the map. Brutal format.'}
          </p>
          <div className="mt-3 flex items-center justify-center gap-3 text-sm">
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Empire <b className="text-primary">{myStates}</b></span>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Calls <b className="text-gold">{predictionHits}/{predictionTotal}</b></span>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Score <b className="text-gold">{score}</b></span>
          </div>
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground"
            >
              <RotateCcw className="h-4 w-4" /> New season
            </button>
            <ShareButtons
              gameName="NFL Imperialism"
              gamePath="/conquest"
              score={`${score} pts`}
              customText={`NFL Imperialism 🗺️ ${teamLabel(champion)} took the whole map. My ${favorite ? teamLabel(favorite) : 'team'} finished with ${myStates} states and I called ${predictionHits}/${predictionTotal} games. Score ${score}. douknowball.com/conquest`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
