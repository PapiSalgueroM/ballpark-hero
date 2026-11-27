import { shuffledRange } from './dateUtils';
import { HELD_LINEUP_IDS, LINEUPS, type Lineup } from './missingXi';
import { closeRecallSheet, newRecallSheet, recallStarter, unassistedCount, type RecallSheet } from './missingXiRecall';
import { normalizeName } from './playerSearch';

export type ScoutMove =
  | { type: 'name'; name: string }
  | { type: 'report'; slot: number; names: string[] }
  | { type: 'pick'; name: string }
  | { type: 'finish' };

type Report = { slot: number; names: string[]; pick: string | null };
export type ScoutRound = { sheet: RecallSheet; reports: Report[] };

export function scoutBalance(round: ScoutRound) {
  return 1 + Math.min(2, Math.floor(unassistedCount(round.sheet) / 3)) - round.reports.length;
}

function archivePlayers(lineup: Lineup, slot: number) {
  const own = newRecallSheet(lineup);
  const ownNames = new Set(own.starters.flatMap(p => [p.name, p.surname, ...p.aliases]).map(normalizeName));
  const year = Number(lineup.matchDate.slice(0, 4));
  const yearGap = (other: Lineup) => Math.abs(Number(other.matchDate.slice(0, 4)) - year);
  const alternatives = new Map<string, string>();
  const line: Partial<Record<string, string[]>> = {
    DF: ['CB', 'RB', 'LB', 'RWB', 'LWB'], MF: ['CDM', 'CM', 'CAM', 'LM', 'RM'], FW: ['LW', 'RW', 'ST', 'CF'],
  };
  const position = lineup.slots[slot].position;
  for (const other of LINEUPS.filter(l => l.id !== lineup.id && !HELD_LINEUP_IDS.has(l.id)).sort((a, b) => yearGap(a) - yearGap(b))) {
    for (const p of other.slots) {
      if (p.position !== position && !line[position]?.includes(p.position)) continue;
      const key = normalizeName(p.name);
      if (!ownNames.has(key) && !alternatives.has(key)) alternatives.set(key, p.name);
    }
  }
  return alternatives;
}

export function makeScoutReport(lineup: Lineup, slot: number): Extract<ScoutMove, {type: 'report'}> | null {
  const pool = [...archivePlayers(lineup, slot).values()].slice(0, 12);
  if (pool.length < 2) return null;
  const seed = lineup.id + ':' + slot;
  const [a, b] = shuffledRange(pool.length, seed);
  const names = [lineup.slots[slot].name, pool[a], pool[b]];
  return { type: 'report', slot, names: shuffledRange(3, seed + ':order').map(i => names[i]) };
}

export function scoutMove(lineup: Lineup, round: ScoutRound, move: ScoutMove): {round: ScoutRound; message: string} {
  const { sheet, reports } = round;
  const reject = (message: string) => ({ round, message });
  if (sheet.finished || !move) return reject('This team sheet is closed.');
  const active = reports.find(report => report.pick === null);
  let next = sheet, updated = reports, message = '';
  if (move.type === 'report') {
    const { slot, names } = move;
    if (active || scoutBalance(round) < 1 || !Number.isInteger(slot) || !lineup.slots[slot]
      || sheet.found.includes(slot) || sheet.hinted.includes(slot)) return reject('A report is unavailable for this shirt.');
    if (!Array.isArray(names) || names.length !== 3 || !names.every(n => typeof n === 'string')
      || new Set(names.map(normalizeName)).size !== 3 || !names.includes(lineup.slots[slot].name)) return reject('Invalid shortlist.');
    const pool = archivePlayers(lineup, slot);
    if (!names.every(n => n === lineup.slots[slot].name || pool.has(normalizeName(n)))) return reject('Invalid shortlist.');
    updated = [...reports, { slot, names, pick: null }];
    next = { ...sheet, hinted: [...sheet.hinted, slot] };
    message = 'Report open. Pick the starter.';
  } else if (move.type === 'pick') {
    if (!active || !active.names.includes(move.name)) return reject('That player is outside this report.');
    updated = reports.map(r => r === active ? { ...r, pick: move.name } : r);
    if (move.name === lineup.slots[active.slot].name) {
      next = recallStarter(sheet, move.name).sheet;
      message = move.name + ' started. Shirt filled with a report.';
    } else message = move.name + ' did not start for this side. This shirt is locked.';
  } else if (move.type === 'name' && typeof move.name === 'string' && move.name.length <= 100) {
    if (active) return reject('Make the pick on your open report first.');
    const guess = recallStarter(sheet, move.name);
    if (guess.sheet === sheet) return reject(guess.message);
    if (sheet.hinted.includes(guess.sheet.found.at(-1)!)) return reject('That shirt is locked for this attempt.');
    next = guess.sheet;
    message = guess.message;
  } else if (move.type === 'finish') {
    next = closeRecallSheet(sheet);
    message = 'Final scouting sheet.';
  } else return reject('Invalid move.');
  const locks = updated.filter(r => r.pick !== null && r.pick !== lineup.slots[r.slot].name).length;
  if (!next.finished && next.found.length + locks === 11) next = closeRecallSheet(next);
  return { round: { sheet: next, reports: updated }, message };
}

export function restoreScouting(lineup: Lineup, raw: string | null) {
  const empty: ScoutRound = { sheet: newRecallSheet(lineup), reports: [] };
  let round = empty;
  try {
    const moves: ScoutMove[] = JSON.parse(raw ?? '[]');
    if (!Array.isArray(moves) || moves.length > 18) throw Error();
    for (const move of moves) {
      const next = scoutMove(lineup, round, move).round;
      if (next === round) throw Error();
      round = next;
    }
    return { round, moves };
  } catch { return { round: empty, moves: [] as ScoutMove[] }; }
}
