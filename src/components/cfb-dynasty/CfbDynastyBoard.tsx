import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, Crown, GraduationCap, ListOrdered, RotateCcw, ShieldHalf, Trophy, Users } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { ConfettiBurst, CelebrationStyles, revealDelay } from '@/components/club-manager/Celebration';
import {
  CFB_SCHOOLS, CFB_SCHOOL_MAP, CFB_CONFS, CFB_ROUNDS, CFB_RIVALRY_ROUND,
  initCfb, simCfbRound, cfbRankings, confStandings, runCfbPostseason,
  heismanRace, cfbRecruitClass, cfbPortalPool, signRecruit, cfbOffseason,
  cfbStrength, cfbEnableDepth, cfbOpenOffseason, cfbHireCoordinator, cfbFireCoordinator,
  cfbPayroll, cfbUnits, cfbSosTable, cfbRivalOf,
  type CfbState, type CfbGame, type CfbPlayoffGame, type CfbRecruit, type HeismanFinalist,
  ensureCfbIds,
} from '@/lib/cfbDynasty';
import { coordinatorEdge, VACANT_RATING, STAFF_ROLES, type Coordinator, type StaffRole } from '@/lib/collegeProgram';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { cn } from '@/lib/utils';
import { useRevealScroll } from '@/hooks/useRevealScroll';

type Phase = 'pick' | 'season' | 'recap' | 'recruit';
type Tab = 'team' | 'play' | 'schedule' | 'rankings' | 'standings';

const ROLE_NAME: Record<StaffRole, string> = { OC: 'Offensive coordinator', DC: 'Defensive coordinator' };
const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;

/* Round 728: how rivalry week names the pairing. An in-state pair is a fact
   the data holds (both schools' state); anything else the game paired, and
   it says so rather than implying a history nobody has checked. */
function rivalryNote(myTeam: string): string {
  const r = cfbRivalOf(myTeam);
  if (!r) return '';
  const opp = CFB_SCHOOL_MAP.get(r.rival)?.name ?? r.rival;
  return r.kind === 'in-state'
    ? `${opp}, the in-state game (both in ${r.state})`
    : `${opp}, a pairing the game made (no series history on file)`;
}

const SAVE_KEY = 'cfb-dynasty-save-v1';

type Postseason = { ccgs: CfbPlayoffGame[]; bracket: CfbPlayoffGame[]; champion: string; heisman: HeismanFinalist[] };

interface SaveShape {
  st: CfbState; phase: Phase;
  recruits: CfbRecruit[] | null; portal: CfbRecruit[] | null;
  /* Round 426 part three: present on a save written from the recap screen,
     so the recap can be drawn again after a reload. Absent on older saves. */
  postseason?: Postseason | null;
}

