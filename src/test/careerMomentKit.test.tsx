/* Round 1107: the career moment kit's contract (src/components/career-moments).

   One card, four scenes, three states. These tests hold what a binder may
   lean on: the facts print verbatim and in order, the beats strictly
   increase, a quiet scene stays quiet, the number is two true strings and
   never a third, a scene plays once per key, the kit draws one button at
   most and calls it once, and the help strings name no sport and no pay
   period (the four US boards show the same five in Round 1131).

   The browser half (nothing moves the page, the number never lies frame by
   frame, reduced motion, 320 px) is scripts/simCareerMoments.mjs. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CAREER_MOMENT_HELP_RULES, CareerMomentCard, CareerMomentCardView, MilestoneMoment, TrophyMoment,
  clampLines, flatColour, isMomentSettled, momentBeats, resetCareerMomentsForTest, settleMoments,
  type CareerMomentSpec, type MomentKind,
} from '@/components/career-moments';
import { SignedSlip, signingSpec, type SignedNote } from '@/components/soccer-career/SignedSlip';
import { formatWage, type CareerState } from '@/lib/soccerCareerEngine';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import { localizeMoney } from '@/lib/soccerCurrency';

const spec = (over: Partial<CareerMomentSpec> = {}): CareerMomentSpec => ({
  kind: 'milestone', key: 'k|test', title: 'Up to 71 overall', tone: 'good',
  lines: ['You started the season on 68'], count: { text: '71', from: '68', label: 'overall' },
  ...over,
});
const scene = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-career-moment]')!;
const confetti = (c: HTMLElement) => c.querySelectorAll('.animate-confetti-fall').length;
/* The printed text: style elements and drawings carry no words. */
const printed = (el: HTMLElement) => {
  const copy = el.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('style, svg, [data-cmo-number-old]').forEach(n => n.remove());
  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim();
};

/* Every class the kit or the celebration layer animates. */
const MOVING = ['cm-slam', 'cm-rise', 'cm-tick-in', 'cm-rise-gated', 'cmo-num-new', 'cmo-num-old', 'cmo-ring', 'cmo-ink'];
/* Every class token on an element and everything inside it. */
const classes = (el: HTMLElement) => new Set([el, ...el.querySelectorAll<HTMLElement>('*')].flatMap(n => String(n.getAttribute('class') ?? '').split(' ').filter(Boolean)));

