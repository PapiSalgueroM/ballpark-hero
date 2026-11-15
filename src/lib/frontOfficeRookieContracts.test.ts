import { expect, it } from 'vitest';
import { initLeague } from '@/lib/frontOffice';
import { nflAwayHost } from '@/lib/nflGmCareer';
import { openNflDesk } from '@/lib/nflGmDesk';

it('carries every rookie into his first year during an actual season-away draft and summer', () => {
  let seed = 37;
  const rng = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const league = initLeague(rng);
  const desk = openNflDesk(league, 'SEA');
  const away = nflAwayHost('SEA');
  const veteran = league.teams.SEA.players.find(player => player.age < 28 && player.years >= 2)!;
  const active = { age: veteran.age, years: veteran.years, salary: veteran.salary };
  const ids = new Set(Object.values(league.teams).flatMap(team => team.players.map(p => p.id)));
  away.awayDraft(league, rng, desk);
  const signings = Object.values(league.teams).flatMap(team => team.players.filter(p => !ids.has(p.id))
    .map(p => ({ team: team.abbr, id: p.id, age: p.age, salary: p.salary })));
  expect(signings).toHaveLength(18);
  const nextYear = league.season + 1;
  away.awaySummer(league, rng, desk);
  expect(league.season).toBe(nextYear);
  for (const { team, id, age, salary } of signings) {
    expect(league.teams[team].players.find(p => p.id === id)).toMatchObject({ age, salary, years: 4, rookieSeason: nextYear });
  }
  expect(league.teams.SEA.players.find(p => p.id === veteran.id)).toMatchObject({
    age: active.age + 1, years: active.years - 1, salary: active.salary,
  });
});
