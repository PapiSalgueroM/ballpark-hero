import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { VoteWinner } from '@/components/fantasy-draft/VoteWinner';
import type { DraftPlayer } from '@/components/fantasy-draft/PlayerPool';
import motion from '@/components/fantasy-draft/DraftWinnerMotion.module.css';

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
afterEach(() => {
  cleanup(); vi.restoreAllMocks();
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else Reflect.deleteProperty(navigator, 'clipboard');
});
const team = (side: string): DraftPlayer[] => [17, 61, 9, 34].map((value, i) => ({
  id: `${side}-${i}`, name: `Generated ${side} ${i}`, position: ['GK', 'DEF', 'MID', 'FWD'][i],
  nationality: 'Fixture', dominant_foot: 'Right', market_value_millions: value,
}));
const frozen = (side: string) => Object.freeze(team(side).map(p => Object.freeze(p))) as unknown as DraftPlayer[];

describe('draft voting keeps the committed rosters', () => {
  it('renders the unvoted choice without sorting either supplied frozen roster', () => {
    const userTeam = frozen('user'), aiTeam = frozen('ai'), onVote = vi.fn();
    const before = JSON.stringify({ userTeam, aiTeam });
    const view = render(<VoteWinner userTeam={userTeam} aiTeam={aiTeam} onVote={onVote} voted={null} voteCounts={{ user: 2, ai: 7 }} />);
    fireEvent.click(view.getByRole('button', { name: 'Your Team' }));
    fireEvent.click(view.getByRole('button', { name: 'AI Team' }));
    expect(onVote.mock.calls).toEqual([['user'], ['ai']]);
    expect(JSON.stringify({ userTeam, aiTeam })).toBe(before);
    expect(view.queryByText('Best Players')).not.toBeInTheDocument();
    expect(view.container.querySelector('[data-draft-winner]')).toBeNull();
  });

  for (const side of ['user', 'ai'] as const) {
    it(`ranks the ${side} MVP preview without changing either frozen roster`, () => {
      const userTeam = frozen('user'), aiTeam = frozen('ai');
      const before = JSON.stringify({ userTeam, aiTeam });
      const view = render(<VoteWinner userTeam={userTeam} aiTeam={aiTeam} onVote={vi.fn()} voted={side} voteCounts={{ user: 2, ai: 7 }} />);
      const best = view.getByText('Best Players').nextElementSibling!;
      expect([...best.children].map(node => node.textContent)).toEqual([`Generated ${side} 1 £61M`, `Generated ${side} 3 £34M`, `Generated ${side} 0 £17M`]);
      expect(view.getByText('2')).toHaveTextContent('2');
      expect(view.getByText('7')).toHaveTextContent('7');
      expect(JSON.stringify({ userTeam, aiTeam })).toBe(before);
      expect(view.container.querySelector('[data-draft-winner]')).toHaveClass(motion.winner);
    });
  }

  it('reveals the committed winner without replacing share controls or replaying cloned props', () => {
    const userTeam = team('user'), aiTeam = team('ai'), onVote = vi.fn();
    const draw = (voted: 'user' | 'ai' | null, user = userTeam, ai = aiTeam) => <VoteWinner userTeam={user} aiTeam={ai} onVote={onVote} voted={voted} voteCounts={{ user: 2, ai: 7 }} />;
    const view = render(draw(null));
    view.rerender(draw('user'));
    const pill = view.container.querySelector('[data-draft-winner]');
    expect(pill).toHaveClass(motion.winner);
    expect(pill).toHaveTextContent('Your Team wins!');
    const copy = view.getByRole('button', { name: 'Copy' });
    copy.focus();
    view.rerender(draw('user', userTeam.map(p => ({ ...p })), aiTeam.map(p => ({ ...p }))));
    expect(view.container.querySelector('[data-draft-winner]')).toBe(pill);
    expect(view.getByRole('button', { name: 'Copy' })).toBe(copy);
    expect(document.activeElement).toBe(copy);
    view.rerender(draw('ai'));
    expect(view.container.querySelector('[data-draft-winner]')).not.toBe(pill);
    expect(view.container.querySelector('[data-draft-winner]')).toHaveTextContent('AI Team wins!');
    expect(view.getByRole('button', { name: 'Copy' })).toBe(copy);
    expect(onVote).not.toHaveBeenCalled();
  });

  it('keeps exact sorted MVP sharing text, counts and destination payloads', () => {
    const writeText = vi.fn().mockResolvedValue(undefined), onVote = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const view = render(<VoteWinner userTeam={team('user')} aiTeam={team('ai')} onVote={onVote} voted="ai" voteCounts={{ user: 2, ai: 7 }} />);
    const expected = '⚽ Fantasy Draft Showdown\n\nI voted for AI Team to win the season! 🏆\n\nMVPs: Generated ai 1, Generated ai 3, Generated ai 0\n\nPlay now 👉 douknowball.com/fantasy-draft';
    fireEvent.click(view.getByRole('button', { name: 'Copy' }));
    expect(writeText.mock.calls).toEqual([[expected]]);
    expect(view.getByRole('button', { name: 'Copied!' })).toBeEnabled();
    expect(new URL(view.getByRole('link', { name: /Twitter/ }).getAttribute('href')!).searchParams.get('text')).toBe(expected);
    expect(new URL(view.getByRole('link', { name: /Gmail/ }).getAttribute('href')!).searchParams.get('body')).toBe(expected);
    expect(view.getByRole('link', { name: /Text/ }).getAttribute('href')).toBe(`sms:?body=${encodeURIComponent(expected)}`);
    expect(onVote).not.toHaveBeenCalled();
  });
});
