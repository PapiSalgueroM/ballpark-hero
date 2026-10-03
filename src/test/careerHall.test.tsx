/**
 * Round 915: the retirement talk and the Hall of Fame, held to their words.
 *
 * WHAT THIS HOLDS:
 *   1. The talk comes exactly when the rule says (age, drop from peak, floor),
 *      never on a career the sport has already stopped, and never twice for
 *      one season.
 *   2. Each of the three answers does what its button says.
 *   3. A corrupt save block resets that block alone.
 *   4. The ballot: inducted is exactly the sport's own hof verdict, the first
 *      class is the last season plus the table's offset, shares sit on the
 *      right side of the threshold, the first ballot is certain where the
 *      verdict promises it, and the same career always gets the same ballot.
 *   5. The jersey goes to the club with the most seasons, ties by games.
 *   6. Every speech button's words are the steps the speech applies, and the
 *      speech is given once.
 */
import { describe, it, expect } from 'vitest';
import {
  retirementTalk, answerRetirement, careerEndsAfter, isFarewellSeason, sanitizeRetirement,
  RETIREMENT_CHOICES, peakRating, type RetirementRule,
} from '@/lib/careerRetirement';
import {
  runHallBallot, firstBallotChance, laterCallChance, mostSeasonsTeam, jerseyFor, hallRecordFor,
  HALL_SPEECHES, HALL_SPEECH_METERS, speechPromise, giveHallSpeech, sanitizeHallSpeech,
  type HallRecord,
} from '@/lib/careerHallOfFame';
import { describeSteps, measureMoves, applyMeterSteps } from '@/lib/careerAwardsNight';
import { NFL_CAREER_HALL } from '@/lib/nflCareerHall';
import { NBA_CAREER_HALL } from '@/lib/nbaCareerHall';
import { MLB_CAREER_HALL } from '@/lib/mlbCareerHall';
import { NHL_CAREER_HALL } from '@/lib/nhlCareerHall';

const RULE: RetirementRule = { minAge: 30, dropFromPeak: 8, floor: 70 };
const snap = (o: Partial<{ year: number; age: number; rating: number; peak: number; forced: boolean }>) =>
  ({ year: 2030, age: 32, rating: 80, peak: 84, forced: false, ...o });

describe('the retirement talk', () => {
  it('comes on a drop from peak or under the floor, only from the set age', () => {
    expect(retirementTalk(RULE, snap({ rating: 76, peak: 84 }), undefined)?.reason).toBe('drop');
    expect(retirementTalk(RULE, snap({ rating: 77, peak: 84 }), undefined)).toBeNull();
    expect(retirementTalk(RULE, snap({ rating: 70, peak: 74 }), undefined)?.reason).toBe('floor');
    expect(retirementTalk(RULE, snap({ rating: 71, peak: 74 }), undefined)).toBeNull();
    expect(retirementTalk(RULE, snap({ age: 29, rating: 60, peak: 90 }), undefined)).toBeNull();
    expect(retirementTalk(RULE, snap({ age: 30, rating: 60, peak: 90 }), undefined)?.drop).toBe(30);
  });

  it('never comes when the sport has already ended the career', () => {
    expect(retirementTalk(RULE, snap({ rating: 50, forced: true }), undefined)).toBeNull();
  });

  it('peak reads the season lines and the rating now', () => {
    expect(peakRating([{ ovr: 70 }, { ovr: 88 }, { ovr: 81 }], 79)).toBe(88);
    expect(peakRating([], 79)).toBe(79);
  });
});

