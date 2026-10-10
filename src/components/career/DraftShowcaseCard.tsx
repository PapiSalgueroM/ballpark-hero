import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  PRE_DRAFT_APPROACHES, SHOWCASE_DELTAS, SKIP_DELTA, preDraftProjection, preDraftProjectionLine, preDraftShowcaseMove,
  type PreDraftApproach, type PreDraftDescriptor, type PreDraftState,
} from "@/lib/careerPreDraft";

const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/** What an approach promises from this stock, printed from the same move
 *  the showcase applies, so a stock near 0 or 100 shows the clamped number. */
export function approachPromise(id: PreDraftApproach["id"], stock: number): string {
  const m = (delta: number) => sign(preDraftShowcaseMove(stock, delta));
  if (id === "skip") return `Draft stock ${m(SKIP_DELTA)}`;
  const t = SHOWCASE_DELTAS[id];
  return `Grade A ${m(t.A)}, B ${m(t.B)}, C ${m(t.C)}, D ${m(t.D)}`;
}

/* ─── Round 914: the showcase and draft day, shared by the four US careers ───
   Three steps on one card. Showcase: pick how hard to go, and every option
   prints the exact stock move per grade. Then the drill result and the
   button that starts the draft. Then the pick: the round, the number, and
   the team that held it, which is the team you join.

   Round 1220, all optional, and a card rendered without them is the card it
   was: `showRange` prints where the scouts have you above the "Draft day"
   button, from the same arithmetic the draft is about to draw with. `night`
   is draft night itself (DraftNightSequence, handed in by the journey only
   in the mount that pressed "Draft day"): it goes above the result, brings
   its own "Start your career" beside its skip button, and `nightHold` is the
   delay the result block waits so it cannot give the pick away early.
   `nightHeld` is true while the rows are still arriving: the result block is
   then out of a screen reader's tree as well as out of sight. */
export function DraftShowcaseCard({
  desc, state, onShowcase, onRunDraft, onContinue, showRange, night, nightHold, nightHeld,
}: {
  desc: PreDraftDescriptor;
  state: PreDraftState;
  onShowcase: (approach: PreDraftApproach["id"]) => void;
  onRunDraft: () => void;
  onContinue?: () => void;
  showRange?: boolean;
  night?: ReactNode;
  nightHold?: string;
  nightHeld?: boolean;
}) {
  const sc = state.showcase;
  const out = state.draft;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3" data-testid="draft-showcase">
      {state.phase === "showcase" && (
        <>
          <h3 className="text-base font-bold">{desc.showcaseName}</h3>
          <p className="text-sm text-muted-foreground">Draft stock {state.stock}. How hard do you go?</p>
          <div className="grid gap-2">
            {PRE_DRAFT_APPROACHES.map(a => (
              <Button key={a.id} variant="outline" className="h-auto flex-col items-start whitespace-normal text-left" onClick={() => onShowcase(a.id)}>
                <span className="font-semibold">{a.label}</span>
                <span className="text-xs text-muted-foreground">{a.blurb}</span>
                <span className="text-xs" data-testid="approach-promise">{approachPromise(a.id, state.stock)}</span>
              </Button>
            ))}
          </div>
        </>
      )}

      {sc && state.phase !== "showcase" && (
        <div className="rounded-lg bg-muted/30 p-3 text-sm" data-testid="showcase-result">
          {sc.grade
            ? <>{sc.drill}: grade {sc.grade}. Draft stock {sign(sc.stockDelta)}, now {state.stock}.</>
            : <>You skipped it. Draft stock {sign(sc.stockDelta)}, now {state.stock}.</>}
        </div>
      )}

      {state.phase === "draft" && showRange && (
        <p className="text-sm" data-testid="draft-range">{preDraftProjectionLine(preDraftProjection(desc, state), "have")}</p>
      )}

      {state.phase === "draft" && (
        <Button className="w-full" onClick={onRunDraft}>Draft day</Button>
      )}

      {out && night}

      {out && (
        <div className={nightHold ? "space-y-2 cm-rise" : "space-y-2"} style={nightHold ? { animationDelay: nightHold } : undefined} aria-hidden={nightHeld || undefined} data-testid="draft-result">
          {out.pick !== null ? (
            <>
              <div className="text-xs uppercase text-muted-foreground">{out.draftYear} draft</div>
              <h3 className="text-lg font-black">
                Round {out.round}, pick {out.pickInRound} ({out.pick} overall)
              </h3>
              <p className="text-sm">{desc.teamLabel(out.team)} hold the pick, and they take you.</p>
              {desc.bonusLine && <p className="text-xs text-muted-foreground">{desc.bonusLine(out.pick)}</p>}
            </>
          ) : (
            <>
              <h3 className="text-lg font-black">Undrafted</h3>
              <p className="text-sm">{desc.undraftedLine}</p>
              <p className="text-sm">Your first club: {desc.teamLabel(out.team)}.</p>
            </>
          )}
          {desc.postDraft && out.devSeasons.length > 0 && (
            <div className="rounded-lg bg-muted/30 p-3 space-y-1">
              <div className="text-xs font-semibold">{desc.postDraft.title}</div>
              {out.devSeasons.map((d, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>Age {d.age}, {d.level}</span>
                  <span className="text-muted-foreground">{d.stats.map(st => `${st.label} ${st.value}`).join(", ")}</span>
                </div>
              ))}
            </div>
          )}
          {onContinue && !night && <Button className="w-full" onClick={onContinue}>Start your career</Button>}
        </div>
      )}
    </div>
  );
}
