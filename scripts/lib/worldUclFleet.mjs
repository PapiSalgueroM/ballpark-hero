/* Round 1502: the engine, the random stream and the fleets that scripts/simWorldUcl.mjs (sections 1 to 7) and
 * scripts/proofWorldUclFleet.mjs (the round time proof) both drive, written once.
 *
 *   engineOf(root, label, { base, edits })  bundles src/lib/clubManager.ts with the modules the sections read
 *       (cm, eras, cal, hs, dd, w, lp), either from the files on disk or, with `base`, every src file read through
 *       `git show <base>:<path>`. `edits` are [{ file, from, to }] applied to the source in the bundle only; each
 *       `from` must stand in its file exactly once or nothing runs (the caller's cannot()). Every journey gets a
 *       fresh vm context (fresh()), so module state such as registered memberships never leaks between saves,
 *       with the clock held and the network refused.
 *   tape(seed, action)  runs `action` with Math.random replaced by a counter stream and keeps every draw.
 *   pickFleet(M, which, cannot)  the participants and the watchers, picked by the engine's own answer
 *       (startCareer(...).uclGroup), so a data change that moves a club shows in the printed list.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

export const lf = s => s.split('\r\n').join('\n');

const ENTRY = [
  "export * as cm from './src/lib/clubManager';",
  "export * as eras from './src/lib/clubManagerEras';",
  "export * as cal from './src/lib/clubManagerCalendar';",
  "export * as hs from './src/lib/managerHotSeat';",
  "export * as dd from './src/lib/deadlineDay';",
  "export * as w from './src/lib/worldCompetition';",
  "export * as lp from './src/lib/uclLeaguePhase';",
].join('\n');

export async function engineOf(root, label, { base = null, edits = [] } = {}, cannot = why => { throw new Error(why); }) {
  const applied = new Map(edits.map((_, i) => [i, 0]));
  const plugin = {
    name: 'world-ucl-fleet-source',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
        const rel = path.relative(root, args.path).split(path.sep).join('/');
        if (!rel.startsWith('src/')) return null;
        let text;
        if (base) {
          try { text = lf(execFileSync('git', ['show', `${base}:${rel}`], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 27 })); } catch { return null; }
        } else text = lf(fs.readFileSync(args.path, 'utf8'));
        edits.forEach((e, i) => {
          if (e.file !== rel) return;
          const n = text.split(e.from).length - 1;
          if (n !== 1) cannot(`${label}: the line to edit stands in ${rel} ${n} times, it must be exactly once (${e.from.slice(0, 70).replaceAll('\n', ' ')})`);
          text = text.replace(e.from, e.to);
          applied.set(i, applied.get(i) + 1);
        });
        return { contents: text, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
      });
    },
  };
  const out = await build({ stdin: { contents: ENTRY, resolveDir: root, sourcefile: `world-ucl-${label}.ts`, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
  for (const [i, n] of applied) if (n !== 1) cannot(`${label}: the edit of ${edits[i].file} was made ${n} times`);
  const script = new vm.Script(out.outputFiles[0].text, { filename: `world-ucl-${label}.cjs` });
  return {
    label,
    async fresh() {
      const module = { exports: {} };
      const store = new Map();
      const NOW = 1791633600000;
      class HeldDate extends Date {
        constructor(...a) { super(...(a.length ? a : [NOW])); }
        static now() { return NOW; }
      }
      const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(root, 'package.json')),
        console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone,
        setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('no network here')),
        localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
      script.runInContext(ctx);
      await module.exports.eras.ensureAllEraRosters();
      return { ...module.exports, store };
    },
  };
}

/** The random stream: a counter generator, the same on every engine, every draw kept. */
export function tape(seed, action) {
  let state = seed >>> 0; const draws = [];
  const original = Math.random;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0; let v = state;
    v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61);
    const d = ((v ^ v >>> 14) >>> 0) / 4294967296; draws.push(d); return d;
  };
  try { return { value: action(), draws }; } finally { Math.random = original; }
}

export const CREATED = { name: 'Proof Town Athletic', stadium: 'Proof Park', budgetTier: 'big', quality: 72,
  crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'PT' }, replacedClub: '' };
export const ERAS = ['era2005', 'era2010', 'era2015', 'era2020'];

/** The two fleets, picked by the engine's own answer. `which` is participants, watchers or all. */
export function pickFleet(M, which, cannot) {
  const startsIn = (club, era, custom) => {
    const st = tape(0x1502, () => (custom ? M.cm.startCareer(club, era, custom) : M.cm.startCareer(club, era))).value;
    M.cm.registerCustomClub?.(null); M.cm.registerLeagueOverrides?.(null);
    return !!st.uclGroup;
  };
  const fleet = [];
  const add = (kind, era, club, custom) => {
    const inIt = startsIn(club, era, custom);
    if (inIt !== (kind === 'participant')) cannot(`${club} (${era}) was picked as a ${kind} but startCareer says uclGroup ${inIt ? 'set' : 'null'}`);
    fleet.push({ kind, era, club, custom });
  };
  const pickEra = (era, wantIn) => {
    const leagues = M.cm.ERA_LEAGUES[era];
    if (!leagues?.length) cannot(`the era ${era} has no leagues`);
    const clubs = wantIn ? leagues[0].clubs : [...leagues[0].clubs].reverse();
    const club = clubs.find(c => startsIn(c, era) === wantIn);
    if (!club) cannot(`no ${wantIn ? 'participant' : 'watcher'} in ${era}'s first league`);
    return club;
  };
  if (which !== 'watchers') {
    for (const club of ['Real Madrid', 'Arsenal']) add('participant', 'now', club);
    for (const era of ERAS) add('participant', era, pickEra(era, true));
  }
  if (which !== 'participants') {
    for (const club of ['Chelsea', 'Hoffenheim', 'Everton']) add('watcher', 'now', club);
    const mx = M.cm.REAL_LEAGUES.find(l => /liga mx/i.test(l.name ?? '') || /mx/i.test(l.id));
    if (!mx) cannot('no Liga MX league in REAL_LEAGUES');
    add('watcher', 'now', mx.clubs[0]);
    const second = M.cm.PYRAMIDS?.[0]?.second;
    if (!second) cannot('no PYRAMIDS[0].second league for the created club');
    add('watcher', 'now', CREATED.name, { ...CREATED, leagueId: second });
    for (const era of ERAS) add('watcher', era, pickEra(era, false));
  }
  return fleet;
}
