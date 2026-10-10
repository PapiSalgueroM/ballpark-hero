/* Round 1220: draft night on screen. The builder's rows are held by
   scripts/simCareerPreDraft.mjs section 13 on 16,000 roads a seed set; this
   file holds what a harness cannot see: the DOM of the first frame, the
   clock, the skip, the spoilers and the card that hosts it. */
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DraftNightSequence, CAREER_NIGHT_CEILING_MS, buildCareerDraftNight, careerNightClock } from '@/components/career/DraftNightSequence';
import { DraftShowcaseCard } from '@/components/career/DraftShowcaseCard';
import { careerNightResultLine } from '@/lib/careerDraftNight';
import {
  preDraftChoose, preDraftOrder, preDraftPlaySeason, preDraftProjection, preDraftProjectionLine, preDraftRunDraft,
  preDraftShowcase, preDraftStart, type PreDraftDescriptor, type PreDraftState,
} from '@/lib/careerPreDraft';
import { nflPreDraftDescriptor } from '@/lib/nflCareerPreDraft';
import { nbaPreDraftDescriptor, NBA_LOTTERY_NOW } from '@/lib/nbaCareerPreDraft';
import { mlbPreDraftDescriptor } from '@/lib/mlbCareerPreDraft';
import { nhlPreDraftDescriptor } from '@/lib/nhlCareerPreDraft';
import { NBA_PICK_RULES } from '@/lib/gmPicks';
import { lotteryRevealPace } from '@/lib/lotteryReveal';

const PAIRS: [string, PreDraftDescriptor][] = [
  ['NFL now', nflPreDraftDescriptor('now')], ['NFL 2005', nflPreDraftDescriptor('y2005')],
  ['NBA now', nbaPreDraftDescriptor('now')], ['NBA 2003', nbaPreDraftDescriptor('y2004')],
  ['MLB now', mlbPreDraftDescriptor('now')], ['MLB 2004', mlbPreDraftDescriptor('y2004')],
  ['NHL now', nhlPreDraftDescriptor('now')], ['NHL 2006', nhlPreDraftDescriptor('y2006')],
];
const anyDash = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

/** A whole road, engine made, stopped before the draft. */
function atDraft(desc: PreDraftDescriptor, seed: string, rating = 70): PreDraftState {
  let s = preDraftStart(desc, { seed, routeId: desc.routes[0].id, rating, pot: Math.min(99, rating + 10) });
  for (let n = 0; n < 12 && s.phase !== 'showcase'; n += 1) s = s.phase === 'season' ? preDraftPlaySeason(desc, s) : preDraftChoose(desc, s, 0);
  return preDraftShowcase(desc, s, 'steady');
}
/** The same road with the outcome set to a pick the order backs (null: undrafted). */
function endedAt(desc: PreDraftDescriptor, pick: number | null, seed = 'night'): PreDraftState {
  const done = preDraftRunDraft(desc, atDraft(desc, seed));
  const teams = desc.teamIds();
  if (pick === null) return { ...done, draft: { ...done.draft!, pick: null, round: null, pickInRound: null, team: teams[0] } };
  const round = Math.ceil(pick / teams.length);
  return { ...done, draft: { ...done.draft!, pick, round, pickInRound: pick - (round - 1) * teams.length, team: preDraftOrder(desc, done.seed).order[pick - 1] } };
}
const total = (desc: PreDraftDescriptor) => desc.teamIds().length * desc.rounds;
const noop = () => undefined;

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('the clock is the component\'s, and every night lands inside the ceiling', () => {
  it.each(PAIRS)('%s: picks 1 to 12, the last four and undrafted', (_, desc) => {
    const picks: (number | null)[] = [...Array.from({ length: 12 }, (_x, k) => k + 1), total(desc) - 3, total(desc) - 2, total(desc) - 1, total(desc), null];
    const lengths = new Set<number>();
    for (const pick of picks) {
      const night = buildCareerDraftNight(desc, endedAt(desc, pick))!;
      expect(night).not.toBeNull();
      const clock = careerNightClock(night);
      lengths.add(night.board.length);
      // A tenth of the ceiling stays in hand, so a nudge to the pace cannot sit on the bound.
      expect(clock.landedAt * 1000).toBeLessThanOrEqual(CAREER_NIGHT_CEILING_MS * 0.9 + 1);
      expect(clock.step).toBeGreaterThan(0.2);
      expect(clock.closeAt).toBeGreaterThan(clock.start);
      // The board never starts before the lottery tile has finished turning.
      if (night.lottery.length) expect(clock.start * 1000).toBeGreaterThanOrEqual(lotteryRevealPace(night.lottery.length).totalMs);
    }
    // Every board length this sport can show was timed, the longest included.
    expect(Math.max(...lengths)).toBe(desc.lottery ? 5 : 8);
    expect(Math.min(...lengths)).toBe(1);
  });
});

