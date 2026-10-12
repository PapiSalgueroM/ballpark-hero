/* Reviewer probe (saves-dailies, Release AZ). Never committed. Run from the repo root on a runner:
 *   RV_PART=dd|hot|deep|fuzz|long node .rc/x/rvSaves.mjs
 * Compares this tree with the first parent of merge e (b6eb78e7), same bytes in, same random stream. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = 'b6eb78e799b12c851e4e8e583e9e926aed117f1c';
const PART = process.env.RV_PART || 'dd';
const OUT = process.env.RC_OUT || '/tmp';
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);
const lf = s => s.split('\r\n').join('\n');
const fails = [];
const notes = {};
const note = k => { notes[k] = (notes[k] ?? 0) + 1; };
const fail = m => { fails.push(m.slice(0, 700)); console.log(`FAIL ${m.slice(0, 700)}`); };

async function engine(label, base, edit = null) {
  let edited = false;
  const plugin = { name: 'rv', setup(b) {
    b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      if (!rel.startsWith('src/')) return null;
      let text = base ? lf(execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }))
        : lf(fs.readFileSync(args.path, 'utf8'));
      if (edit && rel === 'src/lib/clubManager.ts') { text = edit(text); edited = true; }
      return { contents: text, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
    });
  } };
  let entry = "export * as cm from './src/lib/clubManager';\nexport * as cal from './src/lib/clubManagerCalendar';\nexport * as eras from './src/lib/clubManagerEras';\nexport * as hs from './src/lib/managerHotSeat';\nexport * as dd from './src/lib/deadlineDay';\n";
  if (!base) entry += "export * as ledger from './src/lib/clubManagerWorldRoster';\nexport * as keeper from './src/lib/saveKeeper';\nexport * as broken from './src/lib/brokenSaveRecovery';\nexport * as cont from './src/data/continueSaves';\n";
  const out = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: `rv-${label}.ts`, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent',
    alias: { '@': path.join(ROOT, 'src') } });
  if (edit && !edited) throw new Error(`${label}: the edit never met the engine`);
  const script = new vm.Script(out.outputFiles[0].text, { filename: `rv-${label}.cjs` });
  return { label, async fresh() {
    const module = { exports: {} }; const store = new Map(); const NOW = 1791633600000;
    class HeldDate extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
    const storage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k),
      clear: () => store.clear(), key: i => [...store.keys()][i] ?? null, get length() { return store.size; } };
    const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')),
      console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone,
      setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('no network here')), localStorage: storage });
    script.runInContext(ctx);
    await module.exports.eras.ensureAllEraRosters();
    return { ...module.exports, store, storage };
  } };
}

function tape(seed, action, forced) {
  let state = seed >>> 0; const draws = []; const original = Math.random;
  Math.random = () => {
    if (forced !== undefined) { draws.push(forced); return forced; }
    state = (state + 0x6d2b79f5) >>> 0; let v = state;
    v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61);
    const d = ((v ^ v >>> 14) >>> 0) / 4294967296; draws.push(d); return d;
  };
  try { return { value: action(), draws }; } finally { Math.random = original; }
}
function firstDiff(a, b) {
  if (a === b) return '';
  let A, B; try { A = JSON.parse(a); B = JSON.parse(b); } catch { let i = 0; while (a[i] === b[i]) i++; return `at char ${i}: base ...${a.slice(Math.max(0, i - 50), i + 50)}... tree ...${b.slice(Math.max(0, i - 50), i + 50)}...`; }
  if (!A || !B || typeof A !== 'object') return `base ${String(a).slice(0, 80)} tree ${String(b).slice(0, 80)}`;
  for (const key of [...new Set([...Object.keys(A), ...Object.keys(B)])]) {
    const x = JSON.stringify(A[key]) ?? 'absent', y = JSON.stringify(B[key]) ?? 'absent';
    if (x === y) continue;
    let i = 0; while (i < x.length && x[i] === y[i]) i += 1;
    return `${key}: base ...${x.slice(Math.max(0, i - 50), i + 50)}... tree ...${y.slice(Math.max(0, i - 50), i + 50)}...`;
  }
  return 'key order differs';
}
const seededJson = j => /"worldRoster":|"worldSeed":/.test(j);
const seededState = st => !!st && typeof st === 'object' && ('worldSeed' in st || 'worldRoster' in st);
const ERAS = ['now', 'era2020', 'era2015', 'era2010', 'era2005'];
const OPT = { skipHalftime: true, noCoach: true };
const B = await engine('base', true);
const T = await engine('tree', false);
const t0 = Date.now();

/* One plan on both engines, the same tape for each step, every step compared: the whole state, the draws, the
   bytes a save writes. c.done(label) counts coverage on the tree run only. */
