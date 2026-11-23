import { describe, expect, it } from 'vitest';
import { careerPlayerIdentityKey, sameCareerPlayerIdentity } from './careerPlayerIdentity';

const short = { name: 'Alisson', id: 'a0000001-0000-0000-0000-000000000040' };
const full = { name: 'Alisson Becker', id: 'a0000001-0000-0000-0000-000000000066' };
const keeper = { nationality: 'Brazil', position: 'GK' };

describe('verified career player identity', () => {
  it('unifies the two archived keeper IDs in either direction', () => {
    expect(careerPlayerIdentityKey(short)).toBe('verified:alisson-becker');
    expect(sameCareerPlayerIdentity(short, full)).toBe(true);
    expect(sameCareerPlayerIdentity(full, short)).toBe(true);
  });

  it('matches the shipped fallback keeper with the live rows', () => {
    const fallbackShort = { ...keeper, name: short.name };
    const fallbackFull = { ...keeper, name: full.name };
    expect(sameCareerPlayerIdentity(fallbackShort, fallbackFull)).toBe(true);
    expect(sameCareerPlayerIdentity(fallbackShort, full)).toBe(true);
    expect(sameCareerPlayerIdentity(short, fallbackFull)).toBe(true);
  });

  it('requires a known row or trusted keeper metadata for the short name', () => {
    expect(sameCareerPlayerIdentity({ name: short.name }, full)).toBe(false);
    expect(sameCareerPlayerIdentity({ ...keeper, name: short.name, id: 'unverified' }, full)).toBe(false);
    expect(sameCareerPlayerIdentity({ ...keeper, name: short.name, position: 'RW' }, full)).toBe(false);
    expect(sameCareerPlayerIdentity({ ...short, nationality: 'Portugal' }, full)).toBe(false);
    expect(sameCareerPlayerIdentity({ ...short, name: full.name }, full)).toBe(false);
    expect(sameCareerPlayerIdentity({ name: 'Nico González' }, { name: 'Nico González' })).toBe(false);
  });
});
