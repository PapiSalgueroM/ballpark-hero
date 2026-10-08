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
 * No real person, club or competition is named: the award and every name on
 * the list are generated.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AwardsNightCard } from '@/components/career/AwardsNightCard';
import type { AwardsCandidate, AwardsDef, AwardsNight, AwardsNightCopy } from '@/lib/careerAwardsNight';

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