async function pair(name, plan) {
  const runs = [];
  for (const E of [B, T]) {
    const M = await E.fresh();
    const steps = []; let s = null; let k = 0;
    const c = {
      M, get s() { return s; },
      done(label) { if (E === T) note(label); },
      step(label, fn, forced) {
        k += 1;
        const r = tape((0x5eed + k * 7919) >>> 0, () => fn(s), forced);
        if (r.value) s = r.value;
        steps.push({ label, json: JSON.stringify(s), n: r.draws.length, d: sha(r.draws), ok: !!r.value });
        return !!r.value;
      },
      reload() {
        M.store.clear();
        const ok = M.cm.saveCareer(s);
        const raw = M.store.get(M.cm.SAVE_KEY) ?? '';
        const loaded = M.cm.loadCareer();
        if (loaded) s = loaded;
        steps.push({ label: 'save and reload', json: JSON.stringify(s), n: 0, d: '', raw: sha(raw), ok: ok && !!loaded });
      },
      sure(label, fn) { k += 1; const r = tape((0x7a11 + k * 104729) >>> 0, fn); steps.push({ label, json: JSON.stringify(r.value ?? null), n: r.draws.length, d: sha(r.draws), ok: true }); return r.value; },
    };
    try { await plan(c); } catch (e) { steps.push({ label: 'threw', json: String(e?.stack ?? e).slice(0, 400), n: 0, d: '' }); }
    runs.push({ steps, s });
  }
  const [b, t] = runs;
  let bad = '';
  for (let i = 0; i < Math.max(b.steps.length, t.steps.length) && !bad; i += 1) {
    const x = b.steps[i], y = t.steps[i];
    if (!x || !y) bad = `step ${i + 1}: base ${x?.label ?? 'none'}, tree ${y?.label ?? 'none'}`;
    else if (x.label !== y.label) bad = `step ${i + 1}: base ${x.label}, tree ${y.label}`;
    else if (x.json !== y.json) bad = `step ${i + 1} ${x.label}: ${firstDiff(x.json, y.json)}`;
    else if (x.n !== y.n || x.d !== y.d) bad = `step ${i + 1} ${x.label}: draws base ${x.n} tree ${y.n}`;
    else if ((x.raw ?? '') !== (y.raw ?? '')) bad = `step ${i + 1} ${x.label}: the saved bytes differ`;
  }
  const threw = t.steps.find(x => x.label === 'threw');
  if (!bad && threw) bad = `both threw: ${threw.json.slice(0, 200)}`;
  if (!bad && seededState(t.s)) bad = 'the tree state carries a worldSeed or a worldRoster';
  console.log(`${bad ? 'RED ' : 'ok  '} ${name}: ${t.steps.length} steps${bad ? `: ${bad}` : ''}`);
  if (bad) fail(`${name}: ${bad}`);
  return t.steps.length;
}

