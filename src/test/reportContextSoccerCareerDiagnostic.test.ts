import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildReportContext } from '@/lib/reportContext';

let fixtureRoot: HTMLDivElement;
let previousPath: string;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-28T12:00:00.000Z'));
  previousPath = window.location.pathname + window.location.search + window.location.hash;
  window.history.replaceState({}, '', '/soccer-career');
  fixtureRoot = document.createElement('div');
  document.body.append(fixtureRoot);
});
afterEach(() => {
  fixtureRoot?.remove();
  window.history.replaceState({}, '', previousPath);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function pageMarker(phase = 'playing', trainingOpen = 'true') {
  const marker = document.createElement('main');
  marker.setAttribute('data-soccer-career-report', 'v1');
  marker.setAttribute('data-sc-report-phase', phase);
  marker.setAttribute('data-sc-report-training-open', trainingOpen);
  fixtureRoot.append(marker);
  return marker;
}

describe('Soccer Career report diagnostics', () => {
  it('captures current phase and training-open state from the explicit page marker', () => {
    const marker = pageMarker();
    marker.setAttribute('data-player-name', 'PRIVATE_PLAYER_SENTINEL');
    marker.setAttribute('data-raw-save', 'PRIVATE_SAVE_SENTINEL');
    marker.setAttribute('data-money', 'PRIVATE_MONEY_SENTINEL');
    const storageRead = vi.spyOn(Storage.prototype, 'getItem');

    const context = buildReportContext({}, 'footer-report-button');
    expect(context.soccerCareer, 'MISSING_CAREER_STATE_DIAGNOSTIC').toBeDefined();
    expect(context.soccerCareer).toStrictEqual({ phase: 'playing', trainingOpen: true });
    expect(context.path).toBe('/soccer-career');
    expect(context.source).toBe('footer-report-button');
    expect(context.contextTruncated).toBe(false);
    expect(JSON.stringify(context).length).toBeLessThan(1500);
    expect(JSON.stringify(context)).not.toContain('PRIVATE_');
    expect(storageRead).not.toHaveBeenCalled();

    marker.setAttribute('data-sc-report-phase', 'random_events');
    marker.setAttribute('data-sc-report-training-open', 'false');
    const current = buildReportContext({}, 'footer-report-button');
    expect(current.soccerCareer).toStrictEqual({ phase: 'random_events', trainingOpen: false });
    expect(storageRead).not.toHaveBeenCalled();
  });

  it('keeps existing context unchanged without the explicit page marker', () => {
    const details = { phase: 'caller-phase', probe: 'retained' };
    const before = buildReportContext(details, 'footer-report-button');
    const unmarked = document.createElement('main');
    unmarked.setAttribute('data-sc-report-phase', 'playing');
    unmarked.setAttribute('data-sc-report-training-open', 'true');
    unmarked.setAttribute('data-player-name', 'PRIVATE_UNMARKED_SENTINEL');
    fixtureRoot.append(unmarked);

    const after = buildReportContext(details, 'footer-report-button');
    expect(after).toStrictEqual(before);
    expect(after.soccerCareer).toBeUndefined();
    expect(JSON.stringify(after)).not.toContain('PRIVATE_');
  });

  it('keeps existing context unchanged on another route even with the marker', () => {
    window.history.replaceState({}, '', '/club-manager');
    const details = { phase: 'hub', probe: 'retained' };
    const before = buildReportContext(details, 'footer-report-button');
    pageMarker();

    const after = buildReportContext(details, 'footer-report-button');
    expect(after).toStrictEqual(before);
    expect(after.path).toBe('/club-manager');
    expect(after.soccerCareer).toBeUndefined();
  });

  it('preserves explicit caller details and shared report metadata', () => {
    const details = { phase: 'caller-phase', probe: 'retained', rows: [{ kind: 'fixture', count: 2 }] };
    const inputBefore = JSON.stringify(details);
    const before = buildReportContext(details, 'footer-report-button');
    pageMarker();
    const after = buildReportContext(details, 'footer-report-button');
    const existingFields = { ...after };
    delete existingFields.soccerCareer;

    expect(existingFields).toStrictEqual(before);
    expect(after.phase).toBe('caller-phase');
    expect(after.rows).toStrictEqual(details.rows);
    expect(JSON.stringify(details)).toBe(inputBefore);
  });

  it('accepts only exact known phases and booleans from one marker', () => {
    const unchanged = buildReportContext({}, 'footer-report-button');
    const marker = pageMarker();
    const phases = [
      'creation', 'youth', 'contract_offer', 'playing', 'newspaper', 'season_summary', 'transfer_window',
      'random_events', 'international_debut', 'world_cup', 'rivalry_event', 'ballon_dor',
      'retirement_ceremony', 'retirement_suggestion', 'post_retirement', 'manager_season',
      'pundit_season', 'owner_season', 'social_media_action', 'moral_dilemma',
      'red_card_appeal_result', 'rehab_choice', 'retired',
    ];
    for (const phase of phases) {
      marker.setAttribute('data-sc-report-phase', phase);
      for (const open of [true, false]) {
        marker.setAttribute('data-sc-report-training-open', String(open));
        expect(buildReportContext({}, 'footer-report-button').soccerCareer, phase)
          .toStrictEqual({ phase, trainingOpen: open });
      }
      marker.setAttribute('data-sc-report-training-open', 'true');
      for (const invalid of ['x' + phase, phase + '\n', phase + '\r', phase + '\u2028']) {
        marker.setAttribute('data-sc-report-phase', invalid);
        expect(buildReportContext({}, 'footer-report-button'), JSON.stringify(invalid)).toStrictEqual(unchanged);
      }
    }
    marker.setAttribute('data-sc-report-phase', 'unknown');
    expect(buildReportContext({}, 'footer-report-button')).toStrictEqual(unchanged);
    marker.removeAttribute('data-sc-report-phase');
    expect(buildReportContext({}, 'footer-report-button')).toStrictEqual(unchanged);
    marker.setAttribute('data-sc-report-phase', 'playing');
    for (const invalid of ['', 'TRUE', 'False', '1', 'false\n']) {
      marker.setAttribute('data-sc-report-training-open', invalid);
      expect(buildReportContext({}, 'footer-report-button'), JSON.stringify(invalid)).toStrictEqual(unchanged);
    }
    marker.removeAttribute('data-sc-report-training-open');
    expect(buildReportContext({}, 'footer-report-button')).toStrictEqual(unchanged);
    marker.setAttribute('data-sc-report-training-open', 'true');
    pageMarker();
    expect(buildReportContext({}, 'footer-report-button')).toStrictEqual(unchanged);
  });
});