describe('the first frame holds the whole night', () => {
  it.each(PAIRS)('%s: every row, both buttons and no spoiler', (_, desc) => {
    const state = endedAt(desc, 20);
    const night = buildCareerDraftNight(desc, state)!;
    const clock = careerNightClock(night);
    const view = render(<DraftNightSequence night={night} desc={desc} draftYear={state.draft!.draftYear} stage="live" onLanded={noop} onSkip={noop} onContinue={noop} />);
    const root = view.container.querySelector<HTMLElement>('[data-career-night]')!;
    const rows = [...root.querySelectorAll<HTMLElement>('[data-night-row]')];
    expect(rows.map(r => r.dataset.nightRow)).toEqual(night.board.map(r => r.kind));
    // Rows arrive in order on the kit's delays, the closing row last and after a breath.
    const delays = rows.map(r => parseFloat(r.style.animationDelay));
    expect(delays.slice(0, -1)).toEqual(night.board.slice(0, -1).map((_r, i) => Math.round((clock.start + i * clock.step) * 1000) / 1000));
    expect(delays[delays.length - 1]).toBe(clock.closeAt);
    for (let i = 1; i < delays.length; i += 1) expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    // Both ways off the night are live at once, and neither wears a name the road's other buttons use.
    expect(within(root).getByRole('button', { name: 'Start your career' })).toBeEnabled();
    expect(within(root).getByRole('button', { name: 'Skip to the end' })).toBeEnabled();
    for (const b of within(root).getAllByRole('button')) expect(b.textContent).not.toMatch(/Play it safe|Go all out|^Draft day$/);
    // The burst fires on mount, so it may not be here before the closing row has landed.
    expect(root.querySelector('.cm-confetti')).toBeNull();
    expect(within(root).getByRole('status')).toBeEmptyDOMElement();
    expect(root.querySelector('[data-night-range]')).toHaveTextContent(preDraftProjectionLine(preDraftProjection(desc, state), 'had'));
    expect(root.textContent ?? '').not.toMatch(anyDash);
    // The closing row is the saved pick and club, and every row above it is a club and a number.
    const out = state.draft!;
    expect(rows[rows.length - 1]).toHaveTextContent(`Pick ${out.pick}: ${desc.teamLabel(out.team)}`);
    expect(rows[rows.length - 1]).toHaveTextContent(`Round ${out.round}, pick ${out.pickInRound}.`);
    // It is in the DOM from the first frame, so until it lands it is kept out of a screen reader's tree. The rows above it are not.
    expect(rows.map(r => r.getAttribute('aria-hidden'))).toEqual([...rows.slice(0, -1).map(() => null), 'true']);
    // The lottery tile is there exactly where the engine has a lottery, one tile a drawn pick.
    const tiles = root.querySelectorAll('[data-lottery-slot]');
    expect(tiles.length).toBe(desc.lottery ? desc.lottery.drawn : 0);
    if (desc.lottery) expect(root.querySelector('[data-lottery-note]')).toHaveTextContent('A simulated lottery.');
  });

  it('the closing row landing is what ends the night, and only that row', () => {
    const desc = nflPreDraftDescriptor('now');
    const night = buildCareerDraftNight(desc, endedAt(desc, 20))!;
    const onLanded = vi.fn();
    const view = render(<DraftNightSequence night={night} desc={desc} draftYear={2026} stage="live" onLanded={onLanded} onSkip={noop} />);
    const rows = view.container.querySelectorAll<HTMLElement>('[data-night-row]');
    fireEvent.animationEnd(rows[0]);
    fireEvent.animationEnd(rows[rows.length - 1].firstElementChild!);
    expect(onLanded).not.toHaveBeenCalled();
    fireEvent.animationEnd(rows[rows.length - 1]);
    expect(onLanded).toHaveBeenCalledTimes(1);
    // Without a way on from the caller there is no second button, and the skip is still there.
    expect(within(view.container).getAllByRole('button').map(b => b.textContent)).toEqual(['Skip to the end']);
  });

  /* Where the night ends up on screen. jsdom lays nothing out and cannot scroll, so the layout is
     handed in and the asks are counted; the browser walk measures the real thing (a phone on its
     side, 844 by 390, is the screen shorter than the night). */
  describe('the press shows a night that fits whole, and a night that does not is shown from its start to its ending', () => {
    const desc = nflPreDraftDescriptor('now');
    const night = buildCareerDraftNight(desc, endedAt(desc, 40))!;
    const SCREEN = 768; // jsdom's window.innerHeight
    /** A screen of 768 px with the night `nightHeight` high and its buttons at `actionsTop`. */
    function screen(nightHeight: number, actionsTop: number) {
      const asked: ScrollIntoViewOptions[] = [];
      const place = { top: actionsTop };
      const frames = new Map<number, FrameRequestCallback>();
      let id = 0;
      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(cb => { id += 1; frames.set(id, cb); return id; });
      vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(n => { frames.delete(n); });
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
        const actions = this.hasAttribute('data-night-actions');
        const top = actions ? place.top : 0, height = actions ? 48 : this.hasAttribute('data-career-night') ? nightHeight : 0;
        return { top, bottom: top + height, height, left: 0, right: 300, width: 300, x: 0, y: top, toJSON: () => ({}) };
      });
      const doc = document as unknown as { elementsFromPoint?: unknown };
      const proto = Element.prototype as unknown as { scrollIntoView?: unknown };
      doc.elementsFromPoint = () => [];
      // The page answers an ask the way a browser does: the buttons end up at the foot of the screen.
      proto.scrollIntoView = function (this: Element, options: ScrollIntoViewOptions) { if (this.hasAttribute('data-night-actions')) { asked.push(options); place.top = SCREEN - 60; } };
      /** Let the frames a reveal waits for go by (a cancelled one never runs). */
      const settle = () => { while (frames.size) { const [n, cb] = frames.entries().next().value!; frames.delete(n); cb(0); } return asked.length; };
      return { asked, settle, undo: () => { delete doc.elementsFromPoint; delete proto.scrollIntoView; } };
    }
    const closingRow = (root: HTMLElement) => { const rows = root.querySelectorAll<HTMLElement>('[data-night-row]'); return rows[rows.length - 1]; };
    const nightAt = (stage: 'live' | 'landed' | 'skipped') => <DraftNightSequence night={night} desc={desc} draftYear={2026} stage={stage} onLanded={noop} onSkip={noop} onContinue={noop} />;

    it('a night that fits: the press brings its buttons in, and the page is not asked to move again', () => {
      const s = screen(500, 900);
      try {
        const view = render(nightAt('live'));
        expect(s.settle()).toBe(1);
        expect(s.asked[0]).toMatchObject({ block: 'end' });
        fireEvent.animationStart(closingRow(view.container));
        view.rerender(nightAt('landed'));
        expect(s.settle()).toBe(1);
      } finally { s.undo(); }
    });

    it('a night taller than the screen: the press leaves the page alone, and the ending is brought in when the closing row starts to land', () => {
      const s = screen(900, 900);
      try {
        const view = render(nightAt('live'));
        expect(s.settle()).toBe(0);
        // A row above the closing one starting to arrive is not the ending, and neither is a child of the closing row.
        fireEvent.animationStart(view.container.querySelector('[data-night-row]')!);
        fireEvent.animationStart(closingRow(view.container).firstElementChild!);
        expect(s.settle()).toBe(0);
        fireEvent.animationStart(closingRow(view.container));
        expect(s.settle()).toBe(1);
        expect(s.asked[0]).toMatchObject({ block: 'end' });
        // Landing after that is the same ending: no second ask.
        view.rerender(nightAt('landed'));
        expect(s.settle()).toBe(1);
      } finally { s.undo(); }
    });

    it('a night taller than the screen: Skip brings the ending in as well', () => {
      const s = screen(900, 900);
      try {
        const view = render(nightAt('live'));
        expect(s.settle()).toBe(0);
        view.rerender(nightAt('skipped'));
        expect(s.settle()).toBe(1);
      } finally { s.undo(); }
    });

    it('a night taller than the screen, and the player scrolled down to the buttons himself: nothing is asked', () => {
      const s = screen(900, 600);
      try {
        const view = render(nightAt('live'));
        fireEvent.animationStart(closingRow(view.container));
        view.rerender(nightAt('landed'));
        expect(s.settle()).toBe(0);
      } finally { s.undo(); }
    });

    it('how much of its top a night may lose: 28 px over the screen still counts as fitting, 29 does not', () => {
      for (const [over, atPress] of [[0, 1], [28, 1], [29, 0], [140, 0]] as const) {
        const s = screen(SCREEN + over, 900);
        try {
          const view = render(nightAt('live'));
          expect([over, s.settle()]).toEqual([over, atPress]);
          view.unmount();
        } finally { s.undo(); vi.restoreAllMocks(); }
      }
    });
  });

  it('skipped is the last frame: no delays, no skip, the result said once', () => {
    for (const [, desc] of PAIRS) {
      for (const pick of [1, 40, null]) {
        const state = endedAt(desc, pick);
        const night = buildCareerDraftNight(desc, state)!;
        const onSkip = vi.fn();
        const live = render(<DraftNightSequence night={night} desc={desc} draftYear={2026} stage="live" onLanded={noop} onSkip={onSkip} onContinue={noop} />);
        fireEvent.click(within(live.container).getByRole('button', { name: 'Skip to the end' }));
        expect(onSkip).toHaveBeenCalledTimes(1);
        live.unmount();
        const view = render(<DraftNightSequence night={night} desc={desc} draftYear={2026} stage="skipped" onLanded={noop} onSkip={noop} onContinue={noop} />);
        const rows = [...view.container.querySelectorAll<HTMLElement>('[data-night-row]')];
        expect(rows.length).toBe(night.board.length);
        for (const r of rows) { expect(r.style.animationDelay).toBe(''); expect(r.className).not.toMatch(/cm-(tick-in|slam|rise)/); expect(r).not.toHaveAttribute('aria-hidden'); }
        expect(within(view.container).queryByRole('button', { name: 'Skip to the end' })).toBeNull();
        expect(within(view.container).getByRole('button', { name: 'Start your career' })).toBeEnabled();
        expect(within(view.container).getByRole('status')).toHaveTextContent(careerNightResultLine(night.board[night.board.length - 1], desc.teamLabel));
        if (desc.lottery) expect(view.container.querySelector('[data-lottery-settled]')).not.toBeNull();
        // Confetti is for a round one pick and nobody else, and never before the row is in.
        expect(!!view.container.querySelector('.cm-confetti')).toBe(pick !== null && pick <= desc.teamIds().length);
        view.unmount();
      }
    }
  });

  it('an undrafted night ends on the last pick and names the club that signs him', () => {
    const desc = mlbPreDraftDescriptor('y2004');
    const state = endedAt(desc, null);
    const night = buildCareerDraftNight(desc, state)!;
    expect(night.board.length).toBe(6);
    const view = render(<DraftNightSequence night={night} desc={desc} draftYear={2004} stage="landed" onLanded={noop} onSkip={noop} onContinue={noop} />);
    const rows = [...view.container.querySelectorAll<HTMLElement>('[data-night-row]')];
    expect(rows[rows.length - 2]).toHaveTextContent(String(total(desc)));
    expect(rows[rows.length - 1]).toHaveTextContent('Your name was not called.');
    expect(rows[rows.length - 1]).toHaveTextContent(desc.teamLabel(state.draft!.team));
    expect(view.container.querySelector('.cm-confetti')).toBeNull();
    // Landed keeps the classes it arrived with: taking them off in mid air would be a jump.
    expect(rows[0].className).toMatch(/cm-tick-in/);
  });
});

