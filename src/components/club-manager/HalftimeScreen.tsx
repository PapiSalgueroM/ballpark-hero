import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ArrowLeftRight, Gauge, Play } from 'lucide-react';
import { benchForHalftime, tiringAtHalftime, MAX_HALFTIME_SUBS, pressOf } from '@/lib/clubManager';
import type { CareerState, CMPlayer, Mentality, TalkTone } from '@/lib/clubManager';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { TeamTalkRow } from '@/components/club-manager/TeamTalkRow';

interface HalftimeScreenProps {
  career: CareerState;
  onSub: (outId: string, inId: string) => void;
  onShape: (m: Mentality) => void;
  onTalk: (tone: TalkTone) => void;
  onSecondHalf: () => void;
}

const SHAPES: { id: Mentality; label: string; blurb: string }[] = [
  { id: 'defensive', label: 'Sit in', blurb: 'Protect what you have. Fewer chances either way.' },
  { id: 'balanced', label: 'As you were', blurb: 'No change. Play the half out the way you started it.' },
  { id: 'attacking', label: 'Go at them', blurb: 'Chase it. You will score more and concede more.' },
];

function fitnessTone(f: number): string {
  if (f >= 78) return 'text-emerald-400';
  if (f >= 62) return 'text-yellow-400';
  return 'text-destructive';
}

/**
 * Round 119: the dressing room.
 *
 * Every round since 105 built the club around the match. The match itself was
 * one call to a scoreline function, and the goal minutes in the report were
 * invented after the fact. This is the half-time whistle: the score as it
 * stands, who is running on empty, and two things you can actually do about
 * it before they go back out.
 */
export function HalftimeScreen({ career, onSub, onShape, onTalk, onSecondHalf }: HalftimeScreenProps) {
  const live = career.live;
  const [picking, setPicking] = useState<string | null>(null);
  const benchRef = useRevealScroll<HTMLDivElement>(`sub:${picking ?? ''}`, { skipFirst: true });

  if (!live) return null;

  const onPitch: CMPlayer[] = live.onPitch
    .map(id => career.squad.find(p => p.id === id))
    .filter((p): p is CMPlayer => !!p);
  const bench = benchForHalftime(career);
  const tired = new Set(tiringAtHalftime(career).map(p => p.id));
  const subsLeft = MAX_HALFTIME_SUBS - live.subsUsed;
  const started = new Set(live.startXi);

  const press = pressOf(career);
  const venue = live.home === true ? 'at home' : live.home === false ? 'away' : 'neutral';
  const leading = live.myGoals > live.oppGoals;
  const level = live.myGoals === live.oppGoals;

  return (
    <div className="space-y-3">
      {/* ---- the score ---- */}
      <div className="bg-card border border-border rounded-xl p-4 text-center">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
          Half time {'·'} {live.compLabel} {'·'} {venue}
        </div>
        <div className="flex items-center justify-center gap-3">
          <span className="text-sm text-foreground truncate max-w-[38%] text-right">{career.clubName}</span>
          <span
            className={cn(
              'text-3xl font-black tabular-nums px-3',
              leading ? 'text-emerald-400' : level ? 'text-foreground' : 'text-destructive',
            )}
          >
            {live.myGoals}-{live.oppGoals}
          </span>
          <span className="text-sm text-muted-foreground truncate max-w-[38%] text-left">{live.opponent}</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 italic">{live.read}</p>
      </div>

      {/* ---- shape ---- */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <Gauge className="w-3 h-3" /> How do you want the second half
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {SHAPES.map(s => (
            <button
              key={s.id}
              onClick={() => onShape(s.id)}
              className={cn(
                'rounded-lg border px-2 py-2 text-left transition-colors',
                live.mentality === s.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/40',
              )}
            >
              <span className="block text-xs font-bold text-foreground">{s.label}</span>
              <span className="block text-[9px] text-muted-foreground leading-tight mt-0.5">{s.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ---- substitutions ---- */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <ArrowLeftRight className="w-3 h-3" /> Changes {'·'} {subsLeft} left
        </div>

        {subsLeft === 0 && (
          <p className="text-[10px] text-yellow-400 mb-1.5">You have used all three. Nobody else is coming off.</p>
        )}

        <div className="space-y-0.5">
          {onPitch.map(p => {
            const isTired = tired.has(p.id);
            const cameOn = !started.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => setPicking(picking === p.id ? null : p.id)}
                disabled={subsLeft === 0 || cameOn}
                className={cn(
                  'w-full flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors',
                  picking === p.id ? 'border-primary bg-primary/10' : 'border-transparent hover:border-border',
                  (subsLeft === 0 || cameOn) && 'opacity-40',
                )}
              >
                <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">
                  {p.position}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs text-foreground truncate">
                    {p.name} {cameOn && <span className="text-[9px] text-primary">on at the break</span>}
                  </span>
                  <span className="block text-[9px] text-muted-foreground">
                    {p.rating} rated {'·'} <span className={fitnessTone(p.fitness)}>{Math.round(p.fitness)} fit</span>
                    {isTired && <span className="text-destructive"> {'·'} blowing hard</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {picking && (
          <div ref={benchRef} className="mt-2 pt-2 border-t border-border/50">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Bring on</div>
            {bench.length === 0 && (
              <p className="text-[10px] text-muted-foreground">Nobody fit is left on the bench.</p>
            )}
            <div className="space-y-0.5 max-h-56 overflow-y-auto">
              {bench.map(b => (
                <button
                  key={b.id}
                  onClick={() => { onSub(picking, b.id); setPicking(null); }}
                  className="w-full flex items-center gap-2 rounded-lg border border-border hover:border-primary/50 px-2 py-1.5 text-left transition-colors"
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
          </div>
        )}
      </div>

      {/* ---- Round 135: the last thing you do before they go back out ----
           It sits HERE and not up next to the scoreline on purpose. The break
           runs in the order a real one does: read the score, pick a shape, make
           your changes, then say your piece and send them out. Putting the talk
           last also puts it directly above the button that ends the break, so
           the owner's no scroll rule holds: whatever you tap last, the way out
           is the next thing under your thumb. The read is repeated here because
           on a 390 wide phone the eleven names in the list above mean the line
           at the top of the screen is long gone by the time you get down here. */}
      <TeamTalkRow
        tone={live.talk ?? null}
        onTone={onTalk}
        read={live.read}
        when="at the interval"
        stale={press.lastTone === live.talk && press.toneRun >= 3}
      />

      <button
        onClick={onSecondHalf}
        className="w-full rounded-xl bg-primary text-primary-foreground font-bold py-3 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        <Play className="w-4 h-4" /> Second half
      </button>
    </div>
  );
}
