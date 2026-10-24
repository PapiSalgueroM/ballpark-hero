import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import type { CareerState, CMPlayer } from '@/lib/clubManager';

type Case = { title: string; seed: number; age: number; years: number; ledger: 'absent' | 'null' | 'future' | 'malformed' | 'declined' };
type Probe = { title: string; frames: { stage: string; serialized: string }[]; draws: number[] };
const cases: Case[] = [
  { title: 'seed1457101 age39 covered absent ledger', seed: 1457101, age: 39, years: 4, ledger: 'absent' },
  { title: 'seed1457101 age39 expiring future ledger', seed: 1457101, age: 39, years: 1, ledger: 'future' },
  { title: 'seed1457101 age41 covered actual declined ledger', seed: 1457101, age: 41, years: 4, ledger: 'declined' },
  { title: 'seed1457101 age41 expiring null ledger', seed: 1457101, age: 41, years: 1, ledger: 'null' },
  { title: 'seed1457919 age39 covered malformed ledger', seed: 1457919, age: 39, years: 4, ledger: 'malformed' },
  { title: 'seed1457919 age39 expiring actual declined ledger', seed: 1457919, age: 39, years: 1, ledger: 'declined' },
  { title: 'seed1457919 age41 covered future ledger', seed: 1457919, age: 41, years: 4, ledger: 'future' },
  { title: 'seed1457919 age41 expiring absent ledger', seed: 1457919, age: 41, years: 1, ledger: 'absent' },
];
const probes: Probe[] = [];
beforeEach(() => {
  vi.resetModules(); localStorage.clear(); sessionStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-23T16:00:00Z'));
});
afterEach(() => {
  vi.restoreAllMocks(); vi.useRealTimers(); localStorage.clear(); sessionStorage.clear();
});
afterAll(() => {
  const output = process.env.CM_VETERAN_ROLLOVER_SNAPSHOT;
  if (output) writeFileSync(output, JSON.stringify(probes) + '\n', { flag: 'wx' });
});