/* The one row the night exists to show, held word for word. Every other case
   in this file ends on pick 20 or pick 40, and pick 20 is in round one in
   every sport and era, where the overall pick and the pick in the round are
   the same number: a row that printed one for the other passed everything. */
describe('the row that ends the night, word for word', () => {
  const rowWords = (root: HTMLElement, kind: 'you' | 'unpicked') => [...root.querySelector<HTMLElement>(`[data-night-row='${kind}']`)!.children].map(el => el.textContent);

  it.each(PAIRS)('%s: a pick past round one prints its round and its pick in that round', (_, desc) => {
    const teams = desc.teamIds().length;
    // The numbers are typed here, not read back from the state: the fifth pick
    // of round two, and the last pick of the draft.
    const cases = [{ pick: teams + 5, round: 2, inRound: 5 }, { pick: total(desc), round: desc.rounds, inRound: teams }];
    for (const c of cases) {
      expect(c.pick).not.toBe(c.inRound);
      const state = endedAt(desc, c.pick);
      const label = desc.teamLabel(state.draft!.team);
      const view = render(<DraftNightSequence night={buildCareerDraftNight(desc, state)!} desc={desc} draftYear={state.draft!.draftYear} stage="landed" onLanded={noop} onSkip={noop} onContinue={noop} />);
      expect(rowWords(view.container, 'you')).toEqual([`Pick ${c.pick}: ${label}`, `Your name is called. Round ${c.round}, pick ${c.inRound}.`]);
      // And what a screen reader hears when it lands: the same three numbers, each in its place.
      expect(within(view.container).getByRole('status').textContent).toBe(`Round ${c.round}, pick ${c.inRound}, ${c.pick} overall. ${label} take you.`);
      view.unmount();
    }
  });

  it('NFL now, typed out: the 85th pick is the 21st pick of round 3', () => {
    const desc = nflPreDraftDescriptor('now');
    expect(desc.teamIds().length).toBe(32);
    const state = endedAt(desc, 85);
    const view = render(<DraftNightSequence night={buildCareerDraftNight(desc, state)!} desc={desc} draftYear={2026} stage="landed" onLanded={noop} onSkip={noop} onContinue={noop} />);
    expect(rowWords(view.container, 'you')[0]).toBe(`Pick 85: ${desc.teamLabel(state.draft!.team)}`);
    expect(rowWords(view.container, 'you')[1]).toBe('Your name is called. Round 3, pick 21.');
  });

  it.each(PAIRS)('%s: a night without his name says so and names the club that signs him', (_, desc) => {
    const state = endedAt(desc, null);
    const label = desc.teamLabel(state.draft!.team);
    const view = render(<DraftNightSequence night={buildCareerDraftNight(desc, state)!} desc={desc} draftYear={state.draft!.draftYear} stage="landed" onLanded={noop} onSkip={noop} onContinue={noop} />);
    expect(rowWords(view.container, 'unpicked')).toEqual(['The last pick is in.', `Your name was not called. Your first club: ${label}.`]);
    expect(within(view.container).getByRole('status').textContent).toBe(`Pick ${total(desc)} is the last one, and your name was not called. Your first club: ${label}.`);
  });
});

