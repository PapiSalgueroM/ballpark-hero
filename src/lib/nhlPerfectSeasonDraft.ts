import type { DraftablePlayer, SpinSquad } from '@/lib/perfectSeason';
import { NHL_SLOTS, type TeamEraIndexEntry } from '@/lib/perfectSeasonNhl';

export const NHL_DAILY_REROLLS = 2;
export const NHL_DAILY_SPIN_TRIES = 6;

export interface NhlPerfectSeasonDraft {
  picks: Record<string, DraftablePlayer | null>;
  squad: SpinSquad | null;
  rerolls: number;
  teamNames: string[];
  draws: number;
}

const slots = new Set(NHL_SLOTS.map(({ key }) => key));
export const nhlDailyDraftKey = (date: string) => `perfect-season-nhl-draft-${date}`;

export function nhlDailyWheelIdentity(index: TeamEraIndexEntry[], themeId?: string): string {
  return JSON.stringify([themeId ?? null, index.map(e => [e.abbr, e.eraStart, e.eraEnd, e.teamName, e.eraLabel, e.draftMatch])]);
}

function isPlayer(value: unknown): value is DraftablePlayer {
  if (!value || typeof value !== 'object') return false;
  const p = value as DraftablePlayer;
  return typeof p.playerId === 'string' && p.playerId.length > 0 && typeof p.name === 'string' && p.name.length > 0
    && Number.isFinite(p.rating) && p.rating >= 40 && p.rating <= 99 && typeof p.detail === 'string'
    && Array.isArray(p.eligible) && p.eligible.length > 0 && p.eligible.every(slot => slots.has(slot));
}

export function readNhlDailyDraft(date: string): string | null {
  try { return localStorage.getItem(nhlDailyDraftKey(date)); }
  catch { return null; }
}

export function decodeNhlDailyDraft(raw: string, wheel: string, index: TeamEraIndexEntry[], pick: (len: number) => number): NhlPerfectSeasonDraft | null {
  if (raw.length > 100_000) return null;
  try {
    const stored = JSON.parse(raw);
    if (!stored || stored.v !== 1 || stored.wheel !== wheel) return null;
    const { picks, squad, rerolls, teamNames, draws } = stored;
    if (!picks || typeof picks !== 'object' || Object.keys(picks).length !== slots.size
      || !Number.isInteger(rerolls) || rerolls < 0 || rerolls > NHL_DAILY_REROLLS
      || !Array.isArray(teamNames) || teamNames.length === 0 || teamNames.length > slots.size + NHL_DAILY_REROLLS
      || !Number.isInteger(draws) || draws < teamNames.length || draws > teamNames.length * NHL_DAILY_SPIN_TRIES) return null;
    const chosen = NHL_SLOTS.map(({ key }) => picks[key]);
    if (!chosen.every((player, i) => player === null || (isPlayer(player) && player.eligible.includes(NHL_SLOTS[i].key)))) return null;
    const filled = chosen.filter(isPlayer);
    if (new Set(filled.map(p => p.name)).size !== filled.length
      || teamNames.length !== filled.length + NHL_DAILY_REROLLS - rerolls + Number(squad !== null)) return null;
    const knownTeams = new Set(index.map(era => `${era.teamName} (${era.eraLabel})`));
    if (teamNames.some(name => !knownTeams.has(name))) return null;
    let last = 0;
    for (let i = 0; i < draws; i++) last = pick(index.length);
    const era = index[last];
    if (teamNames[teamNames.length - 1] !== `${era.teamName} (${era.eraLabel})`) return null;
    if (squad !== null && (!squad || filled.length === slots.size || squad.teamName !== teamNames[teamNames.length - 1]
      || squad.squadId !== `${era.abbr}-${era.eraStart}` || squad.year !== era.eraStart
      || !Array.isArray(squad.players) || squad.players.length === 0 || !squad.players.every(isPlayer)
      || new Set(squad.players.map((p: DraftablePlayer) => p.name)).size !== squad.players.length
      || !squad.players.some((p: DraftablePlayer) => !filled.some(f => f.name === p.name) && p.eligible.some(slot => picks[slot] === null)))) return null;
    return { picks, squad, rerolls, teamNames, draws };
  } catch { return null; }
}

export function writeNhlDailyDraft(date: string, wheel: string, draft: NhlPerfectSeasonDraft): string | null {
  const raw = JSON.stringify({ v: 1, wheel, ...draft });
  try { localStorage.setItem(nhlDailyDraftKey(date), raw); return raw; }
  catch { return null; }
}
