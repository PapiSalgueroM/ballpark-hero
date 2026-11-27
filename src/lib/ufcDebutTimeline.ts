import { uniqueUfcFighters } from '@/data/ufcFighters';
import { shuffled } from '@/lib/keyedShuffle';

export const TIMELINE_KEY = 'ufc-debut-timeline-v1';
export const TIMELINE_ROUNDS = 5;
export const SCOUT_LIMIT = 2;
export const TIMELINE_GOAL = 70;

export interface DebutCard { name: string; year: number }
interface Placement { slot: number; scouted: boolean }
export interface DebutRun { names: string[]; placements: Placement[]; scouting: boolean; previous: number | null }

function debutCard(name: string): DebutCard | undefined {
  const fighter = uniqueUfcFighters.find(row => row.name === name);
  return fighter && { name: fighter.name, year: fighter.yearsActiveStart };
}

export function newDebutRun(random = Math.random): DebutRun {
  const pool = shuffled(uniqueUfcFighters, random).map(row => ({ name: row.name, year: row.yearsActiveStart }));
  const years = [...new Set(pool.map(card => card.year))].sort((a, b) => a - b);
  // Keep playable years on both sides of the first anchor, even after four placements.
  const middle = years.slice(TIMELINE_ROUNDS + 1, -TIMELINE_ROUNDS - 1);
  const anchor = pool.find(card => middle.includes(card.year))!;
  const chosen = [anchor, pool.find(card => card.year < 2005 && card.year !== anchor.year)!,
    pool.find(card => card.year >= 2015 && card.year !== anchor.year)!];
  for (const card of pool) {
    if (!chosen.some(other => other.year === card.year)) chosen.push(card);
    if (chosen.length === TIMELINE_ROUNDS + 2) break;
  }
  return { names: [anchor.name, ...shuffled(chosen.slice(1), random).map(card => card.name)], placements: [], scouting: false, previous: null };
}

export function debutRound(run: DebutRun, index = run.placements.length) {
  const known = run.names.slice(0, index + 2).map(name => debutCard(name)!).sort((a, b) => a.year - b.year);
  const card = debutCard(run.names[index + 2]);
  const answer = card ? known.filter(other => other.year < card.year).length : -1;
  const gaps = Array.from({ length: known.length + 1 }, (_, slot) => slot)
    .filter(slot => uniqueUfcFighters.some(other => other.yearsActiveStart > (known[slot - 1]?.year ?? -Infinity)
      && other.yearsActiveStart < (known[slot]?.year ?? Infinity)));
  const pivot = gaps[Math.floor((gaps.length - 1) / 2)];
  return { known, card, answer, gaps, pivot };
}

export function debutScore(run: DebutRun) {
  return run.placements.reduce((points, pick, index) => points + (pick.slot === debutRound(run, index).answer ? pick.scouted ? 10 : 20 : 0), 0);
}

export function scoutsLeft(run: DebutRun) {
  return SCOUT_LIMIT - run.placements.filter(pick => pick.scouted).length - Number(run.scouting);
}

export function scoutDebut(run: DebutRun): DebutRun {
  if (run.scouting || scoutsLeft(run) === 0 || run.placements.length === TIMELINE_ROUNDS || debutRound(run).gaps.length < 2) return run;
  return { ...run, scouting: true };
}

export function canPlaceDebut(run: DebutRun, slot: number) {
  const { card, answer, gaps, pivot } = debutRound(run);
  return !!card && gaps.includes(slot)
    && (!run.scouting || (answer <= pivot) === (slot <= pivot));
}

export function placeDebut(run: DebutRun, slot: number): DebutRun {
  if (!canPlaceDebut(run, slot)) return run;
  return { ...run, placements: [...run.placements, { slot, scouted: run.scouting }], scouting: false };
}

export function replayDebuts(run: DebutRun): DebutRun {
  if (run.placements.length !== TIMELINE_ROUNDS) return run;
  return { ...run, placements: [], scouting: false, previous: debutScore(run) };
}

export function gapLabel(known: DebutCard[], slot: number) {
  if (!slot) return 'Before ' + known[0].year;
  if (slot === known.length) return 'After ' + known[slot - 1].year;
  return 'Between ' + known[slot - 1].year + ' and ' + known[slot].year;
}

export function readDebutRun(raw: string | null): DebutRun | null {
  if (!raw) return null;
  try {
    const saved: DebutRun = JSON.parse(raw);
    if (!Array.isArray(saved.names) || saved.names.length !== TIMELINE_ROUNDS + 2 || saved.names.some(name => !debutCard(name))
      || new Set(saved.names.map(name => debutCard(name)!.year)).size !== saved.names.length || !Array.isArray(saved.placements)
      || saved.placements.length > TIMELINE_ROUNDS || typeof saved.scouting !== 'boolean'
      || (saved.previous !== null && (!Number.isInteger(saved.previous) || saved.previous < 0 || saved.previous > 100 || saved.previous % 10))) return null;
    let run: DebutRun = { names: saved.names, placements: [], scouting: false, previous: saved.previous };
    for (const pick of saved.placements) {
      if (typeof pick.scouted !== 'boolean') return null;
      if (pick.scouted) run = scoutDebut(run);
      if (run.scouting !== pick.scouted || !canPlaceDebut(run, pick.slot)) return null;
      run = placeDebut(run, pick.slot);
    }
    if (saved.scouting) run = scoutDebut(run);
    return run.scouting === saved.scouting ? run : null;
  } catch { return null; }
}
