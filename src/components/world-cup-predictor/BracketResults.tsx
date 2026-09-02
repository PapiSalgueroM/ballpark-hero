import { useMemo, useState } from "react";
import { Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { FlagImg } from "@/pages/WorldCupPredictor";
import type { GroupSeed } from "./KnockoutBracket";
import { scoreWc2026Bracket, realRounds, type PredictedMatch, type PredictedAwards } from "@/lib/wc2026Score";
import { WC2026_KNOCKOUT, WC2026_AWARDS } from "@/data/wc2026Results";

/**
 * Round 395: the tournament has been played, so a bracket can be scored.
 * Everything shown here comes from src/data/wc2026Results.ts (two-source
 * verified) through src/lib/wc2026Score.ts (pure). The panel never writes.
 */
interface BracketResultsProps {
  seeds: Record<string, GroupSeed>;
  thirds: string[];
  rounds: PredictedMatch[][];
  awards: PredictedAwards;
}

const ROUND_LABEL: Record<string, string> = { r32: "Round of 32", r16: "Round of 16", qf: "Quarter-finals", sf: "Semi-finals", tp: "Third place", f: "Final" };

const Row = ({ label, right, total, points }: { label: string; right: number; total: number; points: number }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-[hsl(150,15%,18%)] last:border-b-0 text-sm">
    <span className="text-[hsl(150,15%,75%)]">{label}</span>
    <span className="tabular-nums">
      <span className="text-[hsl(150,15%,90%)] font-semibold">{right}</span>
      <span className="text-[hsl(150,15%,50%)]"> / {total}</span>
      <span className="text-[hsl(45,90%,55%)] ml-3 font-semibold">+{points}</span>
    </span>
  </div>
);

const BracketResults = ({ seeds, thirds, rounds, awards }: BracketResultsProps) => {
  const [showReal, setShowReal] = useState(false);
  const score = useMemo(() => scoreWc2026Bracket(seeds, thirds, rounds, awards), [seeds, thirds, rounds, awards]);
  const real = useMemo(() => realRounds(), []);
  const final = WC2026_KNOCKOUT.find((m) => m.round === "f");

  return (
    <div className="mt-8 rounded-2xl border border-[hsl(45,90%,55%)]/40 bg-[hsl(160,20%,8%)] p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="w-5 h-5 text-[hsl(45,90%,55%)]" />
        <h2 className="text-lg sm:text-xl font-bold text-[hsl(45,90%,55%)]">How your bracket did</h2>
      </div>
      <p className="text-sm text-[hsl(150,15%,65%)] mb-4">
        The real thing was played from June 11 to July 19, 2026. <FlagImg name="Spain" /> Spain beat <FlagImg name="Argentina" /> Argentina{" "}
        {final ? `${final.score1}-${final.score2}${final.extraTime ? " after extra time" : ""}` : ""} in the final at MetLife Stadium.
        Golden Ball {WC2026_AWARDS.goldenBall.player}, Golden Boot {WC2026_AWARDS.goldenBoot.player} with {WC2026_AWARDS.goldenBoot.goals} goals,
        Golden Glove {WC2026_AWARDS.goldenGlove.player}.
      </p>

      {score.empty ? (
        <p className="text-sm text-[hsl(150,15%,60%)]">Fill your groups and bracket above and this scores it against the real results.</p>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-sm text-[hsl(150,15%,65%)]">Your score</span>
            <span className="text-2xl font-extrabold text-[hsl(45,90%,55%)] tabular-nums">{score.points} <span className="text-base text-[hsl(150,15%,50%)] font-semibold">/ {score.maxPoints}</span></span>
          </div>
          <Row label="Qualifiers called (top two per group)" right={score.qualifiers.right} total={score.qualifiers.total} points={score.qualifiers.points} />
          <Row label="Group winners" right={score.groupWinners.right} total={score.groupWinners.total} points={score.groupWinners.points} />
          <Row label="Best thirds sent through" right={score.thirds.right} total={score.thirds.total} points={score.thirds.points} />
          <Row label="Round of 16 teams" right={score.r16.right} total={score.r16.total} points={score.r16.points} />
          <Row label="Quarter-finalists" right={score.qf.right} total={score.qf.total} points={score.qf.points} />
          <Row label="Semi-finalists" right={score.sf.right} total={score.sf.total} points={score.sf.points} />
          <Row label="Finalists" right={score.finalists.right} total={score.finalists.total} points={score.finalists.points} />
          <div className="flex items-center justify-between py-1.5 border-b border-[hsl(150,15%,18%)] text-sm">
            <span className="text-[hsl(150,15%,75%)]">Champion{score.champion.picked ? `: you had ${score.champion.picked}` : ""}</span>
            <span className={score.champion.right ? "text-[hsl(140,60%,50%)] font-semibold" : "text-[hsl(150,15%,50%)]"}>
              {score.champion.picked ? (score.champion.right ? "Spain, spot on" : "Spain won it") : "not picked"}
              <span className="text-[hsl(45,90%,55%)] ml-3 font-semibold">+{score.champion.points}</span>
            </span>
          </div>
          <Row label="Awards (Boot, Glove, Ball)" right={[score.awards.goldenBoot, score.awards.goldenGlove, score.awards.goldenBall].filter(Boolean).length} total={3} points={score.awards.points} />
        </>
      )}

      <button
        type="button"
        onClick={() => setShowReal((v) => !v)}
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[hsl(45,90%,55%)] hover:underline"
      >
        {showReal ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {showReal ? "Hide the real bracket" : "Show the real bracket"}
      </button>
      {showReal && (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {real.map((round, idx) => {
            const key = (["r32", "r16", "qf", "sf", "tp", "f"] as const)[idx];
            const matches = WC2026_KNOCKOUT.filter((m) => m.round === key);
            return (
              <div key={key}>
                <h3 className="text-xs uppercase tracking-wide text-[hsl(150,15%,55%)] mb-1">{ROUND_LABEL[key]}</h3>
                <ul className="space-y-0.5 text-sm">
                  {matches.map((m) => (
                    <li key={`${m.team1}-${m.team2}`} className="flex items-center justify-between gap-2">
                      <span>
                        <FlagImg name={m.team1} /> <span className={m.winner === m.team1 ? "font-semibold text-[hsl(150,15%,92%)]" : "text-[hsl(150,15%,65%)]"}>{m.team1}</span>
                        <span className="text-[hsl(150,15%,50%)]"> v </span>
                        <FlagImg name={m.team2} /> <span className={m.winner === m.team2 ? "font-semibold text-[hsl(150,15%,92%)]" : "text-[hsl(150,15%,65%)]"}>{m.team2}</span>
                      </span>
                      <span className="tabular-nums text-[hsl(150,15%,75%)] whitespace-nowrap">
                        {m.score1}-{m.score2}{m.extraTime ? " aet" : ""}{m.penalties ? ` (${m.penalties} pens)` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                {round.length !== matches.length && null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BracketResults;