const play = (c, n, label) => { for (let i = 0; i < n; i += 1) c.step(`${label} ${i + 1}`, cur => c.M.cm.playNextEntry(cur, OPT).state); };
function toEnd(c, label) {
  for (let i = 0; i < 260; i += 1) {
    let over = false;
    c.step(`${label} ${i + 1}`, cur => { const r = c.M.cm.playNextEntry(cur, OPT); over = r.kind === 'seasonOver'; return r.state; });
    if (over) return true;
  }
  return false;
}
function toWindow(c, want, label) {
  for (let i = 0; i < 200 && c.s.transferWindow !== want; i += 1) {
    let over = false;
    c.step(`${label} ${i + 1}`, cur => { const r = c.M.cm.playNextEntry(cur, OPT); over = r.kind === 'seasonOver'; return r.state; });
    if (over) return false;
  }
  return c.s.transferWindow === want;
}
/* Every deal the recorder sees, plus a free agent, each followed by a save and a reload. */
function deals(c, tag) {
  const M = c.M;
  const mine = () => new Set(c.s.squad.map(p => p.name));
  const outfield = () => c.s.squad.filter(p => !p.onLoan && p.position !== 'GK');
  c.step(`${tag} money`, cur => ({ ...cur, budget: Math.max(cur.budget, 400), wageCap: 9999 }));
  if (c.step(`${tag} buy`, cur => { const have = mine(); const mp = M.cm.buildMarket(cur).find(p => p.position !== 'GK' && p.age < 29 && p.rating < 82 && !have.has(p.name)); return mp ? M.cm.buyPlayer(cur, mp) : null; })) c.done(`${tag} buy`);
  c.reload();
  if (c.step(`${tag} sale`, cur => {
    const man = [...outfield()].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))[2];
    const buyer = M.cm.buildMarket(cur).find(p => p.club !== cur.clubName)?.club;
    if (!man || !buyer) return null;
    return M.cm.acceptBid({ ...cur, incomingBids: [...(cur.incomingBids ?? []), { playerId: man.id, playerName: man.name, club: buyer, offer: 25, status: 'open' }] }, man.id);
  })) c.done(`${tag} sale`);
  c.reload();
  if (c.step(`${tag} release`, cur => { const man = [...outfield()].sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id))[0]; return man ? M.cm.releasePlayer(cur, man.id) : null; })) c.done(`${tag} release`);
  c.reload();
  if (c.step(`${tag} free agent`, cur => { const fa = (cur.freeAgents ?? []).find(f => M.cm.freeAgentInterest(cur, f) && !M.cm.freeAgentBlock(cur, f)); return fa ? M.cm.signFreeAgent(cur, fa.name) : null; })) c.done(`${tag} free agent`);
  c.reload();
  if (c.step(`${tag} loan`, cur => {
    const have = mine();
    const mp = M.cm.buildMarket(cur).find(p => p.age <= 23 && p.rating <= 84 && p.position !== 'GK' && !have.has(p.name));
    const loaned = mp && M.cm.loanIn(cur, mp);
    const man = loaned && loaned.squad.find(p => p.name === mp.name && p.onLoan);
    const bought = man && M.cm.exerciseLoanOption(loaned, man.id);
    if (bought) c.done(`${tag} loan option`);
    return bought || loaned || null;
  })) c.done(`${tag} loan`);
  c.reload();
}

/* An old save as a player would hold it: started and played two seasons on the base engine, saved at the third
   season's start. */
async function oldSave(era, club, seed) {
  const M = await B.fresh();
  let s = tape(seed, () => M.cm.startCareer(club, era)).value;
  for (let season = 0; season < 2; season += 1) {
    for (let i = 0; i < 260; i += 1) {
      if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
      const r = tape(seed + season * 1000 + i, () => M.cm.playNextEntry(s, OPT)).value;
      s = r.state;
      if (r.kind === 'seasonOver' || s.sacked) break;
    }
    if (s.sacked) return null;
    s = tape(seed + 77 + season, () => M.cm.finishSeason(s)).value.state;
    s = tape(seed + 99 + season, () => M.cm.startNextSeason(s)).value;
  }
  M.store.clear();
  M.cm.saveCareer(s);
  return M.store.get(M.cm.SAVE_KEY);
}

