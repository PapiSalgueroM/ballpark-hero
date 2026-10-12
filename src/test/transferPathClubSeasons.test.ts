import { describe, expect, it } from 'vitest';
import { careerPlayers } from '@/data/careerPlayers';
import { clubSeasonsOf, shareClub } from '@/lib/transferPathGraph';
import { refreshTransferPathPuzzles, transferPathSpells, verifiedClubSeasonsOf } from '@/lib/transferPathClubSeasons';
import { playersUnderRule } from '@/lib/transferPathModes';

const trent = 'Trent Alexander-Arnold';
const mbappe = 'Kylian Mbappé';

describe('membership-only Transfer Path evidence', () => {
  it('adds the verified link without linking different Madrid eras or changing stats', () => {
    const before = JSON.stringify(careerPlayers);
    expect(shareClub(clubSeasonsOf(careerPlayers), trent, mbappe)).toBeNull();
    const keys = verifiedClubSeasonsOf(careerPlayers);
    expect(shareClub(keys, trent, mbappe)).toBe('Real Madrid');
    expect(shareClub(keys, 'Cristiano Ronaldo', mbappe)).toBeNull();
    expect(shareClub(keys, trent, 'Mohamed Salah')).toBe('Liverpool');
    expect(JSON.stringify(careerPlayers)).toBe(before);
    const spells = transferPathSpells(careerPlayers).find(p => p.name === trent)!.career;
    const extra = spells[spells.length - 1];
    expect(Object.keys(extra).sort()).toEqual(['club', 'season']);
  });

  it('does not create absent identities or attach evidence to the wrong nationality', () => {
    expect(verifiedClubSeasonsOf([]).size).toBe(0);
    const wrong = careerPlayers.map(p => p.name === trent ? { ...p, nationality: 'France' } : p);
    expect(shareClub(verifiedClubSeasonsOf(wrong), trent, mbappe)).toBeNull();
    const renamed = careerPlayers.map(p => p.name === mbappe ? { ...p, name: 'Kylian Mbappe' } : p);
    expect(shareClub(verifiedClubSeasonsOf(renamed), trent, 'Kylian Mbappe')).toBe('Real Madrid');
  });

  it('preserves independently verified active eligibility', () => {
    const active = playersUnderRule(careerPlayers, 'active');
    expect(active.some(p => p.name === trent)).toBe(false);
    expect(verifiedClubSeasonsOf(active, 'active').has(trent)).toBe(false);
  });

  it('updates changed minima and hints while holding puzzle order and unaffected objects', () => {
    const unaffected = { id: 'held', playerA: 'Cristiano Ronaldo', playerB: 'Wayne Rooney', minSteps: 1, hint: 'Held hint.' };
    const linked = { id: 'new-link', playerA: trent, playerB: mbappe, minSteps: 2, hint: 'Old two-step hint.', europe: null, active: null };
    const refreshed = refreshTransferPathPuzzles([unaffected, linked], careerPlayers);
    expect(refreshed.map(p => p.id)).toEqual(['held', 'new-link']);
    expect(refreshed[0]).toBe(unaffected);
    expect(refreshed[1]).toMatchObject({
      playerA: trent, playerB: mbappe, minSteps: 1,
      hint: 'Direct link. They were at Real Madrid together.', oneOptimalPath: [trent, mbappe],
      europe: { minSteps: 1, hint: 'Direct link. They were at Real Madrid together.' }, active: null,
    });
    expect(linked.minSteps).toBe(2);
    console.log(`TRANSFER_PATH_REFRESH ${JSON.stringify(refreshed[1])}`);
  });

  it('keeps unaffected pools and the reported daily minimum intact', () => {
    const puzzle = { id: 'tpa-770', playerA: trent, playerB: 'Victor Osimhen', minSteps: 3, hint: 'Held three-step hint.' };
    const pool = [puzzle];
    expect(refreshTransferPathPuzzles(pool, [])).toBe(pool);
    expect(refreshTransferPathPuzzles(pool, careerPlayers)[0]).toBe(puzzle);
  });
});
