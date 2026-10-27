import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, writeSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() } }));

import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { keyedRng } from '@/lib/keyedRng';

type Career = {
  name: string; age: number; year: number; ovr: number; health: number;
  contractYears: number; retired: boolean; seasons: Record<string, unknown>[];
  summer?: unknown; retirement?: unknown;
};
type Saved = { c: Career; phase: string; teamQuality: number | null; contractTalk?: unknown };
type Snapshot = { raw: string | null; save: Saved | null; rngAt: number; text: string; buttons: { text: string; disabled: boolean }[] };
type Action = { kind: string; button: HTMLButtonElement };
type Episode = {
  seed: string; actions: number; outcome: string; rows: number; reached20: boolean;
  reloads: { rows: number; phase: string; retired: boolean }[]; encounteredCopy: Record<string, unknown>[]; finalRaw: string | null;
};

function check(ok: boolean, marker: string) { expect(ok, marker).toBe(true); }
function sha(bytes: Buffer) { return createHash('sha256').update(bytes).digest('hex'); }
function encoded(value: unknown) { return Buffer.from(JSON.stringify(value, null, 2) + '\n', 'utf8'); }

function saveFile(path: string, body: Buffer, fresh = true) {
  const fd = openSync(path, fresh ? 'wx' : 'w');
  try { writeSync(fd, body, 0, body.length); fsyncSync(fd); } finally { closeSync(fd); }
  check(readFileSync(path).equals(body), 'NBA20_EVIDENCE_READBACK');
  return { file: path, bytes: body.length, sha256: sha(body) };
}

function writer() {
  const out = process.env.NBA_SEASON20_PROGRESSION_OUT;
  check(!!out && isAbsolute(out), 'NBA20_OWNED_OUTPUT_REQUIRED');
  const target = resolve(out!);
  const parent = realpathSync(dirname(target));
  const checkout = realpathSync(process.cwd());
  const fromCheckout = relative(checkout, parent);
  check(fromCheckout === '..' || fromCheckout.startsWith('..' + (process.platform === 'win32' ? '\\' : '/')) || isAbsolute(fromCheckout), 'NBA20_OUTPUT_OUTSIDE_CHECKOUT');
  check(lstatSync(parent).isDirectory() && !lstatSync(dirname(target)).isSymbolicLink() && !existsSync(target), 'NBA20_FRESH_OUTPUT');
  mkdirSync(target);
  function put(name: string, value: unknown) {
    check(/^[a-z0-9_.-]+$/.test(name), 'NBA20_EVIDENCE_NAME');
    const bytes = encoded(value);
    if (bytes.length <= 65536) return saveFile(resolve(target, name + '.json'), bytes);
    const parts = [];
    for (let at = 0, n = 0; at < bytes.length; at += 65536, n += 1) {
      parts.push(saveFile(resolve(target, name + '.part-' + String(n).padStart(4, '0') + '.bin'), bytes.subarray(at, at + 65536)));
    }
    return saveFile(resolve(target, name + '.json'), encoded({ encoding: 'concatenated UTF8 JSON', bytes: bytes.length, sha256: sha(bytes), parts }));
  }
  return { target, put };
}

function readSave(): { raw: string | null; save: Saved | null } {
  const raw = localStorage.getItem(NBA_CAREER_SPORT.saveKey);
  if (raw === null) return { raw, save: null };
  const save = JSON.parse(raw) as Saved;
  check(!!save?.c && Array.isArray(save.c.seasons) && typeof save.phase === 'string', 'NBA20_ACTUAL_SAVE_SHAPE');
  check(['age', 'year', 'ovr', 'health', 'contractYears'].every(key => Number.isFinite(save.c[key as keyof Career])), 'NBA20_ACTUAL_SAVE_NUMBERS');
  return { raw, save };
}

function snapshot(container: HTMLElement, rngAt: number): Snapshot {
  return {
    ...readSave(), rngAt, text: container.textContent ?? '',
    buttons: within(container).queryAllByRole('button').map(node => ({
      text: node.textContent ?? '', disabled: (node as HTMLButtonElement).disabled,
    })),
  };
}
function evidence(s: Snapshot) {
  return { raw: s.raw, rngAt: s.rngAt, text: s.text, buttons: s.buttons };
}
function button(root: HTMLElement, name: string | RegExp) {
  const rows = within(root).queryAllByRole('button', { name });
  check(rows.length === 1 && !(rows[0] as HTMLButtonElement)?.disabled, 'NBA20_LEGAL_BUTTON');
  return rows[0] as HTMLButtonElement;
}
function selected(container: HTMLElement, selector: string, kind: string): Action | null {
  const node = container.querySelector<HTMLButtonElement>(selector);
  if (!node) return null;
  check(!node.disabled && !node.closest('[hidden],[aria-hidden="true"]'), 'NBA20_ENABLED_ACTION');
  return { kind, button: node };
}

