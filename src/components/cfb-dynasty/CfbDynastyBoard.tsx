import { useCallback, useEffect, useState } from 'react';
import { Crown, GraduationCap, ListOrdered, RotateCcw, ShieldHalf, Trophy, Users } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import {
  CFB_SCHOOLS, CFB_SCHOOL_MAP, CFB_CONFS, CFB_ROUNDS,
  initCfb, simCfbRound, cfbRankings, confStandings, runCfbPostseason,
  heismanRace, cfbRecruitClass, cfbPortalPool, signRecruit, cfbOffseason,
  nilBudgetFor, cfbStrength,
  type CfbState, type CfbGame, type CfbPlayoffGame, type CfbRecruit, type HeismanFinalist,
} from '@/lib/cfbDynasty';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { cn } from '@/lib/utils';
import { useRevealScroll } from '@/hooks/useRevealScroll';

type Phase = 'pick' | 'season' | 'recap' | 'recruit';
type Tab = 'team' | 'play' | 'rankings' | 'standings';

const SAVE_KEY = 'cfb-dynasty-save-v1';

interface SaveShape {
  st: CfbState; phase: Phase;
  recruits: CfbRecruit[] | null; portal: CfbRecruit[] | null;
}

export default function CfbDynastyBoard() {
  const [phase, setPhase] = useState<Phase>('pick');
  const [tab, setTab] = useState<Tab>('team');
  const [st, setSt] = useState<CfbState | null>(null);
  const [feed, setFeed] = useState<string[]>([]);
  const [lastGames, setLastGames] = useState<CfbGame[]>([]);
  // Round 66: the owner's no scroll rule. You press Play Week at the top and
  // the results render underneath, so the scoreboard pulls itself into view.
  const revealRef = useRevealScroll<HTMLDivElement>(
    `${phase}:${lastGames.length}:${lastGames[0]?.home ?? ''}:${lastGames[0]?.away ?? ''}`,
  );
  const [postseason, setPostseason] = useState<{ ccgs: CfbPlayoffGame[]; bracket: CfbPlayoffGame[]; champion: string; heisman: HeismanFinalist[] } | null>(null);
  const [recruits, setRecruits] = useState<CfbRecruit[] | null>(null);
  const [portal, setPortal] = useState<CfbRecruit[] | null>(null);
  const [wonNow, setWonNow] = useState(false);

  useGameCompletion('cfb-dynasty', wonNow, (st?.myTitles ?? 0) * 100 + (st?.seasonsPlayed ?? 0) * 5);

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

  const persist = useCallback((state: CfbState, ph: Phase, rec: CfbRecruit[] | null, por: CfbRecruit[] | null) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ st: state, phase: ph, recruits: rec, portal: por } satisfies SaveShape));
    } catch { /* full */ }
  }, []);

  const label = (id: string) => CFB_SCHOOL_MAP.get(id)?.name ?? id;

  const start = (id: string) => {
    const state = initCfb(id);
    setSt(state); setPhase('season'); setTab('team');
    setFeed([`Welcome to ${label(id)}. The ${state.season} season kicks off with a 12-game slate, a conference title to defend, and a 12-team Playoff waiting in December.`]);
    setPostseason(null); setWonNow(false);
    persist(state, 'season', null, null);
  };

  const my = st?.teams[st.myTeam];

  const playRound = () => {
    if (!st || !my) return;
    const state: CfbState = JSON.parse(JSON.stringify(st));
    const { games, myGame } = simCfbRound(state, Math.random);
    setLastGames(games);
    const lines: string[] = [];
    if (myGame) {
      const won = myGame.winner === state.myTeam;
      const us = myGame.home === state.myTeam ? myGame.hs : myGame.as;
      const them = myGame.home === state.myTeam ? myGame.as : myGame.hs;
      const opp = myGame.home === state.myTeam ? myGame.away : myGame.home;
      lines.push(`${won ? '✅' : '❌'} Week ${state.round}: ${won ? 'beat' : 'lost to'} ${label(opp)} ${us}-${them}${myGame.conference ? ' (conference)' : ''}.`);
    }
    if (state.round >= CFB_ROUNDS) {
      const post = runCfbPostseason(state, Math.random);
      const heisman = heismanRace(state, Math.random);
      /* Round 426: heismanRace can legitimately come back EMPTY, and indexing
         [0] blindly here threw "Cannot read properties of undefined (reading
         'name')" inside the final week handler, so the season never advanced,
         the state never saved, and the dynasty was bricked for good: reloading
         restored the same dead week and crashed again. Only "Fire yourself and
         start over" was left, which throws away every season played. */
      const heismanWinner = heisman[0];
      if (heismanWinner) {
        state.heismanWinners = [...(state.heismanWinners ?? []), heismanWinner.name];
      }
      const won = post.champion === state.myTeam;
      state.natties.push({ season: state.season, team: post.champion });
      if (won) state.myTitles += 1;
      state.seasonsPlayed += 1;
      setWonNow(won);
      setPostseason({ ccgs: post.ccgs, bracket: post.bracket, champion: post.champion, heisman });
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
    const state: CfbState = JSON.parse(JSON.stringify(st));
    state.nil = nilBudgetFor(CFB_SCHOOL_MAP.get(state.myTeam)!.prestige, state.teams[state.myTeam].wins);
    const cls = cfbRecruitClass(Math.random);
    const por = cfbPortalPool(Math.random);
    setSt(state); setRecruits(cls); setPortal(por); setPhase('recruit');
    setFeed([`💰 NIL budget: ${state.nil} points. Land your class, raid the portal, then run it back.`]);
    persist(state, 'recruit', cls, por);
  };

  const sign = (r: CfbRecruit, fromPortal: boolean) => {
    if (!st) return;
    const state: CfbState = JSON.parse(JSON.stringify(st));
    if (!signRecruit(state, r, fromPortal ? 'SO' : 'FR', Math.random)) {
      setFeed(f => [`❌ Not enough NIL for ${r.name} (asks ${r.nilAsk}).`, ...f].slice(0, 5));
      return;
    }
    const nextRec = recruits?.filter(x => x.id !== r.id) ?? null;
    const nextPor = portal?.filter(x => x.id !== r.id) ?? null;
    setRecruits(nextRec); setPortal(nextPor);
    setSt(state);
    setFeed(f => [`🖊️ ${r.name} (${r.stars}⭐ ${r.pos}) signs with ${label(state.myTeam)}. NIL left: ${state.nil}.`, ...f].slice(0, 5));
    persist(state, 'recruit', nextRec, nextPor);
  };

  const finishRecruiting = () => {
    if (!st) return;
    const state: CfbState = JSON.parse(JSON.stringify(st));
    const notes = cfbOffseason(state, Math.random);
    setSt(state); setPhase('season'); setTab('team');
    setRecruits(null); setPortal(null); setPostseason(null); setWonNow(false);
    setFeed(notes.slice(0, 5));
    persist(state, 'season', null, null);
  };

  const reset = () => {
    localStorage.removeItem(SAVE_KEY);
    setPhase('pick'); setSt(null); setPostseason(null);
  };

  if (phase === 'pick' || !st || !my) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-lg font-bold text-foreground">Pick your program</p>
          <p className="mt-1 text-xs text-muted-foreground">
            44 real schools in the post-realignment landscape. Recruit with NIL, survive the
            conference, make the 12-team Playoff, win the natty, then do it again with a new
            roster. Classes graduate, stars declare early, dynasties are earned. Saves automatically.
          </p>
        </div>
        {CFB_CONFS.map(conf => (
          <div key={conf}>
            <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{conf === 'B1G' ? 'Big Ten' : conf === 'B12' ? 'Big 12' : conf === 'G5' ? 'Group of Five' : conf}</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {CFB_SCHOOLS.filter(s => s.conf === conf).map(s => (
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

  const school = CFB_SCHOOL_MAP.get(st.myTeam)!;
  const strength = Math.round(cfbStrength(my));
  const myRank = cfbRankings(st).findIndex(t => t.id === st.myTeam) + 1;

  if (phase === 'recap' && postseason) {
    const isChamp = postseason.champion === st.myTeam;
    const title = postseason.bracket[postseason.bracket.length - 1];
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-gold/50 bg-card p-5 text-center">
          <Crown className="mx-auto h-10 w-10 text-gold" />
          <p className="mt-2 font-display text-2xl font-black text-foreground">{label(postseason.champion)} win the {st.season} natty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isChamp ? 'Plant the flag. The whole sport is yours.' : `Your ${label(st.myTeam)} finished ${my.wins}-${my.losses}${my.champion ? ' as conference champs' : ''}.`}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Title game: {label(title.winner)} beat {label(title.winner === title.home ? title.away : title.home)} {Math.max(title.hs, title.as)}-{Math.min(title.hs, title.as)}
          </p>
          {/* Round 426: guarded for the same reason as the handler above. Without
              this the recap crashes on the render instead of on the click, which
              is the same dead end from the player's side. */}
          {postseason.heisman[0] && (
            <p className="mt-1 text-xs text-amber-300 font-bold">
              🏆 Heisman: {postseason.heisman[0].name} ({postseason.heisman[0].pos}, {label(postseason.heisman[0].team)})
            </p>
          )}
          <div className="mt-2 max-h-44 space-y-0.5 overflow-y-auto text-[11px] text-muted-foreground">
            {postseason.ccgs.map((g, i) => (
              <p key={`c${i}`}>{g.name}: {label(g.winner)} {Math.max(g.hs, g.as)}-{Math.min(g.hs, g.as)}</p>
            ))}
            {postseason.bracket.slice(0, -1).map((g, i) => (
              <p key={`b${i}`}>{g.name}: {label(g.winner)} beat {label(g.winner === g.home ? g.away : g.home)} {Math.max(g.hs, g.as)}-{Math.min(g.hs, g.as)}</p>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-3 text-sm">
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Natties <b className="text-gold">{st.myTitles}</b></span>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Seasons <b className="text-primary">{st.seasonsPlayed}</b></span>
          </div>
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button onClick={startRecruiting} className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
              <GraduationCap className="h-4 w-4" /> Hit the recruiting trail
            </button>
            <ShareButtons
              gameName="CFB Dynasty"
              gamePath="/cfb-dynasty"
              score={`${st.myTitles} natties in ${st.seasonsPlayed} seasons`}
              customText={`CFB Dynasty 🏈 ${isChamp ? `${label(st.myTeam)} just won the natty!` : `${label(postseason.champion)} took the title.`} ${st.myTitles} championships in ${st.seasonsPlayed} seasons. douknowball.com/cfb-dynasty`}
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
            NIL budget: <b className="text-gold">{st.nil}</b> points. High school grades carry scouting error; portal players have real tape.
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
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{st.season} · Week {st.round}/{CFB_ROUNDS}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Record <b className="text-foreground">{my.wins}-{my.losses}</b> ({my.confWins}-{my.confLosses})</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Rank <b className="text-primary">#{myRank}</b></span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Strength <b className="text-primary">{strength}</b></span>
      </div>

      <div className="flex items-center justify-center gap-1 rounded-full bg-secondary p-1 text-xs">
        {([
          ['team', 'Roster', Users],
          ['play', 'Play', ShieldHalf],
          ['rankings', 'Top 25', ListOrdered],
          ['standings', 'Conferences', Trophy],
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
          <p className="mb-2 text-center text-xs text-muted-foreground">{school.name} two-deep, prestige {school.prestige}</p>
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
            <p className="mb-2 text-sm text-foreground">Weeks 1-4 are the non-conference gauntlet, 5-12 decide the conference race.</p>
            <button onClick={playRound} className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
              <ShieldHalf className="h-4 w-4" /> {st.round >= CFB_ROUNDS ? 'Final week + the Playoff' : `Play Week ${st.round}`}
            </button>
            <p className="mt-2 text-[10px] text-muted-foreground">Five conference champs auto-qualify; twelve teams, straight seeding, byes for the top four.</p>
          </div>
          {lastGames.length > 0 && (
            <div ref={revealRef} className="rounded-2xl border border-border bg-card p-3">
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
          {cfbRankings(st).slice(0, 25).map((t, i) => (
            <div key={t.id} className={cn('flex items-center justify-between rounded px-2 py-0.5 text-[11px]', t.id === st.myTeam ? 'bg-gold/10' : '')}>
              <span className={cn(i < 12 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                {i + 1}. {label(t.id)}{i < 12 ? ' •' : ''}
              </span>
              <span className="text-muted-foreground">{t.wins}-{t.losses}</span>
            </div>
          ))}
          <p className="mt-2 text-center text-[10px] text-muted-foreground">• the twelve in the Playoff picture right now</p>
        </div>
      )}

      {tab === 'standings' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CFB_CONFS.map(conf => (
              <div key={conf}>
                <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{conf === 'B1G' ? 'Big Ten' : conf === 'B12' ? 'Big 12' : conf === 'G5' ? 'Group of Five' : conf}</p>
                {confStandings(st, conf).map((t, i) => (
                  <div key={t.id} className={cn('flex items-center justify-between rounded px-2 py-0.5 text-[11px]', t.id === st.myTeam ? 'bg-gold/10' : '')}>
                    <span className={cn(i < 2 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                      {i + 1}. {label(t.id)}{i < 2 ? ' (CCG)' : ''}
                    </span>
                    <span className="text-muted-foreground">{t.confWins}-{t.confLosses}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">Top two in each conference meet in the championship game; the winner books a Playoff spot.</p>
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
