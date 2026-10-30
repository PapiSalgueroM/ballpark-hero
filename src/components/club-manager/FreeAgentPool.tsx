import { cn } from '@/lib/utils';
import { freeAgentBlock, freeAgentTerms, moneyIn } from '@/lib/clubManager';
import type { CareerState, FreeAgent, FreeAgentBlock } from '@/lib/clubManager';
import { MadeUpTag } from '@/components/club-manager/SquadScreen';

const FREE_AGENT_BLOCK_COPY: Record<FreeAgentBlock, { face: string; title: string }> = {
  notInPool: { face: 'Gone', title: 'He is not on the free agent list any more.' },
  inSquad: { face: 'In your squad', title: 'He is already in your squad.' },
  releasedByYou: { face: 'You let him go', title: 'You released him, so he will not sign for you again.' },
  justLeft: { face: 'No old deal', title: 'This older free-agent record has no verified past contract, so the same-season return is unavailable.' },
  notInterested: { face: 'Not interested', title: 'Too good to sign for your club as a free agent.' },
  squadFull: { face: 'Squad full', title: 'You already have 30 players.' },
  overCap: { face: 'Over the cap', title: 'His wage would take you over the wage cap.' },
  cantAfford: { face: 'Too dear', title: 'You cannot cover his signing on fee.' },
};

const FREE_AGENT_REASON: Record<FreeAgent['reason'], string> = {
  released: 'you let him go',
  expired: 'deal ran out',
  unattached: 'no club',
};

interface FreeAgentPoolProps {
  career: CareerState;
  onSignFreeAgent?: (name: string) => void;
}

/** The existing pool and engine quote, shared by the contracts and transfer desks. */
export function FreeAgentPool({ career, onSignFreeAgent }: FreeAgentPoolProps) {
  if (!onSignFreeAgent) return null;
  const money = moneyIn(career);
  const pool = career.freeAgents ?? [];
  return (
    <section aria-label="Free agents" className="mt-3 pt-2 border-t border-border/40">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
        Free agents{career.transferWindow === null ? ', and the window being shut does not stop these' : ''}
      </div>
      {pool.length === 0 && <p className="text-xs text-muted-foreground">No free agents available right now.</p>}
      <div className="max-h-80 overflow-y-auto">
        {pool.map((f, i) => {
          const block = freeAgentBlock(career, f);
          const t = freeAgentTerms(f, career);
          return (
            <div key={f.name} className="flex items-center gap-2 py-1 border-b border-border/30 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="min-w-0 text-xs text-foreground truncate" title={f.name}>{f.name}</span>
                  {f.generated && <MadeUpTag title="Not a real player. This game made him up." />}
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {f.position}, {f.rating} rated, {f.age}, {FREE_AGENT_REASON[f.reason]}
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {t.wage}k a week for {t.years} years, {money(t.fee)} to sign, no transfer fee
                </div>
              </div>
              <button
                data-sign-index={i}
                onClick={() => onSignFreeAgent(f.name)}
                disabled={!!block}
                title={block ? FREE_AGENT_BLOCK_COPY[block].title : `${t.years} years at ${t.wage}k a week and ${money(t.fee)} to sign. No transfer fee, and the window being shut does not matter.`}
                className={cn('shrink-0 max-w-[55%] min-h-11 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                  block ? 'bg-secondary text-muted-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground hover:opacity-90')}
              >
                {block ? FREE_AGENT_BLOCK_COPY[block].face : `Sign · ${t.wage}k/w · ${t.years}y · ${money(t.fee)}`}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
