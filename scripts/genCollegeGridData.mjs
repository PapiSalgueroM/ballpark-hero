/* The College Grid answer key, derived offline from the site's own tables.

   Round 611. College Grid judged every guess through an AI validator that
   runs out of its free allowance for most of the US day, and since the fail
   closed change a guess the tables cannot confirm is never counted, so boards
   could neither be won nor lost. This key lets the page judge in the browser,
   the way the NFL grid does against nfl_grid_players (Rounds 405 and 406):
   yes, no or unknown per label, with a no only from a complete fact.

   SOURCES
     scripts/data/nflGridPlayers.json   the committed NFL key, one row per career from 1970
     nfl_draft_picks                    cleaned by scripts/lib/draftRounds.mjs
     nflfastr_rosters                   draft_number and college by gsis_id
     cfb_heisman_winners                every winner since 1935
     cfb_qb_stats, cfb_rb_stats         school lists for college passers and rushers

   THE RULES (written into the file's rules block too; nothing below is typed
   per player, per school or per pick):

     NAMES. foldName: accents stripped, lower case, apostrophes and periods
       dropped, anything else not a letter or digit a space, runs of single
       letters joined (A. J. and AJ fold alike), a trailing jr, sr, ii, iii or
       iv dropped, a quoted nickname dropped. The draft table stores 3,278 old
       names mirrored as "Last, FirstFirst Last"; a name that repeats itself
       exactly that way is read as "First Last" before folding, and a Hall of
       Fame marker glued to the end of a name ("Roger StaubachHOF") is
       dropped. Every dash character is read as a hyphen.

     IDENTITY.
       A draft row joins a career on folded name plus either the key's own
       draft (equal year and pick) or a first season 0 to 3 years after the
       draft with a compatible position group (the row's group is one the
       career's roster codes hold). Candidates are tiered: both conditions,
       then the equal pick, then (after every equal-pick join) the window,
       where a career already holding a row from that draft year is not a
       candidate. One career in the first tier that has any joins it; two or
       more is ambiguous and the row joins nothing and forms nothing. A
       career the key marks undrafted takes no window join. When window joins
       would give one career rows with no college in common, none of those
       window joins are kept. A row that could be a career's but joined
       nobody keeps that career's pick facts from reading as complete: a
       false first_round becomes null unless that row is past its boundary
       too, and best_pick becomes null if that row's pick is smaller.
       Last, a draft slot belongs to one player: a row still unjoined joins
       the one career holding that slot (its NFL key draft year and pick, or
       its roster draft number in the year before or the year of its first
       season) whose surname folds alike and that holds no row from that year
       (Nathan Gerry in the draft table is the key's Nate Gerry, 2017 pick 184).
       Unjoined, unambiguous draft rows with one folded name, one college
       and years within 3 of each other form a draft-only entry.
       A Heisman row joins the one entry with the same folded name whose
       colleges hold its school (a quoted nickname is also tried as nickname
       plus surname; two such entries are told apart by the winner's listed
       position group when exactly one holds it); otherwise it stands alone.
       A cfb stats row adds its schools only when its folded name matches
       the entry's name or a name on one of its draft rows, its last season falls in the 3 seasons before one of the entry's
       draft years, and its list already holds that draft row's college;
       a row that fits two entries adds to neither.

     COLLEGES. HTML entities are decoded before a college is split on
       semicolons (Texas A&amp;M would otherwise split into two schools).
       Canonical spellings come from a DERIVED alias table: a roster
       spelling maps to a draft spelling when the two sit on at least 3
       joined careers and on at least 95 percent of that roster spelling's
       joined careers. On a career whose roster already spells one of its
       draft colleges exactly, the other roster spellings are schools he
       transferred from and are not evidence either way. The table applies
       to every source's spellings. No alias is typed by hand.
     COLLEGES_AGREED. A draft college also held by a second source: the
       roster, the joined Heisman row, or a joined cfb stats row.
     GROUPS. POSITION_GROUPS of src/lib/nflGrid.ts applied to the key's
       roster codes, to the draft position (word forms such as "Defensive
       end" read as their code, a slash or comma list read as each part) and
       to the Heisman position (HB and FB count as RB) and to the position a
       joined cfb stats row lists for his college career (Matt Jones threw
       755 passes as Arkansas's quarterback and was a receiver in the NFL,
       so a college grid has him at both). A code that does not
       name one group adds nothing: kickers, punters and snappers, the side
       free old words (Back, End, Tackle and their one letter forms, the
       single wing backs), and every position listed in a draft year before
       the table lists offense and defense apart. That year is derived: the
       first year from which every draft lists at least one fifth of its
       rows at a defensive code. The same year gates Heisman positions,
       because a two way player's listed position cannot support a no.
     DRAFT. best_pick is the smallest pick across the entry's draft rows.
       first_round is true when any row is inside its year's firstRoundEnds,
       false when every row has a boundary and none is inside it, null
       otherwise. undrafted is copied from nflGridPlayers.json.
     DISPLAY. The name alone when nobody shares its folded form; else, per
       name group, the first level that tells every namesake apart: name
       (college), name (college, draft year), name (college, draft year,
       seasons), a missing part skipped; a group still tied gets #2, #3 in
       id order.

   Output: scripts/data/collegeGridPlayers.json. The keys of each player are
   the columns of public.college_grid_players (so the file loads row for row)
   plus a proof block the board generator reads for two-source answers.

   Run: node scripts/genCollegeGridData.mjs
        node scripts/genCollegeGridData.mjs --check   (rebuild in memory, compare, write nothing)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pullAll } from './genNflGridData.mjs';
import { cleanDraftPicks, firstRoundEnds, inFirstRound } from './lib/draftRounds.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = path.join(ROOT, 'scripts', 'data', 'collegeGridPlayers.json');
export const NFL_KEY = path.join(ROOT, 'scripts', 'data', 'nflGridPlayers.json');

export const JOIN_WINDOW_YEARS = 3;
export const ALIAS_MIN_ENTRIES = 3;
export const ALIAS_MIN_SHARE = 0.95;
export const SPLIT_MIN_DEFENSIVE_SHARE = 0.2;

/* POSITION_GROUPS, read out of src/lib/nflGrid.ts so the key and the page
   can never map a code two ways. */
