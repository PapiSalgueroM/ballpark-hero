import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShootoutKicks } from '@/components/club-manager/ShootoutKicks';
import { runShootout } from '@/lib/clubManager';

describe('recorded shootout display', () => {
  it('shows the simulated total and every taker with their actual scored saved or missed result', () => {
    const side = (prefix: string) => ({
      takers: Array.from({ length: 11 }, (_, i) => ({ name: prefix + ' ' + (i + 1), rating: 75 })),
      keeperRating: 75,
    });
    const draws = [0.1, 0.8, 0.1, 0.99, 0.1, 0.8];
    let index = 0;
    const detail = runShootout({ mine: side('Home taker'), theirs: side('Away taker'), myFirst: true }, () => draws[index++]);
    expect(detail.mine).toBe(3);
    expect(detail.theirs).toBe(0);
    const { container } = render(<ShootoutKicks shootout={detail} clubName="Home club" opponent="Away club" />);
    const board = container.querySelector('[data-cm-shootout]');
    expect(board?.getAttribute('data-cm-shootout')).toBe('3-0');
    expect(board?.textContent).toContain('Penalties, kick by kick');
    const rows = [...container.querySelectorAll('[data-cm-pen-kick]')];
    expect(rows).toHaveLength(6);
    rows.forEach((row, i) => {
      const kick = detail.kicks[i];
      expect(row.getAttribute('data-cm-pen-side')).toBe(kick.side);
      expect(row.getAttribute('data-cm-pen-result')).toBe(kick.result);
      expect(row.textContent).toContain(kick.taker);
      expect(row.textContent).toContain(kick.result);
      expect(row.textContent).toContain(kick.mine + '-' + kick.theirs);
    });
    expect(rows.map(row => row.getAttribute('data-cm-pen-result'))).toEqual(['scored', 'saved', 'scored', 'missed', 'scored', 'saved']);
  });
});
