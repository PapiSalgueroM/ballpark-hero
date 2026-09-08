import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pollRows = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => Promise.resolve({ data: pollRows.rows, error: null }),
      };
      return query;
    }),
  },
}));

const componentPath = process.env.POLL_COMPONENT;
const { PollOfTheDay } = componentPath
  ? await import(/* @vite-ignore */ componentPath)
  : await import('@/components/home/PollOfTheDay');

describe('PollOfTheDay', () => {
  beforeEach(() => {
    localStorage.clear();
    pollRows.rows = [{
      poll_key: 'four-way-poll',
      question: 'Kobe or Wade, better two guard after Jordan?',
      option_a: 'Jordan',
      option_b: 'LeBron',
      option_c: 'Kareem',
      option_d: 'Bird',
      option_a_emoji: '',
      option_b_emoji: '',
      option_c_emoji: '',
      option_d_emoji: '',
      option_a_flag: '',
      option_b_flag: '',
      option_c_flag: '',
      option_d_flag: '',
      sort_order: 0,
    }];
  });

  it('shows exactly two sides even when a database row still has extra options', async () => {
    render(<PollOfTheDay />);

    expect(await screen.findAllByRole('button')).toHaveLength(2);
    expect(screen.getByText('Jordan')).toBeInTheDocument();
    expect(screen.getByText('LeBron')).toBeInTheDocument();
    expect(screen.queryByText('Kareem')).not.toBeInTheDocument();
    expect(screen.queryByText('Bird')).not.toBeInTheDocument();
  });

  it('replaces an awkward database question with the short player prompt', async () => {
    render(<PollOfTheDay />);

    expect(await screen.findByText('Who ranks higher all time?')).toBeInTheDocument();
    expect(screen.queryByText('Kobe or Wade, better two guard after Jordan?')).not.toBeInTheDocument();
  });
});
