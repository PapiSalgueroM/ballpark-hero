/**
 * Round 1103: a save from before the new stat line reads exactly as it did.
 *
 * Round 1103 changes how a NEW NBA season is turned into numbers and who wins
 * every award. A season already saved is never rewritten: its whole number
 * points, its three part line and its awards stay as saved, and the legacy
 * verdict and the Hall of Fame ballot of a career with no new season are the
 * ones it was told (the ballot is recomputed from the save every time it is
 * read, so this is a real constraint).
 *
 * src/test/fixtures/nbaOldSaves1103.json was recorded ONCE, on the commit in its
 * baseCommit key, before any line of the engine changed, and is never
 * re-recorded (its own `note` key says so). It holds:
 *   board    five save histories copied from scripts/data/usBoardFixture.json
 *            as it stood on that commit (rookie, mid, retired, beat, choice);
 *   engine   seeded careers played in the board's own order (a role on draft
 *            night, a camp every season, one summer card) to retirement: every
 *            position and archetype, five or more in the 2003-04 era, one with a
 *            SUSPENDED row written exactly as the board writes it, half of the
 *            retired ones stamped with the Hall calibration the way a career
 *            retired after Round 1051 is, half not;
 *   open     three of those careers stopped after six seasons, still playing.
 * Beside every save, what the game said about it that day: the printed line of
 * every season, the career totals, the legacy (whole object), the Hall record
 * (whole object) and the earned badge ids.
 *
 * The recorder refuses to write unless the set holds at least three inducted
 * careers, two first ballot, two with a ring and one that fell short of the
 * Hall line, and it stores those counts.
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  NBA_ARCHETYPES, startNbaCareer, nbaRollTeamQuality, nbaAssignRole, nbaCampBattle, simNbaSeason, nbaProgress,
  drawNbaEvent, isNbaNewLine, nbaSeasonGames, nbaShouldRetire, nbaCareerTotals, nbaLegacyOf, NBA_LEGACY_WEIGHTS,
  type NbaCareerPos, type NbaCareerState, type NbaLegacy,
} from '@/lib/nbaMyCareer';
import { NBA_CAREER_HALL, NBA_HALL_WORDS } from '@/lib/nbaCareerHall';
import { HALL_CALIBRATION, hallRecordFor, hallWeighLine, stampHallCalibration } from '@/lib/careerHallOfFame';
import { nbaEarnedBadges } from '@/lib/nbaCareerLoop';
import { nbaStatLine } from '@/lib/usCareerStatLine';

const FIXTURE = path.resolve(__dirname, 'fixtures/nbaOldSaves1103.json');
const BOARD_FIXTURE = path.resolve(__dirname, '../../scripts/data/usBoardFixture.json');
const RECORD = process.env.RECORD_NBA_1103 === 'saves';
const POS: NbaCareerPos[] = ['PG', 'SG', 'SF', 'PF', 'C'];

function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** What the game says about a save. Everything a player can read off an old career. */
function readSave(c: NbaCareerState) {
  return clone({
    lines: c.seasons.map(s => nbaStatLine(s)),
    totals: nbaCareerTotals(c),
    legacy: nbaLegacyOf(c),
    hall: hallRecordFor(NBA_CAREER_HALL, c),
    badges: nbaEarnedBadges(c).map(b => b.id),
  });
}
type SaveRead = ReturnType<typeof readSave>;
interface Entry { key: string; from: 'board' | 'engine' | 'open'; save: NbaCareerState; read: SaveRead }
interface Fixture { note: string; baseCommit: string; counts: Record<string, number>; entries: Entry[] }

