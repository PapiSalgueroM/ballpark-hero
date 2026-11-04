import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import FreeAgencyPanel from '@/components/us-career/FreeAgencyPanel';
import type { FaWindow } from '@/lib/usCareerFreeAgency';

function fixture(): FaWindow {
  return { note: 'Fictional safety fixture', offers: [{
    team: 'fixture-team', label: 'Fictional Destination', salary: 12, years: 3,
    quality: 80, tier: 'playoff', pitch: 'A fictional offer for this safety check.',
    incumbent: false, pushed: false, gone: false,
  }] };
}
beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener: vi.fn(), removeListener: vi.fn() })));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Fifth signing request safety audit', () => {
  it('consumes the request before entering a reentrant signing callback', () => {
    const w = fixture();
    let confirm: HTMLElement;
    const onSign = vi.fn(() => {
      if (onSign.mock.calls.length === 1) fireEvent.click(confirm);
    });
    const view = render(<FreeAgencyPanel window={w} sportNoun="franchise" talkLine={null}
      onPush={vi.fn()} onSign={onSign} reviewSigning />);
    fireEvent.click(within(view.container).getByRole('button', { name: 'Sign', exact: true }));
    confirm = within(view.baseElement).getByRole('button', { name: 'Confirm signing', exact: true });
    fireEvent.click(confirm);
    expect(onSign.mock.calls, 'US_SIGN_REQUEST_CONSUMED_BEFORE_CALLBACK').toEqual([[0]]);
  });

  it('rechecks mutated scalar terms on click before any rerender', () => {
    const w = fixture(), onSign = vi.fn(), onPush = vi.fn();
    const view = render(<FreeAgencyPanel window={w} sportNoun="franchise" talkLine={null}
      onPush={onPush} onSign={onSign} reviewSigning />);
    fireEvent.click(within(view.container).getByRole('button', { name: 'Sign', exact: true }));
    const confirm = within(view.baseElement).getByRole('button', { name: 'Confirm signing', exact: true });
    expect(confirm).not.toBeDisabled();
    w.offers[0].salary += 1;
    fireEvent.click(confirm);
    expect(onSign.mock.calls, 'US_SIGN_CLICK_RECHECKS_CURRENT_SCALARS').toEqual([]);
    expect(onPush).not.toHaveBeenCalled();
    expect(w.offers[0].salary).toBe(13);
  });
});
