import { describe, expect, it, vi } from 'vitest';
import { seasonFamilySummary, type SeasonFamilyContext } from '@/lib/seasonFamilySummary';

const birth = '👶 Your child is born. Congratulations! (1 total) Morale +10, Legacy +5';
const context = (changes: Partial<SeasonFamilyContext> = {}): Partial<SeasonFamilyContext> => ({
  family: { children: 1, isMarried: true, marriedAge: 24, isDivorced: false, divorceAge: null },
  events: [], story: [], seasons: [{ year: 2031 } as SeasonFamilyContext['seasons'][number]],
  pregnancyAnnounced: false, ...changes,
});
const summary = (year: number, data?: Partial<SeasonFamilyContext>, goals = 27) => seasonFamilySummary({ year, goals }, data);

describe('Soccer Career yearly family summary', () => {
  it('gives a newborn dedication only in the actual saved birth season', () => {
    const data = context({ story: [{ year: 2027, age: 24, club: 'Harbour', lines: [birth] }] });
    expect(summary(2027, data)).toContain('A new baby joined your family this season.');
    expect(summary(2028, data)).toContain('One season since you welcomed a child.');
    expect(summary(2031, data)).toContain('4 seasons since you welcomed a child.');
    expect(summary(2031, data)).not.toMatch(/new baby|new arrival|newest member/);
    expect(summary(2032, data)).toContain('5 seasons since you welcomed a child.');
    expect(summary(2032, data)).not.toBe(summary(2031, data));
  });

  it('recognizes current births before the season log has been archived', () => {
    for (const line of [birth, '👶 Welcomed a child, announced with a baby-boot photo', '👶 Became a parent, far from the cameras']) {
      expect(summary(2031, context({ events: [line] }))).toContain('A new baby joined your family this season.');
    }
  });

  it('does not assign another season or a future birth to the displayed year', () => {
    const data = context({ events: [birth], story: [{ year: 2035, age: 32, club: 'Harbour', lines: [birth] }] });
    expect(summary(2030, data)).not.toMatch(/new baby|new arrival|since you welcomed/);
    expect(summary(2030, data)).toContain('salute');
  });

  it('keeps the most recent recorded birth as the new family chapter', () => {
    const data = context({ story: [
      { year: 2027, age: 24, club: 'Harbour', lines: [birth] },
      { year: 2030, age: 27, club: 'Harbour', lines: ['👶 Became a parent, far from the cameras'] },
    ] });
    expect(summary(2030, data)).toContain('A new baby joined your family this season.');
    expect(summary(2031, data)).toContain('One season since you welcomed a child.');
  });

  it('varies later family copy by year without guessing an age for old saves', () => {
    const data = context();
    const lines = Array.from({ length: 6 }, (_, index) => summary(2031 + index, data));
    expect(new Set(lines).size).toBe(6);
    for (const line of lines) {
      expect(line).not.toMatch(/new baby|new arrival|newest member|years? old|since you welcomed/);
      expect(line).toContain('27 goals this season.');
    }
  });

  it('mentions progression only when that milestone belongs to this season', () => {
    const milestones = [
      ["👣 Your child's first steps! A moment you'll never forget. Morale +3", 'Your child took their first steps this season.'],
      ['⚽ Your child wants to follow in your footsteps and become a footballer. Morale +5', 'Your child wants to follow your football path.'],
      ['🏆 Your child watches you win a trophy, pure joy on their face! Morale +8', 'Your child watched you win a trophy this season.'],
    ];
    for (const [event, copy] of milestones) {
      const data = context({ story: [{ year: 2030, age: 27, club: 'Harbour', lines: [event] }] });
      expect(summary(2030, data)).toContain(copy);
      expect(summary(2031, data)).not.toContain(copy);
      expect(summary(2031, context({ events: [event] }))).toContain(copy);
    }
  });

  it('separates an expected baby from a birth and does not treat paternity claims as newborns', () => {
    expect(summary(2031, context({ pregnancyAnnounced: true }))).toContain('With a baby on the way');
    expect(summary(2030, context({ pregnancyAnnounced: true }))).not.toContain('baby on the way');
    for (const event of ['🤰 Your partner is pregnant. You are going to be a parent!', '🧾 Settled a child support case privately', '🧬 DNA test confirmed paternity, tabloid frenzy']) {
      expect(summary(2031, context({ events: [event] }))).not.toContain('A new baby joined');
    }
  });

  it('does not invent a child when the selected celebration has no family record', () => {
    for (const data of [undefined, context({ family: undefined }), context({ family: { children: 0 } as SeasonFamilyContext['family'] })]) {
      expect(summary(2031, data, 1)).toContain('One goal this season.');
      expect(summary(2031, data, 1)).not.toMatch(/your child|new baby|new arrival|baby on the way/);
    }
  });

  it('is deterministic and leaves saved family facts untouched without drawing randomness', () => {
    const data = context({ events: [birth] });
    const before = JSON.stringify(data);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Copy must not draw randomness'); });
    try {
      expect(summary(2031, data)).toBe(summary(2031, data));
      expect(random).not.toHaveBeenCalled();
      expect(JSON.stringify(data)).toBe(before);
    } finally {
      random.mockRestore();
    }
  });
});
