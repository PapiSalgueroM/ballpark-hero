import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { InboxCard } from '@/components/club-manager/InboxCard';
import { answerMessage, type CareerState, type CMPlayer } from '@/lib/clubManager';
import { ensureBooks } from '@/lib/clubManagerFinances';
import {
  APPEAL_LOSS_EXTRA, APPEAL_ODDS, DECK, appealCard, appealOddsFor, appealWins, answerDecision,
  deskOf, effectWords, optionLabel, pendingDecisions, settleDecisionDesk, type DeskItem,
} from '@/lib/clubManagerDecisions';

const player = (id: string, extra: Partial<CMPlayer> = {}): CMPlayer => ({
  id, name: `Player ${id}`, position: 'CM', rating: 70, morale: 40, isYouth: false,
  suspendedMatches: 0, injuryWeeks: 0, seasonReds: 0, ...extra,
} as unknown as CMPlayer);

const career = (extra: Partial<CareerState> = {}): CareerState => {
  const s = {
    clubName: 'Fixture Town', season: 2, week: 12, budget: 40, boardConfidence: 60,
    squad: [player('a', { suspendedMatches: 2, seasonReds: 1 }), player('b', { morale: 30 }), player('c', { morale: 80 })],
    press: { mood: 50, pending: null, lastWeek: 0, answered: 0, ducked: 0, nextFire: 0, nextSharpen: 0 },
    inbox: [],
    ...extra,
  } as unknown as CareerState;
  ensureBooks(s);
  return s;
};

afterEach(() => { vi.restoreAllMocks(); });

describe('Round 979 red card appeals', () => {
  it('states the odds by tier and walks every step of the ladder', () => {
    expect(APPEAL_ODDS).toEqual([40, 25, 15]);
    expect([1, 2, 3, 4, 7].map(appealOddsFor)).toEqual([40, 25, 15, 15, 15]);
    for (const [reds, odds] of [[1, 40], [2, 25], [3, 15]] as const) {
      const s = career({ squad: [player('a', { suspendedMatches: 2, seasonReds: reds })] });
      const card = appealCard(s, 'a', 'Rival Town')!;
      expect(card.odds).toBe(odds);
      expect(card.options[0].label).toContain(`${odds}%`);
      expect(card.options[0].label).toContain(`${2 + APPEAL_LOSS_EXTRA} matches`);
      expect(card.options[1].label).toContain('2 matches');
      expect(card.text).toContain(`${odds} percent`);
    }
  });

  it('offers nothing for a man with no ban', () => {
    expect(appealCard(career(), 'b', 'Rival Town')).toBeNull();
  });

  it('moves suspendedMatches exactly as the card says, and nothing else', () => {
    let won = 0;
    let lost = 0;
    for (let week = 0; week < 80; week++) {
      const s = career({ week });
      settleDecisionDesk(s, ['a'], 'Rival Town');
      const card = deskOf(s).find(d => d.kind === 'appeal')!;
      const after = answerDecision(s, card.id, 0);
      const ban = after.squad.find(p => p.id === 'a')!.suspendedMatches;
      if (appealWins(card, s)) { won++; expect(ban).toBe(0); } else { lost++; expect(ban).toBe(2 + APPEAL_LOSS_EXTRA); }
      expect(after.squad.filter(p => p.id !== 'a')).toEqual(s.squad.filter(p => p.id !== 'a'));
      expect(after.budget).toBe(s.budget);
      expect(after.boardConfidence).toBe(s.boardConfidence);
      const accepted = answerDecision(s, card.id, 1);
      expect(accepted.squad).toBe(s.squad);
    }
    expect(won).toBeGreaterThan(0);
    expect(lost).toBeGreaterThan(0);
  });

  it('refuses an appeal once the ban has started being served', () => {
    const s = career();
    settleDecisionDesk(s, ['a'], 'Rival Town');
    const card = deskOf(s).find(d => d.kind === 'appeal')!;
    const served = { ...s, squad: s.squad.map(p => (p.id === 'a' ? { ...p, suspendedMatches: 1 } : p)) };
    const after = answerDecision(served, card.id, 0);
    expect(after.squad).toBe(served.squad);
    expect(deskOf(after)[0].resolved).toMatch(/Too late/);
  });

  it('closes the appeal window once the next match has kicked off', () => {
    const s = career();
    settleDecisionDesk(s, ['a'], 'Rival Town');
    const card = deskOf(s).find(d => d.kind === 'appeal')!;
    const paused = { ...s, live: {} } as unknown as CareerState;
    const after = answerDecision(paused, card.id, 0);
    expect(after.squad).toBe(paused.squad);
    expect(deskOf(after)[0].outcome).toBe('expired');
  });

  it('closes an unanswered appeal at the next match with the ban untouched', () => {
    const s = career();
    settleDecisionDesk(s, ['a'], 'Rival Town');
    s.week += 1;
    settleDecisionDesk(s, [], 'Other Town');
    const card = deskOf(s).find(d => d.kind === 'appeal')!;
    expect(card.outcome).toBe('expired');
    expect(s.squad.find(p => p.id === 'a')!.suspendedMatches).toBe(2);
  });
});

