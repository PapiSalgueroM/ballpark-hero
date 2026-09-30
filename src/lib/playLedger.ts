import { supabase } from '@/integrations/supabase/client';
import { recordGameCompletion as recordStreakCompletion, getEtDateString, getStreakState } from '@/lib/streaks';
import { knownCap, primeScoreCaps } from '@/lib/scoreCaps';
import { getCurrentPlayerName, bumpLocalTodayCount, remintGuestHandle } from '@/lib/completions';
import { pointsRuleFor } from '@/data/pointsFamilies';
import { dealVersionFor } from '@/lib/dealVersion';
import { publishOutcome } from '@/lib/ledgerOutcome';

/**
 * Round 679: THE ONE WRITER OF PLAYS. docs/design/POINTS-ECONOMY-V2.md
 * sections 5, 6 and 8.
 *
 * Every row a game sends to the board and every call to the door goes through
 * this file, and nothing else in src inserts into game_completions, writes an
 * account table or calls record_play (scripts/simOneDoor.mjs holds that, read
 * as code). Four doors, one per kind of moment:
 *
 *   recordActivity(path)  a mid run ping from a sim (a match, a simulated
 *                         week): one unscored board row so Most Played Today
 *                         sees live play, and today's games. No score: the
 *                         parameter is gone, so tsc refuses a scored ping.
 *                         Club Manager's pings wrote about 56,000 mid season
 *                         scored rows a week onto the board through it (R2.D4).
 *   recordPlay(path)      a finish that is a play and never a record (a free
 *                         run: Unlimited, free play, a new season, versus):
 *                         one unscored board row under the name it is handed,
 *                         the local streak day and today's games. No score.
 *   claimRun(path)        the claim moment of a game whose ranked go is spent
 *                         at the start (section 8: the first scored action on a
 *                         shared daily, the deal of a fresh deal game). A
 *                         signed in player's claim goes to the door as a start.
 *   recordCompletion(path, score, name, correct)
 *                         a finish that may be the day's ranked result.
 *
 * WHICH FINISH IS RANKED. One ranked result per game per Eastern day (rule 5).
 * This browser keeps a small run record (dukb-ledger-v1): today's run per
 * game, claimed at the claim moment when the page says when that is, else at
 * the finish, and settled by the first finish. A later finish the same day is
 * practice. A run claimed yesterday and still open within 24 hours keeps its
 * day, so a daily finished just after midnight counts for the day it was dealt.
 *
 *   SIGNED OUT: a ranked finish inserts the board row tagged with score_scale
 *   (the game's scale from src/data/pointsFamilies.ts, null while it does not
 *   pay) and ranked_day (the run's day). A practice finish inserts an unscored
 *   row. The board counts at most one day's worth per name per game per day.
 *
 *   SIGNED IN: the finish goes to the door, record_play, with the run id; the
 *   door holds the claim on the server and names and writes the board row, so
 *   this file inserts nothing for a signed in finish. The door's answer is
 *   what the card says. A start the network dropped costs nothing: the finish
 *   claims at finish, idempotent by run id.
 *
 * What the card says comes from publishOutcome (src/lib/ledgerOutcome.ts),
 * which src/components/game/UnrankedNote.tsx reads: nothing on a ranked
 * finish, the practice line and its reason otherwise.
 *
 * A REFUSED NAME. Since economy step E3 the board refuses a row under a name
 * another account owns. A guest whose stored handle is refused for that
 * reason (the door's own name_is_owned says so) gets a fresh handle, once, and
 * the row is sent again under it. Nothing is retried twice.
 *
 * WHAT THIS FILE LEAVES ALONE. The browser's own tally (src/lib/streaks.ts and
 * src/lib/pointsRule.ts, Round 648) is credited exactly as before, practice or
 * not: it is private, ranks nothing, and Round 690 removes it. What a game
 * scores is the game's business (Rounds 681 to 687).
 *
 * Every write here is fire and forget: a failure is logged at debug level and
 * never reaches the player, and never makes a second row.
 */

