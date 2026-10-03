/**
 * Round 912: one college dynasty board for every sport.
 *
 * CFB Dynasty and CBB Dynasty were two copies of one board (Round 426 had to
 * fix one roster bug twice for that reason). This is the board once: the
 * pick screen, the season with its five tabs, the recap curtain, the
 * recruiting trail and the staff window. Everything that is football or
 * basketball about it (the engine, the save, the words, the positions, the
 * postseason recap, the class names one board grew and the other did not)
 * arrives in a CollegeSport descriptor, which each sport's own board file
 * builds and hands in. Nothing here asks which sport it is.
 *
 * The move changed no behaviour: src/components/college-dynasty/
 * collegeDynastyFixture.test.tsx replays a click path recorded from the two
 * boards before they were merged, markup, text, saves and random draws.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { CalendarDays, Crown, GraduationCap, ListOrdered, RotateCcw, ShieldHalf, Trophy, Users } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { ConfettiBurst, CelebrationStyles, revealDelay } from '@/components/club-manager/Celebration';
import {
  coordinatorEdge, VACANT_RATING, STAFF_ROLES,
  type Coordinator, type ProgramStaff, type RivalKind, type RivalryResult, type SlateGame, type StaffRole, type StaffWindow,
} from '@/lib/collegeProgram';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { cn } from '@/lib/utils';
import { useRevealScroll } from '@/hooks/useRevealScroll';

export type CollegePhase = 'pick' | 'season' | 'recap' | 'recruit';
type Tab = 'team' | 'play' | 'schedule' | 'rankings' | 'standings';

export interface CollegePlayer { id: string; name: string; pos: string; cls: string; ovr: number; stars: number }
export interface CollegeTeam { id: string; players: CollegePlayer[]; wins: number; losses: number; staff?: ProgramStaff }
export interface CollegeState<T extends CollegeTeam> {
  season: number; round: number; myTeam: string; nil: number; myTitles: number; seasonsPlayed: number;
  teams: Record<string, T>;
  depth?: number; lastRivalry?: RivalryResult | null; mySlate?: SlateGame[]; staffWindow?: StaffWindow | null;
}
export interface CollegeGame { home: string; away: string; hs: number; as: number; winner: string }
export interface CollegeRecruit { id: string; name: string; pos: string; stars: number; grade: number; nilAsk: number }
export interface CollegeSchool { id: string; name: string; color: string; prestige: number; conf: string }

/** What a sport's words get to read: a school's name and the rivalry line. */
export interface CollegeWordsContext { label: (id: string) => string; rivalry: (id: string) => string }

/** Everything the recap body may draw from. */
export interface CollegeRecapView<T extends CollegeTeam, S extends CollegeState<T>, R> {
  st: S; my: T; recap: R; isChamp: boolean; label: (id: string) => string; signed: (n: number) => string;
}

export interface CollegeSport<T extends CollegeTeam, S extends CollegeState<T>, G extends CollegeGame, Rc extends CollegeRecruit, R> {
  /** The completion record's game id. */
  completionId: string;
  saveKey: string;
  /** The save as the sport has always written it; the recap's field name is the sport's. */
  encodeSave: (st: S, phase: CollegePhase, recruits: Rc[] | null, portal: Rc[] | null, recap: R | null) => string;
  /** The recap a save carries, if it carries one. */
  recapOf: (save: { st: S; phase: CollegePhase; recruits?: Rc[] | null; portal?: Rc[] | null }) => R | null | undefined;
  /** Whether a held recap can be drawn (both halves present). */
  recapDrawable: (recap: R) => boolean;
  championOf: (recap: R) => string;

  schools: readonly CollegeSchool[];
  schoolMap: Map<string, CollegeSchool>;
  confs: readonly string[];
  confLabel: (conf: string) => string;
  rounds: number;
  rivalryRound: number;
  rivalOf: (id: string) => { rival: string; kind: RivalKind; state?: string } | null;
  positions: readonly string[];

