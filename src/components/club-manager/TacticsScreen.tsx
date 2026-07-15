import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wand2 } from 'lucide-react';
import {
  FORMATIONS, MENTALITIES, resolveXI, isAvailable, xiAverageRating,
} from '@/lib/clubManager';
import type { CareerState, CMPlayer, Mentality } from '@/lib/clubManager';
import { ratingTint } from '@/components/club-manager/SquadScreen';

const lastName = (n: string) => n.replace(' (Youth)', '').split(' ').slice(-1)[0];

interface TacticsScreenProps {
  career: CareerState;
  onFormation: (idx: number) => void;
  onMentality: (m: Mentality) => void;
  onSlot: (slotIdx: number, playerId: string | null) => void;
  onAutoPick: () => void;
}

/** Formation + mentality + XI picker on a mini pitch. */
export function TacticsScreen({ career, onFormation, onMentality, onSlot, onAutoPick }: TacticsScreenProps) {
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const formation = FORMATIONS[career.formationIndex];
  const xi = resolveXI(career);
  const slot = openSlot !== null ? formation.slots[openSlot] : null;
  const usedIds = new Set(career.xiIds.filter((id): id is string => !!id));

  const candidates: CMPlayer[] = slot
    ? [...career.squad]
        .filter(p => isAvailable(p))
        .sort((a, b) => {
          const aFit = slot.allowed.includes(a.position) ? 1 : 0;
          const bFit = slot.allowed.includes(b.position) ? 1 : 0;
          return bFit - aFit || b.rating - a.rating;
        })
    : [];

  return (
    <div className="space-y-4">
      {/* Formation */}
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Formation</div>
        <div className="flex flex-wrap gap-1.5">
          {FORMATIONS.map((f, i) => (
            <button
              key={f.name}
              onClick={() => onFormation(i)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all',
                i === career.formationIndex
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-foreground hover:border-primary',
              )}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Mentality */}
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Mentality</div>
        <div className="grid grid-cols-3 gap-1.5">
          {MENTALITIES.map(m => (
            <button
              key={m.id}
              onClick={() => onMentality(m.id)}
              className={cn(
                'rounded-lg border p-2 text-center transition-all',
                career.mentality === m.id ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary',
              )}
            >
              <div className="text-base">{m.emoji}</div>
              <div className={cn('text-[10px] font-bold', career.mentality === m.id ? 'text-primary' : 'text-foreground')}>{m.label}</div>
              <div className="text-[8px] text-muted-foreground leading-tight hidden md:block">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Pitch */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Starting XI · avg <span className="text-primary font-bold">{xiAverageRating(career)}</span>
          </div>
          <button
            onClick={onAutoPick}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
          >
            <Wand2 className="w-3.5 h-3.5" /> Auto Pick
          </button>
        </div>
        <div
          className="relative w-full max-w-md mx-auto rounded-2xl border border-border overflow-hidden"
          style={{ aspectRatio: '3 / 4', background: 'linear-gradient(to top, hsl(var(--secondary)) 0%, hsl(var(--card)) 100%)' }}
        >
          <div className="absolute inset-x-0 top-1/2 h-px bg-border/40" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-border/40" />
          {formation.slots.map((sl, i) => {
            const p = xi[i];
            const unavailable = p ? !isAvailable(p) : false;
            return (
              <button
                key={i}
                onClick={() => setOpenSlot(i)}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ left: `${sl.x}%`, top: `${sl.y}%` }}
              >
                <div className={cn(
                  'w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-all',
                  p
                    ? unavailable
                      ? 'bg-destructive/70 text-destructive-foreground border-destructive'
                      : 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card/70 border-dashed border-primary/70 text-primary hover:scale-110',
                )}>
                  {p ? p.rating : sl.label}
                </div>
                <span className="text-[8px] md:text-[9px] text-foreground mt-0.5 max-w-[64px] truncate text-center leading-tight">
                  {p ? lastName(p.name) : '-'}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">
          Tap any spot to change who starts there.
        </p>
      </div>

      {/* Slot picker dialog */}
      <Dialog open={openSlot !== null} onOpenChange={(o) => { if (!o) setOpenSlot(null); }}>
        <DialogContent className="max-w-md bg-card border-border text-foreground max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display text-primary text-center">
              Pick your {slot ? slot.label : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {candidates.map(p => {
              const fits = slot ? slot.allowed.includes(p.position) : true;
              const isHere = openSlot !== null && career.xiIds[openSlot] === p.id;
              const elsewhere = usedIds.has(p.id) && !isHere;
              return (
                <button
                  key={p.id}
                  onClick={() => { if (openSlot !== null) { onSlot(openSlot, p.id); setOpenSlot(null); } }}
                  className={cn(
                    'w-full flex items-center gap-2 rounded-lg border p-2 text-left transition-all',
                    isHere ? 'border-primary bg-primary/10' : 'border-border bg-surface-1 hover:border-primary',
                  )}
                >
                  <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.position}</span>
                  <span className={cn('flex-1 text-xs truncate', p.isYouth ? 'text-muted-foreground italic' : 'text-foreground')}>
                    {p.name}
                    {elsewhere && <span className="text-[8px] text-primary ml-1">(in XI)</span>}
                    {!fits && <span className="text-[8px] text-yellow-400 ml-1">(out of position)</span>}
                  </span>
                  <span className="text-[9px] text-muted-foreground">fit {p.fitness}</span>
                  <span className={cn('text-sm font-bold font-display', ratingTint(p.rating))}>{p.rating}</span>
                </button>
              );
            })}
            {candidates.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No fit players available. Everyone is injured or suspended.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TacticsScreen;
