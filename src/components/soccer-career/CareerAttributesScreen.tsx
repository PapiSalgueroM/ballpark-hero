import { Button } from "@/components/ui/button";
import { useRevealScroll } from "@/hooks/useRevealScroll";
import { careerBuildEffects, effectivePotential, type CareerState } from "@/lib/soccerCareerEngine";
import { attrTreeFor, deriveAttributes, safePhysique, effectsSummary, heightLabel, weightLabel, buildLabel } from "@/lib/soccerCareerAttributes";
import { ballonDorAwaitingReveal } from "@/lib/soccerAwardReveal";
import PotentialProgress from "./PotentialProgress";

export default function AttributesScreen({ career, onBack, familyColors: FAMILY_COLORS }: { career: CareerState; onBack: () => void; familyColors: Readonly<Record<string, string>> }) {
  // Same reason as the build screen: a full screen swap has to bring its own top with it.
  const revealRef = useRevealScroll<HTMLDivElement>("attributes", { skipFirst: false });
  const tree = attrTreeFor(career.position);
  const derived = deriveAttributes(career, career.position, career.physique, career.attrShape);
  const phys = safePhysique(career.position, career.physique);
  const fx = careerBuildEffects(career);
  const lines = effectsSummary(fx, career.position);
  const ceiling = effectivePotential(career);
  const earned = career.potentialEarned ?? 0;

  return (
    <div ref={revealRef} className="max-w-xl mx-auto space-y-3 animate-fade-in pb-20">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2 text-muted-foreground">← Back</Button>
        <h1 className="min-w-0 text-base font-black [overflow-wrap:anywhere]">{career.playerName}, full attributes</h1>
      </div>

      <div className="bg-card border border-border rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Overall</div>
          <div className="text-2xl font-black tabular-nums">{career.overall}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Height</div>
          <div className="text-sm font-black tabular-nums pt-1.5">{heightLabel(phys.heightCm)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Weight</div>
          <div className="text-sm font-black tabular-nums pt-1.5">{weightLabel(phys.weightKg)}</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-3 space-y-1.5">
        <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">What this build is worth</div>
        <div className="flex flex-wrap gap-1.5">
          {lines.map(l => <span key={l} className="px-2 py-1 rounded-md bg-muted/30 text-[11px] font-bold">{l}</span>)}
        </div>
        <div className="pt-1 text-[11px] text-muted-foreground">{buildLabel(phys)}.</div>
        <PotentialProgress ceiling={ceiling} earned={earned}
          eliteRun={career.eliteStreak ?? 0} overall={career.overall} retired={career.retired}
          awardPending={ballonDorAwaitingReveal(career) !== null} />
      </div>

      {tree.map(fam => (
        <div key={fam.key} className="bg-card border border-border rounded-xl p-3 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{fam.label}</span>
            <span className="text-lg font-black tabular-nums">{Math.round((career as any)[fam.key]) || 0}</span>
          </div>
          {fam.children.map(c => {
            const d = derived.find(x => x.id === c.id);
            const v = d?.value ?? 0;
            const rc = v >= 80 ? "text-green-400" : v >= 65 ? "text-emerald-400" : v >= 50 ? "text-yellow-400" : "text-red-400";
            return (
              <div key={c.id} className="flex items-center gap-2">
                <span className="w-[6.5rem] shrink-0 text-[11px] leading-tight text-muted-foreground [overflow-wrap:anywhere]">{c.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div className={`h-full rounded-full ${FAMILY_COLORS[fam.key] || "bg-emerald-500"}`} style={{ width: `${v}%` }} />
                </div>
                {d && d.frameDelta !== 0 && (
                  <span className={`text-[9px] font-bold shrink-0 tabular-nums ${d.frameDelta > 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>
                    {d.frameDelta > 0 ? "+" : ""}{d.frameDelta}
                  </span>
                )}
                <span className={`text-xs font-bold w-6 text-right shrink-0 ${rc}`}>{v}</span>
              </div>
            );
          })}
        </div>
      ))}

      <Button onClick={onBack} className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-black">Back to your career</Button>
    </div>
  );
}
