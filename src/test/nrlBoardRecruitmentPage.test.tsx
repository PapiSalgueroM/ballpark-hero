import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import NrlCareerOffice from '@/components/nrl-manager/NrlCareerOffice';
import { createNrlCareer, nrlBoardRecruitmentQuote, reduceNrlCareer, type NrlCareerAction } from '@/lib/nrlCareer';

afterEach(cleanup);

it('shows the board terms, keeps the market filter and updates progress after a qualifying deal', () => {
  let career = createNrlCareer('bears', 39, 2027);
  const quote = nrlBoardRecruitmentQuote(career);
  const actions: NrlCareerAction[] = [];
  const onAction = (action: NrlCareerAction) => {
    actions.push(action);
    const next = reduceNrlCareer(career, action);
    if (next === career) return false;
    career = next;
    return true;
  };
  const office = () => <NrlCareerOffice career={career} screen="recruitment" onAction={onAction} disabled={false} />;
  const view = render(office());
  const brief = within(screen.getByRole('region', { name: 'Board recruitment brief' }));
  expect(brief.getByText(/\$100,000/)).toBeVisible();
  fireEvent.click(brief.getByRole('button', { name: `View ${quote.role} market` }));
  expect(actions).toEqual([]);
  expect(screen.getByRole('combobox', { name: 'Position' })).toHaveValue(quote.role);
  fireEvent.click(brief.getByRole('button', { name: 'Accept recruitment objective' }));
  expect(actions).toEqual([{ type: 'acceptBoardRecruitment', year: 2027, clubId: 'bears', role: quote.role }]);
  view.rerender(office());
  expect(brief.getByRole('status')).toHaveTextContent('Objective accepted');
  expect(screen.getByRole('combobox', { name: 'Position' })).toHaveValue(quote.role);
  const { player, askingSalary } = quote.targets[0];
  onAction({ type: 'offerContract', playerId: player.id, salary: askingSalary, years: 1 });
  view.rerender(office());
  expect(brief.getByRole('status')).toHaveTextContent(player.name);
  expect(brief.getByRole('status')).toHaveTextContent('pays at the end of the regular season');
});

it('changes the available market in the brief before locking the alternate position', () => {
  let career = createNrlCareer('bears', 39, 2027);
  const quote = nrlBoardRecruitmentQuote(career);
  const alternative = quote.options?.[1];
  const actions: NrlCareerAction[] = [];
  const office = () => <NrlCareerOffice career={career} screen="recruitment" onAction={action => {
    actions.push(action);
    career = reduceNrlCareer(career, action);
    return true;
  }} disabled={false} />;
  const view = render(office());
  const brief = within(screen.getByRole('region', { name: 'Board recruitment brief' }));
  const picker = brief.getByRole('combobox', { name: 'Recruitment objective position' });
  expect(picker).toHaveValue(quote.role);
  fireEvent.change(picker, { target: { value: alternative!.role } });
  expect(brief.getByText(`Sign an external ${alternative!.role} for 2028 by the end of the regular season. Reward $100,000 in club cash.`)).toBeVisible();
  expect(brief.getByText(`${alternative!.targets.length} players fit your cap and squad today.`)).toBeVisible();
  fireEvent.click(brief.getByText('See eligible recruits', { exact: true }));
  const recruits = brief.getByRole('list', { name: 'Eligible recruits' });
  expect(within(recruits).getAllByRole('listitem').map(item => item.textContent?.split(' · ')[0]))
    .toEqual(alternative!.targets.map(({ player }) => player.name));
  fireEvent.click(brief.getByRole('button', { name: `View ${alternative!.role} market` }));
  expect(actions).toEqual([]);
  expect(screen.getByRole('combobox', { name: 'Position' })).toHaveValue(alternative!.role);
  fireEvent.click(brief.getByRole('button', { name: 'Accept recruitment objective' }));
  view.rerender(office());
  expect(brief.queryByRole('combobox')).not.toBeInTheDocument();
  expect(brief.getByRole('status')).toHaveTextContent('Objective accepted');
  expect(career.finance.boardRecruitment?.role).toBe(alternative!.role);
});
