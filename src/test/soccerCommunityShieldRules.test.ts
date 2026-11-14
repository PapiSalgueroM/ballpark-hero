import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { getCareerTotals, repairCareer } from '@/lib/soccerCareerEngine';
import { readCommunityShield, countCommunityShields, communityShieldWinningSeasons } from '@/lib/soccerCareerExtraCups';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import { cupSeason } from './fixtures/soccerSeasonCompetitions1173';

type Entrant = { club: string; via: 'league-winner' | 'fa-cup-winner' | 'league-runner-up' };
type Source = { kind: 'phone-world' | 'league-world-close' | 'validated-player-fa-cup'; year: number };
type Qualification = {
  version: 1; competition: 'community-shield'; status: 'ready'; qualifyingYear: number; eventYear: number; seed: number;
  leagueWinner: string; cupWinner: string; runnerUp?: string; entrants: [Entrant, Entrant];
  proof: { league: Source; cup: Source; runnerUp?: Source };
};
type Shield = {
  version: 1; competition: 'community-shield'; qualifyingYear: number; eventYear: number; seed: number;
  qualification: Qualification; entrants: [Entrant, Entrant]; minutes: 90; score: [number, number];
  decidedBy: 'normal-time' | 'penalties'; penalties?: [number, number]; winner: string;
  player: { club: string; availability: 'available' | 'unknown' | 'unavailable'; reason?: string;
    selected: boolean; apps: 0 | 1; goals: number; assists: number; cleanSheets: 0 | 1; rating: number | null; title: boolean };
};
type SavedRow = SeasonRecord & { extraCups: Shield[] };
type Raw = Record<string, unknown>;
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const raw = (value: unknown): Raw => value as Raw;
const matchOf = (row: SeasonRecord): Raw => raw((raw(row).extraCups as unknown[])[0]);
const qualificationOf = (row: SeasonRecord): Raw => raw(matchOf(row).qualification);
const proofOf = (row: SeasonRecord): Raw => raw(qualificationOf(row).proof);
const playerOf = (row: SeasonRecord): Raw => raw(matchOf(row).player);

// These are labelled simulated saved results. They do not claim real matches or earned qualification.
function savedRow(year = 2027): SavedRow {
  const qualification: Qualification = {
    version: 1, competition: 'community-shield', status: 'ready', qualifyingYear: year - 1, eventYear: year,
    seed: 1141312389, leagueWinner: 'Arsenal', cupWinner: 'Newcastle',
    entrants: [{ club: 'Arsenal', via: 'league-winner' }, { club: 'Newcastle', via: 'fa-cup-winner' }],
    proof: { league: { kind: 'league-world-close', year: year - 1 }, cup: { kind: 'phone-world', year: year - 1 } },
  };
  const match: Shield = {
    version: 1, competition: 'community-shield', qualifyingYear: year - 1, eventYear: year,
    seed: qualification.seed, qualification, entrants: copy(qualification.entrants), minutes: 90,
    score: [2, 1], decidedBy: 'normal-time', winner: 'Arsenal',
    player: { club: 'Arsenal', availability: 'available', selected: true, apps: 1, goals: 1, assists: 0,
      cleanSheets: 0, rating: 8, title: true },
  };
  return { ...copy(cupSeason), year, apps: cupSeason.apps + 1, goals: cupSeason.goals + 1,
    rating: Math.round((cupSeason.rating * cupSeason.apps + 8) / (cupSeason.apps + 1) * 10) / 10,
    extraCups: [match] } as unknown as SavedRow;
}
function noAppearance(row: SavedRow, availability: 'available' | 'unknown' | 'unavailable' = 'available'): SavedRow {
  const value = copy(row);
  value.extraCups[0].player = { club: value.club, availability, reason: 'Labelled QA availability context.',
    selected: false, apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: null, title: false };
  return value;
}
function refuses(row: SeasonRecord, label: string): void {
  const held = JSON.stringify(row);
  expect(readCommunityShield(row), 'SC_SHIELD_RULE_REFUSAL: ' + label).toBeNull();
  expect(countCommunityShields([row]), 'SC_SHIELD_RULE_NO_TITLE: ' + label).toBe(0);
  expect(communityShieldWinningSeasons([row]), 'SC_SHIELD_RULE_NO_WIN_ROW: ' + label).toEqual([]);
  expect(JSON.stringify(row), 'reader custody: ' + label).toBe(held);
}
function accepts(row: SavedRow, label: string): void {
  const held = JSON.stringify(row);
  expect(readCommunityShield(row), 'SC_SHIELD_RULE_VALID: ' + label).toEqual(row.extraCups[0]);
  expect(JSON.stringify(row), 'reader custody: ' + label).toBe(held);
}
function codecCareer(row: SavedRow): CareerState {
  const file = resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json');
  const source = JSON.parse(readFileSync(file, 'utf8')) as { saves: { id: string; state: CareerState }[] };
  const original = source.saves.find(entry => entry.id === 'ere');
  expect(original, 'existing captured codec foundation').toBeDefined();
  const career = repairCareer(copy(original!.state));
  career.seasons = [...career.seasons, copy(row)];
  career.age = row.age;
  career.currentClub = row.club;
  career.currentClubCountry = row.clubCountry;
  career.currentClubTier = row.clubTier;
  career.currentLeague = 'Premier League';
  career.phase = 'playing';
  career.pendingSummary = null;
  // Storage-only QA context, not a transfer action, new annual result or earned source receipt.
  return career;
}

