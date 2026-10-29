/**
 * Round 1583: the second host for every NBA Connections fact, basketball-reference.com.
 *
 * The record (scripts/data/nbaConnectionsRecord-2026-10.json) is ESPN's athlete service and nba.com's player page.
 * This reads each man's basketball-reference page (scripts/usConnections/sportsRef.mjs: cached, one page every five
 * seconds) and keeps what any NBA label can ask of it, so the checker judges every verdict on both hosts and returns
 * unknown where they disagree (critic-1583 items 2 to 5):
 *   seasons  NBA regular season rows of the Totals table, season -> team codes (a traded season's TOT or 2TM row
 *            skipped, the team rows kept)
 *   aba      the ABA rows, kept apart (a club group counts NBA seasons only; a man with ABA seasons for the club
 *            beside him is a gray pair)
 *   career   NBA regular season totals summed over those team rows: GP, PTS, REB, AST, FG3M, STL, BLK (a stat the
 *            page leaves blank for a season, as it does before it was kept, adds nothing)
 *   born     the birthplace line and its country (the page's birthplaces link code, mapped by NBA_COUNTRY_CODES)
 *   draft    [year, round, overall pick, team] from the Draft line
 *   hof      the year he was inducted as a player, or null
 *
 *   node scripts/usConnections/verifyNbaFacts.mjs pages <work>       (MAX pages a run; every man the record holds)
 *   READ_ON=2026-10-29 node scripts/usConnections/verifyNbaFacts.mjs second <work>
 *       writes scripts/data/nbaConnectionsSecondHost-2026-10.json (only grows: a man it holds is never rewritten)
 *
 * The page id follows the site's rule (the first five letters of the surname, the first two of the given name,
 * then 01); a page is taken only when its name is the tile's and its first NBA season is ESPN's first (by the name
 * alone where ESPN keeps no season), else the next number is read (02 to 04). BR_ID names the page where the rule
 * cannot reach it. A page the site fails to answer is not cached, so the next run reads it again.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { page, rows, meta, text } from './sportsRef.mjs';
import { fold, NBA_COUNTRY_CODES } from '../lib/usConnectionsCheck.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RECORD = path.join(ROOT, 'scripts', 'data', 'nbaConnectionsRecord-2026-10.json');
const SECOND = path.join(ROOT, 'scripts', 'data', 'nbaConnectionsSecondHost-2026-10.json');
const plain = s => String(s).normalize('NFD').replace(/\p{M}/gu, '');

/* tile name -> basketball-reference id where the rule does not reach the page */
export const BR_ID = {
  'Kareem Abdul-Jabbar': 'abdulka01', "Amar'e Stoudemire": 'stoudam01', 'Shai Gilgeous-Alexander': 'gilgesh01',
  'Marvin Bagley III': 'baglema01', 'Yao Ming': 'mingya01',
  'Jalen Green': 'greenja05', // greenja01 to 04 are namesakes with other first seasons
};
const ruleId = (name, n) => {
  if (BR_ID[name] && n === 1) return BR_ID[name];
  const parts = plain(name).toLowerCase().replace(/ (iii|ii|jr\.?|sr\.?)$/, '').replace(/[^a-z ]/g, '').split(' ');
  const first = parts[0];
  const last = parts.slice(1).join('');
  return `${last.slice(0, 5)}${first.slice(0, 2)}${String(n).padStart(2, '0')}`;
};
export const brUrl = id => `https://www.basketball-reference.com/players/${id[0]}/${id}.html`;

/** What the page says, in the fields above. */
export function parseBr(html) {
  const h1 = text((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) ?? [])[1] ?? '');
  const i = html.indexOf('id="totals_stats"');
  const j = i < 0 ? -1 : html.indexOf('</table>', i);
  const seasons = {};
  const aba = {};
  const career = { GP: 0, PTS: 0, REB: 0, AST: 0, FG3M: 0, STL: 0, BLK: 0 };
  const n = v => (/^\d+$/.test(String(v ?? '')) ? Number(v) : 0);
  for (const r of i < 0 ? [] : rows(html.slice(i, j))) {
    if (!/^\d{4}-\d{2}$/.test(r.year_id ?? '') || !r.team_name_abbr || /^(TOT|\dTM)$/.test(r.team_name_abbr)) continue;
    if (!/^\d+$/.test(r.games ?? '')) continue;
    const into = r.comp_name_abbr === 'ABA' ? aba : r.comp_name_abbr === 'NBA' ? seasons : null;
    if (!into) continue;
    (into[r.year_id] ??= []).includes(r.team_name_abbr) || into[r.year_id].push(r.team_name_abbr);
    if (into === seasons) {
      career.GP += n(r.games); career.PTS += n(r.pts); career.REB += n(r.trb); career.AST += n(r.ast);
      career.FG3M += n(r.fg3); career.STL += n(r.stl); career.BLK += n(r.blk);
    }
  }
  const m = meta(html);
  const code = (html.match(/birthplaces\.fcgi\?country=([A-Za-z]{2})/) ?? [])[1]?.toUpperCase() ?? null;
  /* the birthplace runs up to the flag, which is the country link's code in lower case */
  const bornText = code ? (m.match(new RegExp(`Born: .*? in (.+?) ${code.toLowerCase()} `)) ?? [])[1] ?? null : null;
  const d = m.match(/Draft: (.+?) , (\d+)(?:st|nd|rd|th) round \((\d+)(?:st|nd|rd|th) pick, (\d+)(?:st|nd|rd|th) overall\), (\d{4}) NBA Draft/);
  const hof = (m.match(/Hall of Fame: Inducted as Player in (\d{4})/) ?? [])[1] ?? null;
  const sort = o => Object.fromEntries(Object.keys(o).sort().map(k => [k, o[k].sort()]));
  return {
    h1, seasons: sort(seasons), aba: sort(aba), career, bornText, bornCode: code, born: code ? NBA_COUNTRY_CODES[code] ?? null : null,
    draft: d ? [Number(d[5]), Number(d[2]), Number(d[4]), d[1].trim()] : null, hof: hof ? Number(hof) : null,
  };
}

