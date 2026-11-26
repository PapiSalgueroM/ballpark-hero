import { describe, expect, it } from 'vitest';
import { HELD_LINEUP_IDS, LINEUPS } from '@/lib/missingXi';
import { closeRecallSheet, newRecallSheet, readRecallSheet, recallStarter, unassistedCount } from '@/lib/missingXiRecall';

const ledgers = import.meta.glob<{ lineups: { id: string; verdict: string; eleven: string[] }[] }>(
  '../../scripts/data/missingXiVerified2026-10/shard-*.json', { eager: true, import: 'default' },
);

describe('Full XI match archive', () => {
  it('allows every rostered starter to complete their own archived team with no hints', () => {
    const archive = LINEUPS.filter(lineup => !HELD_LINEUP_IDS.has(lineup.id));
    expect(archive.length).toBeGreaterThan(100);
    for (const lineup of archive) {
      let sheet = newRecallSheet(lineup);
      expect(sheet.starters, lineup.id).toHaveLength(11);
      for (const player of [...lineup.slots].reverse()) sheet = recallStarter(sheet, player.name).sheet;
      expect([sheet.finished, sheet.found.length, sheet.best], lineup.id).toEqual([true, 11, 11]);
      expect(readRecallSheet(JSON.stringify(sheet))).toEqual(sheet);
    }
  });

  it('accepts all eleven published names from each playable match in the independent ledger', () => {
    const archive = new Map(LINEUPS.filter(l => !HELD_LINEUP_IDS.has(l.id)).map(l => [l.id, l]));
    const rows = Object.values(ledgers).flatMap(ledger => ledger.lineups).filter(row => row.verdict !== 'held');
    expect(rows).toHaveLength(archive.size);
    for (const row of rows) {
      let sheet = newRecallSheet(archive.get(row.id)!);
      for (const name of row.eleven) sheet = recallStarter(sheet, name).sheet;
      expect(sheet.best, row.id).toBe(11);
    }
    const barca = newRecallSheet(archive.get('cl-2011-final-barca')!);
    expect(recallStarter(barca, 'Hernández').sheet.found).toEqual([6]);
  });

  it('distinguishes hints, ambiguous surnames, aliases and the previous personal best', () => {
    const lineup = LINEUPS.find(l => l.blankCandidates.some(c => c.aliases?.length))!;
    const candidate = lineup.blankCandidates.find(c => c.aliases?.length)!;
    let sheet = newRecallSheet(lineup, 9);
    sheet.hinted = [candidate.slotIndex];
    sheet = recallStarter(sheet, candidate.aliases![0]).sheet;
    expect(sheet.found).toEqual([candidate.slotIndex]);
    expect(unassistedCount(sheet)).toBe(0);
    expect(recallStarter(sheet, candidate.name).sheet).toBe(sheet);
    expect(recallStarter(sheet, 'not on this team').sheet).toBe(sheet);
    expect(closeRecallSheet(sheet).best).toBe(9);
    const [first, second] = sheet.starters;
    const shared = { ...sheet, starters: [{ ...first, surname: 'shared' }, { ...second, surname: 'shared' }, ...sheet.starters.slice(2)] };
    expect(recallStarter(shared, 'Shared').message).toMatch(/full name/);
    expect(recallStarter(shared, 'Shared').sheet).toBe(shared);
  });

  it('keeps a closed result through restore and rejects inconsistent stored scores', () => {
    const initial = newRecallSheet(LINEUPS[0]);
    const partial = recallStarter(initial, 'mÉssi').sheet;
    expect(partial.found).toHaveLength(1);
    const ended = closeRecallSheet(partial);
    expect(ended.best).toBe(1);
    expect(recallStarter(ended, initial.starters[0].name).sheet).toBe(ended);
    expect(readRecallSheet(JSON.stringify({ ...ended, best: 0 }))).toBeNull();
    expect(readRecallSheet(JSON.stringify({ ...partial, found: [1, 1] }))).toBeNull();
    expect(readRecallSheet(JSON.stringify({ ...partial, hinted: [11] }))).toBeNull();
    expect(readRecallSheet(JSON.stringify(ended))).toEqual(ended);
  });
});