describe('Soccer Career Community Shield saved rules', () => {
  it('SC_SHIELD_RULES_VALID: reads complete saved wins and preserves nonwinning personal outcomes', () => {
    const row = savedRow();
    const held = JSON.stringify(row);
    const random = vi.spyOn(Math, 'random');
    const clock = vi.spyOn(Date, 'now');
    try {
      accepts(row, 'complete played win');
      expect(countCommunityShields([row])).toBe(1);
      expect(communityShieldWinningSeasons([row])).toEqual([row]);
      const lost = copy(row);
      lost.extraCups[0].score = [1, 2]; lost.extraCups[0].winner = 'Newcastle'; lost.extraCups[0].player.title = false;
      accepts(lost, 'selected losing finalist');
      expect(countCommunityShields([lost])).toBe(0);
      for (const availability of ['available', 'unknown'] as const) {
        const missed = noAppearance(row, availability);
        accepts(missed, availability + ' without an appearance');
        expect(countCommunityShields([missed])).toBe(0);
      }
      const otherClub = noAppearance(row, 'unavailable');
      otherClub.club = 'Chelsea'; otherClub.extraCups[0].player.club = 'Chelsea';
      accepts(otherClub, 'different represented club, no personal participation');
      expect(countCommunityShields([otherClub])).toBe(0);
      expect(random).not.toHaveBeenCalled(); expect(clock).not.toHaveBeenCalled();
      expect(JSON.stringify(row)).toBe(held);
    } finally { random.mockRestore(); clock.mockRestore(); }
  });

  it('SC_SHIELD_RULES_QUALIFICATION: refuses malformed year seed entrant and source proof', () => {
    const zero = savedRow(); zero.extraCups[0].seed = 0; zero.extraCups[0].qualification.seed = 0;
    accepts(zero, 'uint32 zero seed');
    const double = savedRow();
    double.extraCups[0].qualification.cupWinner = 'Arsenal';
    double.extraCups[0].qualification.runnerUp = 'Newcastle';
    double.extraCups[0].qualification.entrants[1].via = 'league-runner-up';
    double.extraCups[0].qualification.proof.runnerUp = { kind: 'league-world-close', year: 2026 };
    double.extraCups[0].entrants = copy(double.extraCups[0].qualification.entrants);
    accepts(double, 'complete double-winner runner-up proof');
    const cases: [string, (row: SavedRow) => void][] = [
      ['missing embedded proof', row => { delete matchOf(row).qualification; }],
      ['unknown qualification version', row => { qualificationOf(row).version = 2; }],
      ['partial proof cannot become ready', row => { qualificationOf(row).status = 'partial'; }],
      ['wrong competition', row => { qualificationOf(row).competition = 'different-cup'; }],
      ['nonconsecutive source year', row => { qualificationOf(row).qualifyingYear = 2024; }],
      ['wrong source kind for league', row => { raw(proofOf(row).league).kind = 'validated-player-fa-cup'; }],
      ['wrong source year', row => { raw(proofOf(row).cup).year = 2025; }],
      ['missing cup source', row => { delete proofOf(row).cup; }],
      ['wrong source kind for cup', row => { raw(proofOf(row).cup).kind = 'league-world-close'; }],
      ['negative seed', row => { qualificationOf(row).seed = -1; matchOf(row).seed = -1; }],
      ['fractional seed', row => { qualificationOf(row).seed = 0.5; matchOf(row).seed = 0.5; }],
      ['seed beyond uint32', row => { qualificationOf(row).seed = 4294967296; matchOf(row).seed = 4294967296; }],
      ['canonical duplicate entrants', row => { row.extraCups[0].qualification.entrants[1].club = ' ARSENAL '; row.extraCups[0].entrants = copy(row.extraCups[0].qualification.entrants); }],
      ['cup winner contradicts entrant', row => { qualificationOf(row).cupWinner = 'Chelsea'; }],
    ];
    for (const [label, change] of cases) { const bad = savedRow(); change(bad); refuses(bad, label); }
    for (const [label, change] of [
      ['missing actual runner-up', (row: SavedRow) => { delete qualificationOf(row).runnerUp; }],
      ['missing runner-up proof', (row: SavedRow) => { delete proofOf(row).runnerUp; }],
      ['phone winner does not prove runner-up', (row: SavedRow) => { raw(proofOf(row).runnerUp).kind = 'phone-world'; }],
      ['runner-up contradicts entrant', (row: SavedRow) => { qualificationOf(row).runnerUp = 'Chelsea'; }],
    ] as [string, (row: SavedRow) => void][]) { const bad = copy(double); change(bad); refuses(bad, label); }
  });

  it('SC_SHIELD_RULES_BINDING: binds the stored result to its row and complete qualification', () => {
    const cases: [string, (row: SavedRow) => void][] = [
      ['missing result version', row => { delete matchOf(row).version; }],
      ['unsupported result version', row => { matchOf(row).version = 2; }],
      ['result year differs from row', row => { row.year = 2028; }],
      ['result year differs from proof', row => { matchOf(row).eventYear = 2028; }],
      ['result qualifying year differs', row => { matchOf(row).qualifyingYear = 2025; }],
      ['result seed differs', row => { matchOf(row).seed = 1; }],
      ['result entrant order differs', row => { row.extraCups[0].entrants.reverse(); }],
      ['entrant route differs', row => { row.extraCups[0].entrants[1].via = 'league-runner-up'; }],
      ['represented club differs from row', row => { row.extraCups[0].player.club = 'Newcastle'; }],
      ['academy row cannot earn this event', row => { row.type = 'youth'; }],
      ['retirement row cannot earn this event', row => { row.type = 'retired'; }],
      ['row has no room for its recorded appearance', row => { row.apps = 0; }],
      ['row has no room for its recorded goal', row => { row.goals = 0; }],
    ];
    for (const [label, change] of cases) { const bad = savedRow(); change(bad); refuses(bad, label); }
    const unsupported = savedRow(2024); refuses(unsupported, 'before supported modern event years');
    const multiple = savedRow(); multiple.extraCups.push(copy(multiple.extraCups[0])); refuses(multiple, 'duplicate edition in one row');
  });

  it('SC_SHIELD_RULES_DECIDER: keeps ninety-minute scores and actual shootout totals separate', () => {
    const pens = savedRow(); pens.extraCups[0].score = [1, 1]; pens.extraCups[0].decidedBy = 'penalties'; pens.extraCups[0].penalties = [4, 3];
    accepts(pens, 'saved direct-penalty win');
    const awayPens = copy(pens); awayPens.extraCups[0].penalties = [3, 4]; awayPens.extraCups[0].winner = 'Newcastle'; awayPens.extraCups[0].player.title = false;
    accepts(awayPens, 'saved losing direct-penalty result');
    const cases: [string, (row: SavedRow) => void][] = [
      ['wrong match duration', row => { matchOf(row).minutes = 120; }],
      ['negative normal score', row => { row.extraCups[0].score[0] = -1; }],
      ['fractional normal score', row => { row.extraCups[0].score[0] = 1.5; }],
      ['score beyond actual Poisson bound', row => { row.extraCups[0].score[0] = 12; }],
      ['not a two-score pair', row => { matchOf(row).score = [2, 1, 0]; }],
      ['winner contradicts normal score', row => { row.extraCups[0].winner = 'Newcastle'; row.extraCups[0].player.title = false; }],
      ['penalties on unequal normal score', row => { row.extraCups[0].decidedBy = 'penalties'; row.extraCups[0].penalties = [4, 3]; }],
      ['penalty numbers on normal-time result', row => { row.extraCups[0].penalties = [4, 3]; }],
      ['extra-time decider unsupported', row => { matchOf(row).decidedBy = 'extraTime'; }],
    ];
    for (const [label, change] of cases) { const bad = savedRow(); change(bad); refuses(bad, label); }
    for (const [label, change] of [
      ['level normal score needs penalties', (row: SavedRow) => { row.extraCups[0].decidedBy = 'normal-time'; delete matchOf(row).penalties; }],
      ['missing shootout pair', (row: SavedRow) => { delete matchOf(row).penalties; }],
      ['tied shootout totals', (row: SavedRow) => { row.extraCups[0].penalties = [4, 4]; }],
      ['negative shootout count', (row: SavedRow) => { row.extraCups[0].penalties = [-1, 0]; }],
      ['fractional shootout count', (row: SavedRow) => { row.extraCups[0].penalties = [4.5, 3]; }],
      ['winner contradicts shootout', (row: SavedRow) => { row.extraCups[0].winner = 'Newcastle'; row.extraCups[0].player.title = false; }],
    ] as [string, (row: SavedRow) => void][]) { const bad = copy(pens); change(bad); refuses(bad, label); }
  });

  it('SC_SHIELD_RULES_PERSONAL: refuses fabricated participation stats ratings and personal titles', () => {
    const cases: [string, (row: SavedRow) => void][] = [
      ['selection must be boolean', row => { playerOf(row).selected = 1; }],
      ['unknown availability label', row => { playerOf(row).availability = 'maybe'; }],
      ['selected without an appearance', row => { row.extraCups[0].player.apps = 0; }],
      ['two appearances in one match', row => { playerOf(row).apps = 2; }],
      ['negative player goals', row => { row.extraCups[0].player.goals = -1; }],
      ['fractional player goals', row => { row.extraCups[0].player.goals = 0.5; }],
      ['more player goals than team goals', row => { row.extraCups[0].player.goals = 3; }],
      ['assist for own goal', row => { row.extraCups[0].player.assists = 2; }],
      ['selected with missing match rating', row => { row.extraCups[0].player.rating = null; }],
      ['rating below match range', row => { row.extraCups[0].player.rating = 3.9; }],
      ['rating above match range', row => { row.extraCups[0].player.rating = 10.1; }],
      ['more than one decimal rating', row => { row.extraCups[0].player.rating = 8.01; }],
      ['clean sheet while conceding', row => { row.extraCups[0].player.cleanSheets = 1; }],
      ['played winner without derived personal title', row => { row.extraCups[0].player.title = false; }],
      ['unknown availability cannot be selected', row => { row.extraCups[0].player.availability = 'unknown'; }],
    ];
    for (const [label, change] of cases) { const bad = savedRow(); change(bad); refuses(bad, label); }
    for (const [label, change] of [
      ['bench player awarded title', (row: SavedRow) => { row.extraCups[0].player.title = true; }],
      ['bench player given a goal', (row: SavedRow) => { row.extraCups[0].player.goals = 1; }],
      ['bench player given an assist', (row: SavedRow) => { row.extraCups[0].player.assists = 1; }],
      ['bench player given a rating', (row: SavedRow) => { row.extraCups[0].player.rating = 0; }],
    ] as [string, (row: SavedRow) => void][]) { const bad = noAppearance(savedRow()); change(bad); refuses(bad, label); }
  });

  it('SC_SHIELD_RULES_DUPLICATES: refuses ambiguous valid editions without changing old totals or row order', () => {
    const won = savedRow(), duplicate = copy(won), lost = copy(won), other = savedRow(2028), tail = savedRow(2029);
    lost.extraCups[0].score = [1, 2]; lost.extraCups[0].winner = 'Newcastle'; lost.extraCups[0].player.title = false;
    accepts(lost, 'valid non-title duplicate foundation');
    expect(countCommunityShields([won, duplicate])).toBe(0);
    expect(communityShieldWinningSeasons([won, duplicate])).toEqual([]);
    expect(countCommunityShields([won, lost])).toBe(0);
    const invalid = copy(won); invalid.extraCups[0].seed = -1;
    expect(readCommunityShield(invalid)).toBeNull();
    expect(countCommunityShields([won, invalid])).toBe(1);
    expect(communityShieldWinningSeasons([won, invalid])).toEqual([won]);
    const mixed = [other, won, duplicate, tail], held = JSON.stringify(mixed);
    Object.freeze(mixed);
    expect(countCommunityShields(mixed)).toBe(2);
    const wins = communityShieldWinningSeasons(mixed);
    expect(wins).toEqual([other, tail]);
    expect(JSON.stringify(mixed)).toBe(held);
    const totals = getCareerTotals([won, duplicate]);
    expect((totals as unknown as { communityShields: number }).communityShields).toBe(0);
    expect(totals.apps).toBe(won.apps * 2); expect(totals.goals).toBe(won.goals * 2);
    expect(totals.assists).toBe(won.assists * 2); expect(totals.cleanSheets).toBe(won.cleanSheets * 2);
    expect(totals.domesticCups).toBe(2); expect(totals.leagueTitles).toBe(0);
    expect(totals.championsLeagues).toBe(0); expect(totals.clubCups).toBe(0); expect(totals.worldCups).toBe(0);
  });

  it('SC_SHIELD_RULES_CODEC: preserves complete recorded proofs in literal and genuinely packed saves', () => {
    const row = savedRow(2029), career = codecCareer(row), held = JSON.stringify(career);
    expect(isSoccerCareerSave(career), 'actual core codec foundation').toBe(true);
    const literal = parseSoccerCareerSave(held) as CareerState;
    expect(isSoccerCareerSave(literal)).toBe(true);
    expect(readCommunityShield(literal.seasons[literal.seasons.length - 1])).toEqual(row.extraCups[0]);
    expect(getCareerTotals(literal.seasons)).toEqual(getCareerTotals(career.seasons));
    const packedCareer = copy(career);
    raw(packedCareer).qaCodecPayload = 'Labelled storage-only QA text. '.repeat(2500);
    const packedInput = JSON.stringify(packedCareer), encoded = serializeSoccerCareerSave(packedCareer);
    const envelope = JSON.parse(encoded) as { seasons: unknown };
    expect(Array.isArray(envelope.seasons), 'fixture must enter the real packed codec').toBe(false);
    const decoded = parseSoccerCareerSave(encoded) as CareerState;
    expect(isSoccerCareerSave(decoded)).toBe(true);
    expect(JSON.stringify(decoded)).toBe(packedInput);
    expect(readCommunityShield(decoded.seasons[decoded.seasons.length - 1])).toEqual(row.extraCups[0]);
    expect(countCommunityShields(decoded.seasons)).toBe(1);
    expect(getCareerTotals(decoded.seasons)).toEqual(getCareerTotals(packedCareer.seasons));
    const repaired = repairCareer(copy(decoded));
    expect(readCommunityShield(repaired.seasons[repaired.seasons.length - 1])).toEqual(row.extraCups[0]);
    expect(JSON.stringify(career)).toBe(held); expect(JSON.stringify(packedCareer)).toBe(packedInput);
  });

  it('SC_SHIELD_RULES_OLD_SAVE: never backfills missing or partial qualification while reading older careers', () => {
    const career = codecCareer(savedRow(2029));
    for (const row of career.seasons) delete raw(row).extraCups;
    delete raw(career).extraCupQualification;
    const held = JSON.stringify(career), parsed = parseSoccerCareerSave(held) as CareerState;
    const repaired = repairCareer(copy(parsed));
    expect(Object.prototype.hasOwnProperty.call(repaired, 'extraCupQualification')).toBe(false);
    expect(repaired.seasons.every(row => !Object.prototype.hasOwnProperty.call(row, 'extraCups'))).toBe(true);
    expect(countCommunityShields(repaired.seasons)).toBe(0);
    expect(communityShieldWinningSeasons(repaired.seasons)).toEqual([]);
    const partial = copy(parsed);
    const receipt = { version: 1, competition: 'community-shield', status: 'partial', qualifyingYear: 2028,
      eventYear: 2029, reason: 'Labelled QA context: FA Cup winner was not recorded.' };
    raw(partial).extraCupQualification = receipt;
    const heldPartial = JSON.stringify(partial), normalized = repairCareer(copy(partial));
    expect(raw(normalized).extraCupQualification).toEqual(receipt);
    expect(countCommunityShields(normalized.seasons)).toBe(0);
    expect(normalized.seasons.every(row => readCommunityShield(row) === null)).toBe(true);
    for (const missing of [undefined, null, {}, 'not a season']) expect(readCommunityShield(missing)).toBeNull();
    const malformed = savedRow(); raw(malformed).extraCups = 'not recorded games'; refuses(malformed, 'malformed optional result container');
    expect(JSON.stringify(career)).toBe(held); expect(JSON.stringify(partial)).toBe(heldPartial);
  });
});