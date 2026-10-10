import { CONTINUE_SAVES, type ContinueSave, type SavePath } from '@/data/continueSaves';
import {
  BACKUPS_KEPT, BROKEN_SAVE_MARK, backupKeysOf, browserStorage, copyAside, dismissBackup, type ListableStorage,
} from '@/lib/brokenSaveRecovery';
import { getStorageTrouble, settlePendingSaves } from '@/lib/safeStorage';

/**
 * Round 1219: a put back that survives, and a copy before a game refuses or
 * replaces an old save.
 *
 * WHY THIS EXISTS. Round 958's card ("Put that save back") swapped the saves
 * in the open page and then loaded the game's address. Measured in a real
 * Chromium by scripts/playSaveKeeper.mjs on the build before this round: on
 * every long game that keeps its game in memory and writes it as the page
 * leaves, that leaving write landed AFTER the swap, on top of the save that
 * had just been put back, and the swap had already removed the backup it came
 * from. The career the player asked for was then in no key at all.
 *
 * THE RULE THAT FIXES IT: a save is never written under a live page, on any
 * route. A put back is STAGED (one small journal record), the page is
 * replaced by a full load of the game's own address, and the swap is made by
 * runSaveKeeper() in src/main.tsx before React mounts, when no game is in
 * memory and every leaving write of the old page has already landed. There is
 * no second path that applies at once: one of this site's saves is mounted on
 * a second route (the academy on the Stadium Tycoon page), so "this route
 * does not hold that game" is not a thing a list can know.
 *
 * WHAT THE SWAP PROMISES, at every moment and across a crash at any storage
 * call (scripts/simSaveKeeper.mjs walks every one):
 *   - The game's key is never emptied. The old save is COPIED aside
 *     (copyAside), the copy is read back, and only then is the key written
 *     over. If the copy cannot be written the key is left exactly as it was
 *     and the card says so.
 *   - Nothing is deleted to make room, and the backup a put back came from is
 *     NOT removed: with the same game open in a second tab, that tab's own
 *     timer can write over the key after the swap, and the backup is then the
 *     only copy of the career that was asked for. A backup that is byte equal
 *     to the save now at the key does not count toward the three a game keeps,
 *     so a put back at the cap still drops nothing.
 *   - "Already done" is answered from the journal alone (it carries the
 *     length and a sum of the save it stages), so a crash after the write and
 *     before the tidy up is finished on the next load, not reported as a
 *     failure.
 *   - A journal that waited is never applied. A record older than
 *     STAGED_FOR_MS, or stamped in the future, is removed and nothing is
 *     changed: a put back landing over days of newer play is not what was
 *     asked for.
 *
 * THE COPY BEFORE A VERSION STEP. Ten of the long games write a version
 * number inside the save (SAVE_VERSIONS below says where, and what the game
 * does with another number). At boot, a held save of a game that REFUSES or
 * MIGRATES another version, whose own number is not the one this build
 * writes, is copied aside once before any game code reads it. Three of those
 * games then write a fresh game over a save they refused, with no press, so
 * without the copy the old bytes were gone five seconds after the page
 * opened. What this does NOT cover, said plainly: the eleven games with no
 * version in the save (Soccer Career among them) change their saves by
 * repair on load and get no copy here, and a game's parked or second keys are
 * not looked at.
 *
 * AN ORDINARY BOOT WRITES NOTHING. With no journal and every held save at its
 * current version the keeper reads the journal key and the keys of the games
 * that act on a version, and that is all. Three committed browser checks pin
 * the writes a page load makes, and a write on every load would fire a
 * storage event in every other open tab.
 *
 * Never throws. Every storage call is inside a try in its own function, and
 * none goes through safeSetItem, so a copy that did not fit can never turn on
 * the site's "Storage is full" line while the games' own saves still fit.
 */

/** Where a staged put back waits for the next load. Not a game's save key. */
export const PENDING_RESTORE_KEY = 'dukb-save-pending';
/** How long a staged put back stays good. The load it waits for takes seconds. */
export const STAGED_FOR_MS = 5 * 60 * 1000;
/** A clock that stepped back between the press and the load is forgiven this much. */
const CLOCK_SLACK_MS = 60 * 1000;

