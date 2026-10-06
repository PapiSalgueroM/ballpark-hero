// Build the committed record from the two raw sources. Every shown line is derived here and
// only from values both sources agree on; anything they disagree on goes to held[].
import fs from 'node:fs';
import { WORK } from './paths.mjs';
import { bbDrafts, blingCount, BLING, bbDate } from './compare.mjs';
const F = JSON.parse(fs.readFileSync(new URL('facts.json', WORK), 'utf8'));
const FR = JSON.parse(fs.readFileSync(new URL('franchises.json', WORK), 'utf8'));
const ON = '2026-10-03';
const SEASON_END = '2026-09-27';
const ord = (n) => { n = Number(n); const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const fmt = (n) => Number(n).toLocaleString('en-US');
const POS = { Centerfielder: 'Center Fielder', Rightfielder: 'Right Fielder', Leftfielder: 'Left Fielder', Outfielder: 'Outfielder', 'First Baseman': 'First Baseman', 'Second Baseman': 'Second Baseman', 'Third Baseman': 'Third Baseman', Shortstop: 'Shortstop', Catcher: 'Catcher', 'Designated Hitter': 'Designated Hitter', Pitcher: 'Pitcher' };
const FLD = { 'Center Fielder': ['CF'], 'Right Fielder': ['RF'], 'Left Fielder': ['LF'], Outfielder: ['LF', 'CF', 'RF'], 'First Baseman': ['1B'], 'Second Baseman': ['2B'], 'Third Baseman': ['3B'], Shortstop: ['SS'], Catcher: ['C'], 'Designated Hitter': ['DH'], Pitcher: ['P'] };
const abbrMap = {}; const abbrConflicts = [];

function position(a, b, held) {
  const list = b.positions.split(/, | and /).map((s) => s.trim()).filter(Boolean);
  const first = POS[list[0]];
  if (!first) { held.push({ fact: 'position', bbref: b.positions, why: 'unmapped bbref position' }); return null; }
  // the official side: the same position (outfield grouped when bbref groups it) has the most career games in the field
  const games = (pos) => FLD[pos].reduce((s, k) => s + (a.fielding[k] || 0), 0);
  const others = Object.keys(FLD).filter((p) => p !== first && p !== 'Outfielder' && !(first === 'Outfielder' && ['Center Fielder', 'Right Fielder', 'Left Fielder'].includes(p)));
  const top = others.every((p) => games(p) <= games(first));
  if (!top) { held.push({ fact: 'position', mlb: a.fielding, bbref: b.positions, why: 'the most played position differs' }); return null; }
  let text = first;
  if (first === 'Pitcher') {
    if (a.pit.gs !== Number(b.pit.gs) || a.pit.g !== Number(b.pit.g)) { held.push({ fact: 'position', why: 'games started differ' }); return null; }
    text = a.pit.gs / a.pit.g >= 0.5 ? 'Starting Pitcher' : 'Relief Pitcher';
  } else if (list[1] === 'Pitcher' && (a.fielding.P || 0) >= 100) {
    text = `${first} / Pitcher`;
  }
  return { text, mlb: { primary: a.pos, fieldingGames: a.fielding, ...(a.pit ? { g: a.pit.g, gs: a.pit.gs } : {}) }, bbref: b.positions };
}

function draft(a, b, held, firstSeason) {
  const bd = bbDrafts(b.draft);
  if (!a.drafts.length && !bd.length) {
    const text = firstSeason < 1965 ? `Before the draft (first season ${firstSeason})` : `Not drafted (first season ${firstSeason})`;
    return { text, mlb: { drafts: [], firstSeason }, bbref: { draftLine: null, firstSeason } };
  }
  const la = a.drafts[a.drafts.length - 1]; const lb = bd[bd.length - 1];
  if (a.drafts.length !== bd.length || la.year !== lb.year || la.round !== lb.round || (lb.pick != null && lb.pick !== la.pick)) {
    held.push({ fact: 'draftInfo', mlb: a.drafts, bbref: b.draft, why: 'drafts differ' }); return null;
  }
  const text = lb.pick != null ? `${ord(la.round)} Round, ${ord(la.pick)} Pick (${la.year})` : `${ord(la.round)} Round (${la.year})`;
  return { text, mlb: la, bbref: b.draft.replace(/^:\s*/, '') };
}

function teams(a, b, held) {
  const seqA = []; for (const s of a.seasons) if (!seqA.includes(s[1])) seqA.push(s[1]);
  const seqB = []; for (const s of b.seasons) if (!seqB.includes(s[1])) seqB.push(s[1]);
  const yA = [...new Set(a.seasons.map((s) => s[0]))].join(); const yB = [...new Set(b.seasons.map((s) => s[0]))].join();
  if (seqA.length !== seqB.length || yA !== yB) { held.push({ fact: 'teams', mlb: seqA, bbref: seqB, why: 'team or season lists differ' }); return null; }
  seqB.forEach((ab, i) => {
    if (abbrMap[ab] && abbrMap[ab] !== seqA[i]) abbrConflicts.push(`${ab}: ${abbrMap[ab]} vs ${seqA[i]}`);
    abbrMap[ab] = seqA[i];
  });
  // Franchises: the league's team id for each club, and the baseball-reference franchise page each club's
  // first season sits on (a club on none of them is its own franchise). The two must group the clubs the
  // same way; the card's "suited up for N franchises" counts the groups.
  const mlbIds = seqA.map((n) => {
    const ids = a.teamIds[n] || [];
    if (ids.length !== 1) throw new Error(`${a.full}: ${n} has team ids ${JSON.stringify(ids)}`);
    return ids[0];
  });
  const bbrefFranchise = seqB.map((ab) => {
    const y = b.seasons.find((s) => s[1] === ab)[0];
    return Object.keys(FR).find((code) => FR[code].seasons.includes(`${ab}/${y}`)) || ab;
  });
  for (let i = 0; i < seqA.length; i++) for (let j = 0; j < seqA.length; j++) {
    if ((mlbIds[i] === mlbIds[j]) !== (bbrefFranchise[i] === bbrefFranchise[j])) {
      throw new Error(`${a.full}: the league groups ${seqA[i]} and ${seqA[j]} ${mlbIds[i] === mlbIds[j] ? 'together' : 'apart'}, baseball-reference does not`);
    }
  }
  return { text: seqA, mlb: seqA, bbref: seqB, seasons: a.seasons, mlbIds, bbrefFranchise, franchises: new Set(mlbIds).size };
}

function floorOf(n) { return n >= 100 ? Math.floor(n / 10) * 10 : n >= 10 ? Math.floor(n / 5) * 5 : n; }
function statLine(key, label, av, bv, active, held) {
  if (String(av) !== String(bv)) { held.push({ fact: `stat ${key}`, mlb: av, bbref: bv, why: 'career totals differ' }); return null; }
  const rate = key === 'avg' || key === 'era';
  if (rate) return { key, text: `${av} ${label}`, value: av, mlb: av, bbref: bv, ...(active ? { asOf: SEASON_END } : {}) };
  const n = Number(av);
  if (active) { const f = floorOf(n); return { key, text: `${fmt(f)}+ ${label}`, value: n, floor: f, mlb: av, bbref: bv, asOf: SEASON_END }; }
  return { key, text: `${fmt(n)} ${label}`, value: n, mlb: av, bbref: bv };
}
function stats(id, a, b, active, held, posText) {
  const out = [];
  const add = (...args) => { const l = statLine(...args, active, held); if (l) out.push(l); return l; };
  if (/Pitcher$/.test(posText) && !/\//.test(posText)) {
    if (a.pit.sv >= 300) add('sv', 'SV', a.pit.sv, b.pit.sv); else add('w', 'W', a.pit.w, b.pit.w);
    add('era', 'ERA', a.pit.era, b.pit.era); add('so', 'SO', a.pit.so, b.pit.so);
    return out;
  }
  add('avg', 'AVG', a.hit.avg, b.hit.avg); add('hr', 'HR', a.hit.hr, b.hit.hr);
  if (id === 'bc-005') { add('w', 'W', a.pit.w, b.pit.w); add('era', 'ERA', a.pit.era, b.pit.era); return out; }
  if (a.hit.h >= 3000 || String(a.hit.rbi) !== String(b.hit.rbi)) add('h', 'Hits', a.hit.h, b.hit.h);
  else add('rbi', 'RBI', a.hit.rbi, b.hit.rbi);
  return out;
}
const LG = (ids) => (ids.length === 1 && /^(AL|NL)/.test(ids[0]) ? ids[0].slice(0, 2) + ' ' : '');
function awardText(k, aw) {
  const { n, years, ids } = aw; const lg = LG(ids);
  switch (k) {
    case 'mvp': return n === 1 ? `${lg}MVP (${years[0]})` : `${n}× ${lg}MVP`;
    case 'cy': return n === 1 ? `${lg}Cy Young (${years[0]})` : `${n}× ${lg}Cy Young`;
    case 'roy': return `${lg}Rookie of the Year (${years[0]})`;
    case 'ws': return n === 1 ? `${years[0]} World Series Champion` : n <= 4 ? `${n}× World Series Champion (${years.join(', ')})` : `${n}× World Series Champion`;
    case 'wsMvp': return n === 1 ? `${years[0]} World Series MVP` : `${n}× World Series MVP`;
    case 'hof': return `Hall of Fame (${years[0]})`;
    case 'allStar': return n === 1 ? `All-Star (${years[0]})` : `${n}× All-Star`;
    case 'goldGlove': return n === 1 ? `Gold Glove (${years[0]})` : `${n}× Gold Glove`;
    case 'silverSlugger': return n === 1 ? `Silver Slugger (${years[0]})` : `${n}× Silver Slugger`;
  }
  return null;
}
const ORDER = ['mvp', 'cy', 'ws', 'wsMvp', 'roy', 'hof', 'allStar', 'goldGlove', 'silverSlugger'];
function awards(a, b, active, held) {
  const out = [];
  for (const k of ORDER) {
    const an = a.awards[k].n; const bn = blingCount(b.bling, BLING[k]);
    if (!an && !bn) continue;
    if (an !== bn) { held.push({ fact: `award ${k}`, mlb: { n: an, years: a.awards[k].years }, bbref: bn, why: 'award counts differ' }); continue; }
    if (k === 'hof' && !b.hof.includes(`in ${a.awards.hof.years[0]}.`)) { held.push({ fact: 'award hof', mlb: a.awards.hof.years, bbref: b.hof, why: 'induction years differ' }); continue; }
    if (out.length >= 4) continue;
    out.push({ key: k, text: awardText(k, a.awards[k]), n: an, years: a.awards[k].years, mlbIds: a.awards[k].ids, bbref: k === 'hof' ? b.hof : bn, ...(active ? { asOf: ON } : {}) });
  }
  return out;
}

const players = [];
for (const [id, { name, api: a, bb: b }] of Object.entries(F)) {
  const held = [];
  const active = !!a.active;
  const firstA = a.seasons[0][0]; const firstB = b.seasons[0][0];
  if (firstA !== firstB) held.push({ fact: 'firstSeason', mlb: firstA, bbref: firstB, why: 'first seasons differ' });
  const pos = position(a, b, held);
  const dr = draft(a, b, held, firstA);
  const tm = teams(a, b, held);
  const st = pos ? stats(id, a, b, active, held, pos.text) : [];
  const aw = awards(a, b, active, held);
  const ws = a.awards.ws.n === blingCount(b.bling, 'World Series') ? a.awards.ws.years.map((y) => ({ year: Number(y), team: (a.seasons.filter((s) => s[0] === Number(y)).map((s) => s[1])).pop() || null })) : null;
  players.push({
    id, name, mlbName: a.full, bbrefName: b.name, status: active ? 'active' : 'retired', ...(active ? { asOf: ON } : {}),
    src: [a.url, b.url], on: ON,
    debut: { mlb: a.debut, bbref: bbDate(b.debut) },
    position: pos, draftInfo: dr, firstTeam: tm ? { text: tm.text[0], mlb: a.seasons[0], bbref: b.seasons[0] } : null,
    teams: tm ? { text: tm.text, bbref: tm.bbref, mlbIds: tm.mlbIds, bbrefFranchise: tm.bbrefFranchise, franchises: tm.franchises } : null,
    seasons: a.seasons,
    stats: st, awards: aw, wsTitles: ws, held,
  });
}
// a teammate on the title team that season whose own record leaves the title out: say so, with both sources' counts
for (const p of players) for (const t of p.wsTitles || []) for (const q of players) {
  if (q === p || !q.seasons.some((s) => s[0] === t.year && s[1] === t.team)) continue;
  if ((q.wsTitles || []).some((x) => x.year === t.year)) continue;
  q.titleExceptions = q.titleExceptions || [];
  if (q.titleExceptions.some((x) => x.year === t.year)) continue;
  const a = F[q.id].api.awards.ws; const bn = blingCount(F[q.id].bb.bling, 'World Series');
  q.titleExceptions.push({ year: t.year, team: t.team, mlbYears: a.years, bbrefCount: bn,
    why: q.wsTitles ? `on the ${t.team} in ${t.year} but both sources leave that title out of his count, so the card does too` : `the two sources disagree on his titles, so the card shows no title line at all` });
}
const rosters = JSON.parse(fs.readFileSync(new URL('../data/mlbRosters2026.json', import.meta.url), 'utf8'));
for (const p of players) {
  if (p.status !== 'active') continue;
  const club = Object.values(rosters.teams).find((t) => (t.players || []).some((x) => x.name === p.mlbName))?.club || null;
  const last = p.seasons[p.seasons.length - 1];
  p.currentTeam = { team: last[1], season: last[0], roster2026: club };
}
fs.writeFileSync(new URL('record.players.json', WORK), JSON.stringify({ players, abbrMap, abbrConflicts }, null, 1));
for (const p of players) {
  const bad = !p.position || !p.draftInfo || !p.teams || p.stats.length < 3 || p.awards.length < 2;
  console.log(`${bad ? '!!' : '  '}${p.id} ${p.name} | ${p.position?.text} | ${p.draftInfo?.text} | ${p.firstTeam?.text}`);
  console.log(`     T ${p.teams?.text.join(' > ')}`);
  console.log(`     S ${p.stats.map((s) => s.text).join(', ')}`);
  console.log(`     A ${p.awards.map((s) => s.text).join(', ')}${p.held.length ? '  HELD ' + p.held.map((h) => h.fact).join(',') : ''}`);
}
console.log('abbrConflicts', abbrConflicts);
