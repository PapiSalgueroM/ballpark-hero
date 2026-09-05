/**
 * Round 294: Transfer Path's minimum and hint, derived from the graph the game
 * actually plays on.
 *
 * The game's rule (useTransferPath.ts, owner 2026-07-10): two players are
 * linked when they were at the SAME club in the SAME season. The puzzle
 * table's min_steps and hint predate that rule; they were written when any
 * shared club counted, so "Direct link. Both wore the Barcelona shirt" sat on
 * a pair the game refuses (Yaya Toure left in 2010, Lamine Yamal arrived in
 * 2022), and "One middle man does it" sat on puzzles that need two or three.
 * A user reported exactly that on 2026-08-19 (tp-19, "Wrong answer").
 *
 * Everything here is pure and shared by the generator (genTransferPathHints)
 * and the fence (simTransferPathHints): the same key rule as the hook,
 * `${club}::${season}`, the same breadth first search, and one deterministic
 * shortest path per puzzle, so a hint can be written from it and checked
 * against it.
 */

/** name -> Set of `club::season`, exactly the hook's playerToClubSeasons */
export function buildGraph(players) {
  const keys = new Map();
  for (const p of players) {
    if (!p || typeof p.name !== 'string' || !Array.isArray(p.career)) continue;
    const set = keys.get(p.name) ?? new Set();
    for (const s of p.career) if (s && s.club && s.season) set.add(`${s.club}::${s.season}`);
    keys.set(p.name, set);
  }
  /* club::season -> players there, then neighbours with the clubs they shared
     (earliest shared season first, so the club named in a hint is stable) */
  const at = new Map();
  for (const [name, set] of keys) for (const k of set) (at.get(k) ?? at.set(k, []).get(k)).push(name);
  const adj = new Map();
  for (const [k, names] of at) {
    if (names.length < 2) continue;
    const [club, season] = k.split('::');
    for (const a of names) for (const b of names) {
      if (a === b) continue;
      const row = adj.get(a) ?? adj.set(a, new Map()).get(a);
      const shared = row.get(b) ?? row.set(b, []).get(b);
      shared.push({ club, season });
    }
  }
  for (const row of adj.values()) for (const list of row.values()) list.sort(bySeasonThenClub);
  return { keys, adj, names: [...keys.keys()].sort() };
}

function seasonStart(season) {
  const m = /^(\d{4})/.exec(String(season));
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}
function bySeasonThenClub(x, y) {
  return seasonStart(x.season) - seasonStart(y.season) || String(x.season).localeCompare(String(y.season)) || x.club.localeCompare(y.club);
}

export function neighbours(graph, name) {
  const row = graph.adj.get(name);
  return row ? [...row.keys()].sort() : [];
}

/** the club two linked players shared, earliest shared season first */
export function sharedClub(graph, a, b) {
  const list = graph.adj.get(a)?.get(b);
  return list && list.length ? list[0].club : null;
}