async function partDeep() {
  const M0 = await B.fresh();
  for (const era of ERAS) {
    const leagues = era === 'now' ? M0.cm.REAL_LEAGUES : M0.cm.ERA_LEAGUES[era];
    const all = [...new Set(leagues.flatMap(l => l.clubs))];
    const size = x => M0.eras.projectedRoster(x, 0, era).length;
    const thin = [...all].sort((x, y) => size(x) - size(y) || x.localeCompare(y))[0];
    for (const club of [leagues[0].clubs[2], leagues[2]?.clubs[4] ?? leagues[1].clubs[4], thin]) {
      const raw = await oldSave(era, club, 0x0de9 + club.length * 31);
      if (!raw) { console.log(`skip ${club} (${era}): sacked while the base played the old save`); note('old save sacked'); continue; }
      if (seededJson(raw)) fail(`${club} (${era}): the base's old save already carries a seed`);
      await pair(`deep ${club} (${era}) season 3`, async c => {
        c.step('load', () => { c.M.store.clear(); c.M.store.set(c.M.cm.SAVE_KEY, raw); return c.M.cm.loadCareer(); });
        if (!c.s) throw new Error('the old save did not load');
        const first = c.s.clubName;
        deals(c, 'summer');
        play(c, 4, 'early');
        if (toWindow(c, 'january', 'to january')) { c.done('january reached'); deals(c, 'january'); }
        play(c, 3, 'after january');
        const targets = c.sure('apply targets', () => c.M.cm.applyTargets(c.s)) ?? [];
        const target = targets.find(x => x.club !== c.s.clubName)?.club;
        if (target && c.step('apply', cur => c.M.cm.applyForJob(cur, target), 0)) {
          c.done('applied');
          for (let n = 0; n < 20 && c.s.jobHunt?.open?.status === 'pending'; n += 1) c.step(`application ${n + 1}`, cur => c.M.cm.playNextEntry(cur, OPT).state, 0.6);
          if (c.s.jobHunt?.open?.status === 'accepted' && c.step('join now', cur => c.M.cal.joinClubNow(cur), 0.6)) c.done('job move in season');
        }
        c.reload();
        toEnd(c, 'season');
        c.step('finish', cur => c.M.cm.finishSeason(cur).state);
        c.reload();
        if (c.step('summer move back', cur => c.M.cm.startNextSeason(cur, first)) && c.s.clubName === first) c.done('summer move back');
        c.reload();
        deals(c, 'next summer');
        play(c, 6, 'next season');
        c.reload();
      });
    }
  }
}

/* A Hot Seat day played whole on both engines, handed over the way the page does it, then a season in Club
   Manager from the handed over save: the January window's deals, the season out, the rollover, a summer of deals. */
const HOTD = ['2026-10-10', '2026-10-12', '2026-10-27', '2026-11-14', '2027-01-19', '2027-01-30', '2027-03-02'];
async function partHot() {
  for (const date of HOTD) {
    const days = [];
    for (const E of [B, T]) {
      const M = await E.fresh();
      const r = tape(0x4807, () => {
        const setup = M.hs.dailyHotSeat(date);
        let run = M.hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date });
        for (let g = 0; !run.verdict && g < 60; g += 1) run = M.hs.pendingPress(run) ? M.hs.answerHotSeatPress(run, 0) : M.hs.playHotSeatMatch(run, 'balanced', null);
        return run;
      });
      const run = r.value;
      M.store.clear();
      const res = M.hs.carryOnInClubManager(run, { replace: true });
      if (res !== 'saved') M.cm.saveCareer(M.hs.handoverState(run));
      days.push({ run: JSON.stringify(run), n: r.draws.length, d: sha(r.draws), raw: M.store.get(M.cm.SAVE_KEY) ?? '', share: M.hs.shareText(run), res, club: run.state.clubName });
    }
    const [b, t] = days;
    const why = [];
    if (b.run !== t.run) why.push(`the day's run differs: ${firstDiff(b.run, t.run)}`);
    if (b.n !== t.n || b.d !== t.d) why.push(`the day's draws differ: base ${b.n} tree ${t.n}`);
    if (b.share !== t.share) why.push('the share text differs');
    if (b.raw !== t.raw) why.push(`the handed over save differs: ${firstDiff(b.raw, t.raw)}`);
    if (seededJson(t.raw) || seededJson(t.run)) why.push('the tree day or its handover carries a worldSeed or a worldRoster');
    console.log(`${why.length ? 'RED ' : 'ok  '} hot ${date} (${t.club}, carry on ${t.res}): run ${t.run.length} units, handover ${t.raw.length} units${why.length ? `: ${why.join('; ')}` : ''}`);
    if (why.length) { fail(`hot ${date}: ${why.join('; ')}`); continue; }
    note(`hot carry on ${t.res}`);
    await pair(`hot ${date} handed over (${t.club}), a season on`, async c => {
      c.step('load', () => { c.M.store.clear(); c.M.store.set(c.M.cm.SAVE_KEY, t.raw); return c.M.cm.loadCareer(); });
      if (!c.s) throw new Error('the handover did not load');
      play(c, 3, 'carried on');
      c.reload();
      if (toWindow(c, 'january', 'to january')) { c.done('hot january reached'); deals(c, 'hot january'); }
      toEnd(c, 'season');
      c.step('finish', cur => c.M.cm.finishSeason(cur).state);
      c.reload();
      c.step('rollover', cur => c.M.cm.startNextSeason(cur));
      c.reload();
      deals(c, 'hot summer');
      play(c, 8, 'second season');
      c.reload();
    });
  }
}

