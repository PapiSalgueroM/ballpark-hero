/* Round 1141 step 1, second measurement: a prototype of layer two (the map plus fresh stand in text nodes)
   against the real translator. Same recorder as page.js. window.__run() plays every phase in the page. */
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

  /* ---- the prototype of layer two ---- */
  const shown = new WeakMap(); // React's text node -> what stands for it on the page (a wrapper or a stand in)
  const owner = new WeakMap(); // wrapper or stand in -> React's text node
  const stats = (window.__stats = { swaps: 0, fresh: 0, unmatched: 0 });
  const isFont = n => !!n && n.nodeType === 1 && n.nodeName === 'FONT';
  function take(list) {
    for (const r of list) {
      if (r.type !== 'childList' || !r.removedNodes.length) continue;
      for (const x of r.removedNodes) {
        if (x.nodeType !== 3) continue;
        let w = null;
        for (const a of r.addedNodes) if (isFont(a)) { w = a; break; }
        if (!w && isFont(r.previousSibling)) w = r.previousSibling;
        if (!w && isFont(r.nextSibling)) w = r.nextSibling;
        if (!w || owner.has(w) || w.parentNode !== r.target) { if (ids.has(x) || owner.has(x)) stats.unmatched++; continue; }
        const t = owner.get(x) || x;
        owner.delete(x);
        shown.set(t, w);
        owner.set(w, t);
        stats.swaps++;
      }
    }
  }
  const obs = new MutationObserver(take);
  obs.observe(document.documentElement, { childList: true, subtree: true });
  /* React wrote t.nodeValue while t is off the page. mode: 'group' gives every tracked child of the parent back
     as fresh text, 'single' only t. pending: 'new' swaps a stand in that is still waiting for a fresh one,
     'write' writes into it. */
  window.__write = (t, value, mode, pending) => {
    t.nodeValue = value;
    take(obs.takeRecords());
    if (t.isConnected) return 'connected';
    const r = shown.get(t);
    if (!r || !r.isConnected) return 'lost';
    const parent = r.parentNode;
    for (const c of [...parent.childNodes]) {
      const tc = owner.get(c);
      if (!tc) continue;
      if (mode === 'single' && tc !== t) continue;
      if (c.nodeType === 3) {
        if (tc !== t) continue;
        if (pending === 'write') { c.nodeValue = value; continue; }
      }
      const s = document.createTextNode(tc.nodeValue);
      nid(s);
      parent.replaceChild(s, c);
      owner.delete(c);
      owner.set(s, tc);
      shown.set(tc, s);
      stats.fresh++;
    }
    return 'fresh';
  };
  window.__shownKind = t => { const r = shown.get(t); return !r ? 'none' : !r.isConnected ? 'dead' : r.nodeType === 3 ? 'standin' : 'wrapper'; };
  window.__ids = { nid, root };
})();

(function () {
  const { nid, root } = window.__ids;
  const T = (window.__T = {});
  const tx = (key, v) => { const n = (T[key] = document.createTextNode(v)); nid(n); return n; };
  const add = (id, ...kids) => { const p = document.createElement('p'); p.id = id; nid(p); for (const k of kids) p.appendChild(k); root.appendChild(p); return p; };
  add('g1', tx('g1A', 'Age '), tx('g1B', '16'));
  add('s1', tx('s1A', 'Age '), tx('s1B', '16'));
  add('head', tx('hA', 'Striker'), tx('hB', ' · Age '), tx('hC', '16'), tx('hD', ' · '), tx('hE', 'England'));
  add('slow', tx('slowA', 'Week '), tx('slowB', '1'));
  add('fastw', tx('fastwA', 'Minute '), tx('fastwB', '1'));
  add('fastn', tx('fastnA', 'Minute '), tx('fastnB', '1'));
  add('hund', tx('hundA', 'Followers: '), tx('hundB', '1'));
  add('fresh');
  add('hide', tx('hideA', 'Sponsor deal signed'));
  add('after');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const snap = () => {
    const out = { texts: {}, html: {}, kids: {} };
    for (const k of Object.keys(T)) { const n = T[k]; out.texts[k] = { id: nid(n), v: n.nodeValue, connected: n.isConnected, parent: n.parentNode ? n.parentNode.nodeName.toLowerCase() : null, shown: window.__shownKind(n) }; }
    for (const p of root.children) { out.html[p.id] = p.innerHTML; out.kids[p.id] = p.childNodes.length; }
    out.stats = { ...window.__stats };
    return out;
  };
  window.__snap = snap;
  window.__run = async () => {
    const res = { phases: {}, own: {} };
    const ph = n => { window.__phase = n; };
    const done = n => { res.phases[n] = snap(); };
    res.own = { names: Object.getOwnPropertyNames(T.g1A), symbols: Object.getOwnPropertySymbols(T.g1A).length };
    done('translated');
    ph('g1'); res.g1 = window.__write(T.g1B, '17', 'group', 'new'); await sleep(2500); done('g1');
    ph('s1'); res.s1 = window.__write(T.s1B, '17', 'single', 'new'); await sleep(2500); done('s1');
    ph('head'); res.head = window.__write(T.hC, '17', 'group', 'new'); await sleep(2500); done('head');
    ph('slow');
    for (let i = 2; i <= 21; i++) { window.__write(T.slowB, String(i), 'group', 'new'); await sleep(400); }
    await sleep(3000); done('slow');
    ph('fastw');
    for (let i = 2; i <= 41; i++) { window.__write(T.fastwB, String(i), 'group', 'write'); await sleep(50); }
    await sleep(4000); done('fastw');
    ph('fastn');
    for (let i = 2; i <= 41; i++) { window.__write(T.fastnB, String(i), 'group', 'new'); await sleep(50); }
    await sleep(4000); done('fastn');
    ph('hund');
    for (let i = 2; i <= 101; i++) { window.__write(T.hundB, String(i), 'group', 'new'); await sleep(120); }
    await sleep(4000); done('hund');
    /* a brand new connected text node whose value changes 5 ms later, before the translator has taken it */
    ph('fresh');
    const f = (T.fresh = document.createTextNode('First words here')); nid(f);
    document.getElementById('fresh').appendChild(f);
    await sleep(5); f.nodeValue = 'Second words here';
    await sleep(4000); done('fresh');
    /* hide and show, the way a suspended tree does it: empty, then the words again */
    ph('hide'); res.hide1 = window.__write(T.hideA, '', 'group', 'new'); await sleep(1500); done('hide-empty');
    res.hide2 = window.__write(T.hideA, 'Sponsor deal signed', 'group', 'new'); await sleep(2500); done('hide-back');
    /* is the translator still alive after all that? */
    ph('after');
    const a = (T.after = document.createTextNode('One last new sentence')); nid(a);
    document.getElementById('after').appendChild(a);
    await sleep(3000); done('after');
    return res;
  };
})();
