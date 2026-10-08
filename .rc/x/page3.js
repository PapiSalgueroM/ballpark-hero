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
  /* THE FINAL RULE: whenever layer two acts on a parent, EVERY tracked child of it (wrapper or waiting stand in)
     becomes a brand new text node, so the translator always gets a whole, fresh group. Stand ins made in this
     same turn are written in place: no translator has read them yet. */
  let young = null;
  function refresh(parent) {
    for (const c of [...parent.childNodes]) {
      const tc = owner.get(c);
      if (!tc) continue;
      if (young && young.has(c)) { if (c.nodeValue !== tc.nodeValue) c.nodeValue = tc.nodeValue; continue; }
      const s = document.createTextNode(tc.nodeValue);
      nid(s);
      parent.replaceChild(s, c);
      owner.delete(c);
      owner.set(s, tc);
      shown.set(tc, s);
      if (!young) { young = new Set(); Promise.resolve().then(() => { young = null; }); }
      young.add(s);
      stats.fresh++;
    }
  }
  window.__write = (t, value) => {
    t.nodeValue = value;
    take(obs.takeRecords());
    if (t.isConnected) return 'connected';
    const r = shown.get(t);
    if (!r || !r.parentNode) return 'lost';
    refresh(r.parentNode);
    return 'fresh';
  };
  window.__remove = t => {
    take(obs.takeRecords());
    const r = shown.get(t);
    if (!r || !r.parentNode) return 'lost';
    const parent = r.parentNode;
    parent.removeChild(r);
    shown.delete(t);
    owner.delete(r);
    refresh(parent);
    return 'removed';
  };
  window.__insertBefore = (node, t) => {
    take(obs.takeRecords());
    const r = shown.get(t);
    if (!r || !r.parentNode) return 'lost';
    const parent = r.parentNode;
    refresh(parent);
    parent.insertBefore(node, shown.get(t));
    return 'inserted';
  };
  window.__shownKind = t => { const r = shown.get(t); return !r ? 'none' : !r.isConnected ? 'dead' : r.nodeType === 3 ? 'standin' : 'wrapper'; };
  window.__ids = { nid, root };
})();

(function () {
  const { nid, root } = window.__ids;
  const T = (window.__T = {});
  const tx = (key, v) => { const n = (T[key] = document.createTextNode(v)); nid(n); return n; };
  const add = (id, ...kids) => { const p = document.createElement('p'); p.id = id; nid(p); for (const k of kids) p.appendChild(k); root.appendChild(p); return p; };
  add('one', tx('oneA', 'Age '), tx('oneB', '16'));
  add('head', tx('hA', 'Striker'), tx('hB', ' · Age '), tx('hC', '16'), tx('hD', ' · '), tx('hE', 'England'));
  add('rmv', tx('rA', 'Striker'), tx('rB', ' · Age '), tx('rC', '16'), tx('rD', ' · '), tx('rE', 'England'));
  add('insb', tx('iA', 'You have '), tx('iB', '3'), tx('iC', ' goals this season'));
  add('fast', tx('fastA', 'Minute '), tx('fastB', '1'));
  add('fast20', tx('f20A', 'Minute '), tx('f20B', '1'));
  add('hund', tx('hundA', 'Followers: '), tx('hundB', '1'));
  add('three', tx('tA', '1'), tx('tB', ' of '), tx('tC', '10'), tx('tD', ' matches won ('), tx('tE', '10'), tx('tF', '%)'));
  add('hide', tx('hideA', 'Sponsor deal signed'));
  add('ph', tx('phA', 'Choose position'));
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
    const res = { phases: {}, swapsAfter: {} };
    const ph = n => { window.__phase = n; };
    const done = n => { res.phases[n] = snap(); };
    done('translated');
    /* one write, then a long look: exactly one swap for each stand in and nothing after it */
    ph('one');
    let s0 = window.__stats.swaps;
    res.one = window.__write(T.oneB, '17');
    await sleep(1500); res.swapsAfter.one1500 = window.__stats.swaps - s0;
    await sleep(4500); res.swapsAfter.one6000 = window.__stats.swaps - s0;
    done('one');
    ph('head'); res.head = window.__write(T.hC, '17'); await sleep(2500); done('head');
    ph('rmv'); res.rmv = window.__remove(T.rC); await sleep(2500); done('rmv');
    ph('insb');
    const b = document.createElement('b'); b.textContent = 'only'; nid(b);
    res.insb = window.__insertBefore(b, T.iB); await sleep(2500); done('insb');
    ph('fast');
    for (let i = 2; i <= 41; i++) { window.__write(T.fastB, String(i)); await sleep(50); }
    await sleep(4000); done('fast');
    ph('fast20');
    for (let i = 2; i <= 61; i++) { window.__write(T.f20B, String(i)); await sleep(20); }
    await sleep(4000); done('fast20');
    ph('hund');
    s0 = window.__stats.swaps;
    for (let i = 2; i <= 101; i++) { window.__write(T.hundB, String(i)); await sleep(120); }
    await sleep(4000); res.swapsAfter.hund = window.__stats.swaps - s0; done('hund');
    /* three writes to one parent in one turn, the way one React commit does it */
    ph('three');
    const f0 = window.__stats.fresh;
    window.__write(T.tA, '2'); window.__write(T.tC, '11'); window.__write(T.tE, '18');
    res.threeFresh = window.__stats.fresh - f0;
    await sleep(2500); done('three');
    ph('hide'); res.hide1 = window.__write(T.hideA, ''); await sleep(1500); done('hide-empty');
    res.hide2 = window.__write(T.hideA, 'Sponsor deal signed'); await sleep(2500); done('hide-back');
    /* the placeholder leaves and an element arrives, the create screen's shape */
    ph('ph'); res.ph = window.__remove(T.phA);
    const v = document.createElement('b'); v.textContent = 'Striker (ST)'; document.getElementById('ph').appendChild(v);
    await sleep(2500); done('ph');
    ph('after');
    const a = (T.after = document.createTextNode('One last new sentence')); nid(a);
    document.getElementById('after').appendChild(a);
    await sleep(3000); done('after');
    return res;
  };
})();
