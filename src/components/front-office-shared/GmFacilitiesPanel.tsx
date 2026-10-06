/**
 * Round 943: the facility desk for any manager seat, one small tile per
 * building, whatever the pack (src/data/gmFacilities/packs.ts).
 *
 * Every line is the engine's (src/lib/gmFacilities.ts): the effect lines are
 * facilityEffectLines at today's level, the price is facilityUpgradeCost and
 * a refused button prints upgradeRefusal's reason, so the tile never promises
 * what the engine would not do. A build in progress shows how long is left.
 *
 * Not mounted by this round: the boards belong to the rounds running beside
 * it, and the round that binds a pack to its game mounts this panel there.
 */
import {
  facilityEffectLines, facilityLevel, facilityMoney, facilityUpgradeCost, upgradeRefusal,
  type FacilityPack, type GmFacilitiesState,
} from '@/lib/gmFacilities';
import { cn } from '@/lib/utils';

interface GmFacilitiesPanelProps {
  pack: FacilityPack;
  state: GmFacilitiesState;
  /** What the seat may spend on buildings right now, in the pack's money (opsFreeK / 1000 for a GM seat). */
  funds: number;
  /**
   * What each building may cost, when that differs by building (a GM seat:
   * facilityFundsK(books, ctx, id) / 1000, which also keeps back the upkeep
   * the new level adds once it opens). Falls back to `funds`.
   */
  fundsById?: Record<string, number>;
  /** The league's money against its opening season, so prices follow it. */
  scale?: number;
  /** Start the next level; the board applies startUpgrade (or buyFacility) and saves. */
  onUpgrade?: (id: string) => void;
}

export function GmFacilitiesPanel({ pack, state, funds, fundsById, scale = 1, onUpgrade }: GmFacilitiesPanelProps) {
  return (
    <section data-gm-facilities className="space-y-2">
      <p className="text-center text-[10px] text-muted-foreground">
        {facilityMoney(pack, Math.max(0, funds))} to spend on buildings. One project at a time, paid when the work starts.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {pack.facilities.map(d => {
          const level = facilityLevel(pack, state, d.id);
          const cost = facilityUpgradeCost(pack, state, d.id, scale);
          const refusal = upgradeRefusal(pack, state, d.id, fundsById?.[d.id] ?? funds, scale);
          const building = state.build?.id === d.id ? state.build : null;
          return (
            <div key={d.id} data-facility={d.id} className="rounded-lg border border-border/60 p-2 text-[10px]">
              <p className="text-[11px] font-semibold">{d.emoji} {d.label}</p>
              <p className="text-muted-foreground">Level {level} of {pack.maxLevel}</p>
              {facilityEffectLines(pack, state, d.id).map(line => <p key={line}>{line}</p>)}
              {building && (
                <p className="text-primary">Level {building.toLevel} ready in {building.periodsLeft} {pack.period}{building.periodsLeft === 1 ? '' : 's'}.</p>
              )}
              {onUpgrade && cost !== null && !building && (
                <button
                  type="button"
                  disabled={refusal !== null}
                  title={refusal ?? undefined}
                  onClick={() => onUpgrade(d.id)}
                  className={cn('mt-1 w-full rounded-md border px-1 py-0.5', refusal ? 'border-border/40 text-muted-foreground' : 'border-primary text-primary')}
                >
                  Build level {level + 1}, {facilityMoney(pack, cost)}
                </button>
              )}
              {cost === null && <p className="text-muted-foreground">Top level.</p>}
              {refusal && cost !== null && !building && <p className="text-muted-foreground">{refusal}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default GmFacilitiesPanel;
