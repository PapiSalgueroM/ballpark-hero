import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import GmLotteryCard from './GmLotteryCard';
import { buildDraftOrder, type DraftSeason, type SavedDraftOrder } from '@/lib/gmDraftOrder';
import { PLAIN_ORDER_LINE, PLAIN_ORDER_WORDS, lotteryNight } from '@/lib/gmLotteryNight';
import { NBA_PICK_RULES } from '@/lib/gmPicks';
import { NBA_DRAFT_ORDER_2019 as NBA } from '@/data/gmDraftOrder/rules';

afterEach(cleanup);

const CLUBS = Array.from({ length: 30 }, (_, i) => `C${String(i + 1).padStart(2, '0')}`);
const season: DraftSeason = {
  sport: 'nba', draftYear: 2027,
  rows: CLUBS.map((id, i) => ({ id, wins: 12 + 2 * i, losses: 70 - 2 * i, made: i >= 14 })),
};
const order = buildDraftOrder(season, NBA, NBA_PICK_RULES);
const label = (club: string) => `Club ${club}`;
const table = NBA_PICK_RULES.lottery;

describe('GmLotteryCard', () => {
  it('draws the saved night: fourteen tiles, his marked, the rule line off the table, where his club landed', () => {
    const { container } = render(<GmLotteryCard order={order} myClub="C05" labelOf={label} rules={NBA} lottery={table} onContinue={() => {}} />);
    expect(container.querySelector('[data-gm-lottery]')!.getAttribute('data-gm-lottery')).toBe('drawn');
    const tiles = [...container.querySelectorAll('[data-lottery-slot]')];
    expect(tiles.length).toBe(14);
    tiles.forEach((t, i) => expect(t.textContent).toContain(label(order.first[i])));
    const mine = container.querySelectorAll('[data-lottery-mine]');
    expect(mine.length).toBe(1);
    expect(mine[0].getAttribute('data-lottery-slot')).toBe(String(order.first.indexOf('C05') + 1));
    /* The mark is about his CLUB, whose record earned the pick: the card is never told who holds it tonight. */
    expect(mine[0].querySelector('[data-lottery-under]')!.textContent).toMatch(/^Seed 5 · (Up \d+|Down \d+|Held) · your club$/);
    expect(container.textContent).not.toContain('yours');
    expect(container.querySelector('[data-lottery-rule]')!.textContent)
      .toBe('14 clubs are in the lottery and the top 4 picks are drawn. The 3 worst records share the best chance at the first pick, 14% each.');
    expect(container.querySelector('[data-lottery-headline]')!.textContent).toBe(lotteryNight(order, 'C05', label).headline);
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });

  it('never draws: two looks at one saved order are the same card, and no random number is taken', () => {
    const spy = vi.spyOn(Math, 'random');
    const a = renderToStaticMarkup(<GmLotteryCard order={order} myClub="C05" labelOf={label} rules={NBA} lottery={table} onContinue={() => {}} />);
    const b = renderToStaticMarkup(<GmLotteryCard order={JSON.parse(JSON.stringify(order))} myClub="C05" labelOf={label} rules={NBA} lottery={table} onContinue={() => {}} />);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    expect(b).toBe(a);
  });

  it('keeps the rules one tap away inside its own box: the league, the game, a worked example', () => {
    const { container } = render(<GmLotteryCard order={order} myClub="C05" labelOf={label} rules={NBA} lottery={table} onContinue={() => {}} />);
    fireEvent.click(container.querySelector('[data-lottery-help]')!);
    const panel = container.querySelector('[data-lottery-help-panel]')!;
    expect(container.querySelector('[data-lottery-reveal]')!.contains(panel)).toBe(true);
    for (const words of ["The league's rule", "This game's own", 'A worked example', 'picks no lower than 5th', 'from its 2019 draft to its 2026 draft', '2027']) {
      expect(panel.textContent, words).toContain(words);
    }
    /* The line under the heading stays on screen beside the panel, so the panel does not print it again. */
    const rule = container.querySelector('[data-lottery-rule]')!.textContent!;
    expect(rule.length).toBeGreaterThan(20);
    expect(panel.textContent).not.toContain(rule);
    expect(container.textContent!.split(rule).length - 1).toBe(1);
  });

  it('has a live button from the first frame, with a label the site walker presses', () => {
    const onContinue = vi.fn();
    const { container } = render(<GmLotteryCard order={order} myClub="C22" labelOf={label} rules={NBA} lottery={table} onContinue={onContinue} />);
    const button = container.querySelector('[data-lottery-continue]') as HTMLButtonElement;
    expect(button.textContent).toMatch(/continue|draft/i);
    expect(container.querySelector('[data-lottery-reveal]')!.hasAttribute('data-lottery-settled')).toBe(false);
    fireEvent.click(button);
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-lottery-reveal]')!.hasAttribute('data-lottery-settled')).toBe(true);
    /* A playoff club: no tile is his, and the line says where he picks. */
    expect(container.querySelector('[data-lottery-mine]')).toBeNull();
    expect(container.querySelector('[data-lottery-headline]')!.textContent).toBe('Your club is not in the lottery. Its own round one pick is 22nd.');
  });

  it('renders on the server in both modes: a night to watch, and a night already watched', () => {
    for (const seen of [false, true]) {
      const html = renderToStaticMarkup(<GmLotteryCard order={order} myClub="C05" labelOf={label} rules={NBA} lottery={table} seen={seen} onContinue={() => {}} />);
      expect((html.match(/data-lottery-slot=/g) ?? []).length).toBe(14);
      expect(html.includes('data-lottery-settled')).toBe(seen);
      expect(html.includes('animation-delay')).toBe(!seen);
      expect(html).toContain('data-lottery-continue');
      expect(html).toContain('data-lottery-help');
    }
  });

  it('draws a league with no drawing as the order, at once, and says why', () => {
    const plain = buildDraftOrder(season, NBA, { ...NBA_PICK_RULES, lottery: null });
    const { container } = render(<GmLotteryCard order={plain} myClub="C22" labelOf={label} rules={NBA} lottery={null} onContinue={() => {}} />);
    expect(container.querySelector('[data-gm-lottery]')!.getAttribute('data-gm-lottery')).toBe('plain');
    expect(container.querySelector('[data-lottery-reveal]')!.hasAttribute('data-lottery-settled')).toBe(true);
    /* The reason, once, under the heading; his club's own pick as the closing line; how the order runs behind the "?". */
    expect(container.querySelector('[data-lottery-rule]')!.textContent).toBe(PLAIN_ORDER_WORDS.table);
    expect(container.querySelectorAll('[data-lottery-slot]').length).toBe(9);
    expect(container.querySelector('[data-lottery-mine]')!.getAttribute('data-lottery-slot')).toBe('22');
    expect(container.querySelector('[data-lottery-headline]')!.textContent).toBe("Your club's own pick is 22nd in round one.");
    expect(container.textContent!.split('No lottery was drawn').length - 1).toBe(1);
    /* Nothing was seeded and nothing moved, so no tile says Seed or Held. */
    expect(container.textContent).not.toMatch(/Seed \d|Held/);
    expect([...container.querySelectorAll('[data-lottery-under]')].map(u => u.textContent)).toEqual(['your club']);
    fireEvent.click(container.querySelector('[data-lottery-help]')!);
    const panel = container.querySelector('[data-lottery-help-panel]')!;
    expect(panel.textContent).toContain(PLAIN_ORDER_LINE);
    expect(panel.textContent).not.toContain('No lottery was drawn');
  });

  it('still reads a night drawn under a rule this build no longer carries', () => {
    const old: SavedDraftOrder = { ...order, rulesId: 'nba-1990' };
    const { container } = render(<GmLotteryCard order={old} myClub="C05" labelOf={label} rules={null} lottery={null} />);
    expect(container.querySelectorAll('[data-lottery-slot]').length).toBe(14);
    expect(container.querySelector('[data-lottery-rule]')!.textContent).toContain('14 clubs are in the lottery');
    expect(container.querySelector('[data-lottery-continue]')).toBeNull();
    fireEvent.click(container.querySelector('[data-lottery-help]')!);
    const panel = container.querySelector('[data-lottery-help-panel]')!;
    expect(panel.textContent).toContain('an earlier rule of this game, on the odds table of the 2026 draft');
    /* An id is this code's name for a rule. It is not printed anywhere on the card. */
    expect(container.textContent).not.toContain('nba-1990');
  });
});