/* Two sentences built from numbers, typed out here so a swapped number or a
   boundary one pick off cannot pass: the harness only checks that the numbers
   are somewhere in the line. */
describe('two sentences, typed out', () => {
  it('the range line changes its words exactly where the range passes the last pick', () => {
    expect(preDraftProjectionLine({ lo: 200, hi: 223, total: 224 }, 'had')).toBe('The scouts had you between pick 200 and pick 223 of 224.');
    // A range that ends ON the last pick is still a range of picks: he cannot go undrafted.
    expect(preDraftProjectionLine({ lo: 200, hi: 224, total: 224 }, 'had')).toBe('The scouts had you between pick 200 and pick 224 of 224.');
    expect(preDraftProjectionLine({ lo: 200, hi: 225, total: 224 }, 'had')).toBe('The scouts had you between pick 200 and undrafted. This draft has 224 picks.');
    expect(preDraftProjectionLine({ lo: 224, hi: 224, total: 224 }, 'have')).toBe('The scouts have you at pick 224 of 224.');
    expect(preDraftProjectionLine({ lo: 224, hi: 300, total: 224 }, 'have')).toBe('The scouts have you between pick 224 and undrafted. This draft has 224 picks.');
    expect(preDraftProjectionLine({ lo: 225, hi: 300, total: 224 }, 'have')).toBe('The scouts have you outside the 224 picks of this draft.');
  });

  it('what a screen reader hears puts the round, the pick in it and the overall pick in their places', () => {
    expect(careerNightResultLine({ kind: 'you', pick: 85, round: 3, pickInRound: 21, team: 'x' }, () => 'The Club')).toBe('Round 3, pick 21, 85 overall. The Club take you.');
    expect(careerNightResultLine({ kind: 'unpicked', lastPick: 224, team: 'x' }, () => 'The Club')).toBe('Pick 224 is the last one, and your name was not called. Your first club: The Club.');
    expect(careerNightResultLine({ kind: 'pick', pick: 3, round: 1, team: 'x' }, () => 'The Club')).toBe('');
  });
});

