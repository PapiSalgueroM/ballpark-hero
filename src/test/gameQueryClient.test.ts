import { describe, expect, it, vi } from 'vitest';

const { client } = vi.hoisted(() => ({ client: { from: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: client }));

import { gameQueryClient } from '@/lib/gameQueryClient';

describe('game query client', () => {
  it('preserves the existing connection and session instance', () => {
    expect(gameQueryClient).toBe(client);
  });

  it('passes the live relation name through unchanged', () => {
    gameQueryClient.from('transfer_grade_votes');
    expect(client.from).toHaveBeenCalledWith('transfer_grade_votes');
  });
});