describe('the three answers do what their buttons say', () => {
  const ids = RETIREMENT_CHOICES.map(c => c.id).sort();
  it('there are exactly three, one per answer', () => {
    expect(ids).toEqual(['farewell', 'oneMore', 'retireNow']);
  });

  it('Retire now: this season was the last', () => {
    const b = answerRetirement(undefined, 2030, 'retireNow');
    expect(careerEndsAfter(b, 2030)).toBe(true);
    expect(retirementTalk(RULE, snap({ year: 2031, rating: 60 }), b)).toBeNull();
  });

  it('One more year: he plays on, and the talk comes back if the slide goes on', () => {
    const b = answerRetirement(undefined, 2030, 'oneMore');
    expect(careerEndsAfter(b, 2030)).toBe(false);
    expect(careerEndsAfter(b, 2031)).toBe(false);
    expect(retirementTalk(RULE, snap({ year: 2030, rating: 60 }), b)).toBeNull();
    expect(retirementTalk(RULE, snap({ year: 2031, rating: 60 }), b)).not.toBeNull();
    expect(retirementTalk(RULE, snap({ year: 2031, rating: 83 }), b)).toBeNull();
  });

  it('Farewell season: next season is the last whatever the numbers say', () => {
    const b = answerRetirement(undefined, 2030, 'farewell');
    expect(careerEndsAfter(b, 2030)).toBe(false);
    expect(isFarewellSeason(b, 2031)).toBe(true);
    expect(careerEndsAfter(b, 2031)).toBe(true);
    // A recovery in the farewell year changes nothing, and nobody asks again.
    expect(retirementTalk(RULE, snap({ year: 2031, rating: 84, peak: 84 }), b)).toBeNull();
    expect(retirementTalk(RULE, snap({ year: 2031, rating: 50 }), b)).toBeNull();
  });

  it('answering leaves the old block untouched', () => {
    const before = { declinedYears: [2029] };
    const after = answerRetirement(before, 2030, 'oneMore');
    expect(before).toEqual({ declinedYears: [2029] });
    expect(after.declinedYears).toEqual([2029, 2030]);
  });
});

describe('old and corrupt saves', () => {
  it('a missing block reads as never asked', () => {
    expect(sanitizeRetirement(undefined)).toEqual({});
    expect(retirementTalk(RULE, snap({ rating: 60 }), sanitizeRetirement(undefined))).not.toBeNull();
  });
  it('a good block survives, a bad one resets alone', () => {
    const good = { declinedYears: [2029, 2030], farewellYear: 2032 };
    expect(sanitizeRetirement(good)).toEqual(good);
    expect(sanitizeRetirement({ declinedYears: 'x' })).toEqual({});
    expect(sanitizeRetirement({ farewellYear: 20.5 })).toEqual({});
    expect(sanitizeRetirement({ retiredYear: null })).toEqual({});
    expect(sanitizeRetirement([1, 2])).toEqual({});
    expect(sanitizeHallSpeech({ speechId: 'nope' })).toEqual({});
    expect(sanitizeHallSpeech({ crowd: 140 })).toEqual({});
    expect(sanitizeHallSpeech({ speechId: 'fans', crowd: 62, line: 'x' })).toEqual({ speechId: 'fans', crowd: 62, line: 'x' });
  });
});

const SPORTS = [NFL_CAREER_HALL, NBA_CAREER_HALL, MLB_CAREER_HALL, NHL_CAREER_HALL];

describe('the ballot', () => {
  for (const sport of SPORTS) {
    const { rules, lines } = sport;
    it(`${rules.sport}: inducted is exactly hof, and the class follows the table`, () => {
      for (let i = 0; i < 300; i += 1) {
        const hof = i % 3 === 0;
        const score = hof ? lines.hofLine + (i % 400) : (i * 7) % lines.hofLine;
        const r = runHallBallot(rules, lines, { key: `k${i}`, hof, score, lastSeasonYear: 2030 });
        expect(r.outcome === 'inducted').toBe(hof);
        expect(r.firstClass).toBe(2030 + rules.firstClassOffset);
        r.ballots.forEach((b, j) => {
          expect(b.classYear).toBe(r.firstClass + j);
          expect(b.elected ? b.share >= rules.threshold : b.share < rules.threshold).toBe(true);
        });
        if (rules.ballotYears !== null) expect(r.ballots.length).toBeLessThanOrEqual(rules.ballotYears);
        if (hof) {
          expect(r.ballots.at(-1)?.elected).toBe(true);
          expect(r.inductedClass).toBe(r.ballots.at(-1)?.classYear);
          expect(r.firstBallot).toBe(r.ballots.length === 1);
        } else {
          expect(r.inductedClass).toBeNull();
          expect(r.ballots.some(b => b.elected)).toBe(false);
        }
        if (r.outcome === 'fellOff' && rules.stayFloor !== null && rules.ballotYears !== null && r.ballots.length < rules.ballotYears) {
          expect(r.ballots.at(-1)!.share).toBeLessThan(rules.stayFloor);
        }
      }
    });

    it(`${rules.sport}: the first ballot is certain where the verdict promises it`, () => {
      for (let i = 0; i < 50; i += 1) {
        const r = runHallBallot(rules, lines, { key: `top${i}`, hof: true, score: lines.firstBallotScore + i, lastSeasonYear: 2030 });
        expect(r.firstBallot).toBe(true);
      }
    });
  }

  it('the first ballot chance never falls as the score rises, at every step', () => {
    const lines = MLB_CAREER_HALL.lines;
    let last = -1;
    for (let s = lines.hofLine; s <= lines.firstBallotScore + 50; s += 10) {
      const p = firstBallotChance(s, lines);
      expect(p).toBeGreaterThanOrEqual(last);
      expect(laterCallChance(s, lines)).toBeGreaterThan(0);
      last = p;
    }
    expect(firstBallotChance(lines.firstBallotScore, lines)).toBe(1);
  });

  it('the same career always gets the same ballot', () => {
    const cand = { key: 'same', hof: true, score: 640, lastSeasonYear: 2031 };
    const a = runHallBallot(MLB_CAREER_HALL.rules, MLB_CAREER_HALL.lines, cand);
    const b = runHallBallot(MLB_CAREER_HALL.rules, MLB_CAREER_HALL.lines, cand);
    expect(a).toEqual(b);
  });
});

