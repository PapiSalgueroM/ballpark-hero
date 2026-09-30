/* Round 675: a copy of the live row shapes, for the economy rehearsal.

   scripts/simEconomyMigrations.mjs proves E1's equality ("the view values
   every existing row exactly as the live board does today") in PGlite, where
   no production row may go: no player's name or play leaves production for
   this. So this writes rows with the shapes production has, read only on
   2026-09-19 to 2026-09-30 and recorded in the spec's section 2 and the
   economy migrations' headers, into game_completions and user_game_scores:

   - every game in game_score_caps, scored against its real cap: scores
     below, at and above it, so least() is exercised on every game;
   - the seven floating NULL caps on the live 99th percentile, Player Bingo
     with its blackout at 1700 held by more than one row in a hundred (so the
     percentile is 1700, as read on 2026-09-28);
   - Soccer Career on the old formula (multiples of 50 to 1000, most at 1000)
     before P644, row 593987 itself (73, at P644), and after it the new scale
     (0 to 100, some exactly 50 or 100) beside old tabs above 100;
   - evening plays after 20:00 Eastern, whose UTC date is the next day;
   - rows the board skips: a NULL score, a 0, a NULL name, a game off the
     caps, and rows dated in the future (forged before L1 shut created_at);
   - ids in created_at order, the proven first new Soccer Career row at
     593987, as production numbers them.

   SCENARIOS
     base        the shapes above
     unrevalued  no board day E1 means to revalue: row 593987 carries no
                 name, and no named Soccer Career row after P644 scores 100
                 or less. The live board's own objects (player_ranks,
                 global_rank, global_leaderboard) must then equal the view
                 exactly, player for player.
     shifted     base, with Player Bingo's blackout rare, so its live
                 percentile is not 1700 and its days are revalued
     forged      base, plus a visitor's rows on two of the fourteen NULL cap
                 games that had none (who-am-i, football-connect-4)

   It also returns a JavaScript model of Round 537's board and of E1's worth
   over the rows it wrote, a third implementation the database is held to. */

export const P644 = '2026-09-23T00:24:53.338907Z';
export const P644_FIRST = 593987;
export const FLOATING = ['cbb-grid', 'clue-auction', 'higher-lower-transfers', 'list-quiz', 'nba-stat-line', 'perfect-season-nhl', 'player-bingo'];
/* The fourteen NULL caps with no scored row, and E1's legacy cap for each
   (null: L1's hard maximum, read from the database). */
export const FIXED = {
  'football-connect-4': 500, 'grade-transfer': 500, 'guess-transfer-value': 900,
  'mlb-connect-4': 500, 'nba-connect-4': 500, 'nfl-connect-4': 500, 'nhl-connect-4': 500,
  'hall-of-champions': null, 'idle-arena': null, 'stadium-tycoon': null, 'stat-detective': null,
  'who-am-i': null, 'wonderkid-factory': null, 'world-cup-bracket': null,
};

const ET = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
export const etDay = ms => ET.format(new Date(ms));

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; };
}

