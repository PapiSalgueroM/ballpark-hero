import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Pause, Play, FastForward, Users } from 'lucide-react';
import {
  FORMATIONS, slotPosition, resolveXI,
} from '@/lib/clubManager';
import type { CareerState, CMPlayer, LiveMatch, MatchWeekReport, TimelineEvent, Mentality, TalkTone } from '@/lib/clubManager';
import { HalftimeScreen } from '@/components/club-manager/HalftimeScreen';

/**
 * Round 158: the Live Sim. His words, the ones he said to really pay
 * attention to: "both sides with each of their formations start and then u
 * see the little circles moving about... people can choose the speed of
 * that... there should be stats counter there with gx and also momentum
 * graph... as manger u can see ur players and make subs and see their
 * stamina".
 *
 * What it is: a 2D replay of the same match the engine already decided,
 * never a second simulation. The first half plays off the scorer lines the
 * engine committed at kick off (Round 158 put them on LiveMatch), the break
 * is the real dressing room (the Round 119 halftime screen, embedded, so
 * subs, shape and the talk all genuinely change the second half), and the
 * second half replays the full time report's own timeline: goals, cards,
 * injuries, subs, at their true minutes. The choreography between events
 * (dots drifting, the ball moving between players, throw in beats) is
 * theatre, and the score, the scorers and every event minute are the sim's
 * own. The screen never lies about the sim; it is allowed to dance around
 * it.
 */

type Stage = 'first' | 'interval' | 'second' | 'done';

interface Dot { key: string; x: number; y: number; mine: boolean; label: string; }

interface LiveSimScreenProps {
  career: CareerState;
  live: LiveMatch | null;
  report: MatchWeekReport | null;
  clubColor: string;
  onSub: (outId: string, inId: string) => void;
  onShape: (m: Mentality) => void;
  onTalk: (tone: TalkTone | null) => void;
  onSecondHalf: () => void;
  onExit: () => void;
}

const SPEEDS = [0.5, 1, 2, 4] as const;
/** Sim minutes per real second at 1x. 0.5 makes a match about three minutes. */
const BASE_RATE = 0.5;

/** The generic mirrored shape the opposition lines up in (4-4-2). */
const OPP_SPOTS: { x: number; y: number }[] = [
  { x: 50, y: 8 },
  { x: 20, y: 24 }, { x: 40, y: 22 }, { x: 60, y: 22 }, { x: 80, y: 24 },
  { x: 18, y: 38 }, { x: 40, y: 36 }, { x: 60, y: 36 }, { x: 82, y: 38 },
  { x: 40, y: 48 }, { x: 60, y: 48 },
];

const lastName = (n: string) => n.replace(' (Youth)', '').split(' ').slice(-1)[0];

