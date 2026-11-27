import { describe, expect, it } from 'vitest';
import { players } from '@/data/players';
import { filterByTopic } from '@/lib/squadDeal';
import { budgetFor, moneyXiFor } from '@/hooks/useBudgetBuilder';
import { cupCash, cupSlots, cupWeek, playCupWeek, readBudgetCup, replayBudgetCup, signCover, startBudgetCup } from '@/lib/budgetEnduranceCup';
import { FORMATIONS } from '@/lib/squadShape';
import type { Player } from '@/types/game';

const formation = FORMATIONS[0];
const names = ['Thibaut Courtois', 'Cristian Romero', 'Trevoh Chalobah', 'Jonathan Tah', 'Milos Kerkez', 'Eberechi Eze',
  'Eduardo Camavinga', 'Xavi Simons', 'Ritsu Doan', 'Richarlison', 'Mattia Zaccagni'];
function cup() {
  return startBudgetCup(formation, 'Today', 1000, names.map(name => players.find(p => p.name === name)!), moneyXiFor(players, formation), players)!;
}
const points = (r: NonNullable<ReturnType<typeof cupWeek>>) => r.goals > r.against ? 3 : r.goals === r.against ? 1 : 0;

describe('Budget Builder Endurance Cup', () => {
  it('turns a matched final draw into a win and changes the cup through a paid fresh striker', () => {
    const original = cup();
    const covered = signCover(original, 'Erling Haaland');
    expect(cupCash(original)).toBe(571);
    expect(cupCash(covered)).toBe(cupCash(original) - players.find(p => p.name === 'Erling Haaland')!.marketValue);
    expect(original.bench).toEqual([]);
    let bare = original, full = covered;
    for (let i = 0; i < 3; i++) {
      bare = playCupWeek(bare, null);
      full = playCupWeek(full, i === 2 ? 'Erling Haaland' : null);
      expect(readBudgetCup(JSON.stringify(full))).toEqual(full);
    }
    const base = bare.played.map((p, i) => cupWeek(bare, i, p)!);
    const used = full.played.map((p, i) => cupWeek(full, i, p)!);
    expect(base.slice(0, 2)).toEqual(used.slice(0, 2));
    expect([base[2].chance, used[2].chance]).toEqual([10, 60]);
    expect([base[2].goals, base[2].against, used[2].goals, used[2].against]).toEqual([1, 1, 2, 1]);
    expect([base.reduce((s, r) => s + points(r), 0), used.reduce((s, r) => s + points(r), 0)]).toEqual([5, 7]);
    expect(playCupWeek(full, null)).toBe(full);
    expect(replayBudgetCup(original)).toBe(original);
    const next = replayBudgetCup(full);
    expect(next.played).toEqual([]);
    expect(next.bench).toEqual([]);
    expect(next.previousRun).toEqual({ legs: [[2, 2], [2, 1], [2, 1]], cash: 355 });
    expect(readBudgetCup(JSON.stringify(next))).toEqual(next);
    const entered = { ...original, entryResult: { score: 113, legs: [[0, 0], [2, 1], [2, 1]] } };
    expect(readBudgetCup(JSON.stringify(entered))?.entryResult).toEqual(entered.entryResult);
  });

  it('respects the actual eligible market, remaining cash, two bench positions, and kickoff lock', () => {
    const original = cup();
    for (const offer of original.offers) {
      const inMarket = players.find(p => p.name === offer.name)!;
      expect([offer.position, offer.fee]).toEqual([inMarket.position, inMarket.marketValue]);
      expect(original.xi.some(p => p.name === offer.name)).toBe(false);
    }
    const empty = { ...original, budget: original.budget - cupCash(original) };
    expect(signCover(empty, 'Erling Haaland')).toBe(empty);
    expect(signCover(original, names[0])).toBe(original);
    const one = signCover(original, 'Erling Haaland');
    expect(signCover(one, 'Erling Haaland')).toEqual(original);
    expect(playCupWeek(one, 'Erling Haaland')).toBe(one);
    const others = original.offers.filter(p => p.name !== 'Erling Haaland');
    const two = signCover(one, others[0].name);
    expect(two.bench).toHaveLength(2);
    expect(signCover(two, others[1].name)).toBe(two);
    const kicked = playCupWeek(two, null);
    expect(signCover(kicked, others[0].name)).toBe(kicked);
    expect(readBudgetCup(JSON.stringify({ ...two, played: ['Erling Haaland'] }))).toBeNull();
    expect(readBudgetCup(JSON.stringify({ ...two, bench: [others[0].name, others[0].name] }))).toBeNull();
    expect(readBudgetCup(JSON.stringify({ ...two, offers: [{ ...others[0], name: names[0] }] }))).toBeNull();
    expect(readBudgetCup('broken')).toBeNull();
  });

  it('uses this market only, permits a zero-cash or empty-bench tournament, and supports every formation', () => {
    const xi = names.map(n => players.find(p => p.name === n)!);
    const money = moneyXiFor(players, formation), sum = xi.reduce((s, p) => s + p.marketValue, 0);
    const noBench = startBudgetCup(formation, 'Today', sum, xi, money, [])!;
    expect(noBench.offers).toEqual([]);
    expect(cupCash(noBench)).toBe(0);
    expect(readBudgetCup(JSON.stringify(playCupWeek(noBench, null)))).toBeTruthy();
    expect(startBudgetCup(formation, 'Today', sum, xi, [null, ...money.slice(1)], players)).toBeNull();
    for (const f of FORMATIONS) {
      const filled = moneyXiFor(players, f) as Player[];
      const c = startBudgetCup(f, 'Today', 3000, filled, filled, players)!;
      expect(cupSlots(f).every(i => i >= 0)).toBe(true);
      expect(readBudgetCup(JSON.stringify(c)), f.name).toBeTruthy();
      for (let i = 0; i < 3; i++) expect(cupWeek(c, i, null)).toBeTruthy();
    }
  });
});


