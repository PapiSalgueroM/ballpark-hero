/**
 * Round 1574: the second host for every fact the NHL table rows rest on.
 *
 * The record (scripts/data/nhlConnectionsRecord-2026-10.json) is the league's own service, api-web.nhle.com. The
 * second host is hockey-reference.com: one player page per man carries his NHL clubs and goals season by season,
 * his career games, goals and goalie wins, his awards ("1996-97 NHL Vezina Trophy"), his championships ("2002
 * Detroit Red Wings"), his draft line, his position, his birthplace and the Hall of Fame. Pages are read one at a
 * time, five seconds apart (scripts/usConnections/sportsRef.mjs), and cached in a work folder.
 *
 *   node scripts/usConnections/verifyNhlTableFacts.mjs pages <work>          (MAX pages a run, default 24)
 *   node scripts/usConnections/verifyNhlTableFacts.mjs facts <work> <out.json>
 *
 * Who is read: every member of every NHL table group (scripts/data/nhlConnectionsTable-2026-10.json, the decided
 * board) and every man the round moved (the ledger's tableMoves). A man's page is his only if its career games agree
 * with the record's (equal for a retired man, within 15 for one still playing); otherwise the next id is tried.
 * `facts` writes, for each member and each moved man, the claim on both hosts; a claim the two hosts do not agree
 * on is printed and never written. Never used by a harness: the harness reads only what the ledger recorded.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { page, rows, text } from './sportsRef.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [, , step, workArg, outArg] = process.argv;
const WORK = path.resolve(workArg ?? '.tmp-fx/hrwork-1574');
const MAX = Number(process.env.MAX ?? 24);
const fold = s => String(s).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/g, '');
const plain = s => String(s).normalize('NFD').replace(/\p{M}/gu, '');
const undated = l => String(l).replace(/ \(as of [^)]+\)$/, '');

/* hockey-reference ids where the plain rule (five letters of the surname, two of the given name, 01) misses */
export const HR_ID = {
  'Marc-Andre Fleury': 'fleurma01', 'Jean-Sebastien Giguere': 'giguejs01', 'Ryan Nugent-Hopkins': 'nugenry01',
  'Alexis Lafreniere': 'lafreal01', 'Jakub Voráček': 'voracja01', 'Nicklas Bäckström': 'backsni02', 'Tim Stutzle': 'stutzti01',
  'Juraj Slafkovsky': 'slafkju01', 'Mikhail Sergachev': 'sergami01', 'Al Arbour': 'arbouam01', 'Billy Smith': 'smithbi01',
  'Nicklas Lidstrom': 'lidstni01', 'Jaromir Jagr': 'jagrja01', 'Steve Yzerman': 'yzermst01', 'Teemu Selanne': 'selante01',
};
const hrIds = name => {
  if (HR_ID[name]) return [HR_ID[name]];
  const [first, ...rest] = plain(name).toLowerCase().replace(/[^a-z ]/g, '').split(' ');
  const base = `${rest.join('').slice(0, 5)}${first.slice(0, 2)}`;
  return ['01', '02', '03'].map(n => base + n);
};
export const hrUrl = id => `https://www.hockey-reference.com/players/${id[0]}/${id}.html`;

const record = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/nhlConnectionsRecord-2026-10.json'), 'utf8')).men;
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/nhlConnectionsVerified-2026-10.json'), 'utf8'));
const table = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/nhlConnectionsTable-2026-10.json'), 'utf8'));

/** Every (board, label, man) the round must hold on two hosts: members, and the men it moved with their reason. */
export function needs() {
  const out = [];
  for (const r of table.rows) for (const g of r.board) for (const p of g.players) out.push({ id: r.puzzle_id, label: g.theme, name: p, holds: true, why: 'member' });
  for (const m of ledger.tableMoves ?? []) out.push({ id: m.id, label: m.label, name: m.name, holds: m.holds, why: m.why });
  return out;
}

