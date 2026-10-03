import { describe, it, expect } from 'vitest';
import {
  newGym, trainFighter, trainedThisWeek, campQualityFor, advanceWeek, sellGym, canSellGym,
  salePrice, gymVerdict, wentBroke, closeBroke, sanitizeGym, SELL_MIN_WEEKS, BROKE_PENALTY,
  TRAIN_COST, offersForFighter, takeGymFight, releaseFighter, signProspect, type GymState,
} from '@/lib/fightGym';

/* Round 955: the gym's deliberate ending and the weekly training block. */

const rich = (label: string): GymState => ({ ...newGym(label, `vt-${label}`), money: 20 });

function toWeek(g: GymState, week: number): GymState {
  let x = g;
  while (x.week < week && !x.closed) x = advanceWeek(x);
  return x;
}

describe('training', () => {
  it('allows one block per fighter per week and refuses the second', () => {
    const g = rich('cap');
    const [a, b] = g.roster;
    const t1 = trainFighter(g, a.id, 'power');
    expect(t1).not.toBeNull();
    expect(trainedThisWeek(t1!, a.id)).toBe(true);
    expect(trainFighter(t1!, a.id, 'speed')).toBeNull();
    expect(trainFighter(t1!, b.id, 'speed')).not.toBeNull();
    expect(trainFighter(advanceWeek(t1!), a.id, 'speed')).not.toBeNull();
    expect(t1!.money).toBeCloseTo(g.money - TRAIN_COST, 6);
  });

  it('grows the focus area only', () => {
    const g = rich('focus');
    const f = g.roster[0];
    const t = trainFighter(g, f.id, 'defence')!;
    const after = t.roster.find(x => x.id === f.id)!;
    expect(after.attrs.defence).toBeGreaterThanOrEqual(f.attrs.defence);
    expect(after.attrs.power).toBe(f.attrs.power);
    expect(after.attrs.speed).toBe(f.attrs.speed);
    expect(after.attrs.stamina).toBe(f.attrs.stamina);
  });

  it('refuses a focus that does not exist', () => {
    const g = rich('badfocus');
    expect(trainFighter(g, g.roster[0].id, 'nonsense' as never)).toBeNull();
  });

  it('turns blocks since the last fight into sharpness, matching the rules example', () => {
    let g = rich('camp');
    const id = g.roster[0].id;
    expect(campQualityFor(g, id)).toBe(0.5);
    g = trainFighter(g, id, 'power')!;
    g = trainFighter(advanceWeek(g), id, 'conditioning')!;
    g = trainFighter(advanceWeek(g), id, 'defence')!;
    expect(campQualityFor(g, id)).toBeCloseTo(0.75, 6);
  });

  it('spends the camp on the fight but keeps the weekly limit', () => {
    /* The rules say the fight spends the camp, so the next one starts from
       zero, and a fight does not hand back the week's block. */
    let g = rich('spent');
    const id = g.roster[0].id;
    g = trainFighter(g, id, 'conditioning')!;
    g = trainFighter(advanceWeek(g), id, 'power')!;
    expect(campQualityFor(g, id)).toBeCloseTo(0.7, 6);
    const offer = offersForFighter(g, id)[1];
    const fought = takeGymFight(g, id, offer, ['box', 'press', 'counter'])!;
    expect(fought).not.toBeNull();
    expect(campQualityFor(fought.state, id)).toBe(0.5);
    expect(trainedThisWeek(fought.state, id)).toBe(true);
    expect(trainFighter(fought.state, id, 'speed')).toBeNull();
    expect(trainFighter(advanceWeek(fought.state), id, 'speed')).not.toBeNull();
  });
});

