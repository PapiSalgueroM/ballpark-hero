/* Round 718: the Career Ladder daily rotation's roster file, read, planned
   and written in one place. scripts/genCareerLadderRoster.mjs appends what
   planAppends returns, and simCareerLadderRotation section 7 fails while
   planAppends returns anything, so the check and the fix cannot drift apart.

   The file is src/data/careerLadderRoster.json, { about, entries }, one entry
   per line: [career_players id, side, since, name], side 'h', 'e' or 'x'. Its
   meaning is RosterEntry in src/lib/careerLadder.ts. It is APPEND ONLY: the
   daily is a pure function of the date and this file, so an edited or deleted
   line rewrites days people have already played. */
import fs from 'node:fs';
import path from 'node:path';

export const ROSTER_PATH = path.join('src', 'data', 'careerLadderRoster.json');
export const ROSTER_ABOUT = 'Career Ladder daily rotation roster. Append only, written by scripts/genCareerLadderRoster.mjs and never edited by hand: the daily is worked out from this file and the date, so changing a line changes days already played. Each entry is [player id, side (h harder, e easier, x out), the ET date it counts from, name]. See RosterEntry in src/lib/careerLadder.ts.';

export function readRoster(root) {
  const file = path.join(root, ROSTER_PATH);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8')).entries;
}

/** One entry per line, so a diff of the file shows exactly the lines appended. */
export function formatRoster(entries) {
  return `{\n  "about": ${JSON.stringify(ROSTER_ABOUT)},\n  "entries": [\n${entries.map(e => `    ${JSON.stringify(e)}`).join(',\n')}\n  ]\n}\n`;
}

/** Each man's standing in the roster: the side of his first in line (his for good), and whether his last line has him in. */
export function rosterState(entries) {
  const state = new Map();
  entries.forEach(([id, side, since, name], index) => {
    const s = state.get(id) ?? { side: '', isIn: false, since: '', index: -1, name };
    if (!s.side && side !== 'x') s.side = side;
    if (since > s.since || (since === s.since && index > s.index)) Object.assign(s, { isIn: side !== 'x', since, index });
    s.name = name;
    state.set(id, s);
  });
  return state;
}

/**
 * The lines the roster needs so it says what the live tables say: every man
 * with at least minStints seasons in, everyone else out. A man keeps the side
 * he first joined on; a man new to the roster takes the side his peak puts
 * him on today. Every line carries `since`.
 */
export function planAppends({ live, entries, since, minStints, splitValue, peakValue }) {
  const state = rosterState(entries);
  const appends = [];
  const seen = new Set();
  for (const p of [...live].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))) {
    seen.add(p.id);
    const s = state.get(p.id);
    const eligible = p.seasons.length >= minStints;
    if (eligible && !s?.isIn) appends.push([p.id, s?.side || (peakValue(p) <= splitValue ? 'h' : 'e'), since, p.name]);
    if (!eligible && s?.isIn) appends.push([p.id, 'x', since, p.name]);
  }
  for (const [id, s] of state) if (!seen.has(id) && s.isIn) appends.push([id, 'x', since, s.name]);
  return appends;
}