export function readPositionGroups() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'nflGrid.ts'), 'utf8');
  const block = src.match(/export const POSITION_GROUPS[^=]*=\s*\{([\s\S]*?)\};/);
  if (!block) throw new Error('POSITION_GROUPS not found in src/lib/nflGrid.ts');
  const groups = {};
  for (const m of block[1].matchAll(/([A-Z]+):\s*'([A-Z]+)'/g)) groups[m[1]] = m[2];
  if (Object.keys(groups).length < 20) throw new Error('POSITION_GROUPS parsed to too few codes');
  return groups;
}

/* Word forms the draft table uses for a code (upper case). Each names one
   code; nothing here decides a player. */
export const WORD_FORMS = {
  QUARTERBACK: 'QB', 'RUNNING BACK': 'RB', HALFBACK: 'HB', FULLBACK: 'FB',
  'WIDE RECEIVER': 'WR', FLANKER: 'WR', 'SPLIT END': 'WR', 'TIGHT END': 'TE',
  'OFFENSIVE TACKLE': 'OT', 'OFFENSIVE GUARD': 'OG', GUARD: 'G', CENTER: 'C',
  'DEFENSIVE END': 'DE', 'DEFENSIVE TACKLE': 'DT', 'NOSE TACKLE': 'NT', 'DEFENSIVE LINE MEN': 'DL',
  LINEBACKER: 'LB', 'DEFENSIVE BACK': 'DB', CORNERBACK: 'CB', 'CORNER BACK': 'CB', SAFETY: 'S',
  KICKER: 'K', PLACEKICKER: 'K', PUNTER: 'P',
};
/* Codes that do not say which side of the ball: they add nothing in any year. */
export const SIDE_FREE_CODES = new Set(['B', 'BACK', 'E', 'END', 'TACKLE', 'WB', 'BB', 'TB', 'TAILBACK']);
const DEFENSIVE_GROUPS = new Set(['DL', 'LB', 'DB']);

// ---------------------------------------------------------------------------
// Names and colleges
// ---------------------------------------------------------------------------

const MARKS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');
const APOSTROPHES = new RegExp("['`." + String.fromCharCode(0x2018, 0x2019) + "]", "g");
const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv']);