/** breadth first distances from `from`, the hook's own search shape */
export function distances(graph, from) {
  const dist = new Map([[from, 0]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    const d = dist.get(cur);
    for (const nx of neighbours(graph, cur)) if (!dist.has(nx)) { dist.set(nx, d + 1); queue.push(nx); }
  }
  return dist;
}

/**
 * One shortest path from a to b, deterministic: at every step the smallest
 * neighbour name that still lies on a shortest path is taken. null when b
 * cannot be reached.
 */
export function shortestPath(graph, a, b) {
  if (!graph.keys.has(a) || !graph.keys.has(b)) return null;
  if (a === b) return [a];
  const fromB = distances(graph, b);
  if (!fromB.has(a)) return null;
  const path = [a];
  let cur = a;
  while (cur !== b) {
    const want = fromB.get(cur) - 1;
    const next = neighbours(graph, cur).find(n => fromB.get(n) === want);
    if (next === undefined) return null;
    path.push(next);
    cur = next;
  }
  return path;
}

/** the hint text for a path of n edges; the clubs are the ones on the path's first and last link */
export function hintText(a, b, steps, first, last) {
  if (steps === 1) return `Direct link. They were at ${first} together.`;
  if (steps === 2) {
    if (first === last) return `One middle man does it. He was at ${first} with ${a} and, in another season, at ${last} with ${b}.`;
    return `One middle man does it. He was at ${first} with ${a} and at ${last} with ${b}.`;
  }
  const men = steps === 3 ? 'Two' : steps === 4 ? 'Three' : steps === 5 ? 'Four' : String(steps - 1);
  return `${men} middle men at least. The first was at ${first} with ${a}; the last was at ${last} with ${b}.`;
}

/** minimum, hint and the path they were read from */
export function deriveHint(graph, a, b) {
  const path = shortestPath(graph, a, b);
  if (!path || path.length < 2) return null;
  const steps = path.length - 1;
  const first = sharedClub(graph, path[0], path[1]);
  const last = sharedClub(graph, path[path.length - 2], path[path.length - 1]);
  return { minSteps: steps, hint: hintText(a, b, steps, first, last), path, first, last };
}

const HINT_RE = {
  direct: /^Direct link\. They were at (.+) together\.$/,
  one: /^One middle man does it\. He was at (.+) with (.+) and(?:, in another season,)? at (.+) with (.+)\.$/,
  many: /^(Two|Three|Four|\d+) middle men at least\. The first was at (.+) with (.+); the last was at (.+) with (.+)\.$/,
};
const WORD_TO_N = { Two: 2, Three: 3, Four: 4 };

/** the claims a hint makes: steps, the first club, the last club, and the names it uses */
export function parseHint(hint) {
  let m = HINT_RE.direct.exec(hint);
  if (m) return { steps: 1, first: m[1], last: m[1] };
  m = HINT_RE.one.exec(hint);
  if (m) return { steps: 2, first: m[1], a: m[2], last: m[3], b: m[4] };
  m = HINT_RE.many.exec(hint);
  if (m) return { steps: (WORD_TO_N[m[1]] ?? Number(m[1])) + 1, first: m[2], a: m[3], last: m[4], b: m[5] };
  return null;
}

/**
 * Every way a stored (minSteps, hint) can be wrong for the pair (a, b) on
 * this graph. Empty means the row tells the truth: the minimum is the
 * search's minimum, the hint promises the right number of middle men, names
 * the right two players, and a shortest path really does begin at the first
 * club it names and end at the last.
 */
export function hintProblems(graph, a, b, minSteps, hint) {
  const out = [];
  const fromA = distances(graph, a);
  if (!graph.keys.has(a) || !graph.keys.has(b)) { out.push('an endpoint is not in the player pool'); return out; }
  if (!fromA.has(b)) { out.push('no path exists'); return out; }
  const truth = fromA.get(b);
  if (minSteps !== truth) out.push(`min_steps ${minSteps}, the search says ${truth}`);
  if (/[\u2013\u2014]/.test(hint)) out.push('the hint carries a long dash');
  const claim = parseHint(hint);
  if (!claim) { out.push(`the hint is not in a shape the fence can check: "${hint}"`); return out; }
  if (claim.steps !== truth) out.push(`the hint promises ${claim.steps} steps, the search says ${truth}`);
  if (claim.steps >= 2 && (claim.a !== a || claim.b !== b)) out.push('the hint names the wrong players');
  if (claim.steps === 1) {
    if (sharedClub(graph, a, b) === null || !(graph.adj.get(a)?.get(b) ?? []).some(s => s.club === claim.first)) out.push(`no direct link at ${claim.first}`);
    return out;
  }
  /* a shortest path whose first link shares claim.first and whose last link
     shares claim.last must exist: try every first and last middle man */
  const firsts = neighbours(graph, a).filter(m => (graph.adj.get(a).get(m) ?? []).some(s => s.club === claim.first));
  const lasts = neighbours(graph, b).filter(m => (graph.adj.get(b).get(m) ?? []).some(s => s.club === claim.last));
  if (!firsts.length) out.push(`${a} never shared a season at ${claim.first} with anyone in the pool`);
  if (!lasts.length) out.push(`${b} never shared a season at ${claim.last} with anyone in the pool`);
  if (!firsts.length || !lasts.length) return out;
  const inner = truth - 2;
  let ok = false;
  for (const m1 of firsts) {
    if (fromA.get(m1) !== 1) continue;
    const fromM1 = distances(graph, m1);
    if (lasts.some(mk => (inner === 0 ? mk === m1 : fromM1.get(mk) === inner && mk !== a && m1 !== b))) { ok = true; break; }
  }
  if (!ok) out.push(`no shortest path starts at ${claim.first} and ends at ${claim.last}`);
  return out;
}

/* ── Round 460: the special rules ─────────────────────────────────────────
   Active players only and Europe only are filters on the player pool
   (src/lib/transferPathModes.ts, shared with the page), so each rule gets
   its own graph, the same search, and its own stored (minimum, hint) in the
   puzzle table's <rule>_min_steps and <rule>_hint columns. A pair with no
   path under a rule is stored as null on purpose: the page then offers a
   puzzle that has one instead of a hint into a refusal. The writer and the
   parser sit side by side so the fence reads exactly what the generator
   wrote. */
export const MODE_RULES = ['active', 'europe'];

const sqlQuote = s => `'${String(s).replace(/'/g, "''")}'`;
const sqlOrNull = s => (s === null || s === undefined ? 'null' : sqlQuote(s));

/* The migration carries, per puzzle and per rule, the minimum and the two
   clubs the hint names (first link, last link), and the UPDATE below rebuilds
   the hint text in SQL from those plus the pair's own names, which the table
   already holds. That keeps the file a third of the size of full hint text,
   which is what let it be applied by hand through the database tools. The
   wording lives in hintText above; the SQL mirrors it, and simTransferPathModes
   proves the live text equals hintText's on every row, so the mirror cannot
   drift unnoticed. */
export function modeValuesRow(id, derived) {
  const cells = [sqlQuote(id)];
  for (const rule of MODE_RULES) {
    const d = derived[rule];
    cells.push(d ? String(d.minSteps) : 'null', sqlOrNull(d ? d.first : null), sqlOrNull(d ? d.last : null));
  }
  return `  (${cells.join(', ')})`;
}

function hintSql(rule) {
  const min = `v.${rule.slice(0, 1)}_min`, first = `v.${rule.slice(0, 1)}_first`, last = `v.${rule.slice(0, 1)}_last`;
  return [
    `    case`,
    `      when ${min} is null then null`,
    `      when ${min} = 1 then 'Direct link. They were at ' || ${first} || ' together.'`,
    `      when ${min} = 2 and ${first} = ${last} then 'One middle man does it. He was at ' || ${first} || ' with ' || t.player_a || ' and, in another season, at ' || ${last} || ' with ' || t.player_b || '.'`,
    `      when ${min} = 2 then 'One middle man does it. He was at ' || ${first} || ' with ' || t.player_a || ' and at ' || ${last} || ' with ' || t.player_b || '.'`,
    `      else (case ${min} when 3 then 'Two' when 4 then 'Three' when 5 then 'Four' else (${min} - 1)::text end) || ' middle men at least. The first was at ' || ${first} || ' with ' || t.player_a || '; the last was at ' || ${last} || ' with ' || t.player_b || '.'`,
    `    end`,
  ].join('\n');
}

/** the whole statement: one VALUES row per puzzle, one UPDATE over all of them */
export function modeMigrationSql(valueRows) {
  const cols = ['puzzle_id', ...MODE_RULES.flatMap(r => [`${r.slice(0, 1)}_min`, `${r.slice(0, 1)}_first`, `${r.slice(0, 1)}_last`])];
  return [
    `with v(${cols.join(', ')}) as (values`,
    valueRows.join(',\n'),
    ')',
    'update public.transfer_path_puzzles t set',
    ...MODE_RULES.flatMap((rule, i) => [
      `  ${rule}_min_steps = v.${rule.slice(0, 1)}_min::smallint,`,
      `  ${rule}_hint =\n${hintSql(rule)}${i < MODE_RULES.length - 1 ? ',' : ''}`,
    ]),
    'from v',
    'where t.puzzle_id = v.puzzle_id;',
  ].join('\n');
}

const MODE_VALUES_RE = /^\s*\('((?:[^']|'')*)', (\d+|null), (?:'((?:[^']|'')*)'|null), (?:'((?:[^']|'')*)'|null), (\d+|null), (?:'((?:[^']|'')*)'|null), (?:'((?:[^']|'')*)'|null)\),?$/gm;

