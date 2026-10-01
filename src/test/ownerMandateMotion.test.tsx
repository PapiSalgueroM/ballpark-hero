import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import OwnerMandateCard from '@/components/front-office-shared/OwnerMandateCard';
import type { OwnerMandate } from '@/lib/foOwnerMandate';

const mandate: OwnerMandate = { tier: 'respect', text: 'Win 40 games and show the fans a direction.', winFloor: 40, reqLevel: 0, season: 2030 };
const warning = 'One more bad season ends this. The seat is hot.';
afterEach(cleanup);

describe('shared ownership feedback', () => {
  it.each([0, 25, 26, 55, 56, 100])('preserves trust %s, the existing hot-seat boundary and mandate text', trust => {
    const before = JSON.stringify(mandate);
    const view = render(<OwnerMandateCard mandate={mandate} trust={trust} pace={null} />);
    const trustText = view.getByText(`Trust ${trust}`);
    expect(trustText).toHaveClass(trust > 55 ? 'text-emerald-400' : trust > 25 ? 'text-gold' : 'text-destructive');
    expect(view.getByText(mandate.text)).toBeVisible();
    const bar = view.container.querySelector('[style]');
    expect(bar).toHaveStyle({ width: `${trust}%` });
    if (trust <= 25) expect(view.getByText(warning)).toBeVisible();
    else expect(view.queryByText(warning)).toBeNull();
    expect(view.container.querySelector('button')).toBeNull();
    expect(JSON.stringify(mandate)).toBe(before);
  });

  it('replays only changed pace messages and keeps unchanged warnings and trust bars mounted', () => {
    const pace = { onTrack: true, line: 'You are on pace for 42 wins.' };
    const view = render(<OwnerMandateCard mandate={mandate} trust={25} pace={pace} />);
    const firstPace = view.getByText(`📈 ${pace.line}`);
    const firstWarning = view.getByText(warning);
    const bar = view.container.querySelector('[style]');
    view.rerender(<OwnerMandateCard mandate={{ ...mandate }} trust={20} pace={{ ...pace }} />);
    expect(view.getByText(`📈 ${pace.line}`)).toBe(firstPace);
    expect(view.getByText(warning)).toBe(firstWarning);
    expect(view.container.querySelector('[style]')).toBe(bar);
    expect(bar).toHaveStyle({ width: '20%' });
    view.rerender(<OwnerMandateCard mandate={mandate} trust={20} pace={{ onTrack: false, line: 'You are on pace for 35 wins.' }} />);
    expect(view.getByText('📉 You are on pace for 35 wins.')).not.toBe(firstPace);
    expect(firstPace).not.toBeInTheDocument();
    expect(view.getByText(warning)).toBe(firstWarning);
    view.rerender(<OwnerMandateCard mandate={{ ...mandate, season: 2031 }} trust={20} pace={null} />);
    expect(view.queryByText(/You are on pace/)).toBeNull();
    expect(view.getByText(warning)).not.toBe(firstWarning);
    expect(view.container.querySelector('[style]')).toBe(bar);
  });
});
