import { describe, expect, it, vi } from 'vitest';
import { isReservedName, nameModerationError } from '@/lib/nameModeration';
import { publicName } from '@/lib/completions';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

export const RESERVED_NAMES = [
  'admin', 'administrator', 'moderator', 'support', 'system', 'official', 'verified',
  'AdMiN', 'adm1n', 'a d m i n', 'admin123', 'admin123_', 'admin_123',
  'support-team42', 'official_admin', 'support_staff', 'verified_account', 'the admin',
  'DoUKnowBall', 'Do You Know Ball', 'DUKB', 'DOU-KNOW-BALL',
  'Official_DoUKnowBall', 'DoUKnowBallSupport', 'DoUKnowBall support team',
  'the_dukb_official', 'DoUKnowBall_123', 'DUKB_01', 'admin123\u00a0', 'admin123\ufeff',
] as const;

export const ALLOWED_NAMES = [
  'Mark', 'Luka', 'Xavi', 'Max Parker', 'IcyKeeper-42', 'GoldenVolley-77',
  'OfficialBaller', 'ArsenalSupporter', 'FanOfDoUKnowBall', 'DoUKnowBallFan',
  'SystemBasketball', 'VerifiedFan', 'AdmiralKeeper', 'SupportersClub',
  'Arsenal', 'Real Madrid', 'Ajax', 'Manchester United', 'Barcelona', 'Aston Villa',
] as const;

describe('reserved profile names', () => {
  it.each(RESERVED_NAMES)('rejects authority or site impersonation: %s', (name) => {
    expect(isReservedName(name)).toBe(true);
    expect(nameModerationError(name)).toContain('reserved for site accounts');
  });

  it.each(ALLOWED_NAMES)('preserves ordinary sports and fan names: %s', (name) => {
    expect(isReservedName(name)).toBe(false);
    expect(nameModerationError(name)).toBeNull();
    expect(publicName(name)).toBe(name);
  });

  it.each(RESERVED_NAMES)('replaces a legacy public name stably: %s', (name) => {
    const substitute = publicName(name);
    expect(substitute).not.toBe(name);
    expect(publicName(name)).toBe(substitute);
    expect(substitute).toMatch(/^[A-Z][A-Za-z]+-\d{2}$/);
    expect(isReservedName(substitute), substitute).toBe(false);
  });

  it.each(['KKK crew', 'xXx zone', 'shiiiiit', 'f u c k', 'sh1thead'])(
    'keeps the existing profanity rejection: %s', (name) => {
      expect(nameModerationError(name)).toContain('language we do not allow');
    },
  );

  it.each([null, undefined, '', '   '])('leaves blank-name validation to the caller: %s', (name) => {
    expect(isReservedName(name)).toBe(false);
    expect(nameModerationError(name)).toBeNull();
  });
});
