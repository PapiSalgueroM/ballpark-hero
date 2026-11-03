import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import * as Eras from '@/lib/careerEras';
import { clubKeyOf } from '@/lib/soccerCareerLeagueWorld';
import { isSoccerCareerSave } from '@/lib/soccerCareerSave';
import { readCommunityShield } from '@/lib/soccerCareerExtraCups';

const E = (process.env.SC_EXTRA_CUPS_ENGINE
  ? await import(/* @vite-ignore */ process.env.SC_EXTRA_CUPS_ENGINE)
  : await import('@/lib/soccerCareerEngine')) as typeof import('@/lib/soccerCareerEngine');
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const CLOCK = 1793448000000;
const same = (a: string, b: string): boolean => clubKeyOf(a) === clubKeyOf(b);
const STATS = ['apps', 'goals', 'assists', 'cleanSheets', 'rating'] as const;
afterEach(() => vi.restoreAllMocks());

describe('Soccer Career Community Shield severe opening', () => {
  it('SC_SHIELD_SEVERE_CONTRIBUTION: retains the selected opening before a controlled later severe injury', () => {
    const calls: Record<string, unknown>[] = [];
    const evidence: Record<string, unknown> = {
      scope: 'One fixed observed QA foundation and a controlled later injury collaborator, no natural injury or rate claim.',
      provenance: { run: '41545723262', record: 'cases/arsenal-00.json',
        sha256: 'b47212a7c7803cd3ac81273b4e72cfead18b346c29abba2f75f1defb71b9da5a' },
      calls,
    };
    function run(label: string, input: CareerState, action: (state: CareerState) => CareerState) {
      const working = copy(input), before = copy(working), draws: number[] = [];
      let state = 0;
      const random = vi.spyOn(Math, 'random').mockImplementation(() => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        const value = state / 4294967296; draws.push(value); return value;
      });
      const clock = vi.spyOn(Date, 'now').mockReturnValue(CLOCK);
      let output: CareerState | undefined;
      try {
        output = action(working);
        const result = { label, seed: 0, clock: CLOCK, before, after: copy(output),
          inputAfter: copy(working), draws, finalLcgState: state };
        calls.push(result);
        expect(isSoccerCareerSave(output), 'existing core save admission').toBe(true);
        return result;
      } catch (error) {
        if (!calls.some(call => call.label === label)) calls.push({ label, seed: 0, clock: CLOCK, before,
          after: output ? copy(output) : null, inputAfter: copy(working), draws, finalLcgState: state,
          error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error) });
        throw error;
      } finally { random.mockRestore(); clock.mockRestore(); }
    }
    let primary: unknown;
    try {
      const saved = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')) as
        { saves: { id: string; state: CareerState }[] };
      const original = saved.saves.find(row => row.id === 'ere')?.state;
      expect(original, 'held existing ere career').toBeDefined();
      const arsenal = E.FALLBACK_CLUBS.find(club => same(club.name, 'Arsenal'));
      expect(arsenal, 'actual Arsenal club-table foundation').toBeDefined();
      // Replays the already disclosed arsenal:0 QA profile, not a real transfer or development result.
      const lab: CareerState = { ...copy(original!), playerName: 'Shield annual witness', phase: 'playing',
        currentClub: arsenal!.name, currentClubCountry: arsenal!.country, currentClubTier: arsenal!.tier,
        currentClubColor: arsenal!.color, currentLeague: arsenal!.league,
        pace: 85, shooting: 85, passing: 85, dribbling: 85, defending: 85, physical: 85, reflexes: 85 };
      lab.overall = E.calcOverall(lab, lab.position);
      evidence.profileLab = { original: copy(original), changed: copy(lab) };
      const repaired = run('repair', lab, state => E.repairCareer(state));
      const closed = run('actual-close', repaired.after, state => E.advanceProSeason(state, E.FALLBACK_CLUBS));
      const close = closed.after, closeRow = close.seasons[close.seasons.length - 1]!;
      expect(close.phase).toBe('newspaper'); expect(closeRow.year).toBe(2029); expect(closeRow.injurySevere).toBe(false);
      const receipt = close.extraCupQualification;
      expect(receipt?.status).toBe('ready');
      if (!receipt || receipt.status !== 'ready') throw new Error('The actual prospective close must provide the ready fixture');
      expect(receipt.qualifyingYear).toBe(2029); expect(receipt.eventYear).toBe(2030); expect(receipt.seed).toBe(4272396692);
      expect(receipt.entrants).toEqual([{ club: 'Man City', via: 'league-winner' }, { club: 'Brighton', via: 'league-runner-up' }]);
      const represented = E.FALLBACK_CLUBS.find(club => same(club.name, receipt.entrants[0].club));
      expect(represented, 'actual qualifier club-table binding').toBeDefined();
      // Same labelled after-window club/consumer-phase copy as the observed witness, no offer or loan claim.
      const opening: CareerState = { ...copy(close), phase: 'playing', currentClub: represented!.name,
        currentClubCountry: represented!.country, currentClubTier: represented!.tier,
        currentClubColor: represented!.color, currentLeague: represented!.league };
      const absent = copy(opening); delete absent.extraCupQualification;
      const openingBytes = JSON.stringify(opening), absentBytes = JSON.stringify(absent);
      evidence.openingInput = copy(opening); evidence.absentInput = copy(absent);
      // The opening is frozen before this controlled later annual injury. No product test switch is used.
      const injury = vi.spyOn(Eras, 'rollSeasonInjury').mockReturnValue({ name: 'ACL rupture', weeks: 20, severe: true });
      let presentCall: ReturnType<typeof run>, absentCall: ReturnType<typeof run>;
      try {
        presentCall = run('opening-present', opening, state => E.advanceProSeason(state, E.FALLBACK_CLUBS));
        expect(injury.mock.calls).toHaveLength(1);
        injury.mockClear();
        absentCall = run('opening-absent', absent, state => E.advanceProSeason(state, E.FALLBACK_CLUBS));
        expect(injury.mock.calls).toHaveLength(1);
      } finally { injury.mockRestore(); }
      const actual = presentCall.after, annual = absentCall.after;
      const row = actual.seasons[actual.seasons.length - 1]!, oldRow = annual.seasons[annual.seasons.length - 1]!;
      evidence.actualRow = copy(row); evidence.annualRow = copy(oldRow);
      expect(actual.phase).toBe('rehab_choice'); expect(annual.phase).toBe('rehab_choice');
      for (const output of [row, oldRow]) {
        expect(output.type).toBe('playing'); expect(output.year).toBe(2030);
        expect(output.injury).toBe('ACL rupture'); expect(output.injuryWeeks).toBe(20); expect(output.injurySevere).toBe(true);
      }
      // This primary owner precedes strict reader capacity checks, so omission cannot hide behind a null reader.
      expect(row.apps, 'SC_SHIELD_SEVERE_CONTRIBUTION_MISSING: the selected opening app must survive the later severe injury').toBe(oldRow.apps + 1);
      const match = readCommunityShield(row);
      expect(match).not.toBeNull(); expect(readCommunityShield(oldRow)).toBeNull();
      expect(row.extraCups).toHaveLength(1); expect(oldRow.extraCups).toBeUndefined();
      expect(match!.qualification).toEqual(receipt);
      expect(match!.score).toEqual([3, 1]); expect(match!.decidedBy).toBe('normal-time'); expect(match!.winner).toBe('Man City');
      expect(match!.player).toEqual({ club: 'Man City', availability: 'available', selected: true,
        apps: 1, goals: 1, assists: 2, cleanSheets: 0, rating: 7.5, title: true });
      expect(row.goals).toBe(oldRow.goals + 1); expect(row.assists).toBe(oldRow.assists + 2);
      expect(row.cleanSheets).toBe(oldRow.cleanSheets);
      expect(row.rating).toBe(Math.round((oldRow.rating * oldRow.apps + 7.5) / (oldRow.apps + 1) * 10) / 10);
      expect(presentCall.draws).toEqual(absentCall.draws); expect(presentCall.finalLcgState).toBe(absentCall.finalLcgState);
      expect(actual.phone).toEqual(annual.phone); expect(actual.leagueWorld).toEqual(annual.leagueWorld);
      expect(actual.pendingRehab).toEqual(annual.pendingRehab);
      expect(actual.pendingSummary).toEqual(annual.pendingSummary);
      expect(actual.pendingSummary).toEqual(opening.pendingSummary);
      expect(actual.seasons.slice(0, -1)).toEqual(annual.seasons.slice(0, -1));
      expect(actual.seasons.slice(0, -1)).toEqual(opening.seasons);
      expect(actual.extraCupQualification).toEqual(opening.extraCupQualification);
      expect(Object.prototype.hasOwnProperty.call(actual, 'extraCupQualification')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(annual, 'extraCupQualification')).toBe(false);
      const normalized = copy(row);
      delete normalized.extraCups;
      for (const key of STATS) normalized[key] = oldRow[key];
      expect(normalized).toEqual(oldRow);
      const normalizedCareer = copy(actual), annualCareer = copy(annual);
      delete normalizedCareer.extraCupQualification; delete annualCareer.extraCupQualification;
      normalizedCareer.seasons[normalizedCareer.seasons.length - 1] = normalized;
      expect(normalizedCareer).toEqual(annualCareer);
      expect(JSON.stringify(opening)).toBe(openingBytes); expect(JSON.stringify(absent)).toBe(absentBytes);
    } catch (error) { primary = error; }
    finally {
      const file = process.env.SC_SHIELD_SEVERE_EVIDENCE;
      if (file) {
        evidence.primary = primary instanceof Error ? { name: primary.name, message: primary.message, stack: primary.stack } : primary ?? null;
        try { writeFileSync(file, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' }); }
        catch (error) { if (!primary) primary = error; else console.error('Secondary severe evidence retention failure', error); }
      }
    }
    if (primary) throw primary;
  });
});
