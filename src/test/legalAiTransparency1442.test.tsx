import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SeasonStory } from '@/components/fantasy-draft/SeasonStory';
import PrivacyPolicy from '@/pages/PrivacyPolicy';

vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
afterEach(cleanup);

describe('legal and story transparency', () => {
  it('labels both recaps as fiction without mislabeling the deterministic fallback as AI-generated', () => {
    const teamAStory = 'Harbor XI won an imagined final.\n<em>This stays plain text.</em>';
    const teamBStory = 'Hill XI finished its fictional season with a close match.';
    const view = render(<SeasonStory teamAStory={teamAStory} teamBStory={teamBStory} />);
    expect(screen.getByText('Fictional game recap')).toBeVisible();
    expect(screen.getByText(/not reports or predictions about the named players/)).toBeVisible();
    expect(screen.queryByText(/AI-generated/i)).toBeNull();
    expect(screen.getByText(/Harbor XI/).textContent).toBe(teamAStory);
    expect(screen.getByText(teamBStory)).toBeVisible();
    expect(view.container.querySelector('em')).toBeNull();
    expect(screen.getByRole('heading', { name: "Your Team's Season" })).toBeVisible();
    expect(screen.getByRole('heading', { name: "AI Team's Season" })).toBeVisible();
  });

  it('connects the privacy request path to the own profile and describes the paused Analytics choice', () => {
    render(<MemoryRouter><PrivacyPolicy /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'your profile' })).toHaveAttribute('href', '/profile');
    expect(screen.queryByText(/There is currently no self-serve delete button/)).toBeNull();
    const section = screen.getByRole('heading', { name: /^2\. Cookies/ }).parentElement!;
    expect(within(section).getByText('Global Privacy Control')).toBeVisible();
    expect(within(section).getByText(/Analytics is currently paused/)).toBeVisible();
    expect(within(section).getByText(/180 days/)).toBeVisible();
    expect(screen.getByText(/We do not load its tag/)).toBeVisible();
    expect(screen.getAllByText(/30 days/)).toHaveLength(3);
  });
});