  init: (id: string, rng: () => number, opts: { depth: boolean }) => S;
  ensureIds: (st: S, recruits: Rc[] | null | undefined, portal: Rc[] | null | undefined) => void;
  /** One round: the engine's games, and the feed lines about mine. */
  playRound: (st: S, rng: () => number, ctx: CollegeWordsContext) => { games: G[]; lines: string[] };
  /** A season already in the record, checked before the round is played. */
  closedBeforeRound: (st: S) => boolean;
  /** The same question, asked after the final round was played. */
  closedAtFinal: (st: S) => boolean;
  /** The postseason, its award and the title record, in the engine's order. */
  closeSeason: (st: S, rng: () => number) => R;
  openOffseason: (st: S, rng: () => number) => string[];
  recruitClass: (rng: () => number) => Rc[];
  portalPool: (rng: () => number) => Rc[];
  payroll: (st: S) => number;
  signRecruit: (st: S, r: Rc, cls: 'FR' | 'SO', rng: () => number) => boolean;
  hireCoordinator: (st: S, id: string) => boolean;
  fireCoordinator: (st: S, role: StaffRole) => Coordinator | null;
  offseason: (st: S, rng: () => number) => string[];
  enableDepth: (st: S, rng: () => number) => void;
  strength: (team: T) => number;
  units: (team: T) => { off: number; def: number; offEdge: number; defEdge: number };
  rankings: (st: S) => T[];
  sosTable: (st: S) => Map<string, { sos: number; rank: number }>;
  standings: (st: S, conf: string) => { id: string; record: string }[];

  /** The recap between the headline and the ledger's end. */
  RecapBody: (view: CollegeRecapView<T, S, R>) => ReactNode;
  recapTitles: string;
  share: (st: S, isChamp: boolean, recap: R, label: (id: string) => string) => { gameName: string; gamePath: string; score: string; customText: string };
  words: CollegeWords<T, S, Rc>;
  skin: CollegeSkin;
}

/** Every line of copy that is the sport's own. */
export interface CollegeWords<T extends CollegeTeam, S extends CollegeState<T>, Rc extends CollegeRecruit> {
  pickIntro: string;
  /** The feed on the day a dynasty starts. */
  welcome: (st: S, id: string, ctx: CollegeWordsContext) => string[];
  /** The two lines an old save gets when the program layer switches on. */
  depthArrives: (st: S, ctx: CollegeWordsContext) => string[];
  budgetDepth: (budget: number, payroll: number, nil: number) => string;
  budgetPlain: (nil: number) => string;
  signVerb: string;
  /** "is your new ..." after a hire. */
  hireTitle: (role: StaffRole) => string;
  /** "The ... chair is empty." after a firing. */
  chairName: (role: StaffRole) => string;
  classNote: string;
  staffTitle: string;
  staffNote: string;
  roleName: Record<StaffRole, string>;
  vacantVerb: string;
  portalName: (r: Rc) => string;
  portalDetail: (r: Rc) => string;
  seasonLabel: (season: number) => string;
  roundWord: string;
  recordExtra: (team: T) => string;
  standingsTab: string;
  depthChart: string;
  unitCoach: (role: StaffRole, c: Coordinator | null) => string;
  noStaffYet: string;
  playIntro: (depth: boolean) => string;
  rivalryNow: (isRivalryRound: boolean) => string;
  playButton: (round: number, final: boolean) => string;
  playFootnote: string;
  sosPending: string;
  slateTag: string;
  nonConf: string;
  upNext: (st: S, note: string) => string | null;
  scheduleNote: string;
  scheduleBeforeDepth: string;
  rankCut: number;
  rankMark: string;
  rankingsNote: (depth: boolean) => string;
  standingsCut: number;
  standingsMark: string;
  standingsNote: (depth: boolean) => string;
}

