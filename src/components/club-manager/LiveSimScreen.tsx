import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Pause, Play, FastForward, Users, ArrowLeftRight, Gauge, X } from 'lucide-react';
import {
  FORMATIONS, MENTALITIES, slotPosition, pitchLineOf, resolveXI,
  liveFeed, liveStatsAt, myOnPitchAt, oppOnPitchAt, squadNumbers, benchFor, MAX_SUBS, liveGoneIds,
} from '@/lib/clubManager';
import type {
  CareerState, CMPlayer, LiveMatch, MatchWeekReport, MatchStats, Mentality, TalkTone,
  LiveChange, LiveFeedEvent, FormationSlot, PitchLine,
} from '@/lib/clubManager';
import { HalftimeScreen } from '@/components/club-manager/HalftimeScreen';
import { MadeUpTag } from '@/components/club-manager/SquadScreen';
import { useRevealScroll } from '@/hooks/useRevealScroll';

/**
 * Round 158: the Live Sim. His words, the ones he said to really pay
 * attention to: "both sides with each of their formations start and then u
 * see the little circles moving about... people can choose the speed of
 * that... there should be stats counter there with gx and also momentum
 * graph... as manger u can see ur players and make subs and see their
 * stamina".
 *
 * Round 504, his words again: "Ball at players' feet, both teams with names
 * and numbers on their dots, players cover the whole pitch, throw ins,
 * corners and fouls exist. Live stats visible during play, subs and tactics
 * at any moment, the AI opponent also subs."
 *
 * What it is: a 2D walk through the match the engine has already committed,
 * never a second simulation. The engine decides each half as a stream (goals,
 * chances, corners, throw ins, fouls, cards, an injury, the other dugout's
 * subs, every one with a minute), the first at kick off and the second when
 * the manager sends them back out, and this screen walks liveFeed(live) with
 * a clock. The stats strip is liveStatsAt(live, minute), the same function
 * the report's stats block is counted with, so the counter at 90 and the
 * number on the report are one number by construction.
 *
 * A change at any minute (tap one of your dots, bring somebody on or change
 * the shape) goes to the engine through onChange, which keeps everything at
 * or before that minute and redraws the rest of the half. The interval is
 * still the real dressing room (HalftimeScreen, embedded). onStartSecondHalf
 * draws the second half; onSecondHalf FINISHES the match at 90 and lands the
 * report.
 *
 * The choreography between events (who is carrying the ball, the shape
 * pushing up and dropping back, the drift) is theatre, drawn only inside the
 * beat effect, never in a state initialiser. The score, the scorers and every
 * event minute are the sim's own. The screen never lies about the sim; it is
 * allowed to dance around it.
 */

type Stage = 'first' | 'interval' | 'second' | 'done';
type Side = 'me' | 'opp';

/** One man on the grass before he is placed: who he is and the slot his shape gives him. */
interface Man {
  key: string;
  slot: FormationSlot;
  /** Last name, or '' for an opposition with no named eleven. */
  label: string;
  number: number;
  /** Mine only. */
  id?: string;
  side: Side;
  /** Theirs only: a man the game made up, tagged the way the ratings sheet tags him. */
  gen?: boolean;
}
interface Placed extends Man { x: number; y: number; }
interface Carrier { side: Side; index: number; }
interface Beat { n: number; carrier: Carrier; drift: number[]; }
/** A run of banner or event line text; `gen` hangs the MADE UP tag after it. */
interface Seg { t: string; gen?: boolean; }
interface Banner { segs: Seg[]; club: string; tone: Side | 'none'; }

interface LiveSimScreenProps {
  career: CareerState;
  live: LiveMatch | null;
  report: MatchWeekReport | null;
  clubColor: string;
  onSub: (outId: string, inId: string) => void;
  onShape: (m: Mentality) => void;
  onTalk: (tone: TalkTone | null) => void;
  /** Round 504: finishes the match (the page passes resumeMatch). Called once, when the clock reaches 90. */
  onSecondHalf: () => void;
  onExit: () => void;
  /** Round 504: draws the second half when they go back out. */
  onStartSecondHalf: () => void;
  /** Round 504: a sub or a shape change at a minute of the half being played. */
  onChange: (minute: number, change: LiveChange) => void;
  /** Round 504: tells the save where the clock stands (the interval, the
   *  page going hidden), so a reload resumes from there rather than from
   *  the last change. Never called on a tick. */
  onMark: (minute: number) => void;
}

const SPEEDS = [0.5, 1, 2, 4] as const;
/** Sim minutes per real second at 1x. 0.5 makes a match about three minutes. */
const BASE_RATE = 0.5;
/** The shape a nameless opposition lines up in: 4-4-2. */
const DEFAULT_OPP_FORMATION = 1;

/** How far each line steps up when its side has the ball, in percent of the pitch. */
const PUSH: Record<PitchLine, number> = { attack: 20, midfield: 17, defence: 14, keeper: 4 };
/** How far each line drops toward its own goal when the other side has it. */
const BACK: Record<PitchLine, number> = { attack: 9, midfield: 8, defence: 5, keeper: 0 };
/** Who gets the ball: the front men most, the keeper hardly ever. */
const CARRY: Record<PitchLine, number> = { attack: 3, midfield: 2.6, defence: 1.2, keeper: 0.25 };

const lastName = (n: string) => n.replace(' (Youth)', '').split(' ').slice(-1)[0];
const clampPct = (v: number) => Math.max(3, Math.min(97, v));

function initialStage(live: LiveMatch | null, report: MatchWeekReport | null): Stage {
  if (report) return 'done';
  if (!live) return 'first';
  const m = live.minute ?? 0;
  if (live.h2Drawn && m >= 46) return 'second';
  if (m >= 45) return 'interval';
  return 'first';
}

/**
 * Everyone on the grass at a minute, both sides, in slot order. A man sent
 * off, or down injured and not yet replaced, is not on it. After a sub the
 * new man is (that was the bug this round fixed: the dots never changed).
 */
