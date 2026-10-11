/* Reviewer sc-engine, Release AW: several engines pressed in step, compared save byte for save byte. */
import { seeded, withRng, start, step, leafDiff } from './scLib.mjs';

/**
 * arms: [{ name, E, request, from?, strip?, reload? }]. The first arm is the reference. Every arm gets its own
 * generator from the same seed and position, so an arm that draws once more or once less is caught as well.
 * Returns one row an arm: { name, steps, error, diverged: { k, phase, age, paths } | null, state, draws }.
 */
export function lockstep(seed, arms, o = {}) {
  const st = arms.map(a => ({ a, rng: seeded(seed, o.skip ?? 0), state: null, live: true,
    out: { name: a.name, steps: 0, error: null, diverged: null } }));
  for (const x of st) {
    try {
      const from = x.a.from ?? o.from;
      x.state = withRng(x.rng, () => from ? x.a.E.repairCareer(JSON.parse(from)) : start(x.a.E, seed));
    } catch (e) { x.live = false; x.out.error = `load: ${String(e && e.message).slice(0, 200)}`; }
  }
  let k = o.k0 ?? 0;
  const ser = x => {
    if (!x.a.strip) return JSON.stringify(x.state);
    const copy = { ...x.state }; delete copy[x.a.strip];
    return JSON.stringify(copy);
  };
  const compare = phase => {
    const ref = st[0];
    if (!ref.live) return;
    const a = ser(ref);
    for (const x of st.slice(1)) {
      if (!x.live) continue;
      const b = ser(x);
      if (a === b && ref.rng.count() === x.rng.count()) continue;
      x.live = false;
      const paths = a === b ? [] : leafDiff(JSON.parse(a), JSON.parse(b));
      x.out.diverged = { k, phase, age: ref.state.age, club: ref.state.currentClub,
        paths: paths.length ? paths : [a === b ? `(draw count only): ${ref.rng.count()} -> ${x.rng.count()}` : '(key order only)'] };
    }
  };
  compare('init');
  const limit = o.steps ?? 2500;
  for (let i = 0; i < limit; i++) {
    const ref = st[0];
    if (!ref.live || ref.state.retired) break;
    const phase = ref.state.phase;
    for (const x of st) {
      if (!x.live) continue;
      try {
        let next = withRng(x.rng, () => step(x.a.E, x.state, seed, k, x.a));
        if (!next) throw new Error('no state returned');
        if (o.reload || x.a.reload) next = withRng(x.rng, () => x.a.E.repairCareer(JSON.parse(JSON.stringify(next))));
        x.state = next; x.out.steps++;
      } catch (e) { x.live = false; x.out.error = `${phase} k${k} age ${x.state?.age}: ${String(e && e.message).slice(0, 200)}`; }
    }
    k++;
    compare(phase);
    if (o.onFrame && ref.live) o.onFrame(ref.state, k, ref.rng.count(), phase);
  }
  return st.map(x => ({ ...x.out, state: x.state, draws: x.rng.count() }));
}

/** Snapshots of a reference career, a few a category: the saves an old build would have left on a disk. */
export function snapshots(seed, arm) {
  const got = new Map();
  const keep = (cat, state, k, draws) => { if (!got.has(cat)) got.set(cat, { cat, k, draws, age: state.age, serial: JSON.stringify(state) }); };
  const rows = lockstep(seed, [arm], { onFrame: (state, k, draws) => {
    if (state.retired) return;
    if (state.phase === 'playing') {
      if (state.age >= 20) keep('between', state, k, draws);
      if (state.age === 31 && state.contractYearsLeft >= 2) keep('vet31', state, k, draws);
      if (state.age >= 30) keep('play30', state, k, draws);
      if (state.age >= 20 && state.intStats?.caps >= 1 && state.internationalCareer) keep('intl', state, k, draws);
    } else if (state.age >= 19) {
      keep(`mid:${state.phase}`, state, k, draws);
      if (state.age >= 30) keep(`mid30:${state.phase}`, state, k, draws);
    }
    if (state.loan) keep('loan', state, k, draws);
    if (state.loan && state.phase !== 'playing') keep('loan:mid', state, k, draws);
    if (state.loan && state.phase === 'playing' && state.age >= 30) keep('loan30', state, k, draws);
    if (state.phase === 'transfer_window' && !state.loan && ['no_interest', 'one_offer', 'dream_club'].includes(state.transferSituation?.type)) {
      keep(state.age >= 30 ? 'tw30' : 'tw', state, k, draws);
      if (state.age >= 34) keep('tw34', state, k, draws);
    }
  } });
  const end = rows[0];
  if (end.state?.retired) got.set('retired', { cat: 'retired', k: -1, draws: end.draws, age: end.state.age, serial: JSON.stringify(end.state) });
  return { list: [...got.values()], error: end.error };
}
export const tally = (map, key, n = 1) => map.set(key, (map.get(key) ?? 0) + n);
export const top = (map, n = 12) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `    ${v}  ${k}`).join('\n');