describe('Round 979 decisions deck', () => {
  /* Every answer on every card, applied to a fixture far from every bound:
     the label ends in the effect's own words, and the state moves in exactly
     the one number named, by exactly the amount named. */
  it('moves only the number each answer names, by exactly its amount', () => {
    for (const card of DECK) {
      card.options.forEach((o, i) => {
        const s = career();
        const label = optionLabel(o.verb, o.effect, s);
        expect(label.endsWith(`(${effectWords(o.effect, s)})`)).toBe(true);
        const item: DeskItem = {
          id: `desk-2-12-${card.id}`, kind: 'situation', season: 2, week: 12, from: card.from,
          text: 'fixture', options: card.options.map(x => ({ label: x.verb, effect: x.effect })), deckId: card.id,
          playerId: 'b', playerName: 'Player b',
        };
        const after = answerDecision({ ...s, decisions: [item] }, item.id, i);
        const moved = {
          board: after.boardConfidence - s.boardConfidence,
          fans: Math.round((after.books!.fanMood - s.books!.fanMood) * 10) / 10,
          press: after.press!.mood - s.press!.mood,
          morale: after.squad.find(p => p.id === 'b')!.morale - 30,
          budget: Math.round((after.budget - s.budget) * 10) / 10,
        };
        const want = { board: 0, fans: 0, press: 0, morale: 0, budget: 0 };
        if (o.effect.kind === 'move') want[o.effect.meter] = o.effect.delta;
        expect(moved, `${card.id} option ${i}`).toEqual(want);
        expect(after.squad.filter(p => p.id !== 'b')).toEqual(s.squad.filter(p => p.id !== 'b'));
        expect(deskOf(after)[0].resolved).toBeTruthy();
      });
      expect(card.options[card.options.length - 1].effect.kind).toBe('none');
    }
  });

  it('never draws from Math.random', () => {
    const spy = vi.spyOn(Math, 'random');
    const s = career();
    for (let week = 0; week < 40; week++) {
      s.week = week;
      settleDecisionDesk(s, week % 5 === 0 ? ['a'] : [], 'Rival Town');
      const open = pendingDecisions(s)[0];
      if (open) Object.assign(s, answerDecision(s, open.id, 0));
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it('reads a damaged block as empty and leaves the rest of the save alone', () => {
    const s = career({ decisions: [{ id: 'nope' }] as unknown as DeskItem[] });
    expect(deskOf(s)).toEqual([]);
    expect(answerDecision(s, 'desk-x', 0)).toBe(s);
    settleDecisionDesk(s, ['a'], 'Rival Town');
    expect(deskOf(s).some(d => d.kind === 'appeal')).toBe(true);
  });

  it('shares the inbox answer path', () => {
    const s = career();
    settleDecisionDesk(s, ['a'], 'Rival Town');
    const card = deskOf(s).find(d => d.kind === 'appeal')!;
    expect(answerMessage(s, card.id, 1)).toEqual(answerDecision(s, card.id, 1));
  });
});

describe('Round 979 the desk on the inbox screen', () => {
  it('shows an appeal with its odds and answers it through onAnswer', () => {
    const s = career({ inbox: [] });
    settleDecisionDesk(s, ['a'], 'Rival Town');
    const card = deskOf(s).find(d => d.kind === 'appeal')!;
    const onAnswer = vi.fn();
    const view = render(<InboxCard career={s} onAnswer={onAnswer} />);
    const node = view.container.querySelector<HTMLElement>(`[data-desk-card="${card.id}"]`)!;
    expect(node).toBeTruthy();
    expect(node.textContent).toContain('40%');
    expect(node.textContent).toContain('Rival Town');
    fireEvent.click(within(node).getByRole('button', { name: /^Appeal/ }));
    expect(onAnswer).toHaveBeenCalledWith(card.id, 0);
    cleanup();
  });

  it('shows the answered line once the card is resolved', () => {
    const s = career({ inbox: [] });
    settleDecisionDesk(s, ['a'], 'Rival Town');
    const card = deskOf(s).find(d => d.kind === 'appeal')!;
    const after = answerDecision(s, card.id, 1);
    const view = render(<InboxCard career={after} onAnswer={vi.fn()} />);
    const node = view.container.querySelector<HTMLElement>(`[data-desk-card="${card.id}"]`)!;
    expect(node.dataset.inboxState).toBe('resolved');
    expect(node.textContent).toContain('Accepted');
    expect(within(node).queryAllByRole('button')).toHaveLength(0);
    cleanup();
  });

  it('renders nothing with an empty inbox and an empty desk', () => {
    const view = render(<InboxCard career={career({ inbox: [] })} onAnswer={vi.fn()} />);
    expect(view.container.innerHTML).toBe('');
    cleanup();
  });
});
