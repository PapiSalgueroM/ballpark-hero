import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { CareerState } from '@/lib/clubManager';
import {
  CURRENCIES, CURRENCY_CODES, STRICTNESS_INFO, STRICTNESS_MAX, STRICTNESS_MIN,
  easyFrom, levelFrom, noSackFrom, postsScore, startOptionsOf,
} from '@/lib/clubManagerStart';
import type { CurrencyCode } from '@/lib/clubManagerStart';
import { DIFFICULTY_INFO, DIFFICULTY_LEVELS, isEasyLevel } from '@/lib/managerDifficulty';
import type { DifficultyLevel } from '@/lib/managerDifficulty';

interface StartOptionsScreenProps {
  career: CareerState;
  onCurrency: (code: CurrencyCode) => void;
  onNationJobs: (on: boolean) => void;
  onStrictness: (level: number) => void;
  /** Round 1342: switch No sacking on, for good. */
  onNoSack?: () => void;
  /** Round 1512: change the level between matches. */
  onDifficulty?: (level: DifficultyLevel) => void;
}

/**
 * Round 1512: the Difficulty row, in Options and (review of 2026-10-19) on the sacked screen too, because a
 * manager out of work has no Options tile and the brief lets him change the level there.
 */
export function DifficultyOption({ career, onDifficulty }: { career: CareerState; onDifficulty?: (level: DifficultyLevel) => void }) {
  const level = levelFrom(career);
  /* A tile that would stop the leaderboards waits for a second tap. */
  const easySince = easyFrom(career);
  const [armedLevel, setArmedLevel] = useState<DifficultyLevel | null>(null);
  /* Review of 2026-10-19: a match paused at halftime refuses the change (setDifficulty), so the tiles say so
     rather than taking a tap that does nothing. */
  const paused = !!career.live;
  const pickLevel = (lv: DifficultyLevel) => {
    if (paused) return;
    if (lv === level) { setArmedLevel(null); return; }
    if (isEasyLevel(lv) && postsScore(career) && armedLevel !== lv) { setArmedLevel(lv); return; }
    setArmedLevel(null);
    onDifficulty?.(lv);
  };

  /* Round 1501: how hard. Round 1512: changeable here between matches, sacked or out of work included.
     Five small tiles, three to a row on a phone. Going to Very Easy or Easy on a career that still posts
     scores asks first, because that stops the leaderboards for good; every other change is one tap. The
     lines under the tiles sit in one grid cell each, so a tap never moves the page. */
  return (
      <div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-2" data-cm-level-option={level}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-foreground">🎚️ Difficulty</div>
          <div className="text-xs text-gold font-bold">{DIFFICULTY_INFO[level].label}</div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5" role="radiogroup" aria-label="Difficulty">
          {DIFFICULTY_LEVELS.map(lv => (
            <button
              key={lv}
              type="button"
              role="radio"
              aria-checked={level === lv}
              disabled={paused}
              onClick={() => pickLevel(lv)}
              data-cm-level-choice={lv}
              data-cm-level-armed={armedLevel === lv ? 'yes' : undefined}
              className={cn(
                'min-h-[44px] rounded-lg border px-1.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-60',
                level === lv ? 'bg-primary text-primary-foreground border-primary'
                  : armedLevel === lv ? 'border-primary bg-primary/10 text-foreground'
                    : 'bg-secondary border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {DIFFICULTY_INFO[lv].label}
            </button>
          ))}
        </div>
        <div className="grid text-xs text-muted-foreground">
          <p className={cn('col-start-1 row-start-1', armedLevel && 'invisible')} aria-hidden={!!armedLevel}>
            {DIFFICULTY_INFO[level].blurb} {paused && <span className="text-foreground" data-cm-level-paused>Your match is paused at halftime, so finish it first, then switch. </span>}A change counts from your next match and the money from your next cheque or new job, the market's prices to you change straight away, and nothing you have already played changes.
          </p>
          <p className={cn('col-start-1 row-start-1 text-foreground', !armedLevel && 'invisible')} aria-hidden={!armedLevel}>
            Tap {armedLevel ? DIFFICULTY_INFO[armedLevel].label : 'it'} again to switch. On Very Easy or Easy this career stops posting leaderboard scores for good, even if you go back up later.
          </p>
        </div>
        {/* Review of 2026-10-19: No sacking stops the scores too (postsScore), so a No sacking career is told so here. */}
        <p className="text-[10px] text-muted-foreground" data-cm-level-scores={easySince !== null || noSackFrom(career) !== null ? 'off' : 'on'}>
          {easySince !== null
            ? `This career went easy${easySince > 1 ? ` in season ${easySince}` : ''}, so it posts no leaderboard scores now, whatever the level.`
            : noSackFrom(career) !== null
              ? 'No sacking is on, so this career posts no leaderboard scores at any level.'
              : 'Medium, Hard and Impossible post leaderboard scores. Very Easy and Easy do not, from the moment you pick one.'}
          {' '}Negotiation strictness in Options is a separate setting.
        </p>
      </div>
  );
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
export function StartOptionsScreen({ career, onCurrency, onNationJobs, onStrictness, onNoSack, onDifficulty }: StartOptionsScreenProps) {
  const opts = startOptionsOf(career);
  const levels = [];
  for (let i = STRICTNESS_MIN; i <= STRICTNESS_MAX; i++) levels.push(i);
  /* Round 1342: the first tap asks, the second switches it on. */
  const [arming, setArming] = useState(false);
  const noSackSince = noSackFrom(career);
  const outOfWork = career.sacked || !!career.wilderness;

  return (
    <div className="space-y-3" data-cm-start-options>
      <DifficultyOption career={career} onDifficulty={onDifficulty} />

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
