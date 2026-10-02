import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, Crown, GraduationCap, ListOrdered, RotateCcw, ShieldHalf, Trophy, Users } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { ConfettiBurst, CelebrationStyles, revealDelay } from '@/components/club-manager/Celebration';
import {
  CBB_SCHOOLS, CBB_SCHOOL_MAP, CBB_CONFS, CBB_ROUNDS, CBB_RIVALRY_ROUND,
  initCbb, simCbbRound, cbbRankings, cbbConfStandings, runMarch,
  poyRace, cbbRecruitClass, cbbPortalPool, cbbSignRecruit, cbbOffseason,
  cbbStrength, cbbEnableDepth, cbbOpenOffseason, cbbHireCoordinator, cbbFireCoordinator,
  cbbPayroll, cbbUnits, cbbSosTable, cbbRivalOf,
  type CbbState, type CbbGame, type CbbRecruit, type MarchResult, type PoyFinalist,
  ensureCbbIds,
} from '@/lib/cbbDynasty';
import { coordinatorEdge, VACANT_RATING, STAFF_ROLES, type Coordinator, type StaffRole } from '@/lib/collegeProgram';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { cn } from '@/lib/utils';
import { useRevealScroll } from '@/hooks/useRevealScroll';

type Phase = 'pick' | 'season' | 'recap' | 'recruit';
type Tab = 'team' | 'play' | 'schedule' | 'rankings' | 'standings';

/* Round 823: the two chairs are the two ends of the floor. */
const ROLE_NAME: Record<StaffRole, string> = { OC: 'Offensive assistant', DC: 'Defensive assistant' };
const END_NAME: Record<StaffRole, string> = { OC: 'Offense', DC: 'Defense' };
const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;

/* Round 823: how rivalry night names the pairing. An in-state pair is a fact
   the data holds (both schools' state); anything else the game paired, and
   it says so rather than implying a history nobody has checked. */
function rivalryNote(myTeam: string): string {
  const r = cbbRivalOf(myTeam);
  if (!r) return '';
  const opp = CBB_SCHOOL_MAP.get(r.rival)?.name ?? r.rival;
  return r.kind === 'in-state'
    ? `${opp}, the in-state game (both in ${r.state})`
    : `${opp}, a pairing the game made (no series history on file)`;
}

const SAVE_KEY = 'cbb-dynasty-save-v1';

type Recap = { result: MarchResult; poy: PoyFinalist[] };

interface SaveShape {
  st: CbbState; phase: Phase;
  recruits: CbbRecruit[] | null; portal: CbbRecruit[] | null;
  /* Round 823: the CFB fix from Round 426 part three, ported. Present on a
     save written from the recap screen, so the recap can be drawn again
     after a reload instead of the season being played a second time.
     Absent on older saves. */
  march?: Recap | null;
}

const confLabel = (c: string) => c === 'B1G' ? 'Big Ten' : c === 'B12' ? 'Big 12' : c === 'BE' ? 'Big East' : c === 'MM' ? 'Mid-Majors' : c;