export type KeeperRefusal = 'blocked' | 'no-room' | 'gone' | 'stale';
/** What the last staged put back did, for the card on that game's page. */
export interface KeeperOutcome { path: string; ok: boolean; why?: KeeperRefusal; kept?: boolean }

/**
 * What a game does when its save holds a version number other than the one
 * it writes: 'refuses' (the save is treated as no save), 'migrates' (older
 * shapes are brought up to date, anything else is refused), or 'ignores' (the
 * number is written and never read).
 */
export type OtherVersion = 'refuses' | 'migrates' | 'ignores';
export interface SaveVersionRow {
  /** Where the whole number sits inside the save. */
  at: SavePath;
  /** The number this build writes. */
  current: number;
  /** The oldest number the game's own loader still opens. */
  oldest: number;
  other: OtherVersion;
}

/**
 * The ten long games whose save holds its own version, keyed by route. Read
 * in each engine and held to it by scripts/simSaveKeeper.mjs: a real save of
 * every row holds exactly `current` at `at`, a real save of every other long
 * game holds no version number at its top level or one level down, and where
 * the game exports a pure loader the row's `other` and `oldest` must agree
 * with what that loader answers for a save one version down. Club Manager's
 * number also lives in src/lib/clubManager.ts (SAVE_VERSION) and in
 * src/lib/clubManagerSlots.ts; this table is the third place, and the
 * harness is what holds it to the first.
 */
export const SAVE_VERSIONS: Readonly<Record<string, SaveVersionRow>> = {
  '/club-manager': { at: ['saveVersion'], current: 3, oldest: 3, other: 'refuses' },
  '/rebuild': { at: ['v'], current: 2, oldest: 1, other: 'migrates' },
  '/stadium-tycoon': { at: ['v'], current: 1, oldest: 1, other: 'refuses' },
  '/wonderkid-factory': { at: ['v'], current: 1, oldest: 1, other: 'refuses' },
  '/hall-of-champions': { at: ['v'], current: 1, oldest: 1, other: 'refuses' },
  '/aussie-rules-manager': { at: ['version'], current: 2, oldest: 2, other: 'refuses' },
  '/idle-arena': { at: ['v'], current: 1, oldest: 1, other: 'ignores' },
  '/fight-career': { at: ['st', 'version'], current: 1, oldest: 1, other: 'ignores' },
  '/fight-gym': { at: ['g', 'version'], current: 1, oldest: 1, other: 'ignores' },
  '/fight-promoter': { at: ['st', 'version'], current: 1, oldest: 1, other: 'ignores' },
};

/** A sum of a save's text (FNV-1a over its code units), kept beside its length in the journal. */
export function sumOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The whole number a save holds at a path, or null. Never throws. */
export function versionIn(raw: string, at: SavePath): number | null {
  let cur: unknown;
  try { cur = JSON.parse(raw); } catch { return null; }
  for (const step of at) {
    if (cur === null || typeof cur !== 'object' || Array.isArray(cur)) return null;
    if (!Object.prototype.hasOwnProperty.call(cur, step)) return null;
    cur = (cur as Record<string, unknown>)[step];
  }
  return typeof cur === 'number' && Number.isInteger(cur) ? cur : null;
}

/** True when a kept aside backup of this game already holds exactly this text. */
function heldAside(entry: ContinueSave, storage: ListableStorage, text: string): boolean {
  for (const k of backupKeysOf(entry, storage)) {
    try { if (storage.getItem(k) === text) return true; } catch { return false; }
  }
  return false;
}

interface Staged { v: 1; path: string; backupKey: string; at: number; len: number; sum: number }

function forget(storage: ListableStorage): void {
  try { storage.removeItem(PENDING_RESTORE_KEY); } catch { /* the next load meets it again */ }
}

/** The journal record and its game, 'none' when there is none, 'junk' for anything else. */
function readStaged(storage: ListableStorage): { rec: Staged; entry: ContinueSave } | 'none' | 'junk' {
  let raw: string | null;
  try { raw = storage.getItem(PENDING_RESTORE_KEY); } catch { return 'none'; }
  if (raw === null) return 'none';
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return 'junk'; }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return 'junk';
  const o = parsed as Record<string, unknown>;
  const whole = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;
  if (o.v !== 1 || typeof o.path !== 'string' || typeof o.backupKey !== 'string' || !whole(o.at) || !whole(o.len) || !whole(o.sum)) return 'junk';
  const entry = CONTINUE_SAVES.find(e => e.path === o.path);
  if (!entry || !o.backupKey.startsWith(`${entry.saveKey}${BROKEN_SAVE_MARK}`)) return 'junk';
  return { rec: { v: 1, path: o.path, backupKey: o.backupKey, at: o.at, len: o.len, sum: o.sum }, entry };
}