/* The lottery tile is two to a row, about a hundred pixels for a club on a
   390 wide phone, and the full NBA names were cut off there. The mount hands
   it the club's own name; the walk measures the pixels of every club. */
describe('the lottery tile names each winner in words that fit', () => {
  const LOTTERIES = PAIRS.filter(([, d]) => !!d.lottery);

  it('only the NBA has a lottery here, in both eras', () => {
    expect(LOTTERIES.map(([name]) => name)).toEqual(['NBA now', 'NBA 2003']);
  });

  it.each(LOTTERIES)('%s: every club has a name of its own, the end of its full name', (_, desc) => {
    for (const id of desc.teamIds()) {
      const short = desc.teamShort!(id);
      expect(short.length).toBeGreaterThan(0);
      expect(desc.teamLabel(id).endsWith(` ${short}`)).toBe(true);
      // The longest today is "Trail Blazers". A longer one must be measured in the walk first.
      expect(short.length).toBeLessThanOrEqual(13);
    }
  });

  it.each(LOTTERIES)('%s: each tile is the winner by that name, its seed and which way it moved', (_, desc) => {
    const ways = new Set<string>();
    for (let n = 0; n < 12; n += 1) {
      const state = endedAt(desc, 40, `tile-${n}`);
      const o = preDraftOrder(desc, state.seed);
      const view = render(<DraftNightSequence night={buildCareerDraftNight(desc, state)!} desc={desc} draftYear={state.draft!.draftYear} stage="skipped" onLanded={noop} onSkip={noop} onContinue={noop} />);
      for (let slot = 1; slot <= desc.lottery!.drawn; slot += 1) {
        const club = o.lotteryWinners[slot - 1];
        // Seed 1 is the worst record, so a club that won a pick better than its record moved UP.
        // Worked out here from the order itself, never from the number the mount hands the tile.
        const seed = o.standings.indexOf(club) + 1;
        const way = seed > slot ? `Up ${seed - slot}` : seed < slot ? `Down ${slot - seed}` : 'Held';
        ways.add(way.split(' ')[0]);
        const face = view.container.querySelector<HTMLElement>(`[data-lottery-slot='${slot}'] [data-lottery-face]`)!;
        expect([...face.lastElementChild!.children].map(el => el.textContent)).toEqual([desc.teamShort!(club), `Seed ${seed} · ${way}`]);
      }
      // The line under the tiles keeps the city.
      expect(view.container.querySelector('[data-lottery-headline]')!.textContent).toBe(`${desc.teamLabel(o.lotteryWinners[0])} hold the first pick.`);
      view.unmount();
    }
    // These seeds drew clubs that rose, fell and stayed, so all three words were read.
    expect([...ways].sort()).toEqual(['Down', 'Held', 'Up']);
  });

  it('typed out: the fifth worst record winning the second pick reads "Up 3", and the worst record at pick 4 "Down 3"', () => {
    const desc = nbaPreDraftDescriptor('now');
    // Find the two cases in real orders, so the words are read off real tiles.
    let up = false, down = false;
    for (let n = 0; n < 400 && !(up && down); n += 1) {
      const state = endedAt(desc, 40, `typed-${n}`);
      const o = preDraftOrder(desc, state.seed);
      const want = (slot: number, seed: number) => o.standings.indexOf(o.lotteryWinners[slot - 1]) + 1 === seed;
      if (!((want(2, 5) && !up) || (want(4, 1) && !down))) continue;
      const view = render(<DraftNightSequence night={buildCareerDraftNight(desc, state)!} desc={desc} draftYear={2026} stage="skipped" onLanded={noop} onSkip={noop} onContinue={noop} />);
      const line = (slot: number) => view.container.querySelector(`[data-lottery-slot='${slot}'] [data-lottery-face]`)!.lastElementChild!.children[1].textContent;
      if (want(2, 5)) { expect(line(2)).toBe('Seed 5 · Up 3'); up = true; }
      if (want(4, 1)) { expect(line(4)).toBe('Seed 1 · Down 3'); down = true; }
      view.unmount();
    }
    expect({ up, down }).toEqual({ up: true, down: true });
  });
});