/** Class names one board grew and the other did not, held as they were. */
export interface CollegeSkin {
  /** The focus ring the filter controls and signing rows carry. */
  focus: string;
  /** The row height the signing rows carry. */
  tallRows: string;
  recruitList: string;
  rowName: string;
  /** 'live' keeps an always drawn, announced feed box; 'plain' draws it only once it has lines. */
  feedBox: 'live' | 'plain';
  slateList: string;
}

const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;
const END_NAME: Record<StaffRole, string> = { OC: 'Offense', DC: 'Defense' };

/* Round 728, Round 823: how rivalry week (or night) names the pairing. An
   in-state pair is a fact the data holds (both schools' state); anything else
   the game paired, and it says so rather than implying a history nobody has
   checked. */
function rivalryNoteFor(
  rivalOf: (id: string) => { rival: string; kind: RivalKind; state?: string } | null,
  schoolMap: Map<string, CollegeSchool>,
  myTeam: string,
): string {
  const r = rivalOf(myTeam);
  if (!r) return '';
  const opp = schoolMap.get(r.rival)?.name ?? r.rival;
  return r.kind === 'in-state'
    ? `${opp}, the in-state game (both in ${r.state})`
    : `${opp}, a pairing the game made (no series history on file)`;
}

export default function CollegeDynastyBoard<
  T extends CollegeTeam, S extends CollegeState<T>, G extends CollegeGame, Rc extends CollegeRecruit, R,
