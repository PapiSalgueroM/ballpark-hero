/* Round 192: the GM presser card, one component, four Front Office games.

   Renders the presser the engine (foGmPress.ts) built: an unnamed room's
   question and the three registers, measured, candid, bold, each with an
   honest effect line. The tilt chip warns when an answer will move next
   season's mandate, because a hidden ratchet is the kind of fake choice
   the owner banned. Same shared-screen move as OwnerMandateCard (180) and
   TradeTalksCard (190). */

import { cn } from '@/lib/utils';
import type { GmPresser } from '@/lib/foGmPress';

interface Props {
  presser: GmPresser;
  onAnswer: (index: 0 | 1 | 2) => void;
}

const REGISTERS = ['Measured', 'Candid', 'Bold'] as const;

export function GmPressCard({ presser, onAnswer }: Props) {
  return (
    <div className="rounded-2xl border border-gold/40 bg-card p-3" data-gm-press>
      <p className="text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">🎙️ Press conference</p>
      <p className="mt-1 text-center font-display text-sm font-bold text-foreground">{presser.title}</p>
      <p className="mt-1.5 text-center text-[11px] leading-snug text-muted-foreground">{presser.body}</p>
      <div className="mt-2.5 space-y-1.5">
        {presser.options.map((opt, i) => (
          <button
            key={opt.label}
            onClick={() => onAnswer(i as 0 | 1 | 2)}
            className={cn(
              'w-full rounded-xl border px-3 py-2 text-left transition-all hover:scale-[1.01]',
              i === 2 ? 'border-destructive/40 bg-destructive/5 hover:border-destructive/70'
                : i === 1 ? 'border-gold/40 bg-gold/5 hover:border-gold/70'
                : 'border-border bg-background hover:border-primary/60',
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground">{opt.label}</span>
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">{REGISTERS[i]}</span>
            </span>
            <span className="mt-0.5 block text-[10px] text-muted-foreground">
              {opt.effectLine}
              {opt.effect.gamble ? ' · a real gamble' : ''}
              {opt.effect.tilt === 1 ? ' · next ask gets HARDER' : opt.effect.tilt === -1 ? ' · next ask softens' : ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