function nextAction(container: HTMLElement): Action | null {
  let root = container.querySelector<HTMLElement>('[data-season-reveal]');
  if (root) return { kind: 'season-reveal', button: button(root, 'Continue') };
  root = container.querySelector<HTMLElement>('[data-career-decision-outcome]');
  if (root) return selected(root, '[data-decision-continue]', 'decision-outcome');
  root = container.querySelector<HTMLElement>('[data-rivalry-event]');
  if (root) return { kind: 'rivalry-beat', button: button(root, 'Continue') };
  root = container.querySelector<HTMLElement>('[data-rivalry-choice]');
  if (root) return root.querySelector('[data-rivalry-outcome]')
    ? { kind: 'rivalry-outcome', button: button(root, 'Continue') }
    : selected(root, '[data-rivalry-option="0"]', 'rivalry-choice-0');
  if (within(container).queryByRole('heading', { name: 'Is it time?' })) {
    return { kind: 'retirement-one-more', button: button(container, /One more year/) };
  }
  root = container.querySelector<HTMLElement>('[data-market-wheel]');
  if (root) return selected(root, '[data-market-skip]', 'market-skip')
    ?? selected(root, '[data-market-continue]', 'market-continue');
  root = container.querySelector<HTMLElement>('[data-extension-talk]');
  if (root) return selected(root, '[data-ext-decline]', 'extension-decline');
  root = container.querySelector<HTMLElement>('[data-fa-window]');
  if (root) {
    const offer = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-fa-sign]')).find(node => !node.disabled);
    check(!!offer, 'NBA20_SIGNABLE_OFFER');
    return { kind: 'freeagency-sign-first', button: offer! };
  }
  root = container.querySelector<HTMLElement>('[data-career-event]');
  if (root) {
    const id = root.getAttribute('data-career-event');
    const index = id === 'nbaB_farewellTour' || id === 'nbaB_retireHealthy' ? 1 : 0;
    return selected(root, '[data-career-decision-option="' + index + '"]', 'summer-' + id + '-option-' + index);
  }
  const saved = readSave().save;
  if (saved?.c.retired) return null;
  return { kind: 'play', button: button(container, /^Play the [0-9]{4} season$/) };
}

