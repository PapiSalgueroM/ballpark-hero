import { COLLEGE_LABELS, CRITERIA_LABELS, judgeCollegeCell, type CollegeGridData, type CollegeJudgeEntry } from '@/lib/collegeGrid';
import { normalizeGridName, pickN } from '@/lib/gridEngine';

export type ScoutFocus = 'draft' | 'position';
export interface ScoutRun {
  board: string;
  focus: ScoutFocus;
  school: string;
  labels: string[];
  names: string[];
  slots: number[];
  tries: number[][];
  file: number | null;
}

const assignments = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const positions = CRITERIA_LABELS.filter(c => c.kind === 'position');

function fits(row: CollegeJudgeEntry, school: string, labels: string[]) {
  const verdicts = labels.map(label => judgeCollegeCell(row, school, label));
  if (verdicts.includes('unknown')) return 0;
  return verdicts.reduce((mask, verdict, i) => verdict === 'yes' ? mask | (1 << i) : mask, 0);
}

function onlySolution(masks: number[]) {
  const fitsAll = assignments.filter(slots => slots.every((name, i) => (masks[name] & (1 << i)) !== 0));
  return fitsAll.length === 1 ? fitsAll[0] : null;
}

function available(row: CollegeJudgeEntry, data: CollegeGridData, dailySchools: string[]) {
  return !row.identityOpen && !row.colleges.some(s => dailySchools.includes(s)) &&
    data.byNormalizedName.get(normalizeGridName(row.name))?.length === 1;
}

export function dealScoutRun(data: CollegeGridData, board: string, dailySchools: string[], focus: ScoutFocus, rng = Math.random): ScoutRun | null {
  const schools = COLLEGE_LABELS.map(s => s.label).filter(s => !dailySchools.includes(s));
  for (const school of pickN(schools, schools.length, rng)) {
    const rows = data.players.filter(p => p.colleges.includes(school) && available(p, data, dailySchools));
    for (const primary of pickN(positions, positions.length, rng)) {
      const others = positions.filter(p => p !== primary);
      const labels = focus === 'draft' ? [primary.label, 'First Round Pick', 'Top 10 Pick']
        : [primary.label, pickN(others, 1, rng)[0].label, 'First Round Pick'];
      const groups = new Map<number, string[]>();
      for (const row of rows) {
        const mask = fits(row, school, labels);
        if (!mask) continue;
        const group = groups.get(mask) ?? [];
        // The shipped key orders names by career prominence. Sample the front of each eligible group.
        if (group.length < 12) group.push(row.name);
        groups.set(mask, group);
      }
      const masks = [...groups.keys()];
      const deals: number[][] = [];
      for (let a = 0; a < masks.length; a++) {
        for (let b = a + 1; b < masks.length; b++) {
          for (const c of masks.slice(b + 1)) {
            const trio = [masks[a], masks[b], c];
            if (trio.some(m => (m & (m - 1)) !== 0) && onlySolution(trio)) deals.push(trio);
          }
        }
      }
      if (!deals.length) continue;
      const chosen = deals[Math.floor(rng() * deals.length)].map(mask => {
        const group = groups.get(mask)!;
        return group[Math.floor(rng() * group.length)];
      });
      return { board, focus, school, labels: pickN(labels, 3, rng), names: pickN(chosen, 3, rng),
        slots: [-1, -1, -1], tries: [], file: null };
    }
  }
  return null;
}

export function reviewScoutRun(run: ScoutRun, data: CollegeGridData, dailySchools: string[]) {
  if (dailySchools.includes(run.school)) return null;
  const players: CollegeJudgeEntry[] = [];
  for (const name of run.names) {
    const row = data.byNormalizedName.get(normalizeGridName(name))?.[0];
    if (!row || !row.colleges.includes(run.school) || !available(row, data, dailySchools)) return null;
    players.push(row);
  }
  const masks = players.map(p => fits(p, run.school, run.labels));
  const solution = onlySolution(masks);
  if (!solution) return null;
  const correct = (slots: number[]) => slots.filter((name, i) => name === solution[i]).length;
  const legal = (slots: number[]) => slots.filter((name, i) => (masks[name] & (1 << i)) !== 0).length;
  const won = run.tries.some(slots => correct(slots) === 3);
  return { players, solution, correct, legal, won, finished: won || run.tries.length === 2 };
}

export function scoutFact(player: CollegeJudgeEntry) {
  const position = positions.filter(p => player.groups.has(p.group!)).map(p => p.label).join(' / ');
  const draft = [player.bestPick !== null ? 'Pick No. ' + player.bestPick : '', player.firstRound === true ? 'first round' : '',
    player.undrafted ? 'undrafted' : ''].filter(Boolean).join(', ');
  return [position, draft].filter(Boolean).join(' · ');
}

export function placeScout(slots: number[], role: number, name: number) {
  const next = [...slots];
  const previous = next.indexOf(name);
  if (name !== -1 && previous !== -1) next[previous] = next[role];
  next[role] = name;
  return next;
}

export const SCOUT_KEY = 'dukb-college-grid-scout-v1';
export function readScoutRun(raw: string | null, board: string): ScoutRun | null {
  try {
    const v = JSON.parse(raw ?? 'null');
    const uniq = (a: unknown): a is unknown[] => Array.isArray(a) && a.length === 3 && new Set(a).size === 3;
    const pick = (n: unknown): boolean => Number.isInteger(n) && Number(n) >= 0 && Number(n) < 3;
    if (!v || v.board !== board || !['draft', 'position'].includes(v.focus) || !COLLEGE_LABELS.some(s => s.label === v.school) ||
      !uniq(v.labels) || !v.labels.every((label: unknown) => CRITERIA_LABELS.some(c => c.label === label)) ||
      !uniq(v.names) || !v.names.every((n: unknown) => typeof n === 'string' && n.trim()) ||
      !Array.isArray(v.slots) || v.slots.length !== 3 || !v.slots.every((n: unknown) => n === -1 || pick(n)) ||
      new Set(v.slots.filter(pick)).size !== v.slots.filter(pick).length ||
      !Array.isArray(v.tries) || v.tries.length > 2 || !v.tries.every((s: unknown) => uniq(s) && s.every(pick)) ||
      !(v.file === null || pick(v.file))) return null;
    return v;
  } catch { return null; }
}
