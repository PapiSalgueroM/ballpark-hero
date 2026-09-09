import { cn } from '@/lib/utils';
import type { CareerState } from '@/lib/clubManager';
import {
  CURRENCIES, CURRENCY_CODES, STRICTNESS_INFO, STRICTNESS_MAX, STRICTNESS_MIN,
  startOptionsOf,
} from '@/lib/clubManagerStart';
import type { CurrencyCode } from '@/lib/clubManagerStart';

interface StartOptionsScreenProps {
  career: CareerState;
  onCurrency: (code: CurrencyCode) => void;
  onNationJobs: (on: boolean) => void;
  onStrictness: (level: number) => void;
}

/**
 * Round 514: his three start options, spec line "display currency,
 * international job offers on or off, negotiation strictness slider".
 *
 * They are changeable at any time rather than only before kickoff, which is a
 * deliberate departure from the word "start": two of the three are settings a
 * player will want to correct once they have seen the game, and locking them
 * behind a new career would just cost people their save. None of the three
 * touches anything already recorded, so changing one mid career is safe.
 */
export function StartOptionsScreen({ career, onCurrency, onNationJobs, onStrictness }: StartOptionsScreenProps) {
  const opts = startOptionsOf(career);
  const levels = [];
  for (let i = STRICTNESS_MIN; i <= STRICTNESS_MAX; i++) levels.push(i);

  return (
    <div className="space-y-3" data-cm-start-options>
      {/* Currency. Symbol only, and the screen says so rather than implying a
          conversion the game does not do. */}
      <div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-2">
        <div className="text-xs font-bold text-foreground">💱 Display currency</div>
        <div className="flex flex-wrap gap-1.5">
          {CURRENCY_CODES.map(code => {
            const on = opts.currency === code;
            return (
              <button
                key={code}
                onClick={() => onCurrency(code)}
                title={`Show money in ${CURRENCIES[code].label.toLowerCase()}`}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all',
                  on ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {CURRENCIES[code].symbol} {CURRENCIES[code].label}
              </button>
            );
          })}
        </div>
        <p className="text-[9px] text-muted-foreground">
          This changes the symbol, not the amounts. The game does not convert between currencies,
          because a rate typed in here would be out of date within days and there is nothing on the
          site verifying one.
        </p>
      </div>

      {/* The international job. */}
      <div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-2">
        <div className="text-xs font-bold text-foreground">🌐 International job offers</div>
        <div className="flex gap-1.5">
          {[true, false].map(on => (
            <button
              key={String(on)}
              onClick={() => onNationJobs(on)}
              className={cn(
                'px-3 py-1 rounded-lg text-[11px] font-bold border transition-all',
                opts.nationJobs === on ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {on ? 'On' : 'Off'}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground">
          {opts.nationJobs
            ? 'Your country can call once your name is big enough. The tournament runs in the summer and club football is unchanged.'
            : 'Nobody will offer you a national team. If you already hold one, you keep it until you step down.'}
        </p>
      </div>

      {/* Negotiation strictness. */}
      <div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-foreground">🤝 Negotiation strictness</div>
          <div className="text-[10px] text-gold font-bold">{STRICTNESS_INFO[opts.strictness]?.label}</div>
        </div>
        <div className="flex gap-1">
          {levels.map(n => {
            const on = opts.strictness === n;
            return (
              <button
                key={n}
                onClick={() => onStrictness(n)}
                title={STRICTNESS_INFO[n]?.label}
                aria-label={`Strictness ${n}, ${STRICTNESS_INFO[n]?.label}`}
                className={cn(
                  'flex-1 h-7 rounded-lg text-[10px] font-bold border transition-all',
                  on ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
        <p className="text-[9px] text-muted-foreground">{STRICTNESS_INFO[opts.strictness]?.blurb}</p>
        <p className="text-[9px] text-muted-foreground">
          This moves what a seller asks for, never how long he will sit at the table. Repeating one
          lowball runs him out of patience at every setting, which is the decision the transfer desk
          is built around and is not something a slider is allowed to switch off.
        </p>
      </div>
    </div>
  );
}

export default StartOptionsScreen;