const LEDGER_KEY = 'dukb-ledger-v1';
const DAY_MS = 24 * 60 * 60 * 1000;

/** One game's run on one Eastern day, in this browser. */
interface RunEntry {
  run: string;
  claimedAt: number;
  settled: boolean;
  dealVersion: number;
}
interface LedgerRecord {
  v: 1;
  days: Record<string, Record<string, RunEntry>>;
}

/** What the board takes from a signed out browser: exactly these keys. */
type BoardRow = {
  game: string;
  player_name: string;
  score?: number;
  score_scale?: string | null;
  ranked_day?: string;
};

function slugOf(gamePath: string): string {
  return gamePath.replace(/^\//, '');
}

function newRunId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch { /* fall through */ }
  /* A version 4 shape from Math.random: a run id only has to be unique among
     this browser's own runs, and the door matches it only among the account's
     own claims. */
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r % 4) + 8).toString(16);
  });
}

function dayBefore(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** The run record, holding today and yesterday only. */
function readRecord(today: string): LedgerRecord {
  const keep = [today, dayBefore(today)];
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.v === 1 && parsed.days && typeof parsed.days === 'object') {
      const days: LedgerRecord['days'] = {};
      for (const d of keep) if (parsed.days[d] && typeof parsed.days[d] === 'object') days[d] = parsed.days[d];
      return { v: 1, days };
    }
  } catch { /* a corrupt record is an empty one */ }
  return { v: 1, days: {} };
}

function writeRecord(rec: LedgerRecord): void {
  try { localStorage.setItem(LEDGER_KEY, JSON.stringify(rec)); } catch { /* storage unavailable: every finish claims at finish */ }
}

function entryFor(rec: LedgerRecord, day: string, game: string): RunEntry | undefined {
  const d = rec.days[day];
  return d && Object.prototype.hasOwnProperty.call(d, game) ? d[game] : undefined;
}

function putEntry(rec: LedgerRecord, day: string, game: string, entry: RunEntry): void {
  if (!rec.days[day]) rec.days[day] = {};
  rec.days[day][game] = entry;
}

/**
 * Decide, before anything is sent, whether this finish is the day's ranked
 * one, and settle it here so a second finish in this browser is practice.
 */
function settleRun(game: string): { run: string; day: string; ranked: boolean } {
  const today = getEtDateString();
  const yesterday = dayBefore(today);
  const rec = readRecord(today);
  const now = Date.now();
  const todays = entryFor(rec, today, game);
  const carried = entryFor(rec, yesterday, game);
  if (todays && !todays.settled) {
    todays.settled = true;
    writeRecord(rec);
    return { run: todays.run, day: today, ranked: true };
  }
  if (!todays && carried && !carried.settled && now - carried.claimedAt < DAY_MS && carried.dealVersion === dealVersionFor(game)) {
    carried.settled = true;
    writeRecord(rec);
    return { run: carried.run, day: yesterday, ranked: true };
  }
  if (!todays) {
    const entry: RunEntry = { run: newRunId(), claimedAt: now, settled: true, dealVersion: dealVersionFor(game) };
    putEntry(rec, today, game, entry);
    writeRecord(rec);
    return { run: entry.run, day: today, ranked: true };
  }
  return { run: newRunId(), day: today, ranked: false };
}

function announceSaved(): void {
  /* Round 157: tell the header a play just landed, so games played, points
     and rank move while you are playing instead of waiting for a poll. */
  try { window.dispatchEvent(new Event('game-completion-saved')); } catch { /* SSR or a harness */ }
}

/** True for the board's row level refusal, the only one a name can cause. */
function refusedByPolicy(error: { code?: string; message?: string } | null): boolean {
  return !!error && error.code === '42501' && /row.level security/i.test(error.message || '');
}

/**
 * Settles one board insert: the saved event on success; on a refusal of a
 * guest's own handle that another account owns, one fresh handle and one
 * more try under it.
 */
