/* REVIEWER probe, never committed. Finding A at unit level: after the translator undoes itself ("show
   original" puts its saved text nodes back, as measured on Google's translator on 2026-10-08), a string
   layer two had refreshed no longer follows React. */
import { describe, it, expect } from 'vitest';
import { installTranslateGuard } from '../../src/lib/translateGuard';

const tick = () => new Promise(r => setTimeout(r, 0));

/* the translator as measured: a font goes in before the node, the node leaves, a node is taken once;
   restore puts every saved node back where its wrapper stands */
function makeTranslator(root: Element) {
  const taken = new Set<Node>();
  let saved: Array<{ node: Text; wrap: Element }> = [];
  const sweep = () => {
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list: Text[] = [];
    for (let n = tw.nextNode(); n; n = tw.nextNode()) if (!taken.has(n) && !n.parentElement!.closest('font') && n.nodeValue!.trim()) list.push(n as Text);
    for (const n of list) {
      const outer = document.createElement('font');
      const inner = document.createElement('font');
      inner.textContent = `[${n.nodeValue}]`;
      outer.appendChild(inner);
      n.parentNode!.insertBefore(outer, n);
      n.parentNode!.removeChild(n);
      taken.add(n);
      saved.push({ node: n, wrap: outer });
    }
  };
  const restore = () => {
    for (const s of saved) if (s.wrap.parentNode) { s.wrap.parentNode.insertBefore(s.node, s.wrap); s.wrap.parentNode.removeChild(s.wrap); }
    saved = [];
  };
  return { sweep, restore };
}

describe('reviewer probe: show original after layer two refreshed a string', () => {
  it('the number React writes after the translator undid itself reaches the page', async () => {
    expect(installTranslateGuard(window as never)).toBe(true);
    const p = document.createElement('p');
    document.body.appendChild(p);
    const label = document.createTextNode('Age ');
    const num = document.createTextNode('16');
    p.append(label, num);
    const tr = makeTranslator(p);
    tr.sweep();
    await tick();
    num.nodeValue = '17'; // React's commitTextUpdate on a node the translator took
    await tick();
    tr.sweep(); // the translator takes the stand ins
    await tick();
    expect(p.textContent).toBe('[Age ][17]');
    const before = { ...(window as never as { __dukbTranslateStats: Record<string, number> }).__dukbTranslateStats };
    tr.restore(); // "show original"
    await tick();
    expect(p.textContent).toBe('Age 17');
    num.nodeValue = '18'; // the next birthday
    await tick();
    const after = (window as never as { __dukbTranslateStats: Record<string, number> }).__dukbTranslateStats;
    console.log(`PROBE after show original: page says ${JSON.stringify(p.textContent)}, React holds "Age 18"; stats before ${JSON.stringify(before)} after ${JSON.stringify(after)}; num.isConnected=${num.isConnected}`);
    /* and React removing the number: does its copy leave? */
    let threw = '';
    try { p.removeChild(num); } catch (e) { threw = String(e); }
    console.log(`PROBE removeChild(num): threw=${JSON.stringify(threw)} page says ${JSON.stringify(p.textContent)}`);
    expect(p.textContent).toBe('Age ');
  });
});