beforeEach(() => { resetCareerMomentsForTest(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Round 1107: the plain data', () => {
  it('lines clamp to three and empty ones are dropped', () => {
    expect(clampLines(undefined)).toEqual([]);
    expect(clampLines(['a', '', '  ', 'b'])).toEqual(['a', 'b']);
    expect(clampLines(['a', 'b', 'c', 'd', 'e'])).toEqual(['a', 'b', 'c']);
  });

  it('a colour is one flat #rrggbb or nothing', () => {
    expect(flatColour('#1D4ED8')).toBe('#1d4ed8');
    for (const bad of ['#fff', 'red', 'rgb(1,2,3)', 'linear-gradient(#111111,#222222)', '#1d4ed8 #ffffff', '', null, undefined, 7]) {
      expect(flatColour(bad), String(bad)).toBeNull();
    }
  });

  it('the beats strictly increase for every kind, with zero, one and three lines, with and without a count', () => {
    const kinds: MomentKind[] = ['signing', 'trophy', 'award', 'milestone'];
    let shapes = 0;
    for (const kind of kinds) for (const n of [0, 1, 3]) for (const withCount of [false, true]) for (const ticks of [0, 8]) {
      const b = momentBeats(spec({ kind, lines: ['a', 'b', 'c'].slice(0, n), count: withCount ? { text: '9' } : undefined }), ticks);
      const order = [b.art, b.title, ...b.lines, ...(b.count === null ? [] : [b.count]), ...(b.ink === null ? [] : [b.ink]), ...b.ticks];
      for (let i = 1; i < order.length; i++) expect(order[i], `${kind} ${n} ${withCount} ${ticks}`).toBeGreaterThan(order[i - 1]);
      expect(b.lines.length).toBe(n);
      expect(b.count === null).toBe(!withCount);
      expect(b.ink === null).toBe(kind !== 'signing');
      expect(b.ticks.length).toBe(ticks);
      shapes += 1;
    }
    expect(shapes).toBe(48);
    /* A fourth line and a ninth tick get no beat. */
    expect(momentBeats(spec({ lines: ['a', 'b', 'c', 'd'] }), 12).lines.length).toBe(3);
    expect(momentBeats(spec(), 12).ticks.length).toBe(8);
  });

  it('the help strings carry no dash, no sport, no club or team and no pay period', () => {
    expect(CAREER_MOMENT_HELP_RULES.length).toBe(5);
    for (const rule of CAREER_MOMENT_HELP_RULES) {
      expect(rule).not.toMatch(/[\u2013\u2014]/);
      expect(rule).not.toMatch(/\b(soccer|football|basketball|baseball|hockey|club|team|league)\b/i);
      expect(rule).not.toMatch(/\ba (week|year|season)\b/i);
    }
    expect(CAREER_MOMENT_HELP_RULES[4].startsWith('Example: ')).toBe(true);
  });
});

describe('Round 1107: the view, state by state', () => {
  const full = spec({ kind: 'signing', title: 'Signed with Rivertown', lines: ['3 years', 'Free transfer', 'A third line', 'A fourth line'], count: { text: '15k', from: '2k', label: 'your pay' }, colour: '#1D4ED8' });

  it('the facts print verbatim and in order, the title is the first h3, and a fourth line is dropped', () => {
    const { container } = render(<CareerMomentCardView spec={full} fresh={false} live={false} bind="t-full" art={<i>art</i>} />);
    const el = scene(container);
    expect(el.dataset.careerMoment).toBe('signing');
    expect(el.dataset.cmoTone).toBe('good');
    expect(el.dataset.cmoState).toBe('still');
    expect(el.dataset.cmoBind).toBe('t-full');
    expect(el.style.getPropertyValue('--cmo-ink')).toBe('#1d4ed8');
    expect(el.querySelector('h3')?.textContent).toBe('Signed with Rivertown');
    expect([...el.querySelectorAll('[data-cmo-beat="line"]')].map(p => p.textContent)).toEqual(['3 years', 'Free transfer', 'A third line']);
    expect(printed(el)).toBe('artSigned with Rivertown3 yearsFree transferA third line15kyour pay');
    expect(el.querySelector('[data-cmo-beat="art"]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('a colour that is not flat falls back to the tone, and the tone decides nothing else about it', () => {
    const { container } = render(<CareerMomentCardView spec={spec({ colour: 'linear-gradient(#111111, #222222)' })} fresh={false} live={false} />);
    expect(scene(container).style.getPropertyValue('--cmo-ink')).toBe('#10b981');
  });

  it('fresh: every beat holds on its first frame, in order, and the old number sits under the new one', () => {
    const { container } = render(<CareerMomentCardView spec={full} fresh live={false} art={<i>art</i>} />);
    const el = scene(container);
    expect(el.dataset.cmoState).toBe('fresh');
    expect(el.className).toContain('cmo-wait');
    const beats = [...el.querySelectorAll<HTMLElement>('[style]')].filter(n => n.style.animationDelay);
    expect(beats.filter(n => n.style.animationPlayState !== 'paused')).toEqual([]);
    const secs = beats.map(n => parseFloat(n.style.animationDelay));
    for (let i = 1; i < secs.length; i++) expect(secs[i]).toBeGreaterThanOrEqual(secs[i - 1]);
    expect(el.querySelector('h3')?.className).toContain('cm-slam');
    const old = el.querySelector<HTMLElement>('[data-cmo-number-old]')!;
    const now = el.querySelector<HTMLElement>('[data-cmo-number-final]')!;
    expect(old.textContent).toBe('2k');
    expect(old.getAttribute('aria-hidden')).toBe('true');
    expect(now.textContent).toBe('15k');
    expect(now.className).toContain('cmo-num-new');
    expect(old.style.animationDelay).toBe(now.style.animationDelay);
    expect(el.querySelector('[data-cmo-beat="ink"]')?.className).toContain('cmo-ink');
  });

  it('the final number is in the markup on the first render, server side too', () => {
    const html = renderToStaticMarkup(<CareerMomentCardView spec={full} fresh live={false} />);
    expect(html).toContain('data-cmo-number-final');
    expect(html.indexOf('>2k<')).toBeGreaterThan(-1);
    expect(html.indexOf('>15k<')).toBeGreaterThan(html.indexOf('>2k<'));
  });

  it('live: the pause is lifted and nothing else changes', () => {
    const { container } = render(<CareerMomentCardView spec={full} fresh live />);
    const el = scene(container);
    expect(el.dataset.cmoState).toBe('live');
    expect(el.className).not.toContain('cmo-wait');
    const beats = [...el.querySelectorAll<HTMLElement>('[style]')].filter(n => n.style.animationDelay);
    expect(beats.length).toBeGreaterThan(4);
    expect(beats.filter(n => n.style.animationPlayState === 'paused')).toEqual([]);
  });

  it('still: no animated class anywhere, no old number, the same words', () => {
    const fresh = render(<CareerMomentCardView spec={full} fresh live />);
    const words = printed(scene(fresh.container));
    cleanup();
    const { container } = render(<CareerMomentCardView spec={full} fresh={false} live={false} />);
    const el = scene(container);
    expect(el.className).toContain('cmo-still');
    for (const moving of MOVING) expect(classes(el).has(moving), moving).toBe(false);
    expect(el.querySelector('[data-cmo-number-old]')).toBeNull();
    expect(el.querySelector('[data-cmo-number-final]')?.textContent).toBe('15k');
    expect([...el.querySelectorAll<HTMLElement>('[style]')].filter(n => n.style.animationDelay)).toEqual([]);
    expect(printed(el)).toBe(words);
  });

  it('a quiet scene gets one rise on the card: no slam, no rolling number, no ink, no ring, no confetti', () => {
    const quiet = spec({ kind: 'award', tone: 'quiet', key: 'k|quiet' });
    const { container } = render(<CareerMomentCardView spec={quiet} fresh live />);
    const el = scene(container);
    expect(el.className).toContain('cm-rise');
    const inside = new Set([...el.children].flatMap(child => [...classes(child as HTMLElement)]));
    for (const moving of MOVING) expect(inside.has(moving), moving).toBe(false);
    expect(el.querySelector('[data-cmo-number-old]')).toBeNull();
    expect(el.querySelector('[data-cmo-number-final]')?.textContent).toBe('71');
    expect(confetti(container)).toBe(0);
    cleanup();
    const signing = render(<CareerMomentCardView spec={spec({ kind: 'signing', tone: 'quiet' })} fresh live />);
    expect(signing.container.querySelector('[data-cmo-beat="ink"]')).toBeNull();
  });

  it('a trophy lifts the shared cup on gold, and a quiet one gets none', () => {
    const gold = render(<CareerMomentCardView spec={spec({ kind: 'trophy', tone: 'gold', count: undefined })} fresh live />);
    expect(gold.container.querySelectorAll('.victory-cup').length).toBe(1);
    expect(gold.container.querySelector('.victory-copy h3')?.textContent).toBe('Up to 71 overall');
    expect(confetti(gold.container)).toBe(50);
    cleanup();
    const lost = render(<CareerMomentCardView spec={spec({ kind: 'trophy', tone: 'quiet', count: undefined })} fresh live />);
    expect(lost.container.querySelector('.victory-cup')).toBeNull();
    expect(confetti(lost.container)).toBe(0);
  });

  it('confetti is for a gold trophy or award that stands alone and is live', () => {
    const gold = spec({ kind: 'award', tone: 'gold' });
    expect(confetti(render(<CareerMomentCardView spec={gold} fresh live />).container)).toBe(50);
    cleanup();
    expect(confetti(render(<CareerMomentCardView spec={gold} fresh live={false} />).container)).toBe(0);
    cleanup();
    expect(confetti(render(<CareerMomentCardView spec={gold} fresh={false} live={false} />).container)).toBe(0);
    cleanup();
    expect(confetti(render(<CareerMomentCardView spec={gold} fresh live embedded />).container)).toBe(0);
    cleanup();
    expect(confetti(render(<CareerMomentCardView spec={spec({ kind: 'milestone', tone: 'gold' })} fresh live />).container)).toBe(0);
    cleanup();
    expect(confetti(render(<CareerMomentCardView spec={spec({ kind: 'award', tone: 'good' })} fresh live />).container)).toBe(0);
  });

  it('ticks are small tiles, eight at most, each with both true values', () => {
    const ticks = Array.from({ length: 10 }, (_, i) => ({ label: `Skill ${i + 1}`, to: String(70 + i), from: String(68 + i) }));
    const { container } = render(<CareerMomentCardView spec={spec()} ticks={ticks} fresh live />);
    const tiles = [...container.querySelectorAll<HTMLElement>('[data-cmo-tick]')];
    expect(tiles.length).toBe(8);
    expect(tiles[0].textContent).toBe('Skill 17068');
    expect(tiles.every(t => t.className.includes('cm-tick-in'))).toBe(true);
    const secs = tiles.map(t => parseFloat(t.style.animationDelay));
    for (let i = 1; i < secs.length; i++) expect(secs[i]).toBeGreaterThan(secs[i - 1]);
    const lastBeat = Math.max(...[...container.querySelectorAll<HTMLElement>('[data-cmo-number-final]')].map(n => parseFloat(n.style.animationDelay)));
    expect(secs[0]).toBeGreaterThan(lastBeat);
  });
});

describe('Round 1107: the card with the once per key rule', () => {
  /* jsdom has no IntersectionObserver, so a plain mount is live by the time
     render returns. The fresh half needs an observer that never reports. */
  class Unseen { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }

  it('plays on the first mount of a key and sits still on the second', () => {
    const first = render(<CareerMomentCard spec={spec({ key: 'k|once' })} />);
    expect(scene(first.container).dataset.cmoState).toBe('live');
    expect(isMomentSettled('k|once')).toBe(true);
    cleanup();
    const second = render(<CareerMomentCard spec={spec({ key: 'k|once' })} />);
    expect(scene(second.container).dataset.cmoState).toBe('still');
    expect(second.container.querySelector('[data-cmo-number-old]')).toBeNull();
    cleanup();
    /* Another key is another scene. */
    expect(scene(render(<CareerMomentCard spec={spec({ key: 'k|other' })} />).container).dataset.cmoState).toBe('live');
  });

  it('a key settled on load never plays, and a null key is always still', () => {
    settleMoments(['k|loaded', null]);
    expect(isMomentSettled('k|loaded')).toBe(true);
    expect(isMomentSettled(null)).toBe(false);
    expect(scene(render(<CareerMomentCard spec={spec({ key: 'k|loaded' })} />).container).dataset.cmoState).toBe('still');
    cleanup();
    expect(scene(render(<CareerMomentCard spec={spec({ key: null })} />).container).dataset.cmoState).toBe('still');
  });

  it('a scene nobody has seen yet waits, and is not settled', () => {
    vi.stubGlobal('IntersectionObserver', Unseen);
    const { container } = render(<CareerMomentCard spec={spec({ key: 'k|unseen', kind: 'trophy', tone: 'gold' })} />);
    expect(scene(container).dataset.cmoState).toBe('fresh');
    expect(scene(container).className).toContain('cmo-wait');
    expect(isMomentSettled('k|unseen')).toBe(false);
    expect(confetti(container)).toBe(0);
  });

  it('with the binder\'s own moment the kit watches nothing and ignores its key', () => {
    const seen: unknown[] = [];
    class Spy { observe(el: unknown) { seen.push(el); } unobserve() {} disconnect() {} takeRecords() { return []; } }
    vi.stubGlobal('IntersectionObserver', Spy);
    const binder = { fresh: true, live: true, ref: () => undefined };
    const { container } = render(<TrophyMoment embedded stacked moment={binder} spec={{ kind: 'trophy', key: null, title: 'World Cup 2030', tone: 'gold' }}><p>row</p></TrophyMoment>);
    const el = scene(container);
    expect(el.dataset.cmoState).toBe('live');
    expect(seen).toEqual([]);
    expect(el.className).toContain('cmo-stack');
    /* Embedded: the head of a card the binder owns. */
    expect(el.querySelector('.cmo-bar')).toBeNull();
    expect(el.querySelector('[data-cmo-done]')).toBeNull();
    expect(confetti(container)).toBe(0);
    expect(el.className).not.toMatch(/border|rounded|bg-/);
    expect(el.querySelector('.victory-copy')?.textContent).toBe('World Cup 2030row');
    cleanup();
    /* Without it the kit watches its own root. */
    render(<CareerMomentCard spec={spec({ key: 'k|watched' })} />);
    expect(seen.length).toBe(1);
    expect((seen[0] as HTMLElement).dataset.careerMoment).toBe('milestone');
  });

  it('draws no button without onDone, one with it, and calls it once however often it is pressed', () => {
    const none = render(<CareerMomentCard spec={spec({ key: 'k|nobutton' })} />);
    expect(none.container.querySelectorAll('button').length).toBe(0);
    cleanup();
    const done = vi.fn();
    const { container } = render(<MilestoneMoment spec={{ ...spec({ key: 'k|button' }), kind: 'milestone' }} onDone={done} />);
    const buttons = container.querySelectorAll<HTMLButtonElement>('button');
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent).toBe('Continue →');
    expect(buttons[0].hasAttribute('data-cmo-done')).toBe(true);
    for (const cls of MOVING) expect(buttons[0].closest(`.${cls}`), cls).toBeNull();
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[0]);
    expect(done).toHaveBeenCalledTimes(1);
    cleanup();
    const embedded = render(<CareerMomentCard spec={spec({ key: 'k|embedded' })} onDone={done} doneLabel="Next" embedded />);
    expect(embedded.container.querySelectorAll('button').length).toBe(0);
  });

  it('writes nothing to storage and draws no random number, through mount, play and dismiss', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem');
    const random = vi.spyOn(Math, 'random');
    try {
      const { container } = render(<CareerMomentCard spec={spec({ key: 'k|pure', kind: 'award', tone: 'gold' })} onDone={() => undefined} />);
      fireEvent.click(container.querySelector('button')!);
      cleanup();
      render(<CareerMomentCard spec={spec({ key: 'k|pure', kind: 'award', tone: 'gold' })} />);
      expect(set).not.toHaveBeenCalled();
      expect(random).not.toHaveBeenCalled();
    } finally {
      set.mockRestore();
      random.mockRestore();
    }
  });
});

