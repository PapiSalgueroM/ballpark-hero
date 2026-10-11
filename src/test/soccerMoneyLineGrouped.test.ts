/**
 * Release AW fix pass (reviews sc-screens F6 and facts-fences F3).
 *
 * From 30 the Contract Breakdown talk names the wage it would sign: "Wage €280997/wk". The engine's text is
 * what the save's wheel receipt holds and it stays as it is, in euros, ungrouped. The page prints it through
 * localizeMoneyGrouped, on the choice, in the toast and on the wheel, and this file holds what that function
 * does: six bare digits get their commas in euros, a short amount and an amount with a unit are left alone,
 * and in every other currency the line is exactly what localizeMoney already gave (shortened to k or M).
 *
 * Control, on a runner's copy only: the replace of localizeMoneyGrouped is pointed at a pattern that never
 * matches (.rc/x/fxMut.mjs group), and the euro cases below fail.
 */
import { describe, expect, it } from 'vitest';
import { CURRENCIES, currencyByCode, localizeMoney, localizeMoneyGrouped } from '@/lib/soccerCurrency';
import { soccerEventChoiceConsequence, soccerWageDemand } from '@/lib/soccerCareerContracts';

const EUR = currencyByCode('EUR');
const seasons = (rating: number, apps: number) => [{ type: 'playing', rating, apps }];
/* The reviewer's two players: an elite 31 year old who gets a raise, and a 39 year old who keeps his wage. */
const elite = { age: 31, overall: 93, weeklyWage: 255452, seasons: seasons(8.4, 34) };
const fading = { age: 39, overall: 66, weeklyWage: 243624, seasons: seasons(6.2, 12) };

describe('the contract talk line the page prints from 30', () => {
  it('the engine still writes the bare euro figure the save holds', () => {
    const raise = soccerWageDemand(elite), held = soccerWageDemand(fading);
    expect(raise.weeklyWage).toBe(Math.round(255452 * 1.1));
    expect(raise.hit).toBe(`Wage €${raise.weeklyWage}/wk`);
    expect(held.weeklyWage).toBe(243624);
    expect(held.hit).toBe('Current wage held (€243624/wk)');
    expect(held.consequence).toBe('50% chance: Current wage held (€243624/wk) or relationship damaged');
  });

  it('in euros the page line has its commas, on the label and on the wheel line', () => {
    const raise = soccerWageDemand(elite), held = soccerWageDemand(fading);
    expect(raise.weeklyWage).toBe(280997);
    expect(localizeMoneyGrouped(raise.hit, EUR)).toBe('Wage €280,997/wk');
    expect(localizeMoneyGrouped(soccerEventChoiceConsequence(elite, 16, 1, 'an older saved label'), EUR))
      .toBe('50% chance: Wage €280,997/wk or relationship damaged');
    expect(localizeMoneyGrouped(held.hit, EUR)).toBe('Current wage held (€243,624/wk)');
    expect(localizeMoneyGrouped(held.consequence, EUR)).toBe('50% chance: Current wage held (€243,624/wk) or relationship damaged');
    expect(localizeMoneyGrouped('Wage €1234567/wk', EUR)).toBe('Wage €1,234,567/wk');
    expect(localizeMoneyGrouped('Wage €1000/wk', EUR)).toBe('Wage €1,000/wk');
  });

  it('a line with nothing to group comes back as typed', () => {
    for (const line of ['Relationship damaged', '20% wage raise', '50% chance: Wage +20% or relationship damaged',
      'Wage €999/wk', 'Lose €800k', '-€0.4M and a fine', 'A €12345k deal', 'Fee €1500.5M', '']) {
      expect(localizeMoneyGrouped(line, EUR), line).toBe(line);
    }
  });

  it('in every other currency the line is exactly what the page printed before, with no euro left', () => {
    const lines = [fading, elite, { ...elite, weeklyWage: 1100 }, { ...fading, weeklyWage: 9000 }, { ...elite, weeklyWage: 3200000 }]
      .flatMap(career => { const d = soccerWageDemand(career); return [d.hit, d.consequence]; });
    let checked = 0;
    for (const cur of CURRENCIES) {
      if (cur.code === 'EUR') continue;
      for (const line of lines) {
        const out = localizeMoneyGrouped(line, cur);
        expect(out, `${cur.code}: ${line}`).toBe(localizeMoney(line, cur));
        expect(out.includes('€'), `${cur.code}: ${line}`).toBe(false);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(10);
  });
});