/** A hockey-reference player page, read: what the facts need. */
export function parseHr(html) {
  const r = rows(html);
  const title = (html.match(/<title>([^<]+)<\/title>/) ?? [])[1] ?? '';
  const metaAt = html.indexOf('id="meta"');
  const meta = metaAt < 0 ? '' : text(html.slice(metaAt, metaAt + 6000)).replace(/&bull;/g, ' ');
  const seasons = {};
  const sg = {};
  const teamGoals = {};
  let career = null;
  let goalieCareer = null;
  for (const x of r) {
    const nhl = x.comp_name_abbr === 'NHL' || x.lg_id === 'NHL';
    if (nhl && /^\d{4}-\d{2}$/.test(x.year_id ?? '') && x.team_name_abbr) {
      const y = x.year_id;
      const multi = /TOT|\dTM/.test(x.team_name_abbr);
      if (!multi) {
        (seasons[y] ??= new Set()).add(x.team_name_abbr);
        if (x.goals !== undefined && x.goals !== '') teamGoals[x.team_name_abbr] = (teamGoals[x.team_name_abbr] ?? 0) + Number(x.goals || 0);
      }
      if (x.goals !== undefined && x.goals !== '' && (multi || sg[y] === undefined)) sg[y] = Number(x.goals || 0);
    }
    if (/yrs|career/i.test(x.year_id ?? '') && (x.comp_name_abbr === 'NHL' || !x.comp_name_abbr)) {
      if (x.goalie_wins !== undefined || x.wins_goalie !== undefined) { if (!goalieCareer) goalieCareer = x; }
      else if (x.games !== undefined && !career) career = x;
    }
  }
  const lb = html.indexOf('id="leaderboard_awards"');
  const awardText = lb < 0 ? '' : text(html.slice(lb, lb + 20000));
  const awards = [...awardText.matchAll(/(\d{4}-\d{2}) NHL ([A-Z][A-Za-z.'" ]+?(?:Trophy|Award))/g)].map(m => [m[1], m[2].trim()]);
  const ch = awardText.indexOf('Championships');
  const champText = ch < 0 ? '' : awardText.slice(ch, ch + 2000);
  const cups = [...champText.matchAll(/(\d{4}) ([A-Z][A-Za-z. ]+?) \( NHL \)/g)].map(m => [Number(m[1]), m[2].trim()]);
  const draft = meta.match(/Draft\s*:\s*([A-Za-z. ]+?)\s*,\s*(\d+)\w*\s*round\s*\((\d+)\w*\s*overall\)\s*,\s*(\d{4})/);
  const born = meta.match(/Born:.*?\d{4}\s+in\s+([^,]+),\s*([A-Za-z .]+?)(?:\s+[a-z]{2}\s|\s+Draft|\s+Hall|\s+Pronunciation|\s+More|\s*$)/);
  const pos = (meta.match(/Position\s*:\s*([A-Z/]+)/) ?? [])[1] ?? null;
  const games = Number(goalieCareer?.goalie_games ?? goalieCareer?.games_goalie ?? career?.games ?? NaN);
  return {
    title, pos,
    seasons: Object.fromEntries(Object.entries(seasons).map(([y, s]) => [y, [...s]])),
    sg, teamGoals,
    games,
    goals: Number(career?.goals ?? goalieCareer?.goals ?? NaN),
    wins: goalieCareer ? Number(goalieCareer.goalie_wins ?? goalieCareer.wins_goalie) : null,
    awards, cups,
    draft: draft ? { team: draft[1].trim(), round: Number(draft[2]), overall: Number(draft[3]), year: Number(draft[4]) } : null,
    country: born ? born[2].trim() : null,
    hof: /Hall of Fame\s*:\s*Inducted as Player/.test(meta),
  };
}

const fileOf = name => path.join(WORK, `nhl_${fold(name)}`);
/** The page of the man the record means, by career games, or null. */
export function pageOf(name) {
  for (const id of hrIds(name)) {
    const f = path.join(WORK, `${id}.html`);
    if (!fs.existsSync(f)) continue;
    const p = parseHr(fs.readFileSync(f, 'utf8'));
    const m = record[name];
    const gp = m?.career?.GP;
    if (m && Number.isFinite(p.games) && (m.active ? Math.abs(p.games - gp) <= 15 : p.games === gp)) return { id, p };
  }
  return null;
}

if (step === 'pages') {
  const names = [...new Set(needs().map(n => n.name))].sort();
  let n = 0, done = 0;
  for (const name of names) {
    if (pageOf(name)) { done += 1; continue; }
    for (const id of hrIds(name)) {
      if (fs.existsSync(path.join(WORK, `${id}.html`)) || fs.existsSync(path.join(WORK, `${id}.miss`))) continue;
      if (n >= MAX) break;
      n += 1;
      const got = await page(WORK, id, hrUrl(id));
      if (!got) fs.writeFileSync(path.join(WORK, `${id}.miss`), '');
      if (pageOf(name)) break;
    }
    if (pageOf(name)) done += 1;
    if (n >= MAX) break;
  }
  console.log(`pages: ${n} read this run; ${done} of ${names.length} men have their page`);
  void fileOf;
}
