// Throwaway probe (sent to the runner as .rc/x/dailiesProbe.mjs, never committed): what the two
// dailies that deal from Club Manager's engine hand out on 2026-10-09 and the 13 days after.
// Run from the repo root. Writes $RC_OUT/dailies.json (or prints) so two trees can be compared.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dailies-probe-'));
const aliasPlugin = {
  name: 'alias',
  setup(b) {
    b.onResolve({ filter: /^@\// }, async args => {
      const r = await b.resolve('./' + args.path.slice(2), { resolveDir: SRC, kind: args.kind });
      return { path: r.path, errors: r.errors };
    });
  },
};
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.cjs');
fs.writeFileSync(ENTRY, "export * as dd from '@/lib/deadlineDay';\nexport * as hs from '@/lib/managerHotSeat';\nexport * as cm from '@/lib/clubManager';\n");
await build({ entryPoints: [ENTRY], bundle: true, format: 'cjs', platform: 'node', outfile: BUNDLE, logLevel: 'error', plugins: [aliasPlugin] });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { dd, hs } = createRequire(import.meta.url)(BUNDLE);

const dates = [];
for (let i = 0; i < 14; i += 1) { const d = new Date(Date.UTC(2026, 9, 9 + i)); dates.push(d.toISOString().slice(0, 10)); }
const out = { head: process.env.GITHUB_SHA ?? null, dates: {} };
for (const date of dates) {
  const row = {};
  try {
    const setup = dd.dailyDeadlineDay(date);
    const run = dd.startDeadlineDay(setup);
    row.deadline = {
      club: setup.club, seed: setup.seed, budget: run.state.budget,
      needs: run.needs.map(n => n.label),
      targets: run.targets.map(t => `${t.mp.name}|${t.mp.position}|${t.mp.age}|${t.mp.rating}|${t.mp.price}|need${t.need}`),
      squadTop: run.state.squad.slice().sort((a, b) => b.rating - a.rating).slice(0, 5).map(p => `${p.name} ${p.rating}`),
    };
  } catch (e) { row.deadline = { error: String(e.message).slice(0, 200) }; }
  try {
    const setup = hs.dailyHotSeat(date);
    const run = hs.startHotSeat(setup);
    const t = run.takeover ?? {};
    row.hotseat = {
      club: setup.club, seed: setup.seed,
      takeover: { position: t.position, clubs: t.clubs, expectation: t.expectation, played: t.played, points: t.points, form: (t.form ?? []).join('') },
      target: run.target ?? null, leash: run.leash ?? null,
      squadTop: (run.state?.squad ?? []).slice().sort((a, b) => b.rating - a.rating).slice(0, 5).map(p => `${p.name} ${p.rating}`),
    };
  } catch (e) { row.hotseat = { error: String(e.message).slice(0, 200) }; }
  out.dates[date] = row;
}
const text = JSON.stringify(out, null, 1);
if (process.env.RC_OUT) { fs.mkdirSync(process.env.RC_OUT, { recursive: true }); fs.writeFileSync(path.join(process.env.RC_OUT, 'dailies.json'), text); }
console.log(text.length > 4000 ? `${text.slice(0, 1500)}\n... (${text.length} bytes)` : text);
console.log('dailiesProbe: done');
