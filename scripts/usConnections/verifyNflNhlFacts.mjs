/**
 * Round 1558: the second host for the NFL and NHL facts the round owes two.
 *
 * The records are one host each (ESPN's athlete service for the NFL, the
 * league's own service for the NHL). The second: nfl.com's career page for
 * each footballer (his club and games season by season), and
 * hockey-reference.com's page for each hockey player (his clubs and his
 * career regular season points). A fact the two hosts do not agree on is
 * printed and never written as agreed.
 *
 *   node scripts/usConnections/verifyNflNhlFacts.mjs pages <work> <needs-nfl.json> <needs-nhl.json>
 *   node scripts/usConnections/verifyNflNhlFacts.mjs facts <work> <needs-nfl.json> <needs-nhl.json> <out-nfl.json> <out-nhl.json>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { page, rows, text } from './sportsRef.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [, , step, workArg, nflNeeds, nhlNeeds, outNfl, outNhl] = process.argv;
const WORK = path.resolve(workArg ?? '.tmp-fx/verify-us');
const fold = s => String(s).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/g, '');
const plain = s => String(s).normalize('NFD').replace(/\p{M}/gu, '');

/* nfl.com's page slug, and hockey-reference's player id, where the plain rule does not give it */
const NFL_SLUG = { 'Cam Heyward': 'cameron-heyward', 'T.J. Watt': 't-j-watt', "Le'Veon Bell": 'le-veon-bell' };
const HR_ID = { 'Marc-Edouard Vlasic': 'vlasima01', 'Tomáš Hertl': 'hertlto01', 'Evander Kane': 'kaneev01' };
export const nflUrl = name => `https://www.nfl.com/players/${NFL_SLUG[name] ?? plain(name).toLowerCase().replace(/[.']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}/stats/career`;
const hrId = name => {
  if (HR_ID[name]) return HR_ID[name];
  const [first, ...rest] = plain(name).toLowerCase().replace(/[^a-z ]/g, '').split(' ');
  const last = rest.join('');
  return `${last.slice(0, 5)}${first.slice(0, 2)}01`;
};
export const hrUrl = name => `https://www.hockey-reference.com/players/${hrId(name)[0]}/${hrId(name)}.html`;

const read = f => (f && fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).needs : []);

/* read by hand where nfl.com's career page carries no table (a kicker's), recorded word for word */
const MANUAL = {
  'Justin Tucker|Played for the Ravens': { v: true, host: 'statmuse.com', url: 'https://www.statmuse.com/nfl/ask/justin-tucker-career-stats-by-season', says: 'regular season rows 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023 and 2024, every one BAL (read 2026-10-22)' },
};

if (step === 'pages') {
  for (const n of read(nflNeeds)) await page(WORK, 'nfl_' + fold(n.name), nflUrl(n.name));
  for (const n of read(nhlNeeds)) await page(WORK, 'nhl_' + fold(n.name), hrUrl(n.name));
  console.log('pages done');
}

/** nfl.com career rows: [season, club name, games]. */
function nflSeasons(html) {
  const out = new Set();
  for (const m of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const t = text(m[1]);
    const r = t.match(/^(\d{4}) ([A-Z][A-Za-z. ]+?) (\d+)\b/);
    if (r) out.add(`${r[1]}|${r[2]}|${r[3]}`);
  }
  return [...out].map(x => x.split('|'));
}

/** hockey-reference: NHL regular season clubs and career points. */
function hrPlayer(html) {
  const clubs = new Set();
  let points = null;
  for (const r of rows(html)) {
    if (r.comp_name_abbr === 'NHL' && /^\d{4}-\d{2}$/.test(r.year_id ?? '') && r.team_name_abbr && !/TOT|\dTM/.test(r.team_name_abbr)) clubs.add(r.team_name_abbr);
    if (points === null && /yrs|career/i.test(r.year_id ?? '') && r.points !== undefined && (r.comp_name_abbr === 'NHL' || r.comp_name_abbr === undefined || r.comp_name_abbr === '')) points = Number(r.points);
  }
  const title = (html.match(/<title>([^<]+)<\/title>/) ?? [])[1] ?? '';
  return { clubs: [...clubs], points, title };
}

