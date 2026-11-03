import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { clubKeyOf, leagueWorldForYear, leagueWorldOrder } from '@/lib/soccerCareerLeagueWorld';
import { cupSeason } from './fixtures/soccerSeasonCompetitions1173';

const E = (process.env.SC_EXTRA_CUPS_ENGINE
  ? await import(/* @vite-ignore */ process.env.SC_EXTRA_CUPS_ENGINE)
  : await import('@/lib/soccerCareerEngine')) as typeof import('@/lib/soccerCareerEngine');

type Entrant = { club: string; via: 'league-winner' | 'fa-cup-winner' | 'league-runner-up' };
type QualificationSource = { kind: 'phone-world' | 'league-world-close' | 'validated-player-fa-cup'; year: number };
type Qualification = {
  version: 1; competition: 'community-shield'; status: 'ready';
  qualifyingYear: number; eventYear: number; seed: number;
  leagueWinner: string; cupWinner: string; runnerUp?: string; entrants: [Entrant, Entrant];
  proof: { league: QualificationSource; cup: QualificationSource; runnerUp?: QualificationSource };
};
type Shield = {
  version: 1; competition: 'community-shield'; qualifyingYear: number; eventYear: number; seed: number;
  qualification: Qualification; entrants: [Entrant, Entrant]; minutes: 90; score: [number, number];
  decidedBy: 'normal-time' | 'penalties'; penalties?: [number, number]; winner: string;
  player: {
    club: string; availability: 'available' | 'unknown' | 'unavailable'; reason?: string;
    selected: boolean; apps: 0 | 1; goals: number; assists: number; cleanSheets: 0 | 1;
    rating: number | null; title: boolean;
  };
};
type CupFields = { extraCupQualification?: Qualification };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const sameClub = (a: string, b: string): boolean => clubKeyOf(a) === clubKeyOf(b);
const fields = (career: CareerState): CupFields => career as unknown as CupFields;
const shieldRows = (row: SeasonRecord): Shield[] => {
  const value = (row as unknown as { extraCups?: unknown }).extraCups;
  return Array.isArray(value) ? value.filter((item): item is Shield =>
    !!item && typeof item === 'object' && item.competition === 'community-shield') : [];
};
afterEach(() => vi.restoreAllMocks());

function draws<T>(action: () => T): { value: T; draws: number[] } {
  const values: number[] = [];
  const random = vi.spyOn(Math, 'random').mockImplementation(() => { values.push(0.9); return 0.9; });
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-31T12:00:00Z'));
  try { return { value: action(), draws: values }; }
  finally { random.mockRestore(); clock.mockRestore(); }
}
function fixture(): CareerState {
  const file = resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json');
  const saved = JSON.parse(readFileSync(file, 'utf8')) as { saves: { id: string; state: CareerState }[] };
  const original = saved.saves.find(item => item.id === 'ere');
  expect(original, 'the existing captured Eredivisie career must exist').toBeDefined();
  // This named QA copy is a simulated context, not a real result or a fully played transfer flow.
  const input = copy(original!.state);
  input.playerName = 'Shield acceptance fixture';
  input.phase = 'playing';
  return draws(() => E.repairCareer(input)).value;
}