describe('Round 1107: the signing scene (SignedSlip binds the kit)', () => {
  const note = (over: Partial<SignedNote> = {}): SignedNote => ({
    kind: 'transfer', club: 'Rivertown FC', years: 3, wage: 45000, forCareer: {} as CareerState, ...over,
  });

  it('a transfer keeps the slip\'s two strings, shows the wage as its number and has no fee line of its own', () => {
    const s = signingSpec(note());
    expect(s.kind).toBe('signing');
    expect(s.tone).toBe('good');
    expect(s.title).toBe('✍️ Signed with Rivertown FC');
    expect(s.lines).toEqual([`3 years at ${formatWage(45000)}`]);
    expect(s.count).toEqual({ text: formatWage(45000), label: 'your wage' });
    expect(s.key).toContain('signing|');
    expect(s.key).toContain('|transfer|Rivertown FC|3|45000');
    expect(s.colour).toBeUndefined();
  });

  it('a fee above zero prints the offer card\'s line, zero is a free transfer, anything else is no line', () => {
    expect(signingSpec(note({ fee: 12.5 })).lines).toEqual([`3 years at ${formatWage(45000)}`, `${localizeMoney('€12.5M')} fee`]);
    expect(signingSpec(note({ fee: 0 })).lines?.[1]).toBe('Free transfer');
    for (const fee of [undefined, Number.NaN, Number.POSITIVE_INFINITY, -3]) expect(signingSpec(note({ fee })).lines?.length, String(fee)).toBe(1);
    /* Only a transfer has a fee. */
    expect(signingSpec(note({ kind: 'extension', fee: 12.5 })).lines?.length).toBe(1);
    expect(signingSpec(note({ kind: 'loan', from: 'Harbour City', fee: 0 })).lines?.length).toBe(1);
  });

  it('the wage before shows only when it is a real wage that prints differently', () => {
    expect(signingSpec(note({ prevWage: 20000 })).count).toEqual({ text: formatWage(45000), label: 'your wage', from: formatWage(20000) });
    /* 45,400 prints as the same string as 45,000, so there is nothing to turn from. */
    expect(formatWage(45400)).toBe(formatWage(45000));
    for (const prevWage of [45000, 45400, 0, -5, Number.NaN, undefined]) expect(signingSpec(note({ prevWage })).count?.from, String(prevWage)).toBeUndefined();
    expect(signingSpec(note({ kind: 'extension', prevWage: 900, wage: 1500 })).count?.from).toBe(formatWage(900));
  });

  it('a loan keeps its one line and has no number, an extension counts one year as one year', () => {
    const loan = signingSpec(note({ kind: 'loan', from: 'Harbour City', years: 1, wage: 30000, prevWage: 20000 }));
    expect(loan.title).toBe('🛫 Loan agreed: Rivertown FC');
    expect(loan.lines).toEqual([`One season. Your contract and ${formatWage(30000)} stay with Harbour City`]);
    expect(loan.count).toBeUndefined();
    const ext = signingSpec(note({ kind: 'extension', years: 1, wage: 900 }));
    expect(ext.title).toBe('📝 Extended at Rivertown FC');
    expect(ext.lines).toEqual([`1 year at ${formatWage(900)}`]);
  });

  it('a different deal is a different key, the same deal the same one', () => {
    expect(signingSpec(note()).key).toBe(signingSpec(note()).key);
    for (const other of [{ wage: 46000 }, { years: 4 }, { club: 'Harbour City' }, { kind: 'extension' as const }]) {
      expect(signingSpec(note(other)).key, JSON.stringify(other)).not.toBe(signingSpec(note()).key);
    }
    const mine = { playerName: 'A', nationality: 'B', position: 'ST', seasons: [] } as unknown as CareerState;
    expect(signingSpec(note({ forCareer: mine })).key).not.toBe(signingSpec(note()).key);
  });

  it('the slip is the scene: one signing card under data-signed-slip, no avatar for a bare career', () => {
    const { container } = render(<SignedSlip note={note({ fee: 12.5, prevWage: 20000 })} />);
    const slip = container.querySelector<HTMLElement>('[data-signed-slip]')!;
    expect(slip.querySelectorAll('[data-career-moment="signing"][data-cmo-bind="sc-signing"]').length).toBe(1);
    expect(container.querySelectorAll('[data-career-moment]').length).toBe(1);
    expect(slip.querySelector('svg[aria-label="Player avatar"]')).toBeNull();
    expect(slip.querySelector('h3')?.textContent).toBe('✍️ Signed with Rivertown FC');
    expect(printed(scene(container))).toBe(`✍️ Signed with Rivertown FC3 years at ${formatWage(45000)}${localizeMoney('€12.5M')} fee${formatWage(45000)}your wage`);
    expect(slip.querySelector('[data-cmo-number-old]')?.textContent).toBe(formatWage(20000));
    expect(slip.querySelector('button')).toBeNull();
    expect(confetti(container)).toBe(0);
  });

  it('with a look and a club colour, his avatar wears that one flat colour and the scene carries it', () => {
    const career = { appearance: defaultAppearance(), currentClubColor: '#1D4ED8' } as unknown as CareerState;
    const { container } = render(<SignedSlip note={note({ forCareer: career })} />);
    const avatars = container.querySelectorAll('[data-signed-slip] svg[aria-label="Player avatar"]');
    expect(avatars.length).toBe(1);
    expect(avatars[0].querySelector('path')?.getAttribute('fill')).toBe('#1D4ED8');
    expect(avatars[0].closest('[data-cmo-beat="art"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(scene(container).style.getPropertyValue('--cmo-ink')).toBe('#1d4ed8');
  });

  it('plays once per deal: a second mount of the same note is still, a new deal plays', () => {
    const first = render(<SignedSlip note={note()} />);
    expect(scene(first.container).dataset.cmoState).toBe('live');
    cleanup();
    expect(scene(render(<SignedSlip note={note()} />).container).dataset.cmoState).toBe('still');
    cleanup();
    expect(scene(render(<SignedSlip note={note({ wage: 60000 })} />).container).dataset.cmoState).toBe('live');
  });
});
