import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/soccer-career/CareerFx";
import { revealAfter, revealDelay } from "@/components/club-manager/Celebration";
import { stillMotion, useSoundPlan } from "@/hooks/useSoundPlan";
import {
  countdownSlot, placeMark,
  type AwardsCandidate, type AwardsDef, type AwardsNight, type AwardsNightCopy, type GivenSpeech,
} from "@/lib/careerAwardsNight";

/* cmSlam (CelebrationStyles) runs 0.4 s and is fully on screen at 60 percent */
const SLAM_LANDS = 0.24;

/* ─── Round 834: the awards night card, shared ───
   Lifted from Soccer Career's Ballon d'Or ceremony, markup unchanged. The list
   stays in rank order on screen, winner at the top, but the ARRIVAL runs the
   other way (Round 530): the last name ticks in first and the winner last, a
   countdown, and the headline lands after the last name. A sport supplies the
   night, its award, its copy, and how one candidate's row reads. */
export function AwardsNightCard<C extends AwardsCandidate>({
  night, award, copy, portrait, badge, detail, score, scoreDetail, onDismiss, speech, reveal, confetti = true,
}: {
  night: AwardsNight<C>;
  award: AwardsDef;
  copy: AwardsNightCopy;
  /** The player's look on the stage, bigger when he won. */
  portrait?: (won: boolean) => ReactNode;
  /** Drawn before a name (a flag, say). */
  badge?: (c: C) => ReactNode;
  detail: (c: C) => string;
  score: (c: C) => string;
  scoreDetail: (c: C) => string;
  onDismiss: () => void;
  /** When supplied, names and result enter the DOM only as the list arrives. */
  reveal?: { complete: boolean; onComplete: () => void };
  confetti?: boolean;
  /** Round 834: the winner's speech. While `open` the card offers the options
   *  in place of Continue; once the night carries a speech, the card shows
   *  what it did above Continue. Leave it out for a night with no speech. */
  speech?: {
    open: boolean;
    prompt: string;
    options: SpeechChoice<string>[];
    onChoose: (id: string) => void;
  };
}) {
  const place = night.playerRank;
  const isWinner = place === 1;
  const isPodium = place !== null && place <= award.podiumSize;
  const isNominated = night.playerNominated;
  const n = night.nominees.length;
  const [arrived, setArrived] = useState(() => !reveal || reveal.complete ? n : 0);
  const [finished, setFinished] = useState(() => !reveal || reveal.complete);
  const complete = useRef(reveal?.onComplete);
  complete.current = reveal?.onComplete;
  useEffect(() => {
    if (!reveal || reveal.complete) { setArrived(n); setFinished(true); return; }
    setArrived(0);
    setFinished(false);
    if (stillMotion()) { setArrived(n); setFinished(true); complete.current?.(); return; }
    const timers = Array.from({ length: n }, (_, i) => window.setTimeout(() => setArrived(i + 1), revealAfter(i) * 1000));
    timers.push(window.setTimeout(() => { setFinished(true); complete.current?.(); }, (revealAfter(n, 0.75) + SLAM_LANDS) * 1000));
    return () => timers.forEach(clearTimeout);
  }, [night.year, n, reveal?.complete, !!reveal]);
  const resultVisible = !reveal || reveal.complete || finished;
  const borderColor = resultVisible && isWinner ? "border-amber-400/60" : resultVisible && isPodium ? "border-amber-500/30" : "border-border";
  const bgGrad = resultVisible && isWinner ? "from-amber-500/20 to-transparent" : resultVisible && isPodium ? "from-amber-500/10 to-transparent" : "from-transparent to-transparent";

  /* Round 1132: the night out loud, for a player who switched sound on. One tick as each name arrives, the
     last name first, then the result as the headline lands: a sting on the podium, a sting and the crowd for
     the winner, nothing for anyone else. Reduced motion shows the card at once, so it gets the result alone.
     The key names the award, so two awards of one year that he finishes level on are two plans. Speaking
     re-renders the card with the same key: no second sting. This draws nothing. */
  useSoundPlan(`${award.id}|${night.year}|${place}|${n}`, play => {
    const still = stillMotion();
    if (!still) for (let k = 0; k < n; k += 1) play("tap", { delay: revealAfter(k) });
    const lands = still ? 0 : revealAfter(n, 0.75) + SLAM_LANDS;
    if (isWinner) play("awardWin", { delay: lands });
    else if (isPodium && isNominated) play("award", { delay: lands });
  });

  return (
    <div data-award-night={reveal ? award.id : undefined} data-award-result={reveal ? resultVisible ? "revealed" : "waiting" : undefined} className={`relative rounded-xl border-2 ${borderColor} bg-gradient-to-b ${bgGrad} p-5 space-y-4 animate-in fade-in zoom-in-90 duration-700`}>
      {resultVisible && isWinner && confetti && <Confetti pieces={70} gold />}
      <div className="cm-slam text-center space-y-2" style={{ animationDelay: reveal ? "0s" : revealDelay(n, 0.75) }}>
        {portrait && (
          <div className="flex justify-center">
            <div className={`rounded-xl overflow-hidden border-2 ${resultVisible && isWinner ? "border-amber-400/70 animate-trophy-glow" : "border-border"} bg-muted/20`}>
              {portrait(resultVisible && isWinner)}
            </div>
          </div>
        )}
        <div className={`text-5xl ${resultVisible && isWinner ? "animate-trophy-glow" : ""}`}>{!resultVisible || isWinner ? award.emoji : "⭐"}</div>
        <h3 data-award-headline={reveal ? true : undefined} className="text-xl font-black tracking-tight">
          {resultVisible && isWinner ? copy.winnerTitle : copy.title(night.year)}
        </h3>
        {resultVisible && isWinner && (
          <p className="text-sm text-amber-300 font-bold">{copy.winnerLine(night.moved)}</p>
        )}
        {resultVisible && !isWinner && isNominated && place !== null && place <= award.podiumSize && (
          <p className="text-sm text-muted-foreground">{copy.podiumLine(place, night.moved)}</p>
        )}
        {resultVisible && !isWinner && isNominated && place !== null && place > award.podiumSize && (
          <p className="text-sm text-muted-foreground">{copy.shortlistLine(place)}</p>
        )}
        {resultVisible && !isNominated && place !== null && place > award.shortlistSize && (
          <p className="text-sm text-muted-foreground">{copy.wider.before}<span className="font-bold text-foreground">#{place}</span>{copy.wider.after}</p>
        )}
        {resultVisible && !isNominated && place === null && (
          <p className="text-sm text-muted-foreground">{copy.notNominated}</p>
        )}
      </div>

      <div className="space-y-1">
        {night.nominees.map((c, i) => reveal && i < n - arrived ? null : (
          <div data-award-rank={reveal ? i + 1 : undefined} key={`${night.year}-${i}`} style={{ animationDelay: reveal ? "0s" : revealDelay(countdownSlot(i, n)) }} className={`cm-tick-in flex items-center justify-between text-xs rounded-lg px-2.5 py-1.5 ${
            c.isPlayer ? (i === 0 ? "bg-amber-500/20 border border-amber-500/30" : "bg-emerald-500/10 border border-emerald-500/20") : "bg-muted/20"
          }`}>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-sm font-black w-6 shrink-0">{placeMark(i + 1)}</span>
              <div className="min-w-0 flex-1">
                <span className={`font-bold truncate block text-[11px] ${c.isPlayer ? "text-foreground" : "text-muted-foreground"}`}>
                  {badge?.(c)}{c.name}
                </span>
                <span className="text-[9px] text-muted-foreground">{detail(c)}</span>
              </div>
            </div>
            <div className="text-right shrink-0 ml-1">
              <div className="font-bold text-[11px]">{score(c)}</div>
              <div className="text-[9px] text-muted-foreground">{scoreDetail(c)}</div>
            </div>
          </div>
        ))}
      </div>

      {resultVisible && isWinner && night.speech && <SpokenSpeech speech={night.speech} />}

      {/* The speech is the result, so it arrives with the headline, never
          before it: hidden and unclickable until the countdown has landed. */}
      {!resultVisible ? <p className="text-center text-xs text-muted-foreground" data-award-waiting>The ranked list is coming in...</p> : isWinner && speech?.open ? (
        <div className="cm-rise-gated" style={{ animationDelay: reveal ? "0s" : revealDelay(n, 0.95) }}>
          <SpeechChoices prompt={speech.prompt} options={speech.options} onChoose={speech.onChoose} />
        </div>
      ) : (
        <Button onClick={onDismiss} className={`w-full h-10 text-sm font-bold text-black ${isWinner ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500"}`}>
          Continue →
        </Button>
      )}
    </div>
  );
}

