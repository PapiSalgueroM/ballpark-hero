/* Round 1141 step 1: the page the real translator is measured on. Plain DOM, built the way React builds it
   (createTextNode + appendChild), plus a recorder of every MutationObserver record. */
(function () {
  const ids = new WeakMap();
  let next = 1;
  const nid = n => { if (!ids.has(n)) ids.set(n, next++); return ids.get(n); };
  const desc = n => {
    if (!n) return null;
    if (n.nodeType === 3) return { t: '#text', id: nid(n), v: n.nodeValue };
    if (n.nodeType === 1) return { t: n.nodeName.toLowerCase(), id: nid(n), dom: n.id || undefined, text: (n.textContent || '').slice(0, 50) };
    return { t: 'node' + n.nodeType, id: nid(n) };
  };
  const t0 = performance.now();
  window.__rec = [];
  window.__phase = 'boot';
  let batch = 0;
  const root = document.getElementById('root');
  new MutationObserver(list => {
    batch += 1;
    for (const r of list) {
      const inRoot = r.target === root || root.contains(r.target);
      const touchesOurs = inRoot || [...r.removedNodes, ...r.addedNodes].some(n => ids.has(n));
      if (!touchesOurs && !(r.target.nodeName === 'FONT')) continue;
      window.__rec.push({
        phase: window.__phase, batch, ms: Math.round(performance.now() - t0), type: r.type, inRoot,
        target: desc(r.target), added: [...r.addedNodes].map(desc), removed: [...r.removedNodes].map(desc),
        prev: desc(r.previousSibling), next: desc(r.nextSibling), old: r.oldValue == null ? undefined : r.oldValue,
      });
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, characterDataOldValue: true });

  const T = (window.__T = {});
  const tx = (key, v) => (T[key] = document.createTextNode(v));
  const el = (tag, id, ...kids) => {
    const e = document.createElement(tag);
    if (id) e.id = id;
    for (const k of kids) e.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
    nid(e);
    return e;
  };
  const add = (...a) => root.appendChild(el(...a));
  add('p', 'one', tx('one', 'The quick brown fox jumps over the lazy dog.'));
  add('p', 'adj', tx('adjA', 'Age '), tx('adjB', '16'));
  add('p', 'adj3', tx('adj3A', 'You scored '), tx('adj3B', '3'), tx('adj3C', ' goals this season'));
  add('p', 'adjw', tx('adjwA', 'Striker'), tx('adjwB', ' · Age '), tx('adjwC', '16'), tx('adjwD', ' · '), tx('adjwE', 'England'));
  add('p', 'between', el('b', null, 'Bold words'), tx('between', ' text between elements '), el('i', null, 'italic words'));
  add('p', 'num', tx('num', '16'));
  add('p', 'sym', tx('sym', '+'));
  add('p', 'money', tx('moneyA', '-'), tx('moneyB', '$100k'));
  add('p', 'same', tx('same', 'Chelsea'));
  add('p', 'ph', el('span', 'phspan', tx('ph', 'Choose nationality')));
  add('p', 'later');
  add('p', 'write', tx('write', 'Season one'));
  add('p', 'rm', tx('rm', 'Remove this sentence please'));
  add('p', 'rep', tx('rep', 'Replace this sentence please'));
  add('p', 'ins', tx('ins', 'tail words'));
  add('p', 'loop', tx('loopA', 'Week '), tx('loopB', '1'));
  add('p', 'race', tx('raceA', 'Minute '), tx('raceB', '1'));
  add('p', 'numw', tx('numwA', 'Goals: '), tx('numwB', '4'));
  for (const k of Object.keys(T)) nid(T[k]);

  window.__snap = () => {
    const out = { texts: {}, html: {} };
    for (const k of Object.keys(T)) {
      const n = T[k];
      out.texts[k] = { id: nid(n), v: n.nodeValue, connected: n.isConnected, parent: n.parentNode ? n.parentNode.nodeName.toLowerCase() : null };
    }
    for (const p of root.children) out.html[p.id] = p.innerHTML;
    return out;
  };
  /* Put the text nodes named by keys back as the only children of #pid (what layer two's restore would do). */
  window.__restore = (pid, keys) => {
    const p = document.getElementById(pid);
    while (p.firstChild) p.removeChild(p.firstChild);
    for (const k of keys) p.appendChild(T[k]);
  };
  window.__fontsIn = pid => [...document.getElementById(pid).childNodes].map(n => (n.nodeType === 3 ? '#text' : n.nodeName.toLowerCase()));
})();
