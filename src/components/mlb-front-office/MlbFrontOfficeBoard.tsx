import { useCallback, useEffect, useState } from 'react';
import { Briefcase, Crown, ListOrdered, RotateCcw, ShieldHalf, Swords, Users } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { MLB_TEAMS, MLB_TEAM_MAP } from '@/data/conquestDataMlb';
import {
  initMlbLeague, simMlbRound, mlbStandings, runMlbPlayoffs, mlbOffseason,
  mlbDraftClass, mlbProspectToPlayer, mlbStrength, mlbCapUsed, mlbCapRoom,
  mlbRelease, mlbSign, mlbTrade, mlbTradeValue, mlbAiMoves, AL, MLB_DIVISIONS,
  MLB_ROUNDS,
  type MlbLeague, type MlbProspect, type MlbSeriesResult,
} from '@/lib/mlbFrontOffice';
import { findTrades, type FinderOffer } from '@/lib/tradeFinder';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { cn } from '@/lib/utils';
// Round 180: the owner upstairs, shared engine and card.
import {
  buildOwnerMandate, strengthRank, mandatePace, gradeSeason, applyMandateResult,
  firedLine, seriesPostseason, FO_TRUST_START, type OwnerMandate, type FoSportWords,
} from '@/lib/foOwnerMandate';
import OwnerMandateCard from '@/components/front-office-shared/OwnerMandateCard';
/* Round 187: the verdict curtain. stageVerdict decides the presentation
   facts (confetti only for the champion GM, fired kills it outright) so
   the rule lives in the harnessed engine, not in this JSX. */
import { stageVerdict } from '@/lib/usCareerReveal';
import { ConfettiBurst, CelebrationStyles } from '@/components/club-manager/Celebration';
import { mlbLeagueSeeds } from '@/lib/mlbFrontOffice';

/* Round 180: 'fired' is new. Zero trust upstairs ends the save. */
type Phase = 'pick' | 'hub' | 'draft' | 'recap' | 'fired';
type Tab = 'team' | 'market' | 'trade' | 'round' | 'standings';

const SAVE_KEY = 'mlb-front-office-save-v1';

const MLB_WORDS: FoSportWords = { title: 'the World Series', playoffs: 'October', round: 'a series', games: 162 };

interface SaveShape {
  league: MlbLeague; myTeam: string; phase: Phase; titles: number; seasonsPlayed: number;
  draftClass: MlbProspect[] | null; picksLeft: number;
  /* Round 180. Optional so pre-180 saves keep loading; repaired on load. */
  mandate?: OwnerMandate | null; trust?: number; fired?: boolean;
}