function menAt(career: CareerState, live: LiveMatch | null, report: MatchWeekReport | null, minute: number): { mine: Man[]; theirs: Man[] } {
  const mine: Man[] = [];
  const theirs: Man[] = [];
  /* The shape the eleven kicked off in, whatever the tactics tab says now. */
  const myFormation = FORMATIONS[live?.formationIndex ?? career.formationIndex] ?? FORMATIONS[0];
  if (live) {
    /* Round 548: minute + 1, so a change made AT the minute on the clock is on
       the pitch rather than one minute late. Tapping a dot pauses the clock, so
       a substitution from the pitch is filed at exactly the frozen minute, and
       myOnPitchAt's rule is strictly-after (he played that minute), which left
       the man who had just come off still standing there until you unpaused.
       My side only, deliberately: my substitutions are recorded when I make
       them, so nothing beyond the current minute exists, while the opponent's
       half is drawn ahead and reading theirs inclusively would show their
       change a minute before it happens. */
    const ids = myOnPitchAt(live, minute + 1);
    const numbers = squadNumbers(career, live);
    const gone = new Set<string>();
    for (const c of [...(live.h1Cards ?? []), ...(live.h2Cards ?? [])]) if (c.kind === 'red' && c.id && c.minute <= minute) gone.add(c.id);
    for (const inj of [...(live.h1Injuries ?? []), ...(live.h2Injuries ?? [])]) if (inj.id && inj.minute <= minute) gone.add(inj.id);
    ids.forEach((id, i) => {
      const slot = myFormation.slots[i];
      if (!slot || gone.has(id)) return;
      const p = career.squad.find(q => q.id === id);
      mine.push({ key: `m${i}`, slot, label: p ? lastName(p.name) : slot.label, number: numbers.get(id) ?? i + 1, id, side: 'me' });
    });
    const oppFormation = FORMATIONS[live.oppFormationIndex ?? DEFAULT_OPP_FORMATION] ?? FORMATIONS[DEFAULT_OPP_FORMATION];
    if (live.oppXi) {
      const on = oppOnPitchAt(live, minute);
      const sentOff = new Set<string>();
      for (const c of [...(live.h1OppCards ?? []), ...(live.h2OppCards ?? [])]) if (c.kind === 'red' && c.minute <= minute) sentOff.add(c.name);
      on.forEach((p, i) => {
        const slot = oppFormation.slots[i];
        if (!slot || sentOff.has(p.n)) return;
        const started = live.oppXi?.[i]?.n === p.n;
        const benchIdx = (live.oppBench ?? []).findIndex(b => b.n === p.n);
        theirs.push({ key: `o${i}`, slot, label: lastName(p.n), number: started ? i + 1 : 12 + Math.max(0, benchIdx), side: 'opp', gen: p.g });
      });
    } else {
      oppFormation.slots.forEach((slot, i) => theirs.push({ key: `o${i}`, slot, label: '', number: i + 1, side: 'opp' }));
    }
    return { mine, theirs };
  }
  /* A finished match drawn on its own: the report's elevens, nobody removed. */
  const xi = resolveXI(career);
  myFormation.slots.forEach((slot, i) => {
    const p = xi[i];
    mine.push({ key: `m${i}`, slot, label: p ? lastName(p.name) : slot.label, number: i + 1, id: p?.id, side: 'me' });
  });
  const d = report?.detail;
  const oppFormation = FORMATIONS[d?.oppFormationIndex ?? DEFAULT_OPP_FORMATION] ?? FORMATIONS[DEFAULT_OPP_FORMATION];
  oppFormation.slots.forEach((slot, i) => {
    const p = d?.oppXi?.[i];
    theirs.push({ key: `o${i}`, slot, label: p ? lastName(p.n) : '', number: i + 1, side: 'opp', gen: p?.g });
  });
  return { mine, theirs };
}

/**
 * Where a side stands this beat. My goal is the bottom of the screen (engine
 * y 90 is my keeper), theirs is the top, so their shape is the engine's
 * mirrored. The side with the ball pushes up toward the goal it attacks,
 * graded by line, the keeper never past his own third; the other side drops
 * back and narrows; the wide men lean toward the ball; a little drift on top.
 */
function placeSide(men: Man[], hasBall: boolean, mentality: Mentality, drift: number[], offset: number, ballX: number | null): Placed[] {
  return men.map((m, i) => {
    const base = slotPosition(m.slot, m.side === 'me' ? mentality : 'balanced');
    let x = m.side === 'me' ? base.x : 100 - base.x;
    let y = m.side === 'me' ? base.y : 100 - base.y;
    const line = pitchLineOf(m.slot);
    const dir = m.side === 'me' ? -1 : 1;
    if (hasBall) {
      y += dir * PUSH[line];
      if (line === 'keeper') y = m.side === 'me' ? Math.max(y, 68) : Math.min(y, 32);
      else y = m.side === 'me' ? Math.max(y, 7) : Math.min(y, 93);
    } else {
      y -= dir * BACK[line];
      x = 50 + (x - 50) * 0.86;
    }
    if (ballX !== null && line !== 'keeper' && Math.abs(m.slot.x - 50) >= 22) x += (ballX - x) * 0.18;
    const k = (offset + i) * 2;
    x += drift[k] ?? 0;
    y += drift[k + 1] ?? 0;
    return { ...m, x: clampPct(x), y: clampPct(y) };
  });
}

/** Who has the ball this beat: the side by the share of the ball, the man by his line, never the same man twice running. */
function pickCarrier(men: { mine: Man[]; theirs: Man[] }, possMine: number, prev: Carrier | null): Carrier {
  let side: Side = Math.random() < possMine ? 'me' : 'opp';
  let list = side === 'me' ? men.mine : men.theirs;
  if (!list.length) { side = side === 'me' ? 'opp' : 'me'; list = side === 'me' ? men.mine : men.theirs; }
  if (!list.length) return { side: 'me', index: 0 };
  const weights = list.map((m, i) => (prev && prev.side === side && prev.index === i && list.length > 1 ? 0 : CARRY[pitchLineOf(m.slot)]));
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < list.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return { side, index: i };
  }
  return { side, index: list.length - 1 };
}

