/* Round 1141 FIX, measurement 6: THE SHIPPED MODULE against the real translator, two questions.
   A. Strings React rewrote in place BEFORE the page was first translated (rule four hands them back the
      moment the translator takes them): do they end up translated, or left in the first language?
   B. Lines that tick once a second: what share of the time do they read translated? */
(function () {
  window.__rec = [];
  window.__phase = 'boot';
  window.__installed = window.TG.installTranslateGuard();
  const root = document.getElementById('root');
  const T = (window.__T = {});
  const tx = (key, v) => (T[key] = document.createTextNode(v));
  const add = (id, ...kids) => { const p = document.createElement('p'); p.id = id; for (const k of kids) p.appendChild(k); root.appendChild(p); return p; };
  add('pre1', tx('p1A', 'Balance: '), tx('p1B', '100'));
  add('pre2', tx('p2A', 'Your club has won '), tx('p2B', '1'), tx('p2C', ' trophies this decade'));
  add('pre3', tx('p3A', 'Welcome to the training ground'));
  add('never', tx('nA', 'The window closes in August'));
  add('tick1', tx('t1A', 'next find in ~'), tx('t1B', '20'), tx('t1C', 's'));
  const LABELS = ['Money in the bank: ', 'Fans in the ground: ', 'Tickets sold today: ', 'Shirts sold today: ', 'Beds in the hotel: ', 'Staff on the payroll: ', 'Seats in the stand: ', 'Pies sold today: '];
  LABELS.forEach((l, i) => add('m' + i, tx('m' + i + 'A', l), tx('m' + i + 'B', '1')));
  add('after');
  /* React rewrites these in place before any translator exists */
  T.p1B.nodeValue = '200';
  for (let i = 2; i <= 21; i++) T.p2B.nodeValue = String(i);
  T.p3A.nodeValue = 'Welcome back to the training ground';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const stats = () => ({ ...window.__dukbTranslateStats });
  const el = id => document.getElementById(id);
  const state = p => {
    const fonts = p.querySelectorAll('font').length;
    const bare = [...p.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim());
    return bare ? (fonts ? 'mixed' : 'en') : (fonts ? 'pt' : 'empty');
  };
  const lines = () => { const o = {}; for (const p of root.children) o[p.id] = state(p) + ': ' + p.textContent; return o; };
  const snap = () => ({ lines: lines(), stats: stats() });
  window.__snap = snap;
  const requests = () => performance.getEntriesByType('resource').filter(e => /translate/.test(e.name)).length;
  window.__run = async () => {
    const res = { phases: {}, installed: window.__installed, lines: {}, stats: {}, share: {} };
    const ph = n => { window.__phase = n; };
    const done = n => { res.lines[n] = lines(); res.stats[n] = stats(); res.phases[n] = snap(); };
    done('translated');
    await sleep(5000);
    done('translated+5s');
    /* A again, in the translator's incremental mode: a new line, rewritten on the page, then left alone */
    ph('later');
    el('after').appendChild((T.aA = document.createTextNode('Kick off is at ')));
    el('after').appendChild((T.aB = document.createTextNode('3')));
    await sleep(3000);
    done('later');
    /* B1: one line ticks once a second, 12 times */
    const watch = async (ids, ticks, write) => {
      const count = {};
      for (const id of ids) count[id] = { pt: 0, en: 0, mixed: 0, empty: 0 };
      const t = setInterval(() => { for (const id of ids) count[id][state(el(id))] += 1; }, 100);
      const r0 = requests();
      const s0 = stats();
      for (let i = 1; i <= ticks; i++) { write(i); await sleep(1000); }
      clearInterval(t);
      const s1 = stats();
      return { count, requests: requests() - r0, restored: s1.restored - s0.restored, swaps: s1.swaps - s0.swaps };
    };
    ph('tick1');
    res.share.one = await watch(['tick1'], 12, i => { T.t1B.nodeValue = String(20 - i); });
    await sleep(4000);
    done('tick1-rest');
    /* B2: eight lines tick together once a second, 12 times */
    ph('tick8');
    res.share.eight = await watch(LABELS.map((l, i) => 'm' + i), 12, i => { for (let k = 0; k < 8; k++) T['m' + k + 'B'].nodeValue = String(i * (k + 2)); });
    await sleep(4000);
    done('after');
    return res;
  };
})();
