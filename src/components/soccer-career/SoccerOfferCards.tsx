import { FlagImg } from "@/components/FlagImg";
import { SoccerOfferReview } from "./SoccerOfferReview";
import { formatWage, nextSeasonYear, type CareerState, type ContractOffer } from "@/lib/soccerCareerEngine";
import { leagueSeasonLine, ordinal } from "@/lib/soccerCareerLeague";
import { depthChart, GROUP_LABEL } from "@/lib/soccerClubSquad";
import { localizeMoney as money, localizeMoneyGrouped as moneyLine } from "@/lib/soccerCurrency";
import { buildSoccerOfferReview } from "@/lib/soccerOfferReview";

/* Round 267: an offer is not just money and a badge, it is a queue you are
   joining. Where the real squad for that club and season exists, the card says
   where you would slot into it and who would be in front of you, which is the
   difference between "Arsenal want me" and "Arsenal want me as a fourth
   choice". Display only, same as the squad card: it reads the same baked data
   and changes nothing about the offer or the simulation. No data for that club
   or year means no line, never a guess. */
function OfferFitLine({ offer, career }: { offer: ContractOffer; career: CareerState }) {
  const year = (career.seasons[career.seasons.length - 1]?.year ?? 0) + 1;
  const chart = depthChart(offer.club.name, year, career.position, career.overall, career.playerName);
  if (!chart) return null;
  const label = GROUP_LABEL[chart.group];
  return (
    <div data-offer-fit className="text-[11px] text-muted-foreground border-t border-border/50 pt-2">
      {chart.ahead === 0
        ? `👑 You would be their best of the ${label} on day one.`
        : `📋 You would be ${ordinal(chart.ahead + 1)} of ${chart.men.length} ${label} there${chart.aheadOfMe ? `, behind ${chart.aheadOfMe.name}` : ""}.`}
    </div>
  );
}

export function OfferCard({ offer, onAccept, career }: { offer: ContractOffer; onAccept: () => void; career: CareerState }) {
  /* Round 1037: the league the club is in the season this contract starts */
  const leagueLine = leagueSeasonLine(offer.club, nextSeasonYear(career));
  const review = buildSoccerOfferReview(career, offer);
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
          style={{ backgroundColor: offer.club.color + "22", color: offer.club.color, border: `2px solid ${offer.club.color}44` }}>
          {offer.club.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate flex items-center gap-1"><FlagImg name={offer.club.country} size={16} />{offer.club.name}</div>
          {leagueLine && <div className="text-[11px] text-muted-foreground">{leagueLine}</div>}
        </div>
        {offer.isDreamClub && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">⭐ Dream Club</span>}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span>📋 {offer.contractYears}yr</span>
        <span>💰 {formatWage(review.signedWage)}</span>
        {offer.transferFee > 0 && <span>🏷️ {money(`€${offer.transferFee.toFixed(1)}M`)} fee</span>}
        {offer.transferFee === 0 && offer.contractYears > 0 && <span className="text-emerald-400 font-semibold">Free transfer</span>}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40">Tier {offer.club.tier}</span>
      </div>
      {review.wageDelta !== null && review.wageDelta < 0 && <div className="text-xs text-amber-400">Lower weekly wage than your current deal</div>}
      {review.loyaltyQuote && <p data-loyalty-offer className="text-xs text-emerald-400">Loyalty deal: {moneyLine('€' + review.loyaltyQuote.bonusEuros.toLocaleString('en-US'))} after {review.loyaltyQuote.years} recorded contract seasons. Leaving early forfeits it.</p>}
      {review.loyaltyForfeitEuros && <p data-loyalty-forfeit className="text-xs text-amber-400">A permanent move here forfeits {moneyLine('€' + review.loyaltyForfeitEuros.toLocaleString('en-US'))} of unpaid loyalty pay.</p>}
      {career && <OfferFitLine offer={offer} career={career} />}
      <SoccerOfferReview club={offer.club.name} review={review} onAccept={onAccept} />
    </div>
  );
}

// The verdict displays the recorded squad only. It never feeds seasonStrikes.
export function FrozenOutDepthLine({ career }: { career: CareerState }) {
  const year = career.seasons[career.seasons.length - 1]?.year;
  if (!year) return null;
  const chart = depthChart(career.currentClub, year, career.position, career.overall, career.playerName);
  if (!chart || chart.ahead === 0) return null;
  return (
    <div className="text-[11px] flex gap-1.5">
      <span className="text-red-400 shrink-0">▪</span>
      <span>
        You were {ordinal(chart.ahead + 1)} of {chart.men.length} {GROUP_LABEL[chart.group]} at {chart.club}
        {chart.aheadOfMe ? `, behind ${chart.aheadOfMe.name}` : ""}
      </span>
    </div>
  );
}