describe('the jersey', () => {
  it('goes to the club with the most seasons, ties to more games then the first club', () => {
    expect(mostSeasonsTeam([
      { team: 'A', games: 80 }, { team: 'B', games: 70 }, { team: 'B', games: 70 }, { team: 'A', games: 10 },
    ])).toEqual({ team: 'B', seasons: 2 });
    expect(mostSeasonsTeam([{ team: 'A', games: 50 }, { team: 'B', games: 50 }])).toEqual({ team: 'A', seasons: 1 });
    expect(mostSeasonsTeam([{ team: 'A', games: 0 }])).toBeNull();
  });
  it('goes up for a Hall of Famer, a club icon just short of the Hall, or where the verdict promised it', () => {
    const nba = NBA_CAREER_HALL.lines;
    const four = Array.from({ length: 4 }, () => ({ team: 'A', games: 60 }));
    const five = Array.from({ length: 5 }, () => ({ team: 'A', games: 60 }));
    const twelve = Array.from({ length: 12 }, () => ({ team: 'A', games: 60 }));
    expect(jerseyFor(four, true, 520, nba)).toBeNull();
    expect(jerseyFor(five, true, 520, nba)).toEqual({ team: 'A', seasons: 5 });
    expect(jerseyFor(five, false, 300, nba)).toBeNull();
    expect(jerseyFor(twelve, false, 300, nba)).toBeNull();
    expect(jerseyFor(twelve, false, 425, nba)).toEqual({ team: 'A', seasons: 12 });
    expect(jerseyFor(twelve.slice(1), false, 499, nba)).toBeNull();
    expect(jerseyFor(four, true, 650, nba)).toEqual({ team: 'A', seasons: 4 });
  });
});