/**
 * puzzle id -> { active, europe }, each { minSteps, hint, first, last } or
 * null, the hint rebuilt with hintText from the row's clubs and the pair's
 * names (`pairs`: id -> { a, b }). CRLF is folded first.
 */
export function parseModeMigration(sql, pairs) {
  const unquote = s => s.replace(/''/g, "'");
  const rows = new Map();
  for (const m of String(sql).replaceAll('\r\n', '\n').matchAll(MODE_VALUES_RE)) {
    const id = unquote(m[1]);
    const pair = pairs.get(id);
    const entry = (min, first, last) => {
      if (min === 'null') return null;
      const steps = Number(min);
      const f = unquote(first ?? ''), l = unquote(last ?? '');
      return { minSteps: steps, first: f, last: l, hint: pair ? hintText(pair.a, pair.b, steps, f, l) : '' };
    };
    rows.set(id, { active: entry(m[2], m[3], m[4]), europe: entry(m[5], m[6], m[7]) });
  }
  return rows;
}

/**
 * Every way a stored rule entry can be wrong on the rule's graph: a null
 * where the search finds a path, a path where the search finds none, or a
 * (minimum, hint) that fails the classic checks on that graph.
 */
export function ruleProblems(graph, a, b, stored) {
  const truth = graph.keys.has(a) && graph.keys.has(b) ? distances(graph, a).get(b) : undefined;
  if (stored === null) return truth === undefined ? [] : [`stored as no path under the rule, the search finds one in ${truth}`];
  if (truth === undefined) return ['stored as a path under the rule where the search finds none'];
  return hintProblems(graph, a, b, stored.minSteps, stored.hint);
}

/** the compact career text pulled through the database console: `Name|Club:2007-2009;Club:1995c` */
export function expandCompactCareers(text) {
  const players = [];
  /* Round 460: a fresh Windows checkout is CRLF. The trailing \r used to ride
     into the LAST spell of every line, "Miami United:2016c\r" no longer ended
     in c and its year became NaN, so 16 late career spells silently vanished
     from the graph on this side while the migration was derived with them. */
  for (const line of String(text).replaceAll('\r\n', '\n').split('\n')) {
    if (!line.trim()) continue;
    const bar = line.indexOf('|');
    const name = line.slice(0, bar);
    const career = [];
    for (const spell of line.slice(bar + 1).split(';')) {
      const colon = spell.lastIndexOf(':');
      const club = spell.slice(0, colon);
      let years = spell.slice(colon + 1);
      const calendar = years.endsWith('c');
      if (calendar) years = years.slice(0, -1);
      const [y0, y1] = years.includes('-') ? years.split('-').map(Number) : [Number(years), Number(years)];
      for (let y = y0; y <= y1; y++) career.push({ club, season: calendar ? String(y) : `${y}-${y + 1}` });
    }
    players.push({ name, career });
  }
  return players;
}
