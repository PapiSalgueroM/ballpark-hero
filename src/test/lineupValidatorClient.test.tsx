import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

/* Round 1138. The client side of Build Your XI's validator. The rule is the
   July 2026 one: a validator that cannot verify is a no penalty retry, never
   an accept. Part A reads answers (no React). Part B is the door for a club
   pick our own row settles. Part C drives the hook: every way the call can
   fail ends with nothing counted, the slot still open and the search box
   still wanted. The test names are matched by
   scripts/simLineupValidatorClient.mjs, so do not rename them. Every request
   here is a stub: no database. */

vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'http://stub', SUPABASE_PUBLISHABLE_KEY: 'stub' }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/lib/localLineupEval', () => ({ localEvaluateSoccerXI: vi.fn() }));
const dealt = vi.hoisted(() => ({ teams: [] as { name: string; isNation: boolean }[] }));
vi.mock('@/data/lineupTeams', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/data/lineupTeams')>();
  return { ...real, getRandomTeamAssignments: () => dealt.teams.map((team) => ({ ...team })) };
});

import { readValidatorAnswer, VALIDATOR_WAIT_MS, type ValidatorAnswer } from '@/lib/validatorClient';

const unverified = (why: string, extra: Record<string, unknown> = {}): ValidatorAnswer =>
  ({ kind: 'unverified', why, exhausted: false, ...extra }) as ValidatorAnswer;

describe('part A: reading a validator answer', () => {
  const rows: [string, boolean, unknown, ValidatorAnswer][] = [
    ['an HTTP 429 with an error body', false, { error: 'Rate limit exceeded' }, unverified('status')],
    ['a failed response that claims valid', false, { valid: true }, unverified('status')],
    ['null', true, null, unverified('shape')],
    ['an array', true, [], unverified('shape')],
    ['a string', true, 'valid', unverified('shape')],
    ['an empty object', true, {}, unverified('shape')],
    ['an error body with a 200', true, { error: 'x' }, unverified('shape')],
    ['valid as the string true', true, { valid: 'true' }, unverified('shape')],
    ['valid as the number 1', true, { valid: 1 }, unverified('shape')],
    ['both flags at once', true, { valid: true, unverified: true }, unverified('server')],
    ['an allowance answer', true, { valid: false, unverified: true, exhausted: true, reason: 'Allowance spent.' }, unverified('server', { exhausted: true, reason: 'Allowance spent.' })],
    ['a plain unverified answer', true, { valid: false, unverified: true }, unverified('server')],
    ['a refusal with a reason', true, { valid: false, reason: 'Never played there.' }, { kind: 'refused', reason: 'Never played there.' }],
    ['a refusal with an object for a reason', true, { valid: false, reason: { row: 'x' } }, { kind: 'refused' }],
    ['valid', true, { valid: true }, { kind: 'valid' }],
    ['valid with a stored name', true, { valid: true, fullName: 'Stored Name' }, { kind: 'valid', fullName: 'Stored Name' }],
  ];
  it.each(rows)('reads %s', (_name, ok, body, expected) => {
    expect(readValidatorAnswer(ok, body)).toEqual(expected);
  });

  it('says valid for the boolean true on an ok response and for nothing else', () => {
    const validRows = rows.filter(([, ok, body]) => readValidatorAnswer(ok, body).kind === 'valid').map(([name]) => name);
    expect(validRows).toEqual(['valid', 'valid with a stored name']);
  });
});