describe('the card that hosts the night', () => {
  const desc = nflPreDraftDescriptor('now');
  it('without the new props it is the card it was', () => {
    const before = atDraft(desc, 'card');
    const a = render(<DraftShowcaseCard desc={desc} state={before} onShowcase={noop} onRunDraft={noop} />);
    expect(a.queryByTestId('draft-range')).toBeNull();
    a.unmount();
    const done = preDraftRunDraft(desc, before);
    const b = render(<DraftShowcaseCard desc={desc} state={done} onShowcase={noop} onRunDraft={noop} onContinue={noop} />);
    const result = b.getByTestId('draft-result');
    expect(within(result).getByRole('button', { name: 'Start your career' })).toBeEnabled();
    expect(result.className).toBe('space-y-2');
    expect(result.style.animationDelay).toBe('');
    expect(b.container.querySelector('[data-career-night]')).toBeNull();
  });

  it('prints the range before the draft, from the arithmetic the draft draws with', () => {
    const before = atDraft(desc, 'card');
    const view = render(<DraftShowcaseCard desc={desc} state={before} onShowcase={noop} onRunDraft={noop} showRange />);
    const p = preDraftProjection(desc, before);
    expect(view.getByTestId('draft-range')).toHaveTextContent(preDraftProjectionLine(p, 'have'));
    const done = preDraftRunDraft(desc, before);
    const pick = done.draft!.pick;
    expect(pick === null ? p.hi > p.total : pick >= p.lo && pick <= p.hi).toBe(true);
    // The range is a line of the draft step only: it is gone once the draft has run.
    view.unmount();
    expect(render(<DraftShowcaseCard desc={desc} state={done} onShowcase={noop} onRunDraft={noop} showRange />).queryByTestId('draft-range')).toBeNull();
  });

  it('with a night: the night sits above the result, the result waits, and the way on is the night\'s own', () => {
    const done = preDraftRunDraft(desc, atDraft(desc, 'card'));
    const view = render(<DraftShowcaseCard desc={desc} state={done} onShowcase={noop} onRunDraft={noop} onContinue={noop}
      night={<div data-testid="night-slot"><button>Start your career</button></div>} nightHold="2.5s" />);
    const result = view.getByTestId('draft-result');
    expect(view.getByTestId('night-slot').compareDocumentPosition(result) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(result.className).toContain('cm-rise');
    expect(result.style.animationDelay).toBe('2.5s');
    expect(within(result).queryByRole('button')).toBeNull();
    // One way on, never two: the card's own button steps aside for the night's.
    expect(view.getAllByRole('button', { name: 'Start your career' })).toHaveLength(1);
    expect(result).toHaveTextContent(desc.teamLabel(done.draft!.team));
  });
});

describe('one lottery table, typed twice on main', () => {
  it('the career road and the front office use the same NBA odds', () => {
    const gm = NBA_PICK_RULES.lottery!;
    expect(gm.clubs).toBe(NBA_LOTTERY_NOW.teams);
    expect(gm.draws).toBe(NBA_LOTTERY_NOW.drawn);
    // Percent there, combinations out of 1000 here.
    expect(gm.odds.map(pct => Math.round(pct * 10))).toEqual(NBA_LOTTERY_NOW.combos);
  });
});
