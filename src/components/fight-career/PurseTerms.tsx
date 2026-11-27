import { winBonusGross, winBonusRemaining, type FightCareerState, type Offer } from '@/lib/fightCareer';
import { lifeTakeHome, type FightLife } from '@/lib/fightCareerLife';
import { fmtBank } from '@/lib/fightCareerMoney';

interface Props {
  st: FightCareerState & { life: FightLife };
  offer: Offer;
  signed: boolean;
  selected?: boolean;
  onSelect?: (bonus: boolean) => void;
}

export function PurseTerms({ st, offer, signed, selected, onSelect }: Props) {
  const remaining = winBonusRemaining(st.life.winBonusEndsAt, st.fightNo);
  const net = (gross: number) => fmtBank(lifeTakeHome(st, gross));
  return <fieldset className="space-y-2 rounded-lg border bg-card p-4 text-sm">
    <legend className="px-1 font-semibold">Purse agreement</legend>
    {signed
      ? <p className="font-semibold">Signed win bonus · bout {remaining === 2 ? 1 : 2} of 2</p>
      : <p>Select your terms before finishing camp. The win bonus covers this fight and the next one.</p>}
    {!signed && <label className="flex min-h-11 cursor-pointer items-center gap-2">
      <input type="radio" name="purse-terms" checked={!selected} onChange={() => onSelect?.(false)} />
      <span>Keep the listed purse</span>
    </label>}
    {!signed && <p className="text-xs text-muted-foreground">Your bank gets {net(offer.purse)} for any result on this offer.</p>}
    {!signed && <label className="flex min-h-11 cursor-pointer items-center gap-2">
      <input type="radio" name="purse-terms" checked={!!selected} onChange={() => onSelect?.(true)} />
      <span>Sign a two-bout win bonus</span>
    </label>}
    <p className="text-xs text-muted-foreground">
      Win bonus terms pay 75% of each listed purse, plus another 50% for a win.
      On this {fmtBank(offer.purse)} offer, after your corner is paid, a win banks {net(winBonusGross(offer.purse, true))}.
      A loss or draw banks {net(winBonusGross(offer.purse, false))}.
    </p>
  </fieldset>;
}
