import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { Footer } from './Footer';

afterEach(cleanup);

function drawFooter() {
  return render(<MemoryRouter><Footer /></MemoryRouter>);
}

describe('compact footer', () => {
  it('keeps policies outside collapsed site info and retains the full disclosure inside', () => {
    const { container } = drawFooter();
    const info = container.querySelector('details');
    expect(info).not.toBeNull();
    expect(info).not.toHaveAttribute('open');
    for (const href of ['/privacy', '/terms']) {
      const link = container.querySelector(`a[href="${href}"]`)!;
      expect(link).toBeVisible();
      expect(link.closest('details')).toBeNull();
    }
    expect(screen.getByRole('button', { name: 'Cookie choices' }).closest('details')).toBeNull();
    const disclosure = within(info as HTMLElement).getByText(/All team names, competition names, logos and trademarks/);
    expect(disclosure).not.toBeVisible();
    expect(disclosure).toHaveTextContent('DoUKnowBall is an independent fan project');
    expect(disclosure).toHaveTextContent('FIFA, UEFA, the Premier League');
    expect(disclosure).toHaveTextContent('Player names and statistics are used for identification and commentary only.');
  });

  it('puts the report action before footer navigation and opens the real form without expanding site info', () => {
    const { container } = drawFooter();
    const report = screen.getByRole('button', { name: 'Report a bug' });
    const privacy = container.querySelector('a[href="/privacy"]')!;
    expect(report.compareDocumentPosition(privacy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(report);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('textbox', { name: 'Describe the problem' })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Send report' })).toBeDisabled();
    expect(container.querySelector('details')).not.toHaveAttribute('open');
  });

  it('keeps all secondary destinations available when site info is expanded', () => {
    const { container } = drawFooter();
    const summary = screen.getByText('Site info');
    fireEvent.click(summary);
    const info = container.querySelector('details')!;
    expect(info).toHaveAttribute('open');
    const links = [...info.querySelectorAll('a')].map(link => link.getAttribute('href'));
    expect(links).toEqual(expect.arrayContaining([
      '/about', '/contact', '/whats-new', '/records', '/leaderboard', '/accessibility',
      '/soccer', '/pro-football', '/pro-basketball', '/baseball', '/hockey', '/college',
    ]));
    expect(within(info).getByText(/All team names, competition names, logos and trademarks/)).toBeVisible();
  });
});