export function LiveSimScreen({
  career, live, report, clubColor, onSub, onShape, onTalk, onSecondHalf, onExit,
}: LiveSimScreenProps) {
  const [stage, setStage] = useState<Stage>('first');
  const [clock, setClock] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(2);
  const [paused, setPaused] = useState(false);
  const [showSquad, setShowSquad] = useState(false);
  const [banner, setBanner] = useState<{ text: string; tone: 'me' | 'opp' | 'none' } | null>(null);
  const [ball, setBall] = useState({ x: 50, y: 50 });
  const [phase, setPhase] = useState(0); // re-rolls the drift every beat
  const rafRef = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- the truth this replay walks through ---- */
  const h1Events: TimelineEvent[] = useMemo(() => {
    if (!live) return [];
    const evs: TimelineEvent[] = [];
    for (const sc of live.h1My ?? []) evs.push({ minute: sc.minute, side: 'me', kind: 'goal', text: sc.name });
    for (const sc of live.h1Opp ?? []) evs.push({ minute: sc.minute, side: 'opp', kind: 'goal', text: sc.name });
    return evs.sort((a, b) => a.minute - b.minute);
  }, [live]);

  const h2Events: TimelineEvent[] = useMemo(() => {
    if (!report?.detail) return [];
    return report.detail.timeline.filter(e =>
      e.minute >= 46 && (e.kind === 'goal' || e.kind === 'yellow' || e.kind === 'red' || e.kind === 'injury' || e.kind === 'sub'));
  }, [report]);

  /* A save from before kick off carried scorer lines (older paused save):
     the honest fallback is skipping the animation for that one match. */
  const canAnimateH1 = !!live && (live.h1My !== undefined && live.h1Opp !== undefined);
  useEffect(() => {
    if (stage === 'first' && !canAnimateH1) setClock(45);
  }, [stage, canAnimateH1]);

  /* ---- score on the replay clock ---- */
  const myGoalsNow = useMemo(() => {
    let g = h1Events.filter(e => e.side === 'me' && e.kind === 'goal' && e.minute <= clock).length;
    g += h2Events.filter(e => e.side === 'me' && e.kind === 'goal' && e.minute <= clock).length;
    return g;
  }, [h1Events, h2Events, clock]);
  const oppGoalsNow = useMemo(() => {
    let g = h1Events.filter(e => e.side === 'opp' && e.kind === 'goal' && e.minute <= clock).length;
    g += h2Events.filter(e => e.side === 'opp' && e.kind === 'goal' && e.minute <= clock).length;
    return g;
  }, [h1Events, h2Events, clock]);

  /* ---- the clock: BASE_RATE sim minutes per real second, times speed ---- */
  useEffect(() => {
    if (paused || stage === 'interval' || stage === 'done') { lastTs.current = null; return; }
    const step = (ts: number) => {
      if (lastTs.current === null) lastTs.current = ts;
      const dt = Math.min(0.25, (ts - lastTs.current) / 1000);
      lastTs.current = ts;
      setClock(c => c + dt * BASE_RATE * speed);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [paused, stage, speed]);

  /* Stage transitions off the clock. */
  useEffect(() => {
    if (stage === 'first' && clock >= 45) { setClock(45); setStage('interval'); }
    if (stage === 'second' && clock >= 90) { setClock(90); setStage('done'); }
  }, [clock, stage]);

  /* The parent resolves the second half during the interval; when the report
     lands, the replay resumes from the restart. */
  useEffect(() => {
    if (stage === 'interval' && report) { setStage('second'); setClock(46); }
  }, [report, stage]);

  /* ---- banners on true events ---- */
  const firedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const all = stage === 'first' ? h1Events : stage === 'second' ? h2Events : [];
    for (const e of all) {
      const key = `${e.kind}:${e.side}:${e.minute}:${e.text}`;
      if (e.minute <= clock && !firedRef.current.has(key)) {
        firedRef.current.add(key);
        const text =
          e.kind === 'goal' ? `GOAL! ${e.text} ${Math.round(e.minute)}'` :
          e.kind === 'yellow' ? `Booked: ${e.text} ${Math.round(e.minute)}'` :
          e.kind === 'red' ? `RED CARD! ${e.text} ${Math.round(e.minute)}'` :
          e.kind === 'injury' ? `Injury: ${e.text} ${Math.round(e.minute)}'` :
          `Sub: ${e.text}`;
        setBanner({ text, tone: e.kind === 'goal' ? (e.side === 'me' ? 'me' : 'opp') : 'none' });
        if (e.kind === 'goal') {
          setBall({ x: 50, y: e.side === 'me' ? 3 : 97 });
        }
        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        bannerTimer.current = setTimeout(() => setBanner(null), 2600);
      }
    }
  }, [clock, stage, h1Events, h2Events]);

  /* ---- choreography beat: ball and drift ---- */
  const possMine = useMemo(() => {
    if (report?.detail) return report.detail.stats.possession / 100;
    if (live?.lamMine !== undefined && live?.lamOpp !== undefined) {
      return live.lamMine / Math.max(0.01, live.lamMine + live.lamOpp);
    }
    return 0.5;
  }, [report, live]);

  useEffect(() => {
    if (paused || stage === 'interval' || stage === 'done') return;
    const beat = setInterval(() => {
      setPhase(p => p + 1);
      setBall(() => {
        const mineHasIt = Math.random() < possMine;
        // Move toward the end the possessing side attacks, with wide wobble.
        const y = mineHasIt
          ? 12 + Math.random() * 55
          : 33 + Math.random() * 55;
        const x = 8 + Math.random() * 84;
        return { x, y };
      });
    }, Math.max(240, 760 / speed));
    return () => clearInterval(beat);
  }, [paused, stage, speed, possMine]);

  /* ---- the dots ---- */
  const xi = useMemo(() => resolveXI(career), [career]);
  const formation = FORMATIONS[career.formationIndex] ?? FORMATIONS[0];
  const dots: Dot[] = useMemo(() => {
    const out: Dot[] = [];
    const drift = () => (Math.random() - 0.5) * 7;
    const push = ((possMine - 0.5) * 14);
    formation.slots.forEach((slot, i) => {
      const base = slotPosition(slot, career.mentality);
      const p = xi[i];
      out.push({
        key: `m${i}`,
        // My goal is the bottom of this screen: engine y=94 is my keeper.
        x: Math.max(3, Math.min(97, base.x + drift())),
        y: Math.max(3, Math.min(97, base.y - push + drift())),
        mine: true,
        label: p ? lastName(p.name) : slot.label,
      });
    });
    OPP_SPOTS.forEach((s, i) => {
      out.push({
        key: `o${i}`,
        x: Math.max(3, Math.min(97, s.x + drift())),
        y: Math.max(3, Math.min(97, s.y + push * 0.9 + drift())),
        mine: false,
        label: '',
      });
    });
    return out;
    // phase re-rolls the drift every beat; that is its whole job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formation, career.mentality, xi, possMine, phase]);

  if (!live && !report) return null;
  const opponent = live?.opponent ?? (report ? (report.home === career.clubName ? report.away : report.home) : '');
  const compLabel = live?.compLabel ?? report?.compLabel ?? '';
  const finalMy = report ? (report.home === career.clubName ? report.homeGoals : report.awayGoals) : null;
  const finalOpp = report ? (report.home === career.clubName ? report.awayGoals : report.homeGoals) : null;

  /* ---- interval: the real dressing room, embedded ---- */
  if (stage === 'interval' && career.live) {
    return (
      <div className="max-w-md mx-auto space-y-3">
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{compLabel} · Half time</div>
          <div className="text-2xl font-display font-bold text-foreground tabular-nums mt-1">
            {live?.myGoals ?? 0} - {live?.oppGoals ?? 0}
          </div>
          <div className="text-[10px] text-muted-foreground">{career.clubName} vs {opponent}</div>
        </div>
        <HalftimeScreen
          career={career}
          onSub={onSub}
          onShape={onShape}
          onTalk={onTalk}
          onSecondHalf={onSecondHalf}
        />
      </div>
    );
  }

  const stamina = xi.filter((p): p is CMPlayer => !!p).sort((a, b) => a.fitness - b.fitness);

  return (
    <div className="max-w-md mx-auto space-y-2.5">
      {/* Scoreboard */}
      <div className="bg-card border border-border rounded-2xl p-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">{compLabel}</div>
          <div className={cn(
            'text-[10px] font-bold px-2 py-0.5 rounded-full',
            stage === 'done' ? 'bg-secondary text-muted-foreground' : 'bg-red-500/15 text-red-400',
          )}>
            {/* Round 472: the whistle went after the board went up, so the
                badge says when. The number is the report's own. */}
            {stage === 'done'
              ? (report?.detail?.added ? `FT 90+${report.detail.added.h2}'` : 'FT')
              : `LIVE ${Math.min(90, Math.floor(clock))}'`}
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 mt-1">
          <div className="flex-1 text-right text-sm font-bold text-primary truncate">{career.clubName}</div>
          <div className="px-3 py-1 rounded-xl bg-secondary font-display text-xl font-bold text-foreground shrink-0 tabular-nums">
            {stage === 'done' && finalMy !== null ? finalMy : myGoalsNow} - {stage === 'done' && finalOpp !== null ? finalOpp : oppGoalsNow}
          </div>
          <div className="flex-1 text-left text-sm font-bold text-foreground truncate">{opponent}</div>
        </div>
      </div>

      {/* The pitch */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-border" style={{ aspectRatio: '3 / 4', background: 'linear-gradient(180deg, #14532d 0%, #166534 50%, #14532d 100%)' }}>
        {/* markings */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/25" />
        <div className="absolute left-1/2 top-1/2 w-16 h-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
        <div className="absolute left-1/4 right-1/4 top-0 h-10 border-b border-x border-white/25" />
        <div className="absolute left-1/4 right-1/4 bottom-0 h-10 border-t border-x border-white/25" />
        <div className="absolute left-[38%] right-[38%] top-0 h-1 bg-white/60" />
        <div className="absolute left-[38%] right-[38%] bottom-0 h-1 bg-white/60" />

        {/* dots */}
        {dots.map(d => (
          <div
            key={d.key}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: `${d.x}%`, top: `${d.y}%`, transition: 'left 0.7s linear, top 0.7s linear' }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/30"
              style={{ backgroundColor: d.mine ? clubColor : '#e5e7eb' }}
            />
            {d.mine && d.label && (
              <span className="text-[6px] text-white/85 leading-none mt-0.5 max-w-[44px] truncate">{d.label}</span>
            )}
          </div>
        ))}

        {/* ball */}
        <div
          className="absolute w-1.5 h-1.5 rounded-full bg-white shadow -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${ball.x}%`, top: `${ball.y}%`, transition: 'left 0.55s ease-in-out, top 0.55s ease-in-out' }}
        />

        {/* event banner */}
        {banner && (
          <div className={cn(
            'absolute left-1/2 top-3 -translate-x-1/2 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-lg animate-in fade-in slide-in-from-top-2',
            banner.tone === 'me' ? 'bg-emerald-500 text-black' : banner.tone === 'opp' ? 'bg-red-500 text-black' : 'bg-background/90 text-foreground border border-border',
          )}>
            {banner.text}
          </div>
        )}

        {stage === 'done' && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
            <div className="text-center">
              <div className="text-white font-display font-bold text-2xl">FULL TIME</div>
              {report?.decidedBy === 'pens' && (
                <div className="text-white/90 text-xs mt-1">Decided on penalties</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* flow strip: the engine's balance of play, goals push it around.
          Round 472: with the other club's name on it rather than "Them", the
          same rule the full time report now follows. */}
      <div className="bg-card border border-border rounded-xl p-2.5">
        <div className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
          <span className="text-primary normal-case font-bold truncate">{career.clubName}</span>
          <span className="shrink-0">Balance of play</span>
          <span className="normal-case font-bold truncate">{opponent}</span>
        </div>
        <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary">
          <div className="bg-primary" style={{ width: `${Math.round(possMine * 100)}%`, transition: 'width 0.8s' }} />
          <div className="bg-muted-foreground/40" style={{ width: `${100 - Math.round(possMine * 100)}%` }} />
        </div>
        {report?.detail && stage !== 'first' && (
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5">
            <span className="font-bold text-foreground tabular-nums">{report.detail.stats.xg.toFixed(2)}</span>
            <span className="text-[9px] uppercase tracking-wider">Expected goals</span>
            <span className="font-bold tabular-nums">{report.detail.stats.oppXg.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setPaused(p => !p)}
          disabled={stage === 'done'}
          aria-label={paused ? 'Resume' : 'Pause'}
          className="rounded-lg border border-border bg-card px-3 py-2 text-foreground hover:border-primary/60 transition-colors disabled:opacity-40"
        >
          {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
        {SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={cn(
              'flex-1 rounded-lg border px-1 py-2 text-[11px] font-bold transition-colors',
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
            'rounded-lg border px-3 py-2 transition-colors',
            showSquad ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:border-primary/60',
          )}
        >
          <Users className="w-3.5 h-3.5" />
        </button>
        {stage !== 'done' ? (
          <button
            onClick={() => setClock(stage === 'first' ? 45 : 90)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-[11px] font-bold text-foreground hover:border-primary/60 transition-colors inline-flex items-center gap-1"
          >
            <FastForward className="w-3.5 h-3.5" /> Skip
          </button>
        ) : (
          <button
            onClick={onExit}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold hover:opacity-90 transition-opacity"
          >
            Full report
          </button>
        )}
      </div>

      {/* stamina drawer */}
      {showSquad && (
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">On the pitch · fitness</div>
          <div className="space-y-1">
            {stamina.map(p => (
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
          <p className="text-[9px] text-muted-foreground mt-1.5">Changes happen in the dressing room at the break.</p>
        </div>
      )}
    </div>
  );
}

export default LiveSimScreen;
