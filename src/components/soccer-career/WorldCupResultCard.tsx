import { SpeechChoices, SpokenSpeech } from "@/components/career/AwardsNightCard";
import { FlagImg } from "@/components/FlagImg";
import { Confetti } from "@/components/soccer-career/CareerFx";
import { Button } from "@/components/ui/button";
import { givenSpeechOf } from "@/lib/careerAwardsNight";
import { SOCCER_WORLD_CUP_SPEECHES, type WorldCupResult, type WorldCupSpeechChoice } from "@/lib/soccerCareerEngine";

/* ─── World Cup Result Screen ─── */
export default function WorldCupResultCard({ wc, onDismiss, onSpeech }: { wc: WorldCupResult; onDismiss: () => void; onSpeech: (choice: WorldCupSpeechChoice) => void }) {
  const isWinner = wc.result === "Winner";
  const given = givenSpeechOf(wc);
  const didNotQualify = wc.result === "Did Not Qualify";
  const borderColor = isWinner ? "border-amber-400/60" : didNotQualify ? "border-red-500/40" : "border-blue-500/40";
  const bgGrad = isWinner ? "from-amber-500/15 to-transparent" : didNotQualify ? "from-red-500/10 to-transparent" : "from-blue-500/10 to-transparent";
  return (
    <div className={`relative rounded-xl border-2 ${borderColor} bg-gradient-to-b ${bgGrad} p-5 space-y-4 animate-in fade-in zoom-in-95 duration-500`}>
      {isWinner && <Confetti pieces={70} gold />}
      <div className="text-center space-y-2">
        <div className="text-4xl">{isWinner ? "🏆" : didNotQualify ? "😞" : "🌍"}</div>
        <h3 className="text-xl font-black">{isWinner ? "WORLD CUP WINNER!" : didNotQualify ? "World Cup Qualifiers" : `World Cup ${wc.year}`}</h3>
        <p className="text-sm font-bold flex items-center justify-center gap-1"><FlagImg name={wc.nation} />{wc.nation}: {wc.result}</p>
        {didNotQualify && (
          <p className="text-xs text-muted-foreground">Your nation failed to qualify for the tournament this time.</p>
        )}
      </div>
      {!didNotQualify && (
        <>
          {/* Match results */}
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {wc.matches.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-muted/20 rounded-lg px-3 py-1.5">
                <span className="text-[10px] text-muted-foreground w-12">{m.round}</span>
                <span className={`font-semibold ${m.teamA === wc.nation ? "text-foreground" : "text-muted-foreground"}`}>
                  <FlagImg name={m.teamA} size={16} />{m.teamA}
                </span>
                <span className="font-black text-sm mx-2">{m.scoreA} - {m.scoreB}</span>
                <span className={`font-semibold ${m.teamB === wc.nation ? "text-foreground" : "text-muted-foreground"}`}>
                  {m.teamB} <FlagImg name={m.teamB} size={16} />
                </span>
              </div>
            ))}
          </div>
          {/* Player stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { l: "Apps", v: wc.playerApps },
              { l: "Goals", v: wc.playerGoals },
              { l: "Assists", v: wc.playerAssists },
              { l: "Avg Rating", v: wc.playerAvgRating.toFixed(1) },
            ].map(s => (
              <div key={s.l} className="text-center bg-muted/20 rounded-lg p-2">
                <div className="text-lg font-black">{s.v}</div>
                <div className="text-[9px] text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
          {wc.bestPlayer && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-center">
              <span className="text-sm font-bold">🌟 Named Best Player of the Tournament!</span>
            </div>
          )}
          {isWinner && (
            <div className="bg-amber-500/15 border border-amber-400/30 rounded-lg p-3 text-center">
              <span className="text-sm font-bold text-amber-300">🏆 WORLD CUP CHAMPION! Legacy cemented forever.</span>
            </div>
          )}
        </>
      )}
      {/* Round 1023: once given, the speech stays on the card with what it
          really moved, and Continue moves on. */}
      {isWinner && given && <SpokenSpeech speech={given} />}
      {isWinner && !given ? (
        /* Round 834: the buttons come from the shared speech options, the
           same list the tournament card draws. */
        <SpeechChoices prompt="The microphone is yours. The speech:" fadeIn roomy options={SOCCER_WORLD_CUP_SPEECHES} onChoose={onSpeech} />
      ) : (
        <Button onClick={onDismiss} className={`w-full h-10 text-sm font-bold text-black ${isWinner ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500"}`}>
          Continue →
        </Button>
      )}
    </div>
  );
}