function fitnessTone(f: number): string {
  if (f >= 78) return 'text-emerald-400';
  if (f >= 62) return 'text-yellow-400';
  return 'text-destructive';
}

/** One stat, mine left and theirs right, the way every stats block on this game reads. */
function StatCell({ label, mine, theirs }: { label: string; mine: string; theirs: string }) {
  return (
    <div className="flex items-center justify-between gap-1 text-[10px] min-w-0">
      <span className="font-bold text-foreground tabular-nums shrink-0">{mine}</span>
      <span className="text-[8px] uppercase tracking-wider text-muted-foreground truncate">{label}</span>
      <span className="font-bold text-muted-foreground tabular-nums shrink-0">{theirs}</span>
    </div>
  );
}

/**
 * The live stats strip: possession both ways, shots (on target), expected
 * goals, corners and fouls, counted off the committed play at this minute.
 * Three short rows, so a 390 wide phone never scrolls sideways.
 */
function LiveStats({ stats, clubName, opponent }: { stats: MatchStats | null; clubName: string; opponent: string }) {
  const poss = stats ? Math.round(stats.possession) : 50;
  return (
    <div className="bg-card border border-border rounded-xl p-2.5" data-cm-live-stats="1">
      <div className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
        <span className="text-primary normal-case font-bold truncate">{clubName}</span>
        <span className="shrink-0">Balance of play</span>
        <span className="normal-case font-bold truncate">{opponent}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-primary tabular-nums w-8 shrink-0" data-cm-live-poss="mine">{poss}%</span>
        <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-secondary">
          <div className="bg-primary" style={{ width: `${poss}%`, transition: 'width 0.8s' }} />
          <div className="bg-muted-foreground/40" style={{ width: `${100 - poss}%` }} />
        </div>
        <span className="text-[10px] font-bold text-muted-foreground tabular-nums w-8 shrink-0 text-right" data-cm-live-poss="theirs">{100 - poss}%</span>
      </div>
      <div className="mt-1.5">
        <StatCell
          label="Shots (on target)"
          mine={stats ? `${stats.shots} (${stats.onTarget})` : '-'}
          theirs={stats ? `${stats.oppShots} (${stats.oppOnTarget})` : '-'}
        />
      </div>
      <div className="grid grid-cols-3 gap-x-3 mt-1">
        <StatCell label="xG" mine={stats ? stats.xg.toFixed(2) : '-'} theirs={stats ? stats.oppXg.toFixed(2) : '-'} />
        <StatCell label="Corners" mine={stats ? String(stats.corners) : '-'} theirs={stats ? String(stats.oppCorners) : '-'} />
        <StatCell label="Fouls" mine={stats ? String(stats.fouls) : '-'} theirs={stats ? String(stats.oppFouls) : '-'} />
      </div>
    </div>
  );
}

