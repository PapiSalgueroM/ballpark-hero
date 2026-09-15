/**
 * Round 585: the Packs panel. Generated academy kids, bought with gems the club
 * earned by playing, never with money.
 *
 * Every odd on this panel is read from PACKS in src/lib/wonderkidFactory.ts, the
 * same table the draw uses, and is on screen before the button is. One pack per
 * press, one card, landing whole with a single rise: no reel, no cycling tier
 * names, no near-miss copy, no sound, no timer and no confetti (confetti is for
 * things won by play). The button stays off unless a bed is free and the gems
 * cover the price. scripts/simTycoonPacks.mjs holds this file to all of it,
 * including a list of words it may never use.
 */
import { cn } from '@/lib/utils';
import { CelebrationStyles } from '@/components/club-manager/CelebrationStyles';
import { PACKS, TIERS, GUARANTEED_TIERS } from '@/lib/wonderkidFactory';
import type { PackId } from '@/lib/wonderkidFactory';
import { balance, priceOf, packsToGuarantee, canOpen, GEM_PAY } from '@/lib/tycoonRewards';
import type { RewardsLedger } from '@/lib/tycoonRewards';

const guaranteedLabel = GUARANTEED_TIERS.map(id => TIERS.find(t => t.id === id)?.label ?? id).join(' or ');

export default function PacksPanel({ ledger, bedFree, delivered, saveBlocked, onOpen, onDismiss }: {
  ledger: RewardsLedger;
  bedFree: boolean;
  /** the academy has this pack's kid in a bed */
  delivered: boolean;
  saveBlocked: boolean;
  onOpen: (id: PackId) => void;
  onDismiss: () => void;
}) {
  const gems = balance(ledger);
  const pending = ledger.pending;
  const pendingTier = pending ? TIERS.find(t => t.id === pending.tier) : undefined;

  return (
    <div data-packs-panel className="space-y-3">
      <CelebrationStyles />
      <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
        <div className="text-sm font-bold text-foreground">💎 {gems} gem{gems === 1 ? '' : 's'}</div>
        <p className="mt-1 leading-snug">
          Gems come only from results at the ground: {GEM_PAY.win} for a watched win, {GEM_PAY.draw} for a watched draw, {GEM_PAY.awayWin} for a win while you were away,
          {' '}{GEM_PAY.title} for a league title and {GEM_PAY.runnerUp} for second place. They can never be bought.
        </p>
      </div>

      {saveBlocked && <p data-pack-save-blocked role="status" className="text-xs font-bold text-muted-foreground">Device storage is full or blocked. Make space or allow storage, then try again.{pending ? ' Your pack is still waiting.' : ''}</p>}

      {pending && pendingTier && (
        <div data-pack-reveal data-tier={pending.tier} className="cm-rise rounded-2xl border border-gold/60 bg-card p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">From your {PACKS.find(p => p.id === pending.pack)?.name}</p>
          <p data-tier-label className="mt-1 font-display text-lg font-black text-gold">{pendingTier.label}</p>
          <p className="mt-1 text-sm font-bold text-foreground">{pending.kid.name}</p>
          <p className="text-xs text-muted-foreground">{pending.kid.pos} · {pending.kid.nation} · age {pending.kid.age} · rated {Math.floor(pending.kid.rating)}</p>
          <p className="text-xs text-muted-foreground">a {pendingTier.label} ceiling sits between {pendingTier.potMin} and {pendingTier.potMax}</p>
          {delivered ? (
            <button
              type="button"
              onClick={onDismiss}
              className="mt-3 inline-flex min-h-[36px] items-center rounded-full bg-primary px-5 py-1.5 text-sm font-bold text-primary-foreground hover:brightness-110"
            >
              Welcome him in
            </button>
          ) : (
            !saveBlocked && <p data-pack-waiting className="mt-3 text-xs font-bold text-muted-foreground">He moves in as soon as a bed is free.</p>
          )}
        </div>
      )}

      {PACKS.map(pack => {
        const price = priceOf(ledger, pack.id);
        const ok = canOpen(ledger, pack.id, bedFree);
        const left = packsToGuarantee(ledger, pack.id);
        const why = pending ? 'welcome the last kid in first' : !bedFree ? 'no free bed' : gems < price ? `${price - gems} more gems needed` : '';
        return (
          <div key={pack.id} data-pack={pack.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-bold text-foreground">{pack.emoji} {pack.name}</div>
              <div className="text-xs font-bold text-gold tabular-nums">{price === 0 ? 'free' : `${price} gems`}</div>
            </div>
            <div data-odds={pack.id} className="mt-2 rounded-xl bg-secondary/50 p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">The odds</div>
              <div className="mt-1 grid grid-cols-1 gap-0.5">
                {TIERS.map(t => (
                  <div key={t.id} data-odd={t.id} className={cn('flex items-center justify-between text-[11px]', pack.odds[t.id] === 0 ? 'text-muted-foreground/60' : 'text-foreground')}>
                    <span>{t.label} <span className="text-muted-foreground">(ceiling {t.potMin} to {t.potMax})</span></span>
                    <span className="tabular-nums font-bold">{pack.odds[t.id]}%</span>
                  </div>
                ))}
              </div>
              {left !== null && (
                <p data-guarantee={pack.id} className="mt-1 text-[10px] text-muted-foreground">
                  A {guaranteedLabel} is guaranteed within the next {left} {pack.name}{left === 1 ? '' : 's'}.
                </p>
              )}
            </div>
            <button
              type="button"
              data-open-pack={pack.id}
              onClick={() => onOpen(pack.id)}
              disabled={!ok}
              className={cn(
                'mt-2 w-full min-h-[40px] rounded-xl text-sm font-bold transition-all',
                ok ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground',
              )}
            >
              {price === 0 ? 'Open free' : `Open for ${price} gems`}
            </button>
            {!ok && why && <p className="mt-1 text-center text-[10px] text-muted-foreground">{why}</p>}
          </div>
        );
      })}
    </div>
  );
}
