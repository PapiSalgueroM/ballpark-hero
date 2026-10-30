/* Round 1587 (review major 2): the cache purge form for Build Your XI's and Soccer Connect 4's stored Arsenal yeses
   of the Arsenal de Sarandí men. Before the apply those men are stored as "Arsenal FC", the exact string both
   validators' club lists hold (validate-player CLUB_STRINGS, football-connect4-validate C4_CLUB_STRINGS), so their
   records passes could confirm them for Arsenal and CACHE the yes; a stored yes is served before the records pass, so
   the apply alone never reaches a man who was confirmed once. Round 1584's purge (genClubNamesakePurge1584.mjs) skips
   both games on purpose (its men were never stored as Arsenal FC); Soccer Grid's yeses stay that generator's (APPLY-1584
   step 4, run from a fresh Q3c after this round's write).

   Run by the LEAD after the write (APPLY-1587 step 7b), from a FRESH Q6 (scripts/qa/clubNamesakes1584CacheRead.sql,
   the same read 1584 uses, saved as a JSON array of {game, cache_key, verdict, h}), never from a builder's export:
     node scripts/qa/genArsenalCachePurge1587.mjs --cache <Q6.json> --out <purge.sql>
   Who: the ledger's sarandi men (arsenalLedger.json), by every stored spelling of their Q2 rows plus the page aliases
   the ledger generator reads (ALIASES). A spelling another Q2 man also carries is never purged (HELD).
   What is deleted, each only while md5 of its game, key and verdict text still equals the hash Q6 read:
     build-your-xi       key "<player>|arsenal|<position>|c" (validate-player: flat(player)|flat(team)|pos|c), valid true
     football-connect4   pair key "<player>|<row>|<column>" with a side reading "played for arsenal", valid true; and the
                         one attribute fact "attr|<player>|played for arsenal", match true
   where <player>, folded, IS one of those spellings. A one word player part that is only the last name of such a man
   is HELD (printed, never deleted). Refusals are never deleted. Other games' rows are never touched.
   The form is ONE DO block: the one line payload's md5 is checked first, and it raises (nothing removed) unless K of K
   rows still match their read. Exit 0 with the form written; exit 1 on an unreadable input. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ALIASES, LEDGER_FILE, MARKET_FILE } from './genArsenalLedger1587.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA = path.join(ROOT, 'scripts', 'data', 'clubNamesakes1584');
export const GAMES = ['build-your-xi', 'football-connect4'];
/* one fold for both key shapes (validate-player's flat and football-connect4's norm both lower case and strip marks;
   flat also turns punctuation into spaces): folding a key part and a stored spelling the same way compares them */
export const loose = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ').trim();
const playedForArsenal = a => { const m = /^\s*played\s+for\s+(.+?)\s*$/i.exec(a); return !!m && loose(m[1]) === 'arsenal'; };

export function computeCachePurge(ledger, market, cache) {
  const byId = new Map(market.map(r => [r.id, r]));
  const sar = ledger.men.filter(m => m.verdict === 'sarandi');
  const sarIds = new Set(sar.flatMap(m => m.rows));
  const others = new Set(market.filter(r => !sarIds.has(r.id)).map(r => loose(r.player_name)));
  const names = new Map();
  for (const m of sar) {
    const spellings = new Set(m.rows.map(id => loose(byId.get(id)?.player_name)).concat((ALIASES[m.nameFolded] || []).map(loose)));
    for (const s of spellings) if (s) names.set(s, m.name);
  }
  const clash = [...names.keys()].filter(s => others.has(s));
  for (const s of clash) names.delete(s);
  const lastNames = new Set([...names.keys()].map(s => s.split(' ').pop()));
  const del = [], held = [];
  const judge = (r, who) => {
    const w = loose(who);
    if (names.has(w)) del.push(r);
    else if (w && !w.includes(' ') && lastNames.has(w)) held.push(r);
    else if (clash.includes(w)) held.push(r);
  };
  for (const r of cache) {
    if (!GAMES.includes(r.game)) continue;
    let v; try { v = JSON.parse(r.verdict); } catch { continue; }
    const p = r.cache_key.split('|');
    if (r.game === 'build-your-xi') {
      if (p.length === 4 && p[1].trim() === 'arsenal' && p[3] === 'c' && v?.valid === true) judge(r, p[0]);
    } else if (p[0] === 'attr') {
      if (p.length === 3 && playedForArsenal(p[2]) && v?.match === true) judge(r, p[1]);
    } else if (p.length === 3 && (playedForArsenal(p[1]) || playedForArsenal(p[2])) && v?.valid === true) judge(r, p[0]);
  }
  const order = (a, b) => (a.game + '|' + a.cache_key < b.game + '|' + b.cache_key ? -1 : 1);
  return { del: del.sort(order), held: held.sort(order), men: sar.length, spellings: names.size, clash };
}