export default function MlbFrontOfficeBoard() {
  const [phase, setPhase] = useState<Phase>('pick');
  const [tab, setTab] = useState<Tab>('team');
  const [myTeam, setMyTeam] = useState('');
  const [league, setLeague] = useState<MlbLeague | null>(null);
  const [feed, setFeed] = useState<string[]>([]);
  const [series, setSeries] = useState<MlbSeriesResult[]>([]);
  const [champion, setChampion] = useState('');
  const [draftClass, setDraftClass] = useState<MlbProspect[] | null>(null);
  const [picksLeft, setPicksLeft] = useState(0);
  const [tradePartner, setTradePartner] = useState('');
  // Round 82: trade finder
  const [shopOffers, setShopOffers] = useState<FinderOffer[]>([]);
  const [shopTried, setShopTried] = useState(false);
  const [myTradePiece, setMyTradePiece] = useState('');
  const [titles, setTitles] = useState(0);
  const [seasonsPlayed, setSeasonsPlayed] = useState(0);
  const [wonNow, setWonNow] = useState(false);
  /* Round 180: the owner upstairs. */
  const [mandate, setMandate] = useState<OwnerMandate | null>(null);
  const [trust, setTrust] = useState(FO_TRUST_START);
  const [fired, setFired] = useState(false);
  const [gradeLine, setGradeLine] = useState<string | null>(null);

  useGameCompletion('mlb-front-office', wonNow, titles * 100 + seasonsPlayed * 5);

  /* Round 180: rank my roster against the league and let ownership set the ask. */
  const mandateFor = (lg: MlbLeague, team: string, defendingChamp: boolean): OwnerMandate => {
    const strengths = Object.fromEntries(Object.entries(lg.teams).map(([a, tm]) => [a, mlbStrength(tm)]));
    return buildOwnerMandate(strengthRank(strengths, team), Object.keys(lg.teams).length, defendingChamp, MLB_WORDS, lg.season);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as SaveShape;
      if (!s.league || !s.myTeam) return;
      setLeague(s.league); setMyTeam(s.myTeam);
      setPhase(s.fired ? 'fired' : s.phase === 'recap' ? 'hub' : s.phase);
      setTitles(s.titles ?? 0); setSeasonsPlayed(s.seasonsPlayed ?? 0);
      setDraftClass(s.draftClass ?? null); setPicksLeft(s.picksLeft ?? 0);
      /* Round 180, repair-on-load: a pre-180 save gets an owner today. */
      setMandate(s.mandate ?? mandateFor(s.league, s.myTeam, false));
      setTrust(s.trust ?? FO_TRUST_START);
      setFired(s.fired ?? false);
    } catch { /* fresh */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((patch: Partial<SaveShape>, lg: MlbLeague | null, team: string) => {
    try {
      if (!lg) return;
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        league: lg, myTeam: team, phase, titles, seasonsPlayed, draftClass, picksLeft,
        mandate, trust, fired, ...patch,
      } satisfies SaveShape));
    } catch { /* full */ }
  }, [phase, titles, seasonsPlayed, draftClass, picksLeft, mandate, trust, fired]);

  const label = (abbr: string) => {
    const t = MLB_TEAM_MAP.get(abbr);
    return t ? `${t.city} ${t.name}` : abbr;
  };

  const start = (abbr: string) => {
    const lg = initMlbLeague();
    const m = mandateFor(lg, abbr, false);
    setLeague(lg); setMyTeam(abbr); setPhase('hub'); setTab('team');
    setFeed([
      `Welcome to the ${label(abbr)} front office. Opening Day of the ${lg.season} season is here.`,
      `🏛️ The ownership mandate: ${m.text}`,
    ]);
    setChampion(''); setSeries([]); setTitles(0); setSeasonsPlayed(0);
    setMandate(m); setTrust(FO_TRUST_START); setFired(false); setGradeLine(null);
    persist({ phase: 'hub', titles: 0, seasonsPlayed: 0, mandate: m, trust: FO_TRUST_START, fired: false }, lg, abbr);
  };

  const my = league?.teams[myTeam];

  const playRound = () => {
    if (!league || !my) return;
    const lg: MlbLeague = JSON.parse(JSON.stringify(league));
    const report = simMlbRound(lg, myTeam, Math.random);
    mlbAiMoves(lg, myTeam, Math.random);
    const newFeed = [
      `Round ${lg.round}: you went ${report.myWins}-${report.myLosses}.`,
      ...report.notes,
    ];
    if (lg.round >= MLB_ROUNDS) {
      const { series: sr, champion: champ } = runMlbPlayoffs(lg, Math.random);
      setSeries(sr);
      setChampion(champ);
      const won = champ === myTeam;
      setWonNow(won);
      const nt = titles + (won ? 1 : 0);
      const ns = seasonsPlayed + 1;
      setTitles(nt); setSeasonsPlayed(ns);
      /* Round 180: ownership grades the season against the mandate. */
      let newTrust = trust, nowFired = fired;
      if (mandate) {
        const post = seriesPostseason(sr, myTeam);
        const grade = gradeSeason(mandate, { wins: lg.teams[myTeam].wins, ...post, wonTitle: won });
        const applied = applyMandateResult(trust, grade);
        newTrust = applied.trust; nowFired = applied.fired;
        setTrust(applied.trust); setFired(applied.fired); setGradeLine(grade.verdict);
      }
      setPhase('recap');
      setLeague(lg);
      setFeed(newFeed);
      persist({ phase: nowFired ? 'fired' : 'recap', titles: nt, seasonsPlayed: ns, trust: newTrust, fired: nowFired }, lg, myTeam);
      return;
    }
    lg.round += 1;
    setLeague(lg);
    setFeed(newFeed);
    persist({}, lg, myTeam);
  };

  const startDraft = () => {
    if (!league) return;
    const cls = mlbDraftClass(Math.random);
    setDraftClass(cls); setPicksLeft(2); setPhase('draft');
    persist({ phase: 'draft', draftClass: cls, picksLeft: 2 }, league, myTeam);
  };

  const draftPick = (id: string) => {
    if (!league || !draftClass || picksLeft <= 0) return;
    const lg: MlbLeague = JSON.parse(JSON.stringify(league));
    const pr = draftClass.find(p => p.id === id);
    if (!pr) return;
    lg.teams[myTeam].players.push(mlbProspectToPlayer(pr, Math.random));
    const remaining = draftClass.filter(p => p.id !== id);
    const aiTakes = remaining.slice(0, 5);
    const order = mlbStandings(lg).map(t => t.abbr).reverse().filter(a => a !== myTeam);
    aiTakes.forEach((p, i) => lg.teams[order[i % order.length]].players.push(mlbProspectToPlayer(p, Math.random)));
    const nextClass = remaining.filter(p => !aiTakes.includes(p));
    const nextPicks = picksLeft - 1;
    setDraftClass(nextClass); setPicksLeft(nextPicks);
    setFeed(f => [`📥 Drafted ${pr.name} (${pr.pos}), true rating ${pr.trueOvr} vs scouted ${pr.grade}.`, ...f].slice(0, 6));
    if (nextPicks <= 0) {
      const notes = mlbOffseason(lg, Math.random);
      /* Round 180: ownership re-reads the roster and sets next season's ask. */
      const m = mandateFor(lg, myTeam, champion === myTeam);
      setMandate(m);
      setFeed([`🏛️ The new mandate: ${m.text}`, ...notes].slice(0, 6));
      setSeries([]); setChampion(''); setWonNow(false);
      setPhase('hub'); setTab('team');
      setLeague(lg);
      persist({ phase: 'hub', draftClass: null, picksLeft: 0, mandate: m }, lg, myTeam);
      return;
    }
    setLeague(lg);
    persist({ draftClass: nextClass, picksLeft: nextPicks }, lg, myTeam);
  };

  const doRelease = (pid: string) => {
    if (!league) return;
    const lg: MlbLeague = JSON.parse(JSON.stringify(league));
    if (mlbRelease(lg.teams[myTeam], lg.freeAgents, pid)) { setLeague(lg); persist({}, lg, myTeam); }
  };
  const doSign = (pid: string) => {
    if (!league) return;
    const lg: MlbLeague = JSON.parse(JSON.stringify(league));
    if (mlbSign(lg.teams[myTeam], lg.freeAgents, pid, lg.cap)) { setLeague(lg); persist({}, lg, myTeam); }
  };
  const doTrade = (theirPid: string, sweeten: boolean) => {
    if (!league || !tradePartner || !myTradePiece) return;
    const lg: MlbLeague = JSON.parse(JSON.stringify(league));
    const res = mlbTrade(lg.teams[myTeam], lg.teams[tradePartner], myTradePiece, theirPid, sweeten, lg.cap);
    if (res === 'accepted') {
      setFeed(f => [`🤝 Trade completed with ${label(tradePartner)}.`, ...f].slice(0, 6));
      setMyTradePiece(''); setShopOffers([]); setShopTried(false);
      setLeague(lg); persist({}, lg, myTeam);
    } else {
      setFeed(f => [res === 'rejected' ? `❌ ${label(tradePartner)} pass on that offer.` : '❌ That deal breaks payroll or roster rules.', ...f].slice(0, 6));
    }
  };

  // Round 82: shop a player league-wide with the real trade rules
  const doShop = () => {
    if (!league || !myTradePiece) return;
    const offers = findTrades(league.teams, myTeam, myTradePiece, league.cap, mlbTrade, mlbTradeValue);
    setShopOffers(offers); setShopTried(true);
  };
  const acceptShopOffer = (o: FinderOffer) => {
    if (!league || !myTradePiece) return;
    const lg: MlbLeague = JSON.parse(JSON.stringify(league));
    const res = mlbTrade(lg.teams[myTeam], lg.teams[o.teamId], myTradePiece, o.playerId, o.sweeten, lg.cap);
    if (res === 'accepted') {
      setFeed(f => [`🤝 Trade finder deal done with ${label(o.teamId)}.`, ...f].slice(0, 6));
      setMyTradePiece(''); setShopOffers([]); setShopTried(false);
      setLeague(lg); persist({}, lg, myTeam);
    } else {
      setFeed(f => ['❌ That offer went stale, shop him again.', ...f].slice(0, 6));
      setShopOffers([]); setShopTried(false);
    }
  };

  const reset = () => {
    localStorage.removeItem(SAVE_KEY);
    setPhase('pick'); setLeague(null); setMyTeam('');
    setMandate(null); setTrust(FO_TRUST_START); setFired(false); setGradeLine(null);
  };

  if (phase === 'pick' || !league || !my) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-lg font-bold text-foreground">Take over a baseball front office</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Real 2026 rosters from MLB&apos;s own data, rated off real 2025 stats. Manage the payroll
            under the tax line, survive the 162, then October: Wild Card, Division Series, LCS,
            World Series. Saves automatically.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {MLB_TEAMS.map(t => (
            <button key={t.id} onClick={() => start(t.id)} className="rounded-lg border border-border bg-card px-2 py-2 text-left transition-all hover:scale-[1.02] hover:border-primary/60">
              <span className="block h-1.5 w-full rounded-full" style={{ background: t.color }} />
              <span className="mt-1.5 block truncate text-xs font-bold text-foreground">{t.city} {t.name}</span>
              <span className="block truncate text-[10px] text-muted-foreground">{AL.includes(t.id) ? 'American League' : 'National League'}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const room = mlbCapRoom(my, league.cap);
  const strength = Math.round(mlbStrength(my));

  /* ---------------- Round 180: the reload path after a firing ---------------- */
  if (phase === 'fired') {
    return (
      <div className="space-y-4">
        {/* Round 187: the door shuts with one honest shake, nothing more. */}
        <div className="cm-loss-shake rounded-2xl border border-destructive/50 bg-card p-5 text-center">
          <CelebrationStyles />
          <p className="text-3xl">🪑</p>
          <p className="cm-slam mt-2 font-display text-2xl font-black text-foreground" style={{ animationDelay: '0.1s' }}>Fired by {label(myTeam)}</p>
          <p className="cm-rise mt-2 text-sm text-muted-foreground" style={{ animationDelay: '0.35s' }}>{firedLine(seasonsPlayed, titles)}</p>
          <button onClick={reset} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
            <RotateCcw className="h-4 w-4" /> Take another front office
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'recap') {
    const ws = series.find(s => s.name === 'World Series');
    const myLeague = AL.includes(myTeam) ? 'AL' : 'NL';
    const myRank = mlbStandings(league, AL.includes(myTeam) ? AL : undefined)
      .filter(x => AL.includes(myTeam) ? true : !AL.includes(x.abbr))
      .findIndex(x => x.abbr === myTeam) + 1;
    /* Round 187: the verdict curtain. Every string below is exactly what
       Round 180 wrote; stageVerdict only decides confetti and tone. */
    const staging = stageVerdict({ iAmChampion: champion === myTeam, fired });
    return (
      <div className="space-y-4">
        <div
          data-verdict-reveal
          className={cn(
            'relative overflow-hidden rounded-2xl border bg-card p-5 text-center',
            staging.cardTone === 'fired' ? 'border-destructive/50' : 'border-gold/50',
            staging.cardTone === 'title' && 'cm-win-pulse',
          )}
        >
          <CelebrationStyles />
          {staging.confetti && <ConfettiBurst seed={13} count={34} />}
          <Crown className="mx-auto h-10 w-10 text-gold" />
          <p className="cm-slam mt-2 font-display text-2xl font-black text-foreground" style={{ animationDelay: '0.05s' }}>{label(champion)} win the {league.season} World Series</p>
          <p className="cm-rise mt-1 text-sm text-muted-foreground" style={{ animationDelay: '0.3s' }}>
            {champion === myTeam
              ? 'Your roster. Your rings. Raise the trophy.'
              : `Your ${label(myTeam)} finished ${my.wins}-${my.losses}, No. ${myRank} in the ${myLeague}.`}
          </p>
          {/* Round 180: ownership's verdict on the mandate. */}
          {gradeLine && (
            <p className={cn('cm-slam mt-2 text-sm font-bold', fired ? 'text-destructive' : 'text-gold')} style={{ animationDelay: '0.5s' }}>{gradeLine}</p>
          )}
          {mandate && !fired && (
            <p className="cm-rise mt-1 text-[11px] text-muted-foreground" style={{ animationDelay: '0.7s' }}>Trust upstairs: {trust} of 100{trust <= 25 ? '. The seat is hot.' : '.'}</p>
          )}
          {ws && (
            <p className="cm-tick-in mt-2 text-xs text-muted-foreground" style={{ animationDelay: '0.8s' }}>
              World Series: {label(ws.winner)} beat {label(ws.winner === ws.home ? ws.away : ws.home)} {Math.max(ws.homeWins, ws.awayWins)}-{Math.min(ws.homeWins, ws.awayWins)}
            </p>
          )}
          <div className="cm-rise mt-2 max-h-40 space-y-0.5 overflow-y-auto text-[11px] text-muted-foreground" style={{ animationDelay: '0.95s' }}>
            {series.filter(s => s.name !== 'World Series').map((s, i) => (
              <p key={i}>{s.name}: {label(s.winner)} {s.winner === s.home ? s.homeWins : s.awayWins}-{s.winner === s.home ? s.awayWins : s.homeWins}</p>
            ))}
          </div>
          <div className="cm-rise mt-3 flex items-center justify-center gap-3 text-sm" style={{ animationDelay: '1.2s' }}>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Rings <b className="text-gold">{titles}</b></span>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Seasons <b className="text-primary">{seasonsPlayed}</b></span>
          </div>
          {/* Round 180: zero trust ends the save here instead of a draft. */}
          {fired ? (
            <div className="cm-loss-shake mt-4 rounded-2xl border border-destructive/50 bg-destructive/5 p-4">
              <p className="text-sm font-bold text-destructive">🪑 {firedLine(seasonsPlayed, titles)}</p>
              <button onClick={reset} className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
                <RotateCcw className="h-4 w-4" /> Take another front office
              </button>
            </div>
          ) : (
            <div className="cm-rise mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center" style={{ animationDelay: '1.35s' }}>
              <button onClick={startDraft} className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
                <Briefcase className="h-4 w-4" /> Go to the draft
              </button>
              <ShareButtons
                gameName="MLB Front Office"
                gamePath="/mlb-front-office"
                score={`${titles} rings in ${seasonsPlayed} seasons`}
                customText={`MLB Front Office ⚾ ${champion === myTeam ? `My ${label(myTeam)} just won the World Series!` : `${label(champion)} took the World Series.`} ${titles} rings in ${seasonsPlayed} seasons. douknowball.com/mlb-front-office`}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'draft' && draftClass) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-lg font-bold text-foreground">The {league.season + 1} Draft</p>
          <p className="mt-1 text-xs text-muted-foreground">
            You hold <b className="text-gold">{picksLeft}</b> pick{picksLeft === 1 ? '' : 's'}. Scout grades carry error.
          </p>
        </div>
        <div className="grid max-h-96 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
          {draftClass.slice(0, 14).map(pr => (
            <button key={pr.id} onClick={() => draftPick(pr.id)} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left hover:border-primary/60">
              <span>
                <span className="block text-sm font-bold text-foreground">{pr.name}</span>
                <span className="block text-[10px] text-muted-foreground">{pr.pos} · age {pr.age}</span>
              </span>
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-sm font-black text-primary">{pr.grade}</span>
            </button>
          ))}
        </div>
        {feed.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
            {feed.slice(0, 4).map((n, i) => <p key={i}>{n}</p>)}
          </div>
        )}
      </div>
    );
  }

  const t = MLB_TEAM_MAP.get(myTeam)!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-full px-3 py-1 font-bold text-white" style={{ background: t.color }}>{label(myTeam)}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{league.season} · Round {league.round}/{MLB_ROUNDS}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Record <b className="text-foreground">{my.wins}-{my.losses}</b></span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Strength <b className="text-primary">{strength}</b></span>
        <span className={cn('rounded-full border border-border bg-card px-3 py-1', room < 5 ? 'text-destructive' : 'text-muted-foreground')}>Tax room <b>${room}M</b></span>
      </div>

      {/* Round 180: the owner card, always visible on the hub. The cut is my
          league's six October seeds, the same read the bracket uses. */}
      {mandate && (
        <OwnerMandateCard
          mandate={mandate}
          trust={trust}
          pace={league.round > 1 && league.round <= MLB_ROUNDS
            ? mandatePace(mandate, my.wins, (league.round - 1) / MLB_ROUNDS,
                mlbLeagueSeeds(league, AL.includes(myTeam)).includes(myTeam))
            : null}
        />
      )}

      <div className="flex items-center justify-center gap-1 rounded-full bg-secondary p-1 text-xs">
        {([
          ['team', 'Roster', Users],
          ['market', 'Free agency', Briefcase],
          ['trade', 'Trades', Swords],
          ['round', 'Play', ShieldHalf],
          ['standings', 'Standings', ListOrdered],
        ] as [Tab, string, typeof Users][]).map(([key, lbl, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-semibold transition-all', tab === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="h-3.5 w-3.5" /> {lbl}
          </button>
        ))}
      </div>

      {feed.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
          {feed.slice(0, 5).map((n, i) => <p key={i}>{n}</p>)}
        </div>
      )}

      {tab === 'team' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 text-center text-xs text-muted-foreground">Payroll ${mlbCapUsed(my)}M against the ${league.cap}M tax line</p>
          <div className="grid max-h-96 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {[...my.players].sort((a, b) => b.ovr - a.ovr).map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs">
                <span className="min-w-0">
                  <span className={cn('block truncate font-bold', p.out > 0 ? 'text-destructive' : 'text-foreground')}>{p.name} {p.out > 0 ? `(IL ${p.out}r)` : ''}</span>
                  <span className="block text-[10px] text-muted-foreground">{p.pos} · {p.age}y · ${p.salary}M x{p.years}</span>
                </span>
                <span className="ml-2 flex shrink-0 items-center gap-1.5">
                  <b className="text-primary">{p.ovr}</b>
                  <button onClick={() => doRelease(p.id)} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:border-destructive hover:text-destructive">DFA</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'market' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 text-center text-xs text-muted-foreground">Free agents (tax room ${room}M)</p>
          <div className="grid max-h-96 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {[...league.freeAgents].sort((a, b) => b.ovr - a.ovr).slice(0, 20).map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs">
                <span className="min-w-0">
                  <span className="block truncate font-bold text-foreground">{p.name}</span>
                  <span className="block text-[10px] text-muted-foreground">{p.pos} · {p.age}y · wants ${p.salary}M</span>
                </span>
                <span className="ml-2 flex shrink-0 items-center gap-1.5">
                  <b className="text-primary">{p.ovr}</b>
                  <button onClick={() => doSign(p.id)} disabled={p.salary > room} className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground disabled:opacity-40">Sign</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'trade' && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          {/* Round 82: Trade Finder, shop a player and let the league bid */}
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-2.5 space-y-2">
            <p className="text-center text-[11px] font-bold text-foreground">🔍 Trade Finder</p>
            <p className="text-center text-[10px] text-muted-foreground">Pick one of your players and shop him. Only deals the AI genuinely accepts show up, payroll checked.</p>
            <div className="grid grid-cols-2 gap-1">
              {[...my.players].sort((a, b) => b.ovr - a.ovr).slice(0, 8).map(p => (
                <button key={p.id} onClick={() => { setMyTradePiece(p.id); setShopOffers([]); setShopTried(false); }} className={cn('flex items-center justify-between rounded-lg border px-2 py-1 text-[11px]', myTradePiece === p.id ? 'border-gold bg-gold/10' : 'border-border/60 bg-background')}>
                  <span className="truncate text-foreground">{p.name} ({p.pos})</span><b className="text-primary">{p.ovr}</b>
                </button>
              ))}
            </div>
            <button onClick={doShop} disabled={!myTradePiece} className="w-full rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-40">
              Shop him around the league
            </button>
            {shopTried && shopOffers.length === 0 && (
              <p className="text-center text-[10px] text-muted-foreground">📵 Nobody bit. Shop a better player or build a deal yourself below.</p>
            )}
            {shopOffers.map(o => (
              <div key={o.teamId + o.playerId} className="flex items-center justify-between gap-1 rounded-lg border border-border/60 bg-background px-2 py-1.5 text-[11px]">
                <span className="min-w-0">
                  <span className="block truncate text-foreground"><b>{o.teamId}</b> offer: {o.playerName} ({o.playerPos}) <b className="text-primary">{o.playerOvr}</b></span>
                  <span className="block text-[9px] text-muted-foreground">age {o.playerAge} · ${o.playerSalary}M{o.sweeten ? ' · costs one of your picks' : ''}</span>
                </span>
                <button onClick={() => acceptShopOffer(o)} className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[9px] font-bold text-primary-foreground">Accept</button>
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] font-bold uppercase text-muted-foreground pt-1">Or build your own deal</p>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {MLB_TEAMS.filter(x => x.id !== myTeam).map(x => (
              <button key={x.id} onClick={() => setTradePartner(x.id)} className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', tradePartner === x.id ? 'border-gold bg-gold/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>
                {x.id}
              </button>
            ))}
          </div>
          {tradePartner && (
            <>
              <p className="text-center text-[10px] text-muted-foreground">1. Pick who YOU send. 2. Tap who you want back. Add a pick to sweeten.</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-center text-[10px] font-bold uppercase text-muted-foreground">You send</p>
                  {[...my.players].sort((a, b) => b.ovr - a.ovr).slice(0, 8).map(p => (
                    <button key={p.id} onClick={() => setMyTradePiece(p.id)} className={cn('flex w-full items-center justify-between rounded-lg border px-2 py-1 text-[11px]', myTradePiece === p.id ? 'border-gold bg-gold/10' : 'border-border/60 bg-background')}>
                      <span className="truncate text-foreground">{p.name} ({p.pos})</span><b className="text-primary">{p.ovr}</b>
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="text-center text-[10px] font-bold uppercase text-muted-foreground">You get ({tradePartner})</p>
                  {[...league.teams[tradePartner].players].sort((a, b) => b.ovr - a.ovr).slice(0, 8).map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-1 rounded-lg border border-border/60 bg-background px-2 py-1 text-[11px]">
                      <span className="truncate text-foreground">{p.name} ({p.pos}) <b className="text-primary">{p.ovr}</b></span>
                      <span className="flex shrink-0 gap-1">
                        <button onClick={() => doTrade(p.id, false)} disabled={!myTradePiece} className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground disabled:opacity-40">Offer</button>
                        <button onClick={() => doTrade(p.id, true)} disabled={!myTradePiece || my.picks.length === 0} className="rounded-full border border-gold px-2 py-0.5 text-[9px] font-bold text-gold disabled:opacity-40">+Pick</button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'round' && (
        <div className="rounded-2xl border border-gold/40 bg-card p-4 text-center">
          <p className="mb-2 text-sm text-foreground">Each round simulates a week and a half of baseball across the league.</p>
          <button onClick={playRound} className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
            <ShieldHalf className="h-4 w-4" /> {league.round >= MLB_ROUNDS ? 'Final stretch + October' : `Play Round ${league.round}`}
          </button>
          <p className="mt-2 text-[10px] text-muted-foreground">Division winners seed 1-3, wild cards 4-6. Top two seeds skip the best-of-3 Wild Card round.</p>
        </div>
      )}

      {tab === 'standings' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MLB_DIVISIONS.map(div => (
              <div key={div.name}>
                <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{div.name}</p>
                {mlbStandings(league, div.teams).map((x, i) => (
                  <div key={x.abbr} className={cn('flex items-center justify-between rounded px-2 py-0.5 text-[11px]', x.abbr === myTeam ? 'bg-gold/10' : '')}>
                    <span className={cn(i === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                      {i + 1}. {label(x.abbr)}
                    </span>
                    <span className="text-muted-foreground">{x.wins}-{x.losses}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">Win the division to lock a top-3 seed; three wild cards per league.</p>
        </div>
      )}

      <div className="text-center">
        <button onClick={reset} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-destructive">
          <RotateCcw className="h-3 w-3" /> Abandon franchise and restart
        </button>
      </div>
    </div>
  );
}
