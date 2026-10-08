/* Round 1141 FIX, measurement 5: THE SHIPPED MODULE against the real translator UNDOING ITSELF (the banner's
   own "show original" button), and then translating again. The page makes the calls React makes. */
(function () {
  window.__rec = [];
  window.__phase = 'boot';
  window.__recOn = false;
  window.__installed = window.TG.installTranslateGuard();
  const root = document.getElementById('root');
  const T = (window.__T = {});
  const tx = (key, v) => (T[key] = document.createTextNode(v));
  const add = (id, ...kids) => { const p = document.createElement('p'); p.id = id; for (const k of kids) p.appendChild(k); root.appendChild(p); return p; };
  add('age', tx('ageA', 'Age '), tx('ageB', '16'));
  add('own', tx('ownA', 'Goals this season: '), tx('ownB', '3'));
  add('twice', tx('twA', 'Followers: '), tx('twB', '10'));
  add('rm', tx('rmA', 'Striker'), tx('rmB', ' · Age '), tx('rmC', '16'));
  add('ins', tx('insA', 'You have '), tx('insB', '3'), tx('insC', ' goals this season'));
  add('again', tx('agA', 'Minute '), tx('agB', '1'));
  add('quiet', tx('qA', 'The season starts in August'));
  add('after');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const stats = () => ({ ...window.__dukbTranslateStats });
  const keyOf = n => Object.keys(T).find(k => T[k] === n) || null;
  const label = n => {
    if (!n) return null;
    if (n.nodeType === 3) { const k = keyOf(n); return (k ? 'T:' + k : 'text') + '=' + JSON.stringify(n.nodeValue) + (n.isConnected ? '' : '(off)'); }
    return n.nodeName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.isConnected ? '' : '(off)');
  };
  new MutationObserver(list => {
    if (!window.__recOn) return;
    for (const r of list) {
      if (window.__rec.length >= 120) return;
      window.__rec.push([window.__phase, r.type, label(r.target), 'added ' + [...r.addedNodes].map(label).join(','), 'removed ' + [...r.removedNodes].map(label).join(','), 'prev ' + label(r.previousSibling), 'next ' + label(r.nextSibling), r.type === 'characterData' ? 'was ' + JSON.stringify(r.oldValue) : ''].join(' | '));
    }
  }).observe(root, { childList: true, subtree: true, characterData: true, characterDataOldValue: true });
  const snap = () => {
    const out = { texts: {}, html: {}, kids: {} };
    for (const k of Object.keys(T)) { const n = T[k]; out.texts[k] = { v: n.nodeValue, connected: n.isConnected }; }
    for (const p of root.children) { out.html[p.id] = p.innerHTML; out.kids[p.id] = p.childNodes.length; }
    out.stats = stats();
    return out;
  };
  window.__snap = snap;
  const lines = () => { const o = {}; for (const p of root.children) o[p.id] = p.textContent + ' [' + p.childNodes.length + ' nodes, ' + p.querySelectorAll('font').length + ' font]'; return o; };
  const banner = kind => {
    const seen = [];
    for (const f of document.querySelectorAll('iframe')) {
      let d = null;
      try { d = f.contentDocument; } catch (e) { d = null; }
      if (!d) continue;
      for (const x of d.querySelectorAll('[id]')) if (/\.\w+$/.test(x.id)) seen.push(x.id);
      const b = d.querySelector('[id$=".' + kind + '"]');
      if (b) { b.click(); return 'pressed ' + b.id; }
    }
    return 'NOT FOUND (ids seen: ' + seen.slice(0, 12).join(' ') + ')';
  };
  window.__run = async () => {
    const res = { phases: {}, installed: window.__installed, lines: {}, stats: {} };
    const ph = n => { window.__phase = n; };
    const done = n => { res.phases[n] = snap(); res.lines[n] = lines(); res.stats[n] = stats(); };
    const el = id => document.getElementById(id);
    done('translated');
    /* strings layer two refreshes before the undo: their copies are wrappers the translator made for STAND INS */
    ph('pre');
    T.ageB.nodeValue = '17'; T.twB.nodeValue = '11'; T.rmC.nodeValue = '17'; T.insB.nodeValue = '4'; T.agB.nodeValue = '2';
    await sleep(2500);
    T.twB.nodeValue = '12';
    await sleep(3000);
    done('pre');
    /* THE UNDO */
    ph('restore');
    window.__recOn = true;
    res.restoreHow = banner('restore');
    await sleep(3000);
    window.__recOn = false;
    res.fontsAfterRestore = root.querySelectorAll('font').length;
    res.lang = document.documentElement.lang + ' / ' + document.documentElement.className;
    done('restore');
    /* React moves on, on the page in its first language */
    ph('post');
    T.ageB.nodeValue = '18'; T.ownB.nodeValue = '4'; T.twB.nodeValue = '13';
    el('rm').removeChild(T.rmC);
    { const b = document.createElement('b'); b.textContent = 'only '; el('ins').insertBefore(b, T.insB); }
    await sleep(1500);
    done('post');
    /* translate again */
    ph('again');
    const recAt = window.__rec.length;
    window.__recOn = true;
    res.againHow = banner('confirm');
    await sleep(5000);
    window.__recOn = false;
    res.againRecords = window.__rec.length - recAt;
    res.fontsAfterAgain = root.querySelectorAll('font').length;
    done('again');
    ph('post2');
    T.ageB.nodeValue = '19'; T.agB.nodeValue = '3'; T.ownB.nodeValue = '5';
    await sleep(3000);
    done('post2');
    /* a second undo, and React moves on again */
    ph('restore2');
    res.restore2How = banner('restore');
    await sleep(3000);
    res.fontsAfterRestore2 = root.querySelectorAll('font').length;
    done('restore2');
    ph('after');
    T.ageB.nodeValue = '20'; T.ownB.nodeValue = '6'; T.agB.nodeValue = '4'; T.twB.nodeValue = '14';
    await sleep(1500);
    done('after');
    res.records = window.__rec.slice(0, 60);
    return res;
  };
})();
