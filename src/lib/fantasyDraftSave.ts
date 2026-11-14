import type { DraftPlayer } from '@/components/fantasy-draft/PlayerPool';
import { fantasyDraftCandidates, ruleForCriteria } from '@/lib/fantasyCriteria';

export const FANTASY_TEAM_SIZE = 11;
export const FANTASY_TOTAL_PICKS = FANTASY_TEAM_SIZE * 2;

export function getPickOwner(index: number, userFirst: boolean): 'user' | 'ai' {
  const round = Math.floor(index / 2);
  const firstInRound = round % 2 === 0 ? userFirst : !userFirst;
  return firstInRound === (index % 2 === 0) ? 'user' : 'ai';
}

export interface FantasyDraftSave {
  v: 1;
  date: string;
  userFirst: boolean;
  criteria: string | null;
  picks: string[];
}

export function parseFantasyDraft(raw: string | null, date: string): FantasyDraftSave | null {
  try {
    const save = JSON.parse(raw ?? 'null');
    if (!save || save.v !== 1 || save.date !== date || typeof save.userFirst !== 'boolean'
      || (save.criteria !== null && typeof save.criteria !== 'string') || !Array.isArray(save.picks)
      || save.picks.length === 0 || save.picks.length >= FANTASY_TOTAL_PICKS
      || save.picks.some(id => typeof id !== 'string' || !id)
      || new Set(save.picks).size !== save.picks.length) return null;
    return save;
  } catch { return null; }
}

export function readFantasyDraft(key: string): string | null {
  try { return localStorage.getItem(key); }
  catch { return null; }
}

export function withFantasyDraftLock(key: string, commit: () => void): void {
  const locks = navigator.locks;
  if (!locks) { commit(); return; }
  let entered = false;
  try {
    void locks.request(key, () => {
      entered = true;
      commit();
    }).catch(() => {
      if (!entered) commit();
    });
  } catch {
    if (!entered) commit();
  }
}

export function restoreFantasyDraft(save: FantasyDraftSave, pool: DraftPlayer[]) {
  const rule = ruleForCriteria(save.criteria);
  const draftedIds = new Set<string>();
  const userTeam: DraftPlayer[] = [];
  const aiTeam: DraftPlayer[] = [];
  for (const [index, id] of save.picks.entries()) {
    const team = getPickOwner(index, save.userFirst) === 'user' ? userTeam : aiTeam;
    const candidate = fantasyDraftCandidates(rule, team, pool, draftedIds).players.find(player => player.id === id);
    if (!candidate) return null;
    team.push(candidate);
    draftedIds.add(id);
  }
  return { userTeam, aiTeam, draftedIds };
}
