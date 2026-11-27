import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AnalystDesk, AnalystReport } from '@/components/club-manager/AnalystDesk';
import { MatchCentre } from '@/components/club-manager/MatchCentre';
import { matchFacts, playNextEntry, startCareer } from '@/lib/clubManager';
import type { AnalystMode } from '@/lib/clubManagerAnalyst';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function openSummary(label: string) {
  const summary = screen.getByText(label, { exact: true });
  const details = summary.closest('details')!;
  details.open = true;
  fireEvent(details, new Event('toggle'));
}

it('files the opted-in match and leaves the original career and other kickoff orders alone', () => {
  let seed = 151;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
  let career = startCareer('Brentford');
  while (!matchFacts(career)) career = playNextEntry(career).state;
  const before = JSON.stringify(career), facts = matchFacts(career)!;
  const quick = vi.fn();
  const view = render(<MatchCentre career={career} facts={facts} clubColor="#fff"
    onBack={vi.fn()} onLive={vi.fn()} onQuickSim={quick} onTone={vi.fn()} talkRead={null} talkStale={false} tone={null} />);
  openSummary('Opponent notebook');
  const desk = screen.getByRole('region', { name: 'Opponent notebook' });
  expect(desk).toHaveTextContent('No observed meetings for Brentford yet');
  fireEvent.click(within(desk).getByRole('button', { name: 'Notebook rules and example' }));
  expect(desk).toHaveTextContent('Starting at halftime records only what happens after your call.');
  const choice = within(desk).getByLabelText('Observation to file');
  fireEvent.change(choice, { target: { value: 'quick' } });
  fireEvent.change(choice, { target: { value: 'full' } });
  fireEvent.click(screen.getByText('Kickoff buildup'));
  fireEvent.change(screen.getByLabelText('Buildup route'), { target: { value: 'left/overlap' } });
  fireEvent.click(screen.getByRole('button', { name: 'Quick Sim' }));
  expect(quick).toHaveBeenCalledWith(undefined, { side: 'left', support: 'overlap' }, undefined, 'full');
  expect(JSON.stringify(career)).toBe(before);
  const [benchOrder, flankPlan, phaseOrder, analystMode] = quick.mock.calls[0];
  const played = playNextEntry(career, { skipHalftime: true, benchOrder, flankPlan, phaseOrder, analystMode: analystMode as AnalystMode });
  expect(played.report?.detail?.analystNote?.opponent).toBe(facts.opponent);
  const report = JSON.parse(JSON.stringify(played.report!.detail!.analystNote));
  const saved = JSON.parse(JSON.stringify(played.state));
  view.unmount();
  render(<><AnalystReport note={report} /><AnalystDesk career={saved} opponent={facts.opponent} onMode={vi.fn()} /></>);
  openSummary('Opponent observation filed');
  expect(screen.getByRole('region', { name: 'Filed opponent observation' })).toHaveTextContent('Opposing shots');
  openSummary('Opponent notebook');
  expect(screen.getByRole('region', { name: 'Opponent notebook' })).toHaveTextContent('1 observed meeting for Brentford');
  openSummary('Earlier observations');
  expect(screen.getByText(/One meeting gives you a lead/)).toBeVisible();
});