/** A winner's speech once given, as a card keeps showing it: the words, then
 *  what it really moved. Round 1023's review: the one block every card that
 *  keeps a speech draws (this card, Soccer Career's tournament cards). */
export function SpokenSpeech({ speech }: { speech: GivenSpeech }) {
  return (
    <div data-spoken-speech={speech.id} className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 space-y-1 text-center animate-fade-in">
      <p className="text-xs">{speech.line}</p>
      {speech.moved && <p className="text-[11px] font-bold text-amber-300">{speech.moved}</p>}
    </div>
  );
}

const TONE = {
  gold: "text-black bg-amber-600 hover:bg-amber-500",
  bold: "text-black bg-amber-700 hover:bg-amber-600",
  quiet: "text-white bg-muted hover:bg-muted/80",
} as const;

/** One speech button: what SpeechChoices needs from a speech option. */
export type SpeechChoice<Id extends string> = { id: Id; emoji: string; label: string; tone: keyof typeof TONE };

/** The winner's speech: one button per option, in the order the sport wrote
 *  them. Pass only the options this save may give (availableSpeeches). */
export function SpeechChoices<Id extends string>({
  prompt, options, onChoose, roomy = false, fadeIn = false,
}: {
  prompt: string;
  options: SpeechChoice<Id>[];
  onChoose: (id: Id) => void;
  /** A taller button, for a card with room to spare. */
  roomy?: boolean;
  fadeIn?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className={`text-center text-[11px] font-bold uppercase tracking-wider text-amber-300${fadeIn ? " animate-fade-in" : ""}`}>{prompt}</p>
      {options.map(o => (
        <Button key={o.id} onClick={() => onChoose(o.id)} className={`w-full h-auto ${roomy ? "py-2.5" : "py-2"} text-xs font-bold ${TONE[o.tone]} justify-start text-left whitespace-normal`}>
          {`${o.emoji} ${o.label}`}
        </Button>
      ))}
    </div>
  );
}