/**
 * Stages a put back of one kept aside backup: one journal record, read back.
 * Nothing else is written and the game's key is not touched. Never throws.
 */
export function stageRestore(entry: ContinueSave, backupKey: string, storage: ListableStorage | null, now: Date = new Date()): { ok: true } | { ok: false; why: KeeperRefusal } {
  if (!storage) return { ok: false, why: 'blocked' };
  if (!backupKey.startsWith(`${entry.saveKey}${BROKEN_SAVE_MARK}`)) return { ok: false, why: 'gone' };
  let raw: string | null;
  try { raw = storage.getItem(backupKey); } catch { return { ok: false, why: 'blocked' }; }
  if (raw === null) return { ok: false, why: 'gone' };
  const rec: Staged = { v: 1, path: entry.path, backupKey, at: now.getTime(), len: raw.length, sum: sumOf(raw) };
  const text = JSON.stringify(rec);
  try {
    storage.setItem(PENDING_RESTORE_KEY, text);
    if (storage.getItem(PENDING_RESTORE_KEY) !== text) throw new Error('journal did not read back');
  } catch {
    forget(storage);
    return { ok: false, why: 'no-room' };
  }
  return { ok: true };
}

/**
 * After the key has read back: the cap, and the card's quiet. A backup that
 * is byte equal to the save now at the key is not counted and never dropped
 * here, and neither is the copy this swap just made, so a put back deletes
 * nothing it was not told to. When the newest backup IS the save now being
 * played, the card is told it was answered, or it would offer the player the
 * game he is already in on every visit.
 */
function tidy(entry: ContinueSave, storage: ListableStorage, made: string | null, playing: string): void {
  const counted: string[] = [];
  let newestIsPlaying = false;
  const keys = backupKeysOf(entry, storage);
  for (let i = 0; i < keys.length; i += 1) {
    let text: string | null;
    try { text = storage.getItem(keys[i]); } catch { return; }
    if (text === playing) { if (i === 0) newestIsPlaying = true; continue; }
    if (keys[i] !== made) counted.push(keys[i]);
  }
  for (const k of counted.slice(BACKUPS_KEPT - (made ? 1 : 0))) {
    try { storage.removeItem(k); } catch { /* left in place, harmless */ }
  }
  if (newestIsPlaying) dismissBackup(entry, keys[0], storage);
}

/**
 * Applies the staged put back, if one is waiting. Called before React mounts
 * (runSaveKeeper), so no game is in memory. Returns what happened, or null
 * when nothing was staged. See the header for what it promises. Never throws.
 */
export function applyPending(storage: ListableStorage | null, now: Date = new Date()): KeeperOutcome | null {
  if (!storage) return null;
  const staged = readStaged(storage);
  if (staged === 'none') return null;
  if (staged === 'junk') { forget(storage); return null; }
  const { rec, entry } = staged;
  const done = (ok: boolean, extra: Partial<KeeperOutcome> = {}): KeeperOutcome => {
    forget(storage);
    return { path: entry.path, ok, ...extra };
  };
  const age = now.getTime() - rec.at;
  if (age > STAGED_FOR_MS || age < -CLOCK_SLACK_MS) return done(false, { why: 'stale' });

  const isStaged = (t: string): boolean => t.length === rec.len && sumOf(t) === rec.sum;
  let cur: string | null;
  let incoming: string | null;
  try {
    cur = storage.getItem(entry.saveKey);
    incoming = storage.getItem(rec.backupKey);
  } catch {
    /* A store that stopped answering: nothing is removed on a read failure. */
    return { path: entry.path, ok: false, why: 'blocked' };
  }
  /* Already done, answered from the journal alone: a crash after the write. */
  if (cur !== null && isStaged(cur)) {
    tidy(entry, storage, null, cur);
    return done(true);
  }
  if (incoming === null || !isStaged(incoming)) return done(false, { why: 'gone' });

  let made: string | null = null;
  let kept = false;
  if (cur !== null) {
    if (heldAside(entry, storage, cur)) {
      /* A crash after the copy must not stack a second one. */
      kept = true;
    } else {
      const copied = copyAside(entry, storage, now);
      if (!copied.ok) return done(false, { why: 'no-room' });
      made = copied.backupKey;
      kept = made !== null;
    }
  }
  try {
    /* Written OVER the old save: the key is never removed, so it is never empty. */
    storage.setItem(entry.saveKey, incoming);
    if (storage.getItem(entry.saveKey) !== incoming) throw new Error('put back did not read back');
  } catch {
    /* A write that throws leaves the old save at the key. Only when it is
       really still there is the copy just made taken back out. */
    let still: string | null = null;
    try { still = storage.getItem(entry.saveKey); } catch { still = null; }
    if (made && still === cur) { try { storage.removeItem(made); } catch { /* a spare copy is harmless */ } }
    return done(false, { why: 'no-room' });
  }
  tidy(entry, storage, made, incoming);
  return done(true, { kept });
}

