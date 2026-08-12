import { useCallback, useEffect, useState } from 'react';
import { Crown, GraduationCap, ListOrdered, RotateCcw, ShieldHalf, Trophy, Users } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import {
  CBB_SCHOOLS, CBB_SCHOOL_MAP, CBB_CONFS, CBB_ROUNDS,
  initCbb, simCbbRound, cbbRankings, cbbConfStandings, runMarch,
  poyRace, cbbRecruitClass, cbbPortalPool, cbbSignRecruit, cbbOffseason,
  cbbNilFor, cbbStrength,
  type CbbState, type CbbGame, type CbbRecruit, type MarchResult, type PoyFinalist,
} from '@/lib/cbbDynasty';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { cn } from '@/lib/utils';

type Phase = 'pick' | 'season' | 'recap' | 'recruit';
type Tab = 'team' | 'play' | 'rankings' | 'standings';

const SAVE_KEY = 'cbb-dynasty-save-v1';

interface SaveShape {
  st: CbbState; phase: Phase;
  recruits: CbbRecruit[] | null; portal: CbbRecruit[] | null;
}

const confLabel = (c: string) => c === 'B1G' ? 'Big Ten' : c === 'B12' ? 'Big 12' : c === 'BE' ? 'Big East' : c === 'MM' ? 'Mid-Majors' : c;