>({ sport }: { sport: CollegeSport<T, S, G, Rc, R> }) {
  const w = sport.words;
  const [phase, setPhase] = useState<CollegePhase>('pick');
  const [tab, setTab] = useState<Tab>('team');
  const [st, setSt] = useState<S | null>(null);
  const [feed, setFeed] = useState<string[]>([]);
  /* Round 530: the recruiting feed is prepended to, one line per signing, so
     a row's key is its distance from the newest line. The newest row is the
     only one that animates; the rows below it keep their identity and their
     final frame instead of replaying every time a line lands above them. */
  const feedSeq = useRef(0);
  const [lastGames, setLastGames] = useState<G[]>([]);
  // Round 66: the owner's no scroll rule. You press Play at the top and
  // the results render underneath, so the scoreboard pulls itself into view.
  const revealRef = useRevealScroll<HTMLDivElement>(
    `${phase}:${lastGames.length}:${lastGames[0]?.home ?? ''}:${lastGames[0]?.away ?? ''}`,
  );
  const [recap, setRecap] = useState<R | null>(null);
  const [recruits, setRecruits] = useState<Rc[] | null>(null);
  const [portal, setPortal] = useState<Rc[] | null>(null);
  const [positionFilter, setPositionFilter] = useState('');
  const [starFilter, setStarFilter] = useState('');
  const [wonNow, setWonNow] = useState(false);
  /* Round 728: which chair's market is open in the hiring window, one at a
     time so the offseason screen stays short. */
  const [shopRole, setShopRole] = useState<StaffRole | null>(null);

  useGameCompletion(sport.completionId, wonNow, (st?.myTitles ?? 0) * 100 + (st?.seasonsPlayed ?? 0) * 5);

  const persist = useCallback((state: S, ph: CollegePhase, rec: Rc[] | null, por: Rc[] | null, held: R | null = null) => {
    try {
      localStorage.setItem(sport.saveKey, sport.encodeSave(state, ph, rec, por, held));
    } catch { /* full */ }
  }, [sport]);

  /* The step after the recap: the budget, a recruiting class and a portal
     pool for the season just closed. Round 728 and 823: the budget, the
     coaching carousel and the staff's pay all happen in the engine, and a
     save from before it just gets the old NIL budget, same as ever. Shared by
     the recap's button and by the restore of an older save written on the recap. */
  const openRecruiting = useCallback((source: S) => {
    const state: S = JSON.parse(JSON.stringify(source));
    const notes = sport.openOffseason(state, Math.random);
    const cls = sport.recruitClass(Math.random);
    const por = sport.portalPool(Math.random);
    setSt(state); setRecruits(cls); setPortal(por); setPhase('recruit');
    setFeed(state.depth && state.staffWindow
      ? [sport.words.budgetDepth(state.staffWindow.budget, sport.payroll(state), state.nil), ...notes]
      : [sport.words.budgetPlain(state.nil)]);
    persist(state, 'recruit', cls, por);
  }, [persist, sport]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(sport.saveKey);
      if (!raw) return;
      const s = JSON.parse(raw) as { st: S; phase: CollegePhase; recruits?: Rc[] | null; portal?: Rc[] | null };
      if (!s.st?.myTeam) return;
      /* Round 568: FIRST, above every setState below. The recruits and the
         portal are minted from the same counter as the rosters, so all three
         are one id space and the repair has to see all three at once. */
      sport.ensureIds(s.st, s.recruits, s.portal);
      setSt(s.st);
      setRecruits(s.recruits ?? null);
      setPortal(s.portal ?? null);
      /* Round 426 part three (CFB) and Round 823 (CBB): a reload on the recap
         used to map back to the season screen, and one click played the last
         round and the whole postseason a second time on a season that was
         already closed. The save carries the recap now, so it is simply drawn
         again; a save from before that has nothing to draw, so it opens on
         the recruiting trail, which is where the recap's only button leads. */
      if (s.phase === 'recap') {
        const held = sport.recapOf(s);
        if (held) { setRecap(held); setPhase('recap'); }
        else openRecruiting(s.st);
      } else {
        setPhase(s.phase);
      }
    } catch { /* fresh */ }
  }, [openRecruiting, sport]);

  const label = (id: string) => sport.schoolMap.get(id)?.name ?? id;
  const rivalry = (id: string) => rivalryNoteFor(sport.rivalOf, sport.schoolMap, id);
  const ctx: CollegeWordsContext = { label, rivalry };

  const start = (id: string) => {
    const state = sport.init(id, Math.random, { depth: true });
    setSt(state); setPhase('season'); setTab('team');
    setFeed(w.welcome(state, id, ctx));
    setRecap(null); setWonNow(false);
    persist(state, 'season', null, null);
  };

  const my = st?.teams[st.myTeam];

  const playRound = () => {
    if (!st || !my) return;
    /* Round 823: a season's postseason runs once. A state whose record
       already holds this season is a closed season clicked again, and the
       answer is to do nothing. Basketball asks before the round is played,
       football (Round 426 part three) after the final round is played. */
    if (sport.closedBeforeRound(st)) return;
    const state: S = JSON.parse(JSON.stringify(st));
    const { games, lines } = sport.playRound(state, Math.random, ctx);
    setLastGames(games);
    if (state.round >= sport.rounds) {
      if (sport.closedAtFinal(state)) return;
      const held = sport.closeSeason(state, Math.random);
      const won = sport.championOf(held) === state.myTeam;
      if (won) state.myTitles += 1;
      state.seasonsPlayed += 1;
      setWonNow(won);
      setRecap(held);
      setPhase('recap');
      setSt(state);
      setFeed(lines);
      persist(state, 'recap', null, null, held);
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

  const sign = (r: Rc, fromPortal: boolean) => {
    if (!st) return;
    const state: S = JSON.parse(JSON.stringify(st));
    feedSeq.current += 1;
    if (!sport.signRecruit(state, r, fromPortal ? 'SO' : 'FR', Math.random)) {
      setFeed(f => [`❌ Not enough NIL for ${r.name} (asks ${r.nilAsk}).`, ...f].slice(0, 5));
      return;
    }
    const nextRec = recruits?.filter(x => x.id !== r.id) ?? null;
    const nextPor = portal?.filter(x => x.id !== r.id) ?? null;
    setRecruits(nextRec); setPortal(nextPor);
    setSt(state);
    setFeed(f => [`🖊️ ${r.name} (${r.stars}⭐ ${r.pos}) ${w.signVerb} ${label(state.myTeam)}. NIL left: ${state.nil}.`, ...f].slice(0, 5));
    persist(state, 'recruit', nextRec, nextPor);
  };

  /* Round 728 and 823: the hiring window. Both refuse, and say why, rather
     than doing nothing. */
  const hire = (c: Coordinator) => {
    if (!st) return;
    const state: S = JSON.parse(JSON.stringify(st));
    feedSeq.current += 1;
    const current = state.teams[state.myTeam].staff?.[c.role] ?? null;
    if (!sport.hireCoordinator(state, c.id)) {
      setFeed(f => [`❌ Not enough budget for ${c.name}: he costs ${c.salary - (current?.salary ?? 0)} more than the chair does now, you have ${state.nil}.`, ...f].slice(0, 5));
      return;
    }
    setSt(state);
    setFeed(f => [`🤝 ${c.name} (${c.rating}) is your new ${w.hireTitle(c.role)}${current ? `, ${current.name} is out` : ''}. Budget left: ${state.nil}.`, ...f].slice(0, 5));
    persist(state, 'recruit', recruits, portal);
  };

  const fire = (role: StaffRole) => {
    if (!st) return;
    const state: S = JSON.parse(JSON.stringify(st));
    feedSeq.current += 1;
    const gone = sport.fireCoordinator(state, role);
    if (!gone) return;
    setSt(state);
    setFeed(f => [`📋 ${gone.name} is let go. His ${gone.salary} goes back in the pot, budget now ${state.nil}. The ${w.chairName(role)} chair is empty.`, ...f].slice(0, 5));
    persist(state, 'recruit', recruits, portal);
  };

  const finishRecruiting = () => {
    if (!st) return;
    const state: S = JSON.parse(JSON.stringify(st));
    const notes = sport.offseason(state, Math.random);
    /* Round 728 and 823: a dynasty started before the staff existed gets
       them now, at the turn of a season, so nothing it already played changes. */
    if (!state.depth) {
      sport.enableDepth(state, Math.random);
      notes.unshift(...w.depthArrives(state, ctx));
    }
    setSt(state); setPhase('season'); setTab('team');
    setRecruits(null); setPortal(null); setRecap(null); setWonNow(false);
    setFeed(notes.slice(0, 5));
    persist(state, 'season', null, null);
  };

  const reset = () => {
    localStorage.removeItem(sport.saveKey);
    setPhase('pick'); setSt(null); setRecap(null);
  };

  if (phase === 'pick' || !st || !my) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-lg font-bold text-foreground">Pick your program</p>
          <p className="mt-1 text-xs text-muted-foreground">{w.pickIntro}</p>
        </div>
        {sport.confs.map(conf => (
          <div key={conf}>
            <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{sport.confLabel(conf)}</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {sport.schools.filter(s => s.conf === conf).map(s => (
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

  const school = sport.schoolMap.get(st.myTeam)!;
  const strength = Math.round(sport.strength(my));
  const myRank = sport.rankings(st).findIndex(t => t.id === st.myTeam) + 1;

  if (phase === 'recap' && recap && sport.recapDrawable(recap)) {
    const isChamp = sport.championOf(recap) === st.myTeam;
    const { RecapBody } = sport;
    /* Round 530: the season curtain. Pure presentation over the postseason
       the engine already ran: the champion slams in, your own line rises,
       the award lands after the champion, then the title game and the ledger
       tick in, in the order the engine played them. Keyed on the season so
       next year's recap plays again from the top. Every number is the final
       value from frame one. */
    return (
      <div className="space-y-4">
        <div key={st.season} className={cn('relative overflow-hidden rounded-2xl border border-gold/50 bg-card p-5 text-center', isChamp && 'cm-win-pulse')}>
          <CelebrationStyles />
          {isChamp && <ConfettiBurst seed={st.season} count={34} />}
          <Crown className="cm-slam mx-auto h-10 w-10 text-gold" />
          <RecapBody st={st} my={my} recap={recap} isChamp={isChamp} label={label} signed={signed} />
          <div className="cm-rise mt-3 flex items-center justify-center gap-3 text-sm" style={{ animationDelay: '0.9s' }}>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">{sport.recapTitles} <b className="text-gold">{st.myTitles}</b></span>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Seasons <b className="text-primary">{st.seasonsPlayed}</b></span>
          </div>
          <div className="cm-rise mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center" style={{ animationDelay: '0.9s' }}>
            <button onClick={startRecruiting} className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
              <GraduationCap className="h-4 w-4" /> Hit the recruiting trail
            </button>
            <ShareButtons {...sport.share(st, isChamp, recap, label)} />
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'recruit' && (recruits || portal)) {
    const sk = sport.skin;
    const matchesFilters = (r: Rc) => (!positionFilter || r.pos === positionFilter) && (!starFilter || r.stars >= Number(starFilter));
    const visibleRecruits = (recruits ?? []).filter(matchesFilters);
    const visiblePortal = (portal ?? []).filter(matchesFilters);
    /* Round 530: a signing slams in at the top of the class feed; a refused
       one ticks in. Older lines keep their key and stay put. */
    const feedLines = feed.slice(0, 4).map((n, i) => (
      <p key={feedSeq.current - i} className={i === 0 ? (n.startsWith('🖊️') ? 'cm-slam font-semibold text-foreground' : 'cm-tick-in') : undefined}>{n}</p>
    ));
    return (
      <div className="space-y-4">
        <CelebrationStyles />
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-lg font-bold text-foreground">The {st.season + 1} class</p>
          <p className="mt-1 text-xs text-muted-foreground">
            NIL budget: <b className="text-gold">{st.nil}</b> points. High school grades carry scouting error; portal players have real tape.{w.classNote}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3">
          <label className="min-w-32 flex-1 text-[11px] font-bold text-muted-foreground">
            Position
            <select value={positionFilter} onChange={e => setPositionFilter(e.target.value)} className={`mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground${sk.focus}`}>
              <option value="">All positions</option>
              {sport.positions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
            </select>
          </label>
          <label className="min-w-32 flex-1 text-[11px] font-bold text-muted-foreground">
            Minimum stars
            <select value={starFilter} onChange={e => setStarFilter(e.target.value)} className={`mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground${sk.focus}`}>
              <option value="">Any stars</option>
              {[2, 3, 4, 5].map(stars => <option key={stars} value={stars}>{stars}+ stars</option>)}
            </select>
          </label>
          <button onClick={() => { setPositionFilter(''); setStarFilter(''); }} disabled={!positionFilter && !starFilter} className={`min-h-11 rounded-lg border border-border px-3 text-xs font-bold text-foreground hover:bg-secondary disabled:opacity-50${sk.focus}`}>
            Reset filters
          </button>
        </div>
        {sk.feedBox === 'live' ? (
          <div aria-label="Recruiting updates" aria-live="polite" className="h-28 overflow-y-auto rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground [overflow-anchor:none]">
            {feed.length === 0 && <p>Your signings and staff updates will show up here.</p>}
            {feedLines}
          </div>
        ) : feed.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
            {feedLines}
          </div>
        )}
        {st.depth && st.staffWindow && my.staff && (
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{w.staffTitle} · pay {sport.payroll(st)} a season</p>
            <p className="mt-0.5 text-center text-[10px] text-muted-foreground">{w.staffNote}</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {STAFF_ROLES.map(role => {
                const c = my.staff![role];
                const open = shopRole === role;
                return (
                  <div key={role} className="rounded-xl border border-border/60 bg-background p-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{w.roleName[role]}</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                      {c ? (
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-foreground">{c.name}</span>
                          <span className="block text-[10px] text-muted-foreground">rated {c.rating} · {signed(coordinatorEdge(c.rating))} {END_NAME[role].toLowerCase()} · paid {c.salary}</span>
                        </span>
                      ) : (
                        <span className="min-w-0 font-semibold text-amber-300">Empty. A grad assistant {w.vacantVerb} it ({signed(coordinatorEdge(VACANT_RATING))}).</span>
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
            <div className={`${sk.recruitList} space-y-1 overflow-y-auto`}>
              {visibleRecruits.length === 0 && <p className="rounded-lg bg-secondary p-3 text-center text-xs text-muted-foreground">{recruits?.length ? 'No high school recruits match those filters.' : 'No high school recruits left in this class.'}</p>}
              {visibleRecruits.map(r => (
                <button key={r.id} onClick={() => sign(r, false)} className={`flex${sk.tallRows} w-full items-center justify-between rounded-lg border border-border bg-card px-2.5 py-1.5 text-left text-xs hover:border-primary/60${sk.focus}`}>
                  <span className="min-w-0">
                    <span className={sk.rowName}>{'⭐'.repeat(r.stars)} {r.name}</span>
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
            <div className={`${sk.recruitList} space-y-1 overflow-y-auto`}>
              {visiblePortal.length === 0 && <p className="rounded-lg bg-secondary p-3 text-center text-xs text-muted-foreground">{portal?.length ? 'No portal players match those filters.' : 'No portal players left in this class.'}</p>}
              {visiblePortal.map(r => (
                <button key={r.id} onClick={() => sign(r, true)} className={`flex${sk.tallRows} w-full items-center justify-between rounded-lg border border-border bg-card px-2.5 py-1.5 text-left text-xs hover:border-gold/60${sk.focus}`}>
                  <span className="min-w-0">
                    <span className={sk.rowName}>{w.portalName(r)}</span>
                    <span className="block text-[10px] text-muted-foreground">{w.portalDetail(r)}</span>
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
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{w.seasonLabel(st.season)} · {w.roundWord} {st.round}/{sport.rounds}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Record <b className="text-foreground">{my.wins}-{my.losses}</b>{w.recordExtra(my)}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Rank <b className="text-primary">#{myRank}</b></span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Strength <b className="text-primary">{strength}</b></span>
      </div>

      <div className="flex items-center justify-center gap-0.5 rounded-full bg-secondary p-1 text-xs sm:gap-1">
        {/* Round 728: five tabs, so the icons step aside on a phone. */}
        {([
          ['team', 'Roster', Users],
          ['play', 'Play', ShieldHalf],
          ['schedule', 'Schedule', CalendarDays],
          ['rankings', 'Top 25', ListOrdered],
          ['standings', w.standingsTab, Trophy],
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
          <p className="mb-2 text-center text-xs text-muted-foreground">{school.name} {w.depthChart}, prestige {school.prestige}</p>
          {/* Round 728: the two units and who coaches them. */}
          {my.staff ? (
            <div className="mb-2 grid grid-cols-2 gap-1.5 text-[11px]">
              {STAFF_ROLES.map(role => {
                const c = my.staff![role];
                const u = sport.units(my);
                const val = role === 'OC' ? u.off : u.def;
                const edge = role === 'OC' ? u.offEdge : u.defEdge;
                return (
                  <div key={role} className="rounded-lg border border-border/60 bg-background px-2 py-1.5">
                    <p className="font-bold text-foreground">{END_NAME[role]} <span className="text-primary">{val.toFixed(1)}</span></p>
                    <p className="truncate text-[10px] text-muted-foreground">{w.unitCoach(role, c)} ({signed(edge)})</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mb-2 text-center text-[10px] text-muted-foreground">{w.noStaffYet}</p>
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
            <p className="mb-2 text-sm text-foreground">{w.playIntro(!!st.depth)}</p>
            {st.depth && (
              <p className={cn('mb-2 text-xs', st.round === sport.rivalryRound ? 'font-bold text-amber-300' : 'text-muted-foreground')}>
                🔥 {w.rivalryNow(st.round === sport.rivalryRound)}: {rivalry(st.myTeam)}.
              </p>
            )}
            <button onClick={playRound} className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
              <ShieldHalf className="h-4 w-4" /> {w.playButton(st.round, st.round >= sport.rounds)}
            </button>
            <p className="mt-2 text-[10px] text-muted-foreground">{w.playFootnote}</p>
          </div>
          {lastGames.length > 0 && (
            <div ref={revealRef} className="rounded-2xl border border-border bg-card p-3">
              <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Around the country</p>
              <div className="grid max-h-48 grid-cols-1 gap-0.5 overflow-y-auto text-[11px] sm:grid-cols-2">
                {/* Round 530: the scoreboard ticks in at a quick step, there
                    are dozens of rows. Keyed on the round so it replays each round. */}
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
          <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{school.name} {w.seasonLabel(st.season)} schedule</p>
          {st.depth ? (() => {
            /* Round 728: the schedule screen. The strength of schedule is the
               average strength of everyone actually played, the same number
               the committee reads. */
            const sos = sport.sosTable(st).get(st.myTeam);
            const slate = st.mySlate ?? [];
            const next = w.upNext(st, rivalry(st.myTeam));
            return (
              <>
                <p className="mb-2 text-center text-xs text-muted-foreground">
                  Strength of schedule {sos ? <><b className="text-primary">{sos.sos.toFixed(1)}</b>, #{sos.rank} of {sport.schools.length}</> : w.sosPending}
                </p>
                <div className={sport.skin.slateList}>
                  {slate.map((g, i) => (
                    <div key={`${g.round}:${i}`} className={cn('flex items-center justify-between rounded px-2 py-0.5 text-[11px]', g.rivalry ? 'bg-amber-300/10' : '')}>
                      <span className="min-w-0 truncate text-foreground">
                        {w.slateTag}{g.round} {g.home ? 'vs' : 'at'} {label(g.opp)}{g.rivalry ? ' 🔥' : g.conference ? '' : w.nonConf}
                      </span>
                      <span className={cn('ml-2 shrink-0 font-semibold', g.won ? 'text-primary' : 'text-destructive')}>{g.won ? 'W' : 'L'} {g.us}-{g.them}</span>
                    </div>
                  ))}
                  {next !== null && <p className="rounded px-2 py-0.5 text-[11px] text-muted-foreground">{next}</p>}
                </div>
                <p className="mt-2 text-center text-[10px] text-muted-foreground">{w.scheduleNote}</p>
              </>
            );
          })() : (
            <p className="text-center text-xs text-muted-foreground">{w.scheduleBeforeDepth}</p>
          )}
        </div>
      )}

      {tab === 'rankings' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">The Top 25</p>
          {(() => {
            const sosTable = st.depth ? sport.sosTable(st) : null;
            return sport.rankings(st).slice(0, 25).map((t, i) => (
              <div key={t.id} className={cn('flex items-center justify-between rounded px-2 py-0.5 text-[11px]', t.id === st.myTeam ? 'bg-gold/10' : '')}>
                <span className={cn(i < w.rankCut ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                  {i + 1}. {label(t.id)}{i < w.rankCut ? w.rankMark : ''}
                </span>
                <span className="text-muted-foreground">
                  {t.wins}-{t.losses}
                  {sosTable?.get(t.id) && <span className="ml-2 text-[10px]">SOS #{sosTable.get(t.id)!.rank}</span>}
                </span>
              </div>
            ));
          })()}
          <p className="mt-2 text-center text-[10px] text-muted-foreground">{w.rankingsNote(!!st.depth)}</p>
        </div>
      )}

      {tab === 'standings' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sport.confs.map(conf => (
              <div key={conf}>
                <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{sport.confLabel(conf)}</p>
                {sport.standings(st, conf).map((t, i) => (
                  <div key={t.id} className={cn('flex items-center justify-between rounded px-2 py-0.5 text-[11px]', t.id === st.myTeam ? 'bg-gold/10' : '')}>
                    <span className={cn(i < w.standingsCut ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                      {i + 1}. {label(t.id)}{i < w.standingsCut ? w.standingsMark : ''}
                    </span>
                    <span className="text-muted-foreground">{t.record}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">{w.standingsNote(!!st.depth)}</p>
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