export default function CbbDynastyBoard() {
  const [phase, setPhase] = useState<Phase>('pick');
  const [tab, setTab] = useState<Tab>('team');
  const [st, setSt] = useState<CbbState | null>(null);
  const [feed, setFeed] = useState<string[]>([]);
  /* Round 530: the recruiting feed is prepended to, one line per signing, so
     a row's key is its distance from the newest line. The newest row is the
     only one that animates; the rows below it keep their identity and their
     final frame instead of replaying every time a line lands above them. */
  const feedSeq = useRef(0);
  const [lastGames, setLastGames] = useState<CbbGame[]>([]);
  // Round 66: the owner's no scroll rule. You press Play Week at the top and
  // the results render underneath, so the scoreboard pulls itself into view.
  const revealRef = useRevealScroll<HTMLDivElement>(
    `${phase}:${lastGames.length}:${lastGames[0]?.home ?? ''}:${lastGames[0]?.away ?? ''}`,
  );
  const [march, setMarch] = useState<MarchResult | null>(null);
  const [poy, setPoy] = useState<PoyFinalist[] | null>(null);
  const [recruits, setRecruits] = useState<CbbRecruit[] | null>(null);
  const [portal, setPortal] = useState<CbbRecruit[] | null>(null);
  const [wonNow, setWonNow] = useState(false);
  const [positionFilter, setPositionFilter] = useState('');
  const [starFilter, setStarFilter] = useState('');
  /* Round 823: which chair's market is open in the hiring window, one at a
     time so the offseason screen stays short. */
  const [shopRole, setShopRole] = useState<StaffRole | null>(null);

  useGameCompletion('cbb-dynasty', wonNow, (st?.myTitles ?? 0) * 100 + (st?.seasonsPlayed ?? 0) * 5);

  const persist = useCallback((state: CbbState, ph: Phase, rec: CbbRecruit[] | null, por: CbbRecruit[] | null, recap: Recap | null = null) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ st: state, phase: ph, recruits: rec, portal: por, march: recap } satisfies SaveShape));
    } catch { /* full */ }
  }, []);

  /* The step after the recap: the budget, a recruiting class and a portal
     pool for the season just closed. Round 823: the budget, the coaching
     carousel and the assistants' pay all happen in the engine, and a save
     from before it just gets the old NIL budget, same as ever. Shared by the
     recap's button and by the restore of an older save written on the recap. */
  const openRecruiting = useCallback((source: CbbState) => {
    const state: CbbState = JSON.parse(JSON.stringify(source));
    const notes = cbbOpenOffseason(state, Math.random);
    const cls = cbbRecruitClass(Math.random);
    const por = cbbPortalPool(Math.random);
    setSt(state); setRecruits(cls); setPortal(por); setPhase('recruit');
    setFeed(state.depth && state.staffWindow
      ? [`💰 Program budget ${state.staffWindow.budget}: your assistants take ${cbbPayroll(state)}, ${state.nil} left for NIL. Replace the departed, sort your bench staff, run it back.`, ...notes]
      : [`💰 NIL budget: ${state.nil} points. Replace the departed, raid the portal, run it back.`]);
    persist(state, 'recruit', cls, por);
  }, [persist]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as SaveShape;
      if (!s.st?.myTeam) return;
      /* Round 568: FIRST, above every setState below. The recruits and the
         portal are minted from the same counter as the rosters, so all three
         are one id space and the repair has to see all three at once. */
      ensureCbbIds(s.st, s.recruits, s.portal);
      setSt(s.st);
      setRecruits(s.recruits ?? null);
      setPortal(s.portal ?? null);
      /* Round 823: a reload on the recap used to map back to the season
         screen with the round still at 10, and one click played the last
         round and all of March a second time on a season that was already
         over (the bug CFB fixed in Round 426 part three). The save carries
         the recap now, so it is simply drawn again; a save from before this
         has nothing to draw, so it opens on the recruiting trail, which is
         where the recap's only button leads. */
      if (s.phase === 'recap') {
        if (s.march) { setMarch(s.march.result); setPoy(s.march.poy); setPhase('recap'); }
        else openRecruiting(s.st);
      } else {
        setPhase(s.phase);
      }
    } catch { /* fresh */ }
  }, [openRecruiting]);

  const label = (id: string) => CBB_SCHOOL_MAP.get(id)?.name ?? id;

  const start = (id: string) => {
    const state = initCbb(id, Math.random, { depth: true });
    const staff = state.teams[id].staff;
    setSt(state); setPhase('season'); setTab('team');
    setFeed([
      `Welcome to ${label(id)}. Twenty games, a conference tournament, and one shot at surviving March.`,
      ...(staff?.OC && staff.DC ? [`📋 Your bench: ${staff.OC.name} runs the offense (${staff.OC.rating}), ${staff.DC.name} the defense (${staff.DC.rating}).`] : []),
      `🔥 Round ${CBB_RIVALRY_ROUND}'s league night is rivalry night: ${rivalryNote(id)}.`,
    ]);
    setMarch(null); setPoy(null); setWonNow(false);
    persist(state, 'season', null, null);
  };

  const my = st?.teams[st.myTeam];

  const playRound = () => {
    if (!st || !my) return;
    /* Round 823: a season's March runs once. The record carries a title
       entry for this season the moment March is played, so a state that
       already has one is a closed season clicked again, and the answer is
       to do nothing rather than play the last round twice. */
    if (st.titles.some(t => t.season === st.season)) return;
    const state: CbbState = JSON.parse(JSON.stringify(st));
    const { games, myGames } = simCbbRound(state, Math.random);
    setLastGames(games);
    const lines: string[] = [];
    for (const g of myGames) {
      const won = g.winner === state.myTeam;
      const us = g.home === state.myTeam ? g.hs : g.as;
      const them = g.home === state.myTeam ? g.as : g.hs;
      const opp = g.home === state.myTeam ? g.away : g.home;
      lines.push(`${won ? '✅' : '❌'} ${g.rivalry ? 'Rivalry night: ' : ''}${won ? 'Beat' : 'Lost to'} ${label(opp)} ${us}-${them}.`);
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
      persist(state, 'recap', null, null, { result, poy: race });
      return;
    }
    state.round += 1;
    setSt(state);
    setFeed(lines);
    persist(state, 'season', recruits, portal);
  };

  const startRecruiting = () => {
    if (!st) return;
    openRecruiting(st);
  };

  const sign = (r: CbbRecruit, fromPortal: boolean) => {
    if (!st) return;
    const state: CbbState = JSON.parse(JSON.stringify(st));
    feedSeq.current += 1;
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

  /* Round 823: the hiring window. Both refuse, and say why, rather than
     doing nothing. */
  const hire = (c: Coordinator) => {
    if (!st) return;
    const state: CbbState = JSON.parse(JSON.stringify(st));
    feedSeq.current += 1;
    const current = state.teams[state.myTeam].staff?.[c.role] ?? null;
    if (!cbbHireCoordinator(state, c.id)) {
      setFeed(f => [`❌ Not enough budget for ${c.name}: he costs ${c.salary - (current?.salary ?? 0)} more than the chair does now, you have ${state.nil}.`, ...f].slice(0, 5));
      return;
    }
    setSt(state);
    setFeed(f => [`🤝 ${c.name} (${c.rating}) is your new ${ROLE_NAME[c.role].toLowerCase()}${current ? `, ${current.name} is out` : ''}. Budget left: ${state.nil}.`, ...f].slice(0, 5));
    persist(state, 'recruit', recruits, portal);
  };

  const fire = (role: StaffRole) => {
    if (!st) return;
    const state: CbbState = JSON.parse(JSON.stringify(st));
    feedSeq.current += 1;
    const gone = cbbFireCoordinator(state, role);
    if (!gone) return;
    setSt(state);
    setFeed(f => [`📋 ${gone.name} is let go. His ${gone.salary} goes back in the pot, budget now ${state.nil}. The ${END_NAME[role].toLowerCase()} chair is empty.`, ...f].slice(0, 5));
    persist(state, 'recruit', recruits, portal);
  };

  const finishRecruiting = () => {
    if (!st) return;
    const state: CbbState = JSON.parse(JSON.stringify(st));
    const notes = cbbOffseason(state, Math.random);
    /* Round 823: a dynasty started before the assistants existed gets them
       now, at the turn of a season, so nothing it already played changes. */
    if (!state.depth) {
      cbbEnableDepth(state, Math.random);
      const staff = state.teams[state.myTeam].staff;
      notes.unshift(
        `🆕 New this season: assistant coaches, rivalry night and strength of schedule.${staff?.OC && staff.DC ? ` Your bench: ${staff.OC.name} (offense, ${staff.OC.rating}) and ${staff.DC.name} (defense, ${staff.DC.rating}).` : ''}`,
        `🔥 Round ${CBB_RIVALRY_ROUND}'s league night is rivalry night: ${rivalryNote(state.myTeam)}.`,
      );
    }
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
    /* Round 530: the season curtain. Pure presentation over the March the
       engine already ran: the champion slams in, your own line rises, the
       player of the year lands after the champion, Cinderella after him, then
       the title game and the bracket tick in round by round in the order the
       engine played them. Keyed on the season so next year's recap plays
       again from the top. Every number is the final value from frame one. */
    const ledger = march.bracket.filter(g => g.name !== 'Round of 32');
    return (
      <div className="space-y-4">
        <div key={st.season} className={cn('relative overflow-hidden rounded-2xl border border-gold/50 bg-card p-5 text-center', isChamp && 'cm-win-pulse')}>
          <CelebrationStyles />
          {isChamp && <ConfettiBurst seed={st.season} count={34} />}
          <Crown className="cm-slam mx-auto h-10 w-10 text-gold" />
          <p className="cm-slam mt-2 font-display text-2xl font-black text-foreground" style={{ animationDelay: '0.05s' }}>{label(march.champion)} cut down the nets</p>
          <p className="cm-rise mt-1 text-sm text-muted-foreground" style={{ animationDelay: '0.25s' }}>
            {isChamp ? 'One Shining Moment is about you this year.' : `Your ${label(st.myTeam)}: ${my.wins}-${my.losses}. ${march.myExit}.`}
          </p>
          {/* Round 823: what rivalry night swung, read off the engine's record. */}
          {st.lastRivalry && st.lastRivalry.season === st.season && (
            <p className="cm-rise mt-1 text-xs text-muted-foreground" style={{ animationDelay: '0.35s' }}>
              {st.lastRivalry.won ? '🔥' : '🧊'} Rivalry night: {st.lastRivalry.won ? 'beat' : 'lost to'} {label(st.lastRivalry.opp)} {st.lastRivalry.us}-{st.lastRivalry.them}. Morale {signed(st.lastRivalry.morale)} into March, and {st.lastRivalry.won ? `${st.lastRivalry.recruit} more` : `${-st.lastRivalry.recruit} fewer`} budget points on the trail.
            </p>
          )}
          <p className="cm-rise mt-1 text-xs text-amber-300 font-bold" style={{ animationDelay: '0.45s' }}>
            🏆 National Player of the Year: {poy[0].name} ({poy[0].pos}, {label(poy[0].team)})
          </p>
          {march.cinderella && (
            <p className="cm-rise mt-1 text-xs font-bold text-emerald-400" style={{ animationDelay: '0.55s' }}>
              🕰️ Cinderella: {label(march.cinderella.team)} crashed the Final Four as a {march.cinderella.seed} seed
            </p>
          )}
          <p className="cm-tick-in mt-2 text-xs text-muted-foreground" style={{ animationDelay: revealDelay(0) }}>
            Title game: ({title.homeSeed}) {label(title.home)} vs ({title.awaySeed}) {label(title.away)}, {label(title.winner)} win {Math.max(title.hs, title.as)}-{Math.min(title.hs, title.as)}
          </p>
          <div className="mt-2 max-h-44 space-y-0.5 overflow-y-auto text-[11px] text-muted-foreground">
            {ledger.map((g, i) => (
              <p key={`${st.season}:${i}`} className="cm-tick-in" style={{ animationDelay: revealDelay(i + 1) }}>{g.name}: ({g.homeSeed}) {label(g.home)} vs ({g.awaySeed}) {label(g.away)}, {label(g.winner)} advance</p>
            ))}
          </div>
          <div className="cm-rise mt-3 flex items-center justify-center gap-3 text-sm" style={{ animationDelay: '0.9s' }}>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Titles <b className="text-gold">{st.myTitles}</b></span>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Seasons <b className="text-primary">{st.seasonsPlayed}</b></span>
          </div>
          <div className="cm-rise mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center" style={{ animationDelay: '0.9s' }}>
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
    const matchesFilters = (r: CbbRecruit) => (!positionFilter || r.pos === positionFilter) && (!starFilter || r.stars >= Number(starFilter));
    const visibleRecruits = (recruits ?? []).filter(matchesFilters);
    const visiblePortal = (portal ?? []).filter(matchesFilters);
    return (
      <div className="space-y-4">
        <CelebrationStyles />
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-lg font-bold text-foreground">The {st.season + 1} class</p>
          <p className="mt-1 text-xs text-muted-foreground">
            NIL budget: <b className="text-gold">{st.nil}</b> points. High school grades carry scouting error; portal players have real tape. Beware: sign a superstar freshman and he may be one-and-done.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3">
          <label className="min-w-32 flex-1 text-[11px] font-bold text-muted-foreground">
            Position
            <select value={positionFilter} onChange={e => setPositionFilter(e.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground">
              <option value="">All positions</option>
              {(['PG', 'SG', 'SF', 'PF', 'C'] as const).map(pos => <option key={pos} value={pos}>{pos}</option>)}
            </select>
          </label>
          <label className="min-w-32 flex-1 text-[11px] font-bold text-muted-foreground">
            Minimum stars
            <select value={starFilter} onChange={e => setStarFilter(e.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground">
              <option value="">Any stars</option>
              {[2, 3, 4, 5].map(stars => <option key={stars} value={stars}>{stars}+ stars</option>)}
            </select>
          </label>
          <button onClick={() => { setPositionFilter(''); setStarFilter(''); }} disabled={!positionFilter && !starFilter} className="min-h-11 rounded-lg border border-border px-3 text-xs font-bold text-foreground hover:bg-secondary disabled:opacity-50">
            Reset filters
          </button>
        </div>
        {feed.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
            {/* Round 530: a commitment slams in at the top of the class feed; a
                refused one ticks in. Older lines keep their key and stay put. */}
            {feed.slice(0, 4).map((n, i) => (
              <p key={feedSeq.current - i} className={i === 0 ? (n.startsWith('🖊️') ? 'cm-slam font-semibold text-foreground' : 'cm-tick-in') : undefined}>{n}</p>
            ))}
          </div>
        )}
        {st.depth && st.staffWindow && my.staff && (
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assistant coaches · pay {cbbPayroll(st)} a season</p>
            <p className="mt-0.5 text-center text-[10px] text-muted-foreground">Paid from the same pot as NIL. An assistant moves his end of the floor by up to 3 points either way.</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {STAFF_ROLES.map(role => {
                const c = my.staff![role];
                const open = shopRole === role;
                return (
                  <div key={role} className="rounded-xl border border-border/60 bg-background p-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{ROLE_NAME[role]}</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                      {c ? (
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-foreground">{c.name}</span>
                          <span className="block text-[10px] text-muted-foreground">rated {c.rating} · {signed(coordinatorEdge(c.rating))} {END_NAME[role].toLowerCase()} · paid {c.salary}</span>
                        </span>
                      ) : (
                        <span className="min-w-0 font-semibold text-amber-300">Empty. A grad assistant covers it ({signed(coordinatorEdge(VACANT_RATING))}).</span>
                      )}
                      <span className="flex shrink-0 gap-1">
                        {c && <button onClick={() => fire(role)} className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground hover:border-destructive hover:text-destructive">Let go</button>}
                        <button onClick={() => setShopRole(open ? null : role)} className="rounded-full border border-primary px-2 py-0.5 text-[10px] font-bold text-primary">{open ? 'Close' : c ? 'Shop' : 'Hire'}</button>
                      </span>
                    </div>
                    {open && (
                      <div className="mt-1.5 space-y-1">
                        {st.staffWindow!.market.filter(m => m.role === role).map(m => (
                          <button key={m.id} onClick={() => hire(m)} className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-2 py-1 text-left text-[11px] hover:border-primary/60">
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-foreground">{m.name}</span>
                              <span className="block text-[10px] text-muted-foreground">rated {m.rating} · {signed(coordinatorEdge(m.rating))} · asks {m.salary}</span>
                            </span>
                            <span className="ml-2 shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">Hire</span>
                          </button>
                        ))}
                        {st.staffWindow!.market.every(m => m.role !== role) && <p className="text-[10px] text-muted-foreground">Nobody left on the market for this chair.</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">High school board</p>
            <p role="status" className="mb-2 text-center text-[11px] text-muted-foreground">Showing {visibleRecruits.length} of {recruits?.length ?? 0} high school recruits</p>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {visibleRecruits.length === 0 && <p className="rounded-lg bg-secondary p-3 text-center text-xs text-muted-foreground">{recruits?.length ? 'No high school recruits match those filters.' : 'No high school recruits left in this class.'}</p>}
              {visibleRecruits.map(r => (
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
            <p role="status" className="mb-2 text-center text-[11px] text-muted-foreground">Showing {visiblePortal.length} of {portal?.length ?? 0} portal players</p>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {visiblePortal.length === 0 && <p className="rounded-lg bg-secondary p-3 text-center text-xs text-muted-foreground">{portal?.length ? 'No portal players match those filters.' : 'No portal players left in this class.'}</p>}
              {visiblePortal.map(r => (
                <button key={r.id} onClick={() => sign(r, true)} className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-2.5 py-1.5 text-left text-xs hover:border-gold/60">
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-foreground">{'⭐'.repeat(r.stars)} {r.name}</span>
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
      <CelebrationStyles />
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-full px-3 py-1 font-bold text-white" style={{ background: school.color }}>{school.name}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{st.season}-{(st.season + 1) % 100} · Round {st.round}/{CBB_ROUNDS}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Record <b className="text-foreground">{my.wins}-{my.losses}</b></span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Rank <b className="text-primary">#{myRank}</b></span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Strength <b className="text-primary">{strength}</b></span>
      </div>

      <div className="flex items-center justify-center gap-0.5 rounded-full bg-secondary p-1 text-xs sm:gap-1">
        {/* Round 823: five tabs now, so the icons step aside on a phone, the
            way CFB Dynasty's row does. */}
        {([
          ['team', 'Roster', Users],
          ['play', 'Play', ShieldHalf],
          ['schedule', 'Schedule', CalendarDays],
          ['rankings', 'Top 25', ListOrdered],
          ['standings', 'Leagues', Trophy],
        ] as [Tab, string, typeof Users][]).map(([key, lbl, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-1.5 font-semibold transition-all min-[360px]:px-2 sm:px-3', tab === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="hidden h-3.5 w-3.5 sm:inline" /> {lbl}
          </button>
        ))}
      </div>

      {feed.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
          {/* Round 530: the round's lines tick in. Keyed on the season and the
              round so a new round replays them and a tab switch does not. */}
          {feed.slice(0, 5).map((n, i) => (
            <p key={`${st.season}:${st.round}:${i}`} className="cm-tick-in" style={{ animationDelay: revealDelay(i, 0.05) }}>{n}</p>
          ))}
        </div>
      )}

      {tab === 'team' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 text-center text-xs text-muted-foreground">{school.name} rotation, prestige {school.prestige}</p>
          {/* Round 823: the two ends of the floor and who coaches them. */}
          {my.staff ? (
            <div className="mb-2 grid grid-cols-2 gap-1.5 text-[11px]">
              {STAFF_ROLES.map(role => {
                const c = my.staff![role];
                const u = cbbUnits(my);
                const val = role === 'OC' ? u.off : u.def;
                const edge = role === 'OC' ? u.offEdge : u.defEdge;
                return (
                  <div key={role} className="rounded-lg border border-border/60 bg-background px-2 py-1.5">
                    <p className="font-bold text-foreground">{END_NAME[role]} <span className="text-primary">{val.toFixed(1)}</span></p>
                    <p className="truncate text-[10px] text-muted-foreground">{c ? `${c.name}, ${c.rating}` : 'Chair empty'} ({signed(edge)})</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mb-2 text-center text-[10px] text-muted-foreground">Assistant coaches arrive when this season's offseason closes.</p>
          )}
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
            {st.depth && (
              <p className={cn('mb-2 text-xs', st.round === CBB_RIVALRY_ROUND ? 'font-bold text-amber-300' : 'text-muted-foreground')}>
                🔥 {st.round === CBB_RIVALRY_ROUND ? "Tonight's league game is rivalry night" : `Round ${CBB_RIVALRY_ROUND}'s league night is rivalry night`}: {rivalryNote(st.myTeam)}.
              </p>
            )}
            <button onClick={playRound} className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
              <ShieldHalf className="h-4 w-4" /> {st.round >= CBB_ROUNDS ? 'Final round + March' : `Play Round ${st.round}`}
            </button>
            <p className="mt-2 text-[10px] text-muted-foreground">Six conference tournament champs auto-bid; 32 teams, single elimination, no second chances.</p>
          </div>
          {lastGames.length > 0 && (
            <div ref={revealRef} className="rounded-2xl border border-border bg-card p-3">
              <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Around the country</p>
              <div className="grid max-h-48 grid-cols-1 gap-0.5 overflow-y-auto text-[11px] sm:grid-cols-2">
                {/* Round 530: the scoreboard ticks in at a quick step, there
                    are forty rows. Keyed on the round so it replays each round. */}
                {lastGames.map((g, i) => (
                  <p key={`${st.round}:${i}`} className={cn('cm-tick-in rounded px-2 py-0.5', (g.home === st.myTeam || g.away === st.myTeam) ? 'bg-gold/10 font-semibold text-foreground' : 'text-muted-foreground')} style={{ animationDelay: revealDelay(i, 0.15, 0.04) }}>
                    {label(g.winner)} beat {label(g.winner === g.home ? g.away : g.home)} {Math.max(g.hs, g.as)}-{Math.min(g.hs, g.as)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'schedule' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{school.name} {st.season}-{(st.season + 1) % 100} schedule</p>
          {st.depth ? (() => {
            /* Round 823: the schedule screen. The strength of schedule is the
               average strength of everyone actually played, the same number
               the committee reads beside the record and the eye test. */
            const sos = cbbSosTable(st).get(st.myTeam);
            const slate = st.mySlate ?? [];
            return (
              <>
                <p className="mb-2 text-center text-xs text-muted-foreground">
                  Strength of schedule {sos ? <><b className="text-primary">{sos.sos.toFixed(1)}</b>, #{sos.rank} of {CBB_SCHOOLS.length}</> : 'shows up after round 1'}
                </p>
                <div className="max-h-80 space-y-0.5 overflow-y-auto">
                  {slate.map((g, i) => (
                    <div key={`${g.round}:${i}`} className={cn('flex items-center justify-between rounded px-2 py-0.5 text-[11px]', g.rivalry ? 'bg-amber-300/10' : '')}>
                      <span className="min-w-0 truncate text-foreground">
                        R{g.round} {g.home ? 'vs' : 'at'} {label(g.opp)}{g.rivalry ? ' 🔥' : g.conference ? '' : ' (non-league)'}
                      </span>
                      <span className={cn('ml-2 shrink-0 font-semibold', g.won ? 'text-primary' : 'text-destructive')}>{g.won ? 'W' : 'L'} {g.us}-{g.them}</span>
                    </div>
                  ))}
                  <p className="rounded px-2 py-0.5 text-[11px] text-muted-foreground">
                    {st.round < CBB_RIVALRY_ROUND
                      ? `Up next: round ${st.round}, opponents drawn on game night. Round ${CBB_RIVALRY_ROUND}: ${rivalryNote(st.myTeam)}.`
                      : `Up next: rivalry night against ${rivalryNote(st.myTeam)}, then a cross-country game.`}
                  </p>
                </div>
                <p className="mt-2 text-center text-[10px] text-muted-foreground">The committee weighs who you played the same as how good you look, so a tough schedule can carry a bubble team into March.</p>
              </>
            );
          })() : (
            <p className="text-center text-xs text-muted-foreground">This dynasty started before the schedule log existed. It starts with next season, along with assistant coaches and rivalry night.</p>
          )}
        </div>
      )}

      {tab === 'rankings' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">The Top 25</p>
          {(() => {
            const sosTable = st.depth ? cbbSosTable(st) : null;
            return cbbRankings(st).slice(0, 25).map((t, i) => (
              <div key={t.id} className={cn('flex items-center justify-between rounded px-2 py-0.5 text-[11px]', t.id === st.myTeam ? 'bg-gold/10' : '')}>
                <span className={cn(i < 8 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                  {i + 1}. {label(t.id)}
                </span>
                <span className="text-muted-foreground">
                  {t.wins}-{t.losses}
                  {sosTable?.get(t.id) && <span className="ml-2 text-[10px]">SOS #{sosTable.get(t.id)!.rank}</span>}
                </span>
              </div>
            ));
          })()}
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            {st.depth ? 'Record rules the committee room, then the eye test and the schedule, weighed the same.' : 'Record rules the committee room, but the eye test counts too.'}
          </p>
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
