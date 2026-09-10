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

const blank = {
  option_a_emoji: '', option_b_emoji: '', option_c_emoji: '', option_d_emoji: '',
  option_a_flag: '', option_b_flag: '', option_c_flag: '', option_d_flag: '',
  sort_order: 0,
};

/* A row exactly as the polls routine wrote it on 2026-09-10, the day the
   owner called the polls dull: the component was rewriting this question to
   "Who ranks higher all time?" over 49ers and Rams. */
const TOPICAL = {
  poll_key: 'dp-2026-09-10-1',
  question: 'Niners vs Rams in Australia tonight. Who wins?',
  option_a: '49ers', option_b: 'Rams', option_c: null, option_d: null,
  ...blank,
};

const FOUR_WAY = {
  poll_key: 'four-way-poll',
  question: 'Who won the transfer window?',
  option_a: 'Liverpool', option_b: 'Chelsea', option_c: 'Man City', option_d: 'Real Madrid',
  ...blank,
};

describe('PollOfTheDay', () => {
  beforeEach(() => {
    localStorage.clear();
    pollRows.rows = [TOPICAL];
  });

  it('renders the database question as written', async () => {
    render(<PollOfTheDay />);

    expect(await screen.findByText('Niners vs Rams in Australia tonight. Who wins?')).toBeInTheDocument();
    expect(screen.queryByText('Who ranks higher all time?')).not.toBeInTheDocument();
    expect(screen.queryByText('Who you got?')).not.toBeInTheDocument();
  });

  it('renders every choice a row carries, up to four', async () => {
    pollRows.rows = [FOUR_WAY];
    render(<PollOfTheDay />);

    expect(await screen.findAllByRole('button')).toHaveLength(4);
    for (const name of ['Liverpool', 'Chelsea', 'Man City', 'Real Madrid']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it('renders two choices when a row has two', async () => {
    render(<PollOfTheDay />);

    expect(await screen.findAllByRole('button')).toHaveLength(2);
    expect(screen.getByText('49ers')).toBeInTheDocument();
    expect(screen.getByText('Rams')).toBeInTheDocument();
  });

  it('drops a row with fewer than two named choices rather than showing a one button poll', async () => {
    pollRows.rows = [{ ...TOPICAL, option_b: '' }];
    render(<PollOfTheDay />);

    /* the fallback pool takes over, so buttons exist, but not that row */
    const buttons = await screen.findAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('Niners vs Rams in Australia tonight. Who wins?')).not.toBeInTheDocument();
  });
});
