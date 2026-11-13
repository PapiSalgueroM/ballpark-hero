import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SoccerCareerCreator } from '@/components/soccer-career/SoccerCareerCreator';

const renderFlag = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/components/soccer-career/AppearanceBuilder', () => ({ default: () => null }));
vi.mock('@/components/FlagImg', () => ({
  FlagImg: ({ name }: { name: string }) => {
    renderFlag(name);
    return <span data-flag={name} aria-hidden="true" />;
  },
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('keeps nationality typeahead and the selected flag while deferring the closed list flags', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  const scrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = vi.fn();
  try {
    const view = render(<SoccerCareerCreator onBegin={vi.fn()} />);
    const [trigger] = view.getAllByRole('combobox');
    expect(trigger).toHaveTextContent('Choose nationality');
    expect(renderFlag).not.toHaveBeenCalled();

    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'b' });
    expect(trigger).toHaveTextContent('Belarus');
    expect(trigger.querySelector('[data-flag="Belarus"]')).toBeInTheDocument();
    expect(new Set(renderFlag.mock.calls.map(([name]) => name))).toEqual(new Set(['Belarus']));

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const list = await screen.findByRole('listbox');
    const england = within(list).getByRole('option', { name: 'England' });
    expect(england.querySelector('[data-flag="England"]')).toBeInTheDocument();
    expect(within(list).getByText('Europe (UEFA)')).toBeInTheDocument();
    fireEvent.keyDown(england, { key: 'Enter' });
    expect(trigger).toHaveTextContent('England');
    expect(trigger.querySelector('[data-flag="England"]')).toBeInTheDocument();
  } finally {
    Element.prototype.scrollIntoView = scrollIntoView;
  }
});
