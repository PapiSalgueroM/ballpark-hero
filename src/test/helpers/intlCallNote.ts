/* Round 1557 (critic-1541 correction 9, BINDING): every test that plants or plays an NBA career says whether its
 * careers met the national team's call. The call is a beat of its own between seasons (Rounds 1541 and 1544), so a
 * later change to its bar (INTL_CALL_UP_OVR in src/lib/nbaCareerIntlGate.ts) can put a call in front of a test that
 * never met one, or take one away, and the test would then be testing something else without saying so. With this
 * line in its output the change shows the first time the test runs.
 *
 * noteIntlCalls('<file>') at the top of a test file registers its hooks. For each test it reads:
 *   - the NBA career saves of the test: every one written through Storage.prototype.setItem while the test runs
 *     (a test whose own spy writes past it is still read below), and the one the test leaves in localStorage, each
 *     with the gate's own nbaIntlPendingYear: how many of them meet a call;
 *   - the screen: how many times the call's card ([data-intl-call]) and the curtain line announcing it arrived.
 * It prints one line for the file when it ends, and one for each test that met the call; it asserts nothing, writes
 * nothing and draws no random number.
 *
 * noteIntlCareers(what, careers) is the same print for a test that builds NBA careers without a board. */
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { NBA_INTL_CURTAIN_LINE, nbaIntlPendingYear } from '@/lib/nbaCareerIntlGate';

const NBA_SAVE_KEY = 'nba-my-career-save-v1';

/** true or false for a save holding a career, null for anything else (a prospect, a cleared slot, a bad string). */
function meetsCall(raw: string | null): boolean | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as { c?: unknown } | null;
    return s && typeof s === 'object' && s.c ? nbaIntlPendingYear(s.c as never) !== null : null;
  } catch { return null; }
}

export function noteIntlCareers(what: string, careers: unknown[]): void {
  const met = careers.filter(c => c && nbaIntlPendingYear(c as never) !== null).length;
  console.log(`note ${what}: ${careers.length} NBA careers, ${met} of them meeting the national team's call`);
}

export function noteIntlCalls(file: string): void {
  const seen = new Map<string, boolean>();
  let calls = 0;
  let curtains = 0;
  let observer: MutationObserver | null = null;
  let original: Storage['setItem'] | null = null;
  const total = { tests: 0, saves: 0, met: 0, calls: 0, curtains: 0 };
  const read = (raw: string | null) => { const m = meetsCall(raw); if (m !== null && raw) seen.set(raw, m); };
  /* Wrapped once for the file, so a test's own spy on setItem sits on top of it and restores back to it. */
  beforeAll(() => {
    const own = Storage.prototype.setItem;
    original = own;
    Storage.prototype.setItem = function setItem(this: Storage, key: string, value: string) {
      if (key === NBA_SAVE_KEY) read(String(value));
      return own.call(this, key, value);
    };
  });
  afterAll(() => {
    if (original) Storage.prototype.setItem = original;
    original = null;
    console.log(`note ${file}: ${total.tests} tests, ${total.saves} NBA career saves read (written or left by a test), ${total.met} of them meeting the national team's call; the call on screen ${total.calls} times, its curtain line ${total.curtains}`);
  });
  beforeEach(() => {
    seen.clear(); calls = 0; curtains = 0;
    let call = false;
    let line = false;
    observer = new MutationObserver(() => {
      const callNow = !!document.querySelector('[data-intl-call]');
      const lineNow = !!document.querySelector('[data-season-reveal]')?.textContent?.includes(NBA_INTL_CURTAIN_LINE);
      if (callNow && !call) calls += 1;
      if (lineNow && !line) curtains += 1;
      call = callNow;
      line = lineNow;
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  afterEach(ctx => {
    observer?.disconnect();
    observer = null;
    try { read(Storage.prototype.getItem.call(localStorage, NBA_SAVE_KEY)); } catch { /* a test that took storage away */ }
    const met = [...seen.values()].filter(Boolean).length;
    total.tests += 1; total.saves += seen.size; total.met += met; total.calls += calls; total.curtains += curtains;
    if (met || calls || curtains) {
      console.log(`note ${file} > ${ctx.task.name}: ${seen.size} NBA career saves read, ${met} meeting the national team's call; the call on screen ${calls} times, its curtain line ${curtains}`);
    }
  });
}
