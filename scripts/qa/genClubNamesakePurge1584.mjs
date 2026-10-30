/* Round 1584: the cache purge form for Soccer Grid's stored "Played for Arsenal" yeses of men who never played for
   Arsenal of London: men whose only stints the old rule read as Arsenal are at Arsenal Tula, Arsenal Kyiv, Arsenal
   Dzerzhinsk or Berekum Arsenal (critic 8). A stored yes is served before the records pass (soccer-grid-validate's
   cache read), so the deployed rule alone never reaches a man who was accepted once.

   Run by the LEAD at the apply, from a FRESH Q6 (the cache grows daily), never from a builder's export:
     node scripts/qa/genClubNamesakePurge1584.mjs --stints <Q3c.json> --cache <Q6.json> --out <purge.sql>
   Q3c is the lead's read of every stint of every name holding an Arsenal FC stint plus every stint at any arsenal
   string (committed as scripts/data/clubNamesakes1584/stintsArsenalMen-2026-10-29.json). Q6 is
     select game, cache_key, verdict::text as verdict, md5(concat_ws('|', game, cache_key, verdict::text)) as h
     from public.ai_validation_cache
     where game in ('soccer-grid', 'football-connect4', 'build-your-xi') and cache_key ilike '%arsenal%'
     order by game, cache_key;
   (the text of scripts/qa/clubNamesakes1584CacheRead.sql) saved as a JSON array of those four columns.

   Who: a folded name all of whose Q3c stints the OLD rule (CLUB_NAMESAKES emptied) reads as Arsenal on at least one
   and the CURRENT rule on none, with no verified 2026 move to an Arsenal club in TRANSFER_OVERLAY_2026. Both rules are
   the function's own code (scripts/lib/gridRuleFromSource.mjs), never a copy.
   What is deleted: a soccer-grid row whose verdict says valid true, whose key's row or column part is exactly the
   folded Arsenal label ("played for arsenal"), and whose player part, folded the function's way, IS one of those
   names. A one word player part that is only the surname of such a man is HELD (printed, never deleted): the function
   resolves a surname only when one name carries it, which a Q3c cannot tell. Refusals are never deleted (after the fix
   they are right), and Soccer Connect 4 and Build Your XI rows are never touched (their club lists are exact).
   The form is ONE DO block: the one line payload's md5 is checked first, each row is deleted only while md5 of its
   game, key and verdict text still equals the hash Q6 read, and it raises (nothing removed) unless K of K matched.
   Exit 0 with the form written; exit 1 on an unreadable input or a broken source. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildGridRule } from '../lib/gridRuleFromSource.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const stintsFile = arg('--stints'), cacheFile = arg('--cache'), outFile = arg('--out');
if (!stintsFile || !cacheFile || !outFile) { console.error('usage: --stints <Q3c.json> --cache <Q6.json> --out <purge.sql>'); process.exit(1); }
const fnPath = path.join(ROOT, 'supabase', 'functions', 'soccer-grid-validate', 'index.ts');
const raw = fs.readFileSync(fnPath, 'utf8').replace(/\r\n/g, '\n');
const BLOCK = /const CLUB_NAMESAKES: Record<string, string\[\]> = \{[\s\S]*?\n\};/;
if (!BLOCK.test(raw)) { console.error('CLUB_NAMESAKES is not in soccer-grid-validate: nothing to purge for. Nothing written.'); process.exit(1); }
const head = buildGridRule(raw, { withOverlay: true });
const old = buildGridRule(raw.replace(BLOCK, 'const CLUB_NAMESAKES: Record<string, string[]> = {};'));
const LABEL = 'Arsenal';
const LABEL_KEY = `played for ${LABEL}`.toLowerCase();

const stints = JSON.parse(fs.readFileSync(stintsFile, 'utf8'));
const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
if (!Array.isArray(stints) || !Array.isArray(cache)) { console.error('both inputs must be JSON arrays. Nothing written.'); process.exit(1); }
if (cache.some(r => typeof r.game !== 'string' || typeof r.cache_key !== 'string' || typeof r.verdict !== 'string' || !/^[0-9a-f]{32}$/.test(r.h))) {
  console.error('a Q6 row lacks game, cache_key, verdict text or its md5 h. Nothing written.'); process.exit(1);
}

const byName = new Map();
for (const s of stints) {
  const n = s.name_folded ?? head.norm(s.player_name);
  if (!byName.has(n)) byName.set(n, []);
  byName.get(n).push(s);
}
const men = new Map();
for (const [n, rows] of byName) {
  if (!rows.some(r => old.clubMatches(r.club, LABEL))) continue;
  if (rows.some(r => head.clubMatches(r.club, LABEL))) continue;
  const moves = head.TRANSFER_OVERLAY_2026[n]?.clubs ?? [];
  if (moves.some(c => head.clubMatches(c, LABEL))) continue;
  men.set(n, rows);
}
/* critic 1: after the deploy the records pass says a hard NO only with careerComplete (one nationality over every
   stint of the name, and a debut in 2005 or later or at 21 or younger); for the rest the model decides. Q3c holds only
   these men's arsenal string stints, so one nationality here is necessary, not sufficient: the residual below is the
   men the records pass certainly leaves to the model. stints[0] is whichever row the table returns first, so a man
   is counted for the hard no only when every row meets the debut rule. */
