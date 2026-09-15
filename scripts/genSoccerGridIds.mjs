/* Soccer Grid club and nation identity, derived from the tables and never typed.
 *
 * Round 613. The v23 validator matched clubs by substring (Queens Park Rangers
 * passed for Rangers, Espanyol for Barcelona), carried five hand aliases, and
 * sent any label it did not recognise to the nationality matcher. v24 judges
 * against exact stored strings, and this script is where those strings come
 * from. It writes two things:
 *   scripts/data/soccerGridIds.json   every label, the stored strings it
 *                                     resolved to, the evidence, and what it
 *                                     could not resolve
 *   the @generated-ids block inside supabase/functions/soccer-grid-validate/index.ts
 *
 * Club rules, per label or per part of a compound label:
 *   names are the label itself, plus the full_name of the one soccer_club_puzzles
 *   row whose full_name or common_names fold equal to it (two rows: unresolved).
 *   A stored stints club string (split on " / ") is accepted when its fold
 *   equals a name, or when a world_cup_players club spelling equal to a name
 *   sits on the same folded player in an overlapping year on at least 3
 *   players and at least 0.3 of that spelling's joined players.
 * Nation rules: the label must be a DEMONYM key. Country to stored string by
 *   fold, then token set, then a world_cup_players spelling equal to the
 *   country sharing players with one stored string (3 players, 0.9 share).
 *
 * Fails closed: every table is read to its exact row count or nothing is written.
 *
 * Run: node scripts/genSoccerGridIds.mjs          (writes both)
 *      node scripts/genSoccerGridIds.mjs --check  (exit 1 when either is stale)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FN_FILE = path.join(ROOT, 'supabase', 'functions', 'soccer-grid-validate', 'index.ts');
export const JSON_FILE = path.join(ROOT, 'scripts', 'data', 'soccerGridIds.json');
const FALLBACK_FILE = path.join(ROOT, 'src', 'data', 'soccerGridPuzzles.ts');
const BEGIN = '// @generated-ids-begin';
const END = '// @generated-ids-end';

export const THRESHOLDS = {
  clubMinPlayers: 3,
  clubMinShare: 0.3,
  nationMinPlayers: 3,
  nationMinShare: 0.9,
  reviewBelowNames: 10,
};

/* label word to English country name. Moved here from the function in Round
   613; a label is a nationality only when its fold is one of these keys. */
export const DEMONYM = {
  dutch: 'netherlands', french: 'france', brazilian: 'brazil', english: 'england',
  spanish: 'spain', german: 'germany', italian: 'italy', portuguese: 'portugal',
  argentine: 'argentina', argentinian: 'argentina', belgian: 'belgium', croatian: 'croatia',
  serbian: 'serbia', swedish: 'sweden', norwegian: 'norway', danish: 'denmark',
  polish: 'poland', turkish: 'turkey', russian: 'russia', ukrainian: 'ukraine',
  scottish: 'scotland', welsh: 'wales', irish: 'ireland', uruguayan: 'uruguay',
  colombian: 'colombia', chilean: 'chile', mexican: 'mexico', american: 'united states',
  japanese: 'japan', korean: 'south korea', 'south korean': 'south korea', nigerian: 'nigeria',
  ghanaian: 'ghana', senegalese: 'senegal', ivorian: 'ivory coast', moroccan: 'morocco',
  algerian: 'algeria', egyptian: 'egypt', cameroonian: 'cameroon', swiss: 'switzerland',
  austrian: 'austria', greek: 'greece', czech: 'czech republic', slovak: 'slovakia',
  romanian: 'romania', hungarian: 'hungary', finnish: 'finland', icelandic: 'iceland',
  australian: 'australia', canadian: 'canada', paraguayan: 'paraguay', peruvian: 'peru',
  ecuadorian: 'ecuador', venezuelan: 'venezuela', bosnian: 'bosnia-herzegovina', slovenian: 'slovenia',
  albanian: 'albania', bulgarian: 'bulgaria', israeli: 'israel', iranian: 'iran', tunisian: 'tunisia',
};

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const lf = s => s.replace(/\r\n/g, '\n');

