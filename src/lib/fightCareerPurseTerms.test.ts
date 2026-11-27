import { describe, expect, it } from 'vitest';
import { winBonusGross, winBonusRemaining, type Tactic } from '@/lib/fightCareer';
import { lifeNewCareer, lifeRunCamp, lifeTakeFight, lifeLoadState } from '@/lib/fightCareerLifeFlow';
import { round2 } from '@/lib/fightCareerMoney';

const camp = { conditioning: 2, power: 2, defence: 1, speed: 1 };
const tactics: Tactic[] = ['box', 'press', 'counter'];
const career = (seed: string) => lifeNewCareer('Contract Rookie', 'welter', 'outboxer', 'allround', 'family', seed);

describe('two-bout purse agreement', () => {
  it.each([
    ['terms-0', 0, 'player', 0.05, 0.04, 0.03],
    ['terms-0', 2, 'opp', 0.17, 0.14, 0.20],
    ['terms-9', 2, 'draw', 0.17, 0.14, 0.20],
  ] as const)('pays the quoted gross and spendable net on %s offer %i (%s)', (seed, index, winner, gross, net, fixedNet) => {
    const st = career(seed);
    const offer = st.offers[index];
    const signed = lifeTakeFight(lifeRunCamp(st, camp, true), offer.id, tactics)!;
    const fixed = lifeTakeFight(lifeRunCamp(st, camp), offer.id, tactics)!;
    expect(signed.result.winner).toBe(winner);
    expect(signed.result).toEqual(fixed.result);
    expect(signed.state.fighter).toEqual(fixed.state.fighter);
    expect(signed.state.offers).toEqual(fixed.state.offers);
    expect(signed.state.rngTick).toBe(fixed.state.rngTick);
    expect(signed.state.life.tick).toBe(fixed.state.life.tick);
    expect(signed.state.history[0]).toMatchObject({
      purse: gross, purseStatement: { bout: 1, listed: offer.purse, corner: round2(gross - net), banked: net },
    });
    expect(signed.state.earnings).toBe(gross);
    expect(signed.state.life.bank).toBe(round2(st.life.bank + net));
    expect(fixed.state.history[0]).not.toHaveProperty('purseStatement');
    expect(fixed.state.earnings).toBe(offer.purse);
    expect(fixed.takeHome).toBe(fixedNet);
    expect(signed.takeHome).toBe(net);
  });

  it('settles exactly two completed bouts across saves and requires a fresh signature for a third', () => {
    const fresh = career('terms-0');
    const firstCamp = lifeRunCamp(fresh, camp, true);
    expect(firstCamp.life.bank).toBe(fresh.life.bank);
    expect(lifeTakeFight(firstCamp, 'unlisted-offer', tactics)).toBeNull();
    const first = lifeTakeFight(firstCamp, firstCamp.offers[0].id, tactics)!.state;
    const restored = lifeLoadState(JSON.parse(JSON.stringify(first)));
    const secondCamp = lifeRunCamp(restored, camp, true);
    expect(secondCamp.life.winBonusEndsAt).toBe(2);
    const second = lifeTakeFight(secondCamp, secondCamp.offers[1].id, tactics)!.state;
    expect(second.history.map(f => f.purseStatement?.bout)).toEqual([1, 2]);
    expect(second.earnings).toBe(round2(second.history.reduce((sum, f) => sum + f.purse, 0)));
    expect(second.life.bank).toBe(round2(fresh.life.bank + second.history.reduce((sum, f) => sum + f.purseStatement!.banked, 0)));
    const restoredAgain = lifeLoadState(JSON.parse(JSON.stringify(second)));
    expect(restoredAgain.life).not.toHaveProperty('winBonusEndsAt');
    const thirdCamp = lifeRunCamp(restoredAgain, camp);
    const third = lifeTakeFight(thirdCamp, thirdCamp.offers[0].id, tactics)!.state;
    expect(third.history[2]).not.toHaveProperty('purseStatement');
    expect(third.history[2].purse).toBe(thirdCamp.offers[0].purse);
    expect(lifeRunCamp(restoredAgain, camp, true).life.winBonusEndsAt).toBe(4);
    expect(first.history).toHaveLength(1);
  });

  it('rounds a half-cent once from the listed amount', () => {
    expect(winBonusGross(0.58, true)).toBe(0.73);
    expect(winBonusGross(0.58, false)).toBe(0.44);
  });

  it('keeps unsigned careers and malformed or expired agreements on listed terms', () => {
    const st = career('old-save');
    const noLife = { ...st, life: undefined };
    expect(lifeLoadState(noLife).life).not.toHaveProperty('winBonusEndsAt');
    for (const endsAt of [undefined, null, '2', -1, 0, 0.5, 3, Infinity, NaN]) {
      expect(winBonusRemaining(endsAt, 0)).toBe(0);
      const repaired = lifeLoadState({ ...st, life: { ...st.life, winBonusEndsAt: endsAt as number } });
      expect(repaired.life).not.toHaveProperty('winBonusEndsAt');
    }
  });
});
