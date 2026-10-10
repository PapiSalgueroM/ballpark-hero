import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import LotteryReveal from './LotteryReveal';
import {
  LOTTERY_REVEAL_CEILING_MS, LOTTERY_REVEAL_CLOSE_S, LOTTERY_REVEAL_TURN_S, LOTTERY_REVEAL_USE, cleanLotteryRows, lotteryFactsFromWeights, lotteryMoveWords,
  lotteryRevealPace, lotteryRuleLine, type LotteryRevealRow,
} from '@/lib/lotteryReveal';

afterEach(cleanup);

/* A field of n clubs after a draw: `winners` are seeds, in the order they won.
   The rest keep their order. Rows come back in REVEAL order, last slot first. */
function field(n: number, winners: number[], mine?: number): LotteryRevealRow[] {
  const order = [...winners, ...Array.from({ length: n }, (_, i) => i + 1).filter(s => !winners.includes(s))];
  return order
    .map((seed, i) => ({ slot: i + 1, label: `Club ${seed}`, seed, moved: seed - (i + 1), ...(seed === mine ? { mine: true } : {}) }))
    .reverse();
}

const NBA_2026 = [14.0, 14.0, 14.0, 12.5, 10.5, 9.0, 7.5, 6.0, 4.5, 3.0, 2.0, 1.5, 1.0, 0.5];
const HELP = [
  { heading: "The league's rule", lines: ['The clubs out of the playoffs are in it.'] },
  { heading: "This game's own", lines: ['Every prospect is generated.'] },
];
const seconds = (el: Element) => Number.parseFloat((el as HTMLElement).style.animationDelay);

describe('the pace of a lottery reveal', () => {
  it('fits every field inside three quarters of the ceiling, and a bigger field never takes a longer step', () => {
    const allowed = LOTTERY_REVEAL_CEILING_MS * LOTTERY_REVEAL_USE;
    let last = Infinity;
    for (let n = 1; n <= 40; n += 1) {
      const p = lotteryRevealPace(n);
      expect(p.totalMs, `${n} tiles`).toBeLessThanOrEqual(allowed);
      expect(p.step, `${n} tiles`).toBeGreaterThan(0);
      expect(p.step).toBeLessThanOrEqual(last);
      last = p.step;
    }
    /* The two real fields: fourteen and sixteen clubs both use what they are allowed, to the hundredth. */
    expect(lotteryRevealPace(14).totalMs).toBeGreaterThan(allowed - 14 * 10);
    expect(lotteryRevealPace(16).totalMs).toBeGreaterThan(allowed - 16 * 10);
    expect(lotteryRevealPace(Number.NaN).totalMs).toBe(lotteryRevealPace(1).totalMs);
  });

  it('reports the END of the run: the last tile has turned and the closing line is in', () => {
    for (let n = 1; n <= 40; n += 1) {
      const p = lotteryRevealPace(n);
      const lastTileStarts = (p.start + (n - 1) * p.step) * 1000;
      /* The closing line starts one step after the last tile does, and the run is over when both have finished. */
      expect(p.closingMs, `${n} tiles`).toBe(Math.round((p.start + n * p.step) * 1000));
      expect(p.totalMs, `${n} tiles`).toBeGreaterThanOrEqual(Math.round(lastTileStarts + LOTTERY_REVEAL_TURN_S * 1000));
      expect(p.totalMs, `${n} tiles`).toBe(Math.max(Math.round(lastTileStarts + LOTTERY_REVEAL_TURN_S * 1000), p.closingMs + LOTTERY_REVEAL_CLOSE_S * 1000));
    }
    /* Typed here, not read from the lib: fourteen clubs end at 3,720 ms and sixteen at 3,700. */
    expect([lotteryRevealPace(14).closingMs, lotteryRevealPace(14).totalMs]).toEqual([3420, 3720]);
    expect([lotteryRevealPace(16).closingMs, lotteryRevealPace(16).totalMs]).toEqual([3400, 3700]);
  });
});