describe('the induction speech', () => {
  const lines = NFL_CAREER_HALL.lines;
  const inducted = (key: string): HallRecord =>
    ({ ...runHallBallot(NFL_CAREER_HALL.rules, lines, { key, hof: true, score: 700, lastSeasonYear: 2030 }), jersey: null });
  const moved = (b: { crowd?: number; room?: number }) =>
    [{ meter: 'crowd', delta: (b.crowd ?? 50) - 50 }, { meter: 'room', delta: (b.room ?? 50) - 50 }].filter(s => s.delta !== 0);
  const net = (steps: { meter: 'crowd' | 'room'; delta: number }[]) => {
    const s: { crowd?: number; room?: number } = {};
    return measureMoves(HALL_SPEECH_METERS, s, () => applyMeterSteps(HALL_SPEECH_METERS, s, steps));
  };

  for (const option of HALL_SPEECHES) {
    it(`"${option.label}" moves what its button says`, () => {
      const promise = speechPromise(option);
      if (option.effect.length) expect(promise).toContain(describeSteps(HALL_SPEECH_METERS, option.effect));
      if (option.risk) {
        expect(promise).toContain(`${Math.round(option.risk.chance * 100)} percent`);
        expect(promise).toContain(describeSteps(HALL_SPEECH_METERS, option.risk.hit));
        expect(promise).toContain(describeSteps(HALL_SPEECH_METERS, option.risk.miss));
      }
      const outcomes = new Set<string>();
      for (let i = 0; i < 40; i += 1) {
        const rec = inducted(`c${i}`);
        const b = giveHallSpeech(undefined, rec, `c${i}`, option.id);
        expect(b.speechId).toBe(option.id);
        expect(typeof b.line).toBe('string');
        const got = moved(b);
        if (!option.risk) { expect(got).toEqual(net(option.effect)); outcomes.add('sure'); continue; }
        const hit = net([...option.effect, ...option.risk.hit]);
        const miss = net([...option.effect, ...option.risk.miss]);
        const which = JSON.stringify(got) === JSON.stringify(hit) ? 'hit' : JSON.stringify(got) === JSON.stringify(miss) ? 'miss' : 'neither';
        expect(which).not.toBe('neither');
        outcomes.add(which);
      }
      expect(outcomes.size).toBe(option.risk ? 2 : 1);
    });
  }

  it('is given once, only by a Hall of Famer, and the same every time', () => {
    const rec = inducted('once');
    const first = giveHallSpeech(undefined, rec, 'once', 'story');
    expect(giveHallSpeech(first, rec, 'once', 'fans')).toEqual(first);
    expect(giveHallSpeech(undefined, rec, 'once', 'story')).toEqual(first);
    const out: HallRecord = { ...runHallBallot(NFL_CAREER_HALL.rules, lines, { key: 'out', hof: false, score: 400, lastSeasonYear: 2030 }), jersey: null };
    expect(giveHallSpeech(undefined, out, 'out', 'fans')).toEqual({});
  });

  it('thanks roles, never a name', () => {
    for (const o of HALL_SPEECHES) for (const outcome of ['sure', 'hit', 'miss'] as const) {
      const line = o.line({}, outcome);
      expect(line).not.toMatch(/"/);
      expect(line).not.toMatch(/\b(I|my|me)\b/);
    }
  });
});

describe('the four sports, on careers their own engines play', () => {
  type Eng = {
    arch: Record<string, unknown[]>; start: (...a: unknown[]) => any; season: (...a: unknown[]) => unknown;
    progress: (...a: unknown[]) => unknown; roll: (...a: unknown[]) => unknown; stop: (c: any) => boolean;
  };
  const engines: Record<string, () => Promise<Eng>> = {
    nfl: async () => { const e = await import('@/lib/nflMyCareer'); return { arch: e.ARCHETYPES as never, start: e.startCareer as never, season: e.simSeason as never, progress: e.progress as never, roll: e.rollTeamQuality as never, stop: e.shouldRetire as never }; },
    nba: async () => { const e = await import('@/lib/nbaMyCareer'); return { arch: e.NBA_ARCHETYPES as never, start: e.startNbaCareer as never, season: e.simNbaSeason as never, progress: e.nbaProgress as never, roll: e.nbaRollTeamQuality as never, stop: e.nbaShouldRetire as never }; },
    mlb: async () => { const e = await import('@/lib/mlbMyCareer'); return { arch: e.MLB_ARCHETYPES as never, start: e.startMlbCareer as never, season: e.simMlbSeason as never, progress: e.mlbProgress as never, roll: e.mlbRollTeamQuality as never, stop: e.mlbShouldRetire as never }; },
    nhl: async () => { const e = await import('@/lib/nhlMyCareer'); return { arch: e.NHL_ARCHETYPES as never, start: e.startNhlCareer as never, season: e.simNhlSeason as never, progress: e.nhlProgress as never, roll: e.nhlRollTeamQuality as never, stop: e.nhlShouldRetire as never }; },
  };

  for (const sport of SPORTS) {
    it(`${sport.rules.sport}: the record reads the sport's own verdict and seasons`, async () => {
      const eng = await engines[sport.rules.sport]();
      const pos = Object.keys(eng.arch)[0];
      for (let i = 0; i < 6; i += 1) {
        const rng = (() => { let a = 915 + i * 7919; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
        const c = eng.start(`Test ${i}`, pos, eng.arch[pos][0], rng, null);
        let tq: unknown = null;
        for (let guard = 0; guard < 30 && !eng.stop(c); guard += 1) {
          tq = eng.roll(tq, rng);
          eng.season(c, tq, rng);
          eng.progress(c, rng);
        }
        const rec = hallRecordFor(sport, c as never);
        expect(rec.outcome === 'inducted').toBe(sport.legacy(c as never).hof);
        expect(rec.firstClass).toBe(c.seasons.at(-1).year + sport.rules.firstClassOffset);
        expect(hallRecordFor(sport, c as never)).toEqual(rec);
        const snapNow = sport.snapshot(c as never);
        expect(snapNow.forced).toBe(true);
        expect(retirementTalk(sport.retirement, snapNow, undefined)).toBeNull();
        expect(snapNow.peak).toBeGreaterThanOrEqual(snapNow.rating);
      }
    });
  }
});

describe('the two cards say what they do', () => {
  it('the farewell card offers the three answers with their own words', async () => {
    const { render, fireEvent, cleanup } = await import('@testing-library/react');
    const { FarewellCard } = await import('@/components/career/FarewellCard');
    const picked: string[] = [];
    const talk = retirementTalk(RULE, snap({ rating: 74, peak: 84 }), undefined)!;
    const view = render(<FarewellCard talk={talk} age={33} onChoose={id => picked.push(id)} />);
    expect(view.container.textContent).toContain('10 points off your best (84)');
    for (const choice of RETIREMENT_CHOICES) {
      const button = view.getByText(`${choice.emoji} ${choice.label}`).closest('button')!;
      expect(button.textContent).toContain(choice.detail);
      fireEvent.click(button);
    }
    expect(picked).toEqual(RETIREMENT_CHOICES.map(c => c.id));
    cleanup();
  });

  it('the Hall card prints shares only where the Hall publishes them, and the speech buttons carry their effects', async () => {
    const { render, fireEvent, cleanup } = await import('@testing-library/react');
    const { HallOfFameCard } = await import('@/components/career/HallOfFameCard');
    let key = 0, rec: HallRecord | null = null;
    while (!rec || rec.ballots.length < 2) {
      rec = { ...runHallBallot(NFL_CAREER_HALL.rules, NFL_CAREER_HALL.lines, { key: `card${key++}`, hof: true, score: 560, lastSeasonYear: 2030 }), jersey: { team: 'Team A', seasons: 9 } };
    }
    const chosen: string[] = [];
    const nfl = render(<HallOfFameCard record={rec} rules={NFL_CAREER_HALL.rules} onSpeech={id => chosen.push(id)} onDismiss={() => {}} />);
    const items = [...nfl.container.querySelectorAll('li')].map(li => li.textContent);
    expect(items.length).toBe(rec.ballots.length);
    for (const t of items) expect(t).toMatch(/^\d{4}: (elected|not enough votes)$/);
    expect(nfl.container.textContent).toContain('Team A retired your number after 9 seasons there.');
    for (const o of HALL_SPEECHES) {
      const button = nfl.getByText(`${o.emoji} ${o.label}`).closest('button')!;
      expect(button.textContent).toContain(speechPromise(o));
      fireEvent.click(button);
    }
    expect(chosen).toEqual(HALL_SPEECHES.map(o => o.id));
    cleanup();

    const mlbRec: HallRecord = { ...runHallBallot(MLB_CAREER_HALL.rules, MLB_CAREER_HALL.lines, { key: 'mlb-card', hof: false, score: 400, lastSeasonYear: 2030 }), jersey: null };
    const mlb = render(<HallOfFameCard record={mlbRec} rules={MLB_CAREER_HALL.rules} onSpeech={() => {}} onDismiss={() => {}} />);
    for (const li of mlb.container.querySelectorAll('li')) expect(li.textContent).toMatch(/^\d{4}: \d+(\.\d)? percent, not enough votes$/);
    expect(mlb.container.textContent).toContain('10 years on the ballot at most.');
    expect(mlb.queryByText('Your induction speech')).toBeNull();
    cleanup();
  });
});