const recordMen = () => JSON.parse(fs.readFileSync(RECORD, 'utf8')).men;
/** The first season the record knows for a man: ESPN's first season, else nba.com's first year. */
const firstSeason = m => Object.keys(m.seasons ?? {}).sort()[0] ?? null;

/** Read pages until one is the man's: [{ id, url, br }] or null. */
async function findPage(work, name, m, budget) {
  for (let n = 1; n <= 4; n += 1) {
    const id = ruleId(name, n);
    if (budget.left <= 0 && !fs.existsSync(path.join(work, `nba_${id}.html`))) return { pending: true };
    if (!fs.existsSync(path.join(work, `nba_${id}.html`))) budget.left -= 1;
    const p = await page(work, `nba_${id}`, brUrl(id));
    if (!p) continue;
    const br = parseBr(p.html);
    if (fold(br.h1) !== fold(m.name ?? name) && fold(br.h1) !== fold(name)) continue;
    /* a page BR_ID names is taken by the name alone: ESPN's first season is not his first where its record is
       short (Kareem Abdul-Jabbar's starts at 1975-76, without his Milwaukee seasons) */
    const want = n === 1 && BR_ID[name] ? null : firstSeason(m);
    const got = Object.keys(br.seasons)[0] ?? null;
    if (want && got !== want) continue;
    return { id, url: p.url, br };
  }
  return null;
}

const step = process.argv[2];
const WORK = path.resolve(process.argv[3] ?? '.tmp-fx/bbrefwork');
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (step === 'pages' || step === 'second') {
    const men = recordMen();
    const budget = { left: step === 'pages' ? Number(process.env.MAX ?? 24) : 0 };
    const doc = fs.existsSync(SECOND) ? JSON.parse(fs.readFileSync(SECOND, 'utf8')) : null;
    const out = { ...(doc?.men ?? {}) };
    const problems = [];
    let pending = 0;
    for (const name of Object.keys(men).sort()) {
      if (out[name]) continue;
      const r = await findPage(WORK, name, men[name], budget);
      if (r?.pending) { pending += 1; continue; }
      if (!r) { problems.push(`${name}: no basketball-reference page with his name and first season ${firstSeason(men[name])}`); continue; }
      out[name] = { bbref: r.id, url: r.url, ...r.br, readOn: process.env.READ_ON ?? null };
      delete out[name].h1;
    }
    if (step === 'pages') { console.log(`pages: ${Object.keys(out).length - Object.keys(doc?.men ?? {}).length} men found, ${pending} still to read`); for (const p of problems) console.log('  PROBLEM ' + p); }
    if (step === 'second') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(process.env.READ_ON ?? '')) { console.error('second needs READ_ON=YYYY-MM-DD'); process.exit(2); }
      for (const [n, m] of Object.entries(doc?.men ?? {})) if (JSON.stringify(out[n]) !== JSON.stringify(m)) { console.error(`STOP: ${n} would change`); process.exit(1); }
      const about = 'Round 1583. The second host for every NBA Connections fact: basketball-reference.com, one page per man (the Totals table, the birthplace line and its country link, the Draft line, the Hall of Fame line), read by scripts/usConnections/verifyNbaFacts.mjs. seasons are NBA regular season rows by team code (a traded season\'s total row skipped), aba the ABA rows kept apart, career the NBA regular season totals summed over the team rows. The checker (scripts/lib/usConnectionsCheck.mjs, makeNbaChecker) reads this beside the record and returns unknown wherever the two hosts disagree on a verdict. Never edited by hand; a man it holds is never rewritten.';
      const text2 = JSON.stringify({ about, source: 'https://www.basketball-reference.com/players/<x>/<id>.html', men: Object.fromEntries(Object.keys(out).sort().map(n => [n, out[n]])) }).replace(/,"men":\{/, ',\n"men":{\n').replace(/\},"(?=[^"]+":\{"bbref")/g, '},\n"') + '\n';
      fs.writeFileSync(SECOND, text2);
      console.log(`second: ${Object.keys(out).length} men written, ${pending} not read yet, ${problems.length} problems`);
      for (const p of problems) console.log('  PROBLEM ' + p);
    }
  } else {
    console.error('usage: pages <work> | second <work>');
    process.exit(2);
  }
}
