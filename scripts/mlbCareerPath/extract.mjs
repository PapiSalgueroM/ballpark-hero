// Pull every clue relevant fact out of both raw sources, side by side, into <work>/facts.json.
import fs from 'node:fs';
import { WORK } from './paths.mjs';
import { ALL } from './players.mjs';
import { BBREF, bbrefUrl } from './fetchBbref.mjs';
const ids = JSON.parse(fs.readFileSync(new URL('ids.json', WORK), 'utf8'));
const apiUrl = (pid) => `https://statsapi.mlb.com/api/v1/people/${pid}?hydrate=awards,draft,xrefId,stats(group=[hitting,pitching,fielding],type=[career,yearByYear])`;
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const AW = {
  mvp: ['ALMVP', 'NLMVP'], cy: ['ALCY', 'NLCY', 'MLBCY'], roy: ['ALROY', 'NLROY', 'MLBROY'], allStar: ['ALAS', 'NLAS'],
  goldGlove: ['ALGG', 'NLGG'], silverSlugger: ['ALSS', 'NLSS'], ws: ['WSCHAMP'], wsMvp: ['WSMVP'], hof: ['MLBHOF'], asMvp: ['ASMVP'],
};
function api(pid) {
  const p = JSON.parse(fs.readFileSync(new URL(`raw/api_${pid}.json`, WORK), 'utf8')).people[0];
  const awards = {};
  for (const [k, list] of Object.entries(AW)) {
    const hits = (p.awards || []).filter((a) => list.includes(a.id));
    const years = [...new Set(hits.map((a) => a.season))].sort();
    // All-Star counts selections (two games a year 1959 to 1962), everything else counts seasons
    awards[k] = { n: k === 'allStar' ? hits.length : years.length, years, ids: [...new Set(hits.map((a) => a.id))], teams: [...new Set(hits.map((a) => a.team?.name).filter(Boolean))] };
  }
  const stat = (type, group) => p.stats?.find((s) => s.type.displayName === type && s.group.displayName === group);
  const ch = stat('career', 'hitting')?.splits?.[0]?.stat; const cp = stat('career', 'pitching')?.splits?.[0]?.stat;
  const seasons = [];
  for (const g of ['hitting', 'pitching']) for (const sp of stat('yearByYear', g)?.splits || []) {
    if (sp.sport && sp.sport.id !== 1) continue;
    if (sp.team?.name) seasons.push([Number(sp.season), sp.team.name]);
  }
  const uniq = []; for (const s of seasons.sort((a, b) => a[0] - b[0])) if (!uniq.some((u) => u[0] === s[0] && u[1] === s[1])) uniq.push(s);
  const fld = {}; for (const sp of stat('career', 'fielding')?.splits || []) fld[sp.position?.abbreviation] = (fld[sp.position?.abbreviation] || 0) + (sp.stat.gamesPlayed || 0);
  return {
    url: apiUrl(pid), full: p.fullName, active: p.active, debut: p.mlbDebutDate, last: p.lastPlayedDate || null, pos: p.primaryPosition?.abbreviation, fielding: fld,
    drafts: (p.drafts || []).map((d) => ({ year: d.year, round: d.pickRound, pick: d.pickNumber, team: d.team?.name, signed: d.isDrafted })),
    hit: ch ? { avg: ch.avg, hr: ch.homeRuns, rbi: ch.rbi, h: ch.hits, sb: ch.stolenBases, g: ch.gamesPlayed } : null,
    pit: cp ? { w: cp.wins, l: cp.losses, era: cp.era, so: cp.strikeOuts, sv: cp.saves, g: cp.gamesPitched, gs: cp.gamesStarted } : null,
    seasons: uniq, awards,
  };
}
function cells(row) { const o = {}; for (const m of row.matchAll(/data-stat="([^"]+)"[^>]*>([\s\S]*?)<\/t[dh]>/g)) o[m[1]] = strip(m[2]); return o; }
function table(h, id) {
  const i = h.indexOf(`id="${id}"`); if (i < 0) return null;
  const seg = h.slice(i, h.indexOf('</table>', i));
  const body = (seg.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || '';
  const rows = [...body.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/g)].map((m) => ({ cls: m[1], c: cells(m[2]) }));
  const foot = (seg.match(/<tfoot>([\s\S]*?)<\/tfoot>/) || [])[1] || '';
  const f1 = [...foot.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => cells(m[1])).find((c) => /Yrs?$/.test(c.year_id || ''));
  return { rows, career: f1 || null };
}
function bb(b) {
  let h = fs.readFileSync(new URL(`raw/bb_${b}.html`, WORK), 'utf8');
  h = h.replace(/<!--|-->/g, '');
  const bling = [...((h.match(/<ul id="bling">([\s\S]*?)<\/ul>/) || [])[1] || '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => strip(m[1]));
  const bt = table(h, 'players_standard_batting'); const pt = table(h, 'players_standard_pitching');
  const seasons = [];
  for (const t of [bt, pt]) for (const r of t?.rows || []) {
    const y = Number(r.c.year_id); const tm = r.c.team_name_abbr;
    if (!y || !tm || !/^[A-Z]{2,3}$/.test(tm) || tm === 'TOT') continue;
    if (!seasons.some((s) => s[0] === y && s[1] === tm)) seasons.push([y, tm]);
  }
  seasons.sort((a, b2) => a[0] - b2[0]);
  const bc = bt?.career; const pc = pt?.career;
  return {
    url: bbrefUrl(b), name: strip((h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || ''),
    positions: strip((h.match(/<strong>\s*Positions?:\s*<\/strong>([\s\S]*?)<\/p>/) || [])[1] || ''),
    draft: strip((h.match(/<strong>\s*Draft:?\s*<\/strong>([\s\S]*?)<\/p>/) || [])[1] || ''),
    debut: strip((h.match(/Debut:<\/a><\/strong>\s*<a[^>]*>([^<]+)<\/a>/) || [])[1] || ''),
    hof: strip((h.match(/Inducted[^<]{0,120}/) || [''])[0]),
    bling, seasons,
    hit: bc ? { avg: bc.b_batting_avg, hr: bc.b_hr, rbi: bc.b_rbi, h: bc.b_h, sb: bc.b_sb, g: bc.b_games, yrs: bc.year_id } : null,
    pit: pc ? { w: pc.p_w, l: pc.p_l, era: pc.p_earned_run_avg, so: pc.p_so, sv: pc.p_sv, g: pc.p_g, gs: pc.p_gs, yrs: pc.year_id } : null,
  };
}
const out = {};
for (const [id, name] of ALL) out[id] = { name, api: api(ids[id]), bb: bb(BBREF[id]) };
fs.writeFileSync(new URL('facts.json', WORK), JSON.stringify(out, null, 1));
console.log('wrote', Object.keys(out).length);