function settleBoardRow(sent: PromiseLike<{ error: { code?: string; message?: string } | null }>, row: BoardRow): void {
  sent.then(({ error }) => {
    if (!error) { announceSaved(); return; }
    if (!refusedByPolicy(error)) { console.debug('[playLedger] the board refused this row (ignored):', error); return; }
    (supabase.rpc as any)('name_is_owned', { p_name: row.player_name, p_caller: null })
      .then(({ data }: { data: unknown }) => {
        const fresh = data === true ? remintGuestHandle(row.player_name) : null;
        if (!fresh) { console.debug('[playLedger] the board refused this row (ignored):', error); return; }
        (supabase.from as any)('game_completions')
          .insert({ ...row, player_name: fresh })
          .then(({ error: again }: { error: unknown }) => {
            if (again) console.debug('[playLedger] the board refused the row under a fresh handle too (ignored):', again);
            else announceSaved();
          }, () => undefined);
      }, () => undefined);
  }, () => undefined);
}

/**
 * Round 301, audit finding 2, and Round 679: the ACTIVITY ping, distinct from
 * a finish. The four front office boards and the four my career boards ping
 * after every simulated round, Club Manager after every match and Soccer
 * Career after every season, so Most Played Today reflects live play. One
 * unscored board row and today's games: NO streak record, NO signed in save,
 * NO score. A real finish goes through recordCompletion, exactly once.
 */
export function recordActivity(gamePath: string): void {
  try {
    const game = slugOf(gamePath);
    if (!game) return;
    const row: BoardRow = { game, player_name: getCurrentPlayerName() };
    settleBoardRow((supabase.from as any)('game_completions').insert(row), row);
    bumpLocalTodayCount(game);
  } catch {
    // Never let a tracking failure break gameplay.
  }
}

/**
 * Round 645, renamed in Round 679 (it was recordUnrankedPlay): a finished run
 * that is NOT the daily is a play, never a record.
 *
 * What it writes: the unscored board row (a play for Most Played Today, never
 * a row the day board reads) under the name it is handed, the local streak
 * day and today's games (src/lib/gamesToday.ts). What it never writes: a
 * number on the row, the door, the daily key. scripts/simRankedRecorder.mjs
 * reads this body and fails if any of those come back, or if the row, the
 * streak day or the today set go.
 */
export function recordPlay(gamePath: string, playerName?: string): void {
  try {
    const game = slugOf(gamePath);
    if (!game) return;
    const row: BoardRow = { game, player_name: playerName || getCurrentPlayerName() };
    settleBoardRow((supabase.from as any)('game_completions').insert(row), row);
    recordStreakCompletion(game, new Date(), 0);
    bumpLocalTodayCount(game);
    publishOutcome(game, false, 'free');
  } catch {
    // Never let a tracking failure break gameplay.
  }
}

/**
 * The claim moment (section 8). A game whose ranked go is spent at the start
 * calls this at its first scored action (a shared daily) or at its deal (a
 * fresh deal game). Today's run is claimed in this browser, and a signed in
 * player's claim is sent to the door as a start, so another tab or device
 * finishing first plays for practice. Idempotent for the day: a second call,
 * from this tab or another, keeps the run already claimed.
 */
export function claimRun(gamePath: string): void {
  try {
    const game = slugOf(gamePath);
    const claim = game ? pointsRuleFor(game)?.claim : undefined;
    if (claim !== 'first-action' && claim !== 'deal') return;
    const today = getEtDateString();
    const rec = readRecord(today);
    if (entryFor(rec, today, game)) return;
    const entry: RunEntry = { run: newRunId(), claimedAt: Date.now(), settled: false, dealVersion: dealVersionFor(game) };
    putEntry(rec, today, game, entry);
    writeRecord(rec);
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!data?.session?.user) return;
        return (supabase.rpc as any)('record_play', {
          p_game: game, p_phase: 'start', p_run: entry.run, p_step: 0,
          p_score: null, p_correct: null, p_player_name: null,
        });
      })
      .then(
        (res: { error?: unknown } | undefined) => { if (res?.error) console.debug('[playLedger] the door refused a start (the finish claims at finish):', res.error); },
        () => undefined,
      );
  } catch {
    // Never let a tracking failure break gameplay.
  }
}