describe('Soccer Career Community Shield first slice', () => {
  it('SC_SHIELD_QUALIFIED_MATCH: automatically plays the next opening match from an actual prospective close', () => {
    const before = fixture(), qualifyingYear = before.seasons[before.seasons.length - 1]!.year + 1;
    const oldWorld = leagueWorldForYear(before, E.FALLBACK_CLUBS, qualifyingYear);
    expect(oldWorld, 'the current public world API must provide the prospective close field').not.toBeNull();
    const englishOrder = leagueWorldOrder(oldWorld!, 'Premier League', before.playerName, E.FALLBACK_CLUBS);
    expect(englishOrder).toHaveLength(20);
    const closed = draws(() => E.advanceProSeason(copy(before), E.FALLBACK_CLUBS)).value;
    const closedRow = closed.seasons[closed.seasons.length - 1]!;
    expect(closedRow.year).toBe(qualifyingYear);
    expect(closedRow.injurySevere).toBe(false);
    expect(closed.phone?.world?.year).toBe(qualifyingYear);
    const leagueWinner = closed.phone!.world!.leagues['Premier League'];
    const cupWinner = closed.phone!.world!.cups?.['Premier League'];
    expect(leagueWinner).toBe(englishOrder[0]);
    expect(typeof cupWinner === 'string' && cupWinner.length > 0, 'the actual world tick must settle the FA Cup').toBe(true);
    const double = sameClub(leagueWinner, cupWinner!);
    const expectedEntrants: [Entrant, Entrant] = [
      { club: leagueWinner, via: 'league-winner' },
      { club: double ? englishOrder[1] : cupWinner!, via: double ? 'league-runner-up' : 'fa-cup-winner' },
    ];
    const represented = E.FALLBACK_CLUBS.find(club => sameClub(club.name, leagueWinner));
    expect(represented, 'the chosen actual simulated qualifier must exist in the current club table').toBeDefined();
    // Explicit after-window QA club binding. This does not claim an offer or loan was played.
    const opening: CareerState = { ...copy(closed), phase: 'playing', currentClub: represented!.name,
      currentClubCountry: represented!.country, currentClubTier: represented!.tier,
      currentClubColor: represented!.color, currentLeague: represented!.league };
    const absentReceipt = copy(opening);
    delete fields(absentReceipt).extraCupQualification;
    const heldOpening = JSON.stringify(opening), heldAbsent = JSON.stringify(absentReceipt);
    // Advance uses explicit working copies; fixture custody is not a whole-engine input-immutability claim.
    const actual = draws(() => E.advanceProSeason(copy(opening), E.FALLBACK_CLUBS));
    const annual = draws(() => E.advanceProSeason(copy(absentReceipt), E.FALLBACK_CLUBS));
    const resultRow = actual.value.seasons[actual.value.seasons.length - 1]!;
    const annualRow = annual.value.seasons[annual.value.seasons.length - 1]!;
    const matches = shieldRows(resultRow);
    expect(matches.length === 1,
      'SC_SHIELD_QUALIFIED_MATCH_MISSING: a real prospective close must produce one automatic qualified opening match').toBe(true);

    const receipt = fields(closed).extraCupQualification;
    expect(receipt?.status).toBe('ready');
    expect(receipt?.qualifyingYear).toBe(qualifyingYear);
    expect(receipt?.eventYear).toBe(qualifyingYear + 1);
    expect(receipt?.seed).toBe(closed.phone!.seed);
    expect(receipt?.leagueWinner).toBe(leagueWinner);
    expect(receipt?.cupWinner).toBe(cupWinner);
    expect(receipt?.entrants).toEqual(expectedEntrants);
    expect(receipt?.proof).toEqual({
      league: { kind: 'league-world-close', year: qualifyingYear },
      cup: { kind: 'phone-world', year: qualifyingYear },
      ...(double ? { runnerUp: { kind: 'league-world-close', year: qualifyingYear } } : {}),
    });
    if (double) expect(receipt?.runnerUp).toBe(englishOrder[1]);
    const match = matches[0];
    expect(match.qualification).toEqual(receipt);
    expect(match.entrants).toEqual(expectedEntrants);
    expect(match.qualifyingYear).toBe(qualifyingYear);
    expect(match.eventYear).toBe(qualifyingYear + 1);
    expect(match.seed).toBe(receipt!.seed);
    expect(match.minutes).toBe(90);
    expect(expectedEntrants.some(entry => sameClub(entry.club, match.winner))).toBe(true);
    expect(match.score.every(score => Number.isInteger(score) && score >= 0 && score <= 11)).toBe(true);
    if (match.score[0] === match.score[1]) {
      expect(match.decidedBy).toBe('penalties');
      expect(match.penalties?.every(score => Number.isInteger(score) && score >= 0)).toBe(true);
      expect(match.penalties![0]).not.toBe(match.penalties![1]);
    } else {
      expect(match.decidedBy).toBe('normal-time');
      expect(match.penalties).toBeUndefined();
      expect(match.winner).toBe(expectedEntrants[match.score[0] > match.score[1] ? 0 : 1].club);
    }
    expect(sameClub(match.player.club, represented!.name)).toBe(true);
    expect(match.player.apps).toBe(match.player.selected ? 1 : 0);
    expect(match.player.title).toBe(match.player.selected && sameClub(match.player.club, match.winner));
    const teamIndex = expectedEntrants.findIndex(entry => sameClub(entry.club, match.player.club));
    const teamGoals = match.score[teamIndex];
    expect(match.player.goals).toBeGreaterThanOrEqual(0);
    expect(match.player.goals).toBeLessThanOrEqual(teamGoals);
    expect(match.player.assists).toBeGreaterThanOrEqual(0);
    expect(match.player.assists).toBeLessThanOrEqual(teamGoals - match.player.goals);
    if (match.player.apps === 0) {
      expect([match.player.goals, match.player.assists, match.player.cleanSheets]).toEqual([0, 0, 0]);
      expect(match.player.rating).toBeNull();
    } else {
      expect(match.player.rating).toBeGreaterThanOrEqual(4);
      expect(match.player.rating).toBeLessThanOrEqual(10);
    }
    expect(shieldRows(annualRow)).toEqual([]);
    expect(actual.draws).toEqual(annual.draws);
    expect(actual.value.phone).toEqual(annual.value.phone);
    expect(resultRow.apps).toBe(annualRow.apps + match.player.apps);
    expect(resultRow.goals).toBe(annualRow.goals + match.player.goals);
    expect(resultRow.assists).toBe(annualRow.assists + match.player.assists);
    expect(resultRow.cleanSheets).toBe(annualRow.cleanSheets + match.player.cleanSheets);
    const weighted = match.player.apps === 0 ? annualRow.rating
      : Math.round((annualRow.rating * annualRow.apps + match.player.rating!) / (annualRow.apps + 1) * 10) / 10;
    expect(resultRow.rating).toBe(weighted);
    const { extraCups: omitted, ...withoutCup } = resultRow as SeasonRecord & { extraCups?: unknown };
    expect(omitted).toBeDefined();
    expect({ ...withoutCup, apps: annualRow.apps, goals: annualRow.goals, assists: annualRow.assists,
      cleanSheets: annualRow.cleanSheets, rating: annualRow.rating }).toEqual(annualRow);
    expect(JSON.stringify(opening)).toBe(heldOpening);
    expect(JSON.stringify(absentReceipt)).toBe(heldAbsent);
    const totals = E.getCareerTotals(actual.value.seasons);
    expect(totals.apps).toBe(actual.value.seasons.reduce((sum, row) => sum + row.apps, 0));
    expect(shieldRows(copy(resultRow))).toEqual(matches);
  });

  it('SC_SHIELD_PERSONAL_TITLE: counts a valid saved played win separately and never reapplies its recorded stats', () => {
    // Controlled simulated saved result. These clubs, scores, proof receipts and personal numbers are not real results.
    const qualification: Qualification = {
      version: 1, competition: 'community-shield', status: 'ready', qualifyingYear: 2026, eventYear: 2027,
      seed: 1141312389, leagueWinner: 'Arsenal', cupWinner: 'Newcastle',
      entrants: [{ club: 'Arsenal', via: 'league-winner' }, { club: 'Newcastle', via: 'fa-cup-winner' }],
      proof: { league: { kind: 'league-world-close', year: 2026 }, cup: { kind: 'phone-world', year: 2026 } },
    };
    const match: Shield = {
      version: 1, competition: 'community-shield', qualifyingYear: 2026, eventYear: 2027, seed: 1141312389,
      qualification: copy(qualification), entrants: copy(qualification.entrants),
      minutes: 90, score: [2, 1], decidedBy: 'normal-time', winner: 'Arsenal',
      player: { club: 'Arsenal', availability: 'available', selected: true, apps: 1, goals: 1, assists: 0,
        cleanSheets: 0, rating: 8, title: true },
    };
    const saved = { ...copy(cupSeason), apps: cupSeason.apps + 1, goals: cupSeason.goals + 1,
      rating: Math.round((cupSeason.rating * cupSeason.apps + 8) / (cupSeason.apps + 1) * 10) / 10,
      extraCups: [match] } as SeasonRecord;
    const held = JSON.stringify(saved), totals = E.getCareerTotals([saved]);
    const count = (totals as unknown as { communityShields?: unknown }).communityShields;
    expect(count === 1,
      'SC_SHIELD_PERSONAL_TITLE_MISSING: a saved played Community Shield win needs its own career trophy counter').toBe(true);

    expect(totals.domesticCups).toBe(1);
    expect(totals.leagueTitles).toBe(0);
    expect(totals.championsLeagues).toBe(0);
    expect(totals.clubCups).toBe(0);
    expect(totals.apps).toBe(cupSeason.apps + 1);
    expect(totals.goals).toBe(cupSeason.goals + 1);
    expect(totals.assists).toBe(cupSeason.assists);
    expect(saved.leagueApps).toBe(cupSeason.leagueApps);
    expect(E.getCareerTotals([copy(saved)])).toEqual(totals);
    expect(E.getCareerTotals([saved])).toEqual(totals);
    expect((E.getCareerTotals([cupSeason]) as unknown as { communityShields?: unknown }).communityShields).toBe(0);
    expect(JSON.stringify(saved)).toBe(held);
  });
});
