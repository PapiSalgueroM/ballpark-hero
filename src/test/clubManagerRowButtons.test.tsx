/* Release AP: Rounds 1159 and 1161 made the cup bracket's lines and the league
   table's rows real buttons where a tap opens the club (a keyboard can reach
   them, Enter opens them). Both rounds shipped with no test: forcing the rows
   back to divs left every check green. The league table card is also what the
   Soccer Career Season Centre and Stadium Tycoon draw with NO tap, and there a
   row must stay a plain row, so both halves are held here. */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { LeagueTableCard } from '@/components/club-manager/LeagueTableCard';
import { CupBracketCard } from '@/components/club-manager/CupBracketCard';
import { startCareer } from '@/lib/clubManager';
import type { CupTie, TableRow } from '@/lib/clubManager';

const ROWS: TableRow[] = [
  { club: 'Northfield', w: 9, d: 2, l: 1, gf: 25, ga: 9, pts: 29 },
  { club: 'Harbour Town', w: 8, d: 3, l: 1, gf: 21, ga: 10, pts: 27 },
  { club: 'Eastvale', w: 6, d: 2, l: 4, gf: 17, ga: 15, pts: 20 },
  { club: 'Millbrook', w: 2, d: 3, l: 7, gf: 9, ga: 20, pts: 9 },
];

describe('league table rows (Round 1161)', () => {
  it('are native buttons when a tap opens the club, one a club, each opening its own club', () => {
    const open = vi.fn();
    const { container } = render(<LeagueTableCard rows={ROWS} myClub="Eastvale" onClubClick={open} />);
    const rows = [...container.querySelectorAll('[data-club]')];
    expect(rows.map(r => r.getAttribute('data-club'))).toEqual(ROWS.map(r => r.club));
    for (const r of rows) {
      expect(r.tagName, r.getAttribute('data-club') ?? '').toBe('BUTTON');
      /* never a submit button, wherever the card is drawn */
      expect(r.getAttribute('type')).toBe('button');
      /* the keyboard's ring is drawn (the browser's own outline is taken off by the same class list) */
      expect(r.className).toContain('focus-visible:ring-2');
      /* the row reads as its club's line: the name and its points are inside the button */
      expect(r.textContent).toContain(r.getAttribute('data-club') as string);
    }
    fireEvent.click(rows[1]);
    fireEvent.click(rows[3]);
    expect(open.mock.calls).toEqual([['Harbour Town'], ['Millbrook']]);
    /* a button takes the keyboard without a tabindex of its own */
    expect(rows.every(r => !r.hasAttribute('tabindex'))).toBe(true);
    (rows[2] as HTMLElement).focus();
    expect(document.activeElement).toBe(rows[2]);
  });

  it('stay plain rows where nothing opens (the Season Centre table, the tycoon table)', () => {
    const { container } = render(<LeagueTableCard rows={ROWS} myClub="Eastvale" />);
    const rows = [...container.querySelectorAll('[data-club]')];
    expect(rows).toHaveLength(ROWS.length);
    expect(rows.every(r => r.tagName === 'DIV')).toBe(true);
    expect(container.querySelectorAll('button')).toHaveLength(0);
    expect(rows.every(r => !r.hasAttribute('type'))).toBe(true);
    expect(container.textContent).not.toContain('Tap any club');
  });
});

describe('cup bracket lines (Round 1159)', () => {
  const career = startCareer('Real Madrid');
  const bracket = career.cupBracket as CupTie[];

  it('has a first round to draw', () => {
    expect(bracket.length).toBeGreaterThan(0);
  });

  it('are native buttons when a tap opens the club, two a tie, each opening the club it names', () => {
    const open = vi.fn();
    const { container } = render(<CupBracketCard career={career} onClubClick={open} />);
    const lines = [...container.querySelectorAll('button')];
    expect(lines).toHaveLength(bracket.length * 2);
    expect(lines.every(b => b.getAttribute('type') === 'button' && b.className.includes('focus-visible:ring-2'))).toBe(true);
    const names = bracket.flatMap(t => [t.home, t.away]).sort();
    expect(lines.map(b => (b.querySelector('span')?.textContent ?? '').trim()).sort()).toEqual(names);
    const one = lines[3];
    fireEvent.click(one);
    expect(open.mock.calls).toEqual([[(one.querySelector('span')?.textContent ?? '').trim()]]);
  });

  it('stay plain lines where nothing opens', () => {
    const { container } = render(<CupBracketCard career={career} />);
    expect(container.querySelectorAll('button')).toHaveLength(0);
    for (const t of bracket) expect(container.textContent).toContain(t.home);
  });
});
