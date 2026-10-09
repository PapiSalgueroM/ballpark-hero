/**
 * Round 1132: the sound switch on screen.
 *
 * The kit is mocked (jsdom has no audio graph), so these read what the switch
 * asks the kit to do: wake and tick when he turns it on, sleep when he turns
 * it off, arm for his first tap when it is already on, nothing at all while
 * it is off.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SoundToggle } from '@/components/game/SoundToggle';
import { setSoundOn, soundOn } from '@/lib/sound';

const kit = vi.hoisted(() => ({ play: vi.fn(), wake: vi.fn(), sleep: vi.fn(), stopAll: vi.fn(), arm: vi.fn() }));
vi.mock('@/lib/soundKit', () => kit);

const settle = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });

afterEach(async () => {
  vi.restoreAllMocks();
  /* the switch keeps this visit's choice in the module: put it back to off */
  act(() => setSoundOn(false));
  await settle();
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe('Round 1132: the sound switch', () => {
  it('is off until he turns it on, and says so', async () => {
    render(<SoundToggle variant="text" />);
    const button = screen.getByRole('button');
    expect(button.textContent).toBe('Sound: off');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    await settle();
    expect(kit.arm).not.toHaveBeenCalled();
    expect(kit.wake).not.toHaveBeenCalled();
    expect(kit.play).not.toHaveBeenCalled();
  });

  it('a click turns it on, stores the choice, wakes the kit and ticks once', async () => {
    render(<SoundToggle variant="text" />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(button.textContent).toBe('Sound: on');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(window.localStorage.getItem('dukb-sound')).toBe('on');
    await waitFor(() => expect(kit.play).toHaveBeenCalledTimes(1));
    expect(kit.play.mock.calls[0][0]).toBe('tap');
    expect(kit.wake).toHaveBeenCalledTimes(1);
    expect(kit.wake.mock.invocationCallOrder[0]).toBeLessThan(kit.play.mock.invocationCallOrder[0]);
    fireEvent.click(button);
    expect(button.textContent).toBe('Sound: off');
    expect(window.localStorage.getItem('dukb-sound')).toBe('off');
    await waitFor(() => expect(kit.sleep).toHaveBeenCalledTimes(1));
    expect(kit.play).toHaveBeenCalledTimes(1);
  });

  it('a switch that is already on arms the kit for his first tap, and plays nothing', async () => {
    window.localStorage.setItem('dukb-sound', 'on');
    render(<SoundToggle variant="text" />);
    expect(screen.getByRole('button').textContent).toBe('Sound: on');
    await waitFor(() => expect(kit.arm).toHaveBeenCalledTimes(1));
    expect(kit.play).not.toHaveBeenCalled();
    expect(kit.wake).not.toHaveBeenCalled();
  });

  it('two switches flip together, and another tab can flip both', async () => {
    render(<><SoundToggle variant="text" /><SoundToggle variant="icon" /></>);
    const [text, icon] = screen.getAllByRole('button');
    fireEvent.click(icon);
    expect(text.textContent).toBe('Sound: on');
    expect(icon.getAttribute('aria-pressed')).toBe('true');
    expect(icon.getAttribute('title')).toBe('Sound is on');
    act(() => {
      window.localStorage.setItem('dukb-sound', 'off');
      window.dispatchEvent(new StorageEvent('storage', { key: 'dukb-sound', newValue: 'off' }));
    });
    expect(text.textContent).toBe('Sound: off');
    expect(icon.getAttribute('aria-pressed')).toBe('false');
    expect(icon.getAttribute('title')).toBe('Sound is off');
  });

  it('the text shape keeps one width, so the footer row cannot re-wrap on a press', () => {
    render(<SoundToggle variant="text" />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('min-w-[10ch]');
    expect(button.className).toContain('whitespace-nowrap');
    expect(button.getAttribute('data-sound-toggle')).toBe('text');
  });

  it('the icon shape is named Sound and its own box is a 44 px target', () => {
    render(<SoundToggle variant="icon" className="hidden sm:inline-flex" />);
    const button = screen.getByRole('button', { name: 'Sound' });
    expect(button.className).toContain('h-11');
    expect(button.className).toContain('w-11');
    expect(button.className).toContain('hidden sm:inline-flex');
    expect(button.getAttribute('type')).toBe('button');
  });

  it('the chip shape is 44 px tall and labelled', () => {
    render(<SoundToggle variant="chip" />);
    const button = screen.getByRole('button');
    expect(button.textContent).toContain('Sound off');
    expect(button.className).toContain('h-11');
    fireEvent.click(button);
    expect(button.textContent).toContain('Sound on');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('a browser that will not store anything: off, then on for the visit, and nothing throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<SoundToggle variant="text" />);
    const button = screen.getByRole('button');
    expect(button.textContent).toBe('Sound: off');
    expect(() => fireEvent.click(button)).not.toThrow();
    expect(button.textContent).toBe('Sound: on');
    expect(soundOn()).toBe(true);
    await waitFor(() => expect(kit.play).toHaveBeenCalledTimes(1));
  });
});