/* The fold is lifted out of the function, the way simSoccerStintNameFold does
   it, so the ids are keyed by exactly what the validator computes. */
export function liftNorm(src) {
  const lines = lf(src).split('\n');
  const start = lines.findIndex(l => l.startsWith('const TRANSLIT'));
  const end = lines.findIndex((l, i) => i > start && l.includes('.trim();'));
  if (start < 0 || end < 0) throw new Error('could not lift TRANSLIT and norm out of the validator');
  const js = lines.slice(start, end + 1).join('\n').replace(': Record<string, string>', '').replace('(s: string)', '(s)');
  return eval(`(() => { ${js}; return norm; })()`);
}

function objectLiteralAfter(src, marker) {
  const at = src.indexOf(marker);
  if (at < 0) return null;
  const open = src.indexOf('{', src.indexOf('=', at));
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(open, i + 1);
  }
  return null;
}

export function readSharedCitizenship(src) {
  const literal = objectLiteralAfter(lf(src), 'const SHARED_CITIZENSHIP');
  if (!literal) throw new Error('the validator carries no SHARED_CITIZENSHIP table');
  return new Function(`return (${literal})`)();
}

export function readFallbackLabels(src) {
  const code = lf(src).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  return [...code.matchAll(/label:\s*'((?:[^'\\]|\\.)*)'|label:\s*"((?:[^"\\]|\\.)*)"/g)]
    .map(m => (m[1] ?? m[2]).replace(/\\(.)/g, '$1'));
}

function supabaseFromClient() {
  const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
  const url = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
  const key = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } };
}

async function withRetry(what, fn) {
  let last = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try { return await fn(); } catch (e) { last = e; }
    await new Promise(r => setTimeout(r, 900 * (attempt + 1)));
  }
  throw new Error(`${what}: ${last?.message ?? last}`);
}

async function exactCount(db, table) {
  return withRetry(`count ${table}`, async () => {
    const r = await fetch(`${db.url}/rest/v1/${table}?select=id`, {
      method: 'HEAD', headers: { ...db.headers, Prefer: 'count=exact', Range: '0-0' },
    });
    const total = Number((r.headers.get('content-range') || '').split('/')[1]);
    if (!r.ok || !Number.isFinite(total)) throw new Error(`HTTP ${r.status}, content-range ${r.headers.get('content-range')}`);
    return total;
  });
}