export default function CfbDynastyBoard() {
  const [phase, setPhase] = useState<Phase>('pick');
  const [tab, setTab] = useState<Tab>('team');
  const [st, setSt] = useState<CfbState | null>(null);
  const [feed, setFeed] = useState<string[]>([]);
  /* Round 530: the recruiting feed is prepended to, one line per signing, so
     a row's key is its distance from the newest line. The newest row is the
     only one that animates; the rows below it keep their identity and their
     final frame instead of replaying every time a line lands above them. */
  const feedSeq = useRef(0);
  const [lastGames, setLastGames] = useState<CfbGame[]>([]);
  // Round 66: the owner's no scroll rule. You press Play Week at the top and
  // the results render underneath, so the scoreboard pulls itself into view.
  const revealRef = useRevealScroll<HTMLDivElement>(
    `${phase}:${lastGames.length}:${lastGames[0]?.home ?? ''}:${lastGames[0]?.away ?? ''}`,
  );
  const [postseason, setPostseason] = useState<Postseason | null>(null);
  const [recruits, setRecruits] = useState<CfbRecruit[] | null>(null);
  const [portal, setPortal] = useState<CfbRecruit[] | null>(null);
  const [wonNow, setWonNow] = useState(false);
  /* Round 728: which chair's market is open in the hiring window, one at a
     time so the offseason screen stays short. */
  const [shopRole, setShopRole] = useState<StaffRole | null>(null);

  useGameCompletion('cfb-dynasty', wonNow, (st?.myTitles ?? 0) * 100 + (st?.seasonsPlayed ?? 0) * 5);

  const persist = useCallback((state: CfbState, ph: Phase, rec: CfbRecruit[] | null, por: CfbRecruit[] | null, post: Postseason | null = null) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ st: state, phase: ph, recruits: rec, portal: por, postseason: post } satisfies SaveShape));
    } catch { /* full */ }
  }, []);

  /* The step after the recap: an NIL budget, a recruiting class and a portal
     pool for the season just closed. Shared by the recap's button and by the
     restore of an older save that was written on the recap screen. */
  const openRecruiting = useCallback((source: CfbState) => {
    const state: CfbState = JSON.parse(JSON.stringify(source));
    /* Round 728: the budget, the coaching carousel and the staff's pay all
       happen in the engine now. A save from before it just gets the old
       NIL budget, same as ever. */
    const notes = cfbOpenOffseason(state, Math.random);
    const cls = cfbRecruitClass(Math.random);
    const por = cfbPortalPool(Math.random);
    setSt(state); setRecruits(cls); setPortal(por); setPhase('recruit');
    setFeed(state.depth && state.staffWindow
      ? [`💰 Program budget ${state.staffWindow.budget}: the staff take ${cfbPayroll(state)}, ${state.nil} left for NIL. Land your class, sort your coordinators, then run it back.`, ...notes]
      : [`💰 NIL budget: ${state.nil} points. Land your class, raid the portal, then run it back.`]);
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
      ensureCfbIds(s.st, s.recruits, s.portal);
      setSt(s.st);
      setRecruits(s.recruits ?? null);
      setPortal(s.portal ?? null);
      /* Round 426 part three: a reload on the recap screen used to replay the
         season. The save carried phase 'recap' with round still 12 and no
         postseason, this effect mapped it back to 'season', the button read
         "Final week + the Playoff" again, and one click ran the final week
         and the whole postseason a second time on a season that was already
         closed: seasonsPlayed and natties advanced twice, the natty could be
         won twice, and every team played a 13th game. The save now carries
         the postseason, so the recap is simply drawn again. A save from
         before this round has nothing to draw, so it opens on the recruiting
         trail, which is where the recap's only button leads. */
      if (s.phase === 'recap') {
        if (s.postseason) { setPostseason(s.postseason); setPhase('recap'); }
        else openRecruiting(s.st);
      } else {
        setPhase(s.phase);
      }
    } catch { /* fresh */ }
  }, [openRecruiting]);

  const label = (id: string) => CFB_SCHOOL_MAP.get(id)?.name ?? id;

  const start = (id: string) => {
    const state = initCfb(id, Math.random, { depth: true });
    const staff = state.teams[id].staff;
    setSt(state); setPhase('season'); setTab('team');
    setFeed([
      `Welcome to ${label(id)}. The ${state.season} season kicks off with a 12-game slate, a conference title to defend, and a 12-team Playoff waiting in December.`,
      ...(staff?.OC && staff.DC ? [`📋 Your staff: ${staff.OC.name} runs the offense (${staff.OC.rating}), ${staff.DC.name} the defense (${staff.DC.rating}).`] : []),
      `🔥 Week ${CFB_RIVALRY_ROUND} is rivalry week: ${rivalryNote(id)}.`,
    ]);
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
      /* Round 728: what rivalry week swung, read off the engine's record. */
      const rv = state.lastRivalry;
      if (myGame.rivalry && rv && rv.season === state.season) {
        lines.push(rv.won
          ? `🔥 Rivalry week is yours. Morale ${signed(rv.morale)} into December, and ${rv.recruit} more budget points when the trail opens.`
          : `🧊 Rivalry week went the wrong way. Morale ${signed(rv.morale)} into December, and ${-rv.recruit} fewer budget points when the trail opens.`);
      }
    }
    if (state.round >= CFB_ROUNDS) {
      /* Round 426 part three: a season's postseason runs once. The record
         carries an entry for this season the moment it is played, so a
         state that already has one is a closed season being clicked again
         (an old save restored on the recap, or a double click), and the
         answer is to do nothing rather than play a 13th week. */
      if (state.natties.some(n => n.season === state.season)) return;
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
      const closed: Postseason = { ccgs: post.ccgs, bracket: post.bracket, champion: post.champion, heisman };
      setPostseason(closed);
      setPhase('recap');
      setSt(state);
      setFeed(lines);
      persist(state, 'recap', null, null, closed);
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

  const sign = (r: CfbRecruit, fromPortal: boolean) => {
    if (!st) return;
    const state: CfbState = JSON.parse(JSON.stringify(st));
    feedSeq.current += 1;
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

  /* Round 728: the hiring window. Both refuse, and say why, rather than
     doing nothing. */
  const hire = (c: Coordinator) => {
    if (!st) return;
    const state: CfbState = JSON.parse(JSON.stringify(st));
    feedSeq.current += 1;
    const current = state.teams[state.myTeam].staff?.[c.role] ?? null;
    if (!cfbHireCoordinator(state, c.id)) {
      setFeed(f => [`❌ Not enough budget for ${c.name}: he costs ${c.salary - (current?.salary ?? 0)} more than the chair does now, you have ${state.nil}.`, ...f].slice(0, 5));
      return;
    }
    setSt(state);
    setFeed(f => [`🤝 ${c.name} (${c.rating}) is your new ${c.role}${current ? `, ${current.name} is out` : ''}. Budget left: ${state.nil}.`, ...f].slice(0, 5));
    persist(state, 'recruit', recruits, portal);
  };

  const fire = (role: StaffRole) => {
    if (!st) return;
    const state: CfbState = JSON.parse(JSON.stringify(st));
    feedSeq.current += 1;
    const gone = cfbFireCoordinator(state, role);
    if (!gone) return;
    setSt(state);
    setFeed(f => [`📋 ${gone.name} is let go. His ${gone.salary} goes back in the pot, budget now ${state.nil}. The ${role} chair is empty.`, ...f].slice(0, 5));
    persist(state, 'recruit', recruits, portal);
  };

  const finishRecruiting = () => {
    if (!st) return;
    const state: CfbState = JSON.parse(JSON.stringify(st));
    const notes = cfbOffseason(state, Math.random);
    /* Round 728: a dynasty started before coordinators existed gets them now,
       at the turn of a season, so nothing it already played changes. */
    if (!state.depth) {
      cfbEnableDepth(state, Math.random);
      const staff = state.teams[state.myTeam].staff;
      notes.unshift(
        `🆕 New this season: coordinators, rivalry week and strength of schedule.${staff?.OC && staff.DC ? ` Your staff: ${staff.OC.name} (offense, ${staff.OC.rating}) and ${staff.DC.name} (defense, ${staff.DC.rating}).` : ''}`,
        `🔥 Week ${CFB_RIVALRY_ROUND} is rivalry week: ${rivalryNote(state.myTeam)}.`,
      );
    }
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
    /* Round 530: the season curtain. Pure presentation over the postseason
       the engine already ran: the champion slams in, your own line rises, the
       Heisman lands after the champion, then the title game and the ledger
       tick in, conference title games first and the bracket after, the order
       the engine played them. Keyed on the season so next year's recap plays
       again from the top. Every number is the final value from frame one. */
    const ledger = [
      ...postseason.ccgs.map(g => `${g.name}: ${label(g.winner)} ${Math.max(g.hs, g.as)}-${Math.min(g.hs, g.as)}`),
      ...postseason.bracket.slice(0, -1).map(g => `${g.name}: ${label(g.winner)} beat ${label(g.winner === g.home ? g.away : g.home)} ${Math.max(g.hs, g.as)}-${Math.min(g.hs, g.as)}`),
    ];
    return (
      <div className="space-y-4">
        <div key={st.season} className={cn('relative overflow-hidden rounded-2xl border border-gold/50 bg-card p-5 text-center', isChamp && 'cm-win-pulse')}>
          <CelebrationStyles />
          {isChamp && <ConfettiBurst seed={st.season} count={34} />}
          <Crown className="cm-slam mx-auto h-10 w-10 text-gold" />
          <p className="cm-slam mt-2 font-display text-2xl font-black text-foreground" style={{ animationDelay: '0.05s' }}>{label(postseason.champion)} win the {st.season} natty</p>
          <p className="cm-rise mt-1 text-sm text-muted-foreground" style={{ animationDelay: '0.25s' }}>
            {isChamp ? 'Plant the flag. The whole sport is yours.' : `Your ${label(st.myTeam)} finished ${my.wins}-${my.losses}${my.champion ? ' as conference champs' : ''}.`}
          </p>
          {/* Round 426: guarded for the same reason as the handler above. Without
              this the recap crashes on the render instead of on the click, which
              is the same dead end from the player's side. */}
          {postseason.heisman[0] && (
            <p className="cm-rise mt-1 text-xs text-amber-300 font-bold" style={{ animationDelay: '0.45s' }}>
              🏆 Heisman: {postseason.heisman[0].name} ({postseason.heisman[0].pos}, {label(postseason.heisman[0].team)})
            </p>
          )}
          <p className="cm-tick-in mt-2 text-xs text-muted-foreground" style={{ animationDelay: revealDelay(0) }}>
            Title game: {label(title.winner)} beat {label(title.winner === title.home ? title.away : title.home)} {Math.max(title.hs, title.as)}-{Math.min(title.hs, title.as)}
          </p>
          <div className="mt-2 max-h-44 space-y-0.5 overflow-y-auto text-[11px] text-muted-foreground">
            {ledger.map((line, i) => (
              <p key={`${st.season}:${i}`} className="cm-tick-in" style={{ animationDelay: revealDelay(i + 1) }}>{line}</p>
            ))}
          </div>
          <div className="cm-rise mt-3 flex items-center justify-center gap-3 text-sm" style={{ animationDelay: '0.9s' }}>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Natties <b className="text-gold">{st.myTitles}</b></span>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Seasons <b className="text-primary">{st.seasonsPlayed}</b></span>
          </div>
          <div className="cm-rise mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center" style={{ animationDelay: '0.9s' }}>
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
        <CelebrationStyles />
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-lg font-bold text-foreground">The {st.season + 1} class</p>
          <p className="mt-1 text-xs text-muted-foreground">
            NIL budget: <b className="text-gold">{st.nil}</b> points. High school grades carry scouting error; portal players have real tape.
          </p>
        </div>
        {feed.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
            {/* Round 530: a signing slams in at the top of the class feed; a
                refused one ticks in. Older lines keep their key and stay put. */}
            {feed.slice(0, 4).map((n, i) => (
              <p key={feedSeq.current - i} className={i === 0 ? (n.startsWith('🖊️') ? 'cm-slam font-semibold text-foreground' : 'cm-tick-in') : undefined}>{n}</p>
            ))}
          </div>
        )}
        {st.depth && st.staffWindow && my.staff && (
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Coaching staff · pay {cfbPayroll(st)} a season</p>
            <p className="mt-0.5 text-center text-[10px] text-muted-foreground">Paid from the same pot as NIL. A coordinator moves his side of the ball by up to 3 points either way.</p>
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
                          <span className="block text-[10px] text-muted-foreground">rated {c.rating} · {signed(coordinatorEdge(c.rating))} {role === 'OC' ? 'offense' : 'defense'} · paid {c.salary}</span>
                        </span>
                      ) : (
                        <span className="min-w-0 font-semibold text-amber-300">Empty. A grad assistant calls it ({signed(coordinatorEdge(VACANT_RATING))}).</span>
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
      <CelebrationStyles />
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-full px-3 py-1 font-bold text-white" style={{ background: school.color }}>{school.name}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{st.season} · Week {st.round}/{CFB_ROUNDS}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Record <b className="text-foreground">{my.wins}-{my.losses}</b> ({my.confWins}-{my.confLosses})</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Rank <b className="text-primary">#{myRank}</b></span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Strength <b className="text-primary">{strength}</b></span>
      </div>

      <div className="flex items-center justify-center gap-0.5 rounded-full bg-secondary p-1 text-xs sm:gap-1">
        {/* Round 728: five tabs now, so the icons step aside on a phone. */}
        {([
          ['team', 'Roster', Users],
          ['play', 'Play', ShieldHalf],
          ['schedule', 'Schedule', CalendarDays],
          ['rankings', 'Top 25', ListOrdered],
          ['standings', 'Conferences', Trophy],
        ] as [Tab, string, typeof Users][]).map(([key, lbl, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1.5 font-semibold transition-all sm:px-3', tab === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="hidden h-3.5 w-3.5 sm:inline" /> {lbl}
          </button>
        ))}
      </div>

      {feed.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
          {/* Round 530: the week's lines tick in. Keyed on the season and the
              week so a new week replays them and a tab switch does not. */}
          {feed.slice(0, 5).map((n, i) => (
            <p key={`${st.season}:${st.round}:${i}`} className="cm-tick-in" style={{ animationDelay: revealDelay(i, 0.05) }}>{n}</p>
          ))}
        </div>
      )}

      {tab === 'team' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 text-center text-xs text-muted-foreground">{school.name} two-deep, prestige {school.prestige}</p>
          {/* Round 728: the two units and who calls them. */}
          {my.staff ? (
            <div className="mb-2 grid grid-cols-2 gap-1.5 text-[11px]">
              {STAFF_ROLES.map(role => {
                const c = my.staff![role];
                const u = cfbUnits(my);
                const val = role === 'OC' ? u.off : u.def;
                const edge = role === 'OC' ? u.offEdge : u.defEdge;
                return (
                  <div key={role} className="rounded-lg border border-border/60 bg-background px-2 py-1.5">
                    <p className="font-bold text-foreground">{role === 'OC' ? 'Offense' : 'Defense'} <span className="text-primary">{val.toFixed(1)}</span></p>
                    <p className="truncate text-[10px] text-muted-foreground">{c ? `${role} ${c.name}, ${c.rating}` : `${role} chair empty`} ({signed(edge)})</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mb-2 text-center text-[10px] text-muted-foreground">Coordinators arrive when this season's offseason closes.</p>
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
            <p className="mb-2 text-sm text-foreground">Weeks 1-4 are the non-conference gauntlet, 5-12 decide the conference race.</p>
            {st.depth && (
              <p className={cn('mb-2 text-xs', st.round === CFB_RIVALRY_ROUND ? 'font-bold text-amber-300' : 'text-muted-foreground')}>
                🔥 {st.round === CFB_RIVALRY_ROUND ? 'This is rivalry week' : `Week ${CFB_RIVALRY_ROUND} is rivalry week`}: {rivalryNote(st.myTeam)}.
              </p>
            )}
            <button onClick={playRound} className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
              <ShieldHalf className="h-4 w-4" /> {st.round >= CFB_ROUNDS ? 'Final week + the Playoff' : `Play Week ${st.round}`}
            </button>
            <p className="mt-2 text-[10px] text-muted-foreground">Five conference champs auto-qualify; twelve teams, straight seeding, byes for the top four.</p>
          </div>
          {lastGames.length > 0 && (
            <div ref={revealRef} className="rounded-2xl border border-border bg-card p-3">
              <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Around the country</p>
              <div className="grid max-h-48 grid-cols-1 gap-0.5 overflow-y-auto text-[11px] sm:grid-cols-2">
                {/* Round 530: the scoreboard ticks in at a quick step, there
                    are a couple dozen rows. Keyed on the week so it replays weekly. */}
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
          <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{school.name} {st.season} schedule</p>
          {st.depth ? (() => {
            /* Round 728: the schedule screen. The strength of schedule is the
               average strength of everyone actually played, the same number
               the committee reads when records tie. */
            const sos = cfbSosTable(st).get(st.myTeam);
            const slate = st.mySlate ?? [];
            return (
              <>
                <p className="mb-2 text-center text-xs text-muted-foreground">
                  Strength of schedule {sos ? <><b className="text-primary">{sos.sos.toFixed(1)}</b>, #{sos.rank} of {CFB_SCHOOLS.length}</> : 'shows up after week 1'}
                </p>
                <div className="space-y-0.5">
                  {slate.map(g => (
                    <div key={g.round} className={cn('flex items-center justify-between rounded px-2 py-0.5 text-[11px]', g.rivalry ? 'bg-amber-300/10' : '')}>
                      <span className="min-w-0 truncate text-foreground">
                        W{g.round} {g.home ? 'vs' : 'at'} {label(g.opp)}{g.rivalry ? ' 🔥' : g.conference ? '' : ' (non-conf)'}
                      </span>
                      <span className={cn('ml-2 shrink-0 font-semibold', g.won ? 'text-primary' : 'text-destructive')}>{g.won ? 'W' : 'L'} {g.us}-{g.them}</span>
                    </div>
                  ))}
                  {st.round <= CFB_ROUNDS && (
                    <p className="rounded px-2 py-0.5 text-[11px] text-muted-foreground">
                      {st.round < CFB_RIVALRY_ROUND
                        ? `Up next: week ${st.round}, opponent drawn on game day. Week ${CFB_RIVALRY_ROUND}: ${rivalryNote(st.myTeam)}.`
                        : `Up next: rivalry week against ${rivalryNote(st.myTeam)}.`}
                    </p>
                  )}
                </div>
                <p className="mt-2 text-center text-[10px] text-muted-foreground">Same record at the end? The tougher schedule plus the better team ranks higher, and the Playoff's at-large spots come off that ranking.</p>
              </>
            );
          })() : (
            <p className="text-center text-xs text-muted-foreground">This dynasty started before the schedule log existed. It starts with next season, along with coordinators and rivalry week.</p>
          )}
        </div>
      )}

      {tab === 'rankings' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">The Top 25</p>
          {(() => {
            const sosTable = st.depth ? cfbSosTable(st) : null;
            return cfbRankings(st).slice(0, 25).map((t, i) => (
              <div key={t.id} className={cn('flex items-center justify-between rounded px-2 py-0.5 text-[11px]', t.id === st.myTeam ? 'bg-gold/10' : '')}>
                <span className={cn(i < 12 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                  {i + 1}. {label(t.id)}{i < 12 ? ' •' : ''}
                </span>
                <span className="text-muted-foreground">
                  {t.wins}-{t.losses}
                  {sosTable?.get(t.id) && <span className="ml-2 text-[10px]">SOS #{sosTable.get(t.id)!.rank}</span>}
                </span>
              </div>
            ));
          })()}
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
