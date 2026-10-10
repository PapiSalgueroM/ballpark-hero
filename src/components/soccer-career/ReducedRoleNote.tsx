import type { CareerState, SeasonRecord } from "@/lib/soccerCareerEngine";
import { REDUCED_ROLE_GAMES, readReducedRoleResult, reducedRoleForSeason } from "@/lib/soccerCareerRole";

export function ReducedRolePlanNote({ career }: { career: CareerState }) {
  const plan = reducedRoleForSeason(career);
  if (!plan) return null;
  return (
    <div data-reduced-role-plan className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-1">
      <p className="font-bold">Your role next season</p>
      <p>You accepted a smaller role at {plan.club} for {plan.year}/{String(plan.year + 1).slice(-2)}: {REDUCED_ROLE_GAMES} fewer planned league games.</p>
      <p className="text-muted-foreground">Selection limits, injuries and bans still apply. It lasts one recorded season. A move or loan clears the plan.</p>
    </div>
  );
}

export function ReducedRoleSeasonNote({ season }: { season: SeasonRecord }) {
  const result = readReducedRoleResult(season);
  if (!result) return null;
  return (
    <p data-reduced-role-result className="text-xs text-muted-foreground">
      {result.outcome === "served"
        ? `Your smaller role at ${result.club} was applied to this season's selection plan (${result.plannedReduction} fewer league games before limits, injuries and bans). That plan is now finished.`
        : `Your season was interrupted, so the smaller-role plan at ${result.club} ended here. It will not carry into next year.`}
    </p>
  );
}
