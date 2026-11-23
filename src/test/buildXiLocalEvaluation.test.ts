import { describe, expect, it, vi } from 'vitest';
import { localEvaluateSoccerXI } from '@/lib/localLineupEval';
import type { FilledSlot } from '@/types/lineupBuilder';

const from = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));

// Selected rows 177617 and 166895 from scripts/data/bingoPoolHistory-2026-10-29.json.
const paris: FilledSlot = {
  role: 'CDM', label: 'CDM', playerName: 'Vitinha', assignedTeam: 'PSG', isNation: false,
  pick: {
    rawName: 'Vitinha', rawPosition: 'Defensive Midfield', club: 'Paris Saint-Germain', nationality: 'Portugal',
    year: 2026, age: 25, value: 151_200_000, recordId: 177617,
  },
};
const marseille: FilledSlot = {
  role: 'ST', label: 'ST', playerName: 'Vitinha', assignedTeam: 'Marseille', isNation: false,
  pick: {
    rawName: 'Vitinha', rawPosition: 'Centre-Forward', club: 'Olympique Marseille', nationality: 'Portugal',
    year: 2024, age: 23, value: 15_000_000, recordId: 166895,
  },
};

describe('Build Your XI offline evaluation', () => {
  it('rates the selected namesake rows independently when the evaluator is unavailable', async () => {
    const report = await localEvaluateSoccerXI([paris, marseille]);
    expect(report.analysis).toContain('Squad average 72 using available market values for your picks.');
    expect(report.analysis).toContain('Vítor Machado Ferreira (82)');
    expect(report.analysis).toContain('Vítor Manuel Carvalho Oliveira (61)');
    expect(from).not.toHaveBeenCalled();
  });

  it('leaves an unidentified Vitinha without a market record', async () => {
    const report = await localEvaluateSoccerXI([{ ...marseille, pick: undefined }]);
    expect(report.rating).toBe('Unrated XI');
    expect(report.analysis).toContain('verified value');
    expect(from).not.toHaveBeenCalled();
  });
});
