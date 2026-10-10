/**
 * Round 1223: the job market, the screen behind the Job market box.
 *
 * A GM between seats sees who is calling: one small tile an offer (five at
 * most, so never a long page), and a tap on a tile opens that offer alone
 * with its ask, why they called, the club's facts and the button that takes
 * it. Nothing is computed here: the feed, the three states, every line and
 * both arming sentences come from src/lib/gmDeskHost.ts, where the harness
 * reads them.
 *
 * The two actions that cannot be undone, taking a job and staying out a year,
 * each take two taps: the first shows what will happen, the second does it.
 * There is no stay out button whenever next year is shut (hostCanSitOut): on
 * a closed market, and on a market whose offers are the last calls he will
 * get, because a year that cannot bring a call is a season played for
 * nothing. The first tap on stay out says what the year costs and leaves.
 *
 * The panel only reports the choice (facts.career.take, facts.career.sitOut).
 * The board that binds it applies it. Not mounted by this round.
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { GmPanelProps } from '@/lib/gmDesk';
import {
  HOST_TIER_WORDS, hostCanSitOut, hostMarketHelp, hostOfferFactsLine, hostSitArmLine, hostTakeArmLine,
  type GmCareerFacts,
} from '@/lib/gmDeskHost';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function GmJobMarketPanel({ sport, facts }: GmPanelProps<GmCareerFacts>) {
  const { pack, market, deskOn, take, sitOut } = facts.career;
  const [help, setHelp] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [armed, setArmed] = useState<'take' | 'sit' | null>(null);

  if (!market) {
    return (
      <div className="rounded-2xl border border-border bg-card p-3 text-[11px] text-muted-foreground" data-gm-market="held">
        You hold a seat. The market opens when a {pack.seat} lets you go.
      </div>
    );
  }

  const offer = market.offers.find(o => o.teamId === open) ?? null;
  const offerFacts = offer ? market.facts[offer.teamId] : undefined;
  const pick = (teamId: string | null) => { setOpen(teamId); setArmed(null); };

  return (
    <div className="space-y-2" data-gm-market={market.state}>
      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="flex items-start gap-2">
          <p className="flex-1 text-[11px] leading-snug text-foreground" data-gm-market-line>{market.line}</p>
          <button
            type="button"
            onClick={() => setHelp(h => !h)}
            aria-expanded={help}
            aria-label="How the job market works"
            className="min-h-[44px] min-w-[44px] rounded-full border border-border text-xs text-muted-foreground hover:text-foreground"
          >
            ?
          </button>
        </div>
        {help && (
          <div className="mt-2 space-y-1 rounded-lg border border-border bg-secondary/30 p-2 text-[10px] text-muted-foreground" data-gm-market-help>
            {hostMarketHelp(pack).map(line => <p key={line}>{line}</p>)}
          </div>
        )}
      </div>

      {offer ? (
        <div className="rounded-2xl border border-border bg-card p-3" data-gm-offer-open={offer.teamId}>
          <button
            type="button"
            onClick={() => pick(null)}
            className="mb-2 min-h-[44px] rounded-full border border-border px-3 text-[10px] text-muted-foreground hover:text-foreground"
          >
            Back to the offers
          </button>
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-black text-foreground">{offer.teamName}</span>
            <span className="font-bold uppercase tracking-wider text-muted-foreground">{cap(HOST_TIER_WORDS[offer.tier])}</span>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-foreground">{offer.ask.text}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{offer.reason}</p>
          {offerFacts && (
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground" data-gm-offer-facts>
              {hostOfferFactsLine(offerFacts, sport.cap.line)}
            </p>
          )}
          {armed === 'take' && (
            <p className="mt-2 text-[10px] font-semibold text-gold" data-gm-arm="take">{hostTakeArmLine(pack, offer, deskOn)}</p>
          )}
          <button
            type="button"
            data-gm-take={offer.teamId}
            onClick={() => { if (armed === 'take') take(offer); else setArmed('take'); }}
            className={cn(
              'mt-2 min-h-[44px] w-full rounded-lg px-3 text-[11px] font-black',
              armed === 'take' ? 'bg-gold text-background' : 'bg-primary text-primary-foreground',
            )}
          >
            {armed === 'take' ? `Yes, take the ${offer.teamName} job` : 'Take the job'}
          </button>
        </div>
      ) : market.offers.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5" data-gm-offers>
          {market.offers.map(o => (
            <button
              key={o.teamId}
              type="button"
              data-gm-offer={o.teamId}
              onClick={() => pick(o.teamId)}
              className="min-h-[64px] rounded-lg border border-border bg-secondary/20 p-2 text-left transition-colors hover:bg-secondary/40"
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{cap(HOST_TIER_WORDS[o.tier])}</div>
              <div className="truncate text-xs font-bold text-foreground">{o.teamName}</div>
              <div className="truncate text-[9px] text-muted-foreground">{market.facts[o.teamId]?.record ?? 'Open the offer'}</div>
            </button>
          ))}
        </div>
      ) : null}

      {hostCanSitOut(market) && !offer && (
        <div className="rounded-2xl border border-border bg-card p-3" data-gm-sit>
          {armed === 'sit' && (
            <p className="mb-2 text-[10px] font-semibold text-gold" data-gm-arm="sit">{hostSitArmLine(market, deskOn)}</p>
          )}
          <button
            type="button"
            data-gm-sit-out
            onClick={() => { if (armed === 'sit') sitOut(); else setArmed('sit'); }}
            className={cn(
              'min-h-[44px] w-full rounded-lg border px-3 text-[11px] font-bold',
              armed === 'sit' ? 'border-gold bg-gold text-background' : 'border-border text-foreground',
            )}
          >
            {armed === 'sit' ? 'Yes, stay out for the year' : 'Stay out for a year'}
          </button>
        </div>
      )}
    </div>
  );
}
