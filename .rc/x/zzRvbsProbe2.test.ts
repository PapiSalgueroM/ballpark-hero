import { it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import * as E from '@/lib/soccerCareerEngine';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { adjustClubsForYear } from '@/lib/careerEras';
import { coachingStartChoices } from '@/lib/soccerCareerCoachingStart';
import { serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import { pending } from '@/test/helpers/managerJobReviewFixtures';

const OUT = process.env.RC_OUT || '/tmp';
const SAVES = '/tmp/rvbs';
const clubs = E.FALLBACK_CLUBS;
function base(shift = 0): CareerState {
  const packet = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const input = structuredClone(packet.saves.find((s: { id: string }) => s.id === 'ere').state) as CareerState;
  input.phase = 'playing'; input.retired = false; input.age = 34;
  input.seasons = input.seasons.map(r => ({ ...r, year: r.year - shift }));
  const s = E.manualRetire(input);
  s.phase = 'retirement_ceremony'; s.postRetirementChoice = null; s.managerState = null;
  s.lifeFlags = { ...(s.lifeFlags ?? {}), coachingBadges: 3 };
  return s;
}

it('L1 hand rows the typed founding table holds out, plus walk saves', () => {
  mkdirSync(SAVES, { recursive: true });
  const lines: string[] = [];
  let walkSave: CareerState | null = null, walkNames = '';
  for (const shift of [21, 16, 11, 6]) {
    const b = base(shift), last = b.seasons[b.seasons.length - 1].year;
    const alive = new Set(adjustClubsForYear(clubs, last + 1).map(c => c.id));
    let hand = 0, sets = 0; const ex = new Map<string, number>();
    for (let k = 0; k < 400; k++) {
      const st = { ...b, playerName: 'Probe ' + k } as CareerState;
      const q = coachingStartChoices(st, clubs);
      const miss = q.filter(x => !alive.has(x.clubId) && !x.clubId.startsWith('cm-'));
      hand += miss.length; if (miss.length) sets++;
      miss.forEach(x => ex.set(x.clubName, (ex.get(x.clubName) ?? 0) + 1));
      if (!walkSave && shift === 16 && miss.length) { walkSave = st; walkNames = q.map(x => x.clubName + (alive.has(x.clubId) ? '' : '(held out)')).join(' | '); }
    }
    lines.push(`L1b lastSeasonYear=${last} firstJobYear=${last + 1} setsWithHandRowHeldOut=${sets}/400 handRowsOffered=${hand} names=${[...ex].map(([n, c]) => n + 'x' + c).join(', ')}`);
  }
  expect(walkSave).not.toBeNull();
  lines.push(`WALK ceremony save choices: ${walkNames}`);
  writeFileSync(`${SAVES}/ceremony.txt`, serializeSoccerCareerSave(walkSave!));
  const p = pending();
  writeFileSync(`${SAVES}/pending.txt`, serializeSoccerCareerSave(p));
  const pend = (p as any).managerJobReview.pending;
  lines.push(`WALK pending save: from=${pend.from.club} t${pend.from.clubTier} to=${pend.to.club} t${pend.to.clubTier}`);
  const ended = E.endManagerCareer(p);
  lines.push(`L4 endWhilePending phase=${ended.phase} eventsWithPending=${ended.events.filter(e => e.includes('Decision pending')).length} rowsWithPending=${ended.managerState!.seasonResults.filter(r => r.result.includes('Decision pending')).length} line="${ended.events.find(e => e.includes('Decision pending'))}"`);
  console.log(lines.join('\n')); writeFileSync(resolve(OUT, 'L1b.txt'), lines.join('\n'));
});
