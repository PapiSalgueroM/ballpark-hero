import { cn } from '@/lib/utils';
import { money, moneyIn } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import {
  CLUB_FACILITY_INFO, FACILITY_IDS, FACILITY_MAX, facilitiesOf, facilityEffectLine, facilityUpgradeCost, upgradeFacility,
} from '@/lib/clubManagerFacilities';
import type { FacilityId } from '@/lib/clubManagerFacilities';

/* ─── Round 467: the facilities desk. ───
   Four levels, one card, the whole thing on a phone's first screen: the
   level, what it does today, and the price of the next one. */

interface FacilitiesScreenProps {
  career: CareerState;
  onUpgrade: (id: FacilityId) => void;
}

export function FacilitiesScreen({ career, onUpgrade }: FacilitiesScreenProps) {
  /* Round 514: the money symbol follows the start option. Shadowing the
     import here is one line instead of a career argument on every call. */
  const money = moneyIn(career);
  const f = facilitiesOf(career);
  return (
    <div className="space-y-2" data-facilities-desk>
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
          🏗️ Facilities · {money(career.budget)} to spend
        </div>
        <div className="space-y-2.5">
          {FACILITY_IDS.map(id => {
            const level = f[id];
            const cost = facilityUpgradeCost(career, id);
            const info = CLUB_FACILITY_INFO[id];
            const canBuy = cost !== null && career.budget >= cost;
            const next = canBuy ? upgradeFacility(career, id) : null;
            return (
              <div key={id} data-facility={id} data-facility-level={level}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-foreground">{info.emoji} {info.label}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold tabular-nums text-foreground">{level}/{FACILITY_MAX}</span>
                    <button
                      onClick={() => onUpgrade(id)}
                      disabled={!canBuy}
                      className="min-h-[44px] text-[11px] font-bold rounded-xl px-3 py-2 border border-gold/50 text-gold hover:bg-gold/10 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                    >
                      {cost === null ? 'Maxed' : `Upgrade ${money(cost)}`}
                    </button>
                  </span>
                </div>
                <div className="flex gap-0.5 mt-1" aria-hidden>
                  {Array.from({ length: FACILITY_MAX }, (_, i) => (
                    <span key={i} className={cn('h-1.5 flex-1 rounded-sm', i < level ? 'bg-primary/80' : 'bg-secondary')} />
                  ))}
                </div>
                <p data-facility-current className="text-[11px] text-muted-foreground mt-1">Now: {facilityEffectLine(career, id)}</p>
                {next ? (
                  <div data-facility-preview className="mt-1 rounded-lg border border-primary/25 bg-primary/5 px-2 py-1.5 text-[11px]">
                    <p className="text-foreground">Next, level {facilitiesOf(next)[id]}: {facilityEffectLine(next, id)}</p>
                    <p className="mt-0.5 font-semibold text-foreground">Leaves {money(next.budget)} in the transfer kitty.</p>
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {cost === null ? 'Maximum level reached.' : `Need ${money(cost - career.budget)} more to upgrade.`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[9px] text-muted-foreground mt-2">
          Paid from the transfer kitty. Big clubs start high and small clubs near the bottom, and every level is a lift on the game you already play: at level 1 a facility does nothing at all. They belong to the club, so a new job starts on the new club's.
        </p>
      </div>
    </div>
  );
}