export default function CbbDynastyBoard() {
  const [phase, setPhase] = useState<Phase>('pick');
  const [tab, setTab] = useState<Tab>('team');
  const [st, setSt] = useState<CbbState | null>(null);
  const [feed, setFeed] = useState<string[]>([]);
  const [lastGames, setLastGames] = useState<CbbGame[]>([]);
  const [march, setMarch] = useState<MarchResult | null>(null);
  const [poy, setPoy] = useState<PoyFinalist[] | null>(null);
  const [recruits, setRecruits] = useState<CbbRecruit[] | null>(null);
  const [portal, setPortal] = useState<CbbRecruit[] | null>(null);
  const [wonNow, setWonNow] = useState(false);

  useGameCompletion('cbb-dynasty', wonNow, (st?.myTitles ?? 0) * 100 + (st?.seasonsPlayed ?? 0) * 5);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as SaveShape;
      if (!s.st?.myTeam) return;
      setSt(s.st);
      setPhase(s.phase === 'recap' ? 'season' : s.phase);
      setRecruits(s.recruits ?? null);
      setPortal(s.portal ?? null);
    } catch { /* fresh */ }
  }, []);

  const persist = useCallback((state: CbbState, ph: Phase, rec: CbbRecruit[] | null, por: CbbRecruit[] | null) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ st: state, phase: ph, recruits: rec, portal: por } satisfies SaveShape));
    } catch { /* full */ }
  }, []);

  const label = (id: string) => CBB_SCHOOL_MAP.get(id)?.name ?? id;

  const start = (id: string) => {
    const state = initCbb(id);
    setSt(state); setPhase('season'); setTab('team');
    setFeed([`Welcome to ${label(id)}. Twenty games, a conference tournament, and one shot at surviving March.`]);
    setMarch(null); setPoy(null); setWonNow(false);
    persist(state, 'season', null, null);
  };

  const my = st?.teams[st.myTeam];

  const playRound = () => {
    if (!st || !my) return;
    const state: CbbState = JSON.parse(JSON.stringify(st));
    const { games, myGames } = simCbbRound(state, Math.random);
    setLastGames(games);
    const lines: string[] = [];
    for (const g of myGames) {
      const won = g.winner === state.myTeam;
      const us = g.home === state.myTeam ? g.hs : g.as;
      const them = g.home === state.myTeam ? g.as : g.hs;
      const opp = g.home === state.myTeam ? g.away : g.home;
      lines.push(`${won ? '✅' : '❌'} ${won ? 'Beat' : 'Lost to'} ${label(opp)} ${us}-${them}.`);
    }
    if (state.round >= CBB_ROUNDS) {
      const result = runMarch(state, Math.random);
      const race = poyRace(state, Math.random);
      state.poyWinners = [...(state.poyWinners ?? []), race[0].name];
      const won = result.champion === state.myTeam;
      state.titles.push({ season: state.season, team: result.champion });
      if (won) state.myTitles += 1;
      state.seasonsPlayed += 1;
      setWonNow(won);
      setMarch(result); setPoy(race);
      setPhase('recap');
      setSt(state);
      setFeed(lines);
      persist(state, 'recap', null, null);
      return;
    }
    state.round += 1;
    setSt(state);
    setFeed(lines);
    persist(state, 'season', recruits, portal);
  };

  const startRecruiting = () => {
    if (!st) return;
    const state: CbbState = JSON.parse(JSON.stringify(st));
    state.nil = cbbNilFor(CBB_SCHOOL_MAP.get(state.myTeam)!.prestige, state.teams[state.myTeam].wins);
    const cls = cbbRecruitClass(Math.random);
    const por = cbbPortalPool(Math.random);
    setSt(state); setRecruits(cls); setPortal(por); setPhase('recruit');
    setFeed([`💰 NIL budget: ${state.nil} points. Replace the departed, raid the portal, run it back.`]);
    persist(state, 'recruit', cls, por);
  };

  const sign = (r: CbbRecruit, fromPortal: boolean) => {
    if (!st) return;
    const state: CbbState = JSON.parse(JSON.stringify(st));
    if (!cbbSignRecruit(state, r, fromPortal ? 'SO' : 'FR', Math.random)) {
      setFeed(f => [`❌ Not enough NIL for ${r.name} (asks ${r.nilAsk}).`, ...f].slice(0, 5));
      return;
    }
    const nextRec = recruits?.filter(x => x.id !== r.id) ?? null;
    const nextPor = portal?.filter(x => x.id !== r.id) ?? null;
    setRecruits(nextRec); setPortal(nextPor);
    setSt(state);
    setFeed(f => [`🖊️ ${r.name} (${r.stars}⭐ ${r.pos}) commits to ${label(state.myTeam)}. NIL left: ${state.nil}.`, ...f].slice(0, 5));
    persist(state, 'recruit', nextRec, nextPor);
  };

  const finishRecruiting = () => {
    if (!st) return;
    const state: CbbState = JSON.parse(JSON.stringify(st));
    const notes = cbbOffseason(state, Math.random);
    setSt(state); setPhase('season'); setTab('team');
    setRecruits(null); setPortal(null); setMarch(null); setPoy(null); setWonNow(false);
    setFeed(notes.slice(0, 5));
    persist(state, 'season', null, null);
  };

  const reset = () => {
    localStorage.removeItem(SAVE_KEY);
    setPhase('pick'); setSt(null); setMarch(null);
  };

  if (phase === 'pick' || !st || !my) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-lg font-bold text-foreground">Pick your program</p>
          <p className="mt-1 text-xs text-muted-foreground">
            40 real programs, six leagues, one bracket. Recruit with NIL, survive the one-and-done
            era, win your conference tournament, then live or die in a 32-team single-elimination
            March. Cinderella is real and she is coming. Saves automatically.
          </p>
        </div>
        {CBB_CONFS.map(conf => (
          <div key={conf}>
            <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{confLabel(conf)}</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {CBB_SCHOOLS.filter(s => s.conf === conf).map(s => (
                <button key={s.id} onClick={() => start(s.id)} className="rounded-lg border border-border bg-card px-2 py-2 text-left transition-all hover:scale-[1.02] hover:border-primary/60">
                  <span className="block h-1.5 w-full rounded-full" style={{ background: s.color }} />
                  <span className="mt-1.5 block truncate text-xs font-bold text-foreground">{s.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">Prestige {s.prestige}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const school = CBB_SCHOOL_MAP.get(st.myTeam)!;
  const strength = Math.round(cbbStrength(my));
  const myRank = cbbRankings(st).findIndex(t => t.id === st.myTeam) + 1;

  if (phase === 'recap' && march && poy) {
    const isChamp = march.champion === st.myTeam;
    const title = march.bracket[march.bracket.length - 1];
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-gold/50 bg-card p-5 text-center">
          <Crown className="mx-auto h-10 w-10 text-gold" />
          <p className="mt-2 font-display text-2xl font-black text-foreground">{label(march.champion)} cut down the nets</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isChamp ? 'One Shining Moment is about you this year.' : `Your ${label(st.myTeam)}: ${my.wins}-${my.losses}. ${march.myExit}.`}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Title game: ({title.homeSeed}) {label(title.home)} vs ({title.awaySeed}) {label(title.away)}, {label(title.winner)} win {Math.max(title.hs, title.as)}-{Math.min(title.hs, title.as)}
          </p>
          {march.cinderella && (
            <p className="mt-1 text-xs font-bold text-emerald-400">
              🕰️ Cinderella: {label(march.cinderella.team)} crashed the Final Four as a {march.cinderella.seed} seed
            </p>
          )}
          <p className="mt-1 text-xs text-amber-300 font-bold">
            🏆 National Player of the Year: {poy[0].name} ({poy[0].pos}, {label(poy[0].team)})
          </p>
          <div className="mt-2 max-h-44 space-y-0.5 overflow-y-auto text-[11px] text-muted-foreground">
            {march.bracket.filter(g => g.name !== 'Round of 32').map((g, i) => (
              <p key={i}>{g.name}: ({g.homeSeed}) {label(g.home)} vs ({g.awaySeed}) {label(g.away)}, {label(g.winner)} advance</p>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-3 text-sm">
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Titles <b className="text-gold">{st.myTitles}</b></span>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Seasons <b className="text-primary">{st.seasonsPlayed}</b></span>
          </div>
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button onClick={startRecruiting} className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
              <GraduationCap className="h-4 w-4" /> Hit the recruiting trail
            </button>
            <ShareButtons
              gameName="CBB Dynasty"
              gamePath="/cbb-dynasty"
              score={`${st.myTitles} titles in ${st.seasonsPlayed} seasons`}
              customText={`CBB Dynasty 🏀 ${isChamp ? `${label(st.myTeam)} just cut down the nets!` : `${label(march.champion)} won it all.`} ${st.myTitles} titles in ${st.seasonsPlayed} seasons. douknowball.com/cbb-dynasty`}
            />
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'recruit' && (recruits || portal)) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-lg font-bold text-foreground">The {st.season + 1} class</p>
          <p className="mt-1 text-xs text-muted-foreground">
            NIL budget: <b className="text-gold">{st.nil}</b> points. High school grades carry scouting error; portal players have real tape. Beware: sign a superstar freshman and he may be one-and-done.
          </p>
        </div>
        {feed.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
            {feed.slice(0, 4).map((n, i) => <p key={i}>{n}</p>)}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">High school board</p>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {(recruits ?? []).map(r => (
                <button key={r.id} onClick={() => sign(r, false)} className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-2.5 py-1.5 text-left text-xs hover:border-primary/60">
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-foreground">{'⭐'.repeat(r.stars)} {r.name}</span>
                    <span className="block text-[10px] text-muted-foreground">{r.pos} · scouted {r.grade} · asks {r.nilAsk} NIL</span>
                  </span>
                  <span className="ml-2 shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">Sign</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transfer portal</p>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {(portal ?? []).map(r => (
                <button key={r.id} onClick={() => sign(r, true)} className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-2.5 py-1.5 text-left text-xs hover:border-gold/60">
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-foreground">{r.name}</span>
                    <span className="block text-[10px] text-muted-foreground">{r.pos} · rated {r.grade} · asks {r.nilAsk} NIL</span>
                  </span>
                  <span className="ml-2 shrink-0 rounded-full border border-gold px-2.5 py-0.5 text-[10px] font-bold text-gold">Sign</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={finishRecruiting} className="mx-auto flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
          <Trophy className="h-4 w-4" /> Close the class, run it back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-full px-3 py-1 font-bold text-white" style={{ background: school.color }}>{school.name}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{st.season}-{(st.season + 1) % 100} · Round {st.round}/{CBB_ROUNDS}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Record <b className="text-foreground">{my.wins}-{my.losses}</b></span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Rank <b className="text-primary">#{myRank}</b></span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Strength <b className="text-primary">{strength}</b></span>
      </div>

      <div className="flex items-center justify-center gap-1 rounded-full bg-secondary p-1 text-xs">
        {([
          ['team', 'Roster', Users],
          ['play', 'Play', ShieldHalf],
          ['rankings', 'Top 25', ListOrdered],
          ['standings', 'Leagues', Trophy],
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
          <p className="mb-2 text-center text-xs text-muted-foreground">{school.name} rotation, prestige {school.prestige}</p>
          <div className="grid max-h-96 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {[...my.players].sort((a, b) => b.ovr - a.ovr).map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs">
                <span className="min-w-0">
                  <span className="block truncate font-bold text-foreground">{p.name}</span>
                  <span className="block text-[10px] text-muted-foreground">{p.pos} · {p.cls} · {'⭐'.repeat(p.stars)}</span>
                </span>
                <b className="ml-2 shrink-0 text-primary">{p.ovr}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'play' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-gold/40 bg-card p-4 text-center">
            <p className="mb-2 text-sm text-foreground">Every round is two games: a league night and a cross-country test.</p>
            <button onClick={playRound} className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
              <ShieldHalf className="h-4 w-4" /> {st.round >= CBB_ROUNDS ? 'Final round + March' : `Play Round ${st.round}`}
            </button>
            <p className="mt-2 text-[10px] text-muted-foreground">Six conference tournament champs auto-bid; 32 teams, single elimination, no second chances.</p>
          </div>
          {lastGames.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Around the country</p>
              <div className="grid max-h-48 grid-cols-1 gap-0.5 overflow-y-auto text-[11px] sm:grid-cols-2">
                {lastGames.map((g, i) => (
                  <p key={i} className={cn('rounded px-2 py-0.5', (g.home === st.myTeam || g.away === st.myTeam) ? 'bg-gold/10 font-semibold text-foreground' : 'text-muted-foreground')}>
                    {label(g.winner)} beat {label(g.winner === g.home ? g.away : g.home)} {Math.max(g.hs, g.as)}-{Math.min(g.hs, g.as)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'rankings' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">The Top 25</p>
          {cbbRankings(st).slice(0, 25).map((t, i) => (
            <div key={t.id} className={cn('flex items-center justify-between rounded px-2 py-0.5 text-[11px]', t.id === st.myTeam ? 'bg-gold/10' : '')}>
              <span className={cn(i < 8 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                {i + 1}. {label(t.id)}
              </span>
              <span className="text-muted-foreground">{t.wins}-{t.losses}</span>
            </div>
          ))}
          <p className="mt-2 text-center text-[10px] text-muted-foreground">Record rules the committee room, but the eye test counts too.</p>
        </div>
      )}

      {tab === 'standings' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CBB_CONFS.map(conf => (
              <div key={conf}>
                <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{confLabel(conf)}</p>
                {cbbConfStandings(st, conf).map((t, i) => (
                  <div key={t.id} className={cn('flex items-center justify-between rounded px-2 py-0.5 text-[11px]', t.id === st.myTeam ? 'bg-gold/10' : '')}>
                    <span className={cn(i < 4 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                      {i + 1}. {label(t.id)}{i < 4 ? ' •' : ''}
                    </span>
                    <span className="text-muted-foreground">{t.wins}-{t.losses}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">• top four make the conference tournament; win it and you dance no matter what.</p>
        </div>
      )}

      <div className="text-center">
        <button onClick={reset} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-destructive">
          <RotateCcw className="h-3 w-3" /> Fire yourself and start over
        </button>
      </div>
    </div>
  );
}
