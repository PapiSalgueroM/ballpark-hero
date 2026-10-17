/* Review of Round 1502 (runs lens): OLD SAVES PLAYED ON. The builder's proof loads every base save once and
   compares the JSON; this probe goes further: a save written by the BASE engine (d8aaa4cb) at four points a player
   really closes the tab (mid season one, the last whistle of season one, the season review after finishSeason,
   mid season two) is loaded by the HEAD engine and PLAYED ON through the rest of the season, the rollover and five
   entries of the next one, evaluating the watched competition after every step (never throws, never falls, a
   winner at the end of a watched season, the next season's slice is its own). Then a head save is opened by the
   BASE engine (a release rolled back) and played to its rollover, and that save opened by the head again.
   Run from the repo root: node .rc/x/oldSaves1502.mjs   (OLD_BASE, OLD_SEEDS, OLD_ONLY optional)
   Exit 0 green, 1 red, 2 could not run. The last line says which. */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { engineOf, pickFleet, tape } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/worldUclFleet.mjs')).href);
const BASE = process.env.OLD_BASE || 'd8aaa4cb';
const SEEDS = (process.env.OLD_SEEDS || '1,2').split(',').map(Number);
const ONLY = process.env.OLD_ONLY || '';
const fails = [];
const counts = {};
let checks = 0;
const ok = (c, m) => { checks += 1; if (!c) { fails.push(m); if (fails.length <= 40) console.log(`  FAIL ${m}`); } };
const bump = k => { counts[k] = (counts[k] ?? 0) + 1; };
const cannot = why => { console.log(`oldSaves1502: CANNOT RUN: ${why}`); process.exit(2); };
const OPTS = { skipHalftime: true, noCoach: true };

const B = await engineOf(ROOT, 'base', { base: BASE }, cannot);
const H = await engineOf(ROOT, 'head', {}, cannot);
const fleet = pickFleet(await H.fresh(), 'all', cannot).filter(f => !ONLY || f.club.includes(ONLY));
console.log(`oldSaves1502: base ${BASE}, ${fleet.length} clubs (${fleet.map(f => `${f.club} ${f.era}`).join(', ')}), seeds ${SEEDS.join(',')}`);

let k = 0;
const run = (seed, fn) => tape((seed * 0x9e3779b1 + (k += 1) * 7919) >>> 0, fn).value;
const strip = st => { const c = JSON.parse(JSON.stringify(st)); delete c.worldComps; return JSON.stringify(c); };

/* Play `M`'s state on until `until` says stop; every step evaluates the watched season on the head engine. */
function playOn(M, st, seed, tag, { head, toEnd = true, extra = 0 }) {
  let s = st; let prev = 0; let over = s.week >= (s.calendar?.length ?? 0);
  const look = () => {
    if (!head) return;
    try {
      const r = M.cm.evalWorldUcl(s);
      const d = M.cm.worldUclNightsDone(s);
      ok(d >= prev, `${tag}: nights done fell from ${prev} to ${d} at week ${s.week}`);
      prev = Math.max(prev, d);
      if (s.worldComps?.ucl) ok(!!r, `${tag}: a slice of season ${s.worldComps.ucl.s} does not evaluate in season ${s.season}`);
      if (s.uclGroup) ok(!s.worldComps, `${tag}: a club in the Champions League carries worldComps`);
    } catch (e) { ok(false, `${tag}: the evaluation threw: ${String(e).slice(0, 120)}`); }
  };
  look();
  for (let i = 0; i < 260 && toEnd && !over; i += 1) {
    const r = run(seed, () => M.cm.playNextEntry(s, OPTS));
    s = r.state; over = r.kind === 'seasonOver'; look();
  }
  for (let i = 0; i < extra; i += 1) { const r = run(seed, () => M.cm.playNextEntry(s, OPTS)); s = r.state; look(); }
  return s;
}

/* The rollover on the head engine with the season's checks. `finished` says finishSeason already ran. */
function rollHead(M, s, seed, tag, finished) {
  let winner = null;
  if (s.worldComps?.ucl && s.worldComps.ucl.s === s.season) {
    winner = M.cm.worldUclWinner(s);
    ok(!!winner, `${tag}: a watched season ended with no winner`);
    if (winner) bump('watched seasons ended with a winner (head, on an old save)');
  }
  const fin = finished ? s : run(seed, () => M.cm.finishSeason(s).state);
  const next = run(seed, () => M.cm.startNextSeason(fin));
  ok(!!next && next.season === s.season + 1, `${tag}: the rollover did not make season ${s.season + 1}`);
  const sl = next.worldComps?.ucl;
  if (sl) ok(sl.s === next.season && !next.uclGroup && !sl.clubs.includes(next.clubName), `${tag}: next season's slice is season ${sl.s}, in it ${!!next.uclGroup}, mine among them ${sl.clubs.includes(next.clubName)}`);
  if (winner && !next.uclGroup && sl && next.clubName !== winner) ok(sl.clubs.includes(winner), `${tag}: the watched winner ${winner} is not in next season's watched field`);
  if (winner && !M.eras.isHistoricEra(s.eraId) && Array.isArray(next.uclField) && next.uclField.length && next.clubName !== winner) ok(next.uclField.includes(winner), `${tag}: the watched winner ${winner} is not in next season's uclField`);
  bump(sl ? 'rollovers on an old save that opened a slice' : next.uclGroup ? 'rollovers on an old save into the Champions League' : 'rollovers on an old save with no slice');
  return next;
}

