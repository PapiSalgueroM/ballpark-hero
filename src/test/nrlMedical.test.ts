import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlCareerCap, nrlCareerFinance, nrlMedicalSpend, nrlMedicalUpgradeQuote, readNrlCareerSave, reduceNrlCareer,
  type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, nrlInjuries } from '@/lib/nrlManager';

const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
const upgrade = (career: NrlCareerState, level: 2 | 3) => reduceNrlCareer(career, { type: 'upgradeMedical', level });
const save = (career: NrlCareerState) => readNrlCareerSave(JSON.stringify(career));
const lastInjury = (career: NrlCareerState) => career.season.results.filter(match => match.injury).at(-1)?.injury;

describe('NRL Manager medical facilities', () => {
  it('charges one published purchase, leaves the cap intact and refuses a stale second tap', () => {
    const opened = createNrlCareer('broncos', 16);
    const improved = upgrade(opened, 2);
    expect(improved?.finance.medicalUpgrades).toEqual([{ level: 2, round: 1 }]);
    expect(nrlMedicalUpgradeQuote(opened)).toMatchObject({ level: 1, nextLevel: 2, cost: 800_000, reason: null });
    expect(nrlMedicalSpend(improved.finance)).toBe(800_000);
    expect(nrlCareerFinance(improved).cash).toBe(nrlCareerFinance(opened).cash - 800_000);
    expect(nrlCareerFinance(improved).profit).toBe(-800_000);
    expect(nrlCareerCap(improved)).toEqual(nrlCareerCap(opened));
    expect(improved.season).toBe(opened.season);
    expect(improved.players).toBe(opened.players);
    expect(JSON.stringify(save(improved))).toBe(JSON.stringify(improved));
    expect(upgrade(improved, 2)).toBe(improved);
    expect(nrlMedicalUpgradeQuote(improved)).toMatchObject({ level: 2, nextLevel: 3, cost: 2_600_000, reason: expect.any(String) });
    expect(upgrade(improved, 3)).toBe(improved);
    expect(upgrade(opened, 3)).toBe(opened);
  });

  it('uses the same knock roll and recipient, shortens only future spells and keeps a one-round floor', () => {
    const opened = createNrlCareer('broncos', 16);
    const normal = advance(opened);
    const bought = upgrade(opened, 2);
    expect(bought?.finance.medicalUpgrades).toBeDefined();
    const treated = advance(save(bought)!);
    const original = lastInjury(normal)!;
    expect(original.rounds).toBe(4);
    expect(lastInjury(treated)).toEqual({ ...original, rounds: 3 });
    expect(treated.season.results.map(({ injury, ...result }) => result)).toEqual(normal.season.results.map(({ injury, ...result }) => result));
    expect(treated.season.squad).toEqual(normal.season.squad);
    const afterKnock = upgrade(normal, 2);
    expect(afterKnock.season).toBe(normal.season);
    expect(nrlInjuries(afterKnock.season).get(original.playerId)).toBe(4);
    const oneRound = createNrlCareer('broncos', 23);
    expect(lastInjury(advance(oneRound))?.rounds).toBe(1);
    expect(lastInjury(advance(upgrade(oneRound, 2)))).toEqual(lastInjury(advance(oneRound)));
  });

  it('funds both levels from earned cash, archives the purchases and carries treatment forward', () => {
    let career = createNrlCareer('storm', 1);
    while (career.season.round < 9) career = advance(career);
    const standard = advance(career);
    const first = upgrade(career, 2);
    expect(first?.finance.medicalUpgrades).toEqual([{ level: 2, round: 9 }]);
    const full = upgrade(first, 3);
    const purchases = [{ level: 2, round: 9 }, { level: 3, round: 9 }];
    expect(full?.finance.medicalUpgrades).toEqual(purchases);
    expect(nrlMedicalSpend(full.finance)).toBe(3_400_000);
    expect(nrlCareerFinance(full).cash).toBe(nrlCareerFinance(career).cash - 3_400_000);
    expect(nrlMedicalUpgradeQuote(full)).toMatchObject({ level: 3, nextLevel: null, cost: null });
    expect(upgrade(full, 3)).toBe(full);
    const original = lastInjury(standard)!;
    expect(original.rounds).toBe(4);
    expect(lastInjury(advance(first))).toEqual({ ...original, rounds: 3 });
    const live = reduceNrlCareer(save(full)!, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    const playedLive = reduceNrlCareer(save(live)!, { type: 'finishLive', year: live.season.year, round: live.season.round, tactic: live.season.tactic });
    expect(lastInjury(playedLive)).toEqual({ ...original, rounds: 2 });
    expect(JSON.stringify(playedLive)).toBe(JSON.stringify(advance(full)));
    let complete = playedLive;
    while (complete.season.phase !== 'complete') complete = advance(complete);
    expect(complete.history[0].finance?.medicalUpgrades).toEqual(purchases);
    expect(JSON.stringify(save(complete))).toBe(JSON.stringify(complete));
    const next = reduceNrlCareer(complete, { type: 'startNextSeason' });
    expect(next.finance.openingCash).toBe(nrlCareerFinance(complete).cash);
    expect(next.finance.medicalUpgrades).toBeUndefined();
    expect(next.history[0].finance?.medicalUpgrades).toEqual(purchases);
    expect(nrlMedicalUpgradeQuote(next).level).toBe(3);
    expect(JSON.stringify(save(next))).toBe(JSON.stringify(next));
  });

  it('rejects forged or unaffordable purchases and keeps a paused or imported save intact', () => {
    const opened = createNrlCareer('broncos', 16);
    const withPurchases = (medicalUpgrades: unknown) => readNrlCareerSave(JSON.stringify({ ...opened, finance: { ...opened.finance, medicalUpgrades } }));
    expect(withPurchases([{ level: 2, round: 2 }])).toBeNull();
    expect(withPurchases([{ level: 3, round: 1 }])).toBeNull();
    expect(withPurchases([{ level: 2, round: 1 }, { level: 3, round: 1 }])).toBeNull();
    expect(withPurchases([{ level: 2, round: 1 }, { level: 2, round: 1 }])).toBeNull();
    const paused = reduceNrlCareer(opened, { type: 'startLive' });
    expect(upgrade(paused, 2)).toBe(paused);
    const legacy = readNrlCareerSave(JSON.stringify(createNrlSeason('broncos', 16)))!;
    expect(upgrade(legacy, 2)).toBe(legacy);
    expect(nrlMedicalUpgradeQuote(legacy).reason).toEqual(expect.any(String));
    const { injuryTracking, kickerId, ...oldSeason } = opened.season;
    const oldV2 = save({ ...opened, season: oldSeason })!;
    expect(upgrade(oldV2, 2)).toBe(oldV2);
    expect(nrlMedicalUpgradeQuote(oldV2).reason).toMatch(/injury tracking/);
    expect(JSON.stringify(save(opened))).toBe(JSON.stringify(opened));
  });

  it('continues the upgrade ladder next year with a separate annual charge', () => {
    let career = upgrade(createNrlCareer('storm', 1), 2);
    while (career.season.phase !== 'complete') career = advance(career);
    expect(nrlMedicalUpgradeQuote(career).reason).toMatch(/next season/);
    expect(upgrade(career, 3)).toBe(career);
    const next = reduceNrlCareer(career, { type: 'startNextSeason' });
    expect(nrlMedicalUpgradeQuote(next)).toMatchObject({ level: 2, nextLevel: 3 });
    career = next;
    while (career.season.phase !== 'complete' && nrlMedicalUpgradeQuote(career).reason !== null) career = advance(career);
    expect(nrlMedicalUpgradeQuote(career).reason).toBeNull();
    const full = upgrade(career, 3);
    expect(nrlMedicalSpend(full.finance)).toBe(2_600_000);
    expect(nrlMedicalSpend(full.history[0].finance!)).toBe(800_000);
    expect(JSON.stringify(save(full))).toBe(JSON.stringify(full));
  });
});
