import type { CareerState, CMPlayer, SquadRole } from '@/lib/clubManager';
import { promiseMood, renewContract, renewalTerms, roleOf, worldYear } from '@/lib/clubManager';
import {
  readVeteranReviews, sameVeteranIdentity, veteranIdentity, veteranReviewOpen,
  type VeteranIdentity, type VeteranReviewLedger,
} from '@/lib/clubManagerVeteranLedger';

export type VeteranRetirementPreview =
  | { kind: 'blocked'; reason: string }
  | { kind: 'offer'; decision: 'agreed' | 'declined'; role: SquadRole;
      renewal: ReturnType<typeof renewalTerms> | null };

type ReviewInput = { player: CMPlayer; identity: VeteranIdentity; ledger: VeteranReviewLedger };
function input(career: CareerState, playerId: string): ReviewInput | string {
  if (!veteranReviewOpen(career)) return 'Talks open at your current season review.';
  if (career.pendingMove || career.jobHunt?.summerMove || career.jobHunt?.open?.status === 'accepted')
    return 'Resolve your next job before reviewing a veteran.';
  const player = career.squad.find(row => row.id === playerId);
  if (!player || career.squad.filter(row => row.id === playerId).length !== 1
    || player.onLoan || career.loanedOut?.some(row => row.player.id === playerId))
    return 'Only a player currently owned by your club can be reviewed.';
  if (career.retiredNames?.includes(player.name)) return 'This saved name is already retired in this career.';
  if (!Number.isSafeInteger(player.age) || player.age < 31 || player.age > 41)
    return 'This review is available from age 31 to 41.';
  const identity = veteranIdentity(career, player, worldYear(career));
  if (!identity) return 'This saved player identity needs recovery before a review.';
  const matching = career.squad.filter(row => {
    const other = veteranIdentity(career, row, worldYear(career));
    return other && sameVeteranIdentity(other, identity);
  });
  if (matching.length !== 1) return 'This saved player identity is ambiguous, so no review can be agreed.';
  const hasLedger = Object.prototype.hasOwnProperty.call(career, 'veteranReviews');
  const ledger = hasLedger ? readVeteranReviews(career.veteranReviews) : { v: 1 as const, reviews: [] };
  if (!ledger) return 'Your saved veteran reviews need recovery before another talk.';
  if (ledger.reviews.some(row => row.decision === 'agreed' && sameVeteranIdentity(row.identity, identity)))
    return 'This player has already used his one protected summer in this career.';
  if (ledger.reviews.some(row => row.season === career.season && sameVeteranIdentity(row.identity, identity)))
    return 'This season review has already been recorded for this player.';
  return { player, identity, ledger };
}

/** Provisional game policy. No random draw, writer, role change or aging happens here. */
export function previewVeteranRetirement(career: CareerState, playerId: string): VeteranRetirementPreview {
  const held = input(career, playerId);
  if (typeof held === 'string') return { kind: 'blocked', reason: held };
  const { player } = held;
  const decision = player.wantsOut || promiseMood(player).tone === 'bad' ? 'declined' : 'agreed';
  const renewal = decision === 'agreed' && (player.contractYears ?? 0) < 2 ? renewalTerms(player) : null;
  if (renewal && (!Number.isFinite(career.budget) || renewal.fee > career.budget))
    return { kind: 'blocked', reason: 'The actual renewal fee is outside your current budget.' };
  return { kind: 'offer', decision, role: roleOf(player), renewal };
}

/** Uncommitted whole career candidate. The owner must persist it before publishing the decision. */
export function applyVeteranRetirement(career: CareerState, playerId: string): CareerState | null {
  const preview = previewVeteranRetirement(career, playerId);
  if (preview.kind !== 'offer') return null;
  const held = input(career, playerId);
  if (typeof held === 'string') return null;
  const next = preview.renewal ? renewContract(career, playerId) : career;
  if (!next) return null;
  return { ...next, veteranReviews: { v: 1, reviews: [
    ...held.ledger.reviews,
    { identity: held.identity, club: career.clubName, season: career.season, decision: preview.decision },
  ] } };
}
