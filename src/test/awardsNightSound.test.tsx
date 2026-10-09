/**
 * Round 1132: the awards night out loud.
 *
 * Part one, recorded BEFORE the card was touched: the markup of the shared
 * awards night card for three synthetic nights on a synthetic award, as three
 * sha256 hashes. The sound bind is an effect and must draw nothing, so these
 * hold with no edit after it. scripts/simCareerAwardsNight.mjs keeps its own
 * fixture of the real Soccer Career card; this is the same promise on the
 * shared contract, where a second sport will bind next.
 *
 * Part two, with the bind: the switch is mocked, so these read what the card
 * ASKS for (which moment, how far ahead, in whose scope) and when it hushes.
 * The delays come from the card's own pace: a name every 0.22 s from 0.6 s,
 * the headline 0.75 s plus a step per name, and the slam lands 0.24 s in.
 *
 * No real person, club or competition is named: the award and every name on
 * the list are generated.
 */
import { createHash } from 'node:crypto';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AwardsNightCard } from '@/components/career/AwardsNightCard';
import type { AwardsCandidate, AwardsDef, AwardsNight, AwardsNightCopy } from '@/lib/careerAwardsNight';

/** every call the card makes on the switch, in order: 'tap@0.600', 'hush' */
const heard = vi.hoisted(() => ({ calls: [] as string[], scopes: [] as unknown[], hushed: [] as unknown[] }));
vi.mock('@/lib/sound', () => ({
  sound: (moment: string, opts?: { delay?: number; scope?: object }) => { heard.calls.push(`${moment}@${(opts?.delay ?? 0).toFixed(3)}`); heard.scopes.push(opts?.scope); },
  hush: (scope?: object) => { heard.calls.push('hush'); heard.hushed.push(scope); },
}));

const AWARD: AwardsDef = {
  id: 'synthetic', name: 'Synthetic Cup', emoji: '\u{1F3C6}', shortlistSize: 5, widerSize: 20, podiumSize: 3, rivals: 'generated',
};
const COPY: AwardsNightCopy = {
  winnerTitle: 'The Synthetic Cup is yours',
  title: year => `Synthetic Cup ${year}`,
  winnerLine: moved => (moved ? `You won it. ${moved}` : 'You won it.'),
  podiumLine: (place, moved) => (moved ? `You finished ${place}. ${moved}` : `You finished ${place}.`),
  shortlistLine: place => `You made the list at ${place}.`,
  wider: { before: 'You were ', after: ' in the wider ranking.' },
  notNominated: 'You were not on the ballot this year.',
};
const rival = (k: number, points: number): AwardsCandidate => ({ name: `Gen ${k}`, points, isPlayer: false });
const you = (points: number): AwardsCandidate => ({ name: 'You', points, isPlayer: true });

/** He wins a list of five. */
const WIN: AwardsNight = {
  year: 2031, playerRank: 1, playerPoints: 91, playerNominated: true, moved: '+12 fame',
  nominees: [you(91), rival(1, 84), rival(2, 77), rival(3, 70), rival(4, 62)],
};
/** He is second on the same list. */
const SECOND: AwardsNight = {
  year: 2031, playerRank: 2, playerPoints: 84, playerNominated: true, moved: '+5 fame',
  nominees: [rival(1, 91), you(84), rival(2, 77), rival(3, 70), rival(4, 62)],
};
/** Fourth on the list: nominated, off the podium. */
const FOURTH: AwardsNight = {
  year: 2031, playerRank: 4, playerPoints: 70, playerNominated: true,
  nominees: [rival(1, 91), rival(2, 84), rival(3, 77), you(70), rival(4, 62)],
};
/** He is not on the ballot at all. */
const OUT: AwardsNight = {
  year: 2031, playerRank: null, playerPoints: 12, playerNominated: false,
  nominees: [rival(1, 91), rival(2, 84), rival(3, 77), rival(4, 70), rival(5, 62)],
};
const SPEECH = {
  prompt: 'Say a few words',
  options: [
    { id: 'thanks', emoji: '\u{1F64F}', label: 'Thank the dressing room', tone: 'gold' as const },
    { id: 'quiet', emoji: '\u{1F910}', label: 'Keep it short', tone: 'quiet' as const },
  ],
};

