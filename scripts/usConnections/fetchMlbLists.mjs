/**
 * Round 1558: the closed lists the baseball checker judges by where a man's
 * own record cannot say (who threw a no-hitter, who won a batting Triple
 * Crown or a batting title, who went to Vanderbilt or LSU, who played in the
 * 2023 World Baseball Classic final, which men are a father or son of
 * another major leaguer). Each list comes whole from one documented page and
 * is written into the "lists" of
 * scripts/data/baseballConnectionsRecord-2026-10.json. A finding a list makes
 * is decided on two hosts in the ledger, like any other.
 *
 *   node scripts/usConnections/fetchMlbLists.mjs fetch <work>     (pages, cached and paced)
 *   node scripts/usConnections/fetchMlbLists.mjs write <work> <record.json>
 */
import fs from 'node:fs';
import path from 'node:path';
import { page, rows, text } from './sportsRef.mjs';

const [, , step, workArg, recordArg] = process.argv;
const WORK = path.resolve(workArg ?? '.tmp-fx/lists');
const BR = 'https://www.baseball-reference.com';
const API = 'https://statsapi.mlb.com/api/v1';
export const PAGES = {
  noHitters: `${BR}/friv/no-hitters-and-perfect-games.shtml`,
  tripleCrowns: `${BR}/awards/triple_crowns.shtml`,
  vanderbilt: `${BR}/schools/index.cgi?key_school=3c00dcfd`,
  lsu: `${BR}/schools/index.cgi?key_school=f9e0befd`,
  fatherSon: 'https://www.baseball-almanac.com/family/fam2.shtml',
};
const WBC_2023_FINAL = 719497; // statsapi gamePk: United States 2 at Japan 3, 21 March 2023 (the schedule's "World Baseball Classic Finals")
const TITLE_YEARS = [2010, 2026];

async function json(url, file) {
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const j = await r.json();
  fs.writeFileSync(file, JSON.stringify(j));
  await new Promise(res => setTimeout(res, 150));
  return j;
}

/** Player links inside one table of a page: [{ id, name }]. */
function tableLinks(html, tableId) {
  const src = html.replace(/<!--|-->/g, ' ');
  const i = src.indexOf(`id="${tableId}"`);
  if (i < 0) return [];
  const j = src.indexOf('</table>', i);
  const out = [];
  const re = /href="\/players\/[a-z]\/([a-z0-9.]+)\.shtml"[^>]*>([^<]+)</g;
  let m;
  const chunk = src.slice(i, j);
  while ((m = re.exec(chunk))) out.push({ id: m[1], name: text(m[2]) });
  return out;
}

if (step === 'fetch') {
  fs.mkdirSync(WORK, { recursive: true });
  for (const [k, url] of Object.entries(PAGES)) {
    const p = await page(WORK, k, url);
    console.log(k, p ? p.html.length : 'FAILED');
  }
  await json(`${API}/game/${WBC_2023_FINAL}/boxscore`, path.join(WORK, 'wbc2023final.json'));
  for (let y = TITLE_YEARS[0]; y <= TITLE_YEARS[1]; y += 1) {
    for (const lg of [103, 104]) {
      await json(`${API}/stats/leaders?leaderCategories=battingAverage&statGroup=hitting&season=${y}&leagueId=${lg}&sportId=1&limit=1`, path.join(WORK, `bat_${y}_${lg}.json`));
    }
  }
  console.log('fetched');
}

if (step === 'write') {
  const read = k => fs.readFileSync(path.join(WORK, k + '.html'), 'utf8');
  const uniq = list => [...new Map(list.map(x => [x.id ?? x.name, x])).values()];
  const lists = {};
  /* no-hitters, individual and combined: a man who threw any part of one fits "Threw a no-hitter" */
  const nh = read('noHitters');
  lists.noHitters = {
    about: 'every pitcher of a major league no-hitter, individual or combined (the page\'s two tables)',
    source: PAGES.noHitters,
    members: uniq([...tableLinks(nh, 'no_hitters_individual'), ...tableLinks(nh, 'no_hitters_combined')]),
  };
  const tc = read('tripleCrowns');
  lists.tripleCrownBatting = { about: 'batting Triple Crown winners', source: PAGES.tripleCrowns, members: uniq(tableLinks(tc, 'triple_crowns_b')) };
  lists.tripleCrownPitching = { about: 'pitching Triple Crown winners', source: PAGES.tripleCrowns, members: uniq(tableLinks(tc, 'triple_crowns_p')) };
  for (const k of ['vanderbilt', 'lsu']) {
    const html = read(k);
    /* the major leaguers table: every player link on the page outside the draft table */
    const all = [];
    for (const r of rows(html)) if (r._id && (r.player || r.name_display)) all.push({ id: r._id, name: (r.player || r.name_display).replace(/[*+#]/g, '').trim() });
    lists[k] = { about: `major leaguers who attended ${k === 'lsu' ? 'Louisiana State University' : 'Vanderbilt University'}`, source: PAGES[k], members: uniq(all) };
  }
  const box = JSON.parse(fs.readFileSync(path.join(WORK, 'wbc2023final.json'), 'utf8'));
  const played = [];
  for (const side of ['away', 'home']) {
    for (const p of Object.values(box.teams[side].players)) if ((p.allPositions ?? []).length) played.push({ mlb: p.person.id, name: p.person.fullName });
  }
  lists.wbc2023Final = { about: 'every man who played in the 2023 World Baseball Classic final (Japan 3, United States 2, 21 March 2023)', source: `${API}/game/${WBC_2023_FINAL}/boxscore`, members: played };
  const titles = [];
  for (let y = TITLE_YEARS[0]; y <= TITLE_YEARS[1]; y += 1) {
    for (const lg of [103, 104]) {
      const j = JSON.parse(fs.readFileSync(path.join(WORK, `bat_${y}_${lg}.json`), 'utf8'));
      const top = j.leagueLeaders?.[0]?.leaders?.[0];
      if (top) titles.push({ mlb: top.person.id, name: top.person.fullName, year: y, lg: lg === 103 ? 'AL' : 'NL', avg: top.value });
    }
  }
  lists.battingTitles = { about: `batting champions (the qualified leader in batting average) of each league, ${TITLE_YEARS[0]} to ${TITLE_YEARS[1]}`, source: `${API}/stats/leaders?leaderCategories=battingAverage&statGroup=hitting&season=<year>&leagueId=<103|104>&sportId=1&limit=1`, members: titles };
  /* fathers and sons: the almanac lists each pair as two linked names in one table row */
  const fs2 = fs.readFileSync(path.join(WORK, 'fatherSon.html'), 'utf8');
  const names = [];
  /* the almanac's player ids are baseball-reference's; a name can sit inside a <strong> */
  const re = /<a href="[^"]*players\/player\.php\?p=([a-z0-9]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(fs2))) names.push({ id: m[1], name: text(m[2]) });
  lists.fatherSon = { about: 'every major leaguer whose father or son also played in the majors', source: PAGES.fatherSon, members: uniq(names) };
  const doc = JSON.parse(fs.readFileSync(recordArg, 'utf8'));
  doc.lists = lists;
  const out = JSON.stringify(doc).replace(/,"men":\{/, ',\n"men":{\n').replace(/\},"(?=[^"]+":\{"id")/g, '},\n"').replace(/,"lists":\{/, ',\n"lists":{');
  fs.writeFileSync(recordArg, out + '\n');
  for (const [k, v] of Object.entries(lists)) console.log(k, v.members.length);
}
