/** Round 532: real shipped cards and 32 fixed seeds per battle scenario.
 * The original-roster and unknown-card digests were captured before the fix.
 * Only the backend boundary is mocked; engine, roster data and resolver are real.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { afterEach, describe, it, vi } from 'vitest';
import { NFL_TEAMS, TEAM_MAP, INITIAL_TERRITORIES, CONQUEST_FREE_AGENCY_POOL } from '@/data/conquestData';
import { FREE_AGENTS, TEAM_LEGENDS } from '@/data/conquestPowerups';
import { simulateDetailedBattle, BattleSimulation, TeamStatLine } from '@/lib/conquestBattle';
import { getNflRosterPlayer } from '@/lib/conquestRosterNfl';

const boundary = vi.hoisted(() => {
  const calls: string[] = [];
  const deny = (name: string) => { calls.push(name); throw new Error(`Forbidden roster-test boundary: ${name}`); };
  vi.stubGlobal('fetch', () => deny('fetch'));
  vi.stubGlobal('XMLHttpRequest', class { constructor() { deny('xhr'); } });
  vi.stubGlobal('WebSocket', class { constructor() { deny('socket'); } });
  for (const method of ['setItem', 'removeItem', 'clear'] as const) vi.spyOn(Storage.prototype, method).mockImplementation(() => deny('storage'));
  return { calls, deny };
});
vi.mock('@/integrations/supabase/client', () => ({ supabase: new Proxy({}, { get() { return boundary.deny('backend'); } }) }));
afterEach(() => { check(boundary.calls.length === 0, 'BOUNDARY: no transport storage or backend access'); });

function check(value: unknown, message: string) { assert.ok(value, message); }
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const rosters = () => Object.fromEntries(NFL_TEAMS.map(team => [team.id, team.players.map(player => player.name)]));
function seeded(seed: number) { return () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
}; }
function run(seed: number, attacker: string, defender: string, current: Record<string, string[]>, territories = INITIAL_TERRITORIES) {
  const original = Math.random; Math.random = seeded(seed);
  try { return simulateDetailedBattle(attacker, defender, territories, current, null, null); }
  finally { Math.random = original; }
}
function participants(result: BattleSimulation, attacker: string, current: Record<string, string[]>) {
  for (const [stats, team] of [[result.boxScore.attStats, attacker], [result.boxScore.defStats, 'KC']] as const) {
    for (const key of ['passingQb', 'rushingName', 'receivingName', 'defenseName'] as const) {
      check(current[team].includes(stats[key]), 'PARTICIPANTS: box scores name only current battle rosters');
    }
  }
  const present = new Set([...current[attacker], ...current.KC]);
  const names = new Set([...NFL_TEAMS.flatMap(team => team.players), ...FREE_AGENTS, ...CONQUEST_FREE_AGENCY_POOL, ...Object.values(TEAM_LEGENDS)].map(player => player.name));
  for (const play of result.plays) for (const name of names) if (play.description.includes(name)) {
    check(present.has(name), 'PARTICIPANTS: visible plays name only current battle rosters');
  }
}
function acquired(name: string, removedPositions: string[], teamId = 'BUF') {
  const current = rosters();
  for (const id of Object.keys(current)) current[id] = current[id].filter(player => player !== name);
  current[teamId] = current[teamId].filter(player => !removedPositions.includes(TEAM_MAP.get(teamId)!.players.find(card => card.name === player)!.position));
  current[teamId].push(name);
  return current;
}
function role(name: string, removed: string[], key: keyof TeamStatLine, message: string, teamId = 'BUF') {
  const current = acquired(name, removed, teamId), results: BattleSimulation[] = [];
  for (let seed = 1; seed <= 32; seed++) results.push(run(seed, teamId, 'KC', current));
  check(results.every(result => result.boxScore.attStats[key] === name), message);
  check(results.some(result => result.plays.some(play => play.description.includes(name))), `PLAYS: ${name} participates in real visible plays`);
  results.forEach(result => participants(result, teamId, current));
  console.log(`${name}: ${results.length}/32 role selections; ${results.flatMap(result => result.plays).filter(play => play.description.includes(name)).length} visible plays`);
}

describe('NFL acquired roster cards', () => {
  it('preserves every original-roster fixed-seed battle output', () => {
    const current = rosters();
    const results = NFL_TEAMS.map((team, index) => run(index + 1, team.id, NFL_TEAMS[(index + 1) % 32].id, current));
    check(results.length === 32 && digest(results) === '10bb2817b31e2fb8c187724bd6aca41ea55055de9962a8fc49a0a43c00787d3c', 'ORIGINAL: all 32 pre-fix original-roster outcomes are unchanged');
  });

  it('keeps an acquired defender in the real defense and play selections', () => {
    const original = rosters();
    const current = { ...original, CHI: original.CHI.filter(name => name !== 'Montez Sweat'), BUF: [...original.BUF.filter(name => name !== 'Taylor Rapp'), 'Montez Sweat'] };
    const territories = Object.fromEntries(Object.entries(INITIAL_TERRITORIES).map(([state, owner]) => [state, owner === 'CHI' ? 'GB' : owner]));
    const own = Array.from({ length: 32 }, (_, index) => run(index + 1, 'CHI', 'KC', original));
    const signed = Array.from({ length: 32 }, (_, index) => run(index + 1, 'BUF', 'KC', current, territories));
    check(own.every(result => result.boxScore.attStats.defenseName === 'Montez Sweat') && signed.every(result => result.boxScore.attStats.defenseName === 'Montez Sweat'), 'DEFENDER: the acquired 89 OVR defender retains all 32 defensive role selections');
    const plays = signed.flatMap(result => result.plays).filter(play => play.description.includes('Montez Sweat')).length;
    check(plays > 0, 'DEFENDER PLAYS: the acquired defender appears in actual visible plays');
    signed.forEach(result => participants(result, 'BUF', current));
    console.log(`Montez Sweat: original 32/32, acquired 32/32 defensive selections; ${plays} visible plays`);
  });

  it('uses the real position of an acquired original-team quarterback', () => {
    role('Lamar Jackson', ['QB'], 'passingQb', 'QUARTERBACK: an acquired quarterback fills the passing role in all 32 battles');
  });

  it('uses the real position of an acquired original-team receiver', () => {
    role('Stefon Diggs', ['WR'], 'receivingName', 'RECEIVER: an acquired receiver fills the receiving role in all 32 battles');
  });

  it('uses power-pool running backs and tight ends in real offensive roles', () => {
    role('Adrian Peterson', ['RB'], 'rushingName', 'RUNNING BACK: a power-pool signing fills the rushing role in all 32 battles');
    role('Vernon Davis', ['WR', 'TE'], 'receivingName', 'TIGHT END: a power-pool signing fills the receiving role in all 32 battles');
  });

  it('uses a curated signing in the real passing role', () => {
    role('Jimmy Garoppolo', ['QB'], 'passingQb', 'CURATED: a curated signing fills the passing role in all 32 battles');
  });

  it('keeps a transferred franchise legend in the real defensive role', () => {
    role('Bruce Smith', [], 'defenseName', 'LEGEND: a transferred franchise legend fills the defensive role in all 32 battles', 'CHI');
    const card = getNflRosterPlayer('Bruce Smith', 'CHI');
    check(card?.position === 'DE' && card.overall === 99 && card.keyStat === 'Legend', 'LEGEND CARD: transferred franchise legends keep their 99 OVR card');
  });

  it('prefers an original team card over a conflicting free-agent card', () => {
    const own = getNflRosterPlayer('Stefon Diggs', 'NE'), acquiredCard = getNflRosterPlayer('Stefon Diggs', 'BUF');
    const shipped = TEAM_MAP.get('NE')!.players.find(player => player.name === 'Stefon Diggs');
    check(own === shipped && own?.overall === 86 && acquiredCard === shipped, 'ORIGINAL PRIORITY: original Diggs 86 wins over the conflicting free-agent 88');
  });

  it('retains recipient-specific franchise legend and free-agent priorities', () => {
    check(getNflRosterPlayer('Adrian Peterson', 'MIN')?.overall === 99 && getNflRosterPlayer('Marshawn Lynch', 'SEA')?.overall === 99,
      'OWN LEGEND: Peterson and Lynch use 99 OVR for their own franchises');
    const peterson = getNflRosterPlayer('Adrian Peterson', 'BUF'), lynch = getNflRosterPlayer('Marshawn Lynch', 'BUF');
    check(peterson?.overall === 80 && peterson.keyStat === '' && lynch?.overall === 79 && lynch.keyStat === '',
      'POOL PRIORITY: other recipients keep Peterson 80 and Lynch 79 ahead of remaining legends');
  });

  it('keeps unknown names unresolved and preserves the engine fallback', () => {
    const name = 'Synthetic unknown roster player';
    check(getNflRosterPlayer(name, 'BUF') === undefined, 'UNKNOWN CARD: an unknown name remains unresolved');
    const current = { ...rosters(), BUF: [name] };
    const results = Array.from({ length: 32 }, (_, index) => run(index + 1, 'BUF', 'KC', current));
    check(digest(results) === '7a75f3bdd2c37da62ab5b77b93d06631a628b4d909ad44168912be1d6cb375b3', 'UNKNOWN FALLBACK: all 32 pre-fix 75 OVR fallback outcomes are unchanged');
    results.forEach(result => participants(result, 'BUF', current));
  });
});
