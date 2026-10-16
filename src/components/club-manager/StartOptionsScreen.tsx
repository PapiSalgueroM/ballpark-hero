import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { CareerState } from '@/lib/clubManager';
import {
  CURRENCIES, CURRENCY_CODES, STRICTNESS_INFO, STRICTNESS_MAX, STRICTNESS_MIN,
  noSackFrom, startOptionsOf,
} from '@/lib/clubManagerStart';
import type { CurrencyCode } from '@/lib/clubManagerStart';

interface StartOptionsScreenProps {
  career: CareerState;
  onCurrency: (code: CurrencyCode) => void;
  onNationJobs: (on: boolean) => void;
  onStrictness: (level: number) => void;
  /** Round 1342: switch No sacking on, for good. */
  onNoSack?: () => void;
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
 * Round 1342: No sacking is the exception, it only ever goes on, never off.
 */
export function StartOptionsScreen({ career, onCurrency, onNationJobs, onStrictness, onNoSack }: StartOptionsScreenProps) {
  const opts = startOptionsOf(career);
  const levels = [];
  for (let i = STRICTNESS_MIN; i <= STRICTNESS_MAX; i++) levels.push(i);
  /* Round 1342: the first tap asks, the second switches it on. */
  const [arming, setArming] = useState(false);
  const noSackSince = noSackFrom(career);
  const outOfWork = career.sacked || !!career.wilderness;

  return (
    <div className="space-y-3" data-cm-start-options>
      {/* Round 1342: No sacking. On for good once it is on; refused while out of work, so it can never undo a sack. */}
      <div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-2" data-cm-nosack-option={noSackSince !== null ? 'on' : 'off'}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-foreground">🛡️ No sacking</div>
          <div className="text-xs text-gold font-bold">{noSackSince !== null ? 'On' : 'Off'}</div>
        </div>
        {noSackSince !== null ? (
          <p className="text-xs text-muted-foreground">
            {noSackSince > 1 ? `On since season ${noSackSince}. ` : 'On for this career. '}
            The board can moan but it cannot fire you, and this career posts no leaderboard scores.
          </p>
        ) : outOfWork ? (
          <p className="text-xs text-muted-foreground">You can switch this on once you are back in a job.</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => { if (arming) { setArming(false); onNoSack?.(); } else setArming(true); }}
              data-cm-nosack-turn-on={arming ? 'confirm' : 'ask'}
              className={cn(
                'w-full min-h-[44px] rounded-xl border px-3 py-2 text-sm font-bold transition-colors',
                arming ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border text-foreground hover:border-primary/60',
              )}
            >
              {arming ? 'Yes, turn it on for good' : 'Turn on No sacking'}
            </button>
            <p className="text-xs text-muted-foreground">
              The board can moan but it can never fire you. There is no turning it off, and from then on this career posts no leaderboard scores.
            </p>
          </>
        )}
      </div>

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
                aria-pressed={on}
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
              aria-pressed={opts.nationJobs === on}
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
                aria-pressed={on}
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
          This changes the seller's opening price. Firm and Ruthless can give you less time to negotiate. Easier settings never add patience. Repeating one
          lowball runs him out of patience at every setting, which is the decision the transfer desk
          is built around and is not something a slider is allowed to switch off.
        </p>
      </div>
    </div>
  );
}

export default StartOptionsScreen;
