/* College Grid boards, dealt from the answer key and proven cell by cell.

   Round 611. The old 75 boards were typed by hand around labels no table can
   settle (conferences, Pro Bowler, National Champion and more), so most cells
   could only be judged by an AI validator that runs dry for most of the day.
   Applied to those boards, the Round 611 vocabulary leaves 10 of 75 intact.
   So every board is regenerated here from scripts/data/collegeGridPlayers.json,
   and every verdict comes from judgeCollegeCell in src/lib/collegeGrid.ts
   (bundled with esbuild, never re-implemented).

   THE DEAL
     Seed SEED below, through FNV-1a and mulberry32. For each board, in order:
     the 13 criteria are shuffled and then ordered by how often they have been
     used so far (the shuffle breaks ties), and criteria triples are tried in
     that order; for each triple, the schools that clear every cell with it are
     shuffled and ordered by use the same way, and school triples are tried in
     that order. The first pair of triples that makes a legal, new board is
     dealt, with its rows and columns shown in shuffled order.

   A LEGAL BOARD
     3 rows from the 44 schools and 3 columns from the 13 criteria of
     COLLEGE_LABELS and CRITERIA_LABELS. At most one of Heisman Winner, Top 5
     Pick and 1st Overall Pick. No board repeats another's rows and columns.
     Every cell holds at least MIN_TWO_SOURCE two-source yes answers, counted
     as distinct folded names, and at least one of them was a first round pick
     or played FAME_SEASONS or more NFL seasons. The nine cells can be filled
     by nine different people from those answers (a matching), so a board can
     always be won.

   TWO-SOURCE YES. judgeCollegeCell says yes, the school is in colleges_agreed
   (the draft college held by a second source), and the column's fact is held
   twice, read from the key file's proof block:
     a position group   in both draft_groups and roster_groups
     First Round Pick   the entry has exactly one draft row and roster_pick
                        equals its pick (the key file does not carry the round
                        boundaries, so an entry with two draft rows cannot show
                        which row made it a first rounder, and is not counted)
     Top 10, Top 5, 1st Overall Pick
                        roster_pick equals best_pick
     Heisman Winner     a draft row, and the school is in heisman_schools

   Output: src/data/collegeGridPuzzles.ts (the GridPuzzle[] the page reads).

   Run: node scripts/genCollegeGridBoards.mjs
        node scripts/genCollegeGridBoards.mjs --check   (derive in memory, compare, write nothing; exit 1 when the file differs)
*/
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readKeyFile } from './genCollegeGridData.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const KEY_FILE = path.join(ROOT, 'scripts', 'data', 'collegeGridPlayers.json');
export const OUT = path.join(ROOT, 'src', 'data', 'collegeGridPuzzles.ts');
export const SEED = 'cg611';
export const ID_PREFIX = 'cg611';
export const BOARD_COUNT = 75;
export const MIN_TWO_SOURCE = 3;
export const FAME_SEASONS = 5;
export const RARE = ['Heisman Winner', 'Top 5 Pick', '1st Overall Pick'];

/** The pure judge, bundled from the page's own module. */
export async function loadJudge() {
  const entry = path.join(os.tmpdir(), 'collegeGridBoardsEntry.mjs');
  const bundle = path.join(os.tmpdir(), 'collegeGridBoards.bundle.mjs');
  /* The supabase client reads localStorage when the module loads, and a static
     import is hoisted above the stub, so the lib is imported dynamically. */
  fs.writeFileSync(entry, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lib = await import('${path.join(ROOT, 'src', 'lib', 'collegeGrid.ts').replaceAll('\\', '/')}');
`);
  execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${entry}" --bundle --format=esm --platform=node --outfile="${bundle}" --log-level=error`, { stdio: 'inherit' });
  return (await import(pathToFileURL(bundle).href)).lib;
}

