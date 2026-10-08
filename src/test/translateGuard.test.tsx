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
 *
 * Round 1141 adds layer two, and what its tests hold is not "it did not throw"
 * but the words on the page afterwards, under a translator that behaves the
 * way the real one was measured to (translateReal below):
 *  5. A string React removes takes its translated copy with it, and the rest of
 *     the sentence goes back to the translator whole.
 *  6. A new node lands before the translated string it precedes.
 *  7. A string React rewrites in place shows its new words, the label beside it
 *     stays, a hundred rewrites leave the same two nodes, and a translator
 *     answer that arrives late cannot bring older words back.
 *  8. An untranslated page triggers nothing: every counter stays where it was.
 *  9. The control: a second window with layer two switched off gets the same
 *     calls and shows the frozen number and the stale word again.
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
/** What the translator reads: every sentence of new text under root, with the words it holds right now. */
function readNewText(root: Element) {
  const walker = root.ownerDocument.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);
  const fresh = texts.filter(t => t.nodeValue && t.nodeValue.trim() && !takenOnce.has(t) && !t.parentElement?.closest('font'));
  const runs: Text[][] = [];
  for (const t of fresh) {
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1].nextSibling === t) last.push(t);
    else runs.push([t]);
  }
  return runs.map(run => ({ run, words: run.map(t => t.nodeValue).join('') }));
}
/** What it does with the answer: the swap, with the words it READ, on whichever of those nodes are still on the page. */
function answer(jobs: ReturnType<typeof readNewText>) {
  for (const { run, words } of jobs) {
    const here = run.filter(t => t.isConnected);
    if (!here.length) continue;
    const doc = here[0].ownerDocument;
    const wrappers = here.map(t => {
      const outer = doc.createElement('font');
      t.parentNode!.insertBefore(outer, t);
      return outer;
    });
    const inner = doc.createElement('font');
    inner.textContent = `pt:${words}`;
    wrappers[wrappers.length - 1].appendChild(inner);
    for (const t of here) {
      takenOnce.add(t);
      t.parentNode!.removeChild(t);
    }
  }
}
function translateReal(root: Element) {
  answer(readNewText(root));
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

/** The header's shape: a label and a number React rewrites in place. */
function Counter() {
  const [age, setAge] = useState(16);
  return (
    <div>
      <button onClick={() => setAge(a => a + 1)}>older</button>
      <p data-testid="age">Age {age}</p>
    </div>
  );
}

/** The Bank again, whole: the sign arrives and the figure changes in one commit. */
function Ledger() {
  const [amount, setAmount] = useState(-100);
  return (
    <div>
      <button onClick={() => setAmount(50)}>repay</button>
      <p data-testid="ledger">{amount >= 0 ? '+' : ''}{`$${amount}k`}</p>
    </div>
  );
}

/** The roll's shape: a figure that is its element's only child, so React writes it through the element. */
function Roll() {
  const [n, setN] = useState(50);
  return (
    <div>
      <button onClick={() => setN(v => v + 1)}>roll</button>
      <div data-testid="roll">{n}</div>
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

describe('layer two: a string React rewrites in place shows its new words', () => {
  it('a number beside a label shows the new number, and the label is still there', async () => {
    const { container } = render(<Boundary><Counter /></Boundary>);
    const age = screen.getByTestId('age');
    const [label, number] = Array.from(age.childNodes);
    translateReal(container);
    // the label's own wrapper is empty: its word lives in the number's wrapper
    expect(Array.from(age.children).map(c => c.textContent)).toEqual(['', 'pt:Age 16']);
    await settle();
    const before = stats();
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(age.textContent).toBe('Age 17');
    expect(fontsIn(age)).toBe(0);
    expect(age.childNodes.length).toBe(2);
    expect(stats().restored).toBe(before.restored + 2);
    // React's own nodes stay off the page: the translator would never look at them again
    expect(label.isConnected).toBe(false);
    expect(number.isConnected).toBe(false);
    expect(number.nodeValue).toBe('17');
    translateReal(container);
    expect(age.textContent).toBe('pt:Age 17');
    // and again, now over the wrappers the translator made for the stand ins
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(age.textContent).toBe('Age 18');
    translateReal(container);
    expect(age.textContent).toBe('pt:Age 18');
  });

  it('a hundred updates leave exactly the nodes it started with', async () => {
    const { container } = render(<Boundary><Counter /></Boundary>);
    const age = screen.getByTestId('age');
    translateReal(container);
    for (let i = 1; i <= 100; i++) {
      act(() => {
        fireEvent.click(screen.getByRole('button'));
      });
      expect(age.childNodes.length).toBe(2);
      expect(age.textContent).toBe(`Age ${16 + i}`);
      // the translator answers some of the time, and is still working at others
      if (i % 3 === 0) {
        translateReal(container);
        expect(age.textContent).toBe(`pt:Age ${16 + i}`);
      }
      if (i % 2 === 0) await settle();
    }
    translateReal(container);
    expect(age.textContent).toBe('pt:Age 116');
    expect(age.childNodes.length).toBe(2);
    expect(fontsIn(age)).toBe(3);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a translator still working on older words cannot bring them back', async () => {
    const { container } = render(<Boundary><Counter /></Boundary>);
    const age = screen.getByTestId('age');
    translateReal(container);
    await settle();
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(age.textContent).toBe('Age 17');
    // the translator has read "Age " and "17", and its answer is on the way
    const late = readNewText(age);
    expect(late.map(j => j.words)).toEqual(['Age 17']);
    await settle();
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    // measured on the real one: an answer lands on the node it read, with the words it read then
    answer(late);
    expect(age.textContent).toBe('Age 18');
    translateReal(container);
    expect(age.textContent).toBe('pt:Age 18');
  });

  it('a sign that arrives and a figure that changes in the same commit both show', async () => {
    const { container } = render(<Boundary><Ledger /></Boundary>);
    translateReal(container);
    const ledger = screen.getByTestId('ledger');
    expect(ledger.textContent).toBe('pt:$-100k');
    await settle();
    const before = stats();
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(ledger.textContent).toBe('+$50k');
    expect(ledger.childNodes.length).toBe(2);
    translateReal(container);
    expect(ledger.textContent).toBe('pt:+$50k');
  });

  it('one commit that rewrites three strings of a line makes its stand ins once, not three times', async () => {
    const p = document.body.appendChild(document.createElement('p'));
    const parts = ['1', ' of ', '10', ' matches won (', '10', '%)'].map(s => p.appendChild(document.createTextNode(s)));
    translateReal(p);
    await settle();
    const before = stats();
    parts[0].nodeValue = '2';
    parts[2].nodeValue = '11';
    parts[4].nodeValue = '18';
    expect(p.textContent).toBe('2 of 11 matches won (18%)');
    expect(p.childNodes.length).toBe(6);
    // six for the first rewrite, then only the one whose words changed: eight, where eighteen would be every one every time
    expect(stats().restored).toBe(before.restored + 8);
    translateReal(p);
    expect(p.textContent).toBe('pt:2 of 11 matches won (18%)');
    p.remove();
  });

  it('hiding a string and showing it again works off the page too', () => {
    const p = document.body.appendChild(document.createElement('p'));
    const words = p.appendChild(document.createTextNode('Sponsor deal signed'));
    translateReal(p);
    expect(p.textContent).toBe('pt:Sponsor deal signed');
    words.nodeValue = '';
    expect(p.textContent).toBe('');
    expect(fontsIn(p)).toBe(0);
    words.nodeValue = 'Sponsor deal signed';
    expect(p.textContent).toBe('Sponsor deal signed');
    expect(p.childNodes.length).toBe(1);
    translateReal(p);
    expect(p.textContent).toBe('pt:Sponsor deal signed');
    p.remove();
  });

  it('writing the same words again leaves the translation alone', async () => {
    const p = document.body.appendChild(document.createElement('p'));
    const words = p.appendChild(document.createTextNode('Season one'));
    translateReal(p);
    const wrapper = p.firstChild;
    await settle();
    const before = stats();
    words.nodeValue = 'Season one';
    expect(p.firstChild).toBe(wrapper);
    expect(stats()).toEqual(before);
    p.remove();
  });

  it('an untranslated page triggers nothing at all', async () => {
    await settle();
    const before = stats();
    render(
      <Boundary>
        <Picker />
        <Banner />
        <Header />
        <Money />
        <Counter />
        <Ledger />
      </Boundary>,
    );
    for (const button of screen.getAllByRole('button')) {
      act(() => {
        fireEvent.click(button);
      });
    }
    await settle();
    expect(screen.getByTestId('trigger').textContent).toBe('Brazil');
    expect(screen.getByTestId('line').textContent).toBe('NEWtail words');
    expect(screen.getByTestId('header').textContent).toBe('Striker · Age  · England');
    expect(screen.getByTestId('money').textContent).toBe('+$50k');
    expect(screen.getByTestId('age').textContent).toBe('Age 17');
    expect(screen.getByTestId('ledger').textContent).toBe('+$50k');
    expect(document.querySelectorAll('font').length).toBe(0);
    expect(stats()).toEqual(before);
  });
});

/**
 * The translator's own delay. It reads a node when it first sees it and answers later with the words it
 * read. Measured on the real one: a node rewritten 5 ms after it appeared was swapped for its FIRST words
 * and stayed that way. No guard is involved in that at all, and it froze the roll on the create screen.
 */
describe('layer two: a string rewritten while the translator was working on it', () => {
  it('is not left showing its first words', async () => {
    const p = document.body.appendChild(document.createElement('p'));
    const words = p.appendChild(document.createTextNode('First words here'));
    const late = readNewText(p); // the translator has read it
    words.nodeValue = 'Second words here'; // and the page moves on
    answer(late); // the answer lands, for the first words
    expect(p.textContent).toBe('pt:First words here');
    await settle(); // the observer's turn
    expect(p.textContent).toBe('Second words here');
    expect(fontsIn(p)).toBe(0);
    translateReal(p);
    expect(p.textContent).toBe('pt:Second words here');
    // and that is the end of it: nothing keeps handing the same words back
    await settle();
    const before = stats();
    await settle();
    expect(stats()).toEqual(before);
    expect(p.textContent).toBe('pt:Second words here');
    p.remove();
  });

  it('a figure that is its element\'s only child and keeps ticking ends on its last value', async () => {
    const { container } = render(<Boundary><Roll /></Boundary>);
    const roll = screen.getByTestId('roll');
    const press = () => act(() => { fireEvent.click(screen.getByRole('button')); });
    translateReal(screen.getByRole('button'));
    let late = readNewText(container); // reads "50"
    press(); // 51, written into the very node the translator is working on
    answer(late);
    expect(roll.textContent).toBe('pt:50');
    await settle();
    expect(roll.textContent).toBe('51');
    // from here React finds the stand in as the element's only child and writes straight into it
    late = readNewText(container); // reads "51"
    await settle();
    press(); // 52
    expect(roll.textContent).toBe('52');
    answer(late); // the late answer is for a node that is gone
    expect(roll.textContent).toBe('52');
    late = readNewText(container); // reads "52"
    await settle();
    press(); // 53
    press(); // 54, the last one
    answer(late);
    await settle();
    expect(roll.textContent).toBe('54');
    translateReal(container);
    expect(roll.textContent).toBe('pt:54');
    expect(roll.childNodes.length).toBe(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a string that was never rewritten is left alone when it is taken', async () => {
    const p = document.body.appendChild(document.createElement('p'));
    p.appendChild(document.createTextNode('Quiet words'));
    await settle();
    const before = stats();
    translateReal(p);
    const wrapper = p.firstChild;
    await settle();
    expect(p.firstChild).toBe(wrapper);
    expect(stats().restored).toBe(before.restored);
    expect(stats().swaps).toBe(before.swaps + 1);
    p.remove();
  });
});

/**
 * THE CONTROL. A second window (a frame has its own Node.prototype) gets the guard with layer two switched
 * off, and the same calls React makes are played in both. Without layer two the page does not throw, and
 * the number is frozen and the old word stays: exactly what Round 1140 shipped and this round is for.
 */
describe('the control: layer one alone leaves the stale word and the frozen number', () => {
  function play(doc: Document) {
    const p = doc.body.appendChild(doc.createElement('p'));
    const label = p.appendChild(doc.createTextNode('Age '));
    const number = p.appendChild(doc.createTextNode('16'));
    translateReal(p);
    const translated = p.textContent;
    number.nodeValue = '17';
    const afterWrite = p.textContent;
    p.insertBefore(doc.createElement('i'), number).textContent = 'NEW ';
    const afterInsert = p.textContent;
    p.removeChild(label);
    const afterRemove = p.textContent;
    p.remove();
    return { translated, afterWrite, afterInsert, afterRemove };
  }

  it('the same calls, with and without layer two', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const frame = document.body.appendChild(document.createElement('iframe'));
    const other = frame.contentWindow as unknown as NonNullable<Parameters<typeof installTranslateGuard>[0]>;
    expect(other.Node === Node).toBe(false);
    other.__DUKB_NO_TRANSLATE_LIVE__ = true;
    expect(installTranslateGuard(other)).toBe(true);
    expect(other.__dukbTranslateStats).toBeUndefined();

    expect(play(other.document)).toEqual({
      translated: 'pt:Age 16',
      afterWrite: 'pt:Age 16', // frozen
      afterInsert: 'pt:Age 16NEW ', // at the end, not before the number
      afterRemove: 'pt:Age 16NEW ', // the label's words never leave
    });
    expect(play(document)).toEqual({
      translated: 'pt:Age 16',
      afterWrite: 'Age 17',
      afterInsert: 'Age NEW 17',
      afterRemove: 'NEW 17',
    });
    frame.remove();
  });
});