it('earns more points across matched XIs when the bench purchase uses only the published chance preview', () => {
  let squads = 0, improved = 0, barePoints = 0, reservePoints = 0;
  for (let offset = 0; offset < 80; offset++) {
    const xi: Player[] = [];
    for (const [index, slot] of formation.slots.entries()) {
      const eligible = players.filter(p => slot.allowed.includes(p.position) && !xi.some(x => x.name === p.name)).sort((a, b) => b.marketValue - a.marketValue);
      xi.push(eligible[(offset + index * 3) % eligible.length]);
    }
    const c = startBudgetCup(formation, 'Today', 1000, xi, moneyXiFor(players, formation), players)!;
    if (cupCash(c) < 0) continue;
    const baseline = [0, 1, 2].map(i => cupWeek(c, i, null)!);
    let lift = 0, pick: { week: number; name: string } | null = null;
    for (const offer of c.offers) {
      const paid = signCover(c, offer.name);
      for (let week = 0; week < 3; week++) {
        const forecast = cupWeek(paid, week, offer.name);
        if (forecast && forecast.chance - baseline[week].chance > lift) {
          lift = forecast.chance - baseline[week].chance;
          pick = { week, name: offer.name };
        }
      }
    }
    if (!pick) continue;
    const result = cupWeek(signCover(c, pick.name), pick.week, pick.name)!;
    const difference = points(result) - points(baseline[pick.week]);
    const base = baseline.reduce((sum, r) => sum + points(r), 0);
    squads++; barePoints += base; reservePoints += base + difference;
    if (difference > 0) improved++;
  }
  expect(squads).toBe(80);
  expect(improved).toBeGreaterThanOrEqual(10);
  expect(reservePoints - barePoints).toBeGreaterThanOrEqual(15);
  console.info('Matched endurance cups', { squads, improved, barePoints, reservePoints });
});


it('prices the reserve shortlist from the selected market and uses the active era budget without a fresh pool', () => {
  const premier = filterByTopic(players, 'premier');
  const names = new Set(premier.map(p => p.name));
  const squad = moneyXiFor(premier, formation) as Player[];
  const original = startBudgetCup(formation, 'Today', 1000, cup().xi.map(x => players.find(p => p.name === x.name)!), squad, premier)!;
  expect(original.offers.length).toBeGreaterThan(0);
  expect(original.offers.every(p => names.has(p.name))).toBe(true);
  const cap = budgetFor(squad, 'y2015');
  const lower = formation.slots.reduce<Player[]>((xi, slot) => {
    const cheap = premier.filter(p => slot.allowed.includes(p.position) && !xi.some(x => x.name === p.name)).sort((a, b) => a.marketValue - b.marketValue);
    return [...xi, cheap[0]];
  }, []);
  const historicalBudgetExample = startBudgetCup(formation, '2015 rules test', cap, lower, squad, premier)!;
  expect(historicalBudgetExample.budget).not.toBe(1000);
  expect(cupCash(historicalBudgetExample)).toBe(cap - lower.reduce((sum, p) => sum + p.marketValue, 0));
  expect(readBudgetCup(JSON.stringify(historicalBudgetExample))).toEqual(historicalBudgetExample);
});