/** One career in the board's own order. `stopAfter` leaves it open; `suspendAt` serves one season suspended. */
function playCareer(i: number, seed: number, opts: { stopAfter?: number; suspendAt?: number } = {}): NbaCareerState {
  const rng = mulberry32(seed);
  const keep = Math.random;
  Math.random = rng;
  try {
    const pos = POS[i % 5];
    const c = startNbaCareer(`Old Save ${i}`, pos, NBA_ARCHETYPES[pos][i % 3], rng, null, i % 4 === 3 ? 'y2004' : undefined);
    let tq = nbaRollTeamQuality(null, rng);
    nbaAssignRole(c, tq, rng);
    let guard = 0;
    while (!c.retired && guard++ < 30) {
      if (opts.suspendAt === c.seasons.length && (c.suspendedSeasons ?? 0) === 0 && !c.seasons.some(s => s.teamResult === 'SUSPENDED')) c.suspendedSeasons = 1;
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons = (c.suspendedSeasons ?? 0) - 1;
        /* Exactly the row nbaCareerSport.ts suspendedLine writes. */
        c.seasons.push({ year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0, ppg: 0, rpg: 0, apg: 0, awards: [], teamResult: 'SUSPENDED', salary: 0 });
      } else {
        nbaCampBattle(c, tq, rng);
        simNbaSeason(c, tq, rng);
      }
      nbaProgress(c, rng);
      if (opts.stopAfter && c.seasons.length >= opts.stopAfter) break;
      const ev = drawNbaEvent(c, rng);
      if (ev) ev.options[Math.floor(rng() * ev.options.length)].apply(c, rng);
      tq = nbaRollTeamQuality(tq, rng);
      if (nbaShouldRetire(c)) c.retired = true;
    }
    return clone(c);
  } finally {
    Math.random = keep;
  }
}

function record(): Fixture {
  const entries: Entry[] = [];
  const board = JSON.parse(readFileSync(BOARD_FIXTURE, 'utf8')) as { sports: { nba: { saves: Record<string, string> } } };
  for (const key of ['rookie', 'mid', 'retired', 'beat', 'choice']) {
    const save = (JSON.parse(board.sports.nba.saves[key]) as { c: NbaCareerState }).c;
    entries.push({ key: `board:${key}`, from: 'board', save, read: readSave(save) });
  }
  for (let i = 0; i < 21; i++) {
    const save = playCareer(i, 1103000 + i * 7919, i === 20 ? { suspendAt: 5 } : {});
    /* A career retired after Round 1051 carries the stamp; one retired before it does not. */
    if (i % 2 === 1) stampHallCalibration(save);
    entries.push({ key: `engine:${i}`, from: 'engine', save, read: readSave(save) });
  }
  for (const i of [2, 8, 11]) {
    const save = playCareer(i, 1103000 + i * 7919, { stopAfter: 6 });
    entries.push({ key: `open:${i}`, from: 'open', save, read: readSave(save) });
  }
  return { note: 'Recorded once on the engine as it stood before Round 1103. Never re-recorded.', baseCommit: execSync('git rev-parse HEAD').toString().trim(), counts: countsOf(entries), entries };
}

function countsOf(entries: Entry[]): Record<string, number> {
  const retired = entries.filter(e => e.save.retired);
  return {
    saves: entries.length,
    retired: retired.length,
    inducted: retired.filter(e => e.read.hall.outcome === 'inducted').length,
    firstBallot: retired.filter(e => e.read.hall.firstBallot).length,
    withRing: entries.filter(e => e.save.rings > 0).length,
    shortOfTheLine: retired.filter(e => e.read.legacy.score < 500).length,
    era2004: entries.filter(e => e.save.eraId === 'y2004').length,
    suspendedRows: entries.filter(e => e.save.seasons.some(s => s.teamResult === 'SUSPENDED')).length,
    stamped: entries.filter(e => (e.save as { hallCal?: number }).hallCal !== undefined).length,
    archetypes: new Set(entries.map(e => e.save.archetype.id)).size,
  };
}
const enough = (n: Record<string, number>): boolean => n.inducted >= 3 && n.firstBallot >= 2 && n.withRing >= 2 && n.shortOfTheLine >= 1 && n.era2004 >= 5 && n.suspendedRows >= 1 && n.archetypes === 15;