/* Deadline Day: a fuller scripted day (a low bid, the ask, low terms then the wanted terms, a walk away, two
   sales) on both engines, the whole run compared after every action, the daily record the page writes and the
   share text; then the base's actions replayed on the tree at every cut (a day in flight, opened on the new build)
   and in full (a date already played). Daily dates and three free play seeds. */
const DDD = ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-18', '2026-11-01', '2026-11-09', '2027-01-31'];
function scriptDay(M, setup) {
  let run = M.dd.startDeadlineDay(setup);
  const snaps = [JSON.stringify(run)];
  const act = next => { if (next && next !== run) { run = next; snaps.push(JSON.stringify(run)); return true; } return false; };
  let signed = 0;
  for (let i = 0; i < run.targets.length && signed < 2; i += 1) {
    if (!act(M.dd.openTalks(run, i))) continue;
    const ask0 = run.targets[i].neg?.theirAsk;
    if (ask0 > 0) act(M.dd.placeBid(run, i, Math.round(ask0 * 7) / 10));
    for (let k = 0; k < 4 && run.targets[i].status === 'talks'; k += 1) {
      const ask = run.targets[i].neg?.theirAsk;
      if (!(ask > 0) || ask > run.state.budget || !act(M.dd.placeBid(run, i, ask))) break;
    }
    for (let k = 0; k < 3 && run.targets[i].status === 'terms'; k += 1) {
      const w = run.targets[i].neg.terms.want;
      act(M.dd.offerPersonalTerms(run, i, { wage: Math.round(w.wage * 0.8), years: w.years, bonus: w.bonus }));
      if (run.targets[i].status === 'terms' && !act(M.dd.offerPersonalTerms(run, i, { wage: w.wage, years: w.years, bonus: w.bonus }))) break;
    }
    if (run.targets[i].status === 'signed') signed += 1;
    else act(M.dd.walkFrom(run, i));
  }
  for (let k = 0; k < run.sales.length && k < 2; k += 1) act(M.dd.sellPlayer(run, k));
  act(M.dd.endDay(run));
  return { run, snaps, signed };
}
async function partDd() {
  const M0 = await B.fresh();
  const pool = M0.hs.hotSeatPool();
  const setups = [...DDD.map(date => ({ date })), ...[0x1234567, 0x89abcdef, 0x2468ace].map((seed, i) => ({ free: { club: pool[(i * 7) % pool.length].club, seed } }))];
  for (const one of setups) {
    const out = [];
    for (const E of [B, T]) {
      const M = await E.fresh();
      const setup = one.date ? M.dd.dailyDeadlineDay(one.date) : one.free;
      const r = tape(0xdd, () => scriptDay(M, setup));
      const { run, snaps, signed } = r.value;
      const record = JSON.stringify({ club: run.setup.club, actions: run.actions, done: !!run.grade, grade: run.grade ?? null });
      out.push({ M, setup, run, snaps, signed, n: r.draws.length, d: sha(r.draws), record, share: M.dd.shareText(run) });
    }
    const [b, t] = out;
    const name = one.date ? `deadline ${one.date}` : `deadline free ${one.free.club} ${one.free.seed}`;
    const why = [];
    for (let i = 0; i < Math.max(b.snaps.length, t.snaps.length) && !why.length; i += 1) {
      if (b.snaps[i] !== t.snaps[i]) why.push(`action ${i}: ${b.snaps[i] && t.snaps[i] ? firstDiff(b.snaps[i], t.snaps[i]) : 'one side has no such action'}`);
    }
    if (b.n !== t.n || b.d !== t.d) why.push(`draws base ${b.n} tree ${t.n}`);
    if (b.record !== t.record) why.push('the daily record differs');
    if (b.share !== t.share) why.push('the share text differs');
    if (t.snaps.some(seededJson)) why.push('a tree run carries a worldSeed or a worldRoster');
    let cuts = 0;
    for (let k = 0; k <= b.run.actions.length && !why.length; k += 1) {
      const cut = b.run.actions.slice(0, k);
      const rb = tape(0xdd1, () => b.M.dd.replayDeadlineDay(b.setup, cut)).value;
      const rt = tape(0xdd1, () => t.M.dd.replayDeadlineDay(t.setup, cut)).value;
      if (rt.actions.length !== k) why.push(`the replay of ${k} base actions stopped at ${rt.actions.length}`);
      else if (JSON.stringify(rb) !== JSON.stringify(rt)) why.push(`the replay of ${k} actions differs: ${firstDiff(JSON.stringify(rb), JSON.stringify(rt))}`);
      else if (k === b.run.actions.length && JSON.stringify(rt) !== b.snaps[b.snaps.length - 1]) why.push('the full replay is not the day as played on the base');
      cuts += 1;
    }
    console.log(`${why.length ? 'RED ' : 'ok  '} ${name} (${t.setup.club}): ${t.snaps.length - 1} actions, signed ${t.signed}, sold ${t.run.sales.filter(x => x.status === 'sold' || x.sold).length}, grade ${t.run.grade?.letter ?? 'none'}, ${cuts} cuts replayed, record ${t.record.length} units${why.length ? `: ${why.join('; ')}` : ''}`);
    if (why.length) fail(`${name}: ${why.join('; ')}`);
    else { note('deadline days equal'); if (t.signed) note('deadline days with a signing'); }
  }
}