function created(s: Snapshot) {
  check(!!s.save && s.save.c.seasons.length === 0 && !s.save.c.retired && s.save.phase === 'season', 'NBA20_FRESH_ZERO_ROWS');
}
function history(before: Snapshot, after: Snapshot, kind: string) {
  check(!!before.save && !!after.save, 'NBA20_TRANSITION_SAVE');
  const a = before.save!.c, b = after.save!.c;
  const delta = b.seasons.length - a.seasons.length;
  check(JSON.stringify(b.seasons.slice(0, a.seasons.length)) === JSON.stringify(a.seasons), 'NBA20_HISTORY_PREFIX');
  const mayPlay = kind === 'play' || kind === 'extension-decline';
  check(mayPlay ? delta === 0 || delta === 1 : delta === 0, 'NBA20_LEGAL_ROW_GROWTH');
  if (kind === 'extension-decline') check(delta === 1, 'NBA20_DECLINE_PLAYS_ONCE');
  if (kind === 'play' && delta === 0) {
    check((after.save!.phase === 'extension' && a.contractYears === 1)
      || (after.save!.phase === 'freeagency' && a.contractYears <= 0), 'NBA20_PLAY_OPENS_REAL_TALK');
  }
  if (delta === 1) {
    check(b.year === a.year + 1 && b.age === a.age + 1, 'NBA20_ONE_REAL_YEAR');
    check(b.seasons[b.seasons.length - 1].year === a.year, 'NBA20_PLAYED_ROW_YEAR');
  }
  check(b.seasons.length <= 21, 'NBA20_ROW_BOUND');
}
function reloaded(before: Snapshot, after: Snapshot) {
  check(before.raw === after.raw, 'NBA20_RELOAD_SAVED_BYTES');
  check(!!before.save && !!after.save
    && JSON.stringify(before.save.c) === JSON.stringify(after.save.c)
    && JSON.stringify(before.save.contractTalk) === JSON.stringify(after.save.contractTalk), 'NBA20_RELOAD_CAREER_AND_TALK');
}
async function landed(container: HTMLElement) {
  await waitFor(() => {
    check(!within(container).queryAllByRole('status').some(node => /Loading|Counting the Hall votes/.test(node.textContent ?? '')), 'NBA20_REAL_COMPONENT_READY');
  }, { timeout: 3000 });
}

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe.skipIf(!process.env.NBA_SEASON20_PROGRESSION_OUT)('NBA fresh-board season progression diagnostic', () => {
  it('records eight legal seeded careers without fabricating a season-twenty state', async () => {
    const output = writer();
    const start = performance.now(), limit = start + 210000;
    const seeds = Array.from({ length: 8 }, (_, n) => 'nba20-progression:' + n);
    const episodes: Episode[] = [], references: unknown[] = [];
    const controlFoundations: { creation?: Snapshot; prefix?: { before: Snapshot; after: Snapshot }; reload?: { before: Snapshot; after: Snapshot }; row?: Record<string, unknown> } = {};
    let failure: unknown = null;
    vi.setSystemTime(new Date('2026-10-27T00:00:00.000Z'));
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.stubGlobal('matchMedia', vi.fn(query => ({
      matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: () => false,
    })));
    // Entropy not accounted for by this plan is a harness limit, not a gameplay finding.
    if (globalThis.crypto?.randomUUID) vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => { throw new Error('NBA20_UNBOUND_CRYPTO_ENTROPY'); });
    if (globalThis.crypto?.getRandomValues) vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(() => { throw new Error('NBA20_UNBOUND_CRYPTO_ENTROPY'); });
    const random = vi.spyOn(Math, 'random');

    for (let seedIndex = 0; seedIndex < seeds.length; seedIndex += 1) {
      const seed = seeds[seedIndex], id = 'seed-' + seedIndex;
      const draws: number[] = [], stream = keyedRng(seed);
      random.mockImplementation(() => { const value = stream(); draws.push(value); return value; });
      localStorage.clear();
      let view: ReturnType<typeof render> | null = null;
      const episode: Episode = { seed, actions: 0, outcome: 'RUNNING', rows: 0, reached20: false, reloads: [], encounteredCopy: [], finalRaw: null };
      const reloadRows = new Set<number>();
      try {
        view = render(<MemoryRouter><UsCareerBoard sport={NBA_CAREER_SPORT} /></MemoryRouter>);
        await landed(view.container);
        let before = snapshot(view.container, draws.length);
        check(before.raw === null && !!within(view.container).queryByText('Create your player', { exact: true }), 'NBA20_REAL_FRESH_BOARD');
        references.push(output.put(id + '.initial', evidence(before)));
        const enter = button(view.container, 'Enter the draft');
        await act(async () => { fireEvent.click(enter); });
        await landed(view.container);
        let current = snapshot(view.container, draws.length);
        episode.actions += 1;
        references.push(output.put(id + '.action-0001', { kind: 'enter-draft', before: evidence(before), after: evidence(current), rng: draws.slice(before.rngAt, current.rngAt) }));
        created(current);
        controlFoundations.creation ??= current;

        while (true) {
          check(performance.now() < limit, 'NBA20_TOTAL_PROCESS_BUDGET');
          current = snapshot(view.container, draws.length);
          check(!!current.save, 'NBA20_CURRENT_CAREER');
          episode.rows = current.save!.c.seasons.length;
          episode.reached20 ||= episode.rows >= 20;
          if (episode.rows === 21 && !current.save!.c.retired) {
            episode.outcome = 'ROW_LIMIT_REACHED_ACTIVE';
            break;
          }
          const action = nextAction(view.container);
          if (!action) {
            check(current.save!.c.retired && !!within(view.container).queryByText(current.save!.c.name + ' retires', { exact: true }), 'NBA20_ACTUAL_RETIRED_OUTCOME');
            episode.outcome = episode.reached20 ? 'REACHED_20_THEN_RETIRED' : 'EARLY_RETIRED';
          }
          const settled = !action || (action.kind === 'play' && current.save!.phase === 'season' && !current.save!.c.summer);
          if (settled && (episode.rows === 19 || episode.rows === 20 || !action) && !reloadRows.has(episode.rows)) {
            check(episode.actions < 512, 'NBA20_ACTION_BOUND');
            const stable = current;
            view.unmount();
            view = render(<MemoryRouter><UsCareerBoard sport={NBA_CAREER_SPORT} /></MemoryRouter>);
            await landed(view.container);
            const after = snapshot(view.container, draws.length);
            episode.actions += 1;
            references.push(output.put(id + '.action-' + String(episode.actions).padStart(4, '0'), {
              kind: 'reload-actual-settled-save', before: evidence(stable), after: evidence(after), rng: draws.slice(stable.rngAt, after.rngAt),
            }));
            reloaded(stable, after);
            controlFoundations.reload ??= { before: stable, after };
            reloadRows.add(episode.rows);
            episode.reloads.push({ rows: episode.rows, phase: stable.save!.phase, retired: stable.save!.c.retired });
            current = after;
            if (!action) break;
            continue;
          }
          if (!action) break;
          check(episode.actions < 512, 'NBA20_ACTION_BOUND');
          before = current;
          const copy = view.container.querySelector<HTMLElement>('[data-extension-talk]');
          if (copy) {
            const held = before.save?.contractTalk as { kind?: string; talk?: { offer?: unknown; pulled?: boolean } } | undefined;
            const branch = held?.kind !== 'extension' ? 'unclassified'
              : held.talk?.offer ? 'offered' : held.talk?.pulled ? 'withdrawn' : 'opening-null';
            episode.encounteredCopy.push({ atRows: episode.rows, branch, kind: 'actual-extension-screen', text: copy.textContent });
          }
          const at = draws.length;
          await act(async () => { fireEvent.click(action.button); });
          await landed(view.container);
          const after = snapshot(view.container, draws.length);
          episode.actions += 1;
          references.push(output.put(id + '.action-' + String(episode.actions).padStart(4, '0'), {
            kind: action.kind, buttonText: action.button.textContent, before: evidence(before), after: evidence(after), rng: draws.slice(at),
          }));
          history(before, after, action.kind);
          if (after.save!.c.seasons.length > before.save!.c.seasons.length) {
            controlFoundations.row ??= after.save!.c.seasons[0];
            if (before.save!.c.seasons.length) controlFoundations.prefix ??= { before, after };
          }
          check(before.raw !== after.raw || before.text !== after.text, 'NBA20_ACTION_MAKES_PROGRESS');
        }
      } catch (error) {
        episode.outcome = 'STOPPED_WITH_DIAGNOSTIC_ERROR';
        failure = error;
        references.push(output.put(id + '.failure', { message: String(error), stack: error instanceof Error ? error.stack : null, at: { raw: localStorage.getItem(NBA_CAREER_SPORT.saveKey), rngAt: draws.length, text: view?.container.textContent ?? null } }));
      } finally {
        episode.finalRaw = localStorage.getItem(NBA_CAREER_SPORT.saveKey);
        try {
          const actual = JSON.parse(episode.finalRaw ?? 'null') as Saved | null;
          if (Array.isArray(actual?.c?.seasons)) episode.rows = actual.c.seasons.length;
        } catch { /* The failure snapshot retains unreadable storage without repairing it. */ }
        episode.reached20 ||= episode.rows >= 20;
        references.push(output.put(id + '.rng', { seed, values: draws, cursor: draws.length }));
        references.push(output.put(id + '.outcome', episode));
        view?.unmount(); cleanup();
        episodes.push(episode);
      }
      if (failure) break;
    }

    try {
      if (!failure) {
      // These alter physical copied evidence only, never the board's storage or career.
      const f = controlFoundations;
      check(!!f.creation && !!f.prefix && !!f.reload && !!f.row, 'NBA20_CONTROL_ACTUAL_FOUNDATIONS');
      const controls = [
        { name: 'creation-rows', marker: 'NBA20_FRESH_ZERO_ROWS', seed: f.creation!, mutate: (copy: Snapshot) => { copy.save!.c.seasons = [f.row!]; copy.raw = JSON.stringify(copy.save); }, judge: (copy: Snapshot) => created(copy) },
        { name: 'history-prefix', marker: 'NBA20_HISTORY_PREFIX', seed: f.prefix!.after, mutate: (copy: Snapshot) => { copy.save!.c.seasons[0].year = Number(copy.save!.c.seasons[0].year) + 1; copy.raw = JSON.stringify(copy.save); }, judge: (copy: Snapshot) => history(f.prefix!.before, copy, 'play') },
        { name: 'extra-row', marker: 'NBA20_LEGAL_ROW_GROWTH', seed: f.prefix!.after, mutate: (copy: Snapshot) => { copy.save!.c.seasons.push(f.row!); copy.raw = JSON.stringify(copy.save); }, judge: (copy: Snapshot) => history(f.prefix!.before, copy, 'play') },
        { name: 'saved-year', marker: 'NBA20_ONE_REAL_YEAR', seed: f.prefix!.after, mutate: (copy: Snapshot) => { copy.save!.c.year += 1; copy.raw = JSON.stringify(copy.save); }, judge: (copy: Snapshot) => history(f.prefix!.before, copy, 'play') },
        { name: 'reload-row', marker: 'NBA20_RELOAD_SAVED_BYTES', seed: f.reload!.after, mutate: (copy: Snapshot) => { const saved = JSON.parse(copy.raw!) as Saved; saved.c.seasons.push(f.row!); copy.raw = JSON.stringify(saved); copy.save = saved; }, judge: (copy: Snapshot) => reloaded(f.reload!.before, copy) },
      ];
      for (const control of controls) {
        const path = resolve(output.target, 'control-' + control.name + '.work.json');
        const original = encoded(control.seed);
        check(original.length <= 102400, 'NBA20_CONTROL_LEAF_BOUND');
        saveFile(path, original);
        control.judge(JSON.parse(readFileSync(path, 'utf8')) as Snapshot);
        const changed = JSON.parse(original.toString('utf8')) as Snapshot;
        control.mutate(changed);
        const bytes = encoded(changed);
        check(!bytes.equals(original), 'NBA20_CONTROL_CHANGED');
        references.push(output.put('control-' + control.name + '.before', control.seed));
        let owned = false;
        try {
          saveFile(path, bytes, false);
          references.push(output.put('control-' + control.name + '.changed', changed));
          try { control.judge(JSON.parse(readFileSync(path, 'utf8')) as Snapshot); }
          catch (error) {
            owned = error instanceof Error && error.name === 'AssertionError' && error.message.includes(control.marker);
            references.push(output.put('control-' + control.name + '.diagnostic', { name: error instanceof Error ? error.name : null, message: String(error), stack: error instanceof Error ? error.stack : null }));
          }
          check(owned, 'NBA20_CONTROL_OWNED_FAILURE');
        } finally {
          saveFile(path, original, false);
          const restored = JSON.parse(readFileSync(path, 'utf8')) as Snapshot;
          references.push(output.put('control-' + control.name + '.restored', restored));
          control.judge(restored);
        }
      }
      }
    } catch (error) {
      failure = error;
      references.push(output.put('control-failure', { message: String(error), stack: error instanceof Error ? error.stack : null }));
    }
    const summary = {
      status: failure ? 'DIAGNOSTIC_ERROR' : episodes.some(episode => episode.reached20) ? 'OBSERVED_REAL_20_ROW_BOUNDARY' : 'NOT_REACHED',
      plannedSeeds: seeds, completedSeeds: episodes.map(episode => episode.seed), unrunSeeds: seeds.slice(episodes.length),
      boundaryReloadCoverage: episodes.map(episode => ({ seed: episode.seed, reached19: episode.rows >= 19, reached20: episode.reached20, actualReloads: episode.reloads })),
      episodes, references, fixedDate: '2026-10-27T00:00:00.000Z', clock: 'Real timers and monotonic budget; Date fixed',
      scope: 'Real board jsdom-exposed/enabled controls and state progression only. No actual browser geometry, CSS/overlay hit testing, phone clipping, user-save reproduction, offer guarantee or bug-fixed claim.',
      copyCoverage: 'Only encountered actual extension text is retained; no new copy assertions or fabricated branches.',
      copyBranchesObserved: Array.from(new Set(episodes.flatMap(episode => episode.encounteredCopy.map(row => String(row.branch))))),
      copyBranchesUntested: ['opening-null', 'offered', 'withdrawn'].filter(branch => !episodes.some(episode => episode.encounteredCopy.some(row => row.branch === branch))),
      auxiliaryRngLimit: 'All global Math.random values are retained. Internal keyed streams are bound by exact source and actual save salts, not intercepted.',
    };
    output.put('summary', summary);
    console.log('NBA20_PROGRESSION_RESULT ' + JSON.stringify({ status: summary.status, seeds: episodes.length, reached20: episodes.filter(episode => episode.reached20).map(episode => episode.seed) }));
    if (failure) throw failure;
    check(episodes.length === 8, 'NBA20_COMPLETE_SEED_CENSUS');
  }, 240000);
});

