/* Round 678 fix: reads public.game_rules' seed back, row by row, and holds
   each row to the family table itself.

   WHY THIS EXISTS. The first check compared the committed seed only with
   what scripts/lib/gameRulesSeed.mjs generates now, so a generator that
   wrote the wrong thing checked out as right: the review changed seedSql to
   write `true` for pays on every row and regenerated, and both
   genGameRules --check and simKnowledgeLine stayed green on a seed that
   would have marked all 139 games as paying with no scale. Dropping the 14
   never scored rows stayed green the same way. This seed is the file E3b
   applies to production.

   So this file never imports the generator. It reads the seed as SQL (one
   insert into public.game_rules with the six columns in order, then value
   rows, then nothing but comments), and compares every row's
   (game, family, scale, pays, claim, round) with the rule the family table
   files for that game, both ways: every filed game has exactly one row, and
   every row is a filed game.

   seedRows          the rows a seed text holds, or a thrown reason it does
                     not read as one insert
   seedAgainstTable  every way a seed text and the family table disagree */

const COLUMNS = ['game', 'family', 'scale', 'pays', 'claim', 'round'];

/** The seed as tokens: words, quoted strings and punctuation, comments dropped. */
function tokens(sql) {
  const out = [];
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i += 1; continue; }
    if (c === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      if (end < 0) throw new Error('a block comment never closes');
      i = end + 2;
      continue;
    }
    if (c === "'") {
      let j = i + 1;
      let text = '';
      for (;;) {
        if (j >= sql.length) throw new Error('a quoted value never closes');
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") { text += "'"; j += 2; continue; }
          break;
        }
        text += sql[j];
        j += 1;
      }
      out.push({ kind: 'text', value: text });
      i = j + 1;
      continue;
    }
    if ('(),;.'.includes(c)) { out.push({ kind: 'mark', value: c }); i += 1; continue; }
    const word = /^[A-Za-z_][A-Za-z0-9_]*/.exec(sql.slice(i, i + 80));
    if (word) { out.push({ kind: 'word', value: word[0].toLowerCase() }); i += word[0].length; continue; }
    throw new Error(`it holds ${JSON.stringify(c)}, which no seed row needs`);
  }
  return out;
}

/** Every row of the seed, as { game, family, scale, pays, claim, round }. */
export function seedRows(sql) {
  const tk = tokens(String(sql).split('\r\n').join('\n'));
  let at = 0;
  const said = t => (t ? (t.kind === 'text' ? `'${t.value}'` : t.value) : 'the end');
  const take = (kind, value) => {
    const t = tk[at];
    if (!t || t.kind !== kind || (value !== undefined && t.value !== value)) {
      throw new Error(`expected ${value ?? kind} at token ${at + 1}, found ${said(t)}`);
    }
    at += 1;
    return t;
  };
  for (const w of ['insert', 'into', 'public']) take('word', w);
  take('mark', '.');
  take('word', 'game_rules');
  take('mark', '(');
  COLUMNS.forEach((c, k) => { if (k) take('mark', ','); take('word', c); });
  take('mark', ')');
  take('word', 'values');
  const rows = [];
  for (;;) {
    take('mark', '(');
    const values = [];
    for (let k = 0; k < COLUMNS.length; k++) {
      if (k) take('mark', ',');
      const t = tk[at];
      at += 1;
      if (t && t.kind === 'text') values.push(t.value);
      else if (t && t.kind === 'word' && t.value === 'null') values.push(null);
      else if (t && t.kind === 'word' && (t.value === 'true' || t.value === 'false')) values.push(t.value === 'true');
      else throw new Error(`row ${rows.length + 1}, column ${COLUMNS[k]}: ${said(t)} is not a value`);
    }
    take('mark', ')');
    rows.push(Object.fromEntries(COLUMNS.map((c, k) => [c, values[k]])));
    const t = take('mark');
    if (t.value === ';') break;
    if (t.value !== ',') throw new Error(`after row ${rows.length}: ${said(t)}`);
  }
  if (at !== tk.length) throw new Error(`something follows the insert (${said(tk[at])}), and the seed is one statement`);
  return rows;
}

const shown = v => (v === null ? 'null' : typeof v === 'string' ? `'${v}'` : String(v));

/** Every way the seed text and the family table disagree; empty when they agree row for row. */
export function seedAgainstTable(groups, sql) {
  let rows;
  try {
    rows = seedRows(sql);
  } catch (e) {
    return [`the seed does not read as one insert into public.game_rules: ${e.message}`];
  }
  const problems = [];
  const want = new Map();
  for (const group of groups) {
    for (const [game, rule] of Object.entries(group.games)) {
      if (want.has(game)) { problems.push(`${game} is filed twice in the table`); continue; }
      want.set(game, { game, family: group.family, scale: rule.scale, pays: rule.pays, claim: rule.claim, round: rule.round });
    }
  }
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.game)) { problems.push(`${row.game} has two seed rows`); continue; }
    seen.add(row.game);
    const rule = want.get(row.game);
    if (!rule) { problems.push(`${row.game} is seeded and filed nowhere in the table`); continue; }
    for (const c of COLUMNS) {
      if (row[c] !== rule[c]) problems.push(`${row.game}: the seed says ${c} ${shown(row[c])}, the table ${shown(rule[c])}`);
    }
  }
  for (const game of want.keys()) if (!seen.has(game)) problems.push(`${game} is filed in the table and has no seed row`);
  return problems;
}