describe('selling up', () => {
  it('is refused before the minimum week and closes the gym with its own verdict after', () => {
    const g = rich('sell');
    expect(canSellGym(g)).toBe(false);
    expect(sellGym(g)).toBeNull();
    const later = toWeek(g, SELL_MIN_WEEKS);
    expect(later.closed).toBe(false);
    const price = salePrice(later);
    const sold = sellGym(later)!;
    expect(sold.closed).toBe(true);
    expect(sold.exit).toBe('sold');
    expect(sold.soldFor).toBe(price);
    expect(sold.money).toBeCloseTo(later.money + price, 6);
    expect(wentBroke(sold)).toBe(false);
    expect(sellGym(sold)).toBeNull();
  });

  it('scores a sale above the same gym going broke', () => {
    const g = toWeek(rich('fork'), SELL_MIN_WEEKS + 2);
    const sold = gymVerdict(sellGym(g)!);
    const broke = gymVerdict(closeBroke(g));
    expect(sold.score).toBeGreaterThan(broke.score);
    expect(broke.bullets[0]).toContain(String(BROKE_PENALTY));
  });

  /* A gym at the sale week with a name, two belts, and two men who have fought
     for it: one healthy, one at `hurt` damage. */
  function saleGym(label: string, hurt: number): GymState {
    const g = toWeek(rich(label), SELL_MIN_WEEKS);
    return {
      ...g,
      reputation: 60,
      titles: 2,
      roster: g.roster.map((f, i) => ({ ...f, wins: 3, losses: 1, damage: i === 0 ? hurt : 10 })),
    };
  }

  it('settles the roster, so keeping a wrecked man signed through the sale buys nothing', () => {
    const g = saleGym('wreck', 75);
    const wreck = g.roster[0];
    const keep = gymVerdict(sellGym(g)!).score;
    const letGo = gymVerdict(sellGym(releaseFighter(g, wreck.id)!)!).score;
    /* Only his contract's sale value separates them, a fraction of a point. */
    expect(keep - letGo).toBeGreaterThanOrEqual(0);
    expect(keep - letGo).toBeLessThanOrEqual(1);
    const sold = sellGym(g)!;
    expect(sold.roster).toEqual([]);
    expect(sold.alumni.slice(-2).map(a => a.name).sort()).toEqual(g.roster.map(f => f.name).sort());
  });

  it('settles the roster, so letting healthy men go before the sale buys nothing', () => {
    const g = saleGym('clean', 10);
    const keep = gymVerdict(sellGym(g)!).score;
    let shed = g;
    for (const f of g.roster) shed = releaseFighter(shed, f.id)!;
    expect(keep).toBeGreaterThanOrEqual(gymVerdict(sellGym(shed)!).score);
  });

  it('pays nothing and counts nothing for a man who never fought for the gym', () => {
    const g = saleGym('paper', 10);
    const signed = signProspect(g, g.prospects[0].id)!;
    expect(signed.roster.length).toBe(g.roster.length + 1);
    expect(salePrice(signed)).toBe(salePrice(g));
    expect(gymVerdict(sellGym(signed)!).score).toBe(gymVerdict(sellGym(g)!).score);
  });

  it('pays less for a man carrying damage, beyond what his rating loses', () => {
    /* His rating already falls with damage, so a bare "cheaper" would hold with
       no discount at all. At 10 and 40 damage neither price marks the name, so
       his worth is the price with him less the price without him. The rating
       alone takes about 19% of it, the discount takes it to about 46%. */
    const g = saleGym('discount', 10);
    const hurt = { ...g, roster: g.roster.map((f, i) => (i === 1 ? { ...f, damage: 40 } : f)) };
    const without = salePrice({ ...g, roster: [g.roster[0]] });
    const drop = 1 - (salePrice(hurt) - without) / (salePrice(g) - without);
    expect(salePrice(hurt)).toBeLessThan(salePrice(g));
    expect(drop).toBeGreaterThan(0.33);
  });
});

describe('old saves and bad blocks', () => {
  it('keeps the verdict an old closed save was recorded with', () => {
    /* A gym closed before Round 955 carries no exit. It went broke, but it was
       scored and recorded without the penalty, so reopening it must not change
       the score it shares. */
    const open = { ...toWeek(rich('old'), 12), reputation: 30 };
    const g = { ...open, closed: true };
    delete (g as Partial<GymState>).exit;
    expect(wentBroke(g)).toBe(false);
    expect(gymVerdict(g).score).toBe(gymVerdict(open).score);
    expect(gymVerdict(g).bullets).toEqual(gymVerdict(open).bullets);
    expect(wentBroke(closeBroke(open))).toBe(true);
  });

  it('drops only the block that does not read right', () => {
    const g = rich('bad');
    const id = g.roster[0].id;
    const raw = {
      ...g,
      exit: 'vanished',
      soldFor: 'lots',
      training: { [id]: { week: 3, blocks: { power: 2 } }, ghost: { week: 'x' } },
      alumni: [
        { name: 'A', record: '1-0', damage: 10, titles: 0, fights: 'x' },
        { name: 'B', record: '0-0', damage: 0, titles: 0, fights: 0 },
        { name: 'C', record: '2-1', damage: 20, titles: 0 },
      ],
    } as unknown as GymState;
    const clean = sanitizeGym(raw);
    expect(clean.exit).toBeUndefined();
    expect(clean.soldFor).toBeUndefined();
    expect(clean.alumni.map(a => a.fights)).toEqual([undefined, 0, undefined]);
    expect(clean.alumni.map(a => a.name)).toEqual(['A', 'B', 'C']);
    expect(clean.training?.[id]).toEqual({ week: 3, blocks: { conditioning: 0, power: 2, defence: 0, speed: 0 } });
    expect(clean.training?.ghost).toBeUndefined();
    expect(clean.roster).toEqual(g.roster);
    expect(sanitizeGym({ ...g, training: [] as never }).training).toBeUndefined();
  });
});
