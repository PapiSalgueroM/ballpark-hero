/* The original Round 913 soccer skin, retained only for the recorded replay.
   The live Soccer Career panel is unchanged. This binding mounts the current
   shared TrainingGround and drills with the original recorded words and tiles. */
import type { CareerState } from "@/lib/soccerCareerEngine";
import { trainingStatFor, type TrainingDrill } from "@/lib/soccerCareerEngine";
import type { TrainingSport } from "@/lib/careerTraining";
import TrainingGround, { type TrainingExtra } from "@/components/career/TrainingGround";
import DrillBoard from "@/components/soccer-career/DrillBoard";
import FirstTouchBoard from "@/components/soccer-career/FirstTouchBoard";
import { DRILL_META, drillForPosition, drillStatFor, type DrillKind } from "@/lib/careerDrills";

const PITCH = "linear-gradient(180deg, #14532d, #166534)";
const GOALMOUTH = "linear-gradient(180deg, #0c4a6e 0%, #14532d 70%)";
const GOAL_ZONES: [string, string, string, string, string, string] = [
  "top left", "top middle", "top right", "bottom left", "bottom middle", "bottom right",
];

/* Round 784: the stat each drill trains comes from the engine's own mapping,
   so a keeper reads Positioning, Sweeping Speed, Distribution and Reflexes
   here, the same words his attribute screen uses, and the panel can never
   promise a stat the engine does not pay. */
function soccerTraining(position: string): TrainingSport<TrainingDrill> {
  const isGK = position === "GK";
  const stat = (d: TrainingDrill) => trainingStatFor(position, d).label;
  const goal = { kind: "zones" as const, id: "shooting" as const, stat: stat("shooting"), zones: GOAL_ZONES, ball: "⚽", glove: "🧤", surface: GOALMOUTH, frame: "goal" as const };
  return {
    title: "🏋️ Training Ground",
    label: "Training ground",
    rule: "One session per season. Score 50+ for a +1, 80+ for a +2 to that stat with next season's growth.",
    shut: {
      emoji: "😮‍💨",
      title: "Already trained this season",
      body: "The gaffer says recovery matters too. Come back after the next season kicks off.",
    },
    note: isGK ? {
      marker: "keeper",
      text: "You are in goal, so these train keeper skills: the slalom and First Touch are footwork for your Positioning, the sprint is your Sweeping Speed, the gates are your Distribution, and shot stopping is your Reflexes.",
    } : undefined,
    drills: [
      {
        kind: "cones", id: "dribbling", emoji: "🌀", name: "Cone Slalom", stat: stat("dribbling"),
        unit: "Cone", slips: "slips", surface: PITCH, pitchLines: true,
        how: "Tap the glowing cones in order, bottom to top. Fast and clean scores best. The stopwatch starts on the first cone.",
      },
      {
        kind: "burst", id: "pace", emoji: "⚡", name: "Sprint Burst", stat: stat("pace"),
        unit: "steps", startEmoji: "🏁", startTitle: "Tap to start the 5 second sprint",
        startHint: "Then tap the track as fast as you can", runEmoji: "🏃", go: "GO GO GO", stop: "Time!",
      },
      /* Round 159: keepers SAVE penalties instead of taking them. */
      isGK ? {
        ...goal, mode: "save", emoji: "🧤", name: "Shot Stopping", unit: "Shot", tally: "saved", verb: "Dive",
        how: "You are in goal. Watch the striker's hips for the tell, then tap where you dive. The tell is honest most of the time. Most of it.",
        tell: "He is shaping up...", shot: "SHOT! Dive!", saved: "SAVED! What a stop!", beaten: "In the net. Wrong way.",
      } : {
        ...goal, mode: "pick", emoji: "🎯", name: "Penalty Placement", unit: "Penalty", tally: "scored", verb: "Shoot",
        how: "Pick your spot. The keeper dives where he guesses. Top corners are riskier but nothing feels better.",
        made: "GOAL!", stopped: "Saved! Keeper guessed right.", over: "Blazed over the bar!",
      },
      {
        kind: "gates", id: "passing", emoji: "🚩", name: "Passing Gates", stat: stat("passing"),
        unit: "Pass", tally: "through", surface: PITCH, lit: "🚩",
        how: "A gate lights up: hit it before it shuts. The windows get shorter as you go.",
        startEmoji: "🚩", startTitle: "Tap to start the passing drill", startHint: "Eight passes, shrinking windows",
      },
    ],
    tierLine: (tier, s) => (
      tier === 2 ? "Elite session! +2 " + s + " next season" :
      tier === 1 ? "Solid work. +1 " + s + " next season" :
      "Rough day. No gains this time"
    ),
    scoreLabel: "session score",
    bank: "Bank the session",
    done: "Back to your career",
  };
}

export default function TrainingPanel({ career, available, onComplete, onDrill, onClose }: {
  career: CareerState;
  available: boolean;
  onComplete: (drill: TrainingDrill, score: number) => void;
  /** Round 468: a banked position drill, wins out of ten. */
  onDrill: (kind: DrillKind, count: number) => void;
  onClose: () => void;
}) {
  /* Round 468: "arcade" is the position drill, played on the shared arcade
     engine in DrillBoard. It sits beside the Round 81 tiles rather than
     replacing them, and it banks through its own rule (applyDrillResult).
     Always open, because practice is unlimited; only today's ten bank, and
     only while the season's session is still there. */
  const arcade = DRILL_META[drillForPosition(career.position)];
  const extras: TrainingExtra[] = [
    {
      id: "arcade",
      tile: open => (
        <button onClick={open}
          className="w-full flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 p-3.5 text-left transition-colors">
          <span className="text-3xl">{arcade.emoji}</span>
          <span className="flex-1">
            <span className="block text-sm font-black">{arcade.name} <span className="ml-1 align-middle rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black text-black">NEW</span></span>
            <span className="block text-[10px] text-muted-foreground">Your {career.position} drill. Trains {arcade.statLabel}. Today's ten count, practice is free.</span>
          </span>
          <span className="text-muted-foreground">›</span>
        </button>
      ),
      screen: back => <DrillBoard career={career} canBank={available} onBank={onDrill} onBack={back} />,
    },
    {
      id: "firsttouch",
      tile: open => (
        <button onClick={open}
          className="w-full flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 p-3.5 text-left transition-colors">
          <span className="text-3xl">👟</span>
          <span className="flex-1"><span className="block text-sm font-black">First Touch</span><span className="block text-[10px] text-muted-foreground" data-first-touch-trains>Read the gate, time your control. Trains {drillStatFor("firsttouch", career.position).label}. Practice is always open.</span></span>
          <span className="text-muted-foreground">›</span>
        </button>
      ),
      screen: back => <FirstTouchBoard career={career} canBank={available} onBank={onDrill} onBack={back} />,
    },
  ];

  return (
    <TrainingGround
      sport={soccerTraining(career.position)}
      available={available}
      onComplete={onComplete}
      onClose={onClose}
      extras={extras}
    />
  );
}