describe('the rule line is built from the table', () => {
  it('reads the 2026 NBA table, a 2003 style table and a two draw table', () => {
    expect(lotteryRuleLine(lotteryFactsFromWeights(NBA_2026, 4)))
      .toBe('14 clubs are in the lottery and the top 4 picks are drawn. The 3 worst records share the best chance at the first pick, 14% each.');
    expect(lotteryRuleLine(lotteryFactsFromWeights([250, 200, 157, 120, 89, 64, 44, 29, 18, 11, 7, 6, 5], 3)))
      .toBe('13 clubs are in the lottery and the top 3 picks are drawn. The worst record has the best chance at the first pick, 25%.');
    expect(lotteryRuleLine(lotteryFactsFromWeights([18.5, 13.5, 11.5, 9.5, 8.5, 7.5, 6.5, 6.0, 5.0, 3.5, 3.0, 2.5, 2.0, 1.5, 0.5, 0.5], 2)))
      .toBe('16 clubs are in the lottery and the top 2 picks are drawn. The worst record has the best chance at the first pick, 18.5%.');
    expect(lotteryRuleLine(lotteryFactsFromWeights([3, 1], 1))).toContain('the first pick is drawn');
  });

  it('counts clubs as level when their chances are the same number worked out two ways', () => {
    /* 140 of 1,000 combinations as a percent is 14.000000000000002. It is the same chance as a typed 14. */
    const shared = (140 / 1000) * 100;
    expect(shared).not.toBe(14);
    expect(lotteryFactsFromWeights([14, shared, shared, 12.5, 10.5], 4)!.worstShared).toBe(3);
    expect(lotteryRuleLine(lotteryFactsFromWeights([14, shared, shared, 12.5, 10.5], 4))).toContain('The 3 worst records share the best chance');
  });

  it('refuses a table it cannot read instead of printing a guess', () => {
    expect(lotteryFactsFromWeights([], 4)).toBeNull();
    expect(lotteryFactsFromWeights([0, 0], 1)).toBeNull();
    expect(lotteryFactsFromWeights(NBA_2026, 0)).toBeNull();
    expect(lotteryRuleLine(null)).toBe('');
  });

  it('says a move in a word and a number', () => {
    expect([lotteryMoveWords(4), lotteryMoveWords(-2), lotteryMoveWords(0)]).toEqual(['Up 4', 'Down 2', 'Held']);
  });
});

describe('the rows a card may draw', () => {
  it('drops a row with no club, no whole slot or a slot already taken, and keeps the order it was handed', () => {
    const rows = cleanLotteryRows([
      { slot: 2, label: 'B', seed: 5, moved: 3 },
      { slot: 2, label: 'Twice', seed: 1, moved: -1 },
      { slot: 1, label: '  ', seed: 1, moved: 0 },
      { slot: 1.5, label: 'Half', seed: 1, moved: 0 },
      null as unknown as LotteryRevealRow,
      { slot: 1, label: 'A', seed: 1, moved: 0, mine: true },
    ]);
    expect(rows).toEqual([{ slot: 2, label: 'B', seed: 5, moved: 3 }, { slot: 1, label: 'A', seed: 1, moved: 0, mine: true }]);
    expect(cleanLotteryRows(undefined)).toEqual([]);
  });
});