/* A packed ledger damaged in storage (cut, a character changed) must read as absent or as itself, never throw,
   never read as another ledger; the save must still load and play, and the next deal of a fresh man writes a
   fresh ledger. Then the keeper: a copy set aside and put back carries the string unchanged. */
async function partFuzz() {
  const M = await T.fresh();
  let s = tape(11, () => M.cm.startCareer('Everton', 'now')).value;
  s = { ...s, budget: 9999, wageCap: 9999, transferWindow: 'summer' };
  for (let i = 0; i < 3; i += 1) {
    const have = new Set(s.squad.map(p => p.name));
    const mp = tape(20 + i, () => M.cm.buildMarket(s)).value.filter(p => p.position !== 'GK' && !have.has(p.name))[i * 3];
    s = tape(30 + i, () => M.cm.buyPlayer(s, mp)).value ?? s;
  }
  const weakest = [...s.squad].filter(p => !p.onLoan).sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id));
  for (const man of weakest.slice(0, 2)) s = tape(40, () => M.cm.releasePlayer(s, man.id)).value ?? s;
  const good = M.ledger.readWorldRoster(s);
  const packed = s.worldRoster?.packedRecords;
  if (!good || typeof packed !== 'string') { fail(`fuzz: no packed ledger to damage (records ${good?.records?.length ?? 'none'}, packed ${typeof packed})`); return; }
  M.store.clear(); M.cm.saveCareer(s);
  const raw = M.store.get(M.cm.SAVE_KEY);
  const lo = Math.min(...[...packed].map(ch => ch.charCodeAt(0))), hi = Math.max(...[...packed].map(ch => ch.charCodeAt(0)));
  console.log(`fuzz: ledger ${good.records.length} records, packed ${packed.length} units ${Buffer.byteLength(packed, 'utf8')} UTF-8 bytes (code units ${lo} to ${hi}); save ${raw.length} units ${Buffer.byteLength(raw, 'utf8')} bytes`);
  const variants = [];
  for (let i = 1; i <= 40; i += 1) variants.push([`cut at ${Math.floor(packed.length * i / 41)}`, packed.slice(0, Math.floor(packed.length * i / 41))]);
  for (let i = 0; i < 40; i += 1) {
    const p = Math.floor(packed.length * (i + 0.5) / 40);
    const ch = String.fromCharCode(((packed.charCodeAt(p) - 32 + 4099) % 32768) + 32);
    variants.push([`char ${p} changed`, packed.slice(0, p) + ch + packed.slice(p + 1)]);
  }
  variants.push(['doubled', packed + packed], ['a lone surrogate appended', packed + String.fromCharCode(0xd800)]);
  for (const [label, text] of variants) {
    const st = { ...s, worldRoster: { ...s.worldRoster, packedRecords: text } };
    let read;
    try { read = M.ledger.readWorldRoster(st); } catch (e) { fail(`fuzz ${label}: readWorldRoster threw ${e}`); continue; }
    if (read && JSON.stringify(read.records) !== JSON.stringify(good.records)) { fail(`fuzz ${label}: the damaged string read as ANOTHER ledger (${read.records.length} records)`); note('fuzz read as another ledger'); continue; }
    note(read ? 'fuzz read as itself' : 'fuzz read as absent');
    try {
      M.store.clear();
      if (!M.cm.saveCareer(st)) throw new Error('the save was refused');
      let l = M.cm.loadCareer();
      if (!l) throw new Error('the reload was refused');
      if (JSON.stringify(l.worldRoster) !== JSON.stringify(st.worldRoster)) throw new Error('the reload changed the damaged ledger');
      tape(50, () => M.cm.buildMarket(l));
      for (let k = 0; k < 2; k += 1) l = tape(60 + k, () => M.cm.playNextEntry(l, OPT)).value.state;
      if (!read) {
        const have = new Set(l.squad.map(p => p.name));
        const mp = tape(70, () => M.cm.buildMarket(l)).value.find(p => p.position !== 'GK' && !have.has(p.name) && p.rating < 80);
        const after = mp && tape(71, () => M.cm.buyPlayer({ ...l, budget: 9999, wageCap: 9999, transferWindow: 'summer' }, mp)).value;
        const fresh = after && M.ledger.readWorldRoster(after);
        note(fresh ? `fuzz next buy wrote a fresh ledger (${fresh.records.length})` : 'fuzz next buy wrote NO readable ledger');
      }
    } catch (e) { fail(`fuzz ${label}: ${String(e?.message ?? e).slice(0, 200)}`); }
  }
  /* The keeper: set aside, staged, put back over another save, applied the way main.tsx does before React. */
  const entry = M.cont.CONTINUE_SAVES.find(x => x.path === '/club-manager');
  M.store.clear(); M.store.set(M.cm.SAVE_KEY, raw);
  const aside = M.broken.copyAside(entry, M.storage);
  const backup = aside.backupKey && M.store.get(aside.backupKey);
  M.store.set(M.cm.SAVE_KEY, JSON.stringify({ ...JSON.parse(raw), clubName: 'Liverpool' }));
  const staged = M.keeper.stageRestore(entry, aside.backupKey, M.storage);
  const journal = M.store.get(M.keeper.PENDING_RESTORE_KEY);
  const applied = M.keeper.applyPending(M.storage);
  const back = M.store.get(M.cm.SAVE_KEY);
  const reread = M.cm.loadCareer();
  const same = back === raw && backup === raw && reread && JSON.stringify(M.ledger.readWorldRoster(reread)?.records) === JSON.stringify(good.records);
  console.log(`keeper: copy aside ${aside.ok} (${backup === raw ? 'byte equal' : 'NOT byte equal'}), staged ${staged.ok}, journal ${journal}, applied ${JSON.stringify(applied)?.slice(0, 120)}, key now ${back === raw ? 'byte equal to the seeded save' : 'NOT the seeded save'}, ledger ${same ? 'reads as itself' : 'DIFFERS'}`);
  if (!same) fail('keeper: the put back did not carry the packed ledger unchanged');
}

