/* Round 517: activity keeps streak days alive without recording a finish.
   The real completion and streak modules run against browser storage and an
   isolated backend boundary. No account or network is contacted.

   Run: node scripts/simActivityDays.mjs
   ACTIVITY_DAYS_CONTROL=completion restores the old full-completion ping.
   Other controls: dayless, network, erase, empty, uncounted.
   Each mutation must change source and fail exactly its named assertions.
   Bundles and source copies live in a unique OS temp directory per run.
*/
import assert, { AssertionError } from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.ACTIVITY_DAYS_CONTROL || '';
const KEY = 'dukb-streaks-v1';
const controls = {
  completion: {
    'same-day totals': 'three activity pings must not add finished games',
    'real completion after activity': 'the real finish must add exactly one play',
  },
  dayless: { 'consecutive and missed days': 'same-day activity keeps one streak day' },
  network: { 'no backend for streak days': 'streak-only activity must not reach account or completion tables' },
  erase: {
    'same-day totals': 'three activity pings must not add finished games',
    'consecutive and missed days': 'activity on consecutive days keeps the global streak',
    'storage quota': 'a failed activity write must preserve the saved completion',
  },
  empty: { 'empty route': 'an empty route must not create a game streak' },
  uncounted: {
    'same-day totals': 'three activity pings must not add finished games',
    'real completion after activity': 'the real finish must add exactly one play',
  },
};
if (CONTROL && !Object.hasOwn(controls, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-activity-days-'));
const RealDate = Date;
const store = new Map();
let now = '2026-09-07T16:00:00.000Z';
let quota = false;
const failures = [];
const failedAssertions = {};

function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length - 1, 1, 'control must target exactly one executable statement');
  const changed = source.replace(before, after);
  assert.notEqual(changed, source, 'control must change the source');
  return changed;
}

