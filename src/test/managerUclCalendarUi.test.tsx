import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { CalendarCard } from '@/components/club-manager/CalendarCard';
import { startCareer } from '@/lib/clubManager';

vi.mock('@/integrations/supabase/client', () => ({ supabase: null, SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '' }));

it('expands all eight saved directed league fixtures without changing the career or drawing', () => {
  const career = startCareer('Arsenal', 'now');
  expect(career.uclGroup?.format).toBe('league36');
  const group = career.uclGroup!;
  const before = JSON.stringify(career);
  const random = vi.spyOn(Math, 'random');
  const view = render(<CalendarCard career={career} />);
  fireEvent.click(screen.getByRole('button', { name: 'More' }));
  for (let round = 0; round < 8; round++) {
    const pair = group.fixtures![round].find(game => game.includes(career.clubName))!;
    const home = pair[0] === career.clubName;
    const label = screen.getByText(`⭐ UCL League MD${round + 1}`);
    expect(label.parentElement?.textContent).toBe(`⭐ UCL League MD${round + 1}${home ? pair[1] : pair[0]} (${home ? 'H' : 'A'})`);
  }
  expect(view.container.textContent).not.toContain('UCL Group MD');
  expect(JSON.stringify(career)).toBe(before);
  expect(random).not.toHaveBeenCalled();
  random.mockRestore();
});