/* How the save grows past the fifteen seasons SaveSize measures: a seeded career of an active manager (a buy and
   a release each summer) against the same career with the seed block out (the inverse), to RV_SEASONS. */
async function partLong() {
  const { withoutWorldSeed } = await import(new URL(`file://${path.join(ROOT, 'scripts/lib/cmWorldSeed1250.mjs')}`).href);
  const I = await engine('inverse', false, withoutWorldSeed);
  const SEASONS = Number(process.env.RV_SEASONS || 40);
  const club = process.env.RV_CLUB || 'Everton';
  const rows = {};
  for (const E of [T, I]) {
    const M = await E.fresh();
    const tag = E === T ? 'seeded' : 'inverse';
    rows[tag] = [];
    let s = tape(7, () => M.cm.startCareer(club, 'now')).value;
    for (let season = 1; season <= SEASONS; season += 1) {
      if (Date.now() - t0 > 3300e3) { console.log(`long: stopped at season ${season} for time`); break; }
      s = { ...s, budget: Math.max(s.budget, 200), wageCap: 9999 };
      const have = new Set(s.squad.map(p => p.name));
      const mp = tape(season * 13, () => M.cm.buildMarket(s)).value.find(p => p.position !== 'GK' && p.age < 27 && !have.has(p.name));
      if (mp) s = tape(season * 17, () => M.cm.buyPlayer(s, mp)).value ?? s;
      const man = [...s.squad].filter(p => !p.onLoan && p.position !== 'GK').sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id))[0];
      if (man) s = tape(season * 19, () => M.cm.releasePlayer(s, man.id)).value ?? s;
      for (let i = 0; i < 260; i += 1) {
        if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
        const r = tape(season * 1000 + i, () => M.cm.playNextEntry(s, OPT)).value;
        s = r.state;
        if (r.kind === 'seasonOver' || s.sacked) break;
      }
      if (s.sacked) { console.log(`long ${tag}: sacked in season ${season}`); break; }
      s = tape(season * 23, () => M.cm.finishSeason(s)).value.state;
      M.store.clear(); M.cm.saveCareer(s);
      const raw = M.store.get(M.cm.SAVE_KEY);
      const led = M.ledger.readWorldRoster(s);
      const row = { season, units: raw.length, bytes: Buffer.byteLength(raw, 'utf8'), records: led?.records?.length ?? 0,
        ledgerUnits: s.worldRoster ? JSON.stringify(s.worldRoster).length : 0, ledgerBytes: s.worldRoster ? Buffer.byteLength(JSON.stringify(s.worldRoster), 'utf8') : 0 };
      if ([5, 15, 25, 30, 40].includes(season)) {
        let a = Date.now(); tape(1, () => M.cm.buildMarket(s)); row.marketMs = Date.now() - a;
        s = tape(season * 29, () => M.cm.startNextSeason(s)).value;
        a = Date.now(); tape(2, () => M.cm.playNextEntry(s, OPT)); row.entryMs = Date.now() - a;
      } else s = tape(season * 29, () => M.cm.startNextSeason(s)).value;
      rows[tag].push(row);
      console.log(`long ${tag} season ${season}: ${row.units} units, ${row.bytes} bytes, ledger ${row.records} records ${row.ledgerUnits} units ${row.ledgerBytes} bytes${row.marketMs !== undefined ? `, market ${row.marketMs} ms, an entry ${row.entryMs} ms` : ''}, elapsed ${Math.round((Date.now() - t0) / 1000)} s`);
    }
  }
  const slope = (list, from) => { const pts = list.filter(r => r.season >= from); const n = pts.length; if (n < 3) return null; const mx = pts.reduce((x, r) => x + r.season, 0) / n, my = pts.reduce((x, r) => x + r.units, 0) / n; return Math.round(pts.reduce((x, r) => x + (r.season - mx) * (r.units - my), 0) / pts.reduce((x, r) => x + (r.season - mx) ** 2, 0)); };
  console.log(`long: slope seasons 15 on, units a season: seeded ${slope(rows.seeded, 15)}, inverse ${slope(rows.inverse, 15)}`);
  if (process.env.RC_OUT) fs.writeFileSync(path.join(OUT, `long-${club.replace(/ /g, '_')}.json`), JSON.stringify(rows, null, 1));
}

const parts = { deep: partDeep, hot: partHot, dd: partDd, fuzz: partFuzz, long: partLong };
if (!parts[PART]) { console.log(`rvSaves: unknown part ${PART}`); process.exit(2); }
await parts[PART]();
console.log(`coverage: ${JSON.stringify(notes)}`);
console.log(fails.length ? `rvSaves ${PART}: RED, ${fails.length} failures (first: ${fails[0].slice(0, 300)})` : `rvSaves ${PART}: green in ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(fails.length ? 1 : 0);