/**
 * The door's finish for a signed in player: one call, which writes the board
 * row, the account's score row, the daily key and the streak on the server.
 * Returns true only when the door answered.
 */
async function finishAtDoor(userId: string, game: string, run: string, score: number | null, correctAnswers: number, playerName: string): Promise<boolean> {
  const { data, error } = await (supabase.rpc as any)('record_play', {
    p_game: game,
    p_phase: 'finish',
    p_run: run,
    p_step: 0,
    p_score: score,
    p_correct: correctAnswers,
    p_player_name: playerName,
  });
  if (error || !data || typeof data !== 'object') {
    console.debug('[playLedger] the door did not take this finish (ignored):', error);
    return false;
  }
  const answer = data as { ranked?: unknown; reason?: unknown };
  if (answer.ranked === true) publishOutcome(game, true);
  else publishOutcome(game, false, typeof answer.reason === 'string' ? answer.reason : 'unknown');

  /* Round 301, audit finding 15: back up the local streak state to the
     profile after every signed in finish, so a cleared cache does not erase
     a streak. Best effort; the profiles row is the player's own. */
  try {
    await (supabase.from as any)('profiles').upsert(
      { user_id: userId, streak_state: getStreakState(), updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  } catch { /* best effort only */ }
  return true;
}

/**
 * A finish. Never throws, never blocks gameplay.
 *
 * @param gamePath the game's route path, e.g. '/soccer-grid'; the leading
 * slash is stripped, so the key is the bare slug.
 * @param score the game's recorded number, or undefined for a game with no
 * number (the row still counts as a play).
 * @param playerName the name to file the row under; defaults to
 * getCurrentPlayerName(), so every row carries a name.
 */
export function recordCompletion(gamePath: string, score?: number, playerName?: string, correctAnswers = 0): void {
  try {
    const game = slugOf(gamePath);
    if (!game) return;
    const scored = typeof score === 'number' && Number.isFinite(score);
    const name = playerName || getCurrentPlayerName();
    /* Ranked or practice is decided here, before anything is sent. A finish
       with no number ranks nothing and spends no claim. */
    const run = scored ? settleRun(game) : { run: newRunId(), day: getEtDateString(), ranked: false };

    /* Round 648: the browser's own tally, credited as it always was (the
       day's best, capped by this browser's copy of public.game_score_caps,
       held until a copy lands). Round 690 removes it. */
    recordStreakCompletion(game, new Date(), typeof score === 'number' && Number.isFinite(score) ? score : 0, knownCap(game));
    primeScoreCaps().catch(() => { /* the next play tries again; the held play waits */ });

    /* Round 569: getSession, not getUser: the session this browser already
       holds, no round trip in front of the write. The door takes the player
       from auth.uid(), so a stale or forged local session is refused there. */
    supabase.auth.getSession()
      .then(({ data }) => {
        const user = data?.session?.user;
        if (user) return finishAtDoor(user.id, game, run.run, scored ? (score as number) : null, correctAnswers, name);
        if (scored && run.ranked) {
          const rule = pointsRuleFor(game);
          const row: BoardRow = {
            game,
            score: score as number,
            player_name: name,
            score_scale: rule && rule.pays ? rule.scale : null,
            ranked_day: run.day,
          };
          settleBoardRow((supabase.from as any)('game_completions').insert(row), row);
          publishOutcome(game, true);
        } else {
          const row: BoardRow = { game, player_name: name };
          settleBoardRow((supabase.from as any)('game_completions').insert(row), row);
          if (scored) publishOutcome(game, false, 'already played');
        }
        return undefined;
      })
      .catch(() => { /* signed out or auth unreachable: the play still counted on this device */ });

    bumpLocalTodayCount(game);
  } catch {
    // Never let a tracking failure break gameplay.
  }
}
