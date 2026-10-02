import { useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import NbaCourtLayout from '@/components/nba/NbaCourtLayout';
import NbaLineup from '@/pages/NbaLineup';
import { NBA_POSITIONS, type NbaFilledSlot } from '@/types/nba';

const fixture = vi.hoisted(() => ({ state: {} as Record<string, unknown>, select: vi.fn() }));
vi.mock('@/hooks/useNbaLineup', () => ({ useNbaLineup: () => {
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  return { ...fixture.state, selectedPosition, selectPosition: (index: number) => { fixture.select(index); setSelectedPosition(index); } };
} }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/nba/NbaTeamSpinner', () => ({ default: () => <p>Explicit fixture team</p> }));
vi.mock('@/components/nba/NbaStatSpinner', () => ({ default: () => <p>Explicit fixture challenge</p> }));
vi.mock('@/components/nba/NbaHowToPlay', () => ({ NbaHowToPlay: () => null }));
vi.mock('@/components/game/PlayerAutocomplete', () => ({ PlayerAutocomplete: ({ value, onChange, disabled, autoFocus }: { value: string; onChange: (value: string) => void; disabled: boolean; autoFocus: boolean }) => <input aria-label="Fixture player input" value={value} onChange={event => onChange(event.target.value)} disabled={disabled} autoFocus={autoFocus} /> }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

const player = (index: number, name: string, statValue?: number | string): NbaFilledSlot => ({ ...NBA_POSITIONS[index], playerName: name, excludeName: name, assignedTeam: 'Simulated City', statValue });
const filled = () => new Map<number, NbaFilledSlot>([[0, player(0, 'Simulated Guard', 24.74)]]);
const courtProps = (slots = new Map<number, NbaFilledSlot>()) => ({ positions: NBA_POSITIONS, filledSlots: slots, selectedPosition: null, challengeUnit: 'PPG' });
const choose = (view: ReturnType<typeof render>, label: string) => view.getByRole('button', { name: `Select ${label} on court` });

beforeEach(() => {
  fixture.select.mockReset();
  const slots = filled();
  fixture.state = {
    phase: 'building', challenge: { stat: 'points', direction: 'highest', unit: 'PPG', emoji: '🏀' }, currentTeam: { name: 'Simulated City' },
    filledSlots: slots, filledSlotsArray: [...slots.values()], filledCount: slots.size, verdict: { rating: 'Fixture', headline: 'Fixture result', analysis: 'Fixture only' },
    isEvaluating: false, evaluationError: null, isValidating: false, validationError: null, isStatSpinning: false, isTeamSpinning: false,
    teamAssignments: [], totalStat: 24.74, currentTeamSource: { fixture: true }, filledNormalizedNames: new Set(),
    startGame: vi.fn(), finishStatSpin: vi.fn(), beginBuilding: vi.fn(), finishTeamSpin: vi.fn(), rerollTeam: vi.fn(), submitPlayer: vi.fn(), evaluateTeam: vi.fn(), resetGame: vi.fn(),
  };
});
afterEach(() => cleanup());

describe('NBA court position selection', () => {
  it('selects every empty court position through the original index callback', () => {
    const select = vi.fn(), slots = new Map<number, NbaFilledSlot>();
    const view = render(<NbaCourtLayout {...courtProps(slots)} onSelectPosition={select} />);
    for (const position of NBA_POSITIONS) fireEvent.click(choose(view, position.label));
    expect(select.mock.calls).toEqual([[0], [1], [2], [3], [4]]);
    expect(slots.size).toBe(0);
    expect(view.getAllByRole('button')).toHaveLength(5);
    for (const button of view.getAllByRole('button')) expect(button).toHaveAttribute('type', 'button');
  });

  it('exposes the selected empty court slot and retains native focus', () => {
    function Host() {
      const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
      return <NbaCourtLayout {...courtProps()} selectedPosition={selectedPosition} onSelectPosition={setSelectedPosition} />;
    }
    const view = render(<Host />), sf = choose(view, 'SF'); sf.focus(); fireEvent.click(sf);
    expect(sf).toHaveAttribute('aria-pressed', 'true'); expect(document.activeElement).toBe(sf);
    for (const label of ['PG', 'SG', 'PF', 'C']) expect(choose(view, label)).toHaveAttribute('aria-pressed', 'false');
    expect(sf).not.toHaveClass('animate-pulse');
  });

  it('refuses court callbacks while selection is explicitly locked', () => {
    const select = vi.fn(), view = render(<NbaCourtLayout {...courtProps()} onSelectPosition={select} selectionDisabled />);
    for (const button of view.getAllByRole('button')) { expect(button).toBeDisabled(); fireEvent.click(button); }
    expect(select).not.toHaveBeenCalled();
  });

  it('preserves read-only player names stat rounding units and zero values', () => {
    const slots = new Map([[0, player(0, 'Simulated Guard', 24.74)], [1, player(1, 'Simulated Shooter', 24)], [2, player(2, 'Simulated Wing', 'DNP')], [3, player(3, 'Simulated Forward', 0)], [4, player(4, 'Simulated Center')]]);
    const bytes = JSON.stringify([...slots]); const view = render(<NbaCourtLayout {...courtProps(slots)} />);
    expect(view.queryByRole('button')).toBeNull();
    for (const slot of slots.values()) expect(view.getByText(slot.playerName, { exact: true })).toBeInTheDocument();
    for (const text of ['24.7 PPG', '24 PPG', 'DNP PPG', '0 PPG']) expect(view.getByText(text, { exact: true })).toBeInTheDocument();
    expect(JSON.stringify([...slots])).toBe(bytes);
  });

  it('keeps filled court cards inert while empty slots remain selectable', () => {
    const select = vi.fn(), view = render(<NbaCourtLayout {...courtProps(filled())} onSelectPosition={select} />);
    expect(view.getAllByRole('button')).toHaveLength(4);
    expect(view.queryByRole('button', { name: 'Select PG on court' })).toBeNull();
    fireEvent.click(view.getByText('Simulated Guard')); expect(select).not.toHaveBeenCalled();
    expect(view.getByText('24.7 PPG', { exact: true })).toBeInTheDocument();
    fireEvent.click(choose(view, 'C')); expect(select).toHaveBeenCalledExactlyOnceWith(4);
  });

  it('leaves empty court cards static without the optional selection callback', () => {
    const view = render(<NbaCourtLayout {...courtProps()} selectedPosition={2} />);
    expect(view.queryByRole('button')).toBeNull(); expect(view.queryByRole('button', { pressed: true })).toBeNull();
    for (const position of NBA_POSITIONS) expect(view.getByText(position.label, { exact: true })).toBeInTheDocument();
  });

  it('routes court and position-row picks through the same page handler', () => {
    const view = render(<NbaLineup />);
    fireEvent.click(choose(view, 'SF')); expect(fixture.select).toHaveBeenNthCalledWith(1, 2);
    expect(choose(view, 'SF')).toHaveAttribute('aria-pressed', 'true');
    expect(view.getByRole('button', { name: 'SF' })).toHaveAttribute('aria-pressed', 'true');
    expect(view.getByText(/^Filling:/).textContent).toContain('SF');
    fireEvent.click(view.getByRole('button', { name: 'C' })); expect(fixture.select).toHaveBeenNthCalledWith(2, 4);
    expect(choose(view, 'C')).toHaveAttribute('aria-pressed', 'true'); expect(choose(view, 'SF')).toHaveAttribute('aria-pressed', 'false');
    expect(view.getByRole('button', { name: 'PG' })).toBeDisabled();
    expect(fixture.state.filledCount).toBe(1);
  });

  it.each([['team spin', 'isTeamSpinning'], ['player validation', 'isValidating']] as const)('locks court and position-row picks during %s', (_label, field) => {
    fixture.state[field] = true; const view = render(<NbaLineup />);
    for (const label of ['SG', 'SF', 'PF', 'C']) {
      const court = choose(view, label), row = view.getByRole('button', { name: label });
      expect(court).toBeDisabled(); expect(row).toBeDisabled(); fireEvent.click(court); fireEvent.click(row);
    }
    expect(fixture.select).not.toHaveBeenCalled(); expect(view.queryByRole('button', { pressed: true })).toBeNull();
  });

  it('clears the previous position input through the existing court selection path', () => {
    const view = render(<NbaLineup />); fireEvent.click(choose(view, 'SF'));
    const input = view.getByRole('textbox', { name: 'Fixture player input' }); fireEvent.change(input, { target: { value: 'Abandoned fixture guess' } });
    expect(input).toHaveValue('Abandoned fixture guess'); fireEvent.click(choose(view, 'C'));
    expect(input).toHaveValue(''); expect(view.getByText(/^Filling:/).textContent).toContain('C');
    expect(fixture.select.mock.calls).toEqual([[2], [4]]); expect(fixture.state.submitPlayer).not.toHaveBeenCalled();
  });

  it('keeps court opener focus while the existing row still autofocuses player input', () => {
    const courtView = render(<NbaLineup />), sf = choose(courtView, 'SF'); sf.focus(); fireEvent.click(sf);
    expect(document.activeElement).toBe(sf); expect(courtView.getByRole('textbox', { name: 'Fixture player input' })).not.toHaveFocus();
    courtView.unmount();
    const rowView = render(<NbaLineup />), row = rowView.getByRole('button', { name: 'SF' }); row.focus(); fireEvent.click(row);
    expect(rowView.getByRole('textbox', { name: 'Fixture player input' })).toHaveFocus();
    expect(fixture.select.mock.calls).toEqual([[2], [2]]);
  });

  it.each(['challenge', 'reviewing', 'result'])('keeps court selection out of the %s phase', phase => {
    fixture.state.phase = phase; const view = render(<NbaLineup />);
    expect(view.queryByRole('button', { name: /on court$/ })).toBeNull();
    expect(fixture.select).not.toHaveBeenCalled();
    if (phase !== 'challenge') expect(view.getByText('Simulated Guard', { exact: true })).toBeInTheDocument();
  });
});
