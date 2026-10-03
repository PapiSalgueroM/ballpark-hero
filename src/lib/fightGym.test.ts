import { describe, it, expect } from 'vitest';
import {
  newGym, trainFighter, trainedThisWeek, campQualityFor, advanceWeek, sellGym, canSellGym,
  salePrice, gymVerdict, wentBroke, closeBroke, sanitizeGym, SELL_MIN_WEEKS, BROKE_PENALTY,
  TRAIN_COST, type GymState,
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
});

describe('old saves and bad blocks', () => {
  it('reads an old closed save with no exit as a gym that went broke', () => {
    const g = { ...rich('old'), closed: true };
    delete (g as Partial<GymState>).exit;
    expect(wentBroke(g)).toBe(true);
    expect(gymVerdict(g).bullets[0]).toContain('rent went unpaid');
  });

  it('drops only the block that does not read right', () => {
    const g = rich('bad');
    const id = g.roster[0].id;
    const raw = {
      ...g,
      exit: 'vanished',
      soldFor: 'lots',
      training: { [id]: { week: 3, blocks: { power: 2 } }, ghost: { week: 'x' } },
    } as unknown as GymState;
    const clean = sanitizeGym(raw);
    expect(clean.exit).toBeUndefined();
    expect(clean.soldFor).toBeUndefined();
    expect(clean.training?.[id]).toEqual({ week: 3, blocks: { conditioning: 0, power: 2, defence: 0, speed: 0 } });
    expect(clean.training?.ghost).toBeUndefined();
    expect(clean.roster).toEqual(g.roster);
    expect(sanitizeGym({ ...g, training: [] as never }).training).toBeUndefined();
  });
});
