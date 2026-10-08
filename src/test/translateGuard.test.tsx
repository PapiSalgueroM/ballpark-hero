/**
 * Round 1140: a translated page must not crash.
 *
 * A page translator swaps text nodes for <font> elements. These tests do the
 * same swap to a mounted React tree and then make React update it.
 *
 * Order matters and is on purpose: the first block runs BEFORE the guard is
 * installed and proves the crash is real in this environment (the browser's own
 * removeChild and insertBefore throw, and React's commit throws with them).
 * Without that block, the later "does not throw" tests could pass on an
 * environment that never threw in the first place.
 *
 * What these tests hold:
 *  1. Baseline, no guard: a foreign removeChild throws, an insertBefore with a
 *     gone reference throws, and a React update over translated text lands in
 *     the error boundary, which is what the player saw.
 *  2. With the guard: the same calls do not throw, the boundary stays out of
 *     it, the new value is on the page, and a new element still arrives when
 *     its reference node is gone.
 *  3. Ordinary calls are untouched: a real child is removed, a real reference
 *     is respected, and a null child still throws as the browser's own does.
 *  4. Installing twice wraps once, and the off switch leaves the methods alone.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Component, useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installTranslateGuard } from '@/lib/translateGuard';

/** What a page translator does: every text node under root becomes font > font > new text. */
function translate(root: Element) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);
  for (const t of texts) {
    if (!t.nodeValue || !t.nodeValue.trim() || !t.parentNode) continue;
    const outer = document.createElement('font');
    const inner = document.createElement('font');
    inner.textContent = `pt:${t.nodeValue}`;
    outer.appendChild(inner);
    t.parentNode.replaceChild(outer, t);
  }
}

/**
 * The create screen's shape: a placeholder string that gives way to an element.
 * The fragment matters. A bare string that is an element's only child is set as
 * its text content and never becomes a node React removes. Inside a fragment
 * (which is how the select's placeholder is drawn) it is a real text node, and
 * that is the one the translator replaces.
 */
function Picker() {
  const [value, setValue] = useState<string | null>(null);
  return (
    <div>
      <button onClick={() => setValue('Brazil')}>pick</button>
      <span data-testid="trigger">{value ? <b>{value}</b> : <>{'Choose nationality'}</>}</span>
    </div>
  );
}

/** A new element that has to land before a string. */
function Banner() {
  const [on, setOn] = useState(false);
  return (
    <div>
      <button onClick={() => setOn(true)}>show</button>
      <p data-testid="line">
        {on && <i>NEW</i>}
        tail words
      </p>
    </div>
  );
}

/** Stands in for the route error boundary: what a player sees when a commit throws. */
class Boundary extends Component<{ children: ReactNode }, { broke: boolean }> {
  state = { broke: false };
  static getDerivedStateFromError() {
    return { broke: true };
  }
  render() {
    return this.state.broke ? <p role="alert">This page broke</p> : this.props.children;
  }
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('before the guard: the crash is real here', () => {
  it('removeChild throws for a node that is not a child', () => {
    const parent = document.createElement('div');
    const stranger = document.createTextNode('x');
    expect(() => parent.removeChild(stranger)).toThrow();
  });

  it('insertBefore throws when the reference node is gone', () => {
    const parent = document.createElement('div');
    const gone = document.createTextNode('gone');
    expect(() => parent.insertBefore(document.createElement('i'), gone)).toThrow();
  });

  it('a React update over translated text lands in the error boundary', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<Boundary><Picker /></Boundary>);
    translate(container);
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(screen.queryByRole('alert')?.textContent).toBe('This page broke');
  });

  it('so does a new element that goes before a translated string', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<Boundary><Banner /></Boundary>);
    translate(container);
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(screen.queryByRole('alert')?.textContent).toBe('This page broke');
  });
});

describe('with the guard', () => {
  it('installs once and says so', () => {
    expect(installTranslateGuard()).toBe(true);
    const wrapped = Node.prototype.removeChild;
    expect(installTranslateGuard()).toBe(true);
    expect(Node.prototype.removeChild).toBe(wrapped);
  });

  it('removing a node that is not a child is a no-op', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const parent = document.createElement('div');
    parent.appendChild(document.createElement('em'));
    const stranger = document.createTextNode('x');
    expect(parent.removeChild(stranger)).toBe(stranger);
    expect(parent.childNodes.length).toBe(1);
  });

  it('inserting before a gone reference appends, so the new node still arrives', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const parent = document.createElement('div');
    parent.appendChild(document.createElement('em'));
    const fresh = document.createElement('i');
    parent.insertBefore(fresh, document.createTextNode('gone'));
    expect(parent.lastChild).toBe(fresh);
  });

  it('a placeholder gives way to a value on a translated page', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<Boundary><Picker /></Boundary>);
    translate(container);
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByTestId('trigger').querySelector('b')?.textContent).toBe('Brazil');
  });

  it('a new element still shows up when the string it goes before was translated', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<Boundary><Banner /></Boundary>);
    translate(container);
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByTestId('line').querySelector('i')?.textContent).toBe('NEW');
  });

  it('an untranslated page behaves exactly as before', () => {
    render(<Picker />);
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    const trigger = screen.getByTestId('trigger');
    expect(trigger.textContent).toBe('Brazil');
    expect(trigger.childNodes.length).toBe(1);

    const parent = document.createElement('div');
    const a = parent.appendChild(document.createElement('a'));
    const b = parent.appendChild(document.createElement('b'));
    const c = document.createElement('i');
    parent.insertBefore(c, b);
    expect(Array.from(parent.childNodes)).toEqual([a, c, b]);
    parent.removeChild(a);
    expect(Array.from(parent.childNodes)).toEqual([c, b]);
    expect(() => parent.removeChild(null as unknown as Node)).toThrow();
  });

  it('the off switch leaves a window alone', () => {
    const fake = { Node: class {}, __DUKB_NO_TRANSLATE_GUARD__: true } as unknown as Parameters<typeof installTranslateGuard>[0];
    const before = (fake as unknown as { Node: { prototype: { removeChild?: unknown } } }).Node.prototype.removeChild;
    expect(installTranslateGuard(fake)).toBe(false);
    expect((fake as unknown as { Node: { prototype: { removeChild?: unknown } } }).Node.prototype.removeChild).toBe(before);
  });
});