export function writeCachePurgeSql(del, meta) {
  const payload = JSON.stringify(del.map(r => ({ game: r.game, cache_key: r.cache_key, h: r.h })));
  if (/[\r\n]/.test(payload) || payload.includes('$purge1587$')) throw new Error('the payload cannot be one dollar quoted line');
  const md5 = createHash('md5').update(payload, 'utf8').digest('hex');
  const K = del.length;
  const sql = [
    '-- Round 1587: Build Your XI\'s and Soccer Connect 4\'s stored Arsenal yeses of the Arsenal de Sarandí men. Generated',
    `-- by scripts/qa/genArsenalCachePurge1587.mjs from ${meta.cacheName} (${meta.read} rows read) and arsenalLedger.json`,
    `-- (${meta.men} sarandi men, ${meta.spellings} spellings). Run ONCE, after the Round 1587 write printed its notice.`,
    `-- EXPECT the notice "Round 1587: ${K} cached verdicts removed"; anything else raises and removes nothing.`,
    'do $purge1587$',
    'declare',
    `  payload text := '${payload.replace(/'/g, "''")}';`,
    `  want int := ${K};`,
    '  removed int;',
    'begin',
    `  if md5(payload) <> '${md5}' then`,
    "    raise exception 'Round 1587 purge: the payload checksum does not match, nothing removed';",
    '  end if;',
    '  with p as (',
    "    select x->>'game' as game, x->>'cache_key' as cache_key, x->>'h' as h from jsonb_array_elements(payload::jsonb) x",
    '  ), d as (',
    '    delete from public.ai_validation_cache c using p',
    '    where c.game = p.game and c.cache_key = p.cache_key',
    "      and md5(concat_ws('|', c.game, c.cache_key, c.verdict::text)) = p.h",
    '    returning 1',
    '  )',
    '  select count(*) into removed from d;',
    '  if removed <> want then',
    "    raise exception 'Round 1587 purge: % of % rows still match their read, nothing removed', removed, want;",
    '  end if;',
    "  raise notice 'Round 1587: % cached verdicts removed', removed;",
    'end $purge1587$;',
    '',
  ].join('\n');
  return { sql, md5, K };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const cacheFile = arg('--cache'), outFile = arg('--out');
  if (!cacheFile || !outFile) { console.error('usage: --cache <Q6.json> --out <purge.sql>'); process.exit(1); }
  const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  if (!Array.isArray(cache) || cache.some(r => typeof r.game !== 'string' || typeof r.cache_key !== 'string' || typeof r.verdict !== 'string' || !/^[0-9a-f]{32}$/.test(r.h))) {
    console.error('Q6 must be a JSON array of {game, cache_key, verdict text, h}. Nothing written.'); process.exit(1);
  }
  const ledger = JSON.parse(fs.readFileSync(path.join(DATA, LEDGER_FILE), 'utf8'));
  const market = JSON.parse(fs.readFileSync(path.join(DATA, MARKET_FILE), 'utf8'));
  const res = computeCachePurge(ledger, market, cache);
  const out = writeCachePurgeSql(res.del, { cacheName: path.basename(cacheFile), read: cache.length, men: res.men, spellings: res.spellings });
  fs.writeFileSync(outFile, out.sql);
  console.log(`men: ${res.men} sarandi men, ${res.spellings} spellings${res.clash.length ? `, ${res.clash.length} shared with another Q2 man and never purged (${res.clash.join(', ')})` : ''}`);
  console.log(`cache: ${cache.length} rows read, ${res.del.filter(r => r.game === 'build-your-xi').length} build-your-xi and ${res.del.filter(r => r.game === 'football-connect4').length} football-connect4 to delete, ${res.held.length} held`);
  for (const r of res.del) console.log(`  delete: ${r.game} ${r.cache_key}`);
  for (const r of res.held) console.log(`  HELD, read it by hand: ${r.game} ${r.cache_key}`);
  console.log(`K ${out.K}; payload md5 ${out.md5}; written ${outFile}`);
}