function Card({ night, speechOpen = false, award = AWARD }: { night: AwardsNight; speechOpen?: boolean; award?: AwardsDef }) {
  return (
    <AwardsNightCard
      night={night}
      award={award}
      copy={COPY}
      detail={c => `detail ${c.name}`}
      score={c => `${c.points} pts`}
      scoreDetail={c => (c.isPlayer ? 'you' : 'rival')}
      onDismiss={() => undefined}
      speech={{ open: speechOpen, prompt: SPEECH.prompt, options: SPEECH.options, onChoose: () => undefined }}
    />
  );
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

describe('Round 1132: the awards night card draws what it drew before the sound bind', () => {
  it('he wins a list of five with the speech open', () => {
    expect(sha(renderToStaticMarkup(<Card night={WIN} speechOpen />))).toBe('f4862ad8b7e513326ab19891fc313db4079e73ff5bfa19e71441f04f94447190');
  });
  it('he is second', () => {
    expect(sha(renderToStaticMarkup(<Card night={SECOND} />))).toBe('a96a391b14142817f7e77b462cf5e56c2edbc71c29e0f1a148a04d27b328ad30');
  });
  it('he is not nominated', () => {
    expect(sha(renderToStaticMarkup(<Card night={OUT} />))).toBe('c47c9ca4437e5fa829e03b404d455dc7c7bb042c89a6895829f6a08b838805ce');
  });
});

const TICKS = ['tap@0.600', 'tap@0.820', 'tap@1.040', 'tap@1.260', 'tap@1.480'];
const reset = () => { heard.calls.length = 0; heard.scopes.length = 0; heard.hushed.length = 0; };
const stillWorld = (still: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: still, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
};

describe('Round 1132: what the awards night asks the sound switch for', () => {
  afterEach(() => { reset(); stillWorld(false); });

  it('he wins a list of five: a tick per name, then the winner at 2.09 s, in one scope, and nothing else', () => {
    reset();
    render(<Card night={WIN} speechOpen />);
    expect(heard.calls).toEqual([...TICKS, 'awardWin@2.090']);
    expect(heard.scopes[0]).toBeTypeOf('object');
    expect(new Set(heard.scopes).size).toBe(1);
  });

  it('giving the speech re-renders the card and plays nothing again', () => {
    reset();
    const view = render(<Card night={WIN} speechOpen />);
    view.rerender(<Card night={{ ...WIN, speech: { id: 'thanks', line: 'He thanked the dressing room.', moved: '+2 morale' } }} />);
    view.rerender(<Card night={{ ...WIN, speech: { id: 'thanks', line: 'He thanked the dressing room.', moved: '+2 morale' } }} />);
    expect(heard.calls).toEqual([...TICKS, 'awardWin@2.090']);
  });

  it('next season is a new plan: this scope is hushed once, then the night plays again', () => {
    reset();
    const view = render(<Card night={WIN} />);
    view.rerender(<Card night={{ ...WIN, year: WIN.year + 1 }} />);
    expect(heard.calls).toEqual([...TICKS, 'awardWin@2.090', 'hush', ...TICKS, 'awardWin@2.090']);
    expect(heard.hushed).toEqual([heard.scopes[0]]);
  });

  it('another award of the same year, place and length is a new plan too', () => {
    reset();
    const view = render(<Card night={WIN} />);
    view.rerender(<Card night={WIN} award={{ ...AWARD, id: 'synthetic-two' }} />);
    expect(heard.calls).toEqual([...TICKS, 'awardWin@2.090', 'hush', ...TICKS, 'awardWin@2.090']);
  });

  it('leaving the screen hushes this card alone', () => {
    reset();
    const view = render(<Card night={WIN} />);
    view.unmount();
    expect(heard.calls).toEqual([...TICKS, 'awardWin@2.090', 'hush']);
    expect(heard.hushed[0]).toBe(heard.scopes[0]);
    expect(heard.hushed[0]).toBeTypeOf('object');
  });

  it('second place gets the sting and no crowd; off the podium and off the ballot get the ticks alone', () => {
    reset();
    render(<Card night={SECOND} />);
    expect(heard.calls).toEqual([...TICKS, 'award@2.090']);
    reset();
    render(<Card night={FOURTH} />);
    expect(heard.calls).toEqual(TICKS);
    reset();
    render(<Card night={OUT} />);
    expect(heard.calls).toEqual(TICKS);
  });

  it('reduced motion shows the card at once, so it gets the result alone, at once', () => {
    reset();
    stillWorld(true);
    render(<Card night={WIN} />);
    expect(heard.calls).toEqual(['awardWin@0.000']);
    reset();
    render(<Card night={OUT} />);
    expect(heard.calls).toEqual([]);
  });

  it('strict mode mounts twice: the plan, a hush, then the plan again, in that order', () => {
    reset();
    render(<StrictMode><Card night={WIN} /></StrictMode>);
    expect(heard.calls).toEqual([...TICKS, 'awardWin@2.090', 'hush', ...TICKS, 'awardWin@2.090']);
  });
});
