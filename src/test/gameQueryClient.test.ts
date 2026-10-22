import { expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: fixture }));

import { gameQueryClient } from '@/lib/gameQueryClient';

it('reuses the existing client and forwards the live relation unchanged', () => {
  const query = { select: vi.fn() };
  fixture.from.mockReturnValue(query);
  expect(gameQueryClient).toBe(fixture);
  expect(gameQueryClient.from('transfer_grade_votes')).toBe(query);
  expect(fixture.from).toHaveBeenCalledWith('transfer_grade_votes');
});