export function foldName(s) {
  let t = String(s ?? '').replace(/"[^"]*"/g, ' ');
  t = t.normalize('NFD').replace(MARKS, '').toLowerCase();
  t = t.replace(APOSTROPHES, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const out = [];
  for (const tok of t.split(' ').filter(Boolean)) {
    if (tok.length === 1 && out.length && out[out.length - 1].single) out[out.length - 1].text += tok;
    else out.push({ text: tok, single: tok.length === 1 });
  }
  const words = out.map(o => o.text);
  while (words.length > 1 && SUFFIXES.has(words[words.length - 1])) words.pop();
  return words.join(' ');
}

/** "Frick, RayRay Frick" to "Ray Frick": only a name that repeats itself exactly that way. */
export function unmirrorName(s) {
  const name = String(s ?? '').trim();
  const m = name.match(/^([^,]+), (.+)\2 \1$/);
  return m ? `${m[2]} ${m[1]}` : name;
}

/** A draft table name as a person's name: entities decoded, a mirrored name read once, a Hall of Fame marker glued to the end ("Roger StaubachHOF") dropped. */
export function readDraftName(s) {
  return unmirrorName(decodeText(s)).replace(/([a-z])HOF$/, '$1').trim();
}

const DASHES = new RegExp('[' + String.fromCharCode(0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212) + ']', 'g');

/** HTML entities decoded, any dash character read as a hyphen (the repo keeps no en or em dash), spaces collapsed. */
export function decodeText(s) {
  return String(s ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(DASHES, '-')
    .replace(/\s+/g, ' ');
}

/** Decode, then split on semicolons. decodeFirst=false is the harness control's wrong order. */
export function splitColleges(s, { decodeFirst = true } = {}) {
  if (s == null) return [];
  const parts = decodeFirst ? decodeText(s).split(';') : String(s).split(';').map(decodeText);
  return parts.map(x => x.trim()).filter(Boolean);
}

/** A cfb stats school list: comma separated, entities decoded. */
export function splitSchoolList(s) {
  return decodeText(s ?? '').split(',').map(x => x.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Positions
// ---------------------------------------------------------------------------

export function codeParts(raw) {
  return String(raw ?? '').toUpperCase().split(/[/,]/).map(x => x.trim()).filter(Boolean);
}

/** Groups one listed position names, before any year gate. A side free or unknown code adds nothing. */
export function groupsOfListedPosition(raw, positionGroups) {
  const out = new Set();
  for (const part of codeParts(raw)) {
    if (SIDE_FREE_CODES.has(part)) continue;
    const code = WORD_FORMS[part] ?? part;
    const g = positionGroups[code];
    if (g) out.add(g);
  }
  return out;
}

/** The first draft year from which every draft lists at least a fifth of its rows at a defensive code. */
export function deriveSplitYear(picks, positionGroups) {
  const byYear = new Map();
  for (const p of picks) {
    const y = Number(p.year);
    const s = byYear.get(y) ?? { rows: 0, defensive: 0 };
    s.rows += 1;
    const g = groupsOfListedPosition(p.position, positionGroups);
    if ([...g].some(x => DEFENSIVE_GROUPS.has(x))) s.defensive += 1;
    byYear.set(y, s);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  let split = null;
  for (let i = years.length - 1; i >= 0; i -= 1) {
    const s = byYear.get(years[i]);
    if (s.defensive / s.rows >= SPLIT_MIN_DEFENSIVE_SHARE) split = years[i];
    else break;
  }
  const shares = Object.fromEntries(years.map(y => [y, Math.round((byYear.get(y).defensive / byYear.get(y).rows) * 1000) / 1000]));
  return { splitYear: split, shares };
}

// ---------------------------------------------------------------------------
// The key
// ---------------------------------------------------------------------------

const uniq = list => [...new Set(list)];
const sortedGroups = set => [...set].sort();

export function deriveAliases(pairs) {
  /* pairs: one { roster: Set<string>, draft: Set<string> } per joined career. */
  const entriesWith = new Map();
  const together = new Map();
  for (const { roster, draft } of pairs) {
    for (const r of roster) {
      entriesWith.set(r, (entriesWith.get(r) ?? 0) + 1);
      for (const d of draft) {
        const k = JSON.stringify([r, d]);
        together.set(k, (together.get(k) ?? 0) + 1);
      }
    }
  }
  const aliases = [];
  for (const [k, n] of together) {
    const [r, d] = JSON.parse(k);
    if (r === d) continue;
    const of = entriesWith.get(r);
    if (n >= ALIAS_MIN_ENTRIES && n / of >= ALIAS_MIN_SHARE) aliases.push({ from: r, to: d, entries: n, of });
  }
  aliases.sort((a, b) => b.entries - a.entries || a.from.localeCompare(b.from));
  return aliases;
}

export function buildCollegeKey(src, { control = {} } = {}) {
  const positionGroups = src.positionGroups ?? readPositionGroups();
  const careers = src.careers;
  const picks = cleanDraftPicks(src.picks);
  const ends = firstRoundEnds(picks);
  const { splitYear, shares } = deriveSplitYear(picks, positionGroups);
  const decodeFirst = control.decodeFirst !== false;
  const stats = {};

  const draftGroupsOf = p => (Number(p.year) >= splitYear ? groupsOfListedPosition(p.position, positionGroups) : new Set());
  const rows = picks.map(p => ({
    id: Number(p.id), year: Number(p.year), pick: Number(p.pick), round: Number(p.round),
    name: readDraftName(p.player_name), fold: foldName(readDraftName(p.player_name)),
    position: p.position ?? null, groups: draftGroupsOf(p),
    colleges: splitColleges(p.college, { decodeFirst }),
    rawCollege: String(p.college ?? '').trim(),
  }));
  stats.mirroredNames = picks.filter(p => unmirrorName(p.player_name) !== String(p.player_name ?? '').trim()).length;
  stats.hofMarkers = picks.filter(p => /[a-z]HOF$/.test(String(p.player_name ?? '').trim())).length;

  /* Roster facts by gsis_id from nflfastr_rosters. */
  const rosterColleges = new Map();
  const rosterRaw = new Map();
  const rosterPicks = new Map();
  for (const r of src.rosters) {
    if (!r.gsis_id) continue;
    if (String(r.college ?? '').trim()) {
      if (!rosterRaw.has(r.gsis_id)) rosterRaw.set(r.gsis_id, new Set());
      rosterRaw.get(r.gsis_id).add(String(r.college).trim());
    }
    for (const c of splitColleges(r.college, { decodeFirst })) {
      if (!rosterColleges.has(r.gsis_id)) rosterColleges.set(r.gsis_id, new Set());
      rosterColleges.get(r.gsis_id).add(c);
    }
    const n = Number(String(r.draft_number ?? '').trim());
    if (Number.isFinite(n) && n > 0 && String(r.draft_club ?? '').trim()) {
      if (!rosterPicks.has(r.gsis_id)) rosterPicks.set(r.gsis_id, new Set());
      rosterPicks.get(r.gsis_id).add(n);
    }
  }

  const floorSeason = Math.min(...careers.map(c => c.seasons[0]));
  const entries = careers.map(c => {
    const roster = new Set(splitColleges(c.college, { decodeFirst }));
    for (const x of rosterColleges.get(c.id) ?? []) roster.add(x);
    const rp = rosterPicks.get(c.id);
    const raw = new Set([...(c.college ? [String(c.college).trim()] : []), ...(rosterRaw.get(c.id) ?? [])]);
    return {
      rawRoster: raw,
      kind: 'career', id: c.id, name: c.name, fold: foldName(c.name),
      rosterGroups: new Set(c.pos.map(x => positionGroups[x]).filter(Boolean)),
      rosterColleges: roster, rosterPick: rp && rp.size === 1 ? [...rp][0] : null,
      first: c.seasons[0], last: c.seasons[1],
      undrafted: c.draft === 'undrafted', keyDraft: c.draft && typeof c.draft === 'object' ? c.draft : null,
      rows: [], possible: [], heisman: [], cfb: [],
    };
  });
  const careersByFold = new Map();
  for (const e of entries) {
    if (!careersByFold.has(e.fold)) careersByFold.set(e.fold, []);
    careersByFold.get(e.fold).push(e);
  }

  /* Draft rows to careers. */
  let ambiguousRows = 0;
  const ambiguousRowList = [];
  const windowJoins = [];
  const joinedBy = { both: 0, pick: 0, window: 0 };
  const unjoined = [];
  /* A row that could be a career's but joined nobody (ambiguous, or a window
     join dropped for its college) is recorded on every career it could be,
     so that career's pick facts are never read as complete. */
  const ambiguous = (row, list) => {
    ambiguousRows += 1;
    ambiguousRowList.push(`${row.name} ${row.year} pick ${row.pick}`);
    for (const e of list) e.possible.push(row);
  };
  const pickEq = row => e => e.keyDraft && e.keyDraft.year === row.year && e.keyDraft.pick === row.pick;
  const win = row => e => !e.undrafted && e.first - row.year >= 0 && e.first - row.year <= JOIN_WINDOW_YEARS && [...row.groups].some(g => e.rosterGroups.has(g));
  const pending = [];
  for (const row of rows) {
    const cands = careersByFold.get(row.fold) ?? [];
    const both = cands.filter(e => pickEq(row)(e) && win(row)(e));
    const pick = both.length ? both : cands.filter(pickEq(row));
    if (!pick.length) { pending.push(row); continue; }
    if (pick.length > 1) { ambiguous(row, pick); continue; }
    pick[0].rows.push(row);
    joinedBy[both.length ? 'both' : 'pick'] += 1;
  }
  /* The window tier, after every equal-pick join: one person holds one pick per draft year. */
  for (const row of pending) {
    const cands = (careersByFold.get(row.fold) ?? []).filter(e => win(row)(e) && !e.rows.some(r => r.year === row.year));
    if (!cands.length) { unjoined.push(row); continue; }
    if (cands.length > 1) { ambiguous(row, cands); continue; }
    windowJoins.push({ row, entry: cands[0] });
  }
  /* Window joins that would give one career rows with no college in common are dropped. */
  const byEntry = new Map();
  for (const w of windowJoins) {
    if (!byEntry.has(w.entry)) byEntry.set(w.entry, []);
    byEntry.get(w.entry).push(w.row);
  }
  let conflictingWindowRows = 0;
  for (const [e, list] of byEntry) {
    const all = [...e.rows, ...list];
    const shared = all.length < 2 ? true : all.map(r => new Set(r.colleges)).reduce((acc, s) => new Set([...acc].filter(x => s.has(x))));
    if (shared === true || shared.size > 0) { e.rows.push(...list); joinedBy.window += list.length; }
    else { conflictingWindowRows += list.length; e.possible.push(...list); }
  }
  stats.joins = { ...joinedBy, ambiguousRows, conflictingWindowRows, unjoinedRows: unjoined.length };
  stats.ambiguousRowList = ambiguousRowList;

  /* The alias table, from careers holding both a draft college and a roster college. */
  const pairs = entries.filter(e => e.rows.length && e.rosterColleges.size)
    .map(e => ({ roster: e.rosterColleges, draft: new Set(e.rows.flatMap(r => r.colleges)), rawRoster: e.rawRoster, rawDraft: new Set(e.rows.map(r => r.rawCollege).filter(Boolean)) }))
    .filter(p => p.draft.size);
  /* A roster spelling equal to a draft spelling already names the draft
     school, so the entry's other roster spellings are schools he transferred
     from and say nothing about how the draft table spells anything. */
  const evidence = pairs.map(p => {
    const same = [...p.roster].filter(r => p.draft.has(r));
    return { roster: same.length ? new Set(same) : p.roster, draft: p.draft };
  });
  const aliasList = control.noAliases ? [] : deriveAliases(evidence);
  const alias = new Map(aliasList.map(a => [a.from, a.to]));
  const chains = aliasList.filter(a => alias.has(a.to));
  if (chains.length) throw new Error(`alias chain: ${chains.map(a => `${a.from} to ${a.to}`).join(', ')}`);
  const canon = s => alias.get(s) ?? s;

  /* Agreement, the harness's floor: careers with both, before and after the alias table. */
  const agreeCount = fn => pairs.filter(p => [...p.draft].some(d => [...p.roster].some(r => fn(d) === fn(r)))).length;
  const rawAgree = pairs.filter(p => [...p.rawDraft].some(d => p.rawRoster.has(d))).length;
  stats.agreement = { entries: pairs.length, raw: rawAgree, beforeAliases: agreeCount(x => x), afterAliases: agreeCount(canon) };

  /* The draft slot tier, after the alias table so the agreement above is
     measured on name joins alone. A draft slot belongs to one player, and the
     two tables can spell his first name two ways (the draft table's Nathan
     Gerry is the key's Nate Gerry, 2017 pick 184). A career's slots are its
     NFL key draft and its roster draft number in the year before or the year
     of its first season (the key dates Josh Allen of Kentucky to 2018 pick 7;
     his rosters say pick 7 and he starts in 2019, where the draft table has
     Josh Hines-Allen). A row still unjoined joins the one career holding its
     slot whose surname folds alike and that holds no row from that year. */
  const careersBySlot = new Map();
  for (const e of entries) {
    const slots = new Set();
    if (e.keyDraft) slots.add(`${e.keyDraft.year}|${e.keyDraft.pick}`);
    if (e.rosterPick != null) for (const y of [e.first - 1, e.first]) slots.add(`${y}|${e.rosterPick}`);
    for (const k of slots) careersBySlot.set(k, [...(careersBySlot.get(k) ?? []), e]);
  }
  const surnameOf = fold => fold.split(' ').pop();
  const draftOnlyRows = [];
  let slotJoins = 0;
  for (const row of unjoined) {
    const cands = control.noSlotJoin ? [] : (careersBySlot.get(`${row.year}|${row.pick}`) ?? [])
      .filter(e => surnameOf(e.fold) === surnameOf(row.fold) && !e.rows.some(r => r.year === row.year));
    if (cands.length === 1) { cands[0].rows.push(row); slotJoins += 1; } else draftOnlyRows.push(row);
  }
  stats.joins.slot = slotJoins;

  /* Draft-only entries: unjoined rows grouped by folded name and canonical college, clustered by year. */
  const groups = new Map();
  for (const row of draftOnlyRows) {
    const key = JSON.stringify([row.fold, row.colleges.map(canon).sort()]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.year - b.year || a.pick - b.pick);
    let cluster = [];
    const flush = () => {
      if (!cluster.length) return;
      const first = cluster[0];
      entries.push({
        kind: 'draft', id: `draft:${first.year}-${first.pick}`, name: first.name, fold: first.fold,
        rosterGroups: new Set(), rosterColleges: new Set(), rosterPick: null, first: null, last: null,
        undrafted: false, keyDraft: null, rows: cluster, possible: [], heisman: [], cfb: [],
      });
      cluster = [];
    };
    for (const row of list) {
      if (cluster.length && row.year - cluster[cluster.length - 1].year > JOIN_WINDOW_YEARS) flush();
      cluster.push(row);
    }
    flush();
  }

  /* Measured, not acted on: draft-only entries that share a folded name with a career. */
  {
    const careerFolds = new Map();
    for (const e of entries) if (e.kind === 'career') careerFolds.set(e.fold, [...(careerFolds.get(e.fold) ?? []), e]);
    const shared = entries.filter(e => e.kind === 'draft' && careerFolds.has(e.fold));
    stats.draftOnlySharingCareerName = {
      entries: shared.length,
      withCareerAtFloor: shared.filter(e => careerFolds.get(e.fold).some(c => c.first === floorSeason && e.rows[0].year < floorSeason)).length,
    };
  }

  /* Colleges an entry holds before Heisman and cfb (draft, then roster), canonical. */
  const baseColleges = e => uniq([...e.rows.flatMap(r => r.colleges), ...e.rosterColleges].map(canon));
  const byFold = new Map();
  for (const e of entries) {
    if (!byFold.has(e.fold)) byFold.set(e.fold, []);
    byFold.get(e.fold).push(e);
  }

  /* Heisman rows. */
  let heismanJoined = 0, heismanAlone = 0, heismanAmbiguous = 0;
  for (const h of [...src.heisman].sort((a, b) => a.year - b.year)) {
    const winner = decodeText(h.winner).trim();
    const fold = foldName(winner);
    /* A quoted nickname ('Felix "Doc" Blanchard') is also tried as nickname plus surname. */
    const nick = winner.match(/"([^"]+)"/);
    const folds = uniq([fold, ...(nick ? [foldName(`${nick[1]} ${winner.replace(/"[^"]*"/g, ' ').trim().split(/\s+/).pop()}`)] : [])]);
    const school = canon(decodeText(h.school).trim());
    const hg = Number(h.year) >= splitYear ? groupsOfListedPosition(h.position, positionGroups) : new Set();
    const row = { year: Number(h.year), school, groups: hg };
    let cands = [];
    for (const f of folds) {
      cands = (byFold.get(f) ?? []).filter(e => e.kind !== 'heisman' && baseColleges(e).includes(school));
      if (cands.length) break;
    }
    /* Two namesakes at one school (Robert Griffin the 2012 Baylor quarterback
       and Robert Griffin the 2012 Baylor guard): the winner's listed group decides, if it can. */
    if (cands.length > 1 && hg.size) {
      const fit = cands.filter(e => [...hg].some(g => e.rosterGroups.has(g) || e.rows.some(r => r.groups.has(g))));
      if (fit.length === 1) cands = fit;
    }
    if (cands.length === 1) { cands[0].heisman.push(row); heismanJoined += 1; continue; }
    if (cands.length > 1) heismanAmbiguous += 1;
    const alone = (byFold.get(fold) ?? []).find(e => e.kind === 'heisman' && e.heisman[0]?.school === school);
    if (alone) { alone.heisman.push(row); continue; }
    const e = {
      kind: 'heisman', id: `heisman:${h.year}`, name: winner, fold,
      rosterGroups: new Set(), rosterColleges: new Set(), rosterPick: null, first: null, last: null,
      undrafted: false, keyDraft: null, rows: [], possible: [], heisman: [row], cfb: [],
    };
    entries.push(e);
    if (!byFold.has(fold)) byFold.set(fold, []);
    byFold.get(fold).push(e);
    heismanAlone += 1;
  }
  stats.heisman = { rows: src.heisman.length, joined: heismanJoined, alone: heismanAlone, ambiguous: heismanAmbiguous };

  /* cfb stats rows. */
  let cfbAdded = 0, cfbAmbiguous = 0, cfbNewSchools = 0;
  /* An entry answers to its own name and to the names on its draft rows (a slot join brings a second spelling). */
  const byAnyFold = new Map();
  for (const e of entries) for (const f of new Set([e.fold, ...e.rows.map(r => r.fold)])) byAnyFold.set(f, [...(byAnyFold.get(f) ?? []), e]);
  for (const s of [...src.qb, ...src.rb]) {
    const fold = foldName(s.player_name);
    const schools = uniq(splitSchoolList(s.schools).map(canon));
    const last = Number(s.year_max);
    const fits = (byAnyFold.get(fold) ?? []).filter(e => e.rows.some(r => last >= r.year - JOIN_WINDOW_YEARS && last <= r.year - 1 && r.colleges.map(canon).some(c => schools.includes(c))));
    if (fits.length > 1) { cfbAmbiguous += 1; continue; }
    if (fits.length === 1) {
      const e = fits[0];
      const before = new Set(baseColleges(e));
      e.cfb.push({ slug: s.player_slug, schools, groups: control.noCfbGroups ? new Set() : groupsOfListedPosition(s.pos, positionGroups) });
      cfbAdded += 1;
      cfbNewSchools += schools.filter(x => !before.has(x)).length;
    }
  }
  stats.cfb = { rows: src.qb.length + src.rb.length, joined: cfbAdded, ambiguous: cfbAmbiguous, schoolsAdded: cfbNewSchools };

  /* Final rows. */
  const players = entries.map(e => {
    const draftColleges = uniq(e.rows.flatMap(r => r.colleges).map(canon));
    const roster = uniq([...e.rosterColleges].map(canon));
    const heismanSchools = uniq(e.heisman.map(h => h.school));
    const cfbSchools = uniq(e.cfb.flatMap(c => c.schools));
    const colleges = uniq([...draftColleges, ...roster, ...heismanSchools, ...cfbSchools]);
    const second = new Set([...roster, ...heismanSchools, ...cfbSchools]);
    const draftGroups = new Set(e.rows.flatMap(r => [...r.groups]));
    const heismanGroups = new Set(e.heisman.flatMap(h => [...h.groups]));
    const cfbGroups = new Set(e.cfb.flatMap(c => [...c.groups]));
    const groupsAll = new Set([...e.rosterGroups, ...draftGroups, ...heismanGroups, ...cfbGroups]);
    const verdicts = e.rows.map(r => inFirstRound(r.year, r.pick, ends));
    let firstRound = verdicts.some(v => v === true) ? true : (verdicts.length && verdicts.every(v => v === false) ? false : null);
    const bestRow = e.rows.length ? [...e.rows].sort((a, b) => a.pick - b.pick || a.year - b.year)[0] : null;
    /* A row that may be this career's but joined nobody: a false first round
       stands only if that row is past its boundary too, and the best pick
       stands only if that row could not beat it. */
    let bestPick = bestRow ? bestRow.pick : null;
    if (e.possible.length) {
      if (firstRound === false && e.possible.some(r => inFirstRound(r.year, r.pick, ends) !== false)) firstRound = null;
      if (bestPick != null && e.possible.some(r => r.pick < bestPick)) bestPick = null;
    }
    return {
      id: e.id,
      display_name: '',
      name: e.name,
      name_norm: e.fold,
      colleges,
      colleges_agreed: draftColleges.filter(c => second.has(c)),
      groups: sortedGroups(groupsAll),
      best_pick: bestPick,
      first_round: firstRound,
      undrafted: e.undrafted,
      heisman_year: e.heisman.length ? Math.min(...e.heisman.map(h => h.year)) : null,
      first_season: e.first,
      seasons: e.first != null ? e.last - e.first + 1 : 0,
      dup: false,
      proof: {
        draft_rows: e.rows.map(r => [r.year, r.pick]).sort((a, b) => a[0] - b[0] || a[1] - b[1]),
        draft_best_year: bestRow ? bestRow.year : null,
        draft_groups: sortedGroups(draftGroups),
        roster_groups: sortedGroups(e.rosterGroups),
        heisman_groups: sortedGroups(heismanGroups),
        roster_pick: e.rosterPick,
        roster_colleges: roster,
        heisman_schools: heismanSchools,
        cfb_schools: cfbSchools,
        cfb_groups: sortedGroups(cfbGroups),
      },
    };
  });
  for (const p of players) if (p.undrafted && p.proof.draft_rows.length) throw new Error(`${p.name} is undrafted in the NFL key and holds draft rows`);

  const counts = new Map();
  for (const p of players) counts.set(p.name_norm, (counts.get(p.name_norm) ?? 0) + 1);
  for (const p of players) p.dup = (counts.get(p.name_norm) ?? 0) > 1;
  players.sort((a, b) => a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id));
  assignDisplayNames(players);

  stats.aliases = aliasList;
  stats.splitYear = splitYear;
  stats.defensiveShares = shares;
  stats.floorSeason = floorSeason;
  stats.ends = ends;
  stats.picks = picks.length;
  return { players, stats };
}

/** Display names: the name alone, else the first level that tells a name group apart. */
export function displayParts(p, level) {
  const school = p.colleges[0] ?? null;
  const year = p.proof?.draft_best_year ?? null;
  const span = p.first_season != null ? `${p.first_season}-${p.first_season + p.seasons - 1}` : null;
  if (level === 1) return [school ?? span];
  if (level === 2) return [school, year ?? span];
  return [school, year, span];
}

export function assignDisplayNames(players) {
  const groups = new Map();
  for (const p of players) {
    if (!groups.has(p.name_norm)) groups.set(p.name_norm, []);
    groups.get(p.name_norm).push(p);
  }
  for (const list of groups.values()) {
    if (list.length === 1) { list[0].display_name = list[0].name; continue; }
    let names = null;
    for (let level = 1; level <= 3; level += 1) {
      names = list.map(p => {
        const parts = uniq(displayParts(p, level).filter(x => x != null && x !== ''));
        return parts.length ? `${p.name} (${parts.join(', ')})` : p.name;
      });
      if (new Set(names).size === names.length) break;
    }
    const seen = new Map();
    const order = [...list.keys()].sort((a, b) => list[a].id.localeCompare(list[b].id));
    for (const i of order) {
      const n = seen.get(names[i]) ?? 0;
      seen.set(names[i], n + 1);
      list[i].display_name = n === 0 ? names[i] : `${names[i]} #${n + 1}`;
    }
  }
}

export async function pullSources(log = () => {}) {
  const careers = JSON.parse(fs.readFileSync(NFL_KEY, 'utf8')).players;
  log(`NFL key careers ${careers.length}`);
  const picks = await pullAll('nfl_draft_picks', 'id,year,round,pick,player_name,position,college', 'id');
  log(`draft picks ${picks.length}`);
  const rosters = await pullAll('nflfastr_rosters', 'id,gsis_id,college,draft_number,draft_club', 'id', '', n => { if (n % 20000 === 0) log(`rosters ${n}`); });
  log(`roster rows ${rosters.length}`);
  const heisman = await pullAll('cfb_heisman_winners', 'id,year,winner,school,position', 'id');
  const qb = await pullAll('cfb_qb_stats', 'player_name,player_slug,year_max,schools,pos', 'player_slug');
  const rb = await pullAll('cfb_rb_stats', 'player_name,player_slug,year_max,schools,pos', 'player_slug');
  log(`heisman ${heisman.length}, cfb qb ${qb.length}, cfb rb ${rb.length}`);
  return { careers, picks, rosters, heisman, qb, rb };
}

export const RULES = {
  names: 'foldName: accents stripped, lower case, apostrophes and periods dropped, other non alphanumerics a space, runs of single letters joined, a trailing jr, sr, ii, iii or iv dropped, a quoted nickname dropped; a draft name mirrored as "Last, FirstFirst Last" is read as "First Last" and a Hall of Fame marker glued to its end (StaubachHOF) is dropped; every dash character read as a hyphen',
  draftRows: 'nfl_draft_picks with forfeit rows dropped, then one row per (year, pick), the lowest id (scripts/lib/draftRounds.mjs)',
  identity: `a draft row joins a career on folded name plus the key's equal draft year and pick, or a first season 0 to ${JOIN_WINDOW_YEARS} years after the draft with a compatible position group; tiers both, pick, then window after every equal-pick join, where a career already holding a row from that draft year is no candidate; two careers in the first non empty tier is ambiguous and the row joins and forms nothing; an undrafted career takes no window join; window joins leaving a career with rows sharing no college are dropped; a row that could be a career's but joined nobody turns that career's false first_round to null unless the row is past its boundary too, and its best_pick to null if the row's pick is smaller. A row still unjoined then joins the one career holding its slot (the NFL key draft year and pick, or the roster draft number in the year before or the year of the first season) whose surname folds alike and that holds no row from that year. Unjoined rows with one folded name, one college and years within ${JOIN_WINDOW_YEARS} of each other form a draft-only entry. A Heisman row joins the one entry of the same folded name whose colleges hold its school (a quoted nickname also tried as nickname plus surname; two such entries told apart by the winner's listed position group when exactly one holds it), else stands alone. A cfb stats row adds its schools when its folded name matches the entry's name or a name on one of its draft rows, its last season is in the ${JOIN_WINDOW_YEARS} seasons before one of the entry's draft years and its list holds that row's college; a row fitting two entries adds to neither`,
  colleges: `HTML entities decoded before splitting on semicolons; canonical spellings from a derived alias table (a roster spelling maps to a draft spelling on at least ${ALIAS_MIN_ENTRIES} joined careers and at least ${ALIAS_MIN_SHARE * 100} percent of that roster spelling's joined careers; on a career whose roster already spells one of its draft colleges exactly, its other roster spellings are transfer schools and not evidence), applied to every source; no alias typed by hand`,
  collegesAgreed: 'a draft college also held by the roster, the joined Heisman row or a joined cfb stats row',
  groups: `POSITION_GROUPS of src/lib/nflGrid.ts over roster codes, the draft position (word forms and slash lists included), the Heisman position (HB and FB count as RB) and the college position on each joined cfb stats row; side free words (Back, End, Tackle, B, E, WB, BB, TB, Tailback), kickers, punters and snappers add nothing, and nothing is read from a draft or Heisman position before the derived split year (the first year from which every draft lists at least ${SPLIT_MIN_DEFENSIVE_SHARE * 100} percent of its rows at a defensive code)`,
  draft: 'best_pick the smallest pick across the entry\'s draft rows; first_round true when any row is inside its year\'s firstRoundEnds, false when every row has a boundary and none is inside it, else null; undrafted copied from nflGridPlayers.json',
  seasons: 'first_season and seasons (last minus first plus one) from nflGridPlayers.json; 0 seasons when the NFL key holds no career for the entry',
  display: 'the name alone when nobody shares its folded form; else per name group the first level that tells every namesake apart: name (college), name (college, draft year), name (college, draft year, seasons), a missing part skipped; a group still tied gets #2, #3 in id order',
};

/* The file is columnar: the player keys repeated 35,000 times tripled its size.
   COLUMNS are the table's columns in load order plus name (for the display
   rule) and proof (an array in PROOF_FIELDS order, or 0 when every field is
   empty). readKeyFile turns a parsed file back into player objects. */
export const COLUMNS = ['id', 'display_name', 'name', 'name_norm', 'colleges', 'colleges_agreed', 'groups', 'best_pick', 'first_round', 'undrafted', 'heisman_year', 'first_season', 'seasons', 'dup', 'proof'];
export const PROOF_FIELDS = ['draft_rows', 'draft_best_year', 'draft_groups', 'roster_groups', 'heisman_groups', 'roster_pick', 'roster_colleges', 'heisman_schools', 'cfb_schools', 'cfb_groups'];
const emptyProofValue = v => v == null || (Array.isArray(v) && v.length === 0);

export function toRows(players) {
  return players.map(p => COLUMNS.map(c => {
    if (c !== 'proof') return p[c];
    const values = PROOF_FIELDS.map(k => p.proof[k]);
    return values.every(emptyProofValue) ? 0 : values;
  }));
}

export function readKeyFile(file) {
  if (JSON.stringify(file.columns) !== JSON.stringify(COLUMNS) || JSON.stringify(file.proofFields) !== JSON.stringify(PROOF_FIELDS)) throw new Error('collegeGridPlayers.json columns are not the ones this generator writes');
  return file.rows.map(r => {
    const p = Object.fromEntries(COLUMNS.map((c, i) => [c, r[i]]));
    const values = p.proof === 0 ? PROOF_FIELDS.map(k => (k === 'draft_best_year' || k === 'roster_pick' ? null : [])) : p.proof;
    p.proof = Object.fromEntries(PROOF_FIELDS.map((k, i) => [k, values[i]]));
    return p;
  });
}

export function renderFile(players, sources, stats) {
  return JSON.stringify({
    generatedOn: new Date().toISOString().slice(0, 10),
    round: 611,
    coverage: {
      careers: 'nflGridPlayers.json, NFL careers from 1970 to 2025',
      draft: `nfl_draft_picks ${Math.min(...stats.ends.keys())} to ${Math.max(...stats.ends.keys())}, first round boundary derived per year, null for ${[...stats.ends].filter(([, e]) => e === null).length} years with no round two rows`,
      heisman: 'cfb_heisman_winners, every winner since 1935',
      cfb: 'cfb_qb_stats and cfb_rb_stats school lists, 1980 to 2025',
      positions: `draft and Heisman positions read from ${stats.splitYear}, the derived year the draft table lists offense and defense apart`,
    },
    rules: RULES,
    aliases: stats.aliases,
    sourceRows: sources,
    columns: COLUMNS,
    proofFields: PROOF_FIELDS,
    rows: toRows(players),
  }, null, 0);
}

function printStats(players, stats, log = console.log) {
  const pct = (a, b) => `${a} of ${b} (${b ? ((100 * a) / b).toFixed(1) : '0.0'} percent)`;
  log(`${players.length} entries: ${players.filter(p => p.id.startsWith('draft:')).length} draft-only, ${players.filter(p => p.id.startsWith('heisman:')).length} Heisman-only, ${players.filter(p => !p.id.includes(':') || p.id.startsWith('nb:')).length} careers`);
  log(`draft rows after cleaning ${stats.picks}; mirrored names read ${stats.mirroredNames}; Hall of Fame markers dropped ${stats.hofMarkers}`);
  log(`joins: ${JSON.stringify(stats.joins)}; ambiguous rows: ${stats.ambiguousRowList.join(', ')}`);
  log(`draft-only entries sharing a folded name with a career: ${JSON.stringify(stats.draftOnlySharingCareerName)} (withCareerAtFloor: the career starts at the key's ${stats.floorSeason} floor and the draft is earlier)`);
  log(`split year for draft and Heisman positions: ${stats.splitYear}`);
  const endYears = [...stats.ends].filter(([y]) => y >= 1970);
  log(`first round boundary: ${endYears.filter(([, e]) => e !== null).length} of ${endYears.length} drafts from 1970; null years ${[...stats.ends].filter(([, e]) => e === null).map(([y]) => y).join(', ')}`);
  log(`alias table (${stats.aliases.length}):`);
  for (const a of stats.aliases) log(`   ${a.from} -> ${a.to}  ${a.entries} of ${a.of}`);
  log(`college agreement on careers with both: stored strings ${pct(stats.agreement.raw, stats.agreement.entries)}, decoded and split ${pct(stats.agreement.beforeAliases, stats.agreement.entries)}, plus aliases ${pct(stats.agreement.afterAliases, stats.agreement.entries)}`);
  log(`colleges_agreed non empty ${players.filter(p => p.colleges_agreed.length).length}, colleges non empty ${players.filter(p => p.colleges.length).length}, groups non empty ${players.filter(p => p.groups.length).length}, best_pick ${players.filter(p => p.best_pick != null).length}`);
  log(`first_round true ${players.filter(p => p.first_round === true).length}, false ${players.filter(p => p.first_round === false).length}, null ${players.filter(p => p.first_round === null).length}; undrafted ${players.filter(p => p.undrafted).length}`);
  log(`heisman: ${JSON.stringify(stats.heisman)}; entries with heisman_year ${players.filter(p => p.heisman_year != null).length} (on careers ${players.filter(p => p.heisman_year != null && p.first_season != null).length}, draft-only ${players.filter(p => p.heisman_year != null && p.id.startsWith('draft:')).length}); standing alone: ${players.filter(p => p.id.startsWith('heisman:')).map(p => `${p.name} ${p.heisman_year}`).join(', ')}`);
  log(`cfb: ${JSON.stringify(stats.cfb)}`);
  log(`namesakes flagged (dup) ${players.filter(p => p.dup).length}; distinct display names ${new Set(players.map(p => p.display_name)).size}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const check = process.argv.includes('--check');
  const src = await pullSources(m => console.log('   ' + m));
  const { players, stats } = buildCollegeKey(src);
  const sources = { careers: src.careers.length, picks: src.picks.length, rosters: src.rosters.length, heisman: src.heisman.length, qb: src.qb.length, rb: src.rb.length };
  printStats(players, stats);
  if (check) {
    const current = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
    const same = current && JSON.stringify(current.columns) === JSON.stringify(COLUMNS) && JSON.stringify(current.rows) === JSON.stringify(toRows(players));
    console.log(same ? 'up to date: the committed file matches the derivation' : 'STALE: the committed file differs from the derivation');
    process.exit(same ? 0 : 1);
  }
  fs.writeFileSync(OUT, renderFile(players, sources, stats));
  console.log(`wrote ${path.relative(ROOT, OUT)} (${fs.statSync(OUT).size} bytes)`);
}

export { printStats };