export function LiveSimScreen({
  career, live, report, clubColor, onSub, onShape, onTalk, onSecondHalf, onExit, onStartSecondHalf, onChange, onMark,
}: LiveSimScreenProps) {
  /* The clock and the stage come off the save, so a match closed at the 30th
     minute opens again at the 30th. No randomness in here. */
  const [stage, setStage] = useState<Stage>(() => initialStage(live, report));
  const [clock, setClock] = useState<number>(() => (report ? 90 : live?.minute ?? 0));
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(2);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showSquad, setShowSquad] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [eventLine, setEventLine] = useState<Seg[] | null>(null);
  const [eventBall, setEventBall] = useState<{ x: number; y: number } | null>(null);
  const [beat, setBeat] = useState<Beat>(() => ({ n: 0, carrier: { side: 'me', index: 9 }, drift: [] }));
  const [picking, setPicking] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedRef = useRef(false);
  const pausedBefore = useRef(false);
  const holdRef = useRef(0);
  const ballRef = useRef({ x: 50, y: 50 });
  const carrierRef = useRef<Carrier | null>(null);
  /* The whistle takes the live match off the save in the same tick the report
     lands, so the last one seen keeps the pitch drawn at 90 until then. */
  const lastLive = useRef<LiveMatch | null>(live);
  useEffect(() => { if (live) lastLive.current = live; }, [live]);
  const liveNow = live ?? lastLive.current;

  const minute = stage === 'done' ? 90 : stage === 'interval' ? 45 : Math.min(90, Math.floor(clock));
  const mentality: Mentality = liveNow?.mentality ?? career.mentality;
  const opponent = liveNow?.opponent ?? (report ? (report.home === career.clubName ? report.away : report.home) : '');
  const compLabel = liveNow?.compLabel ?? report?.compLabel ?? '';
  const finalMy = report ? (report.home === career.clubName ? report.homeGoals : report.awayGoals) : null;
  const finalOpp = report ? (report.home === career.clubName ? report.awayGoals : report.homeGoals) : null;
  const running = stage === 'first' || stage === 'second';
  const canChange = running && !finished && !!liveNow;

  /* ---- the truth this walk goes through ---- */
  const feed: LiveFeedEvent[] = useMemo(() => (liveNow ? liveFeed(liveNow) : []), [liveNow]);

  /* Round 505: the feed carries a name and a minute per event, so the flank
     of a corner, a saved penalty, and a goal from the spot or a direct free
     kick are read back off the committed play and the goal lines the feed
     was built from, keyed the way the feed keys them. */
  type Extra = { flank?: 'left' | 'right'; penalty?: boolean; freeKick?: boolean };
  const extras = useMemo(() => {
    const m = new Map<string, Extra>();
    if (!liveNow) return m;
    for (const e of [...(liveNow.h1Play ?? []), ...(liveNow.h2Play ?? [])]) {
      if (e.kind === 'corner' && e.flank) m.set(`corner:${e.side}:${e.minute}:${e.who}`, { flank: e.flank });
      else if (e.kind === 'shot' && e.on && !e.goal && e.penalty) m.set(`save:${e.side}:${e.minute}:${e.who}`, { penalty: true });
    }
    for (const g of [...(liveNow.h1My ?? []), ...(liveNow.h2My ?? [])]) {
      if (g.penalty || g.freeKick) m.set(`goal:me:${g.minute}:${g.name}`, { penalty: g.penalty, freeKick: g.freeKick });
    }
    for (const g of [...(liveNow.h1Opp ?? []), ...(liveNow.h2Opp ?? [])]) {
      if (g.penalty || g.freeKick) m.set(`goal:opp:${g.minute}:${g.name}`, { penalty: g.penalty, freeKick: g.freeKick });
    }
    return m;
  }, [liveNow]);
  /* Round 505: the armband, worn on the dot while he is out there. */
  const captainId = career.setPieces?.captain ?? null;

  /* A save paused at the interval before the scorer lines existed: the honest
     fallback is skipping the first half's animation for that one match. */
  const canAnimateH1 = !!liveNow && liveNow.h1My !== undefined && liveNow.h1Opp !== undefined;
  useEffect(() => {
    if (stage === 'first' && !canAnimateH1) setClock(45);
  }, [stage, canAnimateH1]);

  /* ---- score on the clock ---- */
  const goalsAt = (side: Side, m: number) => feed.filter(e => e.kind === 'goal' && e.side === side && e.minute <= m).length;
  const myGoalsNow = stage === 'done' && finalMy !== null ? finalMy : goalsAt('me', stage === 'interval' ? 45 : clock);
  const oppGoalsNow = stage === 'done' && finalOpp !== null ? finalOpp : goalsAt('opp', stage === 'interval' ? 45 : clock);

  /* ---- stats at this minute, the report's own function ---- */
  const stats: MatchStats | null = useMemo(() => {
    if (stage === 'done' && report?.detail) return report.detail.stats;
    if (liveNow) return liveStatsAt(liveNow, minute);
    return report?.detail?.stats ?? null;
  }, [stage, report, liveNow, minute]);
  const possMine = (stats?.possession ?? 50) / 100;

  /* ---- the clock: BASE_RATE sim minutes per real second, times speed ---- */
  useEffect(() => {
    if (paused || !running || finished) { lastTs.current = null; return; }
    const cap = stage === 'first' ? 45 : 90;
    const step = (ts: number) => {
      if (lastTs.current === null) lastTs.current = ts;
      const dt = Math.min(0.25, (ts - lastTs.current) / 1000);
      lastTs.current = ts;
      setClock(c => Math.min(cap, c + dt * BASE_RATE * speed));
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [paused, running, finished, stage, speed]);

  /* Stage transitions off the clock. The whistle is called exactly once. */
  useEffect(() => {
    if (stage === 'first' && clock >= 45) {
      setClock(45);
      setStage('interval');
      setPicking(null);
      setEventLine(null);
      /* The save stands at the break now, so a reload opens the dressing room. */
      onMark(45);
    }
    if (stage === 'second' && clock >= 90 && !finishedRef.current) {
      finishedRef.current = true;
      setFinished(true);
      setClock(90);
      setPicking(null);
      onSecondHalf();
    }
  }, [clock, stage, onSecondHalf, onMark]);

  /* Where the clock stands goes to the save when the page is hidden or
     leaves (a tab switch, the app going to the background, a reload), never
     on a tick: every career write is a localStorage write. The ref keeps the
     listener off the clock's own dependency list. */
  const clockRef = useRef(clock);
  useEffect(() => { clockRef.current = clock; }, [clock]);
  useEffect(() => {
    if (!running || finished || !live) return;
    const mark = () => onMark(Math.floor(clockRef.current));
    const onVisibility = () => { if (document.visibilityState === 'hidden') mark(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', mark);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', mark);
    };
  }, [running, finished, live, onMark]);

  /* Round 543: the listeners above only fire when the DOCUMENT goes away, and
     a router navigation is not that. Tapping Back, or the DoUKnowBall logo, or
     any nav link unmounts this viewer with the document still very much alive,
     so the minute was thrown away and "Resume match" replayed the half from
     minute 1. A player reported it as the watch mode needing fixing.

     It has to be its own effect with an empty dependency list, because the
     cleanup of the effect above runs on every change of running, finished,
     live or onMark, and marking the clock there would write the career on
     every one of them. Everything this cleanup reads goes through a ref for
     the same reason. */
  const runningRef = useRef(running);
  const liveRef = useRef(live);
  const onMarkRef = useRef(onMark);
  useEffect(() => {
    runningRef.current = running;
    liveRef.current = live;
    onMarkRef.current = onMark;
  });
  useEffect(() => () => {
    if (runningRef.current && !finishedRef.current && liveRef.current) {
      onMarkRef.current(Math.floor(clockRef.current));
    }
  }, []);

  /* The report is the match settled: full time, whatever the clock says. */
  useEffect(() => {
    if (report && stage !== 'done') {
      setStage('done');
      setClock(90);
      setPicking(null);
      setEventLine(null);
    }
  }, [report, stage]);

  /* A change at minute M redraws everything after M, so anything fired past
     it is forgotten and the redrawn half fires fresh. */
  const firedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!live) return;
    const m = live.minute ?? 0;
    for (const k of [...firedRef.current]) {
      const at = Number(k.split(':')[2]);
      if (Number.isFinite(at) && at > m) firedRef.current.delete(k);
    }
  }, [live]);

  /* ---- who is on the grass at this minute ---- */
  const men = useMemo(() => menAt(career, liveNow, report, minute), [career, liveNow, report, minute]);
  const menRef = useRef(men);
  useEffect(() => { menRef.current = men; }, [men]);
  const possRef = useRef(possMine);
  useEffect(() => { possRef.current = possMine; }, [possMine]);

  /* The keeper of a side at a minute, for the save line. */
  const keeperOf = (side: Side, m: number): Seg => {
    if (!liveNow) return { t: side === 'me' ? `${career.clubName} keeper` : `${opponent} keeper` };
    if (side === 'me') {
      const ids = myOnPitchAt(liveNow, m);
      const ps = ids.map(id => career.squad.find(p => p.id === id)).filter((p): p is CMPlayer => !!p);
      const gk = ps.find(p => p.position === 'GK') ?? ps[0];
      return { t: gk ? gk.name : `${career.clubName} keeper` };
    }
    const on = oppOnPitchAt(liveNow, m);
    const gk = on.find(p => p.p === 'GK') ?? on[0];
    return gk ? { t: gk.n, gen: gk.g } : { t: `${opponent} keeper` };
  };
  /* The feed carries names only, so a made up man in their eleven or on
     their bench is looked up here. Nobody real ever gets the tag: it is
     only ever true on a line the engine wrote as made up. */
  const oppGen = (name: string): boolean => !!liveNow
    && [...(liveNow.oppXi ?? []), ...(liveNow.oppBench ?? [])].some(p => p.n === name && !!p.g);
  /* One name as a segment, tagged when it is the other side's made up man. */
  const named = (side: Side, name: string): Seg => (side === 'opp' && oppGen(name) ? { t: name, gen: true } : { t: name });

  /* ---- banners and the event line, off the committed feed ---- */
  useEffect(() => {
    if (!running || finished) return;
    const lo = stage === 'first' ? 0 : 46;
    const hi = stage === 'first' ? 45 : 90;
    let big: Banner | null = null;
    let small: Seg[] | null = null;
    let ballAt: { x: number; y: number } | null = null;
    for (const e of feed) {
      if (e.kind === 'halftime' || e.minute < lo || e.minute > hi || e.minute > clock) continue;
      const key = `${e.kind}:${e.side}:${e.minute}:${e.text}`;
      if (firedRef.current.has(key)) continue;
      firedRef.current.add(key);
      const club = e.side === 'me' ? career.clubName : opponent;
      const side: Side = e.side === 'me' ? 'me' : 'opp';
      const who: Seg = e.text ? named(side, e.text) : { t: club };
      const m = Math.round(e.minute);
      /* Round 505 review: the event's own flank and spot flags first. Two
         corners can share kind, side, minute and taker with different
         flanks, and the keyed lookup below cannot tell them apart; it stays
         only as the fallback for a feed line that carries none of them. */
      const x: Extra | undefined = e.flank || e.penalty || e.freeKick
        ? { flank: e.flank, penalty: e.penalty, freeKick: e.freeKick }
        : extras.get(`${e.kind}:${e.side}:${e.minute}:${e.text}`);
      switch (e.kind) {
        case 'goal':
          big = {
            segs: [{ t: x?.penalty ? 'GOAL! Penalty, ' : x?.freeKick ? 'GOAL! Free kick, ' : 'GOAL! ' }, who, { t: ` ${m}'` }],
            club,
            tone: e.side === 'me' ? 'me' : 'opp',
          };
          ballAt = { x: 50, y: e.side === 'me' ? 1.5 : 98.5 };
          break;
        case 'yellow': big = { segs: [{ t: 'Booked: ' }, who, { t: ` ${m}'` }], club, tone: 'none' }; break;
        case 'red': big = { segs: [{ t: 'RED CARD! ' }, who, { t: ` ${m}'` }], club, tone: 'none' }; break;
        case 'injury': big = { segs: [{ t: 'Injury: ' }, who, { t: ` ${m}'` }], club, tone: 'none' }; break;
        case 'sub': {
          /* The feed writes a sub as "X on for Y"; each name is tagged on its own. */
          const at = e.text.indexOf(' on for ');
          big = at > 0
            ? { segs: [{ t: 'Sub: ' }, named(side, e.text.slice(0, at)), { t: ' on for ' }, named(side, e.text.slice(at + 8))], club, tone: 'none' }
            : { segs: [{ t: `Sub: ${e.text}` }], club, tone: 'none' };
          break;
        }
        case 'shot':
          small = [{ t: 'Shot: ' }, who];
          ballAt = { x: 38 + (m % 5) * 6, y: e.side === 'me' ? 6 : 94 };
          break;
        case 'save':
          small = [{ t: x?.penalty ? 'Penalty saved! ' : 'Save! ' }, keeperOf(e.side === 'me' ? 'opp' : 'me', e.minute)];
          ballAt = { x: 50, y: e.side === 'me' ? 9.5 : 90.5 };
          break;
        case 'corner':
          /* Round 505: the flank and the taker, "Corner, left, Saka"; the club when nobody is named. */
          small = [{ t: x?.flank ? `Corner, ${x.flank}, ` : 'Corner, ' }, who];
          ballAt = { x: x?.flank ? (x.flank === 'left' ? 2.5 : 97.5) : (ballRef.current.x < 50 ? 2.5 : 97.5), y: e.side === 'me' ? 2.5 : 97.5 };
          break;
        case 'throwin':
          small = [{ t: `Throw in, ${club}` }];
          ballAt = { x: ballRef.current.x < 50 ? 2 : 98, y: Math.max(6, Math.min(94, ballRef.current.y)) };
          break;
        case 'foul': small = [{ t: 'Foul by ' }, who]; break;
        default: break;
      }
    }
    if (big) {
      setBanner(big);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      bannerTimer.current = setTimeout(() => setBanner(null), 2600);
    }
    if (small) setEventLine(small);
    if (ballAt) {
      setEventBall(ballAt);
      holdRef.current = 2;
    }
    // The feed, its extras and the clock are the inputs; the rest are stable per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock, stage, feed, extras, running, finished]);
  useEffect(() => () => { if (bannerTimer.current) clearTimeout(bannerTimer.current); }, []);

  /* ---- the beat: who has the ball, and the drift. The only place this file draws. ---- */
  useEffect(() => {
    if (paused || !running || finished) return;
    const tick = () => {
      const drift = Array.from({ length: 44 }, () => (Math.random() - 0.5) * 5);
      const carrier = pickCarrier(menRef.current, possRef.current, carrierRef.current);
      carrierRef.current = carrier;
      setBeat(b => ({ n: b.n + 1, carrier, drift }));
      if (holdRef.current > 0) {
        holdRef.current -= 1;
        if (holdRef.current === 0) setEventBall(null);
      }
    };
    const id = setInterval(tick, Math.max(240, 760 / speed));
    return () => clearInterval(id);
  }, [paused, running, finished, speed]);

  /* ---- the dots and the ball, placed for this beat ---- */
  const scene = useMemo(() => {
    const mineHasIt = beat.carrier.side === 'me';
    const first = {
      mine: placeSide(men.mine, mineHasIt, mentality, beat.drift, 0, null),
      theirs: placeSide(men.theirs, !mineHasIt, mentality, beat.drift, 11, null),
    };
    const holderOf = (s: { mine: Placed[]; theirs: Placed[] }): Placed | null => {
      const list = mineHasIt ? s.mine : s.theirs;
      return list.length ? list[beat.carrier.index % list.length] : null;
    };
    const ballFrom = (h: Placed | null) => (h
      ? { x: clampPct(h.x + 1.6), y: clampPct(h.y + (mineHasIt ? -2.2 : 2.2)) }
      : { x: 50, y: 50 });
    const lean = eventBall ?? ballFrom(holderOf(first));
    const mine = placeSide(men.mine, mineHasIt, mentality, beat.drift, 0, lean.x);
    const theirs = placeSide(men.theirs, !mineHasIt, mentality, beat.drift, 11, lean.x);
    const holder = holderOf({ mine, theirs });
    const ball = eventBall ?? ballFrom(holder);
    return { mine, theirs, ball, holderKey: holder?.key ?? null };
  }, [men, beat, eventBall, mentality]);
  useEffect(() => { ballRef.current = scene.ball; }, [scene.ball]);

  /* ---- the change sheet: tap one of your dots ---- */
  const sheetRef = useRevealScroll<HTMLDivElement>(`pick:${picking ?? ''}`, { skipFirst: true });
  const closeSheet = () => {
    setPicking(null);
    setPaused(pausedBefore.current);
  };
  const openSheet = (id: string) => {
    if (!canChange) return;
    if (picking === id) { closeSheet(); return; }
    if (picking === null) { pausedBefore.current = paused; setPaused(true); }
    setPicking(id);
  };
  const changeMinute = Math.min(90, Math.floor(clock));
  /* The sheet holds the clock, and the pause button is locked under it, so
     the only way the picked man leaves the grass with it open is a skip or
     a redraw. Either way the sheet closes rather than offering a change the
     engine will refuse. A man down injured and not yet replaced is still
     his to change, so he stays. */
  useEffect(() => {
    if (!picking) return;
    if (!running || !liveNow) { closeSheet(); return; }
    /* Round 548: same inclusive read as the pitch above, so the action sheet for
       a man you have just taken off closes instead of hanging over a dot that
       is no longer his. */
    const on = new Set(myOnPitchAt(liveNow, minute + 1));
    const gone = liveGoneIds(liveNow, minute);
    for (const inj of [...(liveNow.h1Injuries ?? []), ...(liveNow.h2Injuries ?? [])]) {
      if (inj.id && inj.minute <= minute && on.has(inj.id)) gone.delete(inj.id);
    }
    if (!on.has(picking) || gone.has(picking)) closeSheet();
    // closeSheet is stable per render; the inputs are the pick, the stage, the match and the minute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picking, running, liveNow, minute]);
  const doSub = (inId: string) => {
    if (!picking || !liveNow) return;
    onChange(changeMinute, { kind: 'sub', outId: picking, inId });
    closeSheet();
  };
  const doShape = (m: Mentality) => {
    if (!liveNow) return;
    onChange(changeMinute, { kind: 'shape', mentality: m });
  };
  const subsLeft = liveNow ? Math.max(0, MAX_SUBS - liveNow.subsUsed) : 0;
  const picked = picking ? career.squad.find(p => p.id === picking) ?? null : null;
  const sheetOpen = !!(picking && picked && canChange);
  /* Round 505: ordered for the man coming off, same position first. */
  const bench: CMPlayer[] = useMemo(() => {
    if (!liveNow || !career.live) return [];
    const usedUp = new Set<string>();
    for (const s of liveNow.subs ?? []) if (s.offId) usedUp.add(s.offId);
    for (const inj of [...(liveNow.h1Injuries ?? []), ...(liveNow.h2Injuries ?? [])]) if (inj.id) usedUp.add(inj.id);
    return benchFor(career, picking ?? undefined).filter(p => !usedUp.has(p.id));
  }, [career, liveNow, picking]);

  /* Somebody down and not yet replaced comes off the grass (that is what an
     injury is) and gets a line under the pitch instead, so the change is one
     tap away rather than lost with his dot. */
  const injuredWaiting: CMPlayer[] = useMemo(() => {
    if (!liveNow || !running) return [];
    const on = new Set(myOnPitchAt(liveNow, minute));
    const reds = new Set<string>();
    for (const c of [...(liveNow.h1Cards ?? []), ...(liveNow.h2Cards ?? [])]) if (c.kind === 'red' && c.id && c.minute <= minute) reds.add(c.id);
    const out: CMPlayer[] = [];
    for (const inj of [...(liveNow.h1Injuries ?? []), ...(liveNow.h2Injuries ?? [])]) {
      if (!inj.id || inj.minute > minute || !on.has(inj.id) || reds.has(inj.id)) continue;
      const p = career.squad.find(q => q.id === inj.id);
      if (p) out.push(p);
    }
    return out;
  }, [liveNow, running, minute, career]);

  /* ---- the interval: the real dressing room, embedded ---- */
  const startSecond = () => {
    onStartSecondHalf();
    setStage('second');
    setClock(46);
    setPaused(false);
    setPicking(null);
    setEventLine(null);
  };

  if (!live && !report) return null;

  if (stage === 'interval' && career.live) {
    return (
      <div className="max-w-md mx-auto space-y-3" data-cm-live-stage="interval">
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{compLabel} · Half time</div>
          <div className="text-2xl font-display font-bold text-foreground tabular-nums mt-1">
            {myGoalsNow} - {oppGoalsNow}
          </div>
          <div className="text-[10px] text-muted-foreground">{career.clubName} vs {opponent}</div>
        </div>
        <LiveStats stats={stats} clubName={career.clubName} opponent={opponent} />
        <HalftimeScreen
          career={career}
          onSub={onSub}
          onShape={onShape}
          onTalk={onTalk}
          onSecondHalf={startSecond}
        />
      </div>
    );
  }

  const onPitchPlayers = scene.mine
    .map(d => (d.id ? career.squad.find(p => p.id === d.id) : undefined))
    .filter((p): p is CMPlayer => !!p)
    .sort((a, b) => a.fitness - b.fitness);

  const badge = stage === 'done'
    ? (report?.detail?.added ? `FT 90+${report.detail.added.h2}'` : 'FT')
    : finished ? 'Full time' : `LIVE ${minute}'`;

  return (
    <div className="max-w-md mx-auto space-y-2.5" data-cm-live-stage={stage} data-cm-live-minute={minute}>
      {/* Scoreboard */}
      <div className="bg-card border border-border rounded-2xl p-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">{compLabel}</div>
          <div className={cn(
            'text-[10px] font-bold px-2 py-0.5 rounded-full',
            stage === 'done' || finished ? 'bg-secondary text-muted-foreground' : 'bg-red-500/15 text-red-400',
          )}>
            {/* Round 472: the whistle went after the board went up, so the
                badge says when. The number is the report's own. */}
            {badge}
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 mt-1">
          <div className="flex-1 text-right text-sm font-bold text-primary truncate">{career.clubName}</div>
          <div className="px-3 py-1 rounded-xl bg-secondary font-display text-xl font-bold text-foreground shrink-0 tabular-nums">
            {myGoalsNow} - {oppGoalsNow}
          </div>
          <div className="flex-1 text-left text-sm font-bold text-foreground truncate">{opponent}</div>
        </div>
        {/* The small stuff: chances, saves, corners, throw ins, fouls, at their minutes. */}
        <div className="min-h-[14px] mt-1 text-center text-[10px] text-muted-foreground truncate" data-cm-live-event="1">
          {running && !finished && eventLine ? eventLine.map((sg, i) => (
            <span key={i}>{sg.t}{sg.gen && <MadeUpTag className="ml-1" />}</span>
          )) : ''}
        </div>
      </div>

      {/* The pitch */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-border select-none" style={{ aspectRatio: '3 / 4', background: 'linear-gradient(180deg, #14532d 0%, #166534 50%, #14532d 100%)' }}>
        {/* markings */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/25" />
        <div className="absolute left-1/2 top-1/2 w-16 h-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
        <div className="absolute left-1/4 right-1/4 top-0 h-10 border-b border-x border-white/25" />
        <div className="absolute left-1/4 right-1/4 bottom-0 h-10 border-t border-x border-white/25" />
        <div className="absolute left-[38%] right-[38%] top-0 h-1 bg-white/60" />
        <div className="absolute left-[38%] right-[38%] bottom-0 h-1 bg-white/60" />

        {/* their dots: numbers, and names when the engine has an eleven for them */}
        {scene.theirs.map(d => (
          <div
            key={d.key}
            data-cm-dot-opp={d.number}
            className="absolute flex flex-col items-center pointer-events-none"
            style={{ left: `${d.x}%`, top: `${d.y}%`, transform: 'translate(-50%, -5px)', transition: 'left 0.7s linear, top 0.7s linear' }}
          >
            <span className="w-2.5 h-2.5 rounded-full border border-white/70" style={{ backgroundColor: '#111827' }} />
            <span className="text-[7px] text-white/80 leading-none mt-0.5 max-w-[48px] truncate tabular-nums">
              {d.number}{d.label ? ` ${d.label}` : ''}{d.gen ? '*' : ''}
            </span>
          </div>
        ))}

        {/* my dots: a tap area a thumb can hit around a dot that stays small */}
        {scene.mine.map(d => (
          <button
            key={d.key}
            type="button"
            data-cm-dot={d.id ?? ''}
            data-cm-captain={d.id && d.id === captainId ? '1' : undefined}
            aria-label={`${d.label}, number ${d.number}${d.id && d.id === captainId ? ', captain' : ''}. Tap to bring somebody on or change the shape.`}
            disabled={!canChange || !d.id}
            onClick={() => { if (d.id) openSheet(d.id); }}
            className={cn(
              'absolute flex flex-col items-center w-9 min-h-[28px] bg-transparent border-0 p-0 rounded-md',
              canChange ? 'cursor-pointer' : 'cursor-default',
            )}
            style={{ left: `${d.x}%`, top: `${d.y}%`, transform: 'translate(-50%, -5px)', transition: 'left 0.7s linear, top 0.7s linear' }}
          >
            <span
              className={cn('w-2.5 h-2.5 rounded-full border border-black/30', picking === d.id && 'ring-2 ring-white')}
              style={{ backgroundColor: clubColor }}
            />
            <span className="text-[7px] text-white/90 leading-none mt-0.5 max-w-[48px] truncate tabular-nums">
              {d.number} {d.label}
              {d.id && d.id === captainId && (
                <span className="ml-0.5 inline-block px-[2px] rounded-sm bg-yellow-400 text-black font-black leading-[8px] align-middle">C</span>
              )}
            </span>
          </button>
        ))}

        {/* ball, at somebody's feet */}
        <div
          className="absolute w-1.5 h-1.5 rounded-full bg-white shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
          style={{ left: `${scene.ball.x}%`, top: `${scene.ball.y}%`, transition: 'left 0.55s ease-in-out, top 0.55s ease-in-out' }}
        />

        {/* event banner */}
        {banner && (
          <div className={cn(
            'absolute left-1/2 top-3 -translate-x-1/2 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-lg animate-in fade-in slide-in-from-top-2 pointer-events-none text-center max-w-[92%]',
            banner.tone === 'me' ? 'bg-emerald-500 text-black' : banner.tone === 'opp' ? 'bg-red-500 text-black' : 'bg-background/90 text-foreground border border-border',
          )}>
            <div className="truncate">
              {banner.segs.map((sg, i) => (
                <span key={i}>{sg.t}{sg.gen && <MadeUpTag className="ml-1" />}</span>
              ))}
            </div>
            <div className={cn('text-[8px] font-normal leading-none truncate', banner.tone === 'none' ? 'text-muted-foreground' : 'text-black/70')}>{banner.club}</div>
          </div>
        )}

        {stage === 'done' && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-white font-display font-bold text-2xl">FULL TIME</div>
              {report?.decidedBy === 'pens' && (
                <div className="text-white/90 text-xs mt-1">Decided on penalties</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* The asterisk on a dot is the ratings sheet's MADE UP, at dot size. */}
      {scene.theirs.some(d => d.gen) && (
        <p className="text-[9px] text-muted-foreground text-center flex items-center justify-center gap-1">
          * on a dot is <MadeUpTag />
        </p>
      )}

      {injuredWaiting.map(p => (
        subsLeft > 0 ? (
          <button
            key={p.id}
            onClick={() => openSheet(p.id)}
            className="w-full min-h-[44px] rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-[11px] font-bold text-yellow-400 text-center"
          >
            🩹 {p.name} is down. Tap to bring somebody on.
          </button>
        ) : (
          <p key={p.id} className="text-[10px] text-yellow-400 text-center">🩹 {p.name} is down and you have no changes left.</p>
        )
      ))}

      {/* the live stats, the report's own numbers counted up to this minute.
          Round 472: with the other club's name on it rather than "Them". */}
      <LiveStats stats={stats} clubName={career.clubName} opponent={opponent} />

      {/* controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setPaused(p => !p)}
          disabled={stage === 'done' || finished || sheetOpen}
          aria-label={paused ? 'Resume' : 'Pause'}
          className="min-h-[44px] rounded-lg border border-border bg-card px-2.5 text-foreground hover:border-primary/60 transition-colors disabled:opacity-40"
        >
          {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
        {SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={cn(
              'flex-1 min-h-[44px] rounded-lg border px-1 text-[11px] font-bold transition-colors',
              speed === s ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:border-primary/50',
            )}
          >
            {s}x
          </button>
        ))}
        <button
          onClick={() => setShowSquad(v => !v)}
          aria-label="Squad and stamina"
          className={cn(
            'min-h-[44px] rounded-lg border px-2.5 transition-colors',
            showSquad ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:border-primary/60',
          )}
        >
          <Users className="w-3.5 h-3.5" />
        </button>
        {stage === 'done' ? (
          <button
            onClick={onExit}
            className="min-h-[44px] rounded-lg bg-primary text-primary-foreground px-3 text-[11px] font-bold hover:opacity-90 transition-opacity"
          >
            Full report
          </button>
        ) : finished ? null : (
          <button
            onClick={() => setClock(stage === 'first' ? 45 : 90)}
            className="min-h-[44px] rounded-lg border border-border bg-card px-2.5 text-[11px] font-bold text-foreground hover:border-primary/60 transition-colors inline-flex items-center gap-1"
          >
            <FastForward className="w-3.5 h-3.5" /> Skip
          </button>
        )}
      </div>

      {/* the change sheet: a sub or a shape, at this minute */}
      {sheetOpen && picked && (
        <div ref={sheetRef} className="bg-card border border-border rounded-xl p-3" data-cm-live-sheet={picking ?? ''}>
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <ArrowLeftRight className="w-3 h-3" /> Change at {changeMinute}' · Subs left: {subsLeft}
            </div>
            <button
              onClick={closeSheet}
              aria-label="Close"
              className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-2 py-1.5">
            <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">
              {picked.position}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-xs text-foreground truncate">{picked.name}</span>
              <span className="block text-[9px] text-muted-foreground">
                {picked.rating} rated {'·'} <span className={fitnessTone(picked.fitness)}>{Math.round(picked.fitness)} fit</span>
              </span>
            </span>
          </div>

          <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-2 mb-1 flex items-center gap-1">
            <Gauge className="w-3 h-3" /> Shape from here
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MENTALITIES.map(m => (
              <button
                key={m.id}
                data-cm-live-shape={m.id}
                onClick={() => doShape(m.id)}
                className={cn(
                  'min-h-[44px] rounded-lg border px-1 text-center transition-colors',
                  mentality === m.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
                )}
              >
                <span className="block text-sm leading-none">{m.emoji}</span>
                <span className={cn('block text-[10px] font-bold mt-0.5', mentality === m.id ? 'text-primary' : 'text-foreground')}>{m.label}</span>
              </button>
            ))}
          </div>

          <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-2 mb-1">Bring on for {lastName(picked.name)}</div>
          {subsLeft === 0 ? (
            <p className="text-[10px] text-yellow-400">You have used all three. Nobody else is coming off.</p>
          ) : bench.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">Nobody fit is left on the bench.</p>
          ) : (
            <div className="space-y-0.5 max-h-56 overflow-y-auto">
              {bench.map(b => (
                <button
                  key={b.id}
                  data-cm-live-bench={b.id}
                  onClick={() => doSub(b.id)}
                  className="w-full min-h-[44px] flex items-center gap-2 rounded-lg border border-border hover:border-primary/50 px-2 py-1.5 text-left transition-colors"
                >
                  <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">
                    {b.position}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs text-foreground truncate">{b.name}</span>
                    <span className="block text-[9px] text-muted-foreground">
                      {b.rating} rated {'·'} <span className={fitnessTone(b.fitness)}>{Math.round(b.fitness)} fit</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* stamina drawer */}
      {showSquad && (
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">On the pitch · fitness</div>
          <div className="space-y-1">
            {onPitchPlayers.map(p => (
              <div key={p.id} className="flex items-center gap-2 text-[10px]">
                <span className="w-7 shrink-0 text-muted-foreground">{p.position}</span>
                <span className="text-foreground truncate flex-1">{p.name}</span>
                <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden shrink-0">
                  <div
                    className={cn('h-full rounded-full', p.fitness >= 70 ? 'bg-emerald-500' : p.fitness >= 45 ? 'bg-yellow-500' : 'bg-red-500')}
                    style={{ width: `${p.fitness}%` }}
                  />
                </div>
                <span className="w-6 text-right tabular-nums text-muted-foreground shrink-0">{Math.round(p.fitness)}</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground mt-1.5">Tap a player on the pitch to make a change at any minute.</p>
        </div>
      )}
    </div>
  );
}

export default LiveSimScreen;
