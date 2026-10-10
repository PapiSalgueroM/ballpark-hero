import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AgentReviewCard } from '@/components/soccer-career/AgentReviewCard';
import * as E from '@/lib/soccerCareerEngine';
import { AGENTS } from '@/lib/soccerCareerLife';
import { agentReviewEligibility, changeCareerAgent, readAgentReview } from '@/lib/soccerAgentReview';

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function senior(): E.CareerState {
  const carrier = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const career = copy(carrier.saves.find((saved: { id: string }) => saved.id === 'ere').state) as E.CareerState;
  career.playerName = 'Agent Tester'; career.age = 34; career.overall = 82; career.peakOverall = 82;
  career.phase = 'playing'; career.retired = false; career.retirementSuggested = true; career.agentId = 'cousin';
  career.seasons[career.seasons.length - 1] = { ...career.seasons[career.seasons.length - 1], age: 34, ovr: 82 };
  career.pendingSummary = null; career.pendingBallonDor = null; career.pendingTournament = null;
  career.pendingWorldCup = null; career.pendingRivalryEvent = null; career.pendingEvents = [];
  delete career.seasonMoments;
  return copy(E.repairCareer(career));
}
function open() {
  const trigger = document.querySelector<HTMLButtonElement>('[data-agent-review-open]');
  expect(trigger).toBeEnabled(); trigger!.focus(); fireEvent.click(trigger!);
  const dialog = document.querySelector<HTMLElement>('[data-agent-review-dialog]');
  expect(dialog).toBeVisible(); return { trigger: trigger!, dialog: dialog! };
}
function choices(dialog: HTMLElement) {
  expect(dialog.querySelector('[data-agent-review-help]')).toBeVisible();
  expect(dialog.querySelector('[data-agent-review-confirm]')).toBeNull();
  fireEvent.click(dialog.querySelector('[data-agent-review-choices-open]')!);
  const list = dialog.querySelector<HTMLElement>('[data-agent-review-choices]'); expect(list).toBeVisible(); return list!;
}
function review(dialog: HTMLElement, id = 'shark') {
  choices(dialog); fireEvent.click(dialog.querySelector(`[data-agent-review-choice="${id}"]`)!);
  expect(dialog.querySelector(`[data-agent-review-choice="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(dialog.querySelector('[data-agent-review-review-open]')!);
  expect(dialog.querySelector('[data-agent-review-review]')).toBeVisible();
  const confirm = dialog.querySelector<HTMLButtonElement>('[data-agent-review-confirm]'); expect(confirm).toBeEnabled(); return confirm!;
}
beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.52);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined); window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); document.body.style.cssText = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Soccer agent review controls', () => {
  it('shows rules and a worked example before choices without reading draws or changing the career', () => {
    const career = senior(), before = JSON.stringify(career), onChange = vi.fn();
    expect(agentReviewEligibility(career).available).toBe(true);
    vi.mocked(Math.random).mockImplementation(() => { throw new Error('agent review read drew randomness'); });
    render(<AgentReviewCard career={career} onChange={onChange} />); const { dialog } = open();
    expect(dialog.querySelector('[data-agent-review-help]')).toHaveTextContent('base weekly wage of 1,000 and a 1.10x factor signs at 1,100');
    expect(dialog).toHaveTextContent('Income commission covers wages plus sponsorship income');
    expect(dialog).toHaveTextContent('Your current wage and already-paid fees stay the same');
    expect(dialog).toHaveTextContent('Moving clubs, changing agent through an event or reloading cannot unlock another review');
    expect(dialog.querySelector('[data-agent-review-choices]')).toBeNull(); expect(dialog.querySelector('[data-agent-review-confirm]')).toBeNull();
    expect(onChange).not.toHaveBeenCalled(); expect(JSON.stringify(career)).toBe(before);
  });
  it('shows every existing catalog wage and commission rate with the current agent read-only', () => {
    const career = senior(), before = JSON.stringify(career), onChange = vi.fn(); render(<AgentReviewCard career={career} onChange={onChange} />);
    const { dialog } = open(), list = choices(dialog), cards = Array.from(list.querySelectorAll(':scope > div'));
    expect(cards).toHaveLength(AGENTS.length);
    for (const [index, agent] of AGENTS.entries()) {
      const card = cards[index]; expect(card).toHaveTextContent(agent.name);
      expect(Array.from(card.querySelectorAll('dt')).map(node => node.textContent)).toEqual(['Offer wage factor', 'Income commission', 'Transfer commission']);
      expect(Array.from(card.querySelectorAll('dd')).map(node => node.textContent)).toEqual([
        agent.wageMult.toFixed(2) + 'x', Math.round(agent.incomeCut * 100) + '%', Math.round(agent.transferCut * 100) + '%',
      ]);
      if (agent.id === career.agentId) expect(card.querySelector('[data-agent-review-choice]')).toBeNull();
      else expect(card.querySelector(`[data-agent-review-choice="${agent.id}"]`)).toBeEnabled();
    }
    expect(onChange).not.toHaveBeenCalled(); expect(JSON.stringify(career)).toBe(before);
  });
  it('requires a different catalog choice before final review', () => {
    const onChange = vi.fn(); render(<AgentReviewCard career={senior()} onChange={onChange} />); const { dialog } = open(); choices(dialog);
    expect(dialog.querySelector('[data-agent-review-review-open]')).toBeDisabled();
    expect(dialog.querySelector('[data-agent-review-choice="cousin"]')).toBeNull(); expect(dialog.querySelector('[data-agent-review-confirm]')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
  it.each(['shark', 'super', 'self'])('reviews and confirms the actual chosen catalog agent %s', target => {
    const career = senior(), before = JSON.stringify(career), onChange = vi.fn(), agent = AGENTS.find(value => value.id === target)!;
    render(<AgentReviewCard career={career} onChange={onChange} />); const { dialog } = open(), confirm = review(dialog, target);
    const facts = dialog.querySelector('[data-agent-review-review]'); expect(facts).toHaveTextContent(`Cousin Ricky to ${agent.name}`);
    expect(facts).toHaveTextContent(agent.wageMult.toFixed(2) + 'x'); expect(facts).toHaveTextContent('Your current wage, savings and already-paid agent fees stay the same');
    fireEvent.click(confirm); expect(onChange).toHaveBeenCalledTimes(1); expect(onChange).toHaveBeenCalledWith(target);
    expect(JSON.stringify(career)).toBe(before); expect(document.querySelector('[data-agent-review-dialog]')).toBeNull();
  });
  it('confirms once for two captured rapid confirmation clicks through the real component guard', () => {
    const career = senior(), before = JSON.stringify(career), onChange = vi.fn(); render(<AgentReviewCard career={career} onChange={onChange} />);
    const { dialog } = open(), confirm = review(dialog); act(() => { fireEvent.click(confirm); fireEvent.click(confirm); });
    expect(onChange).toHaveBeenCalledTimes(1); expect(onChange).toHaveBeenCalledWith('shark'); expect(JSON.stringify(career)).toBe(before);
    expect(document.querySelector('[data-agent-review-dialog]')).toBeNull();
  });
  it('reopens rules from final review without confirming and retains the selected choice', () => {
    const onChange = vi.fn(); render(<AgentReviewCard career={senior()} onChange={onChange} />); const { dialog } = open(); review(dialog, 'super');
    fireEvent.click(dialog.querySelector('[data-agent-review-help-open]')!);
    expect(dialog.querySelector('[data-agent-review-help]')).toBeVisible(); expect(dialog.querySelector('[data-agent-review-confirm]')).toBeNull();
    fireEvent.click(dialog.querySelector('[data-agent-review-choices-open]')!);
    expect(dialog.querySelector('[data-agent-review-choice="super"]')).toHaveAttribute('aria-pressed', 'true');
    expect(onChange).not.toHaveBeenCalled();
  });
  it('allows a different choice before confirmation without changing the saved agent', () => {
    const career = senior(), before = JSON.stringify(career), onChange = vi.fn(); render(<AgentReviewCard career={career} onChange={onChange} />);
    const { dialog } = open(); review(dialog, 'super'); fireEvent.click(dialog.querySelector('[data-agent-review-review] [data-agent-review-choices-open]')!);
    fireEvent.click(dialog.querySelector('[data-agent-review-choice="self"]')!); fireEvent.click(dialog.querySelector('[data-agent-review-review-open]')!);
    expect(dialog.querySelector('[data-agent-review-review]')).toHaveTextContent('Cousin Ricky to No Agent');
    expect(onChange).not.toHaveBeenCalled(); expect(JSON.stringify(career)).toBe(before);
  });
  it('returns Back to the actual opener and restores the entire previous body style', async () => {
    document.body.style.cssText = 'overflow: auto; padding-right: 7px; color: rgb(1, 2, 3);'; const style = document.body.getAttribute('style');
    const career = senior(), before = JSON.stringify(career), onChange = vi.fn(); render(<AgentReviewCard career={career} onChange={onChange} />);
    const { trigger, dialog } = open(); choices(dialog); fireEvent.click(dialog.querySelector('[data-agent-review-cancel]')!);
    await waitFor(() => expect(trigger).toHaveFocus()); expect(document.body.getAttribute('style')).toBe(style);
    expect(document.querySelector('[data-agent-review-dialog]')).toBeNull(); expect(onChange).not.toHaveBeenCalled(); expect(JSON.stringify(career)).toBe(before);
  });
  it('closes Escape to the real opener with body style restored and rules on reopening', async () => {
    document.body.style.cssText = 'overflow: auto; padding-right: 9px;'; const style = document.body.getAttribute('style'), onChange = vi.fn();
    render(<AgentReviewCard career={senior()} onChange={onChange} />); const { trigger, dialog } = open(); review(dialog);
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' }); await waitFor(() => expect(trigger).toHaveFocus());
    expect(document.body.getAttribute('style')).toBe(style); expect(document.querySelector('[data-agent-review-dialog]')).toBeNull();
    fireEvent.click(trigger); expect(document.querySelector('[data-agent-review-help]')).toBeVisible(); expect(document.querySelector('[data-agent-review-confirm]')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
  it('cancels final review and starts a new review without carrying a previous selection', () => {
    const onChange = vi.fn(); render(<AgentReviewCard career={senior()} onChange={onChange} />); const { trigger, dialog } = open(); review(dialog, 'super');
    fireEvent.click(dialog.querySelector('[data-agent-review-cancel]')!); fireEvent.click(trigger);
    const reopened = document.querySelector<HTMLElement>('[data-agent-review-dialog]')!; choices(reopened);
    expect(reopened.querySelector('[data-agent-review-review-open]')).toBeDisabled();
    expect(reopened.querySelector('[data-agent-review-choice][aria-pressed="true"]')).toBeNull(); expect(onChange).not.toHaveBeenCalled();
  });
  it.each([false, true])('keeps this-season receipt help read-only after a legacy identity change=%s', changed => {
    const career = changeCareerAgent(senior(), 'shark'); if (changed) career.agentId = 'super';
    const before = JSON.stringify(career), onChange = vi.fn(); expect(readAgentReview(career)).not.toBeNull();
    render(<AgentReviewCard career={career} onChange={onChange} />); expect(document.querySelector('[data-agent-review-status]')).toHaveAttribute('data-agent-review-status', 'saved');
    const { dialog } = open(); expect(dialog.querySelector('[data-agent-review-help]')).toHaveTextContent('Your switch is saved');
    expect(dialog.querySelector('[data-agent-review-choices-open]')).toBeNull(); expect(dialog.querySelector('[data-agent-review-confirm]')).toBeNull();
    expect(onChange).not.toHaveBeenCalled(); expect(JSON.stringify(career)).toBe(before);
  });
  it('offers another review for a later saved senior row in the explicit fixture', () => {
    const career = changeCareerAgent(senior(), 'shark'), last = career.seasons[career.seasons.length - 1];
    career.seasons.push({ ...last, year: last.year + 1, age: last.age + 1 }); career.age += 1;
    expect(agentReviewEligibility(career).available).toBe(true); const onChange = vi.fn(); render(<AgentReviewCard career={career} onChange={onChange} />);
    expect(document.querySelector('[data-agent-review-status]')).toHaveAttribute('data-agent-review-status', 'available');
    const { dialog } = open(); choices(dialog); expect(dialog.querySelector('[data-agent-review-choice="shark"]')).toBeNull();
    expect(dialog.querySelector('[data-agent-review-choice="cousin"]')).toBeEnabled(); expect(onChange).not.toHaveBeenCalled();
  });
  it('allows an existing self-represented player to review an agent without rewriting the current contract', () => {
    const career = senior(); career.agentId = 'self'; const before = JSON.stringify(career), onChange = vi.fn();
    render(<AgentReviewCard career={career} onChange={onChange} />); const { dialog } = open(); choices(dialog);
    expect(dialog.querySelector('[data-agent-review-choice="self"]')).toBeNull(); expect(dialog.querySelector('[data-agent-review-choice="shark"]')).toBeEnabled();
    expect(JSON.stringify(career)).toBe(before); expect(onChange).not.toHaveBeenCalled();
  });
  it.each([
    { label: 'missing agent', change: (c: E.CareerState) => { delete c.agentId; } },
    { label: 'null legacy agent', change: (c: E.CareerState) => { c.agentId = null; } },
    { label: 'unknown agent', change: (c: E.CareerState) => { c.agentId = 'toString'; } },
    { label: 'too young', change: (c: E.CareerState) => { c.age = 18; c.seasons[c.seasons.length - 1].age = 18; } },
    { label: 'past the age boundary', change: (c: E.CareerState) => { c.age = 45; c.seasons[c.seasons.length - 1].age = 45; } },
    { label: 'retired career', change: (c: E.CareerState) => { c.retired = true; } },
    { label: 'queued season summary', change: (c: E.CareerState) => { c.pendingSummary = c.seasons[c.seasons.length - 1]; } },
    { label: 'ceremony phase', change: (c: E.CareerState) => { c.phase = 'ballon_dor'; } },
    { label: 'no saved rows', change: (c: E.CareerState) => { c.seasons = []; } },
    { label: 'no senior source row', change: (c: E.CareerState) => { c.seasons[c.seasons.length - 1].type = 'youth'; } },
    { label: 'source age mismatch', change: (c: E.CareerState) => { c.age += 1; } },
    { label: 'malformed optional receipt', change: (c: E.CareerState) => { c.agentReview = { version: 1 } as E.CareerState['agentReview']; } },
  ])('renders no voluntary review for $label and leaves the complete input unchanged', ({ change }) => {
    const career = senior(); change(career); const before = JSON.stringify(career), onChange = vi.fn();
    expect(agentReviewEligibility(career).available).toBe(false); render(<AgentReviewCard career={career} onChange={onChange} />);
    expect(document.querySelector('[data-agent-review-open]')).toBeNull(); expect(document.querySelector('[data-agent-review-dialog]')).toBeNull();
    expect(JSON.stringify(career)).toBe(before); expect(onChange).not.toHaveBeenCalled();
  });
});