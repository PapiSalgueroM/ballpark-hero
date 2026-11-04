import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import * as E from '@/lib/clubManager';
import { LiveSimScreen } from '@/components/club-manager/LiveSimScreen';

const NOTICE = 'This match could not continue. Its saved positioning data needs review. Your saved data has been kept.';
async function fixture(positionNotice?: string | null) {
  await import('@/lib/clubManagerTactics');
  let state = E.startCareer('Everton');
  for (let guard = 0; guard < 24; guard++) {
    const result = E.playNextEntry(state, { noCoach: true });
    state = result.state;
    if (result.kind !== 'halftime' || !state.live) continue;
    const second = E.startSecondHalf(state);
    expect(second?.live?.h2Drawn, 'CM_POSITION_LIVE_NOTICE_REAL_SECOND_HALF_FOUNDATION').toBe(true);
    if (!second?.live?.h2Drawn) throw new Error('The real second half was not drawn.');
    const props = { career: second, live: second.live, report: null, clubColor: '#16824d',
      onSub: vi.fn(), onShape: vi.fn(), onTalk: vi.fn(), onSecondHalf: vi.fn(), onExit: vi.fn(),
      onStartSecondHalf: vi.fn(), onStartExtraTime: vi.fn(), onChange: vi.fn(), onMark: vi.fn(),
      positionNotice };
    const view = render(<LiveSimScreen {...props} />);
    const stage = view.container.querySelector<HTMLElement>('[data-cm-live-stagebox]');
    expect(stage !== null, 'CM_POSITION_LIVE_NOTICE_ACTUAL_EXPANDED_STAGE').toBe(true);
    if (!stage) throw new Error('The actual expanded stage was not mounted.');
    const strip = stage.querySelector<HTMLElement>('[data-cm-live-strip]');
    expect(strip !== null, 'CM_POSITION_LIVE_NOTICE_ACTUAL_STRIP').toBe(true);
    return { view, stage, strip: strip!, props };
  }
  throw new Error('The actual engine did not produce a live match.');
}
beforeEach(() => {
  let seed = 1458213;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = seed * 16807 % 2147483647;
    return (seed - 1) / 2147483646;
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Saved-position refusal inside the actual expanded live match stage', () => {
  it('puts the supplied hook notice inside the fixed stage flow before its strip', async () => {
    const { stage, strip } = await fixture(NOTICE);
    const alert = within(stage).queryByRole('alert');
    expect(alert !== null, 'CM_POSITION_LIVE_NOTICE_INSIDE_FIXED_STAGE').toBe(true);
    if (!alert) throw new Error('The owned notice assertion should fail first.');
    expect(alert.textContent, 'CM_POSITION_LIVE_NOTICE_EXACT_HOOK_COPY').toBe(NOTICE);
    expect(alert.closest('.cm-stage-main'), 'CM_POSITION_LIVE_NOTICE_MAIN_FLOW').toBe(strip.parentElement);
    expect(Boolean(alert.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING),
      'CM_POSITION_LIVE_NOTICE_PRECEDES_STRIP').toBe(true);
  });
  it('keeps the actual expanded stage and its Back control unchanged when no notice is supplied', async () => {
    const { stage } = await fixture();
    expect(within(stage).queryByRole('alert'), 'CM_POSITION_LIVE_NOTICE_ABSENT_DEFAULT').toBeNull();
    expect(within(stage).getByRole('button', { name: 'Back to the club page' }),
      'CM_POSITION_LIVE_NOTICE_DEFAULT_BACK_REACHABLE').toBeTruthy();
  });
});