if (step === 'facts') {
  const us = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/usConnectionsCheck.mjs')).href);
  const NFL_TEAMS = { ravens: 'Baltimore Ravens', steelers: 'Pittsburgh Steelers' };
  const SHARKS = 'SJS';
  for (const [sport, needsFile, out] of [['nfl', nflNeeds, outNfl], ['nhl', nhlNeeds, outNhl]]) {
    const { checker } = us.makeUsChecker(ROOT, sport);
    const rec = JSON.parse(fs.readFileSync(path.join(ROOT, `scripts/data/${sport}ConnectionsRecord-2026-10.json`), 'utf8')).men;
    const facts = [];
    const problems = [];
    for (const n of read(needsFile)) {
      const c = checker.criterion(n.label);
      const v1 = checker.fits(n.name, c);
      const m = rec[n.name];
      let e1, e2;
      if (sport === 'nfl') {
        const f = path.join(WORK, `nfl_${fold(n.name)}.html`);
        if (!fs.existsSync(f)) { problems.push(`${n.name}: no nfl.com page`); continue; }
        const seasons = nflSeasons(fs.readFileSync(f, 'utf8'));
        const team = NFL_TEAMS[fold(n.label.replace(/^Played for the /, ''))];
        const hit = seasons.filter(([, t]) => t === team);
        e1 = { host: 'site.web.api.espn.com', url: `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${m?.espn}/stats`, says: `seasons with clubs: ${Object.entries(m?.seasons ?? {}).filter(([, cl]) => cl.length).map(([y, cl]) => `${y} ${cl.join('/')}`).join(', ')}` };
        e2 = { v: hit.length > 0, host: 'nfl.com', url: nflUrl(n.name), says: hit.length ? `${team}: ${hit.map(([y, , g]) => `${y} (${g} games)`).join(', ')}` : `no season with the ${team}` };
        if (!seasons.length && MANUAL[`${n.name}|${n.label}`]) e2 = { ...MANUAL[`${n.name}|${n.label}`] };
      } else {
        const f = path.join(WORK, `nhl_${fold(n.name)}.html`);
        if (!fs.existsSync(f)) { problems.push(`${n.name}: no hockey-reference page`); continue; }
        const p = hrPlayer(fs.readFileSync(f, 'utf8'));
        if (!fold(p.title).startsWith(fold(n.name).slice(0, 6))) { problems.push(`${n.name}: hockey-reference page is "${p.title}"`); continue; }
        e1 = { host: 'api-web.nhle.com', url: `https://api-web.nhle.com/v1/player/${m?.nhl}/landing`, says: c.kind === 'career' ? `career regular season points ${m?.career?.P}${m?.active ? ', still playing' : ''}` : `NHL clubs: ${[...new Set(Object.values(m?.seasons ?? {}).flat())].join(', ')}` };
        const v = c.kind === 'career' ? (p.points ?? 0) >= c.min : p.clubs.includes(SHARKS);
        e2 = { v, host: 'hockey-reference.com', url: hrUrl(n.name), says: c.kind === 'career' ? `career NHL points ${p.points}` : `NHL clubs: ${p.clubs.join(', ')}` };
      }
      if (v1 !== n.expect || e2.v !== n.expect) { problems.push(`${n.id} ${n.name} "${n.label}" expect ${n.expect}: record ${v1}, second host ${e2.v} (${e2.says})`); continue; }
      delete e2.v;
      facts.push({ id: n.id, label: n.label, name: n.name, holds: n.expect, why: n.why, ...(n.key ? { finding: n.key } : {}), sources: [e1, e2] });
    }
    fs.writeFileSync(out, JSON.stringify(facts, null, 1));
    console.log(`${sport}: ${facts.length} facts agreed on two hosts, ${problems.length} not`);
    for (const p of problems) console.log('  ' + p);
  }
}
