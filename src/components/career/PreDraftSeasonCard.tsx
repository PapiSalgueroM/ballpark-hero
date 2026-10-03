import { Button } from "@/components/ui/button";
import {
  preDraftChoicePool, preDraftEffectText, preDraftEffectiveEffect, preDraftRoute,
  type PreDraftDescriptor, type PreDraftState,
} from "@/lib/careerPreDraft";

/* ─── Round 914: one pre draft season, shared by the four US careers ───
   The season's stat line, the draft stock meter and how far the season
   moved it, then the choice the season left behind. Every option prints
   its effect from preDraftEffectiveEffect, the same numbers preDraftChoose
   applies, so a button can never promise more than it does. */
export function PreDraftSeasonCard({
  desc, state, onPlaySeason, onChoose,
}: {
  desc: PreDraftDescriptor;
  state: PreDraftState;
  onPlaySeason: () => void;
  onChoose: (optionIndex: number) => void;
}) {
  const route = preDraftRoute(desc, state.routeId);
  const last = state.lines[state.lines.length - 1];
  const card = state.phase === "choice" ? preDraftChoicePool(desc).find(c => c.id === state.pendingChoice) : undefined;
  const delta = last ? last.stockDelta : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3" data-testid="pre-draft-season">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-bold">{route.label}</h3>
        <span className="text-xs text-muted-foreground">
          Season {Math.min(state.seasonsDone + (state.phase === "season" ? 1 : 0), route.seasons)} of {route.seasons}
        </span>
      </div>

      <div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Draft stock</span>
          <span data-testid="pre-draft-stock">
            {state.stock}{last ? ` (${delta > 0 ? "+" : ""}${delta} this season)` : ""}
          </span>
        </div>
        <div className="h-2 rounded bg-muted overflow-hidden" role="progressbar" aria-label="Draft stock" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.stock}>
          <div className="h-full bg-primary transition-all" style={{ width: `${state.stock}%` }} />
        </div>
      </div>

      {last && (
        <div className="rounded-lg bg-muted/30 p-3">
          <div className="text-xs text-muted-foreground mb-2">Age {last.age}, {last.level}</div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {last.stats.map(st => (
              <div key={st.label}>
                <div className="text-sm font-bold">{st.value}</div>
                <div className="text-[10px] uppercase text-muted-foreground">{st.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.phase === "season" && (
        <Button className="w-full" onClick={onPlaySeason}>
          {state.seasonsDone === 0 ? "Play your first season" : "Play the next season"}
        </Button>
      )}

      {card && (
        <div className="space-y-2" data-testid="pre-draft-choice">
          <div className="font-semibold text-sm">{card.title}</div>
          <p className="text-sm text-muted-foreground">{card.body}</p>
          <div className="grid gap-2">
            {card.options.map((o, i) => (
              <Button key={o.label} variant="outline" className="h-auto justify-between whitespace-normal text-left" onClick={() => onChoose(i)}>
                <span>{o.label}</span>
                <span className="text-xs text-muted-foreground" data-testid="pre-draft-effect">
                  {preDraftEffectText(preDraftEffectiveEffect(state, o.effect))}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
