import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as E from '@/lib/soccerCareerEngine';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import {
  careerOpeningAnnualStats, communityShieldAnnualStats, communityShieldSeasonStats,
  germanSupercupSeasonStats, readCommunityShield, readGermanSupercup,
  type CommunityShieldResult, type GermanSupercupReadyQualification, type GermanSupercupResult,
} from '@/lib/soccerCareerExtraCups';
import { deriveSeason } from '@/lib/season/core';
import { SOCCER, buildSoccerSeasonCtx, soccerSeasonKey } from '@/lib/season/soccer';
import { answerSoccerPress, pressRoomView, settleSoccerPress } from '@/lib/soccerCareerPress';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import { cupSeason } from './fixtures/soccerSeasonCompetitions1173';

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const five = (row: Pick<SeasonRecord, 'apps' | 'goals' | 'assists' | 'cleanSheets' | 'rating'>) => ({
  apps: row.apps, goals: row.goals, assists: row.assists, cleanSheets: row.cleanSheets, rating: row.rating,
});
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

function baseCareer(): CareerState {
  const saved = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')) as
    { saves: { id: string; state: CareerState }[] };
  const before = saved.saves.find(row => row.id === 'ere')?.state;
  expect(before, 'existing raw career fixture').toBeDefined();
  return E.repairCareer(copy(before!));
}

// These are controlled saved-data labs, not real scores or naturally played transfers.
function germanFixture(annualApps = 42, annualRating = 7.2) {
  const annual: SeasonRecord = { ...copy(cupSeason), club: 'Bayern Munich', clubCountry: 'Germany', clubTier: 1,
    domesticCup: false, apps: annualApps, leagueApps: Math.min(30, annualApps),
    goals: annualApps ? 14 : 0, assists: annualApps ? 9 : 0, cleanSheets: 0,
    yellowCards: annualApps ? 2 : 0, redCards: 0, rating: annualApps ? annualRating : 0 };
  delete annual.cupRun;
  const qualification: GermanSupercupReadyQualification = {
    version: 1, competition: 'german-supercup', status: 'ready', qualifyingYear: 2026, eventYear: 2027,
    seed: 1141312389, leagueWinner: 'Bayern Munich', cupWinner: 'Dortmund',
    entrants: [{ club: 'Bayern Munich', via: 'league-winner' }, { club: 'Dortmund', via: 'dfb-pokal-winner' }],
    proof: { league: { kind: 'league-world-close', year: 2026 }, cup: { kind: 'phone-world', year: 2026 } },
  };
  const match: GermanSupercupResult = {
    version: 1, competition: 'german-supercup', qualifyingYear: 2026, eventYear: 2027, seed: 1141312389,
    qualification, entrants: copy(qualification.entrants), minutes: 90, score: [2, 1], decidedBy: 'normal-time',
    winner: 'Bayern Munich', annualRating: annual.rating,
    player: { club: 'Bayern Munich', availability: 'available', selected: true, apps: 1, goals: 1,
      assists: 0, cleanSheets: 0, rating: 8, title: true },
  };
  const row: SeasonRecord = { ...copy(annual), ...germanSupercupSeasonStats(annual, match), germanSupercup: match };
  return { annual, row, match, qualification };
}
function asCareer(row: SeasonRecord): CareerState {
  const club = E.FALLBACK_CLUBS.find(value => value.name === row.club);
  expect(club, 'held represented club profile').toBeDefined();
  return { ...baseCareer(), playerName: 'German annual fixture', position: 'ST', currentClub: row.club,
    currentClubCountry: row.clubCountry, currentClubTier: row.clubTier, currentClubColor: club!.color,
    currentLeague: club!.league, phase: 'playing', retired: false, awards: [], seasons: [row] };
}
function plan(row: SeasonRecord) {
  return deriveSeason(SOCCER, row, buildSoccerSeasonCtx(asCareer(row), E.FALLBACK_CLUBS, row));
}
function settledGerman(annualApps = 42) {
  const fixture = germanFixture(annualApps), source: SeasonRecord = { ...copy(fixture.annual), year: 2026, age: 22,
    apps: 30, leagueApps: 30, goals: 12, assists: 6, rating: 7 };
  const starting = asCareer(source);
  starting.popularity = 50; starting.morale = 50; delete starting.pressRoom;
  const answered = answerSoccerPress(starting, 'ambitious');
  expect(answered.pressRoom?.history[0].promise?.target, 'real public Press promise foundation').toBe(15);
  answered.seasons.push(fixture.annual);
  settleSoccerPress(answered, fixture.annual);
  const promise = copy(answered.pressRoom!.history[0].promise!);
  // The engine settles the annual promise before the separate opening contribution is merged.
  fixture.annual.germanSupercup = copy(fixture.match);
  Object.assign(fixture.annual, germanSupercupSeasonStats(fixture.annual, fixture.match));
  return { state: answered, row: fixture.annual, promise };
}
function settledEnglishLegacy(): CareerState {
  const annual: SeasonRecord = { ...copy(cupSeason), domesticCup: false };
  delete annual.cupRun;
  const source: SeasonRecord = { ...copy(annual), year: 2026, age: 22, apps: 30, leagueApps: 30, goals: 12, assists: 6, rating: 7 };
  const start = { ...asCareer(source), currentLeague: 'Premier League' };
  start.popularity = 50; start.morale = 50; delete start.pressRoom;
  const answered = answerSoccerPress(start, 'ambitious');
  expect(answered.pressRoom?.history[0].promise?.target, 'existing English public promise').toBe(15);
  answered.seasons.push(annual); settleSoccerPress(answered, annual);
  const qualification: CommunityShieldResult['qualification'] = {
    version: 1, competition: 'community-shield', status: 'ready', qualifyingYear: 2026, eventYear: 2027,
    seed: 1141312389, leagueWinner: 'Arsenal', cupWinner: 'Newcastle',
    entrants: [{ club: 'Arsenal', via: 'league-winner' }, { club: 'Newcastle', via: 'fa-cup-winner' }],
    proof: { league: { kind: 'league-world-close', year: 2026 }, cup: { kind: 'phone-world', year: 2026 } },
  };
  const legacy: CommunityShieldResult = {
    version: 1, competition: 'community-shield', qualifyingYear: 2026, eventYear: 2027, seed: 1141312389,
    qualification, entrants: copy(qualification.entrants), minutes: 90, score: [2, 1], decidedBy: 'normal-time', winner: 'Arsenal',
    player: { club: 'Arsenal', availability: 'available', selected: true, apps: 1, goals: 1,
      assists: 0, cleanSheets: 0, rating: 8, title: true },
  };
  annual.extraCups = [legacy]; Object.assign(annual, communityShieldSeasonStats(annual, legacy));
  return answered;
}

