/* Round 1141, measurement 4: THE SHIPPED MODULE (src/lib/translateGuard.ts, bundled into window.TG by the
   request) against the real translator. The page makes the calls React makes, through the patched prototype. */
(function () {
  window.__rec = [];
  window.__phase = 'boot';
  window.__installed = window.TG.installTranslateGuard();
  const root = document.getElementById('root');
  const T = (window.__T = {});
  const tx = (key, v) => (T[key] = document.createTextNode(v));
  const add = (id, ...kids) => { const p = document.createElement('p'); p.id = id; for (const k of kids) p.appendChild(k); root.appendChild(p); return p; };
  add('age', tx('ageA', 'Age '), tx('ageB', '16'));
  add('head', tx('hA', 'Striker'), tx('hB', ' · Age '), tx('hC', '16'), tx('hD', ' · '), tx('hE', 'England'));
  add('rmv', tx('rA', 'Striker'), tx('rB', ' · Age '), tx('rC', '16'), tx('rD', ' · '), tx('rE', 'England'));
  add('insb', tx('iA', 'You have '), tx('iB', '3'), tx('iC', ' goals this season'));
  add('tick', tx('tickA', 'Minute '), tx('tickB', '1'));
  add('hund', tx('hundA', 'Followers: '), tx('hundB', '1'));
  add('bank', tx('bankA', '-$100k'));
  add('ph', tx('phA', 'Choose position'));
  add('fresh');
  add('roll');
  add('after');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const stats = () => ({ ...window.__dukbTranslateStats });
  const snap = () => {
    const out = { texts: {}, html: {}, kids: {} };
    for (const k of Object.keys(T)) { const n = T[k]; out.texts[k] = { id: 0, v: n.nodeValue, connected: n.isConnected, parent: n.parentNode ? n.parentNode.nodeName.toLowerCase() : null }; }
    for (const p of root.children) { out.html[p.id] = p.innerHTML; out.kids[p.id] = p.childNodes.length; }
    out.stats = stats();
    return out;
  };
  window.__snap = snap;
  /* what React does to an element whose only child is a string */
  const setText = (el, text) => { const f = el.firstChild; if (f && f === el.lastChild && f.nodeType === 3) f.nodeValue = text; else el.textContent = text; };
  window.__run = async () => {
    const res = { phases: {}, installed: window.__installed, swapsAfter: {} };
    const ph = n => { window.__phase = n; };
    const done = n => { res.phases[n] = snap(); };
    const el = id => document.getElementById(id);
    done('translated');
    ph('age');
    let s0 = stats().swaps;
    T.ageB.nodeValue = '17';
    await sleep(1500); res.swapsAfter.age1500 = stats().swaps - s0;
    await sleep(4500); res.swapsAfter.age6000 = stats().swaps - s0;
    done('age');
    ph('head'); T.hC.nodeValue = '17'; await sleep(2500); done('head');
    ph('rmv'); el('rmv').removeChild(T.rC); await sleep(2500); done('rmv');
    ph('insb'); { const b = document.createElement('b'); b.textContent = 'only'; el('insb').insertBefore(b, T.iB); } await sleep(2500); done('insb');
    ph('tick'); for (let i = 2; i <= 41; i++) { T.tickB.nodeValue = String(i); await sleep(50); } await sleep(4000); done('tick');
    ph('hund'); for (let i = 2; i <= 101; i++) { T.hundB.nodeValue = String(i); await sleep(120); } await sleep(4000); done('hund');
    /* The Bank: a sign arrives in front of the figure and the figure changes, in one turn */
    ph('bank'); el('bank').insertBefore(document.createTextNode('+'), T.bankA); T.bankA.nodeValue = '$50k'; await sleep(2500); done('bank');
    ph('ph'); el('ph').removeChild(T.phA); { const v = document.createElement('b'); v.textContent = 'Striker (ST)'; el('ph').appendChild(v); } await sleep(2500); done('ph');
    /* rule four: a brand new string rewritten 5 ms after it appears */
    ph('fresh'); { const f = (T.fresh = document.createTextNode('First words here')); el('fresh').appendChild(f); await sleep(5); f.nodeValue = 'Second words here'; } await sleep(4000); done('fresh');
    /* rule four: a roll, the element's only child rewritten every 60 ms, then it stops */
    ph('roll'); setText(el('roll'), '50'); for (let i = 51; i <= 90; i++) { await sleep(60); setText(el('roll'), String(i)); } await sleep(4000); done('roll');
    ph('after'); el('after').appendChild((T.after = document.createTextNode('One last new sentence'))); await sleep(3000); done('after');
    return res;
  };
})();