try {
  let completions = fs.readFileSync(path.join(ROOT, 'src/lib/completions.ts'), 'utf8');
  let streaks = fs.readFileSync(path.join(ROOT, 'src/lib/streaks.ts'), 'utf8');
  const call = 'recordGameStreakDay(game);';
  if (CONTROL === 'completion') completions = replaceOnce(completions, call, 'recordStreakCompletion(game, new Date(), 0);');
  if (CONTROL === 'dayless') completions = replaceOnce(completions, call, 'void game;');
  if (CONTROL === 'network') completions = replaceOnce(completions, call, `${call}\n    void supabase.auth.getUser();`);
  if (CONTROL === 'erase') completions = replaceOnce(completions, call, `localStorage.removeItem('${KEY}');\n    ${call}`);
  if (CONTROL === 'empty') {
    completions = replaceOnce(completions.replaceAll('\r\n', '\n'), `if (!game) return;\n    ${call}`, call);
  }
  if (CONTROL === 'uncounted') {
    streaks = replaceOnce(streaks, 'state.totalPlays = (state.totalPlays || 0) + 1;', 'state.totalPlays = (state.totalPlays || 0) + 0;');
  }
  const completionCopy = path.join(temp, 'completions.ts');
  const streakCopy = path.join(temp, 'streaks.ts');
  fs.writeFileSync(completionCopy, completions);
  fs.writeFileSync(streakCopy, streaks);
  const bundle = path.join(temp, 'activity-days.mjs');
  await build({
    stdin: {
      contents: `export { recordCompletion, recordStreakDay } from ${JSON.stringify(completionCopy)};
        export { getStreakState, recordGameCompletion } from ${JSON.stringify(streakCopy)};
        export { backendCalls } from 'activity-test-backend';`,
      resolveDir: ROOT,
      loader: 'ts',
    },
    bundle: true, platform: 'node', format: 'esm', outfile: bundle, logLevel: 'silent',
    plugins: [{ name: 'activity-test-boundaries', setup(builder) {
      builder.onResolve({ filter: /^(activity-test-backend|@\/integrations\/supabase\/client)$/ }, () => ({ path: 'backend', namespace: 'activity-test' }));
      builder.onLoad({ filter: /.*/, namespace: 'activity-test' }, () => ({ contents: `
        export const backendCalls = [];
        export const supabase = {
          from(table) {
            backendCalls.push({ operation: 'from', table });
            return { insert(row) { backendCalls.push({ operation: 'insert', table, row }); return Promise.resolve({ error: null }); } };
          },
          auth: { getUser() { backendCalls.push({ operation: 'getUser' }); return Promise.resolve({ data: { user: null }, error: null }); } },
        };`, loader: 'js' }));
      builder.onResolve({ filter: /^@\// }, args => ({
        path: args.path === '@/lib/streaks' ? streakCopy : path.join(ROOT, 'src', args.path.slice(2) + '.ts'),
      }));
    } }],
  });

  globalThis.Date = class extends RealDate {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return RealDate.parse(now); }
  };
  globalThis.localStorage = {
    getItem: key => store.get(key) ?? null,
    setItem(key, value) { if (quota) throw new Error('Storage quota exceeded'); store.set(key, String(value)); },
    removeItem: key => store.delete(key),
  };
  globalThis.window = { dispatchEvent() {} };
  const mod = await import(pathToFileURL(bundle).href);
  const settle = () => new Promise(resolve => setImmediate(resolve));
  const cases = [
    ['same-day totals', () => {
      mod.recordGameCompletion('soccer-grid', new Date(), 50);
      for (let i = 0; i < 3; i++) mod.recordStreakDay('/soccer-career');
      const saved = mod.getStreakState();
      assert.equal(saved.totalPlays, 1, 'three activity pings must not add finished games');
      assert.equal(saved.totalPoints, 50, 'activity must preserve earned points');
      assert.equal(Math.round(saved.totalPoints / saved.totalPlays), 50, 'activity must not dilute the profile average');
    }],
    ['consecutive and missed days', () => {
      mod.recordStreakDay('/soccer-career');
      mod.recordStreakDay('/soccer-career');
      assert.deepEqual(mod.getStreakState().global, { current: 1, longest: 1, lastDate: '2026-09-07' }, 'same-day activity keeps one streak day');
      now = '2026-09-08T16:00:00.000Z';
      mod.recordStreakDay('/soccer-career');
      now = '2026-09-09T16:00:00.000Z';
      mod.recordStreakDay('/club-manager');
      const third = mod.getStreakState();
      assert.deepEqual(third.global, { current: 3, longest: 3, lastDate: '2026-09-09' }, 'activity on consecutive days keeps the global streak');
      assert.deepEqual(third.perGame['soccer-career'], { current: 2, longest: 2, lastDate: '2026-09-08' });
      assert.deepEqual(third.perGame['club-manager'], { current: 1, longest: 1, lastDate: '2026-09-09' });
      now = '2026-09-11T16:00:00.000Z';
      mod.recordStreakDay('/soccer-career');
      const afterGap = mod.getStreakState();
      assert.deepEqual(afterGap.global, { current: 1, longest: 3, lastDate: '2026-09-11' });
      assert.deepEqual(afterGap.perGame['soccer-career'], { current: 1, longest: 2, lastDate: '2026-09-11' });
    }],
    ['real completion after activity', async () => {
      mod.recordStreakDay('/soccer-career');
      mod.recordStreakDay('/soccer-career');
      mod.recordCompletion('/soccer-career', 50, 'ActivityFixture');
      await settle();
      const saved = mod.getStreakState();
      assert.equal(saved.totalPlays, 1, 'the real finish must add exactly one play');
      assert.equal(saved.totalPoints, 50, 'the real finish must add its points once');
      assert.deepEqual(saved.global, { current: 1, longest: 1, lastDate: '2026-09-07' });
    }],
    ['no backend for streak days', async () => {
      mod.recordStreakDay('/soccer-career');
      mod.recordStreakDay('/club-manager');
      await settle();
      assert.deepEqual(mod.backendCalls, [], 'streak-only activity must not reach account or completion tables');
    }],
    ['storage quota', () => {
      mod.recordGameCompletion('soccer-grid', new Date(), 50);
      const before = store.get(KEY);
      quota = true;
      assert.doesNotThrow(() => mod.recordStreakDay('/soccer-career'), 'unavailable storage must not break play');
      assert.equal(store.get(KEY), before, 'a failed activity write must preserve the saved completion');
    }],
    ['empty route', () => {
      mod.recordGameCompletion('soccer-grid', new Date(), 50);
      const before = store.get(KEY);
      mod.recordStreakDay('');
      mod.recordStreakDay('/');
      assert.equal(store.get(KEY), before, 'an empty route must not create a game streak');
    }],
  ];
  for (const [name, run] of cases) {
    store.clear();
    mod.backendCalls.length = 0;
    quota = false;
    now = '2026-09-07T16:00:00.000Z';
    try {
      await run();
      console.log(`PASS: ${name}`);
    } catch (error) {
      if (!(error instanceof AssertionError)) throw error;
      failures.push(name);
      failedAssertions[name] = error.message.split('\n')[0];
      console.log(`FAIL: ${name}: ${error.message}`);
    }
  }
  if (CONTROL) {
    assert.deepEqual(failedAssertions, controls[CONTROL], 'control must fail exactly its intended assertions, with all other cases passing');
    console.log(`simActivityDays: control ${CONTROL} proved ${failures.length} intended assertion failure(s)`);
  } else {
    assert.deepEqual(failures, [], 'activity-day regression cases must all pass');
    console.log(`simActivityDays: all ${cases.length} cases passed`);
  }
} finally {
  globalThis.Date = RealDate;
  delete globalThis.localStorage;
  delete globalThis.window;
  assert.equal(path.dirname(temp), path.resolve(os.tmpdir()), 'cleanup must stay inside the OS temp directory');
  assert.ok(path.basename(temp).startsWith('dukb-activity-days-'), 'cleanup must target this harness temp directory');
  fs.rmSync(temp, { recursive: true, force: true });
}