describe('LotteryReveal', () => {
  const rows = field(14, [5, 1, 9, 2], 9);
  const rule = lotteryRuleLine(lotteryFactsFromWeights(NBA_2026, 4));

  it('has every tile in the grid from the first frame, ordered by pick, each club once', () => {
    const { container } = render(<LotteryReveal rows={rows} ruleLine={rule} headline="You hold the 3rd pick, up 6." onContinue={() => {}} />);
    const tiles = [...container.querySelectorAll('[data-lottery-slot]')];
    expect(tiles.map(t => Number(t.getAttribute('data-lottery-slot')))).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    const labels = tiles.map(t => t.querySelector('[data-lottery-face] .font-bold')?.textContent);
    expect(new Set(labels).size).toBe(14);
    expect(labels.slice(0, 4)).toEqual(['Club 5', 'Club 1', 'Club 9', 'Club 2']);
    expect(container.querySelector('[data-lottery-rule]')?.textContent).toBe(rule);
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });

  it('turns the tiles in the order it was handed, the first pick last, and the closing line after every tile', () => {
    const { container } = render(<LotteryReveal rows={rows} ruleLine={rule} headline="You hold the 3rd pick, up 6." />);
    const at = (slot: number) => seconds(container.querySelector(`[data-lottery-slot="${slot}"] [data-lottery-face]`)!);
    const inRevealOrder = rows.map(r => at(r.slot));
    for (let i = 1; i < inRevealOrder.length; i += 1) expect(inRevealOrder[i]).toBeGreaterThan(inRevealOrder[i - 1]);
    expect(at(1)).toBe(Math.max(...inRevealOrder));
    const closing = seconds(container.querySelector('[data-lottery-headline]')!);
    expect(closing).toBeGreaterThan(at(1));
    expect(Math.round(closing * 1000)).toBe(lotteryRevealPace(14).closingMs);
    /* The line is IN one fade later, and that is the number the lib reports as the end. */
    expect(Math.round(closing * 1000) + LOTTERY_REVEAL_CLOSE_S * 1000).toBe(lotteryRevealPace(14).totalMs);
    expect(lotteryRevealPace(14).totalMs).toBeLessThanOrEqual(LOTTERY_REVEAL_CEILING_MS * LOTTERY_REVEAL_USE);
  });

  it('takes its two durations from the lib, so the pace the lib reports is the one the screen runs', () => {
    const { container } = render(<LotteryReveal rows={rows} ruleLine={rule} headline="x" />);
    const box = container.querySelector('[data-lottery-reveal]') as HTMLElement;
    expect(box.style.getPropertyValue('--lr-turn')).toBe(`${LOTTERY_REVEAL_TURN_S}s`);
    expect(box.style.getPropertyValue('--lr-close')).toBe(`${LOTTERY_REVEAL_CLOSE_S}s`);
    const css = container.querySelector('style')!.textContent ?? '';
    expect(css).toMatch(/\.lr-face\s*\{[^}]*animation:\s*lrTurn var\(--lr-turn\)/);
    expect(css).toMatch(/\.lr-after\s*\{[^}]*animation:\s*lrAfter var\(--lr-close\)/);
    /* No duration typed in the CSS: a number there is one the lib cannot see. */
    expect(css).not.toMatch(/animation:[^;}]*\d(\.\d+)?m?s\b/);
  });

  it('marks his tile and only his', () => {
    const { container } = render(<LotteryReveal rows={rows} ruleLine={rule} />);
    const mine = [...container.querySelectorAll('[data-lottery-mine]')];
    expect(mine.map(t => t.getAttribute('data-lottery-slot'))).toEqual(['3']);
    expect(mine[0].textContent).toContain('Seed 9 · Up 6 · yours');
    expect(container.querySelector('[data-lottery-continue]')).toBeNull();
    expect(container.querySelector('[data-lottery-help]')).toBeNull();
  });

  it('covers the face down number on EVERY tile: each face is solid, and his gold is a tint laid over it', () => {
    const { container } = render(<LotteryReveal rows={rows} ruleLine={rule} />);
    const faces = [...container.querySelectorAll('[data-lottery-face]')];
    expect(faces.length).toBe(14);
    for (const face of faces) {
      const classes = face.className.split(/\s+/);
      /* A solid background, and no see through one on the face itself (bg-gold/20 was the fault). */
      expect(classes, face.textContent ?? '').toContain('bg-card');
      expect(classes.filter(c => /^bg-.+\/\d+$/.test(c)), face.textContent ?? '').toEqual([]);
    }
    const tints = [...container.querySelectorAll('[data-lottery-tint]')];
    expect(tints.length).toBe(1);
    expect(tints[0].closest('[data-lottery-slot]')!.hasAttribute('data-lottery-mine')).toBe(true);
    /* The tint sits under the words: it comes first, and the words are positioned over it. */
    const face = tints[0].parentElement!;
    expect(face.firstElementChild).toBe(tints[0]);
    for (const child of [...face.children].slice(1)) expect(child.className).toContain('relative');
  });

  it('keeps the button live from the first frame; pressed early every tile lands at once and the caller moves on', () => {
    const onContinue = vi.fn();
    const { container } = render(<LotteryReveal rows={rows} ruleLine={rule} onContinue={onContinue} />);
    const box = container.querySelector('[data-lottery-reveal]')!;
    const button = container.querySelector('[data-lottery-continue]') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('Continue to the draft');
    expect(box.hasAttribute('data-lottery-settled')).toBe(false);
    fireEvent.click(button);
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(box.hasAttribute('data-lottery-settled')).toBe(true);
    expect(box.className).toContain('lr-settled');
    for (const f of container.querySelectorAll('[data-lottery-face]')) expect((f as HTMLElement).style.animationDelay).toBe('');
  });

  it('opens the rules over the grid, inside its own box, and closes them again', () => {
    const { container } = render(<LotteryReveal rows={rows} ruleLine={rule} help={HELP} onContinue={() => {}} />);
    const stage = container.querySelector('[data-lottery-stage]')!;
    const help = container.querySelector('[data-lottery-help]') as HTMLButtonElement;
    expect(help.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('[data-lottery-help-panel]')).toBeNull();
    fireEvent.click(help);
    const panel = container.querySelector('[data-lottery-help-panel]')!;
    expect(stage.contains(panel)).toBe(true);
    expect(panel.className).toContain('absolute');
    expect(panel.textContent).toContain("The league's rule");
    expect(panel.textContent).toContain('Every prospect is generated.');
    /* The grid keeps its room under the panel: hidden, never removed. */
    expect(stage.querySelectorAll('[data-lottery-slot]').length).toBe(14);
    expect(stage.querySelector('[data-lottery-grid]')!.className).toContain('invisible');
    expect(help.getAttribute('aria-expanded')).toBe('true');
    /* The same button closes it, and says so: a close mark while the panel is open, never a "?" over open rules. */
    expect(help.textContent).toBe('×');
    /* Only the words scroll. The way back is outside the scrolling part, so long rules cannot push it out of sight. */
    const words = panel.querySelector('[data-lottery-help-text]')!;
    const back = panel.querySelector('[data-lottery-help-close]')!;
    expect(words.className).toContain('overflow-y-auto');
    expect(panel.className).not.toContain('overflow-y-auto');
    expect(words.contains(back)).toBe(false);
    expect(back.className).toContain('shrink-0');
    expect(words.textContent).toContain('Every prospect is generated.');
    fireEvent.click(back);
    expect(container.querySelector('[data-lottery-help-panel]')).toBeNull();
    expect(stage.querySelector('[data-lottery-grid]')!.className).not.toContain('invisible');
    expect(help.textContent).toBe('?');
    /* And the "?" itself closes what it opened. */
    fireEvent.click(help);
    fireEvent.click(help);
    expect(container.querySelector('[data-lottery-help-panel]')).toBeNull();
  });

  it('says nothing about a seed or a move on an order no drawing made, and marks his tile in the caller\'s words', () => {
    const plain = [3, 2, 1].map(slot => ({ slot, label: `Club ${slot}`, seed: slot, moved: 0, ...(slot === 2 ? { mine: true } : {}) }));
    const { container } = render(<LotteryReveal rows={plain} ruleLine="No drawing." reveal={false} drawn={false} mineLabel="your club" />);
    const tiles = [...container.querySelectorAll('[data-lottery-slot]')];
    expect(tiles.map(t => t.querySelector('[data-lottery-under]')?.textContent ?? null)).toEqual([null, 'your club', null]);
    expect(container.querySelectorAll('[data-lottery-mark]').length).toBe(1);
    expect(container.textContent).not.toMatch(/Seed|Held/);
    /* It is not a lottery, so the way back from its rules does not call it one. */
    const order = render(<LotteryReveal rows={plain} ruleLine="No drawing." eyebrow="The draft order" reveal={false} drawn={false} help={HELP} />);
    const q = order.container.querySelector('[data-lottery-help]') as HTMLButtonElement;
    expect(q.getAttribute('aria-label')).toBe('How the order works');
    fireEvent.click(q);
    expect(order.container.querySelector('[data-lottery-help-close]')!.textContent).toBe('Back to the order');
    expect(q.getAttribute('aria-label')).toBe('Back to the order');
    expect(order.container.textContent).not.toMatch(/lottery/i);
    /* With a drawing the same rows say both, and the mark is the default one. */
    const drawn = render(<LotteryReveal rows={plain} ruleLine="A drawing." />);
    expect([...drawn.container.querySelectorAll('[data-lottery-under]')].map(u => u.textContent))
      .toEqual(['Seed 1 · Held', 'Seed 2 · Held · yours', 'Seed 3 · Held']);
  });

  it('draws the last frame at once when there is nothing to reveal', () => {
    const { container } = render(<LotteryReveal rows={rows} ruleLine={rule} headline="The order is set." reveal={false} />);
    expect(container.querySelector('[data-lottery-reveal]')!.hasAttribute('data-lottery-settled')).toBe(true);
    for (const f of container.querySelectorAll('[data-lottery-face], [data-lottery-headline]')) expect((f as HTMLElement).style.animationDelay).toBe('');
  });

  it('draws nothing at all for no rows', () => {
    const { container } = render(<LotteryReveal rows={[]} ruleLine={rule} onContinue={() => {}} />);
    expect(container.querySelector('[data-lottery-reveal]')).toBeNull();
  });

  it('names every class it animates inside its reduced motion rule, so less motion ends on the last frame', () => {
    const { container } = render(<LotteryReveal rows={rows} ruleLine={rule} headline="x" />);
    const css = container.querySelector('style')!.textContent ?? '';
    const at = css.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(at).toBeGreaterThan(-1);
    const reduced = css.slice(at);
    expect(reduced).toMatch(/animation:\s*none/);
    expect(reduced).toMatch(/opacity:\s*1/);
    const animated = new Set<string>();
    for (const m of css.slice(0, at).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (m[1].trim().startsWith('@') || !/(^|[;\s])animation(-name)?\s*:/.test(m[2])) continue;
      for (const c of m[1].matchAll(/\.([\w-]+)/g)) animated.add(c[1]);
    }
    expect([...animated].sort()).toEqual(['lr-after', 'lr-face', 'lr-settled']);
    for (const c of animated) expect(reduced, c).toContain(`.${c}`);
  });

  it('renders on the server with every tile and the button, in both modes', () => {
    for (const reveal of [true, false]) {
      const html = renderToStaticMarkup(<LotteryReveal rows={rows} ruleLine={rule} headline="Set." help={HELP} onContinue={() => {}} reveal={reveal} />);
      expect((html.match(/data-lottery-slot=/g) ?? []).length).toBe(14);
      expect(html).toContain('data-lottery-continue');
      expect(html).toContain('data-lottery-help');
      expect(html.includes('data-lottery-settled')).toBe(!reveal);
      expect(html.includes('animation-delay')).toBe(reveal);
      expect(html).not.toMatch(/NaN|undefined/);
    }
  });
});