for (const f of fleet) for (const seed of SEEDS) {
  const name = `${f.club} (${f.era}) seed ${seed}`;
  try {
    /* The base engine writes the four saves. */
    const Mb = await B.fresh();
    const saves = {};
    const snap = (label, st) => { Mb.store.clear(); if (Mb.cm.saveCareer(st)) saves[label] = Mb.store.get(Mb.cm.SAVE_KEY); };
    let s = run(seed, () => (f.custom ? Mb.cm.startCareer(f.club, f.era, f.custom) : Mb.cm.startCareer(f.club, f.era)));
    let over = false;
    for (let i = 0; i < 260 && !over; i += 1) { const r = run(seed, () => Mb.cm.playNextEntry(s, OPTS)); s = r.state; over = r.kind === 'seasonOver'; if (i === 30) snap('mid1', s); }
    snap('end1', s);
    s = run(seed, () => Mb.cm.finishSeason(s).state);
    snap('review1', s);
    s = run(seed, () => Mb.cm.startNextSeason(s));
    for (let i = 0; i < 12; i += 1) { const r = run(seed, () => Mb.cm.playNextEntry(s, OPTS)); s = r.state; }
    snap('mid2', s);
    for (const label of ['mid1', 'end1', 'review1', 'mid2']) {
      const tag = `${name} ${label}`;
      const json = saves[label];
      if (!json) { ok(false, `${tag}: the base engine wrote no save`); continue; }
      /* The same save opened by both engines: equal with worldComps aside. */
      const Mb2 = await B.fresh(); Mb2.store.set(Mb2.cm.SAVE_KEY, json);
      const viaBase = run(seed, () => Mb2.cm.loadCareer());
      const Mh = await H.fresh(); Mh.store.set(Mh.cm.SAVE_KEY, json);
      const st = run(seed, () => Mh.cm.loadCareer());
      if (!st) { ok(false, `${tag}: the head engine loads the base save as no career`); continue; }
      ok(!!viaBase && strip(viaBase) === strip(st), `${tag}: the head loads the base save to other JSON than the base does (worldComps aside)`);
      bump(st.worldComps ? 'old saves that gained a slice at load' : 'old saves with no slice at load');
      /* Played on by the head. */
      let h = st;
      if (label === 'mid1' || label === 'mid2') h = playOn(Mh, h, seed, tag, { head: true });
      h = rollHead(Mh, h, seed, tag, label === 'review1');
      h = playOn(Mh, h, seed, `${tag} next`, { head: true, toEnd: false, extra: 5 });
      bump('old saves played on through a rollover');
      if (label !== 'mid1') continue;
      /* Rolled back: the head's save opened by the base engine and played to its rollover, then opened by the head. */
      Mh.store.clear(); ok(Mh.cm.saveCareer(h), `${tag}: the head refused to save`);
      const back = await B.fresh(); back.store.set(back.cm.SAVE_KEY, Mh.store.get(Mh.cm.SAVE_KEY));
      let b = run(seed, () => back.cm.loadCareer());
      if (!b) { ok(false, `${tag}: the BASE engine loads a head save as no career (a rollback loses it)`); continue; }
      b = playOn(back, b, seed, `${tag} rollback`, { head: false });
      b = run(seed, () => back.cm.startNextSeason(back.cm.finishSeason(b).state));
      back.store.clear(); ok(back.cm.saveCareer(b), `${tag}: the base refused to save after the rollback`);
      const again = await H.fresh(); again.store.set(again.cm.SAVE_KEY, back.store.get(back.cm.SAVE_KEY));
      const a = run(seed, () => again.cm.loadCareer());
      ok(!!a, `${tag}: the head loads the rolled back save as no career`);
      if (a) ok(!a.worldComps?.ucl || a.worldComps.ucl.s === a.season, `${tag}: after a rollback the head keeps a stale slice of season ${a.worldComps?.ucl?.s} in season ${a.season}`);
      if (a) { playOn(again, a, seed, `${tag} after rollback`, { head: true, toEnd: false, extra: 5 }); bump('rollback round trips'); }
    }
  } catch (e) {
    ok(false, `${name}: threw ${String(e?.stack ?? e).split('\n').slice(0, 3).join(' | ').slice(0, 300)}`);
  }
}
for (const [key, n] of Object.entries(counts)) console.log(`  ${key}: ${n}`);
console.log(fails.length ? `oldSaves1502: RED, ${fails.length} failures of ${checks} checks` : `oldSaves1502: GREEN, ${checks} checks, 0 failures`);
process.exit(fails.length ? 1 : 0);