function hashString(s) {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** True when the column's fact is held by two sources for this entry (the judge has already said yes). */
export function columnTwoSource(entry, proof, school, crit) {
  switch (crit.kind) {
    case 'position':
      return proof.draft_groups.includes(crit.group) && proof.roster_groups.includes(crit.group);
    case 'firstRound':
      return proof.draft_rows.length === 1 && proof.roster_pick != null && proof.roster_pick === proof.draft_rows[0][1];
    case 'topPick':
      return proof.roster_pick != null && proof.roster_pick === entry.bestPick;
    case 'heisman':
      return proof.draft_rows.length > 0 && proof.heisman_schools.includes(school);
    default:
      return false;
  }
}

/** Every cell's answers: all yes entries, and the two-source yes entries. */
export function cellAnswers(lib, entries, proofById) {
  const cells = new Map();
  for (const s of lib.COLLEGE_LABELS) {
    for (const c of lib.CRITERIA_LABELS) cells.set(`${s.label}|${c.label}`, { school: s.label, crit: c.label, yes: [], two: [] });
  }
  const bySchool = new Map(lib.COLLEGE_LABELS.map(s => [s.label, []]));
  for (const e of entries) for (const col of e.colleges) bySchool.get(col)?.push(e);
  for (const s of lib.COLLEGE_LABELS) {
    for (const e of bySchool.get(s.label)) {
      const proof = proofById.get(e.id);
      for (const c of lib.CRITERIA_LABELS) {
        if (lib.judgeCollegeCell(e, s.label, c.label) !== 'yes') continue;
        const cell = cells.get(`${s.label}|${c.label}`);
        cell.yes.push(e);
        if (e.collegesAgreed.includes(s.label) && columnTwoSource(e, proof, s.label, c)) cell.two.push(e);
      }
    }
  }
  for (const cell of cells.values()) {
    cell.people = new Set(cell.two.map(e => e.nameNorm));
    cell.famous = cell.two.some(e => e.firstRound === true || e.seasons >= FAME_SEASONS);
    cell.ok = cell.people.size >= MIN_TWO_SOURCE && cell.famous;
  }
  return cells;
}

/** Nine cells to nine different people (folded names), by augmenting paths. */
export function canFillAll(cellList) {
  const owner = new Map();
  const tryCell = (i, seen) => {
    for (const person of cellList[i].people) {
      if (seen.has(person)) continue;
      seen.add(person);
      if (!owner.has(person) || tryCell(owner.get(person), seen)) {
        owner.set(person, i);
        return true;
      }
    }
    return false;
  };
  return cellList.every((_, i) => tryCell(i, new Set()));
}

export const boardKey = (rows, cols) => `${rows.slice().sort().join('|')} X ${cols.slice().sort().join('|')}`;

export function dealBoards(lib, cells) {
  const rng = mulberry32(hashString(SEED));
  const use = new Map([...lib.COLLEGE_LABELS, ...lib.CRITERIA_LABELS].map(l => [l.label, 0]));
  const byUse = (list) => {
    const order = shuffle(list, rng);
    const rank = new Map(order.map((l, i) => [l.label, i]));
    return order.sort((a, b) => use.get(a.label) - use.get(b.label) || rank.get(a.label) - rank.get(b.label));
  };
  const seen = new Set();
  const boards = [];
  while (boards.length < BOARD_COUNT) {
    const schoolsOrder = byUse(lib.COLLEGE_LABELS).map(s => s.label);
    const critsOrder = byUse(lib.CRITERIA_LABELS).map(c => c.label);
    let dealt = null;
    search:
    for (const anchor of schoolsOrder) {
      const crits = critsOrder.filter(c => cells.get(`${anchor}|${c}`).ok);
      for (let i = 0; i < crits.length; i += 1) {
        for (let j = i + 1; j < crits.length; j += 1) {
          for (let k = j + 1; k < crits.length; k += 1) {
            const cols = [crits[i], crits[j], crits[k]];
            if (cols.filter(c => RARE.includes(c)).length > 1) continue;
            const others = schoolsOrder.filter(s => s !== anchor && cols.every(c => cells.get(`${s}|${c}`).ok));
            for (let a = 0; a < others.length; a += 1) {
              for (let b = a + 1; b < others.length; b += 1) {
                const rows = [anchor, others[a], others[b]];
                if (seen.has(boardKey(rows, cols))) continue;
                if (!canFillAll(rows.flatMap(r => cols.map(c => cells.get(`${r}|${c}`))))) continue;
                dealt = { rows, cols };
                break search;
              }
            }
          }
        }
      }
    }
    if (!dealt) throw new Error(`no legal new board left after ${boards.length} boards`);
    seen.add(boardKey(dealt.rows, dealt.cols));
    for (const label of [...dealt.rows, ...dealt.cols]) use.set(label, use.get(label) + 1);
    boards.push({
      id: `${ID_PREFIX}-${String(boards.length + 1).padStart(3, '0')}`,
      rows: shuffle(dealt.rows, rng),
      cols: shuffle(dealt.cols, rng),
    });
  }
  return { boards, use };
}

const q = s => `'${String(s).replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;

export function renderBoards(lib, boards) {
  const typeOf = label => lib.labelOf(label).type;
  const attr = label => `      { label: ${q(label)}, type: ${q(typeOf(label))} },`;
  const lines = [
    '/* College Grid boards. GENERATED, do not edit by hand.',
    '',
    `   Command: node scripts/genCollegeGridBoards.mjs (seed ${SEED})`,
    '   Check:   node scripts/genCollegeGridBoards.mjs --check',
    '',
    `   ${boards.length} boards dealt from scripts/data/collegeGridPlayers.json and judged by`,
    '   judgeCollegeCell in src/lib/collegeGrid.ts. Every cell holds at least',
    `   ${MIN_TWO_SOURCE} two-source yes answers, one of them a first round pick or a player of`,
    `   ${FAME_SEASONS} or more NFL seasons, and the nine cells can be filled by nine`,
    '   different players. The rules are in the generator\'s header. */',
    "import type { GridPuzzle } from '@/types/footballGrid';",
    '',
    'export const collegeGridPuzzles: GridPuzzle[] = [',
  ];
  for (const b of boards) {
    lines.push('  {', `    id: ${q(b.id)},`, '    rows: [', ...b.rows.map(attr), '    ],', '    cols: [', ...b.cols.map(attr), '    ],', '  },');
  }
  lines.push('];', '');
  return lines.join('\n');
}

const median = list => {
  const s = list.slice().sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

export async function derive() {
  const lib = await loadJudge();
  const raws = readKeyFile(JSON.parse(fs.readFileSync(KEY_FILE, 'utf8')));
  const proofById = new Map(raws.map(r => [r.id, r.proof]));
  const entries = lib.indexCollegeEntries(raws);
  if (entries.length !== raws.length) throw new Error(`the judge indexed ${entries.length} of ${raws.length} key rows`);
  const cells = cellAnswers(lib, entries, proofById);
  const { boards, use } = dealBoards(lib, cells);
  return { lib, entries, cells, boards, use, text: renderBoards(lib, boards) };
}

export function report({ lib, cells, boards, use }, log = console.log) {
  const okCells = [...cells.values()].filter(c => c.ok).length;
  log(`cells that clear the floor: ${okCells} of ${cells.size} (44 schools x 13 criteria)`);
  for (const c of lib.CRITERIA_LABELS) {
    const list = lib.COLLEGE_LABELS.filter(s => cells.get(`${s.label}|${c.label}`).ok);
    log(`   ${c.label.padEnd(18)} ${String(list.length).padStart(2)} schools${list.length <= 10 ? `: ${list.map(s => s.label).join(', ')}` : ''}`);
  }
  const dealtCells = boards.flatMap(b => b.rows.flatMap(r => b.cols.map(c => cells.get(`${r}|${c}`))));
  const two = dealtCells.map(c => c.people.size);
  const yes = dealtCells.map(c => new Set(c.yes.map(e => e.nameNorm)).size);
  log(`dealt cells ${dealtCells.length}: two-source answers min ${Math.min(...two)}, median ${median(two)}, max ${Math.max(...two)}; all yes answers min ${Math.min(...yes)}, median ${median(yes)}, max ${Math.max(...yes)}`);
  const hist = new Map();
  for (const n of two) {
    const band = n < 5 ? String(n) : n < 10 ? '5-9' : n < 25 ? '10-24' : n < 50 ? '25-49' : '50+';
    hist.set(band, (hist.get(band) ?? 0) + 1);
  }
  log(`two-source answers per dealt cell: ${['3', '4', '5-9', '10-24', '25-49', '50+'].map(b => `${b}: ${hist.get(b) ?? 0}`).join(', ')}`);
  const thinnest = dealtCells.filter(c => c.people.size === Math.min(...two)).slice(0, 8).map(c => `${c.school} x ${c.crit}`);
  log(`thinnest dealt cells: ${thinnest.join('; ')}`);
  log('label use across the boards:');
  log(`   criteria: ${lib.CRITERIA_LABELS.map(l => `${l.label} ${use.get(l.label)}`).join(', ')}`);
  log(`   schools:  ${lib.COLLEGE_LABELS.map(l => `${l.label} ${use.get(l.label)}`).join(', ')}`);
  const rare = boards.map(b => b.cols.filter(c => RARE.includes(c)).length);
  log(`boards with a rare column: ${rare.filter(n => n === 1).length}, with two or more: ${rare.filter(n => n > 1).length}; distinct boards ${new Set(boards.map(b => boardKey(b.rows, b.cols))).size} of ${boards.length}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const check = process.argv.includes('--check');
  const result = await derive();
  report(result);
  if (check) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').split('\r\n').join('\n') : null;
    const same = current === result.text;
    console.log(same ? 'up to date: src/data/collegeGridPuzzles.ts matches the derivation' : 'STALE: src/data/collegeGridPuzzles.ts differs from the derivation');
    process.exit(same ? 0 : 1);
  }
  fs.writeFileSync(OUT, result.text);
  console.log(`wrote ${path.relative(ROOT, OUT)} (${result.boards.length} boards)`);
}
