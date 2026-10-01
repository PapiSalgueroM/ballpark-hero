import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';

afterEach(cleanup);
const rules = <><p>Fixture instructions.</p><p>Fixture worked example.</p></>;

describe('help dialog focus return', () => {
  for (const close of ["Let's Play!", 'Close', 'Escape']) {
    it(`returns to its help trigger after ${close}`, async () => {
      const view = render(<HowToPlayPopover title="Fixture rules">{rules}</HowToPlayPopover>);
      const trigger = view.getByRole('button', { name: 'How to play' });
      trigger.focus();
      fireEvent.click(trigger);
      const dialog = await view.findByRole('dialog');
      expect(dialog).toHaveTextContent('Fixture instructions.');
      if (close === 'Escape') fireEvent.keyDown(dialog, { key: 'Escape' });
      else fireEvent.click(view.getByRole('button', { name: close }));
      await waitFor(() => expect(view.queryByRole('dialog')).not.toBeInTheDocument());
      await waitFor(() => expect(trigger).toHaveFocus());
      expect(view.getByRole('button', { name: 'How to play' })).toBe(trigger);
    });
  }

  it('returns focus after the controlling parent closes its dialog', async () => {
    const change = vi.fn();
    const view = render(<HowToPlayPopover title="Controlled rules" open onOpenChange={change}>{rules}</HowToPlayPopover>);
    const trigger = view.getByRole('button', { name: 'How to play', hidden: true });
    await view.findByRole('dialog');
    view.rerender(<HowToPlayPopover title="Controlled rules" open={false} onOpenChange={change}>{rules}</HowToPlayPopover>);
    await waitFor(() => expect(view.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(change).not.toHaveBeenCalled();
  });

  it('returns to the help control belonging to the closed dialog', async () => {
    const view = render(<>
      <HowToPlayPopover title="First rules" triggerLabel="First help">{rules}</HowToPlayPopover>
      <HowToPlayPopover title="Second rules" triggerLabel="Second help" floatingTrigger={false}>{rules}</HowToPlayPopover>
    </>);
    const first = view.getByRole('button', { name: 'First help' });
    const second = view.getByRole('button', { name: 'Second help' });
    fireEvent.click(second);
    await view.findByRole('dialog');
    fireEvent.click(view.getByRole('button', { name: "Let's Play!" }));
    await waitFor(() => expect(second).toHaveFocus());
    expect(first).not.toHaveFocus();
  });

  it('preserves controlled open callbacks, exact content and trigger label', async () => {
    const change = vi.fn();
    const view = render(<HowToPlayPopover title="Controlled rules" triggerLabel="Read rules" open={false} onOpenChange={change}>{rules}</HowToPlayPopover>);
    fireEvent.click(view.getByRole('button', { name: 'Read rules' }));
    expect(change).toHaveBeenCalledExactlyOnceWith(true);
    expect(view.queryByRole('dialog')).not.toBeInTheDocument();
    view.rerender(<HowToPlayPopover title="Controlled rules" triggerLabel="Read rules" open onOpenChange={change}>{rules}</HowToPlayPopover>);
    const dialog = await view.findByRole('dialog');
    expect(dialog).toHaveTextContent('Fixture instructions.Fixture worked example.');
    fireEvent.click(view.getByRole('button', { name: "Let's Play!" }));
    expect(change).toHaveBeenLastCalledWith(false);
    expect(view.getByRole('dialog')).toBe(dialog);
  });
});
