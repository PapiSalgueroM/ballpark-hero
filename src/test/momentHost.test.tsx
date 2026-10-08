/* Round 1047: the moment host's "one go" contract.

   A moment's attempt is used the instant its board opens. On a phone the
   Season Centre could once take the stage away from an open board (the
   Fixtures tile) and mount the host again, and the host came back as a
   fresh offer with both buttons live. These tests hold the host's own half
   of the fix: a moment that is already in the ledger when the host mounts is
   a used card with one way back, never an offer, whatever unmounted the card
   that used it; and the offer says how its board is played before the go is
   spent. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MomentHost, type CentreMoment, type CentreMoments } from '@/components/season-centre/MomentHost';

const HOW = 'Wall Shot, one shot. Drag the goal to aim.';
const moment = (taken: CentreMoment['taken'] = null): CentreMoment => ({
  md: 9, id: 0, minute: 82, mode: 'call', line: 'The ball breaks to you on the edge of the box',
  objective: 'What you do here is what happened in this match.', how: HOW, taken,
});
function kit() {
  const use = vi.fn();
  const settle = vi.fn(() => ({ made: true, stars: 2, verdict: 'Top corner.', after: 'It counts.', wonMatch: false }));
  const moments: CentreMoments = {
    list: [], feedback: 'goal', kickoff: null, review: [], bank: vi.fn(),
    preload: () => Promise.resolve(), use, settle,
    board: (_m, done) => <button type="button" data-test-board onClick={() => done([0.1, 0.2, 0.3])}>play</button>,
  };
  return { moments, use, settle };
}
const q = (c: HTMLElement, sel: string) => c.querySelector(sel);
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('the moment host gives one go', () => {
  it('offers a fresh moment with how its board is played, and uses the go before the board is on screen', async () => {
    const { moments, use } = kit();
    const onDone = vi.fn();
    const v = render(<MomentHost moment={moment()} moments={moments} scoreLine="81' · 1-1" reduced onDone={onDone} />);
    expect(q(v.container, '[data-moment-offer]')).not.toBeNull();
    expect(q(v.container, '[data-moment-how]')?.textContent).toBe(`How it plays: ${HOW}`);
    /* the card holds the focus, not one of its buttons: a held key takes no go */
    expect(document.activeElement).toBe(q(v.container, '[data-moment-offer]'));
    expect(use).not.toHaveBeenCalled();
    /* a real press moves the focus to the button, and the button is gone once the board is up */
    (q(v.container, '[data-moment-take]') as HTMLElement).focus();
    fireEvent.click(q(v.container, '[data-moment-take]')!);
    await flush();
    expect(use).toHaveBeenCalledTimes(1);
    expect(q(v.container, '[data-test-board]')).not.toBeNull();
    /* the keyboard stays inside the Season Centre while the board is up */
    expect(document.activeElement).toBe(q(v.container, '[data-moment-board]'));
  });

  it('mounts a moment that is already used as a used card: no offer, no second board, one way back', async () => {
    for (const taken of [{ stars: 0, made: false }, { stars: 2, made: true }]) {
      const { moments, use, settle } = kit();
      const onDone = vi.fn();
      const v = render(<MomentHost moment={moment(taken)} moments={moments} scoreLine="81' · 1-1" reduced onDone={onDone} />);
      expect(q(v.container, '[data-moment-spent]')).not.toBeNull();
      expect(q(v.container, '[data-moment-offer]')).toBeNull();
      expect(q(v.container, '[data-moment-take]')).toBeNull();
      expect(q(v.container, '[data-moment-pass]')).toBeNull();
      expect(q(v.container, '[data-moment-stars]')?.getAttribute('data-moment-stars') ?? null).toBe(taken.made ? '2' : null);
      fireEvent.click(q(v.container, '[data-moment-back]')!);
      /* took is true: he is never told he "let it play" on a go that was used */
      expect(onDone).toHaveBeenCalledWith(true);
      expect(use).not.toHaveBeenCalled();
      expect(settle).not.toHaveBeenCalled();
      cleanup();
    }
  });

  it('the phone path: a board left open and the host mounted again never hands the offer back', async () => {
    const { moments, use } = kit();
    const first = render(<MomentHost moment={moment()} moments={moments} scoreLine="81' · 1-1" reduced onDone={vi.fn()} />);
    fireEvent.click(q(first.container, '[data-moment-take]')!);
    await flush();
    expect(use).toHaveBeenCalledTimes(1);
    /* the stage is taken away with the board open: the ledger now holds the used entry */
    first.unmount();
    const again = render(<MomentHost moment={moment({ stars: 0, made: false })} moments={moments} scoreLine="81' · 1-1" reduced onDone={vi.fn()} />);
    expect(q(again.container, '[data-moment-take]')).toBeNull();
    expect(q(again.container, '[data-test-board]')).toBeNull();
    expect(q(again.container, '[data-moment-spent]')).not.toBeNull();
    expect(use).toHaveBeenCalledTimes(1);
  });

  it('a press that lands after the moment was used opens nothing', async () => {
    const { moments, use } = kit();
    const v = render(<MomentHost moment={moment()} moments={moments} scoreLine="81' · 1-1" reduced onDone={vi.fn()} />);
    const take = q(v.container, '[data-moment-take]')!;
    /* the model catches up while the offer is still on screen */
    v.rerender(<MomentHost moment={moment({ stars: 0, made: false })} moments={moments} scoreLine="81' · 1-1" reduced onDone={vi.fn()} />);
    fireEvent.click(take);
    await flush();
    expect(use).not.toHaveBeenCalled();
    expect(q(v.container, '[data-test-board]')).toBeNull();
    expect(q(v.container, '[data-moment-spent]')).not.toBeNull();
  });
});
