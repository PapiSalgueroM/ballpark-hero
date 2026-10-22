/* Round 1524: the club owner's screens, one lazy chunk with the owner tail
   itself (src/lib/soccerCareerOwner.ts; src/lib/soccerOwnerGate.ts says why
   it is lazy). The page loads it only for a career at its end. */
import { Button } from "@/components/ui/button";
import { revealDelay } from "@/components/club-manager/Celebration";
import { formatNetWorth, type CareerState, type ClubData, type OwnerPlan, type OwnerState } from "@/lib/soccerCareerEngine";
import { localizeMoney as money } from "@/lib/soccerCurrency";
import { OWNER_EFFECTS, OWNER_PLANS, chooseOwnerPlan, ownerBudget, ownerClubsOnSale, ownerLevels, ownerPlanOpen, ownerPlanWords } from "@/lib/soccerCareerOwner";
import { DugoutTableBlock } from "./DugoutTableBlock";

/* ─── Round 1524: the clubs for sale ───
   Two from every price band he can afford, the same list on every visit.
   The prices and the debts are the game's own tier bands, and the card says
   so: never a real club's real valuation. A tile buys a club for good, so it
   is cm-rise-gated: hidden, and so not pressable, until its reveal starts.
   The league line is the season's own (leagueSeasonLine, as on the manager's
   cards), it wraps rather than cutting, and the tier has its own line. */
export function OwnerClubSale({ career, clubs, onBuy, onBack }: { career: CareerState; clubs: ClubData[]; onBuy: (club: string) => void; onBack: () => void }) {
  const forSale = ownerClubsOnSale(career, clubs);
  return (
    <div className="space-y-2" data-testid="owner-club-sale">
      <div className="flex items-center justify-between gap-2">
        <Button onClick={onBack} variant="ghost" className="h-8 px-2 text-xs font-bold">Back</Button>
        <span className="text-xs font-bold uppercase text-muted-foreground">Clubs for sale</span>
      </div>
      <p className="text-[11px] text-center text-muted-foreground">
        {money(`You have ${formatNetWorth(career.netWorth)}. Prices and debts are the game's own estimates for a club of that tier, not real figures.`)}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {forSale.map((c, i) => (
          <button
            key={c.name}
            onClick={() => onBuy(c.name)}
            data-testid="owner-club-for-sale"
            className="cm-rise-gated min-w-0 rounded-lg border border-border bg-card hover:border-primary p-2.5 text-left transition-all"
            style={{ animationDelay: revealDelay(i) }}
          >
            <div className="truncate text-xs font-black">{c.name}</div>
            {c.leagueLine && <div className="break-words text-[10px] leading-snug text-muted-foreground">{c.leagueLine}</div>}
            <div className="text-[10px] text-muted-foreground">Tier {c.tier}</div>
            <div className="text-[11px] font-bold">{money(`€${c.price}M`)}</div>
            <div className="text-[10px] text-muted-foreground">{money(`€${c.debt}M debt`)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Round 1524: the club owner's panel ───
   The season is the dugout's table (DugoutTableBlock), and before each one
   he makes one call: where the budget goes. The call is saved with the
   career, so a reload keeps it, and the season button waits for it. */
export function OwnerPanel({ owner, onCareer }: { owner: OwnerState; onCareer?: (fn: (prev: CareerState) => CareerState) => void }) {
  const lv = ownerLevels(owner);
  const budget = ownerBudget(owner);
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3" data-testid="owner-panel">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-black">🏟️ Club Owner</h3>
        <p className="text-xs text-muted-foreground">Owning {owner.club} (Tier {owner.clubTier}) · Season {owner.season}</p>
        <p className="text-[11px] text-muted-foreground">Every season is played on your league's table. Before each one, pick where the budget goes.</p>
      </div>
      {owner.seasonResults.length > 0 && (
        <div className="space-y-1">
          {owner.seasonResults.slice(-5).map((r, i) => (
            <div key={`${r.year}-${i}`} className="cm-tick-in flex items-center justify-between gap-2 text-xs bg-muted/20 rounded-lg px-3 py-1.5" style={{ animationDelay: revealDelay(i) }}>
              <span className="shrink-0 text-muted-foreground">S{r.year}</span>
              <span className="shrink-0 font-semibold">{r.club}</span>
              <span className={`min-w-0 text-right text-[10px] ${r.trophy ? "text-amber-400" : "text-muted-foreground"}`}>{money(r.result)}</span>
            </div>
          ))}
        </div>
      )}
      <DugoutTableBlock results={owner.seasonResults} />
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-muted/20 rounded-lg p-2"><div className="font-black">{owner.trophies}</div><div className="text-[9px] text-muted-foreground">Trophies</div></div>
        <div className="bg-muted/20 rounded-lg p-2"><div className="font-black">{owner.promotions}</div><div className="text-[9px] text-muted-foreground">Promotions</div></div>
        <div className="bg-muted/20 rounded-lg p-2"><div className="font-black">{money(`€${lv.debt.toFixed(1)}M`)}</div><div className="text-[9px] text-muted-foreground">Debt</div></div>
        <div className="bg-muted/20 rounded-lg p-2"><div className="font-black">{lv.squad.toFixed(1)}</div><div className="text-[9px] text-muted-foreground">Signings edge</div></div>
        <div className="bg-muted/20 rounded-lg p-2"><div className="font-black">{lv.academy}/{OWNER_EFFECTS.maxLevel}</div><div className="text-[9px] text-muted-foreground">Academy</div></div>
        <div className="bg-muted/20 rounded-lg p-2"><div className="font-black">{lv.stadium}/{OWNER_EFFECTS.maxLevel}</div><div className="text-[9px] text-muted-foreground">Ground</div></div>
      </div>
      <div className="space-y-2" data-testid="owner-plan">
        <div className="text-xs text-center font-bold uppercase text-muted-foreground">{money(`Where does this season's €${budget}M go?`)}</div>
        <div className="grid grid-cols-2 gap-2">
          {OWNER_PLANS.filter(p => ownerPlanOpen(owner, p)).map(p => {
            const w = ownerPlanWords(owner, p);
            const on = owner.plan === p;
            return (
              <button
                key={p}
                onClick={() => onCareer?.(c => chooseOwnerPlan(c, p))}
                aria-pressed={on}
                data-plan={p}
                className={`min-w-0 rounded-lg border p-2.5 text-left transition-all ${on ? "border-primary bg-primary/15" : "border-border bg-card hover:border-primary"}`}
              >
                <div className="text-xs font-black">{w.title}</div>
                <div className="text-[10px] leading-snug text-muted-foreground">{money(w.line)}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