describe('Soccer Career German opening annual consumers and storage', () => {
  it('SC_GERMAN_ANNUAL_LEAGUE: keeps the exact annual key and complete league plan', () => {
    const { annual, row, match } = germanFixture(), held = JSON.stringify({ annual, row });
    const before = plan(annual);
    expect(before, 'controlled annual plan foundation').not.toBeNull();
    expect(readGermanSupercup(row)).toEqual(match);
    expect(careerOpeningAnnualStats(row)).toEqual(five(annual));
    expect(soccerSeasonKey('German annual fixture', row), 'SC_GERMAN_ANNUAL_KEY')
      .toBe('German annual fixture|Bayern Munich|2027|42|14|9|7.2|centre');
    const after = plan(row);
    expect(after, 'SC_GERMAN_ANNUAL_PLAN').toEqual(before);
    const shown = after!.games.filter(game => game.played), bucket = after!.bucket;
    expect(shown.length + (bucket?.apps ?? 0)).toBe(42);
    expect(shown.reduce((sum, game) => sum + (game.line.goals ?? 0), 0) + (bucket?.line.goals ?? 0)).toBe(14);
    expect(JSON.stringify({ annual, row })).toBe(held);
  });

  it('SC_GERMAN_ANNUAL_PROOF: uses captured grade and refuses corrupt evidence before any league key', () => {
    const { annual, match } = germanFixture(5, 6.1);
    annual.goals = 2; annual.assists = 1;
    const row: SeasonRecord = { ...annual, ...germanSupercupSeasonStats(annual, match), germanSupercup: match };
    expect(row.rating).toBe(6.4);
    expect(careerOpeningAnnualStats(row)).toEqual(five(annual));
    expect(soccerSeasonKey('German annual fixture', row)).toBe('German annual fixture|Bayern Munich|2027|5|2|1|6.1|centre');
    const bad = copy(row); bad.germanSupercup!.annualRating = 6.2;
    expect(careerOpeningAnnualStats(bad)).toBeNull();
    expect(soccerSeasonKey('German annual fixture', bad), 'SC_GERMAN_ANNUAL_CORRUPT_KEY').toBeNull();
    expect(plan(bad)).toBeNull();
    const bench = copy(match);
    delete bench.annualRating;
    bench.player = { ...bench.player, selected: false, apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: null, title: false };
    const unselected: SeasonRecord = { ...copy(annual), germanSupercup: bench };
    expect(careerOpeningAnnualStats(unselected)).toEqual(five(annual));
    expect(soccerSeasonKey('German annual fixture', unselected)).toBe(soccerSeasonKey('German annual fixture', annual));
    const zero = germanFixture(0);
    expect(readGermanSupercup(zero.row)).toEqual(zero.match);
    expect(careerOpeningAnnualStats(zero.row)).toEqual(five(zero.annual));
    expect(soccerSeasonKey('German annual fixture', zero.row)).toBeNull();
  });

  it('SC_GERMAN_PRESS_ANNUAL: preserves the annual promise and strict final answer source', () => {
    const { state, row, promise } = settledGerman(), held = JSON.stringify(state);
    expect(row.goals).toBe(15); expect(promise.actual).toBe(14); expect(promise.outcome).toBe('missed');
    const view = pressRoomView(state);
    expect(view.history.length, 'SC_GERMAN_PRESS_ANNUAL_HISTORY').toBe(1);
    expect(view.history[0].promise).toEqual(promise);
    expect(JSON.stringify(state)).toBe(held);
    const answered = answerSoccerPress(state, 'calm'), source = answered.pressRoom!.history.find(item => item.source.index === 1)!.source;
    expect(pressRoomView(answered).history).toHaveLength(2);
    expect(source.apps).toBe(row.apps); expect(source.goals).toBe(row.goals); expect(source.rating).toBe(row.rating);
    const broken = copy(answered); broken.pressRoom!.history.find(item => item.source.index === 1)!.source.apps -= 1;
    expect(pressRoomView(broken).history).toEqual([]);
    const wrong = copy(state); wrong.seasons[1].germanSupercup!.qualification.proof.cup.year -= 1;
    expect(pressRoomView(wrong).history, 'SC_GERMAN_PRESS_INVALID_PROOF').toEqual([]);
  });

  it('SC_GERMAN_PRESS_LEGACY: keeps the English actualRating fallback and blocks German fallthrough', () => {
    const state = settledEnglishLegacy(), row = state.seasons[1], held = JSON.stringify(state);
    expect(readCommunityShield(row)?.player.apps).toBe(1);
    expect(own(row.extraCups![0], 'annualRating')).toBe(false);
    expect(communityShieldAnnualStats(row)).toBeNull();
    expect(pressRoomView(state).history.length, 'SC_GERMAN_PRESS_ENGLISH_FALLBACK').toBe(1);
    for (const value of [undefined, null, { competition: 'german-supercup', version: 99 }]) {
      const bad = copy(state);
      (bad.seasons[1] as unknown as { germanSupercup: unknown }).germanSupercup = value;
      expect(pressRoomView(bad).history, 'SC_GERMAN_PRESS_NO_LEGACY_FALLTHROUGH').toEqual([]);
    }
    expect(JSON.stringify(state)).toBe(held);
  });

  it('SC_GERMAN_PRESS_ZERO: keeps a proven zero-annual-app promise excused', () => {
    const { state, row, promise } = settledGerman(0);
    expect(row.apps).toBe(1); expect(row.germanSupercup!.annualRating).toBe(0);
    expect(promise.outcome).toBe('excused'); expect(promise.actual).toBe(0); expect(promise.actualRating).toBe(0);
    expect(pressRoomView(state).history.length, 'SC_GERMAN_PRESS_ZERO_HISTORY').toBe(1);
    const wrong = copy(state); wrong.pressRoom!.history[0].promise!.actualRating = 7;
    expect(pressRoomView(wrong).history).toEqual([]);
  });

  it.each(['literal', 'history', 'whole'] as const)('SC_GERMAN_CODEC %s: preserves complete German fields and pending mirror', mode => {
    const { row, qualification } = germanFixture();
    const english = copy(settledEnglishLegacy().seasons[1].extraCups![0]);
    english.player = { club: row.club, availability: 'unavailable', reason: 'not-entrant', selected: false,
      apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: null, title: false };
    row.extraCups = [english];
    const state = asCareer(row);
    state.extraCupQualification = copy(english.qualification);
    state.germanSupercupQualification = copy(qualification); state.pendingSummary = copy(row);
    (state as unknown as { codecMarker: unknown }).codecMarker = { nested: { note: 'unknown saved field stays exact' } };
    if (mode === 'history') state.seasons = Array.from({ length: 90 }, () => copy(row));
    if (mode === 'whole') (state as unknown as { codecPadding: string }).codecPadding = 'German codec storage lab.'.repeat(4000);
    // Repeated rows and padding force codec formats only. They are not a played career or size-budget evidence.
    const held = JSON.stringify(state);
    expect(isSoccerCareerSave(state), 'existing required-core admission').toBe(true);
    const serialized = serializeSoccerCareerSave(state), packed = JSON.parse(serialized) as { seasons: unknown };
    if (mode === 'literal') expect(serialized).toBe(held);
    else expect((packed.seasons as { format: string }).format).toBe(mode === 'history' ? 'lz-string-utf16' : 'lz-string-utf16-career');
    const parsed = parseSoccerCareerSave(serialized) as CareerState;
    expect(isSoccerCareerSave(parsed)).toBe(true);
    expect(JSON.stringify(parsed), 'SC_GERMAN_CODEC_COMPLETE').toBe(held);
    expect(readGermanSupercup(parsed.seasons[0])).toEqual(row.germanSupercup);
    expect(parsed.pendingSummary!.germanSupercup).toEqual(row.germanSupercup);
    const repaired = E.repairCareer(copy(parsed));
    expect(repaired.germanSupercupQualification).toEqual(qualification);
    expect(repaired.seasons[0].germanSupercup).toEqual(row.germanSupercup);
    expect(repaired.pendingSummary!.germanSupercup).toEqual(row.germanSupercup);
    expect(parsed.seasons[0].extraCups).toEqual([english]);
    expect(repaired.seasons[0].extraCups).toEqual([english]);
    expect(repaired.extraCupQualification).toEqual(english.qualification);
    expect(JSON.stringify(state)).toBe(held);
  });

  it('SC_GERMAN_CODEC_UNKNOWN: stores malformed optional evidence without validating or backfilling it', () => {
    const state = asCareer(germanFixture().annual);
    delete state.germanSupercupQualification;
    (state.seasons[0] as unknown as { germanSupercup: unknown }).germanSupercup = { version: 99, unexpected: { raw: 'kept' } };
    const held = JSON.stringify(state), parsed = parseSoccerCareerSave(serializeSoccerCareerSave(state)) as CareerState;
    expect(isSoccerCareerSave(parsed)).toBe(true);
    expect(JSON.stringify(parsed)).toBe(held);
    expect(readGermanSupercup(parsed.seasons[0])).toBeNull();
    const repaired = E.repairCareer(copy(parsed));
    expect(repaired.seasons[0].germanSupercup).toEqual(parsed.seasons[0].germanSupercup);
    expect(own(repaired, 'germanSupercupQualification'), 'SC_GERMAN_CODEC_NO_BACKFILL').toBe(false);
  });
});
