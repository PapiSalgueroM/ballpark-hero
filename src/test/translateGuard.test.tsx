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

/**
 * Round 1141. The real translator, as measured on 2026-10-08 in three languages:
 *  - a <font> goes in BEFORE the text node, then the text node leaves (two steps, not one replace);
 *  - a node it has taken once is never taken again, however often it is put back;
 *  - neighbouring text nodes are one sentence. Its words are shared out as the language needs, and the
 *    worst case measured is the one played here: every wrapper of the run comes back EMPTY except the
 *    last, which holds the whole sentence (Portuguese did that to "Age " and "16").
 * Called again after a change, it does what the real one does next: it takes whatever text is new.
 */
const takenOnce = new WeakSet<Node>();
function translateReal(root: Element) {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);
  const fresh = texts.filter(t => t.nodeValue && t.nodeValue.trim() && !takenOnce.has(t) && !t.parentElement?.closest('font'));
  const runs: Text[][] = [];
  for (const t of fresh) {
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1].nextSibling === t) last.push(t);
    else runs.push([t]);
  }
  for (const run of runs) {
    const wrappers = run.map(t => {
      const outer = doc.createElement('font');
      t.parentNode!.insertBefore(outer, t);
      return outer;
    });
    const inner = doc.createElement('font');
    inner.textContent = `pt:${run.map(t => t.nodeValue).join('')}`;
    wrappers[wrappers.length - 1].appendChild(inner);
    for (const t of run) {
      takenOnce.add(t);
      t.parentNode!.removeChild(t);
    }
  }
}
const fontsIn = (el: Element) => el.querySelectorAll('font').length;
/** Lets the observer read what has happened so far, so a count taken next is a count of what comes after. */
const settle = () => new Promise<void>(resolve => setTimeout(resolve, 0));
const stats = () => ({ ...(window as unknown as { __dukbTranslateStats: Record<string, number> }).__dukbTranslateStats });

/** A sentence React builds from pieces, one of which can leave. */
function Header() {
  const [age, setAge] = useState<number | null>(16);
  return (
    <div>
      <button onClick={() => setAge(null)}>hide age</button>
      <p data-testid="header">Striker · Age {age} · England</p>
    </div>
  );
}

/** The Bank's shape: a sign that appears in front of a figure. An empty string makes no node at all. */
function Money() {
  const [plus, setPlus] = useState(false);
  return (
    <div>
      <button onClick={() => setPlus(true)}>gain</button>
      <p data-testid="money">{plus ? '+' : ''}{'$50k'}</p>
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

/**
 * Round 1141: the translated page stays right. Every test here uses translateReal, and none of them is
 * satisfied by "it did not throw": each one reads the words that are on the page afterwards.
 */
describe('layer two: a string React removes takes its translated copy with it', () => {
  it('a placeholder gives way to a value and none of the old words stay behind', async () => {
    const { container } = render(<Boundary><Picker /></Boundary>);
    translateReal(container);
    const trigger = screen.getByTestId('trigger');
    expect(trigger.textContent).toBe('pt:Choose nationality');
    await settle();
    const before = stats();
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(trigger.textContent).toBe('Brazil');
    expect(fontsIn(trigger)).toBe(0);
    expect(trigger.childNodes.length).toBe(1);
    expect(stats().removed).toBe(before.removed + 1);
  });

  it('when one piece of a sentence leaves, the rest goes back to the translator whole', () => {
    const { container } = render(<Boundary><Header /></Boundary>);
    translateReal(container);
    const header = screen.getByTestId('header');
    // the worst case measured: two empty wrappers and the whole sentence in the third
    expect(header.textContent).toBe('pt:Striker · Age 16 · England');
    expect(Array.from(header.children).map(c => c.textContent)).toEqual(['', '', 'pt:Striker · Age 16 · England']);
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    // React's words, React's order, nothing of the translator's left in this element
    expect(header.textContent).toBe('Striker · Age  · England');
    expect(fontsIn(header)).toBe(0);
    expect(header.childNodes.length).toBe(2);
    // and the translator takes those, because they are new nodes to it
    translateReal(container);
    expect(header.textContent).toBe('pt:Striker · Age  · England');
  });

  it('a node nobody translated is still left to layer one', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await settle();
    const before = stats();
    const parent = document.createElement('div');
    const kept = parent.appendChild(document.createElement('font'));
    const stranger = document.createTextNode('x');
    expect(parent.removeChild(stranger)).toBe(stranger);
    expect(Array.from(parent.childNodes)).toEqual([kept]);
    expect(stats()).toEqual(before);
    warn.mockRestore();
  });

  it('an ordinary removal beside a <font> that was already there is not read as a swap', async () => {
    const parent = document.body.appendChild(document.createElement('div'));
    const own = parent.appendChild(document.createElement('font'));
    own.textContent = 'kept';
    const first = parent.appendChild(document.createTextNode('first'));
    translateReal(parent);
    expect(parent.textContent).toBe('keptpt:first');
    await settle();
    const before = stats();
    // a second string arrives right after that <font> and leaves again before any translator sees it
    const second = parent.insertBefore(document.createTextNode('second'), own.nextSibling);
    parent.removeChild(second);
    // now React drops the first one: its wrapper goes, the group is refreshed, and the older <font> is
    // not mistaken for a copy of the string that just left
    parent.removeChild(first);
    expect(Array.from(parent.childNodes)).toEqual([own]);
    expect(own.textContent).toBe('kept');
    expect(stats().swaps).toBe(before.swaps);
    expect(stats().removed).toBe(before.removed + 1);
    parent.remove();
  });
});

describe('layer two: a new node lands before the string it precedes', () => {
  it('an element goes in front of a translated string, not at the end', async () => {
    const { container } = render(<Boundary><Banner /></Boundary>);
    translateReal(container);
    const line = screen.getByTestId('line');
    expect(line.textContent).toBe('pt:tail words');
    await settle();
    const before = stats();
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(line.firstElementChild?.nodeName).toBe('I');
    expect(line.firstChild).toBe(line.firstElementChild);
    expect(line.textContent).toBe('NEWtail words');
    expect(stats().inserted).toBe(before.inserted + 1);
    translateReal(container);
    expect(line.textContent).toBe('pt:NEWpt:tail words');
    expect(line.firstChild?.nodeName).toBe('I');
  });

  it('a sign goes in front of a translated figure', () => {
    const { container } = render(<Boundary><Money /></Boundary>);
    translateReal(container);
    const money = screen.getByTestId('money');
    expect(money.textContent).toBe('pt:$50k');
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(money.textContent).toBe('+$50k');
    expect(fontsIn(money)).toBe(0);
    translateReal(container);
    expect(money.textContent).toBe('pt:+$50k');
  });

  it('a reference nobody translated still falls back to the end', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const parent = document.createElement('div');
    const kept = parent.appendChild(document.createElement('em'));
    const fresh = document.createElement('i');
    parent.insertBefore(fresh, document.createTextNode('gone'));
    expect(Array.from(parent.childNodes)).toEqual([kept, fresh]);
  });
});