async function readTable(db, table, select) {
  const count = await exactCount(db, table);
  const rows = [];
  for (let from = 0; from < count + 1000; from += 1000) {
    const page = await withRetry(`${table} at ${from}`, async () => {
      const r = await fetch(`${db.url}/rest/v1/${table}?select=${select}&order=id.asc`, {
        headers: { ...db.headers, Range: `${from}-${from + 999}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    rows.push(...page);
    if (page.length < 1000) break;
  }
  if (rows.length !== count) throw new Error(`${table}: read ${rows.length} rows, the table holds ${count}`);
  return { rows, count };
}

/* Every read the derivation needs, complete or not at all. */
export async function readInputs() {
  const db = supabaseFromClient();
  const fnSrc = fs.readFileSync(FN_FILE, 'utf8');
  const [stints, wc, clubs, grids] = [
    await readTable(db, 'soccer_player_club_stints', 'club,name_folded,player_name,first_year,last_year,nationality'),
    await readTable(db, 'world_cup_players', 'player_name,club,nationality,world_cup_year'),
    await readTable(db, 'soccer_club_puzzles', 'full_name,common_names'),
    await readTable(db, 'soccer_grid_puzzles', 'rows_json,cols_json'),
  ];
  return {
    stints: stints.rows,
    worldCup: wc.rows,
    clubPuzzles: clubs.rows,
    gridPuzzles: grids.rows,
    fallbackLabels: readFallbackLabels(fs.readFileSync(FALLBACK_FILE, 'utf8')),
    norm: liftNorm(fnSrc),
    sharedCitizenship: readSharedCitizenship(fnSrc),
  };
}

const share = (n, total) => (total > 0 ? n / total : 0);
const fmtShare = (n, total) => `${n}/${total}`;

/* Pure: the same inputs always give the same ids and report. Thresholds can be
   passed in so a harness can loosen them and watch what gets in. */
export function deriveSoccerGridIds({ stints, worldCup, clubPuzzles, gridPuzzles, fallbackLabels, norm, sharedCitizenship }, T = THRESHOLDS) {
  const problems = [];
  const tokenSet = s => norm(s).split(' ').filter(Boolean).sort().join(' ');

  /* labels and the slots they fill on the boards */
  const boardSlots = new Map();
  for (const p of gridPuzzles) {
    for (const e of [...(p.rows_json || []), ...(p.cols_json || [])]) {
      if (e && typeof e.label === 'string') boardSlots.set(e.label, (boardSlots.get(e.label) || 0) + 1);
    }
  }
  const fallbackSet = new Set(fallbackLabels);
  const labels = [...new Set([...boardSlots.keys(), ...fallbackSet])].sort(byText);
  const slotsOf = l => boardSlots.get(l) || 0;

  /* stored club strings and who they reach */
  const storedByFold = new Map();
  const namesByStored = new Map();
  const stintsByName = new Map();
  const natNames = new Map();
  for (const r of stints) {
    for (const part of String(r.club || '').split(' / ').map(s => s.trim()).filter(Boolean)) {
      const f = norm(part);
      if (!storedByFold.has(f)) storedByFold.set(f, new Set());
      storedByFold.get(f).add(part);
      if (!namesByStored.has(part)) namesByStored.set(part, new Map());
      namesByStored.get(part).set(r.name_folded, r.player_name);
    }
    if (!stintsByName.has(r.name_folded)) stintsByName.set(r.name_folded, []);
    stintsByName.get(r.name_folded).push(r);
    if (r.nationality) {
      if (!natNames.has(r.nationality)) natNames.set(r.nationality, new Set());
      natNames.get(r.nationality).add(r.name_folded);
    }
  }

  /* world_cup_players club spellings against stints clubs, same folded name,
     overlapping years. Stints years are season end years. */
  const cooccur = inWindow => {
    const bySpelling = new Map();
    for (const w of worldCup) {
      if (!w.club) continue;
      const wf = norm(w.club);
      for (const st of stintsByName.get(norm(w.player_name)) || []) {
        if (String(st.club).includes(' / ') || !inWindow(w.world_cup_year, st)) continue;
        if (!bySpelling.has(wf)) bySpelling.set(wf, { raw: new Set(), targets: new Map() });
        const entry = bySpelling.get(wf);
        entry.raw.add(w.club);
        if (!entry.targets.has(st.club)) entry.targets.set(st.club, new Set());
        entry.targets.get(st.club).add(w.player_name);
      }
    }
    const out = new Map();
    for (const [wf, e] of bySpelling) {
      const targets = [...e.targets].map(([stored, set]) => ({ stored, n: set.size })).sort((a, b) => b.n - a.n || byText(a.stored, b.stored));
      out.set(wf, { raw: [...e.raw].sort(byText), total: targets.reduce((a, t) => a + t.n, 0), targets });
    }
    return out;
  };
  const draftWindow = cooccur((y, st) => st.first_year <= y && st.last_year >= y - 1);
  const alignedWindow = cooccur((y, st) => { const season = y === 2022 ? 2023 : y; return st.first_year <= season && st.last_year >= season; });
  const passes = (t, total) => t.n >= T.clubMinPlayers && share(t.n, total) >= T.clubMinShare;

  const reachOf = strings => {
    const names = new Set();
    for (const s of strings) for (const n of (namesByStored.get(s) || new Map()).keys()) names.add(n);
    return names.size;
  };

  const nameFolds = new Set();
  function resolvePart(text) {
    const pf = norm(text);
    const rowsHit = clubPuzzles.filter(cp => [cp.full_name, ...(cp.common_names || [])].some(n => n && norm(n) === pf));
    const fullNames = [...new Set(rowsHit.map(r => r.full_name))].sort(byText);
    nameFolds.add(pf);
    if (fullNames.length >= 2) return { ok: false, reason: `"${text}" names ${fullNames.length} club puzzle rows: ${fullNames.join(', ')}` };
    const names = [{ fold: pf, via: 'label' }];
    if (fullNames.length === 1) { names.push({ fold: norm(fullNames[0]), via: `puzzle full_name ${fullNames[0]}` }); nameFolds.add(norm(fullNames[0])); }
    const accepted = new Map();
    const add = (stored, why) => {
      if (!accepted.has(stored)) accepted.set(stored, new Set());
      accepted.get(stored).add(why);
    };
    for (const nm of names) {
      for (const s of storedByFold.get(nm.fold) || []) add(s, nm.via === 'label' ? 'exact label' : `exact ${nm.via}`);
      const co = draftWindow.get(nm.fold);
      if (!co) continue;
      for (const t of co.targets) {
        if (passes(t, co.total)) add(t.stored, `world_cup_players club ${co.raw.join(' | ')} (${nm.via}) ${fmtShare(t.n, co.total)}`);
      }
    }
    if (accepted.size === 0) return { ok: false, reason: `"${text}" matches no stored club string and no world_cup_players spelling at threshold` };
    const strings = [...accepted.keys()].sort(byText);
    return {
      ok: true,
      strings,
      evidence: Object.fromEntries(strings.map(s => [s, [...accepted.get(s)].sort(byText)])),
      names: reachOf(strings),
    };
  }

  const clubIds = {};
  const clubCompound = {};
  const clubReport = {};
  const compoundReport = {};
  const unresolved = [];
  const lowCoverage = [];
  const acceptedBy = new Map();
  const note = (strings, label) => { for (const s of strings) { if (!acceptedBy.has(s)) acceptedBy.set(s, new Set()); acceptedBy.get(s).add(label); } };

  for (const label of labels) {
    const m = label.match(/^Played for (.+)$/);
    if (!m) continue;
    const rest = m[1];
    const key = norm(rest);
    const both = /^both\s+.+\s+and\s+.+$/i.test(rest);
    const either = !both && /^.+\s+or\s+.+$/i.test(rest);
    if (!both && !either) {
      const r = resolvePart(rest);
      if (!r.ok) { unresolved.push({ label, slots: slotsOf(label), reason: r.reason }); continue; }
      clubIds[key] = r.strings;
      note(r.strings, label);
      clubReport[label] = { key, slots: slotsOf(label), fallback: fallbackSet.has(label), strings: r.strings.map(s => ({ stored: s, names: reachOf([s]), evidence: r.evidence[s] })), names: r.names };
      if (r.names < T.reviewBelowNames) lowCoverage.push({ label, names: r.names, strings: r.strings });
      continue;
    }
    const partsText = rest.replace(/^both\s+/i, '').split(/\s+(?:and|or)\s+/i);
    const parts = partsText.map(p => ({ text: p, ...resolvePart(p) }));
    const bad = parts.filter(p => !p.ok);
    if (bad.length) { unresolved.push({ label, slots: slotsOf(label), reason: bad.map(p => p.reason).join('; ') }); continue; }
    clubCompound[key] = { mode: both ? 'both' : 'either', parts: parts.map(p => p.strings) };
    parts.forEach(p => note(p.strings, label));
    compoundReport[label] = {
      key, slots: slotsOf(label), mode: both ? 'both' : 'either',
      parts: parts.map(p => ({ part: p.text, names: p.names, strings: p.strings.map(s => ({ stored: s, names: reachOf([s]), evidence: p.evidence[s] })) })),
    };
    for (const p of parts) if (p.names < T.reviewBelowNames) lowCoverage.push({ label: `${label} (part ${p.text})`, names: p.names, strings: p.strings });
  }

  const smallStrings = [...acceptedBy.keys()].sort(byText)
    .map(s => ({ stored: s, labels: [...acceptedBy.get(s)].sort(byText), names: [...(namesByStored.get(s) || new Map()).values()].sort(byText) }))
    .filter(x => x.names.length < T.reviewBelowNames);

  /* window readings, over the spellings that equal a label name */
  const windowReading = co => {
    let lowestAccepted = null;
    let highestRejected = null;
    const rejectedTwoPlus = [];
    const twoTargets = [];
    for (const f of [...nameFolds].sort(byText)) {
      const e = co.get(f);
      if (!e) continue;
      const ok = e.targets.filter(t => passes(t, e.total));
      if (ok.length > 1) twoTargets.push({ spelling: e.raw.join(' | '), targets: ok.map(t => `${t.stored} ${fmtShare(t.n, e.total)}`) });
      for (const t of e.targets) {
        const row = { spelling: e.raw.join(' | '), stored: t.stored, reading: fmtShare(t.n, e.total), share: Number(share(t.n, e.total).toFixed(3)) };
        if (passes(t, e.total)) { if (!lowestAccepted || row.share < lowestAccepted.share) lowestAccepted = row; }
        else {
          if (!highestRejected || row.share > highestRejected.share) highestRejected = row;
          if (t.n >= 2) rejectedTwoPlus.push(row);
        }
      }
    }
    rejectedTwoPlus.sort((a, b) => b.share - a.share || byText(a.stored, b.stored));
    return { lowestAccepted, highestRejected, rejectedWithTwoOrMore: rejectedTwoPlus, spellingsWithTwoTargets: twoTargets };
  };
  const draftReading = windowReading(draftWindow);
  const alignedReading = windowReading(alignedWindow);
  const acceptedPairs = co => {
    const out = new Set();
    for (const f of nameFolds) { const e = co.get(f); if (e) for (const t of e.targets) if (passes(t, e.total)) out.add(`${e.raw.join(' | ')} -> ${t.stored}`); }
    return out;
  };
  const alignedPairs = acceptedPairs(alignedWindow);
  alignedReading.lostAgainstDraft = [...acceptedPairs(draftWindow)].filter(p => !alignedPairs.has(p)).sort(byText);

  /* nations */
  const natStrings = [...natNames.keys()].sort(byText);
  const natCo = new Map();
  for (const w of worldCup) {
    if (!w.nationality) continue;
    const seen = new Set();
    for (const st of stintsByName.get(norm(w.player_name)) || []) {
      if (!st.nationality || seen.has(st.nationality)) continue;
      seen.add(st.nationality);
      if (!natCo.has(w.nationality)) natCo.set(w.nationality, new Map());
      const m = natCo.get(w.nationality);
      if (!m.has(st.nationality)) m.set(st.nationality, new Set());
      m.get(st.nationality).add(w.player_name);
    }
  }
  const natTargets = spelling => {
    const m = natCo.get(spelling) || new Map();
    const targets = [...m].map(([stored, set]) => ({ stored, n: set.size }));
    const total = targets.reduce((a, t) => a + t.n, 0);
    return { total, targets };
  };
  const natPasses = (t, total) => t.n >= T.nationMinPlayers && share(t.n, total) >= T.nationMinShare;
  const wcSpellings = [...new Set(worldCup.map(w => w.nationality).filter(Boolean))].sort(byText);

  const nationIds = {};
  const nationReport = {};
  for (const label of labels) {
    const key = norm(label);
    if (!has(DEMONYM, key)) continue;
    const country = DEMONYM[key];
    let stored = null;
    let via = '';
    const byFold = natStrings.filter(s => norm(s) === norm(country));
    const byTokens = natStrings.filter(s => tokenSet(s) === tokenSet(country));
    if (byFold.length === 1) { stored = byFold[0]; via = 'fold'; }
    else if (byTokens.length === 1) { stored = byTokens[0]; via = 'token set'; }
    else {
      for (const spelling of wcSpellings.filter(s => norm(s) === norm(country))) {
        const { total, targets } = natTargets(spelling);
        const hit = targets.find(t => natPasses(t, total));
        if (hit) { stored = hit.stored; via = `world_cup_players ${spelling} ${fmtShare(hit.n, total)}`; break; }
      }
    }
    if (!stored) { unresolved.push({ label, slots: slotsOf(label), reason: `nationality "${country}" matches no stored stints nationality` }); continue; }
    const wc = wcSpellings.filter(s => {
      if (norm(s) === norm(country) || norm(s) === norm(stored) || tokenSet(s) === tokenSet(stored)) return true;
      const { total, targets } = natTargets(s);
      return targets.some(t => t.stored === stored && natPasses(t, total));
    });
    if (has(nationIds, key)) continue;
    nationIds[key] = { label, stints: stored, wc };
    nationReport[label] = { key, country, slots: slotsOf(label), stints: stored, via, names: natNames.get(stored).size, wc };
  }

  for (const [want, list] of Object.entries(sharedCitizenship)) {
    if (!natNames.has(want)) problems.push(`SHARED_CITIZENSHIP key "${want}" is not a stored stints nationality`);
    for (const s of list) if (!natNames.has(s)) problems.push(`SHARED_CITIZENSHIP value "${s}" under "${want}" is not a stored stints nationality`);
  }

  unresolved.sort((a, b) => byText(a.label, b.label));
  return {
    clubIds, clubCompound, nationIds, problems,
    report: {
      clubs: clubReport,
      compounds: compoundReport,
      nations: nationReport,
      unresolved,
      lowCoverage,
      smallStrings,
      window: { draft: draftReading, seasonAligned: alignedReading },
      rows: { stints: stints.length, worldCupPlayers: worldCup.length, clubPuzzles: clubPuzzles.length, gridPuzzles: gridPuzzles.length, fallbackLabels: fallbackSet.size },
    },
  };
}

const q = s => JSON.stringify(s);
const sortedKeys = o => Object.keys(o).sort(byText);

export function renderIdsBlock({ clubIds, clubCompound, nationIds }) {
  const out = [BEGIN];
  out.push('const CLUB_IDS: Record<string, string[]> = {');
  for (const k of sortedKeys(clubIds)) out.push(`  ${q(k)}: [${clubIds[k].map(q).join(', ')}],`);
  out.push('};');
  out.push('const CLUB_COMPOUND: Record<string, { mode: "both" | "either"; parts: string[][] }> = {');
  for (const k of sortedKeys(clubCompound)) {
    const c = clubCompound[k];
    out.push(`  ${q(k)}: { mode: ${q(c.mode)}, parts: [${c.parts.map(p => `[${p.map(q).join(', ')}]`).join(', ')}] },`);
  }
  out.push('};');
  out.push('const NATION_IDS: Record<string, { label: string; stints: string; wc: string[] }> = {');
  for (const k of sortedKeys(nationIds)) {
    const n = nationIds[k];
    out.push(`  ${q(k)}: { label: ${q(n.label)}, stints: ${q(n.stints)}, wc: [${n.wc.map(q).join(', ')}] },`);
  }
  out.push('};');
  out.push(END);
  return out.join('\n');
}

export function renderIdsJson(derived, date) {
  return {
    _header: {
      command: 'node scripts/genSoccerGridIds.mjs',
      check: 'node scripts/genSoccerGridIds.mjs --check',
      generated: date,
      thresholds: THRESHOLDS,
      stintsYears: 'soccer_player_club_stints first_year and last_year are season END years (Messi at PSG starts 2022, Haaland at Manchester City starts 2023). The club window is first_year <= World Cup year and last_year >= year minus 1, which is not season aligned for the winter 2022 tournament; both readings are below.',
      windowReadings: derived.report.window,
      rows: derived.report.rows,
    },
    clubs: derived.report.clubs,
    compounds: derived.report.compounds,
    nations: derived.report.nations,
    unresolved: derived.report.unresolved,
    lowCoverage: derived.report.lowCoverage,
    smallStrings: derived.report.smallStrings,
  };
}

/* the block as it sits in the file, markers included, or null */
export function currentBlock(src) {
  const text = lf(src);
  const a = text.indexOf(BEGIN);
  const b = text.indexOf(END);
  if (a < 0 || b < 0 || text.indexOf(BEGIN, a + 1) >= 0 || text.indexOf(END, b + 1) >= 0 || b < a) return null;
  return text.slice(a, b + END.length);
}

export const withoutDate = j => JSON.stringify({ ...j, _header: { ...j._header, generated: null } });

async function main() {
  const check = process.argv.includes('--check');
  let inputs;
  try {
    inputs = await readInputs();
  } catch (e) {
    console.error(`genSoccerGridIds: ${e.message}. Nothing was written.`);
    process.exit(1);
  }
  const derived = deriveSoccerGridIds(inputs);
  const r = derived.report;
  console.log(`rows read: ${r.rows.stints} stints, ${r.rows.worldCupPlayers} world_cup_players, ${r.rows.clubPuzzles} club puzzles, ${r.rows.gridPuzzles} boards, ${r.rows.fallbackLabels} fallback labels`);
  console.log(`club labels resolved: ${Object.keys(r.clubs).length} single (${Object.keys(derived.clubIds).length} keys), ${Object.keys(r.compounds).length} compound`);
  console.log(`nation labels resolved: ${Object.keys(r.nations).length}`);
  for (const u of r.unresolved) console.log(`  unresolved: ${u.label} (${u.slots} slots): ${u.reason}`);
  for (const l of r.lowCoverage) console.log(`  low coverage: ${l.label} reaches ${l.names} names via ${l.strings.join(', ')}`);
  for (const s of r.smallStrings) console.log(`  small string: ${s.stored} reaches ${s.names.length}: ${s.names.join(', ')}`);
  const w = r.window;
  const fmt = x => (x ? `${x.stored} for ${x.spelling} ${x.reading}` : 'none');
  console.log(`window: lowest accepted ${fmt(w.draft.lowestAccepted)}, highest rejected ${fmt(w.draft.highestRejected)}; season aligned lowest accepted ${fmt(w.seasonAligned.lowestAccepted)}, loses ${w.seasonAligned.lostAgainstDraft.join('; ') || 'nothing'}`);
  console.log(`spellings with two targets: ${w.draft.spellingsWithTwoTargets.length}`);
  if (derived.problems.length) {
    derived.problems.forEach(p => console.error(`  FAIL: ${p}`));
    console.error('genSoccerGridIds: the typed tables disagree with the data. Nothing was written.');
    process.exit(1);
  }

  const fnSrc = fs.readFileSync(FN_FILE, 'utf8');
  const onDisk = currentBlock(fnSrc);
  if (onDisk === null) { console.error(`genSoccerGridIds: ${FN_FILE} must carry each generated-ids marker exactly once`); process.exit(1); }
  const block = renderIdsBlock(derived);
  const existing = fs.existsSync(JSON_FILE) ? JSON.parse(fs.readFileSync(JSON_FILE, 'utf8')) : null;
  const today = new Date().toISOString().slice(0, 10);
  let json = renderIdsJson(derived, today);
  if (existing && withoutDate(existing) === withoutDate(json)) json = existing;

  if (check) {
    const staleBlock = onDisk !== block;
    const staleJson = !existing || withoutDate(existing) !== withoutDate(json);
    if (staleBlock) console.error('  STALE: the generated-ids block in the validator differs from a fresh derivation');
    if (staleJson) console.error('  STALE: scripts/data/soccerGridIds.json differs from a fresh derivation');
    if (staleBlock || staleJson) { console.error('genSoccerGridIds --check: stale. Rerun node scripts/genSoccerGridIds.mjs.'); process.exit(1); }
    console.log('genSoccerGridIds --check: the block and the json match a fresh derivation.');
    return;
  }

  const eol = fnSrc.includes('\r\n') ? '\r\n' : '\n';
  const nextSrc = lf(fnSrc).replace(onDisk, () => block).split('\n').join(eol);
  fs.writeFileSync(FN_FILE, nextSrc);
  fs.writeFileSync(JSON_FILE, JSON.stringify(json, null, 2) + '\n');
  console.log(`wrote the generated-ids block and ${path.relative(ROOT, JSON_FILE)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