const residual = [];
for (const [n, rows] of men) {
  const nats = new Set(rows.map(r => head.norm(r.nationality ?? '')).filter(Boolean));
  const first = Math.min(...rows.map(r => r.first_year));
  const debutOk = rows.every(r => (r.debut_year ?? first) >= 2005 || (r.debut_age != null && r.debut_age <= 21));
  if (nats.size > 1 || !debutOk) residual.push(`${rows[0].player_name} (${[...new Set(rows.map(r => r.club))].join(', ')}, ${nats.size > 1 ? 'two nationalities' : 'debut ' + (rows[0].debut_year ?? first) + ' at ' + rows[0].debut_age})`);
}

const del = [], held = [];
for (const r of cache) {
  if (r.game !== 'soccer-grid') continue;
  let verdict;
  try { verdict = JSON.parse(r.verdict); } catch { continue; }
  if (verdict?.valid !== true) continue;
  const parts = r.cache_key.split('|');
  if (parts.length !== 3 || (parts[1].trim() !== LABEL_KEY && parts[2].trim() !== LABEL_KEY)) continue;
  const who = head.norm(parts[0]);
  if (men.has(who)) del.push(r);
  else if (who && !who.includes(' ') && [...men.keys()].some(n => n.endsWith(' ' + who))) held.push(r);
}
del.sort((a, b) => (a.cache_key < b.cache_key ? -1 : a.cache_key > b.cache_key ? 1 : 0));

const payload = JSON.stringify(del.map(r => ({ game: r.game, cache_key: r.cache_key, h: r.h })));
if (/[\r\n]/.test(payload) || payload.includes('$purge$')) { console.error('the payload cannot be one dollar quoted line. Nothing written.'); process.exit(1); }
const md5 = createHash('md5').update(payload, 'utf8').digest('hex');
const K = del.length;
const sql = [
  '-- Round 1584: Soccer Grid\'s stored "Played for Arsenal" yeses of men whose only Arsenal reading stints are at',
  '-- another club wearing the word (Arsenal Tula, Kyiv, Dzerzhinsk, Berekum). Generated by',
  `-- scripts/qa/genClubNamesakePurge1584.mjs from ${path.basename(cacheFile)} (${cache.length} rows read) and`,
  `-- ${path.basename(stintsFile)} (${men.size} men). Run ONCE, after the deploy of CLUB_NAMESAKES is verified by hash.`,
  `-- EXPECT the notice "Round 1584: ${K} cached verdicts removed"; anything else raises and removes nothing.`,
  'do $purge$',
  'declare',
  `  payload text := '${payload.replace(/'/g, "''")}';`,
  `  want int := ${K};`,
  '  removed int;',
  'begin',
  `  if md5(payload) <> '${md5}' then`,
  "    raise exception 'Round 1584 purge: the payload checksum does not match, nothing removed';",
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
  "    raise exception 'Round 1584 purge: % of % rows still match their read, nothing removed', removed, want;",
  '  end if;',
  "  raise notice 'Round 1584: % cached verdicts removed', removed;",
  'end $purge$;',
  '',
].join('\n');
fs.writeFileSync(outFile, sql);
console.log(`men: ${men.size} folded names whose only Arsenal reading stints are at an excluded string`);
console.log(`records pass after the deploy: ${men.size - residual.length} may get a hard no (one nationality in Q3c, every row meets the debut rule; their other clubs are not in Q3c), ${residual.length} certainly go to the model:`);
for (const r of residual) console.log(`  model decides: ${r}`);
console.log(`cache: ${cache.length} rows read, ${K} to delete, ${held.length} held (a surname only key)`);
for (const r of del) console.log(`  delete: ${r.cache_key}`);
for (const r of held) console.log(`  HELD, read it by hand: ${r.cache_key}`);
console.log(`payload md5 ${md5}; written ${outFile}`);