describe('Frozen old whole-engine veteran rollover compatibility', { timeout: 120000 }, () => {
  it.each(cases)('records complete states and all draws: $title', async scenario => {
    let seed = scenario.seed;
    const draws: number[] = [], frames: Probe['frames'] = [];
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = seed * 16807 % 2147483647;
      const value = (seed - 1) / 2147483646; draws.push(value); return value;
    });
    const frame = (stage: string, value: unknown) => frames.push({ stage, serialized: JSON.stringify(value) });
    try {
      // Seed includes graph initialization, factory IDs, review and both real rollovers.
      const E = await import('@/lib/clubManager');
      const C = await import('@/lib/clubManagerCalendar');
      const W = await import('@/lib/clubManagerWorldRoster');
      const R = await import('@/lib/clubManagerVeteranRetirement');
      const { saveFence } = await import('@/lib/saveFence');
      saveFence.release(E.SAVE_KEY);
      const base = E.startCareer('Everton');
      frame('actual initialized career', base);
      const donor = base.squad.find(player => !player.onLoan);
      expect(donor, 'CM_VETERAN_OLD_PARITY_REAL_OWNED_DONOR').toBeDefined();
      if (!donor) throw new Error('The actual factory supplied no owned donor.');
      // Procedural fictional fixture, no claim about the donor or a real transfer.
      const veteran: CMPlayer = {
        ...donor, id: 'fictional-old-rollover-veteran', name: 'Fictional Rollover Veteran',
        generated: true, worldRosterKey: undefined, worldRosterSince: undefined,
        age: scenario.age, position: 'GK', rating: 85, potential: 85, value: 0.2,
        contractYears: scenario.years, wage: 3, role: 'rotation', lastTen: [1, 0, 1, 0],
        wantsOut: scenario.ledger === 'declined', onLoan: undefined,
        injuryWeeks: 0, suspendedMatches: 0, isYouth: false, academyGrad: false,
      };
      const input: CareerState = {
        ...base, budget: 500, live: null, pendingMove: null,
        squad: base.squad.map(player => player.id === donor.id ? veteran : player),
      };
      let career = W.recordWorldRosterTransfer(input, {
        player: veteran, from: 'Fictional Rollover Origin', to: input.clubName, kind: 'permanent', since: 0,
      });
      const owned = career.squad.find(player => player.id === veteran.id);
      expect(typeof owned?.worldRosterKey, 'CM_VETERAN_OLD_PARITY_CERTIFIED_KEY').toBe('string');
      if (!owned?.worldRosterKey) throw new Error('The real record builder did not certify the fixture.');
      const ledger = W.worldRosterView(career);
      const matches = ledger?.records.filter(row => row.key === owned.worldRosterKey) ?? [];
      expect(matches.length, 'CM_VETERAN_OLD_PARITY_CERTIFIED_ONE_ROW').toBe(1);
      expect(matches[0].owner).toBe(career.clubName);
      expect(matches[0].status).toBe('owned');
      expect(JSON.stringify(matches[0].player), 'CM_VETERAN_OLD_PARITY_CERTIFIED_FULL_PLAYER').toBe(JSON.stringify(owned));
      frame('actual certified owned input', career);
      const reviewInput = { ...career, live: null, week: career.calendar.length, pendingSummary: null };
      const finished = E.finishSeason(reviewInput);
      expect(finished.state.pendingSummary, 'CM_VETERAN_OLD_PARITY_REAL_REVIEW').toEqual(finished.summary);
      expect(finished.summary.season).toBe(finished.state.season);
      expect(finished.summary.club).toBe(finished.state.clubName);
      career = finished.state;
      frame('actual complete review result', finished);
      if (scenario.ledger === 'declined') {
        const count = draws.length;
        const preview = R.previewVeteranRetirement(career, veteran.id);
        expect(preview.kind, 'CM_VETERAN_OLD_PARITY_ACTUAL_DECLINE_OFFER').toBe('offer');
        if (preview.kind !== 'offer') throw new Error('The actual decline fixture has no offer.');
        expect(preview.decision, 'CM_VETERAN_OLD_PARITY_NO_AGREEMENT').toBe('declined');
        const declined = R.applyVeteranRetirement(career, veteran.id);
        expect(declined, 'CM_VETERAN_OLD_PARITY_ACTUAL_DECLINE').not.toBeNull();
        if (!declined) throw new Error('The actual deterministic decline was refused.');
        expect(draws.length, 'CM_VETERAN_OLD_PARITY_DECLINE_NO_DRAW').toBe(count);
        career = declined;
      } else if (scenario.ledger !== 'absent') {
        const raw: unknown = scenario.ledger === 'null' ? null
          : scenario.ledger === 'future' ? { v: 2, reviews: [], future: { keep: ['raw', 7] } }
          : { v: 1, reviews: [null] };
        career = { ...career, veteranReviews: raw };
      }
      const hadRaw = Object.prototype.hasOwnProperty.call(career, 'veteranReviews');
      const rawBefore = JSON.stringify(career.veteranReviews);
      frame('declared no-agreement review input', career);
      frame('actual calendar before rollover', C.seasonDays(career));
      for (let summer = 1; summer <= 2; summer++) {
        const before = career;
        career = E.startNextSeason(career);
        expect(career.season, 'CM_VETERAN_OLD_PARITY_REAL_ROLLOVER').toBe(before.season + 1);
        expect(career.live).toBeNull();
        expect(Object.prototype.hasOwnProperty.call(career, 'veteranReviews'),
          'CM_VETERAN_OLD_PARITY_RAW_OWN_PROPERTY').toBe(hadRaw);
        expect(JSON.stringify(career.veteranReviews), 'CM_VETERAN_OLD_PARITY_RAW_LEDGER_HELD').toBe(rawBefore);
        frame('actual complete rollover ' + summer, career);
        frame('actual calendar after rollover ' + summer, C.seasonDays(career));
      }
      expect(draws.length, 'CM_VETERAN_OLD_PARITY_REAL_FULL_DRAW_TAPE').toBeGreaterThan(0);
      expect(frames.length, 'CM_VETERAN_OLD_PARITY_REAL_FULL_FRAMES').toBe(9);
      probes.push({ title: scenario.title, frames, draws });
      saveFence.release(E.SAVE_KEY);
    } finally { random.mockRestore(); }
  });
});
