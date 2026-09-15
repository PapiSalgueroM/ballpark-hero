import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ProductionBoard from '@/components/tycoon/SetPieceBoard';
import { buildRun, lehmer, takeShot } from '@/lib/freeKick';
import { writeArcadeRun } from '@/lib/arcadeRecord';
import { recordCompletion } from '@/lib/completions';

vi.mock('@/lib/arcadeRecord', () => ({ writeArcadeRun: vi.fn(), readArcadeRun: vi.fn() }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn() }));
let Board = ProductionBoard;
beforeAll(async () => {
  if (process.env.SET_PIECE_BOARD) Board = (await import(/* @vite-ignore */ process.env.SET_PIECE_BOARD)).default;
});
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const seed = 587;
const kick = buildRun(seed)[0];
const aim = { x: .65, y: .6, power: .65, curve: 0 };

describe('one watched-match kick', () => {
  it('uses the selected shot once, with no daily record or completion', () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const onResult = vi.fn(() => 'accepted' as const);
    render(<Board kick={kick} seed={seed} onResult={onResult} onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Aim across/), { target: { value: '-0.72' } });
    fireEvent.change(screen.getByLabelText(/Power/), { target: { value: '0.81' } });
    const expected = takeShot({ ...aim, x: -.72, power: .81 }, kick, lehmer(seed));
    const shoot = screen.getByRole('button', { name: 'Take shot' });
    act(() => { shoot.click(); shoot.click(); });
    expect(onResult.mock.calls).toEqual([[expected.scored]]);
    expect(screen.getByText(expected.verdict)).toBeVisible();
    expect(writeArcadeRun).not.toHaveBeenCalled();
    expect(recordCompletion).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
  });

  it('retries only the committed shot after a failed save', () => {
    const onResult = vi.fn().mockReturnValueOnce('save-failed').mockReturnValue('accepted');
    render(<Board kick={kick} seed={seed} onResult={onResult} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Take shot' }));
    const expected = takeShot(aim, kick, lehmer(seed));
    expect(screen.getByRole('alert')).toHaveTextContent('has not changed the match yet');
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save this kick again' }));
    expect(onResult.mock.calls).toEqual([[expected.scored], [expected.scored]]);
    expect(screen.getByText(expected.verdict)).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('cannot shoot after full time, and clearly labels a late rejected result', () => {
    const onResult = vi.fn(() => 'expired' as const);
    const { rerender } = render(<Board kick={kick} seed={seed} expired onResult={onResult} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Take shot' }));
    expect(onResult).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Take shot' })).toBeDisabled();
    rerender(<Board kick={kick} seed={seed} onResult={onResult} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Take shot' }));
    expect(screen.getByText(/score stays unchanged/)).toBeVisible();
  });
});
