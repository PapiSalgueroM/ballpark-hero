import type { DraftPlayer } from '@/components/fantasy-draft/PlayerPool';

/**
 * Fantasy Draft daily criteria, ENFORCED (owner 2026-08-05: "the criteria was
 * under 25 and I still had the choice to choose Bernardo Silva who's way
 * older... first priority is to make sure all data is correct").
 *
 * Each rule can gate a single player (eligible) and/or gate a pick in the
 * context of the team so far (teamCheck). Goalkeepers are exempt from value
 * and age gates where noted, because the 200-player pool only carries 4
 * keepers and a draft that cannot legally field a keeper would brick.
 *
 * Safety valve: pickIsLegal() callers should fall back to "anything goes"
 * if a side has NO legal pick left (pool exhaustion), so the draft can
 * always finish. enforceable() tells the UI whether the active criteria
 * text mapped to a real rule (unknown/legacy strings degrade to unenforced
 * rather than blocking play).
 */

export interface CriteriaRule {
  key: string;
  /** Exact label stored in fantasy_draft_daily / shown in the UI. */
  label: string;
  /** Short human reason shown when a pick is blocked. */
  blockedReason: string;
  /** Per-player gate, independent of team state. */
  eligible?: (p: DraftPlayer) => boolean;
  /** Team-context gate (budgets, nationality caps). */
  teamCheck?: (team: DraftPlayer[], candidate: DraftPlayer) => boolean;
}

const isGk = (p: DraftPlayer) => p.position === 'GK';

export const CRITERIA_RULES: CriteriaRule[] = [
  {
    key: 'under25',
    label: 'Under 25s: Every player must be 25 or younger',
    blockedReason: 'Over 25, not allowed under today\'s rule',
    eligible: (p) => (p.age ?? 99) <= 25,
  },
  {
    key: 'budget1b',
    label: 'Budget Cap: Your XI must total £1B or less',
    blockedReason: 'That pick would blow the £1B budget',
    teamCheck: (team, candidate) =>
      team.reduce((s, p) => s + (p.market_value_millions || 0), 0) +
        (candidate.market_value_millions || 0) <=
      1000,
  },
  {
    key: 'oneNation3',
    label: 'One Nation Rule: Max 3 players from any one country',
    blockedReason: 'You already have 3 players from that country',
    teamCheck: (team, candidate) =>
      team.filter((p) => p.nationality === candidate.nationality).length < 3,
  },
  {
    key: 'bargain60',
    label: 'Bargain Hunt: Every player must cost £60M or less',
    blockedReason: 'Too pricey for Bargain Hunt (over £60M)',
    eligible: (p) => (p.market_value_millions || 0) <= 60,
  },
  {
    key: 'wonderkids21',
    label: 'Wonderkids: Every outfield player must be 21 or younger',
    blockedReason: 'Too old for the Wonderkids rule (22+)',
    eligible: (p) => isGk(p) || (p.age ?? 99) <= 21,
  },
  {
    key: 'galactico80',
    label: 'Galacticos Only: Every outfield player must be worth £80M+',
    blockedReason: 'Not expensive enough for Galacticos Only',
    eligible: (p) => isGk(p) || (p.market_value_millions || 0) >= 80,
  },
];

/** Map the stored criteria text to a rule. Legacy strings (Golden Era, PL
 *  Only, Left Foot) intentionally return null: the data cannot verify them,
 *  and unverifiable rules must not pretend to be enforced. */
export function ruleForCriteria(criteriaText: string | null): CriteriaRule | null {
  if (!criteriaText) return null;
  const exact = CRITERIA_RULES.find((r) => r.label === criteriaText);
  if (exact) return exact;
  const lower = criteriaText.toLowerCase();
  if (lower.includes('under 25')) return CRITERIA_RULES.find((r) => r.key === 'under25') ?? null;
  if (lower.includes('budget cap') || lower.includes('1 billion') || lower.includes('£1b'))
    return CRITERIA_RULES.find((r) => r.key === 'budget1b') ?? null;
  if (lower.includes('one nation')) return CRITERIA_RULES.find((r) => r.key === 'oneNation3') ?? null;
  return null;
}

export function playerEligible(rule: CriteriaRule | null, p: DraftPlayer): boolean {
  if (!rule || !rule.eligible) return true;
  return rule.eligible(p);
}

export function pickIsLegal(
  rule: CriteriaRule | null,
  team: DraftPlayer[],
  candidate: DraftPlayer,
): boolean {
  if (!rule) return true;
  if (rule.eligible && !rule.eligible(candidate)) return false;
  if (rule.teamCheck && !rule.teamCheck(team, candidate)) return false;
  return true;
}

/** True if any undrafted player is a legal pick for this side right now. */
export function anyLegalPick(
  rule: CriteriaRule | null,
  team: DraftPlayer[],
  pool: DraftPlayer[],
  draftedIds: Set<string>,
): boolean {
  if (!rule) return true;
  return pool.some((p) => !draftedIds.has(p.id) && pickIsLegal(rule, team, p));
}