describe('Round 1103: an old NBA save reads exactly as it did', () => {
  if (RECORD) {
    it('records the fixture once', () => {
      expect(existsSync(FIXTURE), 'the fixture exists and is never re-recorded').toBe(false);
      const fx = record();
      console.log(`nbaOldSaves1103 counts: ${JSON.stringify(fx.counts)}`);
      expect(enough(fx.counts), `the set is too thin to prove anything: ${JSON.stringify(fx.counts)}`).toBe(true);
      writeFileSync(FIXTURE, JSON.stringify(fx) + '\n');
    });
    return;
  }
  const fx = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Fixture;

  it('the set is deep enough to mean something', () => {
    expect(countsOf(fx.entries)).toEqual(fx.counts);
    expect(enough(fx.counts)).toBe(true);
    expect(fx.note).toMatch(/Never re-recorded/);
  });

  it('no save in the set holds a season on the new line', () => {
    for (const e of fx.entries) for (const s of e.save.seasons) expect((s as { mpg?: number }).mpg, `${e.key} ${s.year}`).toBeUndefined();
  });

  /* The ballot card's sentence (hall.weighs) is Round 1051's copy, and that round rewrote it on 2026-10-08, after
     this fixture was frozen: the card now names only what the table reads, and a standout only when it was worth
     saying. The fixture is never re-recorded, so the sentence is set aside from the exact comparison and held to
     the one thing in it that belongs to the save: it must be the sentence the card's own function gives the
     standout this legacy was paid the day it was frozen (or none). Everything else on the record, the score and
     the outcome included, is compared exactly, as before. */
  const apart = (r: SaveRead): { read: SaveRead; weighs: string | undefined } => {
    const { weighs, ...hall } = r.hall as SaveRead['hall'] & { weighs?: string };
    return { read: { ...r, hall } as SaveRead, weighs };
  };

  for (const e of fx.entries) {
    it(`${e.key}: every line, the totals, the legacy, the ballot and the badges are what they were`, () => {
      const got = apart(readSave(clone(e.save)));
      const was = apart(e.read);
      expect(got.read).toEqual(was.read);
      const paid = (e.read.legacy as NbaLegacy).standout ?? null;
      expect(got.weighs).toBe(was.weighs === undefined ? undefined : hallWeighLine(NBA_HALL_WORDS, NBA_LEGACY_WEIGHTS[HALL_CALIBRATION], e.save.pos, paid));
    });
  }

  it('the comparison can fail: one point on one old season is caught', () => {
    const e = fx.entries.find(x => x.save.seasons.length >= 5 && x.save.seasons[2].games > 0);
    expect(e).toBeTruthy();
    const moved = clone(e!.save);
    moved.seasons[2].ppg += 1;
    expect(apart(readSave(moved)).read).not.toEqual(apart(e!.read).read);
  });

  /* Round 1103 put a second term in the calibration 2 table (the points of seasons on the new line). The card
     names what the table reads, so that term needs a noun, and it is the same noun: the card says "points" once
     and never prints a key of the table (it read "points and newLinePts" on the first merge of the two rounds). */
  it('the ballot card names points once for every position and prints no key of the table', () => {
    for (const pos of POS) {
      expect(hallWeighLine(NBA_HALL_WORDS, NBA_LEGACY_WEIGHTS[HALL_CALIBRATION], pos, null)).toBe(`${NBA_HALL_WORDS.weighs} Then your seasons and points.`);
    }
  });

  for (const key of ['board:mid', 'open:2', 'open:8', 'open:11']) {
    it(`${key}: one more season leaves every saved season alone`, () => {
      const e = fx.entries.find(x => x.key === key);
      expect(e, key).toBeTruthy();
      const c = clone(e!.save);
      const before = clone(c.seasons);
      const rng = mulberry32(424242);
      const keep = Math.random;
      Math.random = rng;
      try {
        nbaCampBattle(c, 80, rng);
        simNbaSeason(c, 80, rng);
      } finally {
        Math.random = keep;
      }
      expect(c.seasons.length).toBe(before.length + 1);
      expect(c.seasons.slice(0, before.length)).toEqual(before);
      expect(c.seasons.slice(0, before.length).map(s => nbaStatLine(s))).toEqual(e!.read.lines);
      const added = c.seasons[c.seasons.length - 1];
      expect(added.games).toBeGreaterThan(0);
      /* The season played after the round is on the new line: minutes, steals and blocks, points to a tenth. */
      expect(isNbaNewLine(added)).toBe(true);
      for (const k of ['mpg', 'spg', 'bpg'] as const) expect(typeof added[k], k).toBe('number');
      /* It also holds the club's record its awards were decided on, and the record adds up to a season. */
      expect((added.clubWins ?? -1) + (added.clubLosses ?? -1)).toBe(nbaSeasonGames(added.year));
      /* A man coming off a season on the old line does not win Most Improved on his first new one: the old
         line ran about a fifth higher, so his production "fell". */
      expect(added.awards).not.toContain('Most Improved Player');
      expect(Math.abs(added.ppg * 10 - Math.round(added.ppg * 10))).toBeLessThan(1e-9);
      expect(nbaStatLine(added)).toMatch(/^\d+\.\d ppg, \d+\.\d rpg, \d+\.\d apg$/);
      /* And the old ones did not gain a key on the way. */
      for (const s of c.seasons.slice(0, before.length)) expect(isNbaNewLine(s)).toBe(false);
      expect(clone(c)).toEqual(c);
    });
  }
});