/**
 * The copy before a version step (see the header). For every game that acts
 * on its save's version: a held save whose number is not the one this build
 * writes is copied aside once, unless a backup already holds the same bytes.
 * Nothing is pruned (no press asked for this) and the copy is marked as
 * answered, so the card does not offer back a save this build would refuse
 * again. Returns how many copies were made. Never throws.
 */
export function keepUpdateCopies(storage: ListableStorage | null, now: Date = new Date()): number {
  if (!storage) return 0;
  let made = 0;
  for (const entry of CONTINUE_SAVES) {
    const row = Object.prototype.hasOwnProperty.call(SAVE_VERSIONS, entry.path) ? SAVE_VERSIONS[entry.path] : undefined;
    if (!row || row.other === 'ignores') continue;
    let raw: string | null;
    try { raw = storage.getItem(entry.saveKey); } catch { continue; }
    if (raw === null) continue;
    const held = versionIn(raw, row.at);
    if (held === null || held === row.current) continue;
    if (heldAside(entry, storage, raw)) continue;
    const copied = copyAside(entry, storage, now);
    if (copied.ok && copied.backupKey) {
      dismissBackup(entry, copied.backupKey, storage);
      made += 1;
    }
  }
  return made;
}

/* What the last staged put back did. Held in memory, not in storage: the card
   that shows it mounts in the same page load that applied it. */
let lastOutcome: KeeperOutcome | null = null;

/** src/main.tsx calls this once, before React mounts. Never throws. */
export function runSaveKeeper(): void {
  try {
    /* A store that dies with the page has nothing to keep. */
    if (getStorageTrouble() === 'blocked') return;
    const storage = browserStorage();
    if (!storage) return;
    const outcome = applyPending(storage);
    if (outcome) lastOutcome = outcome;
    keepUpdateCopies(storage);
  } catch { /* the keeper must never stop the app from mounting */ }
}

/** The outcome of a put back for the game on this route, once. */
export function takeOutcome(pathname: string): KeeperOutcome | null {
  const route = (pathname.split(/[?#]/)[0] || '/').replace(/\/+$/, '') || '/';
  if (!lastOutcome || lastOutcome.path !== route) return null;
  const out = lastOutcome;
  lastOutcome = null;
  return out;
}

/**
 * The one call the card makes for "Put that save back". It only ever STAGES;
 * the caller then calls reopenGame(entry.path) and the next load applies it.
 * A save a game could not write and is still holding is retried first (Round
 * 1144's rule for anything that reloads on the app's own account), so the
 * game that gets kept aside is the game as last played, not as last written.
 */
export function restoreNow(entry: ContinueSave, backupKey: string): { ok: true } | { ok: false; why: KeeperRefusal } {
  if (getStorageTrouble() === 'blocked') return { ok: false, why: 'blocked' };
  if (!settlePendingSaves()) return { ok: false, why: 'no-room' };
  return stageRestore(entry, backupKey, browserStorage());
}

/**
 * A full load of the game's own address that leaves no way back into the
 * page that held the old game: replace, not assign. With assign that page is
 * one Back press away, and a browser that kept it alive would bring it back
 * with its save timer running.
 */
export function reopenGame(path: string): void {
  window.location.replace(path);
}