/** Write the shapes into db; returns { rows, accounts, nowMs, today, hardMax, caps }. */
export async function writeLiveShapes(db, scenario = 'base') {
  if (!['base', 'unrevalued', 'shifted', 'forged'].includes(scenario)) throw new Error(`no scenario ${scenario}`);
  const next = rng(0x675 + scenario.length);
  const pick = a => a[Math.floor(next() * a.length)];
  const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  const nowMs = new Date((await db.query(`select to_json(now())::text as t`)).rows[0].t.replace(/"/g, '')).getTime();
  const caps = new Map((await db.query(`select game, max_score from public.game_score_caps`)).rows.map(r => [r.game, r.max_score]));
  /* L1's table, when L1 is applied (a refusal case writes the shapes without it) */
  const hasHardMax = (await db.query(`select to_regclass('private.game_hard_max') is not null as e`)).rows[0].e;
  const hardMax = new Map(hasHardMax ? (await db.query(`select game, hard_max from private.game_hard_max`)).rows.map(r => [r.game, r.hard_max]) : []);
  const p644 = Date.parse(P644);
  const start = Date.parse('2026-09-10T00:00:00Z');
  const end = nowMs - 3_600_000;
  if (end <= p644 + 86_400_000) throw new Error('the clock is before P644 plus a day; the shapes need rows on both sides of it');
  const players = Array.from({ length: 36 }, (_, i) => `Shape Player ${String(i + 1).padStart(2, '0')}`);
  const users = Array.from({ length: 10 }, (_, i) => `00000000-0000-4000-8000-${String(675000000000 + i).padStart(12, '0')}`);
  const at = () => {
    let t = start + next() * (end - start);
    if (next() < 0.3) {
      /* an evening play: 20:00 to 23:59 Eastern, the next UTC date */
      const d = new Date(t);
      const utcMidnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      t = utcMidnight + int(0, 3) * 3_600_000 + int(0, 3_599_999);
      if (t > end || t < start) t = start + next() * (end - start);
    }
    return t;
  };
  const scoreFor = (game, t) => {
    const cap = caps.get(game);
    if (game === 'soccer-career') {
      if (t < p644) return next() < 0.4 ? 1000 : 50 * int(1, 20);
      if (scenario === 'unrevalued') return 50 * int(3, 20);
      const u = next();
      return u < 0.7 ? int(0, 100) : u < 0.8 ? pick([50, 100]) : 50 * int(3, 20);
    }
    if (game === 'player-bingo') {
      const blackout = scenario === 'shifted' ? 0.004 : 0.05;
      return next() < blackout ? 1700 : int(100, 1600);
    }
    if (FLOATING.includes(game)) return int(1, pick([40, 60, 90, 900]));
    if (cap === null) return int(1, 400);
    return next() < 0.15 ? cap : int(1, Math.max(1, Math.round(cap * 1.3)));
  };
  const rows = [];
  for (const game of caps.keys()) {
    if (game in FIXED) continue;
    const n = game === 'soccer-career' ? 700 : game === 'player-bingo' ? 400 : 40;
    for (let i = 0; i < n; i++) {
      const t = at();
      const u = next();
      rows.push({
        game, t,
        score: u < 0.04 ? null : u < 0.08 ? 0 : scoreFor(game, t),
        name: next() < 0.03 ? null : pick(players),
      });
    }
  }
  if (scenario === 'unrevalued') {
    for (const r of rows) if (r.game === 'soccer-career' && r.t >= p644 && r.score !== null && r.score > 0 && r.score <= 100) r.score = 150;
  }
  if (scenario === 'forged') {
    rows.push({ game: 'who-am-i', t: end - 60_000, score: 50, name: pick(players) });
    rows.push({ game: 'football-connect-4', t: end - 120_000, score: 300, name: pick(players) });
  }
  for (let i = 0; i < 10; i++) rows.push({ game: 'not-a-game-anyone-plays', t: at(), score: int(1, 500), name: pick(players) });
  /* no row of the shapes sits at or after P644 below the first proven new row */
  const soccerAfter = rows.filter(r => r.game === 'soccer-career' && r.t >= p644);
  for (const r of soccerAfter) if (r.t < p644 + 1000) r.t = p644 + 1000 + next() * 60_000;
  const first = { game: 'soccer-career', t: p644, score: 73, name: scenario === 'unrevalued' ? null : pick(players), exact: P644 };
  const future = Array.from({ length: 6 }, (_, i) => ({ game: pick(['footle', 'ball-iq', 'career']), t: nowMs + (i + 1) * 43_200_000, score: 10 + i, name: pick(players) }));
  rows.sort((a, b) => a.t - b.t);
  let before = 100000;
  let after = P644_FIRST + 1;
  for (const r of rows) r.id = r.t < p644 ? before++ : after++;
  if (before >= P644_FIRST) throw new Error('too many rows before P644 for the id space');
  first.id = P644_FIRST;
  for (const r of future) r.id = after++;
  const all = [...rows, first, ...future];
  const q = s => (s === null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
  const ts = r => (r.exact ? `'${r.exact}'` : `'${new Date(r.t).toISOString()}'`);
  for (let i = 0; i < all.length; i += 500) {
    const chunk = all.slice(i, i + 500).map(r => `(${r.id}, ${q(r.game)}, ${r.score === null ? 'null' : r.score}, ${q(r.name)}, ${ts(r)})`);
    await db.exec(`insert into public.game_completions (id, game, score, player_name, created_at) overriding system value values ${chunk.join(',\n')};`);
  }
  await db.exec(`alter table public.game_completions alter column id restart with ${after + 1};`);

  /* the account surface: signed in saves on a spread of games */
  const accountGames = ['soccer-career', 'player-bingo', 'footle', 'ball-iq', 'club-manager', 'pack-battle', 'clue-auction', 'world-xi', 'higher-lower', 'front-office'];
  const accounts = [];
  for (let i = 0; i < 500; i++) {
    const game = pick(accountGames);
    const t = at();
    accounts.push({ user: pick(users), game, t, score: next() < 0.05 ? 0 : scoreFor(game, t) ?? 0 });
  }
  for (let i = 0; i < accounts.length; i += 500) {
    const chunk = accounts.slice(i, i + 500).map(r => `('${r.user}', ${q(r.game)}, ${r.score}, 0, '${new Date(r.t).toISOString()}')`);
    await db.exec(`insert into public.user_game_scores (user_id, game_type, score, correct_answers, created_at) values ${chunk.join(',\n')};`);
  }
  return { rows: all.map(r => ({ ...r, t: r.exact ? Date.parse(r.exact) : r.t })), accounts, nowMs, today: etDay(nowMs), caps, hardMax };
}

/** percentile_disc(0.99) over the positive scores, as Postgres computes it. */
function p99(scores) {
  const s = [...scores].sort((a, b) => a - b);
  if (!s.length) return null;
  return s[Math.max(0, Math.ceil(0.99 * s.length) - 1)];
}

/** Round 537's denominators and E1's legacy caps, over the rows written. */
export function modelCaps(shapes) {
  const denom = new Map();
  for (const [game, cap] of shapes.caps) {
    const scored = shapes.rows.filter(r => r.game === game && r.score !== null && r.score > 0).map(r => r.score);
    denom.set(game, Math.max(cap ?? p99(scored) ?? 1, 1));
  }
  const legacy = new Map();
  for (const [game, cap] of shapes.caps) {
    if (cap !== null) legacy.set(game, cap);
    else if (FLOATING.includes(game)) legacy.set(game, denom.get(game));
    else legacy.set(game, FIXED[game] ?? shapes.hardMax.get(game));
  }
  return { denom, legacy };
}

/** Per (surface|who|game|day): the live board's day points and E1's, as numbers. */
export function modelDays(shapes) {
  const { denom, legacy } = modelCaps(shapes);
  const p644 = Date.parse(P644);
  const today = shapes.today;
  const board537 = new Map();
  const e1 = new Map();
  const cls = new Map();
  const put = (m, k, v) => m.set(k, Math.max(m.get(k) ?? -Infinity, v));
  for (const r of shapes.rows) {
    if (r.score === null || r.score <= 0 || r.name === null || !shapes.caps.has(r.game)) continue;
    const day = etDay(r.t);
    if (day > today) continue;
    const k = `board|${r.name}|${r.game}|${day}`;
    const d = denom.get(r.game);
    put(board537, k, (100 * Math.min(r.score, d)) / d);
    let cap = legacy.get(r.game);
    let c = null;
    if (r.game === 'soccer-career' && r.t >= p644 && r.score <= 100) { cap = 100; c = 'soccer-644'; }
    else if (r.game === 'player-bingo') { cap = 1700; c = 'bingo-644'; }
    else if (r.game in FIXED) c = 'fixed';
    put(e1, k, (100 * Math.min(r.score, cap)) / cap);
    if (c) cls.set(k, c);
  }
  for (const a of shapes.accounts) {
    if (a.score <= 0 || !shapes.caps.has(a.game)) continue;
    const day = etDay(a.t);
    if (day > today) continue;
    let cap = legacy.get(a.game);
    if (a.game === 'soccer-career' && a.t >= p644 && a.score <= 100) cap = 100;
    else if (a.game === 'player-bingo') cap = 1700;
    put(e1, `account|${a.user}|${a.game}|${day}`, (100 * Math.min(a.score, cap)) / cap);
  }
  return { board537, e1, cls, denom, legacy };
}
